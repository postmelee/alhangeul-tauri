# Task #14 구현계획서 — Windows Explorer HWP/HWPX 첫 페이지 썸네일

수행계획서: [`task_m010_14.md`](task_m010_14.md)
GitHub Issue: [#14](https://github.com/postmelee/alhangeul-tauri/issues/14)
마일스톤: M010
시작 기준: `origin/devel` `fee06fb41de05586a8088b88821a95ca6e97cc16`

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Windows contract probe와 resource budget 확정 | benchmark probe, 구현 결정표 | exact-SHA Windows `rhwp bench`, registry precedence probe |
| 2 | 공유 document preview core와 desktop adapter | `crates/document-preview/**` | direct/preview 우선순위, 원본 무수정, Windows/Linux Rust gate |
| 3 | 제한 worker와 COM Thumbnail Handler | worker/handler crate, build helper | IPC·Job Object·COM·HBITMAP·timeout 격리 |
| 4 | Windows bundle·등록·공존·rollback | WiX/NSIS, smoke, artifact verifier | MSI/NSIS install/update/uninstall/rollback, 한컴 sentinel |
| 5 | 플랫폼 중립 회귀와 공식 문서 정렬 | architecture/development/release 문서 | product/upstream/automation/Studio/build gate |
| 6 | Windows x64 exact-SHA Explorer 수용 | native artifact와 Explorer 증적 | 크기·DPI·cache·fallback·차단 정책·native matrix |

## 구현 계약

### 고정 식별자와 실행 경계

- Alhangeul Thumbnail Handler CLSID는 `{C1DCF316-0771-49DD-BFEA-C85F69B1674B}`로 고정한다.
- Shell thumbnail category는 `{E357FCCD-A995-4576-B01F-234630154E96}`를 사용한다.
- 설치 파일명은 `AlhangeulThumbnailHandler.dll`, `AlhangeulThumbnailWorker.exe`로 고정한다.
- COM DLL은 `IInitializeWithStream`, `IThumbnailProvider`, `IClassFactory`, `DllGetClassObject`, `DllCanUnloadNow`를 구현한다. `DisableProcessIsolation`은 등록하지 않고 `ThreadingModel=Apartment`를 사용한다.
- DLL은 `rhwp`, Tauri, WebView, SVG/image decoder를 link하지 않는다. bounded stream read, worker lifecycle, IPC 검증과 BGRA `HBITMAP` 생성만 담당한다.
- `rhwp` parse/layout/render와 preview decode/raster는 별도 무창 worker에서 실행한다. DLL은 자신의 module directory에서 worker 절대경로를 계산하고 `PATH`, current directory나 문서 인접 실행 파일을 사용하지 않는다.
- worker는 `CREATE_NO_WINDOW`와 제한된 pipe handle로 시작한다. Job Object에 active process `1`, kill-on-close와 memory limit을 설정해 hard deadline 초과 시 worker tree를 종료한다.
- worker 실행이 정책으로 차단되면 HRESULT 실패를 반환해 Explorer icon으로 저하한다. 앱 launch/open에는 영향을 주지 않는다.

### direct-first IPC

- DLL은 `IStream::Stat`과 bounded read로 입력 크기를 먼저 검사한다. 초과 입력은 worker를 시작하지 않는다.
- worker는 내장 preview를 bounded decode/raster해 `PreviewCandidate`를 먼저 보낼 수 있지만 아직 최종 결과로 선택하지 않는다.
- worker는 이어서 같은 byte에서 `DocumentCore::from_bytes`와 `render_page_svg_native(0)`을 실행해 `DirectBitmap`을 보낸다.
- deadline 안에 유효한 direct bitmap이 오면 preview 후보를 폐기한다. direct 실패·timeout·worker crash 때만 검증된 preview 후보를 사용하고, 후보도 없으면 실패한다.
- IPC frame은 magic, protocol version, kind, little-endian length와 payload hash를 갖는다. 양쪽 모두 allocation 전에 length·pixel·stride 산술 overflow와 실제 payload를 검증한다.
- worker는 top-down premultiplied BGRA만 반환하고 GDI handle을 넘기지 않는다. DLL이 checked size로 `CreateDIBSection`을 호출해 반환 `HBITMAP`을 만든다.

### Cargo와 공유 core

- `apps/desktop/src-tauri/Cargo.toml`을 root package 겸 workspace root로 사용해 기존 `Cargo.lock`과 `target/` 위치를 보존한다.
- member는 desktop, `../../../crates/document-preview`, `../../thumbnail-worker`, `../../thumbnail-handler`이고 `default-members = ["."]`로 기존 desktop `cargo test` 의미를 보존한다.
- `crates/document-preview`는 protocol/limits를 기본 제공하고 `render` feature에서만 `rhwp`, `resvg`, `image`를 활성화한다. Desktop과 worker는 `render`를 사용하고 COM DLL은 protocol/limits만 사용한다.
- desktop `render_document_preview`는 공유 direct SVG API를 호출하되 worker protocol이나 Windows type을 알지 못한다.
- `third_party/rhwp`는 workspace member로 편입하거나 수정하지 않고 현재 pin을 유지한다.

### provisional resource budget

Stage 1에서 Windows fixture 실측으로 다음 후보를 확정하고 구현계획서를 보정한 뒤 다시 승인받는다.

| 항목 | 후보 상한 | 초과 시 동작 |
|---|---:|---|
| 입력 stream | 64 MiB | worker 미기동, icon fallback |
| 요청 `cx` | 1–1024 px | 0은 실패, 초과는 1024로 제한 |
| SVG | 16 MiB | preview 또는 icon fallback |
| preview compressed bytes | 16 MiB | icon fallback |
| preview decoded pixels | 16,777,216 px | icon fallback |
| 최종 BGRA pixels | 1,048,576 px | 축소 또는 실패 |
| IPC frame | 4 MiB + header | frame 폐기·worker 종료 |
| worker committed memory | 256 MiB | Job 종료, preview 또는 icon fallback |
| direct deadline | 1,500 ms | worker 종료, preview 후보 사용 |
| 전체 deadline | 2,000 ms | worker 종료, preview 또는 icon fallback |

### 등록·복원

- CLSID `InprocServer32`는 설치된 DLL 절대경로와 `ThreadingModel=Apartment`를 가진다.
- active ProgID, extension ShellEx와 `SystemFileAssociations` precedence를 Stage 1 disposable HKCU probe로 확인하고 관찰 없이 세 경로를 모두 덮어쓰지 않는다.
- MSI는 HKLM/Registry64, NSIS per-user는 HKCU/Registry64를 소유 범위로 사용하고 32-bit view에 중복 등록하지 않는다.
- 공유 handler value를 바꾸기 전 값 부재, value kind와 원래 CLSID를 제품 전용 transaction record에 저장한다.
- uninstall/rollback은 현재 값이 Alhangeul CLSID일 때만 원래 값 또는 부재 상태를 복원한다. 설치 뒤 제3자가 바꾼 값은 보존한다.
- CLSID key만 제품 소유로 제거하고 extension/ProgID/SystemFileAssociations 공유 parent key는 재귀 삭제하지 않는다.
- install/update/uninstall 후 `SHChangeNotify(SHCNE_ASSOCCHANGED)`를 호출하며 Explorer/DllHost를 이름 기준으로 종료하지 않는다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 | `README.md` | OK | Stage 6 수용 뒤 현재 기능 확정 |
| Windows thumbnail architecture | `docs/architecture/` | `docs/architecture/WINDOWS_THUMBNAILS.md` | OK | 장기 COM/worker/cache/registry 계약 |
| upstream 경계 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | 공유 `rhwp` adapter 최소 보정 |
| 개발 절차 | `docs/` | `docs/DEVELOPMENT.md` | OK | Windows build/test 진입점 |
| 배포 절차 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | artifact·installer·Explorer gate |
| 문서 index | `docs/` | `docs/README.md` | OK | 새 architecture 문서 연결 |
| Stage 보고 | `mydocs/working/` | `mydocs/working/task_m010_14_stage{N}.md` | OK | 단계 source와 같은 커밋 |

## Stage 1 — Windows contract probe와 resource budget 확정

### 산출물

신규:

- `scripts/benchmark-thumbnail-core.ps1`
- `tests/thumbnail-core-probe.test.mjs`
- `mydocs/working/task_m010_14_stage1.md`

수정:

- `.github/workflows/alhangeul-desktop.yml`
- `package.json`
- `tests/actions-workflows.test.mjs`
- `mydocs/plans/task_m010_14_impl.md`
- `mydocs/orders/20260824.md`

### 변경 내용

- PowerShell 5.1 probe가 pinned `rhwp` binary의 `bench`, `export-svg --page 0 --json`, `thumbnail`을 정상 HWP/HWPX와 preview 없음·stale·손상·64 MiB 경계 파생 fixture에 실행한다.
- fixture id별 원본 SHA-256·size·mtime, wall time, exit code, peak working set, SVG/preview byte와 page dimension을 JSON에 남긴다. 민감 path·문서 내용은 기록하지 않는다.
- Windows x64 native workflow에 exact SHA와 결속된 diagnostic artifact를 추가한다. feature 성공이 아니라 budget 판단 근거로만 사용한다.
- disposable HKCU test namespace에서 active ProgID, extension ShellEx와 `SystemFileAssociations` lookup precedence를 `IShellItemImageFactory`로 관찰한다. 실제 HWP/HWPX 사용자 key는 수정하지 않는다.
- 실측값으로 resource 상한, worker 사용, registry owner path와 MSI custom action/NSIS transaction 순서를 구현계획서와 Stage 1 보고서에 확정한다.
- 현재 변경을 exact SHA로 Windows runner에 전달하기 위한 임시 `codex/task14-stage1-probe` ref만 Stage 1에서 사용하고, 증적 회수 뒤 원격 ref를 제거한다. 최종 PR용 `publish/task14`는 사용하지 않는다.

### 검증

```bash
node --test tests/thumbnail-core-probe.test.mjs tests/actions-workflows.test.mjs
pnpm run check:rhwp-pin
git diff --check
```

Windows x64:

```powershell
cargo build --manifest-path third_party/rhwp/Cargo.toml --bin rhwp --release
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/benchmark-thumbnail-core.ps1 `
  -RhwpBinary third_party/rhwp/target/release/rhwp.exe `
  -FixtureRoot third_party/rhwp/saved `
  -OutputDirectory diagnostics/thumbnail-core
```

### 커밋

```text
Task #14 Stage 1: Windows thumbnail 계약과 resource budget 확정
```

### 승인 게이트

- 최종 resource 상한, worker 사용, registry owner path와 installer transaction 방식 승인 전 Stage 2를 시작하지 않는다.

## Stage 2 — 공유 document preview core와 desktop adapter

### 산출물

신규:

- `crates/document-preview/Cargo.toml`
- `crates/document-preview/src/{lib,limits,protocol,render}.rs`
- `crates/document-preview/tests/preview_contract.rs`
- `mydocs/working/task_m010_14_stage2.md`

수정:

- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/Cargo.lock`
- `apps/desktop/src-tauri/src/commands.rs`
- `apps/desktop/src-tauri/src/state.rs`
- 관련 desktop/product-boundary test
- `scripts/check-product-boundary.mjs`
- `mydocs/orders/20260824.md`

### 변경 내용

- desktop manifest를 workspace root로 확장하되 lockfile, target dir와 default desktop command를 보존한다.
- 공유 crate는 bytes와 approved limits만 받아 first-page SVG, embedded preview와 protocol frame을 반환하고 path/filesystem write/Tauri/COM/registry를 알지 못한다.
- direct API는 `DocumentCore::from_bytes`와 `render_page_svg_native(0)`을 사용한다. 기존 preview 결과와 차이가 있으면 원인을 검증하고 editable conversion을 조용히 복제하지 않는다.
- protocol decoder는 allocation 전에 frame/header/length/pixel overflow와 unknown version/kind를 거부한다.
- 정상·preview 없음·stale preview·corrupt/unsupported·limit fixture로 direct 우선순위, 결정성과 원본 불변을 고정한다.

### 검증

Windows/Linux:

```bash
cd apps/desktop/src-tauri
cargo test -p alhangeul-document-preview
cargo clippy -p alhangeul-document-preview --all-targets -- -D warnings
cargo test -p alhangeul-desktop
cargo clippy -p alhangeul-desktop -- -D warnings
cd ../../..
pnpm run check:product-boundary
pnpm run check:rhwp-pin
git diff --check
```

현재 macOS host에서는 Rust 성공 근거로 사용하지 않는다.

### 커밋

```text
Task #14 Stage 2: 공유 document preview core와 desktop adapter 분리
```

## Stage 3 — 제한 worker와 COM Thumbnail Handler

### 산출물

신규:

- `apps/thumbnail-worker/Cargo.toml`
- `apps/thumbnail-worker/src/{main,worker}.rs`
- `apps/thumbnail-handler/Cargo.toml`
- `apps/thumbnail-handler/src/{lib,class_factory,provider,process,bitmap,registration}.rs`
- `apps/thumbnail-handler/tests/com_contract.rs`
- `scripts/build-thumbnail-binaries.mjs`
- `tests/thumbnail-build.test.mjs`
- `mydocs/working/task_m010_14_stage3.md`

수정:

- workspace manifest/lock
- `apps/desktop/src-tauri/tauri.windows.conf.json`
- `package.json`, `.gitignore`
- native workflow와 관련 test
- `mydocs/orders/20260824.md`

### 변경 내용

- worker는 anonymous pipe protocol만 제공하고 console/window/network/file write를 사용하지 않는다.
- handler는 bounded `IStream`, single initialization, class/object lock와 unload 상태를 구현하고 모든 extern entry의 panic을 HRESULT로 변환한다.
- handler는 worker를 Job Object에 연결하고 approved memory/process/deadline cap을 적용한다.
- direct success, preview fallback, timeout/crash/protocol violation과 GDI ownership을 focused test로 고정한다.
- build helper는 Windows x64 MSVC 두 binary의 target triple·PE machine·filename을 확인한 뒤 Tauri Windows resource staging에 복사한다. Linux는 no-op, ARM64와 임의 target은 fail-closed한다.
- `tauri.windows.conf.json`에서만 resource를 선언해 Linux bundle이 생성 DLL/EXE를 요구하지 않게 한다.

### 검증

```bash
node --test tests/thumbnail-build.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
git diff --check
```

Windows x64:

```powershell
pnpm run build:thumbnail-binaries -- --target x86_64-pc-windows-msvc
Set-Location apps/desktop/src-tauri
cargo test -p alhangeul-thumbnail-worker -p alhangeul-thumbnail-handler --target x86_64-pc-windows-msvc
cargo clippy -p alhangeul-thumbnail-worker -p alhangeul-thumbnail-handler --all-targets --target x86_64-pc-windows-msvc -- -D warnings
Set-Location ../../..
```

Native test는 COM activation/unload, 32/96/256/1024 bitmap, direct/fallback/timeout/crash, 반복·동시 activation, orphan worker·app/WebView/UI/file/network write 부재를 포함한다.

### 커밋

```text
Task #14 Stage 3: 제한 worker와 Windows COM thumbnail handler 구현
```

## Stage 4 — Windows bundle·등록·공존·rollback

### 산출물

수정:

- `apps/desktop/src-tauri/{tauri.conf.json,tauri.windows.conf.json}`
- `apps/desktop/src-tauri/windows/{main.wxs,nsis-hooks.nsh}`
- `apps/thumbnail-handler/src/registration.rs`
- `scripts/{windows-installer-smoke.ps1,verify-desktop-artifacts.mjs}`
- `.github/workflows/alhangeul-desktop.yml`
- Windows packaging/smoke/artifact/workflow test
- `mydocs/working/task_m010_14_stage4.md`
- `mydocs/orders/20260824.md`

### 변경 내용

- DLL/worker를 설치 root 고정 이름으로 bundle하고 해당 절대경로만 COM에 등록한다.
- WiX deferred/rollback action과 NSIS hook에 Stage 1에서 확정한 snapshot/conditional restore transaction을 적용한다.
- install/update/uninstall 뒤 targeted association notification을 보내고 강제 Shell process 종료는 하지 않는다.
- artifact verifier는 MSI, NSIS, inventory와 standalone verification copy DLL/worker의 cardinality·PE x64·SHA-256을 검증한다.
- installer smoke는 한컴 sentinel, HKLM/HKCU·64/32 view raw state, CLSID/association/backup cleanup을 확인한다.
- 설치 뒤 `IShellItemImageFactory`로 submodule HWP/HWPX fixture를 요청해 bitmap, 앱/WebView 미기동과 원본 SHA/size/mtime 불변을 검증한다.
- 제3자 sentinel로 바뀐 handler는 uninstall이 보존하고, Alhangeul 소유값만 원래 상태로 복원한다.

### 검증

```bash
pnpm run test:automation
pnpm run check:product-boundary
pnpm run check:product-version
git diff --check
```

Windows x64:

```powershell
pnpm tauri build --verbose --target x86_64-pc-windows-msvc
pnpm run check:desktop-artifacts -- --platform windows-x64 --root apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle --write-inventory apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/alhangeul-artifact-inventory.json
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows-installer-smoke.ps1 -ArtifactRoot apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle -OutputDirectory diagnostics/windows-thumbnail-installer -ExpectedVersion 0.1.0
```

### 커밋

```text
Task #14 Stage 4: Windows thumbnail 등록과 installer rollback 통합
```

## Stage 5 — 플랫폼 중립 회귀와 공식 문서 정렬

### 산출물

신규:

- `docs/architecture/WINDOWS_THUMBNAILS.md`
- `mydocs/working/task_m010_14_stage5.md`

수정:

- `README.md`, `docs/README.md`, `docs/DEVELOPMENT.md`
- `docs/architecture/UPSTREAM.md`
- `docs/operations/DESKTOP_RELEASE.md`
- 필요 시 300 LOC/50 LOC 상한 분리
- `mydocs/orders/20260824.md`

### 변경 내용

- 공식 문서에 process/IPC/fallback/cache/resource/registry/upgrade 소유 경계와 고정 CLSID를 기록한다.
- Windows DLL/worker build, artifact·installer·Explorer gate와 unsigned/차단 제한을 기록한다.
- README는 Stage 6 전 구현 완료를 단정하지 않고 후보·검증 대기 상태만 표현하거나 Stage 6까지 보류한다.
- upstream 문서는 `rhwp` direct/preview를 공유 adapter와 worker가 사용하되 COM DLL에는 link하지 않는 경계를 기록한다.

### 검증

```bash
git diff --check
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
```

### 커밋

```text
Task #14 Stage 5: Windows thumbnail 공식 문서와 회귀 gate 정렬
```

## Stage 6 — Windows x64 exact-SHA Explorer 수용

### 산출물

수정:

- `README.md`, `docs/operations/DESKTOP_RELEASE.md`
- 검증 결함 발견 시 승인된 workflow/smoke/계획 보정
- `mydocs/working/task_m010_14_stage6.md`
- `mydocs/orders/20260824.md`

외부 상태:

- 승인된 `publish/task14` exact-SHA canary
- CI/native run, installer diagnostic와 artifact metadata
- Explorer screenshot/process/registry/cache read-back

### 변경 내용

- Stage 5 exact SHA의 platform-neutral CI와 Windows x64/Linux x64/Linux arm64 native workflow를 실행한다.
- Windows에서 미열람 HWP/HWPX, preview 없음/stale, 손상, 대용량, 암호화/미지원 fixture를 검증한다.
- Explorer 32/96/256/1024 cache size, 소형·중형·대형·아주 큰 보기와 100/125/150/200% DPI를 확인한다.
- 반복 요청 cache hit와 승인된 fixture copy의 내용·mtime 변경 뒤 새 direct thumbnail 갱신을 확인한다.
- 한컴 2020 환경에서 MSI/NSIS install/update/uninstall 전후 handler와 file association raw state를 비교한다.
- worker/Shell extension 차단 정책에서 icon fallback과 앱 launch/open/save 회귀 부재를 확인한다.
- 보정이 필요하면 하위 Stage를 계획에 추가하고 승인 후 새 exact SHA로 affected gate를 다시 실행한다.

### 검증

```bash
git diff --check
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
```

- Windows x64 desktop/shared/worker/handler Rust test·Clippy, MSI/NSIS build, inventory와 installer smoke
- Linux x64/arm64 기존 desktop build 회귀 — thumbnail 성공으로 해석하지 않음
- exact ref/SHA, job conclusion, artifact ID/digest/inventory와 DLL/worker SHA chain
- direct/fallback screenshot, size/DPI, cache invalidation, DllHost/worker lifecycle, registry before/after, unsigned/deny policy 증적

### 커밋

```text
Task #14 Stage 6: Windows Explorer exact-SHA thumbnail 수용 확정
```

## 검증

- 각 Stage 명령은 `task-stage-report` 적용 전에 실행하고 실패한 검증은 단계 완료로 처리하지 않는다.
- fallback은 해당 fixture에서 승인된 기대 결과일 때만 통과한다.
- current macOS host에서 Rust desktop/handler, Tauri bundle이나 Windows registry 성공을 주장하지 않는다.
- Windows/Linux native 근거는 exact commit, run/job과 artifact chain을 확인한 경우로 제한한다.
- 새 dependency는 같은 Stage에서 license, duplicate version, feature와 lockfile diff를 검토한다.
- `third_party/rhwp` content와 pin은 모든 Stage에서 불변이어야 한다.
- 계획 변경이나 문서 위치 변경은 먼저 계획서를 갱신하고 승인받는다.

## 커밋

- 본 구현계획서와 오늘할일은 `Task #14: 구현 계획서 작성과 오늘할일 갱신`으로 커밋한다.
- Stage source와 `mydocs/working/task_m010_14_stage{N}.md`는 같은 Stage 커밋에 묶는다.
- 단계 correction은 승인 후 `Task #14 [Stage N.M]: 내용` 형식을 사용한다.

## 단계 의존성

- Stage 1은 본 구현계획 승인 뒤 시작한다.
- Stage 2는 Stage 1의 budget, worker, registry owner와 installer transaction 승인 뒤 시작한다.
- 이후 Stage는 직전 Stage 검증·보고 승인 뒤에만 시작한다.
- 승인 전 다음 Stage source를 수정하지 않는다.

## 위험과 대응

- **worker spawn 비용**: Stage 1/3에서 측정하며 persistent daemon/pool은 문서 수명·공격면을 넓혀 제외한다.
- **preview-first 계산 오해**: preview는 candidate일 뿐이며 direct 성공 시 폐기하는 final-source test를 둔다.
- **hard timeout 전 preview 손실**: 후보 도착 전 timeout이면 icon으로 저하하고 DLL 안에서 재파싱하지 않는다.
- **Job/child 차단**: 정책 거부는 handler 실패로 처리하고 앱 실패로 승격하지 않는다.
- **COM/GDI leak**: reference/server lock과 process/pipe/job/GDI handle을 RAII로 관리하고 반복 activation baseline을 검사한다.
- **installer rollback**: MSI failure injection과 NSIS committed snapshot 재시도를 Stage 4 hard gate로 둔다.
- **UserChoice 혼동**: default app/UserChoice는 읽기 비교만 하고 thumbnail 등록에서 변경하지 않는다.
- **workspace 회귀**: lockfile/target/default cargo 의미와 workflow artifact root를 source test로 고정한다.
- **dependency drift**: 기존 lock의 `windows 0.61`, `resvg 0.45`, `image 0.25` 계열을 우선 재사용한다.
- **fixture provenance**: pinned upstream fixture id만 사용하고 root repo 복제·개인 문서 증적을 금지한다.

## 승인 요청 사항

- `rhwp`를 COM DLL에 link하지 않고 Job Object 제한 worker로 분리하는 hard-timeout 구조
- preview 후보를 먼저 준비하되 direct 성공 시 반드시 direct를 선택하는 IPC 순서
- 고정 CLSID, `ThreadingModel=Apartment`와 기본 Shell process isolation 계약
- desktop manifest를 workspace root로 확장하면서 기존 lockfile/target 위치를 유지하는 Cargo 구성
- Stage 1에서 provisional budget, registry owner path와 installer transaction을 확정해 다시 승인받는 gate
- 6개 Stage의 파일 범위, 검증과 커밋 메시지
- `publish/task14` canary는 Stage 1 probe와 Stage 6 수용에만 사용하고 release/tag/게시를 하지 않는 범위

승인되면 Stage 1의 Windows contract probe와 resource budget 확정만 진행한다.
