# Task #9 Stage 5 보고 — 첫 공개 준비 Go/No-Go와 후속 게시 입력 확정

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
구현계획서: [`task_m010_9_impl.md`](../plans/task_m010_9_impl.md)
Stage: 5

## 단계 목적

Stage 4.8의 공개 계약·owner 결정과 Stage 4.9의 공개 전환 검사를 대조해 Task #9 준비
변경의 devel PR 진입 여부를 판정했다. 준비 Go를 실제 `v0.1.0` 공개 Go와 분리하고,
후속 게시 작업이 다시 확보해야 할 source·파일·환경·승인을 공식 버전 기록에 확정했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/releases/v0.1.0.md` | Task #9 준비 **Go**, 실제 공개 **No-Go**, 차단 사유와 단계별 재개 조건 기록 |
| `mydocs/plans/task_m010_9.md` | Stage 5 판단 완료·결과 승인 대기로 상태 갱신 |
| `mydocs/plans/task_m010_9_impl.md` | Stage 5 판단 완료·결과 승인 대기로 상태 갱신 |
| `mydocs/orders/20260906.md` | 오늘할일을 Stage 5 결과 승인 대기로 갱신 |

판정 결과:

| 대상 | 결론 | 핵심 근거 |
|---|---|---|
| Task #9 준비 변경의 devel PR | **Go** | Stage 4.8 계약·위험 결정 승인, Stage 4.9 95개 집중 테스트·Pages·제품 경계 검사 통과 |
| 실제 `v0.1.0` 공개 | **No-Go** | #19 OPEN, final main SHA·실제 11개 asset·새 파일 수용·공개 승인이 없음 |
| #28 보호 정책 | 후속 분리 | owner가 첫 공개의 수동 승인 경로를 허용했으므로 새 차단 조건으로 격상하지 않음 |

## 본문 변경 정도 / 본문 무손실 여부

`docs/releases/v0.1.0.md`의 식별자 표, Pages 결정, 공개 gate와 인계 문단만 현재 판단으로
보정했다. 과거 수용 근거 표와 고정 원문 링크는 재작성하지 않았다. 제품 source·runtime·pin·lock,
workflow, `site/release.json`은 Stage 4.9 기준 이후 변경하지 않았다. Issue·branch 보호·Release 등
원격 상태도 읽기만 했고 생성·수정·종료하지 않았다.

## 검증 결과

실행 명령:

```bash
git diff --name-status 46e3b010398ee391db0ed59b510f49421e2dd13c HEAD
git diff --exit-code 12190e0 -- apps crates rhwp-core.lock third_party/rhwp pnpm-lock.yaml .github/workflows site
git merge-base --is-ancestor 8b4ae60bb0f9619caa6c1f4d9f5a3796a42edcd9 HEAD
gh release list -R postmelee/alhangeul-tauri --limit 100 --json tagName,isDraft,isPrerelease,publishedAt
git ls-remote origin refs/heads/devel refs/heads/main 'refs/tags/v0.1.0*'
gh issue view 9 -R postmelee/alhangeul-tauri --json number,title,state,url,body
gh issue view 19 -R postmelee/alhangeul-tauri --json number,title,state,url,body
gh issue view 28 -R postmelee/alhangeul-tauri --json number,title,state,url,body
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — `46e3b010…` 이후 Task #9 전체 변경 목록을 확인했고, `12190e0` 이후 앱·crate·pin·lock·
  workflow·site 공개 데이터는 변경되지 않았다.
- OK — 기존 원격 `publish/task9` 기준 `8b4ae60…`은 현재 HEAD의 조상이다. 이 검사는 이후
  final-report 단계에서 일반 fast-forward 가능성을 다시 확인해야 하며 push 승인은 아니다.
- OK — GitHub Release 목록은 `[]`, `v0.1.0*` tag는 없다. 원격 devel은 `46e3b010…`,
  main은 `69b4730a…`로 Stage 4.8 조회와 동일하다.
- OK — #9·#19·#28은 모두 OPEN이다. #19의 snapshot/stale job 수용 기준은 미완료이므로
  owner가 정한 첫 공개 선행 조건을 충족하지 않았다. #28은 승인대로 후속 분리 상태다.
- OK — product-boundary는 실제 등록 중첩 worktree 제외 후 402개 파일을 통과했다.
  `git diff --check`도 통과했다.
- 재사용 — Stage 4.9의 95개 집중 테스트, Pages build/check, version·metadata·rhwp pin 검사는
  이후 제품·workflow·site 변경이 문서뿐임을 확인해 재사용했다. 새 성공으로 확대하지 않는다.
- 미실행 — native/Tauri build, signing, workflow dispatch, tag, draft/public Release, Pages 배포,
  manifest 활성화. 실제 공개 No-Go 상태이고 Stage 5 범위가 아니므로 실행하지 않았다.

## 잔여 위험

- #19가 완료되지 않아 실제 첫 공개는 중단 상태다. 별도 Task에서 동일 revision PDF와 stale job
  회수 계약 및 Windows/Linux 회귀를 통과해야 한다.
- final main SHA와 두 비게시 run이 없고, installer 6개·signature 3개·inventory·SHA256SUMS의
  실제 bytes도 없다. 과거 검증 결과는 이 파일들의 서명·설치 성공을 대신하지 않는다.
- Windows Authenticode 미서명 경고, 자동 branch 보호 부재, RPM/arm64 실제 GUI 환경 확보는
  승인된 한계이지만 후속 작업에서 안내·수동 승인·실제 package 검증 책임이 남는다.
- `site/release.json`은 unreleased이며 production manifest가 없다. Release read-back 전에
  공개 데이터나 manifest를 먼저 배포하면 안 된다.

## 다음 단계 영향

- Stage 5 승인 후 `task-final-report` 절차로 Task #9 전체 수용 기준, 문서 위치, 정량 변화와
  후속 게시 Issue 초안을 최종 보고서에 정리한다.
- 최종 보고 승인 뒤에만 `publish/task9` fast-forward push와 devel 대상 PR을 게시한다.
- PR merge 후 #19를 별도 Task로 완료하고, 별도 게시 Issue에서 main exact SHA·두 run·11개
  실제 asset·동일 bytes 공개·release data/Pages를 각각 승인받는다.

## 승인 요청

- Stage 5의 준비 Go/실제 공개 No-Go 판정과 산출물·검증 결과를 승인하면 최종 보고 및
  devel 대상 PR 준비 단계로 진행한다.
