# Task #15 Stage 2.5 완료 보고서 — Windows native modal lifecycle 보정

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 2.5

## 단계 목적

Stage 2.4 exact Windows 후보에서 system print dialog가 열린 동안에는
`시스템 인쇄 처리 중...`이 유지됐지만, Microsoft Print to PDF의 파일 이름 지정
저장창으로 넘어가자 상태가 먼저 복원됐다. WebView DOM focus가 아니라 Tauri native
main window focus로 modal chain 종료를 관찰해 저장 또는 취소 후 앱으로 돌아올 때까지
제목, hidden print surface와 처리 중 상태를 유지하도록 보정했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/command/print-ui-lifecycle.ts` | Windows에서는 Tauri native focus listener와 현재 focus를 결합하고, Windows 외 플랫폼 또는 listener 등록 실패 시 DOM focus로 fallback하는 bounded waiter를 추가했다. |
| `apps/studio-host/src/command/direct-print.ts` | `window.print()` 호출 전에 lifecycle waiter를 준비하고 native main window focus 복귀 뒤에 title·surface를 정리한다. |
| `apps/studio-host/src/command/direct-print.test.ts` | DOM focus가 true여도 native window가 unfocused인 동안 title·surface·처리 중 상태가 유지되는 계약과 native listener 실패 시 DOM fallback을 고정한다. |
| `mydocs/plans/task_m010_15_impl.md` | Stage 2.4 Windows 실측 결과, Stage 2.5 native focus 경계와 basename 제약을 반영했다. |
| `mydocs/orders/20260811.md` | Stage 2.5 source gate 완료와 exact 후보 생성 대기 상태를 기록했다. |
| `mydocs/working/task_m010_15_stage2_5.md` | 구현, 검증, 잔여 위험과 Windows exact 수동 gate를 기록했다. |

변경 후 `direct-print.ts` 188 LOC, `print-ui-lifecycle.ts` 132 LOC,
`direct-print.test.ts` 287 LOC로 파일 300 LOC 권장 상한 안에 있다.

## 본문 변경 정도 / 본문 무손실 여부

upstream page SVG, print stylesheet, browser visible preview, Linux pagination CSS와
HWP/HWPX/direct PDF 데이터는 수정하지 않았다. Windows system print dialog와 printer
driver도 앱이 제어하지 않는다. 이번 변경은 Tauri adapter의 cleanup 시점을 native main
window focus 복귀까지 늦추는 lifecycle 보정에 한정한다.

저장 성공과 취소는 구분하지 않으며 `인쇄 완료`를 표시하지 않는다. Microsoft Print to
PDF 기본 파일명도 WebView2 system print UI가 출력 경로·파일명 설정을 노출하지 않는
경계로 확정하고, 보장되는 basename UX는 기존 `파일 > PDF로 저장`에 유지한다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/direct-print.test.ts src/command/commands/file.test.ts src/core/upstream-boundary.test.ts
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — focused 실행과 전체 Studio 모두 19 files, 84 tests 통과
- OK — native focus listener가 `window.print()`보다 먼저 등록되는 계약 통과
- OK — DOM focus가 true여도 native main window가 unfocused인 동안 basename title,
  hidden surface와 `시스템 인쇄 처리 중...`을 유지하는 계약 통과
- OK — native focus 복귀 후 surface cleanup, 원래 title과 기존 문서 상태 복원 계약 통과
- OK — native listener 등록 실패 시 DOM focus fallback 계약 통과
- OK — production Studio TypeScript compile과 212 modules 변환 성공
- OK — product boundary 181 files 통과
- OK — `git diff --check` 경고 없음
- INFO — 기존 CanvasKit browser externalization, ineffective dynamic import와 500 kB
  chunk 경고는 유지되며 새 오류가 아니다.

## 잔여 위험

- Tauri native main window가 Microsoft Print to PDF 저장창 동안 실제로 unfocused 상태를
  유지하는지는 새 exact Windows artifact GUI 검증 전까지 미확정이다.
- native focus 복귀는 modal chain 종료만 뜻하며 저장 성공, 취소 또는 physical printer
  spool 완료를 구분하지 않는다. 따라서 완료 문구를 표시하지 않는다.
- focus 복귀 신호가 오지 않으면 5분 safety timeout 뒤 title·surface를 정리하고 진단
  로그를 남긴다.
- Microsoft Print to PDF 기본 파일명 자동 입력은 system print UI 제약으로 acceptance에서
  제외한다. 정확한 이름과 쓰기 완료가 필요한 사용자는 `파일 > PDF로 저장`을 사용한다.
- Task #13 merge 전에는 Task #15 PR·merge·close를 진행하지 않는다.

## 다음 단계 영향

- Stage 2.5 보고 commit을 새 source exact SHA로 고정하고 CI와 Windows/Linux native
  bundle을 다시 만든다.
- Windows에서는 system dialog 직접 진입, PDF 저장창이 열린 동안 처리 중 상태 유지,
  저장·취소 뒤 상태 복원과 재인쇄를 확인한다.
- Linux 제품 동작은 바꾸지 않았지만 공통 import와 bundle 회귀를 native workflow에서
  다시 확인한다. 직전 exact의 6쪽 pagination GUI 결과는 유지한다.

## 승인 요청

- 작업지시자의 Stage 2.5 진행 승인과 기존 exact 후보까지의 연속 진행 승인에 따라 새
  exact-SHA Windows/Linux 후보 생성과 Windows 수동 검증 handoff로 이어간다.
