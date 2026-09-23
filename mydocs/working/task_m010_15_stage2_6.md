# Task #15 Stage 2.6 완료 보고서 — Windows modal handoff 안정화

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 2.6

## 단계 목적

Stage 2.5 exact Windows 후보에서 system print dialog가 열린 동안에는
`시스템 인쇄 대화상자 여는 중...`이 유지됐고, Microsoft Print to PDF 저장창으로
전환되자 기존 문서 상태가 먼저 복원됐다. `window.print()`의 blocking 경계와 system
dialog에서 driver 저장창으로 넘어갈 때 발생하는 transient native focus를 반영해 두
대화상자 모두에서 처리 중 상태와 hidden print surface를 유지하도록 안정화했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/command/direct-print.ts` | `시스템 인쇄 처리 중...`을 native listener 준비와 `window.print()` 호출 전에 설정한다. |
| `apps/studio-host/src/command/print-ui-lifecycle.ts` | 호출 반환 전 focus 이력을 버리고, 반환 뒤 native main window가 1초간 연속 focused일 때만 modal chain 종료로 판정한다. 중간 blur는 stability timer를 취소한다. |
| `apps/studio-host/src/command/direct-print.test.ts` | `window.print()` 호출 시 처리 중 상태가 이미 설정됐고 인쇄창→저장창 전환 동안 title·surface가 유지되는 통합 계약을 고정한다. |
| `apps/studio-host/src/command/print-ui-lifecycle.test.ts` | pre-return focus 무시, transient focus 취소, 최종 1초 focus 안정화와 DOM fallback을 독립적으로 고정한다. |
| `mydocs/plans/task_m010_15_impl.md` | Stage 2.5 Windows 실측, Stage 2.6 상태기와 exact 수동 gate를 반영했다. |
| `mydocs/orders/20260811.md` | Stage 2.6 source gate 완료와 exact 후보 생성 대기 상태를 기록했다. |
| `mydocs/working/task_m010_15_stage2_6.md` | 구현, 검증, 잔여 위험과 다음 exact 입력을 기록했다. |

변경 후 `direct-print.ts` 187 LOC, `print-ui-lifecycle.ts` 147 LOC,
`direct-print.test.ts` 263 LOC, `print-ui-lifecycle.test.ts` 112 LOC로 모두 파일
300 LOC 권장 상한 안에 있다.

## 본문 변경 정도 / 본문 무손실 여부

upstream page SVG, print stylesheet, browser visible preview, Linux pagination CSS와
HWP/HWPX/direct PDF 데이터는 수정하지 않았다. Windows system print dialog와 printer
driver도 앱이 제어하지 않는다. 변경은 Tauri adapter 상태 문구 시점과 Windows native
focus lifecycle 종료 판정에 한정한다.

저장 성공과 취소, physical printer spool 완료는 구분하지 않으며 `인쇄 완료`를
표시하지 않는다. Microsoft Print to PDF 기본 파일명도 system print UI 제약으로
acceptance에서 제외하고, 보장되는 basename UX는 기존 `파일 > PDF로 저장`이 담당한다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/print-ui-lifecycle.test.ts src/command/direct-print.test.ts src/command/commands/file.test.ts src/core/upstream-boundary.test.ts
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — focused 실행과 전체 Studio 모두 20 files, 86 tests 통과
- OK — `window.print()` 진입 시점에 `시스템 인쇄 처리 중...`이 이미 설정된 계약 통과
- OK — `인쇄창 blur → 임시 focus → 저장창 blur`에서 title·surface와 처리 중 상태를
  유지하고 stability timer를 취소하는 계약 통과
- OK — 최종 focus가 999ms인 동안 정리하지 않고 1000ms에 정리하는 계약 통과
- OK — 후속 driver modal이 없으면 1초 안정화 뒤 종료하는 계약 통과
- OK — native listener 등록 실패 시 DOM focus fallback 계약 통과
- OK — production Studio TypeScript compile과 212 modules 변환 성공
- OK — product boundary 182 files 통과
- OK — `git diff --check` 경고 없음
- INFO — 기존 CanvasKit browser externalization, ineffective dynamic import와 500 kB
  chunk 경고는 유지되며 새 오류가 아니다.

## 잔여 위험

- Windows에서 driver 저장창 생성이 1초보다 늦어 main window focus가 먼저 1초간
  유지되는 환경이면 상태가 조기 복원될 수 있다. 새 exact GUI 결과로 판정한다.
- native focus 복귀는 modal chain 종료만 뜻하며 저장 성공, 취소 또는 physical printer
  spool 완료를 구분하지 않는다.
- focus 복귀 신호가 오지 않으면 5분 safety timeout 뒤 title·surface를 정리한다.
- 기본 파일명 자동 입력은 system print UI 제약으로 acceptance에서 제외한다.
- Task #13 merge 전에는 Task #15 PR·merge·close를 진행하지 않는다.

## 다음 단계 영향

- Stage 2.6 보고 commit을 새 source exact SHA로 고정하고 CI와 Windows/Linux native
  bundle을 다시 만든다.
- Windows에서는 system dialog와 PDF 저장창 모두의 처리 중 상태, 저장·취소 뒤 약 1초
  후 기존 상태 복원과 재인쇄를 확인한다.
- Linux 제품 분기는 바뀌지 않았지만 공통 bundle 회귀를 native workflow에서 확인한다.

## 승인 요청

- 작업지시자의 Stage 2.6 진행 승인과 기존 exact 후보까지의 연속 진행 승인에 따라 새
  exact-SHA Windows/Linux 후보 생성과 Windows 수동 검증 handoff로 이어간다.
