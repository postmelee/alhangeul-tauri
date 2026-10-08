# Task #113 Stage 4.6 — exact Pages·production updater 공개

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.6 — Gate5 원격 Pages·manifest 공개와 byte 검산
상태: 배포·artifact/HTTP 검산 완료 / Gate6 목록 보정·실제 upgrade 후속
확인일: 2026-10-09 03:03 (Asia/Seoul)

## 단계 목적

실제 merge devel `1f33d03918b50a5b9140978a9eb28d1b5e65ebe6`의 기존 Pages workflow를 실행해 사이트와 production updater를
v0.1.2로 공개했다. 제시한 exact SHA·환경 유지·artifact/HTTP23·공개 desktop/mobile 검증에 대한
작업지시자의 “진행해줘.”를 `pages-1f33-human-approval.json`의 `2026-10-08T17:46:20.940873+00:00`에 기록했다.
원격 배포와 byte 검산이 이번 Stage 범위이며 실제011→012·전체 Gate6 완료로 쓰지 않는다.

## 산출물

| 위치 | 결과 |
|---|---|
| [Pages run37819153172](https://github.com/postmelee/alhangeul-tauri/actions/runs/37819153172) | attempt1·전체 deploy job/step success·workflow/source/checkout1f33 |
| github-pages artifact11568521999 | ZIP digest `sha256:9e1b6c2371c4558987fe8a2b16879e6b6317dfaf864c89df3186d945953dd6c8`·실제 tar23파일 검산 |
| 공개 웹·HTTP23 | frozen exact output의 전체23 files 크기/SHA256 일치 |
| production manifest012 | 2371 bytes·`58ca348b234945e8330911ec6f77ba1c3af5ac6b5e05db8a585a29e55a107ad3`·3 URL/Minisign·기존 key/endpoint |
| 기존 release 기록/index·계획/최종 보고/오늘할일 | 실제 배포 결과·목록 연결 누락·다음 source 제안 |

## 본문 변경 정도 / 본문 무손실 여부

앱·pin·native build/sign·tag/Release·원문 JSON/본문/site source를 변경하지 않았다. 기존 환경/
branch policy·권한/보호·공개키/endpoint도 같다. 공개11asset identity·body6186/hash03cde7aa...와
main6d를 postflight에서 재확인했다. 작업 checkout의 tracking 문서만 갱신하며 과거의 미게시/
실패/수용 snapshot을 보존한다. 임시 source14 제안은 검토 tree에만 있고 저장소 미적용이다.

## 검증 결과

```bash
python3 /private/tmp/task113-main-candidate/deploy-pages-1f33.py
gh workflow run pages.yml --repo postmelee/alhangeul-tauri --ref devel -f deploy_ref=1f33d03918b50a5b9140978a9eb28d1b5e65ebe6
python3 /private/tmp/task113-main-candidate/verify-pages-1f33.py
node /private/tmp/task113-main-candidate/verify-pages-signatures.mjs
# CUA: 실제 공개 홈/updates/feedback/v012, desktop1280·mobile390, viewport reset·tab close
git diff --check
```

- actor/remote refs·tag198e→main6d·Stable/latest407055948/body/11asset·Issue OPEN·activePages0·
  기존 github-pages devel branch policy와 공개 전011/hash654efd7e...를 검산한 뒤1회 dispatch했다.
- run created `2026-10-08T17:46:27Z`, deploy success `2026-10-08T17:46:56.330Z`, job completed
  `2026-10-08T17:46:58Z`다. UTC17:46은 2026-10-09 02:46 KST다. completed 전체 log에서
  WORKFLOW_SHA/DEPLOY_REF/checkout/pages_build_version=1f33d03918b50a5b9140978a9eb28d1b5e65ebe6를 확인했다.
  build source19/root assets2·check source19/output23·contract151/fail/skip0·upload/deploy success다.
- 실제 artifact ZIP API digest와 tar의23 경로/bytes/hash를 frozen output과 비교했다. 공개 HTTP는
  root와 index.html의 canonical directory URL로23개 파일을 새 다운로드해 모두 비교했다.
  manifest version012/pub_date `2026-10-08T16:49:38Z`/notes/3 URL/서명이 승인 출력과 같다.
- 공개 manifest3서명을 Gate4에서 새 public 다운로드해 수용했던 actual installer bytes와 다시
  독립 검증했다. inventory source main6d·installer size/hash·signature file와 같고 기존 fingerprint
  `9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8`와 endpoint 유지다.
- 실제 홈 Windows2/Linux4·updates 최신 메뉴 Windows2/Linux4, v012 고정6파일·KST공개일·
  최신 표시·기술 기록/Release 링크와 미검증 upgrade/known limits를 확인했다. desktop1280와
  mobile390×844의 홈/updates/feedback/v012 화면·줄바꿈을 검사했다. mobile의 document scrollWidth
  는390이며 가로 overflow가 없다. 임시 viewport를 reset하고 생성한 tab을 닫았다.
- 웹 목록에는 static v012 항목이 없어 기존 hydrate의 정상 GitHub Release fallback을 관측했다.
  공개 v012 HTML은 HTTP/hash/화면이 정상이나 목록에서 직접 연결되지 않는다. Gate6 링크 수용은
  이1행 보정 이후로 남긴다. 임시 보정안·harness14 제안에서 production 기존59+신규16=75,
  updater/pages/actions151 및 GUI TypeScript 검사를 통과했다. 이는 source 적용/실제 upgrade가 아니다.
- postflight `2026-10-08T18:00:10.828089+00:00`: Release11/body/tag/main/devel·환경/보호 유지·Issue113 OPEN,
  production feed012/hash58ca348b...를 확인했다. 원격 Pages 재실행은 없다.

### 공개 output23의 고정 identity

| path | bytes | SHA256 |
|---|---:|---|
| `home-showcase.css` | 2359 | `7aaf8967e450186eada21e751b29ccabb73da8ec44b006d7d6c6607a33a07cdd` |
| `home-showcase.js` | 1607 | `b3321a3f4e96f30adb8e53600c16cc4b4f04d9aec1006ad9115640b7d90ce9f9` |
| `script.js` | 5887 | `466a9c33406cf758364495477da5ff273280936ad723da550b36b747ccbea941` |
| `feedback/index.html` | 6561 | `c6efebb24358e51872de5092f2fc81edc3739c448f8114b80e0bfb7f1521532c` |
| `package-downloads.js` | 6115 | `3502910ccb88aa520850a7e2d6859ff01365070fbb7fe8199c54c7466d234fa7` |
| `styles.css` | 17820 | `fe758b86ff87b724e8db9ab73a884a11b0f1d8f603707a8f9fd3ed48a5de24a6` |
| `assets/windows-explorer.png` | 114402 | `460f225615e9876aea9e3aeeca382a25e2ebaf41b71105af92a8c30878c0e35d` |
| `assets/og-main.png` | 269618 | `8e478814d1bcebc233adc82cbdaed0d796c8214c3c6e3fcc1fd78587702ed54d` |
| `assets/linux-editor.png` | 79227 | `a3d4460b8fc432f00a2ce97cd68552582b2f5dfdc88faec9f749e58be132618b` |
| `assets/linux-drag-in.png` | 178918 | `ee021b47b66e8a6069f2eec918a27153c8a15df4a22c3a37e82d275f2131cbd7` |
| `assets/windows-editor.png` | 68691 | `3034cef5c00e16eda0d1a51804ab60f12d4e3594d8a9b1220061f0ef43e76c86` |
| `assets/logo/favicon.ico` | 46778 | `bd9aa0ab1cd0eb2a86fd783b2775deefc992d1044718c5bef1dbf6d6a614c16a` |
| `assets/logo/logo-256.png` | 40783 | `c1d2d9ec13e10bcb8a046cf8c6392fa8b0d91bbca2e07c0dead7c235133917db` |
| `assets/linux-pdf.png` | 66740 | `3b646ac975aa4b3720add31dcef78a9b42b87a8e4260d3e8825581db947df742` |
| `assets/windows-app.png` | 39153 | `9e50463e32afbcfed2e864fb761efa8c1be0d21bf2dfad4a8a9f552fbce1c411` |
| `assets/linux-explorer.png` | 106078 | `2182a6476a972533e726d5ee64875c92557aac26894aeaf30df4be3fcfce61f8` |
| `index.html` | 9540 | `b44794787efe4a205db64c34f229dfdb01c85e55e9ef37ab2981e3f29e4a3ac9` |
| `release.json` | 3938 | `f42efdf1d8aad83c854401fee8b9f7d593924e2b3ebeae03c662f4df47327e19` |
| `downloads.json` | 2737 | `1705e958de8ecb4d1a3c23b45650d658a12dc03404053758086f6774ea46900b` |
| `updater/stable.json` | 2371 | `58ca348b234945e8330911ec6f77ba1c3af5ac6b5e05db8a585a29e55a107ad3` |
| `updates/index.html` | 7895 | `0d5e9a3bb71f790038ca08b8dec8c42b5fe10b9921b55e1f5f31605440843c47` |
| `updates/v0.1.2.html` | 9135 | `1856c7ae34c5bd102c553a16e40fa96027788ff267257a8944b5c84f9ab00685` |
| `updates/v0.1.1.html` | 8633 | `1037b12d5f312f12e98ad12c3c26342a8c5b47d3b55e6631ea8366e552703d75` |

## 잔여 위험

- Gate6의 웹 목록 local v012 연결 누락과 actual011→012 NSIS/MSI/AppImage는 미수용이다.
  기존010→011 회귀75 중59 또는 새 unit16을 실제 installation/upgrade로 쓰지 않는다.
- NSIS thumbnail·forced MSI3010 post-reboot-unverified·Authenticode와 Stage4.2 한계를 유지한다.
  실제 upgraded 설정·dirty 문서 보호·HWP/HWPX 재열기/서명/설치/재실행은 다음 remote 실행 대상이다.
- 공개 노트의 실제 upgrade 미검증 문구는 정확한 현재 상태다. 향후 수용 시 문구·body·data/
  exact Pages 입력 변경은 결과 기반 후속 승인을 받는다. #113 OPEN·branch/worktree 유지다.

## 다음 단계 영향

기존010→011 JSON/59 tests/hash를 보존하고 새011→012 fixed 공개 입력을 별도 JSON으로 추가한다.
helper는2개 승인 tuple/hash만 허용하고 workflow/GUI는 selected012 spec의 version을 사용한다.
site/updates/index.html에 local v012 link1행을 추가한다. source14 patch·임시75/151/typecheck가
준비됐다. 승인 후 generic/full 자동·필수CI와 새 exact harness의 existing production-upgrade-check
mode Windows NSIS/MSI·Linux writable AppImage를 수행한다. product bytes/main6d를 재빌드/재서명하지 않는다.

## 승인 요청

계획서 Stage4.7 제안의 source14 적용·검증/기록·정상 push/Open PR·필수CI 및 새 exact harness의
production011→012 세 형식 remote 검증을 승인받는다. PR merge·추가 Pages/body 변경·close/cleanup은 후속이다.
