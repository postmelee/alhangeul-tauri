# Task #23 Stage 4.5 완료 보고서 — porcelain changed-path parser 보정

GitHub Issue: [#23](https://github.com/postmelee/alhangeul-tauri/issues/23)
구현계획서: [`task_m010_23_impl.md`](../plans/task_m010_23_impl.md)
Stage: 4.5

## 단계 목적

Stage 4.4 correction merge 뒤 actual write run `31677524857`의 마지막 changed-path gate에서
`README.md`를 `EADME.md`로 잘못 해석한 결함을 보정한다. allowlist와 parser 형식을 완화하지
않고, production command runner가 column-sensitive `git status --porcelain=v1`의 첫 선행 공백을
보존하도록 최소 수정한다. injected runner fixture가 놓친 실제 subprocess 경계를 임시 Git
repository 회귀 test로 고정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/verify-rhwp-sync-changes.mjs` | 성공 stdout 처리에서 전체 `trim()` 대신 후행 whitespace만 제거하는 `trimEnd()` 사용 |
| `tests/rhwp-sync-changes.test.mjs` | 실제 임시 Git repository에서 첫 modified `README.md` porcelain record와 exact output을 검증하는 회귀 test 추가 |
| `mydocs/plans/task_m010_23.md` | Stage 4.5 재개 근거·parser 책임·live gate 수행계획 기록 |
| `mydocs/plans/task_m010_23_impl.md` | test-first 구현 순서, 검증 명령, correction PR과 merge 후 live gate 확정 |
| `mydocs/working/task_m010_23_stage4.5.md` | red/green 구현·검증·잔여 live gate 증적 기록 |
| `mydocs/orders/20260813.md` | Stage 4.5 완료와 단계 보고 승인 대기 상태 반영 |

## 본문 변경 정도 / 본문 무손실 여부

제품 UI, upstream source, current rhwp pin, Studio bundle, workflow, updater, changed-path allowlist,
publish staging과 credential 경계는 변경하지 않았다. production helper는 성공한 subprocess stdout의
선행 whitespace를 보존하도록 한 줄만 변경했으며, 오류 stderr 진단의 `trim()`과 parser의
`slice(3)`은 유지했다.

회귀 test는 repository root와 output root를 서로 다른 임시 디렉터리로 구성해 output 파일이
untracked 변경 목록에 섞이지 않게 했다. test-local Git identity를 사용하고 종료 hook에서 모든
임시 경로를 정리하므로 global Git 설정과 사용자 repository를 변경하지 않는다. 공식 제품·운영
문서는 외부 계약이 바뀌지 않아 수정하지 않았다.

## 검증 결과

실행 명령:

```bash
node --test tests/rhwp-sync-changes.test.mjs
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

- RED 확인 — production runner 회귀 test 추가 직후 기존 `trim()` 구현에서 정확히
  `Changed path is not allowed: EADME.md`로 실패
- OK — `trimEnd()` 보정 뒤 focused changed-path test 5/5 통과; 실제 first record가
  ` M README.md`이고 결과와 output이 각각 `['README.md']`, `README.md\n`임을 확인
- OK — 전체 automation 120/120 통과; tracked·untracked allowlist, 금지 경로와 빈 변경 거부
  계약 유지
- OK — product boundary 197 files, version `0.1.0`, release metadata 통과
- OK — current rhwp pin `v0.8.2` / `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`,
  managed artifacts 6개 확인
- OK — upstream 35/35 통과
- OK — Studio 21 files·97/97 통과
- OK — Studio production build 213 modules 변환 완료
- OK — helper 86 LOC, test 92 LOC로 파일 권장 상한 이내
- OK — `git diff --check` 경고 없음
- OK — repository variable `ALHANGEUL_UPSTREAM_SYNC_ENABLED=false` read-back 확인
- INFO — CanvasKit browser externalization, ineffective dynamic import와 500 kB chunk 경고는
  기존과 동일
- N/A — macOS host에서는 지원 대상 Windows/Linux desktop Rust·GUI·packaging을 실행하지 않음.
  correction merge 뒤 default branch live workflow가 Linux runner에서 actual sync 전체 gate를
  다시 검증

## 잔여 위험

- 보정은 아직 `devel`에 merge되지 않아 exact `v0.8.4` actual sync의 changed-path gate,
  App token 발급과 candidate publish를 재실행하지 않았다.
- writer는 `false`이며 candidate branch와 PR은 아직 없다. correction PR merge 뒤에만 writer를
  활성화해야 한다.
- actual candidate exact-SHA CI와 같은 입력의 `existing_pr` 멱등성까지 통과해야 Issue #23의
  live close gate가 완료된다.
- `v0.8.4` source diff와 Windows/Linux 제품 수용은 Issue #24 범위다.

## 다음 단계 영향

- Stage 4.5 승인 뒤 기존 최종 보고서와 오늘할일을 확정하고 `task-final-report`로 correction PR을
  게시한다. PR은 Issue #23을 자동 close하지 않는다.
- correction PR merge 전에는 writer를 활성화하거나 live dispatch를 실행하지 않는다.
- merge 뒤 writer 활성화 → exact actual sync → candidate exact-SHA 수동 CI → 동일 입력
  `existing_pr` 멱등성 → Issue 증적 → writer 비활성화 순으로 수행한다.
- 모든 live gate가 성공하면 Issue #23을 close하고 `task-start`로 Issue #24를 시작한다.

## 승인 요청

- Stage 4.5 산출물과 검증 결과를 승인하면 최종 보고서 확정과 correction PR 게시 단계로
  진행한다.
