# Task #28 최종 보고서 — devel 보호와 자동 PR 수용

GitHub Issue: [#28](https://github.com/postmelee/alhangeul-tauri/issues/28)
마일스톤: M010

## 작업 요약

- 대상 #28, M010, 단계3개.
- devel 변경을 PR과 실제 GitHub Actions 필수 검사로 수용하며 단독 maintainer 운영·App draft·비상 복구 경계를 명시한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| .github/protection/devel.json | 실제 적용한 정책 payload | devel PR/check/admin/force/delete |
| .github/workflows/pr-acceptance.yml | opened/sync/reopen/ready/draft 자동 fast·always 단일 gate | merge candidate, read-only/no secrets |
| .github/workflows/alhangeul-ci-fast.yml | committed rhwp 검사 | 수용 source, 기존2jobs 보존 |
| scripts/ci/pr-acceptance.mjs·verify-committed-rhwp.mjs | 미완료 결과 거부·HEAD/index/submodule lock 정합 | CI/local 수용 |
| tests/ci-pr-acceptance.test.mjs·committed-rhwp.test.mjs·actions-workflows.test.mjs·package.json | 7 회귀·default test 편입·inventory | 기존 candidate pre-commit 경계 보존 |
| 공식 정책·개발·CI·기여·인덱스 | 운영/rollback·check/pin 안내 | docs 공식 루트·기존 기여 문서 |
| mydocs 기록 | #28 증거, #27 운영 보고 통합·orders | 내부 기록 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| BRANCH_PROTECTION.md | docs/operations | docs/operations | OK | 수행계획서 위치 판단 일치 |
| CONTRIBUTING·DEVELOPMENT·CI_VALIDATION·docs/README | 기존 위치 | 기존 위치 | OK | 기존 문서 최소 보완 |
| stage·final 기록 | mydocs/working·report | mydocs/working·report | OK | 공식 정책과 실행 증거 분리 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| devel 보호 | GET404/없음 | PR·App15368 check·strict·admin 적용 |
| 자동 PR required check | 없음 | Alhangeul PR required, Linux Node/Studio + Windows PowerShell |
| force push·deletion | 보호 없음 | false/false |
| GitHub 필수 승인 | 없음 | 0, 사용자 승인·COMMENT 코드 리뷰 유지 |
| committed pin 검증 | working/index 중심 | HEAD lock/gitlink까지 일치 요구 |
| automation | 초기 #27 base1009 | 최신 devel 통합1027/1027 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 실제 devel PR/check/admin 보호·force/delete 제한 | OK — PUT 성공·GET 필드 parity, no bypass |
| 정상 PR 검사 자동 실행·수용 교착 회피 | OK — PR95 opened/수정 head actual required success, App15368, CLEAN |
| 미완료·실패 차단·복구·draft | OK — probe PR96 pending/실패 BLOCKED, 복구 draft 검사 success/isDrafttrue, ready의 fresh check success/CLEAN; 병합 없이 close·ref 삭제 |
| committed rhwp·기존 candidate 경계 | OK — 전용7회귀(real Git2 포함), v0.8.6/f1, 후보 post-update 검사는 HEAD 강제 안 함 |
| Node·Studio·native/package 통합 | OK — automation1027, upstream39, Studio235/build/typecheck, full36731879894 전체 gates success |
| policy API schema·문서·rollback | OK — 중복 legacy contexts HTTP422을 checks-only로 보정, 공식 정책·read-back |

### 단계별 검증 결과

- [Stage1](../working/task_m010_28_stage1.md): 공개 개인 repo capability·App/context·policy.
- [Stage2](../working/task_m010_28_stage2.md): 자동 gate·committed pin·7 회귀.
- [Stage3](../working/task_m010_28_stage3.md): full·실제 PR·보호·probe.
- [full36731879894](https://github.com/postmelee/alhangeul-tauri/actions/runs/36731879894), source c558c9681e662e13e73f1517e2fd007b97d5dffb. 이전36727359689는 취소됐으며 성공으로 재분류하지 않는다.
- [PR95 최초36738916021](https://github.com/postmelee/alhangeul-tauri/actions/runs/36738916021), feature9444a6e4·checkout mergeb27422fb; [정책 보정36740327428](https://github.com/postmelee/alhangeul-tauri/actions/runs/36740327428), featurecddc8369: actual required success. GitHub check는 feature SHA에 붙고 실행 source는 merge candidate인 경계를 기록한다.
- full source 이후 변경은 policy JSON의 contexts 제거·해당 Node 회귀·문서뿐이다. 제품/native/workflow/lock diff는 없고 추가 Node 계약은 fresh PR fast로 수용했다. 최종 보고 후 최신 head 자동 check 성공은 병합 전 PR 리뷰에 기록한다.
- OK: [probe PR96](https://github.com/postmelee/alhangeul-tauri/pull/96). pending/required 미실행에서 BLOCKED; negative1953f2c2의 [36741319115](https://github.com/postmelee/alhangeul-tauri/actions/runs/36741319115)는 고의 assertion1개만 실패(1028 중1027pass)하고 required FAILURE/BLOCKED. 복구7ccb0e7e의 [draft36742272647](https://github.com/postmelee/alhangeul-tauri/actions/runs/36742272647)은 required success/isDraft=true/mergeStateStatus=CLEAN. draft 상태는 isDraft를 별도 확인하고 실제 merge 시도는 하지 않았다([GitHub draft 정책](https://docs.github.com/en/pull-requests/reference/pull-requests#draft-pull-requests)). converted_to_draft의36742258037은 복구 synchronize로 대체돼 cancelled로 확인했으며 성공으로 기록하지 않는다. ready 전환 후 새 [36742953344](https://github.com/postmelee/alhangeul-tauri/actions/runs/36742953344)도 required success/isDraft=false/CLEAN. PR96은 CLOSED·mergeCommit=null이고 remote probe ref를 삭제했다. 복구 tree는 실제 task28 code head cddc8369와 동일하며 fixture는 devel에 들어가지 않는다.

## 잔여 위험과 후속 작업

### 잔여 위험

- 필수 승인0은 2인 승인을 보장하지 않는다. 관리자도 PR/check를 따르고 사용자 승인·직접 코드 리뷰를 기록한다.
- 신규 App token 발급·새 upstream pin 후보 live 실행은 수행하지 않았다. 기존 App #78의 draft 생성 이력/현재 MERGED, 최소 권한과 actor-neutral event를 검토하고 maintainer draft를 실제 검증했다.
- NSIS hosted 진단 제한·MSI 재부팅 후 미검증·전체 GUI/최신 VDI·공개 Release 수용은 그대로 구분한다. Release/Pages/서명/updater를 활성화하지 않았다.
- 현재 기본 main의 보호/이번 workflow 승격은 이번 devel 범위에 포함하지 않는다.

### 후속 작업 후보

- 필요 시 별도 작업에서 main required workflow·보호를 실제 PR로 검증하고 적용한다.

## 작업지시자 승인 요청

사용자의 #28 전체 수행·PR 생성·리뷰·병합 명시 지시로 실제 payload·정상/실패/draft 검증을 수행했다. 이 승인에 따라 최종 head required 성공·직접 리뷰 뒤 normal merge하고 이슈·전용 부산물을 정리한다. 기존 사용자 dirty 작업과 다른 worktree는 보존한다.
