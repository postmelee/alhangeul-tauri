# Task #15 Stage 2.4 완료 보고서 — Windows system print lifecycle 보정

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 2.4

## 단계 목적

exact Windows 후보 `d194050194a754cded496422a2fe0cf37331f723`에서 system
print dialog 직접 진입은 통과했지만, `Microsoft Print to PDF` driver 저장창이
열려 있는 동안 `인쇄 완료`가 먼저 표시되고 기본 파일명이 비어 있음을 확인했다.
WebView2가 제공하지 않는 저장 성공·취소 결과를 추정하지 않으면서, driver modal
동안 원본 basename 제목과 hidden print surface를 유지하고 거짓 완료 표시를
제거했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/command/direct-print.ts` | `window.print()` 반환 뒤 host focus가 없으면 driver modal chain 종료까지 제목과 surface를 유지한다. 대기 중에는 `시스템 인쇄 처리 중...`을 표시하고 focus·timeout·unsupported 종료 원인을 진단 로그에 남긴다. |
| `apps/studio-host/src/command/commands/file.ts` | generic desktop action에 완료 상태 정책을 추가하고 `file:print`만 기존 문서 상태를 복원해 `인쇄 완료`를 표시하지 않는다. |
| `apps/studio-host/src/command/direct-print.test.ts` | focus 복귀 전 basename·surface·처리 중 상태 유지와 복귀 후 정리를 고정한다. |
| `apps/studio-host/src/command/commands/file.test.ts` | Tauri 인쇄 후 기존 문서 상태 복원과 `인쇄 완료` 미표시를 고정한다. |
| `mydocs/plans/task_m010_15_impl.md` | 발견 증상, WebView2 경계, lifecycle 보정, Windows best-effort 파일명 gate를 Stage 2.4로 기록한다. |
| `mydocs/orders/20260811.md` | Stage 2.4 source gate 완료와 새 exact 후보 생성 상태를 기록한다. |
| `mydocs/working/task_m010_15_stage2_4.md` | 구현·검증·잔여 위험과 다음 exact 후보 입력을 기록한다. |

변경 후 `direct-print.ts` 214 LOC, `command/commands/file.ts` 124 LOC,
focused test 두 파일은 각각 232 LOC와 165 LOC로 파일 300 LOC 권장 상한 안에 있다.

## 본문 변경 정도 / 본문 무손실 여부

upstream page SVG, print stylesheet, browser visible preview와 Linux pagination CSS는
수정하지 않았다. Windows system print dialog, printer 선택, page content와
HWP/HWPX 저장, 앱 직접 PDF 데이터도 그대로다.

기존에는 `window.print()` 반환 즉시 hidden surface를 폐기하고 제목을 복원했다.
이번 변경은 host document가 focus를 잃은 경우에만 focus 복귀까지 cleanup을
늦춘다. 저장 성공과 취소를 구분하지 않으며 실제 인쇄·spool 완료를 주장하지 않는다.

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

- OK — focused 실행과 전체 Studio 모두 19 files, 83 tests 통과
- OK — focus 복귀 전 `document`·surface title이 `document` basename으로 유지되고 surface가 폐기되지 않는 계약 통과
- OK — focus 복귀 후 surface cleanup, 원래 title과 기존 문서 상태 복원 계약 통과
- OK — `인쇄 완료` 미표시 계약 통과
- OK — production Studio build 211 modules 변환과 TypeScript compile 통과
- OK — product boundary 180 files 통과
- OK — `git diff --check` 경고 없음
- INFO — 기존 CanvasKit browser externalization, ineffective dynamic import와 500 kB chunk 경고는 유지되며 새 오류가 아니다.

## 잔여 위험

- Microsoft Print to PDF의 기본 파일명은 driver가 WebView2 document title을 사용하는
  경우에만 채워진다. 이번 lifecycle 유지가 해당 Windows 환경에서 작동하는지는 새
  exact artifact 수동 검증 전까지 미확정이며 acceptance 필수 조건은 아니다.
- browser focus 신호가 오지 않는 구현에서는 title·surface를 영구 점유하지 않도록
  5분 safety timeout으로 정리한다. timeout은 진단 로그에 남는다.
- focus 복귀는 system modal chain 종료를 뜻하지만 저장 성공, 취소 또는 physical
  printer spool 완료를 구분하지 않는다. 따라서 완료 문구를 표시하지 않는다.
- Task #13 merge 전에는 Task #15 PR·merge·close를 진행하지 않는다.

## 다음 단계 영향

- Stage 2.4 보고 commit을 새 source exact SHA로 고정하고 CI와 Windows/Linux native
  bundle을 다시 만든다.
- Windows에서는 system dialog 직접 진입, PDF driver 저장창 동안 거짓 완료 미표시,
  저장·취소 후 상태 복원과 재인쇄를 필수 확인한다.
- 기본 파일명은 채워짐 여부를 기록한다. 비어 있으면 Windows system print UI의
  best-effort 제약으로 남기고, 보장되는 파일명 UX는 `파일 > PDF로 저장`이 담당한다.
- Linux source 영향은 lifecycle과 상태 표시에 한정되므로 native build gate를 다시
  수행하고, Stage 2.3 6쪽 pagination artifact 결과를 유지한다.

## 승인 요청

- 작업지시자의 Stage 2.4 진행 승인과 기존 exact 후보까지의 연속 진행 승인에 따라
  새 exact-SHA Windows/Linux 후보 생성과 수동 검증 handoff로 이어간다.
