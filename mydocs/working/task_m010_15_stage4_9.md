# Task #15 Stage 4.9 완료 보고서 — 최신 devel 통합 후보 확정

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 4.9

## 단계 목적

Task #13 PR #18 merge 결과를 Task #15에 통합한다. 기존 Windows/Linux exact GUI 수용 결과를
보존하면서 Task #13 Stage 6.7~6.8의 PDF job, 최근 문서, Windows wheel과 Studio build guard를
같은 최종 후보에 포함하고 새 exact-SHA 검증의 기준 commit을 만든다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/src/lib.rs` | Task #15가 제거한 editor `print_webview`는 복원하지 않고 Task #13의 `remove_recent_document` command를 함께 등록했다. |
| `docs/operations/DESKTOP_RELEASE.md` | Task #13 실제 인쇄 No-Go 이력과 Task #15 전용 page surface release gate를 모두 유지했다. |
| `mydocs/plans/task_m010_15_impl.md` | 최신 `devel` 통합, 새 exact workflow와 Windows/Linux 집중 GUI 재검증 범위를 Stage 4.9로 고정했다. |
| `mydocs/orders/20260812.md` | M010 Task #15의 최종 통합 검증 진행 상태를 추가했다. |
| `mydocs/working/task_m010_15_stage4_9.md` | merge 판단, 플랫폼 중립 검증과 다음 exact gate를 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

Task #15의 upstream page SVG, hidden print surface, Linux pagination과 Windows modal lifecycle
구현은 변경하지 않았다. Task #13 merge commit을 이력 보존 방식으로 통합했으며, 두 충돌은
양쪽의 독립 책임을 함께 유지하도록 최소 해결했다. `third_party/rhwp`와 HWP/HWPX/PDF 데이터
형식은 변경하지 않았다.

## 검증 결과

실행 명령:

```bash
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

- OK — product boundary 184 files, product version·release metadata `0.1.0`, rhwp Stable
  `v0.8.2` exact pin과 managed artifact 6개 일치.
- OK — automation 71/71, upstream 35/35, Studio 21 files·91/91 test 통과.
- OK — exact upstream production Studio build 213 modules 완료.
- OK — `print_webview` 검색 결과가 없고 `remove_recent_document` native/Studio 계약이 유지됐다.
- OK — conflict marker와 whitespace 오류 없음.
- INFO — CanvasKit browser externalization, ineffective dynamic import와 500 kB chunk 경고는
  기존 비차단 build 경고다.

## 잔여 위험

- merge commit의 새 exact SHA는 아직 CI와 Windows/Linux native workflow를 통과하지 않았다.
- 기존 Windows/Linux GUI 수용은 `8971897` 후보의 결과이므로 최종 통합 후보에서 인쇄 집중
  회귀를 다시 확인해야 한다.
- macOS host 결과는 Rust desktop 수용 근거로 사용하지 않는다.

## 다음 단계 영향

- 이 merge commit을 `publish/task15`에 게시해 CI와 native artifact workflow를 실행한다.
- Windows x64 installer와 Linux x64 DEB에서 system dialog 직접 진입, 쪽 수·한글·빈 쪽,
  modal 상태 복원과 반복 인쇄를 집중 재검증한다.
- exact gate 통과 뒤 Stage 4.10 최종 수용 보고와 Task #15 최종 보고서·PR 게시로 진행한다.

## 승인 요청

- 작업지시자의 “Task #15 최종 보고서·PR 생성까지” 지시에 따라 최신 `devel` 통합과 최종
  exact-SHA 검증을 이어서 진행한다.
