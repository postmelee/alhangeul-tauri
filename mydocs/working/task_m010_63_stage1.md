# Task #63 Stage 1 — core와 Cargo 경계

GitHub Issue: [#63](https://github.com/postmelee/alhangeul-tauri/issues/63)
구현계획서: [task_m010_63_impl.md](../plans/task_m010_63_impl.md)

## 단계 목적

core gate를 product critical path에서 분리하고 compiler/lock/workload별 cache를 source SHA에 따라 갱신한다.

## 산출물

- alhangeul-thumbnail-core.yml: 기존 Windows/Linux probe, 증거 upload 및 outcome gate를 독립 실행.
- .github/actions/cargo-cache/action.yml, scripts/ci/cache-key.mjs: source/target cache 분리, rustc -vV와 lock/target/scope 경계, 새 source primary key.
- desktop workflow CARGO_BUILD_TARGET 통일. host core release와 desktop feature/profile 검사는 보존.
- tests/ci-cache.test.mjs 및 기존 probe 계약의 소유 파일 이동 반영.

## 본문 변경 정도 / 본문 무손실 여부

기존 core 실행·실패/진단 gate를 그대로 이동했다. runner가 분리되므로 실패는 전체 run에서 계속 실패이며 제품 생성에 직렬 의존하지 않는다. 캐시 삭제/정책 변경 없음.

## 검증 결과

automation 519/519 통과, actionlint 및 diff --check 통과. compiler/target/lock/workload 변화 시 restore prefix가 달라지고 source만 변경 시 primary key가 갱신되는 회귀를 통과했다.

## 잔여 위험

성능 개선치는 아직 실측 전이다. cold build는 느릴 수 있다. Cargo feature/profile과 source timestamp 재컴파일은 cache hit와 구분한다.

## 다음 단계 영향

#64가 선택 platform에 맞는 core matrix와 전체 수용 집계를 연결한다. 동일 후보 cold/warm native canary로 저장/restore 및 단계 시간을 확인한다.

## 승인 요청

기존 전체 진행 승인 적용.

