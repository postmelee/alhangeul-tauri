# Task #15 Stage 1 완료 보고서 — upstream 인쇄 surface 계약

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 1

## 단계 목적

rhwp v0.8.2가 소유하는 실제 인쇄 call graph를 source guard로 고정하고, Tauri adapter가 상속해야 할 범위를 확정했다. Task #13 exact SHA의 editor WebView 직접 인쇄는 upstream 페이지 인쇄 surface를 우회하는 local 결함이며, PDF 직접 저장 경로와 분리해 보정해야 한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/core/upstream-boundary.test.ts` | pinned upstream `file:print`가 `runPrintPreview`, 모든 페이지 `profile=print` SVG, same-origin `print.html` popup, 전용 preview document와 최종 popup `window.print()`를 함께 유지하는지 검증한다. |
| `mydocs/plans/task_m010_15_impl.md` | 4개 Stage, upstream 최소 계승안, exact runtime 실패 시에만 허용할 Tauri `on_new_window` fallback, Task #13 의존 branch 계약을 고정했다. |
| `mydocs/working/task_m010_15_stage1.md` | 조사 결과, 검증, Stage 2 입력과 잔여 runtime 위험을 기록한다. |

## 본문 변경 정도 / 본문 무손실 여부

제품 동작과 upstream submodule은 변경하지 않았다. read-only rhwp v0.8.2 source의 인쇄 계약을 local boundary test로 읽어 검증할 뿐이며, Task #13의 PDF/HWP/HWPX 구현은 무손실이다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/upstream-boundary.test.ts
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — Studio test 18 files, 74 tests 통과
- OK — Product boundary check 177 files 통과
- OK — `git diff --check` 경고 없음
- 환경 준비 — 새 격리 worktree의 최초 실행은 `node_modules` 부재로 test 시작 전 중단됐고, `pnpm install --frozen-lockfile`이 lockfile 변경이나 download 없이 56개 package를 기존 store에서 연결한 뒤 동일 명령을 재실행했다.

## 잔여 위험

- Windows WebView2와 Linux WebKitGTK에서 upstream `window.open()`이 same-origin opener `Window`를 반환하는지는 exact bundle에서만 확정할 수 있다.
- popup이 차단되거나 realm 접근이 끊기면 Tauri 2.10.3의 `WebviewWindowBuilder::on_new_window` fallback이 필요할 수 있다. 실제 실패 증거 전에는 initial main 생성 구조를 바꾸지 않는다.
- production CSP가 `print.html` 또는 동적 preview style을 제한할 가능성은 Stage 4 computed/visual 결과에서 확인한다.

## 다음 단계 영향

- Stage 2는 local `file:print` desktop executor와 editor `print_webview` native command를 제거하고 Tauri runtime에서도 upstream command execute를 호출하도록 focused test를 바꾼다.
- `file:print-to-pdf`의 Rust direct PDF adapter는 그대로 유지한다.
- Rust desktop test·Clippy·Tauri build는 지원 Windows/Linux Stage 4 workflow에서만 판정한다.

## 승인 요청

- 작업지시자의 2026-08-08 연속 진행 승인에 따라 Stage 1 산출물과 검증을 확정하고 Stage 2로 진행한다.
