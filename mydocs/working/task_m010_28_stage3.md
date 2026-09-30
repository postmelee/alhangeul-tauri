# Task #28 Stage 3 — 실제 PR gate·devel 보호 수용

GitHub Issue: [#28](https://github.com/postmelee/alhangeul-tauri/issues/28)
구현계획서: [task_m010_28_impl.md](../plans/task_m010_28_impl.md)
Stage: 3

## 단계 목적

공식 정책·개발/검증 문서를 보완하고 정상/실패/복구/draft PR과 실제 보호 API를 대조한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| docs/operations/BRANCH_PROTECTION.md | devel 보호·required check·승인0·bot/pre-commit 경계·적용/rollback |
| CONTRIBUTING.md·docs/DEVELOPMENT.md·operations/CI_VALIDATION.md·docs/README.md | 기존 위치 최소 보완 |
| .github/protection/devel.json·tests/ci-pr-acceptance.test.mjs | 실제 API의 checks 단일 입력 수용 |
| task 기록·오늘할일 | source/run·API·probe 증거와 사용자 전체 진행 승인 |

## 본문 변경 정도 / 본문 무손실 여부

기존 문서는 필요한 링크와 수용 계약만 보완했다. #27 PR93·94와 병행 PR91/92의 기존 변경을 통합·보존했다. 제품·rhwp pin·권한·Release/Pages·서명은 변경하지 않았다. full 이후 runtime/workflow/lock은 동일하며 정책 JSON의 중복 legacy contexts 제거·Node 회귀와 task 기록만 추가했다.

## 검증 결과

- OK: 최신 devel 통합 automation1027/1027, upstream39/39, Studio235/235·build·GUI typecheck, boundary722, committed v0.8.6/f1f9c6ae, action pin YAML26/uses153/pin11, actionlint/diff.
- OK: [full36731879894](https://github.com/postmelee/alhangeul-tauri/actions/runs/36731879894), source c558c9681e662e13e73f1517e2fd007b97d5dffb. fast·core3종·build3종·installer3종·installer-status/result 전체 success. 첫 독립36727359689는 새 통합 source 검증으로 대체해 취소했다.
- OK: [PR95](https://github.com/postmelee/alhangeul-tauri/pull/95) 실제 opened 자동 run36738916021에서 required 성공, Node1027·upstream39·Studio235. 실행 checkout은 merge candidate b27422fb이고 GitHub check는 feature head9444a6e4에 연결된다. App15368/github-actions 확인.
- API 보완: legacy contexts와 checks를 함께 보낸 첫 PUT는 oneOf HTTP422로 거부됐고 재조회도404였다. contexts를 제거하고 정책 의미는 유지했다. Node5 전용 회귀 및 [수정 head 자동36740327428](https://github.com/postmelee/alhangeul-tauri/actions/runs/36740327428), source cddc8369c0191687af809fcc1fe340435b4a65b7에서 세 PR jobs 전체 success.
- OK: 보호 PUT 성공 후 GET read-back이 checks/context App15368, stricttrue, PR/review0, admintrue, force/deletefalse, conversationtrue, linearfalse, lockfalse, no bypass와 일치한다. 응답은 legacy contexts를 정규화하고 null restrictions를 생략한다. 적용 전404 백업과 후속 응답은 credential 없이 정책 필드만 기록했다.
- OK: [probe PR96](https://github.com/postmelee/alhangeul-tauri/pull/96). pending/required 미실행에서 BLOCKED; negative1953f2c2의 [36741319115](https://github.com/postmelee/alhangeul-tauri/actions/runs/36741319115)는 고의 assertion1개만 실패(1028 중1027pass)하고 required FAILURE/BLOCKED. 복구7ccb0e7e의 [draft36742272647](https://github.com/postmelee/alhangeul-tauri/actions/runs/36742272647)은 required success/isDraft=true/mergeStateStatus=CLEAN. draft 상태는 isDraft를 별도 확인하고 실제 merge 시도는 하지 않았다([GitHub draft 정책](https://docs.github.com/en/pull-requests/reference/pull-requests#draft-pull-requests)). converted_to_draft의36742258037은 복구 synchronize로 대체돼 cancelled로 확인했으며 성공으로 기록하지 않는다. ready 전환 후 새 [36742953344](https://github.com/postmelee/alhangeul-tauri/actions/runs/36742953344)도 required success/isDraft=false/CLEAN. PR96은 CLOSED·mergeCommit=null이고 remote probe ref를 삭제했다. 복구 tree는 실제 task28 code head cddc8369와 동일하며 fixture는 devel에 들어가지 않는다.

## 잔여 위험

신규 App token·새 upstream pin 후보는 실행하지 않았다. 기존 실제 App PR78은 draft 생성 이력과 현재 MERGED 상태로 확인했고 최소 contents/pull_requests 권한·actor 조건 없는 일반 PR event를 대조했다. maintainer draft의 실제 실행을 bot 신규 발급 실험으로 확대하지 않는다. full은 NSIS 활성화 제한·MSI 재부팅 후 미검증을 포함하며 GUI/최신 VDI/Release 수용은 아니다. main 보호·#28 main 승격은 대상 밖이다.

## 다음 단계 영향

최종 보고·오늘할일을 같은 PR95에 반영하고 최종 head의 fresh required check·최신 base·직접 코드 리뷰를 확인한 뒤 일반 merge한다. 관리자 bypass·force push는 사용하지 않는다.

## 승인 요청

같은 스레드의 #28 전체 수행·PR 생성·리뷰·병합 명시 지시를 각 단계·문서 위치·실제 보호 적용의 승인 근거로 적용했다.
