# Task #15 Stage 2.1 완료 보고서 — Tauri 제한적 인쇄 popup host 보정

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 2.1

## 단계 목적

Stage 4 exact Windows 후보 `299c3face6df0a10a71349a34560826053a61107`에서 upstream `window.open(print.html)`이 null을 반환하고 “인쇄 미리보기 팝업이 차단되었습니다” 안내가 표시됐다. 구현계획서의 조건부 Stage 2.x를 활성화해 upstream page SVG 조립과 preview DOM은 그대로 유지하면서, Tauri가 same-environment/related preview window만 안전하게 제공하도록 보정했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/src/print_preview.rs` | production Tauri origin과 고정 dev origin의 정확한 `/print.html`만 허용하고 `window_features`를 계승하는 popup handler 및 URL 경계 test 추가 |
| `apps/desktop/src-tauri/src/window_geometry.rs` | 기존 동적 editor work-area 계산과 unit test를 별도 책임으로 분리 |
| `apps/desktop/src-tauri/src/windows.rs` | initial `main`과 동적 `main*` builder에 동일한 print preview handler 연결 |
| `apps/desktop/src-tauri/src/lib.rs` | config의 initial `main`을 setup에서 수동 생성하도록 전환하고 신규 native module 등록 |
| `apps/desktop/src-tauri/tauri.conf.json` | initial window metadata를 보존하면서 `create: false` 지정 |
| `apps/desktop/src-tauri/tauri.windows.conf.json` | Windows merged config에도 `create: false`와 기존 zoom hotkey metadata 유지 |
| `apps/studio-host/src/core/upstream-boundary.test.ts` | config 수동 생성과 두 editor builder의 제한적 popup host 연결을 platform-neutral source guard로 고정 |
| `mydocs/plans/task_m010_15_impl.md` | 실제 Windows 실패 증거와 승인된 Stage 2.1 구현·파일 책임을 계획에 반영 |
| `mydocs/orders/20260809.md` | M010 Task #15의 당일 진행 상태 기록 |

## 본문 변경 정도 / 본문 무손실 여부

upstream `file:print`, `createPrintPreviewSurface`, page SVG 렌더링, preview HTML과 print button은 수정하지 않았다. Alhangeul은 popup host만 제공하며 `file:print-to-pdf`, HWP/HWPX 저장, document drag-in과 editor window geometry 동작도 변경하지 않는다.

최초 `main`의 title, URL, 1280×900 크기, 960×720 최소 크기와 Windows zoom hotkey는 기존 config에 남겨 두고 `WebviewWindowBuilder::from_config`로 그대로 적용한다. 새 창 요청은 `/print.html` 이외의 path, 외부 origin, query·fragment·credential을 모두 거부한다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/upstream-boundary.test.ts
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run check:release-metadata
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
rustfmt --edition 2021 apps/desktop/src-tauri/src/lib.rs apps/desktop/src-tauri/src/windows.rs apps/desktop/src-tauri/src/window_geometry.rs apps/desktop/src-tauri/src/print_preview.rs
git diff --check --ignore-submodules=all
```

결과:

- OK — focused source guard를 포함한 Studio 18 files, 75 tests 통과
- OK — product boundary 179 files, product version `0.1.0`, rhwp v0.8.2 exact pin, release metadata 통과
- OK — automation 71 tests, upstream 35 tests 통과
- OK — production Studio build 성공, `dist/print.html` 포함 확인
- OK — 변경 Rust 파일 rustfmt와 diff whitespace 검사 통과
- 보류 — Rust unit test·Clippy·Tauri native build는 지원 대상 Windows/Linux exact-SHA workflow에서 실행한다. 현재 macOS 호스트 결과로 native 성공을 주장하지 않는다.

## 잔여 위험

- `WebviewWindowBuilder::on_new_window`와 `window_features(features)`의 Rust compile 및 Windows WebView2/Linux WebKitGTK native 동작은 새 exact-SHA workflow 결과가 필요하다.
- 자동 native build가 성공해도 `window.open()` 반환값, opener DOM 접근, preview 닫기와 반복 인쇄는 실제 Windows GUI 수동 검증이 필요하다.
- browser Chrome에서 관찰된 system print preview 반복 문제는 Tauri popup 차단과 별개이며 이 Stage 범위에 포함하지 않는다.

## 다음 단계 영향

- 이 Stage commit을 `publish/task15`에 push하고 CI와 Windows/Linux native workflow를 새 exact SHA로 실행한다.
- 이전 candidate `299c3face6df0a10a71349a34560826053a61107` artifact는 popup 차단 실패 후보이므로 재사용하지 않는다.
- 새 Windows x64 MSI·NSIS에서 preview 열림, 문서 page surface, system print dialog, preview 닫기, 반복 인쇄와 direct PDF 회귀를 다시 확인한다.

## 승인 요청

- 작업지시자의 2026-08-09 “Tauri의 팝업 차단 보정 작업 진행” 승인에 따라 Stage 2.1 commit과 새 exact-SHA 후보 준비까지 이어서 진행한다.
