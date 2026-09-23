# Task #23 최종 보고서 — rhwp Stable 감시와 전체 upstream 동기화 PR 자동화

GitHub Issue: [#23](https://github.com/postmelee/alhangeul-tauri/issues/23)
마일스톤: M010

## 작업 요약

- 대상 이슈: #23
- 마일스톤: M010
- 단계 수: 4 + PR 리뷰·post-merge 보정 하위 단계 5개
- 작업 목적: `edwardkim/rhwp` 공개 Stable release를 검증하고 core·전체 Studio가 같은 release인 draft 동기화 candidate PR을 안전하게 생성하는 자동화를 추가한다.

공개 GitHub Release metadata와 dereferenced Git tag commit을 함께 검증하고, current pin·candidate branch·PR 상태를 write 이전에 분류한다. drift가 있을 때는 clean `devel` checkout에서 관리 참조, source submodule, Cargo lock, bundled WASM과 provenance를 같은 release로 맞춘 뒤 전체 플랫폼 중립 gate와 changed-path allowlist를 통과해야만 최소 권한 GitHub App token으로 non-force branch push와 draft PR 생성을 허용한다.

자동 candidate는 native 수용이나 release가 아니다. candidate Ubuntu runner에서는 새 pin의 desktop Rust test·Clippy preflight까지 실행하지만 Windows native와 Linux Tauri build·GUI·packaging 검증 및 실제 `v0.8.4` 수용은 Issue #24로 넘긴다. Task #23 task PR도 live candidate·멱등성 확인 전에는 Issue #23을 자동 close하지 않는다.

PR #25 리뷰 뒤에는 별도 `ALHANGEUL_UPSTREAM_SYNC_ENABLED` gate를 추가해 merge만으로 writer가 활성화되지 않도록 보정했다. release URL shell 경계, remote branch 조회와 untracked changed paths도 fail-closed로 강화하고 candidate 본문에 known issue 보존 경계를 명시했다.

추가 리뷰 Stage 4.2에서는 GitHub `latest` 지정 대신 공개 Stable semver 최댓값을
선택하고, 열린 candidate를 base branch별 하나로 제한했다. base branch를 단일
원천으로 전달하고 writer 비활성 시 branch blocker를 read-only 경고로 유지했다.
미초기화 submodule 진단, shell environment 경계, wasm-pack 버전 대조, 중복 gate와
workflow inventory·helper 크기 guard도 함께 보정해 Issue #26의 운영 정책 범위를 흡수했다.

Post-merge Stage 4.3에서는 최초 actual write run `31668495052`가 source·lock·WASM·provenance
갱신 뒤 clean repository 전용 automation integration test에서 중지된 원인을 확인했다.
frozen install과 `test:automation`을 managed reference 갱신 전 clean-base self-test로 옮기고,
post-update target pin·제품·Rust gate와 App token 지연 발급은 유지했다. 실패 run은 App token,
branch push와 PR 생성 전에 종료됐으며 writer는 보정 merge 전까지 비활성화했다.

PR #29 merge 뒤 두 번째 actual write run `31671732386`은 Stage 4.3 clean-base contract와
source·lock·WASM·provenance 갱신, post-update product·pin·upstream gate를 통과했다. 다만 Studio
boundary test에도 publish 전 Git index가 새 pin이라고 전제하는 중복 assertion이 남아 96/97에서
중지됐다. Stage 4.4는 committed current pin 검사를 automation clean-base에 유지하고, Studio
target-state test에서는 갱신된 lock·submodule HEAD·tag·clean worktree만 검사하도록 책임을
분리했다. workflow, updater, credential과 publish staging은 변경하지 않았다.

PR #30 merge 뒤 세 번째 actual write run `31677524857`은 Stage 4.4 보정과 모든 clean-base,
source·lock·WASM·provenance, post-update 제품·Studio·Linux Rust gate를 통과했다. 마지막
changed-path gate에서만 `git status --porcelain=v1` 첫 record의 의미 있는 선행 공백을 command
runner의 `trim()`이 제거해 `README.md`를 `EADME.md`로 오인했다. Stage 4.5는 성공 stdout의 후행
whitespace만 제거하도록 최소 보정하고, 실제 임시 Git repository의 first record를 사용하는
회귀 test로 production subprocess 경계를 고정했다. App token, commit, branch push와 PR 생성은
실패 run에서 실행되지 않았고 writer는 다시 `false`로 확인했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `.github/workflows/rhwp-upstream-sync.yml` | daily/manual Stable 판정과 격리된 candidate build·draft PR writer | GitHub Actions upstream 유지보수 |
| `scripts/check-rhwp-upstream-release.mjs` | Stable metadata·tag commit·current pin·candidate 상태 read-only 판정 | release provenance와 write 사전 분류 |
| `scripts/rhwp-upstream-release-policy.mjs` | Stable semver·base branch·pin·submodule 순수 정책 | release 선택과 진단 계약 |
| `scripts/rhwp-upstream-release-services.mjs` | GitHub release/PR pagination, tag·current pin·candidate read service | network·Git 경계 분리 |
| `scripts/update-rhwp-managed-references.mjs` | 허용된 current-pin marker만 transactional preflight 뒤 갱신 | 자동 candidate의 문서·test pin 정렬 |
| `scripts/verify-rhwp-sync-changes.mjs` | tracked·untracked exact allowlist와 diff check | workflow changed-path 경계 분리 |
| `scripts/write-rhwp-sync-pr-body.mjs` | provenance·changed paths·검증·native handoff PR 본문 생성 | bot draft PR 전달 계약 |
| `tests/rhwp-upstream-release.test.mjs` | Stable/tag/current/candidate 분기 fixture | release 판정 회귀 방지 |
| `tests/rhwp-upstream-release-policy.test.mjs` | semver 최댓값, base ref, submodule·candidate 정책 fixture | 순수 정책 회귀 방지 |
| `tests/rhwp-managed-references.test.mjs` | marker, 무손실, 실패 전 write 0회와 멱등성 | 기계 치환 범위 보호 |
| `tests/rhwp-sync-changes.test.mjs` | changed-path 정렬·거부·empty fixture와 실제 Git first-record 회귀 test | allowlist·porcelain column 회귀 방지 |
| `tests/rhwp-sync-pr-body.test.mjs` | 본문 provenance, 입력과 경로 안전성 | PR 본문 회귀 방지 |
| `tests/rhwp-upstream-sync-workflow.test.mjs` | trigger, read/write 분리, 순서, allowlist, 권한과 금지 동작 | workflow 정적 계약 |
| `package.json` | 신규 contract test를 `test:automation`에 편입 | 공통 자동 검증 |
| `docs/architecture/UPSTREAM.md` | Stable 감시, candidate/native 경계와 activation gate | 공식 upstream 아키텍처·운영 계약 |
| `docs/DEVELOPMENT.md` | dry-run, dispatch, GitHub App 설정과 장애 복구 | 유지관리자 운영 절차 |
| `apps/studio-host/src/core/upstream-boundary.test.ts` | post-update target-state와 양립하지 않는 상위 Git index assertion 제거 | Studio lock·submodule provenance test 책임 분리 |
| `mydocs/plans/task_m010_23*.md` | 승인된 범위, 위치 판단, 단계·검증·commit 계획 | 하이퍼-워터폴 수행 기준 |
| `mydocs/working/task_m010_23_stage*.md` | Stage 1–4 구현·검증·잔여 위험 | 단계별 실행 증적 |
| `mydocs/orders/20260812.md`, `mydocs/orders/20260813.md` | Task #23 진행과 완료 상태 | 일일 작업 보드 |

제품 Rust/Tauri code, `third_party/rhwp`, bundled WASM, Cargo lock과 현재 pin은 변경하지 않았다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `docs/architecture/UPSTREAM.md` | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | upstream pin과 candidate 수용 경계를 기존 진실 원천에 추가 |
| `docs/DEVELOPMENT.md` | `docs/` | `docs/DEVELOPMENT.md` | OK | 유지관리자용 dry-run·credential·복구 절차를 기존 개발 문서에 추가 |
| `mydocs/working/task_m010_23_stage*.md` | `mydocs/working/` | `mydocs/working/` | OK | branch·검증·외부 상태를 제품 문서와 분리 |
| `mydocs/report/task_m010_23_report.md` | `mydocs/report/` | `mydocs/report/task_m010_23_report.md` | OK | 후속 Issue #24와 작업지시자용 장기 보고 위치 |

새 제품 문서를 만들거나 `mydocs/manual`에 제품 운영 계약을 두지 않았다. credential 값과 token은 어느 문서에도 기록하지 않았다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---:|---:|
| upstream sync workflow | 없음 | 1개, 291 LOC |
| release·reference·PR body·change helper | 없음 | 6개, 합계 845 LOC |
| 전용 contract test | 없음 | 6개, 합계 1,013 LOC |
| 전체 `test:automation` | 71 tests | 120 tests |
| task branch 변경 | 0 files | 초기 PR 28 files + Stage 4.3 correction 7 files + Stage 4.4 correction 6 files + Stage 4.5 correction 7 files |
| 제품 rhwp pin | `v0.8.2` / `9b16aa9e...` | 변경 없음 |
| Tauri Actions writer 설정 계약 | 없음 | App installation·variable 2개·secret 1개 구성, writer는 보정 merge까지 비활성 |

신규 workflow, helper와 test는 모두 파일 권장 상한 300 LOC 이하로 유지했다.

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 공개 Stable release와 resolved tag commit 검증 | OK — draft·prerelease·malformed tag 거부, annotated/lightweight tag 해석 fixture 통과 |
| Stable 선택·candidate lifecycle·base branch | OK — semver 최댓값, automatic regression no-op, tag별 단일 candidate와 단일 base 계약 통과 |
| current pin·source·exact Studio 정합성 | OK — `v0.8.2` / `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, 6 artifacts 확인 |
| 관리 참조 allowlist·무손실·멱등성 | OK — marker 불일치 write 0회, known issue와 역사 기록 보존 |
| workflow read/write·권한·실행 순서 | OK — 검증 뒤 App token 발급, explicit staging과 non-force draft PR 계약 확인 |
| clean-base·post-update gate 분리 | OK — automation self-test는 mutation 전 1회, target acceptance는 mutation 뒤 실행하도록 계약 확인 |
| committed current pin·Studio target-state 책임 분리 | OK — automation은 lock·Git index gitlink·submodule HEAD invariant를 유지하고 Studio는 lock·submodule HEAD·tag·clean worktree를 검증 |
| porcelain first-record changed path 보존 | OK — 실제 임시 Git repository에서 보정 전 `EADME.md` 실패와 보정 후 exact `README.md` 결과를 red/green으로 확인 |
| merge 전 writer activation 격리 | OK — activation variable이 정확히 `true`인 create candidate만 writer 진입 |
| 새 pin Rust compile preflight | OK — Ubuntu candidate에서 desktop test·Clippy를 token 발급 전에 실행하도록 계약 고정 |
| 입력·경로 fail-closed | OK — exact release URL, remote exit code 2, tracked+untracked changed paths 계약 확인 |
| 금지된 외부 동작 부재 | OK — auto merge·approval, force push, release/tag, issue close, package publish와 Pages deploy 없음 |
| 제품 경계·version·release metadata | OK — 197 files, Alhangeul `0.1.0` 정합성 확인 |
| automation·upstream·Studio 회귀 | OK — 120 + 35 + 97 tests 통과 |
| exact upstream Studio production build | OK — 213 modules 변환 완료 |
| 실제 `v0.8.4` read-only dry-run | OK — target commit `496333b27d21ddb9114ba9ae340bcb895870c9a7`, `decision=dry_run` |
| dry-run repository 무손실 | OK — 전후 porcelain snapshot 동일 |
| task PR 준비 상태 | OK — `git diff --check` 통과, 최종 보고서 작성 전 worktree clean |

Vite의 기존 CanvasKit browser externalization, ineffective dynamic import와 500 kB chunk 경고는 유지됐으며 이 작업에서 새 build 오류가 되지 않았다.

### 단계별 검증 결과

- Stage 1: [`task_m010_23_stage1.md`](../working/task_m010_23_stage1.md) — Stable release 판정, current pin·candidate 상태와 관리 참조 계약을 17개 집중 test로 확정했다.
- Stage 2: [`task_m010_23_stage2.md`](../working/task_m010_23_stage2.md) — workflow·PR body와 write 전 gate를 추가하고 집중 test 14개, 전체 automation 102개를 통과했다.
- Stage 3: [`task_m010_23_stage3.md`](../working/task_m010_23_stage3.md) — 공식 문서와 전체 중립 gate, 실제 `v0.8.4` read-only/no-write dry-run을 확정했다.
- Stage 4: [`task_m010_23_stage4.md`](../working/task_m010_23_stage4.md) — 외부 상태 기준, post-merge activation·멱등성·Issue #24 handoff와 지연 close gate를 고정했다.
- Stage 4.1: [`task_m010_23_stage4.1.md`](../working/task_m010_23_stage4.1.md) — 명시 activation, URL·branch·changed-path fail-closed와 Ubuntu Rust preflight를 PR 리뷰에 따라 보정했다.
- Stage 4.2: [`task_m010_23_stage4.2.md`](../working/task_m010_23_stage4.2.md) — Stable semver 선택, 단일 candidate/base, 진단·shell·workflow 성능·구조 계약을 추가 리뷰에 따라 보정했다.
- Stage 4.3: [`task_m010_23_stage4.3.md`](../working/task_m010_23_stage4.3.md) — 최초 live write run의 clean-base integration test 순서 오진단을 분리하고 target gate와 token 지연 발급을 보존했다.
- Stage 4.4: [`task_m010_23_stage4.4.md`](../working/task_m010_23_stage4.4.md) — 두 번째 live run의 중복 Studio Git index 전제를 제거하고 clean-base committed pin invariant와 post-update target-state provenance 책임을 분리했다.
- Stage 4.5: [`task_m010_23_stage4.5.md`](../working/task_m010_23_stage4.5.md) — 세 번째 live run의 porcelain first-record 선행 공백 손실을 production runner와 실제 Git repository 회귀 test로 보정했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- PR #25는 `devel`에 merge됐고 default-branch dry-run `31668192739`는 `v0.8.4` drift를
  성공적으로 판정했다. 최초 actual write run `31668495052`는 clean-base integration test의
  실행 위치 문제로 App token 발급 전에 실패했다.
- `alhangeul-rhwp-sync-bot` installation, Client ID variable과 private key secret은 구성됐지만
  반복 실패 방지를 위해 writer activation은 현재 `false`다.
- Stage 4.3 correction PR #29 merge 뒤 actual run `31671732386`에서 clean-base 보정은
  확인됐지만 Studio의 중복 pre-commit Git index assertion으로 App token 전에 중지됐다.
- Stage 4.4 correction PR #30 merge 뒤 actual run `31677524857`은 모든 target gate를 통과했지만
  changed-path parser가 첫 record를 `EADME.md`로 오인해 App token 전에 중지됐다.
- Stage 4.5 correction PR merge 뒤 changed-path gate, App token 발급, actual candidate
  branch·draft PR과 같은 입력의 멱등성을 다시 검증해야 한다.
- `v0.8.4` source·lock·WASM 반영과 Windows/Linux Rust·Tauri·GUI·packaging 수용은 이 task 범위가 아니다.
- 저장소 전체 외부 Action immutable SHA 고정은 Issue #27, `devel` branch protection과
  required checks 외부 설정은 Issue #28의 별도 승인 task에 남는다.

### 후속 작업 후보

- [Issue #24](https://github.com/postmelee/alhangeul-tauri/issues/24): 자동 candidate의 `v0.8.4` core·전체 Studio 변경을 정규 task branch에서 검토하고 Windows/Linux native 수용을 완료한다.
- [Issue #26](https://github.com/postmelee/alhangeul-tauri/issues/26): Stable 선택·candidate lifecycle·base branch 범위를 PR #25 Stage 4.2에 흡수한 뒤 종료했다.
- Stage 4.5 correction PR merge 뒤 activation variable을 마지막으로 다시 켠다.
- `target_tag=v0.8.4`, `dry_run=false` dispatch 성공과 draft PR 1개를 확인하고, 동일 입력 재실행에서 추가 branch·PR·commit이 없음을 확인한다.
- candidate branch ref로 `ci.yml`을 수동 dispatch하고 run head SHA와 candidate PR head가 같은지,
  `Test automation contracts`가 committed gitlink·lock 기준으로 통과하는지 확인한다. 이후 제품·native
  gate 실패는 Issue #24로 넘기며 자동 PR CI는 Issue #28에서 도입한다.
- credential 비노출과 candidate provenance를 Issue #23에 기록하고 Issue #24에 연결한 뒤 작업지시자 승인으로 Issue #23을 닫는다.

## Issue #23 지연 close 예외

이 최종 보고서와 correction PR은 구현·로컬 수용 완료를 뜻하지만 Issue #23을 자동 close하지 않는다. PR 본문은 `Refs #23`만 사용한다. correction PR merge 뒤 [Stage 4 보고서](../working/task_m010_23_stage4.md), [Stage 4.3 보고서](../working/task_m010_23_stage4.3.md), [Stage 4.4 보고서](../working/task_m010_23_stage4.4.md)와 [Stage 4.5 보고서](../working/task_m010_23_stage4.5.md)의 live gate를 모두 통과하고 증적을 기록해야 Issue #23을 닫을 수 있다.

## 작업지시자 승인 요청

- Stage 4.5 산출물과 수용 기준 검증 결과를 2026-08-13 승인받았으며,
  `publish/task23` 원격 branch와 `devel` 대상 correction PR을 게시한다.
- correction PR merge 뒤 writer 재활성화와 live write dispatch를 수행한다.
