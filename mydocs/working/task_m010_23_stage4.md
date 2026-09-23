# Task #23 Stage 4 완료 보고서 — post-merge activation handoff 확정

GitHub Issue: [#23](https://github.com/postmelee/alhangeul-tauri/issues/23)
구현계획서: [`task_m010_23_impl.md`](../plans/task_m010_23_impl.md)
Stage: 4

## 단계 목적

Task #23 task PR과 live upstream candidate를 분리하고, merge 뒤에만 수행할 GitHub App 외부 상태 준비, 실제 `v0.8.4` write dispatch, 멱등 재실행, Issue #24 인계와 Issue #23 지연 close 순서를 확정했다. 현재 GitHub 상태는 이름과 존재 여부만 읽었으며 credential 설정, workflow dispatch, candidate merge와 Issue 변경은 수행하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/DEVELOPMENT.md` | 기존 `alhangeul-rhwp-sync-bot` 재사용과 Tauri workflow가 요청하는 축소된 installation token 권한을 구분했다. |
| `mydocs/working/task_m010_23_stage4.md` | 현재 외부 상태, post-merge activation·멱등성·handoff·close gate와 실패 복구를 기록한다. |

## 본문 변경 정도 / 본문 무손실 여부

Stage 3 운영 문서의 입력, variable·secret 이름과 장애 복구 계약은 유지했다. 기존 Alhangeul Automation App은 다른 repository workflow 때문에 더 넓은 App-level 권한을 가질 수 있지만, Tauri workflow는 `permission-contents: write`와 `permission-pull-requests: write`만 요청한다는 실제 구현 경계를 한 문단으로 명확히 했다. credential 값, private key, token과 installation ID는 기록하지 않았다.

제품 pin `v0.8.2`, upstream source·WASM·Cargo lock과 제품 코드는 변경하지 않았다.

## 현재 외부 상태

- GitHub default branch는 `devel`이다.
- Issue #23과 Issue #24는 모두 M010에서 `OPEN`이다.
- Tauri repository Actions variable과 secret 목록은 각각 0개다. 따라서 `ALHANGEUL_AUTOMATION_CLIENT_ID`와 `ALHANGEUL_AUTOMATION_APP_PRIVATE_KEY`는 아직 없다.
- 현재 `gh` 사용자 token은 GitHub App installation 목록 API 권한이 없어 `alhangeul-rhwp-sync-bot`의 Tauri repository 설치 여부를 확인할 수 없었다. 설치 완료로 추정하지 않고 외부 상태 승인·확인 항목으로 남긴다.
- `automation/rhwp-v0.8.4-full-sync` remote branch와 base `devel`의 candidate PR은 모두 없다.

## post-merge activation과 close gate

다음 순서를 바꾸지 않는다.

1. Task #23 task PR을 `Refs #23`으로 `devel`에 merge하고 workflow 파일이 default branch에 존재하는지 확인한다. task PR 본문에 `Closes #23`, `Fixes #23`, `Resolves #23`을 쓰지 않는다.
2. 별도 외부 상태 승인을 받은 뒤 기존 `alhangeul-rhwp-sync-bot` installation의 repository 선택에 `postmelee/alhangeul-tauri`를 포함한다. repository variable `ALHANGEUL_AUTOMATION_CLIENT_ID`와 repository secret `ALHANGEUL_AUTOMATION_APP_PRIVATE_KEY`를 설정하고 이름·존재만 확인한다.
3. App의 다른 권한과 무관하게 workflow가 발급하는 Tauri token이 Contents write, Pull requests write만 요청하는지 확인한다. repository-wide Actions PR 승인 설정은 변경하지 않는다.
4. default branch의 `rhwp-upstream-sync.yml`을 `target_tag=v0.8.4`, `dry_run=false`로 한 번 dispatch한다.
5. run 성공과 draft PR 정확히 1개를 확인한다. PR은 base `devel`, head `automation/rhwp-v0.8.4-full-sync`, bot author이며 old/new tag·commit, release URL, allowlist changed paths, 자동 검증과 Windows/Linux native 미완료를 포함해야 한다.
6. log, artifact, step summary와 PR body에 client ID 외의 credential payload, private key와 installation token이 없는지 확인한다.
7. 같은 `target_tag=v0.8.4`, `dry_run=false`를 다시 dispatch한다. 두 번째 run은 기존 PR을 보고하고 추가 branch·PR·commit을 만들지 않아야 한다.
8. candidate PR URL과 provenance를 Issue #24에 인계한다. Issue #24의 `local/task24`에서 candidate 변경을 검토·수용하며 자동 candidate를 직접 merge하거나 Issue #24를 자동 close하지 않는다.
9. 위 증적을 Issue #23에 기록하고 작업지시자의 close 승인을 확인한 뒤에만 Issue #23을 닫는다.

실패 시 source 갱신·gate·allowlist 단계는 remote write 전에 중지한다. App 설정 또는 token 발급 실패도 branch push 전 실패로 처리한다. push 뒤 PR 생성만 실패하면 remote branch를 덮어쓰거나 force push하지 않고 commit을 확인한 뒤 동일 branch의 draft PR 복구 또는 승인된 정리를 선택한다. branch-only blocker와 기존 PR은 자동 삭제·reset하지 않는다.

## 검증 결과

실행 명령:

```bash
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
git status --short
```

결과:

- OK — product boundary 192 files, 제품 version `0.1.0`, release metadata와 rhwp pin `v0.8.2` 검증 통과
- OK — `test:automation` 102개, `test:upstream` 35개 통과
- OK — `test:studio` 21 files, 97 tests 통과
- OK — Studio production build 213 modules 변환 완료
- OK — `git diff --check` 경고 없음
- OK — GitHub variable·secret 이름 조회, Issue 상태, default branch와 candidate branch·PR 기준 상태를 read-only로 확인
- INFO — Vite의 기존 CanvasKit browser externalization, dynamic import와 500 kB chunk 경고는 유지되며 새 오류는 없다.

## 잔여 위험

- GitHub App installation과 Actions variable·secret은 아직 준비되지 않아 live token 발급을 검증하지 않았다.
- task workflow는 아직 default branch에 없으므로 actual candidate build·push·draft PR과 동일 입력 멱등성은 post-merge close gate에 남는다.
- `v0.8.4` 제품 반영과 Windows/Linux native 수용은 Issue #24에서 수행한다.

## 다음 단계 영향

- 다음 승인에서는 `task-final-report` 절차로 최종 보고서를 작성하고 `publish/task23`을 push해 `devel` 대상 Open PR을 만든다.
- 최종 보고서와 PR은 Issue #23 지연 close 예외와 위 post-merge activation checklist를 그대로 포함해야 한다.
- PR merge만으로 Task #23을 완료 처리하지 않고 live candidate와 멱등성 증적까지 같은 task에서 이어간다.

## 승인 요청

- Stage 4 산출물과 검증 결과를 승인하면 Task #23 최종 보고서 작성과 PR 게시 단계로 진행한다.
