# Task #13 Stage 3 보고서 — Tauri native lifecycle·font·recent adapter 재결합

GitHub Issue: [#13](https://github.com/postmelee/alhangeul-tauri/issues/13)
구현계획서: [`task_m010_13_impl.md`](../plans/task_m010_13_impl.md)
Stage: 3

## 단계 목적

Stage 2에서 복원한 exact upstream `rhwp-studio v0.8.2` entry와 renderer를 유지하면서 Windows/Linux 데스크톱에 필요한 native open·session·dirty·save·print·recent·local font 동작만 leaf adapter로 다시 연결한다. 문서 모델과 render의 진실 원천은 upstream embed handler에 두고, 기존 native `WasmBridge` fork와 edit·format·shortcut shadow를 제거한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/core/desktop-host.ts`, `desktop-host-dependencies.ts`, `desktop-session.ts` 및 test | native docId/path/format/revision 세션과 Tauri 호출을 upstream `loadFile`·`exportHwp`·`notifySaved` handler에 연결했다. 같은 경로 동시 open은 하나로 합치고 load 성공 뒤에만 session/recent를 확정하며 실패한 native session은 닫는다. |
| `apps/studio-host/src/core/desktop-events.ts` 및 test | association·pending open·drag path·menu·close event를 `DesktopHost`와 동일 upstream dispatcher에 연결하고 event/pending 중복 path를 제거한다. |
| `apps/studio-host/src/command/dispatcher.ts`, `core/document-dirty-state.ts` 및 test | upstream dispatcher와 dirty state를 상속해 동일 command services를 native event에 결합하고 upstream dirty 상태를 native session/title에 동기화한다. |
| `apps/studio-host/src/command/commands/file.ts` 및 test | upstream file command 배열을 유지하면서 Tauri의 new/open/recent/HWP save/print execute만 교체하고 `file:new-window`를 보충했다. HWPX와 PDF command는 Stage 4 전까지 upstream 구현을 그대로 둔다. |
| `apps/studio-host/src/recent/recent-store.ts` 및 test | upstream recent store API를 native store에 연결하되 DOM record에는 파일명·형식·opaque id만 노출하고 실제 경로는 adapter 내부 map에 보관한다. |
| `apps/studio-host/src/core/document-files.ts`, `platform.ts`, `embed/desktop-runtime.ts` 및 test | chunk read 전후 fingerprint 안정성 검사, Tauri runtime 판별, embed handler 준비 대기를 추가했다. |
| `apps/studio-host/src/core/font-loader.ts`, `local-fonts.ts`, `local-font-provider.ts`, `local-font-records.ts`, `font-policy-wasm-bridge.ts` 및 test | upstream font loader를 그대로 재노출하고 local font provider와 제한 글꼴 filter만 분리했다. upstream `WasmBridge` 전체를 복제하지 않고 글꼴 ID 생성 두 메서드만 정책 leaf subclass로 감쌌다. |
| `apps/studio-host/alhangeul-overrides.ts`, `core/upstream-boundary.test.ts` | 활성 alias를 15개에서 12개 leaf adapter로 줄이고 Stage 3 제거 파일의 물리적 부재와 owner 경계를 고정했다. |
| `apps/studio-host/vite.config.ts`, `tests/rhwp-baseline.test.mjs` | exact upstream 메뉴에 `새 창` 한 항목만 보충하고 native lifecycle leaf 구조, upstream PDF/HWPX command 상속, legacy shadow 부재를 저장소 기준선으로 추가했다. |
| 삭제 12개 파일 | `tauri-bridge`, `bridge-factory`, `font-application`, edit·format·shortcut override와 해당 test를 제거했다. |

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이므로 문서 본문 무손실은 해당 없다. `third_party/rhwp`의 source와 pin은 변경하지 않았고 exact upstream HTML·main·Toolbar·renderer·browser recovery/autosave lifecycle도 수정하지 않았다. 제품 동작은 alias 12개와 HTML의 `file:new-window` 한 항목에서만 보충한다.

기존 486 LOC native `WasmBridge` subclass를 제거하고 `desktop-host` 264 LOC, `desktop-session` 70 LOC, font-policy bridge 14 LOC 등 역할별 adapter로 분리했다. `desktop-host`의 Stage 3 save 구현은 기존 native HWP 저장 호환을 유지하기 위한 전환 경로이며 HWPX 저장 일반화와 직접 PDF 생성은 포함하지 않는다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/desktop-events.test.ts src/core/desktop-host.test.ts src/core/desktop-session.test.ts src/recent/recent-store.test.ts src/core/local-fonts.test.ts src/core/font-authoring-policy.test.ts src/command/commands/file.test.ts
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run src/core/desktop-session.test.ts src/core/desktop-host.test.ts src/core/desktop-events.test.ts src/recent/recent-store.test.ts src/core/document-files.test.ts src/command/commands/file.test.ts src/command/dispatcher.test.ts src/core/document-dirty-state.test.ts src/embed/desktop-runtime.test.ts src/core/upstream-boundary.test.ts src/core/font-policy-wasm-bridge.test.ts src/core/local-fonts.test.ts src/core/font-authoring-policy.test.ts
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

결과:

- OK — 구현계획서의 filtered 명령은 package script argv 처리에 따라 전체 Studio suite를 실행했고 15 files, 56 tests가 통과했다.
- OK — native lifecycle·font·boundary 직접 focused 실행은 13 files, 48 tests가 통과했다.
- OK — product boundary: 160 files scanned, violation 0.
- OK — upstream pin/baseline/update suite: 34 tests passed. 새 기준선은 native host가 upstream `loadFile` 뒤 session을 확정하고 legacy native bridge가 없음을 검사한다.
- OK — 전체 Studio suite: 15 files, 56 tests passed.
- OK — TypeScript와 exact upstream Vite production build: 207 modules transformed, build completed. `dist/index.html`에 `file:new-window`, upstream `file:print-to-pdf`, upstream `file:save-as-hwpx` 세 메뉴가 함께 존재한다.
- OK — `git diff --check`: whitespace error 0.
- 참고 — Vite가 CanvasKit의 browser externalization, Tauri API의 ineffective dynamic import, 500 kB 초과 chunk를 경고했으나 bundle은 성공했다. 이번 Stage의 동작 실패는 아니다.

## 잔여 위험

- macOS에서는 지원 범위 밖이므로 Rust desktop/Tauri build를 실행하지 않았다. native open·dialog·association·drag·save·print·recent의 실제 수용 여부는 Windows/Linux Stage 6 gate 전까지 확정하지 않는다.
- Stage 3의 native source save는 기존 HWP staging만 유지한다. HWPX source save와 직접 저장 PDF는 아직 upstream browser command이므로 데스크톱 완성 동작이 아니며 Stage 4에서 교체한다.
- 새 문서 native session 확정은 upstream `document-initialized` clean event에 의존한다. 단위 테스트로 handshake를 고정했지만 실제 WebView event 순서는 플랫폼 수용 검증 대상이다.
- production chunk 크기와 CanvasKit/Tauri import 경고는 기존 bundle 특성으로 남아 있다.

## 다음 단계 영향

- Stage 4는 현재 `DesktopHost.saveCurrentHwp()`를 `hwp | hwpx` format-aware save로 일반화하고 source save가 성공했을 때만 session/recent/dirty/recovery를 확정해야 한다.
- upstream `file:print-to-pdf`의 위치·label·활성 규칙은 유지한 채 execute만 page-at-a-time native PDF job으로 교체한다. `file:print` native 인쇄와 분리하고 PDF 성공 시 `notifySaved`를 호출하지 않는다.
- Stage 3에서 마련한 `getDesktopStudioHandlers()`가 HWP/HWPX bytes와 현재 편집 상태 page SVG를 가져오는 유일한 model/render 경계다. Rust parser나 별도 renderer를 UI 경로에 다시 결합하지 않는다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 HWP/HWPX 저장 일반화와 native PDF override 통합으로 진행한다.
