# Task #5 수행계획서 — Windows/Linux Actions와 native artifact smoke

GitHub Issue: [#5](https://github.com/postmelee/alhangeul-tauri/issues/5)
마일스톤: M010

## 목적

현재 저장소에서 비활성화된 GitHub Actions를 안전하게 활성화하고, 수동 `workflow_dispatch`로 플랫폼 중립 CI와 Windows/Linux native Tauri bundle 빌드를 실제 실행한다.

Windows x64의 MSI·NSIS, Linux x64의 DEB·RPM·AppImage, Linux arm64의 DEB를 비어 있지 않은 artifact로 생성했는지 자동 검증하고, 실행 이력과 artifact inventory를 운영 문서에 남긴다. 이 task의 성공 기준은 배포가 아니라 재현 가능한 build smoke이며, 서명·GitHub Release·사용자 다운로드 배포는 포함하지 않는다.

## 배경

`.github/workflows/ci.yml`과 `.github/workflows/alhangeul-desktop.yml`에는 수동 실행 전용 workflow가 이미 준비되어 있지만 저장소 수준 GitHub Actions 권한은 비활성화되어 있다. 따라서 workflow 파일의 정적 구성만 존재할 뿐 실제 runner와 native bundle 결과는 아직 검증되지 않았다.

Task #3에서 `rhwp v0.8.2` Stable pin과 source/native/WASM 동기화 기준을 확정했으므로, 다음 단계는 이 고정 상태를 Windows/Linux runner에서도 검사하고 Tauri bundle을 artifact로 확보하는 것이다. 기존 [Desktop Release 운영 문서](../../docs/operations/DESKTOP_RELEASE.md)의 platform/bundle 계약과 `AGENTS.md`의 “macOS 제외”, “명시 승인 없는 배포 금지” 경계를 유지한다.

현재 확인된 기준 상태는 다음과 같다.

- 저장소 GitHub Actions: 비활성
- workflow trigger: 두 workflow 모두 수동 `workflow_dispatch`만 사용
- CI runner: Ubuntu x64
- native artifact matrix: Windows x64, Linux x64, Linux arm64
- artifact retention: 14일
- workflow 권한: `contents: read`
- 서명, Release, Pages, updater, 자동 trigger: 이번 task 범위 밖

## 범위

### 포함

- 저장소 수준 GitHub Actions 활성화
- 기존 `ci.yml`의 Ubuntu 플랫폼 중립 CI 실제 실행
- 기존 `alhangeul-desktop.yml`의 Windows x64, Linux x64, Linux arm64 native Tauri build 실제 실행
- 모든 workflow에서 현재 `rhwp` Stable pin 검증 적용
- platform별 필수 bundle 종류와 0바이트 여부를 자동 검사하는 artifact inventory 검증기 및 fixture test
- artifact upload 전에 bundle 계약 검증을 수행하도록 workflow 연결
- 최종 commit을 가리키는 remote canary ref에서 workflow 실행
- 실행 ID·URL·commit과 artifact 이름·종류·크기·SHA-256 inventory 기록
- runner에서 드러난 workflow·도구 설정 문제의 최소 보정
- 첫 Ubuntu canary에서 확인된 `rhwp v0.8.2` native API signature 호환성의 최소 adapter 보정
- 두 번째 Ubuntu canary에서 확인된 Linux 전용 `clippy::needless_return`의 동작 불변 한 줄 보정
- 첫 native canary에서 확인된 Windows checkout 줄바꿈과 Tauri AppDir 중간 산출물의 최소 검증 보정
- Desktop Release 운영 문서의 실제 검증 상태 갱신

### 제외

- macOS build, CI, 개발 검증, artifact
- `pull_request`, `push`, schedule 등 자동 trigger와 required check
- 생성 installer의 실제 설치·실행 UI 검증
- 코드 서명, 인증서, secret 등록, 공증
- GitHub Release, tag, package repository, 사용자 다운로드 게시
- Pages workflow 실행 또는 변경
- updater 구성
- `rhwp` v0.8.2보다 이후 버전 반영
- Tauri dependency 또는 CLI version 갱신
- 위 native API signature adapter와 Linux Clippy 한 줄 보정을 넘는 제품 기능 또는 UI 변경
- native runner 실패를 계기로 한 범위 밖 제품 동작 수정

## 설계 방향

- Actions를 활성화하더라도 이번 task가 다루는 두 workflow는 `workflow_dispatch` 전용으로 유지한다. 자동 실행과 required check 전환은 별도 Issue에서 결정한다.
- workflow의 최소 권한은 기존 `contents: read`를 유지하고 secret을 추가하지 않는다.
- native matrix는 Windows x64, Linux x64, Linux arm64만 유지한다. Linux arm64는 현재처럼 DEB만 생성하고, macOS matrix는 추가하지 않는다.
- 모든 build는 Task #3에서 확정한 `rhwp-core.lock`, Cargo git dependency, bundled WASM manifest의 일치 검사를 선행한다.
- artifact 검증기는 특정 runner shell에 종속되지 않는 Node.js ESM으로 둔다. platform key와 bundle root를 입력받아 필수 확장자, 파일 크기, SHA-256을 검사하고 사람이 확인 가능한 inventory를 출력한다.
- artifact 계약은 다음과 같이 고정한다.

| platform key | 필수 bundle |
|---|---|
| `windows-x64` | MSI 1개 이상, NSIS installer EXE 1개 이상 |
| `linux-x64` | DEB 1개 이상, RPM 1개 이상, AppImage 1개 이상 |
| `linux-arm64` | DEB 1개 이상 |

- 검증기는 필수 종류 누락 또는 0바이트 파일을 실패로 처리한다. checksum과 inventory는 build log와 다운로드 후 운영 검증에 재사용한다.
- GitHub Actions는 현재 비활성 상태를 먼저 기록한 뒤 별도 단계 승인 직후 활성화한다. 수용 기준에 도달하지 못한 채 task를 중단해야 하면 초기 상태인 비활성으로 복구한다.
- remote에서 수정된 workflow를 정확히 검증하려면 workflow 파일이 포함된 remote ref가 필요하다. 따라서 로컬 검증과 단계 보고를 마친 reviewable commit을 `publish/task5`에 먼저 push한 후 PR 생성 전 canary ref로 사용한다.
- 위 canary push는 일반적인 “최종 보고 후 publish” 순서의 명시적 예외다. 별도 단계 승인 후에만 실행하며 PR은 여전히 최종 보고 뒤 생성한다. remote `local/task5`는 만들지 않고, canary branch는 최종 PR과 merge 후 정리에 그대로 사용한다.
- canary는 branch 이름뿐 아니라 실행 결과의 head SHA가 의도한 commit과 일치하는지 확인한다. runner 문제 보정이 필요하면 Issue 범위 안에서만 같은 branch에 commit·push하고 성공할 때까지 재실행한다.
- Actions 활성화로 기존 수동 Pages workflow도 실행 가능한 상태가 될 수 있으나 이번 task에서는 dispatch하거나 수정하지 않는다.
- installer 생성은 검증 산출물일 뿐 release로 게시하지 않는다. artifact retention은 기존 14일을 유지한다.

## 문서 위치 판단

자동화 코드는 저장소의 기존 `.github/workflows/`, `scripts/`, `tests/` 구조를 따른다. 외부 기여자와 운영자가 실제 native build 상태를 확인하는 내용은 기존 공식 운영 문서인 `docs/operations/DESKTOP_RELEASE.md`에 반영한다. 작업 승인·단계·실행 증적은 제품 문서가 아니므로 `mydocs/`에 둔다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `.github/workflows/ci.yml` | 공식 자동화 | 기여자/유지보수자 | `.github/workflows/` | `scripts/` | GitHub Actions workflow의 기존 진실 원천 |
| `.github/workflows/alhangeul-desktop.yml` | 공식 자동화 | 기여자/유지보수자 | `.github/workflows/` | `scripts/` | platform matrix와 artifact upload의 기존 진실 원천 |
| `scripts/verify-desktop-artifacts.mjs` | 공식 자동화 | 기여자/유지보수자 | `scripts/` | `.github/scripts/` | 로컬·runner·다운로드 후 검증에서 공통 재사용 |
| `tests/desktop-artifacts.test.mjs` | 자동화 검증 | 기여자/유지보수자 | `tests/` | `scripts/` | fixture 기반 성공·실패 계약을 기존 Node test 구조에 배치 |
| `docs/operations/DESKTOP_RELEASE.md` | 공식 운영 문서 | 기여자/유지보수자 | `docs/operations/` | `mydocs/manual/` | build·artifact 운영 기준의 기존 문서 |
| `mydocs/plans/task_m010_5*.md`, `mydocs/working/task_m010_5_stage*.md`, `mydocs/report/task_m010_5_report.md` | 작업 산출물 | 작업지시자/내부 작업자 | `mydocs/` | `docs/` | 승인, 단계 기록, 실행 증적은 제품 공식 문서와 분리 |

`docs/DEVELOPMENT.md`는 새로운 로컬 명령을 기여자에게 안내할 필요가 확인될 때만 최소 수정한다. 실제 canary가 성공하기 전에는 공식 문서에 성공으로 기록하지 않는다.

## 예상 변경 파일

신규:

- `scripts/verify-desktop-artifacts.mjs`
- `tests/desktop-artifacts.test.mjs`

수정:

- `.github/workflows/ci.yml`
- `.github/workflows/alhangeul-desktop.yml`
- `apps/desktop/src-tauri/src/linux_runtime.rs` — 함수 끝의 불필요한 `return;` 제거만
- `apps/desktop/src-tauri/src/state.rs` — `rhwp v0.8.2` signature 호환을 위한 `None` 인자 추가만
- `package.json`
- `tests/rhwp-baseline.test.mjs` — 위 adapter 호출 계약 회귀 검사만
- `docs/operations/DESKTOP_RELEASE.md`
- `docs/DEVELOPMENT.md` — 기여자용 로컬 검증 명령 안내가 필요한 경우에만

이번 task 산출물:

- `mydocs/orders/20260728.md`
- `mydocs/plans/task_m010_5.md`
- `mydocs/plans/task_m010_5_impl.md`
- `mydocs/working/task_m010_5_stage1.md`
- `mydocs/working/task_m010_5_stage2.md`
- `mydocs/working/task_m010_5_stage3.md`
- `mydocs/working/task_m010_5_stage4.md`
- `mydocs/working/task_m010_5_stage5.md`
- `mydocs/report/task_m010_5_report.md`

## 잠정 단계

- **Stage 1 — artifact 계약과 검증기**
  - platform별 필수 bundle 종류, 0바이트 거부, SHA-256 inventory를 구현한다.
  - fixture test로 Windows/Linux 성공 사례와 필수 파일 누락·빈 파일 실패 사례를 검증한다.
  - GitHub Actions는 활성화하거나 실행하지 않는다.
- **Stage 2 — workflow 최소 보정과 로컬 검증**
  - 두 workflow에 `rhwp` pin 검증을 추가한다.
  - native build의 artifact upload 전에 Stage 1 검증기를 연결한다.
  - 수동 trigger, 최소 권한, platform matrix, retention, 비배포 경계를 정적 검증한다.
  - 수정된 workflow와 검증기 상태를 commit하고 단계 보고를 마친다.
- **Stage 3 — Actions 활성화와 exact-ref canary**
  - 작업지시자의 별도 단계 승인을 받은 뒤 저장소 Actions를 활성화한다.
  - Stage 2의 reviewable commit을 `publish/task5`에 push하여 canary ref로 사용한다.
  - CI와 native artifact workflow를 수동 dispatch하고 head SHA, 실행 ID, URL, job 결과를 수집한다.
  - runner 실패가 발생하면 Issue 범위 내 workflow·도구 설정만 최소 보정하고 같은 ref에서 재검증한다.
  - 첫 CI run에서 확인된 `split_paragraph_native`의 네 번째 `restore_meta` 인자 누락은 upstream이 일반 Enter 경로로 명시한 `None`만 전달하고 회귀 검사를 추가한 뒤 같은 ref에서 재검증한다.
  - 두 번째 CI run에서 확인된 `linux_runtime.rs` 함수 끝의 `clippy::needless_return`은 해당 `return;` 한 줄만 제거해 동작을 유지하고 같은 ref에서 재검증한다.
  - 첫 native run에서 확인된 Windows CRLF checkout은 Git command-scope 설정으로 LF를 보존하고, Linux x64 verifier는 최종 installer가 아닌 `appimage/*.AppDir` 중간 트리만 scan에서 제외한 뒤 같은 ref에서 재검증한다.
- **Stage 4 — native artifact inventory와 운영 문서**
  - 성공한 native run의 artifact를 내려받아 필수 종류, 크기, SHA-256을 독립 재검증한다.
  - 실제 검증 일자·commit·run과 artifact inventory를 Desktop Release 운영 문서에 반영한다.
  - release·서명·설치 검증을 완료한 것으로 오인할 표현이 없는지 확인한다.
- **Stage 5 — 최종 수용 검증**
  - 최종 reviewable head를 `publish/task5`에 반영하고 두 workflow를 exact head에서 재검증한다.
  - Actions 활성 상태와 금지 범위 불변을 확인하고 전체 플랫폼 중립 검증을 실행한다.
  - 최종 보고서 작성 후 기존 절차대로 `devel` 대상 PR을 생성한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - `node --test tests/desktop-artifacts.test.mjs`
  - Windows x64, Linux x64, Linux arm64 fixture의 성공 inventory 확인
  - 필수 bundle 누락과 0바이트 fixture의 비정상 종료 확인
  - `git diff --check`
- Stage 2
  - `pnpm install --frozen-lockfile`
  - `pnpm run check:product-boundary`
  - `pnpm run check:rhwp-pin`
  - `pnpm run test:upstream`
  - `pnpm run test:studio`
  - `pnpm run build:studio`
  - workflow trigger·permissions·matrix·artifact verifier 연결에 대한 정적 검사
  - `.github/workflows/pages.yml` 무변경 확인
  - `git diff --check`
- Stage 3
  - GitHub repository Actions permissions API로 활성 상태 확인
  - `publish/task5` remote commit과 dispatch 대상 SHA 일치 확인
  - `ci.yml` 수동 run 성공 및 모든 job conclusion 확인
  - `alhangeul-desktop.yml` 수동 run의 세 matrix job 성공 확인
  - run log에서 각 platform의 artifact inventory 출력 확인
  - 실패 시 failed job log를 근거로 범위 내 보정 후 재실행
- Stage 4
  - 성공한 native run의 artifact 세 개 다운로드
  - 내려받은 artifact에 검증기를 다시 실행하여 필수 bundle·0바이트·SHA-256 확인
  - 문서의 run ID·URL·head SHA·artifact 이름이 실제 GitHub 결과와 일치하는지 확인
  - GitHub Release, tag, Pages, secret이 생성되지 않았는지 확인
  - `git diff --check`
- Stage 5
  - `pnpm run check:product-boundary`
  - `pnpm run check:rhwp-pin`
  - `pnpm run test:upstream`
  - `pnpm run test:studio`
  - `pnpm run build:studio`
  - `pnpm run test:desktop`
  - `pnpm run clippy:desktop`
  - 최종 `publish/task5` head에서 두 수동 workflow 성공 확인
  - 저장소 Actions 활성 상태와 workflow의 수동 trigger·최소 권한 확인
  - `git diff --check`

### 통합 검증

- GitHub Actions가 활성 상태이며 두 대상 workflow가 수동 실행에 성공한다.
- CI run의 head SHA가 최종 검증 commit과 일치한다.
- native run의 Windows x64, Linux x64, Linux arm64 job이 모두 성공한다.
- Windows x64 artifact에 비어 있지 않은 MSI·NSIS EXE가 있다.
- Linux x64 artifact에 비어 있지 않은 DEB·RPM·AppImage가 있다.
- Linux arm64 artifact에 비어 있지 않은 DEB가 있다.
- artifact inventory의 파일명·크기·SHA-256과 run URL이 운영 문서의 증적과 일치한다.
- workflow는 `workflow_dispatch` 전용이고 `permissions: contents: read`를 유지한다.
- macOS, 자동 trigger, required check, Release, tag, Pages 실행, updater, signing, secret이 추가되지 않는다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **remote canary가 필요한 순서 예외**: 수정된 workflow는 remote ref가 없으면 실행할 수 없다. Stage 2 완료와 별도 승인을 전제로 `publish/task5`를 PR보다 먼저 push하며, 최종 PR도 같은 branch를 사용한다.
- **GitHub Actions 외부 상태 변경**: 활성화는 저장소 전체 workflow 실행 가능성에 영향을 준다. 초기 비활성 상태를 기록하고 승인된 두 workflow만 dispatch하며, task가 수용 기준에 도달하지 못한 채 중단되면 비활성으로 복구한다.
- **runner 시간·쿼터 사용**: Windows/Linux native matrix는 실행 시간과 hosted runner quota를 사용한다. platform별 run을 불필요하게 반복하지 않고 실패 job log를 먼저 분석한다.
- **runner·toolchain drift**: 운영체제 image, Rust, Node, pnpm, Tauri dependency 차이로 로컬에서 재현되지 않는 실패가 발생할 수 있다. 제품 기능 변경으로 확장하지 않고 workflow/tool 설정의 최소 보정만 허용한다.
- **Linux arm64 runner 가용성**: `ubuntu-22.04-arm`의 가용성 또는 dependency 차이로 실패할 수 있다. runner 자체 제약이면 증적을 남기고 대체 runner 결정은 별도 승인 대상으로 분리한다.
- **artifact 이름 차이**: Tauri bundle의 실제 파일명이 예상과 다를 수 있다. 확장자와 installer 유형을 기준으로 검증하되, 필수 종류를 완화하지 않는다.
- **검증과 배포의 혼동**: Actions artifact가 생성되어도 서명·설치·배포 검증이 된 것은 아니다. 공식 문서와 보고서에 smoke 범위와 제외 항목을 명시한다.
- **범위 밖 제품 결함 발견**: native build 중 제품 코드 결함이 드러날 수 있다. workflow 설정으로 해결되지 않으면 별도 Issue 후보로 보고하고 이 task 범위를 임의 확장하지 않는다.
- **v0.8.2 adapter signature 누락**: 첫 canary run [30353284044](https://github.com/postmelee/alhangeul-tauri/actions/runs/30353284044)에서 `split_paragraph_native`의 네 번째 `Option<ParaMeta>` 인자 누락으로 E0061이 발생했다. upstream 문서가 일반 Enter에 `None`을 지정하므로 이 한 호출과 회귀 검사만 명시적으로 포함하고, 의미 변경이나 다른 mutation 보정은 허용하지 않는다.
- **Linux 전용 Clippy drift**: 두 번째 canary run [30354133936](https://github.com/postmelee/alhangeul-tauri/actions/runs/30354133936)은 Stage 3.1 commit에서 `cargo test`까지 성공한 뒤 `linux_runtime.rs:91`의 `clippy::needless_return`으로 실패했다. 이 문장은 함수의 마지막 분기·마지막 문장이므로 `return;` 한 줄 제거만 허용하고 remote Ubuntu Clippy로 재검증한다.
- **Windows checkout 줄바꿈**: 첫 native run [30355545016](https://github.com/postmelee/alhangeul-tauri/actions/runs/30355545016)의 Windows x64는 `Cargo.lock`을 CRLF로 checkout해 pin의 정규 LF hash와 달라졌다. verifier의 hash·size 계약을 완화하지 않고 Git command-scope `core.autocrlf=false`로 main repository와 submodule의 checkout byte를 보존한다.
- **AppImage 표준 중간 symlink**: 같은 run의 Linux x64 bundle은 생성됐지만 verifier가 `appimage/Alhangeul.AppDir/.DirIcon`에서 실패했다. `.DirIcon`은 AppImage AppDir 표준 구조이므로 최종 installer가 아닌 `appimage/*.AppDir` 중간 트리만 inventory scan에서 제외하고, 다른 symbolic link 거부와 DEB·RPM·AppImage 필수 계약은 유지한다.

## 승인 요청 사항

- GitHub Actions를 활성화하되 두 대상 workflow를 수동 `workflow_dispatch` 전용으로 유지하는 범위
- Windows x64는 MSI·NSIS, Linux x64는 DEB·RPM·AppImage, Linux arm64는 DEB를 필수 artifact 계약으로 삼는 방향
- Node.js 기반 artifact inventory 검증기와 fixture test를 추가하는 방향
- Task #3의 `rhwp` Stable pin 검증을 두 workflow에 연결하는 방향
- 첫 canary가 확인한 `rhwp v0.8.2` `split_paragraph_native(..., None)` adapter 호환성 한 줄과 해당 회귀 검사만 범위에 추가하는 계획 보정
- 두 번째 canary가 확인한 `linux_runtime.rs` 함수 끝의 `return;` 한 줄 제거만 범위에 추가하는 계획 보정
- 첫 native canary가 확인한 Windows LF checkout 강제와 Tauri `appimage/*.AppDir` 중간 트리 제외만 범위에 추가하는 계획 보정
- Stage 3에서 별도 승인을 받은 뒤 reviewable commit을 `publish/task5`에 PR보다 먼저 push해 exact-ref canary를 수행하는 순서 예외
- 수용 실패 또는 task 중단 시 저장소 Actions를 초기 비활성 상태로 복구하는 rollback 기준
- macOS, 자동 trigger, required check, 설치 검증, 서명, secret, Release, tag, Pages, updater를 제외하는 범위
- 위 5개 단계와 검증·문서 위치 계획

승인되면 `task_m010_5_impl.md`에서 단계별 산출물, GitHub API/CLI 명령, 검증 명령, commit 메시지와 rollback 절차를 구체화한다.
