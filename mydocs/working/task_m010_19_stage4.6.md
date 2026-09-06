# Task #19 Stage 4.6 — PDF workflow dispatcher 연결

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)

## 단계 목적

새 Windows PDF workflow가 default branch에 없어 dispatch가 404로 거부된 문제를 해결한다.
이미 등록된 Desktop workflow에서 같은 branch의 reusable PDF workflow를 호출한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-desktop.yml` | PDF 전용 mode와 read-only reusable job |
| `.github/workflows/alhangeul-windows-pdf.yml` | workflow_call 입력 추가 |
| `tests/windows-pdf-workflow.test.mjs` | 입력 연결과 기존 build/publish 분리 계약 |
| `mydocs/plans/task_m010_19_impl.md` | 연결 보정 및 원격 실행 승인 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드·기존 job의 실행 조건·default branch는 변경하지 않았다. 내부 작업 문서만 추가했다.

## 검증 결과

```bash
node --test tests/actions-workflows.test.mjs tests/workflow-artifact-handoff.test.mjs tests/gui/linux/pdf-analysis.test.mjs
actionlint .github/workflows/alhangeul-desktop.yml .github/workflows/alhangeul-windows-pdf.yml
git diff --check
```

68/68 통과, actionlint 및 diff check 통과.

## 잔여 위험

실제 Windows PDF 수용은 아직 실행 전이다. workflow 연결 통과를 앱 검증 통과로 해석하지 않는다.

## 다음 단계 영향

작업지시자가 연결 보정 후 원격 검증까지 승인했다. 기존 제품 SHA
`69b22650df96323a2c59e473d474ed3195cc9cc7`, native run `34021920074`를 사용한다.
원격 실행 결과는 별도 진행 기록으로 남긴다. 제품 재빌드·서명·릴리스는 하지 않는다.

## 승인 상태

이 단계 보정·게시·원격 실행은 승인됨. #19 전체 수용·PR·merge·release 완료는 아니다.
