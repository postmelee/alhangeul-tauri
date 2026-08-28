# Task #14 최종 결과 보고서

GitHub Issue: [#14](https://github.com/postmelee/alhangeul-tauri/issues/14)
마일스톤: M010

## 작업 요약

- 대상 이슈: #14
- 마일스톤: M010
- 단계 수: 계획 7단계(Stage 1~6 및 시각 보정 Stage 6.1), 완료 보고서 6개(Stage 6 수용과 보정을 Stage 6.1에 통합)
- 작업 목적: Windows Explorer에서 HWP/HWPX 문서의 실제 첫 페이지를 안전한 out-of-process handler로 표시하고, 기존 한컴 연결과 설치·제거 transaction을 보존한다.

`postmelee/alhangeul-macos`의 native first-page, process-local font와 구조 누락 hard gate 원칙을 Windows COM/worker 경계에 이식했다. COM DLL은 문서 엔진이나 rasterizer를 link하지 않고 제한 worker의 검증된 BGRA만 `HBITMAP`으로 반환한다. MSI와 NSIS는 각 owner scope에서 기존 thumbnail handler를 snapshot·조건부 복원하며 Explorer나 `dllhost.exe`를 강제 종료하지 않는다.

Stage 6 VDI에서 발견한 text 누락은 Stage 6.1의 `resvg` text/raster feature와 pinned NotoSansKR process-local fallback으로 보정했다. 온새미로, `biz_plan`, `form-002`, 복학원서에서 첫 페이지 구조·text·table·logo를 자동 gate와 Windows VDI로 수용했다. PR 직전 최신 `devel`의 `rhwp v0.8.4`를 merge commit `45ece87d6d9751372463e8db8b788d77ced16a23`에 통합하고 플랫폼 중립·원격 native gate를 다시 실행했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `crates/document-preview/**` | bytes-only first-page SVG/embedded preview, resource limit, 64-byte IPC protocol, font-aware raster와 대표 fixture gate | desktop preview와 Windows worker가 공유하는 문서 해석·raster 경계 |
| `apps/thumbnail-worker/**` | direct-first render, preview fallback과 bounded BGRA 응답 | Explorer 밖 별도 process의 HWP/HWPX parse·render |
| `apps/thumbnail-handler/**` | COM class factory/provider, stream 제한, Job Object, pipe 검증, `HBITMAP`, registry transaction | Windows Explorer x64 thumbnail provider와 장애 격리 |
| `apps/desktop/src-tauri/**` | 공유 preview adapter, Windows resource bundle, WiX/NSIS 등록·rollback·제거 | 기존 desktop preview와 MSI/NSIS 설치·제거 |
| `.github/workflows/{ci,alhangeul-desktop}.yml` | shared Rust test/Clippy, handler·worker build/test/Clippy, core probe와 fresh installer smoke | Linux CI 및 Windows/Linux exact-SHA native gate |
| `scripts/{benchmark-thumbnail-core,build-thumbnail-binaries,windows-installer-smoke*,windows-thumbnail-smoke}.ps1`, `scripts/build-thumbnail-binaries.mjs` | resource probe, x64 PE staging, 등록·공존·rollback과 실제 Shell bitmap 검증 | 자동 검증과 artifact inventory |
| `tests/**thumbnail**`, `tests/windows-*.test.mjs`, `tests/actions-workflows.test.mjs`, `tests/product-boundary.test.mjs` | source·workflow·packaging·registration 계약 고정 | 플랫폼 중립 회귀 방지 |
| `assets/fonts/FONTS.md`와 pinned NotoSansKR TTF | SIL OFL 출처·hash와 worker 전용 fallback | 첫 페이지 한글 text raster, desktop editor/PDF font 경계에는 영향 없음 |
| `README.md`, `docs/README.md`, `docs/DEVELOPMENT.md` | 지원 상태, 개발·검증 진입점과 문서 index | 사용자·기여자 안내 |
| `docs/architecture/{WINDOWS_THUMBNAILS,UPSTREAM}.md` | COM/worker/IPC/resource/font/cache/registry와 upstream 경계 | 장기 아키텍처 계약 |
| `docs/operations/DESKTOP_RELEASE.md` | artifact·installer·thumbnail smoke와 수동 수용 증적 | 운영·prerelease 검증 경계 |
| `mydocs/plans/task_m010_14*.md`, `mydocs/working/task_m010_14_stage*.md`, `mydocs/orders/2026082*.md` | 승인 계획, 단계별 증적과 진행 이력 | Hyper-Waterfall 내부 추적 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 | `README.md` | OK | 저장소 첫 화면의 기능 상태만 요약한다. |
| Windows thumbnail architecture | `docs/architecture/` | `docs/architecture/WINDOWS_THUMBNAILS.md` | OK | COM/worker/cache/registry 장기 계약을 독립 문서로 둔다. |
| upstream 경계 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | 공유 `rhwp` parse·render adapter 경계만 보강한다. |
| 개발 절차 | `docs/` | `docs/DEVELOPMENT.md` | OK | Windows build/test 명령과 지원 host 제약을 기록한다. |
| 배포 절차 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | artifact·installer·Explorer gate와 비배포 경계를 기록한다. |
| 문서 index | `docs/` | `docs/README.md` | OK | 새 architecture 문서를 기존 index에 연결한다. |
| 단계 보고 | `mydocs/working/` | `mydocs/working/task_m010_14_stage*.md` | OK | 단계별 승인·검증 증적을 내부 작업 문서로 보존한다. |
| 최종 보고 | `mydocs/report/` | `mydocs/report/task_m010_14_report.md` | OK | 장기 보관할 전체 결과와 PR 승인 근거를 둔다. |

## 변경 전·후 정량 비교

아래 diff 수치는 최종 보고서 자체를 제외한 통합 source candidate `45ece87d6d9751372463e8db8b788d77ced16a23`와 `origin/devel`의 비교다.

| 지표 | 변경 전 | 변경 후 |
|---|---:|---:|
| Issue #14 고유 변경 | 0개 파일 | 72개 파일, +7,153 / -234줄 |
| Explorer thumbnail 실행 파일 | 없음 | x64 COM DLL 1개 + 제한 worker EXE 1개 |
| 공유 first-page preview core | 없음 | protocol/limit 기본 경계 + 선택적 render feature 1개 crate |
| 대표 시각 회귀 fixture | 없음 | 온새미로 HWP, `biz_plan.hwp`, `form-002.hwpx` 3개 |
| 입력 stream 상한 | 없음 | 64 MiB, 초과 시 worker 미기동 |
| 요청 edge / 최종 bitmap 상한 | 없음 | 1~1,024 px / 1,048,576 pixels |
| worker deadline / commit memory | 없음 | 요청 시작·frame 선택 1,500 ms / 256 MiB |
| 플랫폼 중립 automation 계약 | thumbnail 전용 계약 없음 | 전체 256개 통과, product boundary 272개 파일 검사 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| HWP/HWPX 첫 페이지 direct render와 검증된 embedded preview fallback | OK — 공유 core의 우선순위·원본 불변 test와 대표 문서 SVG/raster 영역 gate가 통과했다. |
| COM DLL과 문서 엔진의 process 격리 | OK — handler는 protocol-only dependency이며 worker 절대경로, Job Object, bounded pipe와 deadline 계약을 source/native test로 확인했다. |
| frame·pixel·memory·time resource 제한 | OK — allocation 전 header/hash/length/overflow 검증과 Stage 1 Windows 실측으로 상한을 고정했다. |
| 기존 한컴 handler/default app 공존과 조건부 복원 | OK — HKLM/HKCU Registry64 snapshot, MSI rollback, NSIS install/reinstall/uninstall과 제3자 sentinel smoke가 통과했다. |
| 실제 Windows Shell bitmap 반환 | OK — hosted Windows fresh-install smoke가 HWP와 embedded preview 없는 HWPX를 MSI·NSIS에서 `HRESULT=0`으로 반환했다. |
| text/image/table을 포함한 대표 첫 페이지 시각 수용 | OK — Stage 6.1 exact candidate의 자동 visual gate와 Windows VDI Explorer 아주 큰 아이콘 보기가 통과했다. 복학원서 왼쪽 위 검은 세부는 원본 고려대학교 문장·wordmark의 허용 가능한 256 px 축소로 판정했다. |
| 제거 뒤 handler 정리와 기존 연결 복원 | OK — automated uninstall registry 검증이 통과했다. VDI에서 제거 직후 남은 bitmap은 Windows cache 또는 복원된 한컴 handler 소유이며 제품이 전역 cache를 삭제하지 않는 정책과 일치한다. |
| 최신 `devel` / `rhwp v0.8.4` 통합 | OK — candidate `45ece87d6d9751372463e8db8b788d77ced16a23`의 CI와 Linux x64/arm64·Windows x64 artifact build, Windows fresh-install smoke가 모두 성공했다. |

플랫폼 중립 최종 통합 검증:

| 명령 | 결과 |
|---|---|
| `cargo fmt --manifest-path crates/document-preview/Cargo.toml -- --check` | OK |
| `git diff --cached --check` | OK |
| `pnpm run check:product-boundary` | OK — 272개 파일 |
| `pnpm run check:product-version` | OK — `0.1.0` |
| `pnpm run check:release-metadata` | OK — Alhangeul `0.1.0` |
| `pnpm run check:rhwp-pin` | OK — `v0.8.4` / `496333b27d21ddb9114ba9ae340bcb895870c9a7`, 관리 artifact 6개 |
| `pnpm run test:automation` | OK — 256개 |
| `pnpm run test:upstream` | OK — 35개 |
| `pnpm run test:studio` | OK — 23 files / 105 tests |
| `pnpm run build:studio` | OK |

exact-SHA 원격 검증:

- Stage 6.1 source candidate `2a1a9c556fdb844ecea4fddb0a6336d9d9481078`: [CI run 33044851424](https://github.com/postmelee/alhangeul-tauri/actions/runs/33044851424), [desktop run 33044853129](https://github.com/postmelee/alhangeul-tauri/actions/runs/33044853129), fresh installer smoke job `98431213787`이 성공했다.
- 최신 `devel` 통합 candidate `45ece87d6d9751372463e8db8b788d77ced16a23`: [CI run 33145454468](https://github.com/postmelee/alhangeul-tauri/actions/runs/33145454468)의 Unit tests job `98765344112`와 [desktop run 33145456661](https://github.com/postmelee/alhangeul-tauri/actions/runs/33145456661)의 Linux arm64 job `98765348512`, Linux x64 job `98765348748`, Windows x64 job `98765348807`, fresh installer smoke job `98774647146`이 모두 성공했다. Windows 설치물 artifact digest는 `sha256:4bbe8876930e3370a6a057dc9cd2d21efda7f575446b2c8c5d7d6000bfacb534`, installer smoke 진단 digest는 `sha256:a154cebc2d4a37de4a9d03a5739296862794e5265e3d0a0a07d4cdfbf41575e1`이다.

### 단계별 검증 결과

- Stage 1: [`task_m010_14_stage1.md`](../working/task_m010_14_stage1.md) — Windows core probe로 11개 fixture, registry precedence와 resource budget을 확정했다.
- Stage 2: [`task_m010_14_stage2.md`](../working/task_m010_14_stage2.md) — bytes-only 공유 preview core, protocol/limit과 desktop direct adapter를 분리했다.
- Stage 3: [`task_m010_14_stage3.md`](../working/task_m010_14_stage3.md) — 제한 worker, COM provider, Job Object/pipe/bitmap native 계약을 구현·검증했다.
- Stage 4: [`task_m010_14_stage4.md`](../working/task_m010_14_stage4.md) — MSI/NSIS 등록·공존·rollback·제거와 실제 Shell bitmap smoke를 통과했다.
- Stage 5: [`task_m010_14_stage5.md`](../working/task_m010_14_stage5.md) — 플랫폼 중립 회귀와 architecture/development/release 문서를 정렬했다.
- Stage 6·6.1: [`task_m010_14_stage6_1.md`](../working/task_m010_14_stage6_1.md) — Stage 6 VDI의 text 누락을 font-aware raster로 보정하고 대표 자동 gate와 Windows VDI를 재수용했다. 별도 Stage 6 보고서는 결함 발견 시점의 중간 수용을 완료로 고정하지 않고 최종 Stage 6.1 보고서에 통합했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- proprietary 한컴·HY·Microsoft font를 번들하지 않으므로 원본 font가 없는 환경에서는 NotoSansKR fallback에 따라 metric과 줄바꿈이 원본 앱과 다를 수 있다. 대표 gate는 glyph/text 누락을 막지만 모든 font 조합의 pixel identity를 보장하지 않는다.
- 작은 thumbnail에서 복학원서 문장처럼 고밀도 흑백 logo의 세부 선이 뭉쳐 보일 수 있다. 원본 구조·위치가 유지되는 범위에서 허용한다.
- Explorer thumbnail cache는 Windows가 소유하므로 uninstall 직후 이전 bitmap이 남을 수 있다. 제품은 Explorer/DllHost 강제 종료나 전역 cache 삭제를 수행하지 않는다.
- Windows가 active ProgID의 thumbnail handler를 extension ShellEx보다 우선하면 제3자 thumbnail 또는 icon이 표시될 수 있다. 한컴 2024 설치 여부와 active ProgID handler 존재 여부는 같지 않으며, Alhangeul은 공존을 위해 `UserChoice`나 제3자 ProgID를 강제로 변경하지 않는다.
- VDI 수동 시각 수용은 Stage 6.1 `rhwp v0.8.2` exact candidate에서 수행했다. 최신 `devel` 통합 candidate는 같은 대표 fixture의 자동 SVG/raster와 Windows Shell bitmap gate를 다시 통과시켜 engine 통합을 검증하지만, 사람이 보는 VDI 설치는 반복하지 않았다.
- 검증 installer는 unsigned Actions artifact다. 공개 release, 서명, package 게시와 updater는 승인 범위가 아니다.

### 후속 작업 후보

- 공개 후보를 결정하는 별도 작업에서 코드 서명, 다중 DPI·Explorer 보기 크기와 cache invalidation의 확장 수용을 수행한다.
- 현재 task는 첫 릴리스 필수 범위에서 제외된 상태를 보존하며, PR merge가 자동 release나 배포를 의미하지 않는다.

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 승인하면 `devel` 대상 PR의 검토·merge를 진행한다.
