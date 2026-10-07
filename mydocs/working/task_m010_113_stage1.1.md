# Task #113 Stage 1.1 — rhwp 후보 생성용 Studio 호환성

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 1.1

## 단계 목적

실패한 v0.8.7 자동 후보 생성의 HTML drift와 확인한 글꼴 API 불일치를 제품 leaf 경계에서
선행 보정한다. 2026-10-07 작업지시자의 “진행해줘”가 소스 보정·선행 devel PR/일반 병합과
변경된 devel에서 Stage 1.2 재실행을 승인했다. 현재 pin은 v0.8.6, 제품 version은 0.1.1이다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/studio-menu-hooks.ts`, `vite.config.ts`, `local-font-entry-hooks.ts` | label literal 대신 단일 command 행에 메뉴 삽입, metadata 보존·drift 거부 |
| `apps/studio-host/local-font-overrides.ts` | 실제 5개 상대 소비자를 같은 제품 font adapter로 연결 |
| `src/core/local-fonts.ts`, `local-font-state.ts`, `local-font-lookup.ts`, `local-font-records.ts` | 새 public API와 기존 catalog/index/설정/generation 공유 |
| `src/core/host-font-contract.ts`, `host-font-source.ts`, `local-font-renderer.ts` | bounded host protocol·selected face bytes·revision/abort 연결 |
| `src/core/host-font-compat.test.ts`, `studio-menu-hooks.test.ts`, `local-font-overrides.test.ts` | 실제 bytes·cache·비동기 교체·오류·style·메뉴 경계 회귀 |
| `tests/rhwp-baseline.test.mjs` | source label 문구 대신 command 존재·단일성 확인 |
| `mydocs/plans/task_m010_113*.md`, `mydocs/orders/20261007.md` | 실패 근거, 승인된 단계 보정과 진행 상태 |

신규 helper/type/test는 모두 300 LOC 이하이며 `local-fonts.ts`는 268 LOC다.

## 본문 변경 정도 / 본문 무손실 여부

upstream source·gitlink·Rust lock·vendored WASM을 수정하지 않았다. 기존 native 글꼴 선택과
indexed 조회·byte cache 동작을 유지한다. old/new 메뉴의 아이콘·disabled·번역 속성·shortcut을
보존하며 제품 항목만 삽입한다. 수행 문서 기존 단계·release gate는 유지하고 보정 근거를 추가했다.

## 검증 결과

실행 명령:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:automation
pnpm run test:studio
pnpm run build:studio
node /private/tmp/task113-v087-preflight.mjs
node /private/tmp/task113-api-preflight.mjs
```

결과:

- product boundary·v0.8.6 pin/6 관리 artifact 통과, upstream **39/39** 통과.
- automation **1,308/1,308** 통과; Studio **41 files·268/268** 통과, skip 0.
- TypeScript 및 Vite Studio build 성공. 기존 CanvasKit browser externalization·chunk size·dynamic
  import 경고가 남으며 오류는 없다.
- exact v0.8.7 `1a76570e833917d15817415a53c09ad61ab3203f`의 HTML·main에 실제 Vite hook 적용 성공.
  새 창/로컬 설정 삽입은 1개씩이며 `data-i18n` metadata를 보존했다.
- 같은 tag의 main·CanvasKit·host-font-requests·host-canvas-fonts·wasm-bridge에서 import한
  **34개 symbol**이 실제 제품 TypeScript export에 존재한다. full v0.8.7 compile은 재실행 CI에서 한다.
- native byte cache를 legacy/new reader가 공유, host face ID/revision/faceIndex 선택,
  mutation과 stale bytes/snapshot 격리, disabled·blocked family·invalid metadata 거부를 확인했다.
- 초기 실패: sparse fixture/font symlink target 누락과 TypeScript 2건. 누락 준비·타입 보정 뒤
  실패한 전체 suite/build를 재실행해 성공했다. `/private/tmp/task113-{upstream,automation,studio,build}.log`에 출력 보존.

## 잔여 위험

- 이 보고서는 Stage 1.1 로컬 검증이다. devel PR required는 PR 게시 후 확인한다.
- v0.8.7 fresh WASM·Ubuntu native gate·자동 draft PR 전체 성공은 Stage 1.2에서 확인한다.
- 새 upstream document title/i18n·native PDF dependency 영향은 다음 단계 검토 항목이다.
- macOS에서 Rust/Tauri/wasm-pack을 실행하지 않았다. Windows/Linux 패키지·GUI·서명·공개 릴리즈는 미검증이다.
- task upstream은 필요한 소스/fixture만 sparse checkout하며 cdb7 객체 cache를 읽기 전용 alternate로 사용한다.

## 다음 단계 영향

- 선행 `publish/task113 → devel` PR의 required checks와 실제 코드 리뷰 뒤 일반 merge한다.
- 그 새 devel SHA를 기준으로 target v0.8.7/dry_run=false를 재실행해 draft 후보와 멱등성을 확인한다.
- #113은 OPEN 유지하고 전체 Stage 1 완료보고·Stage 2 진입 승인은 이후에 한다.

## 승인 요청

- 위 선행 PR/일반 병합과 Stage 1.2 재실행은 같은 스레드에서 이미 승인됐다.
  승인 범위를 완료한 후 전체 Stage 1 결과와 Stage 2 진입을 보고한다.
