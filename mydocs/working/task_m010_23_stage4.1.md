# Task #23 Stage 4.1 완료 보고서 — PR 리뷰 안전성 보정

GitHub Issue: [#23](https://github.com/postmelee/alhangeul-tauri/issues/23)
구현계획서: [`task_m010_23_impl.md`](../plans/task_m010_23_impl.md)
Stage: 4.1

## 단계 목적

PR #25 maintainer 리뷰에서 확인된 merge 직후 daily 실패, shell 입력 경계, native compile
공백과 fail-open 진단을 merge 전에 보정한다. 기존 read-only resolve와 write token 지연 발급,
non-force draft candidate 경계는 유지한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/rhwp-upstream-sync.yml` | 명시 activation variable, Linux Rust preflight, untracked path와 remote branch fail-closed, release URL environment 전달 |
| `scripts/check-rhwp-upstream-release.mjs` | release URL을 exact upstream tag 경로와 안전한 URL 구성으로 제한 |
| `scripts/write-rhwp-sync-pr-body.mjs` | Rust preflight, Linux Tauri 후속 수용과 known issue 보존을 candidate 본문에 기록 |
| `tests/rhwp-upstream-release.test.mjs` | path·query·fragment·userinfo·port URL 거부 fixture 추가 |
| `tests/rhwp-sync-pr-body.test.mjs` | candidate 검증·known issue·native handoff 본문 계약 보강 |
| `tests/rhwp-upstream-sync-workflow.test.mjs` | activation·Rust·untracked·branch exit code·environment 전달 정적 계약 보강 |
| `docs/architecture/UPSTREAM.md` | writer 활성화와 Ubuntu preflight/native 수용 경계를 공식 upstream 문서에 반영 |
| `docs/DEVELOPMENT.md` | credential → activation 순서, rollback과 동일 tag candidate 계약을 운영 절차에 반영 |
| `mydocs/plans/task_m010_23_impl.md` | 승인된 Stage 4.1 범위·검증·커밋 계획 추가 |
| `mydocs/report/task_m010_23_report.md` | 최종 결과와 post-merge handoff를 리뷰 보정 상태로 갱신 |
| `mydocs/orders/20260813.md` | PR 리뷰 보정 완료와 push 대기 상태 기록 |

## 본문 변경 정도 / 본문 무손실 여부

workflow의 read-only resolve, GitHub App 최소 권한, token 발급 순서, explicit stage와 non-force
draft PR 계약은 유지했다. candidate writer는 activation variable이 정확히 `true`인 경우에만
진입하며 credential 누락은 활성화 뒤의 구성 오류로 계속 명시적으로 실패한다.

공식 문서는 기존 운영 절차를 재작성하지 않고 activation 순서와 Rust preflight/native 수용
경계만 보정했다. `v0.8.2` known issue 본문과 현재 제품 pin, source submodule, Cargo lock,
bundled WASM은 변경하지 않았다.

## 검증 결과

실행 명령:

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

결과:

- OK — 집중 contract test 28/28 통과
- OK — automation 104/104, upstream 35/35, Studio 21 files·97/97 통과
- OK — product boundary 192 files, version `0.1.0`, release metadata와 rhwp pin `v0.8.2` 검증 통과
- OK — Studio production build 213 modules 변환 완료
- OK — workflow 292 LOC, release helper 300 LOC, PR body helper 161 LOC로 권장 상한 유지
- OK — `git diff --check` 경고 없음
- INFO — CanvasKit externalization, ineffective dynamic import와 500 kB chunk 경고는 기존과 동일

## 잔여 위험

- 실제 Ubuntu desktop Rust test·Clippy는 candidate writer가 활성화된 뒤 새 pin으로 실행된다.
  현재 macOS 호스트에서는 지원 범위 밖 Rust desktop 검증을 실행하지 않았다.
- activation variable과 GitHub App credential은 repository 외부 상태이며 아직 설정하지 않았다.
- Windows native와 Linux Tauri build·GUI·packaging 수용은 Issue #24에 남는다.
- latest semver·candidate lifecycle·base branch 단일화, Actions supply-chain, branch protection은
  task-register 초안 확인 뒤 후속 이슈로 분리한다.

## 다음 단계 영향

- 이 커밋을 `publish/task23`에 push하면 PR #25가 여섯 리뷰 항목을 반영한다.
- task PR merge 뒤에는 credential을 준비하고 activation variable을 마지막으로 켠 뒤
  Stage 4의 live candidate·멱등성 gate를 진행한다.
- 후속 이슈는 별도 task이므로 이번 branch에서 구현을 시작하지 않는다.

## 승인 요청

- Stage 4.1 산출물과 검증 결과를 승인하면 PR #25 보정 push로 진행한다.
