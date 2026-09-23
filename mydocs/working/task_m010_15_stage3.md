# Task #15 Stage 3 완료 보고서 — 인쇄 소유 경계와 중립 gate 정렬

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 3

## 단계 목적

실제 인쇄와 PDF 직접 저장의 소유 경계를 공식 문서에 정렬하고, Stage 2 최소 구현이 제품·version·upstream pin·automation·Studio 전체 플랫폼 중립 gate를 통과하는지 확인했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/architecture/UPSTREAM.md` | 실제 인쇄 pagination/page SVG/preview DOM은 upstream이, direct PDF와 runtime에서 꼭 필요한 window host만 Alhangeul이 소유하도록 계약을 명시했다. editor WebView 전체 인쇄와 direct PDF 대체 fallback을 금지했다. |
| `docs/operations/DESKTOP_RELEASE.md` | direct PDF와 실제 인쇄를 별도 gate로 분리하고 Windows/Linux exact 후보의 전용 surface·쪽 수·방향·본문·system dialog·반복 인쇄 검증 기준을 추가했다. |
| `mydocs/working/task_m010_15_stage3.md` | 전체 검증 결과와 native 후보 입력을 기록한다. |

## 본문 변경 정도 / 본문 무손실 여부

기존 upstream pin, Task #13/Task #11의 역사적 증거, 공개 release 제한과 artifact 절차는 보존했다. 공식 문서는 이번 구현으로 달라진 인쇄 소유 경계와 반복 가능한 release gate만 추가·보정했으며 과거 검증 결과를 재작성하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run check:release-metadata
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
! rg -n "print_webview|printCurrentWebview" apps
git diff --check
```

결과:

- OK — Product boundary 177 files, product version `0.1.0`, release metadata 통과
- OK — rhwp `v0.8.2` / `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, 관리 artifact 6개 pin 검증 통과
- OK — automation 71 tests 통과
- OK — upstream 35 tests 통과
- OK — Studio 18 files, 74 tests 통과
- OK — TypeScript와 Vite production Studio build 210 modules 통과, `dist/print.html` 포함
- OK — `print_webview`, `printCurrentWebview` 잔존 참조 없음
- OK — `git diff --check` 경고 없음
- INFO — 기존 CanvasKit browser externalization, dynamic import와 large chunk 경고만 유지됐다.

## 잔여 위험

- Windows/Linux native Rust test·Clippy·Tauri build는 현재 macOS 호스트에서 실행하지 않았으며 Stage 4 workflow 결과로만 판정한다.
- `window.open()` popup, same-origin opener, CSP와 실제 system print dialog는 자동 unit/build gate가 보증하지 않는다.
- Task #15 branch는 Task #13 exact SHA를 포함하므로 #13 merge 전에는 #15를 `devel` 대상 PR로 게시할 수 없다.

## 다음 단계 영향

- Stage 4는 현재 clean Stage 3 commit을 exact SHA로 `publish/task15`에 게시하고 CI/native workflow를 실행한다.
- Windows x64 artifact에서 `인쇄`를 누르면 editor print dialog가 즉시 열리는 대신 upstream 전용 preview 창이 먼저 열려야 한다.
- popup이 차단되거나 preview가 빈 화면이면 해당 artifact를 최종 후보로 사용하지 않고 Stage 2.x 보정으로 돌아간다.

## 승인 요청

- 작업지시자의 연속 진행 승인에 따라 Stage 3 산출물과 검증을 확정하고 Stage 4 exact 후보 생성으로 진행한다.
