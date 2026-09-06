# Task #24 최종 보고서 — rhwp v0.8.4 core·전체 Studio bundle 동일 release 수용

GitHub Issue: [#24](https://github.com/postmelee/alhangeul-tauri/issues/24)
마일스톤: M010

## 작업 요약

- 대상 이슈: #24
- 마일스톤: M010
- 단계 수: 7 + Windows 경로 보정 하위 단계 1개
- 작업 목적: Rust core, native Cargo lock, bundled WASM과 upstream 전체 Studio를
  `rhwp v0.8.4` 하나로 정렬하고 Windows/Linux native 기능을 exact-SHA에서 수용한다.

Task #23 자동화가 만든 draft PR #32의 bot commit
`b3712714f6733aa75ff50dd346b89850136b5458`을 immutable input으로 감사하고 원본 parent와
author를 보존해 task branch에 merge했다. Stable tag `v0.8.4`와 resolved commit
`496333b27d21ddb9114ba9ae340bcb895870c9a7`, source Cargo lock, native Cargo lock,
bundled WASM 6개 관리 artifact와 exact upstream Studio entry를 함께 고정했다.

v0.8.4에서 추가된 reported exporter와 암호 serializer 의미에 맞춰 Tauri native 저장
leaf adapter를 보정했다. native 명시 저장은 pagination flush 뒤 reported HWP/HWPX artifact를
staging하고, 암호 문서는 새 암호 입력과 password serializer를 사용하며, native commit과
Studio clean 통지 성공 뒤에만 content-loss 경고를 표시한다. PDF와 hidden same-origin system
print surface, font·toolbar leaf adapter와 12개 alias 경계는 유지했다.

실행 가능 SHA `88baa5666ec55bf043844bae01ec4d422278851c`에서 CI와 Windows x64,
Linux x64, Linux arm64 native matrix, Windows installer smoke를 통과했다. Windows x64는
NSIS 전체 GUI와 MSI 자동 package smoke를, Linux x64는 native GitHub Codespaces의 DEB
설치 binary로 HWP/HWPX 열기·저장·재열기, drag-in, 한글 toolbar/dialog, searchable PDF와
GTK/CUPS system print를 수용했다. Linux arm64는 hosted DEB build·inventory까지만 수용했다.

Stage 5 공식 증적 head `73cda55ffa3950b4c7cb04c3464ca07a176d8807`은 final CI
[31814890022](https://github.com/postmelee/alhangeul-tauri/actions/runs/31814890022)를 통과했다.
Stage 3 native accepted SHA 이후 변경이 계획·보고·공식 증적 문서뿐임을 path audit해 기존
native run을 계승했다.

PR 게시 뒤 `devel`이 Task #34 Linux exact-SHA GUI acceptance workflow·harness와 운영 증적을
포함해 69커밋 전진하면서 PR #37이 충돌 상태가 됐다. Stage 7은 최신 `origin/devel`
`424bb9c43769d2d92fcfede6b7ddd13bba7561d0`을 rebase나 force push 없이 일반 merge하고,
과거 오늘할일과 automation test의 의미 충돌 3개를 최신 `devel` 기준으로 해결했다.
Task #24 제품 runtime, Tauri package, Cargo manifest·lock, bundled Studio와 `rhwp` pin에는
`devel` 전진분과 겹치는 변경이 없으므로 플랫폼 중립 전체 gate와 PR exact-head CI 1회로
재통합을 판정하고 native·GUI 전체 재실행은 Pages/updater 포함 최종 릴리스 후보로 넘긴다.

## 변경 파일 목록과 영향 범위

| 경로·영역 | 변경 요약 | 영향 범위 |
|---|---|---|
| `third_party/rhwp` | source gitlink를 exact `v0.8.4` commit으로 갱신 | 읽기 전용 upstream source 기준 |
| `apps/desktop/src-tauri/Cargo.lock` | rhwp 0.8.4와 암호 HWP/HWPX 의존성 반영 | Windows/Linux native core build |
| `apps/studio-host/vendor/rhwp-core/*` | wasm-pack 0.15.0으로 생성한 exact WASM·JS·declaration 6개 관리 artifact 갱신 | 전체 upstream Studio core runtime |
| `rhwp-core.lock` | release tag·commit·source lock·tool·관리 artifact 크기와 SHA-256 갱신 | pin provenance 진실 원천 |
| `apps/studio-host/src/core/desktop-source-export*` | reported format export, 암호 serializer, pagination flush 경계 추가 | Tauri native HWP/HWPX 저장 |
| `apps/studio-host/src/core/desktop-host*`, `desktop-persistence*` | encrypted 상태 승계, staging/commit/report 반환, 저장 뒤 content-loss 통지 | native 원자 저장 lifecycle |
| `apps/studio-host/src/core/desktop-host-dependencies.ts` | upstream 암호 입력 dialog를 testable dependency로 연결 | native host와 upstream UI 연결 |
| `apps/studio-host/src/command/commands/file*` | save/save-as·암호 입력 취소 뒤 기존 status 복원 | 저장 UX 상태 |
| `apps/studio-host/src/core/upstream-boundary.test.ts`, `tests/rhwp-baseline.test.mjs`, `tests/rhwp-pin.test.mjs` | v0.8.4 reported save·exact entry·pin 경계로 test 정렬 | upstream/adapter 회귀 방지 |
| `tests/rhwp-sync-{changes,pr-body}.test.mjs` | Windows 절대 output 경로 기대를 실제 `resolve()` 계약으로 보정 | Windows automation test 호환성 |
| `README.md`, `docs/DEVELOPMENT.md`, `docs/architecture/UPSTREAM.md` | current pin·재현 명령과 v0.8.4 native 수용 경계 갱신 | 제품 진입·개발·upstream 공식 문서 |
| `docs/operations/DESKTOP_RELEASE.md` | exact run, artifact provenance·checksum, Windows/Linux 수용과 한계 기록 | desktop release 운영 증적 |
| `mydocs/plans/task_m010_24*.md` | 승인 범위·단계·환경·검증·문서 위치 | 하이퍼-워터폴 수행 기준 |
| `mydocs/working/task_m010_24_stage*.md` | Stage 1~7 실행·검증·제약·handoff 증적 | 단계별 장기 기록 |
| `mydocs/orders/20260813.md`, `mydocs/orders/20260815.md`, `mydocs/orders/20260827.md` | Task #24 진행·보류·재개와 릴리스 순서 | 일일 작업 보드 |

전체 변경은 최신 `devel` 기준 39 files, 4,514 insertions, 84 deletions이다. 이 중
generated WASM JavaScript·declaration과 단계 문서가 변경량 대부분을 차지한다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 제품 current pin | 저장소 root·기존 진입 문서 | `README.md`, `rhwp-core.lock` | OK | 사람이 읽는 pin과 기계 검증 lock 분리 |
| 개발·재현 절차 | `docs/` | `docs/DEVELOPMENT.md` | OK | 기존 유지관리자 개발 문서의 current pin marker 갱신 |
| upstream 소유·수용 경계 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | 기존 upstream 진실 원천에 v0.8.4 native 기준선 추가 |
| desktop artifact·GUI 증적 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | 기존 release 운영 문서에 exact run·checksum·제약 추가 |
| 단계 증적 | `mydocs/working/` | `mydocs/working/task_m010_24_stage1.md`~`stage7.md` | OK | 실행 결과를 제품 문서와 분리 |
| 최종 보고 | `mydocs/report/` | `mydocs/report/task_m010_24_report.md` | OK | 작업지시자와 후속 task용 장기 보고 |

새 제품 문서나 `mydocs/manual` 문서를 만들지 않았다. 수동 GUI screenshot·fixture·출력 PDF,
credential과 token은 저장소에 추가하지 않았다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---:|---:|
| rhwp Stable pin | `v0.8.2` | `v0.8.4` |
| resolved source | `9b16aa9e23f476e2b335d7c029fc9f24a199d63c` | `496333b27d21ddb9114ba9ae340bcb895870c9a7` |
| managed WASM binary | 7,189,445 B | 8,038,570 B |
| 허용 Studio leaf alias | 12 | 12 |
| legacy upstream shadow | 0 | 0 |
| Studio tests | 97 | 105 |
| automation tests | 120 | 224 |
| native build 대상 | Windows x64, Linux x64, Linux arm64 | 동일, exact v0.8.4 SHA 전체 성공 |
| native GUI 수용 | v0.8.2/이전 task 증적 | v0.8.4 Windows x64·Linux x64 대표 수용 |

신규 product source는 `desktop-source-export.ts` 61 LOC이며 기존 product source와 test도
계획의 파일 300 LOC 권장 상한을 유지했다.

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| single release provenance | OK — tag, submodule, Cargo lock, WASM 6 artifacts가 `v0.8.4` / `496333b2...`로 일치 |
| pin·제품 경계 | OK — product boundary 233 files, product/release version `0.1.0`, pin verifier 통과 |
| adapter 얇은 경계 | OK — exact upstream entry, 12 leaf alias, shadow 0개, native save owner만 보정 |
| native save v0.8.4 계약 | OK — reported export·password·pagination·staging·commit·content-loss 순서 focused 26/26 |
| 플랫폼 중립 회귀 | OK — automation 224/224, upstream 35/35, Studio 105/105, GUI typecheck 통과 |
| Studio production build | OK — 227 modules, exact `rhwp_bg` 포함 bundle 생성 |
| Stage 3 CI | OK — [31688454752](https://github.com/postmelee/alhangeul-tauri/actions/runs/31688454752), exact `88baa566...` |
| Stage 3 native matrix | OK — [31688732973](https://github.com/postmelee/alhangeul-tauri/actions/runs/31688732973), 세 build와 Windows installer smoke 성공 |
| artifact inventory·checksum | OK — Windows MSI/NSIS, Linux x64 AppImage/DEB/RPM, Linux arm64 DEB 독립 대조 일치 |
| Windows x64 GUI | OK — NSIS 실행·열기·저장·drag-in·toolbar·PDF·system print·제거; MSI package smoke 계승 |
| Linux x64 GUI | OK — native Ubuntu DEB에서 열기·저장·drag-in·한글 UI·PDF·GTK/CUPS print·반복/취소 복원 |
| Linux arm64 | OK(제한) — hosted DEB build·inventory·checksum 성공, 실제 GUI 미실행 명시 |
| final CI | OK — [31814890022](https://github.com/postmelee/alhangeul-tauri/actions/runs/31814890022), Stage 5 exact head, desktop Rust test·Clippy 포함 전체 성공 |
| native path audit | OK — `88baa566...` 이후 계획·보고·공식 증적 문서만 변경, native 재실행 불필요 |
| Stage 7 `devel` 재통합 | OK(로컬) — 제품 runtime·pin 비중첩, 과거 보드·automation test 3개 의미 충돌 해결, 플랫폼 중립 gate 통과. 이 merge commit을 push한 exact head의 CI 1회가 원격 판정 gate다. |
| 금지된 배포 동작 | OK — release/tag·서명·package publish·고정 다운로드·Pages·updater 실행 없음 |
| PR 준비 상태 | OK(로컬) — final integrated gate와 `git diff --check` 통과. 승인된 merge commit의 exact-head CI 성공 뒤 merge 승인을 요청한다. |

Vite의 기존 CanvasKit browser externalization, ineffective dynamic import와 500 kB chunk 경고는
유지됐으며 새 build 오류나 제품 경계 위반은 아니다.

### 단계별 검증 결과

- Stage 1: [`task_m010_24_stage1.md`](../working/task_m010_24_stage1.md) — PR #32 immutable candidate, Stable provenance와 v0.8.2→v0.8.4 source/adapter 영향 감사를 확정했다.
- Stage 2: [`task_m010_24_stage2.md`](../working/task_m010_24_stage2.md) — reported·암호 native 저장 leaf를 보정하고 전체 플랫폼 중립 gate를 통과했다.
- Stage 3: [`task_m010_24_stage3.md`](../working/task_m010_24_stage3.md) — exact-SHA CI/native matrix, Windows 경로 test 보정과 여섯 package checksum을 확정했다.
- Stage 4: [`task_m010_24_stage4.md`](../working/task_m010_24_stage4.md) — Windows NSIS 전체 GUI와 MSI package-level 자동 수용을 구분해 Go로 판정했다.
- Stage 5: [`task_m010_24_stage5.md`](../working/task_m010_24_stage5.md) — Codespaces native x64 DEB GUI·PDF·CUPS 인쇄와 공식 운영 증적을 확정했다.
- Stage 6: [`task_m010_24_stage6.md`](../working/task_m010_24_stage6.md) — final CI와 native SHA 이후 path audit으로 최종 수용 경계를 확정했다.
- Stage 7: [`task_m010_24_stage7.md`](../working/task_m010_24_stage7.md) — 최신 `devel`을 이력 보존 merge하고 릴리스 필수 범위와 단일 CI gate를 확정했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- Windows MSI 수동 GUI는 관리자 권한 없는 VDI 제약으로 미실행이다. MSI package smoke와
  같은 binary의 NSIS GUI를 결합한 수용이며 실제 MSI 사용자 체감을 대신하지 않는다.
- Linux AppImage/RPM 설치·실행과 Linux arm64 실제 GUI는 미실행이다. Linux GUI는 Ubuntu
  24.04 DEB 한 환경이며 다른 배포판, Wayland/GPU, physical printer 조합을 대표하지 않는다.
- Codespaces의 GPU 없는 headless X11은 software compositing으로 실행했다. 필수 기능은
  통과했지만 실제 GPU 장시간 rendering 성능을 검증하지 않았다.
- v0.8.4 암호 문서 보존과 content-loss warning은 focused integration test와 CI로 고정했지만
  실제 Windows/Linux GUI에서 암호 파일 저장·재열기와 warning dialog를 수동 확인하지 않았다.
- 암호화 문서의 첫 Save As에서 암호 dialog가 선택한 새 target이 아니라 기존 문서 파일명을
  표시할 수 있다. serializer와 저장 대상에는 영향이 없는 비차단 UX 문제로 후속 범위에 남긴다.
- 평문 문서에 암호를 새로 추가하거나 Save As에서 기존 보호를 제거하는 선택형 UX는 이번
  릴리스에서 제공하지 않는다. 기존 암호 문서의 보호를 유지하는 저장 경로만 수용했다.
- Windows/Linux 대표 fixture 수용은 모든 HWP/HWPX 조판·편집 기능의 완전한 호환성을
  보증하지 않는다.
- Actions artifact는 2026-08-27에 만료되는 임시 검증물이며 release asset이나 공식
  다운로드가 아니다.

### 후속 작업 후보

- Task #34의 Linux exact-SHA GUI acceptance는 최신 `devel`에 병합됐다. Task #35 Windows
  GUI 자동화는 현재 branch를 보존하되 첫 릴리스 필수 범위에서 제외하고 추가 Actions 실행을 중단한다.
- Issue #14 Windows thumbnail과 Issue #17 Linux thumbnail도 첫 릴리스 필수 범위에서 제외한다.
- Issue #45에서 `postmelee/alhangeul-macos` 디자인 체계를 참고한 Windows/Linux Pages와
  MSI·NSIS·AppImage 다운로드·updater URL 계약을 구현한다.
- #45 URL 계약 뒤 Issue #16에서 MSI·NSIS·AppImage updater와 세 custom target의 실제
  `N → N+1` 검증을 진행한다.
- pagination helper 중복, PDF export의 deferred pagination flush와 중복 인쇄 status 피드백은
  각각 관련 후속 리팩터링·Issue #19·후속 UX 범위에서 처리하고 #24 merge를 막지 않는다.
- 첫 공개 후보는 Task #9의 과거 artifact를 재사용하지 않고 Task #24 merge를 포함한 새
  exact SHA에서 생성·검증한다. 순서는 #24 merge → #45 Pages → #16 MSI·NSIS·AppImage
  updater → 최종 릴리스 후보 gate다.

## PR #32와 Issue close 경계

PR #32의 bot commit은 Task #24 Stage 1 merge parent로 보존됐다. Task #24 PR은 이 immutable
candidate에 adapter 보정과 native 수용 증적을 더한 정규 Hyper-Waterfall 통합 PR이며, merge
후 PR #32를 supersede한다. 이번 지시는 Task #24 PR 생성까지이므로 PR #32를 merge·close하지
않고 Issue #24도 닫지 않는다. Task #24 PR merge 확인 뒤 작업지시자 승인 또는
`pr-merge-cleanup` 절차에서 정리한다.

## 작업지시자 승인 요청

- 작업지시자는 2026-08-27 최신 `devel` 재통합, 충돌 해결, 플랫폼 중립 검증과 PR exact-head
  CI 1회까지 Stage 7 범위를 승인했다.
- Stage 7 merge commit을 `publish/task24`에 non-force fast-forward하고 기존 PR #37의
  exact-head CI 성공을 확인한다.
- PR merge, Issue #24 close, PR #32 close와 worktree·branch 정리는 후속 승인을 기다린다.
