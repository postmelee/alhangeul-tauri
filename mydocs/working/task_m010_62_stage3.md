# Task #62 Stage 3 — 제품 archive의 실제 독립 재사용 수용

GitHub Issue: [#62](https://github.com/postmelee/alhangeul-tauri/issues/62)
구현계획서: [task_m010_62_impl.md](../plans/task_m010_62_impl.md)
Stage: 3

## 단계 목적

성공한 생산 run의 exact archive를 다른 harness SHA에서 재빌드 없이 설치 검증한다.

## 산출물

`alhangeul-installer-reuse.yml`, `scripts/ci/artifact-handoff.mjs`, `scripts/verify-desktop-artifacts.mjs`, handoff 회귀의 통합 수용 근거. 상세 run/step과 범위는 [부모 최종 보고서](../report/task_m010_59_report.md)에 모은다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 3은 실행 증거를 기록하며 제품 source를 수정하지 않는다. 전체 native 후보 이후 실행 코드는 동일하며 workflow 입력 설명과 작업/운영 문서만 변경했다.

## 검증 결과

[전체 run 34063530307](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307), attempt 1, 후보 `230098401df7d893a26b54b62b780081d3553dda`, mode=artifact, all/full/tests=true, publish_release=false.

[재사용 run 34065755394](https://github.com/postmelee/alhangeul-tauri/actions/runs/34065755394)는 success다. 제품 SHA `230098401df7d893a26b54b62b780081d3553dda`, harness SHA `1d2bda6ac36405fd027498bef407d044206550c6`, 생산 run `34063530307`, Windows artifact ID `9998755524`, 크기 `123181855`, digest `sha256:0c67ea0a9033ee70152dc5f74565fd13a1adb8afc8453ec67ea916ba80809932`가 handoff.json과 일치했다. archive digest·inventory·제품 버전 0.1.0 검사 뒤 MSI/NSIS 설치·제거 exit code 0, Failures=[], 기본값 복원 일치, NSIS 재설치와 dangling default 방지 검사가 모두 통과했다. installer job은 126초였고 제품 재빌드 step이 없다.

로컬 `actionlint .github/workflows/*.yml`, `git diff --check`도 통과했다. native/PowerShell 실행은 GitHub Windows/Linux에서 수행했다.

## 잔여 위험

sourceSha 없는 legacy inventory는 신규 재사용에서 거부한다. 이번 harness 차이는 문서와 workflow 입력 설명이며, 설치 코드가 바뀐 시나리오의 효과를 주장하지 않는다. 새 제품 source의 수용으로 확대하지 않는다.

## 다음 단계 영향

#59 통합 PR 하나에 이 단계와 최종 보고서를 포함한다. 릴리즈·merge·이슈 close는 이번 수행 범위에 포함하지 않는다.

## 승인 요청

2026-09-07의 추가 단계 승인 없는 구현·검증·PR 생성 지시와 복구 후 계속 진행 지시를 적용한다.
