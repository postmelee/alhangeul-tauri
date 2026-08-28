# Task #45 구현계획서 — Windows/Linux 릴리스·업데이트용 GitHub Pages 재구성

수행계획서: [`task_m010_45.md`](task_m010_45.md)
GitHub Issue: [#45](https://github.com/postmelee/alhangeul-tauri/issues/45)
마일스톤: M010

Issue #45는 제품 Pages를 공개 전 `unreleased` 상태로 안전하게 재구성하고 Issue #16이 사용할
updater URL 계약을 확정하는 task다. release tag·GitHub Release·installer artifact와 updater
signature가 아직 공개 입력이 아니므로, 이번 task의 Pages source는 다운로드 준비 상태와 수동
지원 범위를 정확히 안내하되 존재하지 않는 installer나 manifest 링크를 만들지 않는다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | release data·build·exact-SHA 배포 계약 | metadata validator, deterministic builder, Pages workflow/test | unpublished/published fixture와 workflow fail-closed test |
| 2 | Windows/Linux 홈과 제품 시각 체계 | 새 home, 실제 app visual, shared CSS/motion | 1280px·390px 시각, 기능·금지 문구, asset provenance |
| 3 | 업데이트·문의 페이지와 접근성 | updates/feedback, installer 선택·fallback, keyboard/motion | link·landmark·focus·reduced-motion·base path |
| 4 | 운영 문서·통합 QA와 보호 브랜치 배포 경계 | release 운영 경계, Stage report, post-merge runbook | 전체 중립 gate, 환경 보호 차단 분류, `devel` 병합 후 검증 분리 |

각 Stage가 끝나면 `task-stage-report`로 `mydocs/working/task_m010_45_stage{N}.md`를 작성하고
해당 Stage 변경과 같은 commit에 묶는다. 다음 Stage는 작업지시자가 단계 보고를 승인한 뒤에만
시작한다. 작업 브랜치는 Pages 운영 환경의 배포 source로 사용하지 않는다. Stage 4는 source와
보고서를 검증해 PR을 준비하고, 병합 뒤 `devel`의 exact merge SHA를 `deploy_ref`로 실행한
GitHub Actions run과 deployment URL을 post-merge 운영 검증의 진실 원천으로 사용한다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 홈·업데이트·문의/제보 | `site/` | `site/index.html`, `site/updates/`, `site/feedback/` | OK | GitHub Pages가 직접 게시하는 사용자 문서 |
| Pages·manifest 게시 경계 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | Stage 4에서 artifact→download→manifest 순서 확정 |
| 구현·단계·최종 보고 | `mydocs/` 역할별 폴더 | `plans/`, `working/`, `report/` | OK | 사용자 문서와 승인·실행 증적 분리 |

`mydocs/manual/release_update_protocol.md`는 Hyper-Waterfall 자체 배포 규칙이므로 수정하지 않는다.
새 공식 문서 루트도 만들지 않는다. `.gitignore`의 `/_site/` 추가는 deterministic local build가
tracked source를 오염하지 않게 하는 보정이므로 수행계획서 예상 변경 파일에 반영했다.

## 공통 구현 계약

### 정적 site와 파일 경계

- `site/`가 유일한 Pages source다. React/Vue/Svelte, bundler, 외부 CDN, analytics와 cookie를
  추가하지 않는다. JavaScript는 release data hydration, 기능 visual 전환과 reveal에만 쓴다.
- `scripts/build-pages.mjs`는 `site/`와 실제 참조되는 승인 root logo를 명시적으로 `_site/`에 복사한다.
  임의 경로 삭제를 허용하지 않고 output이 repository root, source 또는 빈 경로면 실패한다.
- `_site/`는 생성 산출물로 commit하지 않는다. test는 `mkdtemp` 아래 출력만 사용하고 종료 시
  생성한 exact temporary directory만 정리한다.
- build는 HTML/CSS/JS/JSON과 승인된 image/font만 허용하고 symlink, `.DS_Store`, source map,
  credential·log·fixture 문서와 updater private material을 거부한다.
- GitHub project Pages base `/alhangeul-tauri/`에서 root와 `/updates/`, `/feedback/`가 동작하도록
  source는 상대 URL을 사용하고 checker가 output tree의 내부 링크와 asset cardinality를 검사한다.

### release metadata와 updater handoff

- `site/release.json`의 최소 source schema는 다음 의미를 가진다.
  - `status`: `unreleased|published`
  - `channel`: 이번 task에서는 `stable`만 허용
  - `version`, `tag`, `publishedAt`: unpublished에서는 `null`, published에서는 exact 값 필수
  - `downloads`: `windows-x86_64-nsis`, `windows-x86_64-msi`,
    `linux-x86_64-appimage` 세 key
  - `updater.endpoint`: `https://postmelee.github.io/alhangeul-tauri/updater/stable.json`
  - `updater.manifestPublished`: 이번 task source에서는 반드시 `false`
- unpublished source는 download value를 모두 `null`로 두며 UI가 anchor `href`, version badge나
  자동 업데이트 가능 상태를 생성하지 않는다. GitHub Releases 목록과 source repository만
  수동 확인 경로로 제공한다.
- published fixture는 test 안에서만 만들고 semantic version, matching `v{version}` tag,
  repository owner/name, exact-tag immutable GitHub Release URL과 target별 예상 확장자를 검증한다.
- `releases/latest/download`, branch/raw URL, query redirect, HTTP, 다른 repository·tag·version,
  duplicate URL, MSI↔NSIS와 비-AppImage target은 거부한다.
- `site/release.json`과 일반 Pages deployment는 `site/updater/stable.json` 파일을 생성하지 않는다.
  #16이 `.sig`, version과 세 artifact를 검증한 후 같은 build contract를 확장해 원자적으로
  포함한다. manifest가 source에 예정보다 먼저 나타나면 Stage 1 checker가 실패한다.

### 시각·콘텐츠 계약

- 참고 Pages의 header → centered hero → product visual → feature showcase → download → FAQ →
  philosophy → footer 계층을 유지하고, 흰색·연회색 section rhythm, blue accent, 큰 한국어 제목,
  넓은 여백과 얇은 border/shadow를 공통 token으로 만든다.
- MacBook, Finder, Quick Look, Thumbnail, DMG와 macOS 공유 문구·자산을 사용하지 않는다.
  Windows/Linux 공통 기능은 열기·편집·저장, drag-in, searchable PDF와 system print로 제한한다.
- download chooser는 NSIS를 Windows 일반 사용자 권장, MSI를 관리 배포, AppImage를 Linux x64
  updater 지원 형식으로 설명한다. DEB·RPM·Linux arm64는 자동 업데이트 제외와 수동 fallback만
  표시하고 direct artifact link를 만들지 않는다.
- screenshot은 검증된 exact SHA의 공개 가능한 repository fixture 화면만 사용한다. Windows와
  Linux source SHA, run/environment, 원본 hash와 crop 여부를 Stage 2 보고서에 기록한다.
  개인 문서, 사용자명·경로, token, GitHub UI와 다른 platform device mockup은 금지한다.
- image는 고정 width/height, lazy decoding과 의미 있는 alt를 사용하고 hero의 핵심 visual은
  layout shift가 없도록 intrinsic ratio를 고정한다. OG image는 1920×1080 기준으로 검증한다.

### Motion personality와 접근성

- motion personality는 **Corporate/Premium**으로 고정한다. signature easing은
  `cubic-bezier(0.2, 0, 0, 1)`, duration palette는 quick `90ms`, standard `280ms`, slow
  `480ms`를 사용한다. overshoot와 bounce는 쓰지 않는다.
- hero primary reveal은 최대 `16px` 이동+opacity, secondary는 shadow·visual settle, ambient는
  저대비 blue gradient의 한 번의 settle로 구성한다. stagger는 `80ms`, 전체 `480ms` 이하이며
  화면 1/3 이상의 이동이나 동시에 과도한 element animation을 금지한다.
- feature visual 전환은 `aria-pressed` button과 연결한 opacity+최대 `8px` 이동으로 `180ms`
  안에 끝낸다. hover feedback은 `90ms`, press는 `120ms` 이하로 둔다.
- 콘텐츠는 CSS 기본 상태에서 보인다. JavaScript가 실행된 경우에만 enhancement class와
  `IntersectionObserver`를 결합하므로 script load 실패, observer 미지원과 no-JS에서 내용이
  숨지 않는다.
- `prefers-reduced-motion: reduce`에서는 reveal, ambient, smooth scroll과 video autoplay를
  제거하고 최종 상태를 즉시 표시한다. motion은 정보 전달이나 download 가능 여부의 유일한
  표현으로 사용하지 않는다.
- skip link, semantic header/nav/main/section/footer, 순차 heading, focus-visible, 44px 수준의
  핵심 touch target, keyboard-only feature switch와 native `<details>` FAQ를 유지한다.

### Workflow와 검증 계약

- `.github/workflows/pages.yml`은 manual `workflow_dispatch`만 유지하고 required 40자리
  `deploy_ref`를 받는다. checkout 뒤 `git rev-parse HEAD == deploy_ref`를 deploy 전에 확인한다.
- 권한은 `contents: read`, `pages: write`, `id-token: write`만 사용하고 `github-pages`
  environment URL을 deployment output에 결속한다.
- checkout/configure/upload/deploy Action은 구현 시점 공식 release tag의 immutable commit
  SHA와 version comment를 함께 기록한다. floating branch, `latest`와 third-party deploy Action은
  사용하지 않는다.
- workflow는 `pnpm install --frozen-lockfile` 뒤 `build:pages`, `check:pages`와 focused test를
  통과해야 upload할 수 있다. 생성된 artifact 안의 `release.json`도 독립 재검증한다.
- concurrency는 모든 Pages 배포가 같은 `alhangeul-pages` group을 사용하고 public deployment를
  중간 취소하지 않도록 `cancel-in-progress: false`로 둔다. 원인 변경 없이 run을 반복하지 않는다.
  task branch에서는 배포하지 않고 병합 뒤 최종 exact `devel` SHA 한 번만 실행한다.
- release/tag/GitHub Release, updater manifest와 native artifact workflow를 호출하지 않는다.

## Stage 1 — release data·build·exact-SHA 배포 계약

### 산출물

신규:

- `site/release.json`
- `scripts/build-pages.mjs`
- `scripts/check-pages.mjs`
- 역할 분리가 필요할 때만 `scripts/pages/*.mjs`
- `tests/pages.test.mjs`
- `mydocs/working/task_m010_45_stage1.md`

수정:

- `.gitignore`
- `package.json`
- `.github/workflows/pages.yml`
- `tests/actions-workflows.test.mjs`

### 변경 내용

- release parser/validator를 pure function과 filesystem adapter로 나눠 test가 network 없이
  unpublished source, published fixture와 invalid fixture를 검증한다.
- current source는 `unreleased`, `stable`, null version/tag/downloads와
  `manifestPublished=false`로 고정한다.
- builder는 bounded source/output을 검증하고 root logo/font와 `site/`를 `_site/`에 복사한 뒤
  기존 `../assets/` source reference를 project Pages output에 맞게 결정적으로 정규화한다.
- checker는 source/output mode를 제공하고 release schema, path traversal, file allowlist,
  relative internal link, image dimension metadata와 updater manifest 부재를 검사한다.
- `build:pages`, `check:pages`를 package script에 추가하고 `test:automation`에 Pages test를
  포함한다. 새 package dependency와 lockfile 변경은 만들지 않는다.
- Pages workflow를 exact `deploy_ref`, Node 24/corepack/pnpm, build/check/focused test,
  immutable Action pin, Pages artifact/deploy 순서로 보정한다.
- workflow contract test는 trigger/input/permissions/concurrency, checkout SHA verification,
  install→build→check→upload→deploy 순서와 release/updater 미게시를 고정한다.

### 검증

```bash
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs tests/actions-workflows.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

current source build에는 MSI·NSIS·AppImage direct URL과 `_site/updater/stable.json`이 없어야 한다.
Stage 1은 Pages를 dispatch하지 않고 정적 계약만 검증한다.

### 커밋

```text
Task #45 Stage 1: Pages release data와 exact-SHA build 계약 추가
```

## Stage 2 — Windows/Linux 홈과 제품 시각 체계

### 산출물

신규:

- `site/script.js`
- `site/assets/` 아래 Windows/Linux product screenshot과 `og-main.png`
- `mydocs/working/task_m010_45_stage2.md`

수정:

- `site/index.html`
- `site/styles.css`
- 필요한 asset 검증을 위한 `scripts/check-pages.mjs`, `tests/pages.test.mjs`

### 변경 내용

- HOP 계열 녹색 grid·status card를 제거하고 translucent nav, centered hero, neutral product
  window visual, feature showcase, download chooser, FAQ, philosophy와 footer를 새 semantic markup으로
  작성한다.
- header는 알한글 logo/홈, 업데이트, 문의/제보, GitHub, 다운로드 영역을 제공한다.
  unpublished 상태의 다운로드 control은 disabled 안내로 유지하고 fake `href`를 두지 않는다.
- feature는 열기·편집·저장, drag-in, PDF와 인쇄를 실제 screenshot panel과 결속한다.
  button은 `aria-controls`, `aria-pressed`와 keyboard state를 갖고 no-JS에서는 모든 설명을 읽는다.
- downloader는 Windows NSIS/MSI와 Linux AppImage의 용도·updater 범위·system 요구 사항을
  비교한다. current release data가 unpublished이면 세 카드 모두 준비 상태와 Releases fallback만
  표시한다.
- FAQ는 무료/라이선스, HWP/HWPX 저장 범위, 로컬 처리, installer 선택, AppImage updater,
  제외 package와 오류 제보를 실제 제품 경계에 맞게 작성한다.
- 공통 CSS token, responsive section/layout, image shell과 Stage 2 motion contract를 구현한다.
  content visibility가 JavaScript 성공에 의존하지 않는 source test를 둔다.
- 실제 screenshot을 확보할 수 없거나 source SHA·공개 가능성을 입증할 수 없으면 mockup으로
  대체하지 않고 Stage 2를 중단해 자산 승인 방향을 요청한다.

### 검증

```bash
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs
rg -ni 'thumbnail|quick look|finder|macbook|dmg|macos' site/
git diff --check
```

수동 검증:

- local static server의 1280px/390px home screenshot과 horizontal overflow 없음
- header→hero→visual→feature→download→FAQ→philosophy→footer 정보 계층
- keyboard-only skip link, header, feature switch, download fallback와 FAQ
- normal/reduced-motion에서 콘텐츠 가시성, focus와 screenshot layout

### 커밋

```text
Task #45 Stage 2: Windows/Linux 제품 Pages 홈 재구성
```

## Stage 3 — 업데이트·문의 페이지와 접근성

### 산출물

신규:

- `site/updates/index.html`
- `site/feedback/index.html`
- `mydocs/working/task_m010_45_stage3.md`

수정:

- `site/styles.css`
- `site/script.js`
- `scripts/check-pages.mjs`
- `tests/pages.test.mjs`

### 변경 내용

- updates page는 current release status, Windows NSIS/MSI와 Linux AppImage 지원표, 수동 설치
  fallback, DEB/RPM/arm64 자동 업데이트 제외와 canonical Pages의 `updater/stable.json` 계약을 설명한다.
- `manifestPublished=false`에서는 updater 확인 링크나 “자동 업데이트 사용 가능” 상태를 표시하지
  않고 #16 완료 전 준비 중임을 명시한다.
- feedback page는 alhangeul-tauri Issues, 보안·개인정보 없는 재현 정보, app/version/OS/
  document 특징 기록 방법과 `edwardkim/rhwp` upstream 분류 기준을 안내한다. 개인 문서 upload를
  기본 요청하지 않는다.
- 세 페이지 header/footer/nav active state, logo, GitHub/License와 metadata를 일치시킨다.
  home의 release hydration helper를 하위 페이지가 재사용하고 release field를 복제하지 않는다.
- checker는 root/updates/feedback internal graph, canonical/OG/title/description, target/rel,
  broken hash·asset·mailto, heading/landmark/alt/focus contract와 금지 문구를 검증한다.
- 390px에서 nav와 installer 표가 overflow 없이 stack되고 200% text zoom에서도 핵심 action과
  내용이 겹치지 않게 한다.

### 검증

```bash
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs tests/actions-workflows.test.mjs
pnpm run test:automation
git diff --check
```

수동 검증:

- home → updates → feedback → GitHub/Issues/Releases의 keyboard-only 이동
- 1280px/390px 및 200% text zoom에서 overflow·clipping·focus loss 없음
- normal/reduced-motion, no-JS fallback과 native `<details>` 동작
- MSI·NSIS·AppImage 지원, excluded package와 unpublished manifest 문구 read-back

### 커밋

```text
Task #45 Stage 3: 업데이트·문의 페이지와 접근성 계약 추가
```

## Stage 4 — 운영 문서·통합 QA와 보호 브랜치 배포 경계

### 산출물

신규:

- `mydocs/working/task_m010_45_stage4.md`

수정:

- `docs/operations/DESKTOP_RELEASE.md`
- Stage 1~3 검증에서 발견한 승인 범위 내 site/test 보정

### 변경 내용

- 운영 문서에 GitHub Release immutable artifact 검증 → `site/release.json` published 전환 →
  Pages 사용자 download 게시 → #16 signature/manifest 검증 → canonical Pages의
  `updater/stable.json` 원자 게시
  순서를 기록한다.
- #45 완료 시점은 unpublished Pages source와 updater 비게시 계약의 PR 준비까지임을 명시한다.
  실제 release version·URL, signature와 updater 활성화 성공을 주장하지 않는다.
- clean checkout에서 전체 platform-neutral gate와 Pages source/output 검증을 다시 수행한다.
- `publish/task45`는 PR 게시 브랜치로만 사용하고 `github-pages` 환경의 허용 branch를 완화하지
  않는다. 작업 브랜치에서 발생한 원격 시도는 source 실패와 환경 보호 차단을 구분해 기록한다.
- PR 병합 뒤 `devel`의 40자리 merge SHA를 workflow ref와 `deploy_ref`에 동일하게 사용한다.
  release/native/updater workflow는 실행하지 않는다.
- post-merge run의 event, branch, workflow SHA, input SHA, checkout SHA, artifact/deployment
  conclusion과 public URL을 대조하고 root/updates/feedback·asset·link·unpublished 상태를
  1280px/390px에서 read-back한다.

### 검증

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run build:pages
pnpm run check:pages
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
git status --short
```

post-merge 운영 검증(PR 수용 gate와 분리):

- Pages workflow가 exact `devel` merge SHA로 실행되고 모든 build/check/deploy step success
- `github-pages` deployment URL과 public base가 `postmelee.github.io/alhangeul-tauri/`로 일치
- public root/updates/feedback와 asset/internal/external link success
- direct MSI·NSIS·AppImage URL과 `updater/stable.json` 파일이 공개되지 않음
- desktop 1280px/mobile 390px layout, keyboard focus와 reduced-motion read-back

### 커밋

```text
Task #45 Stage 4: Pages 운영 경계와 exact-SHA 배포 확정
```

작업 브랜치 배포 차단을 반영한 후속 보정은 기존 Stage commit을 재작성하지 않고 다음 commit으로
남긴다.

```text
Task #45 [Stage 4.1]: Pages 배포를 devel 병합 후로 분리
```

PR 게시 뒤 수행계획과 배포 경계를 정렬한 보정은 다음 commit으로 남겼다.

```text
Task #45 [Stage 4.2]: 수행계획의 post-merge 배포 경계 정렬
```

### Stage 4.3 — PR 리뷰 보정과 최신 `devel` 통합

- Task #14가 병합된 최신 `devel`을 통합하고 썸네일 UI 수동 gate와 automation inventory를
  Task #45의 Pages·릴리스 계약과 함께 보존한다.
- `_site/`가 없는 clean checkout에서도 Pages test가 자체 fixture를 build하도록 하고, published
  `release.json`이 source→build→output checker 전체 경로를 통과하는 회귀 test를 둔다.
- 웹 클라이언트는 #16 이후 `manifestPublished=true`여도 검증된 exact download를 hydrate하고,
  target별 고유 접근성 이름은 화면 상태 문구를 포함하지 않는 안정 label로 만든다.
- updater 대상이 아닌 Linux x64 DEB/RPM과 arm64 DEB는 최신 다운로드 dropdown 대신 GitHub
  Releases 수동 확인 경로로 연결한다. 이번 task의 세 updater target schema는 확장하지 않는다.
- site가 참조하지 않는 Pretendard font는 Pages root asset 복사 목록에서 제외하고, Pages workflow는
  fixed concurrency group으로 직렬화한다. 의미 없는 source child assertion은 제거한다.

검증은 `_site/` 사전 생성 없이 focused Pages test를 먼저 통과한 뒤 전체 platform-neutral gate를
다시 수행한다. release/tag/artifact/updater 게시와 Pages deployment는 이 Stage에서도 실행하지 않는다.

```text
Task #45 [Stage 4.3]: PR 리뷰 보정과 최신 devel 통합
```

## 검증

- 각 Stage focused 검증과 수동 read-back이 모두 통과해야 단계 보고서와 commit을 만든다.
- `test:automation`은 Pages metadata, static output과 workflow 계약을 포함하도록 유지한다.
- 작업 브랜치에서는 Pages deploy를 완료 조건으로 삼지 않는다. 공개 배포와 read-back은 PR 병합 뒤
  exact `devel` SHA의 post-merge 운영 gate로 수행한다.
- native Rust/Tauri build와 Windows/Linux artifact·GUI workflow는 제품 실행 코드가 바뀌지 않으므로
  이 task에서 실행하지 않는다.
- private key, signature, release artifact가 없어 실패하는 검증을 skip으로 성공 처리하지 않고
  #16 제외 경계 또는 unpublished negative gate로 명시한다.
- 계획 밖 공식 문서, product code, updater manifest나 release 동작이 필요하면 Stage를 중단하고
  수행계획서·구현계획서 보정 승인을 요청한다.

## 커밋과 단계 의존성

- Stage source와 `task_m010_45_stage{N}.md`는 같은 Stage commit에 묶는다.
- Stage 2는 Stage 1의 release parser/build/check/workflow contract 승인 뒤 시작한다.
- Stage 3은 Stage 2 home·actual visual·motion/accessibility 승인 뒤 시작한다.
- Stage 4는 Stage 3의 세 페이지와 unpublished/download/updater 문구가 승인된 뒤 시작한다.
- 모든 Stage 뒤 `task-final-report`로 최종 보고·오늘할일·PR을 만들고 Issue close는 merge 확인 뒤
  `pr-merge-cleanup` 절차에서 수행한다.

## 위험과 대응

- **정적 build 삭제 범위**: output path를 명시 검증하고 repo/source/root 삭제를 거부한다.
  test는 생성한 temp path만 정리하고 workflow는 workspace의 `_site`만 사용한다.
- **release metadata drift**: 홈·업데이트가 같은 JSON을 fetch하고 source/output checker가 schema,
  exact tag와 target URL을 검증한다. HTML에 version/download URL을 중복 hardcode하지 않는다.
- **no-JS와 hydration 실패**: 기본 markup은 unpublished 설명과 Releases fallback을 제공한다.
  hydration 성공 전 anchor를 만들지 않고 오류 시 보수적 준비 상태를 유지한다.
- **시각 유사성과 platform 오인**: layout/token/motion만 참고하고 Windows/Linux actual screenshot과
  기능 allowlist를 사용한다. Mac·Thumbnail 금지 문구 test와 사람 read-back을 함께 둔다.
- **actual screenshot 확보 실패**: mockup/생성 이미지를 실제 화면으로 대체하지 않는다. exact
  evidence를 확보할 수 없으면 Stage 2에서 중단하고 승인된 자산 입력을 요청한다.
- **motion 성능·접근성**: transform/opacity 중심, bounded duration/stagger, no-JS visible과 reduced
  motion 즉시 상태를 고정한다. motion이 download 상태나 의미의 유일한 신호가 되지 않는다.
- **updater manifest 조기 노출**: current build가 manifest 파일 존재를 실패 처리하고 #16만
  published flag를 전환할 수 있게 contract를 분리한다.
- **public deploy rollback**: task exact SHA와 run URL을 기록하고 실패 시 같은 SHA 반복보다 원인을
  먼저 분류한다. rollback이 필요하면 이전 검증 SHA의 별도 승인된 deployment로만 수행한다.

## 승인 요청 사항

- 4개 Stage와 각 Stage 산출물·검증·commit 메시지
- dependency 없는 Node build/check, `site/release.json` 단일 data와 `/_site/` 생성물 경계
- unpublished fail-closed schema, immutable exact-tag fixture와 `updater/stable.json` 비게시 계약
- 참고 Pages를 Corporate/Premium motion·blue/neutral visual로 재해석하고 actual Windows/Linux
  screenshot만 사용하는 방향
- Stage 1 workflow를 exact `deploy_ref`·immutable Action·non-cancelling Pages deployment로 보정하고
  Stage 4에서만 한 번 실행하는 경계
- native artifact/GUI, release/tag/GitHub Release, Thumbnail과 updater 구현을 실행하지 않는 범위

승인되면 Stage 1의 release parser·deterministic builder·Pages workflow contract 구현을 시작한다.
