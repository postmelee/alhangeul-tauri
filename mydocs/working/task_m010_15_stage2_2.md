# Task #15 Stage 2.2 완료 보고서 — Tauri hidden page surface 직접 인쇄

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 2.2

## 단계 목적

Stage 2.1 exact Windows 후보에서 제한적 popup host가 정상 동작하고 별도 preview 창에서 실제 인쇄까지 가능함을 확인했다. 후속 acceptance 요청에 따라 Tauri에서는 별도 Alhangeul preview를 생략하고 upstream 전용 page SVG surface에서 Windows/Linux system print dialog를 직접 열도록 보정했다. 일반 browser의 upstream visible preview는 그대로 유지한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/command/direct-print.ts` | upstream hidden surface·print-page primitive를 조합해 Tauri system print dialog를 직접 여는 leaf helper 추가 |
| `apps/studio-host/src/command/direct-print.test.ts` | print profile·page 순서·CSP style 재사용·surface 정리·pagination 실패 경계 test 추가 |
| `apps/studio-host/src/command/commands/file.ts` | Tauri `file:print`만 direct hidden surface helper로 분기 |
| `apps/studio-host/src/command/commands/file.test.ts` | Tauri direct print와 일반 browser upstream visible preview 분리 고정 |
| `apps/studio-host/src/style.css` | production CSP가 iframe inline style을 무시해도 `#rhwp-print-surface`를 숨기는 외부 규칙 추가 |
| `apps/desktop/src-tauri/src/print_preview.rs` | 더 이상 필요 없는 popup 전용 native host 삭제 |
| `apps/desktop/src-tauri/src/windows.rs` | initial/dynamic editor의 `on_new_window` popup handler 제거 |
| `apps/desktop/src-tauri/src/lib.rs` | config가 initial main을 자동 생성하는 기존 lifecycle 복원 |
| `apps/desktop/src-tauri/tauri.conf.json` | 동일 bundle의 hidden iframe만 허용하도록 `frame-ancestors 'self'` 적용, `create: false` 제거 |
| `apps/desktop/src-tauri/tauri.windows.conf.json` | Windows initial main의 config 자동 생성 복원 |
| `apps/studio-host/src/core/upstream-boundary.test.ts` | browser preview 보존·Tauri hidden surface·CSP·popup host 부재를 source guard로 고정 |
| `docs/architecture/UPSTREAM.md` | browser/Tauri 인쇄 소유 경계와 CSP nonce 재사용 계약 정렬 |
| `docs/operations/DESKTOP_RELEASE.md` | 별도 app preview 없는 system dialog 직접 진입 gate로 갱신 |
| `mydocs/plans/task_m010_15_impl.md` | Windows acceptance 증거, Stage 2.2 범위·CSP 판단·검증 계획 반영 |
| `mydocs/orders/20260809.md` | M010 Task #15 당일 진행 상태 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

upstream submodule과 browser `file:print` execute, visible `print.html` preview는 수정하지 않았다. Tauri adapter는 모든 페이지를 upstream `renderPageSvgWithProfile(page, 'print')`로 렌더하고 upstream `createPrintPage`, `buildPrintStyleText`, `appendSvgPage`, `waitForPrintSurfaceReady`를 사용한다. editor Studio WebView 전체와 Rust `WebviewWindow::print`는 사용하지 않는다.

Tauri는 bundle의 정적 style에 nonce를 추가하므로 `print.html`의 기존 style element를 제거하지 않고 내용만 upstream print CSS로 교체한다. `frame-ancestors`는 외부 origin을 허용하지 않는 `'self'`로만 완화했고, 제품 외부 CSS가 iframe 숨김을 보강한다. HWP/HWPX 저장, searchable direct PDF, document drag-in과 editor window geometry는 변경하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run check:release-metadata
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
rustfmt --edition 2021 apps/desktop/src-tauri/src/lib.rs apps/desktop/src-tauri/src/windows.rs
git diff --check --ignore-submodules=all
```

결과:

- OK — Studio 19 files, 79 tests 통과
- OK — product boundary 180 files, product version `0.1.0`, rhwp v0.8.2 exact pin, release metadata 통과
- OK — automation 71 tests, upstream 35 tests 통과
- OK — production Studio build 성공, `dist/print.html` 포함 확인
- OK — 변경 Rust 파일 rustfmt와 diff whitespace 검사 통과
- 보류 — Rust unit test·Clippy·Tauri native build는 지원 대상 Windows/Linux exact-SHA workflow에서 실행한다. 현재 macOS 호스트 결과로 native 성공을 주장하지 않는다.

## 잔여 위험

- Windows WebView2에서 hidden iframe `window.print()`가 별도 Alhangeul preview 없이 system dialog를 직접 여는지는 새 exact-SHA GUI 수동 검증이 필요하다.
- Linux WebKitGTK도 같은 source와 CSP를 사용하지만 system print dialog와 한글·쪽 수·방향 GUI 결과는 실제 Linux 환경 검증 전까지 미확정이다.
- system print가 반환된 뒤 surface를 정리하는 순서는 upstream hidden PDF print 경로와 동일하다. platform별 dialog lifecycle 차이는 반복 인쇄·취소 gate에서 확인한다.

## 다음 단계 영향

- 이 Stage commit을 `publish/task15`에 push한 뒤 CI와 Windows/Linux native workflow를 새 exact SHA로 다시 실행한다.
- Stage 4.1 popup 후보 `b7a09123479b92ba7140f432185bf8b1edd7e8bb`은 기능 확인 증거로만 보존하고 최종 direct-print 후보로 재사용하지 않는다.
- 새 Windows x64 MSI·NSIS에서 별도 app preview 부재, system dialog 직접 진입, 단일·다중 페이지, 취소·반복 인쇄와 direct PDF 회귀를 확인한다.

## 승인 요청

- 작업지시자의 2026-08-09 “진행해줘” 승인에 따라 Stage 2.2 commit과 새 exact-SHA Windows/Linux 후보 준비까지 이어서 진행한다.
