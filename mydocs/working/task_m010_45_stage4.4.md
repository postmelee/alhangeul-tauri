# Task #45 Stage 4.4 완료 보고 — Configure Pages 입력 계약 보정

GitHub Issue: [#45](https://github.com/postmelee/alhangeul-tauri/issues/45)
구현계획서: [`task_m010_45_impl.md`](../plans/task_m010_45_impl.md)
실패 run: [Pages run 33160869974](https://github.com/postmelee/alhangeul-tauri/actions/runs/33160869974)
Stage: 4.4

## 단계 목적

PR #47의 exact `devel` merge SHA를 사용한 Pages run은 checkout·build·source/output check와
focused test를 모두 통과했지만 `Configure Pages`에서 실패했다. 고정한
`actions/configure-pages` v6이 지원하지 않는 `static_site_generator: other`와 이미 활성화된
Pages에 불필요한 `enablement: true`를 제거한다. Action pin·최소 권한·환경 보호·exact-SHA
배포 순서는 유지하고 같은 입력이 다시 추가되지 않도록 workflow source 계약을 보강한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/pages.yml` | `Configure Pages`의 전체 `with` 블록 3줄을 제거하고 immutable v6 pin과 upload/deploy 순서를 보존 |
| `tests/actions-workflows.test.mjs` | 이미 활성화된 정적 site에서 `enablement`와 `static_site_generator` 입력 부재를 고정하는 회귀 test 1개·5줄 추가 |
| `mydocs/working/task_m010_45_stage4.4.md` | 실패 원인, 최소 보정 diff, 검증과 post-merge 잔여 gate 기록 |

workflow는 91줄, workflow 계약 test는 606줄이다. 기존 300줄 상한을 이미 넘은 test inventory에
독립 test 5줄만 추가했으며 helper·fixture·제품 코드와 package dependency는 늘리지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

Pages HTML·CSS·JavaScript·release data와 사용자 문구는 변경하지 않았다. workflow의 trigger,
40자리 `deploy_ref`, checkout SHA 검증, permissions, concurrency, environment, Action pin과
configure→upload→deploy 순서도 그대로다. 지원하지 않는 generator 값과 별도 관리 token을 요구하는
enablement 입력만 제거했으므로 이미 활성화된 repository Pages 설정을 기본 입력으로 조회한다.

## 검증 결과

실행 명령:

```bash
node --test tests/actions-workflows.test.mjs # 보정 전 실패 재현
node --test tests/pages.test.mjs tests/actions-workflows.test.mjs
pnpm run build:pages
pnpm run check:pages
pnpm run test:automation
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
node scripts/check-product-boundary.mjs --root <tracked-file-snapshot>
git diff --check
git status --short
```

결과:

- OK — test-first 회귀 test가 기존 `enablement: true`를 찾아 18개 중 1개 실패해 원인을 재현
- OK — 보정 뒤 focused Pages/workflow test 46개 통과, 실패·skip 없음
- OK — Pages source 11개·root asset 2개 build, source 11개·output 13개 check 통과
- OK — 전체 automation 292개 통과, 실패·skip 없음
- OK — product version `0.1.0`, release metadata와 updater 비활성 계약 통과
- OK — `rhwp v0.8.4`, commit `496333b27d21ddb9114ba9ae340bcb895870c9a7`, artifact 6개 일치
- OK — 현재 추적 파일 격리 snapshot의 product boundary 280개 통과
- OK — 변경 파일 whitespace 오류 없음, source/test 외 계획 밖 변경 없음

`check:product-boundary`는 저장소 아래 사용자 소유 과거 worktree를 수정·삭제하거나 검사 입력에
섞지 않도록 현재 추적 파일만 복사한 임시 snapshot에서 동일 script를 실행했다.

## 잔여 위험

- 이 Stage는 source 계약만 고쳤으며 remote Pages configure·upload·deploy 성공은 아직 검증하지 않았다.
- 보정은 새 PR로 `devel`에 병합되어야 하며, 병합 전 task/publish branch를 Pages source 허용 목록에
  추가하거나 수동 deployment API로 우회하지 않는다.
- `site/release.json`은 계속 `unreleased`, download null, `manifestPublished=false`다. installer,
  release tag, signature와 `updater/stable.json`은 이번 Stage에서 게시하지 않았다.

## 다음 단계 영향

- Stage 승인 뒤 기존 최종 보고서와 오늘할일을 Stage 4.4 증적으로 보정하고 `task-final-report` 절차로
  `devel` 대상 보정 PR을 준비한다.
- 보정 PR merge는 별도 승인을 받고, 새 exact `devel` merge SHA로 Pages workflow를 한 번만 실행한다.
- 성공 run의 deployment URL에서 root·updates·feedback·asset·release JSON·manifest 부재와
  1280px/390px 화면을 read-back해야 Task #45 운영 검증이 끝난다.

## 승인 요청

- Stage 4.4의 최소 workflow/test 보정과 검증 결과를 승인하면 최종 보고서 보정과 PR 단계로 진행한다.
