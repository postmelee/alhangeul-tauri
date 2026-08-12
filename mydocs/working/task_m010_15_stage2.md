# Task #15 Stage 2 완료 보고서 — upstream 전용 페이지 인쇄 surface 계승

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 2

## 단계 목적

Tauri runtime의 `file:print`가 editor 전체 WebView를 Rust command로 인쇄하던 override를 제거하고, browser와 동일하게 exact upstream `runPrintPreview()`를 실행하도록 보정했다. PDF 직접 저장과 다른 native file adapter는 유지했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/command/commands/file.ts` | `desktopExecutors`의 `file:print` 항목을 제거해 upstream command 객체와 execute를 그대로 반환한다. |
| `apps/studio-host/src/command/commands/file.test.ts` | Tauri runtime에서도 upstream print execute가 한 번 호출되고 open/save/direct PDF/new-window는 기존 native host로 라우팅되는지 검증한다. |
| `apps/studio-host/src/core/desktop-host.ts` | 사용되지 않는 `printCurrentWebview()` IPC wrapper를 제거했다. |
| `apps/desktop/src-tauri/src/commands.rs` | editor WebView를 인쇄하던 `print_webview` Tauri command를 제거했다. |
| `apps/desktop/src-tauri/src/lib.rs` | 삭제된 command import와 invoke handler 등록을 제거했다. |
| `mydocs/working/task_m010_15_stage2.md` | 변경 범위, 검증, exact runtime 잔여 위험을 기록한다. |

## 본문 변경 정도 / 본문 무손실 여부

upstream submodule과 페이지 SVG 인쇄 구현은 변경하지 않았다. local code는 잘못된 editor-print leaf adapter만 삭제했다. `file:print-to-pdf`, HWP/HWPX open/save, document session, recent, drag-in, bundled font와 PDF pipeline API는 변경하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/commands/file.test.ts src/core/desktop-host.test.ts src/core/upstream-boundary.test.ts
pnpm run test:studio
pnpm run build:studio
rg -n "print_webview|printCurrentWebview" apps
git diff --check
```

결과:

- OK — focused 실행에서 Studio 18 files, 74 tests 통과
- OK — 전체 `test:studio` 18 files, 74 tests 통과
- OK — TypeScript와 Vite production Studio build 통과, 210 modules 변환
- OK — `apps/studio-host/dist/print.html` 존재와 upstream 인쇄 코드 bundle 포함 확인
- OK — `print_webview`와 `printCurrentWebview` 검색 결과 없음
- OK — `git diff --check` 경고 없음
- INFO — Vite의 기존 CanvasKit browser externalization, dynamic import, 500 kB chunk 경고는 유지되며 이 변경으로 새 오류가 되지 않았다.

## 잔여 위험

- production Windows WebView2에서 `window.open('print.html', '_blank')`가 same-origin preview `Window`를 반환하는지는 exact bundle 수동 검증 전까지 미확정이다.
- popup이 차단되면 upstream은 명시적 “인쇄 미리보기 팝업이 차단되었습니다” 오류를 표시할 수 있다. 이 경우에만 구현계획서 Stage 2.x Tauri `on_new_window` fallback을 적용한다.
- production CSP가 preview inline/dynamic style을 제한할 가능성도 exact 화면에서 확인해야 한다.

## 다음 단계 영향

- Stage 3에서 공식 upstream 소유 계약과 release gate를 이번 구현에 맞추고 전체 플랫폼 중립 gate를 실행한다.
- Stage 4 exact 후보에서는 인쇄 메뉴 클릭 직후 별도 미리보기 창이 열리고 문서 쪽 수·본문이 표시되는지를 가장 먼저 확인한다.
- preview가 열리면 그 창의 `인쇄` 버튼으로 Windows system dialog와 Microsoft Print to PDF를 검증한다.

## 승인 요청

- 작업지시자의 연속 진행 승인에 따라 Stage 2 산출물과 검증을 확정하고 Stage 3로 진행한다.
