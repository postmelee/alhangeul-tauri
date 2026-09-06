# Task #60 Stage 3 — 운영 계약과 실제 측정 수용

GitHub Issue: [#60](https://github.com/postmelee/alhangeul-tauri/issues/60)
구현계획서: [task_m010_60_impl.md](../plans/task_m010_60_impl.md)
Stage: 3

## 단계 목적

구현된 검증 계층과 실제 run/job/step을 운영 계약에 대조한다.

## 산출물

`docs/operations/CI_VALIDATION.md`, `scripts/ci/timings.mjs`, timing 회귀 테스트의 통합 수용 근거. 상세 run/step과 범위는 [부모 최종 보고서](../report/task_m010_59_report.md)에 모은다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 3은 실행 증거를 기록하며 제품 source를 수정하지 않는다. 전체 native 후보 이후 실행 코드는 동일하며 workflow 입력 설명과 작업/운영 문서만 변경했다.

## 검증 결과

[전체 run 34063530307](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307), attempt 1, 후보 `230098401df7d893a26b54b62b780081d3553dda`, mode=artifact, all/full/tests=true, publish_release=false.

전체 run의 attempt 1 metadata를 timing 도구로 변환했다. fast Windows 19초·Node/Studio 70초, core Windows 883초/Linux x64 264초/arm64 245초, native Windows 2,513초/Linux x64 1,629초/arm64 1,164초, 새 Windows smoke 121초, 결과 집계 8초를 확인했다. 병렬 job 합계는 사용자 대기 시간으로 사용하지 않았다.

로컬 `actionlint .github/workflows/*.yml`, `git diff --check`도 통과했다. native/PowerShell 실행은 GitHub Windows/Linux에서 수행했다.

## 잔여 위험

runner/toolchain/source가 다른 기존 #57 실행과 native 시간의 인과적 개선을 주장하지 않는다. 동일 후보의 대표 warm 비교는 부모 최종 보고서에 별도로 기록한다.

## 다음 단계 영향

#59 통합 PR 하나에 이 단계와 최종 보고서를 포함한다. 릴리즈·merge·이슈 close는 이번 수행 범위에 포함하지 않는다.

## 승인 요청

2026-09-07의 추가 단계 승인 없는 구현·검증·PR 생성 지시와 복구 후 계속 진행 지시를 적용한다.
