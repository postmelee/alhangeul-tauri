# Task #64 최종 보고서 — 전체 수용과 선택 경계 통합

GitHub Issue: [#64](https://github.com/postmelee/alhangeul-tauri/issues/64)
마일스톤: M010

## 작업 요약

- 대상 이슈: #64, 부모 #59, 마일스톤 M010, 총 3단계.
- 분리된 실행 그래프가 기존 Windows/Linux 수용을 유지하며 필요한 검사 누락을 성공으로 처리하지 않는지 확인한다.
- 부모의 통합 PR 하나로 게시하며 이슈별 단계 커밋과 보고서를 보존한다.

## 변경 파일 목록과 영향 범위

`ci.yml`, artifact orchestrator/platform/core/smoke reusable workflow, `scripts/ci/profiles.mjs`, selector/plan/result 및 회귀.

CI 검증·증거 수집 및 관련 운영 문서에 한정한다. 제품 구현, rhwp pin, updater/release 동작을 변경하지 않았다. 전체 파일 분류는 [부모 최종 보고서](task_m010_59_report.md)를 참조한다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| CI 운영 계약 | docs/operations/CI_VALIDATION.md | 동일 | OK | [수행계획서](../plans/task_m010_64.md)의 문서 위치 판단 |
| 개별 계획·단계·최종 보고 | mydocs/plans, working, report | 동일 | OK | 운영 계약과 실행 결과를 분리 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| Desktop entry 길이 | 1,435 LOC | 797 LOC |
| CI 회귀 테스트 | 범위 선택·실제 Git fixture 없음 | 52/52 통과 |
| 전체 수용 결과 | 큰 entry에 책임 집중 | 필수 11개 job success |

수치는 job 실행 시간이며 전체 run 지연·runner 대기와 구분한다. 서로 다른 workload 간 native 빌드 속도 개선을 뜻하지 않는다.

## 검증 결과

all/full/run_tests=true 전체 후보에서 plan, fast 2개, core 3개, Windows 및 Linux x64/arm64 native 3개, Windows smoke, result 등 필수 11개 job이 success다. MSI/NSIS 새 archive 설치·제거 및 Linux 두 architecture package lifecycle이 통과했다. 선택·집계·CLI를 포함한 CI 회귀 52/52, 전체 automation 554/554가 통과했다. 실제 Git fixture로 rename 이전/새 경로, 삭제, 알 수 없는 경로, 누락 base와 빈 diff의 full fallback을 확인했다. 선택한 필수 job의 failed/cancelled/skipped/missing은 성공으로 집계하지 않는다.

전체 수용 후보는 `230098401df7d893a26b54b62b780081d3553dda`이며 [전체 run](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307)이 success다. 최종 보고 커밋은 동일 실행 코드 위의 문서 변경이다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_64_stage1.md): 계층별 계약과 구현.
- [Stage 2](../working/task_m010_64_stage2.md): 실패·누락·불일치 회귀.
- [Stage 3](../working/task_m010_64_stage3.md): 실제 통합 후보 수용 및 결과 해석.

## 잔여 위험과 후속 작업

### 잔여 위험

자동 선택 규칙의 모든 profile을 원격 native로 각각 반복하지 않았다. 실제 full/installer 경로와 로컬 분기 회귀를 사용한다. Windows smoke의 Linux 비의존성은 workflow 계약으로 검증했으며 이번 run에서는 Linux가 먼저 끝났다.

### 후속 작업 후보

#19/#57의 별도 기능을 합칠 때 분리된 workflow 소유 파일에 반영한다. cache 유지·성능의 한계는 부모 최종 보고서의 실측 결과를 따른다.

## 작업지시자 승인 요청

추가 단계 승인 없는 구현·검증·PR 생성 지시에 따라 #59 통합 PR에 포함한다. merge·release·이슈 close는 수행하지 않는다.
