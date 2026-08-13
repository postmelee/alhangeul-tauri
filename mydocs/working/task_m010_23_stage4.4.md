# Task #23 Stage 4.4 완료 보고서 — pre-commit Studio gitlink 책임 분리

GitHub Issue: [#23](https://github.com/postmelee/alhangeul-tauri/issues/23)
구현계획서: [`task_m010_23_impl.md`](../plans/task_m010_23_impl.md)
Stage: 4.4

## 단계 목적

PR #29 merge 뒤 actual write run `31671732386`에서 확인된 두 번째 pre-commit Git index
전제 충돌을 보정한다. committed current pin 정합성은 clean-base automation이 계속 소유하고,
post-update Studio boundary test는 갱신된 lock과 실제 submodule worktree의 target release
provenance만 검사하도록 책임을 분리한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/core/upstream-boundary.test.ts` | test 이름을 lock·submodule worktree 책임에 맞게 조정하고 상위 repository Git index gitlink assertion만 제거 |
| `mydocs/plans/task_m010_23.md` | Stage 4.4 재개 근거·책임 경계·live gate 수행계획 기록 |
| `mydocs/plans/task_m010_23_impl.md` | 변경 행, 검증 명령, correction PR과 merge 후 live gate 순서 확정 |
| `mydocs/working/task_m010_23_stage4.4.md` | 구현·검증·잔여 live gate 증적 기록 |
| `mydocs/orders/20260813.md` | Stage 4.4 완료와 단계 보고 승인 대기 상태 반영 |

## 본문 변경 정도 / 본문 무손실 여부

제품 실행 code, workflow, update helper, current rhwp pin, submodule, Cargo lock, bundled WASM,
changed-path allowlist, publish staging과 credential 경계는 변경하지 않았다. Studio boundary test에서
publish 전에는 성립하지 않는 상위 repository Git index 검사만 제거했다.

`rhwp-core.lock`의 managed tag·commit, 실제 submodule HEAD, release tag commit과 깨끗한 submodule
worktree 검사는 그대로 유지했다. committed current lock·Git index gitlink·submodule HEAD
invariant는 `assertCurrentPinState`와 clean-base `test:automation`에 그대로 남아 있다. 공식 제품·운영
문서는 사용자 계약이 바뀌지 않아 수정하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run \
  src/core/upstream-boundary.test.ts
pnpm run test:automation
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
rg -n "ls-files.*--stage.*third_party/rhwp|gitlink가 current lock commit|pins the source lock" \
  apps/studio-host/src/core/upstream-boundary.test.ts scripts tests
git diff --check
```

결과:

- OK — focused Studio boundary 1 file·10/10 통과
- OK — 전체 automation 119/119 통과; 실제 저장소 current pin·gitlink·submodule 정합성 검사 유지
- OK — product boundary 197 files, version `0.1.0`, release metadata 통과
- OK — current rhwp pin `v0.8.2` / `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`,
  managed artifacts 6개 확인
- OK — upstream 35/35 통과
- OK — Studio 21 files·97/97 통과
- OK — Studio production build 213 modules 변환 완료
- OK — post-update Studio test에서 상위 repository Git index 조회가 제거됐고 clean-base release
  service의 `git ls-files --stage third_party/rhwp`는 유지됨
- OK — source test는 4 LOC 감소했으며 새 workflow·helper·공식 문서 변경 없음
- OK — `git diff --check` 경고 없음
- INFO — CanvasKit browser externalization, ineffective dynamic import와 500 kB chunk 경고는
  기존과 동일
- N/A — desktop Rust·GUI·packaging은 변경 범위가 아니며 지원 대상 Windows/Linux의 actual
  candidate workflow와 Issue #24 native 수용에서 검증

## 잔여 위험

- 보정은 아직 `devel`에 merge되지 않아 exact `v0.8.4` pre-commit target 상태에서 actual
  Studio gate를 재실행하지 않았다.
- `ALHANGEUL_UPSTREAM_SYNC_ENABLED=false`를 유지하고 있으며 candidate branch와 PR은 아직 없다.
- correction PR merge 뒤 actual candidate 생성, candidate ref 수동 CI와 동일 입력
  `existing_pr` 멱등성까지 통과해야 Issue #23의 live close gate가 완료된다.
- `v0.8.4` source diff와 Windows/Linux 제품 수용은 Issue #24 범위다.

## 다음 단계 영향

- Stage 4.4 승인 뒤 기존 최종 보고서와 오늘할일을 확정하고 `task-final-report`로 correction PR을
  게시한다. PR은 Issue #23을 자동 close하지 않는다.
- correction PR merge 전에는 writer를 활성화하거나 live dispatch를 실행하지 않는다.
- merge 뒤 writer 활성화 → exact actual sync → candidate 수동 CI → 동일 입력 멱등성 → Issue
  증적 → writer 비활성화 순으로 수행하고, 모두 성공한 뒤 Issue #23 close 승인을 요청한다.

## 승인 요청

- Stage 4.4 산출물과 검증 결과를 승인하면 최종 보고서 확정과 correction PR 게시 단계로
  진행한다.
