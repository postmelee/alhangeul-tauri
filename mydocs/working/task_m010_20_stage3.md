# Task #20 Stage 3 완료보고서 — dead platform bridge 제거와 경계 정렬

GitHub Issue: [#20](https://github.com/postmelee/alhangeul-tauri/issues/20)
구현계획서: [`task_m010_20_impl.md`](../plans/task_m010_20_impl.md)
Stage: 3

## 단계 목적

Studio WebView의 Windows/Linux 판정을 navigator 기반 leaf adapter 한 곳으로 단일화하고, 더 이상 필요하지 않은 platform override/cache와 native IPC command를 제거한다. direct print가 job 시작 시 판정한 값을 기존 Windows modal lifecycle과 Linux uniform-page 보정에 그대로 전달하고, 제거된 handler getter·platform hydration·native command가 다시 들어오지 못하도록 제품 경계와 공식 문서를 정렬하는 것이 이번 단계의 완료 기준이었다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/core/platform.ts` | platform override/cache, hydration API와 Tauri dynamic invoke를 제거하고 `DesktopPlatform`, `detectDesktopPlatform()`, `isTauriRuntime()`만 유지했다. |
| `apps/studio-host/src/core/platform.test.ts` | Windows `navigator.platform`, Windows user agent fallback, Linux, unknown과 Tauri runtime 판정을 public API 기준으로 검증했다. |
| `apps/studio-host/src/command/direct-print.ts` | print job 시작 시 `detectDesktopPlatform()`을 한 번 호출해 기존 print document와 UI return waiter 분기에 전달하도록 바꿨다. |
| `apps/studio-host/src/command/direct-print.test.ts` | hydration mock을 동기 detector seam으로 교체하고 unknown·Windows·Linux print 동작과 job당 한 번 판정을 검증했다. |
| `apps/desktop/src-tauri/src/commands.rs` | 사용되지 않는 native platform command를 제거했다. |
| `apps/desktop/src-tauri/src/lib.rs` | 제거한 command import와 `generate_handler!` 등록만 삭제하고 다른 native command 순서를 유지했다. |
| `apps/studio-host/src/core/upstream-boundary.test.ts` | async handler acquisition과 navigator detector를 긍정 계약으로, 제거된 세 bridge 이름의 production 부재를 negative contract로 고정했다. 기존 exact upstream entry와 12개 leaf alias 계약은 유지했다. |
| `tests/rhwp-baseline.test.mjs` | Studio handler/platform 소유 경계와 native command 부재를 repository baseline으로 고정했다. |
| `docs/architecture/UPSTREAM.md` | sync getter 설명을 active registration 기반 비동기 acquisition으로 바꾸고 platform 판정이 native IPC가 아닌 Studio WebView leaf 소유임을 기록했다. |

`platform.ts`는 24 LOC, `direct-print.ts`는 180 LOC로 300 LOC 권장 상한 안이다. 기존 print helper 분리와 함수 구조는 유지했으며 새 함수나 복잡한 분기를 추가하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

공식 문서는 구현계획에서 승인된 `docs/architecture/UPSTREAM.md` 위치의 “문서 저장, PDF와 실제 인쇄 경계” 한 문단만 최소 수정했다. handler leaf 여섯 개, HWP/HWPX 저장 검증과 원자 교체, native commit 뒤 dirty/recovery 정리 설명은 보존하고, 실제 구현과 달랐던 sync getter·native platform IPC 설명만 registration lifecycle과 navigator detector 소유권으로 교체했다. PDF와 실제 인쇄 문단은 수정하지 않았다.

코드에서는 Issue #15가 확정한 hidden print surface, 출력 전 pagination flush, Windows modal waiter, Linux uniform-page default context·1px tolerance와 mixed-size stylesheet 보존 동작을 변경하지 않았다. `unknown`은 기존처럼 플랫폼 전용 보정을 받지 않는다. `third_party/rhwp`는 수정하지 않았다.

## 검증 결과

실행 명령:

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

결과:

- OK — focused Vitest 명령이 Studio suite 21개 파일, 110개 test를 실행했고 모두 통과했다.
- OK — Windows platform·user agent fallback, Linux와 unknown 판정, Tauri runtime public API test가 통과했다.
- OK — unknown의 무보정, Windows modal focus lifecycle, Linux uniform-page fragment·mixed-size stylesheet와 detector 1회 호출 test가 통과했다.
- OK — `test:upstream`이 36개 baseline·pin·update test를 실행했고 모두 통과했다.
- OK — `test:studio`가 21개 파일, 110개 test를 실행했고 모두 통과했다.
- OK — `tsc && vite build`가 type error 없이 213개 module을 변환해 production Studio bundle을 생성했다.
- OK — build의 dynamic import·500 kB chunk warning은 기존 non-blocking bundle warning이며 새 platform 경계 오류는 없다.
- OK — `check:product-boundary`가 225개 파일을 검사해 violation 없이 통과했다.
- OK — 제거 대상 이름 검색은 negative contract 두 파일을 제외한 `apps`, `tests`, `docs`에서 exit 1과 빈 출력으로 완료됐다.
- OK — `git diff --check`가 빈 출력으로 통과했다.
- 계획 준수 — 현재 macOS 호스트에서는 Rust desktop test, Clippy와 Tauri build를 실행하거나 수용 근거로 기록하지 않았다.

## 잔여 위험

- navigator platform·user agent 판정은 지원 WebView의 실제 Windows/Linux 신호에 의존한다. 두 OS의 production WebView 판정은 Stage 4 smoke에서 확인한다.
- native command registry 변경은 현재 호스트에서 source·boundary test로만 검증했다. Rust compile, Clippy와 Tauri production build 성공은 Stage 4 Windows/Linux exact-SHA 검증 전까지 미수용 상태다.
- Windows system print dialog와 Linux WebKitGTK 인쇄의 실제 modal·fragment 동작은 focused test로 회귀를 막았지만, 실제 환경 수용은 Stage 4 smoke에 남아 있다.

## 다음 단계 영향

- 이 Stage 3 커밋 SHA를 Stage 4 Windows x64·Linux x64 검증 checkout의 exact 입력으로 고정해야 한다.
- Stage 4는 제품 source와 공식 문서를 수정하지 않고, 양 플랫폼의 frozen install, Rust test·Clippy, Studio·Tauri build와 반복 setup/reload smoke 결과만 기록한다.
- native 검증 중 correction이 필요하면 Stage 4를 완료하지 않고 구현계획 변경 승인을 요청한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 exact-SHA Windows/Linux lifecycle 수용으로 진행한다.
