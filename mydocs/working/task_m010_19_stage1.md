# Task #19 Stage 1 완료 보고서 — immutable PDF snapshot 계약

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [`task_m010_19_impl.md`](../plans/task_m010_19_impl.md)
Stage: 1

## 단계 목적

현재 live editor의 page handler와 분리된 immutable PDF snapshot 경계를 만든다. active 문서를 현재 HWP/HWPX serializer로 한 번만 캡처하고 별도 product `WasmBridge`에 다시 로드해, page count와 모든 SVG가 같은 시작 상태에서 나오도록 고정한다.

Stage 1은 이 snapshot handle의 생성·제한·해제 계약과 실제 HWP/HWPX round-trip 정합성까지만 구현한다. 기존 direct PDF pipeline 연결과 native job 변경은 각각 Stage 3과 Stage 2 범위로 남긴다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/core/pdf-export-snapshot.ts` | 162 LOC. 현재 형식 serializer 1회, UUID, 격리 `WasmBridge`, 128 MiB/4,096쪽/16 MiB SVG/2분 capture guard와 idempotent dispose를 구현 |
| `apps/studio-host/src/core/pdf-export-snapshot.test.ts` | 226 LOC. fake bridge lifecycle·오류·limit·timeout 8건과 실제 HWP/HWPX 전체 page SVG round-trip 2건을 검증 |
| `apps/studio-host/vitest.config.ts` | production vendor와 같은 `@wasm/rhwp.js`를 실제 fixture test에서 사용하도록 test alias 1개 추가 |
| `mydocs/orders/20260824.md` | Stage 1 완료와 Stage 2 승인 대기 상태로 비고 갱신 |
| `mydocs/working/task_m010_19_stage1.md` | Stage 1 산출물·검증·잔여 위험과 다음 단계 승인 요청 기록 |

pin된 `third_party/rhwp` commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`을 격리 worktree에 checkout해 repository fixture를 읽었다. submodule source, lockfile와 build output은 commit 대상에 포함하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

공식 제품 문서와 upstream `third_party/rhwp` 본문은 수정하지 않았다. 기존 `DesktopStudioHandlers`, `DesktopPersistence`, direct PDF와 source save 동작도 변경하지 않았으며 새 snapshot module은 Stage 3 전까지 production pipeline에 연결되지 않는다.

snapshot source interface는 `exportHwp()`와 `exportHwpx()`만 노출하므로 live `pageCount()`, `getPageSvg()`와 `notifySaved()`를 호출할 수 없다. product font-policy `WasmBridge`를 별도 인스턴스로 사용하고, 반환 handle의 public 속성은 runtime에서 freeze하며 내부 dispose 상태만 closure가 소유한다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/pdf-export-snapshot.test.ts src/core/font-policy-wasm-bridge.test.ts
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

추가 focused 증적:

```bash
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run src/core/pdf-export-snapshot.test.ts --reporter=verbose
```

결과:

- OK — 계획서의 focused 명령: 22 test files, 107 tests 통과. timeout rejection도 Vitest unhandled error 없이 회수됐다.
- OK — snapshot focused file: 1 file, 10 tests 통과.
- OK — 실제 `biz_plan.hwp`는 live/snapshot 모두 6쪽, 실제 `form-002.hwpx`는 모두 10쪽이며 각 문서의 모든 page SVG 문자열, SVG root/viewBox와 한글 text가 일치했다.
- OK — HWP/HWPX serializer 선택 1회, live handler 미호출, UUID 거부, empty/128 MiB serializer, 0/4,097쪽, empty/16 MiB SVG, pending serializer timeout과 load 실패 release를 검증했다.
- OK — `pnpm run test:studio`: 22 files, 107 tests 통과.
- OK — `pnpm run build:studio`: TypeScript 검사와 Vite production build 통과, 213 modules transformed. CanvasKit browser externalization·bundle 크기/dynamic import 경고는 non-fatal이고 exit code는 0이다.
- OK — `pnpm run check:product-boundary`: 227 files scanned, 통과.
- OK — `git diff --check`: 출력 없이 통과.

## 잔여 위험

- Stage 1 module은 아직 direct PDF command에 연결되지 않았다. live page handler 제거와 source state 불변의 pipeline 검증은 Stage 3에서 수행한다.
- JavaScript의 동기 WASM serializer·renderer는 timer가 선점할 수 없다. Stage 1은 반환 전후 deadline을 검사하며, 멈춘 WebView의 native job·temp 회수는 Stage 2 reaper가 담당해야 한다.
- 이번 자동 fixture는 대표 HWP 6쪽과 HWPX 10쪽이다. 46쪽 장문, 실제 PDF 변환과 Windows/Linux memory·time 수용은 Stage 4에 남아 있다.
- Vite build 경고는 성공을 막지 않았지만 Stage 1의 신규 snapshot module이 Stage 3에서 production graph에 연결된 뒤 전체 build를 다시 확인해야 한다.

## 다음 단계 영향

- Stage 2 native begin/append/commit/abort 계약은 Stage 1의 UUID와 4,096쪽·16 MiB/page limit을 동일하게 적용하고, 누적 512 MiB·idle/absolute TTL·process job 수를 추가한다.
- Stage 2 시작 직전에 Task #20의 `commands.rs`·`lib.rs` registry 진행 상태를 다시 확인한다. Task #20 소유 dispatcher/embed/platform 파일은 수정하지 않는다.
- Stage 3는 `createPdfExportSnapshot()`의 기본 2분 capture guard와 idempotent `dispose()`를 `finally`에서 사용해야 한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 native job freshness와 resource limit 구현으로 진행한다.
