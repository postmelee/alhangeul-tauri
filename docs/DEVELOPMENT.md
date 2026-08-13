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

현재 source submodule, native Cargo lock과 bundled WASM은 `rhwp v0.8.4`의 resolved commit `496333b27d21ddb9114ba9ae340bcb895870c9a7`로 고정되어 있다. [rhwp-core.lock](../rhwp-core.lock)이 이 경계의 기계 검증 가능한 진실 원천이며, 자세한 계약은 [UPSTREAM.md](architecture/UPSTREAM.md)를 따른다.

## 개발 상태

- HWPX 문서는 열 수 있지만 저장은 지원하지 않는다.
- autosave/recovery와 외부 파일 변경 감지는 아직 없다.
- 큰 문서에서는 WASM mirror를 거치는 구간이 남아 있다.
- 현재 제품 source version은 독립 Alhangeul의 M010 기준선인 `0.1.0`이며, 공식 release나 tag를 뜻하지 않는다.
- 공식 설치 파일, 서명, 패키지 게시와 자동 업데이트는 준비되지 않았다.
- GitHub Actions는 활성 상태지만 CI와 Windows/Linux native artifact workflow는 수동 `workflow_dispatch` 전용이다. Actions artifact는 build smoke 결과이며 공식 설치 파일이나 공개 release가 아니다.

## 검증 명령

모든 호스트에서 실행 가능한 기본 검증:

```sh
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
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
  --tag v0.8.4 \
  --commit 496333b27d21ddb9114ba9ae340bcb895870c9a7 \
  --run-checks
```

script는 다음 순서로 source submodule, native Cargo lock, 새로 빌드한 WASM artifact와 `rhwp-core.lock`을 맞춘 뒤 검증한다. branch, floating ref, 기존 `UPSTREAM_*`/`RUN_CHECKS` 환경 변수는 허용하지 않는다. script가 성공해도 변경된 submodule commit과 artifact diff는 커밋 전에 명시적으로 검토한다.

### Stable candidate 읽기 전용 확인

실제 source와 pin을 갱신하기 전에 release metadata, resolved tag commit, 현재 pin과 candidate branch·PR 상태만 확인할 수 있다. 명시 tag를 확인하는 local dry-run은 다음과 같다.

```sh
node scripts/check-rhwp-upstream-release.mjs \
  --target-tag <vX.Y.Z> \
  --dry-run \
  --json-output <temporary-json-path>
```

`--target-tag`를 생략하면 공개 non-draft·non-prerelease exact semver release 목록의 최댓값을 Stable로 판정한다. GitHub의 release 등록 순서나 `latest` 지정은 사용하지 않는다. `--dry-run`은 candidate branch 조회와 repository write를 수행하지 않으며 결과 JSON의 `decision`은 새 release가 있으면 `dry_run`, 자동 선택한 최댓값이 current보다 낮으면 `upstream_behind_current`이다. 실행 전후 `git status --porcelain=v1`을 비교해 tracked·untracked 상태가 같음을 확인한다. metadata 또는 tag 조회가 실패하면 current로 간주하지 말고 네트워크·release provenance 오류로 처리한다.

### GitHub Actions candidate 운영

`rhwp Upstream Sync Candidate` workflow는 daily schedule과 수동 `workflow_dispatch`를 제공한다. 수동 입력은 다음 두 개뿐이다.

- `target_tag`: 비워 두면 공개 exact semver Stable 목록의 최댓값, 값을 주면 exact `vX.Y.Z` Stable tag를 확인한다.
- `dry_run`: 기본값 `true`. 판정과 summary만 실행하며 build, push와 PR 생성을 하지 않는다.

`dry_run=false`는 clean `devel`에서 source·lock·WASM·관리 참조를 맞추고 전체 플랫폼 중립 gate, Ubuntu desktop Rust test·Clippy preflight와 changed-path allowlist를 통과한 경우에만 새 automation branch와 draft PR을 만든다. 수동 write dispatch는 task PR merge와 아래 external state 준비를 확인한 뒤 명시 승인으로만 실행한다. daily schedule은 read-only 판정을 계속하지만 `ALHANGEUL_UPSTREAM_SYNC_ENABLED`가 `true`가 아니면 candidate writer를 건너뛴다.

candidate writer에는 현재 repository에 설치된 GitHub App과 다음 Actions 설정이 필요하다.

| 종류 | 이름 | 내용 |
|---|---|---|
| Repository variable | `ALHANGEUL_UPSTREAM_SYNC_ENABLED` | credential 준비 뒤 마지막으로 `true`로 설정하는 writer 활성화 gate |
| Repository variable | `ALHANGEUL_AUTOMATION_CLIENT_ID` | 설치한 GitHub App의 Client ID |
| Repository secret | `ALHANGEUL_AUTOMATION_APP_PRIVATE_KEY` | GitHub App private key의 PEM 전체 |

기존 Alhangeul Automation GitHub App인 `alhangeul-rhwp-sync-bot` 재사용을 기본으로 한다. installation에 이 repository를 포함하고 Client ID와 private key를 준비한 뒤 activation variable을 마지막으로 `true`로 설정한다. rollback 또는 credential 교체 때는 activation variable을 먼저 `false`로 바꾼다. 이 App의 다른 repository용 권한과 관계없이 Tauri workflow가 발급하는 installation token은 Contents `Read and write`, Pull requests `Read and write`만 명시적으로 요청한다. Issues, Actions, Administration, Workflows, Releases 권한은 Tauri token에 요청하거나 사용하지 않는다. credential 값, private key와 발급 token을 문서·로그·PR에 기록하지 않는다. resolve job은 기본 read-only `GITHUB_TOKEN`을 사용하며 App token은 모든 후보 검증 뒤 push와 draft PR 생성 단계에서만 발급된다.

생성된 draft PR은 자동 검증이 통과했더라도 Windows/Linux native 수용 전이다. target release를 명시한 별도 Issue에서 Rust·Tauri build, GUI와 packaging을 검토하며 candidate PR 또는 수용 Issue를 자동 merge·close하지 않는다. 최초 `v0.8.4` 수용은 현재 [Issue #24](https://github.com/postmelee/alhangeul-tauri/issues/24)에서 진행한다.

### candidate 장애 복구

- `current`, `upstream_behind_current`, `dry_run`, `existing_pr`, `candidate_blocker` 판정은 write가 없는 정상 종료다. Actions summary의 current/target/base/decision, 열린 candidate 수와 기존 PR URL을 확인한다. `candidate_blocker`는 다른 tag의 자동 candidate를 먼저 검토·종료해야 함을 뜻한다.
- `branch_blocker`는 같은 automation branch가 있지만 열린 PR은 없는 상태다. writer 비활성 중에는 read-only schedule을 red로 만들지 않고 summary 경고를 남기며, writer 활성 중에는 fail-closed로 멈춘다. branch를 자동 삭제하거나 force push하지 말고 commit과 작성자를 확인한다. 검증된 automation commit이면 동일 branch로 검증된 base branch 대상 draft PR을 복구하고, 그 밖의 정리는 별도 승인을 받는다.
- source 갱신, gate 또는 allowlist가 실패하면 App token 발급 전에 멈추므로 remote branch와 PR은 생기지 않는다. 실패 로그와 changed path를 조사하고 새 실행으로 재현한다.
- push 뒤 PR 생성만 실패하면 다음 실행은 `branch_blocker`로 멈춘다. remote branch가 이번 run의 검증된 commit인지 확인한 뒤 draft PR 복구 또는 승인된 branch 정리를 선택한다. history rewrite와 force push는 사용하지 않는다.
- 동일 release tag의 열린 candidate가 있으면 새 PR을 만들지 않는다. 다른 tag의 candidate가 있어도 새 PR을 누적하지 않고 기존 candidate를 먼저 수용·종료한다.

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
