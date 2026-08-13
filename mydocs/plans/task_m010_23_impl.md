# Task #23 구현계획서 — rhwp Stable 감시와 전체 upstream 동기화 PR 자동화

수행계획서: [`task_m010_23.md`](task_m010_23.md)
GitHub Issue: [#23](https://github.com/postmelee/alhangeul-tauri/issues/23)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Stable release 판정과 관리 참조 계약 | release 판정·pin 치환 helper와 test | fixture·치환 무손실 test |
| 2 | draft sync PR workflow와 본문 생성 | workflow·PR body helper와 계약 test | `test:automation` |
| 3 | 공식 문서와 중립 통합 검증 | UPSTREAM·DEVELOPMENT 운영 절 | 전체 중립 gate·read-only dry-run |
| 4 | task PR과 post-merge handoff 확정 | activation checklist와 Stage 보고 | 최종 중립 gate·close 조건 검토 |
| 4.1 | PR 리뷰 안전성 보정 | activation gate·입력/경로·Rust preflight·문서 보정 | 집중 contract test·전체 중립 gate |
| 4.2 | PR 리뷰 운영 정책 보정 | Stable 선택·candidate lifecycle·단일 base·진단/성능 보정 | 정책 fixture·workflow inventory·전체 중립 gate |
| 4.3 | clean-base automation gate 분리 | workflow gate 순서·contract test·live 재검증 handoff | 집중 contract test·전체 중립 gate |

각 Stage 끝에는 `mydocs/working/task_m010_23_stage{N}.md`를 작성하고 소스와 함께
단계 커밋한다. Stage 4 승인 뒤 `task-final-report`로 최종 보고서와 task PR을 게시한다.
Task #23은 task PR merge만으로 닫지 않고 post-merge live candidate gate까지 유지한다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| upstream 운영 문서 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | 기존 진실 원천 보정 |
| 개발·credential 절차 | `docs/` | `docs/DEVELOPMENT.md` | OK | 기존 개발 문서 보정 |
| 단계 증적 | `mydocs/working/` | `mydocs/working/task_m010_23_stage{N}.md` | OK | task 실행 기록 |
| 최종 보고 | `mydocs/report/` | `mydocs/report/task_m010_23_report.md` | OK | 후속 Task #24 handoff |

새 공식 문서를 만들지 않는다. README의 current pin 한 줄은 자동 PR에서 실제 pin과
동기화할 관리 참조이므로 Stage 3 문서 보정 대상이 아니라 Stage 1 allowlist 계약에 둔다.

## 공통 구현 계약

- Node helper는 ESM·Node 24 기준이며 명령 실행과 파일 I/O 경계를 주입 가능하게 분리해
  unit test가 network와 repository write 없이 동작하게 한다.
- helper는 성공 시 구조화 JSON과 선택적 GitHub output을 쓰고 실패 시 secret·token·문서
  본문을 출력하지 않은 채 non-zero로 종료한다.
- workflow는 orchestration만 소유한다. release 판정, exact 치환, PR Markdown escaping을
  긴 inline shell로 다시 구현하지 않는다.
- `scripts/update-upstream.sh`의 product 갱신 계약은 수정하지 않는다. Stage 4.2에서
  실행 중복을 없애기 위해 workflow 호출 인자와 `tests/actions-workflows.test.mjs`의
  workflow inventory 계약은 수정한다.
- 신규 파일과 함수는 각각 300 LOC·50 LOC 권장 상한을 지킨다. test가 커지면 역할별
  fixture 모듈로 분리하며 기존 대형 test에 추가하지 않는다.

## Stage 1 — Stable release 판정과 관리 참조 계약

### 산출물

신규:

- `scripts/check-rhwp-upstream-release.mjs`
- `scripts/update-rhwp-managed-references.mjs`
- `tests/rhwp-upstream-release.test.mjs`
- `tests/rhwp-managed-references.test.mjs`
- `mydocs/working/task_m010_23_stage1.md`

수정:

- `package.json`

### release helper 계약

```text
node scripts/check-rhwp-upstream-release.mjs \
  [--target-tag vX.Y.Z] [--dry-run] \
  [--json-output <path>] [--github-output <path>]
```

- target 미지정 시 GitHub 공개 Stable release 목록의 exact semver 최댓값, 지정 시
  release-by-tag를 조회한다.
- `draft=false`, `prerelease=false`, exact `vX.Y.Z`를 검사하고 `git ls-remote`의 tag와
  선택적 `^{}` ref로 annotated/lightweight tag의 40자리 resolved commit을 결정한다.
- `rhwp-core.lock`, submodule gitlink, exact Studio entry의 current pin 정합성을 확인한다.
- target branch `automation/rhwp-vX.Y.Z-full-sync`와 열린 PR 상태를 조회해
  `current`, `upstream_behind_current`, `dry_run`, `existing_pr`, `candidate_blocker`,
  `branch_blocker`, `create_candidate` 중 하나를 낸다.
- 출력에는 current/target tag·commit·release URL·branch·decision·기존 PR URL만 포함한다.
  helper 자체는 branch, commit, PR과 repository tracked file을 바꾸지 않는다.

### 관리 참조 helper 계약

```text
node scripts/update-rhwp-managed-references.mjs \
  --from-tag <tag> --from-commit <sha> \
  --to-tag <tag> --to-commit <sha>
```

- 다음 current-pin field만 경로·marker·예상 횟수로 치환한다.
  - `README.md` current Stable pin
  - `docs/DEVELOPMENT.md` current pin과 재현 명령
  - `docs/architecture/UPSTREAM.md` current pin과 재현 명령
  - `tests/rhwp-pin.test.mjs` 실제 repository pin 기대값
  - `apps/studio-host/src/core/upstream-boundary.test.ts` 실제 tag·commit 기대값
- 모든 파일을 먼저 읽고 모든 marker와 기존 값이 맞아야 한 번에 쓴다. 하나라도 다르면
  tracked file을 전혀 쓰지 않고 실패한다.
- known issue 문구, `tests/rhwp-pin-fetch.test.mjs` 독립 fixture,
  `local-fonts.test.ts`의 역사적 test 이름, `DESKTOP_RELEASE.md` Task #13 기록은 보존한다.
- 같은 target으로 재실행하면 no-op이며 allowlist 밖 파일은 변경하지 않는다.

### 검증

```bash
node --test tests/rhwp-upstream-release.test.mjs tests/rhwp-managed-references.test.mjs
pnpm run test:automation
git diff --check
```

fixture는 latest/explicit Stable, draft, prerelease, malformed tag, annotated/lightweight tag,
pin mismatch, no-drift, 기존 PR·branch blocker와 marker mismatch·transactional failure·known issue
무손실·멱등성을 포함한다.

### 커밋

```text
Task #23 Stage 1: Stable release 판정과 관리 참조 계약 추가
```

## Stage 2 — draft sync PR workflow와 본문 생성

### 산출물

신규:

- `.github/workflows/rhwp-upstream-sync.yml`
- `scripts/write-rhwp-sync-pr-body.mjs`
- `tests/rhwp-sync-pr-body.test.mjs`
- `tests/rhwp-upstream-sync-workflow.test.mjs`
- `mydocs/working/task_m010_23_stage2.md`

수정:

- `package.json`

### workflow 계약

- trigger는 macOS workflow와 겹치지 않는 daily cron 1개와 `workflow_dispatch`이다.
  수동 input은 `target_tag`와 기본 `true`인 `dry_run`만 둔다. schedule은 실제 drift
  candidate 경로를 사용한다.
- concurrency는 repository 단일 sync group, `cancel-in-progress: false`로 writer를 직렬화한다.
- top-level permission은 read-only다. resolve job은 `ubuntu-24.04`, Node 24, 단일
  `BASE_BRANCH` checkout, shallow history·recursive submodule에서 Stage 1 helper만 실행한다.
- candidate job은 `decision == create_candidate`일 때만 실행한다. GitHub App 설정 이름을
  값 노출 없이 preflight하고 `actions/create-github-app-token`으로 contents·pull-requests
  write installation token을 발급한다. App token은 push와 `gh pr create`에만 전달한다.
- Rust, pnpm과 exact `wasm-pack 0.15.0`을 준비하고 다음을 순서대로 수행한다.
  1. Stage 1 관리 참조 helper의 전체 marker preflight와 local checkout 참조 갱신
  2. `scripts/update-upstream.sh --tag ... --commit ...`
  3. frozen pnpm 의존성 준비 뒤 전체 플랫폼 중립 gate 단일 실행
  4. changed-path allowlist 검증과 PR body 생성
  5. explicit allowlist stage·commit·non-force push
  6. `devel` 대상 draft PR 생성
- 이 순서는 update script 내부의 `test:upstream`·`test:studio`가 실제 pin 기대값을 읽는
  계약 때문에 필요하다. old pin 참조를 둔 채 update script부터 실행하면 source·lock 갱신 뒤
  내부 gate가 반드시 실패한다. 참조 갱신은 ephemeral clean checkout 안에서만 먼저 수행하며,
  이후 update script 또는 gate가 실패하면 App token 발급·commit·push·PR 생성에 도달하지 않는다.
- changed-path allowlist는 update script 산출물과 Stage 1 관리 참조 파일만 허용한다.
  `.github/workflows`, task 문서, known issue 기록은 candidate가 수정할 수 없다.
- existing PR·candidate blocker·current·upstream-behind·dry-run은 write job을 건너뛰고
  summary만 남긴다. branch-only 또는 사람이 수정한 branch는 자동
  삭제·reset·force push하지 않고 writer 활성 시에만 blocker로 실패한다.
- auto merge/approval, release/tag, issue close, package publish와 Pages deploy 명령을 두지 않는다.

### PR body 계약

- old/new tag·commit, Stable release URL, target branch, repository changed paths,
  실행한 자동 검증과 결과를 Markdown escaping해 기록한다.
- Windows/Linux native 수용은 미실행임을 명시하고 target release를 명시한 별도
  Hyper-Waterfall Issue로 연결하되 특정 Issue를 영구 하드코딩하거나 자동 close·merge
  가능 표현을 쓰지 않는다.

### 검증

```bash
node --test tests/rhwp-sync-pr-body.test.mjs tests/rhwp-upstream-sync-workflow.test.mjs
pnpm run test:automation
git diff --check
```

workflow test는 trigger, input default, job/permission 분리, pinned runtime, App preflight,
draft PR, allowlist, no force/merge/release와 실패 전 write 부재를 검사한다.

### 커밋

```text
Task #23 Stage 2: rhwp draft sync PR workflow 추가
```

## Stage 3 — 공식 문서와 플랫폼 중립 통합 검증

### 산출물

수정:

- `docs/architecture/UPSTREAM.md`
- `docs/DEVELOPMENT.md`

신규:

- `mydocs/working/task_m010_23_stage3.md`

### 변경 내용

- UPSTREAM에 Stable metadata+resolved tag 검증, candidate PR과 Task #24의 수용 경계,
  known issue 비자동 치환 원칙과 task merge 뒤 live activation gate를 기록한다.
- DEVELOPMENT에 local read-only dry-run, 수동 dispatch input, GitHub App 설치 및 variable·secret
  이름, 최소 repository permission과 장애 복구 절차를 기록한다. credential 값은 쓰지 않는다.
- 실제 repository variable·secret 설정이나 workflow dispatch는 이 Stage에서 하지 않는다.

### 검증

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
node scripts/check-rhwp-upstream-release.mjs \
  --target-tag v0.8.4 --dry-run --json-output <임시경로>
git diff --check
```

dry-run 전후 `git status --porcelain=v1` snapshot을 비교해 tracked repository no-write를
확인하고 target이 v0.8.4/`496333b27d21ddb9114ba9ae340bcb895870c9a7`, decision이
`dry_run`인지 확인한다. 네트워크 장애는 current로 오인하지 않고 Stage 실패로 기록한다.

### 커밋

```text
Task #23 Stage 3: upstream 자동 동기화 운영 문서와 중립 검증 확정
```

## Stage 4 — task PR과 post-merge activation handoff 확정

### 산출물

신규:

- `mydocs/working/task_m010_23_stage4.md`

### 변경 내용

- Tauri 저장소에 현재 없는 GitHub App installation, variable, secret을 외부 상태 승인
  대상으로 명시하고 이름·필요 permission만 최종 확인한다.
- task PR은 `Refs #23`으로 게시하고 auto-close 문구를 쓰지 않는다.
- merge 뒤 default branch에서 `target_tag=v0.8.4`, `dry_run=false` dispatch → draft PR 확인 →
  동일 입력 멱등 재실행 → Issue #24 handoff → Issue #23 close 순서와 실패 복구를 고정한다.
- 이 Stage는 credential 설정, live dispatch, candidate merge와 Issue close를 실행하지 않는다.

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
git diff --check
git status --short
```

마지막 status는 Stage 4 보고서 커밋 뒤 clean인지 다시 확인한다. 이후 최종 보고서 작성과
`publish/task23` PR 게시에는 `task-final-report`를 사용하되 Issue #23 지연 close 예외를
PR 본문과 최종 보고서에 명시한다.

### 커밋

```text
Task #23 Stage 4: post-merge activation handoff 확정
```

## Stage 4.1 — PR 리뷰 안전성 보정

PR #25의 maintainer 리뷰에서 확인된 merge 전 안전성 항목을 기존 Stage 4의 후속 하위
단계로 보정한다. 작업지시자가 2026-08-13 같은 스레드에서 다음 여섯 항목의 구현을 승인했다.

### 변경 내용

- 별도 repository variable `ALHANGEUL_UPSTREAM_SYNC_ENABLED`가 정확히 `true`일 때만
  candidate writer job에 진입한다. App credential을 준비한 뒤 이 값을 마지막으로 켜고,
  rollback 시 먼저 끈다.
- release URL을 GitHub expression에서 shell로 직접 보간하지 않고 environment를 통해
  전달하며 exact upstream release 경로와 query·fragment·userinfo·port 부재를 검증한다.
- remote branch 조회는 exit code 2만 branch 부재로 인정하고 인증·network 오류는 실패시킨다.
- changed-path 목록에 tracked diff와 untracked 파일을 함께 포함한다.
- candidate Ubuntu runner에서 새 Rust pin의 desktop test와 Clippy를 token 발급 전에 실행한다.
  이는 Issue #24의 Windows/Linux Tauri build·GUI·packaging 수용을 대체하지 않는다.
- 운영 문서와 candidate PR 본문에 activation 순서, 동일 tag candidate 중복 방지,
  release별 known issue 기록 보존과 Linux Rust preflight 경계를 명확히 한다.

### 검증

```bash
node --test \
  tests/rhwp-upstream-release.test.mjs \
  tests/rhwp-sync-pr-body.test.mjs \
  tests/rhwp-upstream-sync-workflow.test.mjs
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

### 커밋

```text
Task #23 [Stage 4.1]: PR 리뷰 안전성 보정
```

## Stage 4.2 — PR 리뷰 운영 정책 보정

PR #25의 추가 maintainer 리뷰와 Issue #26에서 확인한 장기 운영 공백을
자동화 최초 도입 task에 흡수한다. 작업지시자가 2026-08-13 같은 스레드에서
후속 Issue를 최소화하고 이 범위를 PR #25에 포함하는 방안을 승인했다.

### 변경 내용

- target 미지정 시 GitHub `releases/latest`가 아니라 공개 non-draft·non-prerelease
  exact semver release 목록의 최댓값을 선택한다. 목록의 최댓값이 current pin보다
  낮으면 자동 판정은 정상 no-op으로 기록하고, 사람이 명시한 낮은 target은 계속 거부한다.
- 동일 tag의 열린 candidate는 `existing_pr`, 다른 tag의 열린 candidate는
  `candidate_blocker`, PR 없는 target branch는 `branch_blocker`로 분류해 한 번에
  열린 자동 candidate를 하나로 제한한다.
- writer가 비활성이면 `branch_blocker`를 summary 경고로 남기고 read-only schedule을
  성공 종료한다. writer가 명시적으로 활성인 경우에만 fail-closed로 멈춘다.
- base branch는 workflow top-level `BASE_BRANCH`를 단일 원천으로 삼고 release helper,
  candidate 조회, checkout, PR 본문과 `gh pr create`에 검증된 값을 전달한다.
- release helper 출력을 shell `run` 본문에 GitHub expression으로 직접 보간하지
  않고 step/job environment를 통해 전달한다.
- `WASM_PACK_VERSION`, `scripts/update-upstream.sh`, `rhwp-core.lock`의 wasm-pack 버전을
  workflow contract test에서 즉시 대조한다.
- 미초기화 submodule이 superproject HEAD를 잘못 보고하지 않도록 worktree root를
  먼저 확인하고 정확한 복구 진단을 낸다.
- read-only resolve checkout은 current commit과 recursive submodule에 필요한 최소 history만
  받고, candidate에서 `update-upstream.sh --run-checks`와 명시 gate를 중복 실행하지
  않는다. 대신 fresh checkout의 `pnpm install --frozen-lockfile`을 명시 gate 앞에 둔다.
- 저장소의 모든 workflow 파일이 전용 또는 공통 contract test inventory에 있는지
  검사하고, release orchestration·service·policy를 분리해 각 파일 300 LOC 권장
  상한과 크기 guard를 유지한다.
- candidate PR 본문은 특정 Issue #24를 영구적 수용처로 하드코딩하지 않고,
  target release를 명시한 별도 Hyper-Waterfall Issue에서 native 수용을 진행하도록 안내한다.

### 범위 제외

- 저장소 전체 외부 Action의 immutable SHA 고정과 갱신 정책은 Issue #27에 남긴다.
- `devel` branch protection/ruleset과 필수 check 외부 설정은 Issue #28에 남긴다.
- GitHub App credential, activation variable, live dispatch와 candidate PR 생성은 실행하지 않는다.

### 검증

```bash
node --test \
  tests/rhwp-upstream-release.test.mjs \
  tests/rhwp-sync-pr-body.test.mjs \
  tests/rhwp-upstream-sync-workflow.test.mjs \
  tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

### 커밋

```text
Task #23 [Stage 4.2]: upstream sync 운영 정책 보정
```

## Stage 4.3 — clean-base automation gate 분리

### 산출물

수정:

- `.github/workflows/rhwp-upstream-sync.yml`
- `tests/rhwp-upstream-sync-workflow.test.mjs`
- `mydocs/plans/task_m010_23_impl.md`
- `mydocs/report/task_m010_23_report.md`

신규:

- `mydocs/working/task_m010_23_stage4.3.md`

### 변경 내용

- `pnpm install --frozen-lockfile`과 `pnpm run test:automation`을 managed current-pin reference와
  비용이 큰 Rust·Linux·wasm-pack 준비 전의 `Verify clean-base automation contract` step으로 옮긴다.
- post-update `Run platform-neutral gates`에는 target pin과 산출물을 검증하는 product boundary,
  version, release metadata, current pin, upstream·Studio·build, desktop Rust test·clippy를 유지한다.
- workflow contract test는 clean-base install·automation test → managed reference → source update →
  target gate → changed-path allowlist → App token → publish 순서를 고정한다.
- automation self-test와 frozen install이 각각 한 번만 실행되며 post-update target gate에 섞이지
  않는지 검사한다.
- current-pin integration invariant, update script, GitHub App 설정과 외부 writer 상태는 바꾸지
  않는다.

### 검증

```bash
node --test tests/rhwp-upstream-sync-workflow.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

Stage 커밋과 correction PR merge 뒤에만 writer를 다시 활성화한다. default branch actual write
run이 draft candidate를 정확히 하나 생성하면 candidate branch ref로 `ci.yml`을 수동 dispatch한다.
run head SHA가 candidate PR head와 같은지 확인하고 `Test automation contracts` step에서 새 pin의
committed gitlink·lock 정합성이 통과해야 한다. 이후 같은 upstream sync 입력을 재실행해 추가
branch·PR·commit이 생기지 않는 멱등성을 확인한다. CI의 후속 제품·native gate 실패는 Issue #24
수용 입력으로 넘기며, 자동 PR CI 도입은 Issue #28이 소유한다.

### 커밋

```text
Task #23 [Stage 4.3]: clean-base automation gate 분리
```

## 단계 의존성과 변경 통제

- Stage 2는 Stage 1 보고서 승인 뒤, Stage 3은 Stage 2 승인 뒤, Stage 4는 Stage 3 승인 뒤 진행한다.
  Stage 4.1과 Stage 4.2는 각 PR #25 리뷰 범위, Stage 4.3은 post-merge live gate 보정 범위에 대한
  작업지시자 승인 뒤 진행한다.
- 각 Stage 검증과 보고서 커밋 뒤 작업지시자 승인을 받기 전 다음 Stage 소스를 수정하지 않는다.
- action 설치 방식, credential 체계, allowlist 또는 공식 문서 위치가 바뀌면 먼저 이 구현계획서를
  보정하고 승인을 받는다.
- 실제 product pin을 v0.8.4로 이동하거나 native Windows/Linux 검증을 시작하면 범위 이탈로
  중지하고 Issue #24로 넘긴다.

## 위험과 대응

- **관리 참조 누락**: 실제 pin 회귀 test까지 allowlist에 포함하고 Stage 1 marker test가
  신규 current-pin 표식을 발견하면 실패하게 한다.
- **역사 기록 훼손**: fixture·known issue·Task #13 기록을 negative fixture로 고정한다.
- **credential 과권한**: read/write job을 분리하고 App token은 contents·pull-requests write만
  요청하며 repository-wide Actions write/approval 설정을 바꾸지 않는다.
- **자동화 branch 충돌**: branch/PR 상태를 write 전에 분류하고 non-force 새 branch만 만든다.
- **default branch에서만 가능한 실제 검증**: merge 전 helper dry-run·contract test로 제한하고
  live candidate와 멱등성은 Issue #23 post-merge close gate로 남긴다.

## 승인 요청 사항

- 위 4개 Stage의 산출물, helper/workflow interface, 자동 치환 allowlist와 보존 목록
- 각 Stage 검증 명령과 커밋 메시지
- Stage 4 뒤 task PR을 게시하되 Issue #23은 live candidate 확인까지 닫지 않는 절차
- 실제 credential 설정과 write dispatch를 task PR merge 뒤 별도 승인 gate로 두는 경계

승인되면 Stage 1 구현만 진행한다.
