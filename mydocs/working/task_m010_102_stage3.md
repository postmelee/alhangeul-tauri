# Task M010 #102 Stage 3 보고서 — v0.1.1 본문과 버전별 웹 안내

GitHub Issue: [#102](https://github.com/postmelee/alhangeul-tauri/issues/102)
구현계획서: [task_m010_102_impl.md](../plans/task_m010_102_impl.md)
Stage: 3
상태: 구현·검증 완료 / Stage 4 승인 대기
승인: 2026-10-04, Stage 2 완료 보고 후 같은 스레드에서 작업지시자의 “진행해줘”.
보고일: 2026-10-04 KST

## 단계 목적

공개 v0.1.1의 실제 변경과 검증 근거를 새 규격의 첫 원문·공식 기록·웹 안내에 적용한다. 현재 0.1.0 사이트와 PR #101의 0.1.1 적용안을 각각 검사해 최신 표시·다운로드·화면을 수용한다. 공개 본문 수정이나 피드 전환은 실행하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/releases/v0.1.1.notes.json` | 159줄; 공개 metadata·6개 설치 형식·3개 updater target·사용자 문구·실제 PR/Issue snapshot |
| `docs/releases/v0.1.1.md` | 148줄; 공개/미공개 상태·성능 조건·source/run·설치 수용·hash·후속 gate |
| `site/updates/v0.1.1.html` | 78줄; 동일 원문에서 생성한 5개 안내 구역·실제 공개일·버전 고정 다운로드 |
| `site/updates/index.html`, `site/script.js` | 버전별 안내 연결; 실제 release data와 같은 버전만 최신 표시; 중복 최신 행 제거 |
| `site/styles.css`, `site/index.html`, `site/feedback/index.html` | 본문 링크 식별·공통 asset cache version 갱신 |
| `mydocs/_templates/website_release_note.html`, `scripts/releases/website-render.mjs` | 제품 한글 제목·모바일 header 공간·기존 family link 정합성 |
| `scripts/check-product-boundary.mjs` | stable 버전 안내 경로의 기존 family 링크만 허용; 제품 지원 범위는 Windows/Linux 유지 |
| `tests/pages-release-notes.test.mjs` | 103줄; 최신 표시·과거 안내·미공개/오류 data·다운로드 회귀 8개 |
| 기존 Pages fixture·design·entry 및 product-boundary 테스트 | 합성 release 상태의 격리와 실제 버전 안내·지원 경계 검사 |
| 계획서 2종·오늘할일 | 실제 Stage 3 승인과 완료/Stage 4 대기 기록; #97 행 보존 |

검토용 출력은 `/tmp/task102-v011-preview/`의 `release-body.md`, `website-release-note.html`, `updater-notes.txt`다. PR #101 후보는 `/tmp/task102-pr101-preview/`에 준비했다. 생성물은 원격 게시하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

- 기존 공개 body·asset·tag·제품 binary·updater key·endpoint·rhwp submodule은 변경하지 않았다. 추적 중인 `site/release.json`은 기존 0.1.0 bytes와 동일하다.
- 공식 기록과 사용자 원문은 신규 작성했다. 공개 app source `96e89e900415ee9e1e942b5c01c833dea3415e86`, 공개 시각 `2026-10-03T17:07:44Z`, rhwp v0.8.6 resolved commit을 실제 공개 근거와 대조했다.
- tag 비교의 13개 merged PR을 분류하고 #98만 주요 앱 변화로 설명했다. #97은 OPEN 참고 이슈로 유지하며, product tag 이후 #100 harness를 v0.1.1 기능으로 넣지 않았다.
- 고정 VM·공개 문서의 5회 warm open median 수치는 측정 조건을 함께 적었다. Wayland/하이브리드 GPU의 원인 확정이나 모든 PC 성능 보장으로 표현하지 않았다.
- 기존 목록의 지난 공개 대기 문구를 실제 상태에 맞춰 수정했다. 최신 여부는 파일명 대신 공개 release data로 판단한다. 과거 안내의 고정 다운로드는 유지한다.
- 버전 안내의 기존 family 링크 2줄만 경계 검사에서 허용했다. 추가 macOS 제품 지원 문구·잘못된 버전 경로는 회귀에서 거부한다. 경계 script는 300줄로 정리했다.

## 검증 결과

구현계획서의 Stage 3 명령:

```bash
pnpm run generate:release-notes -- --version 0.1.1 --output-dir /tmp/task102-v011-preview
pnpm run check:release-notes
pnpm run test:release-notes
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs tests/updater-release.test.mjs
git diff --check
```

추가 영향 검증:

```bash
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run test:automation
node --test tests/product-boundary.test.mjs
```

| 검증 | 결과 |
|---|---|
| 생성·원문/출력 drift | 생성 3종 완료, 원문 1개 검사 통과; source HTML과 생성 결과 일치 |
| 릴리즈 규격 | 124/124 통과, 실패·skip 0 |
| Pages + updater 계약 | 66/66 통과, 실패·skip 0 |
| 전체 Node 자동화 | 1184/1184 통과, 실패·skip 0; 위 개별 검사 포함, 합산하지 않음 |
| 제품 경계 | 775개 파일 통과; 마지막 형식 정리 후 경계 회귀 24/24 통과 |
| upstream | 39/39 통과 |
| Studio | 39개 파일·251개 테스트 통과; 플랫폼 중립 web build 성공 |
| 현재 0.1.0 Pages | source 17·output 20 통과; release data 원본 보존 |
| PR #101 0.1.1 후보 | source 17·output 20 통과; 짧은 notes와 자동 target 3개 정합 |
| diff | whitespace 검사 통과 |

실행 출력은 `/tmp/task102-stage3-*.log`에 보존했다. Studio build의 기존 chunk size·정적/동적 import 경고는 비차단이다. Windows/Linux native build·설치·실제 upgrade를 이번 호스트에서 실행하지 않았다.

공개 자료 대조:

- GitHub Release ID `402604603`의 11개 asset identity/size/digest를 재조회했다. inventory·checksum·3개 signature의 작은 공개 파일 5개를 새로 읽었다.
- 이전 public read-back에서 보관한 설치본 bytes를 재해시하고 현재 공개 identity와 대조했다. 10개 checksum entry 및 3개 Minisign signature가 일치했다. 이번 단계에서 대형 설치본 전체를 새로 내려받거나 설치한 것은 아니다.
- producer와 고정 artifact 4개 ID/digest/head SHA/만료 시각, 실제 PR 제목·merge SHA·Issue 상태를 대조했다. 자세한 공개 URL/run과 한계는 공식 릴리즈 기록에 보존했다.
- 실제 0.1.0 → 0.1.1 upgrade는 미실행이다. 기존 설치 수용·same-version 시험·manifest HTTP 검사를 실제 upgrade 성공으로 기록하지 않았다.

브라우저 수용:

- 현재 0.1.0 data에서는 새 v0.1.1 안내에 사이트 최신 0.1.0을 표시하고 기존 최신 다운로드를 유지했다.
- 후보 0.1.1 data에서는 목록의 로컬 v0.1.1 안내 하나만 최신으로 표시하고 버전 안내로 이동했다. 다운로드 메뉴의 NSIS/MSI/AppImage, 본문의 고정 6개 asset·기술 기록 링크를 확인했다.
- 1366×900, 390×844, 320×740 화면에서 페이지·목록·홈의 header/footer·한글 줄바꿈·이미지·링크를 확인했다. 확인 화면의 가로 넘침은 없고 브라우저 error/warn log는 0개다.
- screenshot은 `/tmp/task102-stage3-screens/`에 저장했다. 최종 화면은 `candidate-version-desktop.png`, `candidate-version-mobile.png`이며 로컬 후보 탭을 검토용으로 남겼다.

게시 전 검토 hash(SHA-256):

| 항목 | 값 |
|---|---|
| 사용자 원문 | `8bd02f819a3757c327ac728b73ce5091d45392fc96f645ab47d989452d975d49` |
| GitHub body | `43b9a7b31f54ad5fb17cd4902801532d52ff3ecb49f8cc2e200f910ae387b8f7` |
| 웹 source | `07296b414c3d19d9a923e63af863f629cee96755e939e18ba3c67b2aca496072` |
| short notes 파일(LF 포함) | `74457f7c870670f1da49fccd71989fcf7941d221bb22a334cb2ac81edfdaafa1` |
| 후보 site/release.json | `87f4544545fd9946f9cf7fbfc4cecffab38cbb31e1e4c290a55e76d1810207cd` |
| 후보 stable manifest | `62fae230339497b132be013ec91df7cd83b710b69c9de4f56ffff1c407463728` |
| 변경 없는 추적 site/release.json | `6b610f6595aa0694f55516db7d0a62e8a161b5b94c9524723dceedbc9f7449de` |

## 잔여 위험

- 생성 body·웹 안내·후보 feed는 검토용이다. GitHub body 수정·PR #101 merge·Pages/manifest 공개는 아직 수행하지 않았다. live feed는 0.1.0이다.
- Windows/Linux runner의 #102 새 exact SHA 빠른 CI는 PR 게시 후 확인해야 한다. 이 단계의 로컬 검사를 원격 required check 완료로 간주하지 않는다.
- 실제 NSIS→NSIS, MSI→MSI, AppImage→AppImage production upgrade는 #97 후속 범위 승인·실행이 필요하다. 사용자 동의·dirty 보호·서명 검증·설치/재시작 결과를 확인해야 한다.
- Authenticode 미서명, NSIS thumbnail raw 실패, 강제 MSI 재부팅 후 미검증 및 실제 Wayland/프린터 환경 한계는 공식 기록에 남겼다.

## 다음 단계 영향

- Stage 4에서 중앙 템플릿 index·release record·운영 runbook/checklist·릴리즈 index·provenance를 기존 문서 위치에서 연결한다.
- 원문 작성→metadata 대조→생성→검사→정확한 body 승인→게시→read-back 순서를 기록한다. #102 규격 PR을 먼저 병합한 뒤 #97/PR #101에 최신 devel을 merge 방식으로 반영한다.
- 새 short notes에 따라 후보 manifest hash도 바뀌었다. 이전 PR #101 manifest hash를 재사용하지 않고 최종 승인 bytes를 다시 검사한다. 앱 source SHA와 Pages source SHA를 구분한다.
- 이미 수용한 동일 공개 설치본 bytes는 근거를 기록해 재사용한다. 원문·템플릿 변경 시 body/HTML/notes와 후보 Pages를 재생성·검증해야 한다.

## 승인 요청

- Stage 3 산출물·공개 근거 대조·브라우저 수용 결과의 검토 및 Stage 4 운영 문서·통합 검증·#97 인계 진입 승인을 요청한다.
- 이번 승인은 공개 body 수정·PR 병합·Pages 배포·실제 upgrade 실행 승인을 대신하지 않는다.
