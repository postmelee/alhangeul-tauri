# Task #110 Stage 2 — main 이력 통합과 README 안내

GitHub Issue: [#110](https://github.com/postmelee/alhangeul-tauri/issues/110)
구현계획서: [task_m010_110_impl.md](../plans/task_m010_110_impl.md)
Stage: 2

## 단계 목적

양쪽 이력을 보존하는 일반 merge와 README 충돌 해결로 main 승격 후보를 준비한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| README.md | devel 대비 v0.1.1 공개 안내 한 줄 추가, 버전별 기록 링크 유지 |
| working/task_m010_110.json | 보호 경로 동일성과 제품 계약 검증 5개 기록 |
| 본 보고서 | 이력 통합·검증 결과 |

## 본문 변경 정도 / 본문 무손실 여부

main의 안정 버전·업데이트 검증·공개 웹 안내와 devel의 버전별 기록 안내를 함께 유지한다. 현재 README를 재작성하지 않고 링크 문구 한 줄만 추가했다. 누적 완료 작업의 source를 수정하지 않았다.

## 검증 결과

- 예상한 README 충돌 1개만 발생했고 모든 unmerged entry를 해결했다.
- MERGE_HEAD는 승인된 main 7bab9062, 첫 parent는 #110 task HEAD다. 두 parent를 유지하는 Stage 2 merge commit으로 기록하며 commit 직후 두 시작 ref의 ancestry를 재확인한다.
- staged tree와 시작 devel 1d3817c7의 apps/crates/assets/rhwp lock/pnpm lock/.gitmodules/site/scripts/.github는 동일하다.
- `pnpm run check:product-boundary`: OK.
- `pnpm run check:product-version`: OK, 0.1.1 유지.
- `pnpm run check:release-metadata`: OK, 공개 updater 계약 유지.
- `pnpm run check:rhwp-pin` 및 `check:committed-rhwp`: OK, v0.8.6 f1f9c6ae 유지.
- `git diff --check`: OK, README의 두 링크와 v0.1.0 → v0.1.1 업데이트 검증 문구 유지.

## 잔여 위험

새 native/installer/실기기 검증은 실행하지 않았다. 공개 제품 source는 기존 tag commit이며 이번 merge commit으로 바꾸지 않는다.

## 다음 단계 영향

Stage 3은 동일한 workflow/script/test/product source에서 플랫폼 중립 계약을 실행한다. PR acceptance는 정확한 merge candidate를 대상으로 새로 확인한다.

## 승인 요청

작업지시자의 전체 진행·병합·마무리 승인에 따라 Stage 3으로 계속 진행한다.
