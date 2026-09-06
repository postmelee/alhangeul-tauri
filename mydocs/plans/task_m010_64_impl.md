# Task #64 구현계획서

GitHub Issue: [#64](https://github.com/postmelee/alhangeul-tauri/issues/64)
수행계획서: [task_m010_64.md](task_m010_64.md)

## 승인 및 작업 경계

2026-09-07의 추가 단계 승인 없는 구현·검증·PR 생성 지시를 적용한다.
공식 문서 위치와 통합 PR 전략은 수행계획서에 고정한다. 주 worktree 및 #19/#57은 변경하지 않는다.

## Stage 1 — 계약과 구현

기존 1,000줄 이상 entry에서 native platform 구현과 fresh Windows smoke를 소유 workflow로 이동한다. 기존 native build/lifecycle 단계가 약 400줄인 예외는 이번 이동의 무손실 검토를 위해 유지한다. 신규 정책·집계 모듈과 orchestrator는 300줄 이내로 둔다. updater/release 본문은 이동·수정하지 않는다.

- #60: 운영 계약·기준 실행 기록. #61: reusable fast lane 및 PowerShell parser/exit-code 계약.
- #62: exact artifact handoff/download/inventory와 독립 installer workflow.
- #63: core 의존 분리, compiler/lock/source cache key 및 갱신.
- #64: profile/변경 선택, platform별 native 경로 및 전체 gate.
- #59: 자식 의존성·구현 통합.
- 검증: `git diff --check` 및 해당 계층 계약 test.
- 커밋: `Task #64 Stage 1: 계층 계약과 구현`.

## Stage 2 — 회귀 검증

- 신규 단위 fixture, 실패 전파, 누락/불일치/모호성 conservative fallback 검증.
- 기존 automation 검사의 의미를 보존하며 분리된 파일/의존관계에 맞게 갱신.
- `node --test tests/ci-*.test.mjs`, `pnpm run test:automation`.
- 필요한 기본 제품/Studio 검사는 통합 후보에서 재실행.
- 커밋: `Task #64 Stage 2: 회귀 검증`.

## Stage 3 — 통합 수용

- candidate exact SHA를 독립 publish/task59 branch에 push하고 무게시 CI만 실행.
- 빠른 Windows/Linux 검사, native/package 및 기존 artifact 경로의 실제 결과 기록.
- run/job/step·cache·artifact ID/digest를 구분. 알려진 제품 환경 실패는 성공으로 우회하지 않는다.
- `pnpm run check:product-boundary`, `check:product-version`, `check:release-metadata`, `test:upstream`, `test:studio`, `build:studio`.
- timing summary와 canonical CI 가이드·관련 entry 링크 확인.
- 단계/최종 보고와 보드 완료 표시 후 parent PR 1개 생성. 미검증을 통과로 표시하지 않는다.
- 커밋: `Task #64 Stage 3 + 최종 보고서: 통합 수용 근거`.
