# Task #23 Stage 2 완료 보고서 — rhwp draft sync PR workflow와 본문 생성

GitHub Issue: [#23](https://github.com/postmelee/alhangeul-tauri/issues/23)
구현계획서: [`task_m010_23_impl.md`](../plans/task_m010_23_impl.md)
Stage: 2

## 단계 목적

Stage 1의 공개 Stable 판정과 관리 참조 갱신 계약을 실제 후보 생성 흐름으로 연결했다. 읽기 전용 판정과 쓰기 가능한 candidate job을 분리하고, 모든 소스 갱신·플랫폼 중립 gate·변경 경로 검증이 성공한 뒤에만 최소 권한 GitHub App token으로 non-force branch push와 `devel` 대상 draft PR 생성을 허용했다. 후보 PR 본문은 provenance와 미완료 native 검증을 명시적으로 전달하도록 별도 helper로 고정했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/rhwp-upstream-sync.yml` | daily/manual Stable 판정, 격리된 candidate 검증, allowlist, 최소 권한 token, non-force draft PR 생성 계약을 구현했다. (277줄) |
| `scripts/write-rhwp-sync-pr-body.mjs` | tag·commit·release URL·branch·변경 경로를 검증하고 deterministic draft PR 본문을 생성한다. (158줄) |
| `tests/rhwp-sync-pr-body.test.mjs` | PR 본문 provenance, 정렬, 경로 안전성, 필수 인자와 입력 거부 계약을 검증한다. (109줄) |
| `tests/rhwp-upstream-sync-workflow.test.mjs` | trigger, read/write 분리, 실행 순서, allowlist, token 발급 시점과 금지 동작을 검증한다. (214줄) |
| `package.json` | 신규 workflow와 PR 본문 test를 `test:automation`에 편입했다. |
| `mydocs/working/task_m010_23_stage2.md` | Stage 2 구현, 검증, 잔여 위험과 Stage 3 인계 사항을 기록한다. |

## 본문 변경 정도 / 본문 무손실 여부

제품의 현재 rhwp pin `v0.8.2`, `third_party/rhwp` gitlink, Rust/Tauri 제품 코드와 공식 제품 문서는 변경하지 않았다. 이번 Stage는 automation workflow, 전용 PR 본문 helper, contract test와 test script만 추가했다. 후보 checkout에서만 관리 참조를 먼저 갱신한 뒤 `update-upstream.sh --run-checks`를 실행하도록 순서를 보정해, update script 내부의 pin 의존 test가 old pin과 충돌하지 않게 했다.

## 검증 결과

실행 명령:

```bash
node --test tests/rhwp-sync-pr-body.test.mjs tests/rhwp-upstream-sync-workflow.test.mjs
pnpm run test:automation
actionlint .github/workflows/rhwp-upstream-sync.yml
git diff --check
```

결과:

- OK — Stage 2 집중 test 14개 통과, 실패·skip 없음
- OK — 전체 `test:automation` 102개 통과, 실패·skip 없음
- OK — `actionlint`가 신규 workflow 문법과 action expression을 오류 없이 승인
- OK — `git diff --check` 경고 없음
- OK — workflow 277줄, helper 158줄, 각 test 214줄 이하로 파일 권장 상한 300줄 준수
- OK — App token은 전체 후보 검증 뒤에만 발급되고, 현재 저장소의 `contents: write`와 `pull-requests: write`만 요청하도록 contract test로 고정
- OK — force push, auto merge·approval, release/tag, issue close, package publish와 Pages deploy 동작 없음

## 잔여 위험

- workflow는 아직 default branch에 없으므로 실제 schedule 또는 manual dispatch로 실행하지 않았다.
- 저장소의 GitHub App installation, `ALHANGEUL_AUTOMATION_CLIENT_ID` variable과 `ALHANGEUL_AUTOMATION_APP_PRIVATE_KEY` secret은 post-merge 외부 상태 승인 전까지 live 검증되지 않는다.
- 실제 `v0.8.4` metadata 조회와 repository 무손실 dry-run은 Stage 3에서 확인한다.
- full candidate build, App token 발급, branch push와 draft PR 생성의 live 멱등성은 task PR merge 뒤 close gate로 남는다.

## 다음 단계 영향

- Stage 3에서 `docs/architecture/UPSTREAM.md`와 `docs/DEVELOPMENT.md`에 Stable 판정, candidate/native 수용 경계, local dry-run, credential 최소 권한과 복구 절차를 기록한다.
- Stage 3은 `v0.8.4`를 대상으로 읽기 전용 helper dry-run을 실행하고 전후 tracked status가 같은지 확인한다. repository credential 설정, workflow dispatch와 외부 쓰기는 수행하지 않는다.
- candidate PR에는 Windows/Linux native 검증이 미완료임과 Issue #24 handoff가 계속 명시되며, Task #24를 자동 종료하지 않는다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 공식 문서와 플랫폼 중립 통합 검증으로 진행한다.
