# 데스크톱 artifact와 배포 준비

Alhangeul은 아직 공식 설치 파일이나 공개 릴리스를 제공하지 않는다. `.github/workflows/alhangeul-desktop.yml`은 Windows/Linux native build 결과를 수동 검증하고 14일 동안 Actions artifact로 보존하지만 GitHub Release를 생성하지 않는다.

## 제품 version 기준

현재 저장소의 제품 source version은 M010에서 승인한 독립 Alhangeul 기준선 `0.1.0`이다. 초기 코드의 `0.3.1`은 이전 제품의 release 계보이며 아래 Task #5의 `0.3.1` artifact는 version 재정렬 전에 생성한 native build smoke 증적이다. 둘 다 Alhangeul의 공식 release 계보로 간주하지 않는다.

root `package.json`을 source version의 기준으로 삼고 `pnpm run check:product-version`이 desktop package, Cargo manifest·lock과 Tauri 설정을 함께 검증한다. `0.1.0` exact-SHA native artifact 검증은 후속 단계이며, 아직 `0.1.0` tag나 GitHub Release를 만들지 않았다. 공식 release, 고정 다운로드 경로와 updater 활성화는 별도 Issue와 승인이 필요하다.

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

repository-level Actions는 활성 상태지만 대상 CI와 native workflow는 자동 trigger 없이 수동 `workflow_dispatch`로만 실행한다. Actions 활성 상태는 workflow 성공이나 artifact 가용성을 보장하지 않으므로 run의 exact commit과 job 결과를 함께 확인해야 한다.

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
3. installer 설치·실행 smoke와 rollback 검증
4. 사용자 다운로드 문서와 지원 범위 작성
5. 필요할 경우 독립 updater 보안 모델과 key 보관 정책 설계

릴리스·서명·패키지 게시·updater 활성화는 작업지시자의 명시 승인 없이는 수행하지 않는다.

## 로컬과 다운로드 후 검증

모든 호스트에서 먼저 platform-neutral 검증을 실행한다.

```sh
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
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
