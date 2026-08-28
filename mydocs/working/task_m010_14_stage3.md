# Task #14 Stage 3 완료보고서 — 제한 worker와 Windows COM Thumbnail Handler

GitHub Issue: [#14](https://github.com/postmelee/alhangeul-tauri/issues/14)
구현계획서: [`task_m010_14_impl.md`](../plans/task_m010_14_impl.md)
Stage: 3

## 단계 목적

Windows Explorer가 전달한 bounded document bytes를 직접 파싱하지 않는 COM DLL과 별도 무창 worker로 분리하고, Stage 1에서 확정한 resource budget과 Stage 2의 bytes-only preview core를 실제 Windows x64 native 경계에 연결하는 단계다.

COM handler는 `IInitializeWithStream`, `IThumbnailProvider`, `IClassFactory`, `DllGetClassObject`, `DllCanUnloadNow`의 최소 ABI만 소유한다. 입력 크기를 worker 기동 전에 검사하고, anonymous pipe로 검증된 frame만 받으며, top-down premultiplied BGRA를 `HBITMAP`으로 만든다. `rhwp`, SVG/image decode와 raster는 handler에 link하지 않고 독립 worker에만 둔다.

worker는 `CREATE_NO_WINDOW`, 명시적 pipe handle list와 Job Object 아래에서 시작한다. Job은 active process 1, kill-on-close와 process memory 256 MiB를 적용하고, handler는 direct deadline 1,500 ms와 전체 deadline 2,000 ms 안에서 direct 결과를 우선 선택한다. direct 실패·timeout·worker disconnect 때만 이미 검증된 preview 후보를 사용하고, 후보가 없으면 fail-closed한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/thumbnail-worker/Cargo.toml`, `src/{main,worker}.rs` | stdin request와 document bytes만 받아 preview candidate, direct bitmap과 완료 frame을 stdout으로 반환하는 독립 무창 worker를 추가했다. worker만 공유 crate의 `render` feature를 사용한다. |
| `apps/thumbnail-handler/Cargo.toml`, `src/{lib,abi,class_factory,provider,bitmap,registration}.rs` | 수동 COM ABI, class factory/provider reference count와 unload 상태, bounded `IStream`, `CreateDIBSection` 소유권, 고정 CLSID·파일명 계약을 구현했다. handler는 공유 protocol/limits만 link한다. |
| `apps/thumbnail-handler/src/process/{mod,child,pipe_io}.rs` | anonymous pipe, 제한 handle 상속, suspended process의 Job Object 편입, memory/process/deadline 제한, frame 선택과 worker tree 종료를 구현했다. |
| `apps/thumbnail-handler/tests/{com_contract.rs,support/mod.rs}` | staged DLL을 `LoadLibraryW`로 직접 로드해 COM activation/unload, 32/96/256/1024 bitmap, direct/fallback, single initialization, 반복·동시 class factory 해제를 검증한다. |
| `crates/document-preview/src/{lib,protocol,request,render}.rs` | 요청 header와 payload hash, preview/direct/control frame, allocation 전 metadata 검증, bounded premultiplied BGRA raster API를 공유 계약에 추가했다. |
| `crates/document-preview/tests/preview_contract.rs` | request/frame 공격 입력, direct/preview raster와 fallback 우선순위를 포함해 공유 통합 테스트를 11개로 확장했다. |
| `scripts/build-thumbnail-binaries.mjs` | Windows x64 MSVC에서 독립 worker EXE와 handler DLL을 release build하고 PE machine/type을 fail-closed 검증한 뒤 Tauri resource에 고정 이름으로 staging한다. Linux는 no-op이다. |
| `apps/desktop/src-tauri/tauri.windows.conf.json`, `.gitignore` | Windows config에서만 두 staged resource를 선언하고 생성 binary를 추적 대상에서 제외했다. |
| `.github/workflows/alhangeul-desktop.yml`, `package.json` | shared/desktop gate 뒤 Windows binary build, worker/handler test·Clippy, Tauri bundle과 fresh installer smoke가 exact SHA로 이어지게 했다. |
| `scripts/check-product-boundary.mjs`, `tests/{product-boundary,thumbnail-build,actions-workflows}.test.mjs` | handler의 render/Tauri/UI/filesystem/network 확장 금지와 process API 허용 위치, worker 권한 경계, x64 PE/staging과 workflow 순서를 source gate로 고정했다. |
| `mydocs/plans/task_m010_14_impl.md` | 독립 manifest와 Windows resource staging 순서에 맞춰 승인된 Stage 3 산출물·검증 경로를 보정했다. |
| `mydocs/orders/20260825.md`, `mydocs/orders/20260826.md` | 날짜 전환 중 Stage 3 진행 상태를 기록하고 현재 보드를 Stage 3 완료·Stage 4 승인 대기로 갱신했다. |
| `mydocs/working/task_m010_14_stage3.md` | 구현, exact-SHA 검증, 진단 보정, 잔여 위험과 Stage 4 인계 사항을 기록했다. |

Stage 2 완료점 `f8774cbbc80b71ea767d2917b8fa02a53707315f` 대비 32개 파일에 2,568줄 추가·38줄 삭제가 반영됐다. Stage 3 source의 최종 exact SHA는 `11810b9dd3d3f770a8622db8446d30500d9737fa`다.

Stage source와 진단 보정은 다음 하위 단계 커밋으로 기록했다.

- `28e5b967d5f2de268f874938d04bae42c3948c22` — 제한 worker와 COM handler native gate 준비
- `4cb7d3c95a3e3eb2c8b762f5b7d498f4fb83abf9` — 최신 Clippy와 Windows 경로 계약 보정
- `1891efe40263485d3e23298e3219d50c9915097d` — Windows resource staging 순서 보정
- `6d42402fc4f3a91adb0b17a9a25151529781e45f` — Windows native API 타입 보정
- `11810b9dd3d3f770a8622db8446d30500d9737fa` — COM export 안전성 계약 명시

## 본문 변경 정도 / 본문 무손실 여부

코드·테스트·workflow·내부 계획 문서 작업이다. 제품 공식 문서는 수정하지 않았고 `third_party/rhwp` gitlink와 내용도 변경하지 않았다. upstream pin은 `v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`로 유지했다.

handler는 `IStream`을 최대 64 MiB까지만 읽어 메모리 bytes로 전달하며 문서 path를 받거나 원본을 쓰지 않는다. worker도 stdin/stdout anonymous pipe 외 filesystem path, file write, network, child process, window/UI API를 사용하지 않는다. 공유 fixture 검증은 원본 bytes를 수정하지 않고 direct와 preview 결과를 만든다.

Stage 4 범위인 registry write, `InprocServer32`, extension ShellEx 등록, MSI/NSIS install·rollback·conditional restore는 시작하지 않았다. 현재 `registration.rs`는 고정 identity와 filename 계약만 제공하며 사용자/시스템 association을 변경하지 않는다.

## 검증 결과

구현계획서의 Stage 3 플랫폼 중립 명령:

```bash
node --test tests/thumbnail-build.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — thumbnail build·workflow contract 합계 18/18 통과
- OK — product boundary 256개 파일 검사 통과
- OK — `git diff --check` 출력 없이 종료 코드 0
- OK — Stage 3 주요 Rust source와 native test가 모두 권장 파일 상한 300 LOC 이하

구현계획서의 Windows x64 명령:

```powershell
pnpm run build:thumbnail-binaries -- --target x86_64-pc-windows-msvc
pnpm run test:thumbnail-worker:windows
pnpm run test:thumbnail-handler:windows
pnpm run clippy:thumbnail-worker:windows
pnpm run clippy:thumbnail-handler:windows
```

GitHub Actions exact-SHA 증적:

- run: [32875614205](https://github.com/postmelee/alhangeul-tauri/actions/runs/32875614205), conclusion `success`
- exact source SHA: `11810b9dd3d3f770a8622db8446d30500d9737fa`
- Linux x64 job `97892678988`: success, 24분 21초
- Linux arm64 job `97892679367`: success, 10분 47초
- Windows x64 job `97892679220`: success, 50분 36초
- Windows x64 installer smoke job `97908872859`: success, 50초
- 세 build job 모두 exact commit 확인, shared test, render/protocol-only Clippy, desktop test·Clippy, Tauri bundle, artifact 검증·업로드 성공
- Windows job의 두 PE build, worker test, handler test, worker Clippy, handler Clippy가 모두 success
- fresh installer smoke의 exact commit 확인, Windows x64 artifact download, installer 실행과 final gate가 모두 success

Windows test 세부 결과:

- OK — 공유 document preview 통합 테스트 11/11 통과
- OK — desktop Rust test 87개 통과
- OK — thumbnail worker test 3/3 통과
- OK — thumbnail handler unit test 6/6, staged DLL native integration test 2/2 통과
- OK — worker/handler Windows x64 Clippy `-D warnings` 통과
- OK — staged DLL에서 direct HWP와 preview-only HWPX fallback, 32/96/256/1024 `HBITMAP`, premultiplied alpha type, single initialization, `DllCanUnloadNow`, 8-thread class factory activation·release 확인
- OK — handler unit test에서 direct 우선, validated fallback, timeout fallback, worker disconnect fail-closed와 반복 candidate protocol violation 확인
- OK — Job Object active process 1, kill-on-close, process memory 256 MiB, 제한 handle list와 `CREATE_NO_WINDOW` 구성이 Windows compile·test·Clippy 경로를 통과
- OK — 임시 remote ref `codex/task14-stage3-probe`는 exact-SHA 성공 뒤 삭제했고 `git ls-remote --heads`에서 부재 확인

현재 macOS host에서 실행한 Rust check/test/Clippy는 개발 진단으로만 사용했다. Stage 3 완료 판정은 위 Windows/Linux exact-SHA jobs와 플랫폼 중립 Node/boundary 명령으로 한정한다.

### exact-SHA 진단 보정 이력

| Run / SHA | 결과 | 원인과 최소 보정 |
|---|---|---|
| `32865486359` / `28e5b967...` | 실패 | Rust 1.98의 최신 Clippy가 slice chunk 변환을 지적했고 Windows workflow test가 `/` 경로 분리를 가정했다. `as_chunks::<4>()`와 platform-neutral basename 계약으로 보정했다. |
| `32866908787` / `4cb7d3c95...` | 실패 | desktop Rust test가 Tauri Windows resource 존재를 먼저 요구했다. 두 PE build/staging을 desktop test 앞에 배치했다. |
| `32869184017` / `1891efe402...` | 실패 | Windows handler에 `Win32_System_IO` feature와 `core::BOOL` 위치, raw COM pointer 구체 타입이 누락됐다. API feature/type만 보정했다. |
| `32872066213` / `6d42402fc...` | 실패 | 모든 native build/test와 worker Clippy 후 Rust 1.98 handler Clippy가 public unsafe export의 `# Safety` 문서를 요구했다. COM pointer 유효성 계약을 명시했다. |
| `32875614205` / `11810b9dd...` | 성공 | Windows/Linux build matrix와 fresh Windows installer smoke 전부 통과했다. |

## 잔여 위험

- Windows native integration은 정상 direct/fallback, 크기, 동시 activation과 unload를 실제 DLL/worker로 확인했다. timeout·disconnect·protocol violation은 handler focused unit test로 확인했으며, synthetic 256 MiB memory breach나 강제 worker crash 뒤 OS process inventory까지 주입·계측하지는 않았다.
- Job Object와 RAII handle 소유권은 kill-on-close와 명시적 termination으로 구현됐다. 실제 Explorer/DllHost 정책 차단, cold font 비용, orphan process·handle 장시간 관찰은 Stage 6 Windows 수용에서 다시 확인한다.
- 현재 generic installer smoke는 Stage 4 등록 로직을 아직 포함하지 않는다. COM/extension registry 등록, 한컴 공존, upgrade/rollback과 conditional restore는 Stage 4 전용 범위다.
- Explorer cache invalidation, 32/96/256/1024 cache size와 DPI, 문서 변경 뒤 갱신, 암호화/미지원 문서의 icon fallback은 Stage 6 exact-SHA 수용 범위다.
- 현재 macOS host에서 Windows COM, GDI, Job Object 또는 bundle 성공을 주장하지 않는다. native 성공 근거는 위 Windows x64 exact-SHA job으로 한정한다.

## 다음 단계 영향

- Stage 4는 검증된 `AlhangeulThumbnailHandler.dll`과 `AlhangeulThumbnailWorker.exe`를 설치 root 고정 이름으로 bundle하고, 그 절대경로만 `InprocServer32`에 등록해야 한다.
- WiX는 HKLM/Registry64, NSIS는 HKCU/Registry64를 소유 범위로 사용하고, extension handler의 기존 값·kind·부재를 snapshot한 뒤 현재 값이 Alhangeul CLSID일 때만 복원해야 한다.
- Stage 4 artifact verifier는 MSI/NSIS와 verification copy의 x64 PE type, cardinality, SHA-256 및 두 resource 포함을 확인해야 한다.
- install/update/uninstall은 association notification만 보내고 Explorer/DllHost를 이름으로 종료하지 않는다. active ProgID, `SystemFileAssociations`, UserChoice와 제3자 sentinel은 보존한다.
- Stage 4 source 수정은 본 보고서와 검증 결과에 대한 작업지시자 승인 뒤에만 시작한다.

## 승인 요청

- Stage 3 산출물과 Windows/Linux exact-SHA 검증 결과를 승인하면 Stage 4의 Windows bundle·등록·공존·rollback 구현으로 진행한다.
