# Task #20 Stage 1 완료보고서 — desktop adapter lifecycle 명시

GitHub Issue: [#20](https://github.com/postmelee/alhangeul-tauri/issues/20)
구현계획서: [`task_m010_20_impl.md`](../plans/task_m010_20_impl.md)
Stage: 1

## 단계 목적

같은 Tauri WebView에서 `CommandDispatcher`가 다시 만들어지거나 setup이 교체·해제될 때 toolbar coordinator, Tauri event/close listener와 Windows wheel reroute가 한 generation만 활성 상태로 남도록 lifecycle을 명시한다. 비동기 listener setup의 late completion과 부분 실패, dispose 뒤 예약 toolbar render가 이전 세대를 되살리지 못하게 하는 것이 이번 단계의 완료 기준이었다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/command/dispatcher.ts` | active registration, `AbortController`, composite disposer와 명시적 `dispose()`를 추가해 새 dispatcher가 이전 세대를 교체하고 stale cleanup이 최신 세대를 건드리지 못하게 했다. |
| `apps/studio-host/src/command/dispatcher.test.ts` | active cleanup 소유, 두 번 dispose, generation 교체, late setup 결과 회수와 setup 실패의 fail-closed 동작을 검증했다. |
| `apps/studio-host/src/core/desktop-events.ts` | `ensureDesktopEvents`의 영구 WeakMap cache를 제거하고, 모든 Tauri unlisten·close listener·Windows wheel disposer·drag 상태를 수집하는 AbortSignal 연동 `DisposerStack`을 도입했다. 부분 등록 실패와 abort 시 등록 완료분을 역순 정리한다. |
| `apps/studio-host/src/core/desktop-events.test.ts` | 기존 open/menu/drag/close 동작을 보존하면서 unlisten 7개, idempotent dispose, 부분 실패 rollback과 abort 뒤 늦은 unlisten 회수를 검증했다. |
| `apps/studio-host/src/core/desktop-toolbar-mode-sync.ts` | dispose 상태를 추가해 구독·class cleanup을 한 번만 실행하고, 이미 예약된 render callback이 종료 뒤 DOM을 다시 쓰지 못하게 했다. |
| `apps/studio-host/src/core/desktop-toolbar-mode-sync.test.ts` | queued render 차단과 두 번 dispose에서 subscription/class cleanup이 한 번만 수행되는지 검증했다. |

제품 source는 모두 300 LOC 이하이며 `dispatcher.ts` 81 LOC, `desktop-events.ts` 193 LOC, `desktop-toolbar-mode-sync.ts` 143 LOC다. `setupDesktopEvents`와 listener 등록을 분리해 변경 함수도 50 LOC 권장 상한 안에 유지했다.

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이므로 문서 본문 변경은 해당 없다. 기존 native progress, menu dispatch, pending/open path dedup, drag 안내, close confirmation과 toolbar mode 전환 문자열·기능은 유지했다. lifecycle API는 `setupDesktopEvents()`가 disposer를 반환하도록 구체화했고 `CommandDispatcher.dispose()`를 추가했다. 이전 `ensureDesktopEvents()`의 host별 영구 cache는 제거했으며 repository 내 모든 call site와 test를 새 설치·해제 계약에 맞췄다.

`third_party/rhwp`와 공식 문서는 수정하지 않았다. 격리 worktree 초기 submodule clone이 source checkout 없이 끝나 첫 test가 upstream alias를 찾지 못했으나, 메인 worktree의 동일 shallow `v0.8.2` tag 객체로 exact commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`을 복구한 뒤 동일 명령을 다시 실행했다. 최종 root status에서 submodule 변경은 없다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/dispatcher.test.ts src/core/desktop-events.test.ts src/core/desktop-toolbar-mode-sync.test.ts src/core/windows-wheel-zoom.test.ts
pnpm run check:product-boundary
pnpm run build:studio
git diff --check
```

결과:

- OK — 승인된 Vitest 명령이 Studio suite 21개 파일, 105개 test를 실행했고 모두 통과했다.
- OK — 반복 setup, stale dispatcher cleanup, late async setup, listener 부분 실패, AbortSignal, 두 번 dispose와 dispose 뒤 queued toolbar render focused test가 통과했다.
- OK — `check:product-boundary`가 225개 파일을 검사해 violation 없이 통과했다.
- OK — `tsc && vite build`가 type error 없이 213개 module을 변환해 production Studio bundle을 생성했다.
- OK — build의 dynamic import·500 kB chunk warning은 기존 non-blocking bundle warning이며 새 lifecycle 오류는 없다.
- OK — `git diff --check`가 빈 출력으로 통과했다.

## 잔여 위험

- Tauri listener Promise 자체를 강제 취소할 수는 없다. generation abort 뒤 Promise가 resolve되면 즉시 unlisten하지만, native API가 영구 pending되는 비정상 상황은 WebView 종료에 의존한다.
- 실제 Windows/Linux WebView reload·재호출 smoke는 구현계획의 Stage 4 exact-SHA 수용에서 확인한다. 이번 단계는 platform-neutral focused test와 production Studio build까지만 완료했다.
- cleanup 함수가 throw해도 나머지 disposer는 계속 실행하고 경고를 남긴다. 실제 Tauri unlisten 오류의 환경별 발생 여부는 Stage 4에서 관찰한다.

## 다음 단계 영향

- Stage 2 embed runtime도 active registration identity, idempotent uninstaller와 late/stale cleanup 보호를 같은 원칙으로 적용할 수 있다.
- `CommandDispatcher.dispose()`와 desktop event disposer는 Stage 2 handler lifecycle과 독립적이므로 Stage 2에서 이번 Stage source를 다시 수정하지 않는다.
- Stage 3 platform bridge 제거 뒤에도 `detectDesktopPlatform()`은 Windows wheel 설치 조건으로 남으므로 현재 listener lifecycle test를 회귀 gate로 유지한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 embed handler registration과 waiter lifecycle 정리로 진행한다.
