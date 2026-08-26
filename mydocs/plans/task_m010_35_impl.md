# Task #35 구현계획서 — Windows GUI E2E exact-SHA acceptance 자동화

수행계획서: [`task_m010_35.md`](task_m010_35.md)
GitHub Issue: [#35](https://github.com/postmelee/alhangeul-tauri/issues/35)
마일스톤: M010

새 `.github/workflows/alhangeul-windows-gui.yml`은 default branch에 파일이 존재하기 전에는 직접 `workflow_dispatch`할 수 없다. merge 뒤 처음 실행하면서 구조적 결함을 발견하는 일을 줄이기 위해 Stage 1~3에서는 이미 default branch에 존재하는 `.github/workflows/alhangeul-desktop.yml`의 task branch 버전에 `run_windows_gui_probe` opt-in job을 잠정 연결한다. 각 Stage의 exact commit을 `publish/task35`에 push하고 해당 workflow를 `--ref publish/task35`로 실행해 실제 `windows-2025` 결과를 먼저 측정한다. PR은 최종 보고 전 만들지 않는다.

원격 run은 검증할 소스가 먼저 commit되어야 하므로 단계 소스·보고서 commit 뒤 live evidence를 `task_m010_35_stage{N}.1.md` 하위 단계 문서와 `[Stage {N}.1]` commit으로 기록한다. 실패하면 다음 Stage로 넘어가지 않고 같은 Stage에서 원인을 보정한 새 exact SHA를 다시 실행한다. installer, WebDriver 또는 UIA 경계가 수행계획과 달라져야 하면 우회하지 않고 계획 변경 승인을 요청한다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Windows production driver와 branch probe 계약 | Windows WDIO config·WinApp CLI wrapper·installer lifecycle·opt-in probe | 중립 계약 test + MSI/NSIS minimal live probe |
| 2 | Windows 문서 UX와 native file UI 수용 | 공통 WebView spec 계승·Open/Save As·drag-in adapter | HWP/HWPX save/reopen·dialog·drag live acceptance |
| 3 | Windows system print와 PDF 수용 | print dialog adapter·PDF analyzer·modal lifecycle | direct/Print to PDF 저장·취소·반복·text/page 판정 |
| 4 | exact-SHA Windows GUI workflow와 운영 계약 | 별도 manual workflow·workflow contract·release 문서 | 전체 중립 gate·Action pin·activation checklist |
| 5 | task PR과 post-merge MSI/NSIS canary | 최종 보고·PR·close-gate handoff | PR 전 전체 gate + merge 후 evidence read-back |

각 본 Stage가 끝나면 `task-stage-report`로 `mydocs/working/task_m010_35_stage{N}.md`를 작성하고 해당 Stage 변경과 묶어 commit한다. native branch run이 필요한 Stage 1~3은 그 commit을 원격 probe로 검증하고 evidence-only 하위 Stage를 추가한 뒤 다음 Stage 승인을 요청한다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| Windows GUI release gate | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | Stage 4에서 자동 gate·evidence 판정·잔여 Windows 10/11 gate 갱신 |
| 개발·재현 진입점 | 필요할 때만 기존 `docs/` | `docs/DEVELOPMENT.md` | OK | Stage 4에서 재현 명령이 실제로 필요한 경우만 최소 보정 |
| 구현·단계·최종 보고 | `mydocs/` 역할별 폴더 | `plans/`, `working/`, `report/` | OK | Hyper-Waterfall 승인·검증 증적 |

새 공식 문서 루트나 `mydocs/manual` 문서는 만들지 않는다. WinApp CLI selector 조사 결과는 특정 runner 측정이므로 단계 보고서에 남기고 공식 운영 문서에는 반복 가능한 실행·판정 절차만 기록한다.

## 공통 구현 계약

- 제품 Rust/TypeScript runtime, Tauri capability와 bundled Studio에는 WebDriver plugin, debug port나 automation 전용 조건 분기를 추가하지 않는다. 설치된 production `Alhangeul.exe`를 외부 `tauri-driver`로 구동한다.
- Issue #34의 `verify-workflow-artifact.mjs`, artifact inventory verifier, shared WDIO config, fixture, document UX helper와 evidence manifest를 import해 재사용한다. Windows adapter가 Linux AT-SPI/CUPS 모듈을 import하거나 공통 계층에 WinApp CLI 명령을 넣지 않는다.
- MSI와 NSIS는 matrix의 서로 다른 fresh runner에서 설치·실행·uninstall한다. GUI installer helper는 package 선택·install path·process ID·targeted cleanup만 소유하고 기존 `windows-installer-smoke.ps1`의 registry/association/shortcut 검사를 복제하지 않는다.
- Microsoft `setup-WinAppCli` Action은 full immutable commit SHA로 고정하고 `version` 입력도 release tag로 명시한다. `latest`, nightly artifact, winget와 global npm install을 사용하지 않는다. `WINAPP_CLI_UPDATE_CHECK=0`과 실제 `winapp --version`을 evidence에 기록한다.
- WinApp CLI 실행은 shell 문자열 조합 없이 argv 배열로 호출한다. `--json` 결과는 exit code, JSON schema와 target PID/HWND를 모두 검증하고 ANSI/stderr·timeout·process kill을 bounded 처리한다.
- native UI는 app PID로 window를 발견하고 dialog HWND로 다시 고정한다. AutomationId와 UIA control pattern을 우선하며 표시 언어 text와 runtime slug는 보조 discovery로만 사용한다.
- OS drag-in만 `winapp ui drag` input-injection 예외다. Explorer source item과 Alhangeul target bounds, interactive desktop readiness를 확인한 한 번의 bounded gesture만 허용하고 좌표 상수·blind retry·secure desktop 조작을 금지한다.
- file/print command는 `WebView trigger → native dialog readiness → UIA completion/cancel → WebView postcondition` coordinator로 직렬화한다. trigger promise와 native modal이 교착하면 양쪽 screenshot/tree/log를 남기고 timeout으로 실패한다.
- 직접 PDF와 Microsoft Print to PDF는 repository fixture에서만 생성한다. page count·A4 size·페이지별 text와 기대 한글 표제, toolbar/editor chrome 부재를 자동 판정한다. Windows에 preinstalled되지 않은 PDF 도구를 latest package manager로 설치하지 않는다. pure-JS parser가 필요하면 exact pnpm devDependency와 lockfile integrity를 사용한다.
- evidence는 app/window 범위의 screenshot·UIA tree, 생성 문서/PDF, bounded log, tool/runtime/image version, scenario JSON과 SHA-256을 포함한다. secret, 개인 문서, unrelated desktop tree와 사용자 경로는 수집하지 않거나 정규화한다.
- workflow는 orchestration만 소유한다. install, UIA, PDF와 manifest 판정을 긴 inline PowerShell로 중복하지 않는다. script/module은 파일 300 LOC, 함수 50 LOC, 매개변수 5개 권장 상한을 지킨다.
- `connectionRetryCount`, `specFileRetries`와 scenario retry는 0으로 유지한다. `continue-on-error`는 evidence 수집 뒤 final gate가 개별 outcome을 모두 재검사하는 구조에서만 사용한다.

## 원격 branch probe와 evidence 규칙

- Stage 1에서 `.github/workflows/alhangeul-desktop.yml`에 optional boolean `run_windows_gui_probe`를 추가한다. 기본값은 `false`이고 기존 native candidate run의 동작·check 이름을 바꾸지 않는다.
- opt-in job은 같은 run의 verified Windows x64 artifact를 소비하되 inventory와 SHA-256을 다시 검사한다. MSI·NSIS matrix는 installer별 fresh runner를 사용하고 `fail-fast: false`로 양쪽 진단을 보존한다.
- task branch를 `local/task35:publish/task35`로 push한 뒤 exact 40자리 Stage SHA를 `build_ref`로 전달하고 `--ref publish/task35`, `run_windows_gui_probe=true`로 dispatch한다. workflow `head_sha`, checkout SHA와 input build SHA가 모두 Stage SHA인지 확인한다.
- 각 job은 성공·실패 모두 installer별 evidence artifact를 올린다. evidence upload 누락이나 final-gate outcome 불일치는 실패다.
- Stage 4에서 별도 workflow가 완성되면 기존 desktop workflow의 opt-in input/job을 제거하고 contract test로 제거 여부를 고정한다. 기존 workflow에 영구 유지할 필요가 새로 발견되면 수행계획 변경 승인을 먼저 받는다.

## Stage 1 — Windows production driver와 branch probe 계약

### 산출물

신규:

- `tests/gui/wdio.windows.conf.ts`
- `tests/gui/windows/winapp-cli.mjs`
- `tests/gui/windows/winapp-cli.test.mjs`
- `tests/gui/windows/probe.mjs`
- `scripts/windows-gui-installer.ps1`
- `tests/windows-gui-installer.test.mjs`
- `tests/windows-gui-probe.test.mjs`
- `mydocs/working/task_m010_35_stage1.md`

수정:

- `package.json`
- `tests/gui-contracts.test.mjs`
- `.github/workflows/alhangeul-desktop.yml` — task branch opt-in probe hook
- `tests/actions-workflows.test.mjs` — 기존 workflow 기본 동작과 opt-in 계약

### 변경 내용

- Windows WDIO config는 shared inputs, production app path와 external `tauri-driver` provider만 결합한다. `autoInstallTauriDriver: false`, retry 0, 단일 WebView window와 frontend/backend plugin 미사용을 source contract로 고정한다.
- WinApp CLI wrapper는 executable path, app PID/HWND, argv와 timeout을 검증하고 JSON stdout만 구조화한다. `status`, `list-windows`, `inspect`, `wait-for`, `screenshot` 최소 명령과 실패 분류를 제공한다.
- installer helper는 verified artifact root와 `msi|nsis` kind를 받아 정확히 한 installer를 선택한다. MSI silent install과 NSIS `/S`, 예상 install path의 `Alhangeul.exe`, process 제한 실행, installer별 uninstall과 residue cleanup을 JSON summary로 남긴다.
- probe는 app title/root DOM을 external driver로 읽고 WinApp CLI가 같은 app process/window를 찾는지 확인한다. Open/print를 조작하지 않고 UIA tree와 screenshot의 target scope만 확정한다.
- desktop workflow opt-in job은 Windows artifact download·inventory 재검산, pinned setup-WinAppCli와 exact tauri-driver 설치, installer matrix probe, environment/evidence upload와 final outcome gate를 제공한다.
- Stage source/report commit 후 `publish/task35`를 갱신하고 MSI·NSIS minimal live probe를 실행한다. resolved WebView2, EdgeDriver, tauri-driver, WinApp CLI, OS image version과 UIA tree를 `stage1.1`에 기록한다.

### 검증

```bash
pnpm run typecheck:gui
node --test tests/gui/windows/winapp-cli.test.mjs tests/windows-gui-installer.test.mjs tests/windows-gui-probe.test.mjs
pnpm run test:gui:contracts
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

원격 검증:

- `windows-2025` MSI·NSIS probe job 모두 성공
- Stage SHA, workflow checkout, artifact inventory·hash 일치
- production WebDriver root/title와 WinApp CLI PID/HWND/UIA tree 일치
- installer별 uninstall 후 targeted residue 없음

### 커밋

```text
Task #35 Stage 1: Windows GUI branch probe 계약 추가
Task #35 [Stage 1.1]: Windows MSI·NSIS probe 증거 확정
```

## Stage 2 — Windows 문서 UX와 native file UI 수용

### 산출물

신규:

- `tests/gui/specs/windows-native.e2e.ts`
- `tests/gui/windows/native-ui/file-dialog.mjs`
- `tests/gui/windows/native-ui/file-dialog.test.mjs`
- `tests/gui/windows/native-ui/drag-drop.mjs`
- `tests/gui/windows/native-ui/drag-drop.test.mjs`
- `mydocs/working/task_m010_35_stage2.md`

수정:

- `tests/gui/wdio.windows.conf.ts`
- `tests/gui/windows/winapp-cli.mjs`
- 필요한 플랫폼 중립 hook만 `tests/gui/support/document-ux.ts`
- `package.json`
- `.github/workflows/alhangeul-desktop.yml`의 opt-in probe scenario

### 변경 내용

- Issue #34의 `document-ux.e2e.ts`를 Windows config에 그대로 포함해 HWP/HWPX file input open, 최초 중앙 정렬, toolbar·`#file-input` 숨김, 한글 UI와 page 상태를 검증한다.
- file dialog adapter는 trigger 뒤 owner app의 새 dialog HWND를 발견하고 Open/Save As의 AutomationId·control type을 inspect한다. path 입력은 ValuePattern/set-value, 확인·취소는 InvokePattern/invoke, 종료는 wait-for gone과 WebView postcondition으로 확인한다.
- HWP/HWPX 현재 형식 저장, 다른 이름 저장과 재열기는 생성 파일 size·mtime·extension과 문서 title/page/status를 검증한다. overwrite prompt가 나타나면 별도 HWND와 명시적 selector로 처리하고 예상하지 않은 dialog는 실패한다.
- drag-in은 repository fixture를 Explorer에 표시하고 source item과 app client area를 semantic discovery한 뒤 `winapp ui drag` 한 번으로 실행한다. document load postcondition과 modal 처리, source Explorer cleanup을 확인한다.
- WinApp CLI의 English/Korean text fallback은 실제 Stage 1 UIA tree에서 확인된 최소 목록만 사용하고 AutomationId가 있는 요소는 text selector로 대체하지 않는다.
- Stage 2 exact SHA의 opt-in probe를 다시 실행해 두 installer에서 WebView 공통 spec과 file/drag native scenario를 모두 수용한다.

### 검증

```bash
pnpm run typecheck:gui
node --test tests/gui/windows/*.test.mjs tests/gui/windows/native-ui/*.test.mjs
pnpm run test:gui:contracts
pnpm run test:automation
pnpm run test:studio
pnpm run build:studio
git diff --check
```

원격 검증:

- MSI·NSIS에서 HWP/HWPX open·save·Save As·reopen 성공
- 중앙 정렬, toolbar/file input 숨김, 한글 UI와 status/page 계약 통과
- Open/Save As 저장·취소·반복 뒤 modal 없음과 editor focus/state 복원
- drag-in 1회 성공, blind retry·fixed coordinate 없음

### 커밋

```text
Task #35 Stage 2: Windows 문서와 native file UI 수용 추가
Task #35 [Stage 2.1]: Windows file·drag exact-SHA 증거 확정
```

## Stage 3 — Windows system print와 PDF 수용

### 산출물

신규:

- `tests/gui/windows/native-ui/print-dialog.mjs`
- `tests/gui/windows/native-ui/print-dialog.test.mjs`
- `tests/gui/windows/pdf-analysis.mjs`
- `tests/gui/windows/pdf-analysis.test.mjs`
- 필요 시 exact pure-JS PDF test dependency
- `mydocs/working/task_m010_35_stage3.md`

수정:

- `tests/gui/specs/windows-native.e2e.ts`
- `tests/gui/windows/winapp-cli.mjs`
- `package.json`
- pure-JS PDF dependency가 추가될 때만 `pnpm-lock.yaml`
- `.github/workflows/alhangeul-desktop.yml`의 opt-in probe scenario

### 변경 내용

- 직접 PDF는 native Save dialog를 통해 fixture별 임시 경로에 저장하고 파일 readiness, WebView 완료 status와 editor state를 확인한다.
- system print는 app command 뒤 print dialog HWND를 고정하고 `Microsoft Print to PDF`만 선택한다. physical printer 이름은 allowlist를 통과하지 못하면 조작 전에 실패한다.
- Print to PDF 저장 dialog에서 fixture basename 기반 기본 이름과 `.pdf` extension을 확인하고 지정 경로 저장·취소·반복을 검증한다. 저장 완료 전 성공 status를 주장하지 않고 dialog 종료·파일 readiness·editor 복원을 각각 판정한다.
- PDF analyzer는 page count, A4 media size, 페이지별 text count와 `사업수행계획서` 한글 표제를 읽고 `파일`, `편집`, `도구` 같은 editor chrome-only 출력이 아님을 확인한다. parser dependency는 exact version과 lock integrity를 사용하며 GUI build에 bundle하지 않는다.
- native print command가 WebDriver command queue를 block하면 print 시나리오만 production app + WinApp CLI 독립 phase로 분리한다. 두 phase의 build/app identity와 evidence schema는 같게 유지하고 하나라도 실패하면 installer job을 실패시킨다.
- Stage 3 exact SHA의 MSI·NSIS branch probe에서 direct PDF와 Print to PDF 결과를 생성하고 PDF/evidence hash를 read-back한다.

### 검증

```bash
pnpm run typecheck:gui
node --test tests/gui/windows/*.test.mjs tests/gui/windows/native-ui/*.test.mjs
pnpm run test:gui:contracts
pnpm run test:automation
pnpm run test:studio
pnpm run build:studio
git diff --check
```

원격 검증:

- MSI·NSIS에서 direct PDF와 Microsoft Print to PDF 저장 성공
- print/save dialog 취소·반복, modal lifecycle과 editor state 복원 성공
- 기대 page count·A4·한글 text 검색 가능성과 editor chrome 비출력 판정 통과
- 실패·성공 evidence의 screenshot, UIA tree, PDF, log와 manifest hash 일치

### 커밋

```text
Task #35 Stage 3: Windows 출력과 PDF 수용 추가
Task #35 [Stage 3.1]: Windows print·PDF exact-SHA 증거 확정
```

## Stage 4 — exact-SHA Windows GUI workflow와 운영 계약

### 산출물

신규:

- `.github/workflows/alhangeul-windows-gui.yml`
- `tests/windows-gui-workflow.test.mjs`
- `mydocs/working/task_m010_35_stage4.md`

수정:

- `.github/workflows/alhangeul-desktop.yml` — 잠정 probe input/job 제거
- `tests/actions-workflows.test.mjs`
- `package.json`
- `docs/operations/DESKTOP_RELEASE.md`
- 필요한 경우에만 `docs/DEVELOPMENT.md`

### 변경 내용

- 별도 workflow는 `workflow_dispatch`의 40자리 `build_ref`와 numeric `native_run_id`를 필수 입력으로 받고 `actions: read`, `contents: read` 최소 permission을 사용한다.
- acceptance source는 `github.workflow_sha`를 checkout하고 Stage 1 handoff helper로 native run의 repository, workflow, event, success, `head_sha`와 exact Windows artifact ID·digest를 검증한다. metadata 확인 전 download/install/app 실행을 금지한다.
- verified artifact를 ID로 다운로드하고 inventory/hash를 다시 검사한다. installer matrix의 각 fresh `windows-2025` runner에서 Stage 1~3 전체 acceptance를 수행한다.
- pinned setup-WinAppCli commit+CLI version, exact tauri-driver, Node/pnpm과 resolved WebView2/EdgeDriver/runner image version을 기록한다. 이번 task가 추가하는 다른 Action도 immutable commit SHA와 version comment를 사용한다.
- installer/scenario timeout, concurrency와 `cancel-in-progress: true`, retry 0을 고정한다. scenario 실패와 evidence upload outcome을 final gate에서 모두 재검사한다.
- 성공·실패 모두 installer별 evidence artifact를 제한된 retention으로 올리고 final summary에 acceptance SHA, build SHA, native run/artifact, installer, scenario와 file hash를 기록한다.
- workflow contract test는 trigger/input/permission/runner, fail-closed 순서, no latest/paid runner, Action pins, MSI·NSIS cardinality, no physical printer, evidence/final gate와 잠정 probe hook 제거를 고정한다.
- release 문서는 native build → Windows GUI dispatch → installer별 evidence read-back 순서와 Windows 10/11 잔여 수동 gate 조건을 기록한다. 공개 릴리즈 및 인쇄·글꼴·WebView upstream 변경은 실기기 gate를 유지하고 일반 후보는 CI로 수용한다.

### 검증

```bash
node --test tests/windows-gui-workflow.test.mjs tests/actions-workflows.test.mjs
pnpm run typecheck:gui
pnpm run test:gui:contracts
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

새 workflow의 live dispatch는 default branch merge 후 Stage 5 close gate에서 수행한다. Stage 1~3 branch probe가 production driver, selector와 시나리오를 이미 통과했는지 activation checklist로 대조한다.

### 커밋

```text
Task #35 Stage 4: exact-SHA Windows GUI workflow 추가
```

## Stage 5 — task PR과 post-merge MSI·NSIS canary

### 산출물

신규:

- `mydocs/working/task_m010_35_stage5.md`
- `mydocs/report/task_m010_35_report.md`

수정:

- 실제 완료일의 `mydocs/orders/{yyyymmdd}.md`
- Stage 1~4 검증에서 발견한 문서·test 범위 내 보정

### 변경 내용

- clean checkout 기준 focused·전체 중립 gate를 재실행하고 changed path, workflow permission, setup/other Action SHA, tool version과 잠정 probe 제거를 독립 확인한다.
- Stage 1~3 branch live run의 exact SHA, MSI·NSIS outcome, artifact ID/digest와 evidence hash를 최종 보고서에 결속한다. 아직 실행할 수 없는 새 workflow post-merge canary는 검증 한계와 close gate로 분리한다.
- `task-final-report`로 `publish/task35`를 갱신하고 `devel` 대상 Open PR을 `Refs #35`로 게시한다. merge만으로 Issue를 자동 close하지 않는다.
- merge 후 default branch exact SHA로 native desktop workflow를 실행하거나 같은 SHA의 성공 native run을 선택하고, 그 build SHA/run ID를 새 Windows GUI workflow에 전달한다.
- live run의 workflow/event/head/input SHA, native run, artifact ID/digest, MSI·NSIS install hash와 scenario conclusion을 독립 재검산한다.
- installer별 evidence를 다운로드해 inventory/SHA-256, screenshot·UIA tree, HWP/HWPX roundtrip, direct/Print to PDF page·text와 cleanup summary를 read-back한다.
- canary가 실패하면 Issue #35를 열어 둔 채 correction PR과 새 exact SHA로 같은 gate를 다시 수행한다. 성공한 경우에만 Issue #35를 close하고 Issue #24 재개용 SHA/run IDs를 기록한다.

### PR 전 검증

```bash
pnpm install --frozen-lockfile
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
git status --short
```

### merge 후 close gate

- default branch의 Windows GUI workflow ID와 manual dispatch 가능 상태 확인
- native build `head_sha == build_ref`, Windows artifact ID/digest와 inventory 확인
- Windows GUI workflow dispatch의 acceptance/build/native run identity 확인
- MSI·NSIS job 및 final gate success 확인
- evidence inventory/SHA-256, screenshot/UIA tree, roundtrip files와 PDF read-back
- Issue #35 close 및 Issue #24 재개 handoff 기록

### 커밋

```text
Task #35 Stage 5 + 최종 보고서: Windows GUI acceptance handoff 확정
```

## 검증

- 각 Stage의 중립 검증과 필요한 exact-SHA branch run은 단계 보고 승인 전에 완료한다. 실패한 검증은 단계 완료로 처리하지 않는다.
- Stage 1~3 live evidence는 검증 대상 source commit 뒤의 하위 Stage commit에 기록하되 결과를 만든 exact SHA를 바꾸지 않는다.
- branch probe와 post-merge workflow 모두 workflow `head_sha`, checkout SHA, build SHA, native run과 artifact metadata를 구조화 증거로 남긴다.
- 계획 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.
- 문서 위치가 수행계획서 판단과 달라지면 구현 전에 수행계획서 또는 구현계획서를 갱신하고 승인받는다.

## 커밋

- 단계 source와 `mydocs/working/task_m010_35_stage{N}.md`는 같은 본 Stage commit에 묶는다.
- 이미 commit된 exact SHA의 remote run 증거는 `Task #35 [Stage {N.1}]: ... 증거 확정` 형식의 evidence-only commit으로 추가한다.
- 원격 probe 실패로 source correction이 필요하면 같은 Stage 번호의 새 하위 Stage source/report commit을 만든 뒤 새 exact SHA를 실행하고 다음 evidence commit에서 확정한다.

## 단계 의존성

- Stage 2는 Stage 1의 MSI·NSIS production WebDriver/WinApp CLI minimal probe가 통과한 뒤 시작한다.
- Stage 3은 Stage 2의 HWP/HWPX file dialog·save/reopen·drag-in live acceptance 뒤 시작한다.
- Stage 4는 Stage 3의 direct/system print·PDF live acceptance와 evidence schema가 확정된 뒤 시작한다.
- Stage 5는 Stage 4의 workflow·운영 계약과 전체 중립 gate 승인 뒤 시작한다.

## 위험과 대응

- **Public Preview tool drift**: setup Action commit과 CLI release version을 이중 고정하고 JSON schema contract와 actual version evidence를 둔다. upstream CLI 변경은 별도 dependency update로만 수용한다.
- **branch workflow 오염**: probe는 default false인 opt-in job으로 제한하고 Stage 4에서 제거한다. 기존 native job·installer smoke의 check 이름과 기본 실행 결과를 contract test로 보존한다.
- **commit 뒤 remote evidence**: source SHA를 amend하지 않고 evidence-only 하위 Stage로 기록해 exact identity와 Hyper-Waterfall 보고를 함께 보존한다.
- **interactive desktop 부재**: UIA pattern 경로를 먼저 사용하고 drag readiness를 별도로 probe한다. drag 또는 native print가 secure desktop을 요구하면 injection/UAC 우회 없이 계획 변경을 요청한다.
- **localization과 runtime selector**: AutomationId/control pattern/HWND 우선, 실제 tree 기반 최소 text fallback, 예상 밖 dialog fail-closed와 tree/screenshot evidence를 사용한다.
- **print 교착**: WebDriver trigger와 UIA completion coordinator를 test하고 필요 시 print만 production native phase로 격리한다. retry로 session loss를 숨기지 않는다.
- **PDF analyzer 공급망**: preinstalled되지 않은 native tool latest install을 금지한다. pure-JS dependency가 필요하면 exact pnpm pin과 lockfile만 허용하고 production bundle 경계를 검사한다.
- **runner 비용·시간**: manual dispatch, installer matrix, bounded timeout·retention과 concurrency cancellation을 사용하고 larger/self-hosted/유료 fallback을 두지 않는다.

## 승인 요청 사항

- 5개 본 Stage와 Stage 1~3 exact-SHA branch probe evidence를 하위 Stage commit으로 기록하는 절차
- 기존 desktop workflow의 task branch 버전에 default-false opt-in probe를 잠정 추가하고 Stage 4에서 제거하는 merge 전 실측 방식
- Microsoft 권장 `setup-WinAppCli` Action의 immutable commit SHA와 explicit CLI release version 이중 고정으로 수행계획의 devDependency 판단을 보정하는 사항
- MSI·NSIS fresh runner matrix, #34 공통 계층 재사용, Windows platform adapter 분리와 제품 runtime 무변경 경계
- UIA pattern 우선과 OS drag-in 단일 injection 예외, production 연결·drag·print가 성립하지 않을 때의 계획 변경 중단 조건
- Stage별 산출물·검증 명령·커밋 메시지와 post-merge canary 뒤 Issue close 절차
