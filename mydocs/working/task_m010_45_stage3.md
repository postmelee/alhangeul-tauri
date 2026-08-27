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

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `site/index.html` (80줄) | 단어 중간 줄바꿈 없는 3줄 제목, Windows/Linux 실제 화면, 5개 설치 안내와 공통 Footer로 홈 재구성 |
| `site/updates/index.html` (85줄) | 참고 페이지 구조의 hero, SVG 꺾쇠가 있는 플랫폼 다운로드 dropdown, 설치 형식·릴리즈 노트·manifest 안내 |
| `site/feedback/index.html` (72줄) | 원본과 같은 hero·privacy note·contact card 계층으로 email 복사/작성과 GitHub Issue 안내 재구성 |
| `site/styles.css` (184줄) | 원본 header·feedback·footer 수치와 responsive action/dropdown, 무스크롤 홈 체계를 통합 |
| `site/script.js` (92줄) | unpublished 내부 안내와 published 홈·dropdown exact artifact 전환, release note hydration 공유 |
| `site/assets/og-main.png` (1,920×1,080, 202,010 bytes) | 공통 Footer까지 포함한 최종 홈 화면으로 공유 이미지 재생성 |
| `scripts/build-pages.mjs` (152줄) | 중첩 페이지의 root asset 경로를 depth에 맞춰 결정적으로 정규화 |
| `scripts/check-pages.mjs` (235줄) | 홈·업데이트·문의 필수 파일과 내부 hash 대상 존재 검사를 추가 |
| `tests/pages.test.mjs` (282줄) | 중첩 asset 출력, broken hash와 필수 페이지 누락 회귀 검사 추가 |
| `tests/pages-design.test.mjs` (289줄) | 공통 Footer, feedback 원본 구조, 홈 무스크롤·SVG icon·반응형 dropdown과 direct-download 계약 추가 |
| `mydocs/orders/20260827.md` | Stage 3 완료와 Stage 4 승인 대기로 진행 상태 갱신 |

공유 이미지 SHA-256은
`240d2b7fcd822b5b4c9a42557c5a924db4b884fb8543569f34b8432ea9cfdb74`이다. 외부 package와
lockfile은 변경하지 않았고 모든 text source는 권장 300줄 상한 이하다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 3 신규 페이지는 구현계획서의 사용자 문서 위치인 `site/updates/`와 `site/feedback/`에
작성했다. 홈은 작업지시자의 명시적 시각 피드백에 따라 Stage 2의 장문 feature·FAQ·philosophy·footer를
제거하고 단일 화면으로 전면 보정했다. 따라서 홈 본문은 무손실 보존 대상이 아니며, 상세 설명은
분리 페이지와 알한글 macOS Pages가 담당한다.

Stage 3.4에서는 작업지시자의 명시적 비교 요청에 따라 feedback 본문과 모든 Footer의 markup을
참고 페이지와 같은 정보 계층으로 다시 작성했다. 지원 플랫폼, 제보 경로와 제품 소개는 제품 경계상
동일 문구로 복사할 수 없으므로 Windows/Linux 내용만 보존하고 시각 구조와 타이포그래피를 일치시켰다.

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
