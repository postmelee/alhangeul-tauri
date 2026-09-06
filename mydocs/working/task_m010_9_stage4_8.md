# Task #9 Stage 4.8 보고 — 공개 계약·동일 파일 게시 경로·최소 검증 확정

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
구현계획서: [`task_m010_9_impl.md`](../plans/task_m010_9_impl.md)
Stage: 4.8

## 단계 목적

첫 `v0.1.0` 공개의 실제 원격 상태를 다시 읽고, 서명된 updater 파일을 재빌드하지 않고
수동 패키지와 함께 게시하는 절차를 확정했다. 명시 판단이 필요했던 Windows 미서명,
PDF #19, CLI·#28의 보호 경계를 owner 결정으로 남겨 후속 게시 작업이 실제 파일만 검증하게 했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/operations/DESKTOP_RELEASE.md` | 동일 SHA의 updater 7개+수동 3개·checksum, CLI 승인 경계를 정책에 연결 |
| `docs/operations/PUBLIC_RELEASE_RUNBOOK.md` | 메인 exact SHA 비게시 후 draft 11개 업로드, 전/후 read-back·복구 절차를 300행으로 확정 |
| `docs/operations/RELEASE_CHECKLIST.md` | 6종 출처·11개 목록·SHA256SUMS·launcher·CLI 보호 확인 추가 |
| `docs/releases/v0.1.0.md` | 실제 조회값, 6종 파일 계약, 위험 결정, 후속 최소 검증 환경을 기록 |
| `mydocs/plans/task_m010_9.md` | Stage 4.8 상태와 세 owner 결정을 수행계획에 확정 |
| `mydocs/plans/task_m010_9_impl.md` | 승인·조회·검증과 다음 단계 경계를 진행 메모에 반영 |
| `mydocs/orders/20260904.md`, `mydocs/orders/20260906.md` | Stage 4.8 진행·결과 승인 대기 상태를 날짜별 보드에 반영 |
| GitHub Issue #9 | 제목·본문을 stable/updater 포함·준비/공개 분리 계약으로 보정하고 결정을 read-back |

## 본문 변경 정도 / 본문 무손실 여부

정책·runbook·체크리스트는 실행 경로와 승인 의미를 수정했다. 없는 workflow 옵션을 추정하지 않고
실제 `gh` 옵션을 확인했으며, 승인된 11개 파일 명시 목록을 사용하게 했다. `v0.1.0.md`의
`## 기존 검증 근거`부터 역사 표와 `old-*` 고정 원문 링크는 HEAD와 바이트 단위로 유지했다.
제품 source·test·workflow·`site/release.json`은 변경하지 않았다. #9 이전 Stage 1~4.7은 수정하지 않았다.

## 검증 결과

실행 명령:

```bash
git status --short --branch
git diff --name-status 46e3b010398ee391db0ed59b510f49421e2dd13c HEAD
gh release list -R postmelee/alhangeul-tauri --limit 100 --json tagName,isDraft,isPrerelease,publishedAt
git ls-remote origin refs/heads/devel refs/heads/main 'refs/tags/v0.1.0*'
gh issue view 9 -R postmelee/alhangeul-tauri --json title,state,body
gh issue view 19 -R postmelee/alhangeul-tauri --json title,state,body
gh issue view 28 -R postmelee/alhangeul-tauri --json title,state,body
gh api repos/postmelee/alhangeul-tauri/environments/release
gh api repos/postmelee/alhangeul-tauri/environments/github-pages
gh api repos/postmelee/alhangeul-tauri/environments/github-pages/deployment-branch-policies
gh api repos/postmelee/alhangeul-tauri/branches/devel
gh api repos/postmelee/alhangeul-tauri/branches/main
gh api repos/postmelee/alhangeul-tauri/rulesets
gh api user --jq '{login}'
gh api repos/postmelee/alhangeul-tauri --jq '{default_branch,permissions}'
gh release create --help
gh release upload --help
gh release edit --help
git diff --check
git diff --exit-code -- site/release.json .github/workflows apps scripts tests package.json
```

결과:

- OK — 2026-09-06 Release `[]`, `v0.1.0*` tag 없음. devel `46e3b010…`, main `69b4730a…`.
- OK — #9·#19·#28은 OPEN. #9는 보정된 제목·본문·세 결정을 재조회했다.
- OK — `release`: reviewer `postmelee`, self-review 방지 false, ref 제한 null, admin bypass true.
  `github-pages`: `devel` branch 1개 허용. main/devel protected false, rulesets `[]`.
- OK — CLI 주체 `postmelee`, repository admin/push 권한. 권한 보유는 공개 승인과 구분했다.
- OK — 설치된 `gh` 에 `--verify-tag`, `--draft`, `--notes-file`, `--prerelease`, `--latest`가 있고
  upload `--clobber`의 삭제·재업로드 의미를 확인했다. runbook은 `--clobber`를 금지한다.
- OK — 단계 산출물 9개 문서만 허용, 상대 링크/앵커 83개, Bash 블록 19개 구문 통과,
  runbook 300행, 기존 검증 근거·고정 원문 링크 무손실, `site/release.json` `unreleased` 유지.
- OK — `git diff --check` 통과. 제품·test·workflow·공개 데이터에 미커밋 변경 없음.
- 미실행 — native/CI, signing, tag/Release/Pages/manifest. 이 Stage의 승인 범위가 아니며 동일 검증을
  반복하지 않는 목적에 맞게 실행하지 않았다. 알려진 product-boundary 오탐은 Stage 4.9 범위다.

## 잔여 위험

- #19는 문서 정확성 결함이므로 첫 공개 전 별도 작업으로 수정한다. 편집 자제 안내만으로 통과하지 않는다.
- Windows installer는 Authenticode 미서명으로 첫 공개하며 SmartScreen 경고가 나타날 수 있다.
  사용자에게 가능성을 안내하되 보호 기능 해제를 요구하지 않는다. updater Minisign은 별도로 검증한다.
- main/devel에 branch protection/ruleset이 없고 CLI 게시는 Actions environment reviewer를 자동 적용받지 않는다.
  첫 공개에는 owner의 exact SHA·파일 목록·공개 승인으로 통제하고 #28을 OPEN 후속으로 유지한다.
- 최종 main SHA·두 run·11개 실제 파일·설치 환경은 아직 없다. 이 Stage는 게시 절차를 확정한 것이지
  실제 파일을 수용하거나 공개한 것이 아니다.

## 다음 단계 영향

- Stage 4.9는 현재 `unreleased` 공개 데이터를 유지한 채 Pages 테스트를 고정 fixture/실제 source로 분리한다.
- product-boundary는 문서 맥락·중첩 worktree 오탐만 좁히고 실제 금지 경계를 유지한다.
- Stage 4.9 이후에도 서명 build·tag·Release·Pages는 실행하지 않는다. #19 수정과 후속 게시 작업에 인계한다.

## 승인 요청

- Stage 4.8 산출물과 검증 결과를 승인하면 Stage 4.9로 진행한다.
