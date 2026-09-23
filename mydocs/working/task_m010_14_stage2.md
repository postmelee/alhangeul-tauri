# Task #14 Stage 2 완료보고서 — 공유 document preview core와 desktop adapter

GitHub Issue: [#14](https://github.com/postmelee/alhangeul-tauri/issues/14)
구현계획서: [`task_m010_14_impl.md`](../plans/task_m010_14_impl.md)
Stage: 2

## 단계 목적

Windows Explorer thumbnail worker와 COM handler를 구현하기 전에 문서 bytes에서 첫 페이지를 만드는 플랫폼 중립 core를 desktop에서 분리하고, Stage 1에서 확정한 resource budget과 direct-first 선택 규칙을 공유 계약으로 고정하는 단계다.

`crates/document-preview`는 filesystem path, write, Tauri, COM과 Windows type을 알지 않는 bytes-only crate로 추가했다. 기존 desktop `render_document_preview`는 이 crate의 direct SVG API를 호출하도록 얇게 변경하고, worker·handler가 이어받을 protocol frame과 limit 검증을 독립적으로 사용할 수 있게 feature 경계를 나눴다.

계획 당시 검토한 Cargo workspace 확장은 workspace root 밖 package를 member로 둘 수 없는 Cargo 제약 때문에 적용할 수 없었다. 작업지시자 승인에 따라 desktop은 기존 standalone package로 유지하고 공유 crate를 path dependency로 연결했으며, 공유 crate 검증은 standalone manifest와 desktop target directory를 명시하는 최소 보정으로 계획서를 갱신했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `crates/document-preview/Cargo.toml` | `protocol`/`limits`를 기본 제공하고 `rhwp`·`resvg`·`image`는 `render` feature에서만 활성화하는 standalone crate manifest를 추가했다. |
| `crates/document-preview/src/lib.rs` | 공유 오류형과 공개 API 경계를 정의했다. |
| `crates/document-preview/src/limits.rs` | 입력 64 MiB, 요청 1024 px, SVG/preview 16 MiB, bitmap payload 4 MiB, 전체 frame 4,194,368 B, worker memory 256 MiB, direct/전체 deadline 1,500/2,000 ms를 Stage 1 결정과 동일하게 고정했다. |
| `crates/document-preview/src/protocol.rs` | 고정 64 B `ALHGTHM` frame의 version, kind, length, dimension, stride, reserved, hash를 allocation 전에 검증하는 encode/decode 계약을 구현했다. |
| `crates/document-preview/src/render.rs` | `DocumentCore::from_bytes`와 `render_page_svg_native(0)`을 이용한 first-page direct SVG, bounded embedded preview, direct 성공 우선/failure 시 preview fallback 결정을 구현했다. |
| `crates/document-preview/tests/preview_contract.rs` | 정상·preview 없음·stale·손상·미지원·초과 입력 fixture, direct 우선순위, 결정성, 원본 불변, frame 공격 입력을 8개 통합 테스트로 고정했다. |
| `apps/desktop/src-tauri/{Cargo.toml,Cargo.lock}` | desktop standalone package에 공유 crate의 명시적 `render` path dependency를 연결했다. |
| `apps/desktop/src-tauri/src/{commands,state}.rs` | desktop command가 editable conversion 없이 공유 direct SVG helper를 호출하도록 adapter와 focused test를 추가했다. |
| `scripts/check-product-boundary.mjs` | 공유 crate에서 filesystem/process/network, Tauri, COM/Windows type과 dependency를 거부하는 source/manifest gate를 추가했다. |
| `tests/product-boundary.test.mjs` | bytes-only 허용과 filesystem·Tauri·Windows integration 위반 거부 계약 4개를 추가했다. |
| `.github/workflows/{ci,alhangeul-desktop}.yml` | shared test, render clippy, protocol-only clippy, desktop test·clippy를 Windows/Linux exact-SHA native gate에 추가했다. |
| `tests/actions-workflows.test.mjs`, `package.json` | workflow 단계 순서와 새 boundary test·Rust 명령 inventory를 자동화 계약에 연결했다. |
| `mydocs/plans/task_m010_14_impl.md` | Cargo 제약에 따른 승인된 standalone/path dependency 구성과 Stage 2 검증 명령을 반영했다. |
| `mydocs/orders/20260824.md` | Stage 2 완료·Stage 3 승인 대기로 갱신했다. |
| `mydocs/working/task_m010_14_stage2.md` | Stage 2 구현, exact-SHA 검증, 잔여 위험과 다음 단계 인계 사항을 기록했다. |

Stage 2 source commit은 `d2290c67e8636068b56f2f2ad70108b73d164fdf`이며, Stage 1 완료점 대비 18개 파일에 976줄 추가·50줄 삭제가 반영됐다.

## 본문 변경 정도 / 본문 무손실 여부

코드·테스트·workflow·내부 계획 문서 작업이다. 제품 공식 문서는 수정하지 않았고 `third_party/rhwp` gitlink와 내용도 변경하지 않았다. pin은 `v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`로 유지했다.

기존 desktop command의 요청/응답 API와 standalone `Cargo.lock`·target 위치를 보존했다. 내부 render 경로만 editable document conversion에서 공유 direct first-page API로 교체했다. 검증 fixture는 호출 전후 원본 bytes와 파일 SHA-256·크기·mtime이 동일함을 확인하므로 문서 입력을 수정하지 않는다.

Stage 3 범위인 worker process, anonymous pipe, Job Object, COM entry point, `HBITMAP`, hard timeout은 이번 단계에서 구현하지 않았다.

## 검증 결과

구현계획서의 Stage 2 Windows/Linux 명령:

```bash
cargo test --manifest-path crates/document-preview/Cargo.toml --target-dir apps/desktop/src-tauri/target
cargo clippy --manifest-path crates/document-preview/Cargo.toml --target-dir apps/desktop/src-tauri/target --all-targets -- -D warnings
cargo clippy --manifest-path crates/document-preview/Cargo.toml --target-dir apps/desktop/src-tauri/target --no-default-features --lib -- -D warnings
cd apps/desktop/src-tauri
cargo test
cargo clippy -- -D warnings
```

GitHub Actions exact-SHA 증적:

- run: [32697552258](https://github.com/postmelee/alhangeul-tauri/actions/runs/32697552258), conclusion `success`
- exact source SHA: `d2290c67e8636068b56f2f2ad70108b73d164fdf`
- Linux arm64 job `97342450600`: success, 14분 4초
- Linux x64 job `97342450735`: success, 23분 32초
- Windows x64 job `97342450874`: success, 40분 11초
- Windows x64 installer smoke job `97350247132`: success, 50초
- 세 build job 모두 exact commit 확인, shared test, render clippy, protocol-only clippy, desktop test·clippy, Tauri bundle, artifact 검증·업로드 단계가 success
- Windows installer smoke는 exact commit 확인, Windows x64 bundle download, installer 실행과 final gate가 모두 success

공유 통합 테스트 결과:

- OK — `preview_contract` 8/8 통과
- OK — 정상 HWP/HWPX direct render가 결정적이며 원본 bytes·SHA-256·크기·mtime 불변
- OK — preview 없음·stale preview에서도 direct 결과 우선
- OK — direct 실패 때만 유효 embedded preview fallback 선택
- OK — unknown version/kind, oversize, reserved, truncated, stride overflow/mismatch, hash mismatch frame 거부
- OK — default `render`와 `--no-default-features --lib` 두 clippy 조합 모두 warning 0
- OK — desktop Rust test 87개와 desktop clippy 통과

현재 macOS host에서는 위 Rust 실행 결과를 완료 판정 근거로 사용하지 않았다. 개발 중 동일 공유 테스트 8개와 desktop Rust test 87개를 진단 실행했고, 완료 판정은 위 Windows/Linux exact-SHA jobs로 한정했다.

플랫폼 중립 명령:

```bash
node --test tests/product-boundary.test.mjs
node --test tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run check:rhwp-pin
git diff --check
```

결과:

- OK — product boundary test 4/4, workflow contract test 13/13, 합계 17/17 통과
- OK — product boundary 229개 파일 검사 통과
- OK — `rhwp v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개 pin 검증 통과
- OK — `git diff --check` 출력 없이 종료 코드 0
- OK — exact-SHA run 완료 뒤 임시 remote ref `codex/task14-stage2-probe` 제거 및 부재 확인

## 잔여 위험

- Stage 2의 direct/preview 결정은 같은 process의 공유 함수 계약이다. worker spawn·pipe 전송·timeout·crash·protocol violation에서 동일 결정이 유지되는지는 Stage 3 Windows native test가 필요하다.
- 256 MiB Job committed memory, active process 1, kill-on-close와 1,500/2,000 ms deadline은 아직 실제 Job Object에 적용하지 않았다.
- protocol은 frame 산술·hash·payload를 검증하지만 COM DLL의 bounded `IStream` read와 worker lifecycle, top-down premultiplied BGRA 및 GDI ownership은 Stage 3 범위다.
- pinned upstream fixture 밖의 복잡 문서와 Explorer size/DPI/cache 분포는 Stage 6 exact-SHA 수용에서 검증한다.
- 현재 macOS host에서 Windows COM, registry 또는 native bundle 성공을 주장하지 않는다. Windows/Linux 근거는 위 exact-SHA GitHub jobs로 한정한다.

## 다음 단계 영향

- Stage 3 worker는 공유 crate의 `render` feature를 사용해 direct-first bitmap을 만들고, handler는 `--no-default-features` protocol/limits만 사용해 `rhwp`, SVG/image decoder와 Tauri를 link하지 않는다.
- handler는 입력 64 MiB 초과를 worker spawn 전에 거부하고, 전체 frame 4,194,368 B와 dimension·stride·hash를 allocation 전에 검증한다.
- worker/handler는 독립 manifest로 추가하며 desktop workspace member로 편입하지 않는다. Windows x64 MSVC 이외 target은 build helper가 fail-closed한다.
- Stage 3에서 anonymous pipe, Job Object limits, hard timeout, worker crash·protocol violation fallback, COM class/object lock, `CreateDIBSection`과 GDI ownership을 구현·검증한다.
- 임시 remote ref `codex/task14-stage2-probe`는 exact-SHA workflow 성공 뒤 제거했다. `local/task14` 격리 worktree와 branch는 다음 승인까지 보존한다.

## 승인 요청

- Stage 2 산출물과 Windows/Linux exact-SHA 검증 결과를 승인하면 Stage 3의 제한 worker와 COM Thumbnail Handler 구현으로 진행한다.
