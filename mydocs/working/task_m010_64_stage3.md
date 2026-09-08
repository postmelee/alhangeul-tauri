# Task #64 Stage 3 — 전체 수용과 선택 경계 통합

GitHub Issue: [#64](https://github.com/postmelee/alhangeul-tauri/issues/64)
구현계획서: [task_m010_64_impl.md](../plans/task_m010_64_impl.md)
Stage: 3

## 단계 목적

분리된 실행 그래프가 기존 Windows/Linux 수용을 유지하며 필요한 검사 누락을 성공으로 처리하지 않는지 확인한다.

## 산출물

`ci.yml`, artifact orchestrator/platform/core/smoke reusable workflow, `scripts/ci/profiles.mjs`, selector/plan/result 및 회귀의 통합 수용 근거. 상세 run/step과 범위는 [부모 최종 보고서](../report/task_m010_59_report.md)에 모은다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 3은 실행 증거를 기록하며 제품 source를 수정하지 않는다. 전체 native 후보 이후 실행 코드는 동일하며 workflow 입력 설명과 작업/운영 문서만 변경했다.

## 검증 결과

[전체 run 34063530307](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307), attempt 1, 후보 `230098401df7d893a26b54b62b780081d3553dda`, mode=artifact, all/full/tests=true, publish_release=false.

all/full/run_tests=true 전체 후보에서 plan, fast 2개, core 3개, Windows 및 Linux x64/arm64 native 3개, Windows smoke, result 등 필수 11개 job이 success다. MSI/NSIS 새 archive 설치·제거 및 Linux 두 architecture package lifecycle이 통과했다. 선택·집계·CLI를 포함한 CI 회귀 52/52, 전체 automation 554/554가 통과했다. 실제 Git fixture로 rename 이전/새 경로, 삭제, 알 수 없는 경로, 누락 base와 빈 diff의 full fallback을 확인했다. 선택한 필수 job의 failed/cancelled/skipped/missing은 성공으로 집계하지 않는다.

로컬 `actionlint .github/workflows/*.yml`, `git diff --check`도 통과했다. native/PowerShell 실행은 GitHub Windows/Linux에서 수행했다.

## 잔여 위험

자동 선택 규칙의 모든 profile을 원격 native로 각각 반복하지 않았다. 실제 full/installer 경로와 로컬 분기 회귀를 사용한다. Windows smoke의 Linux 비의존성은 workflow 계약으로 검증했으며 이번 run에서는 Linux가 먼저 끝났다.

## 다음 단계 영향

#59 통합 PR 하나에 이 단계와 최종 보고서를 포함한다. 릴리즈·merge·이슈 close는 이번 수행 범위에 포함하지 않는다.

## 승인 요청

2026-09-07의 추가 단계 승인 없는 구현·검증·PR 생성 지시와 복구 후 계속 진행 지시를 적용한다.
