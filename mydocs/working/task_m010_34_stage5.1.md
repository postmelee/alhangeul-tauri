# Task #34 Stage 5.1 완료 보고서 — Linux GUI acceptance 리뷰 보정

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 5.1

## 단계 목적

PR #36 maintainer 리뷰에서 확인한 실패 evidence 유실, GUI TypeScript 미실행, 현재 저장의 no-op 통과 가능성과 hosted 인쇄 환경의 불명확한 A4·CUPS 경계를 merge 전에 fail-closed로 보정한다. 함께 확인된 작은 진단·임시 산출물 문제도 첫 canary의 실패 원인과 artifact 부피를 줄이는 범위에서 처리하되, 실제 AT-SPI tree가 없는 GTK Print-to-File selector는 추측 변경하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/ci.yml`, `package.json` | `typecheck:gui`를 공식 script와 CI gate에 연결하고 Linux probe 진입점을 제공 |
| `.github/workflows/alhangeul-linux-gui.yml` | CUPS 전용 writable 디렉터리, A4 default, 설정 read-back과 driver version 단일화 |
| `tests/gui/support/scenario-runner.ts`, 두 E2E spec | screenshot 실패에도 원래 error와 evidence manifest를 보존하는 공통 runner, 현재 저장 mtime·완료 상태 검증 |
| `tests/gui/linux/pdf-analysis.*` | 경로별 실측 text floor, PPM 임시 경로 cleanup과 10쪽 이상 zero-padding |
| `tests/gui/support/process.mjs`, Linux native adapter | timer cleanup, UTF-8 안전 로그, AT-SPI 빈 오류 fallback과 drag source 단일 창 보장 |
| `tests/*` focused 계약 | 공통 evidence 실패, current save, workflow/CUPS/A4/version, PDF·process·native UI 보정 회귀 검사 |
| `docs/operations/DESKTOP_RELEASE.md` | text floor 근거와 probe 사용 시점, canary 전제 기록 |
| 계획·최종 보고·오늘할일 | 승인된 리뷰 보정 범위, 검증 결과와 post-merge close gate 상태 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

제품 Rust·Studio runtime, bundled `rhwp`, 문서 데이터와 저장·인쇄 구현은 수정하지 않았다. 변경은 GUI acceptance harness, 수동 workflow, focused test와 운영·작업 문서에 한정된다. 공통 scenario runner 분리 뒤 `linux-native.e2e.ts`는 300행 상한을 지키고 두 E2E spec의 evidence 실패 처리를 하나의 테스트 가능한 구현으로 통합했다.

## 검증 결과

실행 명령:

```bash
actionlint .github/workflows/ci.yml .github/workflows/alhangeul-linux-gui.yml
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
```

결과:

- OK — 양 workflow의 YAML·expression·shell을 `actionlint`로 검증했다.
- OK — 제품 경계 225개 파일, 제품 version `0.1.0`, release metadata와 `rhwp v0.8.2` exact pin을 유지했다.
- OK — GUI TypeScript no-emit 검사와 automation 199/199, upstream 35/35, Studio 97/97을 통과했다.
- OK — Studio production build 성공. 기존 CanvasKit externalization·chunk-size warning 외 오류가 없다.
- OK — focused 공통 GUI 13/13, Linux native UI/PDF 14/14, workflow·probe 계약 34/34를 별도로 통과했다.
- OK — `git diff --check` 경고가 없고 구현 source의 권장 300행 상한을 지킨다.

## 잔여 위험

- 새 `workflow_dispatch` 파일은 아직 default branch에 없으므로 PR head에서 hosted Linux GUI canary를 실행할 수 없다. 이 결과를 native 성공으로 기록하지 않는다.
- GTK Print-to-File의 파일 경로 control이 `EditableText`인지 chooser action인지 actual AT-SPI tree로 측정되지 않았다. merge 후 첫 실패·성공 evidence에 따라 selector를 확정한다.
- 경로별 PDF floor는 Task #15 Stage 4.8의 native Linux 실측치에서 50% 이하로 정했지만, 새 hosted image의 actual counts와 screenshot glyph는 merge 후 read-back이 필요하다.
- AT-SPI Python bridge의 `spawnSync`와 root workspace의 WDIO dependency 분리는 이번 저위험 보정에서 제외했다. first canary 성립과 무관한 구조 변경은 별도 판단한다.

## 다음 단계 영향

- 이 Stage 5.1 commit을 `publish/task34`에 push해 PR #36에 반영한다.
- GitHub 제약상 다음 hosted 단계는 PR merge 뒤 default branch에서 exact-SHA native build → Linux GUI dispatch 순서로 수행한다.
- first canary의 AT-SPI tree와 PDF summary가 현재 selector/floor와 불일치하면 Issue #34를 열어 둔 채 correction PR로 보정하고 같은 exact-SHA gate를 반복한다.
- live run과 evidence read-back 성공 뒤에만 Issue #34를 close하고 Issue #35로 넘어간다.

## 승인 요청

- Stage 5.1 산출물과 검증 결과를 승인하면 PR #36 merge 후 exact-SHA Linux GUI live close gate로 진행한다.
