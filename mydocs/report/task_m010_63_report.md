# Task #63 최종 보고서 — core/cache 경계와 실제 측정

GitHub Issue: [#63](https://github.com/postmelee/alhangeul-tauri/issues/63)
마일스톤: M010

## 작업 요약

- 대상 이슈 #63, 부모 #59, 마일스톤 M010, 총 3단계.
- core 진단을 제품 생성과 병렬로 실행하고 compiler/lock/target/workload별 Cargo cache 경계와 source별 갱신 구조를 도입했다.
- 전체 native/core 수용과 동일 후보 재실행은 통과했다. cache 보존 실패로 Cargo warm 성능 개선은 입증하지 못했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| alhangeul-thumbnail-core.yml | 기존 core probe와 실패 gate 독립 | Windows/Linux core |
| .github/actions/cargo-cache/action.yml | source/target 분리 | Cargo cache |
| scripts/ci/cache-key.mjs, tests/ci-cache.test.mjs | compiler/lock/target/workload/source identity | 격리 및 primary key 갱신 |
| native workflow target 설정 | CARGO_BUILD_TARGET 통일 | 불필요한 implicit/explicit target 분산 억제 |

제품 source와 필요한 feature/profile 검사는 보존했다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| CI 계약 | docs/operations/CI_VALIDATION.md | 동일 | OK | [수행계획서](../plans/task_m010_63.md)의 위치 판단 |
| 단계·최종 실행 근거 | mydocs/working, report | 동일 | OK | 운영 계약과 실측 결과 분리 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| core 의존 | 제품 job 내부 직렬 | Windows 883초/Linux x64 264초/arm64 245초를 병렬 실행 |
| target primary key | 오래된 lock 기반 cache에 고정 가능 | compiler/lock/workload prefix + 실제 source SHA |
| 동일 후보 arm64 native | 첫 실행 1,164초 | 재실행 1,259초, 둘 다 Cargo miss |
| Cargo warm 성능 | 통제된 근거 없음 | cache 미보존으로 여전히 미입증 |

같은 SHA, image, toolchain의 job/step 비교는 [부모 최종 보고서](task_m010_59_report.md)에 있다. 두 cold 실행을 warm 개선으로 표시하지 않는다.

## 검증 결과

| 수용 항목 | 결과 |
|---|---|
| core/native 병렬 및 전체 gate 보존 | OK — 전체 run의 세 core와 세 native success |
| compiler/lock/target/workload 격리 | OK — key 회귀 및 실제 key 대조 |
| source별 primary key 갱신 | OK — 회귀, 실제 checkout SHA 포함 및 target save 로그 |
| 동일 후보 실제 측정 | OK — exact attempt별 시간·cache miss/save 수집 |
| Cargo restore 및 warm 속도 효과 | 미입증 — 저장됐던 cache가 재실행 때 없었음 |

[전체 run](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307)과 [재실행](https://github.com/postmelee/alhangeul-tauri/actions/runs/34065744901)은 success다. 재실행은 linux-arm64/product/tests=true의 부분 검증이다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_63_stage1.md): core 분리와 cache identity.
- [Stage 2](../working/task_m010_63_stage2.md): 격리·갱신·필수 gate 회귀.
- [Stage 3](../working/task_m010_63_stage3.md): 실제 native/core 및 cache 보존 한계.

## 잔여 위험과 후속 작업

### 잔여 위험

여러 GB target cache의 보존이 보장되지 않는다. 첫 arm64 target 저장 후 같은 key를 찾지 못한 사실은 확인했으나 GitHub의 제거 사유는 확인하지 않았다. cache hit와 실제 재컴파일 감소도 별도 검증 대상이다.

### 후속 작업 후보

cache 용량·보존과 feature/profile별 재컴파일 비용을 측정해 warm 효과를 확인한다. cache 삭제·quota 변경은 이번 범위에서 수행하지 않았다.

## 작업지시자 승인 요청

기존 구현·검증·PR 생성 지시에 따라 #59 통합 PR에 포함한다. warm 성능 미입증을 명시하여 리뷰 대상으로 남긴다. merge·이슈 close는 수행하지 않는다.
