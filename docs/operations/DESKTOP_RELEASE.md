# 데스크톱 artifact와 배포 준비

Alhangeul은 아직 공식 설치 파일이나 공개 릴리스를 제공하지 않는다. `.github/workflows/alhangeul-desktop.yml`은 Windows/Linux native build 결과와 Windows installer package smoke 진단을 수동 검증하고 14일 동안 Actions artifact로 보존하지만 GitHub Release를 생성하지 않는다.

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
3. 제품 경계·version, `rhwp` pin, automation, upstream과 studio 검증
4. Tauri bundle 생성
5. 필수 installer 종류·크기·SHA-256 inventory 검증
6. inventory를 포함한 Actions artifact 업로드
7. fresh `windows-2025` runner에서 Windows MSI·NSIS 설치·제한 실행·제거 package smoke
8. installer별 summary와 원본 log를 diagnostic artifact로 항상 업로드하고 build matrix와 smoke 결과를 함께 판정

repository-level Actions는 활성 상태지만 대상 CI와 native workflow는 자동 trigger 없이 수동 `workflow_dispatch`로만 실행한다. Actions 활성 상태는 workflow 성공이나 artifact 가용성을 보장하지 않으므로 run의 exact commit과 job 결과를 함께 확인해야 한다.

## Linux x64 exact-SHA GUI acceptance

`.github/workflows/alhangeul-linux-gui.yml`은 성공한 native build의 Linux x64 DEB를 별도 `ubuntu-22.04` standard runner에서 설치하고 실제 Tauri WebView·GTK dialog를 검사하는 수동 gate다. 이 workflow도 GitHub Release나 배포물을 만들지 않는다.

실행 순서는 다음과 같다.

1. `Alhangeul Desktop Artifact Build`를 수동 실행하고 대상 candidate의 정확한 40자리 commit SHA와 성공한 native run ID를 기록한다.
2. `Alhangeul Linux GUI Acceptance`를 열어 같은 SHA를 `build_ref`, 같은 run ID를 `native_run_id`로 입력한다. branch, tag, latest run이나 artifact 이름만으로 대체하지 않는다.
3. workflow가 checkout SHA, native run의 repository·workflow·event·conclusion, Linux x64 artifact ID·digest와 동봉 inventory를 검증한 뒤 단일 DEB만 설치하는지 확인한다.
4. GUI job이 HWP/HWPX 열기·저장·재열기, drag-in, 직접 PDF, GTK Print to File와 CUPS-PDF 반복 인쇄를 통과하는지 확인한다.
5. acceptance run의 `alhangeul-linux-gui-<run-id>` evidence artifact를 내려받아 아래 read-back 항목을 확인한다. 보존 기간은 7일이다.

| Evidence | 확인 항목 |
|---|---|
| `workflow-context.json`, `checked-out-sha.txt` | 요청 SHA·native run ID와 checkout SHA가 candidate 기록과 같은가 |
| `artifact-handoff.json`, inventory, `installed-deb.sha256` | 원본 native run·artifact ID·archive digest와 설치 DEB hash가 한 chain으로 결속되는가 |
| `native-environment.txt`, `step-outcomes.json` | Node/pnpm/Rust/driver/WebKitGTK/GTK/CUPS/Poppler version과 GUI 실행 전 주요 step outcome이 기록됐는가 |
| scenario manifest·screenshot·native UI tree | toolbar 초기 숨김, 문서 중앙 정렬, 한글 glyph, dialog 상태와 실패 지점이 summary와 일치하는가 |
| 직접/GTK/CUPS PDF와 render PNG | 6쪽 A4, 한글 text, 빈 쪽·crop·tofu 이상이 없는가 |

GUI 실패는 evidence 업로드를 위해 일시적으로 다음 step에 전달되지만 마지막 gate가 원래 실패를 다시 실패로 판정한다. 반대로 GUI가 성공해도 evidence 업로드가 실패하거나 파일이 없으면 run은 실패한다. 자동 재시도는 없으며 실패 원인을 확인한 뒤 새 run으로 다시 검증한다.

CUPS-PDF 출력은 evidence root의 전용 writable 하위 디렉터리만 사용하고 system print 기본 용지는 A4로 고정한다. PDF text floor는 Task #15 Stage 4.8 Linux read-back의 직접 PDF `45/642/410/638/478/250`, GTK/CUPS `45/54/408/637/478/250` 실측치보다 충분히 낮은 경로별 값으로 판정한다. 임계값을 낮추거나 selector를 추가할 때는 실패 run의 PDF summary와 AT-SPI tree를 먼저 보존한다.

전체 WDIO scenario 전에 external driver 연결만 분리 진단할 때는 Linux에서 DEB와 exact `tauri-driver`·`WebKitWebDriver`를 준비한 뒤 다음 진입점을 사용한다. 이 probe는 제품 수용 성공을 대신하지 않는다.

```bash
xvfb-run --auto-servernum -- \
  pnpm run probe:gui:linux -- \
  --app /usr/bin/Alhangeul \
  --output-dir /tmp/alhangeul-gui-probe
```

이 gate가 자동화하는 범위는 hosted Linux x64의 production DEB와 가상 display·가상 PDF printer다. Linux arm64, RPM/AppImage 설치·desktop integration, GNOME/Nautilus와 Xfce/Thunar의 실제 사용자 세션, physical printer, Windows GUI는 여전히 별도 native 수용 대상이다. screenshot과 PDF render의 한글 glyph·배치 read-back도 prerelease 후보 확정 때 사람이 확인한다. GitHub Codespaces는 이 workflow의 실행 환경이 아니며, 무료 allowance와 spending limit을 먼저 확인한 경우의 선택적 troubleshooting에만 사용한다.

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

### Windows installer 자동 gate를 다시 돌려야 하는 변경

이 workflow는 `workflow_dispatch` 전용이라 push나 PR로 자동 실행되지 않는다. 다음 변경은 자동으로 검증되지 않으므로 수동 dispatch가 필요하다.

| 변경 | 이유 |
|---|---|
| Tauri 버전 상향 | NSIS hook은 Tauri 기본 file association 동작을 되돌리는 구조다. upstream이 association 처리나 내부 `UPDATEFILEASSOC` macro를 바꾸면 기존 기본 연결 보존이 조용히 깨진다 |
| `windows/main.wxs`, `windows/nsis-hooks.nsh`, `tauri.conf.json`의 bundle 항목 | installer가 실제로 쓰는 registry·shortcut 계약이 바뀐다 |
| `[[bin]] name`, `productName` | 실행 파일명, 설치 경로, ProgID, shortcut 이름이 함께 움직인다 |
| `scripts/windows-installer-smoke.ps1`, smoke job | 판정 자체가 바뀌므로 source test만으로는 runtime 동작을 보증하지 못한다 |

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

### PDF snapshot과 stale job 수용 gate

현재 직접 PDF는 live page handler를 순회하지 않는다. save target 확정 뒤 현재 형식의 HWP/HWPX serializer를 한 번만 capture하고 격리 `WasmBridge`에 다시 로드한 immutable snapshot에서 모든 page SVG를 만든다. snapshot page count와 begin·append·commit·abort는 하나의 snapshot UUID에 결속하며 native session revision은 이 token을 대신하지 않는다.

Windows/Linux exact 후보에서는 다음 항목을 직접 PDF gate로 함께 확인한다.

1. snapshot capture 뒤 live 편집을 계속해도 PDF의 page count와 모든 page가 시작 snapshot 한 세대로 완성되고 mixed revision이 없다.
2. 성공·dialog 취소·snapshot/render/append/commit 실패와 timeout 뒤 source path·format·revision·dirty·recent·recovery가 기존 값이며 `notifySaved`가 호출되지 않는다.
3. capture 2분, 전체 pipeline 10분, 4,096쪽, SVG 16 MiB/page, 누적 512 MiB와 process 4-job 제한을 넘긴 요청이 기존 target PDF를 바꾸지 않는다.
4. WebView reload의 idle job은 최대 5분 30초, absolute job은 최대 15분 30초 안에 회수되어 같은 target으로 새 begin이 가능하고, window destroy는 자기 job만 정리하며 다른 window의 유효 lock은 유지한다.
5. app 재시작 cleanup은 OS temp 바로 아래의 24시간보다 오래된 safe product directory만 최대 64개 삭제한다. recent·prefix 불일치·symlink/reparse point·nested directory·unknown content와 사용자 문서·target PDF는 보존한다.
6. 같은 exact SHA에서 HWP/HWPX page count, searchable 한글 text, nonblank render와 atomic target replace를 Windows와 Linux 각각 확인한다.

platform-neutral test와 기존 Task #13 artifact는 snapshot generation, native reaper와 startup orphan cleanup의 OS별 수용을 대신하지 않는다. 제한·timeout·변환 실패 증적은 source state와 기존 target의 전후 hash, product temp sentinel 및 cleanup 시각을 함께 기록한다.

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
3. Linux installer/package 설치·실행·rollback과 Windows 실제 GUI HWP/HWPX·Explorer 기본 앱 수동 gate 검증
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
