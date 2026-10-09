# Task #113 Stage 4.11 — 최종 Pages·피드 공개와 HTTP·화면 수용

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.11
확인일: 2026-10-09 23:49:56 (Asia/Seoul)

## 단계 목적

PR120의 실제 merged devel S를 명시 승인된 기존 Pages workflow로 배포하고 최종 안내·피드
bytes와 공개 화면을 수용한다. 실제 업데이트 검증 결과와 사용자 공개 안내를 연결한다.

## 산출물

| 대상/파일 | 변경 요약 |
|---|---|
| 기존 Pages run37945341425 | exact S1회 배포·전체 job/step 성공 |
| 공개 웹23파일·stable manifest | frozen output/archive/HTTP bytes equality 수용 |
| home/updates/v012/feedback | desktop1280/mobile390 화면·다운로드/링크/안내 수용 |
| plan/report/orders·docs/releases2파일·본 보고 | 승인·실제 배포·장기 식별자와 후속 인계 기록 |

## 본문 변경 정도 / 본문 무손실 여부

이번 단계의 저장소 변경은 기존 승인된 위치의 결과 기록뿐이다. 제품 source·user notes JSON·
site source·workflow/config를 추가 수정하지 않았다. 과거 초안·실패·미공개 snapshot을 보존했다.
이번 로컬 보고 commit은 실제 배포 S를 변경하지 않는다. 설치 파일·서명·tag·key는 동일하다.

## 검증 결과

승인 관측은 `2026-10-09T14:35:41.858769+00:00`다. remote devel=S·GitHub body6208/
11assets·tag/main·환경/정책·active Pages run0·IssueOPEN·frozen23를 직전에 확인했다.

실행 명령/절차:

```bash
gh workflow run pages.yml --ref devel -f deploy_ref=2a78e11375c8fe6fcb6c6259247b8825e83b1f49
# 완료 run/job/step·artifact ZIP/tar 및 frozen output23의 파일별 size/SHA256 비교
# 공개 HTTP23 raw bytes와 manifest JSON 대조, 실제 브라우저1280/390 검증
git diff --check
```

| identity/검증 | 실제 결과 |
|---|---|
| workflow/source/checkout/deploy S | `2a78e11375c8fe6fcb6c6259247b8825e83b1f49` — 모두 동일 |
| run/attempt/전체 결과 | [37945341425](https://github.com/postmelee/alhangeul-tauri/actions/runs/37945341425) / 1 / SUCCESS |
| 단일 job | 113870049506·Deploy exact Alhangeul Pages source·모든 step success |
| run 시간 UTC | 2026-10-09T14:35:44Z → 14:36:10Z; job 완료14:36:09Z |
| Pages 계약·출력 | 151/151·fail/skip0; source19/root assets2/output23 |
| artifact | ID11622854980·ZIP961001bytes |
| ZIP SHA256 | `7edea8b8b1603dc5a916bfa26b4678fbb0a00a20b8c94ecfbefe1dd2c7cdf33f` |
| 안전 tar 검산 | regular23·symlink0; 경로/size/hash가 frozen actual S output과 동일 |
| 공개 HTTP | 23/23 raw bytes 일치·첫 fetch 수용; workflow/HTTP 재시도 없음 |
| HTTP 검산 UTC | 2026-10-09T14:38:28.922805+00:00 |
| production manifest | version0.1.2·2434bytes·SHA256`f7517e3dce5048f7fe8c283f48640fb6fed68eb494146ded7441ee5fa0dd64d1` |
| 이전 manifest와 비교 | 2371/58ca → 2434/f751, notes만 변경; version/pub_date/3URL/3signature 동일 |
| 사용자 본문·HTML·short | GitHub6208/d932; 공개HTML9157/1869e70d...; short550/1fec449b... |
| 공개 불변 검산 | Release407055948/11asset id·size·hash·tag198e→main6d·key/endpoint 동일 |
| 환경/정책 | github-pages20769308292·protection/branch policies/권한 동일 |
| 브라우저 수용 UTC | 2026-10-09T14:49:56.742874+00:00 |
| Issue/PR | #113 OPEN; PR120 MERGED |

### 공개 HTTP 장기 식별자

모든 파일의 첫 공개 fetch bytes를 실제 배포 archive 및 frozen source output과 대조했다.

| 경로 | bytes | SHA256 |
|---|---:|---|
| `assets/linux-drag-in.png` | 178918 | `ee021b47b66e8a6069f2eec918a27153c8a15df4a22c3a37e82d275f2131cbd7` |
| `assets/linux-editor.png` | 79227 | `a3d4460b8fc432f00a2ce97cd68552582b2f5dfdc88faec9f749e58be132618b` |
| `assets/linux-explorer.png` | 106078 | `2182a6476a972533e726d5ee64875c92557aac26894aeaf30df4be3fcfce61f8` |
| `assets/linux-pdf.png` | 66740 | `3b646ac975aa4b3720add31dcef78a9b42b87a8e4260d3e8825581db947df742` |
| `assets/logo/favicon.ico` | 46778 | `bd9aa0ab1cd0eb2a86fd783b2775deefc992d1044718c5bef1dbf6d6a614c16a` |
| `assets/logo/logo-256.png` | 40783 | `c1d2d9ec13e10bcb8a046cf8c6392fa8b0d91bbca2e07c0dead7c235133917db` |
| `assets/og-main.png` | 269618 | `8e478814d1bcebc233adc82cbdaed0d796c8214c3c6e3fcc1fd78587702ed54d` |
| `assets/windows-app.png` | 39153 | `9e50463e32afbcfed2e864fb761efa8c1be0d21bf2dfad4a8a9f552fbce1c411` |
| `assets/windows-editor.png` | 68691 | `3034cef5c00e16eda0d1a51804ab60f12d4e3594d8a9b1220061f0ef43e76c86` |
| `assets/windows-explorer.png` | 114402 | `460f225615e9876aea9e3aeeca382a25e2ebaf41b71105af92a8c30878c0e35d` |
| `downloads.json` | 2737 | `1705e958de8ecb4d1a3c23b45650d658a12dc03404053758086f6774ea46900b` |
| `feedback/index.html` | 6561 | `c6efebb24358e51872de5092f2fc81edc3739c448f8114b80e0bfb7f1521532c` |
| `home-showcase.css` | 2359 | `7aaf8967e450186eada21e751b29ccabb73da8ec44b006d7d6c6607a33a07cdd` |
| `home-showcase.js` | 1607 | `b3321a3f4e96f30adb8e53600c16cc4b4f04d9aec1006ad9115640b7d90ce9f9` |
| `index.html` | 9540 | `b44794787efe4a205db64c34f229dfdb01c85e55e9ef37ab2981e3f29e4a3ac9` |
| `package-downloads.js` | 6115 | `3502910ccb88aa520850a7e2d6859ff01365070fbb7fe8199c54c7466d234fa7` |
| `release.json` | 4001 | `fc1cff057906e61c694be3d1c7659163cff60b1d04b9b4dcbeadee9c7c9b17ac` |
| `script.js` | 5887 | `466a9c33406cf758364495477da5ff273280936ad723da550b36b747ccbea941` |
| `styles.css` | 17820 | `fe758b86ff87b724e8db9ab73a884a11b0f1d8f603707a8f9fd3ed48a5de24a6` |
| `updater/stable.json` | 2434 | `f7517e3dce5048f7fe8c283f48640fb6fed68eb494146ded7441ee5fa0dd64d1` |
| `updates/index.html` | 8156 | `f553377d86f4fe41f4f461cf5116a60db6e7021471ab3ff12ed47b8386ff3661` |
| `updates/v0.1.1.html` | 8633 | `1037b12d5f312f12e98ad12c3c26342a8c5b47d3b55e6631ea8366e552703d75` |
| `updates/v0.1.2.html` | 9157 | `1869e70dcbf1d33f27db3e3cd3cfe03d6ec8a2eb24e15c2eef618b8287a56fae` |

### 실제 화면·사용자 경로

| 시나리오 | 관측·결과 |
|---|---|
| home·updates desktop/mobile | 최신012·badge1·local v012 링크 클릭으로 공개 안내 진입, 가로 overflow 없음 |
| Windows 다운로드 | NSIS/MSI2개의 approved public URL 동일 |
| Linux 선택·다운로드 | AppImage/DEB/RPM/arm64 DEB4URL 동일, AppImage 앱 내 업데이트·나머지 수동 안내 |
| v012 desktop/mobile | KST2026-10-09·6개 고정 링크·실제011→012/설정/HWP/HWPX 수용 문구, 미실행 문구 없음 |
| 알려진 한계 | NSIS 썸네일·MSI3010 재부팅 후 미검증·Authenticode/Minisign 구분·물리 환경/성능 한계 유지 |
| feedback desktop/mobile | 개인정보 안내·GitHub Issue 링크 정상 |

DOM/AX 관측과 실제 screenshot을 함께 확인했다. 숨겨진1x1 Linux radio의 locator.check는
선택을 바꾸지 못했다. DOM/화면을 확인해 보이는 Linux label을 클릭한 뒤 checked 상태·4URL·
gallery를 수용했다. 자동화 대상 선택 문제이며 제품 source 수정은 없었다. 임시 탭은 닫고
viewport를 복구했으며 로컬 서버/프로세스를 남기지 않았다.

스크린샷은 `/private/tmp/task113-pages-final/`에10개 보존한다. 대표 화면의 장기 식별자:

| 파일 | bytes | SHA256 |
|---|---:|---|
| `desktop-feedback.jpg` | 66904 | `b3b1505808fe6ea3bb8317b771c9f1ab8ae5b97e08c8538cac23597215c76b1f` |
| `desktop-home-linux.jpg` | 77201 | `4f6a292c4a21780378395256c7dc2075bec992d181dc107b580890f67207fcd0` |
| `desktop-updates-linux.jpg` | 107390 | `3b95e32f326208d6393885d73467c836e63d99c6304c0e851fac941d705677a0` |
| `desktop-updates.jpg` | 98726 | `e7e463de69d6af06bf7432461d076c226abcc54ff1a11996a7f426439cc63323` |
| `mobile-feedback.jpg` | 50542 | `e7dc2655f8ea882928f988227fc4229ae37d510a47b3e37bc598fa4bae757cb3` |
| `mobile-home-linux.jpg` | 49959 | `e5c21fdf284614119f5b8f1913a67bd2671713d6365cd867731cab6ff13206e5` |
| `mobile-updates.jpg` | 88729 | `74c68f0a35bdb933125d0f43ef094803e24b794937948cb57129430059ecde8b` |
| `mobile-v012.jpg` | 190729 | `8f0499d1d6fe7cfcc8b170ac94825d6c85a8e2c4c29b151fad05123cc66cec21` |
| `public-mobile-installation.jpg` | 54812 | `6ad92f9cf474a2c9cc787f7fcff775b2c61fe873c29b32bb19a6326b451c6366` |
| `public-v012-installation.jpg` | 102081 | `ce5a71582f6d450784282524f67fd1add18b0eb59bdaae10d20a2a528c226127` |

원격 JSON/log·artifact ZIP·HTTP raw23·browser metrics/화면·combined receipt는 같은 임시 폴더다.
임시/Actions archive의 영구 가용성을 보장하지 않으며 이 보고의 고정 SHA/run/digest를 보존한다.

### 실제 업데이트 증거의 재사용 경계

[Stage4.8](task_m010_113_stage4.8.md)의 Windows NSIS/MSI는 bc082d00/run37828940744의
각 complete success job, Linux AppImage는8a5a28c7/run37832348063 Linux-only whole success다.
historical manifest2371/58ca의 실제 UI동의/dirty/설치·재시작/version/설정 equality·HWP6/HWPX10/
원문hash·accepted.json·Windows cleanup/policy restore 및 GUI6를 수용했다. 이번 notes-only 공개는
같은 public installer와 signature를 유지한다. 새 f751 manifest를 사용한 native 재실행으로 쓰지
않는다. 원래37824197495와 mixed37828940744 전체 failure는 그대로다.

### 결과 기록 자체 검산

Stage4.10을 포함한 devel2a78 대비 최종 diff7파일은 승인된 기록 위치에만 있다. 상대 문서 링크
76개·필수 템플릿7섹션·150행 보고·git diff --check를 통과했다. 제품/사용자 JSON/site/CI/
fixture bytes와 frozen Pages23파일은 모두 불변이다. 전체 검증을 새 native 실행으로 대체하지 않았다.

## 잔여 위험

제품의 기존 썸네일/MSI3010/Authenticode 및 모든 물리 환경·성능 비교 미검증 한계를 유지한다.
최종 기록은 현재 owned local/task113에만 있고 devel 인계 PR이 남는다. #113 OPEN이며 필요한
branch/worktree/evidence를 보존한다. 승인 범위 밖의 종료/cleanup은 수행하지 않았다.

## 다음 단계 영향

Stage4.10/4.11·최종 보고의 docs-only diff를 정상 publish/task113 push·devel Open PR로 인계한다.
새 head의 필수 CI를 확인하며 배포 S·제품/manifest/설치 파일은 변경하지 않는다. PR merge와
Issue113 종료/부산물 정리는 별도 승인 범위다. primary local/task69 사용자 변경을 유지한다.

## 승인 요청

최종 보고와 docs-only diff를 승인받아 정상 push·devel Open PR 게시·새 head 필수 CI를 진행한다.
Issue113 close·branch/worktree cleanup·추가 배포/제품 검증은 이번 결과 기록에 포함하지 않는다.
