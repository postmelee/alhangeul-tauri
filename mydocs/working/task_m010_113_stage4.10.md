# Task #113 Stage 4.10 — PR120 일반 merge·최종 Pages 입력 수용

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.10
확인일: 2026-10-09 23:31 (Asia/Seoul)

## 단계 목적

명시 승인된 최종 안내 PR120을 일반 merge하고 실제 devel SHA·tree를 확정한다.
그 SHA의 최종 웹/feed output을 고정해 다음 배포 승인을 받을 수 있게 한다.

## 산출물

| 대상/파일 | 결과 |
|---|---|
| PR120 | 일반 merge 완료·parents/tree/required/current refs 검산 |
| task113 owned checkout | 실제 merged devel로 ff-only; 사용자 local/task69 untouched |
| Pages output/inventory | 실제 SHA의23파일·manifest2434/f751·관련151 검증·고정 |
| 기존 plan/report/orders·docs/releases·본 보고 | 승인/병합·현재 공개와 향후 배포 구분 |

## 본문 변경 정도 / 본문 무손실 여부

제품 source6d·installer11/서명·tag/key/endpoint·GitHub body6208·현 production feed58ca를
변경하지 않았다. 기존 source/문서 내용과 실패 snapshot을 보존하고 병합 결과만 추가했다.
이 기록의 후속 로컬 commit은 deploy SHA를 바꾸지 않는다. 원격 devel과 Pages 입력은 아래 S다.

## 검증 결과

승인 입력 head64576f4f/base1f33·required37942845348/attempt1의 전체3job success,
MERGEABLE·CLEAN·closingIssuesReferences=[]·Issue113OPEN·body6208/11assets/feed58ca를
실행 직전 다시 확인했다. structured payload는 merge_method=merge·head sha guard를 사용했다.

| identity | 실제 값 |
|---|---|
| PR | [120 MERGED](https://github.com/postmelee/alhangeul-tauri/pull/120) |
| actual merged devel S | `2a78e11375c8fe6fcb6c6259247b8825e83b1f49` |
| merge 시각 | `2026-10-09T14:23:46Z` / 2026-10-09 23:23:46 KST |
| parent1/base | `1f33d03918b50a5b9140978a9eb28d1b5e65ebe6` |
| parent2/head | `64576f4f8cdb299d7a292a5a2b281585ecbc67df` |
| 실제 merge tree | `a5621f52d8fa9d7a7576fd648718e4266b59d9c3` |
| required run | [37942845348 SUCCESS](https://github.com/postmelee/alhangeul-tauri/actions/runs/37942845348) |

GitHub PUT의 응답 뒤 독립 GET·devel ref·실제 commit parents/tree를 검산했다. 실제 tree는
CI가 실행한 synthetic0fed93ec 및 PR head와 같다. full automation1360/GUI/types·upstream39/
Studio283 및 형식별 actual native acceptance는 동일 tree/source/evidence 근거로 재사용한다.
전체 native run을 다시 실행하지 않는다. 처음 두 whole failure는 그대로다.

실행 명령:

```bash
git fetch origin devel
git merge --ff-only origin/devel
pnpm run build:pages
pnpm run check:pages
node --test tests/updater-release.test.mjs tests/pages.test.mjs tests/actions-workflows.test.mjs
```

- task113 owned local/task113 checkout을 깨끗한 상태에서 S로 ff-only 정렬했다. root 사용자
  checkout이나 별도 사용자가 점유한 local devel branch를 전환/리셋하지 않았다.
- S tree에서 build source19/root assets2, check source19/output23, 지정151/151·fail/skip0 통과다.
- raw output23개를 `/private/tmp/task113-pr120-merge/pages-output`에 고정하고 inventory에
  파일별 size/SHA256을 기록했다. 제안 source와 같은 normalized HTML9157/1869e70d...와
  updater manifest2434/`f7517e3dce5048f7fe8c283f48640fb6fed68eb494146ded7441ee5fa0dd64d1`다.
- current production0.1.2/2371/hash58ca와 새f751을 JSON 비교해 notes만 다르고 version/pub_date/
  platforms3 URL/Minisign signature가 같음을 확인했다. 실제 native 수용 당시58ca는 보존한다.
- github-pages 환경ID20769308292·protection rules·custom branch policies는 이전 Pages 승인
  입력과 동일하다. active Pages run0, Release407055948 body6208/d932...·11assets·Issue113OPEN을
  읽기 확인했다. 배포 workflow는 workflow_sha=deploy_ref=checkout S를 강제하는 기존 pages.yml이다.

원격 merge/API 증거·로컬 로그·frozen23/환경·승인 입력은 같은 임시 폴더에 보존한다.

## 잔여 위험

최종 HTML/목록/notes-only f751은 아직 Pages에 배포하지 않았다. 현재 웹/feed는 원래1f33/58ca다.
GitHub body6208과 실제3종 acceptance는 완료됐으며 기존 썸네일/MSI3010/Authenticode/물리 환경
한계는 유지한다. #113 OPEN·필요 branch/worktree/evidence를 보존하며 cleanup은 하지 않았다.

## 다음 단계 영향

아래 exact S의 기존 Pages workflow1회를 승인받는다. 성공 archive와 공개 HTTP23 bytes/manifest
version·pubdate·3URL/3signature,1280/390 화면·local012 링크·KST·다운로드6/한계를 확인한다.
ref/env/public asset/body drift·실패·증거 누락이면 성공으로 쓰지 않고 원인을 보존한다.

## 승인 요청

`pages.yml --ref devel -f deploy_ref=2a78e11375c8fe6fcb6c6259247b8825e83b1f49` 1회와 archive/HTTP/GUI 수용을 승인받는다.
환경·권한·설치 파일·tag·key/endpoint는 그대로 사용한다. Issue113 종료와 부산물 정리는 후속 승인이다.
