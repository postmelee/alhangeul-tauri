# Task #15 Stage 4.11 완료 보고서 — PR #22 인쇄 lifecycle 리뷰 보정

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 4.11

## 단계 목적

PR #22 review
[#4914325092](https://github.com/postmelee/alhangeul-tauri/pull/22#pullrequestreview-4914325092)의
중간 심각도 Windows focus race·terminal timeout 2건과 낮은 심각도 Linux CSS 범위,
CSP fallback, print frame ID drift 3건을 merge 전에 보정한다. Issue #20은 시스템 인쇄를
명시적으로 제외하므로 현재 Task #15의 surface lifecycle 책임 안에서 처리한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/command/print-ui-lifecycle.ts` | focus event generation으로 stale IPC poll을 폐기하고 5분 terminal timeout을 native·DOM 비종료 watchdog으로 교체했다. dispose 뒤 늦은 IPC가 timer를 만들지 못하게 했다. |
| `apps/studio-host/src/command/print-ui-lifecycle.test.ts` | initial poll 역전, 5분 native·DOM pending 유지, 늦은 poll dispose와 정상 focus 복귀를 fake timer로 고정했다. |
| `apps/studio-host/src/command/direct-print.ts` | 혼합 크기 Linux job은 upstream stylesheet 전체를 유지하고, nonce-bearing bundled style이 없으면 fail-fast한다. |
| `apps/studio-host/src/command/direct-print.test.ts` | 5분 뒤 surface 유지, 동일·혼합 크기 CSS 경계와 bundled style 누락 실패를 검증했다. |
| `apps/studio-host/src/core/upstream-boundary.test.ts` | upstream `PRINT_FRAME_ID`와 제품 `#rhwp-print-surface` selector를 함께 고정하고 죽은 `appendPrintStyle` fallback guard를 제거했다. |
| `docs/architecture/UPSTREAM.md` | 실제 코드에 맞춰 bundled style 필수 계약과 동일 크기 Linux 보정 범위를 명시했다. |
| `mydocs/plans/task_m010_15_impl.md` | review 판단, Stage 4.11 구현과 Stage 4.12 exact 재검증을 추가했다. |
| `mydocs/orders/20260812.md` | PR 리뷰 보정 진행 상태로 다시 열었다. |

## 본문 변경 정도 / 본문 무손실 여부

upstream `third_party/rhwp`, page SVG, pagination, page DOM primitive와 browser visible preview는
수정하지 않았다. Tauri leaf adapter의 focus 관찰·surface cleanup과 Linux print CSS 적용 조건만
축소·안정화했다. HWP/HWPX 저장과 direct PDF data path, Rust native command는 변경하지 않았다.

host `document.title` 변경은 upstream도 Chromium/Edge 인쇄 제목 제공을 위해 사용하는 의도된
동작으로 유지했다. Microsoft Print to PDF 기본 basename을 보장한다는 주장은 추가하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/print-ui-lifecycle.test.ts src/command/direct-print.test.ts src/core/upstream-boundary.test.ts
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check --ignore-submodules=all
```

결과:

- OK — 리뷰 재현 test를 먼저 추가했을 때 stale poll, terminal timeout, mixed-size tolerance,
  dynamic style fallback의 기존 동작으로 5건이 실패해 지적을 독립 재현했다.
- OK — 보정 뒤 focused·전체 Studio 21 files·97/97 test가 통과했다.
- OK — product boundary 184 files, product/release `0.1.0`, rhwp `v0.8.2` exact pin과
  managed artifact 6개가 일치했다.
- OK — automation 71/71, upstream 35/35와 production Studio build 213 modules가 통과했다.
- OK — `direct-print.test.ts` 296 LOC, lifecycle source 218 LOC로 권장 300 LOC 상한 안이다.
- OK — whitespace·conflict marker 오류가 없다.
- INFO — CanvasKit browser externalization, ineffective dynamic import와 500 kB chunk는 기존
  비차단 build 경고다.

## 잔여 위험

- terminal timeout을 제거했으므로 native·DOM focus 복귀 신호가 영구히 오지 않으면 인쇄 job도
  의도적으로 유지된다. 조기 surface 철거보다 안전한 쪽을 선택했으며 사용자 강제 취소 UX가
  필요하면 별도 승인 범위에서 설계한다.
- 실제 5분 system dialog 유지 시나리오는 아직 GUI로 실행하지 않았고 fake timer로 lifecycle
  무종료와 surface 유지만 검증했다.
- 혼합 크기 Linux 문서는 local 보정을 전부 제거했지만 실제 GTK media 전환 자체는 검증되지
  않은 기존 범위다.
- 제품 코드가 변경됐으므로 기존 `da488a8` CI/native artifact는 최종 PR 근거로 재사용하지 않는다.

## 다음 단계 영향

- 이 Stage source·report commit을 새 exact 후보로 `publish/task15`에 게시한다.
- CI, Windows x64·Linux x64·Linux arm64 native build, 6개 installer inventory와 MSI·NSIS
  smoke를 Stage 4.12에서 다시 실행한다.
- Windows GUI의 system dialog→Print-to-PDF 저장창→복귀·재인쇄를 새 installer에서 확인하고,
  가능한 Linux GUI 범위를 함께 기록한다.
- exact 결과 뒤 최종 보고서, 오늘할일, PR 본문과 review 답글을 새 HEAD 기준으로 갱신한다.

## 승인 요청

- 작업지시자의 “진행해줘” 승인에 따라 Stage 4.11 commit과 Stage 4.12 exact workflow로
  이어서 진행한다.
