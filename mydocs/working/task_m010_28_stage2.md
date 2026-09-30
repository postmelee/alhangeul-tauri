# Task #28 Stage 2 — PR required check와 committed pin 검증

GitHub Issue: [#28](https://github.com/postmelee/alhangeul-tauri/issues/28)
구현계획서: [task_m010_28_impl.md](../plans/task_m010_28_impl.md)
Stage: 2

## 단계 목적

비밀 없는 자동 PR gate와 committed lock/gitlink의 기본 수용 경계를 구현한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| pr-acceptance.yml | devel PR/draft events·read-only·merge SHA·always required 집계 |
| scripts/ci/pr-acceptance.mjs | reusable contracts success만 통과, 누락/실패/취소/skip 거부 |
| scripts/verify-committed-rhwp.mjs | 기존 current pin 위에 HEAD lock/gitlink 일치 요구 |
| ci-pr-acceptance·committed-rhwp test | 7회귀, real Git staged/unstaged/HEAD 불일치·복구 |
| package.json·alhangeul-ci-fast.yml | local 기본·PR 계약에 strict committed/automation 편입 |
| actions-workflows.test.mjs | 신규 workflow를 기존 전수 contract inventory에 등록 |

## 본문 변경 정도 / 본문 무손실 여부

제품·pin·upstream source·secret·candidate post-update/pre-commit test:upstream은 유지했다. PR 검증 정의와 local acceptance만 추가했다.

## 검증 결과

- OK: 신규 focused 7/7. 실제 임시 Git repo에서 lock/submodule만 전진, index까지 전진하지만 HEAD 이전인 상태를 각각 거부하고 commit 뒤 성공.
- OK: 전체 automation 1016/1016, upstream39/39, Studio235/235·build, GUI typecheck.
- OK: check:committed-rhwp v0.8.6/f1f9c6a, Action pins YAML26/외부153/pin11.
- OK: actionlint -shellcheck=, product-boundary, git diff --check.
- 초기 회귀 보정: tempdir의 symlink 경로를 realpath로 확정했고 기존 workflow inventory에 신규 파일을 추가했다. 제품 회귀는 없다.

## 잔여 위험

PR actual event·required check App identity·protection PUT/GET·pending/failure BLOCKED는 Stage3에서 확인한다. 새 bot token 발급은 미실행으로 구분한다.

## 다음 단계 영향

#27 merge 후 devel 통합, 정책·full/automatic PR 검증·보호 설정·probe 수용을 수행한다.

## 승인 요청

사용자 전체 수행·PR 리뷰·병합 지시에 따라 Stage3을 진행한다. 실제 보호는 automatic 성공 확인·payload 리뷰 뒤 적용한다.
