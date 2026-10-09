# Task #113 Stage 4.9 — 최종 결과 안내·GitHub 본문 공개 수용

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.9
확인일: 2026-10-09 23:15 (Asia/Seoul)

## 단계 목적

[실제011→012 지원3종 수용](task_m010_113_stage4.8.md)을 사용자 원문에 반영하고 새 source의
전체 generic·필수 CI 후 승인된 exact GitHub 본문만 공개한다. 웹/updater는 실제 merged devel
SHA의 후속 Pages 승인 gate이며 이번 공개 범위와 구분한다.

## 산출물

| 파일/대상 | 결과 |
|---|---|
| [Stage4.9.1](task_m010_113_stage4.9.1.md) source6·기록 | 승인된 최종 문구·고정 fixture·generic1360/집중369 통과 |
| 기존 PR120 | source/report headff1cea2b normal push·required3job 전체success |
| Release407055948 | body-only6208bytes/d932d5f3... 실제 PATCH·read-back 수용 |
| 기존 plan/report/orders·docs/releases | 실행/검산·현재 공개 상태·남은 gate 기록 |

## 본문 변경 정도 / 본문 무손실 여부

기존 주요 변화·metadata6 installers·3signature/key·제한 문구와 이전 실패/단계 snapshot을 보존했다.
GitHub mutation payload는 body1필드뿐이다. installer11 identities·tag·Stable/latest·공개시각과
현재 production feed58ca는 불변이다. version/source/publishedAt를 새 notes 게시 시각으로 바꾸지 않았다.

## 검증 결과

### 실제 source/generic와 required

[4.9.1 보고](task_m010_113_stage4.9.1.md)의 실제 source6 after hashes·automation1360/집중369·
fail/skip0·GUI types·기본 checks/notes2·Pages19/23·upstream39·Studio283/build를 재사용한다.
단순 결과 기록 때문에 같은 generic을 반복하지 않았다. 승인 generated3과 실제 output이 byte 일치다.

[required37941878782](https://github.com/postmelee/alhangeul-tauri/actions/runs/37941878782)/attempt1:
Node·Windows·required3job 전체success다. Node automation1360/upstream39/Studio283,
Windows notes124/production88·PowerShell 계약을 완료 로그에서 확인했다.

| identity | 실제 값 |
|---|---|
| source head | `ff1cea2bb9b0e22e419e04e780f3779d68d1e6f1` |
| base devel | `1f33d03918b50a5b9140978a9eb28d1b5e65ebe6` |
| 실제 merge checkout | `7402feec6127dd7f4d242218dc1fe72d4ca7e2c0` |
| source/merge 같은 tree | `5a3c11921cf0131321a6d7760e1bb768eb0ac5dc` |

merge parents가 base/head이고 actual checkout 로그와 tree가 일치한다. MERGEABLE·CLEAN을
확인했으나 merge하지 않았다. 이 보고 commit 이후 head의 필수 CI는 다시 확인한다.

### GitHub body-only 실제 공개

실행 경로는 승인된 structured JSON payload의 GH API PATCH 후 독립 GET이다.

```bash
gh api --method PATCH repos/postmelee/alhangeul-tauri/releases/407055948 --input /private/tmp/task113-final-guidance-proposal/body-publication-payload.json
gh api repos/postmelee/alhangeul-tauri/releases/407055948
```

- 실행 직전 original body6186/03cde7aa...·최신Stable Release407055948·11assets·
  publish headff1/base1f33·tag198e→main6d·production manifest2371/58ca를 새로 읽어 확인했다.
- actual-generated body6208/SHA256 `d932d5f3a4e26cb07d38fe467dee4f86b6676cda4feb340fda64ec7040005e92`
  와 승인 payload가 같음을 검산한 뒤 body만 한 번 PATCH했다. intent/응답/독립 GET을 보존했다.
- 원격 byte read-back 일치. 11asset의 id/name/size/digest/url/state/content_type,
  Release id/tag/채널/target/공개시각/name, tagobject198ebba775a4fa885c7ae3fb52a17eca1e486e79·
  resolved product6dcb05e96ec2075d09d8a60160e1d82f08c0811b, latest 모두 그대로다.
- 실제 body 검산시각 `2026-10-09T14:12:41.655557+00:00` / 2026-10-09 23:12:41 KST다. Release 공개시각은
  `2026-10-08T16:49:38Z`를 유지했다. asset/서명 재업로드·새 tag·build/signing은 하지 않았다.
- 공개 production feed를 before/after 새 HTTP200으로 읽어2371/hash58ca348b... 동일을 확인했다.
  Pages는 dispatch하지 않았으며 PR120·Issue113은 OPEN이다.

[현재 공개 본문](https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.2)은 실제3종
앱 내 업데이트·설정·HWP/HWPX 수용 문구를 표시한다. raw JSON 응답과 receipt는
`/private/tmp/task113-final-guidance-proposal/body-publication-*.json`에 보존한다.

### 웹/feed 후속 입력

branch HTML source9166/0452b06a...·normalized9157/1869e70d...·short550/1fec449b...·
향후 manifest2434/f7517e3d...는 승인본과 실제 출력이 같다. 새 manifest는 notes1필드만 바뀌며
version/pub_date/platform3 URL/Minisign signatures가 기존58ca와 같다. 과거 native acceptance는
검증 당시58ca와 형식별 bcH/37828940744·H8a/37832348063를 그대로 기록한다.

## 잔여 위험

- Pages1f33의 웹/feed는 기존 미검증 안내다. 현재 GitHub 본문과 branch final data를 구분한다.
- 기존 NSIS thumbnail·MSI3010 재부팅 후·Authenticode·물리 환경/성능 제한은 유지한다.
- 두 과거 whole failure를 소급 성공 처리하지 않았다. notes-only 새 manifest를 actual native
  run의 원래 입력으로 쓰거나 historical 고정spec을 바꾸지 않는다.

## 다음 단계 영향

보고/공개 기록을 기존 PR120에 normal push한다. 새 exact head required·base/head/tree·current
Release/body/feed/Issue 상태를 구체 입력으로 확정해 PR120 일반 merge 승인을 받는다.
실제 merged devel SHA의 Pages 배포·HTTP23/화면 검산·Issue113 close/cleanup이 남는다.

## 승인 요청

이번 승인된 최종 안내6파일·전체 generic/required·body-only 공개/검산은 완료했다.
다음 승인은 최신 PR120 일반 merge이며 실제 merged SHA의 Pages는 그 결과로 별도 승인받는다.
