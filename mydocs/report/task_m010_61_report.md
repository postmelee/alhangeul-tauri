# Task #61 최종 보고서 — 실제 Windows 및 Linux 빠른 검사 수용

GitHub Issue: [#61](https://github.com/postmelee/alhangeul-tauri/issues/61)
마일스톤: M010

## 작업 요약

- 대상 이슈: #61, 부모 #59, 마일스톤 M010, 총 3단계.
- native 빌드 전에 독립된 빠른 검사가 실제 Windows/Linux runner에서 작동하는지 확인한다.
- 부모의 통합 PR 하나로 게시하며 이슈별 단계 커밋과 보고서를 보존한다.

## 변경 파일 목록과 영향 범위

`alhangeul-ci-fast.yml`, `scripts/ci/windows-tests.ps1`, `windows-test-process.ps1`, CI fixture/test.

CI 검증·증거 수집 및 관련 운영 문서에 한정한다. 제품 구현, rhwp pin, updater/release 동작을 변경하지 않았다. 전체 파일 분류는 [부모 최종 보고서](task_m010_59_report.md)를 참조한다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| CI 운영 계약 | docs/operations/CI_VALIDATION.md | 동일 | OK | [수행계획서](../plans/task_m010_61.md)의 문서 위치 판단 |
| 개별 계획·단계·최종 보고 | mydocs/plans, working, report | 동일 | OK | 운영 계약과 실행 결과를 분리 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 빠른 피드백 | native 제품 job에 여러 검사 혼재 | 독립 Windows 19초, Node/Studio 70초 |
| 통합 자동화 | 기존 회귀 집합 | 554/554 통과 |

수치는 job 실행 시간이며 전체 run 지연·runner 대기와 구분한다. 서로 다른 workload 간 native 빌드 속도 개선을 뜻하지 않는다.

## 검증 결과

전체 후보의 Fast Windows PowerShell contracts는 19초, Fast Node and Studio contracts는 70초에 통과했다. Windows는 PowerShell 소스 11개 parser와 격리 test suite 1개를 검사했다. Node automation 554/554, upstream 36/36, Studio 132/132와 build/typecheck/제품 경계를 통과했다. native 종료 코드 0/23 전달과 installer 실패 수집 회귀를 통과했다.

전체 수용 후보는 `230098401df7d893a26b54b62b780081d3553dda`이며 [전체 run](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307)이 success다. 최종 보고 커밋은 동일 실행 코드 위의 문서 변경이다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_61_stage1.md): 계층별 계약과 구현.
- [Stage 2](../working/task_m010_61_stage2.md): 실패·누락·불일치 회귀.
- [Stage 3](../working/task_m010_61_stage3.md): 실제 통합 후보 수용 및 결과 해석.

## 잔여 위험과 후속 작업

### 잔여 위험

빠른 검사 성공은 실제 ABI/설치/GUI 수용을 의미하지 않는다. #57 branch의 추가 PowerShell suite와 installer 분리 변경은 포함하지 않았다.

### 후속 작업 후보

#19/#57의 별도 기능을 합칠 때 분리된 workflow 소유 파일에 반영한다. cache 유지·성능의 한계는 부모 최종 보고서의 실측 결과를 따른다.

## 작업지시자 승인 요청

추가 단계 승인 없는 구현·검증·PR 생성 지시에 따라 #59 통합 PR에 포함한다. merge·release·이슈 close는 수행하지 않는다.
