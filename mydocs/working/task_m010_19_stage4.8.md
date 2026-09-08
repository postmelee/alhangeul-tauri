# Task #19 Stage 4.8 — Windows 파일 대화상자 Win32 fallback

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)

## 단계 목적

Windows runner에서 UIA Pane으로 노출되는 파일명 입력칸과 확인 버튼을 제한된 Win32
메시지 방식으로 조작한다. 작업지시자가 보정과 기존 artifact 재검증을 승인했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-pdf-win32.ps1` | 앱 PID, dialog class, 자식 HWND, ID와 class 검증; 2초 bounded text 송수신; 비동기 버튼 클릭 |
| `scripts/windows-pdf-dialog.ps1` | UIA pattern 부재 시에만 fallback, 사용 여부 증거 기록 |
| `tests/windows-pdf-workflow.test.mjs` | control identity·readback·시간 제한 계약 |
| `mydocs/plans/task_m010_19_impl.md` | 승인 범위 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품·driver·workflow·dependency는 변경하지 않았다. 전역 키보드/마우스 입력을 사용하지 않는다.
text 값은 일치 확인에만 사용하고 진단에 기록하지 않는다.

## 검증 결과

`node --test tests/windows-pdf-workflow.test.mjs`: 9/9 통과.
`git diff --check`: 통과. 현재 호스트에는 pwsh가 없어 Windows API 실행은 원격 검증에서 확인한다.

## 잔여 위험

Win32 helper 실제 실행은 미검증이다. 로컬 계약 테스트 성공은 제품 PDF 수용 성공이 아니다.

## 다음 단계 영향

제품 SHA `69b22650df96323a2c59e473d474ed3195cc9cc7`, native run `34021920074`를 재사용하고
PDF 전용 mode만 실행한다. 첫 문서 열기 이후 새 실패가 있으면 증거를 확인해 범위를 구분한다.

## 승인 상태

최소 보정·게시·재실행 승인됨. release·제품 재빌드·#19 완료는 수행하지 않는다.

## 원격 결과 — Open 해결, Save ID 차이 확인

[run 34034309219](https://github.com/postmelee/alhangeul-tauri/actions/runs/34034309219)는
harness `e34a63a`로 실행했다. Open은 nativeFallbackUsed=true로 12:55:30.980~12:55:33.789 UTC
약 2.8초에 성공했다. 앱은 HWP 6쪽을 로드했고 편집 dirty 대기와 고정 page count 단언 뒤
Save 단계까지 진행했다.

Save는 `submitted=false`, `stage=finding-filename-field`로 timeout했다. UIA 진단에
실제 입력칸은 `id=1001`, `class=Edit`, `type=ControlType.Pane`으로 나타난다.
현재 native filename fallback은 1148/Edit만 허용해 Save 입력칸을 제외한다.
제품 PDF 변환에는 여전히 도달하지 않았으며 HWPX/재시작 검증도 미실행이다.

raw artifact `windows-pdf-raw-34034309219`, 로컬 `/private/tmp/alhangeul-win32-pdf.xvFrQP`에
증거가 있다. 후속은 Open=1148, Save=1001로 mode별 identity를 제한하는 보정이다.
동일 조건 재실행이나 제품 재빌드는 하지 않았다.
