# Task #27 Stage 2 — 외부 Action SHA 정렬과 계약 검사

GitHub Issue: [#27](https://github.com/postmelee/alhangeul-tauri/issues/27)
구현계획서: [task_m010_27_impl.md](../plans/task_m010_27_impl.md)
Stage: 2

## 단계 목적

152개 외부 uses를 동일 repository의 승인 SHA로 정렬하고 floating ref 재유입을 차단한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| 19 workflow/composite YAML | Action SHA·version 주석 정렬, 입력/job/권한 보존 |
| scripts/verify-action-pins.mjs | YAML AST 전체 uses·inventory·provenance 검사, 90 LOC |
| tests/action-pins.test.mjs | 14회귀: floating·unknown·주석·quoted/flow·composite/reusable·alias/중복 |
| package.json·pnpm-lock.yaml | check:action-pins, test:automation 편입, 기존 yaml2.9.0 직접 dev 선언 |
| 기존 workflow test 4개 | Action identity의 승인 SHA 반영 |

## 본문 변경 정도 / 본문 무손실 여부

AST 비교로 19 YAML 파일의 uses ref 외 입력·job·permissions·shell/run/condition이 동일함을 확인했다. 제품 경로·rhwp pin·공개 데이터는 변경하지 않았다. lock은 yaml importer 3행 추가뿐이다.

## 검증 결과

- OK: pnpm run check:action-pins — 25 YAML, 외부 152, pin11.
- OK: node --test tests/action-pins.test.mjs — 14/14.
- OK: pnpm run test:automation — 1009/1009.
- OK: actionlint -shellcheck= 및 git diff --check.
- 초기 환경 오류: shallow reference clone 불가와 submodule checkout/tag 초기화 도중 실행된 검사는 실패했다. clone 완료·고정 tag fetch·LFS 기본 필터 복구 후 다시 검증하며 제품 결함으로 오인하지 않는다.

## 잔여 위험

원격 Windows/Linux Action runtime·native/package compatibility는 Stage 3 full run에서 확인한다. live Pages/서명/token 발급을 실행하지 않으며 정적 입력/권한 검토와 구분한다.

## 다음 단계 영향

운영 정책·갱신/rollback 절차와 통합 검증을 완료한다.

## 승인 요청

사용자의 전체 수행·PR 리뷰·병합 명시 지시에 따라 Stage 3을 진행한다.
