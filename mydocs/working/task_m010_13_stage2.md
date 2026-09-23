# Task #13 Stage 2 보고서 — exact upstream Studio entry 전환

GitHub Issue: [#13](https://github.com/postmelee/alhangeul-tauri/issues/13)
구현계획서: [`task_m010_13_impl.md`](../plans/task_m010_13_impl.md)
Stage: 2

## 단계 목적

`rhwp v0.8.2`의 `rhwp-studio/index.html`, `src/main.ts`, 메뉴·Toolbar·CanvasView·Ruler·theme·browser recovery/autosave 생명주기를 실제 제품 bundle entry로 복원한다. Alhangeul은 제품명·버전·아이콘·Windows/Linux form-control 글꼴 보정과 다음 Stage의 native 결합에 필요한 embed handler registry만 leaf adapter로 유지한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/vite.config.ts` | Vite root를 read-only upstream Studio에, cache/outDir을 local host에 고정했다. 제품 title·접근성 제목·아이콘·12 LOC 보충 CSS와 font assets만 추가한다. |
| `apps/studio-host/src/embed/desktop-runtime.ts` | upstream embed runtime 설치를 그대로 위임하면서 `loadFile`, `pageCount`, `getPageSvg`, `exportHwp`, `exportHwpx`, `notifySaved` handler 참조만 등록하는 38 LOC leaf adapter를 추가했다. |
| `apps/studio-host/src/embed/desktop-runtime.test.ts` | upstream options 무변형 위임, handler identity, cleanup, stale cleanup 안전성을 2개 test로 검증한다. |
| `apps/studio-host/alhangeul-overrides.ts` | Stage 2 제거 대상 alias를 삭제하고 `@/embed/runtime` leaf replacement를 추가해 활성 override를 31개에서 15개로 줄였다. |
| `apps/studio-host/src/core/upstream-boundary.test.ts` | 남은 15개 override, 최종 leaf 10개, Stage 2 entry/UI/view/style shadow의 물리적 부재를 검사한다. |
| `apps/studio-host/src/command/commands/file.ts` 및 test | Stage 3 native command 결합 전까지 upstream file command와 unsaved guard를 동일 객체로 재노출한다. |
| `apps/studio-host/src/core/font-loader.ts` | exact upstream main이 요구하는 CanvasKit font plan export를 upstream에서 재노출한다. 전체 font adapter 정리는 Stage 3 범위로 유지한다. |
| `apps/studio-host/src/style.css` | upstream CSS 재수입을 제거하고 form-control 상속 글꼴과 Alhangeul version 표시에 필요한 12 LOC만 남겼다. |
| `tests/rhwp-baseline.test.mjs` | exact upstream entry, upstream validation/unsaved guard/PDF·HWPX 메뉴 상속, local entry·renderer shadow 부재를 기준으로 갱신했다. |
| 삭제 31개 파일 | local `index.html`, `src/main.ts`, `src/view/` 전체, Toolbar·validation modal 등 일반 UI 복제본과 전용 CSS/test를 제거했다. |

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이므로 문서 본문 무손실은 해당 없다. 제품 UI 본문은 local entry를 수정해 흉내 내는 방식에서 upstream v0.8.2 원본을 직접 번들하는 방식으로 전환했다. local entry/UI/view 복제 제거와 adapter 축소를 포함해 staged diff 기준 7,584 lines를 삭제했으며 upstream submodule 본문과 pin은 수정하지 않았다.

구현계획서에 변경 대상으로 적은 `vitest.config.ts`와 `tsconfig.json`은 수정하지 않았다. 두 설정은 이미 typed override spec과 `@upstream` 경로를 사용하고 있었고, Vite production build가 upstream entry를 직접 transform해 추가 변경 없이 검증되었다. 대신 exact entry에서 새로 요구된 `resolveCanvasKitFontPlan`을 기존 font adapter가 재노출하도록 보정했다.

upstream browser recovery/autosave는 upstream `main.ts` 초기화 그대로 활성화된다. 별도 native recovery 저장소나 명령은 추가하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/embed/desktop-runtime.test.ts src/core/upstream-boundary.test.ts
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run src/embed/desktop-runtime.test.ts src/core/upstream-boundary.test.ts
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

결과:

- OK — 구현계획서의 filtered 명령은 현재 package script argv 처리에 따라 전체 Studio suite를 실행했고 15 files, 69 tests가 통과했다.
- OK — 직접 focused 실행은 2 files, 6 tests가 통과했다.
- OK — product boundary: 157 files scanned, violation 0.
- OK — upstream pin/baseline/update suite: 33 tests passed.
- OK — 전체 Studio suite: 15 files, 69 tests passed.
- OK — TypeScript와 exact upstream Vite production build: 189 modules transformed, build completed. 생성된 `dist/index.html`에서 `Alhangeul` title, 접근성 제목, 보충 style을 확인했고 제품 favicon/font assets도 존재한다.
- OK — `git diff --check`: whitespace error 0.
- 참고 — Vite가 `canvaskit-wasm`의 browser externalization과 500 kB 초과 chunk를 경고했으나 bundle은 성공했다. 두 경고는 upstream CanvasKit 패키징 특성으로 이번 entry 전환의 실패가 아니다.

## 잔여 위험

- exact upstream entry는 Stage 3 native adapter 결합 전 상태이므로 native dialog·association·pending open·native recent·native save/print는 아직 제품 흐름에 재연결되지 않았다. Stage 2 결과만으로 실행파일 수용 성공을 주장하지 않는다.
- `font-loader.ts`는 현재 기존 local loader와 upstream CanvasKit plan을 함께 노출하는 전환 상태다. Stage 3에서 upstream loader 중심 leaf provider로 정리하고 offline/local font 정책을 검증해야 한다.
- native host가 참조할 handler registry는 준비됐지만 Rust/TypeScript native lifecycle이 아직 소비하지 않는다.
- Windows/Linux 실제 화면과 native 기능 검증은 Stage 6 acceptance gate에 남아 있다.

## 다음 단계 영향

- Stage 3은 `getDesktopStudioHandlers()`를 native lifecycle의 유일한 Studio model/render 경계로 사용하고, 기존 WasmBridge subclass형 host를 제거한다.
- upstream file command·dirty state·recent submenu를 유지한 채 native open/save/print/recent 동작만 dispatcher/host leaf adapter로 덮어쓴다.
- 남은 15개 override 중 `bridge-factory`, `tauri-bridge`, `shortcut-map`, `edit`, `format` shadow 5개를 제거하고 font/native leaf adapter를 정리한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 Tauri native lifecycle·font·recent adapter 재결합으로 진행한다.
