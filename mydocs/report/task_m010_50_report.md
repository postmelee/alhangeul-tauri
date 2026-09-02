# Task #50 최종 보고서 — Linux HWPX MIME 매칭과 thumbnail 검증 gate 보정

GitHub Issue: [#50](https://github.com/postmelee/alhangeul-tauri/issues/50)
마일스톤: M010

## 작업 요약

- 대상 이슈: #50
- 마일스톤: M010
- 단계 수: 5
- 작업 목적: 실제 Linux package만으로 HWPX thumbnail을 제공하고 MIME,
  resource, symlink와 file-manager 검증의 거짓 양성 경로를 제거한다.

Issue #17 / PR #49 merge 후 리뷰에서 발견한 세 누락을 함께 보정했다. Ubuntu
22.04의 shared-mime-info 2.1에서도 제품 MIME XML을 package가 설치해 HWPX를
`application/x-hwpx`로 해석하며, core probe는 렌더 결과·exit·1,500 ms·256 MiB
예산을 required gate로 판정한다. 입력·출력 leaf symlink 방어는 유지하면서
symlink 조상 디렉터리는 허용한다. 마지막으로 probe의 private MIME 주입 없이
실제 설치 package만으로 Nautilus와 Thunar의 HWP/HWPX thumbnail을 재수용했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/desktop/src-tauri/linux/alhangeul-hwpx.xml` | canonical HWPX glob·magic·alias 정의 | Linux system MIME |
| `apps/desktop/src-tauri/linux/alhangeul.thumbnailer`, `update-mime-database.sh` | canonical registration과 install/remove refresh | Linux package lifecycle |
| `apps/desktop/src-tauri/tauri.conf.json` | DEB/RPM MIME XML·hook·dependency 소유 | Linux x64 DEB/RPM, arm64 DEB |
| `apps/linux-thumbnailer/src/cli.rs` | resolved ancestor 허용, leaf·inode 검증 유지 | Linux helper path security |
| `apps/linux-thumbnailer/tests/` | symlink 계약과 공통 test support 분리 | Rust native regression |
| `scripts/linux-thumbnail-mime-*` | MIME snapshot, private-root canary와 hook 계약 | MIME 단위·음성 검증 |
| `scripts/linux-thumbnail-package-*` | package 소유·전이·복구·제거 evidence 강화 | 실제 DEB/RPM 수용 |
| `scripts/linux-thumbnail-core-*`, `benchmark-linux-thumbnail-core.sh` | 고정 fixture 기대값과 semantic/resource summary | x64·arm64 core required gate |
| `scripts/linux-thumbnail-manager-*` | private MIME 주입 제거, cache·손상 문서 판정 | Nautilus·Thunar GUI 수용 |
| `.github/workflows/alhangeul-desktop.yml` | MIME/package/core native required evidence | Linux·Windows native CI |
| `.github/workflows/alhangeul-linux-gui.yml` | package-only MIME와 실제 문서 manager evidence | Ubuntu 22.04 x64 GUI CI |
| `tests/*.test.mjs`, `tests/gui/linux/native-ui/thumbnail-files.test.mjs` | producer·consumer·workflow 계약과 음성 사례 | 플랫폼 중립 automation |
| `README.md`, `docs/architecture/LINUX_THUMBNAILS.md` | 사용자 범위와 MIME·path·resource 아키텍처 정렬 | 사용자·아키텍처 문서 |
| `docs/DEVELOPMENT.md`, `docs/operations/DESKTOP_RELEASE.md` | 개발 검증과 exact package/GUI 운영 근거 | 기여자·release 운영 문서 |
| `mydocs/plans/`, `mydocs/working/`, `mydocs/report/`, `mydocs/orders/` | 승인, 5단계 결과와 최종 추적 문서 | Hyper-Waterfall 작업 기록 |

전체 diff는 최신 `devel` 기준 **49 files, +3,542 / -458 lines**다. 제품 renderer,
공유 `document-preview`, Windows handler 구현, `third_party/rhwp` gitlink와 fixture
원본은 변경하지 않았다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| Linux thumbnail 아키텍처 | `docs/architecture/` | `docs/architecture/LINUX_THUMBNAILS.md` | OK | canonical MIME·package·path·resource 계약 소유 |
| 개발 검증 | `docs/` | `docs/DEVELOPMENT.md` | OK | Linux 실행 환경과 package-only 검증 소유 |
| release 운영 증적 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | exact run·artifact·검증 한계 소유 |
| 사용자 요약 | 저장소 루트 | `README.md` | OK | 실제 지원 package·문서 범위만 요약 |
| 수행·구현계획 | `mydocs/plans/` | `task_m010_50.md`, `task_m010_50_impl.md` | OK | 승인과 단계 판단 기록 |
| 단계·최종 보고 | `mydocs/working/`, `mydocs/report/` | Stage 1~5, 본 보고서 | OK | long-lived 결과와 위험 기록 |

새 공식 문서나 `mydocs/manual`을 만들지 않고 기존 진실 원천을 최소 보정했다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| package-only HWPX content type (Ubuntu 22.04) | `application/zip` | `application/x-hwpx` |
| thumbnailer HWPX registration | alias `application/vnd.hancom.hwpx` | canonical `application/x-hwpx` |
| package 소유 thumbnail 통합 파일 | helper·registration 2개 | MIME XML 포함 3개 |
| core semantic/resource required records | timeout 유무 중심 | x64·arm64 각각 88 records, breach 0 |
| core 성공 render gate | 120초 timeout만 실질 판정 | 결과·exit·1,500 ms·268,435,456 bytes 모두 판정 |
| symlink 조상 디렉터리 | canonical path 불일치로 거부 | 허용, input/output leaf symlink는 거부 |
| GUI MIME 전제 | probe private XML 주입 | private MIME path 0, package system XML만 사용 |
| 실제 GUI 문서 | 주입된 MIME 기반 fixture | 온새미로 HWP·form-002 HWPX first/cached/changed |
| 손상 문서 성공 cache PNG | nested failure path 오판 가능 | Nautilus·Thunar 모두 0 |
| 플랫폼 중립 automation | 이슈 전 계약 | 408 pass, 0 fail |

## 검증 결과

Stage 5 source/workflow candidate는
`a07bd1330363ee767b9e1cc7a80bed6a685cebcf`였다. PR 게시 뒤 최신 `devel`
`28d01b9a4e1a642b3834755cfe3623c6eb543b39`를 통합한 최종 수용 candidate는
`75f9f8c1a87c6e42e514254c82d9169aa3f5bbea`, rhwp pin은
`496333b27d21ddb9114ba9ae340bcb895870c9a7`이다. 아래 최종 native와 GUI
workflow는 모두 이 통합 candidate를 checkout하고 exact SHA를 검증했다.

| 수용 기준 | 결과 |
|---|---|
| shared-mime-info < 2.5에서 package-only HWPX canonical MIME | OK — Ubuntu 22.04, shared-mime-info 2.1에서 설치 전 `application/zip`, 설치 후 `application/x-hwpx`, 제거 후 baseline 복귀 |
| MIME 주입 없는 Nautilus·Thunar HWP/HWPX thumbnail | OK — private MIME path 부재, 실제 두 문서 first 2/2·cached 2/2·changed 4/4 helper 호출과 화면 확인 |
| uninstall 제품 항목 제거와 제3자 상태 보존 | OK — x64 DEB/RPM·arm64 DEB 10개 lifecycle 관측에서 제품 세 경로 제거, 기본 앱·제3자 sentinel 불변 |
| core 정상 실패·exit·wall/RSS 초과가 required failure | OK — 음성 test와 x64·arm64 각각 88개 실제 record, breach 0 |
| symlink 조상 정책의 코드·문서 일치 | OK — 조상 허용, leaf 거부와 inode 교체 방어를 Rust test·문서에서 동일 고정 |
| 미검증 조합을 지원 완료로 표시하지 않음 | OK — Fedora GUI, arm64 GUI, KDE, AppImage·Flatpak·Snap을 명시적으로 제외 |

통합 플랫폼 중립 검증은 다음 결과를 확인했다.

- `pnpm run check:product-boundary`: **330 files scanned, passed**.
- `pnpm run test:upstream`: **36 pass, 0 fail**.
- `pnpm run test:studio`: **23 files, 125 pass, 0 fail**.
- `pnpm run build:studio`: **228 modules transformed, 성공**.
- `pnpm run test:automation`: **408 pass, 0 fail**.
- `git diff --check`: OK.

지원 대상 최종 native 검증은
[Alhangeul Desktop run 33587996496](https://github.com/postmelee/alhangeul-tauri/actions/runs/33587996496)에서
Linux arm64·x64 build, Windows x64 build와 MSI·NSIS installer smoke **4개 job
전체 성공**으로 확인했다. Linux x64·arm64 helper test/fmt/Clippy, core probe,
x64 DEB/RPM, arm64 DEB lifecycle와 Windows HWP/HWPX thumbnail 호출이 통과했다.

| 최종 native artifact | ID | SHA-256 |
|---|---:|---|
| `alhangeul-desktop-linux-x64` | `9831169440` | `05f7e2cb13d4f3d23cbea0ed8ae136d225fcf322d58082432dfc566a2f723e43` |
| `alhangeul-linux-x64-thumbnail-package` | `9831161863` | `bdd7597c606e04009c49d744b9231dc232ae2c270147974cf9215b9231766720` |
| `alhangeul-desktop-linux-arm64` | `9831041951` | `7d841f89225f9bd1af441fdc5b129853849b0a06d54deff67b72534cb100881d` |
| `alhangeul-linux-arm64-thumbnail-package` | `9831039819` | `abd7335790436219cfb96c16003b41fbaf565229fd7a252d708678ba95b8cd7f` |
| `alhangeul-desktop-windows-x64` | `9831385925` | `9af926ab0eafb23221394089d6cfd1d4b9c448358582eba7da4d940d1af5d62a` |
| `alhangeul-desktop-windows-x64-installer-smoke` | `9831624486` | `347bea731c14759a1eb5c70b1d0939c32790d74ee866eb6070a8e58e63291df5` |

같은 final candidate와 native run을 입력한
[Linux GUI run 33590789637](https://github.com/postmelee/alhangeul-tauri/actions/runs/33590789637)는
전체 성공했다. GUI artifact `alhangeul-linux-gui-33590789637`는 ID
`9831776242`, SHA-256
`094e02bf2c724f3c53e41ee4ee7ecd5065810d357bed818bbbe8d7d13c7369b7`이다.
workflow context는 build ref와 acceptance ref가 모두 final candidate이고 native run
ID가 `33587996496`임을 기록한다. Nautilus·Thunar 모두 실제 HWP/HWPX first
2/2·cached 2/2·changed 4/4 호출, 손상 문서 성공 cache PNG 0을 재확인했다.
512px render SHA-256은 온새미로
`2a499693e01e811eff49c6aff3102720945ae54c00d75bb102e56cbdd94a8abf`,
form-002
`35bd3ce2d05def6bf9ad525bc2a0a5b62f30ad3e1eb7c208e085a9e01a7be8ee`로
Stage 4, Stage 5와 최신 `devel` 통합 뒤에도 동일하게 재현됐다. 잘못 입력한
존재하지 않는 SHA로 시작된 run `33587925275`는 checkout 실패를 확인한 즉시
취소했으며 어떤 수용 근거에도 포함하지 않았다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_50_stage1.md): canonical HWPX MIME XML과
  x64 DEB/RPM·arm64 DEB install/update/failure recovery/uninstall 계약 완료.
- [Stage 2](../working/task_m010_50_stage2.md): 고정 fixture expectation과
  결과·exit·1,500 ms·256 MiB required core gate 완료.
- [Stage 3](../working/task_m010_50_stage3.md): ancestor symlink 허용과
  input/output leaf·inode 방어의 Linux x64·arm64 native 검증 완료.
- [Stage 4](../working/task_m010_50_stage4.md): private MIME 주입 없는 실제
  package와 Nautilus·Thunar 실사용 문서·failure cache 수용 완료.
- [Stage 5](../working/task_m010_50_stage5.md): 공식 문서 정렬과 같은 exact SHA의
  Linux·Windows native 및 Linux GUI 최종 회귀 완료.

## 잔여 위험과 후속 작업

### 잔여 위험

- GUI 수용 근거는 Ubuntu 22.04 x64, Nautilus `1:42.6-0ubuntu2`, Thunar
  `4.16.10-1`, Tumbler `4.16.0-1`, shared-mime-info `2.1-2` 조합이다.
- x64 RPM은 Ubuntu runner의 `rpm --nodeps` transaction 근거이며 Fedora
  dependency resolution이나 RPM GUI 성공 근거가 아니다.
- arm64는 DEB lifecycle, core와 helper를 검증했지만 file-manager GUI는
  검증하지 않았다. KDE/Dolphin, AppImage, Flatpak과 Snap도 범위 밖이다.
- 화면 증적은 첫 페이지 식별과 cache lifecycle을 수용한 것이다. 문서 앱과의
  pixel-perfect fidelity나 renderer 자체 layout 개선을 증명하지 않는다.
- Actions artifact는 임시 보존되므로 만료 뒤 원본 화면·metadata가 필요하면
  동일 exact SHA workflow를 재실행해야 한다.

### 후속 작업 후보

- Fedora x64 RPM dependency resolution과 Nautilus/Thunar GUI 수용.
- Linux arm64 실제 desktop file-manager GUI 수용.
- KDE/Dolphin 및 sandbox package별 thumbnail integration은 별도 이슈에서
  지원 범위·검증 환경을 먼저 승인받아 진행한다.

## 작업지시자 승인 요청

- 2026-09-02 작업지시자의 "진행해줘. PR에 작업중 생성된 이미지도 스크린샷도
  풍부하게 추가해줘."를 본 최종 보고서 작성, 오늘할일 완료 처리와
  `publish/task50` 대상 Open PR 게시 승인으로 기록한다.
- 이 승인은 PR self-merge, release, 배포, package 게시 또는 이슈 close 승인이
  아니다.
