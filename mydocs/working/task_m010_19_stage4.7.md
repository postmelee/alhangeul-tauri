# Task #19 Stage 4.7 — Windows 대화상자 진단·대기 경계

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)

## 단계 목적

첫 실행의 메뉴 조작 지연을 native 대화상자 timeout에서 분리하고 실패 지점을 관찰한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `tests/gui/specs/windows-pdf.e2e.ts` | 메뉴 클릭 반환 뒤 helper 실행 |
| `scripts/windows-pdf-dialog.ps1` | 앱 process에 한정된 최대 100개 UIA node 구조와 단계·시간 기록 |
| `tests/windows-pdf-workflow.test.mjs` | 실행 순서와 진단 제한 계약 |
| `mydocs/plans/task_m010_19_impl.md` | 보정·재실행 승인 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드·native 경계·driver version은 변경하지 않았다. UIA Name/Value는 기록하지 않는다.

## 검증 결과

`pnpm run typecheck:gui`, `node --test tests/windows-pdf-workflow.test.mjs`,
`git diff --check` 통과. focused contract 8/8 통과.

## 잔여 위험

대화상자 automation ID 적합성과 실제 Windows 동작은 재실행에서 확인해야 한다.
driver의 plugin discovery 반복은 로그에서 관측되었으나 이 단계에서 의존성은 수정하지 않았다.

## 다음 단계 영향

기존 제품 SHA `69b22650df96323a2c59e473d474ed3195cc9cc7`와 native run `34021920074`를
재사용한다. 이번 변경을 게시하고 PDF 전용 mode만 재실행한다.

## 승인 상태

작업지시자가 최소 보정과 재검증을 승인했다. 제품/릴리스 수용 완료를 의미하지 않는다.

## 원격 재검증 결과 — UIAutomation 호환성 확인

[run 34032961803](https://github.com/postmelee/alhangeul-tauri/actions/runs/34032961803)는
harness `f0117e1`로 실행했다. 설치·환경 준비는 성공했으나 첫 Open 단계에서 실패했다.
PDF 변환에는 도달하지 않았고 동일 조건 재시도는 하지 않았다.

helper는 12:28:22~12:29:52 UTC의 온전한 90초를 사용했다. 증거에서 `dialogCount=1`,
`submitted=false`, `stage=finding-filename-field`를 확인했다. 앱 소유 dialog 내부의
AutomationId `1148`은 `ComboBoxEx32`, `ComboBox`, `Edit` Win32 class로 존재하지만 모두
`ControlType.Pane`으로 노출된다. 확인 버튼 `1`도 Button class / Pane type이다.
따라서 현재 ValuePattern→ControlType.Edit 탐색 fallback으로 파일명 입력을 진행하지 못한다.
timeout 증가는 해결책이 아니며 제품 PDF 결함을 입증한 결과도 아니다.

raw artifact `windows-pdf-raw-34032961803`, 로컬
`/private/tmp/alhangeul-pdf-retry.Xr106t/biz-plan-hwp-fresh-Open.json`에 근거를 보존했다.
WebView2 policy 복원은 `restored=true`다.

후속 권고는 앱 소유 dialog의 정확한 Win32 handle·class·control ID를 검증한 뒤
메시지 기반 입력/확인 fallback을 사용하는 작은 Windows helper 보정이다.
UIA에서 확인된 입력칸/버튼만 대상으로 제한하며 좌표 클릭·전역 키 입력으로 대체하지 않는다.
이 후속 구현과 재실행은 별도 승인을 받는다.
