# Task #34 Stage 5.9 완료 보고서 — CUPS 환경 증거 보정

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 5.9

## 단계 목적

PR #42 merge exact SHA `fee06fb41de05586a8088b88821a95ca6e97cc16`의 Linux GUI
canary run `32343886835`에서 확인한 환경 증거 마지막 명령의 실패를 보정한다. exact
artifact handoff, DEB·driver 설치, CUPS A4와 WebKitWebDriver 증거는 성공했으나 Ubuntu
22.04의 `cupsd`가 지원하지 않는 `-v` option 때문에 제품 GUI 전에 중단됐다. CUPS
version 증거를 지원되는 Debian package database 계약으로 교체한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-linux-gui.yml` | 미지원 `cupsd -v`를 제거하고 기존 `dpkg-query -W`에 `cups` package version 증거 추가 |
| `tests/linux-gui-workflow.test.mjs` | CUPS package 증거와 `cupsd -v` 부재를 workflow source contract로 고정 |
| `mydocs/plans/task_m010_34_impl.md` | exact-SHA native/GUI run 증거, Stage 5.9 범위와 pre-PR branch CI 순서 기록 |
| `mydocs/orders/20260820.md` | Task #34 Stage 5.9 로컬 gate와 branch CI 대기 상태 반영 |
| `mydocs/working/task_m010_34_stage5.9.md` | 단계 산출물·검증과 PR 전 원격 gate 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드와 사용자 문서는 변경하지 않았다. exact artifact handoff, driver 설치, CUPS
service·queue·A4 gate, GUI selector와 PDF threshold를 유지했다. 환경 증거의 CUPS
version 수집 방법과 이를 고정하는 source contract만 변경했다.

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

- hosted Ubuntu에서 변경된 workflow 정의가 실제 environment evidence와 제품 GUI까지
  통과하는지는 PR 생성 전에 `publish/task34` ref의 수동 branch run으로 확인한다.
- branch run은 workflow-only correction을 빠르게 검증하기 위해 검증된 제품 SHA
  `fee06fb41de05586a8088b88821a95ca6e97cc16`과 native run `32342945305`를 재사용한다.
  최종 merge SHA provenance 성공을 대신하지 않는다.

## 다음 단계 영향

- PR을 만들지 않은 상태로 `publish/task34`를 push하고 branch workflow를 수동 실행한다.
- 실패하면 같은 branch에서 evidence를 읽고 보정하며, 완전히 성공해야 correction PR을
  생성한다.
- PR merge 뒤 새 merge exact SHA의 native build·Linux GUI·evidence read-back을 한 번
  수행한 후 Issue #34를 닫는다.

## 승인 요청

- Stage 5.9 산출물과 로컬 검증 결과를 승인하면 pre-PR branch GUI CI로 진행한다.
