# Task #50 구현계획서 — Linux HWPX MIME 매칭과 thumbnail 검증 gate 보정

수행계획서: [`task_m010_50.md`](task_m010_50.md)
GitHub Issue: [#50](https://github.com/postmelee/alhangeul-tauri/issues/50)
마일스톤: M010

2026-08-31 작업지시자의 "진행해줘"를 수행계획 승인과 구현계획서 작성 지시로
기록한다. 이 문서는 구현계획 승인 대기 상태이며 Stage 1 소스 변경은 아직
시작하지 않았다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | HWPX MIME와 package lifecycle 계약 | 제품 MIME XML, refresh hook, DEB/RPM mapping·evidence | MIME canary, archive·hook·owner·원복 계약 |
| 2 | Core probe required gate | 기대값 manifest, summary module, 음성 테스트 | 결과·exit·시간·RSS·record 누락/중복 판정 |
| 3 | 조상 symlink path 정책 | resolved Request, CLI·output 회귀 | Linux x64·arm64 Rust test/Clippy |
| 4 | Package-installed file-manager 재수용 | MIME 주입 제거, install 전후 evidence, GUI 캡처 | x64 DEB/RPM, arm64 DEB, x64 Nautilus·Thunar |
| 5 | 공식 문서와 최종 회귀 | architecture·개발·운영·README 정렬 | 플랫폼 중립 검증과 exact-SHA native 결과 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `LINUX_THUMBNAILS.md` | `docs/architecture/` | `docs/architecture/LINUX_THUMBNAILS.md` | OK | Stage 5에서 기존 공식 계약 보정 |
| `DEVELOPMENT.md` | `docs/` | `docs/DEVELOPMENT.md` | OK | Linux 실행 환경·검증 명령 |
| `DESKTOP_RELEASE.md` | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | package 및 GUI 수용 범위·증거 |
| `README.md` | 저장소 루트 | `README.md` | OK | 실제 검증된 지원 범위만 요약 |
| 수행·구현계획 | `mydocs/plans/` | `mydocs/plans/task_m010_50*.md` | OK | 승인·단계 판단 |
| 단계 보고 | `mydocs/working/` | `mydocs/working/task_m010_50_stage{N}.md` | OK | exact SHA와 단계 증적 |
| 최종 보고 | `mydocs/report/` | `mydocs/report/task_m010_50_report.md` | OK | 최종 보고 절차에서 작성 |
| 오늘할일 | `mydocs/orders/` | `mydocs/orders/20260831.md` 및 작업일 보드 | OK | 날짜 전환에 따른 상태 기록 |

## 공통 구현 규칙

- 작업 위치는 `local/task50` 분리 worktree다. 시작 기준은
  `origin/devel=8b865fa55b55aea232d0fb034a518c807ac4c003`, 수행계획 커밋은
  `fd5d0ef4730959b45f390838f1c37046fcdda68e`다. 2026-08-31 fetch 후 기준선
  변경이 없음을 확인했다. Stage 진입마다 다시 비교하며 다른 task branch를
  임의 merge/rebase하거나 미커밋 변경을 되돌리지 않는다.
- 이번 구현계획은 승인된 기능 범위를 유지한다. 수행계획의 예상 파일 목록에서
  빠졌던 package fixture 생성기·artifact test 및 HWPX MIME을 고정하는 release
  metadata checker도 함께 정렬한다. 새 MIME·core 보조 모듈은 아래 Stage별
  경로로 한정한다.
- 신규 소스는 파일 300 LOC, 함수 50 LOC, 매개변수 5개, 복잡도 10의 권장
  상한을 지킨다. 기존 큰 smoke·test에 동작을 누적하지 않고 MIME snapshot과
  core fixture/summary 책임을 분리한다. 상한 예외가 필요하면 먼저 승인받는다.
- Rust compile/test/Clippy, MIME database 도구, package transaction과 GUI는
  Linux에서만 실행한다. 현재 호스트에서는 문서 및 플랫폼 중립 source test만
  실행한다. Rust desktop/Tauri 검증을 지원 범위 밖의 호스트에서 수행하지 않는다.
- system path를 쓰는 검증은 기존 `GITHUB_ACTIONS=true`와
  `ALHANGEUL_PACKAGE_SMOKE_ALLOW_SYSTEM=1` opt-in ephemeral runner만 허용한다.
  개발 장비의 `/usr/share/mime`, 기본 앱과 file manager는 변경하지 않는다.
- 공유 `document-preview`, `third_party/rhwp` gitlink, Windows handler,
  1,500 ms worker deadline과 256 MiB `RLIMIT_AS`는 변경하지 않는다.
- fixture는 현재 pin의 공개 sample을 사용하고 원본 SHA-256·size·mtime 불변을
  검사한다. artifact에 비공개 문서, 사용자 절대 경로 또는 본문을 기록하지 않는다.
- 원격 검증에 필요한 candidate는 일반 fast-forward push로
  `local/task50:publish/task50`에만 올린다. exact source SHA, workflow SHA,
  run ID와 artifact digest를 보고서에 연결한다. `local/task50` 이름으로 원격
  branch를 만들거나 force push, tag, release, package 게시를 하지 않는다.
- 이 구현계획의 승인 범위에는 해당 Stage의 candidate push와 기존 수동 Actions
  dispatch를 포함한다. 이 턴에서는 push·dispatch·PR 게시를 수행하지 않는다.

## Stage 1 — HWPX MIME와 package lifecycle 계약

### 산출물

신규:

- `apps/desktop/src-tauri/linux/alhangeul-hwpx.xml`
- `apps/desktop/src-tauri/linux/update-mime-database.sh`
- `scripts/linux-thumbnail-mime-contract.mjs` — MIME snapshot·보존·evidence 비교
- `scripts/linux-thumbnail-mime-smoke.sh` — 격리 MIME root old/new 정의 canary
- `tests/linux-thumbnail-mime.test.mjs` — XML·hook·snapshot 의미 검증
- `mydocs/working/task_m010_50_stage1.md`

수정:

- `apps/desktop/src-tauri/linux/alhangeul.thumbnailer`
- `apps/desktop/src-tauri/tauri.conf.json`
- `scripts/linux-thumbnail-package-smoke.mjs`
- `scripts/linux-thumbnail-package-contract.mjs`
- `scripts/linux-thumbnail-package-fixtures.mjs`
- `scripts/verify-linux-thumbnail-package-evidence.mjs`
- `scripts/check-release-metadata.mjs`, `tests/release-metadata.test.mjs`
- `tests/linux-thumbnail-registration.test.mjs`
- `tests/linux-thumbnail-packaging.test.mjs`
- `tests/desktop-artifacts.test.mjs`
- `.github/workflows/alhangeul-desktop.yml`, `tests/actions-workflows.test.mjs`
- `package.json` — 새 MIME test를 기존 automation inventory에 포함

### 변경 내용

- 제품 XML에 `application/x-hwpx`, `*.hwpx`, ZIP 하위 타입과
  `application/hwp+zip` mimetype magic을 선언한다. alias는
  `application/hwp+zip`, `application/vnd.hancom.hwpx`,
  `application/x-hwp+zip`로 정렬한다. HWP·일반 ZIP 전체를 제품 타입으로
  가로채거나 제3자 정의를 지우는 `glob-deleteall`·`magic-deleteall`은 쓰지 않는다.
- registration은 `application/x-hwp;application/x-hwpx;`로 정렬하고 `%i %o %s`,
  절대 helper 경로와 기타 handler 경계는 유지한다. Tauri HWPX association의
  MIME만 정렬하고 Windows ProgID·extension·installer template은 변경하지 않는다.
  release metadata checker도 동일 canonical 값을 요구하게 하고 이전 alias로의
  config drift를 실제 negative test로 거부한다. 다른 release metadata와 updater
  금지 조건은 바꾸지 않는다.
- DEB/RPM은 `/usr/share/mime/packages/alhangeul-hwpx.xml`을 mode `0644`로
  소유한다. XML, helper, registration의 archive cardinality, installed mode,
  content/hash와 단일 owner를 각각 검사한다. generated MIME cache는 package
  파일로 직접 소유하거나 배포하지 않는다.
- 공통 post-install/post-remove hook은 고정된 system MIME root에만 refresh를
  실행한다. argument·환경 변수로 임의 root를 받거나 오류를 무조건 숨기지 않는다.
  command 부재·비정상 종료는 silent success로 처리하지 않는다. 필요한
  `shared-mime-info` dependency는 Tauri 기본 dependency를 보존하며 명시하고,
  실제 DEB/RPM metadata에서 두 조건을 검증한다.
- hook 단위 테스트는 command double로 인자와 종료 상태를 검사하며 개발
  호스트의 실제 MIME command는 실행하지 않는다. `mimeapps.list`, default 앱,
  cache purge, file manager 종료와 제품 XML 외 삭제는 금지한다.
- canary는 private MIME root에 제품 XML을 설치·제거하면서 old 정의 부재와
  new 동일 canonical 정의 공존을 나눠 검사한다. glob과 magic을 따로 검증하고
  일반 ZIP negative도 둔다. 이 canary는 MIME 단위 검증이며 Stage 4의
  package-only GUI evidence를 대신하지 않는다.
- package smoke는 설치 전후 `gio` type, XML hash/owner, canonical/alias 조회와
  제3자 MIME sentinel을 기록한다. 제거 후에는 항상 ZIP이어야 한다고 가정하지
  않고 설치 전 baseline 의미로 복귀하는지 확인한다. system cache의 timestamp나
  byte 단위 동일성 대신 제품 정의 제거와 기존 정의·기본 앱 보존을 판정한다.
- 기존 pre-install failure rollback은 그대로 유지한다. refresh 실패 경로도
  disposable fixture에서 별도 주입하고, failure 후 설치 상태·cache를 관측한 뒤
  알려진 candidate 재설치/제거로 복구한다. package manager가 자동 rollback을
  하지 않은 경우 이를 자동 rollback 성공으로 기록하지 않는다.
- evidence에는 transition별 실행 결과를 넣는다. 기존처럼 lifecycle 이름 목록만
  존재하거나 MIME 관측값이 빠진 summary는 verifier가 거부한다. producer,
  consumer와 synthetic artifact fixture를 같은 Stage에서 갱신한다.

### 검증

플랫폼 중립:

```bash
node --test tests/linux-thumbnail-mime.test.mjs tests/linux-thumbnail-registration.test.mjs tests/linux-thumbnail-packaging.test.mjs tests/desktop-artifacts.test.mjs tests/actions-workflows.test.mjs
node --test tests/release-metadata.test.mjs
node scripts/check-release-metadata.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck apps/desktop/src-tauri/linux/update-mime-database.sh scripts/linux-thumbnail-mime-smoke.sh scripts/linux-thumbnail-package-smoke.sh
actionlint .github/workflows/alhangeul-desktop.yml
git diff --check
```

Linux native candidate에서 MIME canary, x64 DEB/RPM 및 arm64 DEB archive·hook
metadata와 lifecycle이 통과해야 한다. 이 시점의 기존 GUI MIME 주입과 기존 core
gate는 Task #50 전체 성공 근거로 사용하지 않는다.

### 커밋

```text
Task #50 [Stage 1.1]: HWPX MIME와 package lifecycle candidate
Task #50 Stage 1: HWPX MIME 소유권과 설치 제거 계약 확정
```

## Stage 2 — Core probe required gate 강화

### 산출물

신규:

- `scripts/linux-thumbnail-core-summary.mjs` — record 판정과 summary CLI
- `scripts/linux-thumbnail-core-fixtures.mjs` — pinned fixture별 독립 기대값
- `mydocs/working/task_m010_50_stage2.md`

수정:

- `scripts/benchmark-linux-thumbnail-core.sh`
- `tests/linux-thumbnail-core-probe.test.mjs`
- `.github/workflows/alhangeul-desktop.yml`, `tests/actions-workflows.test.mjs` — 실제
  required outcome와 진단 upload 연결에 필요한 부분만

### 변경 내용

- 기존 세 positional input, 128/256/512/1024 edge와 direct/preview 독립 process
  계측을 유지한다. expectation은 측정된 `result.success`에서 역산하지 않는다.
  현재 pin의 fixture SHA와 preview 보유 구조를 확인해 manifest로 고정하며
  알려지지 않은 fixture, 누락/중복 조합은 실패한다.

| Fixture class | direct 기대값 | preview 기대값 |
|---|---|---|
| `normal-hwp`, `normal-hwpx` | `true` | 고정 SHA manifest의 preview 보유 기대값 |
| `preview-absent` | `true` | `false` |
| `preview-stale` | `true` | `true` — 유효하지만 의도적으로 다른 preview |
| `corrupt-truncated` | `false` | `false` |
| `size-boundary-64mib-plus-one` | `false` | `false` |

- 기대값과 관측값이 다르면 실패한다. 정상 fixture direct 실패를 preview 성공으로
  덮지 않으며, negative fixture의 의도된 `false`는 process 성공과 구분한다.
  현재 계측 binary의 `exitCode=0`은 결과 JSON 출력 성공을 뜻하므로 모든 record에
  exit 0과 `timedOut=false`를 요구한다.
- 모든 record의 metric은 유효한 유한 수여야 한다. 누락·NaN·음수 wall 또는
  0/누락 RSS를 정상 측정으로 간주하지 않는다. 기대 성공 render마다 wall
  `<=1,500 ms`, peak RSS `<=268435456 bytes`를 검사한다. p95와 max는 진단으로
  유지하되 일부 느린 record를 평균·백분위로 숨기지 않는다.
- shell 안전 timeout은 5초, TERM 후 강제 회수 유예는 1초로 줄인다. 성공 예산은
  여전히 1,500 ms다. JSON 파손을 단순 `success:false`로 바꿔 negative fixture
  성공으로 만들지 않고 parse 오류를 별도 실패로 남긴다.
- 256 MiB peak RSS gate는 core 측정 기준이다. 실제 helper의 256 MiB
  `RLIMIT_AS`는 가상 주소공간 제한이며 서로 동일한 검증이라고 주장하지 않는다.
  worker deadline/limit는 Stage 3 native contract에서도 별도로 재검증한다.
- summary는 기대·실제 결과, 초과 항목, exact repository/rhwp SHA와 manifest
  식별값을 기록한다. 실패 JSON도 먼저 저장하고 CLI nonzero로 끝내 기존 required
  outcome gate에 전달한다. CLI로 성공/실패 fixture를 실제 실행해 종료 코드를 본다.
- 경계 테스트는 1,500/1,501 ms, 268435456/268435457 bytes, 정상 및 비정상 exit,
  timeout, malformed JSON, 빈 records, unknown fixture, 누락·중복 edge/mode,
  정상 render 실패와 negative 기대값 뒤집기를 각각 검증한다.

### 검증

```bash
node --test tests/linux-thumbnail-core-probe.test.mjs tests/actions-workflows.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck scripts/benchmark-linux-thumbnail-core.sh
actionlint .github/workflows/alhangeul-desktop.yml
git diff --check
```

Linux x64·arm64의 실제 core probe가 모든 expected record를 처리해야 한다.
strengthened gate에서 새로운 실제 render 실패가 확인되면 기준을 낮춰 통과시키지
않고 renderer 변경 제외 범위와 대조해 보고한다.

### 커밋

```text
Task #50 [Stage 2.1]: Linux thumbnail core semantic gate candidate
Task #50 Stage 2: 렌더 결과와 resource 예산의 required 판정 강화
```

## Stage 3 — 조상 symlink path 정책 정렬

### 산출물

- `apps/linux-thumbnailer/src/cli.rs`
- `apps/linux-thumbnailer/tests/thumbnailer_contract.rs`
- `mydocs/working/task_m010_50_stage3.md`

### 변경 내용

- input leaf를 `symlink_metadata`로 검사해 파일 자체 symlink, non-regular,
  초과 크기·상대 경로를 거부한 뒤 canonical path와 metadata를 확인한다.
  caller의 원래 문자열 대신 resolved absolute input을 Request에 저장한다.
- output은 존재하는 parent를 canonicalize한 뒤 원래 leaf name을 결합한다.
  parent 자체와 더 위 조상 symlink는 허용하되 missing/dangling parent,
  non-directory parent와 output leaf symlink는 거부한다. resolved input과 output
  동일성을 검사한 후 worker에도 resolved path만 전달한다.
- canonicalization을 race-free 파일 handle 고정과 동일시하지 않는다. 기존
  output leaf 재검사, `O_NOFOLLOW`, device/inode 확인과 Tumbler 빈 파일 동일
  inode 쓰기를 유지한다. 이를 위해 output 구현의 추가 변경이 필요하면 먼저
  계획을 보정하고 승인받는다.
- 테스트는 input ancestor link, output parent 자체/ancestor link, 양쪽 link,
  한글·공백 경로를 정상 처리하는지 본다. 서로 다른 표기로 같은 resolved 파일을
  가리키는 입력/출력, leaf/dangling link, directory·relative·oversize는 거부한다.
- symlinked parent 아래 새 output, 기존 non-empty output과 Tumbler precreated
  output을 각각 검증한다. 실패 시 원본 hash, 기존 final 및 target sentinel을
  보존하고 temporary·orphan worker가 없어야 한다.

### 검증

Linux x64·arm64에서만 실행:

```bash
cargo fmt --manifest-path apps/linux-thumbnailer/Cargo.toml -- --check
pnpm run test:linux-thumbnailer
pnpm run clippy:linux-thumbnailer
```

플랫폼 중립 및 회귀:

```bash
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

기존 timeout/kill/reap, memory limit, panic/partial, 동시 요청과 Tumbler inode
테스트를 생략하지 않는다. 공유 renderer·worker protocol은 변경하지 않는다.

### 커밋

```text
Task #50 [Stage 3.1]: Linux thumbnail resolved path candidate
Task #50 Stage 3: 조상 symlink 허용과 leaf output 방어 정렬
```

## Stage 4 — 실제 package와 file-manager 재수용

### 산출물

- `scripts/linux-thumbnail-manager-probe.sh`
- `scripts/linux-thumbnail-manager-session.sh`
- `.github/workflows/alhangeul-linux-gui.yml`
- `tests/gui/linux/native-ui/thumbnail-files.test.mjs`
- `tests/linux-gui-workflow.test.mjs`, `tests/linux-thumbnail-registration.test.mjs`
- Stage 1 package smoke·evidence — 실제 전후 관측 보정이 필요한 부분만
- `mydocs/working/task_m010_50_stage4.md`

### 변경 내용

- `create_mime_database()`와 `alhangeul-probe.xml` 생성을 제거한다. fresh
  `XDG_DATA_HOME`/cache 격리는 유지하되 private MIME package/cache가 없음을
  확인한다. system MIME 검색 경로를 evidence에 기록하며 probe 안에서 제품
  XML을 복사하거나 `update-mime-database`를 추가 실행해 설치를 보완하지 않는다.
- GUI workflow는 앱 설치 전에 실제 공개 HWP/HWPX의 `gio` content-type과
  shared-mime-info version을 수집한다. 설치 뒤 XML/helper/registration hash와
  package owner를 확인하고, real HWP와 HWPX 및 합성 fixture 각각의 MIME이
  registration과 매칭되는지 검사한다. 실패해도 전후 evidence부터 보존한다.
- exact source의 온새미로 HWP와 form-002 HWPX를 그대로 사용한다. 두 manager에서
  최초 helper `execve >=1`, cached 호출 증가 없음, 변경 뒤 호출 증가를 각각
  검사한다. 실제 PNG·cache metadata와 screenshot을 함께 확인한다.
- 최초/cached/changed 화면을 안정된 window paint 뒤 캡처하고 두 실제 문서의
  서로 다른 첫 페이지가 보이는지 사람이 검토한다. 이 Stage 보고 시 캡처를
  작업지시자에게 보여주며 문서 첫 페이지 fidelity 개선은 이슈 범위에 추가하지
  않는다. 손상 fixture는 generic icon과 final PNG 부재로 판정한다.

| 환경 | Package 수용 | File-manager GUI 수용 |
|---|---|---|
| Linux x64 `ubuntu-22.04` | DEB 및 RPM transaction·MIME lifecycle | 설치된 DEB의 Nautilus·Thunar/Tumbler |
| Linux arm64 `ubuntu-22.04-arm` | DEB transaction·MIME·직접 helper | 제외 |

- x64 RPM은 기존 Ubuntu runner의 `rpm --nodeps` transaction 검증임을 명시한다.
  Fedora 전체 dependency resolution이나 RPM 설치 GUI 검증으로 표현하지 않는다.
  old/new MIME canary 역시 실제 최신 배포판 전체 지원의 근거로 확장하지 않는다.
- exact desktop native 성공 후 같은 build SHA와 native run ID를 GUI workflow에
  전달한다. 두 SHA·artifact digest·package XML hash가 다른 evidence는 합치지
  않는다. 기존 제품 GUI 필수 check를 제거해 thumbnail만 통과시키지 않는다.

### 검증

```bash
node --test tests/gui/linux/native-ui/thumbnail-files.test.mjs tests/linux-gui-workflow.test.mjs tests/linux-thumbnail-registration.test.mjs tests/linux-thumbnail-packaging.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck scripts/linux-thumbnail-manager-probe.sh scripts/linux-thumbnail-manager-session.sh
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

승인된 candidate의 원격 명령 형식:

```bash
git push origin local/task50:publish/task50
gh workflow run alhangeul-desktop.yml --ref publish/task50 -f build_ref=<exact-sha> -f run_tests=true
gh workflow run alhangeul-linux-gui.yml --ref publish/task50 -f build_ref=<exact-sha> -f native_run_id=<successful-native-run-id>
```

세 package lifecycle, 강화된 core gate, helper 계약과 DEB GUI 두 manager가 모두
통과해야 한다. GUI content-type 주입 부재와 uninstall 원복 증거가 없으면
기존 PR #49 결과를 재사용해 이 Stage를 완료하지 않는다.

### 커밋

```text
Task #50 [Stage 4.1]: MIME 주입 없는 package-installed GUI candidate
Task #50 Stage 4: Linux HWPX 실제 설치와 파일 관리자 시각 수용
```

## Stage 5 — 공식 문서와 최종 회귀 정렬

### 산출물

- `README.md`
- `docs/architecture/LINUX_THUMBNAILS.md`
- `docs/DEVELOPMENT.md`
- `docs/operations/DESKTOP_RELEASE.md`
- `mydocs/working/task_m010_50_stage5.md`

### 변경 내용

- architecture에 canonical MIME, 제품 XML 경로와 install/remove refresh를
  명시한다. system-wide MIME database를 전혀 변경하지 않는다는 기존 문구를
  제품 XML·파생 cache 갱신 범위로 보정하되 기본 앱·제3자 정의·thumbnail cache
  보존 정책은 유지한다.
- 입력/output parent ancestor symlink 허용과 leaf symlink 거부, core RSS 판정과
  runtime 주소공간 제한의 차이, 기대값 matrix와 실제 required gate를 반영한다.
- README와 개발·운영 문서는 Stage 4에서 입증한 배포판/version/package 조합만
  표시한다. PR #49의 MIME 주입 GUI evidence는 역사적 결과로 보존하고 실제
  package-only 수용의 한계를 짧게 정정해 새 evidence를 연결한다.
- 문서 최종 candidate에서도 동일 SHA의 native 및 GUI 결과를 확보한다. 코드나
  workflow가 바뀌면 이전 source의 성공을 새 SHA 성공으로 표현하지 않는다.
  공유 config의 MIME 변경이 Windows association 경로를 깨지 않았는지 기존
  Windows x64 installer/thumbnail gate도 확인한다.

### 검증

```bash
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run test:automation
git diff --check
```

최종 native candidate의 Linux x64·arm64 helper/core/package와 Windows x64 기존
installer gate, 같은 SHA의 Linux x64 GUI를 확인한다. 결과는 run ID·artifact
digest와 함께 보고하며 릴리스 게시를 수행하지 않는다.

### 커밋

```text
Task #50 [Stage 5.1]: Linux thumbnail MIME 계약과 공식 문서 정렬
Task #50 Stage 5: 플랫폼 회귀와 최종 수용 증적 확인
```

## 검증

- 각 Stage는 위 검증을 통과한 뒤 단계 보고서를 작성한다. 검증 실패 상태를
  완료로 처리하거나 threshold·기대값을 근거 없이 완화하지 않는다.
- 단계 보고서에는 실행한 명령과 결과, 실행 host, exact SHA, evidence 및 아직
  입증하지 않은 조합을 구분한다. 모든 shell/workflow 변경에 해당 lint를 실행한다.
- 오늘할일은 작업일 보드의 #50 행만 갱신하고 이전 날짜·다른 task 행은 보존한다.
- 문서 위치나 기능 범위가 수행계획을 벗어나면 구현 전에 계획 보정 승인을 받는다.

## 커밋

- native candidate를 먼저 커밋할 수 있지만 Stage 종료 커밋에는 해당 Stage의
  `mydocs/working/task_m010_50_stage{N}.md`와 결과 보정을 함께 포함한다.
- 이번 구현계획 커밋은 `Task #50: 구현 계획서 작성과 오늘할일 갱신`으로 한다.
- 모든 Stage 완료 후 `task-final-report` 절차로 최종 보고서·완료 보드·Open PR을
  준비한다. 이 구현계획 승인은 자동 merge나 공개 release 승인이 아니다.

## 단계 의존성

- 구현계획 승인 뒤 Stage 1에 진입한다.
- Stage 2는 Stage 1 결과 승인, Stage 3은 Stage 2 결과 승인 뒤 진행한다.
- Stage 4는 MIME·core·path 세 변경이 검증된 상태에서 시작한다.
- Stage 5는 Stage 4 실제 설치·GUI evidence 승인 뒤 진행한다.
- 각 Stage 종료 시 다음 Stage 승인 요청을 남기며 승인 없이 넘어가지 않는다.

## 위험과 대응

- **Refresh 실패의 복구 한계**: post-install 실패와 pre-install 거부는 다른
  상태를 남길 수 있다. 자동 rollback 여부를 관측하고 수동 복구 canary와
  구분해 기록하며 package manager 보장을 과장하지 않는다.
- **기본 앱 조회 변화**: MIME alias 정규화나 `.desktop` 등록으로 resolver
  결과가 바뀔 수 있다. 기존 명시적 기본 앱 설정과 제3자 sentinel 보존을 검사하고
  단순 빈 조회값만으로 기본 앱 보존을 증명하지 않는다.
- **누락된 기대값**: source fixture 추가·삭제나 preview 보유 변경이 silent
  pass를 만들지 않도록 fixed hash manifest와 전체 edge/mode cardinality를 검증한다.
- **민감한 path 완화**: canonicalization이 모든 TOCTOU를 없애지는 않는다.
  기존 leaf·inode 방어를 보존하며 추가 보안 구조 변경이 필요하면 먼저 보고한다.
- **낙관적인 환경 표현**: core, private MIME canary, Ubuntu RPM transaction과
  실제 DEB GUI를 서로 대체하지 않고 지원 matrix에 각각 분리한다.

## 승인 요청 사항

- 위 5단계의 세부 산출물·검증·커밋과 candidate push/기존 수동 workflow 실행
- MIME helper·fixture·artifact verifier 보조 파일을 포함한 예상 변경 경로 보정
- fixture 기대값 matrix, record 완전성, 1,500 ms/256 MiB 경계와 실패 증적 보존
- Stage 4에서 실제 설치 문서 screenshot을 다시 제시하는 수용 기준
- 구현계획 승인 후 Stage 1부터 진행하며 각 단계 완료 후 승인을 받는 절차
