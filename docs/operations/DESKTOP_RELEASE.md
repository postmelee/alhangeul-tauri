# 데스크톱 artifact와 배포 준비

Alhangeul은 아직 공식 설치 파일이나 공개 릴리스를 제공하지 않는다. `.github/workflows/alhangeul-desktop.yml`은 Windows/Linux native build 결과, Windows installer·thumbnail smoke와 Linux thumbnail package lifecycle 진단을 수동 검증하고 14일 동안 Actions artifact로 보존하지만 GitHub Release를 생성하지 않는다.

## 제품 version 기준

현재 저장소의 제품 source version은 M010에서 승인한 독립 Alhangeul 기준선 `0.1.0`이다. 초기 코드의 `0.3.1`은 이전 제품의 release 계보이며 아래 Task #5의 `0.3.1` artifact는 version 재정렬 전에 생성한 native build smoke 증적이다. 둘 다 Alhangeul의 공식 release 계보로 간주하지 않는다.

root `package.json`을 source version의 기준으로 삼고 `pnpm run check:product-version`이 desktop package, Cargo manifest·lock과 Tauri 설정을 함께 검증한다. 아래 Task #7 exact-SHA 검증에서 `0.1.0` native artifact 생성을 확인했지만 `0.1.0` tag나 GitHub Release는 만들지 않았다. 공식 release, 고정 다운로드 경로와 updater 활성화는 별도 Issue와 승인이 필요하다.

## 현재 workflow 범위

`Alhangeul Desktop Artifact Build`는 `workflow_dispatch`로만 정의되어 있다.

| 대상 | Runner | Rust target | 예상 bundle |
|---|---|---|---|
| Windows x64 | `windows-2025` | `x86_64-pc-windows-msvc` | MSI, NSIS |
| Linux x64 | `ubuntu-22.04` | `x86_64-unknown-linux-gnu` | DEB, RPM, AppImage |
| Linux arm64 | `ubuntu-22.04-arm` | `aarch64-unknown-linux-gnu` | DEB |

workflow는 다음 작업만 수행한다.

1. submodule을 포함한 선택 commit checkout
2. Node, pnpm, Rust와 Linux Tauri 의존성 준비
3. 제품 경계·version, `rhwp` pin, automation, upstream·studio와 thumbnail core/source 검증
4. Windows thumbnail handler·worker, Linux x64·arm64 thumbnail helper와 Tauri bundle 생성
5. 필수 installer·thumbnail binary 종류·architecture·크기·SHA-256 inventory 검증
6. inventory를 포함한 Actions artifact 업로드
7. Linux x64 DEB/RPM과 arm64 DEB의 thumbnail helper·registration install/reinstall/update/rollback/uninstall
8. fresh `windows-2025` runner에서 Windows MSI·NSIS 설치·rollback·제거와 실제 HWP/HWPX Shell bitmap smoke
9. installer별 summary와 원본 log를 diagnostic artifact로 항상 업로드하고 build matrix와 smoke 결과를 함께 판정

repository-level Actions는 활성 상태지만 대상 CI와 native workflow는 자동 trigger 없이 수동 `workflow_dispatch`로만 실행한다. Actions 활성 상태는 workflow 성공이나 artifact 가용성을 보장하지 않으므로 run의 exact commit과 job 결과를 함께 확인해야 한다.

## Linux x64 exact-SHA GUI acceptance

`.github/workflows/alhangeul-linux-gui.yml`은 성공한 native build의 Linux x64 DEB를 별도 `ubuntu-22.04` standard runner에서 설치하고 실제 Tauri WebView·GTK dialog를 검사하는 수동 gate다. 이 workflow도 GitHub Release나 배포물을 만들지 않는다.

실행 순서는 다음과 같다.

1. `Alhangeul Desktop Artifact Build`를 수동 실행하고 대상 candidate의 정확한 40자리 commit SHA와 성공한 native run ID를 기록한다.
2. `Alhangeul Linux GUI Acceptance`를 열어 같은 SHA를 `build_ref`, 같은 run ID를 `native_run_id`로 입력한다. branch, tag, latest run이나 artifact 이름만으로 대체하지 않는다.
3. workflow가 checkout SHA, native run의 repository·workflow·event·conclusion, Linux x64 artifact ID·digest와 동봉 inventory를 검증한 뒤 단일 DEB만 설치하는지 확인한다.
4. GUI job이 HWP/HWPX 열기·저장·재열기, drag-in, 직접 PDF, GTK Print to File와 CUPS-PDF 반복 인쇄에 더해 package-installed helper의 Nautilus·Thunar/Tumbler thumbnail probe를 통과하는지 확인한다.
5. acceptance run의 `alhangeul-linux-gui-<run-id>` evidence artifact를 내려받아 아래 read-back 항목을 확인한다. 보존 기간은 7일이다.

| Evidence | 확인 항목 |
|---|---|
| `workflow-context.json`, `checked-out-sha.txt` | 요청 SHA·native run ID와 checkout SHA가 candidate 기록과 같은가 |
| `artifact-handoff.json`, inventory, `installed-deb.sha256` | 원본 native run·artifact ID·archive digest와 설치 DEB hash가 한 chain으로 결속되는가 |
| `native-environment.txt`, `step-outcomes.json` | Node/pnpm/Rust/driver/WebKitGTK/GTK/CUPS/Poppler version과 GUI 실행 전 주요 step outcome이 기록됐는가 |
| scenario manifest·screenshot·native UI tree | toolbar 초기 숨김, 문서 중앙 정렬, 한글 glyph, dialog 상태와 실패 지점이 summary와 일치하는가 |
| 직접/GTK/CUPS PDF와 render PNG | 6쪽 A4, 한글 text, 빈 쪽·crop·tofu 이상이 없는가 |
| `thumbnail-manager/`의 screenshot·summary·`execve` trace | 설치된 helper·registration으로 Nautilus·Thunar가 direct/preview/icon fallback과 cache hit/invalidation을 수행했는가 |

GUI 실패는 evidence 업로드를 위해 일시적으로 다음 step에 전달되지만 마지막 gate가 원래 실패를 다시 실패로 판정한다. 반대로 GUI가 성공해도 evidence 업로드가 실패하거나 파일이 없으면 run은 실패한다. 자동 재시도는 없으며 실패 원인을 확인한 뒤 새 run으로 다시 검증한다.

CUPS-PDF 출력은 evidence root의 전용 writable 하위 디렉터리만 사용하고 system print 기본 용지는 A4로 고정한다. PDF text floor는 Task #15 Stage 4.8 Linux read-back의 직접 PDF `45/642/410/638/478/250`, GTK/CUPS `45/54/408/637/478/250` 실측치보다 충분히 낮은 경로별 값으로 판정한다. 임계값을 낮추거나 selector를 추가할 때는 실패 run의 PDF summary와 AT-SPI tree를 먼저 보존한다.

전체 WDIO scenario 전에 external driver 연결만 분리 진단할 때는 Linux에서 DEB와 exact `tauri-driver`·`WebKitWebDriver`를 준비한 뒤 다음 진입점을 사용한다. 이 probe는 제품 수용 성공을 대신하지 않는다.

```bash
xvfb-run --auto-servernum -- \
  pnpm run probe:gui:linux -- \
  --app /usr/bin/Alhangeul \
  --output-dir /tmp/alhangeul-gui-probe
```

이 gate가 자동화하는 범위는 hosted Linux x64의 production DEB, Xvfb의 Nautilus 42.6·Thunar 4.16.10/Tumbler 4.16과 가상 PDF printer다. physical user session, Linux arm64 GUI, RPM/AppImage desktop integration, KDE/Dolphin, Flatpak/Snap, physical printer와 Windows GUI는 별도 native 수용 대상이다. screenshot과 PDF render의 한글 glyph·배치 read-back은 사람이 확인한다. GitHub Codespaces는 이 workflow의 실행 환경이 아니며, 무료 allowance와 spending limit을 먼저 확인한 경우의 선택적 troubleshooting에만 사용한다.

Task #34 PR merge 전에는 workflow가 default branch에 없으므로 실제 dispatch 성공을 주장하지 않는다. merge 뒤 같은 exact SHA의 native build와 위 GUI run·evidence read-back이 성공해야 Issue #34의 live close gate가 완료된다.

## 검증된 `0.1.0` 기준선

2026-07-29에 다음 exact commit을 `publish/task7`에서 검증했다.

- Commit: `02931beb43e2944083e78d792603bff82200478c`
- [CI run 30383886807](https://github.com/postmelee/alhangeul-tauri/actions/runs/30383886807): 제품 version gate를 포함한 platform-neutral 검사와 Ubuntu desktop Rust test·Clippy 성공
- [Native run 30384403366](https://github.com/postmelee/alhangeul-tauri/actions/runs/30384403366): 같은 SHA에서 Windows x64, Linux x64, Linux arm64의 `0.1.0` build·inventory·upload 성공

native run의 artifact 세 개를 별도 임시 디렉터리에 내려받고 각 artifact의 `alhangeul-artifact-inventory.json`을 기준으로 압축 해제된 모든 파일의 크기와 SHA-256을 다시 계산했다. 세 inventory는 build 시 기록된 값과 일치했고 검증용 임시 디렉터리는 삭제했다.

GitHub API가 반환한 Actions artifact archive metadata는 다음과 같다. 세 artifact는 확인 시점에 `expired: false`였고 14일 retention을 사용한다. API archive digest와 아래 installer SHA-256은 서로 다른 검증 대상이다.

| Platform | Actions artifact | ID | Archive 크기 (bytes) | API archive digest | 만료 시각 (UTC) |
|---|---|---:|---:|---|---|
| Windows x64 | `alhangeul-desktop-windows-x64` | `8698659028` | 53,659,794 | `sha256:74f8ae91c83c6cb857b94e2ec3851460fb36dcf9a060160e88da8b72036edb22` | `2026-08-11T17:57:32Z` |
| Linux x64 | `alhangeul-desktop-linux-x64` | `8698704612` | 354,129,430 | `sha256:3b63ab15180e33c72683f3f129cd661673ba7ac55a644c0d1e7cdada68b8803a` | `2026-08-11T17:58:51Z` |
| Linux arm64 | `alhangeul-desktop-linux-arm64` | `8698559801` | 90,030,240 | `sha256:20a0c4f3195ab078bc8f7e2c89428096ede7937a41e4ec6d87ec3401bbdaa8fc` | `2026-08-11T17:54:09Z` |

다운로드 후 독립 재검증한 필수 `0.1.0` installer inventory:

| Platform | 종류 | 파일 | 크기 (bytes) | SHA-256 |
|---|---|---|---:|---|
| Windows x64 | MSI | `msi/Alhangeul_0.1.0_x64_en-US.msi` | 28,192,768 | `b03dff87b050cde11153f7c12d71fe7efeef529653693e4035f9eef157626316` |
| Windows x64 | NSIS | `nsis/Alhangeul_0.1.0_x64-setup.exe` | 25,706,193 | `a75834e758d73ef5c5ae520926df67a2b9f4c4dd7af7d78ef8960b95f82b8487` |
| Linux x64 | AppImage | `appimage/Alhangeul_0.1.0_amd64.AppImage` | 106,838,520 | `a03971f3de13c65f8c109018a6fe7d345ef3fb326328699183f6d4fcf61da945` |
| Linux x64 | DEB | `deb/Alhangeul_0.1.0_amd64.deb` | 30,092,866 | `29220ca6834588f3602429cb6eb7ab9edf7c589fdddb8f78f36b8968a4f7848c` |
| Linux x64 | RPM | `rpm/Alhangeul-0.1.0-1.x86_64.rpm` | 30,093,069 | `2fa1997d1932085f21030da0ed60c990e73f6c4e6b43ce4bccf4563822d6dd19` |
| Linux arm64 | DEB | `deb/Alhangeul_0.1.0_arm64.deb` | 30,049,994 | `15124f7a98d508aec74e930a542705ee5eeaeda0d03bcfc6bdf99399e0cfd737` |

이 결과는 `0.1.0` source version이 exact source에서 installer 파일명과 package metadata에 반영되고 Actions upload 뒤에도 inventory가 보존됐다는 Task #7 당시의 build smoke 증거다. 이 Task #7 run 자체에서는 installer 설치·실행, 코드 서명, GitHub Release, package 게시와 updater를 검증하지 않았다.

## 검증된 Windows installer package smoke

2026-08-02 Task #11은 PR #12 최종 검토 보정 뒤 다음 exact commit에서 Windows installer 자동 수용 기준과 기존 세 플랫폼 build matrix를 모두 통과했다.

- Commit: `0a344d3ee63220e25ad2d920a583f7366b51c1d2`
- [Native run 30706473386](https://github.com/postmelee/alhangeul-tauri/actions/runs/30706473386): `workflow_dispatch`, `publish/task11`, 같은 exact SHA
- Windows x64 build job `91386363519`, Linux x64 build job `91386363546`, Linux arm64 build job `91386363548`, Windows installer smoke job `91387110741`: 모두 `success`
- smoke job의 `checked-out-sha.txt`가 같은 SHA를 기록해 검증 대상과 소비 source가 일치함을 확인했다

선행 run [30697442296](https://github.com/postmelee/alhangeul-tauri/actions/runs/30697442296)(`d698d40…`)도 성공했으나, 이후 최종 검토 보정으로 NSIS 중단 transaction의 기존 snapshot 보존과 smoke의 삭제 key 복구가 바뀌었다. 현재 유효한 수용 증적은 위 `0a344d3…` run이다.

GitHub API가 반환한 Actions artifact archive metadata는 다음과 같다. 네 artifact는 14일 retention을 사용하며 아래 installer SHA-256과 API archive digest는 서로 다른 검증 대상이다.

| 용도 | Actions artifact | ID | Archive 크기 (bytes) | API archive digest | 만료 시각 (UTC) |
|---|---|---:|---:|---|---|
| Windows installer 진단 | `alhangeul-desktop-windows-x64-installer-smoke` | `8820566083` | 29,054 | `sha256:540b1641f3a387dd48cb1e81f227931b0d6b3b14ccef76600e19f57e6764112d` | `2026-08-15T15:49:51Z` |
| Windows x64 bundle | `alhangeul-desktop-windows-x64` | `8820554656` | 53,661,343 | `sha256:2115c9dd0827dd5e8faa3442c9874c60f6c9cbb493d079fa9de142d4ce03684b` | `2026-08-15T15:48:50Z` |
| Linux x64 bundle | `alhangeul-desktop-linux-x64` | `8820557797` | 353,970,140 | `sha256:7583130821b58b2273c537ddd5534bf2212546ac0cf220baef0ff28338b53376` | `2026-08-15T15:48:51Z` |
| Linux arm64 bundle | `alhangeul-desktop-linux-arm64` | `8820517301` | 90,030,122 | `sha256:ad23e638bb0cb93cd4bf1cb7a053f054ed993d948e9f969d9e495a3987a32799` | `2026-08-15T15:45:29Z` |

Windows bundle을 별도 임시 디렉터리에 내려받아 동봉 inventory와 파일을 독립 재검증했다.

| 종류 | 파일 | 크기 (bytes) | SHA-256 |
|---|---|---:|---|
| MSI | `msi/Alhangeul_0.1.0_x64_en-US.msi` | 28,188,672 | `d6052adea195c9e296a3732956ed407f5f6882465f8b81e72fffd75aea51865a` |
| NSIS | `nsis/Alhangeul_0.1.0_x64-setup.exe` | 25,708,174 | `44fb23efaa1ad6ea9a353df4c62ade31abf25e55f2f4e4ade3d2587890278143` |

MSI와 NSIS는 각각 clean state, silent install exit `0`, 제품 version `0.1.0`, canonical HWP/HWPX handler, 기존 기본 연결 불변, Desktop·Start Menu shortcut, bounded process launch, uninstall exit `0`, 제품 소유 상태 cleanup을 통과했다. Fixture는 실행 전후 SHA-256이 동일했다. MSI verbose log에는 Desktop·Start Menu·uninstall shortcut의 `ShortcutCreate` 세 개와 대응하는 세 `ShortcutRemove`가 기록됐고 `Return value 3`은 없었다.

리뷰 반영으로 바뀐 경로는 다음 증적으로 확인했다.

| 변경 | 확인 방법 |
|---|---|
| NSIS snapshot key를 `Software\Alhangeul\FileAssocBackup`으로 이동 | NSIS `default-mutation` 판정 통과. Tauri NSIS는 설치 중 `.hwp`/`.hwpx` 기본값을 덮어쓰므로, 새 key로의 snapshot·복원이 실제로 동작하지 않으면 baseline과 달라져 실패한다 |
| 중단된 NSIS transaction의 committed snapshot 보존 | 기존 `State`가 있으면 snapshot을 덮어쓰지 않고 `Default` 뒤 `State`를 기록하는 source 계약 통과. Native smoke는 변경된 hook의 정상 install/uninstall과 backup cleanup을 확인했으며 강제 종료·재시도 주입은 수행하지 않았다 |
| 새 backup key의 cleanup | uninstall 뒤 clean-state의 소유 registry 수 `0`. 판정 대상에 backup key의 `State` value를 포함했다 |
| smoke의 삭제 extension key 복구 | 원래 존재한 key만 재생성하는 source 계약 통과. MSI·NSIS smoke의 default 불변과 최종 clean state 모두 통과 |
| WiX protocol block `[#Path]` 통일 | MSI validation 통과와 silent install exit `0` |
| workflow `!cancelled()`와 `Join-Path` 경로 정리 | diagnostic artifact 업로드 성공과 step outcome 4개 모두 `success` |

이 결과는 fresh hosted runner의 반복 가능한 비대화형 package smoke다. 실제 GUI에서 HWP/HWPX 열기·저장·인쇄, Explorer 기본 앱 선택 UI, 장시간 사용과 Windows 실제 사용자 환경의 최종 수동 검증을 대신하지 않는다. Artifact는 공개 배포물이 아니며 만료 뒤 재사용할 수 없다.

2026-08-26 Task #14 Stage 4는 exact source `e407c20cfd23059b997590462a5e66fb47e1aa03`의 [native run 32948057314](https://github.com/postmelee/alhangeul-tauri/actions/runs/32948057314)에서 Linux arm64 job `98113033201`, Linux x64 `98113033413`, Windows x64 `98113033443`과 installer smoke `98120085085`가 모두 성공했다.

- Windows bundle은 x64 handler DLL과 worker EXE의 고정 filename·PE 종류·inventory를 통과했다.
- MSI injected rollback은 기대한 exit `1603` 뒤 원상복구됐고, MSI·NSIS 정상 install/uninstall은 exit `0`, NSIS reinstall과 기존·부재·제3자 handler 조건부 복원을 통과했다.
- 실제 HWP와 HWPX fixture는 모두 요청 edge 256 px에서 Shell 성공 HRESULT와 bitmap을 반환했으며 fixture hash, worker 잔류와 제품 소유 registry cleanup도 통과했다.

이 증적은 hosted Windows에서 실제 COM/Shell 경로까지 확인하지만 Explorer 보기 크기·DPI·cache 갱신과 한컴 설치 환경 UI를 대신하지 않는다. 같은 exact 후보의 수동 gate는 [Windows thumbnail 아키텍처](../architecture/WINDOWS_THUMBNAILS.md)에 따라 Stage 6에서 수행한다.

2026-08-28 Task #14 Stage 7의 PR #46 리뷰 보정 source candidate `51099615681432862a51691aeb3c65dafd2da541`은 [CI run 33154309226](https://github.com/postmelee/alhangeul-tauri/actions/runs/33154309226)과 [native run 33154321608](https://github.com/postmelee/alhangeul-tauri/actions/runs/33154321608)을 통과했다.

- CI Unit tests job `98793335089`, Linux x64 job `98793375935`, Windows x64 job `98793376092`, Linux arm64 job `98793376118`, Windows fresh-installer smoke job `98805510881`이 모두 성공했다.
- MSI와 NSIS는 HWP `111exam_social.hwp`와 embedded preview가 없는 HWPX `03-blank_hwpx.hwpx`의 실제 256 px Shell bitmap을 `HRESULT=0`으로 반환했다. 두 installer 모두 install/uninstall exit `0`, 제거 뒤 owned registry count `0`과 clean state를 확인했다.
- NSIS는 제거 직전 `.hwp`/`.hwpx` 기본값을 제거 대상 자기 ProgID로 둔 fixture에서도 `NoDanglingCanonicalDefault=true`였고 제3자 Hancom sentinel을 복원했다. MSI injected rollback은 예상 exit `1603` 뒤 원상복구됐다.
- fixture 실행 전후 hash는 같았다. Stage 7은 제품 renderer·font 출력을 바꾸지 않았고 대표 raster gate가 다시 통과했으므로 Stage 6.1의 Windows VDI 시각 수용을 유지했다.

| artifact | ID | 크기 (bytes) | SHA-256 digest | 만료 |
|---|---:|---:|---|---|
| Windows installer smoke | `9680462259` | 45,525 | `6c51feb8602dbc293363160bdcb94b9f0a7ec65f7353a4d23f80e38eac7840ee` | 2026-09-11 |
| Windows x64 bundle | `9680268296` | 120,675,282 | `19680c69df03d707c2b3d27ca191ff26e1a8d6ed30ba61779a9c8f6ea99bf802` | 2026-09-11 |
| Linux x64 bundle | `9679593323` | 505,551,400 | `ce5f15945f52eb3c7897579a5f75bebe242371326d07a09d2d2426e796f21670` | 2026-09-11 |
| Linux arm64 bundle | `9679356860` | 166,327,127 | `ed7442b17d8acfe75de93a13b616245037e72ba4caff18309c2949e268a5e8ec` | 2026-09-11 |
| Windows thumbnail core diagnostics | `9679337373` | 3,305 | `6c59c444a73e2624bff355f5f0794646c26e2316d79d6cb49f087f52d1885d4d` | 2026-09-11 |

이 자동 증적은 등록 해제 실패 주입 자체를 실행한 것은 아니다. MSI/NSIS source 계약은 thumbnail extension 실패를 best-effort로 고정하고, native smoke는 정상 등록 해제·owner-scoped cleanup과 dangling association 부재를 확인한다. Windows active ProgID가 제3자 thumbnail handler를 소유하면 extension ShellEx보다 우선할 수 있으며 제품은 공존을 위해 `UserChoice`나 제3자 ProgID를 변경하지 않는다.

### Windows installer 자동 gate를 다시 돌려야 하는 변경

이 workflow는 `workflow_dispatch` 전용이라 push나 PR로 자동 실행되지 않는다. 다음 변경은 자동으로 검증되지 않으므로 수동 dispatch가 필요하다.

| 변경 | 이유 |
|---|---|
| Tauri 버전 상향 | NSIS hook은 Tauri 기본 file association 동작을 되돌리는 구조다. upstream이 association 처리나 내부 `UPDATEFILEASSOC` macro를 바꾸면 기존 기본 연결 보존이 조용히 깨진다 |
| `windows/main.wxs`, `windows/nsis-hooks.nsh`, `tauri.conf.json`의 bundle 항목 | installer가 실제로 쓰는 registry·shortcut 계약이 바뀐다 |
| `[[bin]] name`, `productName` | 실행 파일명, 설치 경로, ProgID, shortcut 이름이 함께 움직인다 |
| `apps/thumbnail-*`, `crates/document-preview`, `scripts/build-thumbnail-binaries.mjs` | COM ABI, worker protocol·resource 제한과 bundle PE 계약이 바뀐다 |
| `scripts/windows-installer-smoke.ps1`, `scripts/windows-thumbnail-smoke.ps1`, smoke job | 판정 자체가 바뀌므로 source test만으로는 runtime 동작을 보증하지 못한다 |

플랫폼 중립 test(`pnpm run test:automation`)는 이들 source 계약을 고정하지만 실제 설치·제거 동작은 확인하지 않는다.

Task #13은 exact upstream `v0.8.2` Studio entry, HWPX native 저장과 현재 페이지 SVG 기반 직접 PDF 경계를 다시 구성했다. 따라서 Task #9의 기존 candidate와 위 Task #11 artifact·SHA는 Task #13의 기능 수용이나 공개 후보로 승계하지 않는다. Stage 5의 플랫폼 중립 gate가 통과해도 native 수용 증거는 아니며, 별도 승인한 Stage 6에서 Stage 5 commit을 포함한 새 exact SHA로 Windows/Linux bundle과 GUI·저장·PDF·package gate를 다시 검증해야 한다. 그 결과가 Go일 때만 해당 exact SHA를 Task #9 prerelease 후보 재개 입력으로 사용한다.

2026-08-08 Task #13 Stage 6 exact SHA `63a2703cebf3a79d11a010974203fdaf4ccd3e76`은
[CI run 31255124269](https://github.com/postmelee/alhangeul-tauri/actions/runs/31255124269)와
[native run 31255131950](https://github.com/postmelee/alhangeul-tauri/actions/runs/31255131950)에서
Windows x64·Linux x64·Linux arm64 build, inventory와 Windows MSI·NSIS installer smoke를
통과했다. Windows와 최소 Linux에서 직접 PDF 저장이 성공했고 Windows PDF의 한글
검색·선택·복사를 확인했다. 다만 같은 후보의 실제 인쇄가 editor WebView의 빈 한 쪽을
출력해 별도 Issue #15로 분리됐다. Task #13 PR은 이 분리 경계를 기록한 뒤 진행할 수
있지만, Task #9 prerelease 후보 재개는 Task #15 merge와 두 task를 포함한 새 exact SHA의
Windows/Linux 수용 전까지 No-Go다.

### 실제 인쇄와 PDF 직접 저장의 분리 gate

PDF 직접 저장 성공은 실제 인쇄 성공을 대신하지 않는다. `file:print-to-pdf`는 Alhangeul의 Rust searchable PDF job이다. `file:print`는 모든 문서 페이지를 upstream `profile=print` SVG와 print-page primitive로 조립한 전용 surface만 system print로 보내며, browser는 upstream visible preview를, Tauri는 hidden same-origin surface의 직접 `window.print()`를 사용한다.

Windows/Linux exact 후보에서 `인쇄`를 선택하면 먼저 다음 항목을 확인한다.

1. Tauri에서는 별도 Alhangeul preview 창 없이 system print dialog가 직접 열린다.
2. system preview의 제목·쪽 수·세로/가로 방향과 본문이 열린 문서와 일치한다.
3. 메뉴·리본·상태 표시줄 같은 Studio chrome이나 빈 editor 한 쪽이 문서 대신 표시되지 않는다.
4. 취소·완료·반복 인쇄 뒤 hidden surface나 orphan 창이 남지 않고 editor가 계속 동작한다.
5. Windows에서는 단일·다중 페이지 한글 문서를 Microsoft Print to PDF 또는 사용 가능한 프린터로 보내고 결과 쪽 수·내용을 확인한다.
6. Linux에서는 system print dialog 진입과 전용 surface의 전체 페이지·한글 표시를 확인한다.

system dialog 미진입, same-origin hidden surface 접근 실패, 빈 페이지, 쪽 수·방향 불일치는 No-Go다. 이 경우 editor WebView 직접 인쇄로 fallback하지 않고 hidden surface lifecycle과 platform WebView 인쇄 경계를 보정한다.

Stage 6 전에는 branch push·workflow dispatch·artifact 생성을 하지 않는다. Stage 6에서도 release tag, GitHub Release, 서명, package 게시, updater 활성화는 범위 밖이다.

## 검증된 rhwp `v0.8.4` native 수용 기준선

2026-08-14~15 Task #24는 rhwp `v0.8.4` / resolved commit
`496333b27d21ddb9114ba9ae340bcb895870c9a7`의 core, native Cargo lock, bundled WASM과
전체 Studio bundle을 다음 Alhangeul exact source에서 검증했다.

- 실행 가능 commit: `88baa5666ec55bf043844bae01ec4d422278851c`
- [CI run 31688454752](https://github.com/postmelee/alhangeul-tauri/actions/runs/31688454752): Unit tests job `94409981595` 포함 전체 성공
- [Native run 31688732973](https://github.com/postmelee/alhangeul-tauri/actions/runs/31688732973): Windows x64, Linux x64, Linux arm64 build와 Windows MSI·NSIS installer smoke 전체 성공
- Windows x64는 NSIS 전체 GUI 수용과 같은 SHA의 MSI 자동 package smoke를 결합했고, Linux x64는 native GitHub Codespaces에서 Stage 3 DEB를 설치해 전체 GUI 수용했다.

### Task #24 artifact provenance

Actions artifact는 14일 retention의 임시 검증물이며 확인 당시 `expired=false`였다. API
archive SHA-256과 package inventory SHA-256은 서로 다른 검증 대상이다.

| 용도 | Actions artifact | ID | 압축 크기 | Archive SHA-256 | 만료 시각(UTC) |
|---|---|---:|---:|---|---|
| Windows installer 진단 | `alhangeul-desktop-windows-x64-installer-smoke` | `9176977156` | 31,191 B | `1e91875ef4bd8b8e3dab99e04602a42bd5a90920c9616ae7919947092e6e077b` | 2026-08-27 10:12:00 |
| Windows x64 bundle | `alhangeul-desktop-windows-x64` | `9176938095` | 102,217,253 B | `6bfc9e288d94084438ff135d1d6633bd9bb696baf19b17cfbd82995649f8f9ab` | 2026-08-27 10:10:34 |
| Linux x64 bundle | `alhangeul-desktop-linux-x64` | `9176850348` | 505,449,721 B | `5f7a0df6aa6567d221523243eba8c0e2b1b022f4d23683577a30707d32223d7f` | 2026-08-27 10:07:09 |
| Linux arm64 bundle | `alhangeul-desktop-linux-arm64` | `9176603779` | 166,240,083 B | `5f6a338b1c013a4ffee3c99d9d89fed6b9584dc06c54a9b731508db118dcfd98` | 2026-08-27 09:59:16 |

동봉 inventory와 별도 SHA-256 계산이 일치한 필수 package는 다음과 같다.

| Platform | 종류·파일 | 크기 | SHA-256 |
|---|---|---:|---|
| Windows x64 | MSI `Alhangeul_0.1.0_x64_en-US.msi` | 53,424,128 B | `4861eae6a0bb08b072888dcf652e6eea3121735f167016cf61e5b19dfa1ee652` |
| Windows x64 | NSIS `Alhangeul_0.1.0_x64-setup.exe` | 49,023,164 B | `a24f3e1331a25226bc1d543709a13133743fab662a3dfd747c0a15d84959667e` |
| Linux x64 | AppImage `Alhangeul_0.1.0_amd64.AppImage` | 131,820,024 B | `e6ab104b13af5b78b6c8290f5d1979d26f9b785ab72c2e2d6a81f4831c6dc876` |
| Linux x64 | DEB `Alhangeul_0.1.0_amd64.deb` | 55,423,840 B | `7cb4036fd6886752fdc7fba09766cd8abd4f8677d29c23a6c204e90edbc1cc7b` |
| Linux x64 | RPM `Alhangeul-0.1.0-1.x86_64.rpm` | 55,423,924 B | `5580af3a9d6f7427dd9078dabf91ab136f6824e141b438d08dcebf8bced286b8` |
| Linux arm64 | DEB `Alhangeul_0.1.0_arm64.deb` | 55,444,426 B | `7bb17e3480319593f412e1751fc0e93a7db080e72d2c28a99249f95eba35f4d4` |

### Windows x64 GUI 경계

관리자 권한이 없는 Windows x64 VDI에서 NSIS clean install, 앱 실행, HWP/HWPX 파일
선택·drag-in·저장·다른 이름 저장·재열기, 한글 UI, searchable PDF와 Microsoft Print to
PDF 저장·취소·반복, uninstall을 확인했다. MSI는 VDI에서 수동 설치하지 않았고 같은 SHA의
fresh `windows-2025` runner에서 clean install, 제한 실행, canonical association, shortcut,
기존 기본 연결 보존과 uninstall cleanup을 자동 확인했다. 따라서 MSI의 package-level 수용은
완료했지만 MSI 경유 수동 GUI는 미실행 한계로 남는다.

### Linux x64 GUI 경계

Stage 3 Linux x64 artifact의 inventory를 다시 검증한 뒤 DEB를 native `amd64` GitHub
Codespaces에 설치했다. 환경은 Ubuntu 24.04, kernel `6.8.0-1052-azure`, WebKitGTK
`2.52.3-0ubuntu0.24.04.1`, GTK `3.24.41-4ubuntu1.3`, CUPS
`2.4.7-1.2ubuntu7.14`, CUPS-PDF `3.0.1-14ubuntu0.24.04.1`이었다.

- 대표 HWP를 GTK file chooser로 열고 6쪽 중앙 정렬·한글 toolbar와 로컬 글꼴 감지 dialog를 확인했다. Codespace에 원본 글꼴 하나가 없어 앱의 `대체 글꼴로 보기` 경로를 사용했다.
- 대표 HWPX를 PCManFM에서 앱으로 drag-in했고 1쪽 한글 본문과 표가 정상 표시됐다.
- HWP와 HWPX를 각각 다른 이름으로 저장하고 `Ctrl+S` 뒤 재열었다. 원본 fixture SHA-256은 각각 `8b786d6824622afae2220b203beeef6e5592157e1896fea055ebc602817113c1`, `1f3d2a322383e229862cd6d97526766ce285eb58d062242e03bce09a8aa69406`으로 유지됐다.
- 직접 저장 PDF는 A4 6쪽, 287,282 B, SHA-256 `488c3ee2c4423bed97a3403a799e79413f84784a0b093c0e53d71d9f893030eb`이며 모든 쪽이 비어 있지 않고 한글 텍스트 검색이 가능했다.
- `인쇄`는 별도 Alhangeul preview 없이 GTK system print dialog로 직접 진입했다. 전체 페이지와 `CUPS-PDF`를 선택해 저장한 결과는 A4 6쪽, 457,293 B, SHA-256 `34ced0e91e33b5f1a7adacce89a6be58170e1231c65cd91146ae2d167429f619`이며 렌더링한 모든 쪽의 한글 본문·표·방향을 시각 확인했다. 저장 뒤 재인쇄 dialog 진입, 취소, 다시 진입과 editor 복원을 확인했다.

Codespaces는 GPU 없는 일회성 headless X11 환경이라 WebKitGTK의 기본 compositing에서 file
chooser 전환 뒤 화면이 검게 남았다. 같은 설치 binary를 software WebKit compositing과
software GL로 재실행하자 필수 GUI 시나리오 전체를 관찰할 수 있었고 앱 log에는 panic,
fatal, segmentation fault 또는 uncaught error가 없었다. 이 설정은 수용 환경 제약의
회피이며 제품 source·workflow·GUI harness에는 추가하지 않았다. 수용 종료 뒤 Codespace를
삭제했다.

AppImage와 RPM은 Stage 3 inventory·checksum까지만 확인했고 이번 GUI는 DEB 설치 binary로
수행했다. Linux arm64는 hosted runner의 DEB build·inventory만 수용했으며 실제 arm64 GUI를
실행하지 않았다. 이 Task는 GitHub Release, tag, 서명, package 게시, 고정 다운로드 URL과
updater를 만들거나 활성화하지 않는다.

## 검증된 native canary

2026-07-28에 다음 exact commit을 `publish/task5`에서 검증했다.

- Commit: `b8847f5086eab7c0f8243e999f2c145271ef713c`
- [CI run 30357007192](https://github.com/postmelee/alhangeul-tauri/actions/runs/30357007192): platform-neutral 검사와 Ubuntu desktop Rust test·Clippy 성공
- [Native run 30357240402](https://github.com/postmelee/alhangeul-tauri/actions/runs/30357240402): Windows x64, Linux x64, Linux arm64 build·inventory·upload 성공

같은 날 native run의 artifact 세 개를 별도 임시 디렉터리에 내려받고 각 artifact에 포함된 `alhangeul-artifact-inventory.json`을 기준으로 모든 파일의 크기와 SHA-256을 다시 계산했다. 세 inventory는 build 시 기록된 값과 일치했다.

GitHub API가 반환한 Actions artifact archive metadata는 다음과 같다. 세 artifact는 확인 시점에 `expired: false`였으며 14일 retention으로 2026-08-11에 만료될 예정이다.

| Platform | Actions artifact | Archive 크기 (bytes) | API archive digest |
|---|---|---:|---|
| Windows x64 | `alhangeul-desktop-windows-x64` | 53,615,008 | `sha256:fc9f6dc395475d699eb2b7bbf00da80139474318ac4cc6776f1f12459f77b595` |
| Linux x64 | `alhangeul-desktop-linux-x64` | 354,121,922 | `sha256:0b9c5826c1726ee06639b265acff254cb6468a5375f6d9240909881bcf792d4d` |
| Linux arm64 | `alhangeul-desktop-linux-arm64` | 90,022,918 | `sha256:7581e2cc2fb76cf6f2ad8e6335751fe3e06db804fe627fdfa70d223eb7dd353d` |

다운로드 후 독립 재검증한 필수 installer inventory:

| Platform | 종류 | 파일 | 크기 (bytes) | SHA-256 |
|---|---|---|---:|---|
| Windows x64 | MSI | `msi/Alhangeul_0.3.1_x64_en-US.msi` | 28,192,768 | `bfab22693473c2cbd60b5e3aa396ccad9a6b7c7649d19d671f84ecf11afa45b9` |
| Windows x64 | NSIS | `nsis/Alhangeul_0.3.1_x64-setup.exe` | 25,661,219 | `c2e152bcec79a1c423f1ae1410840a96b1441f50710320b12a93eb5ce89191be` |
| Linux x64 | AppImage | `appimage/Alhangeul_0.3.1_amd64.AppImage` | 106,834,424 | `1c8f678f3a1e97d0498129934f637ffc82e8479378df8a07be3c76d56246b10b` |
| Linux x64 | DEB | `deb/Alhangeul_0.3.1_amd64.deb` | 30,091,764 | `f6df90bf962ef33759b50f1c7452998278ec72fbe941751c9698ad5015d6422d` |
| Linux x64 | RPM | `rpm/Alhangeul-0.3.1-1.x86_64.rpm` | 30,092,577 | `5445382ba9f4d5e7f30a61a47991d7becd333ff0f7725f253f05b1e52ed98293` |
| Linux arm64 | DEB | `deb/Alhangeul_0.3.1_arm64.deb` | 30,049,140 | `f0b841837cc66a699c1f917552287d263394e562be01bd1f2e5b419c3544595f` |

이 결과는 exact source에서 installer 파일이 생성되고 Actions upload 뒤에도 inventory가 보존됐다는 build smoke 증거다. installer 설치·실행, 코드 서명, GitHub Release, package 게시와 updater는 검증하지 않았다.

## Task #17 Linux thumbnail package 기준선

Task #17 Stage 4는 exact source `c0cc4af46f132d199e843abf2dad014ae4a07709`에서 package-owned Linux thumbnail helper와 registration을 검증했다. 이는 Stage 6 최종 수용 전의 package 기준선이며 공개 release가 아니다.

### Native package evidence

- native run: [33285514829](https://github.com/postmelee/alhangeul-tauri/actions/runs/33285514829), conclusion `success`
- Linux x64 job `99187922697`: helper, DEB/RPM lifecycle, inventory와 artifact gate `success`
- Linux arm64 job `99187922567`: helper, DEB lifecycle, inventory와 artifact gate `success`
- 같은 run의 Windows x64 job `99187922705`와 installer smoke job `99194195353`: 기존 Windows thumbnail 회귀 `success`

| Platform | Artifact ID | Archive digest |
|---|---:|---|
| Linux x64 desktop | `9724657370` | `sha256:dfddd84401fe5e613346e685580c007598b70bc6e86b029f6a37966bddf78be3` |
| Linux x64 package evidence | `9724652854` | `sha256:27d39170a3df6a2757713a597c02ddc3fb7bee4962a56f6262831a4489691029` |
| Linux arm64 desktop | `9724444215` | `sha256:7aa53fe9924da2bb22e5b98c053141a08c677444e8808cda87cdaa2226d1622a` |
| Linux arm64 package evidence | `9724442976` | `sha256:15fec166e328b9bc09729c19fe3d8aefaa88d6d843a23e00dc93395edaa61ee8` |

| Package | Package SHA-256 | Helper SHA-256 |
|---|---|---|
| x64 DEB `Alhangeul_0.1.0_amd64.deb` | `675fe493112f160eb8fc9d0345ed4cecff45a79848cfec1779ef0dddd315795e` | `5773973c142b84412eb7a51491daf36babf38bf008a2c3dea1ea655ad6ba7af5` |
| x64 RPM `Alhangeul-0.1.0-1.x86_64.rpm` | `a64373969c3718c31b0845c616447141c2ccf18c1219c42bc7b162f316cde5f7` | `5773973c142b84412eb7a51491daf36babf38bf008a2c3dea1ea655ad6ba7af5` |
| arm64 DEB `Alhangeul_0.1.0_arm64.deb` | `d1147b8d31b76cfa0858fc6c2f9e55416297b0f2f33f98f059beed0e995fb6c6` | `554f85681cd6518738a310d15c3c67450af9b3e35305ca9e186c5b40b3c0d725` |

세 package 모두 clean install, same-version reinstall, 이전 version update, injected failure rollback과 uninstall을 통과했다. helper와 registration은 단일 package owner였고 uninstall 뒤 제거됐다. HWP/HWPX MIME default, 제3자 `.thumbnailer`와 무관한 cache sentinel은 모든 transition에서 보존됐다.

### Package-installed file-manager evidence

- GUI run: [33287990400](https://github.com/postmelee/alhangeul-tauri/actions/runs/33287990400), job `99194484235`, conclusion `success`
- evidence artifact ID `9725165768`, digest `sha256:fb9d1ac4a2fc825dc7a36fc571f9d6b6abc501c9a37d5a97e59cef042c8ec892`
- installed DEB와 helper SHA-256은 native package evidence와 일치
- Nautilus 42.6과 Thunar 4.16.10/Tumbler 4.16이 `/usr/lib/alhangeul/alhangeul-thumbnailer`를 직접 실행
- direct와 preview fixture는 first/cached/changed를 통과했고, 손상 fixture는 제품 cache 없이 MIME icon으로 저하

Stage 4 screenshot의 direct fixture는 빈 흰 페이지, preview fixture는 검은 합성 preview이므로 file-manager discovery와 cache 경로만 증명한다. Stage 6은 같은 exact SHA의 새 native candidate에서 text·table·image가 식별되는 공개 실사용 HWP/HWPX를 Nautilus와 Thunar에서 직접 확인해야 한다.

설치 후 thumbnail이 만들어졌다면 앱 package를 제거해도 file-manager cache가 잠시 남을 수 있다. 정상 제거 판정은 cache 삭제가 아니라 다음을 사용한다.

```sh
test ! -e /usr/lib/alhangeul/alhangeul-thumbnailer
test ! -e /usr/share/thumbnailers/alhangeul.thumbnailer
```

전역 XDG thumbnail cache 삭제나 file manager 강제 종료는 설치·제거 절차에 포함하지 않는다. 전체 설계와 제외 matrix는 [Linux thumbnail 아키텍처](../architecture/LINUX_THUMBNAILS.md)를 따른다.

## 의도적으로 포함하지 않는 작업

- GitHub Release 생성·수정
- 고정 다운로드 URL이나 latest channel 제공
- 코드 서명과 인증 정보 사용
- package registry 또는 배포판 repository 게시
- updater manifest와 update artifact 생성
- 태그 생성 또는 이동

따라서 workflow artifact를 공식 배포물로 안내하거나 README/site에 다운로드 링크를 추가하면 안 된다.

## 공개 배포 전 후속 작업

공식 배포를 시작하려면 최소한 다음 작업을 별도 Issue와 승인 경계로 수행한다.

1. 배포 version·tag·bundle 이름과 checksum 게시 정책 확정
2. Windows signing과 Linux package metadata 검토
3. Linux installer/package 설치·실행·rollback과 Windows 실제 GUI HWP/HWPX·Explorer 기본 앱·thumbnail UI 수동 gate 검증
4. 사용자 다운로드 문서와 지원 범위 작성
5. 필요할 경우 독립 updater 보안 모델과 key 보관 정책 설계

Windows MSI·NSIS의 자동 설치·제한 실행·제거 package smoke는 Task #11과 Task #13 exact
native run에서 완료했다. 공개 prerelease 후보는 Task #13과 후속 Task #15가 merge된 뒤
두 변경을 포함한 새 exact SHA의 Windows/Linux native 수용이 Go로 확정됐을 때 Task #9에서
다시 생성·검증한다.

릴리스·서명·패키지 게시·updater 활성화는 작업지시자의 명시 승인 없이는 수행하지 않는다.

## 로컬과 다운로드 후 검증

모든 호스트에서 먼저 platform-neutral 검증을 실행한다.

```sh
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
```

Actions artifact를 검증할 때는 임시 디렉터리에 내려받고 각 platform 디렉터리의 동봉 inventory를 다시 계산한다.

```sh
gh run download <native-run-id> \
  --repo postmelee/alhangeul-tauri \
  --dir <temporary-directory>

pnpm run check:desktop-artifacts -- \
  --platform <windows-x64|linux-x64|linux-arm64> \
  --root <downloaded-artifact-root> \
  --verify-inventory \
  <downloaded-artifact-root>/alhangeul-artifact-inventory.json
```

검증이 끝난 임시 artifact는 별도 배포 경로로 옮기지 않고 정리한다.

Windows/Linux에서 native 검증을 추가한다.

```sh
pnpm run test:desktop
pnpm run clippy:desktop
pnpm tauri build --debug
```

생성 bundle과 다운로드한 Actions artifact는 해당 작업의 보존 기간과 검증 기록 안에서만 사용한다.
