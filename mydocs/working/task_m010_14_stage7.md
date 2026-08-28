# Task #14 Stage 7 완료 보고서

GitHub Issue: [#14](https://github.com/postmelee/alhangeul-tauri/issues/14)
구현계획서: [`task_m010_14_impl.md`](../plans/task_m010_14_impl.md)
Stage: 7

## 단계 목적

PR #46 리뷰 댓글 `issuecomment-5449578921`에서 확인한 Cargo dependency resolution, desktop preview 계약, Windows 제거 안전성과 deadline·문서 한계를 보정하고, source candidate `51099615681432862a51691aeb3c65dafd2da541`을 Windows/Linux exact-SHA gate로 검증한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.gitignore`, `apps/thumbnail-{handler,worker}/Cargo.lock`, `crates/document-preview/Cargo.lock` | 독립 Rust package lockfile을 추적하고 Cargo build/test/Clippy에 `--locked`를 적용했다. |
| `apps/desktop/src-tauri/src/{lib,state}.rs`, `crates/document-preview/**` | direct preview와 editable render의 HWP/HWPX 동등성, bounded input·SVG error와 worker streaming 계약을 고정했다. |
| `apps/thumbnail-handler/src/process/mod.rs` | 요청 시작부터 frame 선택까지 단일 1,500 ms deadline을 적용하고 만료 뒤 늦은 frame을 거부한다. |
| `apps/desktop/src-tauri/windows/{main.wxs,nsis-hooks.nsh}` | optional thumbnail unregister 실패를 best-effort로 처리하고 제거 대상 자기 ProgID를 NSIS가 복원하지 않게 했다. |
| `scripts/windows-installer-smoke*.ps1`, `tests/windows-*.test.mjs` | 제거 직전 자기 ProgID fixture와 제거 뒤 dangling association 부재·제3자 sentinel 복원을 검증한다. |
| `docs/architecture/WINDOWS_THUMBNAILS.md`, `docs/operations/DESKTOP_RELEASE.md` | deadline, 제거 transaction, active ProgID 우선순위와 exact-SHA 운영 증적을 기록했다. |
| `mydocs/working/task_m010_14_stage7.1.md` | source candidate와 플랫폼 중립 검증 결과를 원격 gate 전에 고정했다. |

기준 `origin/devel`과 source candidate의 차이는 78개 파일, 11,312줄 추가·243줄 제거다. Stage 7.1 자체는 30개 파일, 4,134줄 추가·105줄 제거이며 추가량 대부분은 신규 Cargo lockfile 3개다.

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이므로 사용자 문서 원문에는 해당하지 않는다. `third_party/rhwp` content와 pin `v0.8.4` / `496333b27d21ddb9114ba9ae340bcb895870c9a7`, direct-first·embedded fallback 순서와 대표 문서 render 결과는 변경하지 않았다. Stage 7의 raster 수정은 제품 bitmap이 아니라 premultiplied BGRA test 판정을 흰 배경 합성 기준으로 바로잡은 것이다.

## 검증 결과

플랫폼 중립 source candidate 검증:

```bash
git diff --check
cargo fmt --manifest-path {crates/document-preview,apps/thumbnail-handler,apps/thumbnail-worker,apps/desktop/src-tauri}/Cargo.toml -- --check
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

- OK — product boundary 272개 파일, 제품 version `0.1.0`, release metadata, `rhwp v0.8.4` pin과 관리 artifact 6개가 일치했다.
- OK — automation 259개, upstream 35개, Studio 23 files / 105 tests와 production build가 통과했다.
- OK — document preview 15개, desktop Rust 88개 test와 관련 Clippy·format·locked offline metadata gate가 통과했다.
- BOUNDARY — macOS host의 Windows MSVC worker link는 `ml64.exe` 부재로 실행할 수 없어 성공으로 처리하지 않고 exact-SHA Windows runner로 넘겼다.

exact-SHA source candidate `51099615681432862a51691aeb3c65dafd2da541` 원격 검증:

- OK — [CI run 33154309226](https://github.com/postmelee/alhangeul-tauri/actions/runs/33154309226)의 Unit tests job `98793335089`가 8분 9초에 성공했다.
- OK — [desktop run 33154321608](https://github.com/postmelee/alhangeul-tauri/actions/runs/33154321608)의 Linux x64 job `98793375935`, Windows x64 job `98793376092`, Linux arm64 job `98793376118`, Windows fresh-installer smoke job `98805510881`이 모두 성공했다.
- OK — Windows core probe, document preview test·Clippy, desktop test·lint, handler/worker build·test·Clippy와 MSI/NSIS bundle inventory가 통과했다.
- OK — MSI와 NSIS에서 HWP `111exam_social.hwp`와 embedded preview가 없는 HWPX `03-blank_hwpx.hwpx`가 요청 edge 256 px, `HRESULT=0`으로 실제 Shell bitmap을 반환했다.
- OK — 두 installer 모두 silent install/uninstall exit `0`, 제거 뒤 owned registry count `0`과 clean state를 확인했다. NSIS는 자기 ProgID를 제거 직전 기본값으로 둔 fixture에서도 `NoDanglingCanonicalDefault=true`였고 `.hwp`/`.hwpx`의 Hancom sentinel을 복원했다.
- OK — fixture 실행 전후 SHA-256 `5B1B2C...BDAE4B`가 같았고 MSI injected rollback은 예상 exit `1603` 뒤 원상복구됐다.

artifact 증적:

| artifact | ID | SHA-256 digest |
|---|---:|---|
| `alhangeul-desktop-windows-x64-installer-smoke` | `9680462259` | `6c51feb8602dbc293363160bdcb94b9f0a7ec65f7353a4d23f80e38eac7840ee` |
| `alhangeul-desktop-windows-x64` | `9680268296` | `19680c69df03d707c2b3d27ca191ff26e1a8d6ed30ba61779a9c8f6ea99bf802` |
| `alhangeul-desktop-linux-x64` | `9679593323` | `ce5f15945f52eb3c7897579a5f75bebe242371326d07a09d2d2426e796f21670` |
| `alhangeul-desktop-linux-arm64` | `9679356860` | `ed7442b17d8acfe75de93a13b616245037e72ba4caff18309c2949e268a5e8ec` |
| `alhangeul-windows-thumbnail-core-diagnostics` | `9679337373` | `6c59c444a73e2624bff355f5f0794646c26e2316d79d6cb49f087f52d1885d4d` |

## 잔여 위험

- Windows는 active ProgID thumbnail handler를 extension ShellEx보다 우선할 수 있다. 한컴 등 제3자 active ProgID가 handler를 소유하면 Alhangeul thumbnail 대신 제3자 thumbnail 또는 icon이 표시될 수 있으며, 제품은 공존을 위해 `UserChoice`나 제3자 ProgID를 강제로 변경하지 않는다.
- Stage 7은 renderer·font 출력을 바꾸지 않았으므로 Stage 6.1 VDI 시각 수용을 반복하지 않았다. exact-SHA 자동 대표 raster와 Windows HWP/HWPX Shell bitmap gate는 다시 통과했지만 모든 DPI·Explorer 보기 크기의 pixel identity를 보장하지 않는다.
- Explorer thumbnail cache는 Windows가 소유한다. uninstall 직후 기존 bitmap이 남을 수 있으며 제품은 Explorer/DllHost 강제 종료나 전역 cache 삭제를 수행하지 않는다.
- artifact는 unsigned이며 2026-09-11 만료된다. 공개 release·서명·배포는 본 Stage 범위가 아니다.

## 다음 단계 영향

- Stage 7 구현과 exact-SHA 검증은 완료됐다. 최종 보고서·오늘할일과 PR #46 본문을 같은 증적으로 정렬한다.
- PR merge와 Issue close는 작업지시자 승인 전에는 수행하지 않는다.

## 승인 요청

- Stage 7 산출물과 검증 결과를 승인하면 PR #46의 최종 검토·merge 단계로 진행한다.
