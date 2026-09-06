# Task #19 Stage 4.10 — 저장 대화상자의 파일명 편집 반영

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)

## 단계 목적

문자열 readback과 실제 저장 경로가 달랐던 Save fallback을 Edit 편집 동작으로 보정한다.
이는 관측된 불일치에 대한 보정 가설이며 Windows 실행 전 해결로 단정하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-pdf-win32.ps1` | Save만 EM_SETSEL 전체 선택 후 EM_REPLACESEL, bounded 호출과 readback 유지 |
| `tests/windows-pdf-workflow.test.mjs` | 선택/교체 순서, timeout, 신원 검증과 readback 계약 추가 |
| `mydocs/plans/task_m010_19_impl.md` | 승인 범위 및 검증 기록 |

## 본문 변경 정도 / 본문 무손실 여부

Open의 WM_SETTEXT와 제품 코드·workflow·driver는 보존한다. 전역 키 입력이나 좌표 조작은
추가하지 않는다. 예상 PDF 파일명을 실제 기본 파일명으로 바꾸는 우회도 하지 않는다.
EM_REPLACESEL은 의미 있는 반환값이 없으므로 메시지 전송 성공과 별도 readback을 확인한다.
근거: [Microsoft EM_REPLACESEL](https://learn.microsoft.com/en-us/windows/win32/controls/em-replacesel).

## 검증 결과

`node --test tests/windows-pdf-workflow.test.mjs`: 10/10 통과.
`git diff --check`: 통과.
현재 호스트에서 Windows/C# 메시지 실행은 하지 않았으며 정적 계약 검증과 구분한다.

## 잔여 위험

선택 경로의 실제 반영, HWPX, 재시작 덮어쓰기는 원격 실행에서 확인해야 한다.
이전 HWP 기본 파일명 PDF의 부분 증거를 전체 성공으로 취급하지 않는다.

## 다음 단계 영향

제품 SHA `69b22650df96323a2c59e473d474ed3195cc9cc7`, native run `34021920074`를 재사용해
PDF acceptance만 한 번 실행한다. 재빌드·서명·릴리스·updater 활성화는 하지 않는다.

## 승인 상태

작업지시자가 본 보정과 동일 산출물 재검증을 승인했다. #19 전체 수용 완료는 아니다.
