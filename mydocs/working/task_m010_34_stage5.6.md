# Task #34 Stage 5.6 완료 보고서 — CUPS A4 기본값 검증 보정

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 5.6

## 단계 목적

PR #39 merge exact SHA `4ab82ed214d513b72aa1162f61ea7f6727f3f191`의 Linux GUI
canary run `32097898631`이 CUPS-PDF queue 등록 뒤 exact `PageSize=A4` 문자열
assertion에서 실패한 원인을 보정한다. CUPS가 공식 제공하는 printer-specific option
목록과 선택 기본값 표식을 사용해 A4 설정을 검증하고, 제품 GUI 실행 전의 잘못된
사전 gate를 제거한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-linux-gui.yml` | CUPS-PDF queue 용지를 단일 `PageSize=A4`로 설정하고 일반 option·`-l` PageSize 진단과 선택된 A4 기본값 gate 추가 |
| `tests/linux-gui-workflow.test.mjs` | 단일 A4 설정, 두 진단, `lpoptions -l` 선택값 판정과 기존 취약 assertion 제거 계약 고정 |
| `mydocs/plans/task_m010_34_impl.md` | exact-SHA 실패 증거, Stage 5.6 범위·검증·post-merge close gate 기록 |
| `mydocs/orders/20260818.md` | Task #34 Stage 5.6 로컬 gate 완료 상태 반영 |
| `mydocs/working/task_m010_34_stage5.6.md` | 단계 산출물·검증·잔여 live gate 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드와 사용자 문서는 변경하지 않았다. Linux GUI workflow의 CUPS-PDF 사전
설정만 보정했으며 output directive, queue 이름, GUI selector, PDF 수용 threshold와
exact-SHA artifact handoff 계약은 그대로 유지했다.

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

- 실제 `ubuntu-22.04` CUPS-PDF의 `lpoptions -l` 출력과 제품 GUI acceptance는
  workflow가 default branch에 반영된 뒤에만 실행할 수 있다.
- 보정 PR merge 뒤 새 merge exact SHA의 native build와 Linux GUI canary가
  실제 GUI·GTK·CUPS-PDF 단계까지 통과하기 전에는 Issue #34를 닫지 않는다.

## 다음 단계 영향

- Stage 5.6 commit을 correction PR로 게시하고 merge한다.
- merge 뒤 새 exact SHA에서 `alhangeul-desktop.yml`을 `run_tests=true`로 실행한 뒤,
  성공한 Linux x64 artifact run ID를 `alhangeul-linux-gui.yml`에 전달한다.
- close gate가 성공하면 evidence를 read-back하고 Issue #34 정리 후 #35로 진행한다.

## 승인 요청

- Stage 5.6 산출물과 검증 결과를 승인하면 correction PR 게시 단계로 진행한다.
