# Task #19 Stage 4.14 — Open 제출 방식 단일화 비교

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)

## 단계 목적

HWP/HWPX 사이 UIA Invoke와 native BM_CLICK 차이를 제거하여 제출 방식 가설을 검사한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-pdf-dialog.ps1` | Open의 ID1만 native 제출을 우선하고 즉시 return |
| `tests/windows-pdf-workflow.test.mjs` | Open 경로 우선순위와 소유 HWND 검증 계약 |
| 기존 구현계획서 | 동일 조건 비교 승인 기록 |

## 본문 변경 정도 / 본문 무손실 여부

입력·포커스·Save·overwrite·제품·driver·workflow를 유지한다. 기존 native 검증을 재사용한다.

## 검증 결과

- `node --test tests/windows-pdf-workflow.test.mjs tests/gui-contracts.test.mjs`: 32/32 통과.
- `git diff --check`: 통과.
- 로컬 계약은 Windows 실제 실행 증거가 아니며 후속 open-only 결과로 판단한다.

## 잔여 위험

제출 방식 차이가 문서 불일치의 원인인지는 가설이다. identity 검사와 안전 제한을 완화하지 않는다.

## 다음 단계 영향

같은 제품 SHA `69b22650df96323a2c59e473d474ed3195cc9cc7`/native run `34021920074`로
open-only 한 번을 실행한다. PDF 전체 검사나 제품 재빌드는 하지 않는다.

## 승인 상태

작업지시자가 보정과 열기 전용 비교 검증을 승인했다.

## 원격 결과 — ID 충돌로 잘못된 요소 선택 확인

[run 34042086165](https://github.com/postmelee/alhangeul-tauri/actions/runs/34042086165),
harness `1021b8d`, open-only 실행은 failure다. 첫 HWP는 통과했지만 두 번째 HWPX Open은
stage=invoking-submit, submitted=false, filenameFocused=true 상태에서 native identity 검증이
`Native dialog control identity mismatch`로 거부했다.

증거 tree에 `id=1,class=UIItem,type=ListItem`이 실제 `id=1,class=Button`보다 먼저 나온다.
`Find-Id $dialog '1'`은 class 제한 없이 FindFirst를 사용하므로 파일 목록 항목을 선택한다.
이전 UIA Invoke는 잘못 선택된 목록 항목을 실행할 수 있었고, native 검증은 이를 차단했다.
이로써 단순 UIA/native 동작 차이가 아니라 ID만으로 submit 요소를 탐색한 구체적 결함을 확인했다.
후속 최소 수정은 submit을 ID1 AND class Button으로 제한하는 것이며 PID/자식 HWND 검증은 유지한다.
같은 잘못된 탐색은 Save에도 존재하므로 공통 버튼 탐색 경계에서 수정해야 한다.

cleanup/정책 복원/업로드는 통과했고 PDF 분석은 제외됐다.
로컬 증거: `/private/tmp/alhangeul-open-submit.f1h9jq`.
