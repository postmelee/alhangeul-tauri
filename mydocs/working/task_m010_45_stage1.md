# Task #45 Stage 1 완료 보고 — release data·build·exact-SHA 배포 계약

GitHub Issue: [#45](https://github.com/postmelee/alhangeul-tauri/issues/45)
구현계획서: [`task_m010_45_impl.md`](../plans/task_m010_45_impl.md)
Stage: 1

## 단계 목적

GitHub Pages의 화면 재구성에 앞서 release data를 단일 진실 원천으로 만들고, 존재하지 않는
MSI·NSIS·AppImage와 updater manifest가 공개되지 않는 fail-closed 정적 build 계약을 확정했다.
수동 Pages workflow는 입력 commit, workflow source와 checkout 결과가 같은 40자리 SHA일 때만
검증된 `_site` artifact를 배포하도록 제한했다. 이번 Stage에서는 Pages workflow를 실행하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `site/release.json` (16줄) | `unreleased`, 세 installer null URL, canonical updater endpoint와 manifest 비게시 상태 추가 |
| `scripts/pages/release-data.mjs` (135줄) | release schema와 exact tag·repository·version·target별 확장자 검증 분리 |
| `scripts/pages/site-files.mjs` (78줄) | 정적 파일 allowlist, symlink 거부, 승인 root asset inventory 추가 |
| `scripts/build-pages.mjs` (142줄) | bounded source/output과 승인 파일만 복사하는 dependency-free deterministic builder 추가 |
| `scripts/check-pages.mjs` (194줄) | source/output schema, link, asset, image metadata와 updater manifest 부재 검사 추가 |
| `tests/pages.test.mjs` (244줄) | unpublished/published fixture, invalid URL, 재현 build, traversal·symlink negative test 추가 |
| `tests/actions-workflows.test.mjs` (491줄) | Pages input·권한·순서·immutable Action·비게시 workflow 계약 추가 |
| `.github/workflows/pages.yml` (94줄) | exact `deploy_ref`/workflow SHA gate, Node 24 build/check/test 뒤 Pages 배포 순서로 교체 |
| `package.json` (47줄) | `build:pages`, `check:pages`와 automation test inventory 연결 |
| `.gitignore` (47줄) | 생성 산출물 `/_site/` 제외 |
| `mydocs/orders/20260827.md` | Stage 1 완료와 Stage 2 승인 대기로 진행 상태 갱신 |

외부 package dependency와 `pnpm-lock.yaml` 변경은 없다. 공식 GitHub Action tag ref를 조회해
checkout v7.0.1, setup-node v7.0.0, configure-pages v6.0.0, upload-pages-artifact v5.0.0,
deploy-pages v5.0.0의 각 commit SHA를 workflow에 고정했다.

## 본문 변경 정도 / 본문 무손실 여부

제품 실행 코드와 기존 `site/index.html`, `site/styles.css` 본문은 변경하지 않았다. Stage 1은
release data와 build/deploy 기반만 추가했으므로 현재 Pages 화면도 달라지지 않는다. 따라서 이번
단계에는 로컬 시각 검토 서버를 실행하지 않았다. Stage 2에서 디자인 소스를 변경할 때는 로컬
서버를 계속 실행해 작업지시자가 desktop/mobile 화면을 직접 확인할 수 있게 한다.

## 검증 결과

실행 명령:

```bash
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs tests/actions-workflows.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — Pages build: source 3개와 승인 root asset 4개를 `_site`에 생성
- OK — Pages check: source 3개, output 7개; 모두 `unreleased`
- OK — focused test 31개 통과, 실패·skip 없음
- OK — automation test 243개 통과, 실패·skip 없음
- OK — product boundary 252개 파일 검사 통과
- OK — direct MSI·NSIS·AppImage URL과 `_site/updater/stable.json` 부재 확인
- OK — 변경 파일 whitespace 오류 없음

## 잔여 위험

- 현재 release data는 의도적으로 `unreleased`다. 실제 version, artifact URL과 updater manifest
  게시 전환은 installer·signature 증적을 입력으로 받는 후속 release/updater task에서 수행해야 한다.
- Pages workflow는 정적 계약만 검증했으며 Stage 1에서는 dispatch하지 않았다. 실제 배포 검증은
  구현계획대로 Stage 4의 승인된 exact SHA 한 번으로 제한한다.
- 현재 checker의 asset inventory는 기존 로고·폰트 네 파일만 허용한다. Stage 2의 실제 제품 화면과
  OG image가 승인되면 provenance와 함께 allowlist/test를 확장해야 한다.

## 다음 단계 영향

- Stage 2 home은 `site/release.json`을 읽되 `unreleased`에서는 installer anchor나 version badge를
  만들지 않아야 한다.
- Stage 2의 디자인 변경부터 local static server를 실행하고 1280px/390px 화면을 작업지시자가
  직접 확인할 수 있게 한다.
- 실제 Windows/Linux screenshot의 exact SHA, 실행 환경, 원본 hash와 crop 여부를 확보하지 못하면
  mockup으로 대체하지 않고 Stage 2를 중단한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 Windows/Linux 제품 Pages 홈 재구성으로 진행한다.
