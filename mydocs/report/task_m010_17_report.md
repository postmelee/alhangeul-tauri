# Task #17 최종 보고서 — Linux 파일 관리자 HWP/HWPX 첫 페이지 썸네일

GitHub Issue: [#17](https://github.com/postmelee/alhangeul-tauri/issues/17)
마일스톤: M010

## 작업 요약

- 대상 이슈: #17
- 마일스톤: M010 — v0.1.0 제품 전환
- 단계 수: 6
- 작업 목적: Windows와 분리된 bounded Linux thumbnail helper를 구현하고, HWP/HWPX 첫 페이지를 Nautilus와 Thunar/Tumbler에서 즉석 렌더링해 DEB·RPM 설치 수명주기와 실사용 문서까지 수용한다.

Linux 전용 `alhangeul-thumbnailer`는 Freedesktop `%i %o %s` 계약만 공개한다. 같은 ELF의 private worker를 1,500 ms deadline과 256 MiB address-space 상한 안에서 실행하고, 공유 `document-preview`의 direct render를 먼저 사용한 뒤 embedded preview로 fallback한다. 결과는 RGBA PNG 구조와 edge를 재검증해 게시하며 실패 시 partial/final 오염 없이 file manager MIME icon으로 저하한다.

Tauri DEB·RPM은 helper와 `.thumbnailer` registration을 선언적으로 소유한다. x64 DEB/RPM과 arm64 DEB의 install·reinstall·update·rollback·uninstall을 exact-SHA native workflow에서 확인했고, x64 DEB를 설치한 Nautilus와 Thunar/Tumbler에서 최초 생성, cache hit, mtime invalidation, 손상 문서 fallback과 공개 실사용 HWP/HWPX의 첫 페이지를 화면으로 수용했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/linux-thumbnailer/**` | 독립 Linux supervisor/worker CLI, resource limit, direct-first render, PNG 검증·게시와 계약 테스트 | Linux x64·arm64 thumbnail 생성 |
| `apps/desktop/src-tauri/linux/alhangeul.thumbnailer` | HWP/HWPX MIME과 절대 helper 경로의 Freedesktop registration | Nautilus·Thunar/Tumbler discovery |
| `apps/desktop/src-tauri/tauri.conf.json` | DEB·RPM에 helper와 registration custom file mapping 추가 | Linux package 설치·제거 |
| `.github/workflows/alhangeul-desktop.yml` | exact-SHA Linux core/helper build, x64·arm64 package lifecycle와 artifact gate 추가 | native CI·artifact 수용 |
| `.github/workflows/alhangeul-linux-gui.yml` | exact native artifact handoff, 검증 DEB 설치, package-owned manager probe 추가 | Linux x64 GUI 수용 |
| `scripts/benchmark-linux-thumbnail-core.sh`, `scripts/build-linux-thumbnailer.mjs` | resource probe와 target별 locked ELF build·staging | Linux core 성능·build provenance |
| `scripts/linux-thumbnail-manager-*.sh` | package-installed Nautilus·Thunar cache/invalidation/fallback와 실사용 screenshot 수집 | file manager 시나리오 증거 |
| `scripts/linux-thumbnail-package-*.{mjs,sh}`, `scripts/verify-linux-thumbnail-package-evidence.mjs` | DEB/RPM fixture, lifecycle, owner·mode·hash·보존 invariant 검증 | package 수명주기 안전성 |
| `scripts/verify-desktop-artifacts.mjs` | Linux package evidence를 bundle inventory에 결속 | artifact 무결성 |
| `tests/linux-thumbnail-*.test.mjs`, `tests/gui/linux/native-ui/thumbnail-files.test.mjs` | build·registration·package·GUI·실사용 fixture 계약 | 자동 회귀 |
| `tests/actions-workflows.test.mjs`, `tests/desktop-artifacts.test.mjs`, `tests/linux-gui-workflow.test.mjs` | workflow 순서, exact handoff, artifact cardinality와 final gate 검증 | CI fail-closed 경계 |
| `scripts/check-product-boundary.mjs`, `tests/product-boundary.test.mjs` | Linux helper의 network·Tauri 의존 금지 | 제품 경계 |
| `README.md`, `docs/**` | 검증 완료 matrix, 구조·개발·운영·upstream 경계와 제외 범위 공식화 | 사용자·개발·릴리스 문서 |
| `mydocs/plans/task_m010_17*.md`, `mydocs/working/task_m010_17_stage*.md` | 승인 계획, Stage별 결정·실측·검증 기록 | 작업 추적 |

Task source와 Stage 보고까지의 `origin/devel...fd31a45` diff는 49개 파일, 7,035줄 추가·28줄 삭제다. 이 중 독립 Linux helper 제품 source는 4개 Rust 파일 616줄이며 contract test는 299줄이다. 나머지 증가는 tracked Cargo lockfile, 자동화·수용 harness, 공식 문서와 단계별 검증 기록이다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 | `README.md` | OK | 사용자 진입점에는 검증 완료 범위만 최소 표시 |
| `docs/architecture/LINUX_THUMBNAILS.md` | `docs/architecture/` | `docs/architecture/LINUX_THUMBNAILS.md` | OK | CLI·process·render·cache·package 구조의 공식 진실 원천 |
| `docs/architecture/UPSTREAM.md` | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | pinned `rhwp` preview 경계와 재수용 gate 기록 |
| `docs/DEVELOPMENT.md` | `docs/` | `docs/DEVELOPMENT.md` | OK | Linux-only locked build/test와 host 조건 기록 |
| `docs/operations/DESKTOP_RELEASE.md` | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | package lifecycle, GUI evidence, uninstall/cache 판정 기록 |
| `docs/README.md` | `docs/` | `docs/README.md` | OK | 신규 architecture 문서를 공식 tree에 연결 |
| 계획·단계·최종 보고 | `mydocs/plans`, `mydocs/working`, `mydocs/report` | 계획 2건, Stage 보고 6건, 본 보고서 | OK | 수행계획서의 문서 위치 판단과 일치 |

`mydocs/manual`에는 제품 문서를 추가하지 않았다. `third_party/rhwp`는 읽기 전용으로 유지했고 공개 실사용 fixture도 원본 hash를 검증한 뒤 runner 임시 경로에 복사해 사용했다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| Linux thumbnail 실행 파일 | 없음 | x64·arm64 ELF `alhangeul-thumbnailer` |
| 공개 CLI | 없음 | 절대 local regular input/output + edge `1..=1024`, positional 3개 |
| process/resource 상한 | 없음 | supervisor/self-child, 1,500 ms, 256 MiB, 입력 64 MiB |
| render 경로 | Linux file manager 경로 없음 | direct first → embedded preview → nonzero/no output |
| package 수용 matrix | 없음 | x64 DEB/RPM, arm64 DEB lifecycle |
| file manager 시각 수용 | 없음 | Nautilus 42.6, Thunar 4.16.10/Tumbler 4.16 |
| 실사용 문서 수용 | 없음 | 공개 HWP 1건 + HWPX 1건, 두 manager와 512 px 상세 PNG |
| automation 전체 | Stage 1 완료 시점 269/269 | 최종 297/297 |
| 단계 보고 | 0건 | 6건, 총 840줄 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| HWP/HWPX 첫 페이지를 앱/WebView 없이 Linux CLI가 생성 | OK — package-installed helper의 direct/preview PNG와 manager `execve` 확인 |
| 입력·출력·edge·resource가 bounded이고 failure가 fail-closed | OK — canonical regular input, 64 MiB, edge 1..=1024, 1,500 ms, 256 MiB, kill·wait·partial cleanup 계약 통과 |
| RGBA·종횡비·atomic output과 Tumbler pre-open inode를 안전하게 처리 | OK — PNG decode/edge/alpha 검증, normal atomic rename과 precreated 0-byte same-inode 게시 회귀 통과 |
| Nautilus·Thunar의 cache hit/invalidation/failure fallback | OK — 최초/cached/changed 호출 계측과 cache PNG, MIME icon 저하 확인 |
| DEB/RPM owner·mode·hash와 install/update/rollback/uninstall | OK — x64 DEB/RPM, arm64 DEB exact native lifecycle 통과 |
| uninstall이 MIME default·제3자 thumbnailer·file-manager cache를 훼손하지 않음 | OK — 두 제품 파일만 제거되고 세 sentinel/invariant 보존 |
| 공개 실사용 문서 text·table·image 시각 수용 | OK — 온새미로 HWP와 form-002 HWPX를 Nautilus·Thunar 및 512 px PNG에서 직접 확인·대화 제시 |
| 제품·upstream·Studio·Windows 회귀 | OK — automation 297/297, upstream 35/35, Studio 105/105·build, exact native Windows x64·installer success |
| 최신 `origin/devel` 통합 가능성 | OK — merge base 이후 중첩 5개 경로를 확인했고 가상 merge에 conflict marker 없음 |

### 최종 로컬 검증

- `pnpm run test:automation`: 297/297
- `pnpm run check:product-boundary`: 288개 파일
- `pnpm run check:product-version`: `0.1.0` 전 surface 일치
- `pnpm run check:release-metadata`: Alhangeul `0.1.0`
- `pnpm run check:rhwp-pin`: `v0.8.4`, commit `496333b27d21ddb9114ba9ae340bcb895870c9a7`, 6 artifacts
- `pnpm run test:upstream`: 35/35
- `pnpm run test:studio`: 23개 파일, 105/105
- `pnpm run build:studio`: production build 성공
- `shellcheck` 4개 Linux shell entry: 성공

Studio test/build의 첫 sandbox 실행은 격리 worktree `node_modules/.vite-temp` 쓰기가 차단돼 `EPERM`으로 종료됐다. 같은 source와 명령을 worktree 쓰기 권한으로 즉시 재실행해 모두 통과했으며 코드·의존성 변경은 없었다.

### exact-SHA CI/원격 검증

- 수용 source: `5f8d5f7a1948c20b385f918882f460eeed6371ef`
- [Native run 33299244542](https://github.com/postmelee/alhangeul-tauri/actions/runs/33299244542): Linux x64 job `99224139798`, Linux arm64 `99224139990`, Windows x64 `99224139931`, Windows installer smoke `99227446164` 모두 success
- [Linux GUI run 33300506770](https://github.com/postmelee/alhangeul-tauri/actions/runs/33300506770): job `99227639802` success
- x64 helper: `5773973c142b84412eb7a51491daf36babf38bf008a2c3dea1ea655ad6ba7af5`
- arm64 helper: `554f85681cd6518738a310d15c3c67450af9b3e35305ca9e186c5b40b3c0d725`
- x64 DEB: `c608a95c4f2ca98545661d7a86b17c94630bb9771abd53d927f98d82691d0cff`
- x64 RPM: `ebe93467feed783d0f367d9fb20b5582d7e5a6a5c963e7fdfbc7678158b79fb4`
- arm64 DEB: `2e4f83a45d5b7352e78a2cda56838cd6af067aa25983105e0c825f4595928b73`
- GUI evidence artifact `9728903612`: `sha256:0544237840981b092f67936f099f160f33ea1c69cfe6b98cf95d51e5c389405d`

### 단계별 검증 결과

- [Stage 1](../working/task_m010_17_stage1.md): x64·arm64 resource 실측과 Freedesktop/file-manager 계약 확정
- [Stage 2](../working/task_m010_17_stage2.md): bounded Linux helper, direct-first fallback와 atomic RGBA PNG 구현
- [Stage 3](../working/task_m010_17_stage3.md): Nautilus·Thunar/Tumbler discovery/cache와 pre-open inode 보정 수용
- [Stage 4](../working/task_m010_17_stage4.md): x64 DEB/RPM·arm64 DEB package lifecycle와 package-installed GUI 통합
- [Stage 5](../working/task_m010_17_stage5.md): 공식 architecture/development/operations 문서와 플랫폼 중립 회귀 정렬
- [Stage 6](../working/task_m010_17_stage6.md): exact-SHA native/package/GUI 재수용과 공개 실사용 HWP/HWPX 시각 판정

## 잔여 위험과 후속 작업

### 잔여 위험

- Linux arm64 RPM/GUI, KDE/Dolphin, AppImage registration, Flatpak/Snap은 이번 검증 matrix 밖이다.
- GUI 수용은 GitHub Actions Ubuntu Xvfb/Openbox와 Nautilus 42.6·Thunar 4.16.10/Tumbler 4.16에서 수행했다. 다른 배포판·버전·사용자별 thumbnail 설정은 별도 호환성 범위다.
- 공유 renderer가 아직 지원하지 않는 복잡한 문서 요소는 문서별 첫 페이지 fidelity 차이를 만들 수 있다. 이번 작업은 대표 실사용 문서의 text·table·image와 direct/preview/failure/resource 계약을 수용했다.
- Actions artifact는 임시 검증물이다. 공식 release, 서명, package 게시와 updater 활성화는 수행하지 않았다.

### 후속 작업 후보

- Linux arm64 RPM과 실제 arm64 file manager GUI 수용
- KDE/Dolphin thumbnail discovery·cache 수용
- AppImage·Flatpak·Snap 별 registration/lifecycle 정책을 각각 별도 이슈로 결정
- 문서 fidelity fixture 확대와 renderer upstream 개선을 별도 이슈로 추적

## 작업지시자 승인 요청

- 2026-08-30 작업지시자의 “진행해줘”를 Stage 6 결과와 본 최종 보고·PR 게시 승인으로 반영한다.
- PR merge와 Issue #17 close가 확인될 때까지 release·배포·self-merge·branch/worktree 정리는 수행하지 않는다.
