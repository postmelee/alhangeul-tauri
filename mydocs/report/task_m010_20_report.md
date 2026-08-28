# Task #20 최종 보고서 — desktop adapter lifecycle과 dead bridge 정리

GitHub Issue: [#20](https://github.com/postmelee/alhangeul-tauri/issues/20)
마일스톤: M010

## 작업 요약

- 대상 이슈: #20
- 마일스톤: M010
- 단계 수: 4개 본 단계와 2개 보정 단계(Stage 4 결과는 Stage 4.1 보고서에 통합)
- 작업 목적: Studio desktop adapter의 반복 설치·교체·해제를 하나의 lifecycle로 만들고, 동기 handler getter와 중복 platform native bridge를 제거해 Windows/Linux production 경계를 명확히 한다.

최종 수용 제품 source SHA는 `b0667c746aa838143fe6043ee4841958ea28ec6b`다. 같은 SHA의 Windows x64, Linux x64, Linux arm64 native build와 Windows MSI·NSIS 반복 lifecycle smoke가 성공했고, 해당 Linux x64 artifact를 설치한 GUI workflow에서 HWP/HWPX, native save, drag-in, direct PDF, GTK/CUPS system print 여섯 scenario가 모두 성공했다. 단계 보고서와 이 최종 보고서는 제품 source 수용 뒤 별도 문서 commit으로 보존한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/studio-host/src/command/dispatcher.ts`, `dispatcher.test.ts` | active generation, abort와 composite disposer를 도입해 새 dispatcher가 이전 설치를 회수하고 stale cleanup을 격리했다. | toolbar·native event adapter 반복 setup/teardown |
| `apps/studio-host/src/core/desktop-events*`, `desktop-toolbar-mode-sync*` | Tauri listener, close listener, Windows wheel과 toolbar subscription의 idempotent cleanup·부분 실패 rollback·late completion 회수를 구현했다. | WebView reload, menu/open/drag/close, toolbar mode |
| `apps/studio-host/src/embed/desktop-runtime*` | handler 여섯 개와 upstream uninstaller를 registration으로 묶고 동기 getter를 제거했으며 waiter·timer를 단일 settle 경로로 회수했다. | native host의 비동기 handler acquisition과 runtime 교체 |
| `apps/studio-host/src/core/platform*`, `apps/studio-host/src/command/direct-print*` | platform hydration/cache와 native IPC를 제거하고 job당 한 번의 navigator 판정으로 direct print 분기를 단일화했다. | Windows modal lifecycle, Linux print fragment, unknown platform |
| `apps/desktop/src-tauri/` | dead `desktop_platform` command를 제거하고 Linux GTK/direct PDF system print command를 얇은 native 경계로 추가했다. | Windows/Linux native command registry와 system print |
| `.github/workflows/alhangeul-desktop.yml`, `.github/workflows/alhangeul-linux-gui.yml` | exact SHA native artifact, Windows installer lifecycle, production DEB 기반 Linux GUI acceptance를 결속했다. | Windows/Linux CI와 evidence handoff |
| `scripts/windows-*.ps1`, `tests/windows-installer-smoke.test.mjs` | MSI·NSIS ready/close/relaunch/uninstall 반복 lifecycle과 진단 증거를 추가했다. | Windows installer 수용 |
| `tests/gui/`, `tests/linux-gui-*.test.mjs`, `tests/actions-workflows.test.mjs`, `tests/gui-contracts.test.mjs` | AT-SPI semantic dialog 조작, drag-in, PDF/print 산출물, workflow·manifest 계약을 자동화했다. | Linux production GUI와 수용 harness |
| `apps/studio-host/src/core/upstream-boundary.test.ts`, `tests/rhwp-baseline.test.mjs` | async handler acquisition과 navigator 소유를 긍정 계약으로, 제거된 bridge를 negative contract로 고정했다. | upstream/local 제품 경계 회귀 방지 |
| `docs/architecture/UPSTREAM.md` | sync getter·native platform IPC 설명을 registration lifecycle과 Studio WebView 판정 소유로 최소 정렬했다. | 기여자·메인테이너 아키텍처 기준 |
| `mydocs/` | 수행·구현 계획, Stage 1~4.1 판단과 exact run, 최종 결과를 기록했다. | Hyper-Waterfall 작업 추적 |

최종 보고서 작성 전 `origin/devel...HEAD` diff는 57개 파일, 3,339 insertions, 582 deletions다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| upstream handler/platform 소유 계약 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | 수행계획서가 선택한 기존 공식 아키텍처 문서의 관련 문단만 최소 수정했다. |
| 수행·구현 계획 | `mydocs/plans/` | `task_m010_20.md`, `task_m010_20_impl.md` | OK | 범위, 문서 위치, 단계와 correction 판단을 작업 계획 위치에 보존했다. |
| 단계 보고 | `mydocs/working/` | `task_m010_20_stage1.md`부터 `task_m010_20_stage4_1.md` | OK | 각 승인 경계의 구현·검증·잔여 위험을 단계 보고 위치에 기록했다. |
| 최종 보고 | `mydocs/report/` | `task_m010_20_report.md` | OK | 장기 보관용 최종 판정 위치가 수행계획과 일치한다. |
| 오늘할일 | `mydocs/orders/` | `20260824.md`, `20260826.md`, `20260827.md`, `20260828.md` | OK | 날짜별 현재 상태와 완료 시각만 짧게 기록했다. |

신규 공식 문서나 `mydocs/manual` 문서는 만들지 않았다. `third_party/rhwp`는 수정하지 않았다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| dispatcher 설치 수명 | setup 결과를 소유·해제하는 public lifecycle 없음 | active generation 1개, idempotent `dispose()`와 stale generation 격리 |
| desktop native listener 정리 | host별 영구 cache, listener disposer 수집 없음 | Tauri unlisten 7개와 close·wheel·toolbar cleanup을 composite disposer로 회수 |
| embed handler acquisition | module 전역 handler와 동기 getter, waiter timer 수명 분산 | 여섯 handler leaf의 active registration 1개, resolve/reject/timeout 뒤 waiter·timer 0개 |
| platform 판정 경로 | navigator detector와 hydration/cache/native `desktop_platform` IPC 중복 | job당 navigator detector 1회, 제거 대상 bridge 3개는 negative contract에만 존재 |
| 플랫폼 중립 최종 gate | Task #20 전 전용 lifecycle·acceptance contract 없음 | upstream 36, Studio 111, automation 214, focused native/workflow 56 test 통과; 제품 경계 231개 파일 검사 |
| Windows/Linux native 수용 | 반복 설치·GUI exact artifact 근거 없음 | Windows x64·Linux x64·Linux arm64 build, MSI·NSIS 반복 lifecycle smoke 통과 |
| Linux GUI 문서 lifecycle | native open/save/drag/system print 자동 수용 없음 | 6개 scenario, manifest 파일 31개 hash 검증, direct·GTK·CUPS PDF 각각 6쪽 A4 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 반복 setup과 최신 generation 소유권 | OK — 새 dispatcher가 이전 generation을 abort·dispose하고 stale disposer가 최신 registration을 제거하지 않는 focused test가 통과했다. |
| listener 부분 실패·late completion·중복 dispose | OK — 이미 등록된 listener를 역순 rollback하고 abort 뒤 늦게 도착한 unlisten도 즉시 회수하며 두 번 dispose가 한 번만 정리한다. |
| embed handler replacement와 waiter timer | OK — 설치 실패 시 기존 registration을 보존하고 replacement·uninstall·timeout 모든 경로에서 waiter와 timer를 0개로 회수한다. |
| dead bridge 제거와 upstream 경계 | OK — `getDesktopStudioHandlers`, `hydrateDesktopPlatform`, `desktop_platform`의 production 부재와 async acquisition·navigator detector 소유를 boundary/baseline test로 고정했다. |
| upstream pin·본문 무손실 | OK — upstream 36개 baseline·pin·update test가 통과했고 `third_party/rhwp`와 renderer/save source에는 변경이 없다. |
| Studio 통합·production build | OK — 21개 파일, 111개 test가 통과했고 `tsc && vite build`가 213개 module을 변환했다. dynamic import·chunk size는 기존 non-blocking warning이다. |
| 자동화·GUI 계약과 제품 경계 | OK — automation 214개, focused 56개 test와 GUI typecheck가 통과했고 제품 경계 231개 파일에서 violation이 없다. |
| exact Windows/Linux native | OK — [native run 33164172488](https://github.com/postmelee/alhangeul-tauri/actions/runs/33164172488)에서 exact source SHA의 Windows x64, Linux x64, Linux arm64 build와 artifact 검증이 성공했다. |
| Windows installer lifecycle | OK — 같은 native run의 MSI·NSIS ready/close/relaunch/uninstall smoke와 evidence artifact `9683681327`이 성공했다. |
| Linux production GUI lifecycle | OK — [Linux GUI run 33166298495](https://github.com/postmelee/alhangeul-tauri/actions/runs/33166298495)의 22개 step과 여섯 scenario가 성공했고 evidence artifact `9683810862`의 31개 파일을 재검산했다. |
| 문서·patch 정합성 | OK — 최종 보고서와 오늘할일 반영 뒤 `git diff --check`를 통과했다. |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_20_stage1.md): dispatcher, desktop event와 toolbar subscription을 active generation의 composite disposer로 묶었다.
- [Stage 2](../working/task_m010_20_stage2.md): embed handler 설치·교체·해제를 registration으로 캡슐화하고 동기 getter와 waiter timer 누수를 제거했다.
- [Stage 3](../working/task_m010_20_stage3.md): platform 판정을 navigator leaf로 단일화하고 dead native bridge와 공식 경계를 정렬했다.
- [Stage 3.1](../working/task_m010_20_stage3_1.md): runner 전역 navigator에 의존하던 unknown fixture를 명시 입력으로 격리했다.
- [Stage 4.1](../working/task_m010_20_stage4_1.md): Stage 4 acceptance harness를 보정하고 exact native·Linux GUI 전체 수용을 완료했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- native와 GUI 수용은 GitHub Actions의 Windows runner와 Ubuntu Xvfb·CUPS-PDF 환경 기준이다. 지원 범위 안에서도 개별 Linux 배포판, desktop theme와 실제 프린터 driver 차이는 포함하지 않았다.
- evidence render는 manifest, text와 pixel 지표로 검증했다. 임의의 HWP/HWPX 전체에 대한 주관적 시각 품질 보증을 의미하지 않는다.
- AppImage·RPM과 Linux arm64는 build·inventory까지만 확인했고 실제 GUI 실행은 Linux x64 DEB에서 수행했다.
- release, 서명, package repository 게시, updater 활성화는 수행하지 않았다.

### 후속 작업 후보

- 지원 Linux 배포판·desktop theme·실제 프린터별 호환성 표본 검증은 별도 이슈로 분리한다.
- release·서명·updater·package repository 게시 판단은 전용 release task에서 수행한다.

## 작업지시자 승인 요청

- 작업지시자의 “진행해줘” 승인에 따라 이 최종 보고서와 오늘할일을 커밋하고 `publish/task20` 원격 브랜치와 `devel` 대상 Open PR을 게시한다.
- PR review 후 merge와 Issue #20 close 여부는 작업지시자가 별도로 결정한다.
