# Task #20 구현계획서 — desktop adapter lifecycle과 dead bridge 정리

수행계획서: [`task_m010_20.md`](task_m010_20.md)
GitHub Issue: [#20](https://github.com/postmelee/alhangeul-tauri/issues/20)
마일스톤: M010

2026-08-24 작업지시자가 수행계획 진행을 승인했다. 승인된 dispatcher/event lifecycle, embed handler lifecycle, dead platform bridge 제거의 세 경계를 유지한다. 다만 dead bridge 코드 변경과 지원 플랫폼의 exact-SHA 수용을 분리하기 위해 마지막 경계를 Stage 3과 Stage 4로 나눈다. Stage 4는 Stage 3 commit을 Windows/Linux에서 검증하는 수용 단계다. 2026-08-26 작업지시자는 첫 Stage 4 실환경 실행에서 확인된 acceptance infrastructure 결함을 Stage 4.1로 보정하고 Windows의 명시적 lifecycle gate까지 추가하는 계획 변경을 승인했다. 이어 같은 날 실제 Linux artifact에서 iframe `window.print()`가 native dialog 없이 반환하는 제품 결함을 확인한 뒤, top-level print surface로의 최소 product correction과 exact-SHA 재수용을 승인했다. top-level `window.print()`도 실제 GTK dialog를 만들지 못한 두 번째 실환경 결과 뒤에는 Linux에서만 Tauri/Wry native print API를 호출하는 얇은 command 추가를 승인했다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | dispatcher와 DOM/native event lifecycle 명시 | `dispatcher.ts`, `desktop-events.ts`, `desktop-toolbar-mode-sync.ts` | 반복·경쟁·부분 실패·dispose focused test |
| 2 | embed handler registration과 waiter lifecycle 정리 | `desktop-runtime.ts`와 test | 교체·stale cleanup·timer 회수 focused test |
| 3 | dead platform bridge 제거와 공식 경계 정렬 | platform/direct-print, Rust registry, boundary test와 `UPSTREAM.md` | 플랫폼 중립 전체 Studio/upstream gate |
| 3.1 | platform unknown fixture의 runner 격리 | `platform.test.ts`, 실패 run·재검증 기록 | Windows/Linux 전역 navigator와 무관한 명시 fixture |
| 4 | exact-SHA Windows/Linux lifecycle 수용 | Stage 3.1 exact commit의 native 결과와 `_stage4.md` | 양 플랫폼 Rust/Clippy/Tauri build와 reload smoke |
| 4.1 | acceptance harness 보정과 exact-SHA 재수용 | Linux GUI harness, Windows lifecycle gate, 계획·보고 | 플랫폼별 명시 gate와 Linux document/native GUI 전체 통과 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| upstream handler/platform 소유 계약 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | Stage 3에서 기존 handler acquisition 문장과 native command 경계만 최소 수정 |
| 구현계획·단계 판단 | `mydocs/plans/`, `mydocs/working/` | `task_m010_20_impl.md`, `task_m010_20_stage{1..4}.md` | OK | Hyper-Waterfall 승인·검증 기록 |
| 오늘할일 | `mydocs/orders/` | `mydocs/orders/20260824.md`, `mydocs/orders/20260826.md` | OK | 날짜별 현재 단계만 짧게 기록 |

신규 공식 문서나 `mydocs/manual` 문서는 만들지 않는다. Stage 3에서 기존 `UPSTREAM.md` 범위를 넘어선 정책이 필요하거나 lifecycle helper 신규 파일이 필요해지면 해당 Stage 구현 전에 계획 변경 승인을 요청한다.

## Stage 1 — dispatcher와 DOM/native event lifecycle 명시

### 산출물

수정:

- `apps/studio-host/src/command/dispatcher.ts`
- `apps/studio-host/src/command/dispatcher.test.ts`
- `apps/studio-host/src/core/desktop-events.ts`
- `apps/studio-host/src/core/desktop-events.test.ts`
- `apps/studio-host/src/core/desktop-toolbar-mode-sync.ts`
- `apps/studio-host/src/core/desktop-toolbar-mode-sync.test.ts`

신규:

- `mydocs/working/task_m010_20_stage1.md`

### 변경 내용

- dispatcher leaf adapter에 현재 active desktop registration을 둔다. 새 `CommandDispatcher`가 Tauri runtime에서 만들어지면 기존 registration을 먼저 dispose하고 toolbar와 desktop event setup을 새 generation으로 설치한다.
- registration disposer는 두 번 호출해도 부작용이 없고, 이전 generation의 stale disposer는 최신 registration을 비우지 못하도록 identity를 확인한다.
- 비동기 desktop event setup이 늦게 완료될 수 있으므로 generation이 이미 교체·해제됐으면 방금 얻은 disposer를 즉시 실행한다. active setup만 오류를 보고하며 취소된 이전 setup의 늦은 완료가 listener를 되살리지 못하게 한다.
- `setupDesktopEvents()`는 성공 시 idempotent disposer를 반환한다. Tauri global event, current window event, close request와 Windows wheel reroute에서 얻은 모든 unlisten/disposer를 수집하고 역순으로 정리한다.
- listener 등록 중 하나가 실패하면 이미 등록된 listener와 wheel reroute를 rollback하고 오류를 다시 전달한다. cleanup 시 drag-over DOM class도 제거한다.
- toolbar coordinator는 dispose 상태를 기록한다. dispose 후 이미 예약된 microtask가 실행돼도 render와 class 재적용을 하지 않으며 subscription과 managed class cleanup은 한 번만 수행한다.
- source 함수가 50 LOC를 넘지 않도록 listener 등록, disposer 합성, toolbar cleanup을 역할별 helper로 분리한다. 신규 source 파일 없이 기존 leaf adapter 안에서 처리한다.

### 검증

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/dispatcher.test.ts src/core/desktop-events.test.ts src/core/desktop-toolbar-mode-sync.test.ts src/core/windows-wheel-zoom.test.ts
pnpm run check:product-boundary
git diff --check
```

focused test에서 다음을 별도로 고정한다.

- 같은 WebView setup 두 번에서 첫 세대의 toolbar와 listener disposer가 한 번씩 호출되고 두 번째 세대만 active다.
- 첫 비동기 setup이 두 번째 setup 뒤 완료돼도 첫 disposer는 즉시 회수되고 최신 세대는 유지된다.
- listener 등록 중간 실패와 두 번 dispose 뒤 unlisten, wheel listener, drag class가 남지 않는다.
- toolbar render 예약 뒤 dispose하면 예약 callback이 product class를 다시 적용하지 않는다.

### 커밋

```text
Task #20 Stage 1: desktop adapter lifecycle 명시
```

Stage 1 source와 `mydocs/working/task_m010_20_stage1.md`를 같은 커밋에 묶는다.

## Stage 2 — embed handler registration과 waiter lifecycle 정리

### 산출물

수정:

- `apps/studio-host/src/embed/desktop-runtime.ts`
- `apps/studio-host/src/embed/desktop-runtime.test.ts`

검증 대상으로만 사용:

- `apps/studio-host/src/core/desktop-host-dependencies.ts`
- `apps/studio-host/src/core/desktop-host.test.ts`
- `apps/studio-host/src/core/desktop-persistence.test.ts`

신규:

- `mydocs/working/task_m010_20_stage2.md`

### 변경 내용

- module 전역 handler 값을 active registration record로 캡슐화한다. record는 desktop handler leaf, upstream uninstall, disposed 상태와 registration identity를 소유한다.
- 새 upstream runtime 설치가 성공한 뒤 이전 active registration을 dispose하고 새 registration을 활성화한다. 새 설치가 throw하면 기존 registration은 유지해 handler acquisition이 불필요하게 끊기지 않게 한다.
- 반환 uninstaller는 idempotent하며 자신이 active인 경우에만 전역 registration을 비운다. replacement 과정에서 이미 정리된 이전 uninstaller를 나중에 호출해도 최신 handler를 제거하지 않는다.
- `getDesktopStudioHandlers()` export를 제거한다. production과 test 모두 `waitForDesktopStudioHandlers()`의 resolve/reject 및 public uninstaller 동작으로 상태를 확인한다.
- waiter는 resolve, reject, timeout 모두 하나의 settle helper를 통해 Set 항목과 timer를 함께 회수한다. runtime 종료가 소유한 pending waiter가 있으면 lifecycle 오류로 reject하고, 이미 settled된 waiter를 다시 처리하지 않는다.
- handler pick 목록은 `loadFile`, `pageCount`, `getPageSvg`, `exportHwp`, `exportHwpx`, `notifySaved`로 유지하고 upstream handler object나 renderer 전체를 native host에 노출하지 않는다.
- `desktop-host-dependencies.ts`는 비동기 `handlers()` 경계를 그대로 사용한다. type/import 정렬이 실제로 필요하지 않으면 수정하지 않는다.

### 검증

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/embed/desktop-runtime.test.ts src/core/desktop-host.test.ts src/core/desktop-persistence.test.ts
pnpm run check:product-boundary
git diff --check
```

focused test에서 다음을 별도로 고정한다.

- 첫 설치, 두 번째 교체, 첫 stale cleanup, 두 번째 cleanup 순서에서 upstream uninstall과 active handler 소유권이 정확하다.
- upstream replacement 설치가 실패하면 이전 handler가 계속 acquire된다.
- handler 대기 중 등록되면 timer가 제거되고 한 번만 resolve된다.
- timeout 또는 lifecycle 종료 뒤 waiter Set과 fake timer count가 0이며 이후 재설치에서 새 waiter가 정상 resolve된다.
- production source와 test에 `getDesktopStudioHandlers` 참조가 남지 않는다.

### 커밋

```text
Task #20 Stage 2: embed handler registration lifecycle 정리
```

Stage 2 source와 `mydocs/working/task_m010_20_stage2.md`를 같은 커밋에 묶는다.

## Stage 3 — dead platform bridge 제거와 공식 경계 정렬

### 산출물

수정:

- `apps/studio-host/src/core/platform.ts`
- `apps/studio-host/src/core/platform.test.ts`
- `apps/studio-host/src/command/direct-print.ts`
- `apps/studio-host/src/command/direct-print.test.ts`
- `apps/desktop/src-tauri/src/commands.rs`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/studio-host/src/core/upstream-boundary.test.ts`
- `tests/rhwp-baseline.test.mjs`
- `docs/architecture/UPSTREAM.md`

신규:

- `mydocs/working/task_m010_20_stage3.md`

### 변경 내용

- `platform.ts`에서 `hydrateDesktopPlatform`, platform override/cache, reset helper와 Tauri dynamic invoke를 제거한다. `DesktopPlatform`, `detectDesktopPlatform()`과 `isTauriRuntime()`만 leaf adapter에 유지한다.
- direct print는 job 시작 시 `detectDesktopPlatform()`을 한 번 호출해 기존 Windows modal lifecycle과 Linux uniform-page fragment 분기에 전달한다. `unknown`에는 플랫폼 전용 보정을 적용하지 않는다.
- platform test는 Windows `navigator.platform`, Windows user agent fallback, Linux와 unknown, Tauri runtime 판정을 public API 기준으로 검증한다. direct-print test는 module hydration mock 대신 navigator fixture 또는 detector seam을 사용한다.
- Rust `desktop_platform()` command 함수, `commands` import와 `generate_handler!` 등록을 제거한다. 다른 native session/save/export/window command 순서와 동작은 변경하지 않는다.
- boundary test는 `getDesktopStudioHandlers`, `hydrateDesktopPlatform`, `desktop_platform`의 production 부재를 negative contract로 고정하고, exact upstream entry와 12개 leaf alias 수는 유지한다.
- `docs/architecture/UPSTREAM.md`의 sync getter 설명을 비동기 handler acquisition과 registration lifecycle 설명으로 바꾸고, platform 판정이 native IPC가 아닌 Studio WebView adapter 소유임을 최소 범위로 기록한다.
- Issue #15가 확정한 hidden print surface, Linux page fragment, Windows modal waiter의 기능 동작은 변경하지 않는다.

### 검증

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/platform.test.ts src/command/direct-print.test.ts src/core/upstream-boundary.test.ts
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
rg -n "getDesktopStudioHandlers|hydrateDesktopPlatform|desktop_platform" apps tests docs \
  --glob '!apps/studio-host/src/core/upstream-boundary.test.ts' \
  --glob '!tests/rhwp-baseline.test.mjs'
git diff --check
```

`rg`는 제거된 이름 자체를 negative contract로 보존하는 두 경계 test를 제외한 production/test/공식 문서에서 빈 결과여야 한다. 현재 macOS 호스트에서는 Rust desktop test, Clippy와 Tauri build를 실행하거나 수용 근거로 기록하지 않는다.

### 커밋

```text
Task #20 Stage 3: dead platform bridge 제거와 경계 정렬
```

Stage 3 source·공식 문서와 `mydocs/working/task_m010_20_stage3.md`를 같은 커밋에 묶는다. 이 commit SHA를 Stage 4 native 수용 입력으로 고정한다.

### Stage 3.1 — platform unknown fixture의 runner 격리

2026-08-24 Stage 3 exact SHA `85ab350ccb55f5d4ef1e616de95c96e267ee0e8e`로
[CI run 32692284752](https://github.com/postmelee/alhangeul-tauri/actions/runs/32692284752)와
[native run 32692278112](https://github.com/postmelee/alhangeul-tauri/actions/runs/32692278112)을
실행했다. checkout·frozen install·upstream test까지 통과했지만 세 native matrix와 CI가
모두 `platform.test.ts`의 unknown assertion에서 중단됐다. explicit argument로 전달한
`undefined`는 JavaScript default parameter를 발동하므로 runner의 실제 navigator를
읽었고, Windows에서는 `windows`, Linux에서는 `linux`가 반환됐다. 제품 detector가
실제 지원 플랫폼을 잘못 판정한 것이 아니라 unknown fixture가 host 전역과 격리되지 않은
test 결함이다.

작업지시자가 같은 날 최소 보정과 새 exact-SHA 전체 재검증을 승인했다.

- `apps/studio-host/src/core/platform.test.ts`의 unknown 입력만 빈 `platform`·`userAgent`를
  가진 명시 fixture로 바꾼다. 제품 source, Windows/Linux 판정과 direct print 동작은
  수정하지 않는다.
- 실패한 두 run과 artifact 부재는 Stage 4 수용 근거로 재사용하지 않는다.
- 플랫폼 중립 gate 뒤 보정 commit을 `publish/task20`에 fast-forward하고 새 SHA에서
  CI와 native workflow를 모두 새로 dispatch한다.
- Stage 4는 새 exact SHA의 Windows/Linux native build가 성공한 뒤에만 GUI lifecycle
  수용을 이어간다.

검증:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/platform.test.ts
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

커밋:

```text
Task #20 [Stage 3.1]: platform unknown fixture 명시
```

Stage 3.1 test·계획과 `mydocs/working/task_m010_20_stage3_1.md`를 같은 커밋에 묶고,
이 새 commit SHA를 Stage 4 native 수용 입력으로 고정한다.

## Stage 4 — exact-SHA Windows/Linux lifecycle 수용

### 산출물

신규:

- `mydocs/working/task_m010_20_stage4.md`

제품 source와 공식 문서는 Stage 4에서 수정하지 않는다. native 검증 중 correction이 필요하면 Stage 4를 완료하지 않고 구현계획 변경 승인을 요청한다.

### 변경 내용

- Stage 3 exact commit을 Windows x64와 Linux x64 지원 환경에 각각 checkout하고 동일한 frozen pnpm dependency와 submodule pin으로 검증한다.
- 양 플랫폼에서 Rust command registry가 `desktop_platform` 없이 compile되고 desktop unit test·Clippy·Tauri production build가 통과하는지 확인한다.
- Windows/Linux Studio WebView에서 문서 open 뒤 toolbar mode 전환과 native menu command를 실행하고, 동일 session의 reload 또는 반복 setup smoke에서 command가 한 번만 dispatch되는지 확인한다.
- 창 종료 뒤 listener/timer 잔존은 Stage 1·2 focused test를 일차 근거로 삼고, native smoke에서는 재실행·재호출 시 중복 메시지나 두 번 열린 dialog가 없는지 확인한다.
- 검증 환경, exact SHA, 명령 결과, artifact 또는 run URL, 수동 시나리오와 한계를 Stage 4 보고서에 기록한다. release, 서명, updater, package 게시와 이슈 close는 수행하지 않는다.

### 검증

Windows x64와 Linux x64 각각:

```bash
pnpm install --frozen-lockfile
pnpm run test:desktop
pnpm run clippy:desktop
pnpm run build:studio
pnpm run build:desktop
git status --short
```

플랫폼 공통 acceptance:

- Stage 3 exact SHA와 검증 checkout SHA가 일치한다.
- native command registry와 production bundle에 `desktop_platform`이 없다.
- toolbar 상태 전환과 native menu command가 반복 setup/reload 뒤 한 번씩만 처리된다.
- print command의 Windows modal lifecycle과 Linux uniform-page 조건이 기존 focused test·smoke에서 회귀하지 않는다.
- 검증 checkout은 명령 실행 후 source diff 없이 clean하다. build artifact와 비밀·개인 문서는 저장소에 commit하지 않는다.

### 커밋

```text
Task #20 Stage 4: Windows Linux native lifecycle 수용
```

Stage 4 검증이 모두 통과한 뒤 `mydocs/working/task_m010_20_stage4.md`만 커밋한다.

### Stage 4.1 — acceptance harness 보정과 exact-SHA 재수용

Stage 3.1 exact SHA `04bab7516684492a59fd49fa54f58baadce65885`의
[CI run 32692823898](https://github.com/postmelee/alhangeul-tauri/actions/runs/32692823898)과
[native run 32692820969](https://github.com/postmelee/alhangeul-tauri/actions/runs/32692820969)은 성공했다.
Linux x64 설치 artifact도 별도 격리 VM에서 설치·실행됐고 native command registry와 binary에
`desktop_platform`이 없음을 확인했다. 그러나
[Linux GUI run 32693861141](https://github.com/postmelee/alhangeul-tauri/actions/runs/32693861141)은
GUI 실행 전 `cupsd -v`의 잘못된 option 때문에 중단됐으며, 동일 artifact의 격리 VM 재현에서
다음 harness 결함을 추가로 확인했다.

- direct probe가 `browserName: tauri`를 tauri-driver에 직접 보내 capability match에 실패한다.
  외부 `@wdio/tauri-service`와 같은 방식으로 direct request에서는 `tauri:options`만 전달한다.
  첫 portal·WASM 초기화를 포함하는 session lifecycle 요청은 30초로 제한하고 readiness status는 5초 fail-fast를 유지한다.
- driver cleanup은 SIGTERM grace 뒤 SIGKILL이 동기적으로 `exit`를 발생시켜도 최초 exit promise를 재사용해
  probe process와 app을 남기지 않는다.
- production에서 의도적으로 숨긴 `#file-input`에 WebDriver `setValue()`를 바로 호출해
  interactability 조건을 만족하지 못한다. test helper가 입력 순간에만 inline style을 복원 가능한
  값으로 바꾸고 `finally`에서 원상 복구한다. WebKit은 원본 `style` 문자열만 다시 설정하면 임시
  `!important` 계산값을 유지할 수 있으므로, 임시 속성을 하나씩 제거한 뒤 원본 문자열을 복원한다.
- document/native open의 upstream local-font consent modal은 개인 시스템 글꼴 조회를 실행하지 않고
  `대체 글꼴로 보기`를 명시 선택한 뒤 document readiness를 계속 판정한다.
- WebKitWebDriver가 status/page element의 표시 text를 빈 값으로 반환하는 경우를 피하기 위해 해당 두
  readiness surface만 DOM `textContent`로 읽는다. 설치 artifact는 native open 성공 시 파일명을 포함하지
  않은 정확한 `파일 열기 완료` status를, drag-in 성공 시 `파일명 — N페이지` status를 내보낸다. 경로별
  완료 status와 fixture별 page count를 결속하고, native chooser 선택 경로 자체는 chooser 내부 location
  입력과 dialog 종료로 검증한다.
- WebKitWebDriver가 펼쳐진 `file:*` menu item을 `display:flex`인데도 `isDisplayed=false`로 판정하는
  경우가 있으므로 native command trigger는 제품과 같은 bubbling `mousedown`으로 menu의 `open` 상태를
  최대 120초 안에 확인한다. 이는 MenuBar가 toolbar 표시 뒤 WASM/renderer 초기화 말미에 설치되는 순서를
  반영하며, DOM의 display·visibility·opacity·geometry를 모두 확인한 표시 항목에만 `click()`을 전달한다.
- production binary에는 의도적으로 WDIO Rust plugin이 없으므로 session 시작 시 현재 WebDriver handle을
  명시 선택해 tauri-service의 plugin 기반 active-window 복구를 억제하고 DOM 명령을 순수 WebDriver로 유지한다.
- 설치 artifact의 `file:print`는 upstream popup preview가 아니라 `apps/studio-host`의 Tauri direct-print shadow이며,
  hidden same-origin iframe page surface를 준비한 뒤 `surface.window.print()`로 native dialog를 열도록 구현돼 있다.
  native chooser 종료 뒤 Alhangeul visible X11 window의 exact-ID와 geometry를 확인하고 editor 중앙을 XTEST로 한 번 클릭해
  InputHandler active 상태와 편집용 textarea focus를 복원한 뒤 production shortcut인 `Ctrl+P`를 XTEST로 보낸다.
  별도 preview handle이나 popup을 가정하지 않고 AT-SPI adapter가 GTK print dialog를 직접 기다리며, dialog 종료 뒤
  Tauri shadow의 print lifecycle이 원래 editor 상태를 복원했는지 확인한다.
- 위 trusted 입력 보정 뒤 exact artifact는 command를 처리해 hidden surface를 생성·회수하고 원래 status/title로 복귀했지만,
  `surface.window.print()`가 Linux WebKit에서 GTK/portal dialog를 만들지 않고 즉시 반환했다. 실패 AT-SPI tree에는
  Alhangeul 본창만 있고 print 역할·이름의 dialog나 별도 visible X11 window가 없었다. 이는 selector 또는 harness 결함이 아니라
  승인된 Stage 4.1의 "제품 lifecycle source 기능 범위는 추가하지 않는다" 경계를 넘는 실제 product direct-print 결함이므로,
  product source 최소 보정 계획 변경 승인을 받기 전에는 Stage 4.1 완료·commit·exact-SHA 재수용으로 진행하지 않는다.
- 작업지시자 승인에 따라 iframe document 조립 결과를 top-level host document의 전용 print container에 직접 구성하고,
  nonce-bearing product style에 page별 print rule을 lifecycle 동안만 추가한 뒤 top-level `window.print()`를 호출한다.
  screen에서는 전용 container를 강제로 숨기고 `html.alhangeul-print-active`의 `@media print` 안에서만 기존 editor를 숨겨
  prepared SVG pages를 노출한다. dialog 종료·오류 때 container, print class, 동적 style과 title을 모두 원복한다.
  upstream read-only source와 Rust command registry는 변경하지 않으며, 이 경계로도 실제 GTK dialog가 열리지 않으면
  native bridge 추가 없이 다시 계획 승인을 요청한다.
- top-level correction을 내장한 Linux x86_64 production DEB
  `49609d003093b8782469ca33c7281853f6c27f91ad43cb3113f7f6636c26f456`도 trusted `Ctrl+P` 뒤
  120초 동안 GTK/portal print dialog를 만들지 못했다. production bundle에는
  `surface=top-level`, `alhangeul-direct-print-surface`와 top-level `window.print()`가 모두 존재했고,
  실패 AT-SPI tree에는 Alhangeul 본창만 있어 미내장·selector 가능성을 배제했다.
- 작업지시자 승인에 따라 `print_current_webview` native command를 Rust registry에 추가한다. Linux direct print만
  top-level surface readiness 뒤 이 command를 await하고, command는 현재 Tauri `WebviewWindow::print()`를 호출해
  Wry의 WebKitGTK `PrintOperation::run_dialog()` 경계로 전달한다. command 반환 또는 오류까지 top-level surface,
  nonce-bearing dynamic style과 title을 유지한 뒤 기존 disposer로 원복한다. Windows와 `unknown`은 현재
  `window.print()` 및 focus waiter를 유지하고, upstream read-only source와 native document session은 변경하지 않는다.
- native command를 내장한 Linux x86_64 production DEB
  `e2a11d0defb405ed37711ea0aa2762701ca0d52487c0a4cb4b4cf9900f52b3fb`에서는 GTK `Print` dialog와
  `Print to File` semantic target이 실제로 나타났다. 이후 GTK file entry의 AT-SPI
  `EditableText.setTextContents()`가 응답하지 않아 acceptance가 중단됐다. 재개용 로컬 보정은 정확한 semantic
  file entry에 AT-SPI focus를 준 뒤 exact title의 visible `Print` 창이 하나인지 확인하고, 그 창에만 XTEST
  `Ctrl+A`와 path 입력을 전달하도록 작성된 상태였다. 이 시점에는 단위 테스트와 실제 GUI 재검증을 실행하지 않았다.
- file entry XTEST 보정 뒤에는 출력 경로의 `print` 문자열 때문에 footer의 최종 `Print`가 아닌 file entry가
  먼저 검색되는 역방향 탐색 결함을 확인했다. 표시 중인 dialog 후손을 역순으로 조회해 exact footer action을 고르고,
  GTK Print to File·Cancel·CUPS-PDF 각 modal 종료를 기다린다. CUPS-PDF가 document title을 파일명으로 정규화하므로
  output directory의 단일 PDF를 승인된 expected path로 이동한 뒤 분석하며, 각 반복 뒤 원래 title·status·page를 확인한다.
- 위 adapter 보정으로 생성된 GTK/CUPS 결과는 모두 6쪽 A4였으나 첫 production build에서는 본문이 전혀 없는 빈 PDF였다.
  인쇄 직전 top-level surface는 6개 page·6개 SVG와 약 75만 byte markup을 보유해 surface 조립 실패를 배제했다.
  설치된 WebKitGTK GIR 문서와 Wry 구현을 대조한 결과 `PrintOperation::run_dialog()`는 dialog가 닫힐 때 반환하지만
  실제 paint/spool은 비동기로 계속되고 `finished` signal에서 종료된다. 기존 `WebviewWindow::print()` 반환 직후
  frontend `finally`가 surface를 제거해 WebKit이 빈 문서를 인쇄한 것이 원인이었다.
- Linux 구현은 별도 `system_print.rs`에서 현재 webview의 WebKitGTK `PrintOperation`을 직접 만들고 `failed`·`finished`
  signal을 수신한다. `Print` 응답은 operation을 `finished`까지 유지해 frontend invoke와 임시 surface 수명을 결속하고,
  `Cancel`과 알 수 없는 응답은 즉시 operation과 oneshot을 회수한다. Linux 전용 dependency는
  `futures-channel`, `gtk`, `webkit2gtk`로 제한하며 Windows와 unknown은 기존 `window.print()` 경계를 유지한다.
- screen 상태의 top-level print surface는 opacity 0으로 숨기지 않고 editor 뒤 `z-index: -1`에 유지한다. print media에서만
  기존 editor를 숨기고 surface를 static·visible로 전환하며, 완료 뒤 원래 product style text, print class, title과 status를
  모두 복원한다. 이는 WebKit paint tree에 surface를 유지하면서 사용자 화면과 pointer 입력에는 노출하지 않는 경계다.
- 전체 GUI 실행에서 이전 spec의 Alhangeul 창이 종료 중 잠시 남아 exact X11 window가 둘이 될 수 있다. trusted shortcut은
  후보가 하나면 그대로 쓰고, 여러 후보면 현재 active window ID가 exact 후보에 포함될 때만 선택한다. 선택한 window의
  geometry와 editor focus를 확인한 뒤 `Ctrl+P`를 보내며, active 후보가 불명확하면 좌표·키 입력 전에 fail-closed 한다.
- open/save/print처럼 한 scenario 안에서 여러 native operation을 직렬 실행하므로 각 operation의 120초 제한은 유지하되,
  Mocha의 scenario 전체 제한은 그 4배와 10분 중 작은 값으로 분리해 정상 lifecycle을 중간에 절단하지 않는다.
- X11 drag source의 press와 target 이동을 지연 없이 한 명령열로 보내면 GTK가 drag threshold를 처리하기
  전에 release가 도착해 drop event가 생기지 않는다. source 안에서 12px만 이동하고 0.2초씩 처리한 뒤
  target에서 0.5초를 기다리는 고정 choreography를 사용하되, button press/release는 각각 한 번만 보낸다.
  이벤트 window가 없는 `Gtk.Label` 대신 표시되는 `Gtk.EventBox`를 drag source로 사용하고, WebKit target이
  fixture URI를 실제 요청한 `URI_SENT` marker를 5초 안에 확인해야 gesture를 성공으로 인정한다.
- Ubuntu portal file chooser는 별도 backend process를 사용하고 AT-SPI application 소유가 환경에 따라
  달라진다. native UI adapter는 Alhangeul과 승인된 xdg-desktop-portal GTK/GNOME application 이름만
  탐색하고, 기존 semantic
  role/name selector와 physical printer 거부 경계는 유지한다. GTK location layer 전환 중 나타나는
  null/stale accessible은 숨김으로 취급하고 traversal에서 제외해 semantic target으로 선택하지 않는다.
  별도 portal 창이 X11 active window가 아닐 수 있으므로 file chooser를 확인하고 그 안의 표시된
  Open/Save primary action에 AT-SPI focus를 준다. 허용된 Open/Save 영문·한국어 exact title과 일치하는
  visible X11 window만 `xdotool search → windowactivate → getactivewindow exact-ID 확인 → XTEST key`
  순서로 지정해 `Ctrl+L`과 `Return`이 Alhangeul 본창에 전달되지 않게 한다. 실제 AT-SPI 트리에서는
  xdg portal backend가 별도 application으로 등록돼도 표시 중인 `Open File` chooser가 `Alhangeul`
  application 아래에 붙을 수 있다. 따라서 application 이름만으로 chooser target을 제한하지 않는다.
  GTK가 `Ctrl+L`로 만든 location entry와 디렉터리 이동 뒤 표시되는 Save File name entry는 모두
  accessible name이 비어 있으므로, 표시 중인 file chooser를 먼저 semantic role/name으로 찾고
  각 단계에서 그 후손의 표시 중인 `text`/`entry` role만 선택한다. 제품 본창의 이름 없는 입력과
  혼동하지 않도록 file chooser의 나머지 target은 기존 role/name selector를 유지한다. 실패 snapshot은
  이름 없는 표시 입력도 기록해 GTK 접근성 drift를 증거에 남긴다.
- 기존 Windows installer smoke는 5초 process 생존만 확인하고 Rust test·Clippy 또는 정상 창 종료·재실행을
  명시하지 않는다. Windows x64 matrix에서 desktop test·Clippy를 실행하고, MSI/NSIS 각각 두 번의
  GUI process cycle에서 input-idle, main window handle, responsive 상태와 graceful close를 확인한다.

2026-08-26 안전 중단 체크포인트: 격리 worktree
`/Users/melee/Documents/projects/alhangeul-tauri-task20`, branch `local/task20`, 기준 commit
`04bab7516684492a59fd49fa54f58baadce65885`에 Stage 4.1 변경이 미커밋으로 보존돼 있다. 재개 시 위 print path
입력 보정의 focused test부터 실행하고, Linux 실제 system-print scenario, Linux GUI 전체, Linux Rust test/Clippy,
로컬 전체 gate 순으로 검증한 뒤 correction commit과 exact-SHA Windows/Linux 재수용을 진행한다.

2026-08-27 재개 경과: 보정 production DEB
`4bf2d7f639ac63e463651493e19a2a8017646c783573d730e1a433dcbc541fd8`와 설치 binary
`2c8158e8413b2269ea2e862b48c18333c7a24ac3ac7e4c9718a920d70756bcf0`로 focused system-print와 Linux GUI 전체를
재실행했다. 전체 실행의 direct PDF `141bc5e5b3154ad0a6b573c458907702ba0928f0cb7fe4a55533d42cad0af4d8`,
GTK PDF `a2e77accd739605866ab158070d9976925ee5cbbfa2ec83f71d148e4fd609c16`, CUPS PDF
`98675c43a5e005bae52866960c9215600b14a8254526781c57c7f8ea7fb89548`는 모두 6쪽 A4이고 GTK/CUPS에서
`사업수행계획서` text를 각각 3회·2회 추출했다. GUI worker log에는 assertion/runner 오류가 없고 저장·재열기,
bounded drag, direct PDF, GTK Print to File·Cancel·CUPS-PDF 반복이 끝까지 실행됐다. 플랫폼 중립 automation 214개,
GUI contract 21개, GUI typecheck, product boundary 230개, upstream 36개, Studio 111개와 production build도 통과했다.
Linux `cargo check`, production DEB build, 최종 source의 desktop Rust test 107개와 Clippy가 모두 통과했다.
Rust test와 Clippy의 `CARGO_INCREMENTAL=0`, debug info 비활성화는 격리 VM 저장공간만 제한하며 검증 대상과
compiler lint 수준은 바꾸지 않는다.

correction candidate `9b67f8dfd49b26e385cb0bdba994d1d7c8c5e427`의
[native run 33034207053](https://github.com/postmelee/alhangeul-tauri/actions/runs/33034207053)에서는 Windows x64,
Linux x64, Linux arm64 build와 artifact 검증이 모두 통과했고 Windows desktop Rust test와 Clippy도 통과했다.
그러나 후속 Windows installer smoke에서 MSI와 NSIS가 모두 설치·레지스트리·version·handler·shortcut·제거·정리를
통과한 뒤 첫 `CloseMainWindow()`의 10초 종료 timeout으로 실패했다. 진단 artifact ID `9631886118`의 summary에는
두 installer 모두 동일한 `Alhangeul cycle 1 정상 종료 timeout`만 기록됐으므로, installer별 결함은 배제되지만
product 종료 결함과 `WaitForInputIdle()` 직후 닫기 요청의 frontend 초기화 경쟁은 아직 구분되지 않는다.
먼저 harness가 동일한 non-zero main window handle과 responsive 상태를 500ms 간격 11회, 최소 5초간 유지한 뒤
닫기를 보내도록 보정한다. 프로세스 readiness와 종료 확인은 300 LOC 상한을 유지하도록
`scripts/windows-process-lifecycle.ps1`에 분리한다. 종료 대기는 30초로 제한하고 실패 시 handle, title, responding
상태를 summary에 남긴다.
이 보정의 새 exact SHA로 native workflow를 다시 실행하며, 동일 실패가 재현되기 전에는 product 종료 source를
변경하지 않는다. 실패 run의 Linux artifact는 Linux GUI 완료 근거로 재사용하지 않는다.

새 candidate `ddc687df0f12ed21b2af4536688bc78c4970efba`의
[native run 33036008601](https://github.com/postmelee/alhangeul-tauri/actions/runs/33036008601)은 Windows x64,
Linux x64, Linux arm64 build와 artifact 검증을 모두 통과했다. Windows installer smoke artifact ID
`9632227503`의 summary에서 MSI와 NSIS 각각 두 번의 실행이 같은 window handle과 responsive 상태를 11회
연속 확인한 뒤 모두 `GracefulExit=true`로 종료됐고, 설치·제거 exit code 0과 잔여 process·path·registry 0을
확인했다. 따라서 이전 Windows 실패는 `WaitForInputIdle()` 직후 닫기 경쟁으로 판정하며 product 종료 source는
변경하지 않는다.

같은 candidate의 [Linux GUI run 33036683959](https://github.com/postmelee/alhangeul-tauri/actions/runs/33036683959)은
native run과 Linux x64 artifact ID `9632210137`의 exact handoff, DEB inventory, 설치, GUI 환경 준비를 통과했지만
GUI acceptance에서 실패했다. evidence artifact ID `9632444337`은 기본 HWP/HWPX 로드를 성공으로 기록한 뒤,
첫 native open의 GTK `Open File` dialog가 full path 입력과 단일 `Return` 뒤에도 열린 상태로 남았음을 보여준다.
AT-SPI tree에는 enabled primary `Open` 버튼이 남아 있고, 뒤 drag-in·direct PDF·system print 실패는 같은 열린
dialog에서 연쇄된 결과다. 파일 open과 최종 Save As submit은 keyboard `Return`에 의존하지 않고 검증된 file
dialog 내부의 enabled primary 버튼을 semantic click하도록 보정한다. product source는 변경하지 않으며 새 exact
SHA의 native artifact와 Linux GUI workflow로 다시 검증한다.

semantic submit 보정 candidate `620191b05875401158647c6df3f8f6a7ddd39c38`의
[native run 33037468639](https://github.com/postmelee/alhangeul-tauri/actions/runs/33037468639)은 Windows x64,
Linux x64, Linux arm64 build와 artifact 검증을 모두 통과했고 Windows desktop Rust test·Clippy도 통과했다.
Windows installer smoke artifact ID `9632805160`에서 MSI와 NSIS 반복 lifecycle이 모두 성공했으며, Linux x64
artifact ID `9632780874`의 digest는
`sha256:e009f4b1193e68045dbca238128f9091e870e1d281934b4f7a617ae9fd4ed83d`로 고정됐다.

같은 exact SHA와 native artifact를 사용한
[Linux GUI run 33038195757](https://github.com/postmelee/alhangeul-tauri/actions/runs/33038195757)은 첫 기본 HWP의
WebDriver file input `change`가 앱 초기화 경쟁으로 전달되지 않아 렌더 대기에서 실패했다. evidence artifact ID
`9632902718`에서 상태가 `HWP 파일을 선택해주세요.`에 머문 반면 HWPX는 성공했고, 동일 입력은 직전 run에서
0.5초 안에 성공했으므로 제품 parser 결함이 아니라 startup race로 판정했다. 기본 fixture 입력 뒤 5초 안에
`파일 로딩` 또는 대상 basename 상태가 관찰되지 않으면 숨김 file input을 한 번만 다시 전달한다.

[Linux GUI 재실행 33038551116](https://github.com/postmelee/alhangeul-tauri/actions/runs/33038551116)은 기본 HWP/HWPX를
모두 통과하고 native open까지 진입했다. evidence artifact ID `9633083479`의 AT-SPI tree에는 같은 `Open File`
chooser가 중복 노출되며 한 primary `Open`은 enabled/sensitive, 다른 하나는 disabled/insensitive였다. 기존 semantic
click은 비활성 복제 버튼을 먼저 선택해 실패했으므로 primary selector가 enabled와 sensitive 상태를 모두 요구하게
보정한다. 이후 save·drag·PDF·print 실패는 열린 dialog가 남아서 발생한 연쇄 결과로 분류하며 product source는
변경하지 않는다. 새 exact SHA의 native workflow와 Linux GUI 전체를 다시 실행해 보정을 수용한다.

readiness 보정 candidate `658adc8c1bf0b435c81cd6d187ac7f36596538e2`의
[native run 33158824880](https://github.com/postmelee/alhangeul-tauri/actions/runs/33158824880)은 Windows x64,
Linux x64, Linux arm64 build와 artifact 검증을 모두 통과했고 Windows desktop Rust test·Clippy와 MSI·NSIS 반복
lifecycle smoke도 통과했다. Linux x64 artifact ID `9681209749`의 digest는
`sha256:e7f660401a9c60011cb18037d2d55c09d2b234cd1e581be5da5077ebc6cfac53`로 고정됐다.

같은 exact SHA와 native artifact를 사용한
[Linux GUI run 33161020100](https://github.com/postmelee/alhangeul-tauri/actions/runs/33161020100)은 exact handoff와
기본 HWP/HWPX, drag-in을 통과했지만 native open/save/PDF/print가 primary button 대기에서 실패했다. evidence
artifact ID `9681862666`의 첫 native tree에는 단일 `Open File` chooser와 disabled/insensitive `Open`만 남았고,
첫 scenario는 정확히 120초 뒤 종료됐다. 이는 enabled/sensitive 조건이 실제 submit뿐 아니라 dialog 직후의 초기
focus에도 적용되어 `ctrl+l`과 path 입력 전에 대기한 결과다. 초기 focus selector는 비활성 primary도 허용하되,
실제 semantic click selector는 enabled/sensitive 조건을 유지하도록 분리한다. product source는 변경하지 않고 새
exact SHA의 native workflow와 Linux GUI 전체를 다시 실행한다.

focus 분리 candidate `0c106667d965be3569ee1fbab81748073695eb19`의
[native run 33161882665](https://github.com/postmelee/alhangeul-tauri/actions/runs/33161882665)은 첫 attempt의 Linux x64
AppImage helper 다운로드가 `Connection reset by peer`로 실패했지만, 동일 exact SHA의 failed-job 재실행 attempt 2에서
Windows x64, Linux x64, Linux arm64 build·artifact 검증과 Windows installer smoke가 모두 성공했다. 첫 실패는
release-assets 네트워크 reset으로 분류하며 source correction 근거로 사용하지 않는다. Linux x64 artifact ID
`9682664593`의 digest는 `sha256:d4fe4cc525e6fe6663c28e4088e2e7c0e0c382d241ca0ac79ba253127680d846`이다.

같은 exact SHA와 native artifact의
[Linux GUI run 33163815497](https://github.com/postmelee/alhangeul-tauri/actions/runs/33163815497)은 initial focus를 지나
경로 입력과 enabled/sensitive primary의 검증된 좌표까지 도달했다. evidence artifact ID `9682799191`의 open·Save
As·PDF Save tree는 모두 단일 chooser의 primary가 enabled/sensitive임을 기록했지만, XTEST 명령이
`mousemove --sync`에서 5초 timeout됐다. 이미 포인터가 같은 좌표이면 xdotool의 이동 완료 대기가 반환하지 않을 수
있으므로, semantic target 상태·dialog window·geometry·bounds 검증은 유지하고 같은 xdotool invocation의 mousemove에서
`--sync`만 제거한다. 이어지는 click은 같은 검증 좌표에 순차 실행되며 product source는 변경하지 않는다.

수정:

- `apps/studio-host/src/command/direct-print.ts`
- `apps/studio-host/src/command/direct-print.test.ts`
- `apps/studio-host/src/core/upstream-boundary.test.ts`
- `apps/studio-host/src/style.css`
- `apps/desktop/src-tauri/src/commands.rs`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/Cargo.lock`
- `.github/workflows/alhangeul-linux-gui.yml`
- `.github/workflows/alhangeul-desktop.yml`
- `tests/linux-gui-workflow.test.mjs`
- `tests/actions-workflows.test.mjs`
- `tests/gui/linux/probe.mjs`
- `tests/gui/support/process.mjs`
- `tests/linux-gui-probe.test.mjs`
- `tests/gui-contracts.test.mjs`
- `tests/gui/specs/document-ux.e2e.ts`
- `tests/gui/wdio.shared.conf.ts`
- `tests/gui/linux/native-ui/atspi.mjs`
- `tests/gui/linux/native-ui/atspi.d.mts`
- `tests/gui/linux/native-ui/atspi.test.mjs`
- `tests/gui/linux/native-ui/atspi_driver.py`
- `tests/gui/linux/native-ui/drag-drop.mjs`
- `tests/gui/linux/native-ui/drag-drop.test.mjs`
- `tests/gui/linux/native-ui/drag_source.py`
- `tests/gui/specs/linux-native.e2e.ts`
- `tests/gui/wdio.linux.conf.ts`
- `scripts/windows-installer-smoke.ps1`
- `tests/windows-installer-smoke.test.mjs`
- `mydocs/plans/task_m010_20_impl.md`

신규:

- `apps/desktop/src-tauri/src/system_print.rs`
- `scripts/windows-process-lifecycle.ps1`
- `tests/gui/linux/native-output.ts`
- `tests/gui/support/native-command.ts`
- `tests/gui/support/webdriver-dom.ts`
- `mydocs/orders/20260826.md`
- `mydocs/orders/20260827.md`
- `mydocs/orders/20260828.md`

플랫폼 중립 검증:

```bash
pnpm exec node --test tests/linux-gui-probe.test.mjs tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs tests/windows-installer-smoke.test.mjs tests/gui/linux/native-ui/atspi.test.mjs
pnpm run typecheck:gui
pnpm run test:automation
pnpm run check:product-boundary
pnpm run test:studio
pnpm run build:studio
git diff --check
```

Linux native command는 지원 Linux VM에서 `pnpm run test:desktop`, `pnpm run clippy:desktop`, production DEB build와
실제 GTK Print to File·cancel·CUPS-PDF 반복으로 검증한다. 현재 macOS 호스트의 Rust 결과는 수용 근거로 쓰지 않는다.

새 correction commit을 `publish/task20`에 fast-forward한 뒤 그 exact SHA로 CI와 native workflow를
새로 실행한다. native workflow의 Windows x64 build job은 desktop test·Clippy를 통과해야 하며
installer smoke는 MSI/NSIS의 반복 ready/close cycle을 각각 증명해야 한다. 성공한 Linux x64 artifact를
입력으로 Linux GUI workflow를 실행해 direct probe, document UX, native open/save/print/drag suite를
모두 통과시킨다. 실패 run과 이전 SHA artifact는 완료 근거로 재사용하지 않는다.

커밋:

```text
Task #20 [Stage 4.1]: cross-platform lifecycle acceptance gate 보정
```

먼저 Stage 4.1 source·계획·오늘할일을 correction candidate commit에 묶어 exact SHA를 만든다. 그 SHA의
Windows/Linux native와 Linux GUI 수용이 모두 통과한 뒤 `task-stage-report` 절차로
`mydocs/working/task_m010_20_stage4_1.md`를 작성·검증·커밋한다. 수용 전 단계 보고서를 미리 작성하거나
실패 run을 완료 근거로 사용하지 않는다.

## 통합 검증

- 각 Stage focused test와 `git diff --check`를 해당 단계 보고서 작성 전에 실행한다.
- Stage 3에서 `pnpm run test:upstream`, `pnpm run test:studio`, `pnpm run build:studio`, `pnpm run check:product-boundary`를 모두 통과한다.
- Stage 4.1 correction exact SHA의 Windows/Linux native 결과와 Linux GUI 전체 결과를 각각 확보한다.
- 최종 source에서 adapter 반복 setup은 이전 generation을 회수하고 uninstall 뒤 Tauri listener, close listener, wheel listener, toolbar subscription, handler waiter timer가 남지 않는다.
- exact upstream Studio entry, 12개 leaf alias, 파일 300 LOC와 함수 50 LOC 권장 상한을 유지한다.
- 실패한 검증은 단계 완료로 처리하지 않으며 계획 범위를 바꾸는 correction은 먼저 승인을 받는다.

## 커밋

- 현재 구현계획 승인용 커밋: `Task #20: 구현 계획서 작성과 오늘할일 갱신`
- 각 Stage source와 `mydocs/working/task_m010_20_stage{N}.md`는 해당 Stage 커밋에 함께 묶는다.
- 세부 correction이 승인되면 `Task #20 [Stage N.M]: 내용` 형식을 사용한다.
- Stage 4 완료 전 최종 보고서와 `publish/task20` PR 게시 단계로 넘어가지 않는다.

## 단계 의존성

- Stage 1은 이 구현계획 승인 후 시작한다.
- Stage 2는 Stage 1 검증·보고서 승인 후 시작한다.
- Stage 3은 Stage 2 검증·보고서 승인 후 시작한다.
- Stage 4는 Stage 3 검증·보고서 승인과 exact commit 확정 후 시작한다.
- Stage 4.1은 첫 Stage 4 수용에서 확인된 harness correction 계획 변경 승인 후 시작하고, 새 exact SHA의 수용이 끝나야 Stage 4를 완료한다.
- 모든 Stage는 `task-stage-report` 절차로 보고·커밋하고 작업지시자 승인 없이 다음 Stage로 넘어가지 않는다.

## 위험과 대응

- **async listener late completion**: generation cancellation 뒤 얻은 disposer를 즉시 실행하고 부분 실패 rollback test로 listener 부활을 막는다.
- **최신 registration 오해제**: dispatcher와 embed runtime 모두 registration identity 비교를 사용하고 stale cleanup 순서를 focused test로 고정한다.
- **waiter timer 누수**: 모든 resolve/reject/timeout을 단일 settle helper로 통과시켜 Set과 timer를 함께 회수한다.
- **navigator platform 오판정**: Windows/Linux platform과 user agent fixture를 분리하고 Stage 4 실제 WebView에서 기존 platform 보정 진입을 smoke 검증한다.
- **native 수용의 circular evidence**: Stage 3 source commit을 먼저 고정하고 Stage 4를 검증 전용 단계로 분리해 exact SHA와 결과를 결속한다.
- **GUI harness 오탐**: direct driver capability, 숨김 입력, portal application 탐색과 environment inventory를 계약 test로 고정하고 실제 Linux GUI run으로 확인한다.
- **Windows process 생존 오인**: input-idle, main window, responsiveness, graceful close와 두 번째 clean launch를 모두 만족해야 lifecycle smoke로 인정한다.
- **macOS 검증 오용**: 플랫폼 중립 TypeScript gate만 현재 호스트에서 실행하고 Rust/Tauri 성공은 Windows/Linux 결과만 인정한다.

## 승인 요청 사항

- 승인된 마지막 경계를 code/doc Stage 3과 exact Windows/Linux 수용 Stage 4로 나누는 4단계 분할
- Stage 1의 generation 기반 composite disposer, partial setup rollback과 late completion cleanup 방식
- Stage 2의 atomic handler replacement, stale uninstaller 보호, sync getter 제거와 waiter settle 방식
- Stage 3에서 navigator 판정으로 단일화하고 native `desktop_platform` command를 제거하는 구체적 파일 범위
- Stage 4에서 Stage 3 exact SHA의 Windows/Linux Rust test·Clippy·Tauri build와 reload smoke를 완료 gate로 두는 검증 범위
- 각 Stage 산출물, 검증 명령과 커밋 메시지

승인되면 Stage 1 구현을 시작하고, 완료 시 `task-stage-report` 절차로 Stage 1 source·보고서 커밋과 다음 단계 승인을 요청한다.
