# Task #9 구현계획서 — v0.1.0 prerelease 후보 준비와 공개 배포 Go/No-Go 검증

수행계획서: [`task_m010_9.md`](task_m010_9.md)
GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | prerelease 계약과 수용 매트릭스 확정 | `task_m010_9_stage1.md` | signing·bundle·checksum·rollback·native 환경 결정 |
| 2 | 제품 metadata·공식 문서와 자동 검증 정렬 | metadata/checksum 도구·테스트, Tauri config, workflow·문서 | 실제 기능 설명, 결정적 checksum, 비배포 경계 |
| 3 | 플랫폼 중립 수용 검증과 exact-SHA candidate 생성 | exact-SHA CI/native run, artifact inventory·checksum | 전체 자동 검사, remote SHA, 다운로드 후 독립 검증 |
| 4 | Windows/Linux 설치·실행·rollback 검증 | `task_m010_9_stage4.md` | bundle별 native install·launch·핵심 시나리오·uninstall |
| 4.1 | Linux desktop entry 문서 인자 전달 보정 | 공통 desktop template, metadata 회귀 검증 | AppImage·DEB·RPM의 `Exec`·MIME 계약과 새 exact-SHA artifact |
| 4.2 | Windows/Linux UI 리본·한글 버튼 보정 | host 리본 markup, UI font 상속, 회귀 검증 | grouped ribbon 계약과 form control 한글 font 상속 |
| 5 | Go/No-Go 판정과 후속 게시 입력 확정 | `task_m010_9_stage5.md`, release notes·후속 Issue 초안 | 모든 required gate 대조, 공개 작업 미실행 확인 |

## 문서 위치 확인

수행계획서의 공식 제품 문서와 task 증적 경계를 그대로 사용한다. 새 공식 release 문서와 `mydocs/manual` 문서는 만들지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 사용자 기능·공개 상태 | 저장소 루트 | `README.md` | OK | 실제 Release 전 비공개 상태와 다운로드 링크 금지 유지 |
| release 운영 계약 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | checksum, signing, candidate와 게시 경계 |
| 기여자 검증 명령 | `docs/` | `docs/DEVELOPMENT.md` | OK | 새 명령이 도입될 때만 수정 |
| package metadata | Tauri config | `apps/desktop/src-tauri/tauri.conf.json` | OK | 실제 bundle 설명과 file association |
| Linux desktop entry | desktop package template | `apps/desktop/src-tauri/linux/main.desktop` | OK | DEB·RPM과 DEB staging을 재사용하는 AppImage의 launcher 인자·MIME 계약 |
| 단계 증적 | `mydocs/working/` | `mydocs/working/task_m010_9_stage*.md` | OK | 조사, run, hash와 native 시나리오 결과 |
| 최종 판단·release notes 초안 | `mydocs/report/` | `mydocs/report/task_m010_9_report.md` | OK | 후속 게시 Issue 입력이며 공개 Release 본문이 아님 |

## Stage 1 — prerelease 계약과 수용 매트릭스 확정

### 산출물

신규:

- `mydocs/working/task_m010_9_stage1.md`

### 변경 내용

- GitHub의 열린 M010, tag·Release 부재, `main`/`devel` 차이, Task #7 CI/native run과 artifact 만료 상태를 live 조회한다.
- root version, Tauri bundle config, README·DEVELOPMENT·DESKTOP_RELEASE와 `rhwp v0.8.2` known issue를 현재 근거로 고정한다.
- 다음 결정 필드를 수용 매트릭스에 기록한다.
  - 공개 등급: GitHub prerelease
  - 예정 version/tag: source `0.1.0`, 예정 immutable tag `v0.1.0`
  - checksum: release asset 전체를 정렬한 `SHA256SUMS`
  - Windows signing: 첫 prerelease의 `unsigned-prerelease-allowed`
  - baseline candidate bundle: Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB 전체 필수
  - 조건부 확장: Issue #10의 Windows ARM64 MSI·NSIS가 별도 Go일 때만 후속 게시 Issue에서 포함
  - print 경계: OS print dialog 또는 승인된 virtual printer
  - rollback: candidate 폐기, tag 불변, withdraw/supersede 또는 fix-forward
- bundle별 build 환경, native install 환경, 자동/수동 검증 책임, fixture와 필수 증적을 표로 고정한다.
- baseline bundle의 실제 native 호환 환경이 없으면 다른 형식의 결과로 대체하지 않고 Task #9를 No-Go로 처리한다.
- 최초 보고서는 결정 필드를 `승인 대기`로 두고 추천안을 제시한다. 작업지시자 선택 뒤 같은 보고서에 승인값·승인일·Stage 2 제약을 반영한다.
- unsigned 상태, SmartScreen 경고와 `SHA256SUMS` 필수 표시를 Stage 2 제약으로 고정하고 signing 인프라는 별도 Issue로 분리한다.
- Stage 1.1에서는 승인된 범위 변경을 수행계획서·구현계획서·Stage 1 보고서와 오늘할일에 함께 반영한다.

### 검증

```bash
gh release list --repo postmelee/alhangeul-tauri --limit 100
git ls-remote --tags origin
gh run view 30383886807 --repo postmelee/alhangeul-tauri --json headSha,status,conclusion,url
gh run view 30384403366 --repo postmelee/alhangeul-tauri --json headSha,status,conclusion,url
git rev-list --left-right --count origin/main...origin/devel
rg -n 'HWPX|sign|checksum|rollback|GitHub Release|updater|known issue' README.md apps/desktop/src-tauri/tauri.conf.json docs
git diff --check
```

- 최초 Stage 1 diff는 `mydocs/working/task_m010_9_stage1.md`만 포함한다.
- 선택 반영 commit은 같은 보고서의 결정 필드만 수정한다.

### 커밋

```text
Task #9 Stage 1: prerelease 계약과 수용 매트릭스 정리
Task #9 [Stage 1.1]: prerelease 후보 정책 승인 반영
```

## Stage 2 — 제품 metadata·공식 문서와 자동 검증 정렬

### 산출물

신규:

- `scripts/check-release-metadata.mjs`
- `scripts/create-release-checksums.mjs`
- `tests/release-metadata.test.mjs`
- `tests/release-checksums.test.mjs`

수정:

- `package.json`
- `apps/desktop/src-tauri/tauri.conf.json`
- `.github/workflows/ci.yml`
- `.github/workflows/alhangeul-desktop.yml`
- `tests/actions-workflows.test.mjs`
- `docs/DEVELOPMENT.md`
- `docs/operations/DESKTOP_RELEASE.md`

Stage 1에서 hosted runner install smoke를 승인하면 OS별 helper script를 역할별 300 LOC 미만 파일로 추가하고 이 구현계획서를 먼저 보정한다.

### 변경 내용

- Tauri long description을 HWP/HWPX 열기·편집, HWP 저장과 PDF 내보내기의 실제 기능 범위로 고친다.
- metadata checker는 dependency 없이 JSON을 구조적으로 읽고 product name/version/identifier, publisher, descriptions, category, file association·MIME, updater 비활성 경계를 검사한다.
- checker는 기본 repository root와 fixture용 `--root`를 지원하고 파일을 수정하지 않는다. 누락·오인 표현·구조 오류는 경로와 기대값을 포함해 실패한다.
- checksum 도구는 명시적 artifact root만 읽고 지원 installer를 상대 경로로 정렬해 표준 SHA-256 줄 형식으로 출력한다. inventory·임시 파일·중간 AppDir은 제외하며 empty/duplicate/unsupported 입력을 거부한다.
- checksum allowlist는 Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB를 모두 포함하며 Windows ARM64는 Issue #10에서 별도로 확장한다.
- `package.json`에 `check:release-metadata`, `create:release-checksums`를 추가하고 두 test를 `test:automation`에 연결한다.
- CI와 native workflow는 dependency 설치 뒤 build·upstream 검증 전에 release metadata checker를 실행한다.
- workflow는 계속 `workflow_dispatch`, `contents: read`, 14일 artifact와 비배포 경계를 유지하고 release action, secret과 write permission을 추가하지 않는다.
- DESKTOP_RELEASE에 Stage 1 계약, candidate와 tag artifact 재생성, checksum·signing·rollback 원칙을 기록한다. 성공 run이나 설치 결과는 선기록하지 않는다.
- DEVELOPMENT에는 새 read-only 검사와 candidate checksum 생성 명령만 추가한다.

### 검증

```bash
pnpm run check:release-metadata
pnpm run test:automation
git diff --exit-code origin/devel -- .github/workflows/pages.yml
git diff --check
```

- `tests/actions-workflows.test.mjs`는 새 gate 순서와 기존 trigger·permission·matrix·비배포 계약을 함께 확인한다.

### 커밋

```text
Task #9 Stage 2: prerelease metadata와 검증 자동화 정렬
```

## Stage 3 — 플랫폼 중립 수용 검증과 exact-SHA candidate 생성

### 산출물

repository 외부 상태:

- `publish/task9`
- exact-SHA `Alhangeul CI` run
- 같은 SHA의 Windows x64, Linux x64, Linux arm64 native run과 Actions artifact

신규:

- `mydocs/working/task_m010_9_stage3.md`

수정:

- `docs/operations/DESKTOP_RELEASE.md`

### 변경 내용

- 지원 범위 밖 현재 macOS host에서는 Windows/Linux desktop Rust·Tauri 성공을 주장하지 않고 플랫폼 중립 검사만 실행한다.
- Stage 2 승인 commit을 candidate exact SHA로 고정하고 Stage 3 별도 승인 뒤 `publish/task9`에 push한다.
- CI와 native workflow를 같은 exact SHA로 dispatch하고 run의 event, head branch, head SHA, jobs와 conclusion을 기록한다.
- artifact는 `mktemp -d`의 명시적 경로에 내려받아 platform inventory를 재계산하고 candidate `SHA256SUMS` 초안을 생성·재검증한다.
- artifact 검증 후 임시 경로만 정리하고 bundle을 저장소나 공개 다운로드 경로로 옮기지 않는다.
- source·workflow 실패는 Stage 3에서 임의 보정하지 않고 구현계획서 변경 승인을 요청한다.
- 성공 run, artifact ID·만료 시각, 파일명·크기·SHA-256을 DESKTOP_RELEASE와 Stage 보고서에 기록한다.
- candidate 이후 Stage 3 보고·운영 문서 commit이 추가되므로 이 artifact가 최종 tag artifact가 아님을 함께 기록한다.

### 검증

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git push origin HEAD:refs/heads/publish/task9
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task9
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri --ref publish/task9 -f build_ref=<candidate-sha> -f run_tests=true
gh run view <run-id> --repo postmelee/alhangeul-tauri --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download <native-run-id> --repo postmelee/alhangeul-tauri --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform <platform> --root <artifact-root> --verify-inventory <artifact-root>/alhangeul-artifact-inventory.json
pnpm run create:release-checksums -- --root <temporary-directory> --output <temporary-directory>/SHA256SUMS
git diff --check
```

### 커밋

```text
Task #9 Stage 3: exact-SHA prerelease candidate 검증
```

## Stage 4 — Windows/Linux 설치·실행·rollback 검증

### 산출물

신규:

- `mydocs/working/task_m010_9_stage4.md`

검증 실패 보정 외 repository 파일은 수정하지 않는다. 자동화나 product 보정이 필요하면 구현계획서를 먼저 갱신한다.

### 변경 내용

- Stage 1에서 승인된 native 환경과 Task #9 candidate artifact만 사용한다.
- Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB 전체를 각각 native package 환경에서 검증한다.
- clean install, launch/version, HWP/HWPX open·edit, HWP save/reopen, HWPX save block, PDF export, print 경계, file association, relaunch, uninstall과 rollback을 수행한다.
- 비민감 fixture만 사용하고 사용자 문서가 uninstall·rollback 과정에서 삭제되지 않는지 확인한다.
- 자동화할 수 없는 항목은 OS·architecture·package·exact SHA, 절차, 실제 관찰, 증적과 한계를 기록한다.
- 필수 시나리오 누락, 다른 package manager/architecture의 대체 결과와 환경 미확보는 성공으로 처리하지 않는다.
- baseline bundle 하나라도 실패하면 Task #9를 No-Go로 처리하고 Stage 4 보고서를 완료·commit하지 않는다.

### 검증

```text
Windows x64: MSI와 NSIS install → launch → document scenarios → association → uninstall
Linux x64: AppImage 실행, DEB Debian 계열 install, RPM RPM 계열 install → scenarios → uninstall
Linux arm64: arm64 Debian 계열 DEB install → launch → scenarios → uninstall
공통: package/version/candidate SHA, checksum, 결과와 증적 위치 대조
```

### 커밋

```text
Task #9 Stage 4: Windows Linux prerelease 설치 시나리오 검증
```

## Stage 4.1 — Linux desktop entry 문서 인자 전달 보정

### 진입 사유와 승인

2026-08-02 Stage 4 candidate `dd67d58f5367b478315417279ac8f6561bd5b718` 검증에서 AppImage는 payload를 실행했지만 HWP/HWPX 경로를 전달하지 않았다. DEB·RPM도 등록된 desktop entry가 `Exec=Alhangeul`이라 MIME 기본 앱 선택은 존재하지만 launcher가 문서 경로를 넘길 field code가 없다. 이 candidate는 폐기하고 공개 상태를 만들지 않는다.

작업지시자는 같은 날 다음 보정 범위를 승인했다.

- Task #9 안에서 Stage 4.1 하위 단계로 처리한다.
- Freedesktop Desktop Entry의 복수 로컬 파일 field code `%F`를 사용한다.
- DEB template을 재사용하는 AppImage와 별도 RPM template에 같은 계약을 적용한다.
- metadata checker와 automation test로 template 경로, `Exec={{exec}} %F`, MIME 보존을 고정한다.
- 보정 뒤 새 exact-SHA candidate를 만들고 기존 Stage 3·4 증적을 재사용하지 않는다.
- Windows/Linux 필수 수동 시나리오가 남아 있는 동안 Task #9 No-Go를 유지한다.

### 산출물

신규:

- `apps/desktop/src-tauri/linux/main.desktop`
- `tests/linux-desktop-entry.test.mjs`

수정:

- `package.json`
- `apps/desktop/src-tauri/tauri.conf.json`
- `scripts/check-release-metadata.mjs`
- `tests/release-metadata.test.mjs`
- `mydocs/orders/20260802.md`
- `mydocs/plans/task_m010_9_impl.md`

Stage 4.1 검증이 모두 성공한 뒤 기존 `mydocs/working/task_m010_9_stage4.md`에 실패 원인, 보정 결과와 새 candidate 재검증 선행 조건을 기록한다. 새 artifact가 아직 없거나 필수 native 시나리오가 미완료이면 Stage 4 완료 보고서로 확정하거나 commit하지 않는다.

### 변경 내용

- Tauri 기본 desktop entry 구조와 template 변수는 유지하고 `Exec`에 독립 인자 `%F`만 추가한다.
- `bundle.linux.deb.desktopTemplate`과 `bundle.linux.rpm.desktopTemplate`이 같은 template을 가리키게 한다. Tauri 2.8.1 AppImage bundler가 DEB staging의 desktop file을 복사하는 경계를 회귀 계약으로 기록한다.
- template은 HWP/HWPX MIME 목록을 유지하고 `Terminal=false`, `Type=Application`, `StartupWMClass`, category, comment와 icon을 보존한다.
- metadata checker는 template 경로가 repository 안의 일반 파일인지 확인하고 template의 필수 key, 단일 `%F`, 금지된 `%f`·`%u`·`%U`와 MIME 조건부 출력을 검증한다.
- 기존 release metadata fixture는 template 누락과 DEB/RPM 경로 drift를 거부한다. 독립 Linux desktop entry test는 file field code 누락·중복과 MIME 누락을 각각 거부하며 `test:automation`에 연결한다. 이 분리는 기존 test를 권장 300 LOC 아래로 유지한다.
- Stage 4 smoke는 직접 binary 실행만으로 file association 성공을 주장하지 않고 desktop launcher가 실제 경로를 전달했는지 process argv와 열린 문서 화면으로 확인한다.

### 검증

```bash
pnpm run check:release-metadata
pnpm run test:automation
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

새 candidate 생성은 Stage 4.1 source correction commit 승인 뒤 `publish/task9` exact SHA를 이동하는 별도 승인 경계로 유지한다. 같은 SHA에서 CI, Windows x64, Linux x64, Linux arm64 workflow와 artifact inventory·checksum을 다시 검증한다.

### 커밋

```text
Task #9 [Stage 4.1]: Linux 문서 연결 인자 전달 보정
```

## Stage 4.2 — Windows/Linux UI 리본·한글 버튼 보정

### 진입 사유와 승인

2026-08-02 Linux x64 native 화면 증적을 재검토하면서 Alhangeul host의 서식 도구 모음이 현재 `rhwp-studio` CSS가 전제하는 grouped ribbon markup과 불일치하고, Linux WebKitGTK의 button 기본 글꼴에서 한글 label이 네모 글리프로 표시되는 것을 확인했다. 같은 구조 불일치는 Windows에도 적용되며 button 글꼴 상속 누락은 Windows system fallback에 따라 가려질 수 있으므로 두 지원 OS의 공통 제품 보정으로 처리한다.

작업지시자는 같은 날 다음 범위를 승인했다.

- Task #9 안에서 Stage 4.2 하위 단계로 처리한다.
- Alhangeul host 서식 도구 모음을 현재 upstream grouped ribbon 구조와 정렬한다.
- button·input·select·textarea가 bundle UI 글꼴을 상속하도록 host CSS 경계를 보정한다.
- Linux와 Windows에 같은 source correction을 적용하고 정적 회귀 테스트와 studio build로 계약을 고정한다.
- 새 candidate를 만들기 전까지 기존 Stage 4 native 증적을 최종 release 수용 근거로 재사용하지 않는다.

### 산출물

수정:

- `apps/studio-host/index.html`
- `apps/studio-host/src/style.css`
- `package.json`
- `mydocs/plans/task_m010_9_impl.md`

신규:

- `tests/studio-shell.test.mjs`

새 공식 제품 문서와 `mydocs/manual` 문서는 만들지 않는다. 원인, 검증 결과와 candidate 폐기 판단은 진행 중인 `mydocs/working/task_m010_9_stage4.md`에 Stage 4.2 검증이 완료된 뒤 기록한다.

### 변경 내용

- `#style-bar`를 `sb-field-ribbon-group`, `sb-character-band`, `sb-color-ribbon-group`, `sb-paragraph-band` 계층으로 구성해 현재 upstream style·responsive selector가 host에도 동일하게 적용되게 한다.
- style, 언어, 글꼴, 크기와 줄 간격을 같은 field grid에 배치하고 각 control의 기존 ID와 Toolbar event 계약을 보존한다.
- `apps/studio-host/src/style.css`의 upstream import 뒤 form control `font-family` 상속을 명시해 dialog·toolbar button이 body의 bundle `맑은 고딕` alias를 사용하게 한다.
- host shell contract test는 grouped ribbon 계층, 필수 control ID의 field grid 포함, ribbon label과 form control 글꼴 상속을 검사하고 `test:automation`에 연결한다.
- `third_party/rhwp`는 수정하지 않는다.

### 검증

```bash
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

지원 범위 밖 macOS host에서는 정적·TypeScript·Vite 검증만 수행한다. 보정 source의 Linux x64 native 화면 재검증과 Windows x64 실제 GUI 검증은 새 exact-SHA candidate 생성 이후 Stage 4에서 수행한다.

### 커밋

```text
Task #9 [Stage 4.2]: Windows Linux UI 리본과 한글 글꼴 보정
```

## Stage 4.3 — exact-SHA Actions rhwp release tag 확보 보정

### 진입 사유와 승인

2026-08-04 Stage 4.2 correction commit `d5c2447a64a7adafe8c8cd13dfd485151816ea82`를 `publish/task9`에 exact SHA로 push하고 CI·desktop artifact workflow를 실행했다. 세 지원 matrix 모두 source build 전에 `check:rhwp-pin`이 `refs/tags/v0.8.2^{commit}`을 찾지 못해 실패했으며 bundle은 생성되지 않았다.

원격 `v0.8.2`는 계속 lock commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`을 가리킨다. 2026-08-01 성공 실행 당시에는 upstream 기본 브랜치의 shallow clone에 pinned commit과 tag가 함께 포함됐지만, 현재 upstream `main`이 `2dced7bfe10c6597cead634264c7c1781c01f1e7`로 이동해 `actions/checkout@v5`가 pinned commit만 `FETCH_HEAD`로 보충하고 tag ref는 가져오지 않는다. 따라서 pin 또는 source 불일치가 아니라 현재 workflow가 shallow submodule에서 stable release tag provenance를 재현 가능하게 확보하지 못한 자동화 결함이다.

작업지시자는 같은 날 다음 보정 범위를 승인했다.

- Task #9 안에서 Stage 4.3 하위 단계로 처리한다.
- `rhwp-core.lock`의 repository·release tag·commit을 입력으로 exact tag ref 하나만 shallow fetch한다.
- fetch 전 submodule origin과 HEAD가 lock과 일치하는지 확인하고, fetch 직후 tag가 같은 lock commit으로 resolve되는지 확인한다.
- CI와 Windows/Linux desktop artifact workflow가 `check:rhwp-pin` 전에 같은 cross-platform script를 실행하게 한다.
- workflow 순서와 최소 fetch refspec을 automation contract test로 고정한다.
- 전체 submodule history, 모든 tag, 다른 branch는 가져오지 않고 `third_party/rhwp` worktree와 gitlink는 수정하지 않는다.
- 보정 commit을 새 exact SHA로 고정한 뒤 실패 실행의 artifact나 증적을 재사용하지 않고 CI·bundle·Linux UI를 다시 검증한다.

### 산출물

신규:

- `scripts/fetch-rhwp-pin-tag.mjs`
- `tests/rhwp-pin-fetch.test.mjs`

수정:

- `.github/workflows/ci.yml`
- `.github/workflows/alhangeul-desktop.yml`
- `package.json`
- `mydocs/orders/20260804.md`
- `mydocs/plans/task_m010_9_impl.md`
- `mydocs/working/task_m010_9_stage4.md`

새 공식 제품 문서와 `mydocs/manual` 문서는 만들지 않는다. 실패 실행·원인·보정·재실행 결과는 진행 중인 Stage 4 보고서에 보존한다.

### 변경 내용

- fetch script는 repository root의 `rhwp-core.lock`을 읽고 기존 pin parser의 shape validation을 재사용한다.
- submodule origin과 HEAD가 lock repository·commit과 일치하지 않으면 network fetch 전에 실패한다.
- `git fetch --no-tags --depth=1 origin +refs/tags/{release}:refs/tags/{release}` 형태로 lock tag 하나만 갱신한다. remote tag가 이동했더라도 fetch 뒤 lock commit 비교가 실패하므로 provenance gate를 우회하지 않는다.
- CI와 desktop artifact workflow의 모든 지원 runner에서 Node·pnpm 설정 뒤 `pnpm run fetch:rhwp-pin-tag`를 실행하고, 이후 기존 `check:rhwp-pin`이 source·tag·artifact 전체 계약을 다시 검증한다.
- 독립 script·workflow contract test는 exact refspec, origin·HEAD 선검증, fetch 뒤 tag mismatch 거부, 두 workflow의 fetch→pin verify 순서와 desktop pretest 조건을 고정한다. 기존 workflow test 집중 파일은 더 키우지 않는다.

### 검증

```bash
pnpm run fetch:rhwp-pin-tag
pnpm run check:rhwp-pin
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

로컬 fetch 검증은 pinned tag ref만 갱신하며 worktree·gitlink가 변하지 않았음을 `git status --short`와 `git submodule status`로 확인한다. 성공 commit 승인 뒤 `publish/task9`를 새 exact SHA로 이동하고 CI·Windows x64·Linux x64·Linux arm64 artifact workflow, Windows installer smoke, artifact inventory·checksum과 Linux x64 native UI 화면을 새 candidate에서만 다시 검증한다.

### 커밋

```text
Task #9 [Stage 4.3]: Actions rhwp release tag 확보 보정
```

## Stage 5 — Go/No-Go 판정과 후속 게시 입력 확정

### 산출물

신규:

- `mydocs/working/task_m010_9_stage5.md`

수정:

- `docs/operations/DESKTOP_RELEASE.md`

### 변경 내용

- Issue #9 수용 기준과 Stage 1 matrix의 모든 required 항목을 자동·remote·native 증적에 대조한다.
- Issue #10은 Task #9 baseline과 분리된 조건부 확장으로 기록하고, 후속 게시 Issue가 별도 Go 결과를 확인하도록 입력에 포함한다.
- signed/unsigned 상태, 후보 asset·checksum, 지원 환경, 미지원 기능, upstream known issue와 검증 한계를 release notes 초안으로 정리한다.
- known issue는 pinned source의 동일 재현 조건·실패 지점이 확인된 경우만 분류하고 다른 실패는 No-Go로 둔다.
- Go이면 후속 “v0.1.0 prerelease 게시와 배포 후 검증” Issue의 배경·범위·수용·검증 초안을 작성한다. 이 Stage에서 Issue를 생성하지 않는다.
- 후속 Issue는 `devel → main` release PR, immutable tag, tag exact-SHA 새 build, GitHub prerelease 게시와 공개 후 재검증을 소유한다.
- No-Go이면 차단 조건, 필요한 별도 Issue와 재검증 진입 조건을 기록한다.
- GitHub Release, tag, main PR, signing secret, updater와 package repository가 생성되지 않았음을 최종 확인한다.

### 검증

```bash
gh release list --repo postmelee/alhangeul-tauri --limit 100
git ls-remote --tags origin
gh pr list --repo postmelee/alhangeul-tauri --base main --state open --json number,title,headRefName,baseRefName,url
pnpm run check:release-metadata
git diff --check
```

### 커밋

```text
Task #9 Stage 5: prerelease Go No-Go 판정과 게시 입력 확정
```

## 검증

- 각 Stage 명령과 승인된 native 시나리오는 단계 보고서 작성 전에 실행한다.
- 실패한 검증이나 누락된 required bundle은 단계 완료로 처리하지 않는다.
- planned path, workflow permission, bundle matrix 또는 signing 경계가 바뀌면 구현계획서를 먼저 갱신하고 승인을 받는다.
- 현재 macOS host에서 Windows/Linux native install 성공을 주장하지 않는다.
- tag·Release·main PR·secret과 package 게시가 생기면 Task #9 범위 위반으로 처리한다.

## 커밋

- 단계 source·문서와 `mydocs/working/task_m010_9_stage{N}.md`는 같은 단계 커밋으로 묶는다.
- Stage 1 정책 선택과 승인된 범위 보정은 `Task #9 [Stage 1.1]: HOP bundle parity와 ARM64 조건부 지원 승인 반영`으로 계획서·보고서·오늘할일에 보존한다.

## 단계 의존성

- Stage 1 보고서 승인과 signing·bundle·print·rollback의 명시 선택이 Stage 2 선행 조건이다.
- Stage 2는 Stage 1.1 정책 기록 뒤에만 product metadata와 workflow를 변경한다.
- Stage 3은 Stage 2 보고 승인과 remote push·Actions 실행의 별도 승인을 받은 뒤 진행한다.
- Stage 4는 Stage 3 exact-SHA artifact 성공과 native 환경 확보 뒤 진행한다.
- Stage 4.1은 Stage 4에서 확인한 Linux desktop entry 실패의 승인된 보정이며, 성공 commit 승인 뒤 새 exact-SHA candidate 생성으로 돌아간다.
- Stage 5는 Stage 4의 모든 required 시나리오 승인 뒤 Go/No-Go를 판정한다.
- 각 Stage 완료보고서 승인 전 다음 Stage를 시작하지 않는다.

## 위험과 대응

- **Stage 1 환경 미확정**: baseline package의 실제 native 환경이 없으면 Task #9를 No-Go로 처리하고 임의 면제하지 않는다.
- **checksum 도구 범위 확장**: 명시적 root와 installer allowlist만 읽고 기존 파일을 암묵적으로 덮어쓰지 않는다.
- **workflow 권한 확대**: Task #9 workflow는 `contents: read`와 build artifact만 유지하며 Release API를 호출하지 않는다.
- **candidate SHA 이동**: run dispatch 뒤 `publish/task9`을 움직이지 않고 run head SHA를 먼저 확인한다.
- **GUI 검증 증적 부족**: 필수 시나리오는 수동이라도 환경·절차·관찰 결과를 남기며 미실행을 검증 한계로 낮추지 않는다.
- **desktop MIME 등록과 실제 open 혼동**: 기본 앱 등록만으로 성공 판정하지 않고 launcher가 HWP/HWPX 경로를 process argv로 전달하고 앱이 해당 문서를 연 증적을 함께 요구한다.
- **파일 크기 증가**: 신규 script/test는 역할별 300 LOC 미만으로 분리하고 기존 300 LOC 초과 test 파일은 확대하지 않는다.

## 승인 요청 사항

- 위 5개 Stage의 산출물, 검증 명령, 승인 게이트와 커밋 메시지
- Stage 1 최초 보고와 정책 선택 반영을 Stage 1/1.1 두 commit으로 보존하는 방식
- Stage 2에서 metadata checker와 checksum 도구를 독립 script/test로 추가하고 CI/native build 전에 연결하는 범위
- Stage 3에서 승인 후 `publish/task9`을 remote canary ref로 사용하고 candidate artifact를 임시 경로에서만 검증하는 순서
- Stage 4의 baseline package별 필수 시나리오와 미실행 bundle을 Task #9 No-Go로 처리하는 규칙
- Windows ARM64는 Issue #10에서 독립 구현·검증하고 후속 게시 Issue에서 별도 Go일 때만 포함하는 경계
- Stage 5는 후속 게시 Issue 초안만 만들고 Issue·release PR·tag·GitHub Release를 생성하지 않는 경계

2026-07-29 Stage 1.1에서 unsigned prerelease, baseline bundle 전체 필수와 Windows ARM64 Issue #10 조건부 분리를 승인받았다. Stage 2 진입, remote push, Actions dispatch 또는 외부 공개는 별도 승인 없이는 수행하지 않는다.

2026-08-02 작업지시자는 Stage 4에서 확인한 Linux desktop entry 문서 인자 누락을 Task #9 Stage 4.1로 보정하고, 새 exact-SHA candidate 전까지 기존 `dd67d58…` artifact를 폐기하는 범위를 승인했다. source/report commit 뒤 remote push와 Actions dispatch는 별도 승인을 받는다.

## Stage 3 재검증 보정 — Task #11 merge 통합 (2026-08-02)

작업지시자는 PR #12 merge 뒤 Task #9의 과거 candidate를 폐기하고 최신 `devel`을 통합해 새 exact-SHA candidate를 검증하는 범위를 승인했다. 진행 중 branch의 history를 다시 쓰지 않도록 `devel` merge로 통합하며 release metadata/checksum과 Windows installer smoke/packaging 계약을 합집합으로 유지한다.

| 통합 지점 | 보정 계약 | 검증 |
|---|---|---|
| `package.json`의 `test:automation` 충돌 | `release-metadata`, `release-checksums`, `windows-installer-smoke`, `windows-packaging` test를 모두 실행 | 통합 automation 전체 통과 |
| Task #9의 legacy association 이름과 Task #11 canonical ProgID 불일치 | metadata checker가 `Alhangeul.hwp`·`Alhangeul.hwpx`를 승인하고 legacy `HWP Document`를 거부 | `check:release-metadata`, release metadata 회귀 test, Windows packaging 계약 |
| 과거 Stage 3 candidate `6e0adc9…`와 run `30426710424`·`30426711693` | 역사 증적으로만 보존하고 현재 candidate·Go 판정 근거로 재사용하지 않음 | 새 통합 commit을 `publish/task9`에 고정한 뒤 CI/native workflow와 artifact·checksum 재검증 |

통합 commit의 플랫폼 중립 검증이 모두 통과한 뒤 작업지시자 승인으로만 `publish/task9`을 새 SHA로 이동하고 Actions를 dispatch한다. 새 run 성공 전에는 `docs/operations/DESKTOP_RELEASE.md`와 Stage 3 보고서의 과거 성공 증적을 현재 수용 결과로 교체하지 않는다. Release PR, tag, GitHub Release와 asset 게시는 계속 범위 밖이다.
