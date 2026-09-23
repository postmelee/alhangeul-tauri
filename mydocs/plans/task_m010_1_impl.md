# Task #1 구현계획서 — Alhangeul 독립화 리브랜딩 및 macOS 지원 범위 제거

수행계획서: [`task_m010_1.md`](task_m010_1.md)
GitHub Issue: [#1](https://github.com/postmelee/alhangeul-tauri/issues/1)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Windows/Linux 플랫폼 경계 확정 | macOS·Quick Look 전용 경로 삭제, 공용 Rust 경계 단순화 | 전용 경로 검색, Rust format, repository baseline test |
| 2 | Alhangeul 제품 식별자와 런타임 전환 | npm/Rust/Tauri 명명, UI·asset, updater 제거 | frozen install, studio test/build, 식별자 검색 |
| 3 | 공식 문서·사이트·워크플로 독립화 | README·docs·site, provenance, Windows/Linux workflow | boundary checker, YAML·링크 검사, 문서 검색 |
| 4 | 통합 정합성 검증 | Stage 1~3 교차 검증과 최소 보정 | 전체 platform-neutral suite, diff, 최종 allowlist |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 | `README.md` | OK | 제품 진입 문서로 유지한다. |
| 기여자·사용자 문서 | `docs/` | `docs/DEVELOPMENT.md`, `docs/KEYBOARD_SHORTCUTS.md`, `docs/README.md` | OK | 기존 공식 문서 루트를 유지한다. |
| HOP·asset 출처 문서 | `docs/architecture/` | `docs/architecture/PROVENANCE.md` | OK | 제품 설명과 출처 기록을 분리한다. |
| 운영 문서 | `docs/operations/` | 유효 문서 수정, obsolete HOP release·Quick Look 문서 삭제 | OK | archive하지 않고 Git 이력으로 보존한다. |
| 사용자 소개 페이지 | `site/` | `site/index.html`, `site/styles.css` | OK | 미출시 상태를 명확히 표시한다. |
| 작업 산출물 | `mydocs/` | `mydocs/orders/20260719.md`, `mydocs/plans/task_m010_1*.md`, 단계·최종 보고서 | OK | 제품 공식 문서와 분리한다. |

## 공통 구현 규칙

- 각 Stage는 구현과 검증을 마친 뒤 `task-stage-report`로 해당 Stage 보고서를 작성하고 소스와 함께 커밋한다.
- Stage 보고서 승인 전 다음 Stage 파일을 수정하지 않는다.
- `third_party/rhwp` submodule pointer와 `apps/studio-host/vendor/rhwp-core/`는 이번 task에서 갱신하지 않는다.
- GitHub Actions 저장소 설정은 비활성 상태를 유지한다. workflow 파일 변경은 정적 정의 정리이며 원격 실행을 승인하지 않는다.
- Tauri macOS build, macOS native test, Apple 서명·공증 검증은 실행하지 않는다.
- 삭제 대상은 Git 이력으로 복구 가능하게 일반 `git rm`/`git mv` 단위로 처리하고, 저장소 밖 사용자 파일은 건드리지 않는다.
- HOP 명칭 허용 위치는 `docs/architecture/PROVENANCE.md`, `LICENSE`, `AGENTS.md`의 역사적 경계 설명, `mydocs/` 작업 기록으로 제한한다.
- `postmelee/alhangeul-macos` 자산은 source commit `dcef80cae43195a3e353de084f7246614da924be`을 기준으로 읽기만 하며 해당 저장소는 수정하지 않는다.

## Stage 1 — Windows/Linux 플랫폼 경계 확정

### 산출물

수정:

- `package.json`
- `.gitignore`
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/Cargo.lock`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/src/commands.rs`
- `apps/desktop/src-tauri/src/font_catalog.rs`
- `apps/desktop/src-tauri/src/pending_open.rs`

삭제:

- `apps/desktop/quicklook/**`
- `apps/desktop/src-tauri/src/macos_recent_documents.rs`
- `scripts/build-quicklook-macos.mjs`
- `scripts/test-quicklook-macos.mjs`
- `assets/logo/icon.icns`

### 변경 내용

- root package의 Quick Look build/test script와 `build:before-tauri`, `test` 연결을 제거한다. studio build, upstream baseline, studio test, desktop test 명령은 유지한다.
- Swift extension, Quick Look FFI Rust crate, entitlements와 Info.plist 전체를 삭제한다.
- Tauri `bundle.macOS`, `.appex` staging, Apple UTI `contentTypes`와 macOS 전용 icon을 제거한다.
- `objc2-app-kit`, `objc2-foundation` target dependency와 lockfile의 더 이상 사용하지 않는 항목을 정리한다.
- Finder recent documents 호출과 `macos_recent_documents` 모듈을 삭제한다. 앱 내부 recent documents 저장은 Windows/Linux 공용 동작으로 유지한다.
- `lib.rs`, `commands.rs`, `font_catalog.rs`, `pending_open.rs`의 macOS 조건 분기를 제거하고 Windows/Linux 공용 경로를 명시적으로 남긴다.
- `.gitignore`의 Quick Look target·bundle 항목을 제거한다.
- 제품명·npm/Rust package rename과 updater 제거는 Stage 2까지 수행하지 않는다.

### 검증

```bash
test ! -e apps/desktop/quicklook
test ! -e apps/desktop/src-tauri/src/macos_recent_documents.rs
test ! -e scripts/build-quicklook-macos.mjs
test ! -e scripts/test-quicklook-macos.mjs
if rg -n 'quick[ -]?look|quicklook|target_os = "macos"|bundle\.macOS|aarch64-apple|x86_64-apple' package.json .gitignore apps/desktop scripts tests; then exit 1; fi
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
pnpm run test:upstream
git diff --check
```

검증 한계:

- Rust desktop compile/test와 Tauri bundle은 현재 macOS 환경에서 대체 검증으로 실행하지 않는다.
- Windows/Linux native compile은 후속 CI task에서 수행한다.

### 커밋

```text
Task #1 Stage 1: macOS 전용 제품 경로 제거
```

## Stage 2 — Alhangeul 제품 식별자와 런타임 전환

### 산출물

개명:

- `apps/studio-host/hop-overrides.ts` → `apps/studio-host/alhangeul-overrides.ts`
- `apps/studio-host/src/view/hop-page-renderer.ts` → `apps/studio-host/src/view/alhangeul-page-renderer.ts`
- `apps/studio-host/src/view/hop-page-renderer.test.ts` → `apps/studio-host/src/view/alhangeul-page-renderer.test.ts`

수정:

- `package.json`, `pnpm-lock.yaml`
- `apps/desktop/package.json`
- `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/Cargo.lock`
- `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/src-tauri/tauri.windows.conf.json`
- `apps/desktop/src-tauri/capabilities/default.json`
- `apps/desktop/src-tauri/src/*.rs`
- `apps/studio-host/package.json`, `apps/studio-host/index.html`
- `apps/studio-host/vite.config.ts`, `apps/studio-host/vitest.config.ts`, `apps/studio-host/src/vite-env.d.ts`
- `apps/studio-host/src/**/*.ts`, `apps/studio-host/src/**/*.css`
- `assets/logo/*`, `scripts/generate-app-icons.mjs`
- `tests/rhwp-baseline.test.mjs`, `tests/update-upstream.test.mjs`, `scripts/update-upstream.sh`

삭제:

- `apps/desktop/src-tauri/src/updates.rs`
- `apps/studio-host/src/ui/update-notice.ts`
- `apps/studio-host/src/ui/update-notice.test.ts`
- `apps/studio-host/src/styles/update-notice.css`
- `assets/screenshots/hop-editor.webp`

### 변경 내용

- root workspace는 `alhangeul-tauri`, desktop npm package는 `alhangeul-desktop`, studio package는 `@postmelee/alhangeul-studio-host`로 바꾼다.
- Rust package/bin은 `alhangeul-desktop`, lib crate는 `alhangeul_desktop`으로 바꾸고 lockfile과 코드 참조를 일치시킨다.
- Tauri `productName`과 창 제목은 `Alhangeul`, identifier는 `io.github.postmelee.alhangeul`, publisher는 `postmelee`, copyright는 `Alhangeul contributors`로 정리한다.
- UI 문구, 메뉴, document title, PDF producer, test fixture의 HOP 제품명을 Alhangeul로 바꾼다.
- TypeScript의 `HopPageRenderer`, `createHopOverrides`, `__HOP_VERSION__`과 관련 파일명을 Alhangeul 명명으로 바꾼다.
- 기존 `golbin/hop` updater endpoint를 다른 주소로 추정해 교체하지 않는다. Tauri updater plugin·dependency·state·command와 studio update notice UI를 제거한다.
- `postmelee/alhangeul-macos` commit `dcef80cae43195a3e353de084f7246614da924be`의 `assets/logo-256@2x.png`와 studio favicon을 source로 사용한다. 현재 icon generation script를 Windows/Linux PNG/ICO 출력에 맞추고 HOP screenshot은 대체 이미지 없이 제거한다.
- `scripts/update-upstream.sh`의 현재 rhwp submodule 동작은 유지하되 package 이름과 출력 문구만 Alhangeul로 바꾼다. release pin 방식 전환은 하지 않는다.
- 테스트 설명과 assertion을 새 명명에 맞추되 제품 동작 기대값은 변경하지 않는다.

### 검증

```bash
corepack enable
pnpm install --lockfile-only
pnpm install --frozen-lockfile
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
if rg -n '@golbin/hop-studio-host|hop-desktop|hop_desktop|net\.golbin\.hop|github\.com/golbin/hop/releases|__HOP_VERSION__|HopPageRenderer|createHopOverrides' package.json pnpm-lock.yaml apps scripts tests; then exit 1; fi
if rg -n 'tauri-plugin-updater|tauri_plugin_updater|get_update_state|start_update_install|restart_to_apply_update|hop-update-state' apps package.json pnpm-lock.yaml; then exit 1; fi
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
git diff --check
```

검증 한계:

- `pnpm run test:desktop`, `pnpm run clippy:desktop`, Tauri build는 macOS native 검증이 되므로 실행하지 않는다.
- 생성 icon의 Windows shell·Linux desktop 실제 표시는 후속 플랫폼 CI/수동 검증으로 남긴다.

### 커밋

```text
Task #1 Stage 2: Alhangeul 제품 식별자와 런타임 전환
```

## Stage 3 — 공식 문서·사이트·워크플로 독립화

### 산출물

신규:

- `docs/architecture/PROVENANCE.md`
- `.github/workflows/alhangeul-desktop.yml`
- `scripts/check-product-boundary.mjs`

수정:

- `AGENTS.md`
- `README.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/workflows/ci.yml`, `.github/workflows/pages.yml`
- `docs/README.md`, `docs/DEVELOPMENT.md`, `docs/KEYBOARD_SHORTCUTS.md`
- `docs/architecture/LOCAL_FONTS.md`, `docs/architecture/UPSTREAM.md`
- `docs/operations/DESKTOP_RELEASE.md`
- `site/index.html`, `site/styles.css`
- `package.json`

삭제:

- `.github/workflows/hop-desktop.yml` (개명)
- `docs/operations/quicklook-extension-1pager.md`
- `docs/operations/release-v0.2.0-1pager.md`
- `docs/operations/release-v0.3.0-1pager.md`
- `site/downloads.js`

### 변경 내용

- README를 Alhangeul Windows/Linux 제품 설명과 개발 중 상태 중심으로 다시 작성하고 존재하지 않는 download·release·AUR·Homebrew 링크를 제거한다.
- `docs/`의 제품명, package 명령, 지원 플랫폼, 현재 rhwp submodule 경계를 Alhangeul 기준으로 갱신한다. 후속 release pin task와 CI task의 경계를 명시한다.
- `docs/architecture/PROVENANCE.md`에 HOP 기준 commit `bbd6bf69db05f275d714e7c61cef58b662809c6a`, 독립 remote 정책, MIT 라이선스 보존, Alhangeul icon source commit·경로·SHA-256을 기록한다.
- obsolete HOP release·Quick Look 1-Pager는 별도 archive를 만들지 않고 삭제한다. 유효한 desktop release 문서는 실제 배포 절차가 준비되지 않았음을 명시하는 후속 task entrypoint로 축소한다.
- `site/`는 제품 소개와 GitHub 저장소 링크만 유지하고 download detection·release asset 링크를 제거한다.
- bug/feature Issue Form과 Pages workflow 이름·링크를 새 저장소 기준으로 바꾼다.
- desktop workflow는 Windows x64, Linux x64, Linux arm64 수동 build artifact 검증만 남기고 macOS, release 생성, signing, updater, release asset 집계·게시 로직을 제거한다. repository-level Actions는 활성화하지 않는다.
- `scripts/check-product-boundary.mjs`와 `check:product-boundary` package script를 추가해 HOP·macOS 금지 경로와 허용 provenance 경로를 지속적으로 검사한다. `third_party/rhwp`, `mydocs/`, Git metadata는 제품 경계 검사에서 분리한다.
- AGENTS.md에서 부트스트랩 전환 문구를 현재 구조로 갱신하고 실행 가능한 platform-neutral 검증 명령만 남긴다.

### 검증

```bash
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
ruby -e 'require "yaml"; Dir[".github/workflows/*.yml", ".github/ISSUE_TEMPLATE/*.yml"].each { |path| YAML.load_file(path); puts path }'
test ! -e .github/workflows/hop-desktop.yml
test ! -e site/downloads.js
if rg -n 'macos-|aarch64-apple|x86_64-apple|\.dmg|notari|APPLE_|Quick Look|quicklook' .github README.md docs site package.json; then exit 1; fi
if rg -n 'github\.com/golbin/hop/releases|golbin/hop/releases/latest' README.md docs site .github; then exit 1; fi
git diff --check
```

검증 한계:

- workflow는 저장소 수준 Actions 비활성 상태에서 구문과 matrix만 정적으로 검증한다.
- Pages 배포와 실제 Windows/Linux artifact 생성은 실행하지 않는다.

### 커밋

```text
Task #1 Stage 3: 공식 문서와 Windows Linux 워크플로 독립화
```

## Stage 4 — 통합 정합성 검증

### 산출물

- Stage 1~3 산출물 중 통합 검증 실패를 해결하는 최소 보정
- `mydocs/working/task_m010_1_stage4.md`

### 변경 내용

- package·Rust·Tauri·UI·문서·workflow 식별자를 교차 검색해 부분 rename과 stale link를 수정한다.
- product boundary checker의 허용 목록이 실제 provenance 필요 범위보다 넓지 않은지 검토한다.
- Windows/Linux 파일 연결, Linux runtime, Windows installer 설정이 Stage 1~3에서 보존됐는지 정적으로 확인한다.
- 수행계획서 수용 기준과 Issue #1의 포함·제외 범위를 대조한다.
- 새 기능, rhwp pin, updater 재도입, Actions 활성화가 필요해 보이면 이번 Stage에서 확장하지 않고 후속 이슈 후보로 기록한다.

### 검증

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
ruby -e 'require "yaml"; Dir[".github/workflows/*.yml", ".github/ISSUE_TEMPLATE/*.yml"].each { |path| YAML.load_file(path) }'
test -f apps/desktop/src-tauri/tauri.windows.conf.json
test -f apps/desktop/src-tauri/src/linux_runtime.rs
git diff --check
git status --short
```

수동 검토:

- README와 site가 아직 다운로드 가능한 release가 있다고 주장하지 않는다.
- HOP 표기는 provenance와 작업 기록에만 남는다.
- macOS 실행·빌드·배포 경로가 남지 않는다.
- GitHub Actions가 비활성 상태임을 최종 보고서의 검증 한계에 기록한다.

### 커밋

```text
Task #1 Stage 4: 독립 제품 경계 통합 검증
```

## 검증

- 각 Stage 검증 명령은 해당 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않고 같은 Stage에서 원인을 수정한다.
- platform-neutral 검증도 현재 도구 환경 문제로 실행할 수 없으면 실패와 구분해 기록하고 작업지시자에게 범위 변경 승인을 요청한다.
- 계획에 없는 제품 코드, 공식 문서 위치, dependency 방식 변경이 필요하면 구현계획서를 먼저 갱신하고 승인받는다.
- Windows/Linux native build가 필요하다는 이유로 macOS Tauri build를 대체 실행하지 않는다.

## 커밋

- 각 Stage 소스 변경과 `mydocs/working/task_m010_1_stage{N}.md`를 같은 커밋으로 묶는다.
- Stage 커밋 전 `git diff --check`와 해당 Stage 검증을 완료한다.
- 커밋 메시지는 본 문서의 Stage별 메시지를 그대로 사용한다.
- `local/task1`은 원격에 push하지 않는다. 모든 Stage와 최종 보고가 승인된 뒤 `publish/task1`로 게시한다.

## 단계 의존성

- Stage 1 완료·보고·승인 후 Stage 2에 진입한다.
- Stage 2 완료·보고·승인 후 Stage 3에 진입한다.
- Stage 3 완료·보고·승인 후 Stage 4에 진입한다.
- Stage 4 완료·보고·승인 후 `task-final-report` 절차로 전환한다.

## 위험과 대응

- **삭제와 rename 범위가 큼**: 플랫폼 제거, 런타임 rename, 문서·workflow를 Stage로 분리하고 단계마다 검색·테스트·보고를 완료한다.
- **업데이터 제거가 UI와 native state에 걸쳐 있음**: Rust plugin/state/command와 TypeScript event/UI/test를 한 Stage에서 원자적으로 제거한다.
- **HOP 문자열 일괄 치환으로 provenance 훼손 가능**: 제품 경로만 대상에 포함하고 provenance 문서는 수동 작성·검토한다.
- **macOS 분기 제거가 Windows/Linux 공용 흐름에 영향**: 전용 module과 cfg 경계를 먼저 식별하고 Linux runtime·Windows installer 파일 존재를 통합 검증한다.
- **Windows/Linux native 실행을 현 환경에서 검증하지 못함**: workflow 정의와 platform-neutral test만 수행하고 Actions 재활성화·native CI를 후속 task로 명시한다.
- **아이콘 변환 품질 또는 라이선스 불명확**: 동일 소유 저장소의 source commit·hash를 기록하고 신규 디자인 없이 기계적 크기 변환만 수행한다.

## 승인 요청 사항

- 위 4개 Stage 분할과 Stage별 파일 삭제·개명 경계
- Stage 2에서 updater native·studio surface 전체를 제거하고 새 endpoint는 만들지 않는 방식
- Alhangeul macOS 저장소 commit `dcef80cae43195a3e353de084f7246614da924be`의 icon을 기계적으로 변환·재사용하는 방식
- Stage 3에서 obsolete HOP release·Quick Look 문서와 download site script를 archive 없이 삭제하는 방식
- persistent `check:product-boundary` 검증 script와 제한된 HOP provenance allowlist 도입
- GitHub Actions 비활성 유지, Windows/Linux workflow 정적 검증, macOS native 검증 생략
- 각 Stage 보고서 승인 후에만 다음 Stage로 이동하는 커밋·승인 경계
