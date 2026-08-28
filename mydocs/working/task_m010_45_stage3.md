# Task #45 Stage 3 완료 보고 — 단일 화면 홈과 업데이트·문의 페이지

GitHub Issue: [#45](https://github.com/postmelee/alhangeul-tauri/issues/45)
구현계획서: [`task_m010_45_impl.md`](../plans/task_m010_45_impl.md)
Stage: 3

## 단계 목적

업데이트와 문의/제보를 홈에서 분리하고, 각 페이지의 상단 메뉴 구조를 알한글 macOS Pages와
같은 이동 방식으로 정렬했다. 작업지시자의 Stage 2 시각 피드백을 함께 반영해 홈은 스크롤 없는
한 화면으로 줄이고, HOP처럼 플랫폼과 설치 형식을 바로 고를 수 있는 다섯 설치 안내 버튼을
배치했다. 여러 플랫폼을 다루는 제품 특성상 header 다운로드 항목은 제거했다.

공개 전 계약은 유지한다. 홈의 설치 안내는 updates 페이지의 정확한 NSIS·MSI·AppImage·수동
패키지 항목으로 이동하고 installer URL과 updater manifest를 만들지 않는다. 검증된 published
release metadata가 생기면 NSIS·MSI·AppImage 세 버튼만 exact artifact 직접 다운로드로 전환하며,
DEB·RPM·arm64는 계속 수동 설치 안내로 이동한다.

Stage 3.1 피드백 보정에서는 첨부 화면과 실제 알한글 macOS updates 페이지의 computed style을
대조했다. 기존 Pretendard, 영문 eyebrow와 플랫폼별 설치 카드를 제거하고 참고 페이지와 같은
system font, 72px/40px 제목, 21px hero 본문, 880px 콘텐츠 폭과 section rhythm을 적용했다.
최신 버전 다운로드는 플랫폼 dropdown으로 제공하고, 공개 전 릴리즈 노트 placeholder와 published
상태의 exact GitHub Release note hydration을 추가했다.

Stage 3.2 피드백 보정에서는 홈 제목을 단어 중간 줄바꿈이 생기지 않는 세 줄로 고정하고 desktop
최대 글자 크기를 60px, 390px 화면 글자 크기를 39px로 낮췄다. 업데이트 다운로드 버튼의 문자
꺾쇠는 16×16 SVG 아이콘으로 교체하고 flex 중앙 정렬과 열림 상태 회전을 유지했다. 지원 범위
검사에서 발견한 platform 전용 font alias는 제거했으며 `system-ui` 렌더링은 그대로 유지한다.

Stage 3.3 피드백 보정에서는 820px 이하에서 왼쪽 정렬되던 updates action group을 중앙 정렬하고
줄바꿈 가능한 flex로 바꿨다. 340px 이하에서는 dropdown을 문서 흐름 안에서 펼쳐 GitHub Releases
버튼을 덮지 않게 했다. 홈·updates·feedback을 340·390·666·820px에서 요소 단위로 검사해 header,
본문, action, contact card와 footer가 viewport 밖으로 벗어나지 않음을 확인했다.

Stage 3.4 피드백 보정에서는 실제 알한글 macOS Pages의 feedback DOM과 배포 CSS computed style을
대조해 영문 eyebrow를 제거하고 hero, 개인정보 안내, 2열 contact card와 button 구조를 같은 계층으로
재구성했다. 세 페이지의 header와 footer는 원본의 980px header, 52px 높이, 3열/단일 열 breakpoint,
배경·경계·간격을 공유하도록 통일했다. 홈에도 Footer를 추가하되 desktop과 mobile 모두 본문과
Footer를 한 viewport 안에 배치하고 스크롤을 만들지 않도록 했다. 제품 설명과 지원 플랫폼 문구만
Windows/Linux 범위에 맞게 유지했다.

Stage 3.5 피드백 보정에서는 제품 본문과 같은 17px이던 Footer 문구·링크를 13px 보조 위계로 낮추고
로고를 24px, desktop 높이를 61px, mobile 높이를 114px로 축소했다. 홈의 영문 eyebrow를 제거하고
설치 영역 제목을 `다운로드`로 명확히 했다. 설치 선택지는 17px section title, 15px 플랫폼·형식,
13px 용도 설명으로 정렬하고 Windows NSIS와 Linux AppImage를 각 플랫폼 권장 형식으로 같은 수준에서
표시했다. updates 주 action은 46px/16px, 보조 action은 42px/14px로 분리했으며 static CSS cache
drift를 막기 위해 세 페이지가 같은 version query를 사용하도록 했다.

Stage 3.6 피드백 보정에서는 HOP의 설치 선택 구조를 참고해 홈 다운로드를 `Windows`와 `Linux`
목차로 먼저 나누고, 선택지 제목은 `x64`·`arm64`, 설명은 NSIS·MSI·AppImage·DEB/RPM의 설치
형식과 용도로 재배치했다. Footer 전체 폭 배경 안에 980px inner wrapper를 추가해 desktop에서
Header와 정확히 같은 좌우 기준선을 사용하고, 820px·520px breakpoint에서도 각 Header padding과
같은 16px·12px를 사용하도록 정렬했다.

Stage 3.7 피드백 보정에서는 업데이트 페이지의 성격과 홈 다운로드 선택지의 중복을 줄이기 위해
`설치 형식` 목록과 공개 전 manifest 주소 노출을 제거했다. updater 지원 범위는 `앱에서 업데이트
확인` 한 문단에 압축하고, 홈의 다섯 설치 선택지는 공개 전 모두 업데이트 페이지의 최신 다운로드
dropdown으로 연결했다. 홈의 겹친 Windows/Linux 화면은 검증된 실제 Linux HWP 편집 화면 하나로
통일해 제품 화면의 가독성과 시각 초점을 높였다.

Stage 3.8 피드백 보정에서는 웹뷰 내용만 담긴 대표 자산을 기존 Linux exact-SHA acceptance
artifact의 성공한 `linux-system-print` 네이티브 전체 화면으로 교체했다. 1,920×1,080 원본에서
검은 desktop 여백만 x=319~1,600, y=78~1,001 범위로 제거해 알한글 아이콘, `Alhangeul` 제목,
창 제어 버튼과 실제 `biz_plan.hwp` 편집 화면을 모두 보존했다. 홈 최대 폭은 1,160px로 넓혀
1,280px desktop에서 대표 화면을 약 639px로 표시하고, 같은 화면으로 OG 이미지를 다시 생성했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `site/index.html` (84줄) | 5개 다운로드 선택지의 공통 최신 다운로드 fallback과 검증된 실제 HWP 편집 화면 하나로 홈 보정 |
| `site/updates/index.html` (69줄) | 참고 페이지 구조의 hero, SVG 꺾쇠가 있는 플랫폼 다운로드 dropdown, 압축된 updater 범위와 릴리즈 노트 안내 |
| `site/feedback/index.html` (72줄) | 원본과 같은 hero·privacy note·contact card 계층으로 email 복사/작성과 GitHub Issue 안내 재구성 |
| `site/styles.css` (174줄) | 단일 제품 화면을 읽기 쉬운 1,160px desktop shell로 확대하고 responsive·Footer 위계 유지 |
| `site/script.js` (92줄) | unpublished 내부 안내와 published 홈·dropdown exact artifact 전환, release note hydration 공유 |
| `site/assets/linux-editor.png` (1,282×924, 79,227 bytes) | 실제 Linux 네이티브 제목 표시줄과 HWP 편집 상태를 함께 보존한 대표 화면 |
| `site/assets/og-main.png` (1,920×1,080, 307,178 bytes) | 네이티브 전체 창 대표 화면, 다운로드 목차와 Footer를 반영한 PNG 공유 이미지 재생성 |
| `scripts/build-pages.mjs` (152줄) | 중첩 페이지의 root asset 경로를 depth에 맞춰 결정적으로 정규화 |
| `scripts/check-pages.mjs` (235줄) | 홈·업데이트·문의 필수 파일과 내부 hash 대상 존재 검사를 추가 |
| `tests/pages.test.mjs` (282줄) | 중첩 asset 출력, broken hash와 필수 페이지 누락 회귀 검사 추가 |
| `tests/pages-design.test.mjs` (285줄) | CSS/asset version, 네이티브 대표 화면 크기·SHA와 direct-download 계약 고정 |
| `mydocs/orders/20260827.md`, `mydocs/orders/20260828.md` | Stage 3.6 이력 보존과 Stage 3.8 완료·Stage 4 승인 대기 기록 |

대표 화면 SHA-256은 `a3d4460b8fc432f00a2ce97cd68552582b2f5dfdc88faec9f749e58be132618b`,
공유 이미지 SHA-256은 `09e918a49cdab575095f2623e3339015f1643a89f6943fc9d7fdbd470c6b2694`이다.
외부 package와 lockfile은 변경하지 않았고 모든 text source는 권장 300줄 상한 이하다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 3 신규 페이지는 구현계획서의 사용자 문서 위치인 `site/updates/`와 `site/feedback/`에
작성했다. 홈은 작업지시자의 명시적 시각 피드백에 따라 Stage 2의 장문 feature·FAQ·philosophy·footer를
제거하고 단일 화면으로 전면 보정했다. 따라서 홈 본문은 무손실 보존 대상이 아니며, 상세 설명은
분리 페이지와 알한글 macOS Pages가 담당한다.

Stage 3.4에서는 작업지시자의 명시적 비교 요청에 따라 feedback 본문과 모든 Footer의 markup을
참고 페이지와 같은 정보 계층으로 다시 작성했다. 지원 플랫폼, 제보 경로와 제품 소개는 제품 경계상
동일 문구로 복사할 수 없으므로 Windows/Linux 내용만 보존하고 시각 구조와 타이포그래피를 일치시켰다.

Stage 3.5에서는 작업지시자의 위계 피드백에 따라 Footer의 장문 소개를 한 문장으로 축약하고 홈 설치
선택지 문구를 플랫폼·형식과 용도로 재편했다. release target, href와 unpublished fail-closed 의미는
변경하지 않았고 published hydration도 동일한 세 exact artifact만 직접 다운로드로 전환한다.

Stage 3.6에서는 설치 선택지의 텍스트 계층과 Footer wrapper만 다시 구성했다. 기존 다섯 href,
세 `data-download-target`, published hydration과 미게시 안내 의미는 그대로 보존했으며, Header와
Footer의 페이지 이동·외부 링크 계약도 변경하지 않았다.

Stage 3.7에서는 소비자에게 중복되는 설치 형식 목록과 아직 게시하지 않은 manifest endpoint만
제거했다. 세 `data-download-target`과 published hydration은 그대로라 공개 릴리스 뒤 NSIS·MSI·
AppImage의 exact artifact 직접 다운로드 동작은 보존된다. 공개 전 다섯 href는 존재하지 않는 세부
anchor 대신 `#latest-download`로 통일했다. 실제 제품 증적은 삭제하지 않고 Linux 자산 하나만 홈에
표시하며, 기존 Windows 자산은 검증 증적으로 저장소에 보존한다.

Stage 3.8에서는 제품 동작과 문구를 변경하지 않았다. 새 대표 자산은 commit
`16149e8a99c7c870cca71d89bdc94f1e8069dc58`, native run `32919925454`, acceptance run
`32921517032`, `tauri-driver 2.0.6`에서 성공한 기존 공개 fixture 증적이다. 원본 screenshot
SHA-256 `e2ece75937eb105d1b51df96d9e01739218d272a2daa3e4807dfe6b6074b681c`에서 앱 창 밖의
검은 여백만 정확히 제거했으며 가짜 title bar, 보간·합성이나 새 GitHub Job은 사용하지 않았다.

제품 실행 코드, Pages workflow, `site/release.json` schema와 updater endpoint는 변경하지 않았다.
`release.json`은 계속 `unreleased`, 세 download 값은 null, manifest는 비게시 상태다.

## 검증 결과

실행 명령:

```bash
pnpm run build:pages
pnpm run check:pages
node --test tests/pages-design.test.mjs tests/pages.test.mjs tests/release-metadata.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
git diff --check
```

결과:

- OK — Pages build: source 11개와 승인 root asset 4개를 `_site`에 생성
- OK — Pages check: source 11개, output 15개; 세 필수 페이지·내부 hash·asset·manifest 계약 통과
- OK — Pages design/build/release metadata focused test 40개 통과, 실패·skip 없음
- OK — 제품 경계 269파일 통과; Windows/Linux 지원 범위 밖 font identifier 없음
- OK — 전체 automation test 254개 통과, 실패·skip 없음
- OK — 변경 파일 whitespace 오류 없음
- OK — output에 MSI·NSIS·AppImage direct URL과 `updater/stable.json` 없음

수동 시각·상호작용 확인:

- OK — `http://127.0.0.1:4173/`에서 홈 1,280×900과 390×844 모두
  `scrollWidth=innerWidth`, `scrollHeight=innerHeight`; 스크롤 없는 한 화면 확인
- OK — 홈 제목은 두 viewport 모두 정확히 3줄이며 1,280px에서 56.96px, 390px에서 39px;
  가장 긴 둘째 줄의 실제 폭은 각각 394.55/270.66px로 493.82/362px 컨테이너 안에 유지
- OK — 모바일 홈은 실제 제품 화면을 숨기고 제목·설명·다섯 설치 안내를 390px 안에 유지
- OK — header의 업데이트·문의/제보·GitHub와 하위 페이지의 홈 교차 이동 확인; header 다운로드 없음
- OK — unreleased 홈의 세 직접 다운로드 대상은 내부 설치 안내로 이동하고 수동 package 두 항목과 분리
- OK — published fixture 실행 시 홈과 dropdown이 exact tag의 NSIS·MSI·AppImage URL로 직접 전환
- OK — updates는 system font, 제목 72px/40px, 본문 21px/18px, content 880px/350px로 참고 페이지와 정렬
- OK — 플랫폼 설치 카드는 0개이며 native `<details>` dropdown 세 항목과 릴리즈 노트 목록 확인
- OK — 666×863 updates에서 action group 중심 오차 0px; SVG icon은 16×16px, 버튼 높이는 42px,
  icon 세로 중심 오차는 0px이며 dropdown open 상태에서도 horizontal overflow 없음
- OK — 홈·updates·feedback을 340·390·666·820px에서 요소 단위로 검사한 결과 viewport 밖 표시 요소 0개;
  모든 header/nav와 contact 단일 열 전환이 viewport 안에 유지
- OK — 340px updates에서 두 action은 중앙 2행으로 전환; dropdown은 left 20px/right 320px이고
  문서 흐름 안에서 GitHub Releases보다 먼저 끝나 겹침과 horizontal overflow 없음
- OK — 200% 확대에 해당하는 640×450 저높이 조건에서 horizontal overflow 없이 의도한 세로 scroll fallback
- OK — semantic native link/button, skip link, 44px header target, focus-visible와 heading/landmark DOM 확인
- OK — reduced-motion, no-JS 최종 콘텐츠 가시성과 12px/280ms one-shot motion은 source test로 확인
- OK — 실제 Chrome 1,920×1,080 홈은 `scrollWidth=innerWidth`, `scrollHeight=innerHeight`이고
  header 52px, main 935px, Footer 93px로 한 viewport에 정확히 배치
- OK — 실제 Chrome 390×844 홈은 document 390×844, 가로·세로 scroll 없이 362px 본문과
  원본 responsive Footer를 같은 viewport 안에 유지
- OK — 실제 Chrome 390×844 updates/feedback은 document 폭이 각각 390px이고 action·privacy note·
  contact card가 single column으로 전환돼 horizontal overflow 없음
- OK — 1,280×720 feedback computed style은 원본과 같은 hero 980px, content 880px, h1 72/76.32px,
  설명 21/31.5px, card 432px×2, gap 16px, Footer 93px 수치로 확인
- OK — Stage 3.5 desktop Footer는 61px, logo 24px, 본문·링크 13px이며 이전 93px/17px보다
  본문 대비 보조 위계가 명확함
- OK — Stage 3.5 390×844 홈은 document 390×844, Footer 114px, download title 17px,
  선택지 15px/13px이고 horizontal·vertical scroll 없음
- OK — 390×844 updates의 primary action은 46px/15px, secondary action은 42px/14px로
  중앙 정렬되며 action group 폭 350px 안에 유지
- OK — 390×844 feedback은 title 40px, card title 24px, card copy/action 15px,
  Footer 13px 순서로 축소되고 document 폭이 viewport와 같은 390px
- OK — Stage 3.6 1,280×720 홈은 document 1,280×720로 스크롤이 없고 Header와 Footer inner가
  모두 x=150~1,130, 980px로 일치하며 Footer 높이는 61px
- OK — Stage 3.6 390×844 홈은 document 390×844로 스크롤이 없고 Header와 Footer inner가
  모두 x=12~378, 366px로 일치하며 Windows/Linux 목차와 x64·arm64 선택지가 viewport 안에 유지
- OK — Stage 3.6 1,280×720 feedback도 Header와 Footer inner가 x=150~1,130, 980px로 일치하고
  updates의 action·Footer 역시 같은 980px 기준선을 사용
- OK — Stage 3.7 1,280×720 홈은 document 1,280×720로 스크롤이 없고 실제 Linux HWP 편집 화면
  하나만 x=645~1,180, 535px 폭으로 표시하며 겹친 가상 window label은 없음
- OK — Stage 3.7 1,280×720 updates에는 `알한글 업데이트`, `앱에서 업데이트 확인`, `릴리즈 노트`
  세 heading만 남고 설치 형식 목록과 manifest 주소가 표시되지 않음
- OK — Stage 3.7 390×844 updates는 document 폭 390px, action group x=20~370, 350px로 중앙 정렬되고
  horizontal overflow 없이 같은 세 heading과 압축된 updater 범위를 유지
- OK — Stage 3.8 1,280×720 홈은 document 1,280×720로 스크롤이 없고 네이티브 전체 창을
  x=581~1,220, 약 639px 폭으로 표시해 아이콘·`Alhangeul` 제목·창 제어 버튼이 함께 보임
- OK — Stage 3.8 1,024×768과 821×900 홈은 horizontal overflow 없이 각각 약 473px·278px
  대표 화면을 유지하고, 820×900과 390×844에서는 기존 responsive 규칙대로 대표 화면을 숨김
- OK — 1,920×1,080 공유 화면에서 네이티브 제목 표시줄을 포함한 단일 실제 제품 화면,
  플랫폼별 다운로드 목차, Footer와 document 1,920×1,080을 확인하고 PNG 크기·SHA-256을 고정

구현계획서의 FAQ용 native `<details>`는 최신 작업지시자가 홈 FAQ를 제거해 단일 화면으로
보정하도록 한 범위와 충돌하므로 적용 대상에서 제외했다. 대신 updates의 다운로드 선택에는
JavaScript 없이도 작동하는 native `<details>`를 사용했다.

## 잔여 위험

- 실제 installer URL과 updater manifest는 아직 존재하지 않는다. Issue #16의 artifact·signature
  검증과 별도 게시 승인 전에는 현재 준비 상태를 유지해야 한다.
- 이번 Stage는 로컬 read-back까지 완료했다. public Pages exact-SHA 배포와 외부 URL read-back은
  구현계획대로 Stage 4에서 한 번만 수행한다.
- 낮은 화면 높이에서는 정보 손실보다 접근성을 우선해 홈의 세로 scroll fallback을 허용한다.

## 다음 단계 영향

- Stage 4는 현재 site source를 보정하지 않고 운영 문서의 artifact→release data→updater manifest
  게시 순서를 확정한 뒤 전체 중립 gate를 실행한다.
- Stage 4 source/report commit의 exact 40자리 SHA로 Pages workflow를 한 번만 dispatch하고,
  public root/updates/feedback와 미게시 download/updater 상태를 다시 읽어야 한다.
- 로컬 미리보기 서버는 작업지시자가 디자인과 페이지 이동을 직접 확인할 수 있도록 계속 실행한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 운영 문서·통합 QA와 exact-SHA 배포로 진행한다.
