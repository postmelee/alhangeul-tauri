# Task #9 Stage 4.7 보고서 — 첫 공개 선행 task 재기준선

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
구현계획서: [`task_m010_9_impl.md`](../plans/task_m010_9_impl.md)
Stage: 4.7

## 단계 목적

Stage 4.6 exact 후보 검증 뒤 변경된 upstream과 첫 공개 요구를 반영해 Stage 5 진입을
보류한다. 당시 후보를 역사 증적으로 보존하고 별도 선행 task가 병합된 latest `devel`에서
exact-SHA Windows/Linux 후보를 다시 검증하는 조건을 고정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_9.md` | 최신 upstream drift, 첫 공개 선행 task와 Stage 5 재진입 조건 반영 |
| `mydocs/plans/task_m010_9_impl.md` | Stage 4.7 산출물·검증·커밋과 Stage 5 의존성 반영 |
| `mydocs/orders/20260812.md` | Task #9을 Stage 4.7 진행 상태로 갱신 |
| `mydocs/working/task_m010_9_stage4_7.md` | 계획 재기준선과 검증 결과 기록 |

## 본문 변경 정도 / 본문 무손실 여부

기존 Stage 1~4.6 계약과 성공 증적은 변경하거나 성공 범위를 확대하지 않았다. 공개 전
선행 조건과 미래 재검증 책임만 추가했으며, 별도 Issue가 소유할 구현을 Task #9 범위에
합치지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm run check:rhwp-pin
pnpm run check:product-boundary
git diff --check
```

결과:

- `check:rhwp-pin` 통과 — 현재 pin `v0.8.2` / `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, 관리 artifact 6개 정합성 확인
- `check:product-boundary` 통과 — 188개 파일의 Windows/Linux 제품 경계 확인
- `git diff --check` 통과 — whitespace 오류 없음

## 잔여 위험

- upstream 자동 sync와 `v0.8.4` 수용 Issue는 등록 전 초안 승인 게이트에 있다.
- Issue #14·#16·#17, Pages와 canonical URL 결정이 완료되기 전에는 새 최종 후보 SHA를 고정할 수 없다.
- organization 이전 여부가 updater·Pages URL에 영향을 줄 수 있어 Issue #16 시작 전 canonical URL 결정을 완료해야 한다.

## 다음 단계 영향

- 다음 작업은 upstream 감시·자동 sync Issue 등록과 task-start이며, 그 다음 별도 `v0.8.4` 갱신 Issue를 진행한다.
- 두 Issue와 나머지 첫 공개 선행 task가 merge된 뒤 Task #9에서 latest `devel` exact 후보 gate를 재실행한다.
- Stage 5는 그 전까지 시작하지 않는다.

## 승인 요청

- Stage 4.7 산출물과 검증 결과를 승인하면 upstream 감시·자동 sync Issue 등록 절차로 진행한다.
