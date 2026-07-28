# Alhangeul 개발하기

이 문서는 Windows와 Linux에서 Alhangeul을 실행하거나 수정할 때 필요한 기본 정보를 정리한다.

## 준비

- Node.js 24
- Corepack과 `pnpm@10.33.0`
- Rust stable
- 대상 운영체제의 [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/)

처음 한 번 의존성과 submodule을 준비한다.

```sh
git submodule update --init --recursive
corepack enable
pnpm install --frozen-lockfile
```

## 실행과 빌드

studio host만 빌드한다.

```sh
pnpm run build:studio
```

지원 플랫폼에서 데스크톱 앱을 개발 모드로 실행한다.

```sh
pnpm tauri dev
```

로컬 bundle은 배포물이 아니라 개발 검증용으로만 생성한다.

```sh
pnpm tauri build --debug
```

## 프로젝트 구조

```text
apps/
  desktop/       Tauri 2 데스크톱 앱
  studio-host/   upstream rhwp-studio 위의 Alhangeul adapter
third_party/
  rhwp/          현재 읽기 전용 upstream submodule
assets/          아이콘과 재배포 가능한 폰트
docs/            사용자·기여자·아키텍처·운영 문서
scripts/         검증과 의존성 유지보수 script
```

Alhangeul 전용 동작은 `apps/desktop`과 `apps/studio-host`에 둔다. `third_party/rhwp`는 제품 기능 때문에 직접 수정하지 않는다.

## 소유 경계

Alhangeul은 `rhwp`의 문서 엔진과 웹 editor를 기반으로 다음 제품 레이어를 소유한다.

- Tauri 2 앱 셸과 native menu
- Rust document session과 atomic save
- PDF export와 webview print 연결
- single-instance, file open event, drag/drop과 다중 창
- 로컬 폰트 catalog와 editor bridge
- Windows/Linux 파일 연결과 bundle 설정

현재 source submodule, native Cargo lock과 bundled WASM은 `rhwp v0.8.2`의 resolved commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`로 고정되어 있다. [rhwp-core.lock](../rhwp-core.lock)이 이 경계의 기계 검증 가능한 진실 원천이며, 자세한 계약은 [UPSTREAM.md](architecture/UPSTREAM.md)를 따른다.

## 개발 상태

- HWPX 문서는 열 수 있지만 저장은 지원하지 않는다.
- autosave/recovery와 외부 파일 변경 감지는 아직 없다.
- 큰 문서에서는 WASM mirror를 거치는 구간이 남아 있다.
- 공식 설치 파일, 서명, 패키지 게시와 자동 업데이트는 준비되지 않았다.
- GitHub Actions는 활성 상태지만 CI와 Windows/Linux native artifact workflow는 수동 `workflow_dispatch` 전용이다. Actions artifact는 build smoke 결과이며 공식 설치 파일이나 공개 release가 아니다.

## 검증 명령

모든 호스트에서 실행 가능한 기본 검증:

```sh
pnpm install --frozen-lockfile
pnpm run check:rhwp-pin
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo metadata \
  --manifest-path apps/desktop/src-tauri/Cargo.toml \
  --locked \
  --offline \
  --no-deps
cargo fmt \
  --manifest-path apps/desktop/src-tauri/Cargo.toml \
  --all \
  -- \
  --check
```

Windows/Linux에서 native Rust 변경을 검증할 때 추가 실행한다.

```sh
pnpm run test:desktop
pnpm run clippy:desktop
```

다운로드한 Actions artifact는 동봉된 inventory와 파일을 다시 계산해 검증한다.

```sh
pnpm run check:desktop-artifacts -- \
  --platform <windows-x64|linux-x64|linux-arm64> \
  --root <downloaded-artifact-root> \
  --verify-inventory \
  <downloaded-artifact-root>/alhangeul-artifact-inventory.json
```

검증된 canary commit·run과 platform별 installer SHA-256, 14일 retention 및 공식 배포와의 경계는 [desktop artifact와 배포 준비](operations/DESKTOP_RELEASE.md)를 따른다.

## `rhwp` Stable pin 갱신

`rhwp` 갱신은 일반 기능 작업에 포함하지 않는다. 승인된 의존성 갱신 작업에서 release tag와 그 tag가 가리키는 40자리 commit을 모두 명시한다.

```sh
scripts/update-upstream.sh \
  --tag v0.8.2 \
  --commit 9b16aa9e23f476e2b335d7c029fc9f24a199d63c \
  --run-checks
```

script는 다음 순서로 source submodule, native Cargo lock, 새로 빌드한 WASM artifact와 `rhwp-core.lock`을 맞춘 뒤 검증한다. branch, floating ref, 기존 `UPSTREAM_*`/`RUN_CHECKS` 환경 변수는 허용하지 않는다. script가 성공해도 변경된 submodule commit과 artifact diff는 커밋 전에 명시적으로 검토한다.

### 실패와 rollback

갱신 script는 실패 시 시작 commit을 출력하고 자동 reset을 하지 않는다. 먼저 실패 단계와 변경 범위를 확인한다.

```sh
git status --short
git diff --submodule=log
```

복구할 때는 `<last-verified-commit>`을 직전 검증 완료 commit의 전체 SHA로 바꾸고, 아래처럼 갱신 대상만 명시한다. 대상 경로에 보존해야 할 별도 변경이 없는지 먼저 확인하며 `git reset --hard`는 사용하지 않는다.

```sh
git restore --source=<last-verified-commit> -- \
  third_party/rhwp \
  apps/desktop/src-tauri/Cargo.lock \
  apps/studio-host/vendor/rhwp-core \
  rhwp-core.lock
git submodule update --init --recursive third_party/rhwp
pnpm run check:rhwp-pin
```

복구 후 기본 검증을 다시 실행한다. 새 pin의 실패가 upstream `v0.8.2` known issue와 같은 이름이라는 이유만으로 면제하지 않고, [UPSTREAM.md](architecture/UPSTREAM.md)의 분류 기준에 따라 재현 조건과 실패 지점을 확인한다.

## 관련 문서

- [upstream 경계](architecture/UPSTREAM.md)
- [초기 코드와 자산 출처](architecture/PROVENANCE.md)
- [로컬 폰트 규칙](architecture/LOCAL_FONTS.md)
- [desktop artifact와 배포 준비](operations/DESKTOP_RELEASE.md)
