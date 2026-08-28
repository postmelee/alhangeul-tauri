# Task #45 Stage 4 완료 보고 — 운영 경계와 보호 브랜치 Pages

GitHub Issue: [#45](https://github.com/postmelee/alhangeul-tauri/issues/45)
구현계획서: [`task_m010_45_impl.md`](../plans/task_m010_45_impl.md)
Stage: 4

## 단계 목적

GitHub Release artifact, Pages 다운로드와 updater manifest의 게시 순서를 공식 운영 문서에
고정한다. 전체 platform-neutral gate가 통과한 source/report commit으로 PR을 준비하되,
`github-pages` 환경은 보호 브랜치 `devel`에서만 배포하도록 유지한다. release, native artifact와
updater workflow는 실행하지 않는다.

원래 계획에 따라 작업 브랜치의 exact SHA를 한 번 dispatch했으나 Pages 미활성화와 환경 보호
규칙을 차례로 확인했다. source/build/test 실패가 아님을 분류한 뒤 작업지시자와 장기 경계를
재검토했고, 작업 브랜치를 허용하지 않기로 결정했다. public 배포와 read-back은 PR 병합 뒤
`devel`의 exact merge SHA로 수행하는 별도 운영 gate다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/operations/DESKTOP_RELEASE.md` | artifact 검증 → Release → release data → Pages → signed updater manifest 순서와 #45 미게시 경계 |
| `mydocs/working/task_m010_45_stage4.md` | local gate, 원격 시도 분류와 post-merge 판정 기준 |
| `mydocs/orders/20260828.md` | Stage 4 통합 gate와 PR 준비 상태 |

`DESKTOP_RELEASE.md`는 기존 수용 이력 때문에 이미 권장 300줄을 넘는 공식 운영 문서다. 구현계획서가
이 위치를 명시적으로 선택했으므로 새 문서로 분산하지 않고 공개 배포 전 절만 필요한 범위에서
교체했다. 제품 source, site, workflow, package와 lockfile은 Stage 4에서 변경하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

기존의 공개 배포 전 확인 항목 네 개는 모두 유지하면서 순서를 여섯 단계로 구체화했다. Actions
artifact는 공개물이 아니고, immutable Release asset 검증 뒤에만 `site/release.json`을 published로
전환하며, Pages read-back 후 별도 Issue #16이 signature와 manifest를 검증한다는 경계를 추가했다.

Task #45가 PR에 포함하는 것은 `unreleased` Pages source뿐이다. version·tag·download는 null,
`manifestPublished=false`이고 `updater/stable.json`은 존재하지 않는다. 설치 파일·signature·updater
성공을 주장하지 않는 기존 의미를 보존했다. 병합 뒤 공개 게시도 같은 미게시 계약을 검증한다.

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

## 원격 시도와 차단 분류

- source/report SHA: `8fdeb70d0385d059286466363d2833f2632ec00f`
- [Pages run 33156333776](https://github.com/postmelee/alhangeul-tauri/actions/runs/33156333776)은
  `workflow_dispatch`, `publish/task45`, 위 exact SHA로 시작했다.
- attempt 1은 exact ref·checkout·build·Pages check·test까지 success였고 `Configure Pages`에서
  site가 아직 없으며 workflow token이 이를 만들 권한이 없어 실패했다.
- 저장소 관리자 인증으로 Pages를 `build_type=workflow`로 활성화했다. 이때 자동 생성된
  `github-pages` 환경은 `devel`만 허용했다.
- attempt 2는 runner를 시작하기 전에 `publish/task45`가 환경 보호 규칙에 허용되지 않아
  차단됐다. source, build, artifact 또는 deploy action의 실패가 아니다.
- `publish/task45`를 허용 목록에 추가하지 않았고 더 재시도하지 않았다. 환경 보호 규칙은
  `devel` 전용으로 유지한다.

## post-merge 원격 판정 기준

- PR 병합 뒤 확정된 `devel`의 40자리 merge SHA를 workflow ref와 `deploy_ref`에 동일하게 쓴다.
- build/check/test/upload/deploy job과 `github-pages` deployment가 모두 success여야 한다.
- deployment URL은 `https://postmelee.github.io/alhangeul-tauri/`와 일치해야 한다.
- public root·updates·feedback와 image/font/internal/external link가 응답해야 한다.
- public `release.json`은 `unreleased`, download null, `manifestPublished=false`여야 한다.
- direct MSI·NSIS·AppImage Release URL과 `/updater/stable.json`은 공개되면 안 된다.
- desktop 1,280px와 mobile 390px에서 overflow, clipping과 focus loss가 없어야 한다.

## 잔여 위험

- public Pages 배포와 외부 read-back은 아직 수행하지 않았다. PR 병합 뒤 exact `devel` SHA를
  알기 전에는 완료할 수 없는 post-merge 운영 gate다.
- 병합 전 canonical Pages는 이번 task source와 다를 수 있으므로 새 UI가 이미 공개됐다고
  안내하면 안 된다.
- 실제 installer와 updater 수용은 Issue #16 및 별도 release 승인 전까지 범위 밖이다.

## 다음 단계 영향

- task-final-report로 최종 보고서, publish branch와 `devel` 대상 PR을 준비한다.
- PR 병합 뒤 `docs/operations/DESKTOP_RELEASE.md`의 순서대로 exact `devel` SHA Pages 배포와
  public read-back을 수행한다. release data published 전환과 updater manifest는 별도 승인이다.

## 승인 요청

- Stage 4 보정과 통합 gate가 통과하면 최종 보고·PR 단계로 진행한다.
