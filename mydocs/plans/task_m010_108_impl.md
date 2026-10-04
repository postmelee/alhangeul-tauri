# Task M010 #108 구현계획서 — 설치 파일 선택 UI와 릴리즈 제목 표현 개선

수행계획서: [task_m010_108.md](task_m010_108.md)
GitHub Issue: [#108](https://github.com/postmelee/alhangeul-tauri/issues/108)
마일스톤: M010
작성일: 2026-10-05 KST
상태: 구현계획서 승인 대기
작업 브랜치: `local/task108`
기준 devel: `b925faa31251114e7064e76209c5640147dd013e`

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 공개 설치 파일 목록 생성·데이터 경계 | scripts/pages/package-downloads.mjs, _site/downloads.json, build/check·fixture 계약 | 6종·버전/원문 불일치·생성 drift·미공개·updater bytes |
| 2 | 페이지 안 선택 영역·제목 표현 | site/package-downloads.js, 공유 홈/업데이트 UI·최신 배지·공식 템플릿 | 조작/키보드·6종 링크·넓은/좁은 화면·기존 홈/문의·drift |
| 3 | 통합 검증·공개 인계 준비 | 기존 runbook 최소 보정·최종 보고·PR/Pages 공개 후보 | 중립 검사·필수 fast·공개 asset 대조·feed 불변 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 목록·홈·버전별 안내 | 기존 site/ 및 site/updates/ | 같은 경로 | OK | 홈에는 패키지 선택의 공유 부분만 반영 |
| 릴리즈 웹 안내 템플릿 | 중앙 mydocs/_templates/website_release_note.html | 같은 경로 | OK | #102 규격/위치 유지, 생성 HTML 직접 편집 금지 |
| Pages 공개 규칙 | docs/operations/PUBLIC_RELEASE_RUNBOOK.md | 같은 경로 | OK | 다운로드 목록 검증 규칙만 최소 추가 |
| 계획·단계·최종 결과 | mydocs/plans·working·report | task_m010_108 계열 | OK | 특정 이슈의 승인과 근거 기록 |
| 오늘할일 | mydocs/orders/20261005.md | 같은 경로 | OK | 진행 상태만 갱신 |
| 일반 다운로드 JSON | 기존 사이트의 빌드 output | _site/downloads.json | OK | 출력만 생성; source JSON·공식 문서 루트 추가 없음 |

## Stage 1 — 공개 설치 파일 목록 생성·데이터 경계

### 산출물

신규:

- scripts/pages/package-downloads.mjs — 원문 읽기·6종 공개 목록 생성·source/output 대조.
- tests/pages-package-downloads.test.mjs — 순수 목록·잘못된 입력·기존 updater 불변 계약.
- 필요한 tests/fixtures/pages-package-fixtures.mjs — published 원문/HTML fixture를 기존 helper와 연결.
- _site/downloads.json — 결정적으로 생성되는 빌드 출력; 커밋하지 않는다.

수정:

- scripts/build-pages.mjs, scripts/check-pages.mjs, 필요 시 scripts/pages/site-files.mjs.
- tests/pages.test.mjs, tests/fixtures/pages-release-fixtures.mjs, tests/fixtures/release-note-files.mjs 등 영향받는 기존 fixture.
- tests/pages.test.mjs에서 신규 목록 테스트를 import해 기존 test:automation과 PR fast에 포함한다. 기존 package.json의 자동화 테스트 명령을 불필요하게 늘리지 않는다.
- mydocs/working/task_m010_108_stage1.md와 오늘할일.

### 변경 내용

1. validateReleaseData와 기존 소유 경로 검사·notesPath·validateReleaseNotes를 재사용한다. published 상태면 docs/releases/v<version>.notes.json을 반드시 읽고 원문 상태/version/tag/publishedAt·3종 download URL을 대조한다. manifestPublished=true일 때는 updaterInventory 전체 deepEqual로 source/key/signature/hash까지 확인한다. false/null 상태는 기존 공개 전 피드 계약을 유지하며 원문의 검증된 sourceSha를 사용한다.
2. 기존 INSTALLERS의 6개 target과 metadata.assets 순서를 재사용한다. JSON에는 schemaVersion=1, status, version, tag, sourceSha, packages를 둔다. package는 target, platform, architecture, format, updateMode, name, size, sha256, url을 가지며 URL/파일명/hash는 원문에서 가져온다. architecture는 표시용 x64/arm64이며 내부 target linux-aarch64-deb 이름은 변경하지 않는다.
3. updateMode는 기존 NSIS/MSI/AppImage 3개만 app, DEB/RPM/arm64는 manual이다. labels와 선택 설명은 UI의 한 공유 정의를 사용하고 JSON의 임의 HTML을 표시하지 않는다. 공개 목록은 정확한 6개 target·고정 순서·중복 없는 URL로 serialize하고 마지막 newline을 고정한다.
4. unreleased는 version/tag/sourceSha=null·packages=[]로 출력하고 직접 다운로드를 만들지 않는다. published 원문 누락·draft·버전/날짜/3종 URL/활성 inventory 불일치는 build/check에서 거부한다. 원문이나 목록이 빌드 입력·출력 소유 경로를 벗어나거나 source가 생성 JSON을 덮어쓰는 경우도 거부한다.
5. buildPages는 기존 source/원문/전체 6종 검증 뒤 output을 생성한다. 기존 updater manifest 생성 흐름은 그대로 쓰며 JSON 목록만 추가한다. checkPages는 source 모드에서 원문 정합성을, output 모드에서 다운로드 JSON의 정확한 기대 bytes를 검사한다. 생성 JSON은 source에 수동으로 넣지 못하게 한다.
6. 기존 테스트의 published fixture는 notes 원문 없이 3종 release.json만 만들기 때문에 valid 6종 원문·중앙 템플릿·생성 HTML을 명시적으로 추가한다. 원문 부재·draft 등 음성 테스트에는 원문을 생략하는 fixture 옵션을 제공한다. createReleaseNotesFiles가 직접 원문을 구성하는 테스트는 옵션으로 중복 생성을 피한다. fixture 선택지와 기대 output 개수는 새 파일 증가를 반영하며 누락/불일치를 정상 fixture로 숨기지 않는다.
7. 원문의 다음 버전 fixture에서도 동일 생성 규칙이 작동하는지, 목록 생성 전후 release 객체·site/release.json·notes 원문·updater manifest bytes가 같은지 검사한다. manifestPublished false/true와 unreleased를 별도로 수용한다. 현재 v0.1.1의 manifest 기준 bytes/hash를 기록하고 이후 비교에 쓴다.

### 검증

```bash
node --test tests/pages-package-downloads.test.mjs tests/pages.test.mjs tests/release-notes-integration.test.mjs
pnpm run build:pages
pnpm run check:pages
pnpm run check:release-notes
pnpm run check:product-boundary
git diff --check
```

새 목록 6종·모드·URL·버전 자동 갱신, 원문 누락/draft/불일치·output 변조·source 덮어쓰기 거부를 확인한다. fixture 서명은 구조 검사일 뿐 실제 서명 검증 결과로 표현하지 않는다. UI는 이 단계에서 바꾸지 않는다.

### 커밋

```text
Task #108 Stage 1: 공개 설치 파일 6종 목록 생성과 updater 경계 검증
```

## Stage 2 — 페이지 안 선택 영역·제목 표현

### 산출물

- site/package-downloads.js — 공통 6종 표시 정의·웹 목록 검증·패키지 행 렌더링/활성화.
- site/updates/index.html, site/index.html, site/script.js, site/styles.css.
- mydocs/_templates/website_release_note.html와 생성된 site/updates/v0.1.1.html. site/feedback/index.html은 공유 자산 cache key만 필요 시 변경한다.
- tests/pages-design.test.mjs, tests/pages-release-notes.test.mjs, 필요 시 분리 tests/pages-package-ui.test.mjs와 DOM fixture helper.
- mydocs/working/task_m010_108_stage2.md와 오늘할일.

### 변경 내용

1. 선택 버튼과 GitHub Releases 링크를 같은 줄에 유지하고, 버튼이 제어하는 선택 영역을 다음 줄의 문서 흐름에 배치한다. 절대 위치 드롭다운을 제거한다. 버튼에 aria-expanded/aria-controls와 펼침 표시를 제공하고 초기에는 접는다. #latest-download로 진입하면 영역을 열어 기존 홈/릴리즈 상세의 안내 링크를 유지한다.
2. 기존 radio/fieldset과 Windows/Linux 모양을 재사용한다. Windows는 2행, Linux는 4행이며 OS·아키텍처·형식·짧은 용도와 업데이트 방식, 다운로드 버튼을 표시한다. 지원 OS 판별은 기본 선택에만 쓰고 수동 전환을 항상 허용한다. 판별 불가 환경은 Windows 초기 선택을 사용하고 별도 지원 OS라고 안내하지 않는다.
3. 기존 classic defer 실행 순서를 유지한다. package-downloads.js를 script.js보다 먼저 준비하고 홈/업데이트에서 같은 helper·표시 정의를 호출한다. release.json 조회는 한 번 수행하며 해당 release와 downloads.json이 일치해야 6종 링크를 활성화한다. 공유 helper는 DOM 작업과 검증 함수로 나누며 기존 VM 계약은 필요한 두 script를 같은 순서로 실행하도록 조정한다.
4. 브라우저는 status/version/tag, 정확한 6종 target·platform/architecture/format/updateMode, URL의 저장소/tag/파일명·크기/hash 구조, 활성 updater의 sourceSha/3종 URL을 확인한다. 잘못된 항목 하나라도 있으면 전체 직접 다운로드 활성화를 중단한다. 항목 이름·설명은 공유 정의와 textContent로 생성하고 URL 문자열을 innerHTML로 삽입하지 않는다.
5. 유효 목록이 없으면 ‘다운로드 안내’ 상태로 GitHub Releases에 연결한다. fetch 실패·미공개·버전 혼합에 직접 다운로드를 표시하지 않는다. JavaScript 비활성 때에도 GitHub 링크와 간단한 noscript 안내를 제공한다. 구 버전 release.json이 남아 있는 캐시는 원문과 동기화될 때까지 안내 상태를 유지한다.
6. 버튼은 Enter/Space로 작동한다. OS radio의 방향키·Tab 이동을 확인하고, 접기/OS 전환으로 숨겨지는 영역에 초점이 남지 않게 한다. hidden 영역이 display:grid 규칙으로 다시 나타나지 않도록 범위를 검사한다. prefers-reduced-motion 설정에서는 패널 이동을 강제하지 않는다.
7. 업데이트 목록/상세에 page class를 명시해 제목 600·항목 500·설명 400을 적용한다. strong 요소를 제목 span으로 바꾸고 최신 배지를 따로 만든다. 기존 local 릴리즈 링크와 GitHub fallback 항목 모두 새 구조를 사용하며 최신 배지는 한 개만 둔다. 문의 페이지의 제목·문구와 홈페이지 전체 배치는 보존한다.
8. 수정 자산 cache key는 108-2로 함께 갱신한다. 중앙 템플릿을 바꾼 뒤 공식 생성기로 v0.1.1 HTML을 생성한다. 승인된 GitHub body·short updater notes·notes 원문은 기존과 byte 동일인지 대조하고 HTML의 UI 참조 외 콘텐츠는 보존한다.
9. 테스트는 실제 데이터 활성화/실패·목록 공유·배지 중복·키보드 동작 등 의미 있는 계약을 검증한다. 글꼴 굵기·겹침·overflow는 실제 브라우저의 DOM/computed style·화면으로 확인하며 CSS 선언을 그대로 복제하는 테스트를 추가하지 않는다.

### 검증

```bash
node --test tests/pages.test.mjs tests/release-notes-generation.test.mjs tests/release-notes-integration.test.mjs
pnpm run generate:release-notes -- --version 0.1.1 --output-dir /tmp/task108-release-notes
pnpm run check:release-notes
pnpm run build:pages
pnpm run check:pages
pnpm run check:product-boundary
git diff --check
```

Browser 스킬을 읽고 localhost의 `_site`를 데스크톱 1366px·390/320px에서 관측한다. 펼침·닫힘·#latest-download 진입·OS 전환·키보드·6종 행/이름·최신 배지·제목 굵기·문의/홈 회귀를 확인한다. 실제 설치 파일 다운로드를 시작하지 않고 링크 URL과 접근 가능한 이름을 기록한다. 셀/viewport 상태는 원복한다. 이 사이트 브라우저 검증은 Mac 데스크톱 제품 실행 검증이 아니다.

### 커밋

```text
Task #108 Stage 2: 페이지 안 다운로드 선택과 릴리즈 제목 표현 개선
```

## Stage 3 — 통합 검증·공개 인계 준비

### 산출물

- docs/operations/PUBLIC_RELEASE_RUNBOOK.md의 Pages 관련 최소 보정.
- mydocs/working/task_m010_108_stage3.md, mydocs/report/task_m010_108_report.md, 오늘할일 완료 후보.
- 동일 source의 6종 링크·updater 불변·브라우저·CI receipt와 검토 가능한 PR 본문·Pages 공개 실행안.

### 변경 내용

1. 기존 runbook의 Pages 검증 부분에 downloads.json 생성 원문·정합성·미공개/불일치 거부를 기록한다. 일반 웹 다운로드 6종과 signed updater 3종을 구분하고 새 릴리즈 원문 준비 순서를 연결한다. 수행계획서가 승인한 위치를 그대로 쓴다.
2. 기본 중립 검사와 변경 관련 계약을 실행한다. Stage 1/2의 같은 bytes에 대한 단순 반복은 피하되 통합 후 바뀐 source·새 실패·미해결 조건이 있으면 해당 검사를 재실행한다. 모든 필수 결과와 한계를 보고서에 적는다.
3. GitHub 공개 stable Release·6종 asset 이름/URL/size/API digest를 원문과 대조하고 필요한 최소 HEAD 확인으로 링크를 검증한다. 현재 feed·로컬 생성 feed bytes/hash와 source/key/signature/URL/notes를 대조한다. 설치 파일 재다운로드·재설치나 native CI를 수행하지 않는다.
4. 단계 보고·최종 보고·오늘할일을 묶어 커밋하고 clean 상태를 확인한다. 최종 보고서 승인 뒤 task-final-report 절차로 publish/task108 push·devel Open PR을 게시한다. 필수 PR fast를 exact candidate의 수용 근거로 사용하며 같은 소스의 별도 수동 fast run은 기본적으로 중복 실행하지 않는다.
5. PR required 세 job과 필수 step의 success, head/base/diff·최신 devel과의 충돌 여부를 확인한다. 새 source가 필요하면 검토 범위·검증 근거를 갱신한다. native/package/full 성공으로 확대하지 않는다.
6. 이 상태의 실제 diff·최종 보고·공개 후보와 실행안을 제시해 일반 merge·exact Pages 공개·HTTP/UI read-back·#108 close·브랜치/worktree 정리에 대한 최종 승인을 받는다. 수행/구현/단계 승인을 공개 승인으로 간주하지 않는다.
7. 최종 공개 승인 후 최신 workflow ref/deploy_ref/checkout SHA가 일치하는 Pages run을 사용한다. 공개 다운로드 목록·사이트 파일·stable manifest를 해당 source의 deterministic output과 대조한다. 공개 UI와 넓은/좁은 화면·6종 링크를 다시 확인한 뒤 완료 기록과 정리를 수행한다.

### 검증

```bash
pnpm run test:automation
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run check:release-notes
pnpm run build:pages
pnpm run check:pages
git diff --check
git status --short
```

Stage 2 이후 사이트 입력이 바뀌지 않았다면 브라우저 결과를 재사용하고 source/hash 범위를 명시한다. PR 게시 후 Alhangeul PR required 및 Windows/Linux fast 전체 결과를 확인한다. 공개 파일 read-back은 최종 공개 승인 이후에만 수행한다.

### 커밋

```text
Task #108 Stage 3 + 최종 보고서: 다운로드 선택 UI 통합 검증과 공개 인계 준비
```

## 검증

- 단계 검증이 실패하면 같은 단계에서 원인·회복을 처리하며 완료 보고/다음 단계로 넘어가지 않는다.
- 기본 Node/TypeScript/Pages/Studio 검사는 모든 호스트에서, PR fast는 Linux/Windows runner에서 수행한다. Mac에서 Rust desktop·Tauri build·native package/GUI 설치 검증은 하지 않는다.
- 사용 도구는 pnpm이며 현재 pnpm10.33.0/Node24 기준을 유지한다. 원문·표시 파일의 테스트는 순수 Node 계약과 실제 브라우저를 구분한다.
- 단계별 commit과 source/hash·run/job/필수 step 결과를 기록하고 CI_VALIDATION의 exact 결과 재사용 기준을 따른다.
- runtime·rhwp pin·tag/assets/signatures/keys·원본 updater bytes가 바뀌지 않는지 최종 diff와 hash를 확인한다.

## 커밋

- 각 단계 소스·검증 수정과 mydocs/working/task_m010_108_stage{N}.md를 같은 commit에 묶는다.
- 보고서를 작성하는 시점에 task-stage-report·todo 스킬을 읽고 적용한다. 최종 보고/PR 게시와 병합 확인 후 정리는 해당 스킬의 승인 단계에서 적용한다.
- 계획·보고를 누락한 별도 소스 commit으로 단계 완료를 대신하지 않는다.

## 단계 의존성

- 구현계획 승인 전 Stage 1 소스 변경은 하지 않는다.
- Stage 2는 Stage 1 검증·보고·다음 단계 승인 이후 진행한다.
- Stage 3은 Stage 2 검증·브라우저·보고 승인 이후 진행한다.
- 최종 보고서·PR 게시·merge/Pages 공개는 각각 저장소 절차에 따라 검토할 실제 후보를 제시하고 승인받는다.

## 위험과 대응

- **published fixture와 새로운 원문 필수 계약**: 유효 원문을 명시적으로 구성하고 음성 테스트는 생성을 끌 수 있게 해 원문 누락 정책을 검증한다. 기존 release-notes fixture와 중복/순환 초기화를 피하도록 helper를 분리한다.
- **생성 JSON·원문 누락/캐시 혼합**: source/output 양쪽에서 동일 기대 bytes와 version/tag를 대조하며 잘못된 직접 다운로드를 활성화하지 않는다.
- **HTML/JavaScript 변경과 기존 테스트의 VM 모델**: classic defer 순서를 유지하고 실제 로딩 순서대로 VM fixture를 구성한다. 원문 URL·텍스트를 안전한 DOM 속성/textContent로 전달한다.
- **공유 CSS와 문의 페이지 영향**: 업데이트 목록/상세 page class로 굵기를 한정하며 공유 자산 cache key 외 문의 화면은 변경하지 않는다.
- **홈 Linux 4행으로 공간 부족**: 1366px과 390/320px에서 기존 홈 안내·OS 전환을 확인하고 선택 영역에서만 필요한 최소 spacing을 조정한다.
- **기존 큰 파일 확대**: 신규 helper·테스트/fixture를 책임별로 나눠 300 LOC/50 LOC/매개변수 5개/복잡도 10 권장 상한을 따른다. 새로운 예외가 필요하면 소스 수정 전에 계획 변경 승인을 받는다.
- **native 수용 과장·공개 권한**: 사이트/fast 결과와 제품 설치 검증을 구분하며 제품 릴리즈는 기존 v0.1.1을 유지한다. 공개 배포는 별도 최종 승인으로만 진행한다.

## 승인 요청 사항

- 이 3단계 산출물·검증 명령·커밋과 원문 기반 6종 JSON·기존 updater 3종 보존 방향.
- 승인된 문서 위치와 필요한 shared helper·test fixture 연결 범위.
- 구현계획 승인 후 Stage 1 구현·로컬 중립 검증·단계 보고/커밋까지 진행. Stage 2 및 공개는 그 결과 제시 후 다음 승인 단계로 둔다.
