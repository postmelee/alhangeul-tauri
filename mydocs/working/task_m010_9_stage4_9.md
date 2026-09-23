# Task #9 Stage 4.9 보고 — Pages 공개 상태 검증과 제품 경계 오탐 보정

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
구현계획서: [`task_m010_9_impl.md`](../plans/task_m010_9_impl.md)
Stage: 4.9

## 단계 목적

실제 `site/release.json`의 현재 상태와 무관하게 Pages의 미공개·공개·manifest 공개 계약을
각각 검증하도록 fixture를 고정했다. 제품 경계 검사는 승인된 릴리즈 문서의 두 외부 계보
참조와 Git이 실제 등록한 중첩 worktree만 좁게 제외하고, 같은 표현의 일반 사용과 기존
native 소유 경계는 계속 거부하도록 보정했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `tests/fixtures/pages-release-fixtures.mjs` (127행) | 세 release 상태, 구조 검사용 synthetic signature, 임시 Pages tree·무손실 inventory fixture를 분리 |
| `tests/pages.test.mjs` (364행) | 실제 tracked 상태 검사와 세 고정 상태의 source → build → output 검사, 잘못된 상태 음성 검사를 독립화 |
| `scripts/check-product-boundary.mjs` (294행) | 정확한 두 문서 참조 line masking과 상호 Git metadata가 확인된 저장소 내부 중첩 worktree 제외 구현 |
| `tests/product-boundary.test.mjs` (251행) | 승인 참조·등록 worktree positive와 다른 문맥·일반 source·가짜 marker negative 검사 추가 |
| `mydocs/plans/task_m010_9.md`, `mydocs/plans/task_m010_9_impl.md` | 현재 단계를 Stage 4.9 결과 승인 대기로 갱신 |
| `mydocs/orders/20260906.md` | 오늘할일을 Stage 4.9 결과 승인 대기로 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

제품 runtime·UI·release schema·validator·workflow·공식 릴리즈 문서는 변경하지 않았다.
실제 `site/release.json`도 기준 commit `12190e0`과 동일한 `unreleased` 상태다. 공개 상태는
모두 `mkdtemp` 아래 복제본에서만 구성하며 signature는 구조 검사용임을 fixture에 명시했다.

기존 Pages 통합 테스트는 413행에서 364행으로 줄였다. fixture 책임은 127행 모듈로 분리했지만,
나머지는 한 진입점에서 HTML 계약, release hydration, build/check, path traversal, symlink,
asset 충돌 회귀를 함께 실행하는 기존 책임이다. 이를 300행 아래로 만들기 위한 추가 재구성은
Stage 4.9의 공개 상태 독립화와 무관하므로 이번 범위에 넣지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm exec node --test tests/pages.test.mjs tests/updater-release.test.mjs tests/actions-workflows.test.mjs tests/product-boundary.test.mjs
pnpm run build:pages
pnpm run check:pages
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
git diff --exit-code 12190e0 -- site/release.json
git diff --check
```

결과:

- OK — 통합 대상 95개 테스트 전부 통과. 세 고정 Pages 상태는 각각 source 검사, build,
  output 검사와 source inventory 무변경을 확인했다.
- OK — 잘못된 미공개 공개값, 공개 download URL 누락, 불완전·불일치 inventory,
  별도 승인 없는 manifest 공개를 모두 거부했다.
- OK — Pages build는 source 11개와 root asset 2개를 출력했고, checker는 source 11개,
  output 13개의 현재 `unreleased` 상태를 통과했다.
- OK — product-boundary는 실제 등록 중첩 worktree를 제외한 402개 파일을 통과했다.
  별도 테스트에서 가짜 marker, 승인 문서의 다른 줄, 일반 source, 기존 native 경계 위반을 거부했다.
- OK — 제품 version `0.1.0`, release metadata `Alhangeul 0.1.0`, rhwp pin
  `v0.8.4` / `496333b27d21ddb9114ba9ae340bcb895870c9a7`과 6개 artifact가 일치했다.
- OK — `site/release.json`은 `12190e0` 대비 변경 없음. `git diff --check` 통과.
- 미실행 — native/Tauri build, signing, tag, Release, Pages 배포, manifest 활성화. runtime·pin·workflow를
  바꾸지 않았고 이 Stage의 승인 범위가 아니므로 반복하거나 실행하지 않았다.

## 잔여 위험

- 두 외부 계보 참조는 경로와 문장 전체가 정확히 일치할 때만 허용된다. 해당 공식 문구를
  바꿀 때는 checker와 positive/negative 계약을 함께 검토해야 한다.
- synthetic signature는 manifest 구조 검사 전용이며 실제 private key, 서명 성공 또는
  공개 파일의 동일 bytes 검증 근거가 아니다.
- `site/release.json`은 계속 `unreleased`이고 production updater manifest도 없다.
  첫 공개 파일 수용·서명·설치·게시는 후속 게시 Issue와 별도 실행 승인 대상이다.

## 다음 단계 영향

- Stage 5는 Stage 4.8의 owner 결정과 이번 검사 통과를 근거로 준비 Go/No-Go를 판단하고,
  #19 선행 수정 및 후속 게시 작업에 exact SHA·파일·공개 gate를 인계한다.
- Stage 5도 빌드·서명·tag·Release·Pages/manifest 공개를 수행하지 않는다.

## 승인 요청

- Stage 4.9 산출물과 검증 결과를 승인하면 Stage 5로 진행한다.
