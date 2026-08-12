# Task #23 Stage 1 보고서 — Stable release 판정과 관리 참조 계약

GitHub Issue: [#23](https://github.com/postmelee/alhangeul-tauri/issues/23)
구현계획서: [`task_m010_23_impl.md`](../plans/task_m010_23_impl.md)
Stage: 1

## 단계 목적

`edwardkim/rhwp` 공개 Stable release metadata와 Git tag의 resolved commit을 읽기 전용으로
판정하고, 현재 pin과 후보 branch/PR 상태를 write 이전에 분류하는 helper를 추가한다.
동시에 실제 pin 이동 시 허용된 current-pin 참조만 marker·예상 횟수로 갱신하는 transactional
preflight 계약을 만들고 역사적 v0.8.2 기록의 무손실을 회귀 테스트로 고정한다.

## 산출물

| 파일 | LOC | 변경 요약 |
|---|---:|---|
| `scripts/check-rhwp-upstream-release.mjs` | 300 | Stable metadata·annotated/lightweight tag·current pin·candidate 상태 판정과 JSON/GitHub output |
| `scripts/update-rhwp-managed-references.mjs` | 167 | 5개 허용 파일의 exact marker preflight·일괄 갱신·멱등 no-op |
| `tests/rhwp-upstream-release.test.mjs` | 234 | release·tag·pin·상태 분기·출력 12개 test와 실제 current 경계 확인 |
| `tests/rhwp-managed-references.test.mjs` | 218 | 치환·무손실·부분 실패·멱등·실제 marker 정렬 5개 test |
| `package.json` | 27 | 두 Stage 1 test를 `test:automation`에 연결 |

신규 파일은 모두 300 LOC 이하이며 기존 282 LOC `update-upstream.sh`와 300 LOC를 넘은
`actions-workflows.test.mjs`는 수정하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

- 제품 pin, submodule, bundled WASM, Cargo lock, README와 공식 문서 본문은 변경하지 않았다.
- 관리 참조 test는 임시 fixture와 실제 파일을 복제한 임시 snapshot에서만 치환한다.
- README current pin, DEVELOPMENT·UPSTREAM current 상태와 재현 명령, 실제 pin test 두 곳만
  자동 갱신 대상으로 고정했다.
- `rhwp-pin-fetch` fixture, local-fonts의 역사적 test 이름, v0.8.2 known issue와 Task #13
  DESKTOP_RELEASE 기록은 자동 치환 밖에 두고 무손실을 확인했다.

## 구현 결과

- latest 또는 명시 tag의 release가 `draft=false`, `prerelease=false`, exact `vX.Y.Z`인지
  확인한 뒤 `git ls-remote`의 base/peeled ref로 40자리 commit을 결정한다.
- current lock, gitlink, submodule HEAD, exact Studio `index.html`·`src/main.ts`가 일치하지
  않으면 후보 상태 판정 전에 실패한다.
- `current`, `dry_run`, `existing_pr`, `branch_blocker`, `create_candidate`를 구분하며
  current와 dry-run 경로에서는 candidate branch/PR 조회를 생략한다.
- 이미 고정한 Stable tag의 commit 이동과 현재 pin보다 낮은 target은 정상 candidate로
  만들지 않고 provenance 오류로 중지한다.
- 참조 갱신 helper는 모든 파일·marker를 먼저 읽고 검증한 뒤 쓰므로 늦은 marker 오류에서도
  write가 0회임을 확인했다. tag와 commit 일부만 같은 혼합 입력도 거부한다.

## 검증 결과

실행 명령:

```bash
node --test tests/rhwp-upstream-release.test.mjs tests/rhwp-managed-references.test.mjs
pnpm run test:automation
git diff --check
```

결과:

- OK — Stage 1 독립 test: 17 passed, 0 failed
- OK — 전체 automation 회귀: 88 passed, 0 failed
- OK — 실제 repository current pin·gitlink·submodule HEAD·exact Studio entry 정합성
- OK — 실제 관리 marker를 임시 snapshot에서 v999.0.0으로 치환해 5개 allowlist 정렬 확인
- OK — helper·test 파일 300 LOC 이하
- OK — `git diff --check` 경고 없음

## 잔여 위험

- 실제 GitHub Releases API, upstream remote tag와 Tauri remote branch/PR을 함께 읽는 live
  dry-run은 아직 실행하지 않았다. credential 없는 read-only 경로를 Stage 3에서 v0.8.4로
  검증한다.
- Stage 2 workflow가 아직 없으므로 App token, job permission, changed-path allowlist와
  draft PR write 순서는 다음 단계 계약 test의 대상이다.
- 파일 write 중 filesystem 자체가 실패하면 marker preflight 뒤 일부 파일이 기록될 수 있다.
  workflow에서는 clean checkout에서 실행하고 changed-path allowlist·전체 검증 실패 시
  commit/push를 금지해 외부 변경을 막는다.

## 다음 단계 영향

- Stage 2 workflow는 `check-rhwp-upstream-release.mjs`의 snake_case GitHub output과
  decision 값을 그대로 사용한다.
- candidate job은 `update-upstream.sh` 성공 뒤 current old/new 값을 전달해
  `update-rhwp-managed-references.mjs`를 실행해야 한다.
- workflow/PR body test는 tag 이동·downgrade·branch blocker에서 write job이 실행되지
  않는지도 확인한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2의 draft sync PR workflow와 PR body
  helper 구현으로 진행한다.
