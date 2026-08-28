# Task #45 Stage 4 배포 기준 보고 — 운영 경계와 exact-SHA Pages

GitHub Issue: [#45](https://github.com/postmelee/alhangeul-tauri/issues/45)
구현계획서: [`task_m010_45_impl.md`](../plans/task_m010_45_impl.md)
Stage: 4

## 단계 목적

GitHub Release artifact, Pages 다운로드와 updater manifest의 게시 순서를 공식 운영 문서에
고정한다. 전체 platform-neutral gate가 통과한 source/report commit을 exact `deploy_ref`로
Pages workflow에 한 번만 전달하고, 공개 사이트가 계속 `unreleased`·manifest 미게시 상태인지
검증한다. release, native artifact와 updater workflow는 실행하지 않는다.

이 보고서는 배포할 exact SHA를 만들기 위해 Stage 4 source와 같은 commit에 포함한다. 원격 run과
public read-back 결과는 commit을 바꾸지 않고 GitHub Actions run·deployment URL을 진실 원천으로
삼아 최종 보고서에 계승한다. 원격 검증이 실패하면 Stage 4는 완료로 판정하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/operations/DESKTOP_RELEASE.md` | artifact 검증 → Release → release data → Pages → signed updater manifest 순서와 #45 미게시 경계 |
| `mydocs/working/task_m010_45_stage4.md` | local gate, exact-SHA 실행 조건과 원격 판정 기준 |
| `mydocs/orders/20260828.md` | Stage 4 local gate 통과와 exact-SHA 배포 진행 상태 |

`DESKTOP_RELEASE.md`는 기존 수용 이력 때문에 이미 권장 300줄을 넘는 공식 운영 문서다. 구현계획서가
이 위치를 명시적으로 선택했으므로 새 문서로 분산하지 않고 공개 배포 전 절만 필요한 범위에서
교체했다. 제품 source, site, workflow, package와 lockfile은 Stage 4에서 변경하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

기존의 공개 배포 전 확인 항목 네 개는 모두 유지하면서 순서를 여섯 단계로 구체화했다. Actions
artifact는 공개물이 아니고, immutable Release asset 검증 뒤에만 `site/release.json`을 published로
전환하며, Pages read-back 후 별도 Issue #16이 signature와 manifest를 검증한다는 경계를 추가했다.

Task #45가 게시하는 것은 `unreleased` Pages뿐이다. version·tag·download는 null,
`manifestPublished=false`이고 `updater/stable.json`은 존재하지 않는다. 설치 파일·signature·updater
성공을 주장하지 않는 기존 의미를 보존했다.

## 검증 결과

실행 명령:

```bash
CI=true pnpm install --frozen-lockfile
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run build:pages
pnpm run check:pages
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
node scripts/check-product-boundary.mjs # .claude worktree 제외 격리 snapshot
git diff --check
git status --short
```

결과:

- OK — lockfile 변경 없이 pnpm workspace 3개가 이미 최신 상태
- OK — product version `0.1.0`, release metadata와 Pages source/output 계약 통과
- OK — Pages build source 11개·root asset 4개, output 15개; direct installer와 manifest 없음
- OK — automation 254개 통과, 실패·skip 없음
- OK — upstream 35개 통과, 실패·skip 없음
- OK — Studio Vitest 23파일·105개 통과
- OK — Studio TypeScript와 Vite production build 성공
- OK — 무관한 `.claude/worktrees/pr-review-dc9f5b`를 제외한 격리 snapshot 제품 경계 263파일 통과
- OK — 변경 파일 whitespace 오류 없음

## exact-SHA 원격 판정 기준

- 이 보고서와 운영 문서를 묶은 Stage 4 commit의 40자리 SHA를 `deploy_ref`로 사용한다.
- `publish/task45`는 해당 commit으로 non-force push하고 `pages.yml`은 정확히 한 번 dispatch한다.
- run event는 `workflow_dispatch`, branch는 `publish/task45`, workflow SHA·input SHA·checkout SHA는
  모두 deploy SHA와 같아야 한다.
- build/check/test/upload/deploy job과 `github-pages` deployment가 모두 success여야 한다.
- deployment URL은 `https://postmelee.github.io/alhangeul-tauri/`와 일치해야 한다.
- public root·updates·feedback와 image/font/internal/external link가 응답해야 한다.
- public `release.json`은 `unreleased`, download null, `manifestPublished=false`여야 한다.
- direct MSI·NSIS·AppImage Release URL과 `/updater/stable.json`은 공개되면 안 된다.
- desktop 1,280px와 mobile 390px에서 overflow, clipping과 focus loss가 없어야 한다.

## 잔여 위험

- 기본 브랜치의 기존 Pages workflow는 exact-SHA 계약 이전 버전이다. dispatch ref가
  `publish/task45`를 가리키고 workflow SHA가 deploy SHA와 일치하는지 run에서 반드시 확인한다.
- 첫 remote deployment가 실패하면 같은 source를 즉시 반복하지 않고 원인을 분류한다.
- 실제 installer와 updater 수용은 Issue #16 및 별도 release 승인 전까지 범위 밖이다.

## 다음 단계 영향

- 원격 성공과 public read-back 뒤 task-final-report로 최종 보고서, publish branch와 PR을 준비한다.
- 이후 문서 전용 commit은 deployed SHA를 path audit으로 계승할 수 있지만 site, workflow 또는
  `release.json`이 바뀌면 새 배포 승인 전에는 PR 준비 완료로 판정하지 않는다.

## 승인 요청

- Stage 4 exact-SHA 원격 검증과 public read-back이 통과하면 최종 보고·PR 단계 승인을 요청한다.
