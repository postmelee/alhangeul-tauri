# Task #5 구현계획서 — Windows/Linux Actions와 native artifact smoke

수행계획서: [`task_m010_5.md`](task_m010_5.md)
GitHub Issue: [#5](https://github.com/postmelee/alhangeul-tauri/issues/5)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | artifact 계약과 검증기 | `scripts/verify-desktop-artifacts.mjs`, `tests/desktop-artifacts.test.mjs` | platform별 fixture, 누락·0바이트·inventory 변조 거부 |
| 2 | workflow 최소 보정과 로컬 검증 | `ci.yml`, `alhangeul-desktop.yml`, `tests/actions-workflows.test.mjs` | 수동 trigger·최소 권한·matrix·pin·artifact gate 정적 검증 |
| 3 | Actions 활성화와 exact-ref canary | repository Actions 설정, `publish/task5`, canary runs | remote SHA 일치, Ubuntu CI와 Windows/Linux matrix 성공 |
| 4 | native artifact inventory와 운영 문서 | 다운로드 재검증, `DESKTOP_RELEASE.md`, `DEVELOPMENT.md` | installer 종류·크기·SHA-256 및 run 증적 일치 |
| 5 | Actions 수용 기준 통합 검증 | 최종 exact-ref runs와 통합 검증 기록 | 최종 실행 가능 head에서 CI·native workflow 성공 |

## 문서 위치 확인

수행계획서에서 승인된 공식 자동화·운영 문서와 내부 작업 기록의 경계를 유지한다. `tests/actions-workflows.test.mjs`는 수행계획서의 “workflow trigger·permissions·matrix·artifact verifier 연결 정적 검사”를 반복 가능한 test로 구체화한 경로다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `ci.yml`, `alhangeul-desktop.yml` | `.github/workflows/` | `.github/workflows/ci.yml`, `.github/workflows/alhangeul-desktop.yml` | OK | GitHub Actions 공식 진실 원천 |
| `verify-desktop-artifacts.mjs` | `scripts/` | `scripts/verify-desktop-artifacts.mjs` | OK | 로컬·runner·다운로드 후 공통 검증기 |
| artifact fixture test | `tests/` | `tests/desktop-artifacts.test.mjs` | OK | Node 내장 test runner 사용 |
| workflow 정적 검사 | `tests/` | `tests/actions-workflows.test.mjs` | OK | 승인된 정적 검증을 별도 책임의 test로 구체화 |
| Desktop Release 운영 문서 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | native build·artifact 공식 운영 기준 |
| contributor 명령·상태 | `docs/` | `docs/DEVELOPMENT.md` | OK | 새 자동화 검증 명령과 Actions 상태가 생기므로 수정 |
| 작업 산출물 | `mydocs/` | `mydocs/orders/20260728.md`, `mydocs/plans/task_m010_5*.md`, `mydocs/working/task_m010_5_stage*.md`, `mydocs/report/task_m010_5_report.md` | OK | 승인·실행 증적을 공식 제품 문서와 분리 |

## Stage 1 — artifact 계약과 검증기

### 산출물

신규:

- `scripts/verify-desktop-artifacts.mjs`
- `tests/desktop-artifacts.test.mjs`

수정:

- `package.json`

### 변경 내용

- dependency를 추가하지 않는 Node.js ESM 검증기를 작성하고 함수 API와 CLI를 같은 파일에서 제공한다.
- CLI 계약은 다음으로 고정한다.

```text
pnpm run check:desktop-artifacts -- \
  --platform <windows-x64|linux-x64|linux-arm64> \
  --root <bundle-root> \
  [--write-inventory <json-path> | --verify-inventory <json-path>]
```

- `--platform`과 `--root`는 필수다. unknown option, 지원하지 않는 platform, 누락되거나 디렉터리가 아닌 root, 동시에 지정한 두 inventory mode는 build 전에 명확한 오류로 실패한다.
- bundle root를 재귀 탐색하되 regular file만 inventory에 포함하고 경로는 root 기준 `/` 구분자 상대 경로로 정렬한다. symbolic link는 root 탈출과 불명확한 checksum을 막기 위해 거부한다.
- 필수 종류 판정은 대소문자를 안전하게 처리한 파일 확장자와 bundle 경로를 함께 사용한다.
  - `windows-x64`: `.msi`, `nsis/` 아래 `.exe`
  - `linux-x64`: `.deb`, `.rpm`, `.AppImage`
  - `linux-arm64`: `.deb`
- 필수 종류가 하나라도 없거나 해당 파일이 0바이트이면 실패한다. 필수 종류 외 regular file도 inventory에는 기록하되 성공 조건을 완화하지 않는다.
- inventory JSON schema는 다음 필드로 고정하고 timestamp, runner 절대 경로, 사용자 경로는 기록하지 않는다.
  - `schemaVersion = 1`
  - `platform`
  - 정렬된 `requiredKinds`
  - 정렬된 `files[]`: `path`, `kind`, `size`, `sha256`
- `--write-inventory`는 검증 성공 후 deterministic JSON과 마지막 newline을 기록한다. output이 bundle root 내부에 있으면 자기 자신을 scan 대상에서 제외해 재실행 결과가 같게 유지한다.
- `--verify-inventory`는 bundle을 다시 계산해 기존 JSON과 byte-equivalent content인지 비교하고, 파일 추가·삭제·크기·hash·platform 변조를 거부한다.
- mode를 생략하면 파일을 쓰지 않고 검증 결과와 파일별 `kind`, byte size, SHA-256, 상대 경로를 stdout에 출력한다.
- `package.json`에 다음 script를 추가한다.
  - `check:desktop-artifacts`: `node scripts/verify-desktop-artifacts.mjs`
- fixture test는 임시 디렉터리만 사용하고 다음을 검증한다.
  - Windows x64 MSI·NSIS 정상 inventory
  - Linux x64 DEB·RPM·AppImage 정상 inventory
  - Linux arm64 DEB 정상 inventory
  - platform별 필수 종류 누락 거부
  - 0바이트 필수 파일 거부
  - unknown platform과 잘못된 CLI 인자 거부
  - deterministic inventory 재작성
  - 기록 후 파일 변조·삭제·추가와 inventory 변조 거부

### 검증

```bash
node --test tests/desktop-artifacts.test.mjs
node scripts/verify-desktop-artifacts.mjs --help
git diff --check
```

현재 macOS host에서는 fixture 기반 platform-neutral 검증만 실행하며 Tauri native build나 installer 실행을 추가하지 않는다.

### 커밋

```text
Task #5 Stage 1: Desktop artifact 계약과 검증기 구현
```

## Stage 2 — workflow 최소 보정과 로컬 검증

### 산출물

신규:

- `tests/actions-workflows.test.mjs`

수정:

- `.github/workflows/ci.yml`
- `.github/workflows/alhangeul-desktop.yml`
- `package.json`

### 변경 내용

- `package.json`에 다음 script를 추가한다.
  - `test:automation`: `node --test tests/desktop-artifacts.test.mjs tests/actions-workflows.test.mjs`
- `ci.yml`은 기존 Ubuntu runner와 수동 trigger를 유지하며 dependency 설치 뒤 다음 검증을 명시한다.
  - `pnpm run check:product-boundary`
  - `pnpm run check:rhwp-pin`
  - `pnpm run test:automation`
  - 기존 upstream·studio test/build
  - 기존 desktop Rust test·clippy
- `alhangeul-desktop.yml`의 `run_tests=true` 경로에도 `check:rhwp-pin`과 `test:automation`을 추가한다. artifact 검증은 `run_tests` 값과 무관하게 native build 뒤 항상 실행한다.
- checkout 뒤 실제 `git rev-parse HEAD`를 log에 기록하고, `build_ref`가 지정된 경우 해당 ref가 resolve한 commit과 실제 checkout commit이 같은지 실패 조건으로 검사한다.
- `Build Tauri bundles` 다음, `Upload bundle artifact` 전에 아래 의미의 검증 단계를 둔다.

```text
bundle root:
apps/desktop/src-tauri/target/<target>/release/bundle

inventory:
<bundle root>/alhangeul-artifact-inventory.json
```

- matrix의 `name`을 검증기의 `--platform`에 전달하고 `--write-inventory`로 JSON을 bundle root 안에 만든다. 기존 `bundle/**` upload에 inventory가 함께 포함되며 `if-no-files-found: error`, platform별 artifact 이름, retention 14일은 유지한다.
- 두 workflow는 다음 보안·범위 경계를 유지한다.
  - trigger는 `workflow_dispatch`만 사용
  - `permissions: contents: read`
  - secret 참조 없음
  - macOS runner·target 없음
  - release, Pages, signing, deploy action 없음
  - Windows x64, Linux x64, Linux arm64 matrix 불변
- `tests/actions-workflows.test.mjs`는 외부 YAML parser를 추가하지 않고 현재 작은 workflow의 top-level section과 명시적 문자열 계약을 읽어 다음을 검사한다.
  - trigger allowlist와 자동 trigger 부재
  - 최소 permissions
  - runner·target·bundle argument의 exact matrix
  - `check:rhwp-pin`, `test:automation`, artifact verifier 존재
  - verifier가 build 뒤 upload 전에 배치
  - artifact retention 14일과 `if-no-files-found: error`
  - 두 대상 workflow의 macOS·secret·release·Pages·deploy action 부재
- `.github/workflows/pages.yml`은 수정하지 않는다.

### 검증

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --exit-code devel -- .github/workflows/pages.yml
git diff --check
```

현재 macOS host에서는 `pnpm run test:desktop`, `pnpm run clippy:desktop`, `pnpm tauri build`를 실행하지 않는다. 이 세 검증은 Stage 3의 Ubuntu/Windows Actions에서 수행한다.

### 커밋

```text
Task #5 Stage 2: Windows/Linux Actions workflow 안전장치 연결
```

## Stage 3 — Actions 활성화와 exact-ref canary

### 산출물

repository 외부 상태:

- GitHub Actions repository permission: `enabled: false` → `enabled: true`
- remote branch: `publish/task5`
- `Alhangeul CI` canary run
- `Alhangeul Desktop Artifact Build` canary run과 세 platform artifact

작업 산출물:

- `mydocs/working/task_m010_5_stage3.md`

조건부 수정:

- `.github/workflows/ci.yml`
- `.github/workflows/alhangeul-desktop.yml`
- `apps/desktop/src-tauri/src/linux_runtime.rs`
- `apps/desktop/src-tauri/src/state.rs`
- `scripts/verify-desktop-artifacts.mjs`
- `tests/desktop-artifacts.test.mjs`
- `tests/actions-workflows.test.mjs`
- `tests/rhwp-baseline.test.mjs`
- `package.json`

### 변경 내용

- Stage 3 시작 승인은 다음 외부 변경을 함께 승인한 것으로 간주한다.
  - repository Actions 활성화
  - `publish/task5` 최초 push
  - 승인된 두 workflow의 hosted runner 사용과 artifact 생성
- 외부 변경 전에 다음 preflight를 기록한다.
  - `gh auth status`
  - 기본 branch가 `devel`
  - Actions permission이 `enabled: false`
  - 세 workflow의 등록 상태와 ID
  - Stage 2 commit SHA와 clean worktree
  - 기존 `publish/task5` ref 부재
  - 기존 Pages workflow의 최근 run 기준
- repository Actions permissions API는 repository `postmelee/alhangeul-tauri`에만 적용한다.

```bash
gh api --method PUT \
  repos/postmelee/alhangeul-tauri/actions/permissions \
  -F enabled=true \
  -f allowed_actions=all

gh api repos/postmelee/alhangeul-tauri/actions/permissions
```

- 응답의 `enabled`가 `true`가 아니면 push·dispatch로 진행하지 않고 rollback 상태를 확인한다.
- Stage 2의 clean reviewable head를 `publish/task5`에 push한다. remote `local/task5`는 만들지 않는다.

```bash
git push origin HEAD:refs/heads/publish/task5
git ls-remote --heads origin refs/heads/publish/task5
```

- remote SHA가 로컬 canary SHA와 정확히 같을 때만 dispatch한다.
- CI는 canary branch를 ref로 수동 실행한다.

```bash
gh workflow run ci.yml \
  --repo postmelee/alhangeul-tauri \
  --ref publish/task5
```

- native build는 workflow 정의 ref와 checkout commit을 모두 canary SHA로 맞추고 platform-neutral pretest를 활성화한다.

```bash
gh workflow run alhangeul-desktop.yml \
  --repo postmelee/alhangeul-tauri \
  --ref publish/task5 \
  -f build_ref=<canary-sha> \
  -f run_tests=true
```

- dispatch 직전 UTC 시각을 기록하고, 다음 조건을 모두 만족하는 최신 run을 선택해 ID 혼선을 방지한다.
  - workflow 파일 일치
  - `event == workflow_dispatch`
  - `headBranch == publish/task5`
  - `headSha == canary SHA`
  - `createdAt >= dispatch 직전 시각`
- 선택한 run은 `gh run watch <id> --exit-status`로 완료까지 추적하고 `gh run view <id> --json ...`으로 URL, head SHA, status, conclusion, job 결과를 기록한다.
- 성공 기준:
  - CI의 Ubuntu job 성공
  - native workflow의 `windows-x64`, `linux-x64`, `linux-arm64` job 성공
  - 각 native job log에 해당 platform inventory와 SHA-256 출력
  - artifact 세 개가 각각 만료되지 않은 상태로 존재
- 실패 시 `gh run view <id> --log-failed`를 먼저 수집하고 다음처럼 처리한다.
  - workflow·runner tool 설정·검증기 문제이면 같은 Stage 범위에서 최소 보정
  - 아래 첫 canary의 승인된 native API signature adapter 보정, 두 번째 canary의 동작 불변 Linux Clippy 보정과 첫 native canary의 checkout·artifact verifier 보정만 예외로 허용
  - 그 밖의 제품 기능, 새 native 동작, runner 교체, matrix 축소가 필요하면 진행을 멈추고 계획 변경 승인 요청
  - 근거 없이 재실행하지 않고 변경된 commit마다 다시 exact SHA를 확인
- 첫 canary run [30353284044](https://github.com/postmelee/alhangeul-tauri/actions/runs/30353284044)는 Stage 2 SHA `80421cfdf61f02ead385c8560c5357d918fe45a9`에서 다음 사실을 확인했다.
  - product boundary, pin, automation, upstream, Studio test/build 성공
  - Ubuntu `cargo test` compile에서 `apps/desktop/src-tauri/src/state.rs:384` E0061 발생
  - `rhwp v0.8.2`의 `split_paragraph_native`가 네 번째 `restore_meta: Option<ParaMeta>`를 요구
  - upstream source 문서와 모든 일반 분할 호출은 `None`을 사용
- 이 실패의 계획 보정은 다음 두 변경으로 제한한다.
  - `apps/desktop/src-tauri/src/state.rs`의 기존 `splitParagraph` adapter 호출에 네 번째 `None` 추가
  - `tests/rhwp-baseline.test.mjs`에 native adapter가 `split_paragraph_native(..., None)` 계약을 유지하는 회귀 검사 추가
- `None`은 upstream이 “일반 Enter 분할”로 정의한 경로이므로 새 기능이나 동작 변경을 추가하지 않는다. `restore_meta` 생성, 다른 mutation 변경, upstream source 수정은 금지한다.
- 보정 뒤 로컬 platform-neutral suite와 Rust format을 통과시키고 다음 하위 단계 commit으로 `publish/task5`를 fast-forward한 뒤 CI를 먼저 재실행한다.

```text
Task #5 [Stage 3.1]: rhwp v0.8.2 split paragraph adapter 호환성 보정
```

- 두 번째 canary run [30354133936](https://github.com/postmelee/alhangeul-tauri/actions/runs/30354133936)은 Stage 3.1 SHA `ab312e95b7dca05f19b87e1da44c4743e410157e`에서 다음 사실을 확인했다.
  - product boundary, pin, automation, upstream, Studio test/build와 Ubuntu `cargo test` 성공
  - Ubuntu `cargo clippy -- -D warnings`에서 `apps/desktop/src-tauri/src/linux_runtime.rs:91`의 `clippy::needless_return` 발생
  - 지적된 `return;`은 `apply_appimage_runtime_fixes_with_host_caches` 함수의 마지막 분기 안 마지막 문장이며, 이후 실행할 문장이 없어 제거 전후 제어 흐름이 같다.
- 이 실패의 계획 보정은 `apps/desktop/src-tauri/src/linux_runtime.rs`에서 해당 `return;` 한 줄을 제거하는 것으로 제한한다. 주변 분기 재구성, Linux runtime 동작 변경, lint 허용 속성 추가는 금지한다.
- 보정 뒤 로컬 platform-neutral suite와 Rust format을 통과시키고 다음 하위 단계 commit으로 `publish/task5`를 fast-forward한 뒤 CI를 먼저 재실행한다. 현재 macOS host에서는 Linux 전용 module의 Clippy 성공을 대신 주장하지 않고 remote Ubuntu 결과로 판정한다.

```text
Task #5 [Stage 3.2]: Linux runtime clippy 호환성 보정
```

- 세 번째 CI run [30355031203](https://github.com/postmelee/alhangeul-tauri/actions/runs/30355031203)은 Stage 3.2 SHA `b959d8bb68359625f8c88e96efdde62cffbb784e`에서 product boundary부터 Ubuntu `cargo test`, `cargo clippy -- -D warnings`까지 모두 성공했다.
- 첫 native canary run [30355545016](https://github.com/postmelee/alhangeul-tauri/actions/runs/30355545016)은 같은 SHA에서 다음 결과를 확인했다.
  - `linux-arm64`: checkout·pretest·DEB build·artifact verifier·upload 성공, `alhangeul-desktop-linux-arm64` artifact 생성
  - `windows-x64`: checkout과 product boundary 성공 뒤 pin verifier에서 upstream `Cargo.lock` SHA-256 불일치
  - Windows가 계산한 `069b59399bc60756c9450bf5e394b02cedf4c756710de07ba6fbc874f7ffdc37`는 같은 파일의 LF를 CRLF로 바꾼 byte hash와 정확히 같고, lock의 정규 LF hash는 `64ff4041c1874c01c7a901b28df2639082836ced44df392cd37b3227d4772279`
  - `linux-x64`: checkout·pretest와 DEB·RPM·AppImage build 성공 뒤 `appimage/Alhangeul.AppDir/.DirIcon` symbolic link를 verifier가 거부해 upload 전 실패
- Windows 보정은 `.github/workflows/alhangeul-desktop.yml`의 job environment에 Git command-scope 설정 `GIT_CONFIG_COUNT=1`, `GIT_CONFIG_KEY_0=core.autocrlf`, `GIT_CONFIG_VALUE_0=false`를 추가하는 것으로 제한한다. 이 설정은 `actions/checkout`의 main repository와 submodule checkout에 함께 적용해 Git config file보다 우선하며, pin verifier의 hash·size 기준은 바꾸지 않는다.
- Linux x64 보정은 `scripts/verify-desktop-artifacts.mjs`가 bundle root 아래의 `appimage/*.AppDir` directory subtree를 Tauri 중간 산출물로 식별해 재귀 scan에서 제외하는 것으로 제한한다.
  - 최종 `.AppImage`, `.deb`, `.rpm`과 그 밖의 regular file inventory 계약은 유지한다.
  - bundle root와 제외 대상 밖 symbolic link 거부, root 탈출 거부, 필수 종류·0바이트·inventory 변조 거부는 유지한다.
  - AppImage AppDir specification은 `.DirIcon`과 root icon/desktop entry가 symlink일 수 있음을 정의하므로 AppDir 내부 symlink 자체를 제품 artifact 변조로 판정하지 않는다.
- `tests/actions-workflows.test.mjs`에는 native workflow의 Git command-scope LF checkout 설정을, `tests/desktop-artifacts.test.mjs`에는 `appimage/*.AppDir`만 inventory에서 제외되고 필수 Linux x64 bundle은 계속 검증되는 계약을 추가한다.
- Tauri dependency/CLI upgrade, pin verifier 완화, matrix·필수 bundle 축소, arbitrary symlink 허용은 금지한다.
- 보정 뒤 로컬 platform-neutral suite와 Rust format을 통과시키고 다음 하위 단계 commit으로 `publish/task5`를 fast-forward한다. 새 exact SHA에서 CI를 먼저 성공시킨 뒤 native canary를 재실행한다.

```text
Task #5 [Stage 3.3]: Windows pin과 AppImage artifact 검증 보정
```

- CI가 성공하기 전에는 native artifact workflow를 dispatch하지 않는다.
- remote runner는 committed ref만 실행할 수 있으므로, Stage 3의 CI 보정은 일반 단계 묶음 커밋의 명시적 예외로 다음 하위 단계 메시지를 사용한다.

```text
Task #5 [Stage 3.4]: <추가 runner 보정 내용>
```

- 각 하위 단계 commit은 로컬 정적 검증 통과 후 `publish/task5`에 push하고 canary를 재실행한다. Stage 3 성공 뒤 최종 실행 증적과 모든 하위 commit을 `task_m010_5_stage3.md`에 모아 다음 단계 커밋으로 종료한다.

```text
Task #5 Stage 3: GitHub Actions canary 검증
```

- Actions 활성화 뒤 push 또는 dispatch가 수용 기준에 도달하지 못하고 task를 중단해야 하면 이 task가 만든 진행 중 run만 취소하고 repository Actions를 초기 상태로 복구한다.

```bash
gh api --method PUT \
  repos/postmelee/alhangeul-tauri/actions/permissions \
  -F enabled=false
```

- rollback 뒤 `enabled: false`를 확인한다. `publish/task5` 삭제는 파괴적 작업이므로 작업지시자 승인 또는 merge 후 `pr-merge-cleanup` 절차에서 수행한다.

### 검증

```bash
gh api repos/postmelee/alhangeul-tauri/actions/permissions
git ls-remote --heads origin refs/heads/publish/task5
pnpm run test:upstream
cargo fmt \
  --manifest-path apps/desktop/src-tauri/Cargo.toml \
  --all \
  -- \
  --check
gh run view <ci-run-id> \
  --repo postmelee/alhangeul-tauri \
  --json databaseId,url,event,headBranch,headSha,status,conclusion,jobs
gh run view <native-run-id> \
  --repo postmelee/alhangeul-tauri \
  --json databaseId,url,event,headBranch,headSha,status,conclusion,jobs
gh api \
  repos/postmelee/alhangeul-tauri/actions/runs/<native-run-id>/artifacts
git diff --check
```

예상 기준:

- Actions permission의 `enabled`는 `true`다.
- remote `publish/task5`, CI run, native run의 head SHA가 canary SHA와 같다.
- CI job과 세 native matrix job의 conclusion은 `success`다.
- Pages workflow는 이 task에서 dispatch되지 않았다.

### 커밋

```text
Task #5 Stage 3: GitHub Actions canary 검증
```

runner 보정이 있을 때만 앞서 정의한 `[Stage 3.N]` commit이 선행한다.

## Stage 4 — native artifact inventory와 운영 문서

### 산출물

수정:

- `docs/operations/DESKTOP_RELEASE.md`
- `docs/DEVELOPMENT.md`

작업 산출물:

- `mydocs/working/task_m010_5_stage4.md`

### 변경 내용

- 성공한 Stage 3 native run의 artifact를 `mktemp -d`로 만든 workspace 밖 임시 경로에 내려받는다.

```bash
gh run download <native-run-id> \
  --repo postmelee/alhangeul-tauri \
  --dir <validated-temp-directory>
```

- GitHub API의 artifact metadata에서 다음을 확인한다.
  - `alhangeul-desktop-windows-x64`
  - `alhangeul-desktop-linux-x64`
  - `alhangeul-desktop-linux-arm64`
  - `expired == false`
  - 각 artifact의 byte size가 0보다 큼
- 각 다운로드 디렉터리에서 `alhangeul-artifact-inventory.json`을 찾고 `--verify-inventory`로 bundle을 독립 재계산한다.

```text
pnpm run check:desktop-artifacts -- \
  --platform <platform> \
  --root <downloaded-artifact-root> \
  --verify-inventory <downloaded-artifact-root>/alhangeul-artifact-inventory.json
```

- `docs/operations/DESKTOP_RELEASE.md`를 실제 상태에 맞게 갱신한다.
  - repository Actions가 활성화되었으나 대상 workflow는 수동 전용이라는 사실
  - 검증 일자, canary commit, CI/native run ID와 URL
  - platform별 artifact 이름
  - installer 파일명·종류·byte size·SHA-256 inventory
  - retention 14일과 Actions artifact가 공식 배포물이 아니라는 경계
  - 서명·설치·Release·updater가 검증되지 않았다는 한계
  - 로컬/다운로드 후 artifact 검증 명령
- `docs/DEVELOPMENT.md`는 다음만 최소 갱신한다.
  - `pnpm run test:automation`
  - `check:desktop-artifacts` CLI 링크 또는 예시
  - Actions 활성 상태와 수동 workflow 운영 경계
- README, site, 다운로드 링크는 수정하지 않는다.
- Stage 3 preflight와 비교하여 Pages run, GitHub Release, tag가 이 task로 새로 만들어지지 않았는지 확인한다. secret 내용은 조회하거나 기록하지 않으며, workflow diff에 secret 참조가 없음을 정적 검사한다.
- 내려받은 installer와 임시 inventory는 검증 후 별도 배포 경로로 옮기지 않고 임시 디렉터리와 함께 정리한다.

### 검증

```bash
pnpm run check:desktop-artifacts -- \
  --platform windows-x64 \
  --root <windows-download-root> \
  --verify-inventory <windows-inventory>
pnpm run check:desktop-artifacts -- \
  --platform linux-x64 \
  --root <linux-x64-download-root> \
  --verify-inventory <linux-x64-inventory>
pnpm run check:desktop-artifacts -- \
  --platform linux-arm64 \
  --root <linux-arm64-download-root> \
  --verify-inventory <linux-arm64-inventory>
pnpm run test:automation
rg -n '<canary-sha>|<ci-run-id>|<native-run-id>|MSI|NSIS|DEB|RPM|AppImage|SHA-256' \
  docs/operations/DESKTOP_RELEASE.md
git diff --exit-code devel -- .github/workflows/pages.yml
git diff --check
```

예상 기준:

- 세 다운로드 artifact의 inventory가 build 시 기록된 JSON과 일치한다.
- 공식 문서의 commit, run URL, 파일명, byte size, SHA-256이 실제 결과와 일치한다.
- 문서는 artifact smoke와 공식 배포를 명확히 구분한다.

### 커밋

```text
Task #5 Stage 4: Native artifact inventory와 운영 문서 확정
```

## Stage 5 — Actions 수용 기준 통합 검증

### 산출물

repository 외부 상태:

- Stage 4까지의 최종 실행 가능 head를 검증한 CI run
- 같은 head를 검증한 native artifact run

작업 산출물:

- `mydocs/working/task_m010_5_stage5.md`

조건부 수정:

- Stage 1~4 산출물 중 Issue #5 범위의 최소 보정 파일

### 변경 내용

- 수행계획서의 포함·제외 범위와 실제 diff를 대조한다.
- 현재 macOS host에서는 platform-neutral 검증만 실행한다. desktop Rust test·clippy는 Ubuntu CI job, Tauri native bundle은 Windows/Linux native job 결과로만 판정한다.
- Stage 4 commit까지 포함한 clean head를 `publish/task5`로 fast-forward push하고 remote SHA 일치를 확인한다.
- CI와 native workflow를 Stage 3과 같은 방법으로 다시 dispatch해 최종 실행 가능 head를 검증한다.
- Stage 5 이후 추가되는 `mydocs/working/task_m010_5_stage5.md`, 최종 보고서, 오늘할일 상태처럼 실행에 영향을 주지 않는 증적 문서 commit은 remote native build를 무한 반복시키지 않는다. 마지막 remote 검증 SHA 이후 executable·workflow·official operations 파일이 바뀌지 않았음을 path diff로 확인한다.
- 최종 보고에 다음을 분리한다.
  - Ubuntu CI 결과
  - Windows/Linux native matrix 결과
  - 다운로드 후 inventory 검증 결과
  - 실행하지 않은 installer 설치·서명·공개 배포
- 통합 검증 실패가 runner 일시 오류가 아니라 계획 범위 변경을 요구하면 Stage 5를 완료 처리하지 않고 작업지시자에게 보고한다.

### 검증

현재 host의 platform-neutral 검증:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo metadata \
  --manifest-path apps/desktop/src-tauri/Cargo.toml \
  --locked \
  --offline \
  --no-deps
cargo fmt \
  --manifest-path apps/desktop/src-tauri/Cargo.toml \
  --all \
  -- \
  --check
git diff --exit-code devel -- .github/workflows/pages.yml
git diff --check
```

Windows/Linux remote 검증:

```bash
git push origin HEAD:refs/heads/publish/task5
git ls-remote --heads origin refs/heads/publish/task5
gh workflow run ci.yml \
  --repo postmelee/alhangeul-tauri \
  --ref publish/task5
gh workflow run alhangeul-desktop.yml \
  --repo postmelee/alhangeul-tauri \
  --ref publish/task5 \
  -f build_ref=<final-executable-sha> \
  -f run_tests=true
gh run view <final-ci-run-id> \
  --repo postmelee/alhangeul-tauri \
  --json databaseId,url,event,headBranch,headSha,status,conclusion,jobs
gh run view <final-native-run-id> \
  --repo postmelee/alhangeul-tauri \
  --json databaseId,url,event,headBranch,headSha,status,conclusion,jobs
gh api \
  repos/postmelee/alhangeul-tauri/actions/runs/<final-native-run-id>/artifacts
gh api repos/postmelee/alhangeul-tauri/actions/permissions
```

예상 기준:

- 최종 실행 가능 SHA와 두 run의 head SHA가 같다.
- CI의 Ubuntu job에서 desktop Rust test·clippy를 포함한 모든 step이 성공한다.
- native workflow의 Windows x64, Linux x64, Linux arm64 job이 모두 성공한다.
- 세 platform artifact가 비어 있지 않고 필수 installer inventory를 포함한다.
- Actions는 활성 상태이고 두 workflow는 수동 trigger·`contents: read`를 유지한다.
- 마지막 검증 SHA 이후에는 실행에 영향을 주지 않는 `mydocs` 증적만 추가된다.
- macOS, 자동 trigger, required check, Release, tag, Pages 실행, updater, signing, secret이 추가되지 않는다.

### 커밋

```text
Task #5 Stage 5: Actions 수용 기준 통합 검증
```

## 검증

- 각 Stage 검증 명령은 `task-stage-report` 호출과 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- 현재 macOS host에서 `pnpm run test:desktop`, `pnpm run clippy:desktop`, `pnpm tauri build`를 실행해 macOS 검증으로 대체하지 않는다.
- native compile·bundle·Rust test·clippy의 성공 근거는 GitHub Actions의 Windows/Linux run ID, head SHA, job conclusion, log로 제한한다.
- workflow나 검증기 변경이 있으면 remote run 전 로컬 정적 test를 먼저 통과시킨다.
- remote 실행 결과의 branch 이름만 보지 않고 head SHA와 실제 checkout SHA를 함께 확인한다.
- 문서에 기록하는 checksum은 다운로드 후 재계산 결과와 일치해야 한다.
- 계획 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 다시 받는다.
- 문서 위치가 수행계획서 판단과 달라지면 수정 전에 계획서를 갱신하고 승인받는다.

## 커밋

- 기본 단계 커밋은 해당 Stage 소스·문서와 `mydocs/working/task_m010_5_stage{N}.md`를 함께 묶는다.
- 커밋 메시지는 다음 다섯 개로 고정한다.
  - `Task #5 Stage 1: Desktop artifact 계약과 검증기 구현`
  - `Task #5 Stage 2: Windows/Linux Actions workflow 안전장치 연결`
  - `Task #5 Stage 3: GitHub Actions canary 검증`
  - `Task #5 Stage 4: Native artifact inventory와 운영 문서 확정`
  - `Task #5 Stage 5: Actions 수용 기준 통합 검증`
- Stage 3에서 remote runner가 발견한 문제를 고칠 때만 `Task #5 [Stage 3.N]: ...` 하위 commit을 허용한다. 이는 committed ref가 필요한 remote 검증의 승인된 예외이며 Stage 3 보고서에서 모두 연결한다.
- 단계 완료보고서와 검증이 준비되기 전에는 Stage 1·2·4·5 소스만 별도 커밋하지 않는다.

## 단계 의존성

- Stage 1은 GitHub Actions를 건드리지 않고 fixture로 artifact 계약을 먼저 확정한다.
- Stage 2는 Stage 1 보고서 승인 후 진행하며 검증기를 workflow gate에 연결하고 static policy를 자동화한다.
- Stage 3은 Stage 2 보고서 승인 후 진행한다. Stage 3 시작 승인 전에는 Actions 활성화, remote `publish/task5` push, workflow dispatch를 수행하지 않는다.
- Stage 4는 Stage 3 canary 성공과 보고서 승인 후 진행하며 실제 artifact를 독립 검증한 뒤에만 공식 운영 문서를 갱신한다.
- Stage 5는 Stage 4 보고서 승인 후 진행하며 최종 실행 가능 head를 remote에서 다시 검증한다.
- 각 Stage 사이에는 `task-stage-report` 절차와 작업지시자 승인이 필요하다.
- 모든 Stage 완료 후 `task-final-report` 승인 절차로 최종 보고서, 오늘할일 완료, remote push와 `devel` 대상 Open PR을 처리한다.

## 위험과 대응

- **Actions 설정 변경 실패**: 활성화 API 응답과 후속 GET을 분리해 확인한다. 활성화 후 수용 기준을 달성하지 못하고 중단하면 초기 `enabled: false`로 복구한다.
- **remote 검증과 단계 커밋의 순환 의존성**: Stage 2의 검증 완료 commit을 첫 canary로 사용하고, runner 보정만 `[Stage 3.N]` commit으로 허용한다. 최종 Stage 3 보고서가 모든 remote 증적을 연결한다.
- **잘못된 run 선택**: dispatch 시각, workflow, event, branch, head SHA를 모두 대조하고 ID를 확정한 뒤 watch한다.
- **branch 이동 중 checkout 불일치**: native workflow의 `build_ref`를 40자리 canary SHA로 전달하고 checkout 뒤 실제 commit을 검증한다.
- **hosted runner 시간·쿼터 사용**: 실패 log를 분석하지 않은 재실행은 하지 않는다. 한 변경 commit당 필요한 workflow만 실행하고 최종 Stage에서 두 workflow를 한 번 더 검증한다.
- **Windows shell/path 차이**: artifact 검증 자체는 Node path API를 사용하고 workflow shell 문자열을 최소화한다. Windows fixture는 실제 Windows matrix의 `run_tests`에서도 실행한다.
- **Linux arm64 가용성**: runner 자체가 제공되지 않거나 dependency가 달라 matrix 교체가 필요하면 Issue 범위를 자동 변경하지 않고 승인 요청한다.
- **Task #3 native adapter 누락**: `rhwp v0.8.2` pin 뒤 Studio·platform-neutral 검증은 통과했지만 Ubuntu compile이 새 `restore_meta` 인자를 요구했다. upstream이 지정한 일반 경로 `None` 한 줄과 회귀 검사만 허용하고 remote CI로 실제 compile을 확인한다.
- **Linux 전용 Clippy drift**: Stage 3.1의 Ubuntu `cargo test`는 성공했지만 함수 끝의 명시적 `return;`이 `-D warnings`에서 거부됐다. 해당 한 줄만 제거하고 local format과 remote Ubuntu Clippy로 동작 불변·lint 해소를 확인한다.
- **Windows CRLF checkout**: pin verifier가 탐지한 hash 차이는 동일 LF file의 CRLF 변환 hash와 일치한다. verifier를 줄바꿈 무시 방식으로 완화하지 않고 checkout 전에 효력을 갖는 Git command-scope config로 repository와 submodule byte를 LF로 고정한다.
- **Tauri AppDir symbolic link**: AppImage 표준 중간 directory에는 symlink가 포함될 수 있다. 최종 installer bundle이 아닌 `appimage/*.AppDir` subtree만 제외하고 나머지 symbolic link 거부와 필수 installer 검증을 보존한다.
- **artifact 위장 또는 stale file**: build 후 바로 필수 종류·0바이트·checksum을 검사하고 inventory를 같은 Actions artifact에 포함한다. 다운로드 후 inventory와 파일을 다시 비교한다.
- **Pages와 배포의 우발 실행**: 대상 workflow allowlist만 dispatch하고 Pages baseline을 비교한다. release·deploy·secret 참조는 static test에서 거부한다.
- **macOS 검증 혼입**: 현재 host에서는 platform-neutral test만 실행하며 native 성공 근거를 Windows/Linux Actions로 한정한다.
- **공식 문서의 과장**: 실제 run 성공 뒤에만 상태를 갱신하고 installer 설치, 서명, Release, updater가 검증되지 않았음을 같은 문서에 남긴다.

## 승인 요청 사항

- Stage 1~5의 산출물, 검증 명령, 커밋 메시지를 승인한다.
- artifact verifier CLI, deterministic JSON schema, 필수 bundle 종류와 0바이트·checksum 거부 계약을 승인한다.
- `tests/actions-workflows.test.mjs`와 `test:automation`으로 수동 trigger·최소 권한·matrix·artifact gate를 지속 검증하는 방향을 승인한다.
- Stage 3 시작 승인이 repository Actions 활성화, `publish/task5` 최초 push, 두 workflow dispatch와 hosted runner 사용을 포함하는 것으로 승인한다.
- remote runner 보정에 한해 `[Stage 3.N]` commit을 먼저 push하고 최종 Stage 3 보고서에서 묶는 순서 예외를 승인한다.
- 첫 canary run 30353284044가 발견한 `split_paragraph_native(..., None)` 한 줄과 `tests/rhwp-baseline.test.mjs` 회귀 검사만 Stage 3 범위에 추가하는 계획 보정을 승인한다.
- 두 번째 canary run 30354133936이 발견한 `linux_runtime.rs` 함수 끝의 `return;` 한 줄 제거만 Stage 3 범위에 추가하는 계획 보정을 승인한다.
- 첫 native canary run 30355545016이 발견한 Windows command-scope LF checkout 설정과 Tauri `appimage/*.AppDir` 중간 트리 제외 및 두 정적 회귀 검사만 Stage 3 범위에 추가하는 계획 보정을 승인한다.
- 중단 시 Actions를 초기 비활성 상태로 복구하고 remote branch 삭제는 별도 승인 또는 merge cleanup으로 넘기는 rollback 절차를 승인한다.
- 현재 macOS host에서 native Rust test·clippy·Tauri build를 실행하지 않고 Windows/Linux Actions 결과만 native 근거로 사용하는 검증 경계를 승인한다.
- Stage 4에서 실제 canary 성공 뒤에만 `DESKTOP_RELEASE.md`와 `DEVELOPMENT.md`를 갱신하는 문서 경계를 승인한다.
- 각 Stage 완료 후 `task-stage-report`와 다음 단계 승인을 거치며, 지금은 Stage 1 구현을 시작하지 않는 절차를 승인한다.
