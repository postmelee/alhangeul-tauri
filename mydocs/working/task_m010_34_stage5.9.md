# Task #34 Stage 5.9 진행 보고서 — CUPS·file upload·GUI session 보정

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
| `tests/gui/specs/document-ux.e2e.ts` | 숨은 file input에 clear 없이 `addValue`로 경로를 전송하고 headless 환경의 로컬 글꼴 선택 모달을 fail-closed 처리 |
| `tests/gui/wdio.linux.conf.ts` | WebKit file upload용 표준 `strictFileInteractability: false` 명시 |
| `tests/gui/wdio.shared.conf.ts` | operation·scenario timeout을 분리하고 단일 WebDriver window를 표준 명령으로 고정 |
| `tests/gui-contracts.test.mjs` | upload protocol, bounded scenario timeout과 단일 window fail-closed 계약 고정 |
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
- OK — GUI contract test `17/17` 통과
- OK — automation test `204/204` 통과
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
- acceptance/product SHA 분리를 적용한 GUI run `32350630637`은 exact handoff와 CUPS를
  통과했고 file `Element Send Keys`도 성공했다. HWP가 실제 렌더된 screenshot에서
  `로컬 글꼴 감지` 모달이 확인됐으며, 사용자 선택을 기다리는 동안 최종 basename 상태가
  되지 않아 timeout됐다. headless acceptance는 권한·host font 상태에 의존하지 않는
  `대체 글꼴로 보기`만 선택하고 다른 modal은 fail-closed하도록 후속 보정한다.
- 첫 modal handler run `32351859807`은 두 fixture에서 모달을 찾았지만 WebDriver title
  측정값이 닫기 버튼 text까지 포함한 `로컬 글꼴 감지×`여서 의도한 fail-closed가 작동했다.
  제품 DOM을 바꾸지 않고 고정 닫기 기호 접미사만 정규화해 exact 제목 비교를 유지한다.
- 제목 정규화 run `32352662110`은 `대체 글꼴로 보기` click까지 진행했지만 두 test가 각각
  정확히 120초에 Mocha 전체-test timeout으로 종료됐다. timeout 뒤 계속된 async action이 다음
  fixture와 screenshot을 오염시킨 증거도 확인했다. operation 상한과 scenario 상한을 분리하고,
  시작 시 단일 WebDriver window를 표준 `switchToWindow`로 고정해 production에 없는 WDIO
  plugin focus probe 반복을 제거했다. 이 보정은 아직 hosted GUI에서 실행하지 않았다.
- 재개 run `32562596576`은 기존 120초 전체-test timeout을 넘겨 정상 종료·evidence upload까지
  진행했으므로 timeout·window 보정은 실제 runner에서 확인됐다. 다만 첫 HWP send가 앱 시작
  약 2초에 실행돼 upstream의 file input listener 설치 전 경로를 놓쳤다. 두 번째 HWPX는
  2분 뒤 정상 렌더되어 driver와 upload protocol 자체는 유효했다. 최초 upload 전에 초기
  status와 toolbar-ready를 함께 기다리는 readiness gate를 추가한다.

## 다음 단계 영향

- 현재 checkpoint를 `publish/task34`에 push한 뒤, 성공한 제품 native run `32347468978`을
  재사용해 immutable acceptance workflow SHA의 branch GUI만 실행한다.
- 실패하면 같은 branch에서 evidence를 읽고 보정하며, 완전히 성공해야 correction PR을
  생성한다.
- PR merge 뒤 새 merge exact SHA의 native build·Linux GUI·evidence read-back을 한 번
  수행한 후 Issue #34를 닫는다.

## 승인 요청

- 작업지시자 요청으로 hosted run 전에 안전 중단했다. 재개 지시가 있으면 checkpoint 상태와
  ancestry를 확인한 뒤 pre-PR branch GUI CI부터 진행한다.
