# Task #60 최종 보고서 — 운영 계약과 실제 측정 수용

GitHub Issue: [#60](https://github.com/postmelee/alhangeul-tauri/issues/60)
마일스톤: M010

## 작업 요약

- 대상 이슈: #60, 부모 #59, 마일스톤 M010, 총 3단계.
- 구현된 검증 계층과 실제 run/job/step을 운영 계약에 대조한다.
- 부모의 통합 PR 하나로 게시하며 이슈별 단계 커밋과 보고서를 보존한다.

## 변경 파일 목록과 영향 범위

`docs/operations/CI_VALIDATION.md`, `scripts/ci/timings.mjs`, timing 회귀 테스트.

CI 검증·증거 수집 및 관련 운영 문서에 한정한다. 제품 구현, rhwp pin, updater/release 동작을 변경하지 않았다. 전체 파일 분류는 [부모 최종 보고서](task_m010_59_report.md)를 참조한다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| CI 운영 계약 | docs/operations/CI_VALIDATION.md | 동일 | OK | [수행계획서](../plans/task_m010_60.md)의 문서 위치 판단 |
| 개별 계획·단계·최종 보고 | mydocs/plans, working, report | 동일 | OK | 운영 계약과 실행 결과를 분리 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 측정 구분 | 완료·건너뜀의 해석이 수작업에 의존 | attempt별 job wall/step 합계/시작 offset, 미완료·skipped는 null |
| Windows core 의존 | 제품 build 내부 직렬 | 883초 core job과 제품 job 병렬 |

수치는 job 실행 시간이며 전체 run 지연·runner 대기와 구분한다. 서로 다른 workload 간 native 빌드 속도 개선을 뜻하지 않는다.

## 검증 결과

전체 run의 attempt 1 metadata를 timing 도구로 변환했다. fast Windows 19초·Node/Studio 70초, core Windows 883초/Linux x64 264초/arm64 245초, native Windows 2,513초/Linux x64 1,629초/arm64 1,164초, 새 Windows smoke 121초, 결과 집계 8초를 확인했다. 병렬 job 합계는 사용자 대기 시간으로 사용하지 않았다.

전체 수용 후보는 `230098401df7d893a26b54b62b780081d3553dda`이며 [전체 run](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307)이 success다. 최종 보고 커밋은 동일 실행 코드 위의 문서 변경이다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_60_stage1.md): 계층별 계약과 구현.
- [Stage 2](../working/task_m010_60_stage2.md): 실패·누락·불일치 회귀.
- [Stage 3](../working/task_m010_60_stage3.md): 실제 통합 후보 수용 및 결과 해석.

## 잔여 위험과 후속 작업

### 잔여 위험

runner/toolchain/source가 다른 기존 #57 실행과 native 시간의 인과적 개선을 주장하지 않는다. 동일 후보의 대표 warm 비교는 부모 최종 보고서에 별도로 기록한다.

### 후속 작업 후보

#19/#57의 별도 기능을 합칠 때 분리된 workflow 소유 파일에 반영한다. cache 유지·성능의 한계는 부모 최종 보고서의 실측 결과를 따른다.

## 작업지시자 승인 요청

추가 단계 승인 없는 구현·검증·PR 생성 지시에 따라 #59 통합 PR에 포함한다. merge·release·이슈 close는 수행하지 않는다.
