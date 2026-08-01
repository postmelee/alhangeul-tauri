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
3. 제품 경계·version·release metadata, `rhwp` pin, automation, upstream과 studio 검증
4. Tauri bundle 생성
5. 필수 installer 종류·크기·SHA-256 inventory 검증
6. inventory를 포함한 Actions artifact 업로드
7. fresh `windows-2025` runner에서 Windows MSI·NSIS 설치·제한 실행·제거 package smoke
8. installer별 summary와 원본 log를 diagnostic artifact로 항상 업로드하고 build matrix와 smoke 결과를 함께 판정

repository-level Actions는 활성 상태지만 대상 CI와 native workflow는 자동 trigger 없이 수동 `workflow_dispatch`로만 실행한다. Actions 활성 상태는 workflow 성공이나 artifact 가용성을 보장하지 않으므로 run의 exact commit과 job 결과를 함께 확인해야 한다.

## `v0.1.0` prerelease 후보 계약

첫 공개 후보는 stable/latest가 아닌 GitHub prerelease로만 검토한다. Task #9 candidate는 준비와 수용 검증용이며, 게시 task에서는 release PR로 승격된 `main`의 immutable `v0.1.0` tag exact SHA에서 bundle과 checksum을 새로 생성한다. Task #9 Actions artifact를 공개 asset으로 재사용하지 않는다.

필수 baseline bundle:

| 환경 | 공개 후보 bundle | 필수 수용 경계 |
|---|---|---|
| Windows x64 | MSI, NSIS | 각 installer 설치·실행·파일 연결·제거 |
| Linux x64 | AppImage, DEB, RPM | AppImage 실행, DEB와 RPM의 호환 배포판 설치·실행·제거 |
| Linux arm64 | DEB | arm64 Debian 계열 설치·실행·제거 |

Windows ARM64 MSI·NSIS는 Issue #10의 별도 build·native 검증이 Go일 때만 후속 게시 task에서 조건부로 추가한다. 외부 배포 채널과 지원 범위 밖 운영체제 bundle은 이 baseline에 포함하지 않는다.

첫 Windows prerelease installer는 unsigned를 허용한다. Release 제목과 본문에 unsigned 상태와 SmartScreen 경고 가능성을 명시하고, 모든 공개 installer를 상대 경로 순으로 정렬한 `SHA256SUMS`를 함께 제공한다. Linux direct-download package도 별도 package signing 없이 GitHub HTTPS와 같은 checksum 계약을 사용한다. checksum은 publisher identity나 code signing을 대체한다고 표현하지 않는다.

필수 bundle 하나라도 build·inventory·checksum 또는 승인된 native 시나리오를 통과하지 못하면 Task #9는 No-Go다. candidate 실패 시 artifact를 폐기하고 공개 상태를 만들지 않는다. 게시 뒤 중대 결함은 tag나 asset을 덮어쓰지 않고 prerelease를 withdrawn/superseded로 표시하거나 수정 version으로 fix-forward한다. uninstall·rollback은 파일 연결을 정리하되 사용자 문서를 삭제하지 않아야 한다.

`pnpm run check:release-metadata`는 package와 Tauri config의 제품명·version·identifier·publisher·설명·category·file association·license와 updater 비활성 경계를 읽기 전용으로 검사한다. `pnpm run create:release-checksums`는 명시한 artifact root에서 MSI·NSIS·AppImage·DEB·RPM만 받아 결정적인 `SHA256SUMS`를 생성한다.

## Task #9 prerelease candidate build·checksum 검증

2026-07-29에 Stage 2 승인 commit `6e0adc941b9eedbd2d7cceab12bf31dddf184c3a`를 `publish/task9`에 고정하고 같은 exact SHA를 수동 검증했다.

- [CI run 30426710424](https://github.com/postmelee/alhangeul-tauri/actions/runs/30426710424): `workflow_dispatch`, `publish/task9`, exact SHA 일치, `Unit tests` 성공
- [Native run 30426711693](https://github.com/postmelee/alhangeul-tauri/actions/runs/30426711693): `workflow_dispatch`, `publish/task9`, exact SHA 일치, `Build windows-x64`, `Build linux-x64`, `Build linux-arm64` 모두 성공

native run의 artifact 세 개를 별도 임시 디렉터리에 내려받고 동봉된 inventory를 기준으로 모든 파일의 크기와 SHA-256을 다시 계산했다. 세 inventory는 build 시 기록된 값과 일치했다.

GitHub API가 반환한 Actions artifact archive metadata는 다음과 같다. 확인 시점에 모두 `expired: false`였으며 API archive digest와 아래 installer SHA-256은 서로 다른 검증 대상이다.

| Platform | Actions artifact | ID | Archive 크기 (bytes) | API archive digest | 만료 시각 (UTC) |
|---|---|---:|---:|---|---|
| Windows x64 | `alhangeul-desktop-windows-x64` | `8714152971` | 53,660,040 | `sha256:3577c43739592df2f992046f73c40beefc5ad2f968f08459ded3dcb68d6d1fc9` | `2026-08-12T06:13:55Z` |
| Linux x64 | `alhangeul-desktop-linux-x64` | `8714085967` | 354,129,629 | `sha256:2751d8990c6e1234770268b25df9662008490d588fab647d7dc1c2ef4e34f8cc` | `2026-08-12T06:10:21Z` |
| Linux arm64 | `alhangeul-desktop-linux-arm64` | `8714005780` | 90,029,873 | `sha256:e5806c1263b2c25453646421f279bf960faeeb8d2eb9c62840f51bf444c38b48` | `2026-08-12T06:06:25Z` |

다운로드 후 독립 재검증한 필수 `0.1.0` installer inventory:

| Platform | 종류 | 파일 | 크기 (bytes) | SHA-256 |
|---|---|---|---:|---|
| Windows x64 | MSI | `msi/Alhangeul_0.1.0_x64_en-US.msi` | 28,192,768 | `b7647416466cff7a3ac787d5d903f2950c2a1b735974482899e7778ce2de5aa4` |
| Windows x64 | NSIS | `nsis/Alhangeul_0.1.0_x64-setup.exe` | 25,706,433 | `af7968393f05d042d62a0331640ab73cf29471021ee2eb35e8f1ca8112600fb9` |
| Linux x64 | AppImage | `appimage/Alhangeul_0.1.0_amd64.AppImage` | 106,842,616 | `a21c422eff17e38a80f301d7bd97d1256a9b2e706668593acaae02f1d2475d23` |
| Linux x64 | DEB | `deb/Alhangeul_0.1.0_amd64.deb` | 30,092,878 | `253ebe576131f62d8a1c1d2f2f8e885eea09ed9bc7947d739ed9502b2470ccd9` |
| Linux x64 | RPM | `rpm/Alhangeul-0.1.0-1.x86_64.rpm` | 30,093,097 | `b4101b9cca740472103d262d14c11abafa7c8962b9c1551e27100e777da1463b` |
| Linux arm64 | DEB | `deb/Alhangeul_0.1.0_arm64.deb` | 30,049,998 | `7cbd918634bbe6cc15d656cbc7a3e3caa67d0e06b6857c5334ef505ba8e7d62e` |

Actions artifact에는 inventory와 Tauri의 DEB/RPM 중간 전개 파일도 들어 있으므로, 공개 후보 checksum은 위 installer 여섯 개만 깨끗한 임시 `release-assets` root에 평탄화해 생성했다. 결정적으로 정렬된 candidate `SHA256SUMS` 초안은 다음과 같으며 `shasum -a 256 -c SHA256SUMS`로 여섯 파일을 독립 재검증했다.

```text
b4101b9cca740472103d262d14c11abafa7c8962b9c1551e27100e777da1463b  Alhangeul-0.1.0-1.x86_64.rpm
a21c422eff17e38a80f301d7bd97d1256a9b2e706668593acaae02f1d2475d23  Alhangeul_0.1.0_amd64.AppImage
253ebe576131f62d8a1c1d2f2f8e885eea09ed9bc7947d739ed9502b2470ccd9  Alhangeul_0.1.0_amd64.deb
7cbd918634bbe6cc15d656cbc7a3e3caa67d0e06b6857c5334ef505ba8e7d62e  Alhangeul_0.1.0_arm64.deb
af7968393f05d042d62a0331640ab73cf29471021ee2eb35e8f1ca8112600fb9  Alhangeul_0.1.0_x64-setup.exe
b7647416466cff7a3ac787d5d903f2950c2a1b735974482899e7778ce2de5aa4  Alhangeul_0.1.0_x64_en-US.msi
```

이 `SHA256SUMS` 파일 자체의 SHA-256은 `9e80f506fcc73f0b60018b383fba15b872e03bb9f69a8c6a9f90fb45a870cab2`였다. 검증용 임시 디렉터리와 checksum 초안은 검증 뒤 삭제했고 공개 release나 tag는 만들지 않았다.

이 candidate는 필수 bundle의 exact-SHA build·inventory·checksum gate가 통과했다는 Stage 3 증거다. 이후 보고·운영 문서 commit이 추가되므로 최종 `v0.1.0` tag artifact나 공개 asset이 아니다. 실제 Windows/Linux 설치·실행·파일 연결·제거와 rollback은 Stage 4에서 별도로 통과해야 한다.

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

Task #9 prerelease 준비는 Task #11 merge 뒤 최신 `devel`을 통합하고 과거 candidate를 폐기한 다음, `check:release-metadata`를 포함하는 새 exact-SHA candidate를 만들어 다시 검증해야 한다. 위 Task #11 artifact나 SHA를 그대로 공개 후보로 승계하지 않는다.

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

Windows MSI·NSIS의 자동 설치·제한 실행·제거 package smoke는 Task #11에서 완료했다. 공개 prerelease 후보는 Task #9에서 Task #11 merge 뒤 새 exact SHA로 다시 생성·검증한다.

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

# 다운로드 artifact에서 공개할 installer만 깨끗한 임시 root로 선별한다.
pnpm run create:release-checksums -- \
  --root <temporary-release-assets-directory> \
  --output <temporary-release-assets-directory>/SHA256SUMS
```

검증이 끝난 임시 artifact는 별도 배포 경로로 옮기지 않고 정리한다.

Windows/Linux에서 native 검증을 추가한다.

```sh
pnpm run test:desktop
pnpm run clippy:desktop
pnpm tauri build --debug
```

생성 bundle과 다운로드한 Actions artifact는 해당 작업의 보존 기간과 검증 기록 안에서만 사용한다.
