# Task #1 Stage 1 보고서 — Windows/Linux 플랫폼 경계 확정

GitHub Issue: [#1](https://github.com/postmelee/alhangeul-tauri/issues/1)
구현계획서: [`task_m010_1_impl.md`](../plans/task_m010_1_impl.md)
Stage: 1

## 단계 목적

HOP에서 일회성으로 가져온 macOS·Quick Look 전용 제품 경로를 제거하고, Alhangeul desktop의 실행 경계를 Windows와 Linux로 한정한다. 제품명 변경, updater 제거, 공식 문서와 workflow 독립화는 뒤 Stage로 넘기고 이번 단계에서는 플랫폼 전용 build·bundle·native 호출과 그 연결만 정리한다.

## 산출물

Stage 소스 기준 32개 파일을 변경했으며 `18 insertions(+), 3384 deletions(-)`이다. `icon.icns`는 바이너리 삭제라 라인 집계에서 제외된다.

| 파일 | 변경 요약 |
|---|---|
| `package.json`, `.gitignore` | Quick Look build/test 연결과 Rust target 예외를 제거하고 공용 studio·desktop 명령을 유지했다. |
| `apps/desktop/quicklook/**` | Swift Preview·Thumbnail extension, entitlements, Info.plist, Quick Look FFI Rust crate 전체 12개 파일을 삭제했다. |
| `scripts/build-quicklook-macos.mjs`, `scripts/test-quicklook-macos.mjs` | macOS Quick Look build/test 진입점을 삭제했다. |
| `assets/logo/icon.icns` | Tauri macOS 전용 icon을 삭제했다. |
| `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/Cargo.lock` | `objc2-app-kit`, `objc2-foundation` 직접 target dependency와 root package lock 연결을 제거했다. Tauri의 전이 의존성 lock 항목은 유지했다. |
| `apps/desktop/src-tauri/tauri.conf.json` | macOS bundle, `.appex` staging, Apple UTI 속성, `icon.icns` 참조를 제거하고 Windows bundle 설정을 유지했다. |
| `apps/desktop/src-tauri/src/lib.rs`, `commands.rs`, `font_catalog.rs`, `pending_open.rs`, `state.rs` | macOS 조건 분기, Finder recent-documents command, Apple font directory/default, macOS quit state를 제거하고 Windows/Linux 파일 열기 경로를 공용화했다. |
| `apps/desktop/src-tauri/src/macos_recent_documents.rs`, `menu.rs`, `app_quit.rs` | Finder recent documents, native menu, macOS 앱 전체 종료 choreography를 삭제했다. 구현 중 `lib.rs`의 macOS 분기를 제거하면 orphan이 되는 전용 모듈임을 확인해 Stage 목적에 맞춰 함께 정리했다. |
| `apps/studio-host/src/core/tauri-bridge.ts`, `desktop-events.ts`와 대응 테스트 | Finder recent-documents와 macOS 앱 종료 shim·event listener를 제거했다. 앱 내부 최근 문서 저장과 일반 창 닫기 보호는 유지했다. |

## 본문 변경 정도 / 본문 무손실 여부

문서 본문 작업은 해당 없다. Windows/Linux의 문서 열기·저장, 앱 내부 최근 문서, drag-and-drop, 단일 instance 추가 창 열기, 일반 창 닫기 확인 API는 보존했다. 제거된 command와 event는 Finder recent documents 및 macOS native app quit에만 연결된 전용 표면이다.

## 검증 결과

구현계획서에 명시된 실행 명령:

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

결과:

- OK — 삭제 대상 4개 경로가 모두 존재하지 않는다.
- OK — 지정 범위의 Quick Look·macOS target·Apple Rust target 검색 결과가 없었다.
- OK — `cargo fmt --check`가 출력 없이 종료 코드 0으로 통과했다.
- OK — `pnpm run test:upstream`: 12 tests, 12 pass, 0 fail.
- OK — `git diff --check`가 출력 없이 종료 코드 0으로 통과했다.

변경 표면에 대해 추가 실행한 검증:

```bash
cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps --format-version 1
pnpm run test:studio
pnpm run build:studio
```

- OK — Cargo manifest와 lockfile이 `--locked --offline` 조건에서 일치했다.
- OK — studio: 23 test files, 122 tests, 122 pass, 0 fail.
- OK — TypeScript compile과 Vite production build가 성공했다. 기존 dynamic import·chunk size 경고만 발생했다.
- 계획대로 현재 macOS 환경에서 Rust desktop compile/test, Tauri bundle, macOS native 검증은 실행하지 않았다.

## 잔여 위험

- Windows/Linux native Rust compile과 실제 Tauri bundle은 후속 CI task에서 검증해야 한다.
- 현재 HOP 제품명, package identifier, updater, Apple 계열 fallback font 명칭, 공식 문서·workflow의 macOS/HOP 흔적은 Stage 2·3 범위라 이번 단계에서 변경하지 않았다.
- macOS에서 이 저장소를 build하는 경로는 의도적으로 지원하지 않으며 검증 대상도 아니다.

## 다음 단계 영향

- Stage 2에서는 Windows/Linux 경계 위에서 npm·Rust·Tauri·UI 제품 식별자를 Alhangeul로 바꾸고 HOP updater를 제거한다.
- `scripts/generate-app-icons.mjs`의 `icon.icns` 생성과 Apple font 후보처럼 Stage 1 검색식 밖에 남긴 항목은 Stage 2 제품 자산·런타임 전환에서 정리해야 한다.
- Stage 1에서 앱 내부 최근 문서와 일반 창 닫기 보호를 유지했으므로 Stage 2 rename 과정에서 해당 공용 동작을 보존해야 한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 — Alhangeul 제품 식별자와 런타임 전환으로 진행한다.
