# Task #14 Stage 6.1 완료 보고서

GitHub Issue: [#14](https://github.com/postmelee/alhangeul-tauri/issues/14)
구현계획서: [`task_m010_14_impl.md`](../plans/task_m010_14_impl.md)
Stage: 6.1

## 단계 목적

Stage 6 Windows VDI 수동 수용에서 확인한 첫 페이지 text 누락을 보정한다. `postmelee/alhangeul-macos` commit `7162a80fdadf4e121623be1da9c1a7d933ef0fac`의 native first-page, process-local bundled font, 실존 family fallback과 구조 누락 hard gate 원칙을 Windows의 `rhwp` SVG→BGRA worker에 이식한다. 대표 HWP/HWPX 문서의 text/image/table을 자동 visual gate와 실제 설치 후 Explorer에서 함께 수용한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `crates/document-preview/Cargo.toml` | `resvg`의 `text`, `raster-images` feature를 공유 raster가 직접 소유하도록 고정했다. |
| `crates/document-preview/src/render.rs` | pinned NotoSansKR 두 TTF의 process-local font database와 실존 family fallback을 추가했다. 일회성 worker의 system font directory scan은 제거했다. |
| `crates/document-preview/tests/representative_content.rs` | 온새미로, `biz_plan`, `form-002`의 SVG 구조와 text/background/table 영역 raster content를 독립 검증한다. |
| `tests/thumbnail-build.test.mjs` | render feature, 번들 font, 무 system-font scan과 desktop bundle license 계약을 고정한다. |
| `assets/fonts/FONTS.md` | 두 NotoSansKR TTF의 출처, SHA-256, SIL OFL 1.1과 worker 사용 경계를 기록했다. |
| `docs/DEVELOPMENT.md` | 대표 thumbnail visual gate 명령을 개발 검증 목록에 추가했다. |
| `docs/architecture/WINDOWS_THUMBNAILS.md` | font-aware raster, cold-start font 경계, exact-SHA 자동·VDI 수용 결과를 공식 아키텍처에 반영했다. |
| `mydocs/plans/task_m010_14_impl.md` | Stage 6.1 진입 근거, macOS 참조 결정, 후보별 실패·보정과 최종 수용 증적을 기록했다. |
| `mydocs/orders/20260826.md` | Stage 6 VDI 시각 누락과 Stage 6.1 진입 상태를 기록했다. |
| `mydocs/orders/20260827.md` | 대표 visual gate와 worker cold font 보정 진행 상태를 기록했다. |
| `mydocs/orders/20260828.md` | exact-SHA 자동 gate와 VDI 시각 수용 완료를 기록했다. |
| `mydocs/working/task_m010_14_stage6_1.md` | 본 단계의 산출물, 검증, 잔여 위험과 다음 절차를 기록한다. |

Stage 6 기준 commit `d522ad635c220108c7260732c6ad23ff504f2f63`부터 최종 source candidate `2a1a9c556fdb844ecea4fddb0a6336d9d9481078`까지 10개 파일에 269줄을 추가하고 4줄을 제거했다. 핵심 구현 파일은 `render.rs` 226줄, 대표 visual test 72줄로 권장 파일 상한 안에 있다.

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이므로 사용자 문서 본문을 수정하지 않는다. 공유 bytes-only API, handler protocol-only 경계, direct-first 선택 순서, HWP/HWPX 원본 page aspect ratio와 Explorer cache 소유권은 보존했다. `third_party/rhwp` content와 Stable pin `v0.8.2` / `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`는 변경하지 않았다.

한컴·HY·Microsoft proprietary font는 복사하거나 번들하지 않았다. pinned `rhwp`가 보유한 SIL OFL 1.1 NotoSansKR TTF 두 파일만 worker binary의 process-local fallback으로 포함했다. desktop editor·PDF의 system font 경계는 변경하지 않았다.

## 검증 결과

플랫폼 중립 source·format gate:

```bash
cargo fmt --manifest-path crates/document-preview/Cargo.toml -- --check
node --test tests/product-boundary.test.mjs tests/thumbnail-build.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run check:rhwp-pin
git diff --check
```

결과:

- OK — `cargo fmt`와 `git diff --check`가 출력 없이 종료 코드 0으로 통과했다.
- OK — focused Node contract 27개가 모두 통과했다.
- OK — product boundary 263개 파일 검사가 통과했다.
- OK — `rhwp` pin `v0.8.2` / `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, artifact 6개가 일치했다.

exact-SHA hosted gate:

- OK — source candidate `2a1a9c556fdb844ecea4fddb0a6336d9d9481078`의 [Alhangeul CI run 33044851424](https://github.com/postmelee/alhangeul-tauri/actions/runs/33044851424)가 성공했다. document preview test·Clippy, protocol-only Clippy, desktop test·Clippy를 포함한다.
- OK — 같은 SHA의 [Desktop Artifact Build run 33044853129](https://github.com/postmelee/alhangeul-tauri/actions/runs/33044853129)가 성공했다. Linux x64 job `98426376041`, Linux arm64 job `98426376306`, Windows x64 job `98426376316`이 모두 성공했다.
- OK — Windows core probe가 성공했다. native SVG direct 관측 최대는 83 ms이고 이 값은 SVG→BGRA raster가 아니라 native SVG 생성 단계의 계측이다.
- OK — fresh-install smoke job `98431213787`이 MSI·NSIS 설치, NSIS 재설치, 등록, 제거와 기존 연결 복원을 통과했다. 두 installer 모두 `111exam_social.hwp`와 embedded preview가 없는 `03-blank_hwpx.hwpx`의 실제 256 px Shell bitmap을 `HRESULT=0`으로 반환했다.
- OK — Windows artifact digest는 `sha256:091e935705163e4da9742b42ecb0e1d35b9b57dd59c96dd40ac3cc7c8d932107`이다. NSIS는 52,949,417 bytes / `cb748de43f61a9afbdd4724b60dd33598722d9dcd76c3d3896686e07c2f3d73f`, MSI는 59,219,968 bytes / `cdeb1081612d485b5c00444f472ed370c7c9f249b337268487b8768a45beee19`로 inventory 재검증을 통과했다.

Windows VDI 수동 gate:

- OK — exact-SHA NSIS 설치 뒤 온새미로, `biz_plan`, `form-002`에서 text/background/table과 HWP/HWPX 첫 페이지 비율이 Explorer 아주 큰 아이콘 보기에 보존됐다.
- OK — uninstall 뒤 남은 이미지는 Windows thumbnail cache 또는 복원된 한컴 handler 결과이며, automated smoke에서 Alhangeul handler 제거와 기존 연결 복원을 확인했다.
- OK — 복학원서 왼쪽 위 검은 세부는 원래 존재하는 고려대학교 문장과 wordmark다. `third_party/rhwp/samples/복학원서.pdf`와 upstream 기대 이미지의 위치·내용과 일치하며 256 px 축소에서 세밀한 선이 뭉쳐 보이는 허용 가능한 결과로 판정했다.
- OK — 작업지시자가 2026-08-28 VDI 결과를 확인하고 다음 절차 진행을 승인했다.

## 잔여 위험

- 원본 proprietary font가 worker database에 없으면 NotoSansKR 대체에 따라 글자 metric과 줄바꿈이 원본 앱과 달라질 수 있다. 한글 glyph 누락은 대표 visual gate로 방지하지만 모든 proprietary font 조합의 pixel identity를 보장하지 않는다.
- 매우 작은 Explorer thumbnail에서는 복학원서 문장처럼 고밀도 흑백 로고의 세부 선이 뭉쳐 보일 수 있다. 원본 구조·위치가 유지되는 범위에서 허용한다.
- Explorer thumbnail cache는 Windows가 소유하므로 uninstall 직후 이전 bitmap이 남을 수 있다. 제품은 전역 cache를 삭제하거나 Explorer를 강제 종료하지 않는다.
- 검증 installer는 unsigned test artifact다. 공개 배포, 코드 서명, release tag, GitHub Release, package 게시와 updater는 승인되지 않았다.

## 다음 단계 영향

- Issue #14의 구현 Stage는 모두 종료됐으며 다음 절차는 최종 결과 보고서 작성과 `devel` 대상 PR 게시다.
- 최종 보고서는 source candidate SHA `2a1a9c556fdb844ecea4fddb0a6336d9d9481078`, CI run `33044851424`, desktop run `33044853129`, installer smoke job `98431213787`과 VDI 수용을 진실 원천으로 사용한다.
- 본 단계 보고 커밋은 문서·오늘할일만 추가 갱신하며, 검증된 source candidate와 artifact의 결속을 변경하지 않는다.

## 승인 요청

- Stage 6.1 산출물과 검증 결과를 승인하면 `task-final-report` 절차로 최종 보고서와 `devel` 대상 PR 게시를 진행한다.
