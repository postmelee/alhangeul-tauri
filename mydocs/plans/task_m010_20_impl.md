# Task #20 구현계획서 — desktop adapter lifecycle과 dead bridge 정리

수행계획서: [`task_m010_20.md`](task_m010_20.md)
GitHub Issue: [#20](https://github.com/postmelee/alhangeul-tauri/issues/20)
마일스톤: M010

2026-08-24 작업지시자가 수행계획 진행을 승인했다. 승인된 dispatcher/event lifecycle, embed handler lifecycle, dead platform bridge 제거의 세 경계를 유지한다. 다만 dead bridge 코드 변경과 지원 플랫폼의 exact-SHA 수용을 분리하기 위해 마지막 경계를 Stage 3과 Stage 4로 나눈다. Stage 4는 Stage 3 commit을 Windows/Linux에서 검증하는 수용 단계이며 별도 기능 범위를 추가하지 않는다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | dispatcher와 DOM/native event lifecycle 명시 | `dispatcher.ts`, `desktop-events.ts`, `desktop-toolbar-mode-sync.ts` | 반복·경쟁·부분 실패·dispose focused test |
| 2 | embed handler registration과 waiter lifecycle 정리 | `desktop-runtime.ts`와 test | 교체·stale cleanup·timer 회수 focused test |
| 3 | dead platform bridge 제거와 공식 경계 정렬 | platform/direct-print, Rust registry, boundary test와 `UPSTREAM.md` | 플랫폼 중립 전체 Studio/upstream gate |
| 4 | exact-SHA Windows/Linux lifecycle 수용 | Stage 3 exact commit의 native 결과와 `_stage4.md` | 양 플랫폼 Rust/Clippy/Tauri build와 reload smoke |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| upstream handler/platform 소유 계약 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | Stage 3에서 기존 handler acquisition 문장과 native command 경계만 최소 수정 |
| 구현계획·단계 판단 | `mydocs/plans/`, `mydocs/working/` | `task_m010_20_impl.md`, `task_m010_20_stage{1..4}.md` | OK | Hyper-Waterfall 승인·검증 기록 |
| 오늘할일 | `mydocs/orders/` | `mydocs/orders/20260824.md` | OK | 현재 승인 대기 단계만 짧게 기록 |

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

## 통합 검증

- 각 Stage focused test와 `git diff --check`를 해당 단계 보고서 작성 전에 실행한다.
- Stage 3에서 `pnpm run test:upstream`, `pnpm run test:studio`, `pnpm run build:studio`, `pnpm run check:product-boundary`를 모두 통과한다.
- Stage 4에서 같은 Stage 3 exact SHA의 Windows/Linux native 결과를 각각 확보한다.
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
- 모든 Stage는 `task-stage-report` 절차로 보고·커밋하고 작업지시자 승인 없이 다음 Stage로 넘어가지 않는다.

## 위험과 대응

- **async listener late completion**: generation cancellation 뒤 얻은 disposer를 즉시 실행하고 부분 실패 rollback test로 listener 부활을 막는다.
- **최신 registration 오해제**: dispatcher와 embed runtime 모두 registration identity 비교를 사용하고 stale cleanup 순서를 focused test로 고정한다.
- **waiter timer 누수**: 모든 resolve/reject/timeout을 단일 settle helper로 통과시켜 Set과 timer를 함께 회수한다.
- **navigator platform 오판정**: Windows/Linux platform과 user agent fixture를 분리하고 Stage 4 실제 WebView에서 기존 platform 보정 진입을 smoke 검증한다.
- **native 수용의 circular evidence**: Stage 3 source commit을 먼저 고정하고 Stage 4를 검증 전용 단계로 분리해 exact SHA와 결과를 결속한다.
- **macOS 검증 오용**: 플랫폼 중립 TypeScript gate만 현재 호스트에서 실행하고 Rust/Tauri 성공은 Windows/Linux 결과만 인정한다.

## 승인 요청 사항

- 승인된 마지막 경계를 code/doc Stage 3과 exact Windows/Linux 수용 Stage 4로 나누는 4단계 분할
- Stage 1의 generation 기반 composite disposer, partial setup rollback과 late completion cleanup 방식
- Stage 2의 atomic handler replacement, stale uninstaller 보호, sync getter 제거와 waiter settle 방식
- Stage 3에서 navigator 판정으로 단일화하고 native `desktop_platform` command를 제거하는 구체적 파일 범위
- Stage 4에서 Stage 3 exact SHA의 Windows/Linux Rust test·Clippy·Tauri build와 reload smoke를 완료 gate로 두는 검증 범위
- 각 Stage 산출물, 검증 명령과 커밋 메시지

승인되면 Stage 1 구현을 시작하고, 완료 시 `task-stage-report` 절차로 Stage 1 source·보고서 커밋과 다음 단계 승인을 요청한다.
