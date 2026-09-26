# Task #76 구현계획서

수행계획서: [task_m010_76.md](task_m010_76.md)
GitHub Issue: [#76](https://github.com/postmelee/alhangeul-tauri/issues/76)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 운영 설정과 후보 생성 | writer gate, sync run, Draft PR | stable provenance, 반복 입력 멱등성 |
| 2 | v0.8.6 통합 | gitlink·WASM·locks·관리 참조, 최소 adapter 보정 | pin/neutral/native 회귀 |
| 3 | 설치본과 인계 | full CI, Linux GUI, Windows 점검 안내 | exact artifact/inventory/hash, 실제 화면·저장 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| UPSTREAM.md, LOCAL_FONTS.md | docs/architecture/ | 기존 위치 | OK | 실제 변경에 필요한 부분만 |
| DEVELOPMENT.md, README.md | 기존 위치 | 기존 위치 | OK | managed references |
| WINDOWS_FONT_ACCEPTANCE.md | docs/operations/ | 필요 시 동일 경로 | OK | 사용자 최종 설치본 점검 |
| 계획·단계·최종 보고 | mydocs/ | plans/, working/, report/ | OK | 내부 이력 |

## Stage 1 — 운영 설정과 후보 생성

### 산출물

- ALHANGEUL_UPSTREAM_SYNC_ENABLED=true 운영 설정.
- v0.8.6 sync run과 Draft 후보 PR, 반복 dispatch 증거.
- mydocs/working/task_m010_76_stage1.md.

### 변경 내용

- #74 병합 devel에서 기존 writer를 활성화하고 target_tag=v0.8.6, dry_run=false로 실행한다.
- 자동 검증이 실패하면 실패 지점과 수정 범위를 기록하고 성공 전 후보 수용을 선언하지 않는다.
- 후보 head를 보존한 반복 실행으로 existing_pr·추가 커밋 없음 확인.

### 검증

- live variable, run logs, candidate head pin, 반복 run decision.
- pnpm run test:automation, git diff --check.

### 커밋

`Task #76 Stage 1: 동기화 운영과 stable 후보 생성 검증`

## Stage 2 — stable 통합과 호환성 수용

### 산출물

- third_party/rhwp gitlink, vendor WASM, rhwp-core.lock, Cargo.lock과 관리 참조.
- 필요한 제품 adapter·회귀와 mydocs/working/task_m010_76_stage2.md.

### 변경 내용

- 자동 후보를 local/task76에 통합한다. 직접 upstream 소스를 패치하지 않는다.
- core·Studio·WASM release 기준을 일치시키고 기존 제품 소유 adapter를 새 API에 맞춘다.
- #74 글꼴 설정·별칭·새 창·재시작 회귀를 유지한다.

### 검증

- pnpm run check:rhwp-pin, check:product-boundary, check:product-version, check:release-metadata.
- pnpm run test:upstream, test:studio, build:studio.
- Linux CI native test:desktop·clippy:desktop, git diff --check.

### 커밋

`Task #76 Stage 2: rhwp v0.8.6 core·Studio·WASM 수용`

## Stage 3 — 설치본과 최종 인계

### 산출물

- Windows x64·Linux x64/arm64 full CI와 exact Linux GUI 증거.
- docs/operations/WINDOWS_FONT_ACCEPTANCE.md와 stage3/final 보고서.

### 변경 내용

- 최종 제품 source SHA에서 full producer를 실행하고 동일 producer 설치본을 Linux GUI에 전달한다.
- MSI/NSIS 원시 제한을 구분하고 archive digest, inventory, NSIS SHA256을 확인한다.
- Windows 설치→글꼴 감지→실제 표시→새 창/재시작→저장→재열기 점검을 사용자가 수행하도록 링크와 예상 결과를 정리한다.
- 자동 후보와 최종 수용 PR 관계를 기록하고 승인된 devel 반영 후 불필요한 작업 브랜치만 정리한다.

### 검증

- full CI와 Linux full/local-fonts GUI 통과, 저장 산출물 확인.
- archive digest/inventory/source SHA 대조, git diff --check.

### 커밋

`Task #76 Stage 3 + 최종 보고서: 새 설치본 검증과 Windows 최종 점검 인계`

## 검증·커밋·단계 의존성

- 각 단계의 검증 결과와 보고서를 함께 커밋하고 다음 단계로 진행한다.
- 실패는 보고에 보존한다. 필수 검증 실패 상태로 완료 처리하지 않는다.
- 실행 의존성에 따라 후보 preflight의 호환성 수정은 Stage 1 실패 해결과 Stage 2 구현을 연결해 진행할 수 있으며 실제 순서와 근거를 보고한다.

## 위험과 대응

- 새 API 호환성 수정은 제품 소유 경계로 제한한다.
- 사용자 Windows 최종 수용은 대기 상태로 유지하며 공개 release 작업을 하지 않는다.

## 승인 근거

수행계획서에 기록한 2026-09-26 사용자 순차 진행 지시를 적용한다. 운영 gate는 계속 활성화하며 자동 merge는 수행하지 않는다.

## Stage 1 조사 보완

- 기존 갱신기/검증기/allowlist는 desktop Cargo.lock만 관리하고 이후 생긴 세 native consumer lock을 놓쳤다. 네 lock을 함께 갱신·검증하도록 보완하고 stale lock 회귀를 추가한다.
- writer 비활성 때문에 create_candidate가 skip된 이유를 summary에 직접 표시한다. 기본 dry_run과 쓰기 권한 경계는 유지한다.
- 첫 운영 실행: 36223270009, baseline a1d8ac4669af370f2c428e1b73c222eb664c3c26. 이 실행은 보완 전 경로를 사용하므로 후보가 생성돼도 네 lock 수용은 별도 확인한다.
- v0.8.6은 선택적 hwpctrl plugin을 compile-time 상수로 분리한다. Alhangeul은 해당 플러그인 호스트가 아니므로 upstream standalone 모드와 동일하게 `__RHWP_HWPCTRL__=false`를 정의한다. upstream source나 추가 UI 기능은 변경하지 않는다.
- v0.8.6 사전 source 점검에서 Studio 230/233 통과. 1건은 의도적으로 남은 old pin이며 2건은 upstream의 자동 글꼴 prompt 제거와 toolbar inline→hidden 전환에 대한 과거 문자열 가정이었다. 원본 browser 함수 본문 보존과 모든 남은 inline-hidden의 CSP owner 검증으로 계약을 정리한다. toolbar 표시 복원은 inline display뿐 아니라 새 hidden 속성도 해제한다.
- 사전 TypeScript 실패 11건은 v0.8.4 binding에 없는 새 v0.8.6 WASM API이며 새 binding 수신 전 수용으로 기록하지 않는다.

- 첫 실행은 2026-09-26 15:27 KST에 upstream baseline의 저장 확인 함수가 새 options 인자를 받는 변경을 과거 정규식이 거부해 실패했다. 취소 요청 시 이미 실패 종료였다. 원본 로그는 run 36223270009에 보존한다.
- 저장 확인 adapter는 upstream 인자를 그대로 전달하는 Parameters 기반 rest signature로 맞춘다. Tauri native 저장 확인은 유지한다.
- 후보 workflow는 clean devel만 사용하므로 Stage 1.1의 backward-compatible 보완을 선행 PR로 devel에 반영한 뒤 Stage 1.2 후보 생성을 재실행한다. #76은 선행 PR에서 close하지 않는다. 최종 설치본 검증과 최종 보고는 Stage 3에서 수행한다.

## GUI harness 수용 준비

v0.8.6의 공개 source에서 시작 시 빈 문서 자동 열기·최초 스킨 안내가 추가된 것을 확인했다. 기존의 영구 빈 editor/status 문구 가정과 #74 이전 글꼴 modal 문구를 그대로 쓰면 알려진 자동화 실패가 되므로, 알려진 고유 modal만 처리하고 새 문서의 실제 canvas·상태를 기다리는 helper로 맞춘다. 알 수 없는 modal·중복 버튼은 실패하며 같은 버튼을 반복 클릭하지 않는다. native print도 스킨 안내와 제품 글꼴 사용 안 함 선택을 구분하고 문서 본문·포커스 사후 조건을 유지한다. Native UI 테스트 가이드에 따라 neutral 계약·typecheck 뒤 새 exact 설치본의 local-fonts/full GUI에서 검증한다. 이 변경은 제품 기능·public release 승인과 무관하다.

GUI 준비 검증: `pnpm run typecheck:gui` 통과, 공통 GUI 계약 22개·native print 계약 5개 통과. 실제 OS에서 새 첫 실행 화면의 selector/포커스 수용은 설치본 GUI 실행 전까지 미검증이다. 원본/업스트림의 DOM을 직접 수정하거나 localStorage 설정을 주입해 안내를 건너뛰지 않는다.


## v0.8.6 시작 문서 native 경계 보완

upstream `openBlankDocumentIfIdle`은 WASM에 빈 문서를 직접 만들어 DesktopHost.pendingNewDocument/Rust 세션을 거치지 않는다. 기존 `saveCurrent`는 native session을 요구하므로 이를 그대로 수용하면 최초 빈 문서의 저장이 실패한다. Alhangeul은 기존 idle 시작과 `파일 → 새로 만들기`의 native 생성 경로를 유지한다. 새 exact entry transform은 Tauri에서 해당 자동 시작만 반환하며 browser에서는 원본 동작을 보존한다. renderer·upstream source·일반 문서 생성 함수는 수정하지 않는다. strict marker 검증, Tauri/browser 분기 회귀, 새 설치본의 기존 문서·새 문서 저장으로 확인한다. Windows 안내와 GUI 준비 조건도 이 제품 동작으로 정정한다. 스킨 선택 안내는 유지한다.

## Stage 3 첫 native 실행 보완

run 36225178661에서 Linux x64/arm64 core 각각 88개 실제 결과·resource budget은 모두 통과했으나 fixture 명세의 이전 pin이 남아 `rhwp-pin-mismatch`로 실패했다. 고정 fixture bytes/hash가 변하지 않았음을 확인한 뒤 명세의 수용 pin을 v0.8.6으로 갱신하고 neutral 단계에서 현재 lock과 불일치를 잡는다. Windows fixture 4개도 bytes/hash 동일성을 확인했다.

새 upstream은 HWPX 필수 `Contents/content.hpf`·`Contents/header.xml` 없는 ZIP을 거부한다. preview만 넣었던 세 Rust fixture는 두 항목에 잘못된 XML을 넣어, HWPX 식별은 되지만 직접 parsing은 실패하는 원래 시험 조건을 복구한다. 일반 ZIP+preview는 계속 거부한다는 음성 회귀도 추가한다. production parser·resource 제한·upstream은 변경하지 않는다. 기존 300 LOC 초과 preview 계약 파일에는 이 fixture 관련 최소 변경만 두며 범위 밖 재구성을 하지 않는다. 보완 SHA에서 full CI를 다시 수행하고 첫 실패를 최종 보고에 보존한다.

v0.8.6은 preview 압축 해제 전에 10 MiB 상한으로 `None`을 반환한다. 기존 제품의 16 MiB 방어는 유지되며 더 엄격한 upstream 거부 결과를 검증한다. 기존 `docs/architecture/WINDOWS_THUMBNAILS.md` resource 표의 해당 한 행에 실효 제한을 기록한다. 공식 architecture 위치를 그대로 유지하는 문서 보정이다.

두 번째 full 36225908122에서 preview 계약 12개 중 11개는 통과했지만 단순 text인 `not valid XML`은 upstream에서 빈 문서로 허용돼 직접 실패 조건을 충족하지 못했다. pinned WASM으로 실제 parser를 조사하여 text/invalid UTF-8은 수용되고 불일치 닫는 태그는 XML 오류로 거부됨을 확인했다. 세 fixture를 `<broken></mismatch>`로 고정하고 Linux native profile로 우선 재검증한 뒤 전체 설치본을 생성한다. 테스트 성공 조건을 낮추지 않는다.

집중 native 36226889223은 성공했다. 세 번째 full 36227541535에서는 Windows worker 3개까지 통과한 뒤 COM handler의 별도 BMP fixture(`apps/thumbnail-handler/tests/support/mod.rs`)에 같은 package 항목 누락이 남아 fallback이 E_FAIL로 실패했다. 후속 2개 실패는 공유 mutex poison이다. repository의 Preview ZIP 생성 지점을 재검색해 네 번째 helper도 동일하게 보완한다. 제품 DLL/worker·성공 HRESULT 기준·deadline은 변경하지 않는다. 새 source에서 전체 검증을 수행한다.

## Stage 3 — 2026-09-27 실행 확인과 인계 준비

- full [36229142460](https://github.com/postmelee/alhangeul-tauri/actions/runs/36229142460)은 source `02388f59e88efbf37514894a28a69466bcde9a8b`에서 success다. 세 플랫폼 core·native·패키징과 Windows 설치 계약 집계가 통과했다. Windows COM handler 3개도 통과했다.
- Windows [artifact 10902469644](https://github.com/postmelee/alhangeul-tauri/actions/runs/36229142460/artifacts/10902469644)의 archive digest `sha256:420c5b51ca4e38f7eb6010824c4b277aeb3d2396af2184dbcf87aa46e43bd84d`를 실제 ZIP과 대조했다. 내부 NSIS·MSI·handler·worker 4개 파일의 크기·SHA256, inventory와 source SHA 및 `check:desktop-artifacts`가 일치했다. NSIS hash는 Windows 점검 안내에 기록했다.
- 설치 원시 결과: MSI lifecycle은 실제 passed. NSIS는 raw failure 12개(0x80040154), lifecycle passed·thumbnail not-accepted인 hosted 진단 계약만 passed다. MSI forced reinstall은 3010/reboot-required·post-reboot-unverified로 계약만 passed다. 세 증거 ZIP digest와 evaluation IO 검증 결과도 확인했으며 이를 전체 Shell 기능 수용으로 바꾸지 않는다.
- 같은 제품 SHA·producer를 입력한 Linux GUI [full 36273638799](https://github.com/postmelee/alhangeul-tauri/actions/runs/36273638799)와 [local-fonts 36273643047](https://github.com/postmelee/alhangeul-tauri/actions/runs/36273643047)를 실행했다. 두 검증의 harness SHA도 `02388f59e88efbf37514894a28a69466bcde9a8b`다. 결과와 화면·PDF 판독은 아직 미확인이다.
- 작업지시자의 Actions 대기·조회 중단 지시를 유지한다. 위 두 실행의 완료 통지를 받은 뒤 결과·증거를 확인하고 Stage 3/최종 보고·PR 반영·Windows 최종 점검 인계를 진행한다. 이 문서 기록만으로 Stage 3 완료나 공개 release 수용을 선언하지 않는다.

## Linux GUI 첫 결과와 harness 보완

- local-fonts run `36273643047`은 success다. artifact `10916865310`의 digest `sha256:546d72178d374d11dc2b22bae9937bce4a5a2a6643a159ede7563348d8790931`를 실제 ZIP과 대조했다. 설치 DEB hash는 `996c8b969a5da7a5186c7edbc32e46584753ce9464d007f8d9cac8219632147e`로 producer와 일치했다.
- 관측은 화면 24개·process restart 6회·새 창 4개다. Canvas2D와 CanvasKit의 설치 전/후 대표 페이지 4개를 직접 판독했으며 Abel 적용 후 글자 모양 변화와 본문 보존을 확인했다. 두 renderer에서 HWP/HWPX 직접 공급·재감지·삭제/복구·사용 설정 유지·저장본 글꼴명 보존 검사가 통과했다. CanvasKit localTypefaceCount는 적용 1 → 삭제 0 → 복구 1이었다. 이는 영문 Abel 검증이며 Windows 나눔스퀘어 최종 확인을 대신하지 않는다.
- full run `36273638799`는 failure다. artifact `10916920071` / digest `sha256:14bac365d7c249469f2c43d1869594a5674dec5dce28d42238ae73a0795a3dc8`를 검증하고 로그·실패 화면을 보존했다. DEB 설치·MIME·helper 무결성은 통과했지만 thumbnail manager probe와 native print·WebDriver가 실패했다. 문서 저장·PDF 검사는 실행되지 못했으므로 미검증이다.
- 원인 1: idle 상태 문구가 upstream initialize 완료보다 먼저 나타나 새 스킨 안내를 처리하기 전에 문서를 열었다. public `ready` RPC가 같은 initPromise를 기다리는 것을 확인하고, 이를 barrier로 사용한 뒤 기존 고유 모달 처리·native idle 검증을 수행한다. 초기화 지연과 오류 회귀를 추가하며 임의 sleep·localStorage 주입·제품 source 수정은 하지 않는다.
- 원인 2: WebKit radio의 실제 AT-SPI action은 로그상 `select`였으나 helper는 button용 click/press만 요청했다. 해당 radio에만 select를 지정하고 STATE_CHECKED 사후 조건을 확인한다. 중복 대상을 거부하고 실제 driver 판단 함수를 추출해 관측 capability·선택 상태·중복 거부를 재생한다.
- 원인 3: shell probe의 별도 synthetic preview ZIP에도 HWPX package 항목이 빠져 있었다. 같은 손상 XML 형식으로 보정했다. 실제 Python 생성기를 실행해 ZIP 구조와 pinned WASM의 XML 오류를 검증한다. 제품 helper·parser·성공 기준은 유지한다.
- 로컬 검증: `typecheck:gui`, 집중 회귀 47개, `test:gui:linux:contracts` 65개, shell 구문·diff 검사 통과. 실제 AT-SPI와 전체 GUI의 보완 수용은 같은 제품 SHA/run의 새 full GUI에서 확인한다. 변경은 harness·문서뿐이므로 설치본을 재빌드하지 않고, 성공한 글꼴 실행의 결과도 보존한다.
- 기존 `atspi_driver.py` 300 LOC에 checked 판독과 고유 대상 거부 6줄을 추가해 306 LOC가 된다. 이번 관측 실패에 필요한 최소 변경이며 driver 전체 분리는 범위에 넣지 않는다.


## Linux GUI 두 번째 결과와 drag 전달 관측

- full run [36275362102](https://github.com/postmelee/alhangeul-tauri/actions/runs/36275362102)은 harness `ac465bda5d0f3177c4827d25275031dce76280b0`, 동일 제품 `02388f59e88efbf37514894a28a69466bcde9a8b`/producer `36229142460`에서 failure다. artifact `10916542730`의 실제 ZIP SHA256 `929cd962903e49d55e7551ffdf6fbcc9c1406dc9d6d00ca522841bc9ac625861`와 workflow context를 대조했다.
- 이전 세 차단 원인은 이번 실행에서 해소됐다. 파일 관리자 Nautilus/Thunar의 실제 HWP/HWPX thumbnail/cache/change 검사, native print·cancel·CUPS·편집기 복원, 문서 UX 두 건, HWP/HWPX native 저장/재열기, 새 문서 입력→HWP 저장/재열기→PDF, 직접 PDF가 통과했다. WebDriver 6 passing/1 failing, nativePrint=0이다.
- 직접 HWP PDF 6쪽, HWPX PDF 10쪽, GTK/CUPS 각각 6쪽, 새 문서 PDF 1쪽과 제목·페이지별 텍스트 검사가 통과했다. 새 문서 PDF 전체 marker, GTK 인쇄 표지 한글, HWPX 첫 쪽 본문/표를 대표 이미지로 판독했다. 모든 페이지의 시각 수용으로 확대하지 않는다.
- 유일한 실패는 drag-in의 `FINISHED` 시점에 `DATA`가 없는 경우다. 실패 화면은 새 문서와 PDF 저장 완료 상태이며 열린 모달은 없었다. 원시 증거에는 source/target geometry·GTK 실패 이유가 없어 제품 결함과 gesture 타이밍 중 원인을 확정할 수 없다. 앞선 성공 항목이나 실패 실행 전체를 통과로 소급하지 않는다.
- 기존 helper는 threshold 이동 후 100ms, target 이동 후 200ms만 기다리고 mouseup했다. 로컬에 있는 Wry 구현의 GTK drag-data-received → enter/store_paths → drop 경계에 맞춰 같은 한 번의 gesture에서 STARTED → target 이동 → DATA → release → FINISHED를 관측한다. 실패해도 release·helper 종료는 수행하며 다른 target/재시도/fallback은 추가하지 않는다. drop 뒤 문서 identity/10쪽 확인은 유지한다.
- 다음 실행은 geometry·현재 단계·허용된 GTK marker와 drag-failed enum만 별도 JSON에 남긴다. URI·문서 본문·개인 경로는 진단에 추가하지 않는다. 이번 보완은 원인 확정이나 실제 Linux 성공 증거가 아니며 같은 DEB의 전체 GUI에서 확인한다.
- 단위 재현은 이번 관측에서 개인 정보 없이 `READY/STARTED/FINISHED`만 구성해 DATA 부재 거부를 검사한다. 관측 지연, 잘못된 bounds, 중복 source, 실패 시 단일 release와 cleanup도 실제 helper를 실행해 검사한다. 설치본/제품/성공한 글꼴 GUI는 변경하지 않는다.

- 보완 로컬 검증: `typecheck:gui`, drag helper 회귀 9개와 이를 포함한 `test:gui:linux:contracts` 67개, Python AST 구문·diff 검사 통과. Linux 실행 성공은 다음 Actions 결과로 확인한다.


## Linux GUI 세 번째 결과와 chooser 단일 제출

- full run [36276264694](https://github.com/postmelee/alhangeul-tauri/actions/runs/36276264694)은 harness `0c52286d601470d5fd8cbf44d82bf0e526045383`, 같은 제품 SHA/producer에서 failure다. artifact `10917059377`의 실제 ZIP SHA256 `535c24b3cb5a9fd445ae32212cbeb4ebd1acc3d1f2a2efe2476df864631d87a9`, workflow context와 시나리오 참조 파일 53개의 크기·hash를 대조했다.
- drag 기록은 READY→STARTED→DATA→FINISHED와 phase=complete다. 고유 GTK source에서 파일 URI가 전달됐고 실제 `form-002.hwpx` identity·10쪽 검사가 통과했다. 최종 화면의 한글 표·본문도 확인했다. 문서 UX 2건·직접 HWP/HWPX PDF·system print·thumbnail manager도 통과했다.
- native-save는 첫 Open File chooser 종료에서 실패했다. 실패 tree에는 focused entry(textLength=87)와 enabled Open/click 버튼이 남았다. 이어진 새 문서 저장 화면은 저장 완료였지만 tree에는 선행 Open File이 남아 있어 waitAbsent가 실패했다. 두 저장 시나리오를 이번 실행 통과로 기록하지 않으며 이전 실행의 성공과 구분한다. WebDriver 5 passing/2 failing, nativePrint=0이다.
- 기존 chooser 입력은 `setText + entry activate` 뒤 별도 Open/Save 버튼을 수행한다. [GTK 3.24.33 공식 소스](https://github.com/GNOME/gtk/blob/3.24.33/gtk/gtkfilechooserwidget.c#L2638)는 location entry의 activates-default와 비동기 파일 확인을 사용한다. 이 이중 제출의 경합을 다음 검증 가설로 삼되, 이번 자료만으로 근본 원인을 확정하지 않는다.
- helper를 focus→경로 exact readback→고유한 enabled/sensitive Open 또는 Save 버튼 한 번→chooser 종료 순서로 정리한다. entry activate는 이 경로에서 호출하지 않는다. 잘못된 버튼·중복·비활성 후보를 거부하며 기존 5초 bounded close·실제 문서 identity·저장/PDF 결과 검사는 유지한다. timeout 확대·좌표 클릭·재시도는 추가하지 않는다.
- 실제 Python dispatch/selector/text/action 함수를 추출한 회귀로 한 번 제출, 경로 readback 실패, wrong name·hidden·disabled·insensitive·중복 거부를 검사한다. 기존 driver에 필수 상태/고유성 guard 5줄만 추가해 311 LOC이며 범위 밖 driver 재구성은 하지 않는다.
- 로컬 `typecheck:gui`, Linux 계약 회귀 68개, diff 검사 통과. 제품 bytes와 성공한 글꼴 GUI는 그대로다. Open/Save 공용 adapter가 직접 PDF 등에도 사용되므로 동일 DEB의 전체 GUI로 영향을 확인한다. 실패하면 기존 chooser tree·화면을 보존하며 전체 통과로 바꾸지 않는다. Actions 완료 대기는 하지 않는다.
