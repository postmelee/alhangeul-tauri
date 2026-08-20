# Task #34 Stage 5.9 진행 보고서 — CUPS 환경 증거와 file upload protocol 보정

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
| `tests/gui/support/document-ux.ts` | 실패한 temporary style upload adapter 제거 |
| `tests/gui/specs/document-ux.e2e.ts` | 숨은 file input에 clear 없이 `addValue`로 경로를 직접 전송 |
| `tests/gui/wdio.linux.conf.ts` | WebKit file upload용 표준 `strictFileInteractability: false` 명시 |
| `tests/gui-contracts.test.mjs` | `addValue` 직접 전송과 clear/style 변경 부재를 source contract로 고정 |
| `mydocs/plans/task_m010_34_impl.md` | 두 hosted 실패 원인, acceptance/product SHA 분리와 pre-PR branch CI 순서 기록 |
| `mydocs/orders/20260820.md` | Task #34 Stage 5.9 로컬 gate와 branch CI 대기 상태 반영 |
| `mydocs/working/task_m010_34_stage5.9.md` | 단계 산출물·검증과 PR 전 원격 gate 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드와 사용자 문서는 변경하지 않았다. exact artifact handoff, driver 설치, CUPS
service·queue·A4 gate, GUI selector와 PDF threshold를 유지했다. 환경 증거의 CUPS
version 수집 방법을 지원되는 package database로 교체했다. 숨은 file input도 표시하지
않고 유지하며 WDIO `setValue`의 선행 `Element Clear`만 피한다. acceptance harness SHA와
제품 build SHA를 분리 검증·기록해 보정 반복에서 성공한 제품 artifact를 안전하게 재사용한다.

## 현재까지의 검증 결과

실행 명령:

```bash
node --test tests/gui-contracts.test.mjs tests/linux-gui-workflow.test.mjs \
  tests/actions-workflows.test.mjs
pnpm run typecheck:gui
pnpm run check:product-boundary
pnpm run test:automation
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

결과:

- OK — 첫 보정 focused GUI·workflow contract test `36/36` 통과
- OK — GUI TypeScript typecheck 통과
- OK — product boundary `225 files scanned` 통과
- OK — automation test `202/202` 통과
- OK — `actionlint` 오류 없음
- OK — `git diff --check` 오류 없음

## 잔여 위험

- 첫 hosted branch run `32345377664`은 CUPS environment evidence까지 성공했지만 숨은
  `#file-input`의 WebDriver upload에서 실패했다.
- 첫 upload 보정 SHA `ceb8b3ba7283152ae37d6c5de5e9317b54ee5499`의 native run
  `32347468978`은 모든 native matrix와 installer smoke를 통과했다. 같은 SHA의 GUI run
  `32348548068`은 입력을 표시한 뒤에도 실패했으며, WDIO log에서 `setValue`가
  `elementClear`를 먼저 호출한 것이 확인됐다.
- 최종 protocol 보정은 `addValue` 직접 send keys와 명시적 capability를 사용한다. 다음 GUI
  run에서 성공하더라도 최종 merge SHA provenance 성공을 대신하지 않는다.

## 다음 단계 영향

- PR을 만들지 않은 상태로 `publish/task34`를 push하고, 성공한 제품 native run
  `32347468978`을 재사용해 immutable acceptance workflow SHA의 branch GUI를 실행한다.
- 실패하면 같은 branch에서 evidence를 읽고 보정하며, 완전히 성공해야 correction PR을
  생성한다.
- PR merge 뒤 새 merge exact SHA의 native build·Linux GUI·evidence read-back을 한 번
  수행한 후 Issue #34를 닫는다.

## 승인 요청

- Stage 5.9 산출물과 로컬 검증 결과를 승인하면 pre-PR branch GUI CI로 진행한다.
