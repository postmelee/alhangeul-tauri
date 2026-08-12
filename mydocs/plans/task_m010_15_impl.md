# Task #15 구현계획서 — upstream 전용 페이지 SVG 인쇄 surface 계승

수행계획서: [`task_m010_15.md`](task_m010_15.md)
GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
마일스톤: M010

작업지시자는 2026-08-08 Issue 등록부터 Windows 다운로드 후보까지 별도 단계 승인 없이 진행하도록 승인했다. `local/task15`는 미merge Task #13 exact SHA `63a2703cebf3a79d11a010974203fdaf4ccd3e76`에서 분기했으며, #13 merge 전에는 `devel` 대상 #15 PR을 만들지 않는다.

Stage 1 사전 조사에서 rhwp v0.8.2의 `file:print`는 사용자 동기 클릭 구간에서 same-origin `print.html` 창을 열고 모든 페이지를 `renderPageSvgWithProfile(page, 'print')`로 준비한 뒤 그 창의 `window.print()`를 호출함을 확인했다. 반면 local adapter는 이 command만 `printCurrentWebview()`로 교체하고 Rust `WebviewWindow.print()`로 editor 전체를 인쇄한다. Tauri 공식 API도 DOM `window.print()`는 모든 desktop platform에서 사용할 수 있다고 설명하고, `WebviewWindowBuilder::on_new_window`를 `window.open()` 요청의 명시적 fallback 경계로 제공한다.

따라서 1차 구현은 `file:print`를 desktop executor 목록에서 제거해 upstream command를 browser/Tauri 양쪽에서 동일하게 실행하는 최소안이다. upstream 페이지 조립·style·preview UI를 local이나 Rust에 복제하지 않는다. exact Windows/Linux 후보에서 popup이 차단되거나 opener/same-origin 접근이 깨질 때만 별도 하위 보정으로 editor builder의 `on_new_window`를 추가한다. 그 경우에도 `NewWindowResponse`가 upstream popup을 host할 뿐 페이지 payload나 print DOM은 upstream이 계속 소유한다.

참고:

- [Tauri 2.10.3 `WebviewWindowBuilder::on_new_window`](https://docs.rs/crate/tauri/2.10.3/source/src/webview/webview_window.rs)
- [Tauri `WebviewWindow::print`와 DOM `window.print()` 플랫폼 설명](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindow.html#method.print)

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | upstream 인쇄 소유 경계와 drift guard | `upstream-boundary.test.ts`, 조사·계획 | upstream page SVG/preview command source 계약 |
| 2 | editor 직접 인쇄 override 제거 | file command·desktop host·Rust command와 focused test | Tauri에서도 upstream `file:print` execute 호출 |
| 2.3 | Linux WebKitGTK 빈 쪽 보정 | 최소 재현·Tauri print style adapter·focused test | 실제 6쪽 문서가 system print에서도 6쪽 |
| 2.4 | Windows system print lifecycle 보정 | title/surface lifecycle·상태 표시·focused test | PDF driver modal 동안 제목 유지, 거짓 완료 표시 없음 |
| 2.5 | Windows native modal lifecycle 보정 | Tauri native focus waiter·focused test | PDF 저장창 종료까지 처리 중 상태 유지 |
| 2.6 | Windows modal handoff 안정화 | post-return focus stability·focused test | 인쇄창→저장창 전환에도 처리 중 상태 유지 |
| 3 | 플랫폼 중립 회귀와 공식 문서 정렬 | 전체 test/build, `UPSTREAM.md`, release gate | product/upstream/Studio 전체 gate |
| 4 | exact-SHA Windows/Linux 후보 | `publish/task15` 후보·CI/native artifact | Windows 다운로드와 수동 인쇄 handoff |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| upstream 인쇄 소유 계약 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | Stage 3에서 실제 구현과 일치하는 최소 계약만 보정 |
| desktop release gate | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | 기존 인쇄 gate가 충분하지 않을 때만 수정 |
| 구현·단계 판단 | `mydocs/plans/`, `mydocs/working/` | `task_m010_15_impl.md`, `_stage{1..4}.md` | OK | task 작업 기억 |

추가 `mydocs/manual` 문서는 만들지 않는다. 실제 구현에 새로운 장기 장애 대응 절차가 생길 때만 승인된 `mydocs/troubleshootings/` 후보를 재검토한다.

## Stage 1 — upstream 인쇄 소유 경계와 drift guard

### 산출물

수정:

- `apps/studio-host/src/core/upstream-boundary.test.ts`

신규:

- `mydocs/working/task_m010_15_stage1.md`

### 변경 내용

- exact upstream file command가 `file:print`를 `runPrintPreview`로 연결하고, preview가 `createPrintPreviewSurface`, `profile=print` 페이지 렌더, 전용 document setup을 함께 유지하는지 source guard로 고정한다.
- local `file:print-to-pdf` override와 upstream `file:print` 계승을 서로 다른 책임으로 명시한다.
- Tauri popup fallback은 exact bundle에서 실제 차단이 확인되기 전에는 도입하지 않는 최소 변경 원칙을 단계 보고서에 기록한다.

### 검증

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/upstream-boundary.test.ts
pnpm run check:product-boundary
git diff --check
```

### 커밋

```text
Task #15 Stage 1: upstream 페이지 인쇄 surface 계약 고정
```

## Stage 2 — editor 직접 인쇄 override 제거

### 산출물

수정:

- `apps/studio-host/src/command/commands/file.ts`
- `apps/studio-host/src/command/commands/file.test.ts`
- `apps/studio-host/src/core/desktop-host.ts`
- `apps/desktop/src-tauri/src/commands.rs`
- `apps/desktop/src-tauri/src/lib.rs`
- 관련 host/Rust source guard test

신규:

- `mydocs/working/task_m010_15_stage2.md`

### 변경 내용

- Tauri `desktopExecutors`에서 `file:print`를 제거한다. file command wrapper는 override가 없는 command를 기존 그대로 반환하므로 browser와 Tauri 모두 exact upstream `execute(services)`를 사용한다.
- 더 이상 호출되지 않는 `DesktopHost.printCurrentWebview`, Rust `print_webview` command와 invoke handler 등록을 제거한다.
- focused test는 Tauri runtime에서도 `file:print`가 upstream execute를 한 번 호출하고 native editor-print invoke를 호출하지 않는지 고정한다.
- `file:print-to-pdf`는 계속 `exportCurrentPdf()`로 연결되고 save/new-window/recent adapter가 변하지 않는지 함께 검증한다.
- upstream popup이 실패하면 upstream의 기존 `PrintPreviewBlockedError`/status/toast 계약을 사용한다. 이 단계에서 자체 fallback dialog나 iframe 복제는 추가하지 않는다.

### 검증

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/commands/file.test.ts src/core/desktop-host.test.ts src/core/upstream-boundary.test.ts
pnpm run test:studio
pnpm run build:studio
git diff --check
```

Rust unit test·Clippy·Tauri build는 지원 Windows/Linux Stage 4 workflow에서 실행한다. 현재 macOS 호스트에서 native 성공을 주장하지 않는다.

### 커밋

```text
Task #15 Stage 2: upstream 전용 페이지 인쇄 surface 계승
```

### 조건부 Stage 2.x 보정

exact Windows 또는 Linux에서 `window.open()`이 null을 반환하거나 preview realm이 same-origin opener 접근을 제공하지 않을 때만 적용한다.

- `WebviewWindowBuilder::on_new_window`로 `print.html` 요청만 허용하고 다른 외부 URL은 거부한다.
- Windows에서는 caller와 같은 WebView2 environment, Linux에서는 related view가 필요한 Tauri 계약을 따른다.
- 2026-08-09 Windows exact 후보에서 upstream `window.open(print.html)`이 null을 반환하고 popup 차단 안내가 표시되어 이 조건이 충족됐다.
- initial `main`은 `tauri.conf.json`과 `tauri.windows.conf.json`의 기존 window config에 `create: false`를 지정한 뒤 `WebviewWindowBuilder::from_config`로 수동 생성한다. 크기·제목·URL·Windows zoom hotkey metadata는 config에 그대로 보존한다.
- initial `main`과 동적 `main*` editor 모두 동일한 제한적 `print_preview_handler`를 builder에 연결한다. handler는 production Tauri origin 또는 고정된 local dev origin의 정확한 `/print.html`만 허용하고, `window_features(features)`로 Windows WebView2 environment와 Linux related view를 계승한다.
- preview window label은 요청마다 고유하게 만들고, preview가 전달한 document title을 native title에 반영한다. window 생성 실패와 허용되지 않은 URL은 `NewWindowResponse::Deny`로 닫힌 경계를 유지한다.
- native 파일 책임은 `windows.rs`의 editor lifecycle, `window_geometry.rs`의 work-area 계산, `print_preview.rs`의 제한적 popup host로 분리해 파일 300 LOC 권장 상한을 지킨다.
- popup lifecycle·title·close·반복 인쇄를 native test와 exact GUI로 재검증한다.

### Stage 2.2 — Tauri hidden page surface 직접 인쇄

2026-08-09 Windows exact 후보에서 Stage 2.1의 제한적 popup host가 정상 동작하고 별도 preview 창에서 실제 인쇄까지 완료됨을 확인했다. 다만 작업지시자는 Alhangeul preview를 한 번 더 거치지 않고 Windows 시스템 인쇄 대화상자로 바로 진입하는 UX를 요청했다. 이는 popup 차단 회복과 별개의 새 기능이 아니라 같은 `file:print` acceptance gate의 후속 보정이므로 Issue #15 범위에서 처리한다.

- browser의 upstream `file:print`와 visible `print.html` preview는 그대로 유지한다.
- Tauri에서만 local leaf adapter가 upstream의 `createPrintSurface`, `createPrintPage`, `buildPrintStyleText`/`appendPrintStyle`, `appendSvgPage`, `waitForPrintSurfaceReady`를 재사용한다. production에서는 Tauri가 정적 `print.html` style에 부여한 CSP nonce를 보존하도록 기존 style element의 내용만 교체한다.
- adapter는 upstream `renderPageSvgWithProfile(page, 'print')` 결과를 hidden same-origin iframe에 조립하고 그 surface의 `window.print()`를 호출한다. editor WebView 전체나 Rust `WebviewWindow::print`는 사용하지 않는다.
- local이 소유하는 범위는 Tauri command 분기, 명시적 출력 전 deferred pagination flush, 진행 상태, hidden surface lifecycle뿐이다. pagination, page SVG, print stylesheet와 page DOM primitive는 upstream 소유를 유지한다.
- 별도 popup이 더 이상 필요하지 않으므로 `print_preview.rs`, editor builder의 `on_new_window`, initial main 수동 생성과 config의 `create: false`를 제거한다. Stage 2.1에서 분리한 공용 `window_geometry.rs`는 dynamic editor lifecycle에 계속 사용한다.
- hidden `print.html`을 같은 출처 iframe으로 host할 수 있도록 `frame-ancestors`는 `'none'`에서 `'self'`로만 최소 완화한다. upstream 동적 iframe inline style이 nonce 정책에서 무시돼도 surface가 노출되지 않도록 제품 외부 CSS의 `#rhwp-print-surface` 규칙을 함께 둔다.
- Windows exact 후보에서는 `인쇄`가 별도 Alhangeul preview 없이 시스템 대화상자를 직접 여는지 수동 검증한다. Linux는 동일 구현의 build/native gate까지 수행하고 GUI 인쇄 결과는 실제 환경 검증 전까지 미확정으로 둔다.

검증:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/direct-print.test.ts src/command/commands/file.test.ts src/core/upstream-boundary.test.ts
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

Rust unit test·Clippy·Tauri build는 지원 Windows/Linux exact workflow에서 실행한다.

커밋:

```text
Task #15 [Stage 2.2]: Tauri hidden page surface 직접 인쇄
```

### Stage 2.3 — Linux WebKitGTK 빈 쪽 삽입 보정

2026-08-09 exact Linux x64 후보 `33e6287e397b6aee47963ef5460e7d15ae67b904`를
Ubuntu 24.04.4 x64, WebKitGTK 2.52.3, GTK 3.24.41에서 GUI 검증했다. 별도
Alhangeul preview 없이 system print dialog가 직접 열리고 취소·재호출·출력은
성공했지만, 6쪽 `biz_plan.hwp`가 CUPS-PDF와 GTK `Print to File` 양쪽에서
12쪽으로 출력되고 원본 각 쪽 뒤에 빈 A4 쪽이 삽입됐다. 같은 surface를 사용하는
`파일 > PDF로 저장`은 정상 6쪽이므로 프린터나 page SVG가 아니라 WebKitGTK
인쇄 pagination과 upstream print stylesheet 조합의 문제로 범위를 좁힌다.

- 먼저 동일 WebKitGTK에서 고정 page size, named `@page`, `break-after: page`,
  `page-break-after: always`을 독립적으로 켜고 끄는 최소 HTML을 실제
  `Print to File`로 출력해 빈 쪽을 직접 유발하는 규칙을 확정한다.
- 원인이 확정되기 전에는 print stylesheet를 변경하지 않는다. Chromium/WebView2
  추정만으로 Windows 동작을 바꾸지 않는다.
- `third_party/rhwp`는 읽기 전용이므로 수정하지 않는다. browser의 upstream visible
  preview도 그대로 둔다. 보정은 Tauri hidden surface에 적용하는 adapter leaf로
  제한하고 direct PDF/HWP/HWPX 저장 데이터는 건드리지 않는다.
- 플랫폼 차등이 필요하면 Tauri runtime의 실제 desktop platform을 명시적으로
  사용한다. user agent 추정이나 CSS engine sniffing은 사용하지 않는다.
- focused test는 upstream stylesheet를 그대로 계승하는 Windows 계약과 Linux에서만
  확정된 충돌 규칙을 제거·대체하는 계약, 페이지 수·named page size·마지막 페이지
  break 계약을 고정한다.
- exact Windows/Linux native 후보를 다시 만들고 Windows는 기존 system dialog
  직접 진입을 회귀 확인한다. Linux는 실제 6쪽 문서가 CUPS-PDF와 GTK
  `Print to File`에서 모두 6쪽이고 빈 쪽이 없으며, direct PDF가 계속 searchable
  6쪽인지 GUI로 확인한다.

2026-08-11 첫 local exact 후보 `3688f80493fa2a6068282e224d61f07d29cd514c`의
실제 GUI 재검증에서 1px 높이 tolerance만으로는 CUPS-PDF가 6쪽으로 통과했지만
GTK `Print to File`은 12쪽과 교대 빈 쪽을 유지했다. 동일 GTK backend 최소 재현을
확장한 결과, 같은 크기의 각 쪽에 서로 다른 named `@page`와 명시적
`break-after`를 함께 적용하면 두 번 쪽이 나뉘며, 높이 축소만으로는 이를 제거할 수
없음이 확인됐다. 같은 크기 문서를 default `@page` context로 전환하고 고유 named
page를 해제한 뒤 기존 명시적 break와 1px tolerance를 함께 적용하면 정확한 쪽 수로
출력된다.

- Linux에서 모든 쪽의 물리 크기가 같을 때만 adapter가 default `@page` size와
  `page: auto`를 덧붙인다. upstream의 고유 `pageName`은 SVG ID namespace에 계속
  사용하며 page DOM이나 SVG payload를 바꾸지 않는다.
- 혼합 크기 문서는 local이 하나의 크기로 평탄화하지 않고 upstream named page
  context를 보존한다. 실제 GTK print dialog의 혼합 media 처리 한계는 이번 동일 크기
  빈 쪽 회귀와 분리해 기록하며, 세로·가로 각각의 동일 크기 문서 gate를 유지한다.
- 폐기 후보 `3688f80`의 CUPS-PDF 성공만으로 Stage 2.3을 완료하지 않는다. 보정 후
  새 exact SHA에서 CUPS-PDF와 GTK `Print to File`을 모두 다시 실행한다.

2026-08-11 최종 exact 후보 `89718976a7fa44ebe7f8981ca01ce6bfcbebc979`의 Linux x64
DEB를 Ubuntu 24.04.4 x64, WebKitGTK 2.52.3, GTK 3 환경에 설치해 다시 검증했다.
6쪽 `biz_plan.hwp`는 CUPS-PDF, GTK `Print to File`, `파일 > PDF로 저장` 모두 정확히
6쪽 A4로 출력됐고 교대 빈 쪽, 좌측 잘림, 페이지 누락이 없었다. 세 PDF 모두
`pdftotext`에서 `사업수행계획서`를 추출할 수 있었으며, 150 dpi 대표 페이지 렌더링에서
한글·표·페이지 경계가 정상임을 확인했다. 저장 또는 취소 뒤 기존 문서 상태가
복원되고 같은 세션에서 system print dialog를 다시 열 수 있어 Stage 2.3 Linux 필수
gate를 통과로 확정한다.

- Linux system print dialog가 열린 동안 하단은 `인쇄 준비 중... (6/6)`을 유지했으며
  조기 `인쇄 완료`나 문서 상태 복원은 발생하지 않았다. Windows처럼 native modal
  전환 전 `시스템 인쇄 처리 중...`을 한 프레임 먼저 그리지 못하는 WebKitGTK 표시
  차이는 출력 정확도나 lifecycle 완료 판정 실패로 보지 않고 비차단 UX 관찰로 남긴다.
- CUPS-PDF Poppler 렌더링에서 기존과 같은 Type 3 glyph bounding-box 경고가 있었지만
  6쪽 렌더링과 한글 텍스트 추출은 성공했다. GTK `Print to File`과 직접 PDF에는 같은
  경고가 없었다.

검증:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/direct-print.test.ts src/core/upstream-boundary.test.ts
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

Rust unit test·Clippy·Tauri build는 지원 Windows/Linux exact workflow에서 실행한다.
최소 재현 또는 exact Linux GUI에서 빈 쪽이 남으면 Stage 2.3을 완료로 처리하지 않는다.

커밋:

```text
Task #15 [Stage 2.3]: Linux WebKitGTK 빈 쪽 삽입 보정
```

### Stage 2.4 — Windows system print lifecycle 보정

2026-08-11 exact Windows 후보 `d194050194a754cded496422a2fe0cf37331f723`에서
별도 Alhangeul preview 없이 Windows system print dialog가 직접 열리는 핵심 gate는
통과했다. 그러나 `Microsoft Print to PDF`에서 `인쇄`를 누른 뒤 driver 저장창이
열려 있는 동안 adapter가 `인쇄 완료`를 먼저 표시했고, 저장 파일명은 비어 있었다.

- WebView2 system print UI는 출력 파일명과 driver 저장 완료 결과를 web content에
  제공하지 않는다. `afterprint`도 인쇄 시작 또는 print UI 종료 시점이므로 저장·취소,
  spool 완료를 판정하는 신호로 사용하지 않는다.
- 현재 adapter는 hidden surface와 최상위 document title을 모두 원본 basename으로
  설정한다. `window.print()` 반환 직후 이를 복원·폐기하지 않고, host document가
  focus를 잃은 경우 Windows driver modal chain이 닫혀 focus가 돌아올 때까지
  title과 surface를 유지한다. focus 신호가 없는 구현에서 영구 점유하지 않도록
  bounded safety timeout만 둔다.
- `window.print()` 반환 뒤 focus 대기 중에는 `시스템 인쇄 처리 중…`을 표시한다.
  저장 성공과 취소를 구분할 수 없으므로 generic `인쇄 완료`를 표시하지 않고 기존
  문서 상태를 복원한다.
- 제목 유지로 Microsoft Print to PDF 기본 파일명이 채워지는지는 새 Windows exact
  후보에서 best-effort gate로 확인한다. driver가 제목을 사용하지 않으면 OS 소유
  제약으로 기록하며 Issue #15 완료를 막지 않는다. 보장되는 파일명·쓰기 완료 UX는
  앱이 저장 경로를 먼저 소유하는 기존 `파일 > PDF로 저장`이 담당한다.
- browser upstream preview, Linux pagination CSS, physical printer 선택 UI와 direct
  PDF/HWP/HWPX 데이터는 변경하지 않는다.

검증:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/direct-print.test.ts src/command/commands/file.test.ts src/core/upstream-boundary.test.ts
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

Windows exact 수동 gate:

- system print dialog 직접 진입을 유지한다.
- Microsoft Print to PDF 저장창이 열려 있는 동안 `인쇄 완료`가 표시되지 않는다.
- 저장 또는 취소 후 기존 문서 상태가 복원되고 재인쇄할 수 있다.
- 기본 파일명은 원본 basename 전달 여부를 기록하되 acceptance 필수 조건으로 두지
  않는다.

커밋:

```text
Task #15 [Stage 2.4]: Windows system print lifecycle 보정
```

### Stage 2.5 — Windows native modal lifecycle 보정

2026-08-11 Stage 2.4 exact Windows 후보 검증에서 system print dialog가 열린 동안에는
`시스템 인쇄 처리 중...`이 유지됐지만, Microsoft Print to PDF의 파일 이름 지정
저장창으로 전환되자 상태가 복원됐다. DOM `document.hasFocus()`는 WebView 인쇄 UI가
닫힌 시점에 true가 되어 driver 소유 저장창의 생명주기를 관찰하지 못했다. 원본
basename으로 유지한 top-level·surface title도 driver 기본 파일명에는 반영되지 않았다.

- Windows에서는 Tauri native `Window.onFocusChanged()` listener를 `window.print()` 호출
  전에 연결하고, 반환 뒤 `Window.isFocused()`를 함께 확인한다. system print dialog와
  driver 저장창이 모두 main native window 바깥에 있는 동안 title, hidden surface,
  `시스템 인쇄 처리 중...` 상태를 유지한다.
- main native window가 다시 focus를 얻으면 저장 또는 취소로 modal chain이 닫힌 것으로
  간주하고 기존 문서 상태를 복원한다. 성공·취소는 계속 구분하지 않으며 `인쇄 완료`를
  표시하지 않는다.
- native focus listener 등록이 실패한 경우와 Windows 외 플랫폼은 기존 DOM focus
  fallback을 사용한다. bounded timeout은 유지한다.
- Microsoft Print to PDF 기본 파일명은 WebView2 system print UI가 출력 경로·파일명
  설정을 제공하지 않는 OS 소유 제약으로 확정한다. 보장되는 basename과 쓰기 완료 UX는
  기존 `파일 > PDF로 저장`이 담당하며 Issue #15 acceptance를 막지 않는다.
- browser upstream preview, Linux pagination CSS, physical printer 동작과 direct
  PDF/HWP/HWPX 데이터는 변경하지 않는다.

검증:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/direct-print.test.ts src/command/commands/file.test.ts src/core/upstream-boundary.test.ts
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

Windows exact 수동 gate:

- system print dialog 직접 진입을 유지한다.
- Microsoft Print to PDF 저장창이 열려 있는 동안 `시스템 인쇄 처리 중...`을 유지한다.
- 저장 또는 취소 후 기존 문서 상태가 복원되고 재인쇄할 수 있다.
- 기본 파일명 자동 입력은 acceptance에서 제외하고 system print UI 제약으로 기록한다.

커밋:

```text
Task #15 [Stage 2.5]: Windows native modal lifecycle 보정
```

### Stage 2.6 — Windows modal handoff 안정화

2026-08-11 Stage 2.5 exact Windows 후보 검증에서 system print dialog가 열린 동안에는
`시스템 인쇄 대화상자 여는 중...`이 유지되고, Microsoft Print to PDF 저장창으로
전환되자 기존 문서 상태가 복원됐다. `window.print()`가 system dialog 동안 JavaScript
실행을 막아 호출 뒤의 처리 중 상태가 화면에 반영되지 않았고, native main window가
system dialog와 driver 저장창 사이에서 잠깐 focus를 얻어 pre-print blur를 근거로
waiter가 먼저 종료된 것으로 확정한다.

- `시스템 인쇄 처리 중...`은 native listener 준비와 `window.print()` 호출 전에 설정해
  system dialog가 열린 동안에도 표시한다.
- native listener는 popup 이전에 등록하되, `window.print()`가 반환하기 전의 blur/focus
  이력을 modal 종료 근거로 사용하지 않는다.
- 반환 뒤 main native window가 1초 동안 연속 focused일 때만 modal chain이 닫힌 것으로
  판정한다. 그 사이 driver 저장창이 열려 unfocused가 되면 stability timer를 취소하고,
  저장 또는 취소 뒤 최종 focus가 다시 안정될 때까지 기다린다.
- physical printer 또는 system dialog 취소처럼 후속 driver modal이 없으면 반환 뒤
  1초 안정화 후 기존 문서 상태를 복원한다. 성공·취소·spool 완료는 구분하지 않고
  `인쇄 완료`를 표시하지 않는다.
- basename 자동 입력은 WebView2 system print UI 제약으로 유지하며 acceptance에서
  제외한다. browser upstream preview, Linux pagination CSS와 저장 데이터는 변경하지 않는다.

검증:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/print-ui-lifecycle.test.ts src/command/direct-print.test.ts src/command/commands/file.test.ts src/core/upstream-boundary.test.ts
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

Windows exact 수동 gate:

- system print dialog와 Microsoft Print to PDF 저장창 모두에서
  `시스템 인쇄 처리 중...`을 유지한다.
- 저장 또는 취소 후 1초 안팎으로 기존 문서 상태가 복원되고 재인쇄할 수 있다.
- 기본 파일명 자동 입력은 acceptance에서 제외한다.

2026-08-11 exact 후보 `89718976a7fa44ebe7f8981ca01ce6bfcbebc979`의 Windows
WebView2 GUI 검증에서 위 필수 gate를 모두 통과했다. system print dialog와 Microsoft
Print to PDF 저장창에서 처리 중 상태가 유지됐고, 최종 복귀 뒤 기존 문서 상태 복원과
반복 인쇄를 확인했다. 빈 기본 파일명은 계획된 OS 소유 제약으로 기록하고 실패로 보지
않는다.

커밋:

```text
Task #15 [Stage 2.6]: Windows modal handoff 안정화
```

## Stage 3 — 플랫폼 중립 회귀와 공식 문서 정렬

### 산출물

수정:

- `docs/architecture/UPSTREAM.md`
- 필요 시 `docs/operations/DESKTOP_RELEASE.md`
- 누락된 focused test/guard

신규:

- `mydocs/working/task_m010_15_stage3.md`

### 변경 내용

- 장기 소유 계약을 “upstream: page pagination/SVG/preview DOM, Alhangeul: direct PDF와 Tauri window host의 필수 경계”로 정렬한다.
- release gate는 direct PDF와 실제 인쇄를 분리하고, 실제 인쇄가 editor WebView 전체가 아닌 전용 page surface인지 확인하게 한다.
- source 전체에서 `print_webview`와 `printCurrentWebview` 잔존 참조가 없는지 확인한다.

### 검증

```bash
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run check:release-metadata
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
rg -n "print_webview|printCurrentWebview" apps
git diff --check
```

`rg`는 빈 출력이어야 한다.

### 커밋

```text
Task #15 Stage 3: 인쇄 소유 경계와 플랫폼 중립 gate 정렬
```

## Stage 4 — exact-SHA Windows/Linux 후보와 수동 검증 handoff

### 산출물

- 원격 `publish/task15` exact SHA
- CI 및 Windows/Linux native workflow run
- artifact inventory와 Windows x64 다운로드 후보
- `mydocs/working/task_m010_15_stage4.md`

### 변경 내용

- Stage 3 승인 commit을 `publish/task15`로 push하고 exact SHA를 고정한다.
- CI와 `run_tests=true` native workflow를 실행해 Windows x64/x64 installer와 Linux 지원 bundle을 만든다.
- artifact inventory와 SHA-256, head SHA를 확인하고 작업지시자에게 Windows x64 MSI·NSIS 다운로드 위치와 수동 검증 절차를 제공한다.
- Windows 수동 gate는 별도 Alhangeul preview 없이 system dialog 직접 진입, 단일·다중 페이지, 세로·가로, 한글, 취소·반복 인쇄, Microsoft Print to PDF, direct PDF 회귀를 포함한다.
- exact 후보에서 system dialog 미진입 또는 빈·잘못된 page surface가 관찰되면 Stage 2.x로 돌아가 새 commit·새 exact workflow를 만들고 실패 artifact는 최종 후보로 재사용하지 않는다.

### 검증

```bash
git status --short
git push origin HEAD:refs/heads/publish/task15
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task15
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri --ref publish/task15 -f build_ref=<candidate-sha> -f run_tests=true
gh run view <run-id> --repo postmelee/alhangeul-tauri --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download <run-id> --repo postmelee/alhangeul-tauri --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform <platform> --root <artifact-root> --verify-inventory <inventory-path>
```

release·tag·서명·updater·package repository 게시는 하지 않는다. #13 merge 전에는 #15 PR도 만들지 않는다.

### 커밋

```text
Task #15 Stage 4: Windows Linux exact 인쇄 후보와 검증 handoff
```

Stage 4 보고서는 수동 Windows 결과 전에는 “다운로드 후보 준비”까지만 확정하고, Issue 완료나 release Go를 판정하지 않는다.

### Stage 4.9 — Task #13 merge 통합과 최종 exact 후보

Task #13 PR #18 merge 뒤 `devel`이 `9a3ffcc14a3b32447b22220ea3a4558fa47e451a`로
전진했다. 기존 Task #15 exact 후보 `89718976a7fa44ebe7f8981ca01ce6bfcbebc979`은
Windows/Linux GUI gate를 통과했지만 Task #13 Stage 6.7~6.8 리뷰 보정을 포함하지 않으므로
최종 PR 후보로 재사용하지 않는다.

- `devel`을 `local/task15`에 merge해 Task #15 단계 commit과 Task #13 merge 이력을 모두
  보존한다. 임의 rebase나 history rewrite는 수행하지 않는다.
- 충돌은 Task #15가 삭제한 editor `print_webview` command를 복원하지 않으면서 Task #13의
  최근 문서 단건 삭제와 PDF job window-owner 회수 경계를 함께 유지하는 방향으로 해결한다.
- release 문서는 Task #13 exact 후보의 실제 인쇄 No-Go 이력과 Task #15의 전용 page surface
  수용 gate를 모두 보존한다.
- merge commit에서 전체 플랫폼 중립 gate를 실행한 뒤 새 exact SHA를 `publish/task15`에
  게시하고 CI, Windows x64·Linux x64·Linux arm64 native build와 Windows installer smoke를
  다시 실행한다.
- Task #13 통합이 Studio/native lifecycle을 변경하므로 Windows와 Linux x64의 인쇄 집중 GUI
  회귀를 새 exact bundle에서 확인한다. 이전 SHA의 GUI 결과는 비교 기준으로만 사용한다.
- exact gate 통과 뒤 최종 보고서와 `devel` 대상 PR을 게시한다. release·tag·배포와 Issue close,
  PR merge는 수행하지 않는다.

검증:

```bash
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

### Stage 4.10 — 최종 exact 후보 수용 근거 확정

최신 `devel` 통합 commit `da488a87e9c3b4ca325bebefc611aea853f714cc`를 최종
제품 후보 source SHA로 고정했다. 이 SHA의 CI와 Windows/Linux native workflow는 모두
성공했고, Windows MSI·NSIS smoke와 Windows x64, Linux x64, Linux arm64의 6개 installer
inventory를 통과했다.

- CI [#31523448691](https://github.com/postmelee/alhangeul-tauri/actions/runs/31523448691)은
  platform-neutral gate, Rust test와 Clippy를 포함해 exact head SHA에서 성공했다.
- Desktop Artifact Build
  [#31523462948](https://github.com/postmelee/alhangeul-tauri/actions/runs/31523462948)은
  Windows x64, Linux x64, Linux arm64와 Windows installer smoke를 모두 통과했다.
- 최종 Linux arm64 DEB를 Ubuntu 24.04.4 aarch64, WebKitGTK 2.52.3에 설치해 upstream
  `biz_plan.hwp` 6쪽을 직접 검증했다. CUPS-PDF는 6쪽 A4로 출력됐고 빈 쪽·잘림·누락과
  한글 네모 깨짐이 없었으며, 같은 세션에서 system dialog를 다시 열 수 있었다.
  `파일 > PDF로 저장`도 searchable 6쪽 A4를 만들고 원본 HWP SHA를 보존했다.
- 최종 CUPS-PDF의 Type 3 glyph는 화면과 PDF 렌더링에서는 한글이 정상이나 이 환경의
  `pdftotext`가 한글을 추출하지 못했다. Stage 4.8 Linux x64 CUPS-PDF에서는 같은 문서의
  한글 추출이 성공했고, 최종 arm64 direct PDF도 모든 쪽의 한글 추출에 성공했으므로
  system print의 쪽 구성 수용과 direct PDF 검색 가능 수용을 서로 분리해 판정한다.
- 최종 SHA의 Windows GUI는 접근 가능한 VDI 세션이 없어 직접 반복하지 못했다. 다만
  Windows GUI를 통과한 `89718976a7fa44ebe7f8981ca01ce6bfcbebc979`와 최종 SHA 사이의
  Task #15 인쇄 구현 diff가 없고, 최종 Windows bundle·MSI·NSIS smoke가 통과했다.
- 최종 Linux x64 GUI도 x86_64 WebKit 프로세스를 macOS ARM의 QEMU emulation에서 실행할
  수 없어 반복하지 못했다. 이전 exact x64 GUI 수용과 인쇄 구현 무변경을 유지하고,
  최종 exact common WebKitGTK 경로는 Linux arm64에서 직접 재검증했다.

따라서 Issue #15의 Windows/Linux 인쇄 구현과 package gate는 PR 검토 단계로 넘긴다.
이 판정은 공개 prerelease, release tag, 서명, updater 또는 Task #9 release Go를 승인하지
않으며, 최종 SHA의 Windows/Linux x64 GUI 미반복 사실을 PR 제한사항에 그대로 공개한다.

### Stage 4.11 — PR #22 인쇄 lifecycle 리뷰 보정

PR #22 review
[#4914325092](https://github.com/postmelee/alhangeul-tauri/pull/22#pullrequestreview-4914325092)는
Windows focus waiter의 비동기 순서 역전과 5분 terminal timeout, Linux 혼합 크기 CSS 범위,
CSP style fallback과 upstream print frame ID drift를 지적했다. 코드·기존 Issue 경계를 대조한
결과 1~5번 모두 Task #15에서 처리한다. Issue #20은 시스템 인쇄를 명시적으로 제외하므로
Windows 인쇄 lifecycle 결함을 그쪽으로 이관하지 않는다.

- `waitForReturn()`이 시작된 뒤 native focus event generation을 기록한다. initial
  `isFocused()` IPC가 대기하는 동안 최신 event가 도착했다면 늦게 반환된 poll 결과를
  무시해 stale `false`가 최신 `true` stability timer를 취소하지 못하게 한다.
- 기존 5분 `native-timeout`은 정상 완료 reason에서 제거한다. 5분마다 현재 focus를
  재확인하는 비종료 watchdog으로 바꾸고, 대화상자가 열린 상태에서는 surface, title,
  처리 중 상태와 `printJobActive`를 계속 유지한다. focus가 안정적으로 돌아온 경우에만
  lifecycle을 종료한다.
- Linux 1px tolerance와 default `@page`/`page: auto` override 전체를 실제 수용한 동일
  물리 크기 문서에만 적용한다. 혼합 크기 문서는 upstream stylesheet를 그대로 유지한다.
- Tauri production `print.html`의 nonce가 보존된 정적 style element를 필수 계약으로 둔다.
  누락 시 CSP에서 차단될 수 있는 동적 style fallback을 실행하지 않고 명시적 오류로
  중단한다.
- upstream `PRINT_FRAME_ID = 'rhwp-print-surface'`와 제품 CSS selector가 함께 유지되는지
  boundary test로 고정한다.
- host `document.title` 변경은 upstream도 Chromium/Edge 기본 인쇄 제목을 위해 사용하는
  의도된 동작이므로 유지한다. 이는 Microsoft Print to PDF basename을 보장한다는 뜻은 아니다.

검증:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/print-ui-lifecycle.test.ts src/command/direct-print.test.ts src/core/upstream-boundary.test.ts
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

제품 코드가 변경되므로 기존 `da488a8` artifact는 최종 PR 후보로 재사용하지 않는다. Stage 4.11
commit의 새 exact SHA를 `publish/task15`에 게시하고 CI, Windows x64·Linux x64·Linux arm64
native build와 Windows installer smoke를 다시 실행한다. Windows GUI에서는 system dialog와
Print-to-PDF 저장창의 정상 종료·반복 인쇄를 재확인하고, 접근 가능한 환경에서 5분 장시간
dialog를 직접 재현하지 못하면 focused fake-timer test와 명시적 검증 한계로 남긴다.

### Stage 4.12 — 리뷰 보정 exact 후보와 최종 PR 근거 갱신

Stage 4.11 source·report commit을 exact 제품 후보로 고정해 `publish/task15`에 게시한다.
CI와 Desktop Artifact Build의 event, head branch, head SHA, job conclusion을 확인하고 Windows
x64·Linux x64·Linux arm64 bundle inventory와 MSI·NSIS smoke를 다시 검증한다. 제품 코드가
바뀐 이후의 workflow만 최종 근거로 사용하며 이전 `da488a8` artifact는 비교 자료로만 남긴다.

Windows GUI는 새 exact installer에서 system dialog 직접 진입, Print-to-PDF 저장창 handoff,
상태 복원과 반복 인쇄를 확인한다. 5분 watchdog은 fake-timer focused test에서 surface와 job
guard가 유지되는지 검증하고, 실제 대화상자를 5분 넘게 유지하는 수동 시나리오는 수행 여부를
명시한다. Linux는 동일 크기 6쪽 인쇄의 source 변경이 없고 혼합 크기에서는 보정 전체를
제거했으므로 native build·inventory를 필수로 수행하며, 접근 가능한 GUI 환경이 있으면 6쪽
CUPS-PDF와 direct PDF를 다시 확인한다.

exact gate 뒤 Stage 4.12 보고서, 최종 보고서, 오늘할일과 PR 본문을 새 HEAD 고정 링크로
갱신하고 review에 1~5번의 처리 결과와 6번 의도 확인을 답한다. Issue close, merge, release,
tag와 배포는 수행하지 않는다.

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않고 같은 Stage에서 회복한다.
- direct PDF searchable 결과와 HWP/HWPX source save는 변경하지 않는다.
- platform GUI 성공은 exact-SHA bundle의 실제 결과로만 주장한다.

## 커밋

- 단계 소스와 `mydocs/working/task_m010_15_stage{N}.md`를 같은 커밋에 묶는다.
- Task #13 의존 base와 Task #15 고유 commit 범위를 각 Stage 보고서에 기록한다.

## 단계 의존성

- Stage 2는 Stage 1의 upstream source guard와 최소 override 판단 확정 후 진행한다.
- Stage 3은 Stage 2 focused test/build 통과 후 진행한다.
- Stage 4는 Stage 3 전체 중립 gate와 clean worktree 뒤 진행한다.
- Task #13 merge 전에는 Task #15 PR·merge·close를 진행하지 않는다.

## 위험과 대응

- **popup runtime 차이**: browser에서 동작하는 `window.open()`이 Tauri WebView2/WebKitGTK에서 차단될 수 있다. 먼저 최소 계승 후보를 검증하고, 실제 실패 증거가 있을 때만 공식 Tauri `on_new_window` fallback을 추가한다.
- **hidden surface lifecycle**: `window.print()` 반환 뒤 surface를 정리하는 순서는 upstream direct-print 경로와 동일하게 유지한다. Windows/Linux WebView 차이는 exact native workflow와 GUI gate로 구분해 기록한다.
- **same-origin realm**: hidden iframe의 `print.html` DOM 접근이 끊기면 setup이 실패한다. CSP는 동일 bundle origin만 허용하고 페이지 조립 primitive는 upstream에 남긴다.
- **CSP**: `print.html`과 동적 print style이 production CSP에 막힐 수 있다. exact 후보에서 computed style과 페이지 visibility를 확인하고 필요하면 local external CSS/non-inline state만 보충한다.
- **의존 branch**: #13 merge 전 #15를 devel PR로 만들지 않으며, candidate SHA가 #13 base를 포함한다고 inventory에 명시한다.

## 승인 요청 사항

- 작업지시자의 2026-08-08 연속 진행 지시에 따라 4개 Stage를 별도 승인 없이 수행한다.
- 첫 후보는 upstream command 계승 최소안으로 만들고, 실제 popup 실패가 확인될 때만 Stage 2.x native window 보정을 적용한다.
- Windows x64 다운로드 후보와 검증 절차 제공 시점에서 작업지시자 수동 결과를 기다린다.
