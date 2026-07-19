# Task #3 수행계획서 — rhwp v0.7.19 Stable release pin

GitHub Issue: [#3](https://github.com/postmelee/alhangeul-tauri/issues/3)
마일스톤: M010

## 목적

Alhangeul의 지속 upstream인 `edwardkim/rhwp`를 최신 Stable release `v0.7.19`와 resolved commit `f137b4c9468eaff5bb43e25108e9c9d39a2ed15b`에 고정한다. `third_party/rhwp` gitlink, Tauri native Rust lock, studio host의 bundled WASM을 같은 source release로 원자적으로 맞추고 저장소가 직접 검증할 수 있는 provenance lock을 도입한다.

Stable 갱신 경로에서는 branch와 floating ref를 제거한다. 이 task가 끝나면 이후 `rhwp` release 반영은 명시적인 release tag, resolved commit 확인, artifact 정합성 검증과 rollback 절차를 거쳐 재현 가능하게 수행할 수 있어야 한다.

## 배경

Task #1 작업에서 HOP 의존과 macOS 지원 범위를 제거하고 Windows/Linux용 Alhangeul 제품 경계를 확립했다. 그러나 현재 core 기준은 초기 저장소에서 이어진 `v0.7.13`과 commit `b3e16ef212af81ef37d973ddb86d6816d3804642`이며, `scripts/update-upstream.sh`는 명시적인 ref가 없으면 기본 branch를 checkout할 수 있다.

현재 `docs/architecture/UPSTREAM.md`는 Stable 운영의 목표를 release tag와 resolved commit 동시 기록으로 정의하지만 이를 강제하는 저장소 소유 lock과 검증 명령은 없다. 또한 Rust core, `apps/desktop/src-tauri/Cargo.lock`, `apps/studio-host/vendor/rhwp-core`의 WASM package가 같은 source commit에서 만들어졌는지 지속적으로 증명할 수단이 부족하다.

upstream `v0.7.19`는 2026-07-17 공개된 정식 release이며 tag가 가리키는 commit은 `f137b4c9468eaff5bb43e25108e9c9d39a2ed15b`이다. 작업 중 더 최신 release가 나오더라도 이 task는 승인된 `v0.7.19` 기준을 임의로 변경하지 않는다.

## 범위

### 포함

- `third_party/rhwp` gitlink를 `v0.7.19` resolved commit으로 고정한다.
- 동일 checkout을 기준으로 `apps/desktop/src-tauri/Cargo.lock`의 `rhwp 0.7.19` native dependency graph를 갱신한다.
- 동일 checkout에서 upstream이 문서화한 release 방식으로 WASM package를 새로 빌드해 `apps/studio-host/vendor/rhwp-core`에 반영한다.
- 저장소 루트에 machine-readable `rhwp-core.lock`을 만들고 repository, ref kind, release tag, resolved commit, upstream dependency fingerprint와 bundled artifact hash/size를 기록한다.
- Stable tag를 필수 입력으로 받고 tag와 commit을 검증하는 upstream 갱신 script와 read-only 정합성 검사 경로를 만든다.
- 정상 pin, tag/commit 불일치, artifact 불일치, dirty submodule, floating ref 거부를 자동 테스트한다.
- `v0.7.19`로 인한 Alhangeul adapter 호환성 문제만 최소 범위로 보정한다.
- 공식 upstream·개발 문서에 갱신, 검증, 실패 시 rollback 절차를 반영한다.

### 제외

- `third_party/rhwp` 내부 source 직접 수정 또는 Alhangeul 전용 fork 운영
- `v0.7.19` 범위를 넘어선 최신 release 추종
- Demo/Preview commit pin 경로와 branch 기반 갱신 지원
- 새로운 viewer/editor 기능 또는 upstream 기능의 선제 backport
- GitHub Actions 활성화와 Windows/Linux CI runner 구축
- Windows/Linux native Tauri build·bundle smoke 자동화
- macOS 빌드, 테스트, 패키징 또는 지원 경로 추가
- 설치 패키지, 서명, 공개 release와 자동 updater 작업

## 설계 방향

- `rhwp-core.lock`을 Alhangeul 관점의 Stable provenance 진실 원천으로 둔다. 최소 필드는 lock schema version, upstream repository, `release-tag` ref kind, release tag, resolved commit, upstream `Cargo.lock` fingerprint, 관리 대상 artifact의 path·SHA-256·size로 구성한다.
- Rust dependency는 계속 읽기 전용 `third_party/rhwp` path를 사용한다. Cargo lock만으로는 path dependency의 source commit을 증명할 수 없으므로 gitlink, `rhwp-core.lock`, Cargo package version을 함께 검증한다.
- bundled WASM은 기존 binary를 버전 문자열만 바꿔 재사용하지 않는다. `v0.7.19` checkout에서 upstream의 Docker/`wasm-pack --target web --release` 절차로 새로 생성한 package만 반영하고 lock의 artifact metadata와 연결한다.
- Stable 갱신 script는 release tag를 명시하지 않으면 실패한다. tag를 commit으로 resolve한 뒤 예상 commit과 비교하며, 기본 branch·환경변수 fallback·floating ref를 Stable 경로에서 제거한다.
- 갱신 적용과 read-only 검증 책임을 분리한다. 검증 명령은 저장소 파일을 바꾸지 않고 gitlink, lock, Cargo version, WASM package version과 artifact metadata 불일치를 모두 실패로 보고한다.
- 갱신 전 dirty submodule과 dirty 관리 artifact를 거부한다. 자동으로 사용자 변경을 되돌리지 않으며, 실패 시 직전 검증 완료 commit으로 복귀하는 명시적 절차를 문서화한다.
- upstream API 변화로 adapter build가 깨지면 `apps/studio-host` 또는 Tauri wrapper에서 필요한 최소 호환 수정만 수행한다. engine/renderer 동작 문제는 upstream source를 고치지 않고 별도 upstream 이슈 후보로 분리한다.
- GitHub Actions는 비활성 상태를 유지한다. 현재 작업 환경에서는 platform-neutral Node/studio build와 Rust metadata/format 검증만 수행하고 지원 OS의 native compile·bundle 검증은 후속 task로 남긴다.

## 문서 위치 판단

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `rhwp-core.lock` | 공식 dependency provenance 계약 | 유지보수자, 자동화 | 저장소 루트 | `docs/architecture/` | script와 검증기가 고정 경로에서 읽는 machine-readable 진실 원천이므로 루트가 적합하다. |
| `docs/architecture/UPSTREAM.md` | 공식 아키텍처·의존성 운영 문서 | 기여자, 유지보수자 | `docs/architecture/` | `mydocs/manual/` | 제품의 지속 upstream과 pin 계약은 특정 task 기록이 아니라 공개 아키텍처 기준이다. |
| `docs/DEVELOPMENT.md` | 공식 개발 절차 | 기여자 | `docs/` | `README.md` | 반복 실행할 갱신·검증·rollback 명령을 상세히 설명하는 기존 개발 문서다. |
| `README.md` | 제품·개발 진입 문서 | 사용자, 기여자 | 저장소 루트 | `docs/` | 현재 pin 상태와 상세 upstream 문서 링크만 요약해 기존 진입점 역할을 유지한다. |
| `mydocs/plans/task_m010_3*.md`, `mydocs/working/task_m010_3_stage*.md`, `mydocs/report/task_m010_3_report.md` | 작업 계획·보고 산출물 | 작업지시자, 내부 작업자 | `mydocs/` | `docs/` | Issue #3 작업 과정과 승인 근거이므로 공식 제품 문서와 분리한다. |

## 예상 변경 파일

신규:

- `rhwp-core.lock`
- `scripts/verify-rhwp-pin.mjs`
- `tests/rhwp-pin.test.mjs`

수정:

- `third_party/rhwp` gitlink
- `apps/desktop/src-tauri/Cargo.lock`
- `apps/studio-host/vendor/rhwp-core/**`
- `apps/studio-host/**`의 최소 호환 파일(필요한 경우에만)
- `scripts/update-upstream.sh`
- `tests/update-upstream.test.mjs`
- `tests/rhwp-baseline.test.mjs`
- `package.json`
- `README.md`
- `docs/DEVELOPMENT.md`
- `docs/architecture/UPSTREAM.md`

이번 task 산출물:

- `mydocs/orders/20260719.md`
- `mydocs/plans/task_m010_3.md`
- `mydocs/plans/task_m010_3_impl.md`
- `mydocs/working/task_m010_3_stage{N}.md`
- `mydocs/report/task_m010_3_report.md`

## 잠정 단계

- **Stage 1 — Stable 갱신 계약과 안전장치**
  - release tag 필수 입력, tag/commit resolve, floating ref 거부, dirty submodule 보호를 갱신 script와 fixture test로 구현한다.
  - 현재 실제 pin을 변경하기 전 정상·거부 경로와 read-only/apply 책임 경계를 검증한다.
- **Stage 2 — v0.7.19 source·native·WASM 원자적 고정**
  - submodule gitlink, Cargo lock, fresh WASM package를 `v0.7.19` commit 하나에 맞춘다.
  - `rhwp-core.lock`, 정합성 검증 script와 artifact regression test로 source/artifact 관계를 고정한다.
- **Stage 3 — adapter 호환성 및 공식 운영 문서 정리**
  - studio test/build로 `v0.7.19` API 호환성을 확인하고 필요한 wrapper 최소 보정만 수행한다.
  - `README.md`, `docs/DEVELOPMENT.md`, `docs/architecture/UPSTREAM.md`에 Stable 갱신·검증·rollback 절차를 반영한다.
- **Stage 4 — Issue 수용 기준 통합 검증**
  - pin 불일치 회귀 테스트, 제품 경계, studio build, Cargo metadata와 Rust format을 함께 검증한다.
  - macOS 및 native Tauri build를 실행하지 않았다는 검증 한계와 후속 Windows/Linux CI task 경계를 최종 보고에 남긴다.

## 검증 계획

### 단계별 검증

- Stage 1
  - `node --test tests/update-upstream.test.mjs`
  - `git diff --check`
- Stage 2
  - `pnpm run check:rhwp-pin`
  - `pnpm run test:upstream`
  - `cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps`
  - `git submodule status third_party/rhwp`
- Stage 3
  - `pnpm run test:studio`
  - `pnpm run build:studio`
  - `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check`
  - 공식 문서의 tag·commit·명령·rollback 설명 교차 확인
- Stage 4
  - `pnpm install --frozen-lockfile`
  - `pnpm run check:product-boundary`
  - `pnpm run check:rhwp-pin`
  - `pnpm run test:upstream`
  - `pnpm run test:studio`
  - `pnpm run build:studio`
  - `cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps`
  - `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check`
  - `git diff --check`

### 통합 검증

- `rhwp-core.lock`, submodule gitlink, Cargo package version과 bundled WASM version·hash가 `v0.7.19`/`f137b4c9468eaff5bb43e25108e9c9d39a2ed15b` 기준으로 일치한다.
- Stable 갱신 script와 verifier가 branch/floating ref, tag/commit 불일치, dirty source, artifact 변조를 거부한다.
- HOP repository, package와 remote가 지속 dependency로 다시 추가되지 않는다.
- GitHub Actions는 비활성 상태를 유지하고 macOS build/test 경로를 추가하거나 실행하지 않는다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **upstream API drift**: `v0.7.13`에서 `v0.7.19` 사이 studio/engine API 변경으로 adapter build가 깨질 수 있다. wrapper의 최소 호환 변경만 포함하고 upstream source 수정이나 새 기능 구현은 분리한다.
- **WASM 재현 환경**: Docker 또는 고정된 `wasm-pack`/Rust toolchain 준비에 network와 추가 도구가 필요할 수 있다. upstream이 문서화한 release build 경로를 사용하고 도구 설치나 network 접근이 필요하면 실행 전에 승인을 받는다.
- **binary artifact provenance**: WASM binary는 diff로 내용을 리뷰하기 어렵다. exact source commit, upstream lock fingerprint, SHA-256와 size를 machine-readable lock에 함께 기록해 변조와 stale artifact를 탐지한다.
- **path dependency 한계**: Cargo lock의 `rhwp` 항목은 local path dependency라 git commit을 직접 기록하지 않는다. gitlink·root lock·package version의 삼중 검증으로 보완한다.
- **자동 갱신의 파괴성**: 중간 실패가 submodule이나 generated artifact를 변경한 상태로 남길 수 있다. dirty guard와 read-only check를 우선하고 사용자 변경을 자동 reset하지 않으며 명시적 rollback 절차를 제공한다.
- **native 검증 공백**: 현재 macOS 작업 환경과 비활성 Actions에서는 Windows/Linux native compile·bundle을 증명할 수 없다. 이 task의 완료 증거는 platform-neutral 검증으로 제한하고 native CI는 별도 task에서 수행한다.

## 승인 요청 사항

- `v0.7.19`와 commit `f137b4c9468eaff5bb43e25108e9c9d39a2ed15b`을 이번 task의 고정 target으로 사용한다.
- 루트 `rhwp-core.lock`을 Stable provenance 진실 원천으로 만들고 upstream dependency fingerprint와 bundled artifact hash/size를 기록한다.
- Stable 갱신은 release tag를 필수로 하고 branch/floating ref 및 Demo/Preview 경로는 지원하지 않는다.
- WASM은 동일 `v0.7.19` checkout에서 fresh release build한 결과만 반영한다.
- 네 단계로 작업하고, adapter 수정은 `v0.7.19` 호환에 필요한 최소 범위로 제한한다.
- macOS/native Tauri build, GitHub Actions 활성화, Windows/Linux CI·배포는 이 task에서 제외한다.

승인되면 `task_m010_3_impl.md`에서 단계별 산출물, 검증 명령, 커밋 메시지를 구체화한다.
