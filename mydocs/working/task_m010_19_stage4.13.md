# Task #19 Stage 4.13 — Native 파일명 포커스 검증

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)

## 단계 목적

UIA 포커스 미지원 경계를 native dialog 메시지와 실제 GUI thread 포커스 조회로 대체한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-pdf-win32.ps1` | 소유 HWND 검증, WM_NEXTDLGCTL 게시, GetGUIThreadInfo의 hwndFocus 최대 2초 확인 |
| `scripts/windows-pdf-dialog.ps1` | UIA 포커스 제거, native 확인 성공 후에만 filenameFocused=true |
| `tests/windows-pdf-workflow.test.mjs` | native 포커스/구조체 크기/대기 상한 계약 |
| 기존 구현계획서 | 보정 및 단일 진단 실행 승인 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품·workflow·driver는 유지한다. 전역 키 입력과 thread input 결합을 하지 않는다.
호출자 thread의 SetFocus가 아니라 dialog 소유 thread에 메시지를 게시한다.
참고: [Microsoft GUITHREADINFO](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-guithreadinfo).

## 검증 결과

- `pnpm run typecheck:gui`: 통과.
- `node --test tests/windows-pdf-workflow.test.mjs tests/gui-contracts.test.mjs`: 31/31 통과.
- `git diff --check`: 통과.
- macOS에서 Windows native 실행을 하지 않았으며 실제 동작은 후속 open-only run으로 확인한다.

## 잔여 위험

포커스 지정이 실제 선택 경로 문제를 해결하는지는 아직 미검증이다. native 포커스 불일치면
파일명을 입력하지 않고 실패한다. 열기 진단 성공은 PDF/덮어쓰기 성공을 의미하지 않는다.

## 다음 단계 영향

기존 제품 SHA `69b22650df96323a2c59e473d474ed3195cc9cc7`/native run `34021920074`로
open-only 진단을 한 번 실행한다. 전체 PDF workflow를 반복하지 않는다.

## 승인 상태

작업지시자가 native 포커스 보정과 진단 재실행을 승인했다.

## 원격 결과 — 포커스 확인 통과, 문서 선택 불일치 유지

[run 34040941920](https://github.com/postmelee/alhangeul-tauri/actions/runs/34040941920),
harness `66f6a67`, open-only 실행 결과 failure. 2026-09-07 KST 결과를 확인했다.

- 첫 HWP: filenameFocused=true, Win32-EditReplaceSelection, Win32-BM_CLICK,
  정확한 `source-biz-plan-hwp.hwp - Alhangeul` identity 통과.
- 두 번째 HWPX: filenameFocused=true, Win32-EditReplaceSelection, UIA-InvokePattern,
  실제 title은 다시 `source-biz-plan-hwp.hwp - Alhangeul`이며 identity 실패.
- 두 helper 모두 submitted=true, dialogCount=0, additionalDialog=none이다.
- PID는 각각 3024/8352로 달랐다. 포커스 이동만으로 문제는 해결되지 않았다.
- PDF 생성/분석은 실행하지 않았으며 cleanup/정책 복원/증거 업로드는 통과했다.
- 로컬 증거: `/private/tmp/alhangeul-native-focus.Ehd8Nh`.

후속 조사 변수는 제출 경로(UIA Invoke 대 Win32 BM_CLICK)다. 첫/두 번째 문서와 제출 방식이
동시에 달라 인과관계를 확정할 수 없다. 검증된 HWND의 동일 native 제출 경로로 비교하는
open-only 실험이 가능하다. 사용자 수동 통과 증거를 변경하지 않는다.
