# Task #3 구현계획서 — rhwp v0.8.2 Stable release pin

수행계획서: [`task_m010_3.md`](task_m010_3.md)
GitHub Issue: [#3](https://github.com/postmelee/alhangeul-tauri/issues/3)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Stable 갱신 계약과 안전장치 | `scripts/update-upstream.sh`, `tests/update-upstream.test.mjs` | 필수 tag/commit, floating ref·dirty·mismatch 거부 fixture |
| 2 | v0.8.2 source·native·WASM 원자적 고정 | `third_party/rhwp`, `Cargo.lock`, bundled WASM, `rhwp-core.lock`, pin writer/verifier | artifact hash·version·gitlink 정합성, upstream test, Cargo metadata |
| 3 | adapter 호환성과 공식 운영 문서 | 최소 wrapper 보정, `README.md`, `docs/DEVELOPMENT.md`, `docs/architecture/UPSTREAM.md` | studio test/build, pin check, Rust format, stale 기준 검색 |
| 4 | Issue 수용 기준 통합 검증 | Stage 1~3 교차 검증과 필요한 최소 보정 | 전체 platform-neutral suite, Actions 비활성 확인, diff 검사 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `rhwp-core.lock` | 저장소 루트 | `rhwp-core.lock` | OK | 자동화가 고정 경로에서 읽는 machine-readable provenance다. |
| `docs/architecture/UPSTREAM.md` | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | 지속 upstream, pin 계약과 known issue 경계를 공식화한다. |
| `docs/DEVELOPMENT.md` | `docs/` | `docs/DEVELOPMENT.md` | OK | 기여자가 실행할 update/check/rollback 명령을 둔다. |
| `README.md` | 저장소 루트 | `README.md` | OK | 현재 Stable pin과 상세 문서 링크만 요약한다. |
| 작업 산출물 | `mydocs/` | `mydocs/orders/20260728.md`, `mydocs/plans/task_m010_3*.md`, `mydocs/working/task_m010_3_stage*.md`, `mydocs/report/task_m010_3_report.md` | OK | Task #3 승인·검증 기록을 공식 제품 문서와 분리한다. |

## Stage 1 — Stable 갱신 계약과 안전장치

### 산출물

신규:

- 없음

수정:

- `scripts/update-upstream.sh`
- `tests/update-upstream.test.mjs`

### 변경 내용

- `UPSTREAM_BRANCH`, `UPSTREAM_REF`, `UPSTREAM_REMOTE`, `RUN_CHECKS` 환경변수 기반 인터페이스를 제거하고 다음 명시적 CLI 계약으로 바꾼다.
  - 적용: `scripts/update-upstream.sh --tag <vX.Y.Z> --commit <40자리 SHA> [--run-checks]`
  - unknown option, 누락된 tag/commit, release tag 형식이 아닌 ref, 40자리 SHA가 아닌 commit은 fetch나 checkout 전에 실패한다.
- remote는 submodule의 `origin`으로 고정하고 `refs/tags/<tag>`만 fetch한다. branch 이름과 `origin/main` 같은 floating ref를 입력 표면에서 제거한다.
- `git rev-parse refs/tags/<tag>^{commit}`으로 lightweight/annotated tag를 모두 commit으로 resolve하고 `--commit`과 정확히 일치할 때만 detached checkout한다.
- submodule이 초기화되지 않았거나 tracked/untracked 변경이 있으면 fetch 전에 실패한다. tag/commit mismatch도 checkout 전에 실패해 기존 pointer를 보존한다.
- `--run-checks`는 native Tauri build, `cargo test`, clippy를 실행하지 않고 platform-neutral 명령만 정해진 순서로 호출한다. Stage 2에서 `check:rhwp-pin`이 추가되면 최종 명령 목록을 완성한다.
- fixture test를 다음 계약으로 교체한다.
  - lightweight tag 정상 적용
  - annotated tag 정상 적용
  - tag/commit 필수 인자와 형식 검증
  - tag/commit mismatch 시 기존 checkout 보존
  - branch/floating ref 옵션 부재와 unknown option 거부
  - missing/dirty submodule 거부
  - platform-neutral `--run-checks` 호출 순서

### 검증

```bash
node --test tests/update-upstream.test.mjs
bash -n scripts/update-upstream.sh
git diff --check
```

### 커밋

```text
Task #3 Stage 1: Stable upstream 갱신 계약과 안전장치 구현
```

## Stage 2 — v0.8.2 source·native·WASM 원자적 고정

### 산출물

신규:

- `rhwp-core.lock`
- `scripts/write-rhwp-pin.mjs`
- `scripts/verify-rhwp-pin.mjs`
- `tests/rhwp-pin.test.mjs`

수정:

- `third_party/rhwp` gitlink
- `apps/desktop/src-tauri/Cargo.lock`
- `apps/studio-host/vendor/rhwp-core/package.json`
- `apps/studio-host/vendor/rhwp-core/rhwp.js`
- `apps/studio-host/vendor/rhwp-core/rhwp.d.ts`
- `apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm`
- `apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm.d.ts`
- `apps/studio-host/vendor/rhwp-core/LICENSE`(upstream 원본과 달라질 때만)
- `scripts/update-upstream.sh`
- `tests/update-upstream.test.mjs`
- `tests/rhwp-baseline.test.mjs`
- `package.json`

### 변경 내용

- Stage 1의 strict updater로 `v0.8.2` tag와 commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`을 검증하고 `third_party/rhwp`를 detached checkout한다.
- `cargo update --manifest-path apps/desktop/src-tauri/Cargo.toml -p rhwp`로 path dependency version과 native dependency graph를 갱신한다. 그 외 dependency 변동은 `Cargo.lock` diff에서 `v0.8.2`가 요구한 변경인지 검토한다.
- upstream CI/Dockerfile의 단일 기준과 동일한 `wasm-pack 0.15.0`을 필수 preflight로 검사한다. 버전이 다르면 binary를 생성하지 않고 실패한다.
- `third_party/rhwp` 내부에서 검증된 prefix로 `mktemp -d` staging 디렉터리를 만들고 그 basename을 `wasm-pack build --target web --release --out-dir <상대 staging 이름>`에 전달해 stale `pkg/` 재사용을 차단한다. 성공·실패 모두 `trap`으로 staging 디렉터리를 정리하며 build source HEAD가 lock target commit과 일치하는지 build 직전·직후 확인한다.
- 빈 임시 출력에서 다음 allowlist만 `apps/studio-host/vendor/rhwp-core`로 동기화하고 기존 generated file과 교체한다.
  - `package.json`
  - `rhwp.js`
  - `rhwp.d.ts`
  - `rhwp_bg.wasm`
  - `rhwp_bg.wasm.d.ts`
  - upstream `LICENSE`
- `scripts/write-rhwp-pin.mjs`는 다음 내용을 deterministic TOML로 기록한다. timestamp는 같은 source/artifact의 불필요한 diff를 만들므로 기록하지 않는다.
  - `lock_version`
  - `rhwp_repo`
  - `rhwp_ref_kind = "release-tag"`
  - `rhwp_release_tag = "v0.8.2"`
  - `rhwp_commit = "9b16aa9e23f476e2b335d7c029fc9f24a199d63c"`
  - upstream `Cargo.lock` SHA-256
  - `wasm-pack` version과 build profile
  - generated allowlist 각 path의 SHA-256와 byte size
- `scripts/verify-rhwp-pin.mjs`는 파일을 수정하지 않고 다음 경계를 함께 검사한다.
  - lock 필수 필드와 Stable ref kind
  - `.gitmodules` repository와 submodule HEAD/tag/commit
  - upstream `Cargo.toml`, desktop `Cargo.lock`, vendored `package.json`의 `0.8.2` version
  - upstream `Cargo.lock` fingerprint
  - 모든 managed artifact의 존재·SHA-256·size
- `package.json`에 `check:rhwp-pin`을 추가하고 `test:upstream`에 `tests/rhwp-pin.test.mjs`를 포함한다.
- `tests/rhwp-pin.test.mjs`는 정상 fixture와 repository pin을 검증하고 repo/tag/commit/version/hash/size 변조 각각을 실패시킨다.
- `tests/rhwp-baseline.test.mjs`의 hard-coded `v0.7.13` 기준을 lock 기반으로 전환하되, 기존 Alhangeul adapter 경계 회귀 assertion은 유지한다.
- `scripts/update-upstream.sh`의 최종 apply 흐름은 source checkout → Cargo lock 갱신 → fresh WASM build/sync → lock write → read-only verify 순서로 실행한다. `--run-checks`는 verify 이후 전체 platform-neutral 검증을 추가한다.
- 중간 실패 시 사용자 파일이나 gitlink를 자동 reset하지 않는다. 실패 단계와 직전 commit을 출력하고 공식 rollback 절차에 따라 복구하도록 한다.

### 검증

```bash
wasm-pack --version
pnpm run check:rhwp-pin
pnpm run test:upstream
cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps
git submodule status third_party/rhwp
git diff --submodule=log -- third_party/rhwp apps/desktop/src-tauri/Cargo.lock apps/studio-host/vendor/rhwp-core rhwp-core.lock
git diff --check
```

예상 기준:

- `wasm-pack --version`은 `wasm-pack 0.15.0`이다.
- submodule과 lock resolved commit은 `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`이다.
- upstream Cargo, desktop Cargo lock과 vendored package version은 `0.8.2`다.
- pin verifier와 mismatch fixture가 모두 통과한다.

### 커밋

```text
Task #3 Stage 2: rhwp v0.8.2 source와 artifact 원자적 고정
```

## Stage 3 — adapter 호환성과 공식 운영 문서 정리

### 산출물

신규:

- 없음

수정:

- `apps/studio-host/**`의 v0.8.2 호환에 필요한 최소 wrapper 파일(실제 실패가 있을 때만)
- `tests/rhwp-baseline.test.mjs`(호환 경계 assertion 보정이 필요할 때만)
- `README.md`
- `docs/DEVELOPMENT.md`
- `docs/architecture/UPSTREAM.md`

### 변경 내용

- 먼저 code 수정 없이 `pnpm run test:studio`와 `pnpm run build:studio`를 실행해 `v0.8.2` import/API 호환성을 확인한다.
- 실패가 Alhangeul adapter에 있으면 `apps/studio-host`의 alias/override/bridge에서 최소 변경한다. upstream engine/renderer source는 수정하지 않고 새 기능을 backport하지 않는다.
- 기존 Alhangeul 경계인 document load 보정, unsaved guard, upstream engine 위임, About version 분리, PDF menu-only 계약을 `tests/rhwp-baseline.test.mjs`로 유지한다.
- `README.md`에는 현재 Stable pin `v0.8.2`와 `rhwp-core.lock`/upstream 문서 링크만 간단히 반영한다.
- `docs/architecture/UPSTREAM.md`에는 다음을 공식화한다.
  - 현재 tag/commit과 source·native·WASM 일치 기준
  - `rhwp-core.lock` schema와 managed artifact
  - updater/write/verify 소유 경계
  - branch/floating ref 금지와 dirty guard
  - `v0.8.2` release note의 `print-pdf-issue3126`, `issue-2214` known issue를 Alhangeul 회귀와 구분하는 기준
- `docs/DEVELOPMENT.md`에는 다음 명령과 실패 복구 순서를 기록한다.
  - strict apply 명령
  - read-only `pnpm run check:rhwp-pin`
  - platform-neutral 검증 명령
  - 실패 시 현재 변경 확인, 직전 검증 완료 commit으로 수동 복구, 재검증 순서
- macOS, signing, packaging, 공개 release, Actions 활성화 절차는 추가하지 않는다.

### 검증

```bash
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
rg -n 'v0\.8\.2|9b16aa9e23f476e2b335d7c029fc9f24a199d63c|rhwp-core\.lock' README.md docs/DEVELOPMENT.md docs/architecture/UPSTREAM.md
! rg -n 'v0\.7\.13|b3e16ef212af81ef37d973ddb86d6816d3804642' README.md docs/DEVELOPMENT.md docs/architecture/UPSTREAM.md scripts tests package.json
git diff --check
```

예상 기준:

- 첫 번째 `rg`는 현재 Stable 기준과 lock 문서화를 찾는다.
- 두 번째 `rg`는 빈 출력이어야 한다.
- upstream known issue는 검증 한계로 기록되며 성공으로 오인되거나 Alhangeul 코드에서 임의 보정되지 않는다.

### 커밋

```text
Task #3 Stage 3: v0.8.2 adapter 호환성과 upstream 운영 문서 정리
```

## Stage 4 — Issue 수용 기준 통합 검증

### 산출물

신규:

- 없음

수정:

- Stage 1~3 산출물 중 통합 검증에서 확인된 Issue #3 범위의 최소 보정 파일(필요한 경우에만)

### 변경 내용

- Issue #3의 포함·제외 범위와 수용 기준을 Stage 1~3 실제 diff에 대조한다.
- tag/commit mismatch, dirty submodule, artifact hash/size 변조, Cargo/WASM version mismatch fixture가 각각 독립적으로 실패하는지 확인한다.
- HOP 지속 dependency가 재도입되지 않았고 GitHub Actions 저장소 실행 권한이 계속 비활성인지 read-only로 확인한다.
- `v0.8.2` release note의 known issue와 실제 Alhangeul test/build 결과를 구분해 Stage 4 보고서와 최종 보고서의 검증 한계 후보로 기록한다.
- Windows/Linux native compile·bundle, macOS Tauri build/test, 공개 release를 실행하지 않는다.
- 실패가 계획 범위를 넘어선 upstream 결함이나 새 기능 요구이면 Stage 4에서 확장하지 않고 후속 Issue 후보로 분리한다.

### 검증

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
gh api repos/postmelee/alhangeul-tauri/actions/permissions
git diff --check
```

추가 확인:

- Actions API 응답의 `enabled`는 `false`다.
- `git remote -v`와 product-boundary 검사는 HOP remote·지속 dependency가 없음을 보여야 한다.
- `rhwp-core.lock`과 관리 대상 파일을 변경한 mismatch fixture는 verifier가 모두 거부해야 한다.
- 실행하지 않은 native/E2E 검증은 성공 표에 포함하지 않고 검증 한계로 분리한다.

### 커밋

```text
Task #3 Stage 4: Stable pin 수용 기준 통합 검증
```

## 검증

- 각 Stage 검증 명령은 `task-stage-report` 호출과 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않고 같은 Stage에서 원인을 분리한다.
- `v0.8.2` pin이나 artifact 생성 방식, Stage 범위를 바꿔야 하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 다시 받는다.
- platform-neutral 명령만 실행하며 native Tauri build/test 명령을 대체 검증처럼 추가하지 않는다.
- binary WASM은 source tag/commit, build tool version, upstream Cargo fingerprint와 artifact hash/size를 함께 검토한다.
- 문서 위치가 수행계획서 판단과 달라지면 변경 전에 계획서를 갱신하고 승인받는다.

## 커밋

- 각 Stage 소스 변경과 `mydocs/working/task_m010_3_stage{N}.md`를 하나의 단계 커밋으로 묶는다.
- 커밋 메시지는 다음 네 개로 고정한다.
  - `Task #3 Stage 1: Stable upstream 갱신 계약과 안전장치 구현`
  - `Task #3 Stage 2: rhwp v0.8.2 source와 artifact 원자적 고정`
  - `Task #3 Stage 3: v0.8.2 adapter 호환성과 upstream 운영 문서 정리`
  - `Task #3 Stage 4: Stable pin 수용 기준 통합 검증`
- 단계 완료보고서와 검증이 준비되기 전 소스만 별도 커밋하지 않는다.

## 단계 의존성

- Stage 1은 실제 pin과 artifact를 바꾸지 않고 strict updater 계약과 fixture를 먼저 확정한다.
- Stage 2는 Stage 1 보고서 승인 후 진행하며 source checkout, Cargo lock, fresh WASM, provenance lock과 verifier를 한 원자적 기준으로 묶는다.
- Stage 3은 Stage 2 pin 검증과 보고서 승인 후 진행하며 실제 `v0.8.2` 기준으로 adapter 호환성과 공식 문서를 확정한다.
- Stage 4는 Stage 3 보고서 승인 후 진행하며 새 기능을 추가하지 않고 Issue 수용 기준만 교차 검증한다.
- 각 Stage 사이에는 `task-stage-report` 절차와 작업지시자 승인이 필요하다.

## 위험과 대응

- **대규모 upstream 변화**: `v0.7.13..v0.8.2`의 core·studio 관련 변경이 423개 파일 규모다. Stage 2에서 provenance를 먼저 고정하고 Stage 3에서 adapter 실패만 최소 보정한다.
- **known issue 오판**: `print-pdf-issue3126`, `issue-2214` 실패는 `v0.8.2` release note에 공개된 upstream known issue다. Alhangeul 기본 test/build 결과와 분리하고 성공으로 면제하지 않는다.
- **WASM stale artifact**: 빈 임시 `--out-dir`에서만 build하고 allowlist copy와 hash/size 검증을 사용한다.
- **toolchain 차이**: upstream이 고정한 `wasm-pack 0.15.0`을 preflight하고 실제 version/build profile을 lock에 기록한다. Rust toolchain 차이는 artifact hash와 검증 한계에 남긴다.
- **부분 적용 상태**: updater가 사용자 변경을 자동 reset하지 않는다. 각 단계 종료 전 verifier를 통과시키고 실패 시 공식 문서의 수동 rollback 절차를 따른다.
- **binary 리뷰 한계**: WASM byte diff 대신 exact source commit, Cargo fingerprint, build tool과 SHA-256/size를 함께 검증한다.
- **native 검증 공백**: 현재 환경에서는 Windows/Linux native compile·bundle을 증명하지 않는다. 후속 CI task의 검증 범위를 침범하지 않고 최종 보고에 남긴다.

## 승인 요청 사항

- Stage 1~4 분할과 각 단계 커밋 메시지를 승인한다.
- updater 최종 CLI를 `--tag <vX.Y.Z> --commit <40자리 SHA> [--run-checks]`로 고정하고 branch/floating ref 입력을 제거한다.
- `wasm-pack 0.15.0` release build를 빈 임시 디렉터리에서 수행하고 generated allowlist만 vendor에 반영한다.
- `scripts/write-rhwp-pin.mjs`와 `scripts/verify-rhwp-pin.mjs`로 deterministic lock 생성과 read-only 검증을 분리한다.
- `v0.8.2` adapter 호환에 필요한 최소 wrapper 변경만 허용하고 upstream known issue 수정과 native CI·배포를 제외한다.
- 각 Stage 완료 후 `task-stage-report`로 검증·보고·커밋을 묶고 다음 Stage 승인 전에는 진행하지 않는다.
