# Task #14 Stage 7.1 완료 보고서

GitHub Issue: [#14](https://github.com/postmelee/alhangeul-tauri/issues/14)
구현계획서: [`task_m010_14_impl.md`](../plans/task_m010_14_impl.md)
Stage: 7.1

## 단계 목적

PR #46 리뷰 댓글 `issuecomment-5449578921`의 재현 가능한 지적을 반영해 dependency resolution, desktop preview 계약, Windows 제거 안전성과 회귀 gate를 보강한다. Windows/Linux exact-SHA workflow가 원격 commit을 입력으로 요구하므로 이 하위 단계는 source candidate와 플랫폼 중립 검증을 먼저 고정하며 Stage 7 전체 완료를 선언하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.gitignore`, `apps/thumbnail-{handler,worker}/Cargo.lock`, `crates/document-preview/Cargo.lock` | 독립 Rust package 3개의 lockfile을 새로 추적한다. |
| `package.json`, `scripts/build-thumbnail-binaries.mjs`, `.github/workflows/alhangeul-desktop.yml` | desktop·preview·worker·handler와 Windows core probe의 Cargo 명령에 `--locked`를 적용한다. |
| `tests/{thumbnail-build,actions-workflows}.test.mjs` | lockfile 존재와 build/test/Clippy의 locked resolution을 source contract로 고정한다. |
| `apps/desktop/src-tauri/{Cargo.lock,src/lib.rs,src/state.rs}` | desktop lock의 package 식별을 명확히 하고 direct preview와 editable render의 HWP/HWPX 동등성, 원본 불변, input·parse error를 검증한다. |
| `crates/document-preview/src/{lib,limits,render}.rs` | 사용되지 않던 preview 선택 API를 제거하고 단일 1,500 ms frame-selection deadline과 font family 초기화 경계를 정리한다. |
| `crates/document-preview/tests/{preview_contract,representative_content}.rs` | 16 MiB SVG 오류와 worker streaming 순서를 직접 검증하고 premultiplied BGRA를 흰 배경 합성 뒤 판정한다. |
| `apps/thumbnail-handler/src/process/mod.rs` | 요청 시작 시각부터 pipe·worker 시작과 frame 선택을 단일 deadline에 포함하고 만료 뒤 늦은 frame을 거부한다. |
| `apps/desktop/src-tauri/windows/{main.wxs,nsis-hooks.nsh}` | thumbnail 등록 해제 실패를 best-effort로 바꾸고 NSIS가 제거 대상 자기 ProgID를 기본값으로 복원하지 않게 한다. PRE hook의 Registry64 유지 의도를 기록한다. |
| `scripts/windows-installer-smoke{,-support}.ps1` | NSIS 제거 직전에 자기 ProgID 기본값 fixture를 만들고 제거 직후 dangling association 부재를 검사한 뒤 제3자 sentinel을 복원한다. |
| `tests/{windows-packaging,windows-installer-smoke,windows-thumbnail-registration}.test.mjs` | MSI/NSIS best-effort 제거, 자기 ProgID snapshot 제외, Registry64와 함수 길이 인식 회귀를 추가한다. |
| `docs/architecture/WINDOWS_THUMBNAILS.md` | desktop direct preview, 단일 deadline, 제거 transaction과 active ProgID 우선순위 한계를 공식 경계로 기록한다. |
| `mydocs/{plans/task_m010_14_impl.md,report/task_m010_14_report.md,orders/20260828.md}` | Stage 7 승인 범위, 현재 진행 상태와 최종 보고서의 deadline·잔여 위험을 정렬한다. |
| `mydocs/working/task_m010_14_stage7.1.md` | 본 source candidate의 산출물, 로컬 검증과 원격 인계 조건을 기록한다. |

기준 commit `f0a2e38aee0ccb00bb54e48b0c273c0ba7cac824`에서 보고서 작성 전 tracked 26개 파일은 283줄 추가·105줄 제거였고, 신규 lockfile 3개는 총 3,760줄이다. 핵심 구현 파일은 `nsis-hooks.nsh` 179줄, installer smoke 본문 216줄·support 124줄, handler process 216줄, preview render 206줄로 권장 파일 상한 안에 있다.

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이므로 사용자 문서 본문에는 해당하지 않는다. `third_party/rhwp` content와 pin `v0.8.4` / `496333b27d21ddb9114ba9ae340bcb895870c9a7`, direct-first·embedded fallback 순서, 대표 문서 render 결과, Explorer cache 소유권은 변경하지 않았다.

desktop direct preview는 편집 변환을 새로 추가하지 않았다. pinned `rhwp`에서 editable 변환 전후 첫 페이지 SVG가 HWP/HWPX 모두 같은지 test로 확인했다. `render.rs`의 font family 변경은 동일한 실존 family를 한 번 계산해 세 generic family에 재사용하는 동등 refactor이며, raster 변경은 제품 bitmap이 아니라 test의 premultiplied pixel 판정만 보정한다.

## 검증 결과

플랫폼 중립 source·format gate:

```bash
git diff --check
cargo fmt --manifest-path crates/document-preview/Cargo.toml -- --check
cargo fmt --manifest-path apps/thumbnail-handler/Cargo.toml -- --check
cargo fmt --manifest-path apps/thumbnail-worker/Cargo.toml -- --check
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml -- --check
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run test:document-preview
pnpm run clippy:document-preview
pnpm run clippy:document-preview:protocol
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked
```

결과:

- OK — `git diff --check`와 네 Rust manifest의 format check가 출력 없이 종료 코드 0으로 통과했다.
- OK — product boundary 272개 파일, 제품 version `0.1.0`, release metadata와 `rhwp v0.8.4` pin·관리 artifact 6개가 일치했다.
- OK — automation 259개와 upstream 35개가 모두 통과했다.
- OK — Studio 23 files / 105 tests와 production build가 통과했다.
- OK — document preview contract·대표 raster 15개와 render/protocol Clippy가 통과했다.
- OK — desktop lib 67개와 Linux-runtime contract 21개, 합계 88개 Rust test가 통과했다. direct preview parity·bounded error test를 포함한다.
- OK — 독립 package 3개와 desktop manifest가 `cargo metadata --locked --offline --no-deps`를 통과했다.
- BOUNDARY — macOS host에서 `x86_64-pc-windows-msvc` worker test를 시도하면 MSVC assembler `ml64.exe` 부재로 link 전에 중단된다. 이는 구현 오류로 성공 처리하지 않으며 Windows runner의 test·Clippy·bundle gate로 넘긴다.

## 잔여 위험

- NSIS macro compile, WiX validation, PowerShell 5.1 smoke와 실제 registry transaction은 source test만으로 완료할 수 없다. 같은 candidate의 Windows x64 artifact build와 fresh installer smoke 성공이 Stage 7 완료 조건이다.
- 등록 해제 실패는 installer가 앱 제거를 막지 않는 source 계약으로 고정했지만 실제 Windows에서는 정상 등록 해제·소유 registry cleanup도 함께 성공해야 한다.
- Windows가 active ProgID handler를 extension ShellEx보다 우선하면 제3자 thumbnail 또는 icon이 표시될 수 있다. 제품은 공존을 위해 `UserChoice`나 제3자 ProgID를 덮어쓰지 않는다.
- renderer·font 결과는 바뀌지 않았으므로 Stage 6.1 VDI 시각 수용은 유지한다. 원격 대표 visual gate가 달라지면 VDI를 다시 수행한다.

## 다음 단계 영향

- 이 보고서와 source를 `Task #14 [Stage 7.1]: PR 리뷰 보정 source candidate`로 묶어 `publish/task14`에 push한다.
- candidate의 CI Unit tests, Linux x64/arm64와 Windows x64 desktop artifact, Windows core probe, MSI/NSIS fresh installer smoke를 exact SHA로 실행한다.
- 원격 gate 성공 뒤 Stage 7 완료 보고서, 최종 보고서, 오늘할일과 PR #46 본문을 새 증적으로 갱신한다. 원격 결과 전에는 Issue close나 PR merge를 수행하지 않는다.

## 승인 요청

- Stage 7.1 source candidate와 로컬 검증 결과를 승인하면 같은 exact SHA의 Windows/Linux 원격 gate로 진행한다.
