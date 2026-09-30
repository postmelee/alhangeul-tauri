# Task #28 구현계획서

수행계획서: [task_m010_28.md](task_m010_28.md)
GitHub Issue: [#28](https://github.com/postmelee/alhangeul-tauri/issues/28)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 보호 정책·capability | .github/protection/devel.json | personal/admin·read-back·App identity |
| 2 | PR·committed pin | pr-acceptance.yml, scripts/tests, package | failure·Git mismatch·전체 중립 계약 |
| 3 | 실제 보호 수용·PR | 공식 정책·full run·PR/probe evidence | live pending/fail/pass·PUT/GET·리뷰·merge |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 보호 정책 | docs/operations/BRANCH_PROTECTION.md | 동일 | OK | 공식 운영 |
| 기존 개발/CI/기여/인덱스 | 기존 위치 | 동일 | OK | 최소 보완 |
| task 기록 | mydocs 역할별 | 동일 | OK | 내부 실행 |

## Stage 1 — 보호 payload 확정

### 산출물

.github/protection/devel.json. 현재 devel protection 404·rulesets[]·GitHub Actions app15368·유일 admin·App draft#78 근거.

### 변경 내용

strict=true, required check Alhangeul PR required/app15368, enforce_admins=true, required PR/reviewer0, force/delete=false, conversation resolution=true, restrictions=null. 개인 저장소 지원 필드만 사용한다. 자동 approve/merge·상시 bypass 없음.

### 검증

JSON 필드 검토·현재 API 증거·git diff --check. 실제 PUT는 Stage3 live check 성공 뒤에만 한다.

### 커밋

Task #28 Stage 1: devel 보호 정책과 적용 경계 확정

## Stage 2 — 자동 PR 검증

### 산출물

pr-acceptance.yml, scripts/ci/pr-acceptance.mjs, scripts/verify-committed-rhwp.mjs, tests/ci-pr-acceptance.test.mjs, tests/committed-rhwp.test.mjs, package.json·alhangeul-ci-fast.yml.

### 변경 내용

PR devel의 merge candidate SHA에서 기존 reusable fast 실행, draft도 실행, read-only/no secrets. always 최종 check는 reusable contracts.result=success만 인정한다. HEAD lock/gitlink, index gitlink, submodule HEAD가 다르면 local/PR에서 실패한다. root pnpm test에 committed+automation을 포함하고 candidate post-update/pre-commit upstream 경계는 유지한다.

### 검증

node --test tests/ci-pr-acceptance.test.mjs tests/committed-rhwp.test.mjs; pnpm run check:committed-rhwp; pnpm run check:action-pins; pnpm run test:automation; pnpm run test:upstream; pnpm run test:studio; pnpm run build:studio; pnpm run typecheck:gui; actionlint; git diff --check. Rust desktop는 이 호스트에서 실행하지 않는다.

### 커밋

Task #28 Stage 2: PR required check와 committed pin 검증 도입

## Stage 3 — 운영·원격 수용

### 산출물

공식 정책/개발/CI/기여/인덱스, live full/PR/probe·보호 read-back, 보고서와 PR.

### 변경 내용

#27 병합 후 최신 devel 통합. 비게시 full 실행과 정상 PR automatic required check 성공을 확인한 후 payload 리뷰·devel 보호 PUT·GET. 별도 probe PR에서 pending/BLOCKED→고의 Node assertion 실패/BLOCKED→복구 success를 관측하고 close·ref 삭제. 테스트는 기존 ci-*.test.mjs glob에 편입되는 임시 파일만 추가해 deterministic 실패를 만들고 floating dependency를 실행하지 않는다. maintainer draft에서 검사가 실행돼도 draft merge 불가를 확인한다. 기존 실제 App draft 및 최소 권한 정의와 새 trigger 경계를 정적으로 대조한다. App secret/새 upstream 후보 실행은 하지 않는다.

### 검증

full source/run identity; required check conclusion/App identity·PR mergeStateStatus·draft 상태; protection read-back; probe 실패 원인 로그; 변경 경계·문서 링크·diff; 일반 gh pr merge --merge --match-head-commit (관리자 bypass 없음).

### 커밋

Task #28 Stage 3 + 최종 보고서: devel 보호와 PR gate 수용

## 검증

실패/취소/누락은 성공으로 기록하지 않는다. 실제 bot 발급·다음 scheduled 성공은 미실행으로 구분한다. full은 GUI/updater/공개 수용이 아니다.

실제 API 수용 보완: 최초 보호 PUT는 legacy contexts와 App 지정 checks를 동시에 넣어 oneOf 스키마 HTTP422로 거부됐고 설정은 적용되지 않았다. 동일 App/context 정책을 유지하며 contexts 필드를 제거하고 checks만 보낸다. 전용 계약 test로 입력 필드의 중복을 거부한다. 변경은 보호 JSON·일반 Node test·task 기록뿐이며 full source와 제품/native/workflow/lock은 같으므로 fresh PR fast로 추가 수용한다. 수정 head의 실제 required check 성공 뒤 PUT·GET을 다시 수행한다.

## 커밋

각 stage 코드와 보고를 묶는다. source/evidence 후속 commit은 source SHA를 보존한다.

## 단계 의존성

정책 확정→코드/회귀→live gate/보호. #27 PR merge 전에 #28 PR은 게시/merge하지 않는다. 사용자 전체 수행·리뷰·병합 지시를 각 gate의 진행 근거로 기록한다.

## 위험과 대응

성공 check 관측 후 보호를 활성화하고 직접 push/force/--admin을 사용하지 않는다. 보호 복구는 저장 payload·명시 승인·최소 변경·read-back. main은 대상에 포함하지 않는다.

## 승인 요청 사항

동일 스레드의 #28 전체 수행·PR 생성·리뷰·병합 명시 지시에 따라 위 단계·문서 위치·실제 보호 gate를 수행한다.

Stage3 실행 순서 보완: #27 full의 장시간 Windows package 대기 중 독립 #28 source의 비게시 full을 먼저 실행할 수 있다. #27 병합 후 devel을 통합하고 변경이 task 기록뿐인지 대조한다. PR 생성·보호 적용·병합은 #27 완료 뒤에만 한다. runtime/workflow/lock 변경이 추가되면 기존 run을 재사용하지 않는다.

실제 pull_request check는 PR이 존재해야 검증 가능하므로, fast 성공 후 보호 활성화 전 준비 PR을 연다. #27 완료 뒤 full의 장시간 Windows build 대기와 PR automatic fast를 병렬 검증할 수 있다. 본문에는 full·Stage3 live check·보호·probe가 진행 중임을 표시하며 full 성공 전 보호 PUT 또는 merge는 수행하지 않는다. 그 동일 PR에서 증거와 최종 보고서를 추가하고 최종 head의 새 automatic required check 성공을 확인한 뒤 리뷰·병합한다. 완료되지 않은 live 수용을 완료로 기록하지 않는다.

병행 task90의 PR91이 별도 작업자에 의해 devel에 병합됐다. README·site·Node 관리 참조/검사도 바뀌었으므로 기존 독립 full의 task28 source와 동일하다고 간주하지 않는다. PR 게시 순서는 #27 완료 뒤로 유지하되, 검증 대기 중 최신 devel을 먼저 통합해 새 full을 실행한다. #27 후속 보고 기록은 코드가 같을 때만 문서 diff 근거로 수용한다. user task90 worktree는 현재 devel을 사용 중이므로 해당 checkout이나 변경을 수정하지 않는다.
