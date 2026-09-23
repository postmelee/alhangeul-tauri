# Task #61 Stage 3 — 실제 Windows 및 Linux 빠른 검사 수용

GitHub Issue: [#61](https://github.com/postmelee/alhangeul-tauri/issues/61)
구현계획서: [task_m010_61_impl.md](../plans/task_m010_61_impl.md)
Stage: 3

## 단계 목적

native 빌드 전에 독립된 빠른 검사가 실제 Windows/Linux runner에서 작동하는지 확인한다.

## 산출물

`alhangeul-ci-fast.yml`, `scripts/ci/windows-tests.ps1`, `windows-test-process.ps1`, CI fixture/test의 통합 수용 근거. 상세 run/step과 범위는 [부모 최종 보고서](../report/task_m010_59_report.md)에 모은다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 3은 실행 증거를 기록하며 제품 source를 수정하지 않는다. 전체 native 후보 이후 실행 코드는 동일하며 workflow 입력 설명과 작업/운영 문서만 변경했다.

## 검증 결과

[전체 run 34063530307](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307), attempt 1, 후보 `230098401df7d893a26b54b62b780081d3553dda`, mode=artifact, all/full/tests=true, publish_release=false.

전체 후보의 Fast Windows PowerShell contracts는 19초, Fast Node and Studio contracts는 70초에 통과했다. Windows는 PowerShell 소스 11개 parser와 격리 test suite 1개를 검사했다. Node automation 554/554, upstream 36/36, Studio 132/132와 build/typecheck/제품 경계를 통과했다. native 종료 코드 0/23 전달과 installer 실패 수집 회귀를 통과했다.

로컬 `actionlint .github/workflows/*.yml`, `git diff --check`도 통과했다. native/PowerShell 실행은 GitHub Windows/Linux에서 수행했다.

## 잔여 위험

빠른 검사 성공은 실제 ABI/설치/GUI 수용을 의미하지 않는다. #57 branch의 추가 PowerShell suite와 installer 분리 변경은 포함하지 않았다.

## 다음 단계 영향

#59 통합 PR 하나에 이 단계와 최종 보고서를 포함한다. 릴리즈·merge·이슈 close는 이번 수행 범위에 포함하지 않는다.

## 승인 요청

2026-09-07의 추가 단계 승인 없는 구현·검증·PR 생성 지시와 복구 후 계속 진행 지시를 적용한다.
