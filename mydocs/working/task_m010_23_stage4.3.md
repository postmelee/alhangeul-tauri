# Task #23 Stage 4.3 완료 보고서 — clean-base automation gate 분리

GitHub Issue: [#23](https://github.com/postmelee/alhangeul-tauri/issues/23)
구현계획서: [`task_m010_23_impl.md`](../plans/task_m010_23_impl.md)
Stage: 4.3

## 단계 목적

PR #25 merge 뒤 최초 actual write run `31668495052`에서 드러난 gate 순서 오진단을
보정한다. clean repository의 current lock과 Git index gitlink 정합성을 검사하는
`test:automation`을 candidate pin 변경 뒤 실행하지 않고, 비용이 큰 Rust/Linux 준비와 managed
reference 갱신 전 clean-base self-test로 실행한다. post-update gate는 target pin·산출물 수용
검사를 유지하고 App token 발급은 모든 검증 뒤에만 허용한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/rhwp-upstream-sync.yml` | clean-base automation contract step을 Rust·Linux·wasm-pack 준비와 managed reference 갱신 앞으로 분리하고 post-update 중복 실행 제거 |
| `tests/rhwp-upstream-sync-workflow.test.mjs` | clean-base → mutation → target gate → App token 순서와 install·automation 단일 실행 계약 추가 |
| `mydocs/plans/task_m010_23_impl.md` | 승인된 Stage 4.3 산출물·검증·live handoff 계획 기록 |
| `mydocs/report/task_m010_23_report.md` | 최초 live run 결과, Stage 4.3 보정과 남은 재실행 gate 반영 |
| `mydocs/orders/20260813.md` | Stage 4.3 완료와 다음 승인 대기 상태 반영 |

## 본문 변경 정도 / 본문 무손실 여부

제품 code, current rhwp pin, source submodule, Cargo lock, bundled WASM, update helper와
current-pin integration invariant는 변경하지 않았다. workflow의 검증 명령을 삭제하거나
완화하지 않고 clean-base에만 유효한 automation self-test의 실행 시점만 옮겼다.
post-update product·pin·upstream·Studio·Rust gate, changed-path allowlist, App token 지연 발급,
explicit staging과 non-force draft PR 계약은 그대로 유지했다.

공식 제품·운영 문서의 사용자 계약은 바뀌지 않아 수정하지 않았다. live run 식별자와 실패
원인은 task 단계·최종 보고서에만 기록했으며 credential 값은 기록하지 않았다.

## 검증 결과

실행 명령:

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

결과:

- OK — workflow 집중 contract test 11/11 통과
- OK — 전체 automation 119/119 통과
- OK — product boundary 197 files, version `0.1.0`, release metadata 통과
- OK — current rhwp pin `v0.8.2` / `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`,
  managed artifacts 6개 확인
- OK — upstream 35/35 통과
- OK — Studio 21 files·97/97 통과
- OK — Studio production build 213 modules 변환 완료
- OK — workflow 291 LOC, workflow contract test 248 LOC로 300 LOC 권장 상한 유지
- OK — `git diff --check` 경고 없음
- INFO — CanvasKit browser externalization, ineffective dynamic import와 500 kB chunk 경고는
  기존과 동일
- N/A — desktop Rust test·Clippy는 지원 대상 Windows/Linux runner의 post-update workflow
  gate로 유지하며 macOS host에서는 실행하지 않음

## 잔여 위험

- 보정 workflow는 아직 `devel`에 merge되지 않아 actual `v0.8.4` write run을 재실행하지 않았다.
- GitHub App installation·Client ID variable·private key secret은 구성됐지만 반복 실패 방지를
  위해 `ALHANGEUL_UPSTREAM_SYNC_ENABLED=false`로 유지 중이다.
- 수정 PR merge 뒤 writer를 마지막에 다시 활성화하고 candidate draft PR 생성과 같은 입력의
  멱등성을 확인해야 한다.
- candidate PR에는 CI가 자동 실행되지 않으므로 candidate branch ref로 `ci.yml`을 수동 dispatch해
  run head SHA와 PR head가 같은지, `Test automation contracts`가 새 pin의 committed gitlink·lock
  기준으로 통과하는지 확인해야 한다. 자동 PR CI 도입은 Issue #28 범위다.
- `v0.8.4` Windows/Linux native 수용과 candidate merge는 Issue #24 범위다.

## 다음 단계 영향

- Stage 4.3 승인 뒤 최종 보고서와 오늘할일을 포함한 correction PR을 `devel` 대상으로 게시한다.
- PR merge 전에는 writer를 활성화하거나 live dispatch를 재실행하지 않는다.
- PR merge 뒤 actual write run 성공, draft candidate 1개와 멱등 재실행을 확인한 뒤 Issue #23과
  #24에 증적을 기록하고 Issue #23 close 승인을 받는다.
- candidate branch 수동 CI에서 automation step은 Issue #23 live gate 증적으로 남기고, 이후
  제품·native gate 실패는 Issue #24 수용 작업으로 인계한다.

## 승인 요청

- Stage 4.3 산출물과 검증 결과를 승인하면 최종 보고서 확정과 correction PR 게시 단계로
  진행한다.
