# Task #45 Stage 4.3 완료 보고 — PR 리뷰 보정과 최신 devel 통합

GitHub Issue: [#45](https://github.com/postmelee/alhangeul-tauri/issues/45)
구현계획서: [`task_m010_45_impl.md`](../plans/task_m010_45_impl.md)
검토 대상: [PR #47 review](https://github.com/postmelee/alhangeul-tauri/pull/47#issuecomment-5450724058)
Stage: 4.3

## 단계 목적

PR #47 리뷰에서 재현된 release 전환·clean checkout·접근성·Pages 배포 직렬화 문제를 고친다.
먼저 Task #14가 병합된 최신 `devel`을 통합하고, Task #45의 자세한 공개 릴리스 순서와 Task #14의
Windows thumbnail UI 수동 gate를 모두 보존한다. 변경은 Pages source/build/check/test와 운영 문서에
한정하며 release, tag, native artifact, Pages deployment와 updater manifest는 게시하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/pages.yml`, `tests/actions-workflows.test.mjs` | 모든 Pages run을 고정 `alhangeul-pages` concurrency group으로 직렬화하고 계약 test를 추가 |
| `scripts/check-pages.mjs`, `tests/pages.test.mjs` | published release data가 source→build→output checker를 통과하게 하고 `_site/` 없는 clean test fixture를 고정 |
| `site/script.js`, `tests/pages-design.test.mjs` | `manifestPublished=true` 이후에도 exact artifact를 hydrate하고 target별 고유 접근성 이름을 사용 |
| `site/index.html` | updater 대상이 아닌 Linux x64 DEB/RPM·arm64 DEB를 GitHub Releases 수동 확인 경로로 분리 |
| `scripts/pages/site-files.mjs` | site가 참조하지 않는 Pretendard font 2개를 Pages 복사 inventory에서 제외 |
| `scripts/build-pages.mjs` | 항상 성공하던 source child assertion 제거 |
| `mydocs/plans/task_m010_45_impl.md` | Stage 4.2 이력과 승인된 Stage 4.3 범위·검증 경계를 기록 |
| `docs/operations/DESKTOP_RELEASE.md`, `package.json`, `mydocs/orders/20260828.md` | 최신 `devel` 병합 충돌에서 Task #14·#45 문서와 automation inventory를 함께 보존 |

최신 `devel` 통합은 `b66aef3` 병합 commit으로 먼저 고정했다. Stage 4.3 보고서 작성 전 보정 source는
10개 파일, 100줄 추가·26줄 제거다. 제품 실행 코드, `third_party/rhwp`, package version과 lockfile은
이 보정에서 변경하지 않았다.

## 리뷰 항목 판정과 보정

- **clean checkout 테스트**: 기존 test가 repository `_site/index.html`을 직접 읽어 build 전 실패하는
  문제를 재현했다. 각 test가 임시 fixture를 build하도록 바꿨고 실제 `_site/`를 이동한 상태에서
  focused test 45개를 통과했다.
- **published release 검사**: checker가 모든 상태에 `requireUnreleased`와 direct URL 금지를 적용해
  정상 published data도 게시할 수 없었다. schema 검증은 유지하면서 direct URL 금지를 unreleased에만
  적용했고 published source/output 전체 경로 회귀 test를 추가했다.
- **manifestPublished 클라이언트**: manifest 공개 여부를 download hydration 조건에서 분리했다.
  `false`와 #16 이후 `true` fixture 모두 exact URL, version과 고유 aria label을 검증한다. 현재 source의
  조기 manifest 게시 금지는 그대로 유지한다.
- **수동 Linux package**: DEB/RPM·arm64를 세 updater target에 추가하지 않고 GitHub Releases 수동
  확인으로 보냈다. AppImage만 Linux x64 updater 대상이라는 계획 경계를 유지한다.
- **asset·workflow·dead check**: 미사용 font 1,557,048 bytes를 output에서 제외하고, 배포를 SHA별
  병렬화하던 concurrency key를 고정 group으로 바꿨으며 의미 없는 path assertion을 제거했다.
- **별도 source CI 주장**: Pages workflow의 build→`check:pages`가 source와 output을 함께 검사하고
  builder fixture도 이를 직접 호출한다. 중복 CI step은 추가하지 않고 clean checkout 회귀만 보강했다.

## 검증 결과

실행 명령:

```bash
CI=true pnpm install --frozen-lockfile
node --test tests/pages.test.mjs tests/actions-workflows.test.mjs # repository _site 이동 상태
pnpm run build:pages
pnpm run check:pages
pnpm run test:automation
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
node scripts/check-product-boundary.mjs --root <tracked-file-snapshot>
git diff --check
```

결과:

- OK — frozen lockfile로 workspace 3개 의존성 복구·검증, lockfile 변경 없음
- OK — `_site/` 없는 focused Pages/workflow test 45개 통과
- OK — Pages source 11개·root asset 2개·output 13개, 총 762,865 bytes
- OK — published source/output checker와 unreleased direct installer·manifest negative gate 통과
- OK — automation 291개 통과, 실패·skip 없음
- OK — product version `0.1.0`, release metadata, `rhwp v0.8.4` pin과 artifact 6개 일치
- OK — upstream 35개, Studio Vitest 23파일·105개와 TypeScript/Vite production build 통과
- OK — 현재 추적 파일 격리 snapshot의 product boundary 280개 통과
- OK — 변경 파일 whitespace 오류 없음

직접 `pnpm run check:product-boundary`는 사용자 소유 `.claude/worktrees/pr-review-dc9f5b`와
`.claude/worktrees/review-pr-47-febcbc`의 과거 checkout까지 저장소 하위 source로 읽어 실패했다.
두 worktree를 수정·삭제하지 않았으며 현재 추적 파일만 복사한 snapshot에서 같은 검사를 통과했다.

## 본문 변경 정도 / 본문 무손실 여부

`DESKTOP_RELEASE.md` 충돌은 Task #45의 artifact→Release→release data→exact `devel` Pages→#16
manifest 순서를 유지하고 Task #14의 thumbnail UI 수동 gate만 해당 검증 항목에 합쳤다. 릴리스 문서의
기존 수용 이력과 미게시 계약은 삭제하지 않았다. 홈의 문구·레이아웃·색상은 바꾸지 않았고, Linux
수동 package 두 버튼의 목적지만 잘못된 updater dropdown에서 Releases 목록으로 보정했다.

## 잔여 위험과 다음 단계

- canonical Pages와 published release fixture는 로컬 계약만 검증했다. PR merge 전에는 Pages를
  배포하거나 installer URL을 공개하지 않는다.
- `site/release.json`은 계속 `unreleased`, download null, `manifestPublished=false`다.
- PR source를 갱신한 뒤 GitHub CI를 확인하고 리뷰 댓글에 항목별 반영 근거를 남긴다.
- PR merge는 작업지시자 승인 뒤에만 수행한다. merge 후 exact `devel` SHA Pages 배포와 public
  read-back, Issue #16 updater 작업은 각각 기존 운영 gate를 따른다.

## 승인 요청

- Stage 4.3 source·검증 보고를 commit하고 PR #47을 갱신하는 단계로 진행한다.
