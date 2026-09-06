# Task #19 Stage 4.9 — Open/Save 파일명 입력칸 구분

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)

## 단계 목적

실행 증거에서 확인된 Open=1148, Save=1001을 mode별로 정확히 구분한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-pdf-dialog.ps1` | mode별 filename ID 탐색 |
| `scripts/windows-pdf-win32.ps1` | mode 허용 목록 및 기대 ID 검증 |
| `tests/windows-pdf-workflow.test.mjs` | 두 mode의 ID 매핑 계약 |
| `mydocs/plans/task_m010_19_impl.md` | 보정·재실행 승인 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품·workflow·의존성은 변경하지 않는다. 기존 PID/class/자식 HWND/readback 검증은 유지한다.

## 검증 결과

`node --test tests/windows-pdf-workflow.test.mjs`: 9/9 통과.
`git diff --check`: 통과. Windows 실제 실행은 후속 run으로 확인한다.

## 잔여 위험

이전 run에서 Open·6쪽 로드·편집은 확인했으나 PDF 생성·재시작은 미검증이다.

## 다음 단계 영향

제품 SHA `69b22650df96323a2c59e473d474ed3195cc9cc7`, native run `34021920074`를 재사용한다.
빌드·서명·게시 job을 실행하지 않고 PDF acceptance만 실행한다.

## 승인 상태

작업지시자가 이 보정과 재검증을 승인했다. #19 수용 완료나 릴리스 승인은 아니다.
