# Task #60 Stage 2 — 측정 회귀 검증

GitHub Issue: [#60](https://github.com/postmelee/alhangeul-tauri/issues/60)
구현계획서: [task_m010_60_impl.md](../plans/task_m010_60_impl.md)

## 단계 목적

GitHub job/step 시간을 누락과 0초를 구분하여 재현 가능하게 수집한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| scripts/ci/timings.mjs | exact run attempt 페이지 수집, job/step wall time |
| tests/ci-timings.test.mjs | skipped/incomplete/실패/잘못된 interval/pagination |

## 본문 변경 정도 / 본문 무손실 여부

제품 동작 변경 없음. 읽기 전용 metadata 수집 도구 추가.

## 검증 결과

`node --test tests/ci-timings.test.mjs`: 3/3 통과.
`git diff --check --ignore-submodules=all`: 통과. 별도 submodule checkout에 upstream LFS pointer 경고가 있어 소스 diff와 구분한다.

## 잔여 위험

실제 후보 timing은 #64 통합 이후 수집한다. started offset은 runner queue로 표시하지 않는다.

## 다음 단계 영향

#61–#64는 같은 측정/결과 계약을 사용한다. Stage 3은 통합 후보 검증에서 완료한다.

## 승인 요청

기존 전체 진행 승인 적용.
