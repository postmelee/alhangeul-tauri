# Task #34 Stage 5.8 완료 보고서 — WebKitWebDriver 환경 증거 보정

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 5.8

## 단계 목적

PR #41 merge exact SHA `3800b07530de187e17ecbfe8f6e1880c6124145d`의 Linux GUI
canary run `32101528891`에서 확인한 환경 증거 실패를 보정한다. exact artifact
handoff, DEB 설치, CUPS A4 gate와 exact `tauri-driver 2.0.6` 설치는 성공했으나
Ubuntu 22.04의 `WebKitWebDriver`가 지원하지 않는 `--version` 호출 때문에 제품 GUI
전에 중단됐다. binary 존재와 패키지 버전 증거를 지원되는 OS 계약으로 분리한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-linux-gui.yml` | `command -v WebKitWebDriver`를 fail-closed 실행해 binary 경로를 기록하고 기존 `dpkg-query`로 패키지 버전을 유지 |
| `tests/linux-gui-workflow.test.mjs` | binary 탐색·경로 기록과 두 driver의 미지원 `--version` 호출 부재를 source contract로 고정 |
| `mydocs/plans/task_m010_34_impl.md` | exact-SHA native/GUI run 증거와 Stage 5.8 범위·검증 기록 |
| `mydocs/orders/20260820.md` | Task #34 Stage 5.8 로컬 gate 완료 상태 반영 |
| `mydocs/working/task_m010_34_stage5.8.md` | 단계 산출물·검증·잔여 live gate 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드와 사용자 문서는 변경하지 않았다. exact driver 설치 명령, CUPS 설정,
GUI runner·selector, PDF threshold와 artifact handoff 계약은 유지했다. 환경 증거 단계의
지원되지 않는 WebKitWebDriver flag 호출만 binary 경로와 Debian 패키지 버전 증거로
분리했다.

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
  GUI·GTK·CUPS-PDF까지 통과하고 evidence read-back을 마치기 전에는 Issue #34를
  닫지 않는다.

## 다음 단계 영향

- Stage 5.8 commit을 correction PR로 게시하고 merge한다.
- merge 뒤 새 exact SHA에서 native build와 Linux GUI canary를 순서대로 반복한다.
- close gate가 성공하면 evidence를 read-back하고 Issue #34와 작업 보드를 정리한 뒤
  Issue #35로 진행한다.

## 승인 요청

- Stage 5.8 산출물과 검증 결과를 승인하면 correction PR 게시 단계로 진행한다.
