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
| `tests/gui/support/document-ux.ts` | 실패한 temporary style upload adapter 제거, upstream input/native title 계약 분리와 status·쪽 수 DOM 판독 공통화 |
| `tests/gui/specs/document-ux.e2e.ts` | 숨은 file input에 clear 없이 `addValue`로 경로를 전송하고 headless 환경의 로컬 글꼴 선택 모달을 fail-closed 처리 |
| `tests/gui/linux/native-ui/atspi.mjs`, `atspi_driver.py` | 이름 없는 GTK editable field를 ancestor 안에서 선택하고 location 입력을 focus·readback·semantic activate 단일 호출로 제출하며 비민감 실패 metadata 기록 |
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
- OK — readiness DOM 측정 보정 뒤 GUI·workflow focused `26/26`, GUI TypeScript,
  product boundary `225 files`, automation `204/204`, actionlint 재통과
- OK — 통합 감사 보정 뒤 focused `35/35`, GUI TypeScript, automation `204/204`, product
  boundary `225 files`, upstream `35/35`, Studio `97/97`, production Studio build,
  actionlint와 diff check 통과
- OK — run `32601165367`의 exact artifact handoff, DEB·driver·CUPS와 environment evidence
  통과. 두 fixture의 screenshot·status read-back에서 실제 렌더, 기대 6/10쪽과 중앙 정렬 확인
- OK — upstream input/native title 계약 분리 뒤 focused `38/38`, GUI TypeScript,
  automation `204/204`, product boundary `225 files`, upstream `35/35`, Studio `97/97`,
  production Studio build, actionlint와 diff check 통과
- OK — run `32601678616`에서 document UX 2건 성공, 전체 environment/evidence gate 통과
- OK — GTK anonymous entry ancestor scope 뒤 focused `44/44`, automation `205/205`, GUI
  TypeScript, product boundary `225 files`, upstream `35/35`, Studio `97/97`, production Studio
  build, Python syntax, actionlint와 diff check 통과
- OK — run `32602426011`에서 document UX 2건과 exact handoff·환경·evidence upload 통과.
  GTK open chooser의 anonymous location entry 탐색과 값 입력까지 진행해 이전 selector 실패가
  해소됐음을 확인
- OK — GTK editable focus 원자 계약 뒤 focused `44/44`, automation `205/205`, GUI
  TypeScript, product boundary `225 files`, upstream `35/35`, Studio `97/97`, production Studio
  build, Python syntax, actionlint와 diff check 통과
- OK — focus 보정 run `32685969832`에서 exact handoff·환경 gate·HWP/HWPX document
  scenario와 evidence upload 통과. focus 성공 뒤에도 첫 chooser close가 동일하게 timeout되어
  원인을 별도 X11 `Return` submit 경계로 좁힘
- OK — GTK semantic submit 계약 뒤 focused `44/44`, automation `205/205`, GUI TypeScript,
  product boundary `225 files`, upstream `35/35`, Studio `97/97`, production Studio build,
  Python syntax, actionlint와 diff check 통과

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
- readiness run `32563034022`은 화면상 초기 status와 toolbar-ready class가 모두 존재했지만
  WebDriver 요소 text API가 status를 빈 문자열로 반환해 upload 전 gate에서 실패했다. 제품
  DOM이나 초기화 순서는 변경하지 않고 page context의 `textContent`를 읽도록 측정만 보정한다.
  초기 status 설정 뒤 `setupFileInput()`까지 동기 실행되므로 이 관측은 listener 준비를
  보장한다.
- run `32563490588`은 environment evidence까지 전부 통과하고 GUI acceptance 실행 중
  작업지시자 요청으로 취소했다. 취소 run은 판정에서 제외한다.
- 재개 뒤 남은 전체 경로를 통합 감사해 status DOM 판독, spec별 readiness, native open의
  로컬 글꼴 선택, drag-in의 명시적 로컬 파일 열기 확인을 공통 helper로 고정했다. 최초
  readiness도 scenario evidence 안에서 실행해 실패 screenshot·manifest를 보존한다.
- Save As·현재 저장은 semantic dialog 종료와 실제 mtime 갱신, 직접 PDF는 6쪽 A4·한글
  text·nonblank render, system print는 GTK Print to File·cancel·CUPS-PDF와 editor state
  복원까지 이미 결속돼 있어 추가 제품 보정 없이 유지했다.
- 통합 canary run `32601165367`은 두 document scenario가 각각 약 120초 뒤 실패해 `bail=1`로
  native scenario를 시작하지 않았다. 전체 log에는 `document.title=Alhangeul`과 동시에
  `biz_plan.hwp — 6페이지`, `form-002.hwpx — 10페이지` status가 반복 기록됐고 screenshot도
  정상 렌더·중앙 정렬을 보였다. hidden upstream file input은 native session을 만들지 않으므로
  native title 갱신을 요구할 수 없다. open readiness에서는 이 잘못된 title 조건만 제거하고,
  native open의 title·page·status 복원은 command snapshot으로 그대로 보존한다.
- 다음 run `32601678616`은 두 document scenario를 수 초 안에 성공시켜 title/readiness 보정을
  확인했다. native save는 `Open File` chooser와 `Location Layer`가 실제 AT-SPI tree에
  나타났지만 위치 entry의 accessible name이 비어 timeout됐다. drag-in은 실패 cleanup 뒤
  남은 open 상태에서 확인 modal을 보지 못했고, direct PDF와 system print도 각자 선행 native
  open의 같은 location selector에서 실패했다. 따라서 네 개를 별도 결함으로 취급하지 않고
  GTK anonymous editable field 하나의 ancestor scope 계약으로 보정한다.
- ancestor scope 보정 SHA `968c95959aa87ef9d72133a11be15ba8bf2d5a82`의 run
  `32602426011`은 HWP/HWPX document scenario를 다시 성공시키고 native open에서 이름 없는
  location entry를 찾아 절대 경로 입력까지 통과했다. 당시 `setTextContents()`와 뒤따른
  `Return` 사이에 focus가 보장되지 않은 점을 우선 원인으로 진단했고, status는
  `파일 열기 중...`에 머문 채 chooser close가 timeout됐다. 나머지 drag/PDF/print failure는
  이 첫 chooser가 남은 연쇄 결과다. editable text 입력을 driver 안의 원자적
  `grabFocus() -> setTextContents()` 계약으로 바꿔 open/save/print 입력 경로를 함께 보정한다.
- focus 보정 SHA `965fbb6ecf6da5d47c22e3980e124b304a4a88a4`의 run
  `32685969832`도 document UX 2건은 각각 약 2초에 성공했고 location entry의 focus·값 설정에서
  오류를 내지 않았지만 chooser close가 약 121초 뒤 실패했다. screenshot은 빈 editor와
  `파일 열기 중...`를, tree는 열린 chooser를 보존했으며 뒤의 drag/PDF/print도 같은 선행
  chooser 때문에 연쇄 실패했다. 따라서 앞선 focus 단독 진단을 정정하고, AT-SPI 값 설정과
  별도 X11 `Return` 사이의 cross-channel submit을 제거한다. GTK entry의 accessible
  `activate` 계약으로 같은 node에서 focus·값 설정·exact readback·제출을 수행하며 실패
  snapshot은 값 본문 없이 focus·action·text 길이만 기록한다.

## 다음 단계 영향

- GTK semantic submit 계약을 전체 로컬 gate로 검증·commit·push한 뒤, 성공한 제품 native run
  `32347468978`을 재사용해 immutable acceptance workflow SHA의 branch GUI를 한 번 실행한다.
- 실패하면 같은 branch에서 evidence를 읽고 보정하며, 완전히 성공해야 correction PR을
  생성한다.
- PR merge 뒤 새 merge exact SHA의 native build·Linux GUI·evidence read-back을 한 번
  수행한 후 Issue #34를 닫는다.

## 승인 상태

- 작업지시자의 재개 지시에 따라 pre-PR branch GUI correction loop를 진행 중이다.
