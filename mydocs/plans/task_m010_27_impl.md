# Task #27 구현계획서

수행계획서: [task_m010_27.md](task_m010_27.md)
GitHub Issue: [#27](https://github.com/postmelee/alhangeul-tauri/issues/27)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 출처 inventory | .github/action-pins.json | upstream tag/commit/action.yml 대조 |
| 2 | pin 정렬·재유입 방지 | workflow/composite, verifier, test | automation·actionlint |
| 3 | 정책·통합·PR | 공식 운영 문서·최종 보고 | 중립 기본 검사·원격 Windows/Linux full·리뷰 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| Action 정책 | docs/operations/ACTION_DEPENDENCIES.md | 동일 | OK | 반복 운영 계약 |
| CI·인덱스 | 기존 docs 경로 | 동일 | OK | 최소 보완 |
| task 기록 | mydocs 역할별 | 동일 | OK | 내부 증거 |

## Stage 1 — 출처 inventory

### 산출물

.github/action-pins.json과 upstream provenance 조사.

### 변경 내용

모든 외부 uses를 조사한다. release tag를 공식 upstream API로 resolved commit까지 재귀 대조한다. dtolnay는 tag 없는 stable snapshot과 compiler 정책을 구분한다. 각 repository의 action 입력·runtime 호환성, write-token/Pages/artifact 위험도를 기록한다.

### 검증

upstream git/ref/tag·commit·action.yml 비교, inventory 중복과 missing 검사, git diff --check.

### 커밋

Task #27 Stage 1: 외부 Action provenance inventory 확정

## Stage 2 — 정렬과 재유입 방지

### 산출물

모든 workflow와 composite uses, scripts/verify-action-pins.mjs, tests/action-pins.test.mjs, package.json·pnpm-lock.yaml, 기존 workflow tests.

### 변경 내용

동일 repository는 동일 승인 SHA로 정렬한다. release/ref 주석을 유지한다. 검사기는 workflow/composite의 외부 참조·full SHA·등록 identity/주석을 확인한다. floating/unknown/reusable/Docker·우회 문법의 실패 회귀를 제공한다. local 참조는 유지한다.

### 검증

node --test tests/action-pins.test.mjs; pnpm run check:action-pins; pnpm run test:automation; actionlint; git diff --check.

### 커밋

Task #27 Stage 2: 외부 Action SHA 정렬과 계약 검사

## Stage 3 — 운영 정책과 통합

### 산출물

승인 docs 정책·인덱스, 최종 보고와 오늘할일, PR.

### 변경 내용

갱신 시 tag/commit 검토·version 주석·inventory 동시 수정·rollback 원칙을 문서화한다. PR exact head에서 profile=full을 비게시 실행하고 code/workflow/권한/검증을 직접 리뷰한다. 실패가 있으면 같은 단계에서 수정 후 필요한 검사만 재실행한다. 사용자 명시 지시로 리뷰 후 merge·이슈 종료·부산물 정리한다.

### 검증

pnpm run check:product-boundary; pnpm run test:upstream; pnpm run test:studio; pnpm run build:studio; pnpm run typecheck:gui; actionlint; git diff --check; Windows/Linux ci.yml profile=full.

### 커밋

Task #27 Stage 3 + 최종 보고서: Action pin 운영과 검증 확정

## 검증

실패는 완료로 기록하지 않는다. full은 GUI/updater/릴리즈 수용을 대신하지 않는다. task 범위를 벗어나면 새 승인을 구한다.

## 커밋

각 단계 코드와 단계 보고는 함께 커밋한다. 원격 evidence는 exact source SHA를 유지하는 후속 기록 커밋으로 남긴다.

## 단계 의존성

Stage 1 출처 대조 뒤 Stage 2, 정적/회귀 통과 뒤 Stage 3으로 진행한다. 동일 스레드의 전체 수행·PR 리뷰·병합 지시를 진행 승인으로 기록한다.

## 위험과 대응

Action version 정렬은 입력 계약과 Windows/Linux full로 확인한다. 제품·권한·출력 identity는 변경하지 않는다.

## 원격 검증 보완

첫 full run 36723402631은 native/build와 개별 설치 3종이 성공했으나 installer-status와 result가 실패했다. 완료 후 동일 SHA·artifact·attempt의 기존 검증 함수를 같은 API 버전으로 재실행하면 모두 성공한다. 원격 응답 시점 문제 가능성은 아직 추정이며 최초 run을 전체 성공으로 기록하지 않는다. source를 바꾸지 않은 fresh full run 36730348163으로 전체 수용을 다시 확인한다. stale attempt의 artifact를 재사용하는 failed-job-only rerun은 수행하지 않는다.

## 승인 요청 사항

2026-09-30 사용자가 #27 수행·PR 생성·리뷰·병합과 이후 #28을 명시 승인했다. 위 3단계와 문서 위치는 해당 목적 내의 구현 선택이며 별도 배포/secret 권한을 포함하지 않는다.

검사 구현 세부: 기존 pnpm lock의 yaml 2.9.0을 직접 devDependency로 선언하고 YAML AST로 모든 uses를 검사한다. CLI는 설치된 개발 도구만 사용하며 runtime 제품 의존성은 바뀌지 않는다.

Stage3 운영 정렬: 기본 main의 scheduled upstream 정의는 여전히 가변 Action을 사용한다. 사용자 #27 PR 생성·리뷰·병합 지시의 실제 운영 완료를 위해 devel PR 병합 뒤 같은 publish/task27 head로 main 대상 운영 PR도 검토·병합한다. 두 PR diff에서 제품·pin·공개 파일·Pages 데이터 불변을 확인하고, 다른 task의 devel 변경은 head에 포함하지 않는다. 새 tag/Release/Pages 배포는 없다. 이슈 종료·ref 정리는 두 PR merge 확인 뒤 수행한다.
