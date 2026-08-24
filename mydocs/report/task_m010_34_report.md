# Task #34 최종 보고서 — Linux exact-SHA GUI acceptance 자동화

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
마일스톤: M010

## 작업 요약

- 대상 이슈: #34
- 마일스톤: M010
- 단계 수: 5개 본 Stage + 8개 post-merge/review 하위 Stage
- 작업 목적: 표준 GitHub-hosted Linux x64 runner에서 exact-SHA production DEB의 문서 UX·native dialog·PDF·system print를 반복 검증하고 증거를 보존하는 fail-closed acceptance gate를 구축한다.

기존 Colima x86_64 수동 검증을 공식 반복 gate로 승격하지 않고, `build_ref`와 native run ID가 일치하는 성공 artifact만 별도 수동 workflow가 소비하도록 구성했다. 제품 binary에는 WebDriver 전용 plugin을 추가하지 않았고 외부 `tauri-driver`·WebKitWebDriver, 공통 WebView harness와 Linux AT-SPI adapter 경계를 분리해 후속 Issue #35가 공통 계층만 재사용할 수 있게 했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `.github/workflows/alhangeul-linux-gui.yml` | exact input, read-only metadata handoff, DEB 설치, Linux GUI 실행, evidence와 final gate | 수동 Linux x64 acceptance Actions |
| `scripts/verify-workflow-artifact.mjs` | run/repository/SHA/workflow/event/conclusion과 exact artifact ID·digest 검증 | cross-run artifact 보안 경계 |
| `tests/gui/wdio*.ts`, `tests/gui/specs/`, `tests/gui/support/` | 공통 WDIO 설정, 공개 fixture, DOM 문서 UX와 evidence schema | 플랫폼 중립 GUI harness |
| `tests/gui/linux/`, `tests/gui/specs/linux-native.e2e.ts` | external driver probe, AT-SPI file/print adapter, bounded drag, Poppler PDF 분석 | Linux native dialog·출력 수용 |
| `tests/*workflow*.test.mjs`, `tests/gui-contracts.test.mjs`, `tests/linux-gui-probe.test.mjs` | handoff·workflow·공통/전용 경계의 fail-closed 계약 | platform-neutral automation gate |
| `package.json`, `pnpm-lock.yaml` | WebdriverIO/Tauri service와 TypeScript test toolchain 고정, 전체 test entrypoint | pnpm workspace 개발·CI 의존성 |
| `docs/operations/DESKTOP_RELEASE.md` | native build → Linux GUI dispatch → evidence read-back과 잔여 수동 gate | 공식 release 운영 절차 |
| `mydocs/plans/task_m010_34*.md`, `mydocs/working/task_m010_34_stage*.md`, `mydocs/orders/202608*.md` | 승인 계획, 5개 본 Stage·8개 하위 Stage 증적과 작업 보드 | Hyper-Waterfall 작업 기록 |

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
| 공통/Linux GUI E2E scenario | 없음 | 공통 문서 UX 1개 + Linux native 4개 |
| Linux native UI/PDF focused 계약 | 없음 | AT-SPI 5개 + drag 4개 + PDF 5개 |
| Linux GUI workflow 전용 source contract | 없음 | 9개, 공통 workflow와 합쳐 focused 21/21 |
| 전체 automation 통과 수 | Stage 1 완료 시 162개 | Stage 5.9 중단 checkpoint에서 204개 |
| 신규 workflow 외부 Action immutable pin | 해당 없음 | 4/4 full commit SHA + version 주석 |
| evidence 보존 | 수동·분산 | 성공·실패 모두 7일, context/handoff/hash/log/screenshot/PDF/summary 결속 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| exact SHA/run/artifact 결속 | OK — repository·head repository·40자리 SHA·workflow path·manual event·completed/success와 단일 nonexpired artifact ID·digest를 설치 전에 검증한다. |
| 변조·오결속 fail-closed | OK — 입력, run, artifact pagination/identity와 inventory 변조 fixture가 download/app 실행 전 실패한다. |
| 플랫폼 중립 harness와 Linux adapter 분리 | OK — 공통 설정·fixture·selector·evidence가 Linux adapter를 import하지 않고 external provider만 구성한다. |
| 문서 UX·저장·drag-in·출력 시나리오 | OK — 공개 HWP/HWPX fixture와 bounded timeout/no retry 계약으로 WDIO 5개 scenario를 구성했다. native 실행 결과는 merge 후 close gate로 남는다. |
| PDF 자동 판정 | OK — 6쪽 A4 metadata, 한글 text, 쪽별 content, blank/crop heuristic과 PNG evidence를 결합하며 시각 read-back 필요를 표시한다. |
| workflow 최소 권한·비용·Action pin | OK — `actions: read`, `contents: read`, `ubuntu-22.04`, manual dispatch, 45분 job/25분 GUI timeout, exact candidate concurrency와 4개 SHA pin을 고정했다. |
| 실패 증거·최종 판정 | OK — GUI failure와 evidence upload failure를 `always()` 뒤 final gate가 각각 실패로 전달하고 자동 retry를 금지한다. |
| 전체 platform-neutral regression | OK — product boundary 225 files, GUI TypeScript, 최신 automation 205/205, actionlint와 diff check 통과. upstream 35/35, Studio 97/97와 production build도 통과했다. |
| 실제 hosted Linux x64 GUI | MISS — 최신 branch run `32687090731`은 exact 환경 gate와 HWP/HWPX document scenario, GTK location entry의 focus·full path readback·activate까지 성공했다. entry의 87자 값이 fixture 절대 경로 길이와 일치했지만 chooser accept response가 발생하지 않았다. tree에서 확인한 `Open/click` action과 Save의 명시적 accept를 결합한 뒤 전체 경로를 다시 확정한다. |

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
- [Stage 5.9](../working/task_m010_34_stage5.9.md): CUPS evidence, hidden upload, headless 글꼴 modal을 보정하고 120초 전체-test timeout과 반복 window focus probe를 정적 분석해 bounded scenario timeout·단일 window 계약으로 분리했다. hosted 재실행 전 checkpoint에서 중단했다.
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

## 잔여 위험과 후속 작업

### 잔여 위험

- Stage 5.9의 timeout·window·초기 readiness와 document load, GTK anonymous location entry
  탐색·focus·입력은 hosted runner에서 성공했다. native open의 semantic activate 이후
  explicit accept와 save/drag/PDF/CUPS 출력은 새 보정 뒤 다시 확인해야 하므로 전체 성공은
  아직 주장할 수 없다.
  성공한 제품 artifact는 native run
  `32347468978`에 고정돼 있다.
- 다음 canary에서 production binary external driver 연결, localized accessibility selector, CUPS-PDF output name이나 hosted image drift가 추가로 발견될 수 있다. 실패 evidence를 보존하고 측정 근거가 있는 correction PR로만 보정한다.
- 자동 text/raster 판정만으로 한글 tofu를 확정하지 않는다. screenshot과 PDF render의 glyph·중앙 정렬·빈 쪽·crop을 사람이 read-back해야 한다.
- Linux arm64, RPM/AppImage desktop integration, 실제 GNOME/Xfce file manager와 physical printer는 자동화 범위 밖이다.

### 후속 작업 후보

- Stage 5.9 pre-PR branch GUI 성공 뒤 correction PR을 만들고, merge exact SHA에서 native build, Linux GUI dispatch, evidence hash 재검산과 시각 read-back.
- Issue #35: 공통 harness를 계승한 Windows exact-SHA GUI E2E acceptance.
- Issue #24: #34·#35 merge 뒤 최신 `devel` exact SHA에서 rhwp v0.8.4 제품 수용 Stage 3 재개.

## 작업지시자 승인 요청

- 갱신된 최종 보고서와 Stage 5.8 수용 기준을 승인하면 `devel` 대상 correction PR을 리뷰·merge하고, merge 후 live Linux x64 close gate를 진행한다.
