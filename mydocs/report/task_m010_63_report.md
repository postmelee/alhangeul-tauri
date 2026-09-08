# Task #63 최종 보고서 — core/cache 경계와 실제 측정

GitHub Issue: [#63](https://github.com/postmelee/alhangeul-tauri/issues/63)
마일스톤: M010

## 작업 요약

- 대상 이슈 #63, 부모 #59, 마일스톤 M010, 후속 재측정을 포함해 총 4단계.
- core 진단을 제품 생성과 병렬로 실행하고 compiler/lock/target/workload별 Cargo cache 경계와 source별 갱신 구조를 도입했다.
- 전체 native/core 수용과 동일 후보 재실행은 통과했다. 9월 8일 실제 Cargo cache hit 재측정에서 arm64 native가 20:59 → 13:15로 7:44(36.85%) 줄었다.

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
| 동일 후보 arm64 native | 최초 전체 run 1,164초, product attempt 1은 1,259초; 모두 Cargo miss | 같은 product attempt 2는 exact hit로 795초 |
| Cargo warm 성능 | cache 미보존으로 미입증 | 같은 source/image/compiler/검증 범위에서 job wall 36.85% 감소 |
| 복원/저장 비용 | Cargo restore 2초, post-save 84초 | restore 109초, primary hit로 post-save 0초 |

같은 SHA, image, toolchain의 실제 cold/warm job·step 및 exact cache key는 [Stage 4](../working/task_m010_63_stage4.md)에 있다. 최초 두 cold 실행은 과거 기록으로 보존한다. 36.85%는 동일 product profile의 attempt 1과 2의 job wall 비교다.

## 검증 결과

| 수용 항목 | 결과 |
|---|---|
| core/native 병렬 및 전체 gate 보존 | OK — 전체 run의 세 core와 세 native success |
| compiler/lock/target/workload 격리 | OK — key 회귀 및 실제 key 대조 |
| source별 primary key 갱신 | OK — 회귀, 실제 checkout SHA 포함 및 target save 로그 |
| 동일 후보 실제 측정 | OK — exact attempt별 시간과 동일 성공 step 목록 대조 |
| Cargo restore 및 warm 속도 효과 | OK — source/target exact hit, 복원 비용을 포함해 1,259초 → 795초 |

[전체 run](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307)과 [warm 재측정 job](https://github.com/postmelee/alhangeul-tauri/actions/runs/34065744901/job/101985711683)은 success다. 재측정은 linux-arm64/product/tests=true의 부분 검증이다. 로그의 Compiling 행은 1,252개에서 15개로 줄었지만 rhwp 컴파일 5회는 남았다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_63_stage1.md): core 분리와 cache identity.
- [Stage 2](../working/task_m010_63_stage2.md): 격리·갱신·필수 gate 회귀.
- [Stage 3](../working/task_m010_63_stage3.md): 실제 native/core 및 cache 보존 한계.
- [Stage 4](../working/task_m010_63_stage4.md): 보존 원인 조사와 실제 exact hit의 warm 효과.

## 잔여 위험과 후속 작업

### 잔여 위험

여러 GB target cache의 보존이 보장되지 않는다. 관측한 10.27GB 중 세 target이 97.27%를 차지하며 용량 압박에 따른 제거가 유력하나, 실제 한도 조회는 HTTP 402로 제한됐고 개별 제거 사유는 미확인이다. warm 결과는 arm64 동일 후보 한 쌍의 관측치이며 다른 OS/source 또는 장기 보존 효과로 확대하지 않는다.

### 후속 작업 후보

cache 용량·보존, 다른 source의 prefix restore와 남아 있는 workspace/feature별 재컴파일 비용을 후속 검토한다. cache 삭제·quota 변경은 이번 범위에서 수행하지 않았다.

## 작업지시자 승인 요청

2026-09-08의 이번 PR 포함 지시에 따라 #59 통합 PR을 갱신한다. 실제 warm 결과와 보존 한계를 함께 리뷰 대상으로 남긴다. merge·이슈 close는 수행하지 않는다.
