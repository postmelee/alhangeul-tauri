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

## 2026-09-07 통합 수용 결과

- 전체 run 34063530307: success, 필수 11개 job 통과. 새 Windows MSI/NSIS와
  Linux x64/arm64 package lifecycle을 포함한다.
- 재사용 run 34065755394: success. 제품 2300984, harness 1d2bda6,
  Windows archive ID 9998755524의 digest/inventory 검증 후 MSI/NSIS 통과.
- 같은 후보 arm64 product 재실행 34065744901: success. native 1,259초,
  첫 실행은 1,164초. 두 번 모두 Cargo miss여서 계획한 warm 비교는 성립하지 않았다.
  cache 저장/동일 key와 실제 재컴파일 시간은 기록했고, restore·warm 성능은 미입증으로
  최종 보고와 PR에 공개한다. 개별 cache 제거 사유는 확인하지 않았다.
- #60–#64 Stage 3·최종 보고를 각 branch에서 commit한 후 부모에 fast-forward 통합했다.
  위의 당시 진행 기록과 잘못된 SHA dispatch 취소 이력은 보존한다.

## Stage 4 — 승인된 warm 재측정의 PR 통합

2026-09-08 작업지시자의 이번 PR 포함 지시를 적용한다. [#63 Stage 4 계획](task_m010_63_impl.md)에
따라 기존 후보를 재측정하고 부모 보고서와 PR #66을 갱신한다.

- run 34065744901 attempt 2: success. 같은 SHA/image/compiler/검증 범위에서 source/target
  exact hit를 확인했고 arm64 native 1,259초 → 795초, 464초(36.85%) 감소를 기록한다.
- 과거 miss 이력과 cache 보존 한계를 유지한다. 다른 플랫폼·source 및 전체 CI 개선율로 확대하지 않는다.
- 문서 위치는 기존 mydocs/working·report, 오늘할일 20260908.md와 이미 승인한 CI 운영 가이드를 유지한다.
- 검증: 이전 PR head 이후 실행 코드 diff 없음, 문서 상대 링크·필수 보고서 섹션 및
  git diff --check, 정확한 parent/head와 문서 고정 링크 확인.
- #63 단계를 부모에 fast-forward 통합하고 Stage 4 보고·최종 보고를 commit한 뒤
  publish/task59를 push하고 기존 Open PR #66의 결과와 고정 문서 링크를 갱신한다.

## Stage 5 — 승인된 PR 리뷰 보정

작업지시자의 타당한 리뷰 항목 보정 및 PR 코멘트 게시 지시를 적용한다.

- profile별 concurrency와 fast에만 적용하는 취소 정책, installer 입력의 조기 형식 검사,
  handoff 전에 생성하는 실제 진단 JSON과 always 단계 결과 기록을 보완한다.
- Cargo source cache의 OS/architecture prefix fallback을 추가하되 target 경계는 보존한다.
- legacy provenance/JSON 오류를 구분하고 selectValidation의 경로 분류와 scope 결정을 분리한다.
- build_ref 입력 설명, 부분 검증 재사용 설명, 두 신규 download action의 pin을 정렬하고
  미사용 digest 출력과 중복 target env를 정리한다. 현재 결함이 아닌 matrix 확장·pwsh 지원이나
  재현되지 않은 Windows core cache 경고는 변경하지 않는다.
- 문서 위치는 기존 docs/operations/CI_VALIDATION.md와 mydocs 계획·working·report·orders다.
  신규 helper는 300 LOC/함수 50 LOC/복잡도 10 이하로 유지한다.
- 검증: CLI 누락·malformed 입력/진단 실패 fixture, legacy·손상 inventory 오류, 보수적 선택 회귀,
  source/target cache 경계 및 concurrency 계약, pnpm run test:automation, actionlint, diff --check.

## Stage 6 — 최신 devel 정합성과 원격 보정 검증

- 이미 병합된 #19의 devel 변경 때문에 생긴 PR 충돌을 기존 결과를 보존하며 통합한다.
  주 worktree와 미병합 작업 branch는 수정하지 않는다. history rewrite 없이 merge commit을 사용한다.
- 분리된 fast/platform workflow에 최신 devel의 검사·제품 경계를 보존하고 통합 회귀를 실행한다.
- 새 후보의 fast 및 Windows/Linux 전체 artifact 수용을 실행한다. 기존 exact Windows archive로
  새 harness의 installer 성공과 의도한 handoff 실패를 검사하고, 실패 시에도 진단 artifact가 남는지 확인한다.
- 서로 다른 profile 실행의 비취소를 확인한다. 의도한 negative run 실패를 성공 수용과 구분한다.
- 단계·최종 보고, PR 본문과 고정 링크를 갱신하고 두 리뷰 코멘트에 대응하는 보정 결과를
  PR #66의 코멘트로 게시한다. PR merge·issue close·release는 수행하지 않는다.
