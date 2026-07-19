# upstream `rhwp` 경계

Alhangeul의 유일한 지속 upstream은 [`edwardkim/rhwp`](https://github.com/edwardkim/rhwp)다.

## 현재 고정 상태

- upstream URL: `https://github.com/edwardkim/rhwp.git`
- 현재 submodule 경로: `third_party/rhwp`
- 현재 resolved commit: `b3e16ef212af81ef37d973ddb86d6816d3804642`
- 해당 release: `v0.7.13`
- bundled WASM: `apps/studio-host/vendor/rhwp-core`
- native Rust lockfile: `apps/desktop/src-tauri/Cargo.lock`

현재 구조는 초기 저장소에서 이어진 읽기 전용 submodule 고정이다. 이 상태를 안정적인 독립 release pin 운영의 완성으로 간주하지 않는다.

## 목표 고정 정책

후속 의존성 작업은 Stable `rhwp` release tag와 resolved commit을 함께 기록해야 한다. 같은 release 기준으로 다음 세 경계를 원자적으로 맞춘다.

1. Rust core dependency와 Cargo lockfile
2. studio host가 사용하는 bundled WASM package
3. 출처·검증 정보를 기록하는 dependency lock 문서

branch나 이동 가능한 floating ref는 Stable 기준으로 사용하지 않는다. release tag가 없는 preview를 시험할 때만 resolved commit을 명시한 별도 작업 범위를 사용한다.

현재 submodule을 위 구조로 바꾸는 작업은 이번 제품 독립화 단계에 포함하지 않는다. 전용 후속 Issue에서 dependency layout, lock 문서, 갱신 script와 rollback 기준을 함께 설계한다.

## 코드 소유권

`third_party/rhwp`는 vendor source로 취급하고 Alhangeul 기능을 구현하기 위해 직접 수정하지 않는다.

- `apps/desktop/`: Tauri shell, native document session, 저장·내보내기·인쇄, 창 관리, 파일 연결과 packaging
- `apps/studio-host/`: Tauri bridge, desktop event routing, command adapter, UI 보정과 upstream import shadowing
- `assets/`, `docs/`, `scripts/`: 제품 자산, 공식 문서와 운영 자동화

studio host는 Vite alias로 upstream `rhwp-studio`를 가져오며 제품이 반드시 소유해야 하는 파일만 같은 import 경로에서 대체한다. engine API나 renderer bug는 먼저 upstream에서 해결하고, 데스크톱 통합 차이는 Alhangeul adapter에 둔다.

## 현재 갱신 script 경계

`scripts/update-upstream.sh`는 현재 submodule pointer와 bundled WASM/native lockfile 정합성을 확인하기 위한 전환기 script다. 일반 기능 작업에서는 실행하지 않는다.

승인된 의존성 갱신 작업에서 release tag 또는 commit을 명시한다.

```sh
UPSTREAM_REF=v0.7.13 RUN_CHECKS=1 scripts/update-upstream.sh
```

기본 branch 갱신 기능은 기존 script 호환성을 위해 남아 있지만 Stable 고정 절차로 사용하지 않는다. release pin 전환 작업에서는 floating 기본값을 제거하거나 preview 전용 흐름으로 분리한다.

## 갱신 수용 기준

- tag와 resolved commit 출처가 기록되어 있다.
- Rust core, bundled WASM과 lockfile이 같은 `rhwp` release를 가리킨다.
- `pnpm install --frozen-lockfile`이 통과한다.
- `pnpm run test:upstream`, `pnpm run test:studio`, `pnpm run build:studio`가 통과한다.
- Windows/Linux에서 Rust test·clippy와 Tauri native smoke를 수행한다.
- 파일 열기, HWP 저장, PDF export, 인쇄, drag/drop과 다중 창 동작을 지원 플랫폼에서 확인한다.

갱신 실패 시 새 pin을 게시하지 않고 직전 검증 완료 commit을 유지한다.
