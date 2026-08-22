# Task #34 구현계획서 — Linux exact-SHA GUI acceptance 자동화

수행계획서: [`task_m010_34.md`](task_m010_34.md)
GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
마일스톤: M010

새 `workflow_dispatch` workflow는 default branch에 파일이 존재해야 실제 실행할 수 있다. 따라서 Stage 1~4에서 코드·정적 계약·플랫폼 중립 검증을 완료하고 Stage 5에서 task PR과 activation checklist를 확정한다. PR은 Issue를 자동 close하지 않는 `Refs #34`로 게시하며, merge 뒤 실제 native x64 dispatch와 증거 read-back을 통과한 뒤에만 Issue #34를 닫는다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | exact-SHA handoff와 driver 계약 | run/artifact verifier·fixture test·probe entrypoint | 변조·오결속 fail-closed test |
| 2 | 공통 WebDriver 문서 UX harness | WDIO config·공통 fixture/evidence helper·WebView spec | focused WDIO/helper contract test |
| 3 | Linux native dialog·PDF·print adapter | AT-SPI adapter·PDF analyzer·Linux scenario | native UI/PDF focused test |
| 4 | Linux GUI workflow와 운영 계약 | manual workflow·workflow test·release 문서 | 전체 중립 gate·Action SHA pin 검사 |
| 5 | task PR과 post-merge canary handoff | activation checklist·최종 보고·task PR | PR 전 gate와 merge 후 live close gate |

각 Stage가 끝나면 `task-stage-report`로 `mydocs/working/task_m010_34_stage{N}.md`를 작성하고 해당 Stage 변경과 묶어 커밋한다. 다음 Stage는 작업지시자의 단계 보고 승인 뒤 시작한다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| desktop release gate | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | Stage 4에서 자동 gate·잔여 수동 gate 갱신 |
| 개발·재현 진입점 | `docs/` | `docs/DEVELOPMENT.md` | OK | 로컬 probe/실패 재현 명령이 필요한 경우만 최소 보정 |
| 구현·단계·최종 보고 | `mydocs/` 역할별 폴더 | `plans/`, `working/`, `report/` | OK | Hyper-Waterfall 작업 증적 |

새 공식 문서 루트나 `mydocs/manual` 문서는 만들지 않는다. GUI harness 사용법이 길어지더라도 Stage 4에서 기존 개발·운영 문서에 역할별로 나누고, 별도 공식 문서가 필요하면 계획 변경 승인을 먼저 받는다.

## 공통 구현 계약

- 제품 binary에는 WebDriver 전용 Tauri plugin이나 debug capability를 추가하지 않는다. 설치된 production DEB를 외부 `tauri-driver`와 WebKitWebDriver로 구동한다.
- GUI test dependency는 pnpm workspace에서만 관리한다. npm/yarn lockfile이나 global JavaScript package 설치를 추가하지 않는다.
- 공통 fixture, WebView selector/helper, evidence manifest와 판정 summary는 플랫폼 중립으로 둔다. GTK, Xvfb, AT-SPI, CUPS 명령은 `tests/gui/linux/` adapter만 소유한다.
- helper는 명령 실행·GitHub API·파일 I/O 경계를 주입 가능하게 분리해 unit test가 network, GUI와 repository write 없이 실패 경로를 검증할 수 있게 한다.
- script는 secret/token 값을 출력하지 않고, 사용자 개인 문서·경로 대신 repository fixture와 임시 디렉터리만 사용한다.
- workflow는 orchestration만 소유한다. metadata 판정, PDF 계약과 evidence manifest 생성을 긴 inline shell에 중복 구현하지 않는다.
- 파일 300 LOC, 함수 50 LOC, 매개변수 5개 권장 상한을 지킨다. 역할이 커지면 handoff, GUI, native UI와 evidence 분석 모듈로 분리한다.
- 이 구현계획서 자체는 5개 Stage의 산출물·검증·post-merge close gate를 한 승인 문서에 고정하느라 300행을 소폭 넘지만, 구현 소스와 test 파일에는 위 상한을 적용한다.
- 무조건 재시도나 `continue-on-error`로 GUI 실패를 성공 처리하지 않는다. readiness condition과 bounded timeout을 사용하고 실패 증거는 `always()`로 보존한다.

## Stage 1 — exact-SHA handoff와 driver 계약

### 산출물

신규:

- `scripts/verify-workflow-artifact.mjs`
- `tests/workflow-artifact-handoff.test.mjs`
- `tests/gui/linux/probe.mjs`
- `tests/gui/support/process.mjs`
- `mydocs/working/task_m010_34_stage1.md`

수정:

- `package.json`

Stage 1 조사에서 probe 역할이 명확히 달라지면 `tests/gui/linux/` 아래 파일명은 분리할 수 있으나 제품 코드나 공식 문서 위치는 바꾸지 않는다.

### 변경 내용

- handoff helper는 repository, 40자리 `build_ref`, native `run_id`, workflow filename과 artifact name을 명시적으로 입력받는다.
- GitHub run metadata에서 repository, `head_sha`, event, status/conclusion과 workflow identity를 확인한다. run이 성공하지 않았거나 exact SHA가 다르면 artifact download output을 내기 전에 실패한다.
- artifact 목록에서 만료되지 않은 정확한 `alhangeul-desktop-linux-x64` 1개만 허용하고 artifact ID·size·digest를 구조화 output으로 낸다. 누락·중복·이름만 일치하는 다른 run은 실패한다.
- 다운로드 뒤에는 기존 `verify-desktop-artifacts.mjs --platform linux-x64 --verify-inventory`를 사용해 DEB/AppImage/RPM inventory와 SHA-256을 재검산한다. 새 helper가 package 분류를 복제하지 않는다.
- fixture test는 malformed SHA/run ID, 다른 repository/head SHA/workflow/event, incomplete/failed run, expired·missing·duplicate artifact, 변조 inventory와 정상 metadata를 포함한다.
- Linux probe entrypoint는 Xvfb, WebKitWebDriver, `tauri-driver`, 설치 app 경로와 bounded log directory를 검증하고 최소 session에서 앱 title/root DOM을 읽고 종료하는 계약만 담당한다.
- production DEB 외부 연결에 plugin이 필요하다는 정적/로컬 증거가 나오면 embedded provider로 전환하지 않고 Stage를 중단해 계획 변경을 요청한다. 실제 native probe 성공은 merge 후 close gate에서 확정한다.

### 검증

```bash
node --test tests/workflow-artifact-handoff.test.mjs
node tests/gui/linux/probe.mjs --help
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

현재 macOS host에서는 Linux driver 실행 성공을 주장하지 않는다. probe의 순수 parser/process test만 중립 검증하고 native 실행은 post-merge gate까지 미확정으로 기록한다.

### 커밋

```text
Task #34 Stage 1: exact-SHA artifact handoff 계약 추가
```

## Stage 2 — 공통 WebDriver 문서 UX harness

### 산출물

신규:

- `tests/gui/wdio.shared.conf.ts`
- `tests/gui/wdio.linux.conf.ts`
- `tests/gui/specs/document-ux.e2e.ts`
- `tests/gui/support/document-fixture.ts`
- `tests/gui/support/evidence.ts`
- 공통 helper focused test
- `mydocs/working/task_m010_34_stage2.md`

수정:

- `package.json`
- `pnpm-lock.yaml`

### 변경 내용

- WebdriverIO/Tauri service와 필요한 runner·framework·reporter dependency를 pnpm으로 고정하고 `test:gui:linux` entrypoint를 추가한다.
- shared config는 app path, driver path, fixture/output directory와 timeout을 environment input으로 받고 platform command를 포함하지 않는다.
- Linux config는 외부 `tauri-driver` provider와 Xvfb 환경만 결합한다. 제품 binary에 embedded provider 설정을 추가하지 않는다.
- committed fixture는 기존 `third_party/rhwp/samples/biz_plan.hwp`와 repository HWPX fixture를 사용한다. fixture가 submodule provenance에만 존재하면 test 시작 시 exact path·hash를 기록하며 개인 문서를 대체 입력으로 허용하지 않는다.
- 공통 spec은 파일 선택 open, toolbar 초기 숨김 상태, 한글 UI text, 문서 page count, 최초 중앙 정렬을 DOM/bridge에서 확인한다.
- 현재 형식 저장과 다른 이름 저장은 native dialog 진입 전/후의 WebView command·document state를 공통 spec이 소유하고 실제 GTK dialog 조작은 Stage 3 adapter hook에 위임한다.
- evidence helper는 SHA/run ID, scenario, app/driver version, timestamps, logs, screenshots와 생성 파일 hash를 JSON manifest에 기록하고 경로·token을 정규화한다.
- Issue #35가 shared config, fixture, selector, manifest schema를 import할 수 있고 Linux adapter를 import하지 않는 source boundary test를 둔다.

### 검증

```bash
pnpm exec tsc --noEmit -p tests/gui/tsconfig.json
pnpm run test:gui:contracts
pnpm run test:automation
pnpm run test:studio
pnpm run build:studio
git diff --check
```

`test:gui:contracts`의 정확한 script 이름과 test runner는 Stage 2 dependency 확정 시 `package.json`에 고정한다. macOS에서 production Linux app을 실행하지 않고 config/helper·selector 계약만 검증한다.

### 커밋

```text
Task #34 Stage 2: 공통 WebDriver 문서 UX harness 추가
```

## Stage 3 — Linux native dialog·PDF·system print adapter

### 산출물

신규:

- `tests/gui/linux/native-ui/` 아래 AT-SPI adapter와 focused fixture test
- `tests/gui/linux/pdf-analysis.mjs`
- `tests/gui/specs/linux-native.e2e.ts`
- `mydocs/working/task_m010_34_stage3.md`

수정:

- `tests/gui/wdio.linux.conf.ts`
- `package.json`

### 변경 내용

- Stage 1에서 확인한 AT-SPI 접근성 role/name을 기준으로 GTK file chooser와 print dialog의 readiness, file name/path 입력, 저장·취소와 modal 종료를 조작한다.
- 접근성 tree로 식별되지 않는 OS drag-in은 Xvfb의 bounded input fallback을 별도 함수로 격리한다. 화면 크기·창 bounds를 먼저 검증하고 실패 시 좌표 클릭을 반복하지 않고 screenshot/tree dump와 함께 실패한다.
- HWP/HWPX 현재 형식 저장, Save As, 재열기를 실행하고 생성 파일 존재·size·hash와 status restoration을 확인한다.
- 직접 PDF와 GTK Print to File/CUPS 결과는 별도 임시 경로에 저장한다. 6쪽 `biz_plan.hwp`에 대해 `pdfinfo` A4/page count, `pdftotext` 한글 표제, page render의 blank/crop heuristic을 판정한다.
- system print 저장·취소·반복 뒤 editor document title/page count와 print status가 복원되는지 확인한다. physical printer는 선택하지 않는다.
- tofu는 text extraction만으로 성공 처리하지 않는다. 대표 screenshot/PDF render를 evidence로 남기고 자동 summary에는 시각 read-back 필요 여부를 명시한다.
- native adapter는 프로세스·창·임시 출력 cleanup을 `finally`에서 수행하고, 실패 후 다음 scenario에 상태를 누출하지 않는다.

### 검증

```bash
node --test tests/gui/linux/*.test.mjs tests/gui/linux/native-ui/*.test.mjs
pnpm run test:gui:contracts
pnpm run test:automation
git diff --check
```

실제 GTK/CUPS GUI 성공은 merge 후 native close gate에서 확정한다. Stage 보고서는 중립 fixture 결과와 아직 실행하지 못한 native 시나리오를 분리해 기록한다.

### 커밋

```text
Task #34 Stage 3: Linux native dialog와 출력 수용 adapter 추가
```

## Stage 4 — Linux GUI workflow와 운영 계약

### 산출물

신규:

- `.github/workflows/alhangeul-linux-gui.yml`
- `tests/linux-gui-workflow.test.mjs`
- `mydocs/working/task_m010_34_stage4.md`

수정:

- `tests/actions-workflows.test.mjs`
- `package.json`
- `docs/operations/DESKTOP_RELEASE.md`
- 필요한 경우 `docs/DEVELOPMENT.md`
- artifact 크기·disk 측정상 필수인 경우에만 `.github/workflows/alhangeul-desktop.yml`

### 변경 내용

- workflow는 `workflow_dispatch`만 사용하고 40자리 `build_ref`와 numeric `native_run_id`를 required input으로 둔다. `ubuntu-22.04` standard x64 runner, `actions: read`, `contents: read` 최소 permission을 사용한다.
- checkout 뒤 `HEAD == build_ref`를 확인하고 Stage 1 helper로 native run/artifact metadata를 검증한 후 artifact ID를 handoff한다. 검증 전 앱 설치·실행을 금지한다.
- exact artifact를 다운로드한 뒤 inventory를 독립 재검산하고 단일 DEB path를 선택해 설치한다. workflow 내 latest-run 검색이나 filename glob 첫 항목 선택은 허용하지 않는다.
- Xvfb/WebKitGTK/GTK/AT-SPI/CUPS/Poppler dependency와 `tauri-driver` version을 명시적으로 준비하고 환경 version을 manifest에 기록한다.
- GUI scenario는 scenario별 bounded timeout을 두며 동일 실패를 자동 retry하지 않는다. `concurrency`는 build SHA/run ID 단위이고 `cancel-in-progress: true`로 오래된 수동 후보만 취소한다.
- 성공·실패 모두 evidence를 올리고 artifact retention을 제한한다. evidence upload 자체의 실패는 원래 GUI 실패를 덮어쓰지 않되 성공 run에서 evidence 누락은 gate 실패로 처리한다.
- 이번 task가 새로 추가하는 모든 외부 Action은 full immutable commit SHA와 version comment로 고정한다. 기존 workflow reference의 일괄 pin은 Issue #27로 남긴다.
- workflow contract test는 trigger/input/permission/runner, exact handoff 순서, no latest fallback, no paid runner/Codespaces, Action pin, timeout/concurrency와 `always()` evidence를 source-level로 고정한다.
- release 문서는 native build run → Linux GUI run → evidence read-back 순서와 잔여 Windows/Linux 실기기 gate를 구분한다. Codespaces는 무료 allowance 확인 실패 시 생성하지 않는 선택적 troubleshooting으로만 기록한다.

### 검증

```bash
node --test tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

### 커밋

```text
Task #34 Stage 4: native Linux GUI acceptance workflow 추가
```

## Stage 5 — task PR과 post-merge native x64 canary handoff

### 산출물

신규:

- `mydocs/working/task_m010_34_stage5.md`
- `mydocs/report/task_m010_34_report.md`

수정:

- `mydocs/orders/20260814.md` 또는 실제 완료일 오늘할일 문서
- Stage 1~4 검증에서 발견한 문서·test의 범위 내 보정

### 변경 내용

- Stage 1~4의 focused/중립 gate를 clean checkout 기준으로 재실행하고 예상 changed path, workflow permission과 신규 Action SHA를 독립 점검한다.
- Stage 5 보고서와 최종 보고서에는 새 workflow가 default branch에 없어서 actual dispatch가 아직 미실행임을 검증 한계로 명시한다.
- `task-final-report`로 `publish/task34`를 push하고 `devel` 대상 Open PR을 만들되 본문은 `Refs #34`를 사용한다. PR merge만으로 Issue를 close하지 않는다.
- PR merge 후 default branch에서 성공한 exact-SHA `alhangeul-desktop.yml` run ID를 입력으로 새 Linux GUI workflow를 dispatch한다.
- live run의 event, workflow/head/input SHA, native run ID, artifact ID/digest, installed package hash, conclusion과 evidence artifact hash를 독립 재검산한다.
- screenshot과 PDF render에서 toolbar 초기 상태, 중앙 정렬, 한글 glyph, 6쪽 A4의 빈 쪽·잘림 여부를 읽고 JSON summary와 대조한다.
- 실패하면 Issue #34를 열어 둔 채 원인 범위에 따라 correction branch/PR을 만들고 같은 exact-SHA gate를 다시 실행한다. 성공한 경우에만 Issue #34를 close하고 #35 task-start로 넘어간다.

### PR 전 검증

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
git status --short
```

### merge 후 close gate

- default branch의 workflow ID와 manual dispatch 가능 상태 확인
- 성공한 native build run의 `head_sha == build_ref`와 Linux x64 artifact inventory 확인
- Linux GUI workflow dispatch 및 conclusion 확인
- evidence inventory/SHA-256 재검산, screenshot/PDF read-back
- Issue #34 close 후 #35 시작 승인 요청

### 커밋

```text
Task #34 Stage 5 + 최종 보고서: Linux GUI acceptance handoff 확정
```

## Stage 5.1 — PR 리뷰 기반 fail-closed 보정

PR #36 maintainer 리뷰와 작업지시자 승인에 따라 merge 전 evidence·typecheck·현재 저장·인쇄 환경 계약을 보정한다. screenshot 실패가 원래 scenario error나 manifest를 덮어쓰지 않도록 공통 runner로 통합하고, GUI TypeScript 검사를 CI에 연결한다. 현재 저장은 완료 상태와 파일 mtime 갱신을 함께 확인하며, CUPS/GTK 기본 A4·설정 read-back·전용 writable 경계를 고정한다.

PDF text floor는 Task #15 Stage 4.8의 직접/GTK/CUPS 실측치를 경로별로 분리해 적용한다. Poppler 판정용 PPM은 evidence 밖 임시 경로에서 처리하고 10쪽 이상 파일명 zero-padding을 지원한다. driver version 단일화, bounded UTF-8 log·process timeout 정리, drag source cardinality와 빈 AT-SPI 오류 fallback, probe 공식 진입점도 같은 범위의 저위험 보정으로 포함한다.

GTK Print-to-File file chooser selector는 actual AT-SPI tree 없이 추측 변경하지 않는다. 새 workflow는 default branch에 없으면 dispatch할 수 있으므로 exact-SHA hosted canary와 selector 측정은 PR merge 후 close gate에서 수행한다.

### 검증

```bash
actionlint .github/workflows/ci.yml .github/workflows/alhangeul-linux-gui.yml
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run typecheck:gui
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

### 커밋

```text
Task #34 [Stage 5.1]: Linux GUI acceptance 리뷰 보정
```

## Stage 5.2 — merged exact-SHA Windows 계약 경로 보정

PR #36 merge 뒤 `run_tests=true`로 실행한 exact-SHA native build에서 Windows
runner의 automation 계약 6건이 실패했다. 제품 build 이전에 Linux fixture의 POSIX
경로가 Windows host `node:path`로 정규화되거나, 범용 writer test가 POSIX literal만
기대해 발생한 결정적 실패이므로 live GUI canary를 우회하지 않고 같은 Issue 안에서
보정 PR을 먼저 만든다.

- Linux 전용 probe의 app·output·evidence·PATH 경로는 `node:path.posix`로 고정한다.
- 공통 실행 파일 탐색 helper는 기본 host 동작을 보존하면서 path delimiter와 join
  경계를 주입할 수 있게 한다.
- 범용 upstream-sync writer test는 production helper가 사용하는 host `resolve()`
  결과를 기대해 Windows와 Linux 양쪽 의미를 유지한다.
- 첫 실패 run은 성공 artifact handoff로 사용하지 않는다. 보정 PR merge 뒤 새 merged
  exact SHA로 native build를 다시 실행하고, 전체 성공 run만 Linux GUI workflow에
  전달한다.

### 검증

```bash
node --test tests/linux-gui-probe.test.mjs tests/rhwp-sync-changes.test.mjs tests/rhwp-sync-pr-body.test.mjs
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run typecheck:gui
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

### 커밋

```text
Task #34 [Stage 5.2]: Windows automation 경로 계약 보정
```

## Stage 5.3 — PR #38 리뷰 기반 Linux path API 소유권 보정

[PR #38 리뷰](https://github.com/postmelee/alhangeul-tauri/pull/38#issuecomment-5322303455)에서
Stage 5.2의 delimiter와 join 개별 주입은 서로 다른 path 구현을 조합할 수 있고,
`atspi.mjs`, `pdf-analysis.mjs`, `drag-drop.mjs`도 Windows runner에서 host path API를
우발적으로 사용할 수 있음을 확인했다. 새 exact-SHA native build를 실행하기 전에
Linux runtime helper의 경로 의미를 POSIX API 단위로 고정한다.

- 공통 `resolveExecutable`은 `delimiter`와 `join`을 하나의 `pathApi`로 주입받고,
  기본값은 현재 host의 `node:path` 전체 API로 유지한다.
- Linux probe와 drag-in은 `node:path.posix` 전체 API를 넘겨 PATH 탐색 경계를
  고정한다.
- AT-SPI adapter와 PDF analyzer는 절대 경로 판정, basename/dirname/join을 같은
  POSIX API가 소유하게 하고 unit test에서만 host API를 명시적으로 주입한다.
- source contract test는 Linux runtime helper가 host path 함수를 구조 분해해
  가져오거나 delimiter/join을 서로 다른 option으로 주입하는 회귀를 금지한다.
- 상대 경로 input 확장처럼 이번 native gate 복구에 필요하지 않은 선택 보정은
  포함하지 않는다.
- 이 Stage의 local commit을 push한 정확한 PR head SHA로
  `alhangeul-desktop.yml`을 `run_tests=true`로 실행한다. Windows automation,
  upstream/studio test, Tauri build, Windows artifact/upload까지 모두 성공하지 않으면
  Linux GUI artifact handoff로 진행하지 않는다.

### 검증

```bash
node --test tests/linux-gui-probe.test.mjs tests/gui-contracts.test.mjs tests/gui/linux/*.test.mjs tests/gui/linux/native-ui/*.test.mjs tests/rhwp-sync-changes.test.mjs tests/rhwp-sync-pr-body.test.mjs
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run typecheck:gui
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

### 커밋

```text
Task #34 [Stage 5.3]: Linux path API 리뷰 보정
```

## Stage 5.4 — post-merge CUPS-PDF directive 보정

PR #38 merge SHA `1ae4415f2547b535d809efcb0b05d1536392eee4`의 exact-SHA native
build는 Windows x64, Linux x64·arm64와 Windows installer smoke를 모두 통과했다.
같은 SHA와 native run을 전달한 Linux GUI canary는 제품 GUI 실행 전에
`Configure CUPS-PDF` 단계에서 실패했다. Ubuntu의 `cups-pdf.conf` 기본값은 `Out`은
활성 directive지만 `Label`은 주석 directive이므로, 활성 행만 치환하던 계약을 같은
Issue의 post-merge close gate 보정으로 처리한다.

- `Out`과 `Label` 치환은 선행 공백과 선택적인 주석 표식을 모두 허용한다.
- 설정 전후의 관련 directive를 로그에 남겨 runner image 변경 시 실패 지점을
  재현할 수 있게 한다. 사용자 문서 경로나 문서 내용은 출력하지 않는다.
- workflow 계약 테스트는 주석 directive를 허용하는 정규식과 전후 진단을 고정한다.
- 제품 코드, CUPS queue 설정, GUI selector와 acceptance threshold는 변경하지 않는다.
- 보정 PR merge 뒤 새 merge exact SHA로 native build와 Linux GUI canary를 다시
  실행한다. 해당 live gate 성공 전에는 Issue #34를 닫지 않는다.

### 검증

```bash
node --test tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
git diff --check
```

### 커밋

```text
Task #34 [Stage 5.4]: CUPS-PDF directive 보정
```

## Stage 5.5 — PR #39 CUPS-PDF 정규화 리뷰 보정

[PR #39 리뷰](https://github.com/postmelee/alhangeul-tauri/pull/39#issuecomment-5322798235)에서
사후 진단 `grep`이 `set -e` 아래 의도치 않은 fatal gate가 되고, 주석 행 직접 치환은
directive 부재·중복·산문 주석과 sed 치환 문자를 일반적으로 처리하지 못함을
확인했다. merge 전 같은 CUPS-PDF 사전 설정 경계 안에서 보정한다.

- 설정 전후 directive 출력은 모두 `|| true`를 사용해 진단으로만 유지한다.
- 주석은 보존하고 활성 `Out`·`Label` directive만 삭제한 뒤 exact 두 행을 append한다.
  따라서 directive가 없거나 활성 값이 중복된 입력도 단일 활성 값으로 수렴한다.
- `$output_dir`는 sed 치환부가 아니라 `printf '%s'` 인자로 전달한다.
- 뒤의 exact `grep -Fqx` 두 줄만 정규화 성공 gate로 유지한다.
- workflow 계약 test는 활성 directive delete, exact append, 두 비필수 진단과 주석
  비치환을 고정한다.
- 실제 distro fixture를 실행하는 행위 test는 production shell 추출 또는 Linux 전용
  실행 경계가 필요하므로 이번 좁은 PR에 복제하지 않는다. merge 후 exact-SHA live
  canary를 필수 gate로 유지하고 재발할 때 별도 범위를 승인받는다.

### 검증

```bash
node --test tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

### 커밋

```text
Task #34 [Stage 5.5]: CUPS-PDF 정규화 리뷰 보정
```

## Stage 5.6 — post-merge CUPS A4 기본값 검증 보정

PR #39 merge SHA `4ab82ed214d513b72aa1162f61ea7f6727f3f191`의 exact-SHA native
build run `32097086884`는 Windows x64, Linux x64·arm64와 Windows installer
smoke를 모두 통과했다. 같은 SHA와 Linux x64 artifact를 전달한 GUI canary run
`32097898631`은 CUPS-PDF 설정 정규화, CUPS 재시작, PDF queue 등록·활성화까지
성공한 뒤 `lpoptions -p PDF` 출력에 exact `PageSize=A4` token을 요구하는 마지막
검사에서 실패했다. exact SHA·artifact digest·설치 DEB checksum은 evidence artifact로
재확인했고 제품 GUI 단계는 실행되지 않았다.

CUPS 공식 계약에서 `lpoptions -p printer -l`은 printer-specific option과 현재 선택된
기본값을 `*` 표식으로 보고한다. Stage 5.6은 특정 runner의 일반 option 직렬화에
의존하지 않고 이 기본값 계약으로 좁게 보정한다.

- queue 기본 용지는 `lpadmin -p PDF -o PageSize=A4` 한 가지 표현으로 설정하고,
  같은 크기를 `media=iso_a4_210x297mm`으로 중복 지정하지 않는다.
- 진단을 위해 일반 queue option과 `-l`의 `PageSize` 행을 로그에 남긴다. 사용자 문서
  경로나 문서 내용은 출력하지 않는다.
- 성공 gate는 `PageSize` 선택지 행에 선택 표식이 붙은 `A4` 또는 CUPS canonical
  `iso_a4_210x297mm` 값이 있는지 검사한다. `PageSize` 행 부재나 다른 기본값은
  fail-closed한다.
- workflow 계약 test는 단일 A4 설정, 두 진단, `-l` 기반 선택값 검증과 기존 exact
  문자열 assertion 제거를 고정한다.
- 제품 코드, CUPS-PDF output directive, GUI selector와 PDF threshold는 변경하지 않는다.
- 보정 PR merge 뒤 새 merge exact SHA에서 native build와 Linux GUI canary를 다시
  실행하고, actual GUI·CUPS-PDF까지 성공하기 전에는 Issue #34를 닫지 않는다.

### 검증

```bash
node --test tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

### 커밋

```text
Task #34 [Stage 5.6]: CUPS A4 기본값 검증 보정
```

## Stage 5.7 — post-merge tauri-driver 환경 증거 보정

PR #40 merge SHA `52135bb4ec14d32f2e74730f3d503b815a67acfc`의 exact-SHA native
build run `32099542661`은 Windows x64, Linux x64·arm64와 Windows installer
smoke를 모두 통과했다. 같은 SHA와 Linux x64 artifact를 전달한 GUI canary run
`32100313824`에서 Stage 5.6의 CUPS A4 gate는 실측 `PageSize/... *A4`로
성공했다. 다음 `Record native environment` 단계는 exact `tauri-driver v2.0.6`
설치를 성공한 뒤, 해당 CLI가 지원하지 않는 `tauri-driver --version`을 호출해
실패했다. 제품 GUI 단계는 실행되지 않았다.

- driver 설치 gate는 기존 `cargo install tauri-driver --version
  "$TAURI_DRIVER_VERSION" --locked`를 그대로 유지한다. 실제 runner 로그가
  `Installed package tauri-driver v2.0.6`을 확인했다.
- 환경 증거 파일에는 지원하지 않는 binary flag 호출 대신 workflow의 exact install
  input인 `TAURI_DRIVER_VERSION`을 `tauri-driver <version>` 형식으로 기록한다.
- workflow 계약 test는 exact install command와 GUI evidence version 결속을 유지하고,
  environment 단계의 pinned version 출력과 `tauri-driver --version` 부재를 고정한다.
- CUPS 설정, 제품 코드, GUI runner·selector와 acceptance threshold는 변경하지 않는다.
- 보정 PR merge 뒤 새 merge exact SHA에서 native build와 Linux GUI canary를 다시
  실행하고, actual GUI까지 성공하기 전에는 Issue #34를 닫지 않는다.

### 검증

```bash
node --test tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

### 커밋

```text
Task #34 [Stage 5.7]: tauri-driver 환경 증거 보정
```

## Stage 5.8 — post-merge WebKitWebDriver 환경 증거 보정

PR #41 merge SHA `3800b07530de187e17ecbfe8f6e1880c6124145d`의 exact-SHA native
build run `32100884762`는 Windows x64, Linux x64·arm64와 Windows installer
smoke를 모두 통과했다. 같은 SHA와 Linux x64 artifact를 전달한 GUI canary run
`32101528891`은 exact checkout·artifact handoff, DEB 설치, CUPS-PDF 구성과 Stage
5.6의 A4 gate, Stage 5.7의 exact `tauri-driver 2.0.6` 설치까지 성공했다. 다음
`Record native environment` 단계에서 Ubuntu 22.04의 `WebKitWebDriver`가 지원하지
않는 `--version`을 호출해 usage를 출력하고 exit 1을 반환했으며 제품 GUI 단계는
실행되지 않았다.

- `WebKitWebDriver --version` 호출을 제거한다. `command -v WebKitWebDriver`를
  fail-closed 실행해 실제 binary 경로를 기록하고, 기존 `dpkg-query -W ...
  webkit2gtk-driver`가 설치 패키지 버전을 기록하도록 역할을 분리한다.
- workflow 계약 test는 binary 탐색, package version 증거와 두 driver의 미지원
  `--version` 호출 부재를 고정한다.
- exact driver 설치, CUPS 설정, 제품 코드, GUI runner·selector와 acceptance
  threshold는 변경하지 않는다.
- 보정 PR merge 뒤 새 merge exact SHA에서 native build와 Linux GUI canary를 다시
  실행한다. GUI·PDF evidence read-back까지 성공하기 전에는 Issue #34를 닫지 않는다.

### 검증

```bash
node --test tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

### 커밋

```text
Task #34 [Stage 5.8]: WebKitWebDriver 환경 증거 보정
```

## Stage 5.9 — CUPS 환경 증거·file upload protocol 보정과 pre-PR branch CI

PR #42 merge SHA `fee06fb41de05586a8088b88821a95ca6e97cc16`의 exact-SHA native
build run `32342945305`는 Windows x64, Linux x64·arm64와 Windows installer
smoke를 모두 통과했다. 같은 SHA와 Linux x64 artifact를 전달한 GUI canary run
`32343886835`은 exact handoff, DEB 설치, CUPS-PDF A4 구성, exact tauri-driver 설치와
Stage 5.8의 WebKitWebDriver binary·패키지 증거까지 성공했다. 환경 증거의 마지막
`cupsd -v`는 Ubuntu 22.04 `cupsd`가 지원하지 않는 option이라 usage를 출력하고
exit 1을 반환했으며 제품 GUI 단계는 실행되지 않았다.

- `cupsd -v`를 제거하고 기존 `dpkg-query -W` 대상에 `cups`를 추가해 CUPS package
  version을 지원되는 OS package database 계약으로 기록한다. CUPS 실제 동작은 앞선
  service restart, PDF queue와 A4 선택 기본값 gate가 계속 검증한다.
- workflow 계약 test는 `cups` package version 증거와 `cupsd -v` 부재를 고정한다.
- exact artifact handoff, driver 설치, CUPS 설정, 제품 코드, GUI selector와 PDF
  threshold는 변경하지 않는다.
- 로컬 gate 뒤 `local/task34`를 원격 `publish/task34`로 먼저 push하되 PR은 만들지
  않는다. 이미 default branch에 존재하는 manual workflow를 `--ref
  publish/task34`로 실행해 correction branch의 workflow 정의를 검증한다.
- 이번 변경은 workflow evidence 명령·source contract·문서만 바꾸므로 branch GUI
  진단은 검증된 제품 SHA `fee06fb41de05586a8088b88821a95ca6e97cc16`과 native run
  `32342945305`를 재사용한다. branch GUI가 실패하면 같은 branch에서 보정·재실행하고,
  완전히 성공한 뒤에만 correction PR을 생성한다.
- 첫 pre-PR branch GUI run `32345377664`은 CUPS 환경 증거까지 통과했지만, 의도적으로
  숨겨진 `#file-input`의 WebDriver 업로드에서 실패했다. 입력을 일시 표시한 첫 보정 SHA
  `ceb8b3ba7283152ae37d6c5de5e9317b54ee5499`의 native run `32347468978`은 Windows
  x64, Linux x64·arm64와 installer smoke를 모두 통과했지만 GUI run `32348548068`도
  같은 지점에서 실패했다. WDIO log read-back 결과 `setValue()`가 파일 경로 전송 전에
  `Element Clear`를 호출하고 WebKit이 이를 `element not interactable`로 거부한 것이
  원인이다.
- 제품 selector와 숨김 상태를 그대로 유지한다. `setValue()`와 DOM style 변경을 제거하고
  WebDriver `Element Send Keys`로 직행하는 `addValue()`를 사용하며, WebKit capability
  `strictFileInteractability: false`를 명시한다. source contract는 `addValue` 사용과
  clear/style 변경 부재를 고정한다.
- 이 protocol을 적용한 branch GUI run `32350630637`에서 file upload와 문서 렌더는
  성공했지만, HWP가 로드 94%에서 사용자 선택형 `로컬 글꼴 감지` 모달을 띄워 최종
  basename 상태를 기다리던 harness가 timeout됐다. 증거 screenshot과 send keys 응답
  `RESULT null`을 read-back해 upload 실패와 구분했다. headless acceptance는 OS 로컬 글꼴
  접근 권한을 요청하지 않고 `대체 글꼴로 보기`를 선택한다. 해당 제목이 아닌 modal은
  자동 진행하지 않고 fail-closed하며, 제품의 실제 기본·권장 UX는 변경하지 않는다.
- 첫 modal handler run `32351859807`은 두 fixture 모두 모달까지 도달했지만 WebDriver의
  `.dialog-title` text가 자식 닫기 버튼을 포함한 `로컬 글꼴 감지×`로 측정돼 fail-closed했다.
  닫기 버튼의 고정 `×` 접미사만 제거한 뒤 정확한 제목 비교를 유지한다.
- 제목 정규화 run `32352662110`은 모달 버튼 click까지 진행했지만 두 document test가 각각
  정확히 120초에 종료됐다. `ALHANGEUL_GUI_TIMEOUT_MS`를 개별 WebDriver operation과 Mocha
  전체 test에 동시에 사용한 것이 직접 원인이며, timeout 뒤 남은 async action이 다음 fixture와
  evidence를 오염시켰다. operation timeout은 유지하고 전체 scenario timeout은 5배, 최대
  15분으로 분리한다. 또한 production binary에 WDIO plugin을 넣지 않고 session 시작 시 표준
  `switchToWindow`로 단일 WebDriver window를 고정해 Tauri service의 반복 plugin focus probe를
  억제한다. window cardinality가 1이 아니면 실행 전에 fail-closed한다.
- pre-PR 보정 중 acceptance harness만 바뀌어도 전체 native matrix를 재빌드하는 낭비를
  피한다. workflow source는 공식 immutable context `github.workflow_sha`로 checkout·검증하고,
  제품 artifact는 `build_ref`와 native run으로 독립 검증한다. evidence에는
  `acceptanceRef`, `workflowRef`, `buildRef`를 모두 기록한다. branch gate에서는 성공한 제품
  artifact SHA `ceb8b3ba7283152ae37d6c5de5e9317b54ee5499`와 run `32347468978`을
  재사용할 수 있으며, 최종 merge close gate에서는 acceptance SHA와 build SHA가 같은 merge
  exact SHA로 수렴해야 한다.
- PR merge 뒤에는 새 merge exact SHA의 native build와 Linux GUI canary를 한 번
  실행하고 evidence read-back까지 성공해야 Issue #34를 닫는다.
- 작업 중단 시점에는 timeout·window 보정의 로컬 typecheck, GUI contract `17/17`, product
  boundary `225 files`, automation `204/204`, actionlint와 diff check까지 통과했다. 재개 시 이
  checkpoint를 push한 acceptance SHA로 제품 artifact `ceb8b3ba7283152ae37d6c5de5e9317b54ee5499`
  / native run `32347468978`을 재사용한 GUI workflow만 실행한다.
- 재개 run `32562596576`은 exact handoff부터 evidence upload까지 수행하고 기존 120초
  Mocha 조기 종료를 제거했지만 document suite에서 실패했다. 단일 window 고정으로 Tauri
  plugin focus probe의 약 22초 지연이 사라져 첫 file send가 앱 시작 약 2초에 실행됐고,
  정적 `#file-input`은 존재하지만 upstream `setupFileInput()`의 change listener가 아직
  설치되지 않아 HWP 입력을 놓쳤다. 첫 upload 전에 초기 status
  `HWP 파일을 선택해주세요.`와 `alhangeul-toolbar-ready`가 함께 관측될 때까지 기다려
  앱 event loop가 전체 초기화 뒤 제어를 반환했음을 확인한다.
- 첫 readiness run `32563034022`은 두 화면 모두 초기 status가 보이는 screenshot을
  남겼지만 WebDriver `getElementText`는 120초 동안 빈 문자열을 반환했다. responsive·visibility
  판정이 섞이는 요소 API 대신 page context에서 `#sb-message.textContent`와 root class를 함께
  읽는다. upstream initialize는 status 설정부터 `setupFileInput()`까지 `await` 없이 같은
  실행 구간이므로 외부 WebDriver command가 해당 text를 관측한 시점에는 listener 설치도
  완료돼 있다.
- readiness 보정 SHA `ca88fbb`의 run `32563490588`은 exact handoff, dependency·driver·DEB,
  CUPS와 environment evidence를 모두 통과해 GUI acceptance에 진입했으나 작업지시자의 안전
  중단 요청으로 취소했다. 이 run은 성공·실패 판정에 사용하지 않는다.
- 2026-08-23 재개 시 남은 경로를 실행 전에 통합 감사했다. WebKitGTK 요소 visibility와
  결합된 status `getText()`를 document·native 전체에서 제거하고 page context `textContent`로
  단일화한다. 각 spec의 최초 readiness는 scenario evidence 경계 안에서 한 번만 수행한다.
  native open도 headless 로컬 글꼴 선택을 공유하고, drag-in은 upstream 보안 기본값인
  `로컬 파일 열기 확인`에서 정확한 대상 basename과 `열기` 버튼을 검증한 뒤 진행한다.
  Save As·현재 저장·직접 PDF·GTK/CUPS system print의 semantic dialog, 디스크 갱신, 6쪽 A4
  text/render와 editor state 복원 계약은 그대로 유지한다.

### 검증

```bash
node --test tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

pre-PR branch GUI:

```bash
git push origin local/task34:publish/task34
gh workflow run alhangeul-desktop.yml --ref publish/task34 \
  -f build_ref=<branch-exact-sha> -f run_tests=true
gh workflow run alhangeul-linux-gui.yml --ref publish/task34 \
  -f build_ref=ceb8b3ba7283152ae37d6c5de5e9317b54ee5499 \
  -f native_run_id=32347468978
```

### 커밋

```text
Task #34 [Stage 5.9]: file upload protocol과 acceptance SHA 보정
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- 현재 macOS host에서 Linux native GUI 성공을 주장하지 않는다. native 결과는 post-merge close gate의 GitHub-hosted x64 run으로만 확정한다.
- Action version과 external driver/API 계약은 구현 시 official upstream release/documentation으로 재확인하고 신규 Action reference는 full commit SHA로 고정한다.
- 계획 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.

## 커밋

- 단계 커밋은 단계 산출물과 `mydocs/working/task_m010_34_stage{N}.md`를 함께 묶는다.
- 커밋 메시지는 위 Stage별 메시지를 사용한다.
- Stage 5 task PR은 Issue 자동 close 문구를 사용하지 않는다.

## 단계 의존성

- Stage 2는 Stage 1의 handoff schema와 production binary 외부 driver 경계를 계승한다.
- Stage 3은 Stage 2의 공통 fixture·selector·evidence schema 확정 후 Linux native adapter만 추가한다.
- Stage 4는 Stage 1~3 helper를 orchestration하며 workflow YAML 안에 같은 판정을 복제하지 않는다.
- Stage 5는 Stage 4 보고 승인 후 진행하고, actual native canary는 task PR merge 뒤 close gate에서 실행한다.
- Stage 5.1은 PR 리뷰 보정을 merge 전에 완료하되 actual selector 측정과 hosted canary는 Stage 5의 post-merge close gate를 유지한다.
- Stage 5.2는 첫 merged exact-SHA native run의 Windows 계약 실패를 보정하고, 새 보정 PR merge 뒤 native build부터 close gate를 반복한다.
- Stage 5.3은 PR #38 merge 전에 Linux runtime path 소유권을 API 단위로 고정한다. 이 commit을 push한 exact SHA의 Windows native gate가 성공해야 PR merge와 Linux GUI handoff로 진행한다.
- Stage 5.4는 PR #38 merge exact-SHA Linux GUI canary가 제품 실행 전에 발견한 CUPS-PDF 주석 directive 차이를 보정한다. 보정 PR merge 뒤 새 exact SHA에서 native build와 Linux GUI close gate를 다시 실행한다.
- Stage 5.5는 PR #39 리뷰에서 확인한 진단 fatal gate와 정규화 부작용을 같은 CUPS-PDF 사전 설정 범위 안에서 제거한다. 보정 head 검증 뒤 PR을 merge하고 Stage 5.4의 post-merge close gate를 반복한다.
- Stage 5.6은 PR #39 merge exact-SHA canary에서 확인한 CUPS queue option 직렬화 가정을 제거한다. 단일 A4 기본값과 `lpoptions -l` 선택값 계약을 보정한 뒤 새 merge exact SHA에서 close gate를 반복한다.
- Stage 5.7은 PR #40 merge exact-SHA canary에서 Stage 5.6 성공 뒤 드러난 미지원 `tauri-driver --version` 환경 증거 호출을 제거한다. exact install input을 기록한 뒤 새 merge exact SHA에서 close gate를 반복한다.
- Stage 5.8은 PR #41 merge exact-SHA canary에서 Stage 5.7 성공 뒤 드러난 미지원 `WebKitWebDriver --version` 환경 증거 호출을 제거한다. binary 경로와 패키지 버전을 분리 기록한 뒤 새 merge exact SHA에서 close gate를 반복한다.
- Stage 5.9는 PR #42 merge exact-SHA canary에서 Stage 5.8 성공 뒤 드러난 미지원 `cupsd -v` 환경 증거 호출을 제거한다. branch GUI에서 드러난 hidden file input 업로드는 `setValue`의 선행 clear를 피하고 직접 send keys를 사용하는 protocol로 보정한다. pre-PR 반복은 immutable acceptance workflow SHA와 제품 artifact SHA를 분리 기록해 성공한 제품 build를 재사용하되, PR merge 뒤에는 둘이 같은 merge exact SHA인 close gate를 한 번 반복한다.
- #35는 Issue #34 live close gate 통과 뒤 시작한다. #24는 #35까지 merge된 다음 최신 `devel` exact SHA에서 재개한다.

## 위험과 대응

- **new workflow pre-merge dispatch 불가**: PR 전 미실행을 숨기지 않고 `Refs #34`와 지연 close를 사용해 merge 후 live canary를 필수화한다.
- **production binary WebDriver 연결 실패**: embedded plugin을 자동 도입하지 않는다. 외부 연결 실패 증거를 기록하고 계획 변경 승인을 요청한다.
- **GTK 접근성 selector drift**: semantic role/name과 readiness를 우선하고 tree dump·screenshot을 실패 증거로 남긴다. 좌표 입력은 제한된 drag-in fallback으로만 격리한다.
- **artifact 오결속**: exact SHA, run identity, artifact ID/digest, inventory/checksum을 단계적으로 확인하고 불일치 시 설치 전 실패한다.
- **PDF/glyph 오판정**: page/text/blank heuristic과 screenshot/render evidence를 함께 사용하고 최초 canary는 사람이 read-back한다.
- **runner 시간·disk**: manual trigger, concurrency cancellation, timeout과 최소 artifact를 사용한다. larger runner나 유료 Codespaces로 우회하지 않는다.

## 승인 요청 사항

- 5개 Stage의 산출물·검증·커밋 경계
- production DEB + external `tauri-driver`, 공통 WebDriver + Linux AT-SPI adapter 구조
- 새 workflow의 GitHub 제약 때문에 PR은 `Refs #34`로 게시하고 merge 후 actual native canary까지 Issue를 닫지 않는 지연 close 절차
- 현재 artifact가 runner disk/time 기준을 넘을 때만 native build workflow의 최소 handoff artifact를 추가하고, 그 외에는 기존 inventory를 그대로 재사용하는 조건부 범위
- Stage 1은 handoff verifier와 외부 driver probe 계약부터 시작하며, 완료보고 승인 전 Stage 2로 넘어가지 않는 순서
