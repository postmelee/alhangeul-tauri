# Task #64 Stage 2 — 변경 선택 CLI와 전체 회귀 검증

GitHub Issue: [#64](https://github.com/postmelee/alhangeul-tauri/issues/64)
구현계획서: [task_m010_64_impl.md](../plans/task_m010_64_impl.md)
Stage: 2

## 단계 목적

정책 함수뿐 아니라 실제 Git diff를 사용하는 CLI가 변경 경로를 빠뜨리지 않는지 확인한다.

## 산출물

`tests/ci-selection-cli.test.mjs`: 임시 Git repository에서 문서 변경, native→문서 rename,
Linux 파일 삭제, 없는 base SHA, exact reuse 입력 누락 및 명시 profile을 실행한다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 1 제품/workflow 구현은 유지했다. test fixture는 임시 폴더 안에서만 Git을 쓰며
실제 repository history나 branch를 바꾸지 않는다.

## 검증 결과

- `pnpm run test:automation`: **554/554 통과**, 실패/skip 0.
- `actionlint .github/workflows/*.yml`: 모든 workflow 문법 통과.
- `git diff --check`: 통과.
- 기반 제품/Studio 검증 결과는 [Stage 1](task_m010_64_stage1.md)에 기록했다.
  이 단계는 CLI 회귀 test만 추가했으므로 native/Studio build를 반복하지 않았다.

## 잔여 위험

원격 Windows/Linux의 실제 reusable output·설치·cache는 아직 통합 수용 대상이다.
auto는 알 수 없는 diff를 full로 확대하고, explicit installer의 누락·불일치 입력은
원격 handoff에서 거부한다. 자동 선택을 릴리즈 승인으로 사용하지 않는다.

## 다음 단계 영향

이 후보를 publish/task59에 게시하고 all/full/tests=true의 무게시 artifact 실행을 시작한다.
플랫폼별 실제 결과·실패 전파를 확인한 뒤 exact Windows archive 재사용과 warm cache를 검증한다.

## 승인 요청

기존 전체 구현·검증·PR 생성 승인 적용. 제품 변경이나 릴리즈·merge는 범위 밖이다.
