# Task #63 Stage 3 — core/cache 실제 실행과 보존 한계

GitHub Issue: [#63](https://github.com/postmelee/alhangeul-tauri/issues/63)
구현계획서: [task_m010_63_impl.md](../plans/task_m010_63_impl.md)
Stage: 3

## 단계 목적

core 의존 분리와 cache key 경계를 실제 Windows/Linux 실행에 대조하고 hit와 컴파일 성능을 구분한다.

## 산출물

core 세 platform, native 세 platform의 통합 결과 및 같은 arm64 후보 재실행의 job/step/cache 기록. 상세 표와 exact key는 [부모 최종 보고서](../report/task_m010_59_report.md)의 Cargo cache 절에 보존한다.

## 본문 변경 정도 / 본문 무손실 여부

실행 증거만 추가한다. 제품 source와 기존 필수 native 검사를 변경하지 않았다.

## 검증 결과

- [전체 run 34063530307](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307), attempt 1, SHA `230098401df7d893a26b54b62b780081d3553dda`: success. core Windows 883초, Linux x64 264초, arm64 245초이며 native job과 병렬 시작했다.
- compiler/lock/target/workload 변화에 따른 restore prefix 격리 및 source 변화에 따른 primary 갱신 회귀는 통합 automation 554/554에서 통과했다.
- [동일 후보 arm64 product 재실행 34065744901](https://github.com/postmelee/alhangeul-tauri/actions/runs/34065744901): success, native 1,259초. 첫 실행 native는 1,164초다. 같은 runner image/toolchain/native test·build 범위이며 전체 run의 core 포함 범위는 다르다.
- 두 실행에서 Cargo source/target은 모두 miss였다. 첫 실행에서 저장된 3.38GB target key가 재실행 restore 때 없었다. 재실행 종료 로그에서 같은 key와 source cache를 다시 저장한 것을 확인했다.
- pnpm은 두 번째 실행에서 hit였지만 이를 Cargo warm hit로 표시하지 않는다. **Cargo restore 성공과 warm 성능은 미입증**이다.
- `node scripts/ci/timings.mjs`의 `summarizeTimings`로 exact attempt API metadata를 변환해 job wall/step 합계/시작 offset을 구분했다. `actionlint`, `git diff --check` 통과.

## 잔여 위험

cache가 보존되지 않아 계획한 warm 성능 비교는 성립하지 않았다. cache key/저장 구조와 실제 cold 실행 결과는 검증했지만 native 속도 개선을 주장하지 않는다. 개별 cache 제거 사유는 확인하지 않았다. 여러 GB target cache의 보존·용량과 feature/profile 컴파일 비용은 후속 조사 대상이다.

## 다음 단계 영향

#59 PR에 구현 수용 결과와 warm 미입증을 함께 공개한다. cache를 삭제하거나 quota를 조정하지 않는다.

## 승인 요청

기존 전체 구현·검증·PR 생성 승인 적용. 성능 측정 한계를 최종 보고 및 PR의 남은 위험으로 유지한다.
