# Task #63 구현계획서

GitHub Issue: [#63](https://github.com/postmelee/alhangeul-tauri/issues/63)
수행계획서: [task_m010_63.md](task_m010_63.md)

## 승인 및 작업 경계

2026-09-07의 추가 단계 승인 없는 구현·검증·PR 생성 지시를 적용한다.
공식 문서 위치와 통합 PR 전략은 수행계획서에 고정한다. 주 worktree 및 #19/#57은 변경하지 않는다.

## Stage 1 — 계약과 구현

- #60: 운영 계약·기준 실행 기록. #61: reusable fast lane 및 PowerShell parser/exit-code 계약.
- #62: exact artifact handoff/download/inventory와 독립 installer workflow.
- #63: core 의존 분리, compiler/lock/source cache key 및 갱신.
- #64: profile/변경 선택, platform별 native 경로 및 전체 gate.
- #59: 자식 의존성·구현 통합.
- 검증: `git diff --check` 및 해당 계층 계약 test.
- 커밋: `Task #63 Stage 1: 계층 계약과 구현`.

## Stage 2 — 회귀 검증

- 신규 단위 fixture, 실패 전파, 누락/불일치/모호성 conservative fallback 검증.
- 기존 automation 검사의 의미를 보존하며 분리된 파일/의존관계에 맞게 갱신.
- `node --test tests/ci-*.test.mjs`, `pnpm run test:automation`.
- 필요한 기본 제품/Studio 검사는 통합 후보에서 재실행.
- 커밋: `Task #63 Stage 2: 회귀 검증`.

## Stage 3 — 통합 수용

- candidate exact SHA를 독립 publish/task59 branch에 push하고 무게시 CI만 실행.
- 빠른 Windows/Linux 검사, native/package 및 기존 artifact 경로의 실제 결과 기록.
- run/job/step·cache·artifact ID/digest를 구분. 알려진 제품 환경 실패는 성공으로 우회하지 않는다.
- `pnpm run check:product-boundary`, `check:product-version`, `check:release-metadata`, `test:upstream`, `test:studio`, `build:studio`.
- timing summary와 canonical CI 가이드·관련 entry 링크 확인.
- 단계/최종 보고와 보드 완료 표시 후 parent PR 1개 생성. 미검증을 통과로 표시하지 않는다.
- 커밋: `Task #63 Stage 3 + 최종 보고서: 통합 수용 근거`.

## Stage 4 — PR #66의 Cargo warm 재측정

2026-09-08 작업지시자의 원인 조사·실제 cache hit 재측정·이번 PR 반영 지시를 적용한다.

- 저장소 cache 사용량·설정 한도·key/크기/생성/접근 시각을 조회하고 제거 원인의 근거와 추론을 구분한다.
- 현재 보존된 arm64 target/source cache를 확인한 뒤 기존 run 34065744901을 재실행한다.
  동일 SHA 230098401df7d893a26b54b62b780081d3553dda와 workflow/플랫폼/product/tests=true를 유지한다.
- exact attempt API metadata와 실제 cache action 로그에서 restore key·bytes·hit,
  compiler/image, native test/build/lifecycle 및 post-save 시간을 대조한다.
- cache 보존·용량 정책 변경은 이 단계에서 수행하지 않는다. 구현 결함이 발견되면 #63에
  필요한 최소 보완과 관련 회귀를 적용하고 실제 측정을 다시 정렬한다.
- 검증: 원격 선택 필수 job success, exact target/source key 복원 확인,
  `git diff --check`, 변경 문서 상대 링크와 필수 보고서 섹션 확인.
- 문서 위치: 실행 결과는 기존 mydocs/working/task_m010_63_stage4.md 및 #63/#59
  최종 보고서에 반영한다. 운영상 측정 지침은 이미 승인된 docs/operations/CI_VALIDATION.md를
  필요한 범위에서 보완한다. 과거 miss 기록을 보존하고 새 결과와 구분한다.
- 완료 후 #63 단계 커밋을 부모 local/task59에 fast-forward 통합하고 publish/task59와
  PR #66의 본문·고정 문서 링크를 갱신한다. 사용자 지시로 추가 단계 승인 없이 진행한다.
