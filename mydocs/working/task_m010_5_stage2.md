# Task #5 Stage 2 완료보고서 — Windows/Linux Actions workflow 안전장치

GitHub Issue: [#5](https://github.com/postmelee/alhangeul-tauri/issues/5)
구현계획서: [`task_m010_5_impl.md`](../plans/task_m010_5_impl.md)
Stage: 2

## 단계 목적

Stage 1에서 확정한 desktop artifact 계약을 기존 수동 GitHub Actions workflow에 연결하고, repository Actions를 활성화하기 전에 trigger·권한·matrix·검증 순서를 반복 가능한 정적 test로 고정하는 단계다.

플랫폼 중립 CI와 native artifact workflow가 `rhwp v0.8.2` pin을 먼저 확인하고, native build가 성공하더라도 필수 installer 종류와 inventory 검증을 통과하기 전에는 artifact를 upload하지 못하도록 구성했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/ci.yml` | 114줄, +6. `check:rhwp-pin`과 `test:automation`을 upstream·Studio·desktop 검사 앞에 추가했다. |
| `.github/workflows/alhangeul-desktop.yml` | 170줄, +32. checkout commit 일치 확인, 조건부 pin·automation pretest, build 뒤 artifact inventory gate를 추가했다. |
| `tests/actions-workflows.test.mjs` | 233줄. manual-only trigger, 최소 권한, exact matrix, checkout 검증, pretest 순서, build→verify→upload 순서와 비배포 경계를 검사하는 6개 test를 추가했다. |
| `package.json` | `test:automation` script를 추가해 Stage 1 fixture와 workflow 정책 test를 한 명령으로 실행한다. |

전체 Stage 2 source diff는 4개 파일, 272 insertions다. dependency와 lockfile은 변경하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

코드·workflow·test 작업이므로 문서 본문 무손실 여부는 해당하지 않는다.

두 workflow의 기존 수동 `workflow_dispatch`, `permissions: contents: read`, runner, Rust target, artifact 이름, retention 14일과 기존 test/build 명령을 보존했다. native workflow의 `build_ref`·`run_tests` 입력도 유지했다.

추가된 checkout 검증은 expression 값을 shell source에 직접 삽입하지 않고 `EXPECTED_BUILD_REF` 환경변수로 전달한다. `git rev-parse`로 기대 commit과 실제 `HEAD`를 비교하므로 Stage 3에서 branch 이름과 40자리 build SHA를 함께 사용할 수 있다.

artifact 검증은 `run_tests` 값과 무관하게 Tauri build 직후 항상 실행하며, deterministic inventory를 기존 bundle root의 `alhangeul-artifact-inventory.json`에 기록한 뒤 기존 `bundle/**` upload에 포함한다.

`.github/workflows/pages.yml`과 repository Actions 설정은 변경하지 않았다. 현재 host에서 native Tauri build, desktop Rust test·clippy를 실행하지 않았다.

## 검증 결과

구현계획서의 Stage 2 필수 명령:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --exit-code devel -- .github/workflows/pages.yml
git diff --check
```

결과:

- OK — lockfile이 최신이며 dependency 변경 없이 설치 상태 확인
- OK — product boundary 179개 파일 검사 통과
- OK — `rhwp v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개 pin 검증 통과
- OK — automation test 21/21 통과
  - Stage 1 artifact fixture 15개
  - workflow 정적 계약 6개
- OK — upstream suite 31/31 통과
- OK — Studio test file 21개, test 114개 통과
- OK — Studio production build 완료, 181 modules transformed
- OK — Pages workflow diff 없음
- OK — `git diff --check`가 출력 없이 종료 코드 0으로 통과

추가 workflow 검증:

```bash
actionlint -no-color \
  .github/workflows/ci.yml \
  .github/workflows/alhangeul-desktop.yml
ruby -e 'require "yaml"; ARGV.each { |path| YAML.load_file(path) }' \
  .github/workflows/ci.yml \
  .github/workflows/alhangeul-desktop.yml
gh api repos/postmelee/alhangeul-tauri/actions/permissions
```

- OK — `actionlint 1.7.12`가 두 workflow를 오류 없이 승인
- OK — 두 YAML 문서 구문 parse 통과
- OK — repository Actions는 계속 `{"enabled":false,"sha_pinning_required":false}`

Studio build는 기존과 같은 unresolved runtime SVG와 large chunk 경고를 출력했지만 종료 코드 0으로 산출물을 생성했다. 이번 workflow 변경과 관련된 신규 build 실패는 없다.

## 잔여 위험

- workflow 파일은 정적·platform-neutral 검증만 통과한 상태다. hosted runner의 image, action version, shell, dependency 설치와 native Tauri build는 아직 실행하지 않았다.
- `actions/checkout`이 branch/tag/SHA 입력을 처리한 뒤 `EXPECTED_BUILD_REF`가 같은 commit으로 resolve되는지는 Stage 3 exact-ref run에서 최종 확인해야 한다.
- 실제 Tauri 출력이 Windows x64에서 `nsis/` 아래 EXE, Linux에서 계획한 세 package 종류를 생성하는지는 native matrix 실행 전까지 증명되지 않는다.
- Actions 활성화 뒤에는 대상 두 workflow뿐 아니라 기존 수동 Pages workflow도 실행 가능한 상태가 된다. Stage 3에서는 allowlist에 든 두 workflow만 dispatch하고 Pages 기준 run을 비교해야 한다.
- workflow action은 repository의 기존 tag pin 정책을 유지했다. repository 설정의 `sha_pinning_required`는 현재 `false`이며 action SHA 고정 전환은 이번 Issue 범위 밖이다.

## 다음 단계 영향

- Stage 3 시작 승인은 repository Actions 활성화, remote `publish/task5` 최초 push와 hosted runner 사용을 포함한다.
- 첫 canary SHA는 이 Stage 2 커밋이어야 하며 remote ref, CI run, native run과 실제 checkout `HEAD`가 모두 같아야 한다.
- CI는 `ci.yml --ref publish/task5`, native build는 같은 ref와 `build_ref=<Stage 2 SHA>`, `run_tests=true`로 dispatch한다.
- runner 실패가 workflow·tool 설정 범위이면 failed log를 근거로 `[Stage 3.N]` 보정 commit을 만들 수 있다. 제품 기능, runner 교체나 matrix 축소가 필요하면 계획 변경 승인을 먼저 받는다.
- canary가 수용 기준에 도달하지 못한 채 task를 중단하면 repository Actions를 초기 `enabled: false`로 복구한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3의 repository Actions 활성화, `publish/task5` canary push와 Windows/Linux hosted workflow 실행으로 진행한다.
