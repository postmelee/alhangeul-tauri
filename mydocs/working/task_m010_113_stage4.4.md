# Task #113 Stage 4.4 — 공개 본문 보정과 웹·updater 데이터 PR 준비

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.4 — Gate5 데이터 구현·로컬 수용 / devel Open PR 게시 준비
상태: 승인한 데이터·본문 보정·로컬 수용 완료 / PR required CI 결과 확인 후 merge 승인
확인일: 2026-10-09 02:09 (Asia/Seoul)

## 단계 목적

이미 공개한 v0.1.2의 실제 UTC 공개시각과 published 상태를 단일 원문·GitHub 본문에 반영하고,
웹 다운로드6종과 updater3종 데이터를 같은 version/source/files에 맞춰 devel 데이터 PR을 준비했다.
같은 스레드의 “진행해줘.”가 준비한4 source files·본문 보정·기록·검증·Open PR 범위를 승인했다.
승인 근거 기록은 `2026-10-08T17:01:10.304Z`이며, 제안 SHA256은
`1a3ec4fcb8f9ca84eb5312dc99da29f78b228da919042517b1144ad7c27330fb`다. 실제 Pages/manifest 배포·011→012 실행·close는 후속 gate다.

## 산출물

| 위치 | 변경 |
|---|---|
| `docs/releases/v0.1.2.notes.json` | published/실제UTC·공개 뒤 PR13/Issue5 확인·upgrade 미검증 안내 |
| `site/release.json` |012/3 fixed URLs·같은 production key/endpoint·complete inventory·short notes |
| `site/updates/v0.1.2.html` | 공식 생성9144 bytes·KST공개일·6고정 다운로드·한계/미검증 안내 |
| `README.md` |012 공개·버전 안내; 기존010→011 성공과 새011→012 미검증 구분 |
| `tests/pages.test.mjs` | 별도 승인한 tracked source 기대값1행18→19; 고정 fixture 유지 |
| 기존 계획·기록·인덱스·최종 보고·오늘할일 | 실제 body 보정·데이터 준비와 미배포 상태 구분 |
| GitHub Release407055948 | 본문만6186 bytes로 보정; tag/11assets/채널/게시시각 유지 |

## 본문 변경 정도 / 본문 무손실 여부

구현 제품·native bytes·CI·검증 helper·upstream을 수정/재빌드하지 않았다. 공개된 main6dcb05e9의
6개 패키지/3sig·inventory·checksum과 key/endpoint를 유지한다. 사용자 문구는 공개 상태·시각과
검증 완료/미실행 경계를 보정했으며 주요 기능·한계·과거 P/FF 이력을 보존했다.
원문과 README/site는 승인4파일의 exact size/hash와 일치한다. 문서 위치는 계획에서 승인된
docs/releases·site/updates·README 제품 안내와 mydocs/plans/working/report/orders 추적이다.
새 HTML로 source가19파일이 돼 기존 기대18 회귀1건이 실패했다. 별도 명시 답변
“기대 파일 수 한 줄 보정·재검증 (권장)”을 받은 뒤 tracked source 기대1행만19로 바꿨다.
다른 assertion·고정 fixture·unreleased fail-closed·시험 수/skip/timeout을 바꾸지 않았다.

## 검증 결과

```bash
pnpm run check:release-notes
pnpm run test:release-notes
pnpm run generate:release-notes -- --version 0.1.2 --output-dir /private/tmp/task113-main-candidate/gate5-applied-generated
pnpm run build:pages
pnpm run check:pages
node --test tests/updater-release.test.mjs tests/pages.test.mjs tests/actions-workflows.test.mjs
python3 /private/tmp/task113-main-candidate/gate5-correct-body.py
git diff --check
```

- notes source2 documents·124/124 tests·failed/skipped0, 공식3출력은 승인 생성물과 bytes가 같다.
- Pages source19/root assets2·output23 검사를 통과했다. `_site/downloads.json`6개는 원문 asset6와
  source/version/URL/size/hash/updateMode가 같다. `_site/release.json` short는 원문과 정확히 같고,
  `_site/updater/stable.json`3플랫폼은 승인 inventory의 URL/signature·실제 공개일과 일치한다.
- 최초 지정 회귀150/151·fail1은 tracked source 기대18 오류였다. `2026-10-08T17:03:59.612Z`의
  명시 승인 후 one-line patch SHA256 `dd9eb317dc5b591493007a9d7da2cd2e7fc998b705353817e231756bca85bfdb`를 적용해
  151/151·failed/skipped0을 수용했다. 최초 실패 로그도 보존했다.
- source HTML9144/1fb8f59dabadaaa0acd1d5b0e71decce7adf2db1c908639cc39d6b6f5cde3f08, GitHub body6186/03cde7aa70f6b7d395cc16bbe7eed6baa7d326dbe5e1ac825f3d5bba7b2d45b6,
  short487/375a4369663bc9e6428143793f1278403f03eb55706bbe722115a13dcc49f648다. output manifest2371 bytes/hash
  `58ca348b234945e8330911ec6f77ba1c3af5ac6b5e05db8a585a29e55a107ad3`는 승인 제안 bytes와 같다.
- body-only read-back `2026-10-08T17:03:40.244Z` accepted: Release407055948·main tag·asset11의
  ID/name/size/digest/state/고정URL/createdAt/updatedAt·Stable/latest·UTC게시시각은 유지됐다.
  기존 body6170/4cd331f7d46257fe7dfcf709fa0304ec008261091007e04209c6ea1cef4aecc6는 Gate4 snapshot으로 남기고 새 body exact UTF-8를 대조했다.
  정상 download_count 증가는 identity 변화와 구분했다. 새 asset 다운로드/재서명/교체는 없다.
- 로컬 IAB의 실제 생성 output에서 v0.1.2 제목·2026-10-09 KST·latest 표시·미검증/한계·6개 고정
  다운로드와 기술 기록 링크를 AX/전체 화면으로 확인했다. 임시 screenshot/AX는 검토 증거이며,
  공개 Pages·실제 모바일 환경의 수용으로 기록하지 않는다. 임시 tab/server는 정리했다.
- 이전 main6d의 actual6/3sig/native GUI/VM은 Stage4.2, 공개11bytes는 Stage4.3 exact 근거를 재사용한다.
  이번 데이터 수정은 새 앱 빌드·설치·production011→012 실행이 아니다.
- devel Open PR의 자동 `Alhangeul PR required`는 실제 PR merge candidate에서 확인한다.
  이 commit 시점에는 미실행이며 승인한 PR 준비 과정에서 결과를 PR/원격 receipt로 확정한다.

### 승인4 source files exact bytes

| 파일 | bytes | SHA256 |
|---|---:|---|
| `docs/releases/v0.1.2.notes.json` | 16651 | `28b9268c0ece598e0a886eeb47dad58474295873c37023033d375503b296e0bc` |
| `site/release.json` | 3938 | `f42efdf1d8aad83c854401fee8b9f7d593924e2b3ebeae03c662f4df47327e19` |
| `README.md` | 7328 | `1f1e560f3a09441d533ac3d8d387c11ddd0372962b7dacd6afa94ba6a81cf87f` |
| `site/updates/v0.1.2.html` | 9144 | `1fb8f59dabadaaa0acd1d5b0e71decce7adf2db1c908639cc39d6b6f5cde3f08` |

## 잔여 위험

- 소스 데이터012 준비와 GitHub 본문 공개만 완료했다. production 사이트/feed는011이며, actual merged
  devel SHA가 확정돼 승인·Pages dispatch/HTTP read-back을 하기 전 배포 완료로 쓰지 않는다.
- 실제011→012 NSIS/MSI/AppImage 동일 형식 upgrade·dirty 문서 보호/설정·재시작·version은 미실행이다.
- NSIS thumbnail not-accepted·MSI3010 post-reboot-unverified·Authenticode unsigned 및 Stage4.2 한계 유지다.

## 다음 단계 영향

정상 ff publish/task113·devel non-draft Open data PR을 만들고 실제 head/merge candidate·required
CI/closingIssuesReferences를 확인한다. required 통과 뒤 PR 리뷰·일반 merge 승인, 이후 actual
merged devel full SHA의 Pages/manifest 공개 승인을 받아 dispatch한다. #113은 계속 OPEN이다.

## 승인 요청

Stage4.4 로컬 수용과 실제 PR required 결과를 검토하고 해당 data PR 일반 merge를 승인한다.
merge 결과를 확정한 뒤 exact Pages 배포 입력을 제시한다. 전체 Issue 완료·close/cleanup은 후속이다.
