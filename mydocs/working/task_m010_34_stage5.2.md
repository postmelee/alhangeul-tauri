# Task #34 Stage 5.2 완료 보고서 — merged exact-SHA Windows 계약 경로 보정

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 5.2

## 단계 목적

PR #36 merge commit `f8e77ecde3b397ed5f33dae3e4d9ec6f2f6a1b21`로 실행한
[native build run #32086154448](https://github.com/postmelee/alhangeul-tauri/actions/runs/32086154448)의
Windows `Test automation contracts`에서 확인된 경로 fixture 실패 6건을 보정한다.
Linux 전용 probe는 실행 host와 무관하게 POSIX 경로 의미를 유지하고, 범용
upstream-sync test는 실제 host 정규화 결과를 검증해 전체 native gate를 우회하지
않고 다시 실행할 수 있게 한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `tests/gui/linux/probe.mjs` | Linux app·output·evidence·PATH 결합을 POSIX path API로 고정 |
| `tests/gui/support/process.mjs` | host 기본값을 보존하는 delimiter·join 주입 경계 추가 |
| `tests/linux-gui-probe.test.mjs` | Windows host에서도 Linux PATH 탐색 의미를 검증하는 POSIX fixture 적용 |
| `tests/rhwp-sync-changes.test.mjs`, `tests/rhwp-sync-pr-body.test.mjs` | 범용 output path 기대값을 host `resolve()` 결과와 정렬 |
| `mydocs/plans/task_m010_34_impl.md` | 첫 post-merge 실패와 Stage 5.2 재진입 절차 기록 |
| `mydocs/orders/20260818.md` | Task #34 보정 PR·hosted gate 진행 상태 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 Rust·Studio runtime, native 저장·인쇄 구현과 bundled `rhwp`는 수정하지 않았다.
변경은 GUI acceptance helper의 경로 추상화, automation test 기대값과 작업 증적에
한정된다. `resolveExecutable`의 기존 host 기본 동작은 그대로이며 Linux probe만
명시적으로 POSIX delimiter와 join을 주입한다.

## 검증 결과

실행 명령:

```bash
node --test tests/linux-gui-probe.test.mjs tests/rhwp-sync-changes.test.mjs tests/rhwp-sync-pr-body.test.mjs
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run typecheck:gui
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

결과:

- OK — 집중 경로 회귀 23/23을 통과했다.
- OK — product boundary 225개 파일, version `0.1.0`, release metadata와
  `rhwp v0.8.2` exact pin을 유지했다.
- OK — GUI TypeScript no-emit 검사와 automation 199/199, upstream 35/35,
  Studio 97/97을 통과했다.
- OK — Studio production build 성공. 기존 CanvasKit externalization과 chunk-size
  warning 외 오류가 없다.
- OK — `git diff --check` 경고가 없고 변경한 구현 파일은 300행 상한 이내다.

## 잔여 위험

- macOS 로컬 검증은 Windows path 구현을 실제 실행하지 않는다. 보정 branch의
  Windows hosted `test:automation` 성공을 후속 PR 필수 gate로 둔다.
- 첫 native run은 Windows job 실패로 전체 conclusion이 성공이 아니므로 Linux GUI
  artifact handoff에 사용할 수 없다.
- GTK Print-to-File selector와 PDF 임계값의 actual hosted 측정은 새 native run과
  Linux GUI canary가 성공·실패 evidence를 만든 뒤에만 확정할 수 있다.

## 다음 단계 영향

- Stage 5.2 commit을 `publish/task34`에 push하고 `devel` 대상 후속 보정 PR을 만든다.
- PR CI에서 Windows automation 계약을 통과한 뒤 merge하고 새 merged exact SHA로
  native build → Linux GUI canary → evidence read-back 순서를 반복한다.
- live gate 성공 전까지 Issue #34를 닫거나 Task #34 브랜치를 정리하지 않는다.

## 승인 요청

- Stage 5.2 산출물과 검증 결과를 승인하면 후속 보정 PR 게시와 hosted Windows 계약
  검증으로 진행한다.
