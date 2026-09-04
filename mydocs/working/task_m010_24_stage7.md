# Task #24 Stage 7 보고서 — 최신 devel 재통합과 릴리스 범위 재정렬

GitHub Issue: [#24](https://github.com/postmelee/alhangeul-tauri/issues/24)
구현계획서: [`task_m010_24_impl.md`](../plans/task_m010_24_impl.md)
Stage: 7

## 단계 목적

PR #37 게시 뒤 전진한 최신 `devel`을 Task #24 이력에 일반 merge하고, 충돌을 최신
저장소 의미에 맞게 해소한다. 제품 실행 경계의 비중첩을 확인한 뒤 플랫폼 중립 전체 gate와
PR exact-head CI 한 번으로 재통합을 판정한다. 반복된 Actions 실행을 중단하고 첫 릴리스에
필요한 Pages·updater와 보류 항목의 순서를 명시한다.

## 산출물

| 파일·이력 | 변경·결과 요약 |
|---|---|
| Task #24 merge commit | Task #24 Stage 6 head `d707322e9157c53ae75451b64c600b2fcbc34514`에 최신 `origin/devel` `424bb9c43769d2d92fcfede6b7ddd13bba7561d0`을 두 번째 parent로 보존한다. |
| `mydocs/orders/20260815.md` | add/add 충돌에서 최신 `devel`의 당시 Task #24 보류 기록을 보존했다. |
| `tests/rhwp-sync-changes.test.mjs`, `tests/rhwp-sync-pr-body.test.mjs` | content 충돌에서 최신 `devel`의 `resolve('/tmp/...')` 절대 경로 기대를 유지했다. |
| `docs/operations/DESKTOP_RELEASE.md` | 자동 merge된 Task #34 Linux GUI acceptance 절과 기존 Task #24 v0.8.4 native 수용 기준선을 함께 보존했다. |
| Task #24 계획·최종 보고 | Stage 7, 리뷰 잔여 위험과 릴리스 순서를 반영했다. |
| `mydocs/orders/20260827.md` | #24 진행, #14·#17·#35 보류, #45·#16 후속 순서를 기록했다. |

## 재통합 판정

Task #24 Stage 6 head 이후 `devel` 전진분은 Task #34의 Linux GUI acceptance workflow와
harness, 관련 개발 의존성·lockfile, automation test와 운영 문서다. Task #24가 소유한 제품
runtime, Tauri bundle 설정, native Cargo manifest·lock, bundled Studio와 `third_party/rhwp`
pin에는 겹치는 변경이 없었다. 실제 merge conflict도 과거 오늘할일 1개와 automation test
2개뿐이었으며 제품 source conflict는 없었다.

따라서 Stage 3 native accepted SHA의 Windows x64·Linux x64·Linux arm64 artifact와 Stage 4·5
Windows/Linux GUI 수용은 그대로 계승한다. 이번 Stage에서 native matrix나 GUI workflow를
다시 실행하지 않는다. merge commit 자체는 플랫폼 중립 전체 gate와 `publish/task24`에
push한 동일 exact head의 CI 한 번으로 판정한다.

## 본문 변경 정도 / 본문 무손실 여부

- rebase, cherry-pick, squash, amend와 force push를 사용하지 않았다.
- 최신 `devel`의 Task #34 workflow·harness·문서 이력과 Task #24 제품·수용 이력을 모두
  보존했다.
- Save As 암호 dialog 파일명, 암호 추가·제거 UX, pagination helper 중복, PDF pagination
  flush와 중복 인쇄 status는 비차단 잔여 위험으로 기록하고 제품 코드를 확장하지 않았다.
- release tag, GitHub Release, 서명, package 게시, Pages 배포와 updater 활성화를 수행하지 않았다.

## 로컬 검증 결과

실행 명령:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run typecheck:gui
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
git status --short --ignore-submodules=all
```

결과:

- OK — frozen install과 제품 경계 233 files, 제품·release version `0.1.0` 검증 통과.
- OK — rhwp `v0.8.4` / `496333b27d21ddb9114ba9ae340bcb895870c9a7`, 관리 artifact 6개 검증 통과.
- OK — GUI TypeScript typecheck, automation 224/224, upstream 35/35, Studio 105/105 통과.
- OK — Studio production build 227 modules와 exact `rhwp_bg` WASM bundle 생성 성공.
- OK — `git diff --check`와 merge marker 검사 통과.
- 참고 — sandbox에서 submodule Git LFS 임시 디렉터리와 Vite 임시 산출물 접근이 처음
  거부됐으나, 같은 명령을 worktree 쓰기 권한으로 재실행해 실제 검증 성공을 확인했다.

Vite의 기존 CanvasKit browser externalization, ineffective dynamic import와 500 kB chunk
경고는 유지됐으며 새 오류나 제품 경계 위반은 아니다.

## 원격 exact-head gate

이 보고서를 포함하는 merge commit을 `publish/task24`에 non-force fast-forward push한 뒤
`.github/workflows/ci.yml`을 정확히 한 번 dispatch한다. run의 `headSha`가 merge commit과
같고 conclusion이 `success`여야 Stage 7 원격 gate를 통과한다. 실패하면 같은 SHA를 재실행하지
않고 실패 원인과 후속 승인 필요성을 보고한다. 이 post-commit 결과의 진실 원천은 GitHub
Actions check와 run URL이며, 성공을 이 commit 안에 미리 기록하지 않는다.

## 최종 권고 릴리스 순서

1. Task #24 PR #37 merge
2. Issue #45 — `postmelee/alhangeul-macos` 디자인 체계를 참고한 Windows/Linux Pages와
   MSI·NSIS·AppImage 다운로드·updater URL 계약
3. Issue #16 — MSI·NSIS·AppImage updater와 세 custom target의 실제 `N → N+1` 검증
4. 위 변경을 모두 포함한 새 exact SHA에서 최종 native·GUI·installer·updater gate 1회

Issue #14 Windows thumbnail, Issue #17 Linux thumbnail과 Task #35 Windows GUI 자동화는
첫 릴리스 필수 범위에서 제외한다. 기존 Task #35 branch는 보존하되 추가 Actions 실행은
중단한다.

## 잔여 위험

- Windows MSI 수동 GUI, Linux AppImage/RPM 실행과 Linux arm64 실제 GUI는 기존과 같이
  미검증이다.
- 암호 문서 첫 Save As dialog가 기존 파일명을 표시할 수 있고, 평문에 암호 추가·기존 보호
  제거 UX는 제공하지 않는다.
- pagination helper 중복, PDF export의 deferred pagination flush와 중복 인쇄 status는 관련
  후속 범위로 넘긴다.
- 현재 Actions artifact는 임시 증적이며 Pages 다운로드나 release asset이 아니다.

## 다음 단계 영향

- exact-head CI 성공 시 PR #37은 merge 가능한 Task #24 최종 후보로 판정한다.
- PR merge, Issue #24 close, PR #32 close와 worktree·branch 정리는 이번 Stage에 포함하지
  않고 작업지시자 승인을 기다린다.
- 다음 구현 task는 #45이며, #45 URL 계약 뒤 #16을 시작한다.

## 승인 경계

- 작업지시자는 최신 `devel` merge, 충돌 해결, 로컬 전체 gate, non-force push와 exact-head
  CI 1회까지 승인했다.
- CI 이후에는 PR merge나 배포를 진행하지 않고 결과와 merge 승인 요청만 보고한다.
