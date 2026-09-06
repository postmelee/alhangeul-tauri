# Task #59 구현계획서

GitHub Issue: [#59](https://github.com/postmelee/alhangeul-tauri/issues/59)
수행계획서: [task_m010_59.md](task_m010_59.md)

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
- 커밋: `Task #59 Stage 1: 계층 계약과 구현`.

## Stage 2 — 회귀 검증

- 신규 단위 fixture, 실패 전파, 누락/불일치/모호성 conservative fallback 검증.
- 기존 automation 검사의 의미를 보존하며 분리된 파일/의존관계에 맞게 갱신.
- `node --test tests/ci-*.test.mjs`, `pnpm run test:automation`.
- 필요한 기본 제품/Studio 검사는 통합 후보에서 재실행.
- 커밋: `Task #59 Stage 2: 회귀 검증`.

## Stage 3 — 통합 수용

- candidate exact SHA를 독립 publish/task59 branch에 push하고 무게시 CI만 실행.
- 빠른 Windows/Linux 검사, native/package 및 기존 artifact 경로의 실제 결과 기록.
- run/job/step·cache·artifact ID/digest를 구분. 알려진 제품 환경 실패는 성공으로 우회하지 않는다.
- `pnpm run check:product-boundary`, `check:product-version`, `check:release-metadata`, `test:upstream`, `test:studio`, `build:studio`.
- timing summary와 canonical CI 가이드·관련 entry 링크 확인.
- 단계/최종 보고와 보드 완료 표시 후 parent PR 1개 생성. 미검증을 통과로 표시하지 않는다.
- 커밋: `Task #59 Stage 3 + 최종 보고서: 통합 수용 근거`.

## 2026-09-07 복구 후 진행 기록

- 작업 위치: `/private/tmp/alhangeul-task59`, 부모 `local/task59`에 #60–#64 Stage 1/2 통합.
- 부모 Stage 1/2와 운영 문서를 커밋했다. local 자동화 554개, upstream 36개,
  Studio 132개·build·GUI typecheck 및 workflow 문법 통과.
- 전체 후보: `230098401df7d893a26b54b62b780081d3553dda`,
  [run 34063530307](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307),
  artifact/all/full/tests=true, publish_release=false. 이 기록 시점 전체 run은 진행 중이다.
- fast 2개, core 3개, Linux native/package 2개 job은 통과했다. Windows package와
  설치·전체 결과 gate가 남아 있으므로 전체 수용 완료로 기록하지 않는다.
- 첫 dispatch [34063510854](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063510854)는
  입력 SHA 오기 때문에 취소했다. 정확한 SHA를 확인한 위 run으로 대체했으며 성공 근거가 아니다.
- 전체 생산 성공 후 같은 후보의 Linux arm64/product/tests=true로 대표 native cache warm
  검증을 한 번 수행한다. 첫 실행과 같은 build workload만 비교하고 모든 OS의 warm 성능으로
  확대하지 않는다. Windows는 첫 성공 archive의 exact ID/digest로 installer profile을 검증한다.
- warm dispatch까지 원격 publish/task59의 후보 SHA를 유지한다. 그 후 문서 통합 commit을
  push해 product/harness SHA가 다른 installer 재사용을 확인한다. 최종 보고·PR은 이 결과 이후다.
