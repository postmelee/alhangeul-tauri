# Task #45 Stage 3 완료 보고 — 단일 화면 홈과 업데이트·문의 페이지

GitHub Issue: [#45](https://github.com/postmelee/alhangeul-tauri/issues/45)
구현계획서: [`task_m010_45_impl.md`](../plans/task_m010_45_impl.md)
Stage: 3

## 단계 목적

업데이트와 문의/제보를 홈에서 분리하고, 각 페이지의 상단 메뉴 구조를 알한글 macOS Pages와
같은 이동 방식으로 정렬했다. 작업지시자의 Stage 2 시각 피드백을 함께 반영해 홈은 스크롤 없는
한 화면으로 줄이고, HOP처럼 플랫폼과 설치 형식을 바로 고를 수 있는 다섯 설치 안내 버튼을
배치했다. 여러 플랫폼을 다루는 제품 특성상 header 다운로드 항목은 제거했다.

공개 전 계약은 유지한다. 홈의 설치 안내는 직접 artifact가 아니라 updates 페이지의 정확한
NSIS·MSI·AppImage·수동 패키지 항목으로 이동하며, 검증된 release metadata가 생기기 전까지
installer URL과 updater manifest를 만들지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `site/index.html` (75줄) | 단일 viewport hero, Windows/Linux 실제 화면, 5개 플랫폼별 설치 안내로 홈 재구성 |
| `site/updates/index.html` (72줄) | NSIS·MSI·AppImage, DEB·RPM·arm64 fallback과 stable manifest 게시 경계 안내 |
| `site/feedback/index.html` (51줄) | 개인정보 주의, email 복사/작성, GitHub Issue와 rhwp upstream 분류 안내 |
| `site/styles.css` (123줄) | macOS Pages 계열 header·subpage, HOP형 설치 선택, 1280/390 반응형과 저높이 fallback 구현 |
| `site/script.js` (66줄) | 세 페이지 공통 release hydration과 문의 email 복사 동작으로 축소·공유 |
| `site/assets/og-main.png` (1,920×1,080, 348,705 bytes) | 최종 단일 화면 홈을 반영한 공유 이미지 재생성 |
| `scripts/build-pages.mjs` (152줄) | 중첩 페이지의 root asset 경로를 depth에 맞춰 결정적으로 정규화 |
| `scripts/check-pages.mjs` (235줄) | 홈·업데이트·문의 필수 파일과 내부 hash 대상 존재 검사를 추가 |
| `tests/pages.test.mjs` (282줄) | 중첩 asset 출력, broken hash와 필수 페이지 누락 회귀 검사 추가 |
| `tests/pages-design.test.mjs` (184줄) | 새 메뉴·메타데이터·지원 범위·연락 경로·단일 viewport·motion 계약으로 갱신 |
| `mydocs/orders/20260827.md` | Stage 3 완료와 Stage 4 승인 대기로 진행 상태 갱신 |

공유 이미지 SHA-256은
`f2f382f15c5ce58e7516b9eedee362741828ca220e43e8260791828f77d5c2b3`이다. 외부 package와
lockfile은 변경하지 않았고 모든 text source는 권장 300줄 상한 이하다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 3 신규 페이지는 구현계획서의 사용자 문서 위치인 `site/updates/`와 `site/feedback/`에
작성했다. 홈은 작업지시자의 명시적 시각 피드백에 따라 Stage 2의 장문 feature·FAQ·philosophy·footer를
제거하고 단일 화면으로 전면 보정했다. 따라서 홈 본문은 무손실 보존 대상이 아니며, 상세 설명은
분리 페이지와 알한글 macOS Pages가 담당한다.

제품 실행 코드, Pages workflow, `site/release.json` schema와 updater endpoint는 변경하지 않았다.
`release.json`은 계속 `unreleased`, 세 download 값은 null, manifest는 비게시 상태다.

## 검증 결과

실행 명령:

```bash
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs tests/actions-workflows.test.mjs
pnpm run test:automation
git diff --check
```

결과:

- OK — Pages build: source 11개와 승인 root asset 4개를 `_site`에 생성
- OK — Pages check: source 11개, output 15개; 세 필수 페이지·내부 hash·asset·manifest 계약 통과
- OK — Pages/Actions focused test 41개 통과, 실패·skip 없음
- OK — 전체 automation test 253개 통과, 실패·skip 없음
- OK — 변경 파일 whitespace 오류 없음
- OK — output에 MSI·NSIS·AppImage direct URL과 `updater/stable.json` 없음

수동 시각·상호작용 확인:

- OK — `http://127.0.0.1:4173/`에서 홈 1,280×900과 390×844 모두
  `scrollWidth=innerWidth`, `scrollHeight=innerHeight`; 스크롤 없는 한 화면 확인
- OK — 모바일 홈은 실제 제품 화면을 숨기고 제목·설명·다섯 설치 안내를 390px 안에 유지
- OK — header의 업데이트·문의/제보·GitHub와 하위 페이지의 홈 교차 이동 확인; header 다운로드 없음
- OK — 홈 AppImage 안내가 `/updates/#linux-appimage`의 `x64 AppImage` 항목으로 이동
- OK — updates/feedback 1,280px와 390px에서 horizontal overflow 없음; 지원 항목과 문의 action read-back
- OK — 200% 확대에 해당하는 640×450 저높이 조건에서 horizontal overflow 없이 의도한 세로 scroll fallback
- OK — semantic native link/button, skip link, 44px header target, focus-visible와 heading/landmark DOM 확인
- OK — reduced-motion, no-JS 최종 콘텐츠 가시성과 12px/280ms one-shot motion은 source test로 확인

구현계획서의 native `<details>` 수동 항목은 최신 작업지시자가 홈 FAQ를 제거해 단일 화면으로
보정하도록 한 범위와 충돌하므로 적용 대상에서 제외했다. 상세 정보는 독립 페이지의 항상 보이는
본문으로 제공한다.

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
