# Task #50 Stage 5 — 공식 문서와 최종 회귀 정렬

GitHub Issue: [#50](https://github.com/postmelee/alhangeul-tauri/issues/50)
구현계획서: [`task_m010_50_impl.md`](../plans/task_m010_50_impl.md)
Stage: 5
검증일: 2026-09-02

## 단계 목적

Task #50에서 실제 구현·검증한 Linux HWPX MIME, package lifecycle, core gate,
symlink 정책과 file-manager 수용 범위를 기존 공식 문서의 소유 경계에 맞게
정렬한다. 문서 commit과 같은 exact SHA로 Linux x64·arm64 및 Windows x64 native
gate와 Ubuntu 22.04 x64 Linux GUI를 다시 실행해 다섯 구현 Stage의 최종 회귀를
확인한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `README.md` | Linux x64 DEB·RPM, arm64 DEB와 실사용 HWP/HWPX thumbnail 지원 범위 요약 |
| `docs/architecture/LINUX_THUMBNAILS.md` | canonical MIME, package 소유·refresh, symlink와 resource gate 계약 정렬 |
| `docs/DEVELOPMENT.md` | package-only MIME 및 실제 문서 검증 경로·제약 정렬 |
| `docs/operations/DESKTOP_RELEASE.md` | Task #50 exact native·GUI 증적과 설치·제거 판정 범위 추가 |
| `mydocs/plans/task_m010_50_impl.md`, `mydocs/orders/20260902.md` | 승인·실행 결과와 최종 보고 승인 대기 상태 |
| `mydocs/working/task_m010_50_stage5.md` | 본 단계 검증·한계·승인 경계 기록 |

## 본문 변경 정도 / 본문 무손실 여부

- Stage 5.1은 6개 문서에 71행을 추가하고 18행을 제거했다. 기존 문서의 구조와
  역사적 증적을 유지하면서 현재 구현과 충돌하는 설명만 최소 보정했다.
- 공식 문서 위치는 승인된 대로 architecture 계약은
  `docs/architecture/LINUX_THUMBNAILS.md`, 개발 명령은 `docs/DEVELOPMENT.md`,
  artifact·운영 한계는 `docs/operations/DESKTOP_RELEASE.md`, 사용자 요약은
  `README.md`로 유지했다. 별도 공식 문서나 `mydocs/manual`은 만들지 않았다.
- canonical HWPX MIME은 `application/x-hwpx`이며, package는 MIME XML,
  thumbnailer registration, helper 세 경로를 소유한다. 설치·제거 hook의
  `update-mime-database /usr/share/mime` 실행과 제3자 MIME·기본 앱 보존을 함께
  명시했다.
- ancestor symlink는 허용하되 input/output leaf symlink는 거부하는 정책,
  core peak RSS 256 MiB 판정과 helper worker `RLIMIT_AS` 256 MiB가 서로 다른
  경계임을 공식 문서에 구분했다.
- 제품 코드, workflow, `third_party/rhwp` gitlink와 fixture는 변경하지 않았다.
  exact candidate 실행 뒤에는 본 보고서·계획·오늘할일만 변경하므로 Stage 5 완료
  commit 전체가 원격 실행된 source라고 표현하지 않는다.

## 검증 결과

### 플랫폼 중립

```bash
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run test:automation
git diff --check
```

- Product boundary: **312 files scanned, passed**.
- Upstream fixture: **35 pass, 0 fail**.
- Studio: **105 pass, 0 fail**; production build **227 modules transformed, 성공**.
- 전체 automation: **390 pass, 0 fail**.
- `git diff --check`: OK.
- 첫 Studio test는 sandbox가 분리 worktree의 Vite 임시 폴더 생성을 막아 실패했다.
  동일 명령을 해당 worktree write 권한으로 다시 실행해 통과했으며 제품·test
  assertion 실패가 아니다.
- 지원 범위 밖 macOS 호스트에서 Rust desktop build/test 또는 Tauri build를
  실행하지 않았다.

### Exact native/package candidate

- 기준 `devel`: `8b865fa55b55aea232d0fb034a518c807ac4c003`.
- source/workflow candidate: `a07bd1330363ee767b9e1cc7a80bed6a685cebcf`.
- rhwp pin: `496333b27d21ddb9114ba9ae340bcb895870c9a7`.
- [Native run 33582889787](https://github.com/postmelee/alhangeul-tauri/actions/runs/33582889787),
  attempt 1, Linux arm64·x64 build, Windows x64 build와 installer smoke **전체 성공**.

| native artifact | ID | Artifact SHA-256 |
|---|---:|---|
| `alhangeul-desktop-linux-x64` | `9829506239` | `1e981551a362278c0abaed3e9bcc51985ad5265ebf5766232486cb774e0fd170` |
| `alhangeul-linux-x64-thumbnail-package` | `9829497377` | `731f94b3583eb7bdf1143051d775d6712fac29359a36026223a1efa4d072597d` |
| `alhangeul-desktop-linux-arm64` | `9829331007` | `8823a07dcf644b1d5d18bb8ac7b7a097941bb5dfed8a069a7ac49258af661379` |
| `alhangeul-linux-arm64-thumbnail-package` | `9829328297` | `364dfc38f3c802510cce600bb1ae81b47dcafadff06f97f178f1a0cf16948d6` |
| `alhangeul-desktop-windows-x64` | `9829763623` | `5ccf539a4a1a3e635092fcd9b319fad6b9d024754a5c2a8db1c9a8f2ffa72afb` |
| `alhangeul-windows-x64-installer-smoke` | `9829816271` | `2bedc14c4c5a854029ad6abad9ea5a6ce650422228622bd9c3735ed45f7b7ebb` |

- x64 DEB SHA-256은
  `d57a740db1372bbd8fb72df7db7afbba3d2ab3755db272351234ad1c66cfc8b5`,
  x64 RPM은
  `beae684ef58b142fffbeb51e85a321cd487448d2554cdff281c51c7511fbc4ce`,
  arm64 DEB는
  `e552026b11ccab9d52775d4e7cffecab3ce068f5dadf7aaebdab8921f612e022`다.
- 세 package evidence는 baseline, clean install, reinstall, interim uninstall,
  old install, update, 주입된 refresh 실패 관측, 명시적 복구와 최종 uninstall을
  포함한다. HWPX는 설치 시 `application/x-hwpx`, 제거 시 설치 전 baseline으로
  복귀했고 제품 세 경로가 제거됐다. 제3자 MIME·기본 앱은 보존됐다.
- core probe는 x64·arm64 모두 **88 records, breach 0**이다. x64 wall p95/max는
  73/174 ms, peak RSS p95/max는 70,778,880 bytes였고 arm64는 47/129 ms,
  69,992,448 bytes였다. 모든 성공 render가 1,500 ms와 268,435,456 bytes
  한도 안이었다.
- Windows MSI·NSIS fresh install/uninstall과 HWP/HWPX thumbnail fixture 호출이
  통과했다. MSI rollback은 기대된 1603을 관측했고 NSIS reinstall 뒤 dangling
  default association은 없었다.

### Exact Linux GUI와 package-only MIME

- [Linux GUI run 33585227125](https://github.com/postmelee/alhangeul-tauri/actions/runs/33585227125),
  attempt 1, 전체 성공.
- source, workflow acceptance와 native build ref는 모두
  `a07bd1330363ee767b9e1cc7a80bed6a685cebcf`, native run ID는
  `33582889787`이다.
- evidence artifact `alhangeul-linux-gui-33585227125`: ID `9830072758`,
  SHA-256 `256bdccf8e417478b587a6f0ec4be3e26dc7d15da3125bfbf140a35a3d62b908`.
- validate, checkout, source, handoff, native/helper download·verify, inventory,
  pre-install MIME, install, installed thumbnail, manager probe와 제품 GUI outcome이
  모두 `success`다.

| 관측 | 설치 전 | 설치 후 |
|---|---|---|
| 실제 HWP | `application/x-hwp` | `application/x-hwp` |
| 실제 HWPX | `application/zip` | `application/x-hwpx` |
| private MIME path | 없음 | 없음 |
| 제품 MIME XML | 없음 | `/usr/share/mime/packages/alhangeul-hwpx.xml` |

- package helper SHA-256은
  `00aa122e894ff3972a3664b06e5241f0627a71c139617b07dab54305fa1b010f`,
  registration은
  `42146f0cc8dd9397cf4885bcda0fded980c05ea1004a8fe641b970c6e06433da`,
  MIME XML은
  `b2fb7fda666bc217da9c90b48fcf09e7b68b6ad5275a97ce12db5a1bcd528c50`로
  native package evidence와 일치했다.

| manager | 실제 HWP/HWPX first | cached | changed | 성공 cache PNG | 손상 문서 성공 PNG |
|---|---|---|---|---:|---:|
| Nautilus | 각각 2 / 2회 | 각각 2 / 2회 | 각각 4 / 4회 | 4개 + failure marker 1개 | 0개 |
| Thunar/Tumbler | 각각 2 / 2회 | 각각 2 / 2회 | 각각 4 / 4회 | 4개 | 0개 |

- 실제 fixture SHA-256은 온새미로 HWP
  `e8592e74c9a8425c4ee2c5824d012ebe45e9f6dd36880b784ba594b4fd0a31ce`,
  form-002 HWPX
  `5ab8f7c368e02538f75f1cd2bd82bbd8de2f925a54ba7b38ec9395b2cdb804d4`로
  원본과 일치했다.
- 512px render SHA-256은 온새미로
  `2a499693e01e811eff49c6aff3102720945ae54c00d75bb102e56cbdd94a8abf`,
  form-002
  `35bd3ce2d05def6bf9ad525bc2a0a5b62f30ad3e1eb7c208e085a9e01a7be8ee`로
  Stage 4 결과와 같았다.
- Nautilus와 Thunar screenshot에서 온새미로의 제목·곡선 표지와 form-002의
  표·본문이 서로 구분됐다. 손상 HWP는 generic 문서 아이콘이며 성공 thumbnail
  PNG로 기록되지 않았다.

## 잔여 위험

- GUI 근거는 Ubuntu 22.04 x64, Nautilus `1:42.6-0ubuntu2`, Thunar
  `4.16.10-1`, Tumbler `4.16.0-1`, shared-mime-info `2.1-2` 조합이다.
  다른 배포판·desktop/version 전체 성공으로 확대하지 않는다.
- x64 RPM은 Ubuntu runner의 `rpm --nodeps` transaction 근거다. Fedora
  dependency resolution이나 RPM GUI 설치는 검증하지 않았다.
- arm64는 DEB package lifecycle, core와 helper를 검증했지만 GUI file-manager
  수용은 범위 밖이다. KDE, AppImage, Flatpak과 Snap도 검증하지 않았다.
- screenshot은 첫 페이지 식별과 cache lifecycle의 수용 근거다. 문서 앱과의
  pixel-perfect fidelity 또는 layout 개선을 증명하지 않는다.
- Actions evidence artifact는 임시 보존된다. 만료 뒤 원본 캡처와 metadata가
  필요하면 동일 exact SHA workflow를 다시 실행해야 한다.

## 다음 단계 영향

- Stage 1부터 Stage 5까지 승인된 구현 단계와 각 단계 수용 검증을 완료했다.
- 다음 절차는 작업지시자 승인 뒤 `task-final-report` skill로 최종 결과 보고서,
  오늘할일 완료 처리, 최종 commit, `publish/task50` push와 `devel` 대상 Open PR을
  준비하는 것이다.
- 이번 단계 완료는 release, 배포, package 게시, PR merge, 이슈 close 승인이
  아니다. 승인 전 해당 작업을 수행하지 않는다.

## 승인 요청

- Stage 5 공식 문서 정렬과 exact-SHA native·GUI 최종 회귀 결과의 승인을 요청한다.
- 승인 시 최종 보고서 및 PR 게시 절차로 진행한다.
