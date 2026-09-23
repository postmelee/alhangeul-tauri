# Task #60 Stage 1 — CI 계층 계약

GitHub Issue: [#60](https://github.com/postmelee/alhangeul-tauri/issues/60)
구현계획서: [task_m010_60_impl.md](../plans/task_m010_60_impl.md)

## 단계 목적

현재 병목을 기준으로 입력/출력·소유권·대기 의존성과 증거 경계를 고정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| docs/operations/CI_VALIDATION.md | 5개 계층, SHA/bytes 재사용, 결과 해석, 기준 측정 |

## 본문 변경 정도 / 본문 무손실 여부

신규 공식 가이드만 생성했다. 기존 제품·릴리즈 지침은 변경하지 않았다.

## 검증 결과

`git diff --check` 통과. GitHub run 34047889263/34052696931 job/step metadata와 조사한 cache log 기준 시간을 대조했다. 동일 workload A/B가 아님을 명시했다.

## 잔여 위험

실제 분리 workflow와 warm/cold 비교는 후속 계층 구현 후 확인한다.

## 다음 단계 영향

측정 도구와 회귀 검증을 추가하고 #61–#64가 같은 계약을 구현한다.

## 승인 요청

2026-09-07의 전체 하위 작업 진행 승인을 적용하여 추가 요청 없이 계속한다.
