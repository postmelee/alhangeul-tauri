# Task #17 구현계획서 — Linux 파일 관리자 HWP/HWPX 첫 페이지 썸네일

수행계획서: [`task_m010_17.md`](task_m010_17.md)
GitHub Issue: [#17](https://github.com/postmelee/alhangeul-tauri/issues/17)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Freedesktop·file manager·resource·package 계약 확정 | Linux probe script, exact-SHA x64·arm64 계측, 구현계획 보정 | source contract test, Linux native probe, GNOME/Thunar discovery probe |
| 2 | bounded Linux CLI와 atomic PNG 구현 | `apps/linux-thumbnailer/` | locked Rust test·Clippy, PNG/fallback/limit/atomic-output 회귀 |
| 3 | GNOME Files·Thunar/Tumbler 통합과 cache 수용 | `.thumbnailer`, Linux GUI acceptance 확장 | XDG discovery, 두 file manager UI, cache/invalidation/fallback |
| 4 | DEB·RPM 설치·업데이트·제거 통합 | Linux package custom files와 native smoke | x64 DEB/RPM, arm64 DEB inventory·install·update·remove |
| 5 | 플랫폼 중립 회귀·공식 문서 정렬 | 공식 architecture/development/operations 문서 | product/upstream/Studio/automation/build와 artifact gate |
| 6 | Linux x64·arm64 exact-SHA native 수용 | exact artifact·GUI evidence와 Stage 6 보고서 | 승인 package matrix의 clean native 수용 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 | `README.md` | OK | Stage 5에서 실제 수용한 조합만 최소 반영 |
| `LINUX_THUMBNAILS.md` | `docs/architecture/` | `docs/architecture/LINUX_THUMBNAILS.md` | OK | Stage 5 신규 공식 아키텍처 문서 |
| `UPSTREAM.md` | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | 공유 preview 경계만 보정 |
| `DEVELOPMENT.md` | `docs/` | `docs/DEVELOPMENT.md` | OK | build/test/native host 조건 |
| `DESKTOP_RELEASE.md` | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | package·acceptance 운영 gate |
| 공식 문서 index | `docs/` | `docs/README.md` | OK | 신규 문서 연결 |
| task 계획 | `mydocs/plans/` | `mydocs/plans/task_m010_17*.md` | OK | 승인·구현 판단 기록 |
| 단계 보고 | `mydocs/working/` | `mydocs/working/task_m010_17_stage{N}.md` | OK | probe와 단계별 evidence |
| 최종 보고 | `mydocs/report/` | `mydocs/report/task_m010_17_report.md` | OK | final 절차에서 작성 |

## 공통 구현 규칙

- Stage 진입 전에 `origin/devel`과 Task #20·#35·#45의 공개 변경을 읽고 충돌 파일을 기록한다. 다른 task 변경을 덮어쓰거나 임의 rebase하지 않는다.
- Linux adapter는 path·CLI·PNG·atomic output·process supervision만 소유한다. HWP/HWPX parse, direct SVG, embedded preview, pinned font와 byte/pixel 상한은 `crates/document-preview`를 재사용한다.
- 정상 경로는 `direct render → embedded preview → nonzero/no final output`이다. app icon PNG나 제품 persistent cache를 새로 만들지 않는다.
- 로그·artifact에는 fixture class, SHA-256, 크기, 시간, RSS와 결과 구조만 남긴다. 문서 path·본문·사용자 문서는 기록하지 않는다.
- 신규 소스는 파일 300 LOC, 함수 50 LOC, 매개변수 5개, 순환 복잡도 10을 상한으로 삼는다. 초과가 필요하면 해당 Stage 계획을 먼저 보정해 승인받는다.
- exact-SHA Actions 실행에 원격 commit이 필요하면 `publish/task17`을 candidate 운반에만 사용한다. Stage 6 전 PR은 만들지 않고 force push·tag·release·package 게시를 하지 않는다.

## Stage 1 — Freedesktop·file manager·resource·package 계약 확정

### 산출물

신규:

- `scripts/benchmark-linux-thumbnail-core.sh`
- `tests/linux-thumbnail-core-probe.test.mjs`
- `mydocs/working/task_m010_17_stage1.md`

수정:

- `.gitignore`
- `package.json`
- `.github/workflows/alhangeul-desktop.yml`
- `.github/workflows/alhangeul-linux-gui.yml`
- `tests/actions-workflows.test.mjs`
- `tests/linux-gui-workflow.test.mjs`
- `mydocs/plans/task_m010_17_impl.md` — 실측 뒤 Stage 2/3 resource·격리 계약 확정

### 변경 내용

- Windows probe와 같은 공개 fixture class(`normal`, `preview-absent`, `preview-stale`, `corrupt-truncated`, `64 MiB + 1`)를 사용하되 Linux 전용 shell script는 경로·본문 대신 hash와 resource만 JSON으로 기록한다.
- `document-preview`의 direct SVG와 embedded preview를 별도 process로 실행해 128/256/512/1024 px의 cold wall time, peak RSS, stdout/stderr byte와 원본 hash/size/mtime 불변을 x64·arm64에서 계측한다.
- Linux x64 GUI job의 disposable XDG 경로에 test stub `.thumbnailer`를 등록해 GNOME Files와 Thunar/Tumbler의 discovery, `%i %o %s`, exit code, partial output, 반복 호출과 원본 mtime 변경 동작을 관찰한다. 제품 binary나 system path는 아직 설치하지 않는다.
- DEB/RPM custom files가 `/usr/lib/alhangeul/alhangeul-thumbnailer`와 `/usr/share/thumbnailers/alhangeul.thumbnailer`를 선언적으로 소유할 수 있는지 package toolchain으로 확인한다. refresh hook은 discovery probe가 없이는 갱신되지 않는다는 증거가 있을 때만 후보로 남긴다.
- x64는 DEB·RPM/GNOME Files·Thunar, arm64는 native core·DEB를 수용 matrix로 고정한다. arm64 RPM·GUI는 runner가 실제 제공되고 동일 probe를 통과한 경우에만 후속 계획에 추가한다.
- Stage 1 보고서와 구현계획 보정에 file-manager timeout, observed p95/max, peak RSS를 기록하고 single process, supervisor/self-child, 기존 framed worker 중 하나를 선택한다. hard deadline과 memory cap 수치·kill/cleanup 조건까지 승인받기 전 Stage 2로 넘어가지 않는다.
- Stage 1 probe candidate는 별도 commit으로 `publish/task17`에 push해 exact SHA로 dispatch한다. 성공·실패 run ID와 artifact digest를 보고서에 결속하고, evidence 반영 commit으로 Stage를 닫는다.

### Stage 1 실측 후 확정 계약

- **격리 방식**: public `%i %o %s` entry는 supervisor이고 같은 ELF의 비공개 worker mode를 child로 시작한다. child는 render 진입 전에 Linux memory limit를 적용하고, parent는 monotonic hard deadline 뒤 child를 강제 종료·회수한 다음 임시 출력을 삭제한다. thread-only timeout이나 Tauri/WebView process 재사용은 채택하지 않는다.
- **resource 상한**: 공유 core의 `FRAME_SELECTION_DEADLINE_MS=1_500`과 `WORKER_MEMORY_LIMIT_BYTES=256 MiB`를 Linux에서도 단일 진실 원천으로 재사용한다. exact Linux probe에서 88건 모두 timeout 없이 x64 wall p95 최대 74 ms·max 167 ms·peak RSS max 70,778,880 bytes, arm64 wall p95 최대 48 ms·max 129 ms·peak RSS max 70,123,520 bytes였다. Stage 2는 worker에 `RLIMIT_AS`를 적용하고 limit 설정 실패도 render 전 nonzero로 닫으며, timeout·limit·signal 회귀에서 `kill`과 `wait` 및 sibling temporary cleanup을 검증한다.
- **출력 소유권**: worker는 parent가 고른 output sibling temporary에만 PNG를 쓰고, parent가 child 성공·PNG decode·크기/alpha 계약을 확인한 뒤 final path로 atomic rename한다. direct 실패 시에만 preview를 시도하며 둘 다 실패하면 final을 만들지 않는다. 기존 final output은 실패 시 보존한다.
- **file-manager cache 판정**: 정상 HWP/HWPX 두 건은 Nautilus와 Thunar 모두 최초 각 1회 생성, 동일 원본 재요청 시 success 호출 증가 없음, mtime 변경 뒤 각 1회 이상 재생성을 필수로 한다. 손상 문서의 failure cache는 Nautilus가 유지하고 Thunar/Tumbler가 재시도할 수 있으므로 재시도 횟수를 동일하게 강제하지 않고, `partial-exit-42` 관측·정상 cache 미오염·MIME icon 저하만 판정한다.
- **GNOME sandbox와 설치 경로**: Stage 1의 `SNAP_NAME`은 disposable XDG 경로의 probe executable를 GNOME nested bwrap 밖에서 호출하기 위한 진단 전용이다. 제품 helper는 GNOME thumbnail sandbox가 노출하는 `/usr` 아래 `/usr/lib/alhangeul/alhangeul-thumbnailer`에 설치하고 registration은 `/usr/share/thumbnailers/alhangeul.thumbnailer`에 둔다. 제품 코드에는 probe marker나 sandbox 우회 환경 변수를 넣지 않는다.
- **package 계약**: 현재 Tauri 2 toolchain의 DEB/RPM `files` mapping으로 helper와 registration을 선언적으로 소유할 수 있다. fresh XDG session에서 별도 global cache 삭제나 MIME database 변경 없이 registration을 발견했으므로 lifecycle refresh hook은 추가하지 않는다. uninstall은 두 제품 파일만 제거하고 file-manager 소유 thumbnail/failure cache는 남긴다.
- **수용 matrix**: Linux x64는 helper·DEB·RPM과 GNOME Files/Nautilus·Thunar/Tumbler GUI, Linux arm64는 helper·DEB·직접 PNG/resource 수용으로 확정한다. arm64 RPM·GUI, KDE, AppImage registration, Flatpak/Snap은 이번 task에서 제외한다.
- **automation 분리 조건**: 기존 제품 GUI acceptance와 Stage 1 disposable manager probe를 exact artifact handoff·단일 outcome gate에 결속하면서 `.github/workflows/alhangeul-linux-gui.yml`이 500줄이 됐다. Stage 3에서 제품 registration 수용을 더하기 전에 manager probe 본문을 `scripts/`의 역할별 shell helper로 분리하고 workflow는 환경 준비·호출·artifact gate만 소유하게 한다.

### 검증

```bash
node --test tests/linux-thumbnail-core-probe.test.mjs
node --test tests/actions-workflows.test.mjs tests/linux-gui-workflow.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck scripts/benchmark-linux-thumbnail-core.sh
git diff --check
```

Linux exact-SHA candidate:

```bash
gh workflow run alhangeul-desktop.yml --ref publish/task17 -f build_ref=<exact-sha>
gh workflow run alhangeul-linux-gui.yml --ref publish/task17 -f build_ref=<exact-sha> -f native_run_id=<run-id>
```

### 커밋

```text
Task #17 [Stage 1.1]: Linux thumbnail 계약 probe candidate
Task #17 Stage 1: Freedesktop와 resource 계약 확정
```

## Stage 2 — bounded Linux CLI와 atomic PNG 구현

### 산출물

신규:

- `apps/linux-thumbnailer/Cargo.toml`
- `apps/linux-thumbnailer/Cargo.lock`
- `apps/linux-thumbnailer/src/main.rs`
- `apps/linux-thumbnailer/src/cli.rs`
- `apps/linux-thumbnailer/src/render.rs`
- `apps/linux-thumbnailer/src/output.rs`
- `apps/linux-thumbnailer/tests/thumbnailer_contract.rs`
- `scripts/build-linux-thumbnailer.mjs`
- `tests/linux-thumbnail-build.test.mjs`
- `mydocs/working/task_m010_17_stage2.md`

수정:

- `package.json`
- `.github/workflows/alhangeul-desktop.yml`
- `scripts/check-product-boundary.mjs`
- `tests/product-boundary.test.mjs`
- `crates/document-preview/**` — Linux에서 입증된 공용 primitive가 필요할 때만, 계획 보정 후 최소 변경

### 변경 내용

- `%i %o %s` 세 인자만 받는 native binary를 만들고 입력은 canonical local regular file, 출력은 호출자가 지정한 local path, 크기는 1..=1024로 제한한다. remote URI, stdin document, network와 Tauri/WebView를 허용하지 않는다.
- supervisor는 같은 ELF의 private worker mode를 시작하고 공유 상수의 1,500 ms hard deadline과 256 MiB `RLIMIT_AS`를 적용한다. timeout, signal, panic, child failure는 nonzero로 끝내고 parent가 child를 kill·wait해 orphan process와 final/temporary partial PNG를 남기지 않는다.
- `document-preview` direct 결과를 먼저 rasterize하고 실패할 때만 embedded preview를 사용한다. 두 결과 모두 RGBA PNG로 decode 재검증한 뒤 출력과 같은 디렉터리의 고유 sibling temp file을 atomic rename한다.
- 요청 edge를 두 축 최대값으로 적용해 종횡비와 alpha를 보존한다. premultiplied BGRA 변환은 roundtrip pixel test로 고정하고 기존 Windows 결과를 변경하지 않는다.
- 기존 final output을 실패 시 훼손하지 않는 정책, symlink·directory·동일 input/output·읽기 전용 경로·동시 요청 정책을 Rust test로 고정한다.
- tracked lockfile, `--locked`, target-specific Linux build 이름과 ELF architecture를 자동 검증한다.
- desktop workflow의 Linux x64·arm64 job에서 locked test·Clippy·release build와 ELF architecture를 실행하고 helper artifact를 exact SHA에 결속한다. Windows job과 기존 Tauri bundle·installer smoke 순서는 유지한다.
- Stage 2 진입 시점의 최신 `origin/devel`과 직접 겹치는 경로는 `package.json`, `tests/actions-workflows.test.mjs`다. 전자는 Task #17 script만 최소 추가하고 Task #45 Pages 변경을 복제하지 않으며, 후자는 Stage 2에서 수정하지 않고 신규 `tests/linux-thumbnail-build.test.mjs`가 workflow 계약을 소유한다. `apps/linux-thumbnailer/**`, build helper와 desktop workflow에는 최신 `devel` 직접 충돌이 없다.

### 검증

```bash
cargo fmt --manifest-path apps/linux-thumbnailer/Cargo.toml -- --check
cargo test --manifest-path apps/linux-thumbnailer/Cargo.toml --locked
cargo clippy --manifest-path apps/linux-thumbnailer/Cargo.toml --locked --all-targets -- -D warnings
node --test tests/linux-thumbnail-build.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

### 커밋

```text
Task #17 Stage 2: bounded Linux thumbnailer와 atomic PNG 구현
```

## Stage 3 — GNOME Files·Thunar/Tumbler 통합과 cache 수용

### 산출물

신규:

- `apps/desktop/src-tauri/linux/alhangeul.thumbnailer`
- `scripts/linux-thumbnail-manager-probe.sh`
- `scripts/linux-thumbnail-manager-session.sh`
- `tests/linux-thumbnail-registration.test.mjs`
- `tests/gui/linux/native-ui/thumbnail-files.test.mjs`
- `mydocs/working/task_m010_17_stage3.md`

수정:

- `.github/workflows/alhangeul-linux-gui.yml`
- `package.json`
- `tests/linux-gui-workflow.test.mjs`

### 변경 내용

- `.thumbnailer`는 `application/x-hwp;application/vnd.hancom.hwpx;`와 절대 `TryExec`/`Exec=/usr/lib/alhangeul/alhangeul-thumbnailer %i %o %s`만 선언한다. `%u`, shell wrapping, MIME default 변경은 넣지 않는다.
- package 전 disposable prefix와 XDG data/cache 경로로 registration과 helper를 배치해 GNOME Files와 Thunar/Tumbler 양쪽 discovery를 검증한다.
- 앱에서 한 번도 열지 않은 HWP/HWPX, direct 성공, preview fallback, 둘 다 실패를 실제 아이콘 grid에서 확인하고 128/256/512/1024 및 임의 edge의 PNG 구조·비율·alpha를 수집한다.
- 전체 cache를 삭제하지 않고 동일 원본 반복 요청의 cache hit, mtime·내용 변경 뒤 invalidation, 손상 문서 failure cache와 MIME icon fallback을 호출 횟수·metadata·screenshot으로 함께 판정한다.
- file manager 강제 종료, 전역 MIME database 변경, 다른 `.thumbnailer` 제거를 금지하고 disposable sentinel이 보존되는지 확인한다.
- desktop native run의 별도 `alhangeul-linux-x64-thumbnailer` artifact를 같은 run ID·source SHA로 검증하고, ELF summary와 SHA-256을 확인한 helper만 disposable runner의 제품 절대 경로에 배치한다. inline stub와 `SNAP_NAME` 우회는 제거하고 `execve` trace로 호출 횟수를 관찰한다.
- Stage 3 진입 시점의 최신 `origin/devel`과 직접 겹치는 예정 경로는 `package.json` 하나다. Task #45 Pages script를 복제하지 않고 `tests/linux-thumbnail-registration.test.mjs` inventory만 최소 추가한다. Linux GUI workflow, registration, 역할별 probe script와 신규 테스트에는 직접 충돌이 없다.

### 검증

```bash
node --test tests/linux-thumbnail-registration.test.mjs
node --test tests/linux-gui-probe.test.mjs tests/linux-gui-workflow.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck scripts/linux-thumbnail-manager-probe.sh scripts/linux-thumbnail-manager-session.sh
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

Linux x64 GUI exact-SHA job에서 GNOME Files·Thunar phase와 evidence upload가 모두 성공해야 한다.

### 커밋

```text
Task #17 Stage 3: GNOME Files와 Thunar thumbnail 통합
```

## Stage 4 — DEB·RPM 설치·업데이트·제거 통합

### 산출물

신규:

- `scripts/linux-thumbnail-package-smoke.sh`
- `tests/linux-thumbnail-packaging.test.mjs`
- `mydocs/working/task_m010_17_stage4.md`

수정:

- `apps/desktop/src-tauri/tauri.conf.json`
- `package.json`
- `.github/workflows/alhangeul-desktop.yml`
- `scripts/verify-desktop-artifacts.mjs`
- `tests/desktop-artifacts.test.mjs`
- `tests/actions-workflows.test.mjs`

### 변경 내용

- Tauri DEB/RPM custom files가 helper를 `/usr/lib/alhangeul/`, registration을 `/usr/share/thumbnailers/`에 설치하도록 build staging을 연결한다. AppImage에는 registration side effect를 추가하지 않는다.
- x64 DEB/RPM과 arm64 DEB에서 package inventory, ELF architecture, executable mode, absolute Exec target, MIME 목록과 단일 owner를 검사한다. arm64 RPM은 Stage 1에서 승인된 경우에만 추가한다.
- clean install, same-version reinstall, update, injected failure/rollback, uninstall을 disposable native host에서 수행한다. uninstall 뒤 제품 helper/registration은 없어야 하고 기존 MIME default·제3자 thumbnailer sentinel은 같아야 한다.
- cache PNG는 file manager 소유이므로 제거 대상으로 삼지 않는다. uninstall 후 보이는 과거 cache와 실행 가능한 registration 잔존을 구분해 판정한다.
- lifecycle script는 Stage 1이 필수로 확정한 refresh만 idempotent하게 추가하고, 전역 cache 삭제·file manager 종료·MIME default 변경을 금지하는 source test를 둔다.

### 검증

```bash
node --test tests/linux-thumbnail-packaging.test.mjs tests/desktop-artifacts.test.mjs
node --test tests/actions-workflows.test.mjs
pnpm run test:automation
pnpm run check:desktop-artifacts -- --platform linux-x64 --bundle-root <x64-bundle-root>
pnpm run check:desktop-artifacts -- --platform linux-arm64 --bundle-root <arm64-bundle-root>
pnpm run check:product-boundary
shellcheck scripts/linux-thumbnail-package-smoke.sh
git diff --check
```

### 커밋

```text
Task #17 Stage 4: DEB RPM thumbnailer package 통합
```

## Stage 5 — 플랫폼 중립 회귀·공식 문서 정렬

### 산출물

신규:

- `docs/architecture/LINUX_THUMBNAILS.md`
- `mydocs/working/task_m010_17_stage5.md`

수정:

- `README.md`
- `docs/README.md`
- `docs/DEVELOPMENT.md`
- `docs/architecture/UPSTREAM.md`
- `docs/operations/DESKTOP_RELEASE.md`

### 변경 내용

- CLI와 direct-first fallback, hard deadline/memory, PNG/atomic write, XDG cache·package 소유권, 검증한 file manager/package 조합과 제외 범위를 공식 architecture 문서에 고정한다.
- development 문서에는 locked build/test와 Linux host 조건, operations 문서에는 artifact inventory와 install/update/remove/GUI 수용 절차를 기록한다.
- README는 실제 Stage 3/4에서 통과한 Linux 조합만 지원 기능으로 표시하고 KDE, AppImage registration, Flatpak/Snap과 미검증 arm64 GUI/RPM을 명시적으로 제외한다.
- Windows thumbnail·product boundary·upstream·Studio 회귀를 함께 실행해 공유 core 변경이 없거나 호환됨을 증명한다.

### 검증

```bash
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo test --manifest-path crates/document-preview/Cargo.toml --locked
cargo clippy --manifest-path crates/document-preview/Cargo.toml --locked --all-targets -- -D warnings
cargo test --manifest-path apps/linux-thumbnailer/Cargo.toml --locked
cargo clippy --manifest-path apps/linux-thumbnailer/Cargo.toml --locked --all-targets -- -D warnings
git diff --check
```

### 커밋

```text
Task #17 Stage 5: Linux thumbnail 문서와 회귀 gate 정렬
```

## Stage 6 — Linux x64·arm64 exact-SHA native 수용

### 산출물

신규:

- `mydocs/working/task_m010_17_stage6.md`

수정:

- native workflow·smoke·문서 — exact run에서 결함이 확인된 경우 계획 보정 승인 후에만 수정

### 변경 내용

- Stage 5 source candidate를 `publish/task17`에 push하고 exact SHA를 Linux x64·arm64 artifact workflow와 Linux GUI workflow의 checkout·artifact handoff에 결속한다.
- x64 DEB/RPM과 arm64 DEB의 helper SHA-256, package digest·inventory, install/update/remove를 기록한다. arm64 RPM·GUI는 Stage 1에서 승인되고 실제 실행된 경우만 포함한다.
- x64 GNOME Files·Thunar에서 미열람 HWP/HWPX, direct/preview/icon fallback, cache hit/invalidation을 수용하고 screenshot은 공개 fixture만 사용한다.
- 정상·손상·암호화·대용량 fixture에서 원본 불변, timeout/RSS/output limit, no orphan/partial PNG와 no network/UI를 확인한다.
- run ID, job ID, artifact ID/digest, package/binary SHA-256와 검증 배포판·file manager 버전을 Stage 6 보고서에 기록한다. release·배포·PR은 이 Stage에 포함하지 않는다.

### 검증

```bash
git rev-parse HEAD
gh workflow run alhangeul-desktop.yml --ref publish/task17 -f build_ref=<exact-sha>
gh workflow run alhangeul-linux-gui.yml --ref publish/task17 -f build_ref=<exact-sha> -f native_run_id=<run-id>
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
git status --short
```

### 커밋

```text
Task #17 [Stage 6.1]: Linux thumbnail exact-SHA 수용 candidate
Task #17 Stage 6: Linux x64 arm64 native 수용
```

## 검증

- 각 Stage 명령과 native evidence가 모두 성공한 뒤 `task-stage-report` 절차로 단계 보고서와 소스를 함께 커밋한다.
- 실패한 검증, conditional skip, unavailable host는 성공으로 처리하지 않고 지원 matrix에서 제외한다.
- Stage 1의 resource·격리 결정이나 문서/산출물 경로가 달라지면 구현계획서를 먼저 보정하고 작업지시자 승인을 받는다.
- Stage 6 뒤 최종 보고·PR은 별도 `task-final-report` 승인 절차에서 진행한다.

## 단계 의존성

- Stage 2는 Stage 1 보고서의 timeout·memory·supervision·package matrix 보정 승인 뒤 시작한다.
- Stage 3은 Stage 2의 CLI/PNG/cleanup 검증과 단계 보고 승인 뒤 시작한다.
- Stage 4는 Stage 3의 실제 file-manager discovery/cache 수용 뒤 package 경로를 고정한다.
- Stage 5는 Stage 4의 package matrix가 통과한 조합만 문서화한다.
- Stage 6은 Stage 5의 neutral regression과 문서 정렬 승인 뒤 exact source candidate로 수행한다.

## 위험과 대응

- **Stage 1에서 격리 방식 미확정**: 실측 없는 hard deadline을 고정하지 않는다. Stage 1 종료 시 구현계획 보정과 별도 승인을 강제한다.
- **file manager cache 오판**: 전체 cache 삭제 대신 호출 횟수·metadata·UI를 함께 보고 cache hit와 stale result를 구분한다.
- **package 제거 오판**: cache 잔존은 정상일 수 있다. helper/registration과 제3자 sentinel을 별도 검사한다.
- **premultiplied BGRA 변환**: pixel roundtrip과 대표 시각 결과를 모두 gate로 둔다.
- **arm64 실행 환경 부족**: native helper·DEB까지만 증명하고 RPM/GUI를 지원 완료로 표시하지 않는다.
- **병렬 task 충돌**: Stage별 `devel` diff를 먼저 검토하고 충돌 시 구현 전 통합 순서를 재승인받는다.

## 승인 요청 사항

- Stage 1을 제품 구현이 아닌 exact-SHA Linux probe와 격리·package matrix 확정 단계로 수행하고, 결과로 본 구현계획을 보정한 뒤 Stage 2 승인을 다시 받는 절차
- Stage 2에서 독립 Rust CLI, direct-first fallback, 승인된 process supervision과 sibling temp→atomic rename을 구현하는 산출물 분할
- Stage 3에서 system package 전 disposable XDG 경로로 GNOME Files·Thunar/Tumbler discovery/cache를 먼저 수용하는 순서
- Stage 4의 1차 package matrix를 x64 DEB/RPM과 arm64 DEB로 한정하고 AppImage registration·미검증 arm64 RPM을 제외하는 범위
- Stage 5의 공식 문서 위치와 Stage 6 exact-SHA native evidence/지원 표기 기준
- Stage별 파일·검증 명령·커밋 메시지와 candidate 운반용 `publish/task17` 사용
