# Task #45 Stage 3 완료 보고 — 단일 화면 홈과 업데이트·문의 페이지

GitHub Issue: [#45](https://github.com/postmelee/alhangeul-tauri/issues/45)
구현계획서: [`task_m010_45_impl.md`](../plans/task_m010_45_impl.md)
Stage: 3

## 단계 목적

Windows/Linux 릴리스 진입점을 한 화면 홈으로 정리하고 업데이트와 문의/제보를 별도 페이지로
분리했다. 알한글 macOS Pages의 header, system font, 본문 폭, section rhythm과 Footer를 공통
디자인 기준으로 삼되 지원 플랫폼과 설치 방식은 이 제품의 Windows/Linux 범위에 맞췄다.

공개 전에는 존재하지 않는 installer URL이나 updater manifest를 노출하지 않는다. 검증된
published release metadata가 생기면 Windows NSIS·MSI와 Linux x64 AppImage만 exact artifact
직접 다운로드로 전환하고, DEB·RPM·arm64는 계속 수동 설치 안내로 연결한다.

## 피드백 반영 이력

- Stage 3.1~3.4: macOS Pages의 computed style과 DOM을 대조해 system font, hero, header,
  Footer, updates dropdown·release note와 feedback contact 구조를 같은 정보 계층으로 정리했다.
- Stage 3.5~3.9: Footer와 홈의 글자·간격 위계를 줄이고 Windows/Linux 목차를 도입했다. 중복된
  설치 형식 설명을 updates에서 제거하고 실제 Linux 네이티브 앱 창 하나를 대표 화면으로 사용했다.
- Stage 3.10~3.12: 홈 제목을 44.8px/33.93px로 낮추고 다운로드 아이콘과 `var(--blue)`를 적용한
  뒤, 권장 형식과 보조 형식의 색·테두리·shadow를 구분했다.
- Stage 3.13~3.14: 다섯 카드형 선택지를 한 줄 목록으로 바꾸고 플랫폼·환경·용도·행동의
  글자 크기와 회색 단계를 세분화했다.
- Stage 3.15: 앞선 목록형 UI를 폐기하고 native radio 기반 `Windows / Linux` segmented picker로
  다시 설계했다. 한 번에 한 플랫폼과 한 개의 권장 CTA만 강조하며 나머지는 보조 텍스트 링크로
  낮췄다. 클릭·방향키·OS 초기 선택, 공개 전 안내와 published label hydration을 함께 지원한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `site/index.html` (97줄) | native platform picker, 플랫폼별 권장 CTA 1개와 보조 설치 링크 구성 |
| `site/updates/index.html` (69줄) | 플랫폼 dropdown, updater 범위와 릴리즈 노트 목록 구성 |
| `site/feedback/index.html` (72줄) | macOS Pages와 같은 hero·privacy note·contact card 계층 구성 |
| `site/styles.css` (193줄) | segmented switch, 고정 높이 panel, 주·보조 action과 responsive 규칙 |
| `site/script.js` (114줄) | Linux 초기 선택, 방향키 전환, exact artifact와 공개 버전 label hydration |
| `site/assets/linux-editor.png` (1,282×924, 79,227 bytes) | 실제 Linux 네이티브 제목 표시줄과 HWP 편집 화면 |
| `site/assets/og-main.png` (1,920×1,080, 283,689 bytes) | Stage 3.15 Windows 기본 홈 공유 이미지 |
| `scripts/build-pages.mjs` (152줄) | 중첩 페이지 root asset 경로 정규화 |
| `scripts/check-pages.mjs` (235줄) | 필수 페이지, hash 대상, asset와 manifest 계약 검사 |
| `tests/pages.test.mjs` (282줄) | 중첩 asset, broken hash와 필수 페이지 누락 회귀 검사 |
| `tests/pages-design.test.mjs` (296줄) | radio·panel·label hydration·방향키·OG SHA 계약 고정 |
| `mydocs/orders/20260827.md`, `mydocs/orders/20260828.md` | Stage 3 진행 이력과 Stage 4 승인 대기 기록 |

대표 화면 SHA-256은 `a3d4460b8fc432f00a2ce97cd68552582b2f5dfdc88faec9f749e58be132618b`,
공유 이미지 SHA-256은 `188dd3c0cccd36e68135965fcf388489cc6d95726fbc78929c19e60719e25bcb`이다.
외부 package와 lockfile은 변경하지 않았고 모든 text source는 권장 300줄 상한 이하다.

## 본문 변경 정도 / 본문 무손실 여부

홈은 작업지시자의 명시적 피드백에 따라 장문 feature·FAQ·philosophy를 제거한 단일 화면으로
전면 보정했으므로 기존 장문은 무손실 보존 대상이 아니다. 제품 설명과 문의 경로는 updates,
feedback과 알한글 macOS Pages가 나눠 담당한다.

Stage 3.15는 다운로드 표현만 교체했다. 기존 다섯 fallback href와 세 `data-download-target`,
공개 전 fail-closed와 published exact artifact 전환은 유지했다. native radio이므로 JavaScript가
없어도 플랫폼을 전환할 수 있고, script는 Linux OS 초기 선택과 방향키·버전 label만 보강한다.

제품 실행 코드, Pages workflow, `site/release.json` schema와 updater endpoint는 변경하지 않았다.
`release.json`은 계속 `unreleased`, 세 download 값은 null, manifest는 비게시 상태다.

## 검증 결과

실행 명령:

```bash
pnpm run build:pages
pnpm run check:pages
node --test tests/pages-design.test.mjs tests/pages.test.mjs tests/release-metadata.test.mjs
pnpm run test:automation
node scripts/check-product-boundary.mjs # 격리 snapshot
git diff --check
```

자동 검증 결과:

- OK — Pages build: source 11개와 승인 root asset 4개를 `_site`에 생성
- OK — Pages check: source 11개, output 15개와 필수 페이지·hash·manifest 계약 통과
- OK — Stage 3 계획서 Pages/workflow test 42개 통과, 실패·skip 없음
- OK — Pages design/build/release metadata focused test 40개 통과, 실패·skip 없음
- OK — 전체 automation test 254개 통과, 실패·skip 없음
- OK — 무관한 `.claude/worktrees/pr-review-dc9f5b`를 제외한 격리 snapshot 제품 경계 263파일 통과
- OK — 변경 파일 whitespace 오류 없음
- OK — output에 MSI·NSIS·AppImage direct URL과 `updater/stable.json` 없음

수동 시각·상호작용 결과:

- OK — 1,280×720 Windows 기본 홈은 document가 viewport와 같고 overflow 요소가 없다. Windows
  panel 하나만 표시되며 segmented switch 196px, 권장 CTA 94×34px, 환경명 16px/650이다.
- OK — Linux label을 누르면 Linux radio와 panel만 활성화되고 layout shift나 가로 overflow가 없다.
- OK — 390×844 Windows/Linux 모두 document가 viewport와 같고 switch·panel은 x=14~376 안에
  유지된다. Footer를 포함해 가로·세로 스크롤이 없다.
- OK — radio에서 `ArrowRight`를 누르면 checked와 focus가 모두 Linux로 이동한다.
- OK — 1,920×1,080 OG에는 한 플랫폼 CTA만 강조된 홈, 실제 네이티브 앱 창과 Footer가 보인다.
- OK — header의 업데이트·문의/제보·GitHub와 하위 페이지의 홈 이동, header 다운로드 제거 확인
- OK — unpublished 홈은 내부 설치 안내로 이동하고 published fixture는 exact tag의 세 URL과
  `v0.2.0 다운로드`/`다운로드 →` label로 전환된다.
- OK — updates의 native `<details>` dropdown, SVG chevron, release note와 feedback의 contact card를
  340·390·666·820px에서 확인했으며 viewport 밖 표시 요소가 없다.
- OK — semantic native link/button/radio, skip link, focus-visible, heading/landmark와 reduced-motion 확인

구현계획서의 FAQ용 native `<details>`는 홈 FAQ를 제거하라는 최신 작업지시와 충돌해 제외했다.
updates의 다운로드 선택에는 JavaScript 없이 작동하는 native `<details>`를 유지한다.

## 잔여 위험

- 실제 installer URL과 updater manifest는 아직 존재하지 않는다. Issue #16의 artifact·signature
  검증과 별도 게시 승인 전에는 현재 준비 상태를 유지해야 한다.
- public Pages exact-SHA 배포와 외부 URL read-back은 구현계획대로 Stage 4에서 한 번만 수행한다.
- 낮은 화면 높이에서는 정보 손실보다 접근성을 우선해 홈의 세로 scroll fallback을 허용한다.

## 다음 단계 영향

- Stage 4는 운영 문서의 artifact → release data → updater manifest 게시 순서를 확정하고 전체
  중립 gate를 실행한다.
- Stage 4 source/report commit의 exact 40자리 SHA로 Pages workflow를 한 번만 dispatch하고,
  public root/updates/feedback와 미게시 download/updater 상태를 다시 읽는다.
- 로컬 미리보기 서버는 작업지시자가 디자인과 페이지 이동을 확인할 수 있도록 계속 실행한다.

## 승인 요청

Stage 3 산출물과 검증 결과를 승인하면 Stage 4 운영 문서·통합 QA와 exact-SHA 배포로 진행한다.
