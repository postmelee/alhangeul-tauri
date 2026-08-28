# Task #34 최종 보고서 — Linux exact-SHA GUI acceptance 자동화

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
마일스톤: M010

## 작업 요약

- 대상 이슈: #34
- 마일스톤: M010
- 단계 수: 5개 본 Stage + 10개 post-merge/review 하위 Stage
- 작업 목적: 표준 GitHub-hosted Linux x64 runner에서 exact-SHA production DEB의 문서 UX·native dialog·PDF·system print를 반복 검증하고 증거를 보존하는 fail-closed acceptance gate를 구축한다.

기존 Colima x86_64 수동 검증을 공식 반복 gate로 승격하지 않고, `build_ref`와 native run ID가 일치하는 성공 artifact만 별도 수동 workflow가 소비하도록 구성했다. 제품 binary에는 WebDriver 전용 plugin을 추가하지 않았고 외부 `tauri-driver`·WebKitWebDriver, 공통 WebView harness와 Linux AT-SPI adapter 경계를 분리해 후속 Issue #35가 공통 계층만 재사용할 수 있게 했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `.github/workflows/alhangeul-linux-gui.yml` | exact input, read-only metadata handoff, DEB 설치, Linux GUI 실행, evidence와 final gate | 수동 Linux x64 acceptance Actions |
| `scripts/verify-workflow-artifact.mjs` | run/repository/SHA/workflow/event/conclusion과 exact artifact ID·digest 검증 | cross-run artifact 보안 경계 |
| `tests/gui/wdio*.ts`, `tests/gui/specs/`, `tests/gui/support/` | 공통 WDIO 설정, 공개 fixture, DOM 문서 UX와 evidence schema | 플랫폼 중립 GUI harness |
| `tests/gui/linux/`, `tests/gui/specs/linux-native.e2e.ts` | external driver probe, AT-SPI file/print adapter, bounded drag, production native print phase, Poppler PDF 분석 | Linux native dialog·출력 수용 |
| `tests/*workflow*.test.mjs`, `tests/gui-contracts.test.mjs`, `tests/linux-gui-probe.test.mjs` | handoff·workflow·공통/전용 경계의 fail-closed 계약 | platform-neutral automation gate |
| `package.json`, `pnpm-lock.yaml` | WebdriverIO/Tauri service와 TypeScript test toolchain 고정, 전체 test entrypoint | pnpm workspace 개발·CI 의존성 |
| `docs/operations/DESKTOP_RELEASE.md` | native build → Linux GUI dispatch → evidence read-back과 잔여 수동 gate | 공식 release 운영 절차 |
| `mydocs/plans/task_m010_34*.md`, `mydocs/working/task_m010_34_stage*.md`, `mydocs/orders/202608*.md` | 승인 계획, 5개 본 Stage·9개 하위 Stage 증적과 작업 보드 | Hyper-Waterfall 작업 기록 |

제품 Rust/TypeScript runtime과 `third_party/rhwp`, 기존 desktop build workflow는 변경하지 않았다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| Linux GUI release gate | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | 수행계획의 장기 release 운영 계약 위치에 native build·GUI·evidence 순서를 추가했다. |
| 개발·재현 진입점 | 필요할 때만 `docs/DEVELOPMENT.md` | 변경 없음 | OK | 로컬 macOS에서 production Linux GUI를 실행하는 명령을 제공하지 않으며 운영 workflow 절차만으로 충분해 불필요한 문서 증식을 피했다. |
| 단계·최종 증적 | `mydocs/plans`, `working`, `report`, `orders` | 동일 | OK | 제품 문서와 내부 승인·검증 기록을 분리했다. |

새 공식 문서 루트나 `mydocs/manual` 문서는 만들지 않았다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---:|---:|
| GitHub Actions workflow inventory | 4개 | 5개 — 수동 Linux x64 GUI workflow 1개 추가 |
| exact cross-run artifact provenance helper | 없음 | 259행 helper와 정상·변조·누락·중복·pagination 계약 30개 |
| 공통/Linux GUI E2E scenario | 없음 | 공통 문서 UX 2개 + Linux WebDriver native 3개 + production native print 1개 |
| Linux native UI/PDF focused 계약 | 없음 | AT-SPI 8개 + drag 6개 + production print 2개 + PDF 5개 |
| Linux GUI workflow 전용 source contract | 없음 | 9개, 공통 workflow와 합쳐 focused 21/21 |
| 전체 automation 통과 수 | Stage 1 완료 시 162개 | Stage 5.10 branch exact SHA의 Windows/Linux에서 224개 |
| 신규 workflow 외부 Action immutable pin | 해당 없음 | 4/4 full commit SHA + version 주석 |
| evidence 보존 | 수동·분산 | 성공·실패 모두 7일, context/handoff/hash/log/screenshot/PDF/summary 결속 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| exact SHA/run/artifact 결속 | OK — repository·head repository·40자리 SHA·workflow path·manual event·completed/success와 단일 nonexpired artifact ID·digest를 설치 전에 검증한다. |
| 변조·오결속 fail-closed | OK — 입력, run, artifact pagination/identity와 inventory 변조 fixture가 download/app 실행 전 실패한다. |
| 플랫폼 중립 harness와 Linux adapter 분리 | OK — 공통 설정·fixture·selector·evidence가 Linux adapter를 import하지 않고 external provider만 구성한다. |
| 문서 UX·저장·drag-in·출력 시나리오 | OK — 공개 HWP/HWPX fixture와 bounded timeout/no retry 계약으로 공통 문서 2개, Linux WebDriver 3개, production native print 1개의 scenario를 구성하고 hosted branch run에서 모두 통과했다. |
| PDF 자동 판정 | OK — 6쪽 A4 metadata, 한글 text, 쪽별 content, blank/crop heuristic과 PNG evidence를 결합하며 시각 read-back 필요를 표시한다. |
| workflow 최소 권한·비용·Action pin | OK — `actions: read`, `contents: read`, `ubuntu-22.04`, manual dispatch, 45분 job/25분 GUI timeout, exact candidate concurrency와 4개 SHA pin을 고정했다. |
| 실패 증거·최종 판정 | OK — GUI failure와 evidence upload failure를 `always()` 뒤 final gate가 각각 실패로 전달하고 자동 retry를 금지한다. |
| 전체 platform-neutral regression | OK — 최종 문서 포함 product boundary 236 files, GUI TypeScript, automation 224/224, actionlint와 diff check를 통과했다. upstream 35/35, Studio 97/97와 production build도 통과했다. |
| 실제 hosted Linux x64 GUI | OK — acceptance SHA `ca0902e1c24eab1ea4a80783a89684e842dc7e3b`의 [run 32707120322](https://github.com/postmelee/alhangeul-tauri/actions/runs/32707120322)이 검증된 product SHA `ceb8b3ba7283152ae37d6c5de5e9317b54ee5499`와 native run `32347468978`을 handoff해 `nativePrint=0`, `webdriver=0`으로 성공했다. HWP/HWPX open·Save As·현재 저장·재열기, drag-in, 직접 PDF, GTK Print to File·취소·CUPS-PDF와 editor restore를 모두 확인했다. |
| Stage 5.10 cross-platform native gate | OK — branch exact SHA `0e053613dbad28c6ec3a824336acae959735ac06`의 [run 32866224614](https://github.com/postmelee/alhangeul-tauri/actions/runs/32866224614)에서 Windows automation 224/224와 bundle, Windows installer smoke, Linux x64·arm64 bundle이 모두 성공했다. |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_34_stage1.md): exact run/artifact handoff focused 30/30, automation 162/162, 제품 경계 202개 파일 통과.
- [Stage 2](../working/task_m010_34_stage2.md): 공통 GUI 계약 11/11, automation 173/173, Studio 97/97·build 통과.
- [Stage 3](../working/task_m010_34_stage3.md): Linux native UI/PDF focused 12/12, automation 185/185, TypeScript/Python 정적 검사 통과.
- [Stage 4](../working/task_m010_34_stage4.md): workflow focused 21/21, automation 194/194, upstream 35/35, Studio 97/97·build와 actionlint 통과.
- [Stage 5](../working/task_m010_34_stage5.md): frozen install, 전체 중립 gate, 최신 `origin/devel` ancestry, changed path·permission·Action pin 독립 점검 통과.
- [Stage 5.1](../working/task_m010_34_stage5.1.md): PR #36 리뷰의 evidence 보존·GUI typecheck·현재 저장·A4/CUPS·PDF 임시 산출물과 저위험 진단 보정을 적용하고 automation 199/199을 통과.
- [Stage 5.2](../working/task_m010_34_stage5.2.md): merged exact-SHA Windows 계약에서 발견한 Linux POSIX path와 host-neutral fixture를 보정하고 native gate를 복구.
- [Stage 5.3](../working/task_m010_34_stage5.3.md): Linux helper의 delimiter·join·절대 경로 의미를 단일 POSIX path API 소유권으로 고정.
- [Stage 5.4](../working/task_m010_34_stage5.4.md): first GUI canary가 발견한 CUPS-PDF 주석 directive 차이를 진단 가능한 정규화로 보정.
- [Stage 5.5](../working/task_m010_34_stage5.5.md): PR #39 리뷰의 fatal 진단과 주석 치환 부작용을 delete-and-append 계약으로 제거.
- [Stage 5.6](../working/task_m010_34_stage5.6.md): latest GUI canary가 발견한 exact `PageSize=A4` 직렬화 가정을 단일 A4 설정과 `lpoptions -l` 선택 기본값 판정으로 교체하고 automation 201/201을 통과.
- [Stage 5.7](../working/task_m010_34_stage5.7.md): exact tauri-driver 설치와 CUPS `*A4` 성공 뒤 드러난 미지원 `--version` 환경 증거 호출을 pinned install input 출력으로 교체하고 automation 201/201을 통과.
- [Stage 5.8](../working/task_m010_34_stage5.8.md): WebKitWebDriver의 미지원 `--version` 호출을 fail-closed binary 탐색과 Debian 패키지 버전 증거로 분리하고 automation 201/201을 통과.
- [Stage 5.9](../working/task_m010_34_stage5.9.md): CUPS evidence, hidden upload, native chooser·drag·print 경계와 phase session 격리를 측정 기반으로 보정하고 branch exact-SHA GUI gate를 완료했다.
- [Stage 5.10](../working/task_m010_34_stage5.10.md): Windows drive-letter fixture와 production POSIX path 계약을 단일 주입 API로 분리하고 exact-SHA Windows/Linux native gate와 installer smoke를 복구했다.
- Stage 5.9 재개 run `32562596576`에서 timeout·window 보정은 실제 runner에서 확인됐고,
  제거된 focus 지연 때문에 노출된 최초 file listener readiness race를 초기 status와
  toolbar-ready 결합 gate로 후속 보정했다.
- readiness run `32563034022`은 screenshot상 초기 status가 표시돼도 WebDriver 요소 text가
  빈 문자열인 WebKitGTK 측정 차이를 확인했다. page context `textContent`로 준비 상태를
  판정해 listener 설치 이후에만 첫 upload를 수행하도록 후속 보정했다. 보정 뒤 focused
  `26/26`, GUI TypeScript, product boundary `225 files`, automation `204/204`, actionlint를
  다시 통과했다.
- 다음 run `32563490588`은 GUI acceptance 실행 중 작업지시자 요청으로 취소되어 판정에서
  제외했다. 재개 시 남은 모든 open·save·drag·PDF·print 경로를 통합 감사하고 status DOM
  판독, spec별 readiness, native local-font 선택과 drag-in 열기 확인을 공통화했다. focused
  `35/35`, automation `204/204`, upstream `35/35`, Studio `97/97`, product boundary 225개와
  production Studio build를 통과했다.
- 통합 감사 SHA `c8ff26c`의 run `32601165367`은 모든 환경 gate 뒤 HWP/HWPX를 각각 6/10쪽으로
  렌더하고 중앙 정렬 screenshot을 보존했다. log의 고정 `Alhangeul` title과 basename status를
  대조해, upstream hidden input과 native session title 계약을 혼합한 harness 오류로 확정했다.
  open readiness는 status·쪽 수로 판정하고 native title은 native command snapshot에서 유지한다.
  쪽 수와 snapshot도 WebKitGTK 요소 text API 대신 DOM `textContent`로 공통화했다. 보정 뒤
  focused `38/38`, automation `204/204`, product boundary 225개, upstream `35/35`, Studio
  `97/97`, production Studio build, GUI TypeScript와 actionlint를 통과했다.
- title 계약 분리 SHA `c365cd0`의 run `32601678616`은 document UX 2건을 성공시켰고 native
  suite까지 진입했다. 첫 open failure tree에서 GTK chooser와 `Location Layer`를 확인했으나
  editable node는 이름이 없어 기존 selector가 거부했다. 나머지 drag/PDF/print failure도
  문서를 열지 못한 같은 선행 원인이다. editable role은 file chooser/print dialog ancestor
  안에서만 허용하고 anonymous field도 실패 tree에 보존하도록 보정했다. 보정 뒤 focused
  `44/44`, automation `205/205`, product boundary 225개, upstream `35/35`, Studio `97/97`,
  production Studio build, GUI TypeScript, Python syntax와 actionlint를 통과했다.
- ancestor scope SHA `968c95959aa87ef9d72133a11be15ba8bf2d5a82`의 run
  `32602426011`은 이름 없는 GTK location entry를 chooser ancestor 안에서 찾아 경로 값을
  설정했지만 AT-SPI 값 설정과 별도 `Return` 사이에 focus가 보장되지 않은 채 chooser close가
  timeout됐다.
  screenshot은 빈 editor와 `파일 열기 중...` status를, tree는 보이는 `Location Layer`와 anonymous
  text node를 보존했다. 첫 chooser 잔류 뒤의 drag/PDF/print 실패는 별도 결함이 아니므로
  `setText`를 같은 node의 focus·값 갱신 원자 계약으로 보정했다. 보정 뒤 focused `44/44`,
  automation `205/205`, GUI TypeScript, product boundary 225개, upstream `35/35`, Studio
  `97/97`, production Studio build, Python syntax와 actionlint를 통과했다.
- focus 보정 SHA `965fbb6ecf6da5d47c22e3980e124b304a4a88a4`의 run
  `32685969832`은 HWP/HWPX document scenario를 각각 약 2초에 성공시키고 location entry
  focus·값 설정도 통과했지만 chooser close에서 같은 120초 timeout이 발생했다. 따라서
  focus 부재를 직접 원인으로 본 앞선 진단을 정정하고 AT-SPI 값 설정과 별도 X11 `Return`
  사이의 submit 경계를 제거했다. GTK entry의 accessible `activate`를 같은 node에서 수행하며,
  exact text readback과 비민감 focus·action·길이 진단을 추가했다. 보정 뒤 focused `44/44`,
  automation `205/205`, GUI TypeScript, product boundary 225개, upstream `35/35`, Studio
  `97/97`, production Studio build, Python syntax, actionlint와 diff check를 통과했다.
- semantic submit SHA `bb235d34cafedef616a0ff56a19424bfd734b1c9`의 run
  `32687090731`은 exact handoff·환경·document UX 2건과 evidence upload를 통과했지만 native
  open chooser close가 timeout됐다. 실패 tree에서 location entry는 focus·`activate` action과
  fixture 절대 경로와 같은 87자 readback을 보존했고, 보이는 `Open` button은 `click` action을
  제공했다. 따라서 입력 실패가 아니라 chooser accept response 부재로 확정했다. focused
  location entry에 full path를 제출한 뒤 dialog가 남으면 명시적 `Open`/`Save`를 수행하고,
  Save As의 directory/basename 2단계 selector 추측도 제거했다. 보정 뒤 focused `44/44`,
  automation `205/205`, GUI TypeScript, product boundary 225개, upstream `35/35`, Studio
  `97/97`, production Studio build, Python syntax, actionlint와 diff check를 통과했다.
- explicit accept SHA `ef5831bd8c6255b90fa67ba9764b54eeab3ca179`의 run
  `32688123494`은 첫 GTK chooser를 정상 종료하고 HWP 1/6쪽과 `파일 열기 완료`를 final
  screenshot에 보존했다. `open-document` failure tree도 없어 explicit accept는 성공으로
  확인됐다. 공통 load helper가 browser file-input의 basename status만 인정해 정상 native
  완료를 timeout 처리한 것이 다음 단일 원인이다. browser basename 또는 정확한 native 완료
  status에 실제 render canvas와 기대 쪽 수를 함께 요구하는 판정으로 보정했으며 focused
  계약 `33/33`, automation `206/206`, GUI TypeScript, product boundary 225개, upstream
  `35/35`, Studio `97/97`, production build, Python syntax, actionlint와 diff check를 통과했다.
- native load predicate SHA `a12a99aceee8d332f74e40a1b64d14031a64b167`의 run
  `32689152972`은 document UX 2건과 native save 전체, 직접 PDF 분석·evidence를 성공시켰다.
  drag failure는 mouseup 직후 source를 종료한 Xdnd lifecycle, system print failure는
  `Alhangeul` application 하나만 조회한 AT-SPI scope로 각각 독립 측정됐다. URI data/end를
  기다리는 source lifecycle과 실제 `Ctrl+P`, print 전용 isolated desktop scope를 추가했고
  focused `13/13`, automation `209/209`, product boundary 227개, upstream `35/35`, Studio
  `97/97`, production build, GUI TypeScript, Python syntax, actionlint와 diff check를 통과했다.
- drag lifecycle·desktop scope SHA `0181c8ca54914dd80932f7dcbfe195d4151c1c30`의 run
  `32690177647`은 저장·직접 PDF의 성공을 재확인하고 print tree에서 portal과 앱을 모두
  관측했다. drag source가 `READY` 외 marker를 내지 않은 것은 source 조기 종료가 아니라
  drag-start threshold 미도달을 뜻한다. 또한 결정적 menu click과 `Ctrl+P` 양쪽 모두
  WebDriver-controlled WebView에서 print dialog를 만들지 못했으므로, 제품 print를 바꾸지 않고
  system print만 production app 직접 실행 phase로 분리한다.
- staged drag·production print phase 구현 뒤 focused `44/44`, automation `213/213`, GUI
  TypeScript, product boundary 227개, upstream `35/35`, Studio `97/97`, production build,
  Python syntax, actionlint와 diff check를 통과했다. workflow는 production native print와
  WebDriver phase를 순서대로 실행하되 한 phase가 실패해도 다른 evidence를 수집한 뒤 두 exit
  status를 합산한다.
- 최초 분리 run `32691466890`은 모든 environment/evidence gate와 기존 document/save/direct
  PDF를 다시 통과했지만 두 phase가 각각 실패했다. production print screenshot에서 optional
  local-font modal이 열린 상태를 확인해 document-first 순서 교착으로 확정했고, drag source는
  staged gesture에도 start/data/end marker가 없어 event window가 없는 `Gtk.Label` 경계로
  좁혔다. modal-first readiness와 `Gtk.EventBox` source로 두 계약을 함께 보정한다.
- 위 두 계약 보정 뒤 focused `45/45`, automation `214/214`, GUI TypeScript, product
  boundary 227개, actionlint와 diff check를 통과했다.
- 최종 acceptance workflow SHA `ca0902e1c24eab1ea4a80783a89684e842dc7e3b`의 run
  `32707120322`은 production native print와 WebDriver를 독립 Xvfb·DBus·Openbox session에서
  실행해 `nativePrint=0`, `webdriver=0`으로 성공했다. 6개 scenario manifest의 size·SHA-256을
  재검산했고 GTK·CUPS·직접 PDF가 각각 6쪽 A4, 제목·한글 text와 nonblank render를 보존했다.
  GTK 첫 쪽, CUPS 마지막 쪽, 직접 PDF 본문, system print editor restore와 drag-in 최종 화면도
  시각 확인했다. PR 직전에는 frozen install, 최종 문서 포함 product boundary 236개, 제품 version·release
  metadata·rhwp pin, automation `224/224`, upstream `35/35`, Studio `97/97`, production build,
  GUI TypeScript, actionlint와 diff check를 다시 통과했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- Stage 5.10 branch native gate는 보정 코드 exact SHA를 Windows/Linux에서 검증했다. PR merge
  뒤에는 workflow와 product가 같은 새 merge exact SHA인 native build·Linux GUI close gate를
  다시 성공시키고 evidence hash·화면을 read-back해야 Issue #34를 닫을 수 있다.
- hosted Ubuntu 22.04 image, AT-SPI selector와 CUPS-PDF 출력 계약의 향후 drift는 자동 gate가
  fail-closed로 탐지하지만 환경 drift 자체를 예방하지는 않는다.
- Linux arm64, RPM/AppImage desktop integration, 실제 GNOME/Xfce file manager와 physical
  printer는 이번 자동화 범위 밖이다.

### 후속 작업 후보

- correction PR merge exact SHA에서 native build, Linux GUI dispatch, evidence hash 재검산과 시각 read-back 후 Issue #34 close.
- Issue #35: 공통 harness를 계승한 Windows exact-SHA GUI E2E acceptance.
- Issue #24: #34·#35 merge 뒤 최신 `devel` exact SHA에서 rhwp v0.8.4 제품 수용 Stage 3 재개.

## 작업지시자 승인 요청

- Stage 5.10 최종 보고서와 branch exact-SHA 수용 결과를 승인하면 `devel` 대상 correction PR을
  게시한다. merge 승인은 작업지시자가 별도로 결정한다.
