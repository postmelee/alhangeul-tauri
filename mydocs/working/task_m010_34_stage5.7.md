# Task #34 Stage 5.7 완료 보고서 — tauri-driver 환경 증거 보정

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 5.7

## 단계 목적

PR #40 merge exact SHA `52135bb4ec14d32f2e74730f3d503b815a67acfc`의 Linux GUI
canary run `32100313824`에서 확인한 환경 증거 실패를 보정한다. exact
`tauri-driver v2.0.6` 설치와 Stage 5.6 CUPS A4 gate는 성공했으나 CLI가 지원하지
않는 `--version` 호출 때문에 제품 GUI 전에 중단됐으므로, 설치 계약을 유지하면서
증거 기록만 지원되는 deterministic 출력으로 교체한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-linux-gui.yml` | 미지원 `tauri-driver --version` 대신 exact install input을 `tauri-driver <version>` 형식으로 environment evidence에 기록 |
| `tests/linux-gui-workflow.test.mjs` | pinned version 출력과 미지원 flag 부재를 workflow source contract로 고정 |
| `mydocs/plans/task_m010_34_impl.md` | exact-SHA native/GUI run, CUPS A4 성공 실측과 Stage 5.7 범위·검증 기록 |
| `mydocs/orders/20260818.md` | Task #34 Stage 5.7 로컬 gate 완료 상태 반영 |
| `mydocs/working/task_m010_34_stage5.7.md` | 단계 산출물·검증·잔여 live gate 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드와 사용자 문서는 변경하지 않았다. exact driver 설치 명령, CUPS 설정,
GUI runner·selector, PDF threshold와 artifact handoff 계약은 유지하고 환경 증거 파일의
driver version 한 줄만 보정했다.

## 검증 결과

실행 명령:

```bash
node --test tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

결과:

- OK — focused workflow contract test `21/21` 통과
- OK — product boundary `225 files scanned` 통과
- OK — automation test `201/201` 통과
- OK — `actionlint` 오류 없음
- OK — `git diff --check` 오류 없음

## 잔여 위험

- actual environment evidence와 제품 GUI acceptance는 workflow가 default branch에
  반영된 뒤 새 exact-SHA canary에서만 확인할 수 있다.
- 보정 PR merge 뒤 새 merge exact SHA의 native build와 Linux GUI canary가 실제
  GUI·GTK·CUPS-PDF까지 통과하기 전에는 Issue #34를 닫지 않는다.

## 다음 단계 영향

- Stage 5.7 commit을 correction PR로 게시하고 merge한다.
- merge 뒤 새 exact SHA에서 native build와 Linux GUI canary를 순서대로 반복한다.
- close gate가 성공하면 evidence를 read-back하고 Issue #34와 작업 보드를 정리한 뒤
  Issue #35로 진행한다.

## 승인 요청

- Stage 5.7 산출물과 검증 결과를 승인하면 correction PR 게시 단계로 진행한다.
