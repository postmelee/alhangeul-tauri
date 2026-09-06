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

## 원격 결과 — PDF 생성 확인, 선택 파일명 반영 미완료

[run 34035297159](https://github.com/postmelee/alhangeul-tauri/actions/runs/34035297159)는
harness `7f17e3d`로 실행했다. Open/Save helper 모두 passed이며 nativeFallbackUsed=true다.
앱은 `PDF 저장 완료` 상태와 dirty title을 유지했고 source hash 보존 단언도 통과했다.
그러나 요청한 `biz-plan-hwp.pdf` 대신 기본 제안명 `source-biz-plan-hwp.pdf`가 생성되어
예상 경로 stat의 ENOENT로 실패했다. helper의 문자열 readback 성공만으로 대화상자의
최종 선택 경로 반영을 보장하지 못한다. 원인은 아직 확정하지 않았으며 기대 경로를
기본 제안명으로 바꿔 테스트를 통과시키지 않는다.

실제 생성된 PDF를 내려받아 기존 Poppler 분석기로 별도 확인했다.

- 6쪽 A4, 검색 marker `PDF검증` 포함, page text counts 50/642/410/638/478/250.
- 모든 쪽 nonblank·margin 검사 통과. 6개 PNG를 열어 한글·표·페이지 구성이 읽히는 것을 확인했다.
  원본과 pixel-level 조판 동등성 검증은 아니다.
- source HWP SHA-256은 고정 fixture와 동일한
  `8b786d6824622afae2220b203beeef6e5592157e1896fea055ebc602817113c1`이다.
- raw artifact `windows-pdf-raw-34035297159`, 로컬 `/private/tmp/alhangeul-save-pdf.Fpa7n7`.
  PDF와 사후 PNG/분석은 이 로컬 디렉터리의 `pdf/observed-hwp`에서 확인할 수 있다.

이 결과는 첫 HWP 실제 변환의 부분 증거다. workflow 전체·HWPX·재시작 덮어쓰기·지정 경로
수용을 완료한 것은 아니다. 후속은 helper가 변경한 파일명을 실제 선택 결과로 확정하는 경계의
진단/보정이며 제품 재빌드는 하지 않는다.
