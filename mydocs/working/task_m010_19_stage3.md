# Task #19 Stage 3 완료 보고서 — PDF snapshot pipeline과 공식 경계 통합

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [`task_m010_19_impl.md`](../plans/task_m010_19_impl.md)
Stage: 3

## 단계 목적

Stage 1의 immutable HWP/HWPX snapshot과 Stage 2의 snapshot UUID 기반 native job을 실제 direct PDF pipeline에 연결한다. save dialog 취소 전에는 snapshot/native job을 만들지 않고, target 확정 뒤 한 번 capture한 snapshot의 page count와 SVG만 같은 UUID로 begin·append·commit·abort에 전달해 live edit가 섞이지 않도록 고정한다.

Studio 전체 pipeline에는 10분 deadline과 실패별 abort/dispose를 적용하고, source session 불변·outlined fallback UX·WebView 내 중복 export dedupe를 유지한다. architecture/operations 공식 문서와 upstream baseline test도 새 경계에 맞춘다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/core/desktop-persistence.ts` | 250 LOC. target 확정 뒤 snapshot 1회 생성, 10분 pipeline deadline, nested UUID request, snapshot page 순차 append와 abort/dispose cleanup 구현 |
| `apps/studio-host/src/core/desktop-persistence.test.ts` | 374 LOC. dialog cancel, HWP/HWPX format, post-capture live drift, render/append/commit failure, fallback warning, timeout 뒤 새 begin을 포함한 persistence test 10건 고정 |
| `apps/studio-host/src/core/desktop-host.ts` | active session의 fileName·sourcePath·format만 persistence에 전달하고 기존 in-flight Promise dedupe 유지 |
| `apps/studio-host/src/core/desktop-host.test.ts` | 245 LOC. HWPX active session 인수 전달, double export dedupe와 path/format/revision/dirty 불변 검증 |
| `tests/rhwp-baseline.test.mjs` | required `test:upstream`이 발견한 live `getPageSvg` stale assertion을 snapshot 생성·render·UUID 및 live handler 미사용 계약으로 교체 |
| `docs/architecture/UPSTREAM.md` | direct PDF 소유 경계를 현재 형식 serializer 기반 격리 snapshot과 native freshness/limit 계약으로 최소 수정 |
| `docs/operations/DESKTOP_RELEASE.md` | 300 LOC. mixed revision·source state·limit/timeout target 보존·stale/orphan cleanup의 Windows/Linux exact-SHA gate 추가 |
| `mydocs/orders/20260824.md` | Stage 3 완료와 Stage 4 승인 대기 상태로 비고 갱신 |
| `mydocs/working/task_m010_19_stage3.md` | Stage 3 산출물·검증·잔여 위험과 다음 단계 승인 요청 기록 |

production `desktop-persistence.ts`와 `desktop-host.ts`는 300 LOC 안쪽이고 신규 함수도 50 LOC 안쪽이다. `desktop-persistence.test.ts`는 승인된 기존 단일 산출물에 source-save fixture와 PDF 종료 경로 10건을 함께 고정해 374 LOC가 됐지만 production 책임은 늘리지 않았고 product boundary 검사를 통과했다.

## 본문 변경 정도 / 본문 무손실 여부

upstream `third_party/rhwp`, renderer, menu metadata, source save, searchable/outlined PDF 변환, atomic target replace와 실제 인쇄 surface는 수정하지 않았다. PDF success/failure/cancel 경로는 `notifySaved`, source save, active session commit, recent/recovery 갱신을 호출하지 않는다. `DesktopHost`는 native revision을 snapshot token으로 전달하지 않고 fileName·sourcePath·format만 넘긴다.

`UPSTREAM.md`는 PDF 문장만 교체했고 Task #20가 수정한 직전 handler lifecycle 문장은 건드리지 않았다. `DESKTOP_RELEASE.md`는 기존 historical artifact 증거와 실제 인쇄 gate를 보존하고 그 앞에 direct PDF snapshot 수용 gate만 추가했다. required upstream 검증이 기존 live SVG assertion을 검출해 `tests/rhwp-baseline.test.mjs`를 같은 승인 계약으로 정렬했으며 제품 범위 확장은 없다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/pdf-export-snapshot.test.ts src/core/desktop-persistence.test.ts src/core/desktop-host.test.ts src/command/commands/file.test.ts
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

결과:

- OK — focused command: 22 test files, 112 tests 통과. Vitest script 특성상 지정 파일을 포함한 Studio suite 전체가 실행됐다.
- OK — mixed live handler 값은 호출되지 않고 snapshot 3쪽 SVG만 같은 UUID의 begin/append/commit request에 전달됐다.
- OK — render·append·commit 실패는 owned job abort와 snapshot dispose를 각각 한 번 수행하고, 10분 fake-timer timeout 뒤 두 번째 export는 새 snapshot/job으로 성공했다.
- OK — `pnpm run check:product-boundary`: 230 files scanned, 통과.
- OK — `pnpm run test:automation`: 201 tests 통과.
- CORRECTED — 첫 `pnpm run test:upstream`은 기존 `handlers.getPageSvg(pageIndex)` assertion 한 건을 실패시켰다. assertion을 승인된 snapshot 경계로 교체한 뒤 Stage 3 검증 전체를 처음부터 재실행했다.
- OK — 최종 `pnpm run test:upstream`: 35 tests 통과.
- OK — `pnpm run test:studio`: 22 files, 112 tests 통과.
- OK — `pnpm run build:studio`: TypeScript 검사와 Vite production build 통과, 214 modules transformed. CanvasKit browser externalization, dynamic import와 chunk size 경고는 non-fatal이고 exit code는 0이다.
- OK — `git diff --check`: 출력 없이 통과.

## 잔여 위험

- Stage 3는 macOS의 platform-neutral Studio test/build만 수행했다. Stage 2 Rust test와 native reaper/orphan cleanup, Tauri build는 아직 Windows/Linux에서 실행되지 않았다.
- integration test는 snapshot handle을 deterministic mock으로 주입한다. 실제 HWP/HWPX serializer/격리 bridge의 전체 page SVG 정합성은 Stage 1 fixture가 담당하며, 실제 PDF까지의 수용은 Stage 4에 남아 있다.
- 동기 WASM serializer/renderer는 JavaScript timer가 선점하지 못한다. 전후 deadline 검사와 native idle/absolute reaper를 함께 사용하지만 실제 장문·중단 시간 수용은 Stage 4 gate다.
- `desktop-persistence.test.ts`는 374 LOC다. 현재는 한 persistence dependency fixture로 종료 경로를 비교하는 단일 역할이지만 이후 범위가 늘면 별도 승인된 test 분리가 필요하다.
- Task #20은 원격 `publish/task20`의 `04bab75` Stage 3.1까지 진행됐고 아직 `devel`에 merge되지 않았다. Stage 4 시작 시 merge 상태와 `UPSTREAM.md`·native registry·baseline test·오늘할일 공유 hunk를 다시 정렬해야 한다.

## 다음 단계 영향

- 이 보고서와 묶이는 Stage 3 commit을 Stage 4 Windows/Linux exact-SHA 검증 입력으로 사용한다.
- Stage 4 시작 시 Task #34가 반영된 최신 `devel`과 Task #20 merge 여부를 다시 확인한다. Task #20이 merge됐으면 두 의미를 보존해 통합한 뒤 Stage 1~3 gate를 재실행한다.
- Windows/Linux 양쪽에서 Rust focused test, Clippy, Tauri production build, HWP/HWPX direct PDF, 46쪽 mixed-edit, timeout/window/reload와 old/recent/symlink·reparse orphan sentinel을 검증한다.
- Stage 4 승인 전에는 branch push, workflow dispatch, artifact 생성, release·서명·게시와 이슈 close를 수행하지 않는다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 exact-SHA Windows/Linux 수용으로 진행한다.
