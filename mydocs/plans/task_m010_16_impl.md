# Task #16 구현계획서 — Tauri updater 기반 Windows/Linux 자동 업데이트 경로

수행계획서: [`task_m010_16.md`](task_m010_16.md)
GitHub Issue: [#16](https://github.com/postmelee/alhangeul-tauri/issues/16)
마일스톤: M010

이번 구현은 runtime, release artifact, Pages manifest와 실제 설치 수용을 분리한다. source에서
updater를 켰다는 사실만으로 완료하지 않고, Rust 데이터 보호와 target 판별, Tauri signature,
release inventory, manifest 게시 순서와 세 형식의 실제 `N → N+1`을 모두 통과해야 한다.

각 Stage가 끝나면 `task-stage-report`로 `mydocs/working/task_m010_16_stage{N}.md`를 작성하고
해당 Stage 변경과 같은 commit에 묶는다. 다음 Stage는 보고서 승인 후 시작한다. 현재 macOS
host에서는 platform-neutral 검증만 실행하며 Rust desktop compile/test와 Tauri build는
Windows/Linux exact-SHA 검증으로 모은다.

이 문서는 runtime, signing, GitHub Release, Pages와 세 native 설치 수용의 5개 승인 경계를
한 진실 원천에서 연결해야 하므로 문서 300 LOC 권장 상한을 초과한다. 실제 Rust/TypeScript/
script source는 역할별 파일 300 LOC, 함수 50 LOC 상한을 그대로 적용한다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | updater 상태·native target 계약 | Rust model, Windows/Linux eligibility, dirty query | fixture matrix와 native source gate |
| 2 | updater service·사용자 UI | Rust check/apply/restart, event, About/update dialog | mock lifecycle, TS UI, dirty·concurrency |
| 3 | 서명 artifact·Pages manifest gate | release inventory, config builder, Pages schema, workflow mode | signature/URL/partial-release negative test |
| 4 | production key·release 운영 통합 | public-key config, Secret 경계, 공식 문서, exact-SHA signed build | 누출 검사, 일반/서명 build, 원격 inventory |
| 5 | MSI·NSIS·AppImage `N → N+1` 수용 | 승인된 test release와 3형식 설치 증적 | cross-format·dirty·변조·read-only 포함 실제 갱신 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| updater 아키텍처 | `docs/architecture/` | `docs/architecture/UPDATER.md` | OK | Stage 4에서 runtime·target·신뢰 사슬 확정 |
| release·key 운영 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | Stage 4에서 artifact→manifest와 복구 정책 연결 |
| 사용자 지원 범위 | `site/` | `site/updates/index.html`, `site/release.json` | OK | Stage 3 schema, Stage 4 문구를 같은 계약으로 정렬 |
| 구현·단계·최종 보고 | `mydocs/` | `plans/`, `working/`, `report/` | OK | 제품 문서와 승인·증적을 분리 |

private key, password와 복구 material은 위 경로 어디에도 기록하지 않는다. key fingerprint,
GitHub Secret 이름, 책임과 복구 절차만 공식 운영 문서와 단계 보고서에 남긴다.

## 공통 구현 계약

### Rust와 TypeScript 경계

- Rust가 updater backend, 현재 operation, custom target, downloaded bytes, 진행률, 오류와
  install/restart를 소유한다. webview는 `@tauri-apps/plugin-updater`를 직접 설치·호출하지 않는다.
- custom command는 다음 네 개로 제한한다.
  - `updater_get_state`: 현재 snapshot을 읽는다.
  - `updater_check`: `startup|manual` trigger로 확인한다. startup은 Rust setup에서 한 번 호출한다.
  - `updater_apply`: 한 번의 사용자 동작으로 download → dirty 재검사 → install을 수행한다.
  - `updater_restart`: Linux install 완료 뒤 사용자 동작으로 재시작한다.
- 모든 창에 `alhangeul-updater-state` event를 emit하고 UI setup 직후 snapshot도 읽어 listener
  등록 전 상태를 놓치지 않는다. operation id가 다른 오래된 progress는 버린다.
- serialized snapshot은 다음 의미를 고정한다.
  - 상태: `idle|checking|available|downloading|installing|restartRequired|error`
  - trigger, operation id, current/available version, target, release notes
  - downloaded/total bytes와 계산 가능한 경우의 percent
  - `dirtyDocuments|unsupportedInstall|readOnlyAppImage` blocker와 manual fallback URL
  - 사용자용 오류 code/message, 재시도 가능 여부. 내부 경로·registry 값·endpoint 응답 전문은 제외

### 상태 전이와 문서 보호

- `idle → checking → idle|available|error`와
  `available → downloading → installing → restartRequired|종료|error`만 허용한다.
- startup check는 update가 있으면 `available`, 없으면 `idle`로 돌아가며 modal을 열지 않는다.
  background network 오류는 snapshot에 남기되 현재 편집 status나 focus를 빼앗지 않는다.
- `updater_apply` 시작 직전 Rust `AppState.sessions` 전체를 잠가 dirty session을 검사한다.
  download가 끝나면 bytes를 install에 넘기기 직전에 다시 검사한다.
- 두 번째 검사에서 dirty가 발견되면 bytes를 폐기하고 `available`+`dirtyDocuments`로 돌아간다.
  자동 저장, 강제 종료나 UI dirty 상태를 신뢰하는 우회는 두지 않는다.
- operation mutex로 check/apply/restart 중복을 거부한다. 실패 뒤 opaque update resource와 bytes를
  폐기하고 `manual` check부터 안전하게 재시도한다.
- Windows installer 성공 실행은 plugin 동작에 따라 app 종료로 이어진다. Linux install은
  `restartRequired`에서 멈추고 사용자 확인 뒤 Rust가 앱을 재시작한다.

### native target 판별

- 공통 결과는 `Supported { target, artifactKind }` 또는
  `ManualOnly { reason, downloadsUrl }`다. unsupported 결과에서는 updater backend를 만들지 않는다.
- Windows adapter는 HKCU/HKLM의 32/64-bit uninstall view를 읽되 display name만으로 판별하지
  않는다. current executable의 canonical path가 record의 install location 또는 uninstall
  executable과 같은 설치 root를 가리키고 installer evidence가 하나로 수렴해야 한다.
  - MSI: Windows Installer record/msiexec product evidence와 설치 root가 일치
  - NSIS: Alhangeul uninstaller record와 설치 root가 일치
  - 누락, 복수 충돌, portable/dev 경로는 `ManualOnly`
- Linux adapter는 x86_64, `APPIMAGE` runtime path, current executable 연계와 교체 대상 쓰기
  가능성을 검사한다. DEB/RPM, arm64, 환경변수만 위조된 실행과 read-only 경로는 수동 fallback한다.
- update response의 URL 확장자·파일명도 target별 allowlist와 다시 대조한다. valid signature라도
  MSI target이 NSIS URL을 받거나 반대인 manifest는 download 전에 거부한다.

### build·signature·manifest

- base `tauri.conf.json`과 일반 artifact mode에는 `createUpdaterArtifacts`를 넣지 않는다.
  tracked `tauri.updater.conf.json`은 production public key, HTTPS stable endpoint,
  `createUpdaterArtifacts: true`와 Windows install mode만 담는 release overlay다.
- 신규 제품이므로 `v1Compatible`을 쓰지 않는다. updater artifact는 일반 AppImage, MSI, NSIS
  installer 자체와 각 파일에 대응하는 `.sig`다.
- `alhangeul-desktop.yml`은 기본 `artifact` mode와 명시적 `updater` mode를 가진다.
  - 기본 mode: 기존 matrix·inventory·installer smoke를 보존하고 signing Secret이 없어도 성공
  - updater mode: Windows x64와 Linux x64만 release overlay로 build하고 세 target+signature를 수집
  - exact 40자리 source SHA와 workflow SHA를 대조하고 version/tag/config 입력을 inventory에 기록
  - remote publish job은 별도 boolean/mode와 job-level `contents: write`가 모두 있을 때만 실행
- updater mode만 `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`를 참조한다.
  Secret 값·길이·path·command expansion을 출력하지 않고 `.env`, cache와 Actions artifact에 넣지 않는다.
- updater release inventory는 schema version, exact source SHA, product/build version, tag, key
  fingerprint와 세 target별 kind/path/size/SHA-256/signature를 가진다. private material은 금지한다.
- `site/release.json.updater`는 세 target signature와 `manifestPublished` gate를 표현한다.
  source의 현재 `unreleased` 값은 null/false로 유지한다.
- `manifestPublished=true`인 완전한 published fixture에서만 builder가 output의
  `updater/stable.json`을 생성한다. source tree에는 생성 manifest를 commit하지 않는다.
- static manifest는 version, notes, RFC 3339 `pub_date`와 세 custom target의 exact-tag HTTPS URL,
  `.sig` 내용만 가진다. artifact 일부 누락, URL·확장자·version·signature drift는 build를 실패시킨다.
- Pages workflow는 release를 만들거나 signing key를 읽지 않는다. 이미 검증·승인되어 source에
  반영된 public signature만 deterministic build하고 exact-SHA Pages artifact로 원자 게시한다.

### 승인 checkpoint

- **A — key**: production key pair 생성 위치, password, 독립 백업과 보관 책임을 제시한 뒤 승인.
- **B — GitHub 설정**: 두 signing Secret과 필요 environment 등록 대상을 제시한 뒤 승인.
- **C — 원격 build**: exact source SHA, workflow mode와 예상 artifact를 제시한 뒤 승인.
- **D1 — test 설계**: test-only N/N+1 version, tag namespace, endpoint, 공개 범위와 보존/삭제
  정책을 제시한 뒤 구현 승인.
- **D2 — test release 실행**: nonpublishing 검증을 통과한 exact source SHA, 원격 artifact와
  공개 예정 asset을 제시한 뒤 test prerelease 게시를 별도 승인.
- **E — Pages stable**: verified release와 manifest source commit을 제시한 뒤 별도 승인. Task #16의
  source·test 완료만으로 실행하지 않는다.

## Stage 1 — updater 상태·native target 계약

### 산출물

신규:

- `apps/desktop/src-tauri/src/updater/mod.rs`
- `apps/desktop/src-tauri/src/updater/model.rs`
- `apps/desktop/src-tauri/src/updater/model_tests.rs`
- `apps/desktop/src-tauri/src/updater/target.rs`
- `apps/desktop/src-tauri/src/updater/target/native.rs`
- `apps/desktop/src-tauri/src/updater/target_tests.rs`
- `mydocs/working/task_m010_16_stage1.md`

수정:

- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/Cargo.lock`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/src/state.rs`

### 변경 내용

- updater snapshot, status, trigger, progress, blocker, error와 operation transition을 serde contract로
  만든다. 상태 mutation은 한 module에 두고 잘못된 전이를 unit test로 거부한다.
- `UpdaterTargetProbe` adapter를 정의해 fixture에서는 registry/env/filesystem evidence를 주입하고
  production adapter만 OS API를 읽게 한다.
- Windows target-specific dependency는 registry view를 명시적으로 열 수 있는 최소 API만 쓴다.
  Linux는 standard filesystem/env API로 AppImage evidence를 확인한다.
- target→artifact kind→허용 URL suffix mapping을 한 table에서 제공해 runtime과 release script
  fixture가 같은 세 문자열을 검증하도록 한다.
- `DocumentSessionManager::has_dirty_sessions`의 release-only cfg를 제거하고 updater가 모든
  build의 native session 진실 원천을 쓸 수 있게 한다.
- 이 Stage에서는 updater plugin, network, UI와 signing key를 추가하지 않는다.

### 검증

```bash
pnpm run check:product-boundary
pnpm run test:automation
git diff --check
```

- Windows/Linux Rust test·clippy는 Stage 4 exact-SHA native gate에서 누적 실행한다.
- fixture matrix는 MSI/NSIS 정상, registry 충돌·누락·path mismatch, AppImage 정상·read-only·
  env mismatch, DEB/RPM/arm64와 cross-format URL을 포함한다.

### 커밋

```text
Task #16 Stage 1: updater 상태와 native target 계약 추가
```

## Stage 2 — updater service·사용자 UI

### 산출물

신규:

- `apps/desktop/src-tauri/src/updater/service.rs`
- `apps/desktop/src-tauri/src/updater/service/apply.rs`
- `apps/desktop/src-tauri/src/updater/service/native.rs`
- `apps/desktop/src-tauri/src/updater/service_tests.rs`
- `apps/desktop/src-tauri/src/updater/commands.rs`
- `apps/studio-host/src/core/desktop-updater.ts`
- `apps/studio-host/src/core/desktop-updater.test.ts`
- `apps/studio-host/src/ui/update-dialog.ts`
- `mydocs/working/task_m010_16_stage2.md`

수정:

- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/Cargo.lock`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/src/state.rs`
- `apps/desktop/src-tauri/src/updater/mod.rs`
- `apps/studio-host/src/core/desktop-events.ts`
- `apps/studio-host/src/core/desktop-events.test.ts`
- `apps/studio-host/src/ui/about-dialog.ts`
- `apps/studio-host/src/style.css`

### 변경 내용

- OS-targeted `tauri-plugin-updater` Rust dependency를 추가하고 plugin backend를 trait 뒤에 둬
  state machine test가 network와 실제 installer 없이 동작하게 한다.
- updater service 본문은 300 LOC 상한을 지키도록 apply·native backend·mock test를 역할별 파일로
  분리하되 `service.rs`의 private 상태와 trait 경계 안에서만 연결한다.
- supported release config에서만 startup check를 spawn한다. dev/일반 artifact/unsupported package는
  `ManualOnly` snapshot을 제공하고 private key나 updater artifact를 요구하지 않는다.
- `Update::download`와 `Update::install`을 분리 호출해 두 번째 dirty guard를 두 호출 사이에 둔다.
  chunk callback은 monotonic progress event만 emit한다.
- update metadata version, target URL kind와 current version보다 높은지 다시 검증한 뒤 available로
  전환한다. no-update와 endpoint/signature/network 오류를 구분한다.
- About dialog에 “업데이트 확인” 진입점을 추가하고 독립 update dialog/controller가 snapshot을
  렌더링한다. 전체 dialog row가 아니라 명시적 button만 check/apply/restart를 호출한다.
- startup available은 비차단 안내로 표시하고 수동 check만 사용자의 현재 dialog에 결과를 보여 준다.
  unsupported/read-only는 Task #45 updates 페이지 링크를 제공한다.
- multi-window listener는 같은 snapshot을 보되 operation action은 native mutex가 직렬화한다.

### 검증

```bash
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

- TypeScript test: startup 무방해, 수동 결과, button-only invoke, progress, dirty blocker, retry,
  unsupported fallback와 listener-before-snapshot 순서.
- Rust mock test와 native compile은 Stage 4 Windows/Linux gate에서 누적 실행한다.

### 커밋

```text
Task #16 Stage 2: updater service와 문서 보호 UI 추가
```

## Stage 3 — 서명 artifact·Pages manifest gate

### 산출물

신규:

- `scripts/updater/release-inventory.mjs`
- `scripts/updater/release-config.mjs`
- `scripts/updater/manifest.mjs`
- `tests/updater-release.test.mjs`
- `mydocs/working/task_m010_16_stage3.md`

수정:

- `.gitignore`
- `scripts/check-release-metadata.mjs`
- `scripts/verify-desktop-artifacts.mjs`
- `scripts/build-pages.mjs`
- `scripts/check-pages.mjs`
- `scripts/pages/release-data.mjs`
- `scripts/pages/site-files.mjs`
- `site/release.json`
- `.github/workflows/alhangeul-desktop.yml`
- `.github/workflows/pages.yml`
- `package.json`
- `tests/actions-workflows.test.mjs`
- `tests/pages.test.mjs`

### 변경 내용

- updater release inventory parser/writer를 pure validation과 filesystem adapter로 분리한다.
  기존 desktop inventory는 일반 package 범위를 유지하고 updater verifier가 세 installer·`.sig`의
  1:1 cardinality와 byte hash를 추가 검증한다.
- release config builder는 test fixture의 public key, endpoint와 version을 temporary JSON으로
  만들고 output 경로·권한·placeholder·HTTP를 거부한다. production tracked config는 Stage 4에서
  실제 public key 승인 뒤 추가한다.
- manifest builder는 완전한 inventory와 release data만 받아 deterministic JSON을 만든다.
  signature는 `.sig` 파일 내용이어야 하며 URL/path로 대체하지 못한다.
- Pages source checker는 `site/updater/stable.json` tracked 파일을 계속 거부한다. output checker는
  `manifestPublished=true`일 때 생성된 exact manifest 하나만 허용하고 false이면 부재를 요구한다.
- desktop workflow에 `artifact|updater` mode와 exact updater 입력을 추가한다. updater mode는
  x64 두 runner, release overlay, signing env, release inventory와 승인된 publish job만 사용한다.
  기본 mode의 기존 matrix·thumbnail·package smoke·Secret 불필요 동작은 회귀 test로 보존한다.
- workflow publish job은 default false, job-level write permission, exact tag/version과 complete
  inventory를 요구한다. stable/test publish를 실제 실행하지 않는다.
- package scripts에 focused inventory/manifest test와 verifier entrypoint를 추가한다.

### 검증

```bash
node --test tests/updater-release.test.mjs tests/pages.test.mjs tests/actions-workflows.test.mjs
pnpm run build:pages
pnpm run check:pages
pnpm run check:release-metadata
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

- negative fixture: missing/duplicate `.sig`, zero byte, signature swap, mutable URL, wrong repository/tag,
  MSI↔NSIS mapping, AppImage suffix, prerelease-in-stable, partial manifest와 private-key-like file.
- current source는 계속 `unreleased`, `manifestPublished=false`이며 `_site/updater/stable.json`이 없다.

### 커밋

```text
Task #16 Stage 3: updater release inventory와 Pages manifest gate 추가
```

## Stage 4 — production key·release 운영 통합

### 산출물

신규:

- `apps/desktop/src-tauri/tauri.updater.conf.json`
- `docs/architecture/UPDATER.md`
- `mydocs/working/task_m010_16_stage4.md`

수정:

- `.gitignore`
- `.github/workflows/alhangeul-desktop.yml`
- `scripts/check-release-metadata.mjs`
- `site/updates/index.html`
- `docs/operations/DESKTOP_RELEASE.md`
- Stage 1~3 검증에서 발견한 승인 범위 내 runtime·test 보정

### 변경 내용

- checkpoint A 승인 뒤 Tauri CLI로 production key pair를 repository 밖의 명시 경로에 생성한다.
  public key와 fingerprint만 tracked config/문서에 넣고 private key와 password는 독립 백업한다.
- checkpoint B 승인 뒤 GitHub signing Secrets와 필요한 protected environment를 등록한다. Secret
  read-back을 시도하지 않고 존재 여부와 workflow masking만 확인한다.
- tracked release overlay는 stable HTTPS endpoint, actual public key,
  `createUpdaterArtifacts: true`, Windows passive install만 포함한다. base config와 일반 build에는
  signing 설정을 넣지 않는다.
- release metadata checker가 plugin dependency, base/release config 분리, endpoint, non-placeholder
  public key와 일반 build의 updater artifact 비생성을 요구하도록 기존 임시 금지를 교체한다.
- architecture 문서에 native ownership, state/command/event, target evidence, dirty guard와 실패
  모델을 기록한다. 운영 문서에는 key 보관·유실·rotation, source SHA→artifact→Release→Pages 순서,
  rollback/no-rerun과 Secret 책임을 기록한다.
- updates 페이지는 MSI/NSIS/AppImage 앱 확인, 명시 설치와 수동 fallback을 설명하되 current
  unreleased 상태에서 updater가 활성화됐다고 주장하지 않는다.
- checkpoint C 승인 뒤 exact Stage 4 source SHA의 일반 artifact mode와 updater mode를 각각 한
  번 실행한다. 일반 mode는 Secret 없이, updater mode는 `.sig`와 release inventory를 생성해야 한다.

### 검증

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run build:pages
pnpm run check:pages
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

Windows/Linux exact-SHA gate:

```text
pnpm run test:desktop
pnpm run clippy:desktop
pnpm tauri build                      # 일반 mode, signing key 불필요
pnpm tauri build --config apps/desktop/src-tauri/tauri.updater.conf.json
```

- tracked/untracked file명·workflow log·Actions artifact에서 private key/password pattern 부재 확인.
- updater artifact의 target, size, SHA-256, `.sig`, source SHA와 public-key fingerprint read-back.
- 원격 검증은 Stage 4 source commit 뒤 승인된 substage 증적으로 보고서를 보정할 수 있으며 원인
  변경 없는 rerun은 하지 않는다.

### 커밋

```text
Task #16 Stage 4: updater key와 release 운영 계약 통합
```

## Stage 5 — MSI·NSIS·AppImage 실제 `N → N+1` 수용

### 산출물

신규:

- `mydocs/working/task_m010_16_stage5.md`

수정:

- 실제 수용에서 발견한 승인 범위 내 test/runbook 보정
- `docs/operations/DESKTOP_RELEASE.md`의 검증 증적 형식 보정이 필요한 경우에만 수정

### 변경 내용

- checkpoint D1에서 MSI가 prerelease suffix를 허용하지 않는 경계를 고려해 test-only
  N=`99.0.0`, N+1=`99.0.1`을 사용한다. N+1 tag는 production `v*` namespace와 분리한
  `updater-test-v99.0.1`, release title은
  `[TEST ONLY] Alhangeul Updater Acceptance 99.0.0 → 99.0.1`로 고정한다.
- N installer는 Actions artifact에만 두고 N+1 MSI·NSIS·AppImage, 각 `.sig`, complete inventory와
  `alhangeul-updater-test.json`만 GitHub public prerelease asset 후보로 만든다. N config의 endpoint는
  `https://github.com/postmelee/alhangeul-tauri/releases/download/updater-test-v99.0.1/alhangeul-updater-test.json`
  하나만 사용한다.
- stable config·inventory 검증을 완화하지 않고 별도 test-only config·inventory policy와 workflow
  gate를 둔다. 먼저 `publish=false`로 N/N+1 artifact와 acceptance contract를 검증한 뒤 exact
  Stage 5 candidate SHA, 원격 artifact ID·digest와 공개 예정 asset 8개를 checkpoint D2에 제시한다.
- checkpoint D2 승인 뒤에만 같은 source와 production key에서 만든 N+1 asset을 GitHub public
  prerelease에 게시한다. test release에는 경고 문구와 GitHub prerelease 표식을 함께 둔다.
- N installer는 test endpoint만 내장한 명시 test config로 다시 만들며 inventory에 override와
  source SHA를 기록한다. 이 binary를 제품 공개 asset이나 stable Pages에 재사용하지 않는다.
- Windows MSI와 NSIS는 각각 clean install N → check → download → install → N+1 실행을 수행한다.
  install kind, uninstall registry, executable path와 기존 HWP/HWPX 기본 연결·Open With를 대조한다.
- Linux x64 AppImage는 writable 위치의 N → N+1과 재시작 version을 확인한다. read-only 위치,
  DEB/RPM 실행과 arm64는 자동 설치 없이 manual fallback이어야 한다.
- 다운로드 중 다른 창을 dirty로 바꾼 뒤 install 차단, 시작부터 dirty, 중복 click, no-update,
  timeout/HTTP 오류, tampered artifact/signature와 cross-format manifest를 검증한다.
- 수용 증적을 Stage 5 보고서에 기록한 뒤 public test prerelease와
  `updater-test-v99.0.1` tag를 삭제한다. N/N+1 Actions artifact는 ID·digest를 기록하고 14일
  retention 만료까지 보존한다. stable manifest, 최종 public tag/release와 updater 활성화는
  checkpoint E 및 별도 release 승인으로 넘긴다.

### 승인된 Linux 다중 창 분리 진단 (2026-08-31, Stage 5.17)

- 작업지시자의 `진행해줘` 승인은 실패한 Linux 다중 창 구간의 원인 분리로 한정한다.
  D1 `33307079307` / source `de5b8dd2f5e7e69cc7ed05f955ff8b5f2649b9c8`의
  서명된 N AppImage를 그대로 재사용한다. 제품 재빌드와 Windows 재검증은 하지 않는다.
- Linux 전용 read-only workflow에서 일반 실행의 파일 → 새 창과 WebDriver 실행의 같은
  OS 메뉴 입력을 비교한다. 별도 WebDriver 세션의 native invoke 재현도 함께 수집한다.
  각 실행은 독립 Xvfb/D-Bus 세션이며 native 창 목록, 프로세스 상태, 화면과 raw driver
  stdout/stderr를 남긴다. WebDriver 소실만으로 제품 crash나 수용 성공을 판정하지 않는다.
- 변경 위치는 `.github/workflows/`의 전용 진단 workflow와 `tests/gui/linux/`의 진단 도구 및
  관련 contract test다. 본 구현계획서와 오늘할일만 갱신하며 공식 제품 문서는 변경하지 않는다.
- 로컬에서는 Node 단위/계약 테스트, actionlint와 diff 검사를 수행한다. Linux 앱 실행은
  Ubuntu runner에서만 수행한다. 진단 완료는 Stage 5 수용 완료와 구분한다.
- test release/manifest, stable/Pages, production key와 제품 소스는 변경하지 않는다.
  원인 확인 후 필요한 제품 또는 수용 방식 변경은 별도 승인으로 넘긴다.
- 비교 run `33369617161`에서 자동화 없는 `파일 → 새 창`도 exit code 1로 종료됨을 확인했다.
  같은 binary의 종료 지점을 GDB `exit_group` syscall catch/backtrace로 추가 관측한다.
  GDB는 disposable Linux runner에서만 실행하며 제품 수정이나 재빌드는 하지 않는다.

#### 진단 결과 — Stage 5 수용 미완료

- 첫 진단 `33369394585` / harness `01dc486f2383333e6b4ab15cb6eb7d5679318b92`는
  raw client의 `browserName: tauri` capability mismatch로 비교 전에 실패했다. 기존
  `@wdio/tauri-service`가 해당 display-only 값을 제거하는 것을 확인해 같은 계약으로 보정했다.
  이 run은 제품 다중 창 판정 근거로 사용하지 않는다.
- 비교 run [33369617161](https://github.com/postmelee/alhangeul-tauri/actions/runs/33369617161)
  / harness `b4abf7c3cc6c2e7a5cd6db15998ce1944445b6e8` / job `99417487801`:
  일반 UI, WebDriver + OS 메뉴, WebDriver + native invoke 모두 새 창 생성 직후 native 창이
  `1 → 0`이 되고 앱 프로세스가 사라졌다. 일반 UI 실행은 exit code `1`을 직접 관측했다.
  두 WebDriver 실행의 `page crash or hang`은 앱 종료 뒤 나타난 증상이다.
- 추가 run [33370146445](https://github.com/postmelee/alhangeul-tauri/actions/runs/33370146445)
  / harness `26b7111ef41d2736056533d33f968e0c1720dfb5` / job `99419150052`에서
  같은 세 경로의 종료를 재현했다. 일반 실행 + GDB의 main thread는 `exit_group(status=1)`에서
  멈췄으며 `gtk_widget_realize → gdk_window_new → XSetWMProtocols → XInternAtom →
  _XReply → _XIOError → GDK → _exit(1)` 스택을 남겼다. GDB batch 자체의 exit `0`은
  앱 성공이 아니며, 위 두 진단 run의 workflow success는 증적 수집 성공만 의미한다.
- 환경은 Ubuntu 22.04.5 / Xvfb / Openbox이며 runner WebKitGTK/WebKitWebDriver는 `2.50.4`다.
  스택에는 AppImage 내부 GTK/GDK와 host `libX11.so.6`가 보인다. X11 연결 오류가 발생한
  경로까지는 확인했으나 연결이 깨진 최하위 원인과 일반 Linux 데스크톱에서의 재현 여부는
  아직 확정하지 않았다. WebDriver 제약으로 간주해 다중 창 gate를 생략하지 않는다.
- 비교 artifact `9749643136`, digest
  `sha256:18304fd7fa627963504f5c5849d2f57c9b172fa9f73587df78e53069b9a24507`;
  native stack artifact `9749763715`, digest
  `sha256:ea27b4b59c8bab8a7305cb03cb9bd94fea82f89974d38f7c5f3b45c559059b15`.
  상세 결과는 각 artifact의 `*/summary.json`, 화면, `normal-gdb/launcher.stdout.log`에 있다.
- N AppImage SHA-256은 진단 전후 모두
  `34bfb79718f2e24463b9bce4687ff98b1f609ee318db01dc79e5bec011ded8de`다.
  앱 시작 시 자체 update check는 있었지만 다운로드·설치 명령은 실행하지 않았다.
  test release ID `379566223`의 asset 8개, positive manifest
  `4a1132f1c87ea2645cca112e723ab90c07dc441afcf431ecb6c93a65b7f3d778`, 제품 소스,
  production key/config와 stable/Pages는 변경하지 않았다.
- 다음 권고는 Linux GTK/X11 창 생성 문제의 원인 해소와 해당 구간 단독 재검증이다.
  제품 수정·재빌드·candidate 교체는 별도 승인 뒤 수행한다. 기존 D2 Windows MSI/NSIS 통과
  증적은 유지하되 Linux 실제 N→N+1, negative 수용, Stage 5 완료와 릴리스 게시를 주장하지 않는다.
- 최종 로컬 검증은 관련 Node 단위·계약 테스트 93개, product boundary 324개 파일,
  변경 workflow 두 개의 actionlint와 `git diff --check` 모두 통과했다.

### 승인된 Linux 창 생성 수정과 단독 검증 (2026-08-31, Stage 5.21)

- 작업지시자의 후속 `진행해줘`에 따라 GTK/X11 창 생성 종료의 원인 해소와 Linux 단독
  검증을 진행한다. 우선 기존 N AppImage의 X11 오류 직전 errno·native stack과 socket
  syscall을 관측해 연결 오류의 원인을 분리한다. 진단 trace는 disposable runner의
  빈 문서 실행에 한정하며 syscall buffer 내용은 기록하지 않는다.
- 원인에 맞는 최소 변경은 `apps/desktop/src-tauri/src/`의 Linux 실행·창 생성 경계 또는
  해당 문제를 유발한 Linux 진단 환경으로 제한한다. 필요한 경우 Linux 전용 unsigned
  build로 수정 전후를 대조하며 다중 창 안전 gate를 우회하지 않는다.
- 검증은 로컬 Node 계약·product-boundary·actionlint와 Linux runner의 일반 UI/자동화
  다중 창 생존·메뉴 응답으로 나눈다. Windows 전체 matrix는 반복하지 않는다.
- 문서 위치는 기존 구현계획서·오늘할일을 유지한다. 제품 공식 문서는 변경하지 않는다.
  test release/tag/manifest와 production key, stable/Pages는 그대로 두며 candidate 교체,
  재서명·게시 및 AppImage updater 수용 재개는 단독 검증 결과 후 별도 승인으로 넘긴다.
- 첫 추적 run `33371793648`에서는 두 번째 창까지 생존했으나 세 번째 창 생성에서 종료됐다.
  `_XIOError`의 errno는 `11`이며 이것만으로 원인을 단정하지 않는다. strace의 child 추적은
  setuid fusermount를 방해해 시작 전에 실패했으므로 main process만 추적하도록 보정한다.
- `window_geometry.rs`에서 GTK monitor 변환·workarea 조회를 메인 스레드로 옮기는 최소
  수정안을 검증한다. Tauri 2.10.1은 monitor handle을 호출 스레드에서 변환한다는 소스
  근거가 있으며, Rust 창 builder 자체는 기존 worker에 유지해 동기 생성 deadlock을 피한다.
  이 변경의 문제 해결 여부는 unsigned Linux AppImage의 일반 UI·WebDriver UI·native invoke
  세 독립 세션에서 각각 창 5개와 응답성을 확인하기 전까지 확정하지 않는다.

#### 수정·단독 검증 결과 — Stage 5.22

- [Linux 단독 run 33372263598](https://github.com/postmelee/alhangeul-tauri/actions/runs/33372263598)
  / job `99425816891` / source·harness `f9c39ccc0a9f1f418c3b8576cecfb6e90c7cf91e`는
  14분 12초에 성공했다. 기존 D1 source 대비 제품 변경은 `window_geometry.rs` 하나다.
  창 builder는 기존 worker에서 유지하고 GTK monitor 변환·workarea 조회만 메인 스레드에
  한정했다. 이는 [GTK/GDK의 메인 스레드 호출 규칙](https://docs.gtk.org/gdk3/func.threads_init.html)에
  맞춘 변경이며, plain logical rectangle만 worker로 반환한다. Windows 경로는 유지했다.
- 동일 runner의 수정 전 D1 N AppImage는 WebDriver UI·일반 GDB·일반 strace 실행 모두
  native 창이 `1 → 0`으로 사라졌다. `_XIOError` 시 errno `11`,
  `xcb_connection_has_error`는 `0`이었으며 main-process syscall trace에는 종료 직전
  정상 socket 응답과 EAGAIN 뒤 `exit_group(1)`이 나타났다. 따라서 이전의 "X11 연결 오류"는
  Xlib 오류 경로 관측을 뜻하며 서버/소켓 단절 자체가 입증된 것은 아니다.
- 수정본의 일반 OS 메뉴, WebDriver + OS 메뉴, WebDriver + native invoke 세 독립 실행은
  각각 native 창이 `1 → 2 → 3 → 4 → 5`로 증가해 최종 5개를 유지했다. 두 자동화 실행은
  별개의 WebDriver handle 5개를 순회하며 각 창의 document ready와 native bridge 응답을
  확인했다. 일반 실행은 새 창의 실제 메뉴로 다음 창을 만들었고 마지막 화면도 확인했다.
  창 위치가 같아 screenshot에는 겹쳐 보이므로 창 개수는 OS 목록·handle 증거로 판정했다.
- Linux `cargo test --release --target x86_64-unknown-linux-gnu --lib window_geometry::tests`
  6개 통과, Linux unsigned AppImage build 통과. 수정본 SHA-256은
  `e1b05de719df861222b706a8c3b8d1ad5bbe7cbf27a664cd24a9d88ecd920b9a`다.
  별도 서명 overlay 없이 제품 기본 `0.1.0` config로 만든 회귀 검증용이므로 기존 test-only
  `99.0.0 → 99.0.1` updater 수용 또는 배포 후보로 간주하지 않는다. 검증 범위는
  Ubuntu 22.04 / Xvfb / Openbox이며 모든 Linux 환경에 대한 보증은 아니다.
- artifact `9750909766`, digest
  `sha256:9441096019ce016c1b310a9142352057664187168c8c71af8477d438c7826267`에
  `fixed-*/summary.json`, 창별 driver 요청, native 목록·화면, 원본 GDB/syscall trace,
  geometry test/build log와 두 binary hash를 보존했다. 비교용 기존 N hash는 변경되지 않았다.
  앞선 errno 진단 `33371793648`의 artifact는 `9750389959`, digest
  `sha256:6619b5c6ea73cd8d4aa46eb873f0bcd76ba900fcdfc7e5fd825956f6de5576ed`다.
- 로컬 `pnpm run test:automation` 351개, product boundary 324개 파일, 변경 workflow의
  actionlint와 `git diff --check` 통과. native desktop build/test는 Linux runner에서만 실행했다.
- 기존 test release `379566223`의 asset 8개와 positive manifest
  `4a1132f1c87ea2645cca112e723ab90c07dc441afcf431ecb6c93a65b7f3d778` 유지 상태를
  API로 확인했다. production key/config, stable/Pages, release/tag/asset은 변경하지 않았다.
- 다음 권고는 수정된 exact source의 N/N+1 후보 생성이다. 기존 Windows 통과 증적은
  보존하지만 서로 다른 source SHA를 하나의 candidate로 섞지 않는다. 새 source·test tag와
  endpoint·서명 build·게시 범위를 먼저 제시해 승인받은 뒤 D1/D2를 갱신한다. 기존 tag 이동,
  asset 덮어쓰기 또는 최신 unsigned build를 서명된 N 대신 사용하는 우회는 하지 않는다.
  Linux 실제 N→N+1·negative 수용, Stage 5 완료와 최종 릴리스는 아직 미완료다.

### 승인된 수정 source의 D1 재개 (2026-09-02, Stage 5.24)

- 작업지시자의 `진행해줘` 승인은 Linux 창 생성 수정이 포함된 exact source에서 새 서명 후보를
  생성하는 D1 재개로 한정한다. 기존 `99.0.0 → 99.0.1` test release/tag/asset은 변경하지 않는다.
- 새 격리 identity는 N=`99.1.0`, N+1=`99.1.1`, tag=`updater-test-v99.1.1`, endpoint는
  `https://github.com/postmelee/alhangeul-tauri/releases/download/updater-test-v99.1.1/alhangeul-updater-test.json`으로
  고정한다. 첫 실행은 `publish_release=false`인 Actions artifact 생성만 허용한다.
- Linux native 수용은 소스에 N+1 AppImage 해시를 수동 고정하지 않는다. 승인된 D1 candidate
  artifact ID·digest를 다시 검증하고 그 안의 서명된 AppImage SHA-256을 읽어 실제 업데이트 뒤
  파일과 대조한다. 따라서 후보 해시 기록을 위한 source 변경·재빌드 순환 없이 같은 exact source를
  D1과 D2에 사용한다.
- 변경 위치는 updater acceptance policy·release verifier, 관련 workflow·contract test,
  본 구현계획서·오늘할일과 기존 공식 운영 문서다. stable config, Pages, production release와
  기존 test release는 변경하지 않는다.
- 로컬 Node 계약·전체 automation test, product boundary, actionlint와 diff 검증 뒤 exact source를
  push하고 D1을 한 번 실행한다. 성공한 run과 candidate artifact ID·digest·8개 asset inventory를
  확인한 뒤, 새 prerelease 게시는 checkpoint D2의 별도 승인으로 넘긴다.

#### D1 재개 결과 — 비게시 후보 생성 완료

- exact source `9d5ddbdbdaeb2b1759363f0776db21008e976e51`의
  [D1 run 33612953592](https://github.com/postmelee/alhangeul-tauri/actions/runs/33612953592)는
  Windows/Linux N·N+1 서명 build 네 개와 read-only complete verifier를 모두 통과했다.
  `publish_release=false`로 실행해 Release, tag와 Pages는 생성하거나 수정하지 않았다.
- 공개 예정 candidate artifact는 ID `9840727986`, digest
  `sha256:e9a2b4ccc6c0eecf753b645d49a8840857ffe804cb0ea49f9e8cd77dd3511075`다.
  N inventory는 ID `9840722833`, digest
  `sha256:f8cd47980d86a3bf83ee17c17d2d848812d32e6f9f73e168b97f044b71ba3493`다.
  N Windows/Linux와 N+1 Windows/Linux slice ID는 각각 `9840667481`, `9840698265`,
  `9840674018`, `9840277997`이며 모두 source SHA와 14일 보존 기한에 결속됐다.
- N+1 inventory는 version `99.1.1`, tag `updater-test-v99.1.1`, 승인 endpoint와 production
  public-key fingerprint `100c8f3183b25de3366574c46a1a2a66950a1d5f24862f3461c27b095713ffdd`를
  기록한다. installer SHA-256은 NSIS
  `b55c2323973e47232149e17886e1b103ec252823f57592e3d3a0099f37467360`, MSI
  `0382713673667be43a5235eaee2752c166db7bd87a7ba1586aab3e003c697a3c`, AppImage
  `5e49dadb900dfd4756cbda91f602a788c6a98c81fa93dff47955ae7adca45cd7`다.
  inventory·manifest SHA-256은 각각
  `62c59092c7694105b00df56ef7fb9bb976512d61a79e47ba807b19c427765300`,
  `55ebb86c8ea5bb21e4625b00d9cbe1d9319e4c35511fd816847acca395ab705c`다.
- candidate 8개 파일을 임시 경로에 내려받아 cardinality·SHA-256을 다시 계산했고,
  `check:updater-acceptance`로 세 installer의 실제 Minisign signature를 재검증했다.
  로컬 전체 automation 351개, product boundary 324개 파일, 관련 actionlint와 diff 검사도 통과했다.
- 기존 `updater-test-v99.0.1` prerelease의 source와 8개 asset은 유지됐다. 새
  `updater-test-v99.1.1`은 아직 존재하지 않는다. 다음 단계는 이 candidate ID·digest를
  checkpoint D2에서 별도 승인받은 뒤 새 test prerelease만 게시하는 것이다. stable release와
  Pages 게시는 계속 금지한다.

#### D2 결과 — test-only public prerelease 게시·read-back 완료

- 작업지시자의 checkpoint D2 승인에 따라 exact source
  `9d5ddbdbdaeb2b1759363f0776db21008e976e51`과 D1 candidate artifact `9840727986`만 사용해
  [`updater-test-v99.1.1`](https://github.com/postmelee/alhangeul-tauri/releases/tag/updater-test-v99.1.1)을
  게시했다. release ID는 `381136281`, 제목은
  `[TEST ONLY] Alhangeul Updater Acceptance 99.1.0 → 99.1.1`이며 `draft=false`,
  `prerelease=true`, latest 비지정 상태다. tag ref와 `target_commitish`는 모두 위 exact source다.
- 공개 전 draft에서 8개 asset만 존재하는지 확인하고 새 임시 경로로 전부 다시 내려받아
  D1 SHA-256과 일치함을 확인했다. 공개 후 프로젝트 `verify-acceptance-release.mjs`로 tag ref,
  release identity, asset cardinality·size·digest·URL, inventory·manifest, 세 signature read-back을
  다시 검증했다. verifier 결과는 `Updater acceptance release verified: updater-test-v99.1.1
  (8 assets)`다.
- asset ID는 AppImage·signature `540960119`·`540960125`, MSI·signature
  `540960118`·`540960139`, NSIS·signature `540960143`·`540960141`, inventory·manifest
  `540960120`·`540960117`이다. inventory·manifest SHA-256은 D1과 같은
  `62c59092c7694105b00df56ef7fb9bb976512d61a79e47ba807b19c427765300`,
  `55ebb86c8ea5bb21e4625b00d9cbe1d9319e4c35511fd816847acca395ab705c`다.
- 기존 `updater-test-v99.0.1`은 source
  `de5b8dd2f5e7e69cc7ed05f955ff8b5f2649b9c8`, `draft=false`, `prerelease=true`, 8개 asset
  상태로 유지됐다. stable release와 Pages는 생성·수정하지 않았다.
- D2는 게시와 원격 동일성 검증까지만 완료했다. 다음 단계는 이 공개 endpoint를 사용하는
  Windows x64 MSI·NSIS와 Linux x64 AppImage의 실제 `99.1.0 → 99.1.1` native 수용이며,
  아직 실행하거나 성공으로 판정하지 않는다.

#### 첫 native 수용 결과와 Linux harness 최소 보정 계획 — Stage 5.27

- 작업지시자 승인 뒤 exact candidate source
  `9d5ddbdbdaeb2b1759363f0776db21008e976e51`, D1 run `33612953592`, candidate artifact
  `9840727986` / `sha256:e9a2b4ccc6c0eecf753b645d49a8840857ffe804cb0ea49f9e8cd77dd3511075`,
  D2 tag `updater-test-v99.1.1`을 입력으로
  [native run 33616611952](https://github.com/postmelee/alhangeul-tauri/actions/runs/33616611952)를
  실행했다. harness SHA는 `336e971ec65535265565eaf2adaf00cc82c39d7e`이며 release handoff와
  public test prerelease read-back은 통과했다.
- Windows MSI job `100203871854`와 NSIS job `100203871850`은 N clean install, target별
  preflight·dirty gate, 실제 `99.1.0 → 99.1.1` apply, 설치 record·파일 연결 보존, N+1
  no-update, 제거와 WebView2 정책 복원까지 모두 통과했다. 증적 artifact는 MSI
  `9841269613` / `sha256:3f4f444d4dcfad456e018c9a8d5a0cbf926dcfc081cfe56fd11980afeee525fa`,
  NSIS `9841280513` / `sha256:544c89503b9b5503a721d0fbe42b2a0df66fcf203caa069043ef7930223b462a`다.
- Linux AppImage job `100203872003`은 설치·실행 전 `Read verified N+1 AppImage identity`에서
  실패했다. exact candidate 전체 8개 파일을 단일 Linux target root로 검사하면서 정상 Windows
  MSI signature를 `대응 installer가 없는 signature`로 판정한 것이 직접 원인이다. candidate
  handoff와 digest 일치는 이미 통과했으며 AppImage 업데이트 자체는 실행되지 않았으므로 제품
  실패로 판정하지 않는다. 실패 증적 artifact는 `9841247344` /
  `sha256:893dbc44d6cad3b23a3fc61b40d59b8b6a61d7075972bd4f8ae9cee7c6b440c5`다.
- 보정은 `.github/workflows/alhangeul-updater-native-linux.yml`과 해당 계약 test로 제한한다.
  승인된 전체 candidate root는 그대로 보존하고, 정확히 하나인 AppImage와 같은 경로의 `.sig`를
  별도 Linux 검증 root에 복사한 뒤 기존 `check:updater-acceptance`의 strict single-target 검사를
  적용한다. 공용 verifier의 unexpected signature 거부 규칙은 완화하지 않는다.
- 로컬 updater acceptance·전체 automation, product boundary, actionlint와 diff 검증 뒤 harness만
  새 SHA로 push한다. D1/D2 candidate·release는 재빌드·교체하지 않고 같은 exact identity로 positive
  native 수용을 새로 한 번 실행한다. 기존 실패 run의 job 재실행은 옛 workflow SHA를 재사용하므로
  수행하지 않는다. source 수정과 새 run은 본 보정 계획의 별도 승인 전 시작하지 않는다.

### 검증

- MSI N → N+1 성공, MSI target만 요청, 설치/제거 registry와 파일 연결 보존
- NSIS N → N+1 성공, NSIS target만 요청, current-user 경로와 파일 연결 보존
- MSI↔NSIS URL 교차, valid signature의 wrong kind와 architecture mismatch download 전 거부
- AppImage N → N+1 성공과 재시작, read-only·비-AppImage manual fallback
- dirty before download와 dirty after download 모두 install/exit/restart 이전 차단
- tamper/signature mismatch, no-update, timeout·HTTP 오류 뒤 편집 지속과 manual retry
- release inventory와 원격 asset read-back의 size/SHA-256/signature/source SHA 일치
- stable Pages `updater/stable.json`과 current `site/release.json`이 변경되지 않음
- `git diff --check`

### 커밋

```text
Task #16 Stage 5: 세 updater 형식의 N→N+1 수용 확정
```

## 검증

- 각 Stage 검증은 단계 보고서 전에 실행하고 실패 상태를 완료로 기록하지 않는다.
- Stage 1~3의 Rust source는 Stage 4 Windows/Linux test·clippy 전까지 native 수용으로 주장하지 않는다.
- 원격 run은 exact source와 workflow SHA, inputs, run/job/artifact ID를 단계 보고서에 기록한다.
- signing 또는 설치 실패는 key/config, build, inventory, publish, target, download, install로 분류하고
  원인 변경 없는 job 재실행을 금지한다.
- 현재 host에서 지원 범위 밖 macOS Tauri build·desktop Rust validation을 실행하지 않는다.
- 계획 변경이나 예상 밖 source/공식 문서가 필요하면 먼저 본 구현계획을 갱신하고 승인받는다.

## 커밋

- 단계 source와 `mydocs/working/task_m010_16_stage{N}.md`를 같은 commit에 묶는다.
- 기본 메시지는 `Task #16 Stage {N}: ...`를 사용한다.
- 승인된 원격 검증이나 설치 수용 뒤 보고서 보정이 별도 commit을 요구하면 기존 Stage commit을
  재작성하지 않고 `Task #16 [Stage N.M]: ...` 형식으로 남긴다.

## 단계 의존성

- Stage 2는 Stage 1의 상태·target·dirty query 승인 뒤 시작한다.
- Stage 3은 Stage 2의 Rust/TypeScript 명령과 UI 계약 승인 뒤 시작한다.
- Stage 4는 Stage 3 source gate 승인과 checkpoint A/B 승인 뒤 production key를 다룬다.
- Stage 5는 Stage 4 exact-SHA signed artifact가 완전하고 checkpoint D1이 승인된 뒤 test-only
  source를 구현한다. public test release와 native 수용은 checkpoint D2 승인 뒤 시작한다.
- checkpoint E는 Stage 5 완료 뒤에도 자동 승인되지 않는다. 최종 release 작업에서 verified
  immutable artifact와 Pages source commit을 다시 제시해야 한다.

## 위험과 대응

- **workflow 신규 파일 dispatch 불가**: 기본 브랜치에 이미 존재하는 `alhangeul-desktop.yml`의
  명시 mode를 사용하고 updater mode에서 workflow SHA와 exact source SHA를 함께 확인한다.
- **대형 installer memory 보관**: plugin의 분리 download/install 경계가 dirty 재검사에 필요하다.
  한 operation만 보관하고 install/차단/오류 즉시 bytes를 폐기하며 메모리 상한을 native test한다.
- **valid signature의 wrong installer**: signature만 신뢰하지 않고 custom target, release inventory,
  URL kind를 runtime과 publish gate에서 모두 대조한다.
- **Windows registry drift**: 특정 display 문자열 하나를 고정하지 않고 installer source와 실제
  N 설치 record를 fixture·수용에서 함께 확인한다. 불명확하면 자동 설치하지 않는다.
- **key 유실 또는 source 노출**: 독립 백업과 fingerprint 확인 전 Secret을 등록하지 않으며 private
  material 탐지 시 artifact·release를 폐기하고 task를 중단한다.
- **test prerelease 오인**: test 전용 tag/endpoint와 화면 표식을 쓰고 stable metadata에 연결하지
  않는다. 종료 후 보존/삭제 상태를 보고서에 기록한다.
- **Pages 부분 게시**: release data의 세 target/signature가 모두 유효할 때만 manifest를 output에
  생성하며 Pages는 한 artifact로 deploy한다. 실패 시 기존 stable feed를 유지한다.

## 승인 요청 사항

- 네 custom command, 단일 explicit apply 흐름과 `alhangeul-updater-state` event 계약
- Windows registry+path, Linux AppImage evidence와 response URL kind의 3중 fail-closed 판별
- 일반 desktop workflow를 유지하면서 같은 workflow에 명시 updater mode를 추가하는 보정
- tracked production release overlay와 생성된 test config의 분리
- source에 manifest를 commit하지 않고 complete release data에서 Pages output으로 생성하는 방식
- 5개 Stage, 단계별 파일·검증·커밋 메시지와 Stage 4 누적 native gate
- key, GitHub 설정, 원격 build, test release, stable Pages의 다섯 별도 승인 checkpoint

승인되면 Stage 1의 updater 상태·target·dirty-session source부터 구현한다. 이 승인만으로
production key 생성, GitHub Secret 등록, workflow 실행, test release 또는 stable manifest 게시를
수행하지 않는다.
