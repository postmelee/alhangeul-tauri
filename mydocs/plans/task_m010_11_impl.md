# Task #11 구현계획서 — Windows x64 installer smoke 자동화와 MSI 설치 실패 진단

수행계획서: [`task_m010_11.md`](task_m010_11.md)
GitHub Issue: [#11](https://github.com/postmelee/alhangeul-tauri/issues/11)
마일스톤: M010

2026-07-31 작업지시자가 수행계획서의 범위, Task #9 통합 순서와 문서 위치를 승인했다. 이 구현계획서는 원인 확인 전 packaging 설정을 바꾸지 않도록 자동화 구현, 첫 진단 run, 증거 기반 보정과 최종 성공 run을 분리해 잠정 5단계를 6단계로 구체화한다.

2026-07-31 첫 Stage 4 canary run `30600969373`에서 exact-SHA build와 Windows artifact는 성공했지만 checkout이 선행 생성한 diagnostic 디렉터리를 정리해 installer smoke가 실행 전에 중단됐다. 작업지시자는 같은 스레드에서 진행을 승인했으며, Stage 4 완료 조건을 회복하기 위한 workflow 순서와 회귀 test의 최소 보정 및 새 exact-SHA 재실행을 Stage 4 범위에 포함한다. Packaging 설정과 installer 수용 기준은 변경하지 않는다.

Stage 4.1 보정 commit의 두 번째 canary run `30602141411`은 checkout·diagnostic 준비·exact-SHA 검증·artifact download까지 통과했지만 Windows PowerShell 5.1이 BOM 없는 UTF-8 script의 한국어 문자열을 잘못 해석해 parser error로 중단됐다. 작업지시자는 UTF-8 BOM과 byte-level 회귀 test의 최소 보정 및 새 exact-SHA 재실행을 승인했다. Script 동작, packaging 설정과 installer 수용 기준은 변경하지 않는다.

Stage 4.2 보정 commit의 세 번째 canary run `30603734563`은 parser를 통과하고 summary와 sentinel 복원 증적을 생성했지만 StrictMode에서 빈 process 배열의 `.Id` 속성 투영이 fatal error를 일으켜 installer 실행 전에 중단됐다. 작업지시자는 pipeline 기반 process ID 투영과 회귀 test의 최소 보정 및 새 exact-SHA 재실행을 승인했다. Packaging 설정과 installer 수용 기준은 변경하지 않는다.

Stage 4.3 보정 commit의 네 번째 canary run `30604711021`은 installer별 summary와 fixture 검증을 생성했지만 install 경로와 shortcut 배열을 한 배열 식으로 결합해 nested array가 `Test-Path`에 전달됐고, 존재하지 않는 shortcut 후보 네 개를 잔여 상태로 오판했다. 작업지시자는 후보 경로 평탄화와 회귀 test의 최소 보정 및 새 exact-SHA 재실행을 승인했다. Packaging 설정과 installer 수용 기준은 변경하지 않는다.

Stage 4 최종 canary run `30610672455`은 MSI·NSIS silent install과 uninstall을 모두 exit code `0`으로 완료하고 원본 log·summary·cleanup 증적을 보존했다. 실행 파일 `alhangeul-desktop.exe`, MSI advertised extension과 비어 있는 Shortcut table, NSIS legacy association·직접 default 변경을 packaging 결함으로 분류했다. Stage 5는 Cargo binary를 `Alhangeul`로 정렬하고, MSI는 file-owned shortcut과 명시적 canonical handler·`OpenWithProgids`를 사용하며, NSIS는 canonical association name·Start Menu folder·공식 installer hook으로 기존 default의 값과 존재 여부를 보존한다. 별도 packaging source test를 전체 automation에 연결하고 native bundle·installer 수용은 Stage 6에서 판정한다.

Stage 6 첫 exact-SHA run `30612425879`은 Linux x64·arm64 build와 artifact upload를 통과했지만 Windows에서 `Alhangeul.exe` 생성 뒤 WiX `light.exe` validation이 실패했다. Stage 5의 `Path` file key path component 안에 `Advertise="no"` shortcut을 둔 구조가 비-advertised shortcut에는 HKCU registry key path가 필요하다는 ICE43 계약과 충돌한 packaging source 결함이다. 작업지시자는 Stage 6.1에서 shortcut을 같은 executable을 소유하는 advertised file shortcut으로 보정하고 source 계약을 강화한 뒤 새 exact-SHA 전체 workflow를 실행하는 범위를 승인했다. Handler, 기본 연결 불변 조건, smoke 수용 기준과 Task #9 인계 순서는 변경하지 않는다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | installer 상태·판정 계약 확정 | `task_m010_11_stage1.md` | MSI·NSIS별 registry/path/exit/cleanup 관찰점 |
| 2 | PowerShell smoke와 회귀 test 구현 | `windows-installer-smoke.ps1`, test | 정적 계약, `test:automation` |
| 3 | fresh Windows artifact-consumer job 연결 | desktop workflow, workflow test | 권한·exact SHA·진단 upload·실패 전달 |
| 4 | 첫 exact-SHA 진단 canary | Actions run·diagnostic artifact | 재현 결과, log 완전성, 원인 분류 입력 |
| 5 | 증거 기반 원인 판정·보정 | 조건부 WiX/Tauri/script 수정 | 원인별 최소 변경과 플랫폼 중립 회귀 |
| 6 / 6.1 | 최종 exact-SHA 수용 검증, ICE43 보정과 #9 handoff | 성공 run, 운영 문서, Stage 보고 | 전체 workflow·MSI/NSIS smoke·무결성 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| installer 운영 계약 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | Stage 6에서 자동 package smoke와 GUI gate 경계를 반영 |
| 단계 증적 | `mydocs/working/` | `mydocs/working/task_m010_11_stage{1..6}.md` | OK | exact SHA, run, log와 판정을 단계별 보존 |
| 재발 방지 기록 | `mydocs/troubleshootings/` | `mydocs/troubleshootings/task_m010_11_windows_installer.md` | OK | Stage 5에서 원인·해결을 검증한 경우에만 생성 |
| 최종 handoff | `mydocs/report/` | `mydocs/report/task_m010_11_report.md` | OK | Stage 6 승인 뒤 final-report 절차에서 작성 |

`mydocs/manual/`에는 제품·installer 문서를 추가하지 않는다. Windows VDI 원본 보고서는 저장소로 복사하지 않고 SHA-256과 필요한 관찰만 단계 보고서에서 인용한다.

## Stage 1 — installer 상태·판정 계약 확정

### 산출물

신규:

- `mydocs/working/task_m010_11_stage1.md`

제품 source와 workflow는 수정하지 않는다.

### 변경 내용

- Task #9 candidate `6e0adc9`, VDI 보고서와 현재 `main.wxs`·`tauri.conf.json`을 대조한다.
- MSI와 NSIS 각각에 대해 다음 관찰 위치를 표로 확정한다.
  - install/uninstall 성공 exit code와 reboot-required 처리
  - 64/32-bit HKLM·HKCU uninstall registry view
  - 실제 install directory, executable, Start Menu·Desktop shortcut
  - `Alhangeul.hwp`, `Alhangeul.hwpx` ProgID와 `.hwp`·`.hwpx` `OpenWithProgids`
  - 설치 전 기본 ProgID/UserChoice snapshot과 uninstall 뒤 복원·불변 조건
- version은 ProductVersion/FileVersion을 3성분 `0.1.0`으로 정규화한다. 네 번째 성분은 `0`만 허용한다.
- MSI는 `/i /qn /norestart /L*v`, NSIS는 `/S`를 기본 silent 계약으로 두고 생성 bundle에서 실제 지원 여부를 확인한다.
- launch smoke는 executable process 생성 후 제한 시간 생존만 확인하고 동일 process ID만 종료하도록 고정한다.
- clean-state 실패, install 실패, assertion 실패와 uninstall 실패를 서로 다른 결과로 기록한다.
- Task #11을 먼저 merge하고 Task #9이 최신 `devel`에서 새 candidate를 만드는 순서를 다시 확인한다.

### 검증

```bash
git rev-list --left-right --count origin/devel...local/task9
git diff --name-status origin/devel...local/task9
git show 6e0adc9:apps/desktop/src-tauri/windows/main.wxs
shasum -a 256 <Windows-VDI-report-path>
git diff --check
```

### 커밋

```text
Task #11 Stage 1: Windows installer 상태와 판정 계약 확정
```

## Stage 2 — PowerShell smoke와 회귀 test 구현

### 산출물

신규:

- `scripts/windows-installer-smoke.ps1`
- `tests/windows-installer-smoke.test.mjs`
- `mydocs/working/task_m010_11_stage2.md`

수정:

- `package.json`

### 변경 내용

- entry script parameter는 `ArtifactRoot`, `OutputDirectory`, `ExpectedVersion` 세 개로 제한하고 외부 module 없이 Windows PowerShell 5.1/pwsh 공통 문법을 사용한다.
- artifact root에서 MSI와 NSIS를 각각 정확히 하나만 허용한다. 누락·중복·예상 밖 경로는 설치 전에 실패한다.
- 검사 순서는 다음으로 고정한다.
  1. 결과 디렉터리와 외부 fixture 생성·hash 기록
  2. install 전 process·product·handler·기본 연결 snapshot
  3. MSI install → version/registry/shortcut/launch → uninstall → cleanup
  4. MSI 잔여 상태가 없을 때만 NSIS install → 동일 검증 → uninstall → cleanup
  5. fixture hash 재확인, summary JSON 기록, 누적 실패 반환
- `try/finally` 경로에서 가능한 cleanup과 summary 기록을 수행한다. 광범위한 registry 삭제나 이름 기반 전체 process kill은 사용하지 않는다.
- MSI verbose log 원본, `Return value 3` 문맥 요약, installer별 exit/version/registry/path/fixture 결과를 `OutputDirectory`에 둔다.
- 기존 기본 연결과 Alhangeul 소유 handler를 분리하고, wildcard registry 열거에는 `-LiteralPath`를 사용하지 않는다.
- Node test는 parameter, installer cardinality, MSI log option, NSIS silent option, snapshot, hash, bounded launch, targeted cleanup, summary·failure 경로를 source contract로 검사한다.
- 새 test를 `pnpm run test:automation`에 연결한다.
- script는 300 LOC, 함수는 50 LOC·매개변수 5개 이내를 유지한다. 초과가 필요하면 helper script 분리와 계획 변경 승인을 먼저 받는다.

### 검증

```bash
node --test tests/windows-installer-smoke.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

현재 macOS에서는 PowerShell installer를 실행하지 않고 정적 계약만 검증한다.

### 커밋

```text
Task #11 Stage 2: Windows installer smoke script와 회귀 계약 구현
```

## Stage 3 — fresh Windows artifact-consumer job 연결

### 산출물

수정:

- `.github/workflows/alhangeul-desktop.yml`
- `tests/actions-workflows.test.mjs`

신규:

- `mydocs/working/task_m010_11_stage3.md`

### 변경 내용

- 기존 build matrix와 Windows artifact 이름을 유지하고 별도 `windows-2025` smoke job이 업로드된 `alhangeul-desktop-windows-x64` artifact를 내려받게 한다.
- smoke job은 `needs: build`와 `always()` 조건으로 Linux matrix 결과와 무관하게 Windows artifact 소비를 시도한다. Windows artifact가 없으면 명확히 실패한다.
- job은 build와 같은 `inputs.build_ref || github.sha`를 checkout·검증하고 root `package.json`의 version을 script에 전달한다.
- smoke 실행 step은 outcome을 보존하고, 후속 diagnostic upload는 `always()`로 실행한다. 마지막 gate step이 smoke 실패를 workflow 실패로 다시 전달한다.
- diagnostic artifact 이름은 `alhangeul-desktop-windows-x64-installer-smoke`, 보존 기간은 build artifact와 같은 14일로 고정한다.
- workflow의 `workflow_dispatch`, `contents: read`, exact-ref, Windows/Linux matrix와 비배포 계약을 유지한다. release action, secret, signing과 write permission을 추가하지 않는다.
- workflow test는 fresh runner, `needs`, artifact download, exact checkout, PowerShell invocation, always-upload, final failure gate와 기존 build 순서를 검사한다.

### 검증

```bash
node --test tests/actions-workflows.test.mjs tests/windows-installer-smoke.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

지원 범위 밖 현재 macOS에서 Rust desktop·Tauri build는 실행하지 않는다.

### 커밋

```text
Task #11 Stage 3: fresh Windows installer smoke workflow 연결
```

## Stage 4 — 첫 exact-SHA 진단 canary

### 산출물

repository 외부 상태:

- `publish/task11` exact candidate ref
- `Alhangeul Desktop Artifact Build` 첫 진단 run과 필요 시 canary 선행 결함을 보정한 재실행
- Windows build artifact와 installer-smoke diagnostic artifact

신규:

- `mydocs/working/task_m010_11_stage4.md`

조건부 수정:

- `.github/workflows/alhangeul-desktop.yml`
- `tests/actions-workflows.test.mjs`
- `scripts/windows-installer-smoke.ps1`
- `tests/windows-installer-smoke.test.mjs`
- `mydocs/plans/task_m010_11_impl.md`

### 변경 내용

- Stage 3 승인 commit을 exact SHA로 고정하고 별도 승인 뒤 `publish/task11`에 push한다.
- desktop workflow를 해당 exact SHA로 dispatch하고 event, head branch·SHA, 모든 job conclusion을 확인한다.
- 첫 canary가 installer 실행 전 workflow 순서 결함으로 중단되면 diagnostic 보존과 smoke 진입에 필요한 workflow 순서와 회귀 test만 최소 보정하고, 새 승인 commit의 exact SHA로 재실행한다.
- 보정 canary가 Windows PowerShell 5.1의 UTF-8 source decoding 때문에 parser 단계에서 중단되면 script의 UTF-8 BOM과 byte-level 회귀 test만 보정하고 새 승인 commit의 exact SHA로 재실행한다.
- 보정 canary가 StrictMode의 빈 process ID 투영 때문에 clean-state 단계에서 중단되면 pipeline 기반 ID 투영과 회귀 test만 보정하고 새 승인 commit의 exact SHA로 재실행한다.
- 보정 canary가 nested shortcut 배열 때문에 존재하지 않는 경로를 잔여 상태로 오판하면 후보 경로 평탄화와 회귀 test만 보정하고 새 승인 commit의 exact SHA로 재실행한다.
- Windows build artifact와 diagnostic artifact를 임시 디렉터리에 내려받아 inventory, summary, MSI log와 cleanup 결과를 검토한다.
- MSI `1602`, NSIS handler 누락, script assertion 오류 또는 hosted runner 성공 중 하나로 결과를 분류한다.
- installer assertion이 실패해도 원본 log·summary·cleanup 증적이 온전하고 다음 보정 원인이 특정되면 “진단 canary 목적 충족”으로 기록할 수 있다. 이를 installer 수용 성공으로 기록하지 않는다.
- Windows artifact 미생성, smoke job 미실행, diagnostic upload 누락 또는 exact-SHA 불일치는 Stage 4 미완료다.
- 이 Stage에서는 위 canary 선행 결함 외 source를 임의 수정하지 않으며 packaging 설정과 installer 판정 계약을 변경하지 않는다.

### 검증

```bash
node --test tests/actions-workflows.test.mjs tests/windows-installer-smoke.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git push origin HEAD:refs/heads/publish/task11
git ls-remote --heads origin refs/heads/publish/task11
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri --ref publish/task11 -f build_ref=<candidate-sha> -f run_tests=true
gh run view <run-id> --repo postmelee/alhangeul-tauri --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download <run-id> --repo postmelee/alhangeul-tauri --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform windows-x64 --root <windows-artifact-root> --verify-inventory <inventory-path>
git diff --check
```

다운로드한 artifact는 검토 후 명시적 임시 디렉터리만 삭제하고 저장소나 공개 경로로 옮기지 않는다.

### 커밋

```text
Task #11 Stage 4: exact-SHA Windows installer 진단 canary
```

## Stage 5 — 증거 기반 원인 판정과 보정

### 산출물

조건부 수정:

- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/windows/main.wxs`
- `package.json`
- `scripts/windows-installer-smoke.ps1`
- `tests/windows-installer-smoke.test.mjs`
- `.github/workflows/alhangeul-desktop.yml`
- `tests/actions-workflows.test.mjs`

신규:

- `apps/desktop/src-tauri/windows/nsis-hooks.nsh`
- `tests/windows-packaging.test.mjs`

조건부 신규:

- `mydocs/troubleshootings/task_m010_11_windows_installer.md`

신규:

- `mydocs/working/task_m010_11_stage5.md`

### 변경 내용

- Stage 4 증적을 packaging 결함, automation 계약 결함 또는 VDI interactive/session 한계로 분류한다.
- packaging 결함이면 실패 action과 registry evidence가 가리키는 WiX/Tauri 설정만 최소 수정한다.
- automation 결함이면 실제 installer 등록 계약에 맞게 script/test/workflow를 함께 보정하되 수용 기준을 약화하지 않는다.
- hosted runner에서 양 installer가 이미 성공하면 packaging source를 수정하지 않고 VDI `1602`를 환경 한계로 분류한다.
- 원인·해결이 검증되고 재사용 가치가 있을 때만 troubleshooting 문서를 작성한다. 원인 미확정 상태에서는 만들지 않는다.
- 변경 후 Stage 3의 플랫폼 중립 검증을 모두 재실행한다. Windows 최종 수용은 Stage 6에서 판정한다.

### 검증

```bash
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

### 커밋

```text
Task #11 Stage 5: Windows installer 원인 판정과 증거 기반 보정
```

## Stage 6 — 최종 exact-SHA 수용 검증과 Task #9 handoff

### 산출물

repository 외부 상태:

- Stage 5 승인 commit을 가리키는 `publish/task11`
- 최종 exact-SHA native run과 Windows build·diagnostic artifact

수정:

- `docs/operations/DESKTOP_RELEASE.md`
- `mydocs/orders/20260731.md`

신규:

- `mydocs/working/task_m010_11_stage6.md`

### 변경 내용

- `publish/task11`을 Stage 5 승인 commit으로 fast-forward하고 desktop workflow를 같은 exact SHA로 다시 실행한다.
- 첫 run `30612425879`의 Linux x64·arm64 성공과 Windows WiX `light.exe` 실패, smoke artifact download 실패를 Stage 6.1 보정 입력으로 고정한다.
- `Path` file 아래 Desktop·Start Menu shortcut은 executable을 default target으로 하는 advertised shortcut으로 바꾼다. MSI는 per-machine 설치이므로 `DesktopFolder`와 `ProgramMenuFolder`가 All Users 위치로 해석되는 기존 directory 계약을 유지한다.
- Packaging source test는 file-owned shortcut의 `Advertise="yes"`, `Target` 미지정과 `Path` file key path를 함께 검증하고 비-advertised 회귀를 금지한다.
- 전체 기존 build matrix와 Windows installer smoke job의 success를 요구한다. Linux는 기존 build 회귀만 확인하며 install 성공으로 주장하지 않는다.
- MSI·NSIS summary에서 clean state, exit, version, handler, 기본 연결 불변, bounded launch, uninstall cleanup과 fixture hash를 각각 확인한다.
- Windows artifact inventory와 run provenance를 독립 재검증하고 artifact·log 만료 시각을 기록한다.
- DESKTOP_RELEASE에는 반복 가능한 자동 package smoke, diagnostic 보존과 실제 GUI 문서 gate가 남는 경계를 반영한다.
- Task #9 handoff에는 Task #11 merge 선행, 과거 candidate 폐기, 최신 `devel` 통합, `check:release-metadata` 포함 새 exact-SHA candidate 재검증을 명시한다.
- release PR, tag, GitHub Release, signing, updater와 package 게시는 수행하지 않는다.

### 검증

```bash
git push origin HEAD:refs/heads/publish/task11
git ls-remote --heads origin refs/heads/publish/task11
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri --ref publish/task11 -f build_ref=<candidate-sha> -f run_tests=true
gh run view <run-id> --repo postmelee/alhangeul-tauri --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download <run-id> --repo postmelee/alhangeul-tauri --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform windows-x64 --root <windows-artifact-root> --verify-inventory <inventory-path>
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

Task #11 branch에는 `check:release-metadata`가 없으므로 성공으로 가장하지 않는다. Task #9의 새 통합 candidate에서 해당 검증을 수행한다.

### 커밋

```text
Task #11 Stage 6: Windows installer smoke 수용 검증과 Task #9 handoff
```

## 검증

- 각 Stage의 source·문서와 `task_m010_11_stage{N}.md`를 같은 단계 commit으로 묶는다.
- Stage 4 진단 failure는 installer 성공이 아니며 Stage 6 success 전에는 Issue #11 수용 완료로 처리하지 않는다.
- exact-SHA run의 event, head SHA, job과 artifact를 기록과 대조한다.
- 현재 macOS에서 Windows native·Tauri 성공을 주장하지 않는다.
- 계획된 path, workflow 권한, 수용 기준 또는 packaging 변경 범위가 달라지면 구현계획서를 먼저 갱신하고 승인받는다.
- tag·Release·main PR·secret·signing·updater·package 게시가 생기면 범위 위반이다.
- 최종 PR 준비 전 `git status --short`는 빈 출력이고 `git diff --check`는 통과해야 한다.

## 커밋

- 단계 commit은 `Task #11 Stage {N}: {핵심 내용}` 형식을 사용한다.
- Stage 4·6의 candidate SHA는 단계 보고 commit 전 source/workflow 승인 commit이다. 뒤따르는 보고·운영 문서 commit을 final tag artifact로 간주하지 않는다.
- remote `publish/task11`은 canary와 후속 PR에 사용하되 tag나 release ref로 사용하지 않는다.

## 단계 의존성

- Stage 2는 Stage 1의 installer별 상태·판정 계약 승인 뒤 시작한다.
- Stage 3은 Stage 2 script·test 보고 승인 뒤 workflow를 수정한다.
- Stage 4는 Stage 3 보고 승인과 remote push·Actions dispatch의 명시 승인 뒤 시작한다.
- Stage 5는 Stage 4 diagnostic artifact와 원인 분류 승인 뒤 시작한다.
- Stage 6은 Stage 5 원인 판정·조건부 보정 승인 뒤 최종 remote 수용 검증을 수행한다.
- 각 단계 보고 승인 전 다음 단계로 진행하지 않는다.
- Stage 6 승인 뒤 최종 보고서와 PR 게시 절차로 넘어간다.

## 위험과 대응

- **진단 run 실패 해석**: Stage 4 failure를 성공으로 낮추지 않고 진단 계약 충족과 installer 수용을 별도 필드로 기록한다.
- **matrix 결합**: smoke job은 `always()`로 Windows artifact를 찾고 전체 run은 기존 build 회귀와 final smoke success를 모두 확인한다.
- **registry 오판**: Stage 1에서 installer별 view와 key를 고정하고 기본 앱·Alhangeul handler·UserChoice를 분리한다.
- **cleanup 오염**: installer별 순차 실행과 잔여 상태 gate를 적용하며 Alhangeul 소유 대상만 정리한다.
- **조건부 파일 남발**: Stage 4 증적이 지목한 파일만 수정하고 원인 없는 WiX/Tauri 변경을 금지한다.
- **Task #9 충돌**: #11 선병합 후 #9이 최신 `devel`을 반영해 새 candidate를 만들며 과거 SHA를 승계하지 않는다.
- **파일 비대화**: 신규 script/test는 300 LOC, 함수 50 LOC, 매개변수 5개 권장 상한을 지킨다. 본 구현계획서는 6개 Stage의 산출물·명령·승인 gate를 중앙 템플릿 한 파일에 완결하기 위해 300 LOC를 초과하며, task별 구현계획서를 분리하지 않는 문서 구조 규칙을 우선한다.

## 승인 요청 사항

- 승인된 수행계획의 5단계를 위 6단계로 세분화하는 구성
- Stage 1에서 installer별 registry·exit·version·cleanup 계약을 먼저 고정하는 방식
- Stage 2의 단일 PowerShell entry script와 별도 Node source-contract test
- Stage 3의 fresh `windows-2025` artifact-consumer job, always diagnostic upload와 final failure 전달 구조
- Stage 4에서 `publish/task11` exact SHA를 첫 진단 canary로 push·dispatch하고 실패 증적을 원인 분류 입력으로 사용하는 범위
- Stage 5에서 증적으로 확인된 packaging/automation 결함만 수정하고 미재현 시 source를 보존하는 gate
- Stage 6에서 전체 build matrix와 MSI·NSIS smoke success를 요구하고 Task #9 새 candidate handoff를 확정하는 기준
- release·tag·signing·게시와 실제 GUI 문서 기능 검증을 계속 제외하는 경계

승인되면 Stage 1의 read-only 조사와 상태·판정 계약 보고부터 진행한다.
