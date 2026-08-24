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
| `tests/gui/linux/native-ui/atspi.mjs`, `atspi_driver.py` | focused GTK location entry에 full path를 입력·readback하고 남은 chooser는 명시적 Open/Save accept로 완료하며, system print는 격리 desktop scope·실제 Ctrl+P·cell focus 뒤 selected state readback으로 탐색 |
| `tests/gui/linux/native-ui/drag-drop.mjs`, `drag_source.py` | Xdnd URI `DATA`와 GTK `drag-end` 완료를 모두 확인한 뒤 source를 정리하는 bounded lifecycle 계약 |
| `tests/gui/linux/native-print.mjs` | WebDriver 밖 production app을 fixture와 직접 실행해 GTK Print to File·취소·CUPS-PDF와 PDF evidence를 검증하고 `finally`에서 종료 |
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
- OK — semantic submit run `32687090731`에서 exact handoff·환경 gate·HWP/HWPX document
  scenario·evidence upload 통과. location entry의 focus·activate와 실제 path 길이 readback 뒤에도
  chooser accept response가 발생하지 않은 것을 측정하고 tree의 `Open/click` action 확인
- OK — GTK explicit accept와 full-target Save As 계약 뒤 focused `44/44`, automation
  `205/205`, GUI TypeScript, product boundary `225 files`, upstream `35/35`, Studio `97/97`,
  production Studio build, Python syntax, actionlint와 diff check 통과
- OK — explicit accept run `32688123494`에서 chooser close와 실제 HWP 6쪽 렌더,
  `파일 열기 완료` status 확인. native open failure tree가 생성되지 않아 GTK accept 경계는
  해소됐고, browser basename status만 성공으로 인정한 공통 document-load predicate가 새
  timeout의 원인임을 screenshot과 manifest로 확정
- OK — document-load predicate focused 계약 `33/33`, automation `206/206`, GUI TypeScript,
  product boundary `225 files`, upstream `35/35`, Studio `97/97`, production Studio build,
  Python syntax, actionlint와 diff check 통과. browser basename 또는 native 완료 status에 실제
  canvas와 기대 쪽 수를 결속하고 opening·canvas 부재·쪽 수 불일치 회귀를 고정
- OK — native load predicate run `32689152972`에서 document UX 2건, HWP/HWPX native
  Save As·현재 저장·재열기, 직접 PDF 6쪽 A4·한글 text·nonblank render와 evidence upload 통과
- OK — drag lifecycle·print desktop scope focused 계약 `13/13`, automation `209/209`, GUI
  TypeScript, product boundary `227 files`, upstream `35/35`, Studio `97/97`, production Studio
  build, Python syntax, actionlint와 diff check 통과
- OK — drag lifecycle·desktop print scope 보정 SHA
  `0181c8ca54914dd80932f7dcbfe195d4151c1c30`의 run `32690177647`에서 document UX 2건,
  HWP/HWPX native save 전체와 직접 PDF 6쪽 A4·한글 text·render가 재통과하고 evidence upload도
  성공했다.
- PARTIAL — 같은 run의 drag source는 `READY` 뒤 `DATA`/`FINISHED`를 내지 않아 lifecycle
  종료가 아니라 GTK drag-start threshold 미도달로 원인을 정정했다. system print의 desktop
  scope는 `xdg-desktop-portal-gtk`와 `Alhangeul` 두 application을 실제로 수집했지만 native
  dialog가 생성되지 않았다. 이전 run의 결정적 menu click과 이번 `Ctrl+P`가 모두 같은 결과라,
  selector·shortcut이 아니라 WebDriver-controlled WebView에서 `window.print()`가 native
  print signal로 이어지지 않는 실행 경계로 확정했다.
- OK — staged drag와 production native print phase 보정 뒤 focused GUI·workflow 계약
  `44/44`, 전체 automation `213/213`, GUI TypeScript, product boundary `227 files`, upstream
  `35/35`, Studio `97/97`, production Studio build, Python syntax, actionlint와 diff check 통과.
  production print는 문서 접근성 title과 선택형 local-font modal을 판정하고 upstream shortcut
  listener가 붙은 `문서 편집 입력` node에 focus한 뒤 `Ctrl+P`를 전송한다. 각 print 종료 뒤 같은
  document와 editor input 복원을 확인한다.
- OK — production phase 최초 run `32691466890`은 exact handoff·환경·evidence upload와
  WebDriver document 2건, native save 전체, 직접 PDF를 재통과했다. phase outcome은
  `nativePrint=1`, `webdriver=1`로 두 실패를 독립 보존했다.
- PARTIAL — production print screenshot은 6쪽 문서와 `로컬 글꼴 감지` modal을 정상
  보존했지만 harness가 optional modal보다 document title을 먼저 기다려 120초 교착됐다.
  optional modal 처리 뒤 완성 document·editor input을 기다리는 순서로 정정한다.
- PARTIAL — staged drag도 source에서 `DATA`/`FINISHED`가 발생하지 않았다. event window가 없는
  `Gtk.Label` 자체에 drag source를 연결한 경계를 GTK의 `Gtk.EventBox`로 옮기고
  `STARTED`/`DATA`/`FINISHED` marker를 분리해 다음 evidence가 start와 transfer를 구분하게 한다.
- OK — modal-first readiness와 `Gtk.EventBox` 보정 뒤 focused `45/45`, 전체 automation
  `214/214`, GUI TypeScript, product boundary `227 files`, actionlint와 diff check 통과.
- OK — 두 번째 production phase run `32691986182`도 exact handoff·환경·evidence upload와
  WebDriver document 2건, native save 전체, 직접 PDF를 재통과했다. `Gtk.EventBox` source는
  실제 HWPX open과 10쪽 render까지 완료해 drag start·URI transfer·drop 경계가 해소됐다.
- PARTIAL — native drag 뒤 Tauri는 제품의 `alhangeul-open-paths` 경계로 문서를 직접 열므로
  브라우저용 `로컬 파일 열기 확인` 없이 `로컬 글꼴 감지` modal로 진행했다. native harness에서
  존재하지 않는 확인 modal 계약을 제거하고 공통 local-font 선택 뒤 basename·쪽 수로 판정한다.
- PARTIAL — production print는 local-font modal을 정상 통과해 6쪽 문서를 완성했지만
  `문서 편집 입력` 접근성 node가 `focused=true`여도 `showing=false`라 기본 semantic selector에서
  제외됐다. 실제 `showing=true`, `focused=true`인 `document text` node에 focus·shortcut·복원을
  결속한다.
- OK — native drop·document focus 계약 보정 뒤 focused GUI 계약 `41/41`, 전체 automation
  `214/214`, GUI TypeScript, product boundary `227 files`, actionlint와 diff check 통과.
- OK — 세 번째 production phase run `32692570422`에서 WebDriver phase가 처음으로 전체
  성공(`webdriver=0`)했다. HWP/HWPX document 2건, native save, `Gtk.EventBox` drag-in,
  직접 PDF 6쪽과 evidence upload가 모두 통과했다.
- PARTIAL — native print는 `document text`를 즉시 찾았지만 해당 접근성 role은
  `grabFocus()`를 지원하지 않아 `AT-SPI focus failed`로 종료됐다. 이전 run tree에서 shortcut
  직전 같은 node가 이미 `focused=true`였고 focus 실패 뒤에는 false로 바뀐 것을 비교 확인했다.
  unsupported focus action 대신 `focused=true` semantic wait 뒤에만 Ctrl+P를 전송하고,
  더 이상 쓰이지 않는 AT-SPI focus command를 제거한다.
- OK — focused-document wait와 불필요한 focus command 제거 뒤 focused GUI 계약 `41/41`,
  전체 automation `214/214`, GUI TypeScript, Python syntax, product boundary `227 files`,
  actionlint와 diff check 통과.
- OK — focused-document wait SHA `61d96b2bc834fd0f502e2cab7258374fe083cbd3`의 run
  `32692937948`에서 WebDriver phase가 다시 전체 성공(`webdriver=0`)했다. production print도
  focused document의 Ctrl+P를 받아 GTK Print dialog까지 열고 `Print to File` row action을
  실행했다.
- PARTIAL — 같은 run의 native print는 file entry가 나타나지 않아 종료됐다. screenshot은
  `Print to File`이 아니라 CUPS `PDF` row가 계속 선택된 상태였고 tree에도 file entry가
  없었다. AT-SPI action 성공을 GTK selection 성공으로 오인한 harness 결함이며 selector를
  넓히지 않고 Selection interface의 `selectChild`와 `isChildSelected` readback으로 보정한다.
- OK — semantic row selection 보정 뒤 공통 GUI 계약 `19/19`, Linux GUI 계약 `23/23`,
  전체 automation `215/215`, GUI TypeScript, Python syntax, product boundary `228 files`,
  actionlint와 diff check 통과. selection helper를 분리해 구현 파일 300 LOC 상한도 유지했다.
- OK — 첫 semantic Selection 보정 SHA `fcea04bbd0f502ee0a26c04588d02678bac4853e`의 run
  `32693731543`에서도 WebDriver phase가 전체 성공(`webdriver=0`)했고 exact handoff·환경·
  evidence upload가 통과했다.
- PARTIAL — native print의 `selectChild()`는 `false`를 반환해 file entry 전에
  fail-closed했다. 새 tree는 `Print to File`이 selectable이지만 선택되지 않았고 CUPS `PDF`가
  선택되어 있으며, 행 action이 순서대로 `expand or contract`, `edit`, `activate`임을
  보존했다. 이전 무명 action은 첫 action을 실행했으므로 exact `activate` 뒤 동일 행의
  `selected=true`를 기다리는 계약으로 교체한다.
- OK — exact activate·selected readback 보정 뒤 공통 GUI 계약 `19/19`, Linux GUI 계약
  `23/23`, 전체 automation `215/215`, GUI TypeScript, Python syntax, product boundary
  `227 files`, actionlint와 diff check 통과. 구현 파일은 모두 300 LOC 이하를 유지했다.
- OK — exact activate 보정 SHA `5a9e536e9913a72bdf97e08cdbe066eeebba9149`의 run
  `32694223866`에서도 WebDriver phase 전체 성공(`webdriver=0`), exact handoff·환경·evidence
  upload가 통과했다.
- PARTIAL — `activate`는 printer row 선택이 아니라 row activation이었다. 실행 직후 print
  dialog가 닫혔고 현재 선택된 CUPS `PDF`로 실제 PDF가 생성됐으며, `Print to File`의
  `selected=true` wait가 timeout해 오판을 막았다. GTK 3 공식 접근성 구현이 cell focus에서
  `gtk_tree_view_set_cursor()`를 호출해 row를 선택하므로, cell `grabFocus()` 뒤 selected state
  readback으로 교체한다.
- OK — printer cell focus·selected readback 보정 뒤 공통 GUI 계약 `19/19`, Linux GUI 계약
  `23/23`, 전체 automation `215/215`, GUI TypeScript, Python syntax, product boundary
  `227 files`, actionlint와 diff check 통과. 구현 파일은 모두 300 LOC 이하를 유지했다.
- OK — printer cell focus SHA `b1dd9d7701b9132def3f1ad65a0ace7171ae2b2a`의 run
  `32694887391`에서도 WebDriver phase 전체 성공(`webdriver=0`), exact handoff·환경·evidence
  upload가 통과했다. native tree의 `Print to File` cell은 실제로 `focused=true`,
  `selected=true`였고 CUPS `PDF`는 `selected=false`여서 selection 경계가 해소됐다.
- PARTIAL — 같은 run의 native print는 선택 뒤 `text/entry` file field를 기다려 timeout됐다.
  failure tree와 screenshot의 `File:` control은 `.../alhangeul-tauri/output.pdf` name과 `click`
  action을 가진 `push button`이었다. GTK 3 공식 source도 FILESAVE printer option을 button으로
  만들고 click 시 `Select a filename` save chooser, `_Select` accept response를 사용한다.
- OK — Print to File path button → focused chooser location full target → explicit `Select` →
  chooser close → button basename readback → `Print` 순서로 보정한 뒤 공통 GUI 계약 `19/19`,
  Linux GUI 계약 `23/23`, 전체 automation `215/215`, GUI TypeScript와 product boundary
  `227 files`를 통과했다. adapter·driver·focused test 파일은 모두 300 LOC 이하를 유지했다.
- OK — chooser 보정 SHA `06e1be8c3d1ced74cf8f565c2aa6214dc261c087`의 run
  `32695710117`도 WebDriver phase 전체 성공(`webdriver=0`)과 exact handoff·환경·evidence
  upload를 통과했다. native tree의 path button이 실제 target basename
  `biz-plan-gtk-print.pdf`로 바뀌어 chooser open·path submit·`Select`·close·basename readback을
  모두 확인했다.
- PARTIAL — 다음 `Print` selector가 substring `print`를 사용해 target 경로 button의
  `gtk-print.pdf`도 일치시켰고, chooser를 다시 연 뒤 print dialog close가 process timeout으로
  종료됐다. dialog action button에는 normalized exact-name 조건을 추가하고 `Print`, `Cancel`,
  file chooser의 `Open`, `Save`, `Select`에만 적용한다. printer row와 path button의 기존
  semantic role·ancestor 조건은 유지한다.
- OK — exact dialog action selector 보정 뒤 공통 GUI 계약 `19/19`, Linux GUI 계약 `23/23`,
  GUI TypeScript를 통과했고 adapter `296`, driver `300`, focused test `231` LOC로 상한을 지켰다.
- OK — exact-name 보정 SHA `fd3a2d90a408c3eff403b215827ed7352f3a0265`의 run
  `32696413151`도 WebDriver phase 전체 성공(`webdriver=0`), exact handoff·환경·evidence
  upload를 통과했다. native print는 `Print to File` 선택, chooser full path, explicit `Select`,
  chooser close와 target basename readback까지 다시 성공했다.
- PARTIAL — exact `Print` button은 failure tree에서 `enabled=true`, `sensitive=true`, `click`
  action을 제공했지만 `AtkAction.doAction()`이 JSON 응답 없이 process timeout됐고 dialog가
  그대로 남았다. print response만 exact semantic selector의 button extents를 읽어 격리 X11
  session에서 중심점을 한 번 click하고, dialog close와 생성 파일을 별도로 판정하도록 보정한다.
- OK — semantic bounds 보정 SHA `6905cffab75c5536a0f7458e0126f337f8353746`의 run
  `32697224452`도 WebDriver phase 전체 성공(`webdriver=0`), exact handoff·환경·evidence
  upload와 chooser·target basename readback을 통과했다.
- PARTIAL — 같은 run은 GTK/CUPS PDF를 만들지 못하고 동일 print dialog를 남긴 채 JSON response
  timeout으로 종료됐다. synchronous `Component.getExtents()` 경계를 제거하고, 이미 hosted GTK
  printer cell에서 검증한 `grabFocus()`를 exact `Print` button에 적용해 `focused=true`를
  readback한 뒤 X11 `space` 한 번으로 활성화한다.
- OK — exact-focus 보정 SHA `629fb6483a9ffc16ba7ca261f294f0e263014a38`의 run
  `32697878886`도 WebDriver phase 전체 성공(`webdriver=0`), exact handoff·환경·evidence
  upload와 chooser·target basename readback을 통과했다.
- PARTIAL — exact `Print` button은 끝까지 `focused=false`였고 GTK/CUPS PDF가 없었다. GTK 3 공식
  source가 `_Print`를 `GTK_RESPONSE_OK`와 default response로 정의하므로 button의 synchronous
  component/action API를 제거한다. exact button readiness만 확인하고 GTK mnemonic `Alt+P` 한
  번으로 response를 활성화한 뒤 dialog close와 파일/PDF 판정을 유지한다.
- OK — mnemonic 보정 SHA `07935edd6d9c9bcb725a292bb533be76f837b939`의 run
  `32698528620`도 WebDriver phase 전체 성공(`webdriver=0`), exact handoff·환경·evidence
  upload와 chooser·target basename readback을 통과했다.
- PARTIAL — active X11 window를 지정하지 않은 `Alt+P` 뒤에도 GTK/CUPS PDF 없이 동일 dialog가
  남았다. exact visible `Print`/`인쇄` window cardinality 1을 확인하고 활성화한 뒤 mnemonic을
  보내며, AT-SPI timeout은 command와 child-process error를 보존하도록 진단 계약도 함께 닫는다.
- OK — exact-window·timeout 진단 SHA `25e6321fcbf87497f8fba4db14116f0c74f5a02b`의 run
  `32699339501`은 WebDriver phase 전체 성공(`webdriver=0`)과 exact handoff·evidence upload를
  유지하면서 실패 명령을 `actionIfPresent`로 노출했다.
- PARTIAL — failure tree에는 chooser가 이미 닫히고 `biz-plan-gtk-print.pdf` basename이 Print
  dialog에 반영돼 있다. action 성공 뒤 defunct GTK node에서 `node_info`를 다시 읽는 교착으로
  확정하고, 모든 UI-mutating action이 stable info를 action 전에 캡처하도록 공통화한다.

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
- semantic submit SHA `bb235d34cafedef616a0ff56a19424bfd734b1c9`의 run
  `32687090731`도 open chooser close에서 실패했지만 새 evidence는 원인을 다시 좁혔다. 보이는
  location entry는 `focused=true`, `actions=["activate"]`, `textLength=87`이었고 fixture의 CI
  절대 경로도 정확히 87자였다. focus·값 설정·exact readback·entry activate가 모두 성공한 뒤
  dialog만 남았으며, 같은 tree의 보이는 `Open` button은 `click` action을 제공했다. GTK
  file chooser의 entry activate와 dialog accept response를 분리해, dialog가 남아 있으면
  explicit `Open`/`Save`를 수행한다. Save As도 full target path를 같은 location entry에 넣어
  directory/basename field 추측을 제거한다.
- explicit accept SHA `ef5831bd8c6255b90fa67ba9764b54eeab3ca179`의 run
  `32688123494`에서는 open chooser가 닫혀 `open-document` failure tree가 더 이상 생성되지
  않았다. native save final screenshot은 `biz_plan.hwp` 1/6쪽과 `파일 열기 완료`를 보였지만
  scenario manifest는 basename을 status에 요구하던 `waitForLoadedDocument()` timeout을
  기록했다. native wrapper가 완료 시 basename status를 `파일 열기 완료`로 덮는 제품 계약과
  공용 predicate가 충돌한 harness 오판이다. browser basename 또는 정확한 native 완료 status,
  실제 render canvas와 기대 쪽 수를 함께 판정하고 완료 문구 단독 통과는 금지한다.
- native load predicate SHA `a12a99aceee8d332f74e40a1b64d14031a64b167`의 run
  `32689152972`은 앞선 native open 오판을 제거하고 native save와 direct PDF를 모두
  성공시켰다. drag-in은 gesture 직후 helper source가 종료돼 비동기 URI 요청 완료를 기다리지
  않은 harness lifecycle 결함으로 좁혀졌다. system print 실패 tree는 `Alhangeul` application
  1개와 main frame만 포함해, 별도 GTK/WebKit print application을 구조상 탐색할 수 없었다.
  제품 인쇄 구현은 바꾸지 않고 drag data/end marker와 실제 `Ctrl+P`, print 전용 desktop
  scope·dialog ancestor 계약을 함께 적용한다.

## 다음 단계 영향

- GTK Print to File chooser 보정을 commit·push한 뒤 성공한 제품 native run `32347468978`을
  재사용해 immutable acceptance workflow SHA의 branch GUI를 실행한다.
- 실패하면 같은 branch에서 evidence를 읽고 보정하며, 완전히 성공해야 correction PR을
  생성한다.
- PR merge 뒤 새 merge exact SHA의 native build·Linux GUI·evidence read-back을 한 번
  수행한 후 Issue #34를 닫는다.

## 승인 상태

- 작업지시자의 재개 지시에 따라 pre-PR branch GUI correction loop를 진행 중이다.
