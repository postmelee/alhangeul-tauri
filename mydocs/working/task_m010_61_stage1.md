# Task #61 Stage 1 — 빠른 검증 계층

GitHub Issue: [#61](https://github.com/postmelee/alhangeul-tauri/issues/61)
구현계획서: [task_m010_61_impl.md](../plans/task_m010_61_impl.md)

## 단계 목적

빌드 없이 빠른 Node/Studio 및 Windows PowerShell 오류를 검출한다.

## 산출물

reusable fast workflow, isolated Windows child-process runner/parser, native exit 0/23 회귀와 installer failure collection.

## 본문 변경 정도 / 본문 무손실 여부

기존 native 및 실제 MSI/NSIS smoke는 제거하지 않았다. ci.yml에 fast/native 선택을 추가하고 기본 native 검증을 보존한다.

## 검증 결과

- `node --test tests/ci-fast.test.mjs tests/ci-timings.test.mjs tests/actions-workflows.test.mjs`: 31/31 통과.
- `pnpm run test:automation`: 506/506 통과.
- `actionlint -shellcheck= .github/workflows/alhangeul-ci-fast.yml .github/workflows/ci.yml` 및 `git diff --check --ignore-submodules=all` 통과.

## 잔여 위험

PowerShell 실제 실행은 Windows CI Stage 3에서 확인한다. Mac에서 실행하지 않는다.

## 다음 단계 영향

#64는 빠른 경로를 제품 생성의 선행 gate로 연결한다. #57 통합 이후 *.test.ps1을 자동 수집하므로 script 회귀를 빌드 전에 실행한다.

## 승인 요청

기존 전체 진행 승인 적용.

