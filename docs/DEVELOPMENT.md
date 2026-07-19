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

현재 submodule과 bundled WASM은 동일한 `rhwp` 기준으로 맞춰져 있다. Stable release tag와 resolved commit을 함께 기록하는 독립 release pin 전환은 후속 전용 작업에서 수행한다. 자세한 경계는 [UPSTREAM.md](architecture/UPSTREAM.md)를 따른다.

## 개발 상태

- HWPX 문서는 열 수 있지만 저장은 지원하지 않는다.
- autosave/recovery와 외부 파일 변경 감지는 아직 없다.
- 큰 문서에서는 WASM mirror를 거치는 구간이 남아 있다.
- 공식 설치 파일, 서명, 패키지 게시와 자동 업데이트는 준비되지 않았다.
- GitHub Actions workflow 파일은 정적 검토용이며 저장소 수준 실행은 별도 승인 전까지 비활성 상태다.

## 검증 명령

모든 호스트에서 실행 가능한 기본 검증:

```sh
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
```

Windows/Linux에서 native Rust 변경을 검증할 때 추가 실행한다.

```sh
pnpm run test:desktop
pnpm run clippy:desktop
```

`rhwp` 갱신은 일반 기능 작업에 포함하지 않는다. 승인된 의존성 갱신 작업에서만 다음 script를 사용하고 결과 commit을 명시적으로 검토한다.

```sh
UPSTREAM_REF=<release-tag-or-commit> RUN_CHECKS=1 scripts/update-upstream.sh
```

## 관련 문서

- [upstream 경계](architecture/UPSTREAM.md)
- [초기 코드와 자산 출처](architecture/PROVENANCE.md)
- [로컬 폰트 규칙](architecture/LOCAL_FONTS.md)
- [desktop artifact와 배포 준비](operations/DESKTOP_RELEASE.md)
