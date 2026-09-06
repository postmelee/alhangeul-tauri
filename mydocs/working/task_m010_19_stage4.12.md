# Task #19 Stage 4.12 — 파일 열기 전용 진단

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)

## 단계 목적

파일명 입력의 포커스 가설을 HWP/HWPX 열기만으로 검사한다. 전체 PDF 검증을 반복하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| 두 Windows PDF/desktop workflow | open_only 입력과 windows-pdf-open-probe 모드, PDF 분석 제외 |
| PDF config/spec | open-only scenario, 편집 전 종료, 별도 증거 이름과 pdfTested=false |
| Windows dialog helper | UIA SetFocus와 HasKeyboardFocus 확인, 실패 시 즉시 중단 |
| Windows PDF 계약 테스트 | 진단/수용 분리 및 포커스 순서 검사 |
| 기존 구현계획서 | 범위·단일 원격 실행 승인 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품·driver·timeout은 변경하지 않는다. 기본 PDF 경로는 기존대로 동작하며 진단 모드는
fresh만 실행한다. title identity 검증, 입력 readback, 앱 소유 process 제한을 유지한다.

## 검증 결과

- `pnpm run typecheck:gui`: 통과.
- `node --test tests/windows-pdf-workflow.test.mjs tests/gui-contracts.test.mjs`: 31/31 통과.
- `actionlint .github/workflows/alhangeul-windows-pdf.yml .github/workflows/alhangeul-desktop.yml`: 통과.
- `git diff --check`: 통과.

## 잔여 위험

포커스 부족이 원인인지는 아직 가설이다. UIA SetFocus가 지원되지 않으면 해당 진단이 실패하며
blind 입력/확인으로 우회하지 않는다. 진단 통과는 편집/PDF/덮어쓰기 통과가 아니다.

## 다음 단계 영향

기존 제품 SHA `69b22650df96323a2c59e473d474ed3195cc9cc7`와 native run `34021920074`로
open-only 진단 한 번을 실행한다. 제품 재빌드·게시·릴리스를 하지 않는다.

## 승인 상태

작업지시자가 좁힌 파일 열기 검증 진행을 승인했다. 구현 계약 통과 후 원격 진단 결과를 확인한다.
