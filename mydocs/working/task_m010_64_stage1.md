# Task #64 Stage 1 — 검증 선택과 플랫폼별 workflow 분리

GitHub Issue: [#64](https://github.com/postmelee/alhangeul-tauri/issues/64)
구현계획서: [task_m010_64_impl.md](../plans/task_m010_64_impl.md)
Stage: 1

## 단계 목적

변경 범위에 맞는 검증을 선택하고 Windows 설치 검증이 Linux 제품 빌드를 기다리지 않도록 한다.
복구한 `/private/tmp/alhangeul-task59`의 미커밋 구현을 이어받았다. 원 side conversation의
전체 하위 작업·검증·PR 생성 승인과 2026-09-07 복구 task의 계속 진행 지시를 적용한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/ci/profiles.mjs`, `select.mjs` | 명시 profile, exact base SHA 비교, 불명확한 변경의 full fallback |
| `scripts/ci/plan-artifacts.mjs`, `artifact-result.mjs` | 제품/workflow SHA 일치, platform/core/smoke 선택과 필수 결과 집계 |
| `alhangeul-artifacts.yml`, `alhangeul-artifact-platform.yml`, `alhangeul-windows-smoke.yml` | 기존 native/package/smoke 단계 소유권 분리 |
| `ci.yml`, `alhangeul-desktop.yml` | 선택 경로와 기존 ordinary artifact 진입점 연결 |
| `scripts/ci/artifact-handoff.mjs` | Desktop 및 CI 두 생산 workflow만 허용하며 기존 provenance 검사 보존 |
| `tests/ci-profiles.test.mjs`, `ci-handoff.test.mjs`, 기존 workflow 계약 | 범위 축소·필수 gate 실패·생산 workflow 제한 검증 |

## 본문 변경 정도 / 본문 무손실 여부

기존 updater/release job 본문은 HEAD와 문자열 비교로 동일함을 확인했다. native/Rust/package
검증 단계는 역할에 따라 이동하고 실제 설치·core·실패 전파 gate를 유지한다. `run_tests=false`,
단일 platform, product/core profile은 전체 artifact 수용으로 표시하지 않는다. 새 PowerShell
script는 명시한 기존 installer helper 목록에 없으면 full로 선택한다. 제품·upstream source는
수정하지 않았고 #19/#57의 미완료 branch를 통합하지 않았다. 기존 native workflow 약 400줄
예외는 구현계획서에 기록했다.

## 검증 결과

- `node --test tests/ci-*.test.mjs`: **47/47 통과**.
- 변경 workflow 6개의 `actionlint`, `git diff --check`: 통과.
- 복구한 초기 상태의 `pnpm run test:automation`: **544/544 통과**. 두 연결 보정 후 전체 회귀는 Stage 2에서 재실행한다.
- product-boundary/version/release metadata: 통과. upstream **36/36**, Studio **132/132**,
  Studio build·GUI typecheck 통과. 기존 bundle chunk/dynamic import 경고는 오류가 아니다.
- updater/release job 본문 비교: 동일.

## 잔여 위험

로컬 계약 통과는 실제 Windows/Linux native 실행 통과가 아니다. 원격 분리 workflow의 output,
캐시, artifact 재사용 및 설치 결과를 통합 후보에서 검증해야 한다.

## 다음 단계 영향

실제 Git rename/delete와 누락된 comparison, 재사용 입력, 잘못된 profile을 CLI에서 검증한다.
Stage 2 이후 독립 publish/task59에 후보를 게시해 무게시 CI를 수행한다.

## 승인 요청

기존 전체 구현·검증·PR 승인 적용. 추가 제품 변경·merge·게시 권한을 포함하지 않는다.
