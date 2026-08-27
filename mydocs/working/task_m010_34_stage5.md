# Task #34 Stage 5 완료 보고서 — task PR과 post-merge native x64 canary handoff

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 5

## 단계 목적

Stage 1~4 산출물을 최신 `origin/devel` 위의 clean 작업 트리에서 통합 재검증하고, task PR 게시와 merge 후 live Linux x64 close gate의 경계를 확정했다. 새 workflow는 default branch에 merge되기 전에는 dispatch할 수 없으므로 PR은 `Refs #34`로 이슈를 열어 두고, merge 후 exact native build·GUI run·evidence read-back 성공만 이슈 close 조건으로 사용한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_34_stage5.md` | PR 전 통합 검증, 변경 경로·permission·Action pin 점검과 post-merge close gate를 기록한다. |
| `mydocs/report/task_m010_34_report.md` | 5개 Stage의 구현·검증·문서 위치·정량 결과와 잔여 native 위험을 장기 기록한다. |
| `mydocs/orders/20260815.md` | Issue #34 구현·PR 준비 완료 시각과 post-merge live close gate 대기를 반영한다. |

## 본문 변경 정도 / 본문 무손실 여부

Stage 5에서는 제품 코드, workflow, test와 공식 운영 문서를 수정하지 않았다. Stage 1~4의 커밋된 산출물을 읽기 전용으로 재검증하고 Hyper-Waterfall 보고·보드만 추가했다. `pnpm install --frozen-lockfile`은 non-TTY 확인과 sandbox DNS 실패 뒤 `CI=true`와 허용된 registry 접근으로 동일 lockfile 479개 package를 복구했으며 tracked 파일을 바꾸지 않았다.

## 검증 결과

구현계획서의 Stage 5 PR 전 명령을 실행했다.

```bash
pnpm install --frozen-lockfile
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

- OK — frozen lockfile, workspace 3개, package 479개 재현.
- OK — 제품 경계 224개 파일, 제품 version `0.1.0`, release metadata와 rhwp `v0.8.2` exact pin 통과.
- OK — automation 194/194, upstream 35/35, Studio 21개 파일 97/97 통과.
- OK — Studio production build 성공. 기존 CanvasKit externalization·chunk-size warning 외 오류 없음.
- OK — `git diff --check` 경고 없음, 보고서 작성 전 작업 트리 clean.
- OK — local `devel`과 `origin/devel`이 `070eefa0828a907849ce4a059e57bca026c91221`로 같고 해당 commit이 task HEAD의 ancestor임을 확인.
- OK — PR 전 변경 경로 39개가 수행계획의 workflow, handoff, GUI harness/adapter/test, 운영·작업 문서와 package metadata 범위에 한정됨.

독립 정적 점검:

```bash
actionlint .github/workflows/alhangeul-linux-gui.yml
rg -n '^\s*uses:' .github/workflows/alhangeul-linux-gui.yml
```

- OK — YAML/expression/shell 정적 검사 통과.
- OK — 신규 workflow permission은 `actions: read`, `contents: read`뿐이고 checkout/setup-node/download/upload Action 4개가 모두 40자리 commit SHA와 version 주석으로 고정됨.

## 잔여 위험

- 실제 `Alhangeul Linux GUI Acceptance` dispatch, production DEB 설치, GTK/CUPS-PDF/WebKitWebDriver 실행과 evidence artifact는 아직 없다. GitHub workflow 제약상 PR merge 뒤에만 검증할 수 있다.
- merge 뒤 first canary가 AT-SPI localized selector, CUPS-PDF filename, Xvfb/window manager 또는 external driver 호환성에서 실패할 수 있다. 자동 retry나 embedded plugin fallback 없이 evidence를 근거로 correction PR을 만든다.
- 한글 glyph/tofu, 중앙 정렬, 6쪽 A4의 빈 쪽·crop은 자동 summary만으로 close하지 않고 screenshot과 PDF render를 사람이 대조해야 한다.

## 다음 단계 영향

- `task-final-report`로 `publish/task34`를 push하고 `devel` 대상 Open PR을 `Refs #34`로 게시한다.
- merge 뒤 default branch의 workflow ID를 확인하고 같은 exact SHA에서 성공한 `alhangeul-desktop.yml` run ID로 Linux GUI workflow를 dispatch한다.
- run metadata·artifact ID/digest·DEB hash·evidence artifact hash와 screenshot/PDF read-back이 모두 성공할 때만 Issue #34를 close한다. 그 뒤 Issue #35 task-start 승인을 요청한다.

## 승인 요청

- Stage 5 산출물과 PR 전 검증 결과를 승인하면 task PR을 리뷰·merge하고 post-merge native x64 close gate로 진행한다.
