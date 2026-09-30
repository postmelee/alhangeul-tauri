# Task #28 Stage 1 — devel 보호 정책과 적용 경계

GitHub Issue: [#28](https://github.com/postmelee/alhangeul-tauri/issues/28)
구현계획서: [task_m010_28_impl.md](../plans/task_m010_28_impl.md)
Stage: 1

## 단계 목적

실제 capability와 단일 maintainer의 유지관리 경계를 기준으로 보호 payload를 준비한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| .github/protection/devel.json | strict PR check/App15368·admin enforcement·PR/reviewer0·force/delete 금지 |

## 본문 변경 정도 / 본문 무손실 여부

설정 payload만 신규 작성했다. 원격 보호는 아직 변경하지 않았다.

## 검증 결과

- OK: public personal repository, postmelee 유일 admin, merge commit 허용.
- OK: 현재 devel protected=false, protection 404, rulesets []. main 기본·일반 개발 devel 유지.
- OK: 실제 #27 check_runs의 github-actions app_id=15368, App token 후보 #78 author app/alhangeul-rhwp-sync-bot·draft·base devel.
- OK: Actions 기본 contents read, workflow self-approve permission false. 변경하지 않았다.
- OK: payload JSON·required check/strict/admin·force/delete·reviewer0·personal repository 필드 확인, git diff --check.
- 근거: GitHub protected branch REST와 reviewer count0 지원 공식 문서를 확인했다.

## 잔여 위험

required check를 관측하기 전 적용하면 정상 PR을 막을 수 있다. Stage3의 실제 automatic check 성공 뒤 PUT/GET을 수행한다. main은 이번 이슈 적용 대상이 아니다.

## 다음 단계 영향

비밀 없는 PR gate와 committed pin 검증을 구현한다. 단독 maintainer를 차단하는 reviewer1은 강제하지 않고 실제 리뷰 COMMENT와 사용자 승인을 남긴다.

## 승인 요청

사용자의 전체 수행·PR 리뷰·병합 지시에 따라 Stage2를 진행한다. 원격 payload 적용은 Stage3의 구체 결과와 payload 리뷰 뒤에 수행한다.
