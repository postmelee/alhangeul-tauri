# Task #20 Stage 2 완료보고서 — embed handler registration lifecycle 정리

GitHub Issue: [#20](https://github.com/postmelee/alhangeul-tauri/issues/20)
구현계획서: [`task_m010_20_impl.md`](../plans/task_m010_20_impl.md)
Stage: 2

## 단계 목적

Studio embed runtime의 module 전역 handler 상태를 설치 단위 registration으로 캡슐화한다. 새 runtime 설치 실패, 기존 runtime 교체, stale uninstaller 재호출과 runtime 종료가 겹쳐도 최신 handler와 waiter 소유권이 섞이지 않게 하고, resolve·reject·timeout 모든 경로에서 waiter와 timer를 함께 회수하는 것이 이번 단계의 완료 기준이었다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/embed/desktop-runtime.ts` | active registration이 desktop handler leaf, upstream uninstaller, disposed 상태와 waiter Set을 소유하게 했다. upstream 설치 성공 뒤에만 registration을 교체하고, idempotent disposer와 단일 settle 경로로 stale cleanup·lifecycle 종료·timeout을 처리한다. 동기 `getDesktopStudioHandlers()` export는 제거했다. |
| `apps/studio-host/src/embed/desktop-runtime.test.ts` | leaf handler acquisition, 자동 replacement, 설치 실패 시 기존 registration 보존, stale cleanup 격리, uninstall/reinstall, resolve·reject·timeout timer 회수를 public async API와 uninstaller 기준으로 검증했다. |

제품 source는 151 LOC, test는 181 LOC로 각각 300 LOC 권장 상한 이하다. registration 책임은 `EmbedRuntimeRegistration`으로 모으고 waiter 생성·settle, handler leaf pick과 upstream cleanup을 작은 helper로 분리해 변경 함수와 method도 50 LOC 권장 상한 안에 유지했다.

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이므로 문서 본문 변경은 해당 없다. upstream `installEmbedRuntime()` 호출과 반환 cleanup 계약, `loadFile`, `pageCount`, `getPageSvg`, `exportHwp`, `exportHwpx`, `notifySaved`의 여섯 handler leaf 목록은 유지했다. native host에 upstream handler object 전체나 renderer 구현을 노출하지 않는다.

`getDesktopStudioHandlers()` 동기 getter는 제거하고 handler 소비 경계를 `waitForDesktopStudioHandlers()`로 단일화했다. active registration이 있어도 handler 전달을 microtask로 예약해 같은 tick의 replacement 또는 uninstall이 아직 전달되지 않은 acquisition을 lifecycle 오류로 종료할 수 있게 했다. `desktop-host-dependencies.ts`의 비동기 `handlers()` 경계는 변경할 필요가 없어 수정하지 않았다. `third_party/rhwp`와 공식 문서는 수정하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/embed/desktop-runtime.test.ts src/core/desktop-host.test.ts src/core/desktop-persistence.test.ts
pnpm run check:product-boundary
pnpm run build:studio
git diff --check
```

결과:

- OK — 승인된 Vitest 명령이 Studio suite 21개 파일, 108개 test를 실행했고 모두 통과했다.
- OK — replacement가 이전 upstream runtime을 한 번만 해제하고 미전달 acquisition을 reject하며, stale cleanup은 최신 registration을 제거하지 않는 focused test가 통과했다.
- OK — replacement 설치가 throw하면 기존 registration과 handler acquisition이 유지되고 기존 upstream uninstaller가 호출되지 않는 focused test가 통과했다.
- OK — pending-before-install resolve, active runtime uninstall reject, clean reinstall과 timeout 경로 모두 timer를 0개로 회수하는 focused test가 통과했다.
- OK — handler object가 계획한 여섯 leaf만 포함하고 `getDesktopStudioHandlers` 참조가 Studio production/test source에 남지 않았다.
- OK — `check:product-boundary`가 225개 파일을 검사해 violation 없이 통과했다.
- OK — `tsc && vite build`가 type error 없이 213개 module을 변환해 production Studio bundle을 생성했다.
- OK — build의 dynamic import·500 kB chunk warning은 기존 non-blocking bundle warning이며 새 registration lifecycle 오류는 없다.
- OK — `git diff --check`가 빈 출력으로 통과했다.

## 잔여 위험

- handler 전달 전에 같은 tick에서 runtime이 교체·종료되면 acquisition은 의도적으로 lifecycle 오류를 받는다. 소비자는 기존 비동기 경계에서 새 runtime 준비를 다시 기다려야 한다.
- upstream uninstaller가 throw해도 local registration과 나머지 waiter cleanup을 마치기 위해 경고를 남기고 종료한다. 실제 WebView에서 upstream cleanup 오류가 발생하는지는 Stage 4 reload smoke에서 관찰한다.
- 실제 Windows/Linux WebView reload·재호출 smoke는 구현계획의 Stage 4 exact-SHA 수용에서 확인한다. 이번 단계는 platform-neutral focused test와 production Studio build까지만 완료했다.

## 다음 단계 영향

- Stage 3 boundary test에서 `getDesktopStudioHandlers`의 production 부재를 negative contract로 고정하고, `docs/architecture/UPSTREAM.md`의 sync getter 설명을 비동기 handler acquisition과 registration lifecycle 설명으로 갱신한다.
- Stage 3은 dead platform bridge와 native `desktop_platform` command를 제거하되, 이번 단계의 `desktop-runtime.ts`와 비동기 `desktop-host-dependencies.ts` 경계는 다시 변경하지 않는다.
- Stage 4 reload smoke는 runtime 재설치 뒤 이전 handler가 재사용되지 않고 pending waiter와 listener가 남지 않는지를 이번 단계의 focused test와 함께 수용 근거로 사용한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 dead platform bridge 제거와 공식 경계 정렬로 진행한다.
