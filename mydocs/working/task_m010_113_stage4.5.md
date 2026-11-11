# Task #113 Stage 4.5 — 데이터 PR merge와 exact Pages 배포 입력

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.5 — Gate5 data merge·배포 입력 수용
상태: PR119 일반 merge·actual devel/출력 고정 완료 / Pages·manifest 공개 승인 대기
확인일: 2026-10-09 02:37 (Asia/Seoul)

## 단계 목적

명시 승인된 PR119를 일반 merge하고 실제 devel SHA/tree를 확정했다. 이 SHA에서 generated
Pages output23파일과 production manifest012를 고정해 배포 승인 입력을 준비했다.
작업지시자의 “PR119 일반 merge 진행 (권장)”은 exact head8bb6a641/base8a91bf52와 보호·required
유지, merge 후 SHA/tree·Issue OPEN 확인·다음 입력 제시를 승인했다. 승인 기록
`2026-10-08T17:31:15.935Z`이며 실제 Pages dispatch·production upgrade·close 승인이 아니다.

## 산출물

| 위치 | 내용 |
|---|---|
| [PR119 MERGED](https://github.com/postmelee/alhangeul-tauri/pull/119) | 일반 merge·두 parent·actual devel/tree 검산 |
| actual devel `1f33d03918b50a5b9140978a9eb28d1b5e65ebe6` | approved head/합격 CI와 같은 tree76c6d69e |
| frozen Pages23 files·임시 output inventory/승인 입력 | installer6/updater3·배포 exact SHA·환경/공개 전 feed/hash |
| 기존 release 기록/index·계획/최종 보고/오늘할일 | 실제 CI 통과·merge와 미배포 전달 구분 |

## 본문 변경 정도 / 본문 무손실 여부

제품·pin·build/CI·tests·원문/site/README의 data bytes 변경이나 재빌드/재서명은 없다.
검증한 같은 tree의 기존 exact main6d 앱/source·public11 files/body03cde7aa...와 key/endpoint를
유지한다. 소유한 local/task113만 actual merge로 ff했고 다른 작업본의 devel/사용자 변경을
손대지 않았다. Issue113의 남은 배포/upgrade 때문에 branch/worktree·자료를 유지한다.
기존 실패·수용 snapshot을 보존하고 승인된 docs/releases·mydocs tracking 위치에 이번 결과를 기록했다.

## 검증 결과

```bash
# 실행 직전 gh api user·PR exacthead/base·3checks success/CLEAN·remote devel 대조
python3 /private/tmp/task113-main-candidate/merge-pr119.py
# actual merge에서만 고정; 제품/native build 아님
pnpm run build:pages
pnpm run check:pages
# SHA/tree/2parents·branch policy·Release11/body·production feed 조회
# output23 each bytes/hash 및 approval manifest bytes 일치
git diff --check
```

- 최신 [required CI37815889210](https://github.com/postmelee/alhangeul-tauri/actions/runs/37815889210)
  attempt1/head `8bb6a641113d9f08073db869ebd70bb6d00e53be`/실제 checkout `b21339992a6e616cc466a1b3706ae66308831706`는 Node/Windows/required
  3job success다. automation1331/upstream39/Studio283·43files, Windows notes124/production59와
  PowerShell83sources/16isolated tests를 확인했다. native/COM/실제 upgrade 수용으로 쓰지 않는다.
- 최초 CI37814746426은 fixed010→011 입력2건의 전체 failure로 남는다. 승인한 보정 뒤 새 source
  CI의 성공이며 기존run rerun/skip/보호 변경이 없다. 실제 PR check/read-back과 CLEAN을 확인했다.
- PR119 실제 mergedAt `2026-10-08T17:31:18Z` = 2026-10-09 02:31:18 KST다.
  일반 merge parent는 `8a91bf52403e4b08d4660065f207af698c63428a`와 `8bb6a641113d9f08073db869ebd70bb6d00e53be`,
  actual devel `1f33d03918b50a5b9140978a9eb28d1b5e65ebe6`/tree `76c6d69e4be59df1efd252a761980e16e1b0ba49`는 승인 head·CI tree와 같다.
- 원격 devel 일치, main6d 불변·Issue113 OPEN·closingIssuesReferences=[]를 검산했다.
  GitHub Release407055948·tag/11asset ID/size/digest/URL·body6186/hash03cde7aa...·UTC공개시각 유지다.
- actual merged devel의 Pages build source19/root assets2·check source19/output23 통과다.
  23개 output을 임시 frozen directory에 각각 size/SHA256으로 고정했고 manifest2371 bytes/hash
  `58ca348b234945e8330911ec6f77ba1c3af5ac6b5e05db8a585a29e55a107ad3`는 승인 제안 bytes와 같다. 6개 download와3 signed targets다.
- 기존 github-pages branch policy는 devel을 허용하고 환경/보호/권한을 바꾸지 않았다.
  진행 중 Pages run0, 현재 production feed011의 실제 hash
  `654efd7efc5f57de061d56743d30ab55c0f152d693df52c4022306261edbc638`를 확인했다. 배포하지 않고 exact 입력을 준비했다.

### 배포 핵심 출력

| path | bytes | SHA256 |
|---|---:|---|
| `downloads.json` | 2737 | `1705e958de8ecb4d1a3c23b45650d658a12dc03404053758086f6774ea46900b` |
| `release.json` | 3938 | `f42efdf1d8aad83c854401fee8b9f7d593924e2b3ebeae03c662f4df47327e19` |
| `updater/stable.json` | 2371 | `58ca348b234945e8330911ec6f77ba1c3af5ac6b5e05db8a585a29e55a107ad3` |
| `updates/v0.1.2.html` | 9135 | `1856c7ae34c5bd102c553a16e40fa96027788ff267257a8944b5c84f9ab00685` |

## 잔여 위험

- 현재 Release012와 source data012는 통합됐지만 원격 사이트/feed는011이다. Pages/manifest dispatch
  및 실제 공개 HTTP/desktop/mobile read-back은 다음 승인 범위이며 미실행이다.
- 실제011→012 harness migration과 NSIS/MSI/AppImage 동일 형식 upgrade·설정/dirty 문서 보호/재열기는
  후속 승인 범위다. 기존010→011 회귀 통과를 새012 upgrade 성공으로 쓰지 않는다.
- NSIS thumbnail·forced MSI3010 post-reboot-unverified·Authenticode 및 Stage4.2 한계 유지다.

## 다음 단계 영향

existing pages.yml을 --ref devel/deploy_ref `1f33d03918b50a5b9140978a9eb28d1b5e65ebe6`로 실행해 workflow/source/checkout SHA를
모두 고정한다. 정상 github-pages환경의 upload/deploy와 실제 artifact23/HTTP23 bytes·6downloads/
manifest3·공개화면/모바일을 확인한다. 새 ref/Release/feed drift나 배포 실패는 재빌드/force/보호
완화로 우회하지 않는다. 뒤에 별도 actual011→012 source/harness 입력 승인과 실행을 진행한다.

## 승인 요청

위 actual devel의 Pages·production stable manifest012 공개와 artifact/HTTP/화면 검증을 승인한다.
#113은 OPEN이고 실제 upgrade·최종기록/close/cleanup은 후속이다.
