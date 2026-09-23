# Task #19 Stage 4.15 — 대화상자 버튼 ID 충돌 보정

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)

## 단계 목적

숫자 AutomationId를 공유하는 UIItem을 실제 버튼으로 오인하지 않도록 한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-pdf-dialog.ps1` | ID와 Button class의 AND 조건, 중복 거부, Open/Save submit과 ID6 확인에 적용 |
| `tests/windows-pdf-workflow.test.mjs` | AND 조건·중복/누락·기존 ID-only 호출 제거 계약 |
| 기존 구현계획서 | 보정 및 단일 진단 승인 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품·workflow·driver·포커스·입력·제출 방식은 유지한다. 진단용 ID-only 탐색은 실행 버튼
선택과 분리한다. native PID/class/자식 HWND 검증을 유지한다.

## 검증 결과

- `node --test tests/windows-pdf-workflow.test.mjs tests/gui-contracts.test.mjs`: 33/33 통과.
- `git diff --check`: 통과.
- 로컬 테스트는 selector 구성에 대한 정적 계약이다.
- 실제 Windows [run 34042833704](https://github.com/postmelee/alhangeul-tauri/actions/runs/34042833704): 성공.
  harness commit `903164b`, 제품 SHA `69b22650df96323a2c59e473d474ed3195cc9cc7`,
  native artifact run `34021920074`를 사용했다.
- HWP: `source-biz-plan-hwp.hwp - Alhangeul`, identity 확인 통과, 6쪽.
- HWPX: `source-form-hwpx.hwpx - Alhangeul`, identity 확인 통과, 10쪽.
  캡처에서도 이전 HWP가 아닌 실제 HWPX 표/서식 문서를 확인했다.
- 두 Open helper 모두 `status=passed`, `filenameFocused=true`,
  `buttonMethod=Win32-BM_CLICK`이다. 두 결과 모두 `scenario=open-only`,
  `pdfTested=false`이므로 PDF acceptance 통과로 간주하지 않는다.

## 잔여 위험

추가 Windows 컨트롤 변형은 안전하게 실패할 수 있다. PDF·덮어쓰기는 이번 진단에 포함하지 않는다.

## 다음 단계 영향

열기 전용 진단이 성공하여 ID-only 탐색의 파일 목록 항목 오인 문제가 해소되었다.
다음 단계 승인 후 동일 제품 artifact로 전체 PDF acceptance를 한 번 실행하여
저장과 재실행 후 덮어쓰기를 확인한다. 사용자가 완료한 수동 Windows 검증 결과는
그대로 유지하며, 이번 자동 열기 검증과 별도 근거로 취급한다.

## 승인 상태

작업지시자가 버튼 ID/class 제한 보정과 열기 전용 Windows 검증을 승인했다.
