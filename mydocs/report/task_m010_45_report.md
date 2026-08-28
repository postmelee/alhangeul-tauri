# Task #45 최종 보고 — Windows/Linux 릴리스·업데이트 Pages 재구성

GitHub Issue: [#45](https://github.com/postmelee/alhangeul-tauri/issues/45)
마일스톤: M010

## 작업 요약

- 대상 이슈: #45
- 마일스톤: M010
- 단계 수: 4개 Stage, 작업지시자 시각 피드백 보정 19회, PR 리뷰 보정 Stage 4.3,
  post-merge 배포 보정 Stage 4.4
- 작업 목적: Windows/Linux Alhangeul Pages를 공개 전 `unreleased` 상태로 재구성하고,
  GitHub Release·Pages·Issue #16 updater 사이의 fail-closed 게시 계약을 확정한다.

홈은 스크롤 없는 단일 화면에서 Windows/Linux 선택과 동일한 다운로드 행을 제공한다. 업데이트와
문의/제보는 별도 페이지로 분리하고 알한글 macOS Pages의 정보 계층·system font·header/footer
리듬을 참고하되 Windows/Linux 실제 기능과 검증된 네이티브 화면만 사용했다. release metadata가
검증되기 전에는 installer 직접 URL과 updater manifest를 만들지 않는다.

작업 브랜치의 Pages dispatch는 source 검증 이후 저장소 설정과 환경 보호 규칙에서 차단됐다.
`publish/task45`를 배포 허용 목록에 추가하지 않았으며, task branch는 PR 게시 용도로만 사용한다.
공개 Pages 배포와 read-back은 PR 병합 뒤 보호 브랜치 `devel`의 exact merge SHA로 수행한다.

PR #47 merge commit `d814e1c6db12440aeef24a604338139ca0ef677f`을 exact input으로 실행한
[Pages run 33160869974](https://github.com/postmelee/alhangeul-tauri/actions/runs/33160869974)은
checkout·build·source/output check·focused test를 모두 통과했지만 `Configure Pages`에서 실패했다.
Stage 4.4는 고정된 `actions/configure-pages` v6이 지원하지 않는 generator 입력과 이미 활성화된
Pages에 불필요한 enablement 입력을 제거하고, 두 입력의 부재를 source test로 고정했다. 보정 PR
병합 뒤 새 exact `devel` SHA에서만 배포를 다시 시도한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `site/index.html`, `site/styles.css`, `site/script.js` | 단일 화면 홈, 플랫폼 전환, 동일 다운로드 행, 실제 Linux 앱 visual, 공통 responsive UI | Pages 홈·공통 디자인·progressive enhancement |
| `site/updates/`, `site/feedback/` | 업데이트/설치 안내, release note, 플랫폼 download picker와 문의 경로 | 사용자 업데이트·지원 문서 |
| `site/release.json` | `unreleased` metadata와 세 installer target, updater 예약 endpoint | 공개 전 download/updater fail-closed 계약 |
| `site/assets/` | 검증된 Windows/Linux 화면 4개와 1,920×1,080 OG 이미지 | 제품 시각·공유 metadata |
| `scripts/build-pages.mjs`, `scripts/check-pages.mjs`, `scripts/pages/` | 참조 asset만 복사하는 deterministic build와 unpublished/published schema·link·inventory 검사 | Pages 생성·게시 전 gate |
| `tests/pages*.test.mjs`, `tests/actions-workflows.test.mjs` | release URL, manifest 비게시, UI·접근성·asset hash와 workflow 회귀 | 플랫폼 중립 자동 검증 |
| `.github/workflows/pages.yml` | 40자리 `deploy_ref`, exact checkout, immutable action, 기본 configure 입력과 build/check/test/deploy 순서 | 보호 브랜치 기반 Pages 배포 |
| `docs/operations/DESKTOP_RELEASE.md` | Release → release data → exact `devel` Pages → signed updater manifest 순서 | 릴리스 관리자 운영 경계 |
| `mydocs/plans/`, `mydocs/working/`, `mydocs/orders/` | 승인 계획, 4개 Stage 보고와 post-merge 보정 이력 | Hyper-Waterfall 추적 자료 |

desktop product source, `third_party/rhwp`, package version과 lockfile은 변경하지 않았다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 홈·업데이트·문의/제보 | `site/` | `site/`, `site/updates/`, `site/feedback/` | OK | GitHub Pages가 직접 게시하는 공식 사용자 표면 |
| Pages·manifest 게시 경계 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | 기존 desktop release 운영 진실 원천에 최소 범위로 추가 |
| 계획·단계·최종 보고 | `mydocs/` 역할별 폴더 | `plans/`, `working/`, `report/`, `orders/` | OK | 사용자 문서와 승인·검증 기록 분리 |

새 공식 문서 root를 만들지 않았고 Hyper-Waterfall 자체 규칙인
`mydocs/manual/release_update_protocol.md`는 수정하지 않았다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---:|---:|
| 사용자 Pages | 홈 1개 | 홈·업데이트·문의/제보 3개 |
| deterministic Pages inventory | source 3개·root asset 4개·output 7개 | source 11개·root asset 2개·output 13개 |
| 제품/공유 이미지 | 0개 | provenance가 기록된 PNG 5개 |
| release data | 없음 | `unreleased` JSON 1개, installer target 3개, manifest 비게시 |
| Pages focused 자동 검증 | 없음 | clean checkout·configure 기본 입력 포함 design/build/release/workflow 46개 통과 |
| 전체 automation | 기존 Pages 계약 없음 | 최신 `devel` Task #14 포함 292개 통과, 실패·skip 0 |
| task diff(최종 보고서 보정 포함) | 해당 없음 | 32파일, +3,328/-321줄 |
| Stage 4.4 재개 diff(최종 보고 전) | 해당 없음 | 6파일, +240/-4줄; workflow/test 동작 변경은 +5/-3줄 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| frozen dependency | OK — pnpm workspace 3개, lockfile 변경 없음 |
| 제품 version·release metadata | OK — `0.1.0`, HWP/HWPX metadata와 updater 비활성 계약 통과 |
| rhwp pin | OK — `v0.8.4`, commit `496333b27d21ddb9114ba9ae340bcb895870c9a7`, artifact 6개 |
| Pages build·output | OK — source 11개·root asset 2개·output 13개·762,865 bytes, broken link·asset drift 없음 |
| 공개 전 negative gate | OK — MSI·NSIS·AppImage direct URL과 `updater/stable.json` 없음 |
| published 전환 gate | OK — exact Release URL fixture가 source→build→output checker를 통과하고 `manifestPublished=true` 클라이언트 hydration도 통과 |
| automation | OK — 292개 통과, 실패·skip 0 |
| upstream | OK — 35개 통과, 실패·skip 0 |
| Studio | OK — Vitest 23파일·105개와 TypeScript/Vite production build 통과 |
| product boundary | OK — 추적 파일 격리 snapshot 280개 통과 |
| desktop/mobile UI | OK — 1,280×720과 390×844에서 플랫폼 전환, 동일 행, 버튼 전용 클릭·focus와 overflow 부재 확인 |
| exact-SHA workflow 계약 | OK — exact input/checkout, immutable action, 기본 configure 입력, 고정 concurrency group과 non-cancelling Pages deploy test 통과 |
| 작업 브랜치 원격 분류 | OK — run 33156333776의 source gate 성공과 Pages 미활성·환경 보호 차단을 분리 기록 |
| 최초 post-merge Pages run | MISS→보정 — run 33160869974의 configure 실패를 unsupported generator·불필요 enablement로 분류하고 Stage 4.4 source test로 차단; 새 SHA 원격 검증 대기 |
| release/native/updater 비실행 | OK — tag·Release·artifact·signature·manifest를 만들거나 게시하지 않음 |

직접 `pnpm run check:product-boundary`는 사용자 소유 `.claude/worktrees/pr-review-dc9f5b`와
`.claude/worktrees/review-pr-47-febcbc`의 과거 checkout을 repository 하위에서 함께 스캔해 실패했다.
두 worktree를 수정·삭제하지 않고, 현재 commit의 추적 파일만 담은 격리 snapshot에서 같은 script를
실행해 Task #45 source의 제품 경계를 확인했다.

### 단계별 검증 결과

- Stage 1: [`task_m010_45_stage1.md`](../working/task_m010_45_stage1.md) — release schema,
  deterministic build/check와 exact-SHA workflow 계약
- Stage 2: [`task_m010_45_stage2.md`](../working/task_m010_45_stage2.md) — Windows/Linux 홈,
  실제 제품 화면 provenance와 desktop/mobile 시각 체계
- Stage 3: [`task_m010_45_stage3.md`](../working/task_m010_45_stage3.md) — 단일 화면 홈,
  업데이트·문의 페이지, 다운로드/접근성 피드백 보정
- Stage 4: [`task_m010_45_stage4.md`](../working/task_m010_45_stage4.md) — 릴리스 게시 순서,
  전체 통합 gate와 보호 브랜치 post-merge 배포 경계
- Stage 4.3: [`task_m010_45_stage4.3.md`](../working/task_m010_45_stage4.3.md) — 최신 `devel`
  통합, clean checkout·published 전환·접근성·배포 직렬화 PR 리뷰 보정
- Stage 4.4: [`task_m010_45_stage4.4.md`](../working/task_m010_45_stage4.4.md) — 실패한 최초
  post-merge run 원인 재현, Configure Pages 기본 입력 보정과 회귀 계약

## 잔여 위험과 후속 작업

### 잔여 위험

- canonical Pages는 아직 Task #45 source를 성공적으로 게시하지 않았다. 최초 post-merge run은
  Configure Pages에서 실패했으며, Stage 4.4 보정 PR의 CI·merge·새 exact-SHA deployment가 남았다.
- Pages는 관리자 인증으로 `build_type=workflow`가 활성화됐고 `github-pages` 환경은 `devel`만
  허용한다. 이 보호 규칙을 task/publish branch로 확장하지 않는다.
- 실제 installer URL과 updater manifest는 아직 없다. `release.json`은 `unreleased`, download
  null, `manifestPublished=false` 상태를 유지한다.
- Stage 4.4 보정의 GitHub CI 결과는 새 `publish/task45` push와 PR 생성 뒤 확인해야 한다.
- native Rust/Tauri build와 installer GUI는 제품 source가 바뀌지 않아 이번 task에서 실행하지 않았다.

### 후속 작업 후보

- 보정 PR 병합 뒤 새 exact `devel` merge SHA를 workflow ref와 `deploy_ref`에 동일하게 사용해
  Pages를 한 번만 배포하고 root·updates·feedback·asset·link·release JSON을 public read-back한다.
- 별도 release 승인에서 `docs/operations/DESKTOP_RELEASE.md` 순서대로 immutable GitHub Release와
  published release data를 게시한다.
- Issue #16에서 signature·public key·세 installer를 독립 검증한 뒤에만
  `/updater/stable.json`을 원자 게시하고 MSI·NSIS·AppImage updater 수용을 진행한다.

## 작업지시자 승인 요청

- Stage 4.4 보정 PR의 source·검증 결과를 리뷰하고 `devel` merge 여부를 승인한다.
- merge 뒤 새 exact-SHA Pages 배포·public read-back은 별도 운영 gate로 진행한다.
