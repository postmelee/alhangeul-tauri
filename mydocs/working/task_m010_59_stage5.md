# Task #59 Stage 5 — PR 리뷰 보정

GitHub Issue: [#59](https://github.com/postmelee/alhangeul-tauri/issues/59)
구현계획서: [task_m010_59_impl.md](../plans/task_m010_59_impl.md)
Stage: 5

## 단계 목적

작업지시자의 2026-09-08 보정·코멘트 게시 지시에 따라 PR #66의 두 리뷰에서 재현되는 결함과
운영 계약의 불명확한 부분을 보정한다.

## 산출물

- profile별 concurrency와 fast 전용 진행 중 취소.
- installer 재사용 입력의 공통 검증, 명시 선택 단계의 조기 거부.
- handoff 전 요청 context와 실패 후 실제 step outcome 보존.
- Cargo source fallback 추가, compiled target의 compiler/lock/workload 경계 유지.
- 경로 분류·scope 선택 함수 분리 및 sparse/혼합 경로 회귀.
- inventory JSON/provenance 오류 메시지, build_ref 설명, 부분 생산 재사용 계약.
- 새 fresh/reuse 다운로드 pin 일치, 미사용 digest output·중복 target 환경변수 정리.

## 본문 변경 정도 / 본문 무손실 여부

기존 source 변경의 full 확대, auto 입력 누락 시 Windows 생성, 실패 gate를 유지한다.
명시 installer 오류를 자동 rebuild로 바꾸지 않는다. 운영 문서는 승인한 기존 위치의
[CI_VALIDATION.md](../../docs/operations/CI_VALIDATION.md)를 필요한 부분만 수정했다.

## 검증 결과

- CI/desktop artifact 회귀 89개 통과.
- 전체 `pnpm run test:automation` 561개 통과, skipped 0.
- `actionlint`, `git diff --check` 통과.
- 실패 재현에서 실제 context/outcome JSON 존재, handoff failure와 미실행 smoke 상태 확인.
- 입력·step output의 임의 문자열 및 token을 진단에 복사하지 않는 회귀 통과.

## 잔여 위험

원격 Windows/Linux 검증은 최신 devel 통합 후보에서 Stage 6에 수행한다.
같은 concurrency 그룹의 pending 교체는 GitHub 기본 동작이다. checkout/Node 준비 실패에는
진단 script 실행이 보장되지 않는다. source fallback의 다른 lock 성능은 아직 실측하지 않았다.
행렬 확장 output, pwsh 전환, 미재현 core cache 경고는 현재 결함으로 처리하지 않는다.

## 다음 단계 영향

devel의 #19 병합으로 발생한 충돌을 해결하고 실제 전체 artifact 및 재사용 성공/실패를 검증한다.

## 승인 요청

현재 보정·게시 지시와 승인된 Stage 6 계획에 따라 계속 진행한다. merge/release/이슈 close는 범위 밖이다.
