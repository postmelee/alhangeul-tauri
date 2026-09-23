# Task #23 Stage 4.2 완료 보고서 — upstream sync 운영 정책 보정

GitHub Issue: [#23](https://github.com/postmelee/alhangeul-tauri/issues/23)
구현계획서: [`task_m010_23_impl.md`](../plans/task_m010_23_impl.md)
Stage: 4.2

## 단계 목적

PR #25 추가 maintainer 리뷰에서 확인한 특정 Issue 하드코딩, GitHub
`latest` 역행, branch-only daily red, base branch 중복, shell 보간, 미초기화
submodule 오진단과 workflow 중복·크기 문제를 보정한다. Issue #26의 Stable
선택·candidate lifecycle·base branch 정책을 최초 자동화 PR에 흡수해 후속
Issue를 최소화하되, 저장소 전체 Action SHA와 branch protection은 각 #27·#28의
별도 소유 경계로 유지한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/rhwp-upstream-sync.yml` | 최대 Stable, 단일 base, activation-aware blocker, env 전달, shallow resolve와 단일 gate |
| `scripts/check-rhwp-upstream-release.mjs` | release orchestration과 `upstream_behind_current`·`candidate_blocker` 판정 |
| `scripts/rhwp-upstream-release-policy.mjs` | semver·pin·base ref·submodule 순수 정책 분리 |
| `scripts/rhwp-upstream-release-services.mjs` | paginated release/PR, tag·pin·candidate I/O 경계 분리 |
| `scripts/verify-rhwp-sync-changes.mjs` | tracked·untracked exact allowlist와 `git diff --check` 분리 |
| `scripts/write-rhwp-sync-pr-body.mjs` | 단일 base 표시와 특정 Issue #24 하드코딩 제거 |
| `tests/rhwp-upstream-release*.test.mjs` | 최대 semver, regression no-op, candidate 수·base·submodule 진단 fixture |
| `tests/rhwp-sync-changes.test.mjs` | allowlist 정렬·거부·empty 계약 |
| `tests/rhwp-sync-pr-body.test.mjs` | generic native 수용 Issue와 base branch 본문 계약 |
| `tests/rhwp-upstream-sync-workflow.test.mjs` | activation·env·wasm-pack·gate·file-size 정적 계약 |
| `tests/actions-workflows.test.mjs` | `.github/workflows` 전체 inventory 계약 |
| `package.json` | 신규 policy·changed-path contract test를 automation suite에 포함 |
| `docs/architecture/UPSTREAM.md`, `docs/DEVELOPMENT.md` | Stable 선택, 단일 candidate/base와 복구 절차 |
| `mydocs/plans/task_m010_23_impl.md` | 승인된 Stage 4.2 범위·검증·커밋 계획 |
| `mydocs/report/task_m010_23_report.md` | 최종 산출·정량·검증·후속 경계 갱신 |
| `mydocs/orders/20260813.md` | Stage 4.2 완료와 PR #25 push 대기 증적 |

## 본문 변경 정도 / 본문 무손실 여부

기존 read-only resolve, activation으로 격리된 writer, GitHub App token 지연 발급,
explicit staging, non-force draft PR과 auto merge·release·issue close 금지 계약은 유지했다.
changed-path allowlist는 inline shell에서 Node helper로 옮겼지만 status, tracked diff,
untracked 목록 검사와 staged diff 대조의 3중 방어는 그대로다.

자동 candidate 본문은 특정 `v0.8.4` Issue에 영구적으로 묶이지 않고 target
release 전용 Hyper-Waterfall Issue를 요구한다. 공식 문서에는 현재 최초 수용
작업이 Issue #24임을 상태 설명으로만 남겼다. 제품 `v0.8.2` pin,
source submodule, Cargo lock, bundled WASM과 known issue 본문은 변경하지 않았다.

## 검증 결과

실행 명령:

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

추가 read-only 실제 확인:

```bash
node scripts/check-rhwp-upstream-release.mjs \
  --dry-run --base-branch devel --json-output <temporary-json>
node scripts/check-rhwp-upstream-release.mjs \
  --base-branch devel --json-output <temporary-json>
```

결과:

- OK — 집중 contract test 45/45, automation 119/119 통과
- OK — upstream 35/35, Studio 21 files·97/97 통과
- OK — product boundary 197 files, version `0.1.0`, release metadata와
  rhwp pin `v0.8.2` / `9b16aa9e23f476e2b335d7c029fc9f24a199d63c` 통과
- OK — Studio production build 213 modules 변환 완료
- OK — 실제 GitHub release 목록에서 `v0.8.4` /
  `496333b27d21ddb9114ba9ae340bcb895870c9a7`을 최대 Stable로 선택하고
  `dry_run`, read-only candidate 조회 `create_candidate`, candidate 0개를 확인
- OK — workflow 288 LOC, 새 release helper 172/134/131 LOC, changed-path helper 86 LOC,
  PR body helper 155 LOC로 300 LOC 권장 상한 유지
- OK — `git diff --check` 경고 없음
- INFO — CanvasKit browser externalization, ineffective dynamic import와 500 kB chunk 경고는 기존과 동일

## 잔여 위험

- workflow는 PR #25 merge 전이므로 default branch daily schedule에서 실제 실행되지 않았다.
- GitHub App credential과 `ALHANGEUL_UPSTREAM_SYNC_ENABLED`는 아직 외부 상태에 설정하지
  않았으며 live candidate build·push·PR 생성은 merge 후 별도 승인 gate에 남는다.
- 외부 Action immutable SHA·provenance는 Issue #27, `devel` branch protection·required
  checks 설정은 Issue #28의 별도 범위다.
- Windows/Linux native 수용은 이 automation 보정에 필요하지 않으며, 실제 `v0.8.4`
  candidate는 Issue #24의 플랫폼 gate를 통과해야 한다.

## 다음 단계 영향

- 이 단계 커밋을 `publish/task23`에 push하면 PR #25가 추가 리뷰 항목과
  Issue #26 범위를 함께 반영한다.
- PR #25 merge 후 Issue #26을 이 단계 증적과 함께 종료하고 `pr-merge-cleanup`을
  수행한 뒤 Issue #24를 시작한다.
- Issue #27과 #28은 #24 수용·merge 후 서로 겹치지 않도록 순차 진행한다.

## 승인 요청

- Stage 4.2 산출물과 검증 결과를 승인하면 PR #25 보정 push와 merge 검토로 진행한다.
