# Task #23 Stage 3 완료 보고서 — upstream 자동 동기화 운영 문서와 중립 검증

GitHub Issue: [#23](https://github.com/postmelee/alhangeul-tauri/issues/23)
구현계획서: [`task_m010_23_impl.md`](../plans/task_m010_23_impl.md)
Stage: 3

## 단계 목적

Stage 1·2에서 구현한 Stable 판정과 draft candidate workflow를 공식 upstream·개발 운영 문서에 반영했다. 공개 Stable metadata와 resolved tag 검증, candidate와 Issue #24의 native 수용 경계, credential 최소 권한, read-only dry-run과 장애 복구를 문서화하고 실제 `v0.8.4`를 대상으로 repository 무손실 판정을 확인했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/architecture/UPSTREAM.md` | Stable 판정, candidate 실행 순서, 최소 권한 write 경계, Issue #24 native handoff, known issue 비자동 치환과 post-merge activation gate를 기록했다. |
| `docs/DEVELOPMENT.md` | local dry-run, manual input, GitHub App variable·secret과 최소 permission, candidate 장애 복구 절차를 기록했다. |
| `tests/rhwp-upstream-sync-workflow.test.mjs` | Ubuntu 단일 runner 계약을 제품 경계 검사와 충돌하지 않는 직접 목록 비교로 보정했다. |
| `mydocs/working/task_m010_23_stage3.md` | Stage 3 문서 변경, 전체 검증, dry-run 증적과 잔여 위험을 기록한다. |

## 본문 변경 정도 / 본문 무손실 여부

기존 문서의 현재 pin, source 갱신과 rollback 절차, 플랫폼 중립 수용 기준과 `v0.8.2` known issue 분류는 재작성하지 않고 automation 운영 절만 추가했다. 관리 참조 marker test 5개로 향후 pin 갱신 대상이 그대로 유효하고 known issue 기록이 자동 치환되지 않음을 확인했다.

제품 pin `v0.8.2`, `third_party/rhwp`, bundled WASM, Cargo lock, Rust/Tauri 제품 코드는 변경하지 않았다. 전체 gate 중 `check:product-boundary`가 Stage 2 workflow test의 금지 플랫폼 리터럴을 발견해 처음 실패했으며, 실행 workflow가 아니라 단일 Ubuntu runner를 검증하는 test assertion만 동등한 직접 목록 비교로 보정했다.

## 검증 결과

실행 명령:

```bash
CI=true pnpm install --frozen-lockfile
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

결과:

- OK — frozen lockfile 설치 완료, `pnpm 10.33.0`과 현재 lock 정합성 확인
- OK — product boundary 192 files, 제품 version `0.1.0`, release metadata와 rhwp pin `v0.8.2` 검증 통과
- OK — `test:automation` 102개, `test:upstream` 35개 통과
- OK — `test:studio` 21 files, 97 tests 통과
- OK — Studio production build 213 modules 변환 완료
- OK — 공개 Stable `v0.8.4`가 resolved commit `496333b27d21ddb9114ba9ae340bcb895870c9a7`로 판정되고 `decision=dry_run` 확인
- OK — dry-run 전후 `git status --porcelain=v1 --untracked-files=all` snapshot이 동일해 repository write 없음
- OK — 관리 참조 marker test 5개와 보정한 workflow 집중 test 9개 통과
- OK — `git diff --check` 경고 없음
- INFO — Vite의 기존 CanvasKit browser externalization, dynamic import와 500 kB chunk 경고는 유지되며 새 오류는 없다.

## 잔여 위험

- 실제 repository의 GitHub App installation, variable·secret은 설정하지 않았으며 private key와 installation token을 live 검증하지 않았다.
- workflow는 아직 default branch에 없고 manual·schedule dispatch를 실행하지 않았으므로 candidate build, branch push, draft PR 생성과 동일 입력 멱등성은 미확정이다.
- `v0.8.4` source·lock·WASM 실제 갱신과 Windows/Linux native 수용은 Issue #24 범위이며 이번 Stage에서 수행하지 않았다.

## 다음 단계 영향

- Stage 4에서 외부 상태 준비 항목과 post-merge activation 순서를 최종 handoff로 고정한다.
- task PR은 `Refs #23`으로 게시하고 merge만으로 Issue #23을 닫지 않는다.
- merge 뒤 별도 승인으로 GitHub App 설정, `target_tag=v0.8.4`·`dry_run=false` dispatch, draft PR 확인과 동일 입력 재실행을 거친 뒤 Issue #24에 native 수용을 인계한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 task PR 및 post-merge activation handoff 확정으로 진행한다.
