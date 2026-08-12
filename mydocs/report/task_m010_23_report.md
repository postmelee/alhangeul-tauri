# Task #23 최종 보고서 — rhwp Stable 감시와 전체 upstream 동기화 PR 자동화

GitHub Issue: [#23](https://github.com/postmelee/alhangeul-tauri/issues/23)
마일스톤: M010

## 작업 요약

- 대상 이슈: #23
- 마일스톤: M010
- 단계 수: 4
- 작업 목적: `edwardkim/rhwp` 공개 Stable release를 검증하고 core·전체 Studio가 같은 release인 draft 동기화 candidate PR을 안전하게 생성하는 자동화를 추가한다.

공개 GitHub Release metadata와 dereferenced Git tag commit을 함께 검증하고, current pin·candidate branch·PR 상태를 write 이전에 분류한다. drift가 있을 때는 clean `devel` checkout에서 관리 참조, source submodule, Cargo lock, bundled WASM과 provenance를 같은 release로 맞춘 뒤 전체 플랫폼 중립 gate와 changed-path allowlist를 통과해야만 최소 권한 GitHub App token으로 non-force branch push와 draft PR 생성을 허용한다.

자동 candidate는 native 수용이나 release가 아니다. Windows/Linux 검증과 실제 `v0.8.4` 반영은 Issue #24로 넘기며 Task #23 task PR도 live candidate·멱등성 확인 전에는 Issue #23을 자동 close하지 않는다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `.github/workflows/rhwp-upstream-sync.yml` | daily/manual Stable 판정과 격리된 candidate build·draft PR writer | GitHub Actions upstream 유지보수 |
| `scripts/check-rhwp-upstream-release.mjs` | Stable metadata·tag commit·current pin·candidate 상태 read-only 판정 | release provenance와 write 사전 분류 |
| `scripts/update-rhwp-managed-references.mjs` | 허용된 current-pin marker만 transactional preflight 뒤 갱신 | 자동 candidate의 문서·test pin 정렬 |
| `scripts/write-rhwp-sync-pr-body.mjs` | provenance·changed paths·검증·native handoff PR 본문 생성 | bot draft PR 전달 계약 |
| `tests/rhwp-upstream-release.test.mjs` | Stable/tag/current/candidate 분기 fixture | release 판정 회귀 방지 |
| `tests/rhwp-managed-references.test.mjs` | marker, 무손실, 실패 전 write 0회와 멱등성 | 기계 치환 범위 보호 |
| `tests/rhwp-sync-pr-body.test.mjs` | 본문 provenance, 입력과 경로 안전성 | PR 본문 회귀 방지 |
| `tests/rhwp-upstream-sync-workflow.test.mjs` | trigger, read/write 분리, 순서, allowlist, 권한과 금지 동작 | workflow 정적 계약 |
| `package.json` | 신규 contract test를 `test:automation`에 편입 | 공통 자동 검증 |
| `docs/architecture/UPSTREAM.md` | Stable 감시, candidate/native 경계와 activation gate | 공식 upstream 아키텍처·운영 계약 |
| `docs/DEVELOPMENT.md` | dry-run, dispatch, GitHub App 설정과 장애 복구 | 유지관리자 운영 절차 |
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
| upstream sync workflow | 없음 | 1개, 277 LOC |
| release·reference·PR body helper | 없음 | 3개, 합계 625 LOC |
| 전용 contract test | 없음 | 4개, 합계 775 LOC |
| 전체 `test:automation` | 71 tests | 102 tests |
| task branch 변경 | 0 files | 최종 보고서 전 기준 19 files, +2,650/-1 lines |
| 제품 rhwp pin | `v0.8.2` / `9b16aa9e...` | 변경 없음 |
| Tauri Actions variable·secret | 각 0개 | 변경 없음, post-merge 승인 gate |

신규 workflow, helper와 test는 모두 파일 권장 상한 300 LOC 이하로 유지했다.

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 공개 Stable release와 resolved tag commit 검증 | OK — draft·prerelease·malformed tag 거부, annotated/lightweight tag 해석 fixture 통과 |
| current pin·source·exact Studio 정합성 | OK — `v0.8.2` / `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, 6 artifacts 확인 |
| 관리 참조 allowlist·무손실·멱등성 | OK — marker 불일치 write 0회, known issue와 역사 기록 보존 |
| workflow read/write·권한·실행 순서 | OK — 검증 뒤 App token 발급, explicit staging과 non-force draft PR 계약 확인 |
| 금지된 외부 동작 부재 | OK — auto merge·approval, force push, release/tag, issue close, package publish와 Pages deploy 없음 |
| 제품 경계·version·release metadata | OK — 192 files, Alhangeul `0.1.0` 정합성 확인 |
| automation·upstream·Studio 회귀 | OK — 102 + 35 + 97 tests 통과 |
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

## 잔여 위험과 후속 작업

### 잔여 위험

- workflow는 아직 default branch `devel`에 없어 schedule과 live write 경로를 실행하지 않았다.
- `alhangeul-rhwp-sync-bot`의 Tauri repository installation은 현재 사용자 token으로 확인할 수 없고, Actions variable·secret은 각각 0개다.
- App token 발급, actual candidate build·push·draft PR과 같은 입력의 멱등성은 task PR merge 뒤 별도 승인 gate에 남는다.
- `v0.8.4` source·lock·WASM 반영과 Windows/Linux Rust·Tauri·GUI·packaging 수용은 이 task 범위가 아니다.

### 후속 작업 후보

- [Issue #24](https://github.com/postmelee/alhangeul-tauri/issues/24): 자동 candidate의 `v0.8.4` core·전체 Studio 변경을 정규 task branch에서 검토하고 Windows/Linux native 수용을 완료한다.
- Task #23 task PR merge 뒤 기존 App installation과 두 Actions 설정을 별도 승인으로 준비한다.
- `target_tag=v0.8.4`, `dry_run=false` dispatch 성공과 draft PR 1개를 확인하고, 동일 입력 재실행에서 추가 branch·PR·commit이 없음을 확인한다.
- credential 비노출과 candidate provenance를 Issue #23에 기록하고 Issue #24에 연결한 뒤 작업지시자 승인으로 Issue #23을 닫는다.

## Issue #23 지연 close 예외

이 최종 보고서와 task PR은 구현·로컬 수용 완료를 뜻하지만 Issue #23을 자동 close하지 않는다. PR 본문은 `Refs #23`만 사용한다. task PR merge 뒤 [Stage 4 보고서](../working/task_m010_23_stage4.md)의 activation 9단계를 모두 통과하고 증적을 기록해야 Issue #23을 닫을 수 있다.

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과 승인에 따라 `publish/task23` 원격 branch와 `devel` 대상 Open PR을 게시한다.
- PR merge 뒤 credential 설정과 live write dispatch는 별도 승인을 받아 수행한다.
