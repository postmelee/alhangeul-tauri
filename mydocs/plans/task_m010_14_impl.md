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
| 6.1 | Explorer first-page 시각 누락 보정 | font-aware raster와 대표 fixture visual gate | text·raster 구조, 영역별 ink, Windows Explorer 재수용 |

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
- IPC frame은 고정 64 byte header에 magic, protocol version, kind, little-endian length와 payload hash를 갖는다. 양쪽 모두 allocation 전에 length·pixel·stride 산술 overflow와 실제 payload를 검증한다.
- worker는 top-down premultiplied BGRA만 반환하고 GDI handle을 넘기지 않는다. DLL이 checked size로 `CreateDIBSection`을 호출해 반환 `HBITMAP`을 만든다.

### Cargo와 공유 core

- Cargo는 workspace root 밖의 package를 member로 허용하지 않으므로 `apps/desktop/src-tauri`는 기존 standalone package로 유지한다. 공유 crate는 path dependency로 연결해 기존 desktop `Cargo.lock`, `target/` 위치와 `cargo test` 의미를 보존한다.
- 공유 crate 자체 검증은 standalone manifest와 desktop target directory를 명시한다. Stage 3의 worker/handler도 독립 manifest로 추가하고 desktop workspace member로 편입하지 않는다.
- `crates/document-preview`는 protocol/limits를 기본 제공하고 `render` feature에서만 `rhwp`, `resvg`, `image`를 활성화한다. Desktop과 worker는 `render`를 사용하고 COM DLL은 protocol/limits만 사용한다.
- `resvg`의 text·raster-images feature는 `rhwp`의 transitive dependency에 기대지 않고 공유 crate가 명시적으로 소유한다. SVG raster options는 빈 기본 font database를 사용하지 않고 pinned `rhwp`의 `ttfs/opensource` NotoSansKR TTF를 process-local로 등록한다. 일회성 Windows worker는 system font directory를 스캔하지 않는다.
- SVG가 이미 포함하는 HWP family별 fallback chain을 유지하고, generic serif/sans/monospace는 실제 등록된 family로만 설정한다. proprietary 한컴·HY·Microsoft font file은 번들하지 않는다.
- desktop `render_document_preview`는 공유 direct SVG API를 호출하되 worker protocol이나 Windows type을 알지 못한다.
- `third_party/rhwp`는 workspace member로 편입하거나 수정하지 않고 현재 pin을 유지한다.

### Stage 1 확정 resource budget

Windows x64 exact SHA `a12e7b77e425d49b9773cd7f493499ac7bc0fd51`에서 정상 7개와 파생 4개 fixture를 실측해 다음 상한으로 확정한다.

| 항목 | 확정 상한 | 초과 시 동작 |
|---|---:|---|
| 입력 stream | 64 MiB | worker 미기동, icon fallback |
| 요청 `cx` | 1–1024 px | 0은 실패, 초과는 1024로 제한 |
| SVG | 16 MiB | preview 또는 icon fallback |
| preview compressed bytes | 16 MiB | icon fallback |
| preview decoded pixels | 16,777,216 px | icon fallback |
| 최종 BGRA pixels | 1,048,576 px | 축소 또는 실패 |
| IPC bitmap payload / 전체 frame | 4,194,304 B / 4,194,368 B | frame 폐기·worker 종료 |
| worker committed memory | 256 MiB | Job 종료, preview 또는 icon fallback |
| worker 시작·frame 선택 deadline | 1,500 ms | worker 종료, preview 후보 또는 icon fallback |

- 정상 direct 최대는 81 ms와 peak working set 13,377,536 B, 정상 bench 최대는 385 ms였다. worker spawn·raster·cold font 비용을 포함하지 않는 baseline이므로 요청 시작부터 frame 선택까지 단일 1,500 ms hard deadline을 유지한다.
- SVG 최대 1,292,217 B, preview 최대 72,948 B와 741,376 px였다. 16 MiB byte cap과 16,777,216 pixel cap은 fixture 밖 복잡 문서를 위한 보수적 headroom으로 유지한다.
- 64 MiB+1 fixture는 모든 경로에서 실패했고 preview process peak working set이 138,240,000 B까지 증가했다. DLL이 64 MiB 초과를 worker spawn 전에 거부해야 한다.
- 최대 요청 1024 px의 BGRA payload는 정확히 4,194,304 B이므로 4 MiB payload와 64 byte header를 분리해 전체 frame 상한을 4,194,368 B로 고정한다.
- 256 MiB Job process memory cap은 측정된 working set보다 여유가 있으나 commit과 working set은 같은 지표가 아니다. Stage 3 native test에서 Job accounting과 limit 종료를 별도로 검증한다.

### 등록·복원

- CLSID `InprocServer32`는 설치된 DLL 절대경로와 `ThreadingModel=Apartment`를 가진다.
- Stage 1 disposable HKCU probe에서 lookup precedence는 `active ProgID > extension ShellEx > SystemFileAssociations`로 확인됐다.
- Alhangeul은 `.hwp`와 `.hwpx`의 extension `ShellEx\{E357FCCD-A995-4576-B01F-234630154E96}` default value만 association owner path로 사용한다. active ProgID와 `SystemFileAssociations`는 쓰지 않아 기존 active ProgID handler가 우선하도록 보존한다.
- MSI는 HKLM/Registry64, NSIS per-user는 HKCU/Registry64를 소유 범위로 사용하고 32-bit view에 중복 등록하지 않는다.
- 공유 extension handler value를 처음 인수하기 전에 값 부재, value kind와 원래 데이터를 제품 전용 transaction record에 저장한다. upgrade에서 현재 값이 Alhangeul CLSID이고 기존 snapshot이 있으면 다시 snapshot하지 않는다.
- install은 `snapshot -> CLSID 등록 -> extension handler 등록 -> association notify` 순서로 적용한다. rollback/uninstall은 현재 extension handler가 Alhangeul CLSID일 때만 snapshot의 원래 값 또는 부재 상태를 복원한다.
- 설치 뒤 제3자가 handler를 바꿨으면 해당 값을 보존하고 snapshot만 정리한다. CLSID key만 제품 소유로 제거하며 extension 공유 parent key는 재귀 삭제하지 않는다.
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
- `tests/product-boundary.test.mjs`
- `mydocs/working/task_m010_14_stage2.md`

수정:

- `.github/workflows/{ci,alhangeul-desktop}.yml`
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/Cargo.lock`
- `apps/desktop/src-tauri/src/commands.rs`
- `apps/desktop/src-tauri/src/state.rs`
- `tests/actions-workflows.test.mjs`와 관련 desktop/product-boundary test
- `scripts/check-product-boundary.mjs`
- `package.json`
- `mydocs/orders/20260824.md`

### 변경 내용

- desktop manifest를 standalone package로 유지하고 공유 crate를 path dependency로 연결해 lockfile, target dir와 default desktop command를 보존한다. 중첩 workspace가 외부 sibling crate를 member로 받을 수 없는 Cargo 제약은 작업지시자 승인으로 계획을 정정했다.
- 공유 crate는 bytes와 approved limits만 받아 first-page SVG, embedded preview와 protocol frame을 반환하고 path/filesystem write/Tauri/COM/registry를 알지 못한다.
- direct API는 `DocumentCore::from_bytes`와 `render_page_svg_native(0)`을 사용한다. 기존 preview 결과와 차이가 있으면 원인을 검증하고 editable conversion을 조용히 복제하지 않는다.
- protocol decoder는 allocation 전에 frame/header/length/pixel overflow와 unknown version/kind를 거부한다.
- 정상·preview 없음·stale preview·corrupt/unsupported·limit fixture로 direct 우선순위, 결정성과 원본 불변을 고정한다.
- CI와 Windows/Linux desktop matrix에 shared/desktop test·clippy gate를 명시해 exact-SHA 플랫폼 검증 경로를 유지한다.
- shared clippy는 default `render`와 `--no-default-features --lib` protocol-only 조합을 모두 검사한다.

### 검증

Windows/Linux:

```bash
cargo test --manifest-path crates/document-preview/Cargo.toml --target-dir apps/desktop/src-tauri/target
cargo clippy --manifest-path crates/document-preview/Cargo.toml --target-dir apps/desktop/src-tauri/target --all-targets -- -D warnings
cargo clippy --manifest-path crates/document-preview/Cargo.toml --target-dir apps/desktop/src-tauri/target --no-default-features --lib -- -D warnings
cd apps/desktop/src-tauri
cargo test
cargo clippy -- -D warnings
cd ../../..
node --test tests/product-boundary.test.mjs
node --test tests/actions-workflows.test.mjs
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
- `apps/thumbnail-handler/src/{lib,abi,class_factory,provider,bitmap,registration}.rs`
- `apps/thumbnail-handler/src/process/{mod,child,pipe_io}.rs`
- `apps/thumbnail-handler/tests/com_contract.rs`
- `scripts/build-thumbnail-binaries.mjs`
- `tests/thumbnail-build.test.mjs`
- `mydocs/working/task_m010_14_stage3.md`

수정:

- `crates/document-preview/src/{lib,protocol,request,render}.rs`
- `apps/desktop/src-tauri/tauri.windows.conf.json`
- `package.json`, `.gitignore`
- native workflow와 관련 test
- `mydocs/orders/20260825.md`, `mydocs/orders/20260826.md`

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
pnpm run test:thumbnail-worker:windows
pnpm run test:thumbnail-handler:windows
pnpm run clippy:thumbnail-worker:windows
pnpm run clippy:thumbnail-handler:windows
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

## Stage 6.1 — Explorer first-page 시각 누락 보정

### 진입 근거와 승인

- Stage 5 exact SHA `d522ad635c220108c7260732c6ad23ff504f2f63`의 CI와 Windows/Linux native·installer smoke는 통과했지만, 2026-08-27 NSIS VDI 수동 수용에서 `[2027] 온새미로 1 본교재`, `biz_plan`, `form-002`의 텍스트가 빠지고 vector/background만 남는 결함을 확인했다.
- `render_page_svg_native(0)` 산출물에는 온새미로 첫 페이지의 text 35개와 JPEG image가 존재하고 embedded preview도 정상이다. 공유 raster가 `usvg::Options::default()`의 빈 font database를 사용해 text를 drop한 뒤 incomplete bitmap을 성공으로 반환했고, direct-first selector가 정상 preview 후보보다 이를 우선했다.
- GitHub Issue #14가 참고로 지정한 `postmelee/alhangeul-macos`의 Finder thumbnail 경로를 구현계획에서 충분히 대조하지 않은 누락을 인정한다. 작업지시자는 2026-08-27 Stage 6.1 진행과 해당 저장소 구조·코드의 최대 재사용을 승인했다.

### 외부 참조와 이식 결정

- 참조 source는 `postmelee/alhangeul-macos` commit `7162a80fdadf4e121623be1da9c1a7d933ef0fac`으로 고정하고 읽기만 한다.
- `Sources/ThumbnailExtension/HwpThumbnailProvider.swift`의 aspect-fit, `Sources/Shared/HwpPageImageRenderer.swift`의 first-page native render, `Sources/RhwpCoreBridge/FontResourceRegistry.swift`의 process-local bundled font 등록, `FontFallback.swift`의 실존 family fallback, `mydocs/tech/skia_preview_renderer_baseline.md`의 구조 누락 hard-fail 원칙을 Windows에 이식한다.
- Swift CoreGraphics/CoreText compositor와 Finder 전용 cache는 Windows에 복사하지 않는다. Windows는 승인된 SVG→BGRA worker와 Explorer cache 소유권을 유지하고, 같은 원칙을 `resvg/fontdb`와 Rust fixture gate로 구현한다.
- macOS WOFF2 35개를 중복 복사하지 않는다. pinned `rhwp`가 이미 보유한 SIL OFL NotoSansKR TTF 2개를 worker binary에 compile-time 포함해 설치 위치·current directory와 무관하게 한글 glyph를 확보한다. 문서마다 새 process를 시작하는 Windows worker는 cold-start deadline을 위해 system font directory를 스캔하지 않는다.

### 산출물

수정:

- `crates/document-preview/Cargo.toml`
- `crates/document-preview/src/render.rs`
- `crates/document-preview/tests/representative_content.rs`
- 필요 시 `tests/product-boundary.test.mjs`, `tests/thumbnail-build.test.mjs`
- `assets/fonts/FONTS.md`
- `docs/architecture/WINDOWS_THUMBNAILS.md`, `docs/DEVELOPMENT.md`
- `mydocs/plans/task_m010_14_impl.md`
- `mydocs/working/task_m010_14_stage6_1.md`
- `mydocs/orders/20260826.md`, `mydocs/orders/20260827.md`, `mydocs/orders/20260828.md`

### 변경 내용

- `resvg` text·raster-images feature를 직접 고정하고 SVG parse options에 pinned NotoSansKR font database를 등록한다.
- generic family와 worker database에 없는 원본 family는 실제 등록된 NotoSansKR로 해석한다. SVG의 원본 page aspect ratio는 변경하지 않는다. desktop editor·PDF의 system font 우선 규칙은 별도 경계로 유지한다.
- 온새미로 HWP, `biz_plan.hwp`, `form-002.hwpx` 첫 페이지에서 text/image node inventory와 text-only 영역의 non-white pixel을 검증한다. 단순 `HRESULT=S_OK`, byte 길이, alpha·dimension만으로 visual 성공을 판정하지 않는다.
- incomplete direct bitmap을 preview보다 우선하는 현 결함은 raster가 대표 구조를 보존하도록 고친다. stale preview보다 current direct를 우선하는 Issue #14 계약 자체는 유지한다.
- worker cold font load의 deadline·256 MiB Job cap, binary/installer 크기와 exact artifact digest를 다시 측정한다.

### 검증

플랫폼 중립 source·format gate:

```bash
cargo fmt --manifest-path crates/document-preview/Cargo.toml -- --check
node --test tests/product-boundary.test.mjs tests/thumbnail-build.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run check:rhwp-pin
git diff --check
```

Windows x64 exact-SHA:

```powershell
cargo test --manifest-path crates/document-preview/Cargo.toml --target-dir apps/desktop/src-tauri/target
cargo clippy --manifest-path crates/document-preview/Cargo.toml --target-dir apps/desktop/src-tauri/target --all-targets -- -D warnings
pnpm run build:thumbnail-binaries -- --target x86_64-pc-windows-msvc
pnpm run test:thumbnail-worker:windows
pnpm run test:thumbnail-handler:windows
pnpm run clippy:thumbnail-worker:windows
pnpm run clippy:thumbnail-handler:windows
```

- 기존 Windows x64 installer smoke와 Linux x64/arm64 native 회귀를 새 exact SHA에서 재실행한다.
- VDI 수동 gate는 새 NSIS 설치 뒤 온새미로, `biz_plan`, `form-002`의 text/background/table 보존과 HWP/HWPX aspect ratio만 우선 확인한다. registry/process/cache의 복잡한 확인은 automation 증적으로 대체하고 작업지시자에게 요구하지 않는다.
- 첫 candidate `b80cc10a226876abb826dce4b71ba0c866562104`의 CI run `33041176530`과 desktop run `33041178548`에서 온새미로 title/background와 `biz_plan` title 검사는 통과했지만 `biz_plan` 날짜 영역을 실제 SVG baseline 53.4%와 다른 35–50%로 지정해 실패했다. 날짜 영역을 50–56%로 보정하고 세 대표 문서를 독립 test로 분리한 뒤 새 exact SHA gate를 실행한다.
- 두 번째 candidate `65860cf89e97ba8530b5d363b650c0f47d80b29e`의 CI run `33041482402`에서 대표 3개 visual test는 모두 통과했고, 최신 Clippy가 `usvg::Options`의 default 생성 뒤 field 재할당을 거부했다. 동일 options를 구조체 초기화식으로 표현해 기능 변경 없이 lint를 보정한다.
- 세 번째 candidate `9c3d4f5e6fa79666af468cee4e80c29574a6f0ee`의 CI run `33041764734`와 desktop run `33041768181`에서 대표 3문서 visual gate, Windows/Linux build, Windows core probe와 artifact inventory는 통과했다. 그러나 fresh-install smoke job `98424713452`에서 MSI·NSIS 설치·등록·제거는 정상인 반면 embedded preview가 없는 HWPX 실제 Shell 요청이 각각 `0x8004b200`, `0x80040154`로 실패했다. 정상 문서의 native SVG 생성은 최대 83 ms·13,348,864 bytes였고 새 raster 단계와 기존 worker의 차이는 전체 system font database 구성이다. handler가 worker 오류를 단일 `E_FAIL`로 축약해 deadline과 Job memory 중 어느 제한인지는 진단만으로 구분할 수 없으므로, macOS 참조의 process-local bundled font 원칙을 더 엄격히 적용해 worker database를 두 NotoSansKR TTF로 한정하고 같은 exact-SHA gate를 반복한다.
- 최종 candidate `2a1a9c556fdb844ecea4fddb0a6336d9d9481078`의 CI run `33044851424`와 desktop run `33044853129`가 성공했다. Windows/Linux x64·arm64 native gate와 artifact inventory가 통과했고, fresh-install smoke job `98431213787`은 MSI·NSIS 모두 HWP와 embedded preview가 없는 HWPX의 실제 256 px Shell bitmap을 `HRESULT=0`으로 반환하고 설치·재설치·제거·기존 연결 복원을 완료했다. 2026-08-28 VDI에서 온새미로, `biz_plan`, `form-002`의 text/background/table과 비율을 재수용했으며, 복학원서 왼쪽 위 문장은 원본·upstream 기대 이미지와 일치하는 허용 가능한 축소 결과로 판정했다.

### 커밋

```text
Task #14 [Stage 6.1]: Explorer thumbnail text와 image raster 보정
```

## Stage 7 — PR #46 리뷰 보정과 재현성·제거 안전성 강화

### 진입 근거와 승인

- PR #46 리뷰 댓글 `issuecomment-5449578921`에서 독립 Cargo package lockfile 누락, optional thumbnail 등록 해제 실패의 앱 제거 전파, NSIS 자기 ProgID 재복원, 실효 없는 total deadline과 제품 한계 문서 누락을 확인했다.
- 작업지시자는 2026-08-28 리뷰 판정과 최소 수정 범위를 확인한 뒤 Stage 7 진행을 승인했다.
- 기존 COM/worker 격리, extension ShellEx owner path, direct-first rendering과 process-local font 구조는 유지한다. 공개 release·서명·배포는 범위에 포함하지 않는다.

### 산출물

수정:

- `.gitignore`, `apps/thumbnail-handler/Cargo.lock`, `apps/thumbnail-worker/Cargo.lock`, `crates/document-preview/Cargo.lock`
- `package.json`, `.github/workflows/{ci,alhangeul-desktop}.yml`, Cargo build/test helper와 관련 automation test
- `apps/desktop/src-tauri/src/{commands,state}.rs`와 desktop preview 회귀 test
- `apps/desktop/src-tauri/windows/{nsis-hooks.nsh,main.wxs}`
- `apps/thumbnail-handler/src/process/**`, 필요 시 `apps/thumbnail-handler/src/registration/**`
- Windows installer·thumbnail source/native smoke와 platform-neutral contract test
- `crates/document-preview/src/render.rs`, 대표 raster 회귀 test
- `docs/architecture/WINDOWS_THUMBNAILS.md`, `docs/operations/DESKTOP_RELEASE.md`
- `mydocs/plans/task_m010_14_impl.md`, `mydocs/working/task_m010_14_stage7.md`, `mydocs/report/task_m010_14_report.md`, `mydocs/orders/20260828.md`

### 변경 내용

- standalone Cargo package 3개의 lockfile을 추적하고 build/test/clippy 경로에 `--locked`를 적용해 dependency resolution drift를 차단한다. exact artifact digest는 실행 산출물 식별자이며 bit-for-bit reproducible build 보장으로 과장하지 않는다.
- desktop preview의 editable conversion 생략은 renderer에 영향을 주지 않는 distribution serialization metadata 정리임을 fixture test로 고정한다. 공유 64 MiB input·16 MiB SVG 상한과 오류 contract는 승인된 bounded API로 명시하고 초과·parse 오류 test를 추가한다.
- NSIS/MSI uninstall은 thumbnail unregister 실패를 진단에 남기되 optional extension 실패로 앱 제거 전체를 중단하지 않는다. 가능한 owner-scoped 정리를 계속하고 DLL 누락·unregister failure에서도 제거 완료를 검증한다.
- NSIS PREUNINSTALL snapshot은 현재 extension default가 `Alhangeul.hwp`/`Alhangeul.hwpx`이면 제거 후 dangling ProgID로 복원하지 않는다. 제3자 default와 부재 상태는 기존 transaction대로 보존한다.
- `SetRegView 64`는 Tauri의 뒤이은 APP_ASSOCIATE/APP_UNASSOCIATE와 uninstall metadata까지 Registry64에 맞추는 의도된 hook-wide 상태임을 주석·source contract로 고정하고 임의 복원하지 않는다.
- 실효 없던 total deadline을 제거하고 요청 시작부터 pipe·worker 시작과 frame 선택까지 단일 1,500 ms deadline으로 축소해 코드·계획·아키텍처를 정렬한다. deadline 이전 후보만 fallback에 쓰고 종료·join은 반환 전 cleanup임을 native test로 고정한다.
- production에서 사용하지 않는 `resolve_document_preview` 정책 API를 제거하거나 실제 worker streaming contract와 동일한 조합으로 정렬한다.
- 대표 raster gate는 premultiplied BGRA의 alpha 영향을 분리한 luminance/coverage 판정으로 보강하고, registration 함수 길이 검사 regex는 실제 visibility/unsafe 함수 선언을 인식하게 한다.
- active ProgID thumbnail handler가 extension ShellEx보다 우선하므로 한컴 등 제3자 ProgID handler가 활성화된 환경에서는 Alhangeul thumbnail이 표시되지 않을 수 있음을 최종 보고서와 PR 검증 한계에 명시한다. 2026-08-28 VDI에 한컴 2024가 설치돼 있었던 사실과 active ProgID handler 존재 여부는 구분한다.

### 검증

플랫폼 중립:

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
cargo test --manifest-path crates/document-preview/Cargo.toml --locked
cargo clippy --manifest-path crates/document-preview/Cargo.toml --locked --all-targets -- -D warnings
```

Windows/Linux exact-SHA:

- CI Unit tests와 Linux x64/arm64, Windows x64 desktop artifact build를 같은 source candidate에서 재실행한다.
- Windows handler/worker test·Clippy·COM contract, MSI/NSIS inventory와 fresh-install smoke를 통과한다.
- unregister failure와 자기 ProgID default fixture에서 앱 제거 성공, Alhangeul dangling association 부재, 제3자 default/thumbnail sentinel 보존을 확인한다.
- renderer 결과를 변경하지 않으면 VDI 시각 수용은 반복하지 않고 Stage 6.1 증적을 유지한다. raster 또는 font 결과가 바뀌면 대표 fixture 자동 gate와 Windows VDI를 다시 수행한다.

실행 결과:

- source candidate `51099615681432862a51691aeb3c65dafd2da541`의 [CI run 33154309226](https://github.com/postmelee/alhangeul-tauri/actions/runs/33154309226) Unit tests job `98793335089`가 성공했다.
- 같은 candidate의 [desktop run 33154321608](https://github.com/postmelee/alhangeul-tauri/actions/runs/33154321608)에서 Linux x64 job `98793375935`, Windows x64 job `98793376092`, Linux arm64 job `98793376118`, Windows fresh-installer smoke job `98805510881`이 모두 성공했다.
- MSI·NSIS의 HWP/HWPX 실제 256 px Shell bitmap은 `HRESULT=0`이었고 install/uninstall exit `0`, 제거 뒤 owned registry count `0`과 clean state를 확인했다. NSIS 자기 ProgID fixture는 `NoDanglingCanonicalDefault=true`였고 제3자 Hancom sentinel을 복원했다.
- 제품 renderer·font 출력은 바뀌지 않았고 대표 raster와 Windows Shell bitmap gate가 다시 통과했으므로 Stage 6.1 VDI 시각 수용을 유지했다.

### 커밋

```text
Task #14 [Stage 7.1]: PR 리뷰 보정 source candidate
Task #14 Stage 7 + 최종 보고서: exact-SHA 재검증과 PR 보정 완료
```

- Windows/Linux exact-SHA workflow는 원격 commit을 입력으로 요구하므로 Stage 7.1에서 소스와 로컬 검증 보고서를 먼저 묶어 candidate를 만든다.
- 같은 candidate의 원격 gate가 끝난 뒤 Stage 7 완료 보고서와 최종 보고서·오늘할일·PR 본문을 두 번째 커밋에 묶는다. 원격 검증 전에는 Stage 7을 완료로 표시하지 않는다.

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

- **worker spawn 비용**: Stage 1은 CLI process baseline을 기록했고 Stage 3/6에서 실제 worker spawn·cold start를 측정한다. persistent daemon/pool은 문서 수명·공격면을 넓혀 제외한다.
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
- Stage 1에서 확정한 budget, extension ShellEx owner path와 conditional restore transaction
- 6개 Stage의 파일 범위, 검증과 커밋 메시지
- `publish/task14` canary는 Stage 1 probe와 Stage 6 수용에만 사용하고 release/tag/게시를 하지 않는 범위

Stage 1 산출물과 완료보고를 승인하면 Stage 2의 공유 document preview core와 desktop adapter 분리만 진행한다.
