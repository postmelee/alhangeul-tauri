# Task #17 Stage 2 완료보고서 — bounded Linux thumbnailer와 atomic PNG

GitHub Issue: [#17](https://github.com/postmelee/alhangeul-tauri/issues/17)
구현계획서: [`task_m010_17_impl.md`](../plans/task_m010_17_impl.md)
Stage: 2

## 단계 목적

Stage 1에서 확정한 process·resource·출력 계약을 실제 Linux 전용 thumbnailer로 구현하는 단계다. 공개 entry는 Freedesktop의 `%i %o %s` 세 positional argument만 받고 같은 ELF의 비공개 worker를 실행한다. worker에는 render 전에 256 MiB `RLIMIT_AS`를 적용하고, supervisor는 공유 core의 1,500 ms deadline과 signal 처리, child kill·wait, sibling temporary 정리를 소유한다.

첫 페이지 direct render를 먼저 시도하고 실패할 때만 embedded preview로 fallback한다. 결과는 요청 edge와 RGBA 구조를 다시 검증한 뒤 출력과 같은 디렉터리에서 atomic rename하며, 실패 시 기존 final output을 보존한다. Linux x64·arm64 locked build/test/Clippy와 기존 Windows thumbnail·installer 회귀를 exact source SHA에서 함께 수용했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/linux-thumbnailer/Cargo.toml`, `Cargo.lock` | Linux 전용 독립 binary crate, 읽기 전용 `document-preview` render 의존성과 tracked lockfile을 추가한다. |
| `apps/linux-thumbnailer/src/cli.rs` | 공개 `%i %o %s`와 private worker mode를 분리하고 absolute canonical regular input, output parent, 1..=1024 edge, 64 MiB 입력 상한을 fail-closed 검증한다. |
| `apps/linux-thumbnailer/src/main.rs` | self-child supervisor, 1,500 ms deadline, HUP/INT/TERM 처리와 kill·wait RAII cleanup을 구현한다. |
| `apps/linux-thumbnailer/src/render.rs` | worker의 256 MiB `RLIMIT_AS`, bounded read, direct-first/preview-fallback, premultiplied BGRA→straight RGBA PNG 생성을 구현한다. |
| `apps/linux-thumbnailer/src/output.rs` | 고유 sibling temporary, PNG decode·edge·RGBA 검증, atomic rename과 실패 cleanup을 구현한다. |
| `apps/linux-thumbnailer/tests/thumbnailer_contract.rs` | 실제 HWP/HWPX, preview fallback, corrupt·oversize·readonly·symlink·directory·same-path, timeout/reap, `/proc` memory limit, signal, panic·partial, 동시 요청을 검증한다. |
| `scripts/build-linux-thumbnailer.mjs` | x64·arm64만 허용하는 locked release build, ELF64 little-endian machine 검증, executable staging과 exact-SHA summary를 구현한다. |
| `tests/linux-thumbnail-build.test.mjs` | build CLI·target·ELF·summary·workflow·source 크기·제품 경계 계약 8개를 고정한다. |
| `.github/workflows/alhangeul-desktop.yml` | Linux x64·arm64 matrix에 helper build/evidence gate와 target별 test·strict Clippy를 추가한다. |
| `package.json`, `.gitignore` | Linux helper build/test/Clippy script와 독립 crate lockfile 추적 예외를 추가한다. |
| `scripts/check-product-boundary.mjs`, `tests/product-boundary.test.mjs` | Linux helper에서 network·Tauri 의존을 금지하고 worker의 child process·filesystem 경계를 명시한다. |
| `mydocs/plans/task_m010_17_impl.md` | Stage 2 진입 시 최신 `devel`과의 중첩 경로와 최소 수정 원칙을 기록한다. |
| `mydocs/orders/20260830.md` | Task #17을 Stage 2 완료·Stage 3 승인 대기로 갱신한다. |
| `mydocs/working/task_m010_17_stage2.md` | Stage 2 구현·검증·보정 이력과 Stage 3 인계 사항을 기록한다. |

### 확정 실행 계약

- 공개 호출은 `alhangeul-thumbnailer <absolute-input> <absolute-output> <edge>`만 허용한다. stdin, URI, network와 Tauri/WebView를 사용하지 않는다.
- supervisor는 현재 ELF를 `--alhangeul-private-worker`로 실행하고 stdin/stdout/stderr와 환경을 닫는다. 1,500 ms deadline 또는 HUP/INT/TERM이면 worker를 kill한 뒤 반드시 wait한다.
- worker는 256 MiB `RLIMIT_AS`를 render 전에 적용한다. limit 설정 실패, render 실패, panic과 partial write는 nonzero로 닫힌다.
- direct first-page raster가 성공하면 embedded preview를 읽지 않고, direct 실패 뒤에만 preview를 rasterize한다.
- worker는 `create_new` sibling temporary만 쓰고 `sync_all`한다. supervisor가 RGBA8, 정확한 최대 edge, byte 길이를 decode 검증한 뒤 final path로 rename한다.
- symlink, directory, 비정규 input/output, 동일 input/output, 64 MiB 초과 입력과 1024 초과 edge를 거부한다. 실패 시 기존 final은 보존되고 temporary와 orphan worker는 남지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

코드·workflow·내부 계획 문서 작업이다. 제품 공식 문서와 `third_party/rhwp` gitlink·내용은 수정하지 않았다. HWP/HWPX 입력은 read-only bytes로만 열며 integration test가 원본을 별도 temporary로 복사해 실행한다.

공유 `document-preview`와 Windows thumbnailer 구현은 변경하지 않았다. desktop workflow에 Linux 조건부 step만 추가했고 exact-SHA 최종 run에서 Windows x64 worker·handler·Tauri bundle·NSIS/MSI 설치 smoke가 함께 통과했다.

Stage 2 소스는 CI 보정마다 `Stage 2.1`부터 `Stage 2.5`까지 분리 커밋해 exact SHA를 보존했다. 이 보고서와 오늘할일 갱신만 Stage 2 종료 커밋에 포함하며, 검증된 제품 소스 SHA는 `7bf48943e16f30189e171030aa163b95f5b2e4f3`다.

## 검증 결과

macOS에서 실행 가능한 구현계획서 명령과 추가 workflow lint:

```bash
cargo fmt --manifest-path apps/linux-thumbnailer/Cargo.toml -- --check
node --test tests/linux-thumbnail-build.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
actionlint .github/workflows/alhangeul-desktop.yml
git diff --check
```

결과:

- OK — Rust format 차이 없이 종료 코드 0
- OK — Linux build·workflow 계약 8/8 통과
- OK — automation 전체 279/279 통과
- OK — product boundary 276개 파일 검사 통과
- OK — desktop workflow lint 경고 없이 종료 코드 0
- OK — `git diff --check` 출력 없이 종료 코드 0

Linux x64·arm64에서는 exact-SHA workflow가 구현계획의 locked test·strict Clippy를 target별로 실행했다.

```bash
CARGO_BUILD_TARGET=x86_64-unknown-linux-gnu pnpm run test:linux-thumbnailer
CARGO_BUILD_TARGET=x86_64-unknown-linux-gnu pnpm run clippy:linux-thumbnailer
CARGO_BUILD_TARGET=aarch64-unknown-linux-gnu pnpm run test:linux-thumbnailer
CARGO_BUILD_TARGET=aarch64-unknown-linux-gnu pnpm run clippy:linux-thumbnailer
```

- OK — run [33266446415](https://github.com/postmelee/alhangeul-tauri/actions/runs/33266446415), conclusion `success`
- exact source SHA: `7bf48943e16f30189e171030aa163b95f5b2e4f3`
- Linux x64 job `99137240850`: build, integration test, strict Clippy, Tauri bundle 모두 `success`
- Linux arm64 job `99137240952`: build, integration test, strict Clippy, Tauri bundle 모두 `success`
- Windows x64 job `99137241032`: automation 279개, 기존 worker·handler test/Clippy와 Tauri bundle 모두 `success`
- Windows installer smoke job `99141869495`: NSIS/MSI 설치·제거와 thumbnail 회귀 `success`

### exact-SHA helper artifact

| target | ELF | bytes | SHA-256 |
|---|---|---:|---|
| `x86_64-unknown-linux-gnu` | ELF64 PIE, machine 62 | 21,100,784 | `fc9cb64159582b825a167fe479d1552a24155fb58bcf24b4ff6749958eed98d6` |
| `aarch64-unknown-linux-gnu` | ELF64 PIE, machine 183 | 19,827,088 | `73baac02f9b741a9bbfcaed8d354222ad96baf3147e9348eeadc00f55805ae8e` |

두 artifact summary의 `repositorySha`, target, architecture, ELF type/machine, bytes와 SHA-256을 내려받은 파일에 다시 대조했다. build outcome은 각각 `linux-x64: success`, `linux-arm64: success`다.

### integration test 범위

- 실제 `blank2010.hwp`, `blank_hwpx.hwpx` first-page RGBA PNG와 edge 상한
- direct render 실패 뒤 유효 embedded preview fallback
- 0/1025 edge, stdin marker, symlink·directory·same-path·output symlink 거부
- 64 MiB+1, corrupt document, readonly directory와 기존 final 보존
- 1,500 ms timeout 뒤 worker kill·wait와 temporary cleanup
- `/proc/<pid>/limits`의 268,435,456-byte soft/hard address-space limit
- parent TERM 뒤 worker 회수, panic·partial output cleanup
- 동일 final path 네 개 동시 요청 뒤 완전한 PNG 하나만 게시

### 진단과 보정 이력

| run | 결과 | 확인 내용과 보정 |
|---|---|---|
| [33264358160](https://github.com/postmelee/alhangeul-tauri/actions/runs/33264358160) | failure | `pnpm --` separator가 build helper positional input으로 전달됐다. helper가 separator 하나만 정규화하도록 Stage 2.2에서 보정했다. |
| [33264664777](https://github.com/postmelee/alhangeul-tauri/actions/runs/33264664777) | failure | x64·arm64 Rust compile에서 `by_ref` trait 호출이 모호했다. `Read::by_ref`를 명시하도록 Stage 2.3에서 보정했다. |
| [33265054004](https://github.com/postmelee/alhangeul-tauri/actions/runs/33265054004) | failure | 두 Linux integration test는 통과했고 strict Clippy가 unused import, checked division, function cast를 거부했다. Stage 2.4에서 경고를 제거했다. |
| [33265607435](https://github.com/postmelee/alhangeul-tauri/actions/runs/33265607435) | failure | Linux x64·arm64 helper test/Clippy는 통과했으나 Windows에서 POSIX separator와 executable mode 가정이 neutral contract를 깨뜨렸다. Stage 2.5에서 path·mode 판정을 플랫폼 중립화했다. |
| [33266446415](https://github.com/postmelee/alhangeul-tauri/actions/runs/33266446415) | success | Linux x64·arm64, Windows x64와 installer smoke 전체가 exact SHA에서 통과했다. |

실패한 run을 성공으로 취급하지 않았다. 각 원인을 소스 커밋으로 분리한 뒤 최종 candidate 전체 matrix를 새로 실행했다.

## 잔여 위험

- Stage 2 helper는 아직 `.thumbnailer` registration이나 DEB/RPM `files` mapping에 연결되지 않았다. 현재 설치본만으로 Linux 파일 관리자 썸네일을 사용할 수 있다는 의미는 아니며 Stage 3·4가 필요하다.
- 첫 페이지 PNG의 GNOME Files·Thunar 실제 표시, success cache hit, mtime invalidation과 corrupt fallback은 Stage 3의 disposable XDG GUI 수용 전까지 미검증이다.
- Linux helper는 target runner의 glibc 동적 ELF다. 지원 배포판 package 안에서 dependency와 sandbox 실행 가능성을 Stage 3·4에서 다시 확인한다.
- 256 MiB address-space limit과 1,500 ms deadline은 승인된 공개 fixture matrix를 통과했지만 복잡한 실사용 문서 전체를 대표하지 않는다. Stage 6 exact-SHA resource 수용 전까지 지원 완료로 표기하지 않는다.

## 다음 단계 영향

- Stage 3 시작 전에 500줄인 `.github/workflows/alhangeul-linux-gui.yml`의 manager probe를 역할별 shell helper로 분리해 workflow가 환경 준비·호출·artifact gate만 소유하게 한다.
- `/usr/lib/alhangeul/alhangeul-thumbnailer`를 가리키고 HWP/HWPX MIME만 선언하는 disposable `.thumbnailer`를 등록한다. 제품 package mapping은 Stage 4 전까지 수정하지 않는다.
- GNOME Files·Thunar/Tumbler에서 미열람 HWP/HWPX의 실제 제품 PNG, direct/preview/failure fallback, cache hit와 mtime invalidation을 invocation log·metadata·visible screenshot으로 함께 판정한다.
- 시스템 전체 cache 삭제, file manager 강제 종료, MIME 기본 연결 변경과 다른 thumbnailer 제거는 금지한다.

## 승인 요청

- Stage 2의 bounded Linux CLI, resource limit, direct-first fallback, atomic PNG·cleanup 계약과 exact-SHA x64·arm64/Windows 검증 결과를 승인하면 Stage 3의 GNOME Files·Thunar/Tumbler 통합과 cache 수용으로 진행한다.
