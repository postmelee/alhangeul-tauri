# Task #20 Stage 4.4 완료보고서 — Linux 인쇄 후 본문 복원과 exact-SHA 수용

GitHub Issue: [#20](https://github.com/postmelee/alhangeul-tauri/issues/20)
구현계획서: [`task_m010_20_impl.md`](../plans/task_m010_20_impl.md)
Stage: 4.4

## 단계 목적

Stage 4.3에서 인쇄 dialog·PDF 조건은 통과했지만 마지막 editor 본문이 흰 화면으로 남았던
문제를 인쇄 전후의 원본 화면으로 구분한다. 동일 production process의 정상 baseline을 먼저
확인하고, host print cleanup 뒤 view-only 복원을 최소 보정한 새 exact SHA에서 Windows/Linux
native와 Linux GUI 전체를 재수용하는 것이 승인된 완료 기준이었다.

최종 수용 source는 `4a2438753eb0a5785b1ac20298955c2cff3d77d6`이다. 격리 worktree의
`local/task20`을 유지했고, 기존 `devel` 또는 다른 작업자의 source를 수정하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/command/direct-print.ts` | 249 LOC. native 완료 후 title·status·style·surface를 회수하고 Linux에서만 기존 `document-view-changed`를 `system-print-return` source로 보낸다. |
| `apps/studio-host/src/command/direct-print.test.ts`, `direct-print.test-support.ts` | 277/62 LOC. 성공·취소·실패 cleanup 이후 redraw, dirty/clean 보존, observer 예외 뒤 print guard 해제와 non-Linux 경계를 검증한다. |
| `tests/gui/linux/editor-restore.mjs` | 103 LOC. 네 checkpoint, 동일 process/window·geometry, 15초 상한과 연속 두 frame, 원본 screenshot·hash·시각·본문 지표를 기록한다. |
| `tests/gui/linux/editor-pixels.mjs` | 105 LOC. 고정 표지의 page 내부 영역에서 본문 pixel 분포와 baseline ink 일치율을 검사한다. toolbar·ruler·caret만으로 통과하지 않는다. |
| `tests/gui/linux/native-ui/editor-frame.mjs`, `screenshot_raster.py` | 48/19 LOC. exact production PID의 active X11 window와 기존 GdkPixbuf의 PNG pixel을 읽기만 한다. |
| `tests/gui/linux/native-print-sequence.mjs`, `native-print.mjs` | 31/262 LOC. 기존 print 순서를 분리하고 첫 인쇄 전·Print to File·Cancel·CUPS-PDF 뒤 필수 body probe를 연결한다. |
| `tests/gui/linux/editor-*.test.mjs`, `native-ui/editor-frame.test.mjs`, `native-print.test.mjs`, `tests/gui-contracts.test.mjs`, `tests/gui/support/editor-raster-fixture.mjs` | 정상·빈 baseline·빈 postcondition·순서·timeout·window/raster 경계의 회귀 test와 fixture를 추가·정렬한다. |
| `mydocs/plans/task_m010_20_impl.md`, `mydocs/orders/20260831.md`, 본 보고서 | 승인 범위, 실패 진단과 성공 수용을 구분해 기록한다. 신규 공식 제품 문서는 만들지 않는다. |

진단 입력 고정 commit `a39a226d3e3968e4e1942fb9d1a25beaefc81809`와 보정 source `4a24387`은
승인된 exact-SHA 실행을 위해 먼저 고정했다. 이전 Stage 4.1과 동일하게 수용 후 보고서·계획서·
오늘할일을 하나의 완료 기록 commit으로 묶으며, 게시한 source 이력을 재작성하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

`third_party/rhwp`는 수정하지 않았다. v0.8.4와 resolved commit
`496333b27d21ddb9114ba9ae340bcb895870c9a7`을 유지한다. Rust print 완료 신호, document data,
저장·내보내기 구현, upstream renderer, dirty/clean 상태, software compositing 설정은 바꾸지 않았다.
화면 검증 전에 resize·scroll·재열기 같은 회복 조작을 추가하지 않았다.

기존 view event의 CanvasView·ruler·caret 갱신을 재사용한다. event 전 print guard를 해제해
observer 예외가 후속 인쇄를 막지 않으며, 해당 조건은 회귀 test로 고정했다. 실제 화면과 PDF의
검증은 아래 공개 fixture·runner 범위에 한정한다. 임의 문서 전체의 무손실이나 세 PDF 출력 경로의
pixel 동일성을 주장하지 않는다.

## 검증 결과

### 플랫폼 중립 검증

```bash
pnpm exec node --test tests/gui/linux/native-ui/xdotool.test.mjs tests/gui/linux/native-ui/atspi.test.mjs tests/gui/linux/native-ui/virtual-printer.test.mjs tests/gui/linux/native-print.test.mjs tests/linux-gui-workflow.test.mjs tests/gui-contracts.test.mjs
pnpm run typecheck:gui
pnpm run test:automation
pnpm run test:upstream
pnpm run check:product-boundary
pnpm run test:studio
pnpm run build:studio
git diff --check
```

- OK — focused 50/50, automation 310/310, upstream 36/36.
- OK — Studio `Test Files 23 passed (23)`, `Tests 122 passed (122)`.
- OK — GUI typecheck, `Product boundary check passed (298 files scanned)`.
- OK — Studio build `227 modules transformed`. CanvasKit의 `fs`/`path` externalization,
  dynamic import와 chunk-size 메시지는 기존 non-blocking warning이다.
- OK — decoder Python syntax와 runtime 파일 300 LOC·변경 runtime 함수 50 LOC 상한을 확인했다.
- OK — 원격 수용 이후 동일 source에서 위 focused·전체 gate를 다시 실행해 통과했다.

초기 진단 구현 때의 source contract 위치 불일치와 worktree 임시 config 쓰기 EPERM은 계획서에
기록했다. 전자는 분리된 sequence 검증으로 정렬했고, 후자는 승인된 권한에서 다시 실행했다.
완료 판정에는 보정 후 통과한 결과만 사용한다. 현재 호스트에서 native Rust/Tauri 앱은 실행하지 않았다.

### 실패 위치 확인과 보정 효과

[진단 run 33374503395](https://github.com/postmelee/alhangeul-tauri/actions/runs/33374503395)은
acceptance source `a39a226`과 기존 binary source `a5e86de`를 분리한 진단 전용 실행이다.
정상 baseline 두 frame 뒤, 첫 Print to File 이후 15.3초 동안 21개 frame이 빈 본문으로 실패했다.
원본 23개 PNG의 size·SHA-256을 검산했다. baseline의 dark pixel 9,385개·ink row 59개가
인쇄 후 0~26개·0개로 줄었고 window geometry는 유지됐다. 초기 렌더 실패가 아니라 첫 인쇄 후
view 복원 결함으로 범위를 좁혔으며, 실패 이후 Cancel·CUPS 조작은 실행하지 않았다.

새 source `4a24387`의 [GUI run 33380027513](https://github.com/postmelee/alhangeul-tauri/actions/runs/33380027513)은
네 checkpoint를 모두 첫 연속 두 frame으로 통과했다. PID `6719`, window `6291459`,
geometry `(321,117,1280,900)`, page 내부 측정 영역 `(597,369,746,360)`이 동일했다.

| 시점 | 원본 frame 수 | dark pixel / ink row | baseline ink 일치율 |
|---|---:|---|---|
| 인쇄 전 | 2 | 9,385~9,411 / 59 | 기준 frame 확정 |
| Print to File 후 | 2 | 9,411 / 59 | 100% |
| Cancel 후 | 2 | 9,385~9,411 / 59 | 99.72~100% |
| CUPS-PDF 후 | 2 | 9,385~9,411 / 59 | 99.72~100% |

별도 Pillow 분석기로 원본 PNG의 지표와 hash를 재계산했다. 네 시점의 원본 화면과 최종 화면을
직접 확인해 한글 표제·본문·눈금자·문서명·쪽 수 상태의 복원을 확인했다. 26 pixel 차이는 caret
깜박임 범위이며 모든 postcondition의 최종 frame은 baseline과 100% 일치했다.

### Windows/Linux native 및 artifact 정합성

[native run 33375178840](https://github.com/postmelee/alhangeul-tauri/actions/runs/33375178840)은
2026-08-31에 `workflow_dispatch`, attempt 1로 실행해 Windows x64·Linux x64·Linux arm64의
test·Clippy·bundle·artifact gate와 Windows installer smoke를 모두 통과했다.
GUI workflow/acceptance/build SHA와 native SHA는 모두 `4a24387`의 전체 SHA로 일치한다.

| artifact | ID | API archive digest (`sha256:`) |
|---|---:|---|
| Linux x64 | 9752188379 | `22329aa668c9d15198eb67f782e0d1024acb82e35eb5c27598789665e68abd74` |
| Linux arm64 | 9752028232 | `0866f55c2ac503580effc8bf3788c7ecbc8b768b48389c83a909058479e619ee` |
| Windows x64 | 9753088038 | `938ae5837d82c87ba327a7daf35aac8c165942e9485a434a8f201f0fa1f7f923` |
| Windows thumbnail core | 9751977009 | `ee765aa5a1cc9a525d3fa654be20f88070a9d763cb7dde0d21df63ae7c04d26d` |
| Windows installer smoke | 9753342927 | `34d167374480fcc1d47ee0a83a9b86376974d86a1fafb621565d66faef3e901c` |
| Linux GUI | 9753477605 | `3f5052fd51e8d20525e4815ece8f40b5e9bc39fb0110e803dc9329483cc71d4a` |

위 값은 GitHub API가 제공한 archive digest다. 로컬에서는 내려받은 파일의 size·SHA-256을
검산했으며 archive digest 자체를 로컬에서 다시 계산한 것으로 표현하지 않는다. 모든 artifact의
run·head SHA·repository/head repository ID `1305466130`과 non-expired 상태를 확인했다.

- OK — Linux x64 19개, arm64 15개, Windows 4개, 총 inventory 파일 38개 검산.
- OK — GUI가 handoff artifact `9752188379`를 사용했고 설치한 DEB의 SHA-256은
  `4710d20bf22639cd4604bd66d532e6962f153f8d5c961ec05d78587fc305b055`로 inventory와 일치.
- OK — Windows thumbnail core 11개 fixture의 정상·부재·stale·손상·용량 경계가 통과하고 timeout 없음.
- OK — MSI·NSIS 각각 ready window의 stable sample 11개와 두 번의 실행·정상 종료 확인.
- OK — install/uninstall exit 0, thumbnail 등록·제거, 기본 연결 복원, 외부 fixture 보존과 clean 상태 확인.
  MSI rollback probe의 1603은 의도한 실패 주입 결과이며 NSIS 재설치도 통과했다.

### Linux GUI와 PDF 시각 검증

- OK — `biz-plan-hwp`, `form-hwpx`, `linux-native-save`, `linux-native-drag-in`,
  `linux-direct-pdf`, `linux-system-print` 여섯 scenario 모두 success.
- OK — nativePrint/WebDriver phase exit 0, 기록된 여덟 step outcome 모두 success.
- OK — scenario manifest의 42개 참조·40개 고유 파일과 fixture size·SHA-256 검산.
  editor 원본 PNG 8개와 `restore.json`이 main evidence manifest에 결속됐음을 확인했다.
- OK — HWP/HWPX 초기 화면과 save/drag 최종 화면도 직접 확인했다.
- OK — direct PDF, GTK Print to File, CUPS-PDF 각각 6쪽 A4·한글 표제·non-white content 확인.
  세 파일을 Poppler로 독립 재렌더링한 18개 page PNG 모두 직접 확인했고 빈 쪽·본문/표 잘림은 없었다.
  글꼴 굵기와 여백 등 경로별 차이는 유지되며 pixel 동일성 판정은 아니다.
- OK — 페이지별 공백 제외 추출 문자 수는 direct `[45,642,410,638,478,250]`,
  GTK/CUPS `[45,54,408,637,478,250]`이며 원격 분석 결과와 일치했다. 목차의 dot leader 등
  표현 차이가 있으므로 추출 문자 수만으로 시각 품질을 판단하지 않았다.

원본 artifact, API metadata, 독립 분석 도구와 재렌더링 자료는 검토·재개용 로컬 경로
`/private/tmp/alhangeul-task20-stage4-4.lEWHEu`에 보존했다. 저장소에 fixture 본문이나 binary
artifact를 추가하지 않았고 원격 evidence의 기본 보관 기간은 14일이다.

## 잔여 위험

- 이번 본문 gate는 고정 `biz_plan.hwp` 표지와 Ubuntu Xvfb·CUPS-PDF 환경을 대상으로 한다.
  임의 문서·배포판·실제 프린터의 전체 호환성 보증으로 확대하지 않는다.
- 수용 후 제품 source·dependency·workflow를 바꾸면 이 exact-SHA 결과를 새 source에 승계하지 않는다.
- 검토 당시 로컬 `origin/devel`은 `8b865fa55b55aea232d0fb034a518c807ac4c003`으로,
  #17 Linux thumbnail 통합 34개 commit이 현재 branch 이후에 있다. 읽기 전용 merge preview에서
  `mydocs/orders/20260830.md` add/add 충돌이 확인됐다. 실제 merge·해소는 수행하지 않았다.
- release·서명·패키지 게시·updater 활성화·PR merge·Issue close는 수행하지 않았다.

## 다음 단계 영향

- Stage 4.4의 승인된 correction과 해당 exact-SHA 수용이 완료됐다. 이전 실패 run은 진단 근거로
  보존하고 새 성공으로 덮어쓰지 않는다.
- PR 게시 전 #17을 포함한 `devel`과의 통합·충돌 해소·새 exact-SHA 수용 범위를 승인받아야 한다.
  승인 후 최신 ref를 다시 확인하고 기존 #17/#20 경계를 모두 보존하며 history rewrite는 하지 않는다.
- 통합까지 수용한 뒤 최종 보고서와 PR 게시 절차로 돌아간다. Issue #20과 오늘할일은 아직 진행중이다.

## 승인 요청

- Stage 4.4 결과 검토와, #17을 포함한 `devel` 통합·충돌 해소·새 Windows/Linux native 및
  Linux GUI 수용 단계 진입 승인을 요청한다. 해당 승인을 받기 전 source를 더 변경하지 않는다.
