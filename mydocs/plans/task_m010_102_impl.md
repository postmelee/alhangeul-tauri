# Task M010 #102 구현계획서 — 릴리즈 본문과 웹 안내 규격

수행계획서: [task_m010_102.md](task_m010_102.md)
GitHub Issue: [#102](https://github.com/postmelee/alhangeul-tauri/issues/102)
마일스톤: M010
상태: 구현계획 승인 완료 / Stage 3 완료·Stage 4 승인 대기
작성일: 2026-10-04 KST
수행계획 승인: 수행계획 보고 후 같은 스레드에서 작업지시자의 “진행해줘”.
구현계획·Stage 1 승인: 2026-10-04, 구현계획 보고 후 같은 스레드에서 작업지시자의 “진행해줘”.
Stage 2 승인: 2026-10-04, Stage 1 완료 보고 후 같은 스레드에서 작업지시자의 “진행해줘”.
Stage 3 승인: 2026-10-04, Stage 2 완료 보고 후 같은 스레드에서 작업지시자의 “진행해줘”.
기준: devel `939cdb511c08e707120860aac1ba0d0c7fe48a92`, 계획 commit `b1f5eb8d975ad92ef9e8e038f8639380e208db47`.
작업 브랜치: `local/task102`, 분리 작업 공간 `task102-release-format/alhangeul-tauri`.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 사용자 원문 계약과 템플릿 | schema·필드 검사·작성 양식·회귀 | 누락·placeholder·version/URL·Issue 분류 오류 |
| 2 | 생성·drift 검사 및 CI 연결 | Markdown/HTML/notes renderer·CLI·pnpm/CI 연결 | 재현성·escaping·source drift·Pages 계약 |
| 3 | v0.1.1 적용과 웹 화면 수용 | 실제 notes JSON·릴리즈 기록·웹 안내·목록 | 공개 metadata 대조·브라우저 화면·링크 |
| 4 | 운영 문서·통합 검증·#97 인계 | runbook/checklist·최종 보고·규격 PR 준비 | 기본 4개 검사·Pages/자동화·PR #101 적용안 |

규격을 구현한 #102 PR이 먼저 검토·병합되어야 한다. 이후 #97 브랜치에서 #102를 반영하고 PR #101의 게시 데이터·웹 연결·updater notes를 적용·재검증한다. PR #101 merge와 Release 본문 수정, exact-SHA Pages/manifest 공개는 검토한 산출물에 대해 각각 승인받는다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| GitHub 작성 템플릿 | `mydocs/_templates/` | `release_notes.md`, Stage 1 | OK | 실제 버전 내용과 출력 형식을 구분 |
| 웹 안내 템플릿 | `mydocs/_templates/` | `website_release_note.html`, Stage 1 | OK | 기존 site 구조를 재사용 |
| 사용자 원문 | `docs/releases/` | `v0.1.1.notes.json`, Stage 3 | OK | 제품 릴리즈 원문의 진실 원천 |
| 공식 릴리즈 기록 | `docs/releases/` | `v0.1.1.md`, Stage 3·4 | OK | 실제 검증과 아직 미실행인 gate 분리 |
| 사용자 웹 안내 | `site/updates/` | `v0.1.1.html`, 기존 index, Stage 3 | OK | Pages 배포 source 유지 |
| 작성 절차 연결 | 기존 `docs/operations/` | PUBLIC_RELEASE_RUNBOOK·RELEASE_CHECKLIST, Stage 4 | OK | 새 공식 문서 루트를 만들지 않음 |
| 출처 | 기존 `docs/architecture/` | PROVENANCE.md, Stage 4 | OK | 참조 commit·파일·직접 차용 여부 기록 |
| 양식 인덱스 | `mydocs/_templates/` | README·release_record, Stage 4 | OK | 작업 기록과 공개 안내 양식 연결 |
| stage/final 보고 | `mydocs/working/`, `report/` | `task_m010_102_stage{N}.md`, `_report.md` | OK | 중앙 템플릿을 읽고 작성 |

## 공통 입력·출력 계약

- notes JSON의 top level은 `schemaVersion`, 공개 릴리즈 `metadata`, 승인된 사용자 `content`로 구성한다. metadata에는 version/tag/source/실제 공개일, rhwp pin, exact 다운로드 자료와 서명 inventory의 연결 근거를 둔다.
- content는 변경 요약·rhwp 변화·앱 변화·지원/설치 안내·알려진 한계·PR/Issue 항목과 짧은 `updaterSummary`를 포함한다. 웹은 동일 원문의 문단을 재사용하고 긴 기술 기록은 링크로 연결한다.
- PR/Issue 항목은 number·실제 제목·canonical URL·분류와 근거를 갖는다. 해결 Issue와 참고 Issue의 중복/OPEN 해결 표시는 거부하고 상태 확인 시점을 남긴다. 상태 snapshot의 실제 의미는 원격 조회와 리뷰로 확인한다.
- stable X.Y.Z, vX.Y.Z tag, 40자리 source, UTC 공개 시각, rhwp tag/commit, 6종 설치 형식을 검사한다. updater 자동 3종과 수동 3종을 구분하고 기존 inventory validator를 재사용한다.
- 과거 원문을 검사할 때 현재 checkout의 rhwp pin·제품 version을 무조건 요구하지 않는다. 해당 version의 승인 metadata와 고정 provenance를 기준으로 검사하며 이번 v0.1.1 예제는 공개 source의 pin과 대조한다.
- GitHub 출력은 승인된 heading 순서를 유지한다. 웹 템플릿의 원문 토큰은 escape하고 unknown/missing token은 실패시킨다. 자유 HTML/script는 원문으로 받지 않는다.
- CLI는 version·입력 경로·출력 경로를 명시적으로 받고 자동 게시 기능을 갖지 않는다. 생성은 로컬 파일만 만들고 check는 원문/템플릿/기존 생성물 비교만 수행한다.
- 검토용 `release-body.md`, `updater-notes.txt`는 명시한 임시 output directory로 생성한다. 커밋하는 웹 안내는 `site/updates/v<version>.html`이며 재생성 결과와 같은지 검사한다.
- 현재 site release version과 notes version이 같으면 `site/release.json.notes`와 생성 요약의 정합성을 검사한다. 0.1.0 사이트와 0.1.1 예제의 version이 다르면 feed를 변경하지 않는다.
- 기존 첫 공개/미공개 fixture에서는 버전 원문이 없는 상태를 허용한다. 원문이 존재하는 버전의 오류·drift를 skip하거나 경고로 낮추지 않는다.
- 정확한 필드와 파일 역할은 Stage 1의 계약에 고정한다. file 300 LOC, function 50 LOC, parameter 5개 상한을 목표로 역할별로 분리한다.

## Stage 1 — 사용자 원문 계약과 템플릿

### 산출물

신규:

- `mydocs/_templates/release_notes.md`, `mydocs/_templates/website_release_note.html`
- `scripts/releases/notes-schema.mjs`, `scripts/releases/notes-fields.mjs`, `scripts/releases/notes-metadata.mjs`
- `tests/release-notes.test.mjs`, `tests/fixtures/release-note-fixtures.mjs`

이번 단계에서 실제 v0.1.1 공개 문구·웹 페이지·site release data는 변경하지 않는다.

### 변경 내용

- 템플릿에 실제 사용 위치·작성 시점·언어·필수/선택 항목·검증/승인 기준을 적는다. 템플릿 제목에는 '템플릿'을 포함한다.
- 필수 heading 순서, 다운로드·지원 범위, 앱 변화와 rhwp 변화, 해결/참고 Issue 기준을 정의한다.
- type/필수 값·빈 문구·placeholder·길이·버전·pin·URL·target·PR/Issue 정합성을 검사한다.
- fixture는 합성 문구와 고정된 공개 metadata만 사용한다. 로컬 credential·사용자 문서 경로를 넣지 않는다.

### 검증

```bash
node --test tests/release-notes.test.mjs
node --test tests/updater-release.test.mjs tests/release-metadata.test.mjs
git diff --check
```

누락·잘못된 버전/URL·중복 target·OPEN 해결 Issue·관련/해결 중복·4000자 초과 notes가 실제로 실패하는지 확인한다. 정상 fixture만 통과하는 구현과 같은 테스트로 한정하지 않는다.

### 커밋

```text
Task #102 Stage 1: 릴리즈 원문 계약과 작성 템플릿 정의
```

Stage 1 source·테스트·`mydocs/working/task_m010_102_stage1.md`를 함께 커밋한다.

## Stage 2 — 생성·drift 검사 및 CI 연결

### 산출물

- 신규 `scripts/releases/notes-render.mjs`, `website-render.mjs`, `notes-cli.mjs`, `notes-check.mjs`
- Stage 1 모듈·테스트의 필요한 확장
- `package.json`, `scripts/build-pages.mjs`, `scripts/check-pages.mjs`, `tests/pages.test.mjs`
- `.github/workflows/alhangeul-ci-fast.yml`, 관련 `tests/ci-pr-acceptance.test.mjs`의 검사 연결

### 변경 내용

- GitHub 전체 본문, 기존 사이트 디자인의 버전별 HTML, 4000자 이내 짧은 updater 요약을 생성한다.
- pnpm 명령 `generate:release-notes`, `check:release-notes`, `test:release-notes`를 추가한다. 생성물은 검토할 수 있는 파일로 저장하고 어떠한 원격 mutation도 실행하지 않는다.
- check는 notes schema/metadata와 템플릿 토큰, 필수 heading, 이미 존재하는 생성 페이지의 drift를 검사한다.
- Pages build/check에서 재사용 가능한 규격 검사를 연결한다. build가 수정된 source 페이지를 조용히 고쳐 drift를 숨기지 않는다.
- Linux 빠른 CI에 규격·Pages 검사를 연결하고 `test:automation`에 신규 회귀를 포함한다. Windows 빠른 job에서는 플랫폼 중립 신규 회귀·명령의 경로/개행 동작을 확인한다. native installer를 새로 만들지 않는다.
- 파일 읽기/출력은 명시한 경로에 한정하고 template path traversal·symlink/기존 output 덮어쓰기 정책을 검사한다. 이 정책은 로컬 생성물의 권한을 확대하지 않는다.

### 검증

```bash
pnpm run test:release-notes
pnpm run check:release-notes
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs tests/actions-workflows.test.mjs tests/ci-pr-acceptance.test.mjs
git diff --check
```

temp root에 동일 입력 2회 생성→byte 일치, 원문/HTML token/생성 HTML의 변경→drift 실패, Markdown heading 주입·HTML escaping·version 고정 URL·Windows 경로/개행 회귀를 확인한다. 신규 파일이 없는 현재 사이트 및 기존 unreleased/published manifest true/false fixture의 계약은 보존한다.

### 커밋

```text
Task #102 Stage 2: 릴리즈 안내 생성과 Pages·CI 검사 연결
```

Stage 2 source·테스트·stage2 report를 함께 커밋한다. 새 remote CI는 게시할 exact harness SHA에서 실행하며 새 source에 대한 required check를 읽는다.

## Stage 3 — v0.1.1 적용과 웹 화면 수용

### 산출물

- `docs/releases/v0.1.1.notes.json`, `docs/releases/v0.1.1.md`
- `site/updates/v0.1.1.html`, `site/updates/index.html`
- `site/script.js`, `site/styles.css`의 필요한 작은 보정, Pages 회귀
- 검토용 GitHub 본문·short notes·PR #101의 새 적용 preview는 임시 output directory에 생성

### 변경 내용

- #97 public read-back receipt와 이전/현재 공개 tag·source 비교에 기반해 v0.1.1 원문을 작성한다. 임시 receipt에만 의존하지 않고 공식 기록에 공개 근거·고정 commit/run 링크와 필요한 metadata를 보존한다.
- main source `96e89e900415ee9e1e942b5c01c833dea3415e86`, 공개 시각 `2026-10-03T17:07:44Z`, rhwp v0.8.6 pin 유지, 이미 확인한 공개 asset의 exact URL/hash와 일치시킨다.
- 주요 앱 변화는 #98 로컬 글꼴 조회 성능 개선이다. 고정 fixture의 Windows/Linux 수치를 조건과 함께 안내한다. build/CI/운영 PR을 주요 신규 기능으로 소개하지 않는다.
- #97은 아직 OPEN이므로 참고 Issue로 표현한다. #100의 harness는 공개 product tag 이후 변경이며 v0.1.1 runtime 기능으로 넣지 않는다.
- 웹 안내는 변경 요약·rhwp 변화·앱 변화·한계·설치와 업데이트의 짧은 구조를 사용한다. 최신 메뉴와 버전 고정 다운로드, 공개 날짜, 기술 기록 링크를 구분한다.
- 목록은 로컬 버전 안내가 있는 경우 연결하고 없는 과거 릴리즈는 GitHub Release 링크를 유지한다. 현재 공개 release data를 기준으로 최신 여부를 표시한다.
- '첫 공개 검증이 끝나면' 같은 지난 시제 안내를 현재 상태에 맞춰 보정하고 실제 upgrade 미실행 여부를 명확히 쓴다. 이후 #97 결과를 적용할 위치를 기록한다.
- site/release.json은 변경하지 않는다. PR #101의 v0.1.1 공개 metadata를 별도 preview 입력으로 사용해 새로운 짧은 notes를 반영한 build/화면을 준비한다.

### 검증

```bash
pnpm run generate:release-notes -- --version 0.1.1 --output-dir /tmp/task102-v011-preview
pnpm run check:release-notes
pnpm run test:release-notes
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs tests/updater-release.test.mjs
git diff --check
```

- 생성물을 실제 공개 tag·assets·PR/Issue 원문과 대조한다. HTTP read-back과 구조 검사만으로 실제 upgrade 성공을 선언하지 않는다.
- built preview의 index·v0.1.1 페이지를 브라우저에서 넓은 화면과 좁은 화면으로 확인한다. header/footer·다운로드·문서 링크·한글 줄바꿈과 이전 버전/최신 안내를 확인한다.
- 현재 0.1.0 site와 PR #101의 0.1.1 preview를 각각 확인해 최신 표시를 검증한다. Pages source SHA와 앱 source SHA를 혼동하지 않는다.
- 공개 v0.1.1 body는 수정하지 않고 생성 body의 exact 내용·hash를 승인 대상으로 보존한다.

### 커밋

```text
Task #102 Stage 3: v0.1.1 본문과 버전별 웹 안내 규격 적용
```

Stage 3 문서·생성 page·source·검증·stage3 report를 함께 커밋한다.

## Stage 4 — 운영 문서·통합 검증·#97 인계

### 산출물

- `mydocs/_templates/README.md`, `mydocs/_templates/release_record.md`
- `docs/operations/PUBLIC_RELEASE_RUNBOOK.md`, `docs/operations/RELEASE_CHECKLIST.md`
- `docs/releases/README.md`, `docs/architecture/PROVENANCE.md`
- 필요한 `README.md`, `docs/README.md`의 연결/공개 상태 안내
- `mydocs/working/task_m010_102_stage4.md`, 최종 보고서·orders·계획 상태

### 변경 내용

- 원문 작성→metadata 대조→생성→check→본문 승인→게시→read-back 순서를 기존 gate에 연결한다. 제품 공개 승인을 도구 검사로 대체하지 않는다.
- v0.1.1 기록에 GitHub 공개 완료와 Pages/manifest·actual upgrade 미실행을 따로 적는다. #97 고정 source/run/report를 연결해 native exact bytes 수용을 재사용한 이유를 적는다.
- 참조 macOS 저장소의 고정 commit·관련 파일·형식 차용·라이선스 판단을 PROVENANCE에 기록한다. 직접 복사한 코드가 있을 때 notice를 보존한다.
- #97 인계에는 공통 규격 merge SHA, 생성 원문, PR #101에 적용할 short notes·웹 연결과 아래 재검증을 명시한다.
- #102 PR merge 후 #97은 merge 방식으로 최신 devel을 반영한다. orders 충돌에서는 두 작업의 검증된 최신 상태를 보존하며 force/rebase는 하지 않는다.

### 검증

```bash
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run check:release-notes
pnpm run test:release-notes
pnpm run build:pages
pnpm run check:pages
pnpm run test:automation
git diff --check
```

- Windows/Linux 빠른 CI를 exact source로 확인한다. native Rust/Tauri/Mac 제품 검증·패키징은 실행하지 않는다.
- 지난 stage의 성공한 검사를 같은 bytes로 불필요하게 반복하지 않고 새 변경에 필요한 범위만 재실행한다. 위 목록의 필수 통합 결과는 최종 보고에 실행/재사용 근거를 구분해 기록한다.
- 문서 링크·template 사용 명령·필수 heading·source drift·다운로드 종류와 공개 상태를 함께 확인한다.

### 커밋

```text
Task #102 Stage 4: 릴리즈 작성 절차 정렬과 v0.1.1 적용 인계
```

Stage 4 변경·stage4 report를 묶고 별도 최종 보고 승인 후 `task-final-report` 절차로 report/orders/최종 commit·publish/task102·devel 대상 PR을 준비한다.

## 검증

- 각 stage 명령은 report 작성 전에 수행하고 실패·누락은 완료로 처리하지 않는다.
- 각 stage report는 중앙 템플릿과 `task-stage-report` 절차로 source와 함께 커밋한다.
- 새 기능 검사와 기존 Pages contract를 동시에 유지한다. unreleased fixture·수동 package·same-version production test의 의미를 바꾸지 않는다.
- 원격 상태는 실제 조회 시점과 함께 기록한다. 생성 body·site page는 승인 전 미게시 산출물이다.
- 변경 범위·문서 위치·명령이 달라져야 하면 구현계획 보정과 승인을 먼저 받는다.

## 커밋

- 단계 source·test·stage report는 `Task #102 Stage {N}: 내용`으로 묶는다.
- 최종 report/PR 단계는 저장소의 task-final-report 절차와 승인 gate를 따른다.
- remote는 `publish/task102`만 사용하고 `local/task102`는 push하지 않는다.

## 단계 의존성

- Stage 1은 이 구현계획·Stage 1 승인 후 시작한다. Stage 2~4는 직전 stage 검증·보고 승인 후 진행한다.
- #102 공통 규격 PR merge 후 #97/PR #101에서 실제 게시 데이터와 짧은 notes를 반영·재검증한다.
- 수정된 #101의 required check·Pages preview·새 notes를 검토한 후 merge 승인을 요청한다. 기존 head의 check 성공을 새 head의 성공으로 재사용하지 않는다.
- 정확한 생성 GitHub body의 수정 승인과 merge 후 exact devel SHA Pages/manifest 공개 승인 뒤 각각 게시한다.
- actual production 0.1.0 → 0.1.1은 manifest read-back 뒤 #97의 별도 범위 승인·harness로 검증한다.

## 위험과 대응

- **원문/metadata 불일치**: 승인 metadata와 inventory를 검증하고 기계 입력·사용자 문구 책임을 구분한다.
- **과거 페이지의 잘못된 최신 표시**: 실제 site release data 기준과 없는 버전 페이지의 GitHub fallback을 유지한다.
- **업데이트 검증 완료의 과장**: GitHub 공개·manifest 게시·실제 upgrade 상태를 별도 필드/기록으로 보존한다.
- **생성문 주입·출력 덮어쓰기**: typed 입력·escape·token 검사·명시 출력 경로 정책으로 제한한다.
- **기존 파일 크기**: Pages entry는 작은 모듈로 위임하고 신규 각 모듈은 300 LOC 이내를 목표로 한다. 초과 시 먼저 분리/승인한다.

## 승인 요청 사항

- 4개 stage의 구체적인 파일·입출력 계약·검증·commit·의존성을 승인 요청한다.
- 구현계획 승인과 Stage 1 시작 승인을 요청한다. 승인 후 첫 stage의 template·validator·회귀부터 구현한다.
- 공개 body 수정, #102/#101 merge, Pages/manifest 게시, actual upgrade를 이번 구현계획 승인으로 실행하지 않는다.
