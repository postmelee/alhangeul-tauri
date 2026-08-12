# Task #13 최종 보고서 — upstream-first Studio와 native HWPX·PDF 통합

GitHub Issue: [#13](https://github.com/postmelee/alhangeul-tauri/issues/13)
마일스톤: M010

## 작업 요약

- 대상 이슈: #13
- 마일스톤: M010
- 단계 수: 6
- 작업 목적: `rhwp v0.8.2` Studio 전체 bundle을 제품 entry로 사용하면서 Windows/Linux에 필요한 Tauri lifecycle, HWP/HWPX 저장과 searchable PDF 경계만 얇은 adapter로 유지한다.

Stage 6의 이전 기능 수용 exact SHA는 `63a2703cebf3a79d11a010974203fdaf4ccd3e76`이다. 이 SHA의
Windows/Linux CI·native bundle·Windows installer smoke와 수동 GUI 결과는 Stage 6 이력으로
보존한다. PR 리뷰로 제품 코드가 Stage 6.7에서 다시 변경됐으므로 기존 artifact를 최종 후보로
재사용하지 않고 보정 commit의 새 Windows/Linux exact 검증을 요구한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/studio-host/` | local Studio 복제본을 제거하고 exact upstream entry와 leaf adapter, lifecycle·save·toolbar state coordinator를 연결 | Studio UI, 문서 open·drag-in·recent·dirty·save·PDF |
| `apps/desktop/src-tauri/` | format-aware HWP/HWPX 저장, SVG page PDF job, bundled fallback font와 searchable text audit를 Rust command에 구성 | Windows/Linux native filesystem·save·PDF |
| `assets/fonts/` | Noto Sans/Serif KR PDF fallback과 OFL 원문·provenance를 번들에 추가 | 최소 Linux 한글 UI/PDF fallback과 배포 고지 |
| `.github/workflows/`, `scripts/`, `tests/` | pinned tag fetch, release metadata, exact native artifact·installer 검증을 고정 | CI와 Windows/Linux bundle gate |
| `README.md`, `docs/architecture/`, `docs/operations/` | upstream 소유 경계, local font, release/prerelease 의존 조건을 현재 구현과 정렬 | 제품·아키텍처·release 운영 문서 |
| `mydocs/` | 계획, Stage 1~6 결과, exact SHA 판정과 후속 Issue #15 의존성을 기록 | 하이퍼-워터폴 추적 문서 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 제품 기능 | 저장소 루트 | `README.md` | OK | 수행계획서의 제품 기능 위치와 일치하고 실제 수용 범위만 반영했다. |
| upstream 계약 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | exact entry·허용 adapter·drift guard를 장기 아키텍처 문서에 기록했다. |
| 로컬 폰트 | `docs/architecture/` | `docs/architecture/LOCAL_FONTS.md` | OK | host provider와 fallback 경계를 기존 공식 문서에서 보정했다. |
| 번들 폰트·고지 | `assets/fonts/` | `assets/fonts/pdf/`, `assets/fonts/licenses/`, `assets/fonts/FONTS.md` | OK | 원본 release·SHA-256·저작권·OFL과 실제 binary 위치가 일치한다. |
| release gate | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | exact run과 Task #15 뒤 새 후보가 필요하다는 조건을 기록했다. |
| 단계·최종 보고 | `mydocs/working/`, `mydocs/report/` | `task_m010_13_stage{1..6}.md`, `task_m010_13_report.md` | OK | 승인된 task 산출물 위치와 일치한다. |

신규 `mydocs/tech/`·`mydocs/manual/` 문서는 만들지 않았다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 전체 diff | Task #13 변경 없음 | 124 files, 5,727 insertions, 10,273 deletions(바이너리 제외) |
| Studio entry 소유 | local `index.html`·`main.ts`·toolbar/view/dialog 복제 | `rhwp v0.8.2` upstream entry + 허용된 leaf adapter |
| native 저장 형식 | HWP 중심 저장 경계 | HWP/HWPX source save·명시 저장·다른 이름으로 저장 |
| 직접 PDF | editor/인쇄 경로에 의존 | upstream page SVG → staged Rust PDF job, 한글 searchable audit 포함 |
| 플랫폼 중립 test | Task 시작 전 기준 | automation 71, upstream 35, Studio 78 모두 통과 |
| exact native 산출물 | Task #9 이전 후보는 승계하지 않음 | Windows MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB 6개 inventory 통과 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| exact upstream `v0.8.2` entry와 override 최소성 | OK — upstream boundary·pin test, local shadow 제거와 210-module production build 통과 |
| Tauri lifecycle·font·recent·drag-in 재결합 | OK — unit test와 Windows GUI에서 문서 중앙 open·drag-in·상황별 toolbar 상태 확인 |
| HWP/HWPX native 저장 | OK — source format, 명시 저장, 다른 이름으로 저장과 재열기 시나리오 수용 |
| 직접 PDF 저장 | OK — 최소 Linux와 Windows VDI에서 성공, Windows Edge에서 한글 검색·선택·복사 확인 |
| bundled font·license·searchable 판정 | OK — provenance/hash/license와 PDF text audit test 통과 |
| 제품·release metadata | OK — product boundary 177 files, version·metadata `0.1.0`, rhwp `v0.8.2` pin 일치 |
| Windows/Linux exact native | OK — CI `31255124269`, native `31255131950`, 6개 bundle inventory와 MSI·NSIS smoke 통과 |
| 실제 인쇄 | MISS(분리) — editor WebView 빈 한 쪽 인쇄 결함을 Issue #15로 이관했으며 Task #9 handoff를 차단한다. |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_13_stage1.md): override 소유 분류와 upstream drift guard를 고정했다.
- [Stage 2](../working/task_m010_13_stage2.md): exact upstream Studio entry로 전환하고 local renderer·toolbar 복제를 제거했다.
- [Stage 3](../working/task_m010_13_stage3.md): Tauri lifecycle·font·recent를 leaf adapter로 재결합했다.
- [Stage 4](../working/task_m010_13_stage4.md): HWP/HWPX 저장과 page SVG 기반 직접 PDF command를 통합했다.
- [Stage 5](../working/task_m010_13_stage5.md): 플랫폼 중립 회귀와 공식 제품·아키텍처·release 문서를 정렬했다.
- [Stage 6](../working/task_m010_13_stage6.md): exact native·GUI·package를 수용하고 실제 인쇄를 Issue #15 의존성으로 분리했다.

Stage 6 보고서의 Stage 6.7 절은 PR 리뷰 보정, 새 exact 검증 요구와 후속 Issue #19~#21의
책임 경계를 기록한다.

2026-08-12 Stage 6.7 재검증에서는 product boundary 179 files, automation 71/71,
upstream 35/35, Studio 19 files·78/78와 production build 211 modules가 통과했다.
CanvasKit `fs`/`path` browser externalization, ineffective dynamic import와 500kB chunk는 기존
non-blocking build warning으로 남았다. Rust desktop test·Clippy와 Tauri build는 지원 대상인
Windows/Linux exact Actions에서 통과했으며 macOS에서 native build를 실행하지 않았다.

## 잔여 위험과 후속 작업

### 잔여 위험

- Issue #15가 아직 merge되지 않아 Task #13만 병합한 `devel`에는 실제 인쇄 보정이 없다.
- Linux arm64는 build·inventory까지만 검증했고 GUI 수용은 수행하지 않았다.
- AppImage·RPM은 inventory와 Linux x64 실행 경계가 있으나 Stage 6의 주 package 수용은 Windows MSI·NSIS였다.
- 공개 prerelease, release tag, 서명, updater와 package repository 게시는 수행하지 않았다.
- PDF revision snapshot과 장시간 stale job 회수는 Issue #19, adapter lifecycle·dead bridge 정리는
  Issue #20, 대형 Rust module 분리는 Issue #21로 등록했다.

### 후속 작업 후보

- [Issue #15](https://github.com/postmelee/alhangeul-tauri/issues/15)를 Task #13 merge 뒤 새 `devel`에 정렬하고 Windows/Linux exact 인쇄 gate를 다시 실행한다.
- [Issue #19](https://github.com/postmelee/alhangeul-tauri/issues/19)에서 PDF immutable snapshot과 stale job TTL을 다룬다.
- [Issue #20](https://github.com/postmelee/alhangeul-tauri/issues/20)에서 desktop adapter lifecycle과 dead bridge를 정리한다.
- [Issue #21](https://github.com/postmelee/alhangeul-tauri/issues/21)에서 native Rust 대형 module을 기능 변경 없이 분리한다.
- Task #13과 #15가 모두 merge된 새 exact SHA만 Task #9 prerelease 후보 재개 입력으로 사용한다.

## 작업지시자 승인 요청

- 2026-08-12 작업지시자의 Stage 6 승인과 “진행해줘” 지시에 따라 이 보고서 확정과 `devel` 대상 ready PR 게시를 진행한다.
- PR 검토 후 merge 여부는 작업지시자가 별도로 결정하며, merge 전 Issue #13을 닫지 않는다.
