# Task #20 최종 보고서 — desktop adapter lifecycle과 dead bridge 정리

GitHub Issue: [#20](https://github.com/postmelee/alhangeul-tauri/issues/20)
마일스톤: M010

## 작업 요약

- 대상 이슈: #20
- 마일스톤: M010
- 단계 수: 4개 본 단계와 7개 보정·통합 단계(Stage 4의 중간 correction은 Stage 4.1·4.4·4.5 보고서에 통합)
- 작업 목적: Studio desktop adapter의 반복 설치·교체·해제를 하나의 lifecycle로 만들고, 동기 handler getter와 중복 platform native bridge를 제거해 Windows/Linux production 경계를 명확히 한다.

최종 수용 제품 source SHA는 `26794ce52b32f637c79c470693c1d3ed257363e4`다. PR #51 review 뒤
Linux print completion watchdog·GTK parent·stale print state와 production `pagehide` teardown을
보정한 이 source에서 Windows x64, Linux x64, Linux arm64 native build와 Windows MSI·NSIS
installer lifecycle, Linux thumbnail core·helper·package lifecycle을 다시 통과했다. 같은 SHA와
native artifact를 사용한 Linux GUI에서 여섯 문서 scenario, 반복 system print의 네 editor body
checkpoint, Nautilus·Thunar thumbnail과 PDF 3종을 모두 재수용했다.

Stage 4.6 보고서와 이 갱신 commit은 문서와 오늘할일만 바꾸며 검증한 제품 source를 변경하지 않는다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/studio-host/src/command/dispatcher.ts`, `dispatcher.test.ts` | active generation, abort와 composite disposer를 도입해 새 dispatcher가 이전 설치를 회수하고 stale cleanup을 격리했다. production `pagehide`도 동일 disposer에 연결했다. | toolbar·native event adapter 반복 setup/teardown·navigation |
| `apps/studio-host/src/core/desktop-events*`, `desktop-toolbar-mode-sync*` | Tauri listener, close listener, Windows wheel과 toolbar subscription의 idempotent cleanup·부분 실패 rollback·late completion 회수를 구현했다. | WebView reload, menu/open/drag/close, toolbar mode |
| `apps/studio-host/src/embed/desktop-runtime*`, `apps/studio-host/src/core/page-lifecycle.ts` | handler 여섯 개와 upstream uninstaller를 registration으로 묶고 동기 getter를 제거했으며 waiter·timer를 단일 settle 경로로 회수했다. 반환 disposer뿐 아니라 production `pagehide`에서도 runtime을 해제한다. | native host의 비동기 handler acquisition, runtime 교체·navigation |
| `apps/studio-host/src/core/platform*`, `apps/studio-host/src/command/direct-print*` | platform hydration/cache와 native IPC를 제거하고 navigator 판정을 단일화했다. Linux print 종료 뒤 기존 view event로 editor surface를 복원하고 stale surface/class를 선행 회수한다. | Windows/Linux print lifecycle, unknown platform, 본문 복원 |
| `apps/desktop/src-tauri/` | dead `desktop_platform` command를 제거하고 Linux GTK/direct PDF system print command를 얇은 native 경계로 연결했다. Print 뒤 5분 watchdog, single-settle state와 editor GTK parent를 적용했다. | Windows/Linux native command registry와 system print |
| `.github/workflows/alhangeul-linux-gui.yml` | exact native/helper artifact handoff, production DEB 설치, 반복 print·본문·thumbnail manager acceptance를 결속했다. | Linux x64 GUI·Nautilus·Thunar evidence |
| `scripts/windows-*.ps1`, `tests/windows-installer-smoke.test.mjs` | MSI·NSIS ready/close/relaunch, rollback·기본 연결 복원·thumbnail 제거와 clean uninstall 증거를 추가했다. | Windows installer 수용 |
| `tests/gui/`, `tests/linux-gui-*.test.mjs`, `tests/gui-contracts.test.mjs` | AT-SPI·X11 native dialog, drag-in, PDF/print, editor body pixel, thumbnail manager와 workflow manifest 계약을 자동화했다. | Linux production GUI와 수용 harness |
| `apps/studio-host/src/core/upstream-boundary.test.ts`, `tests/rhwp-baseline.test.mjs` | async handler acquisition과 navigator 소유를 긍정 계약으로, 제거된 bridge를 negative contract로 고정했다. | upstream/local 제품 경계 회귀 방지 |
| `docs/architecture/UPSTREAM.md` | sync getter·native platform IPC 설명을 registration lifecycle과 Studio WebView 판정 소유로 최소 정렬했다. | 기여자·메인테이너 아키텍처 기준 |
| `mydocs/` | 수행·구현 계획, Stage 1~4.6 판단·exact run과 최종 결과를 기록했다. | Hyper-Waterfall 작업 추적 |

Stage 4.6 보고서 작성 전 `origin/devel...HEAD` diff는 72개 파일, 4,434 insertions, 498 deletions다.
이 값에는 Issue #17이 이미 포함된 `devel`과의 공통 ancestry를 제외한 Task #20 이력과 작업 문서가
포함된다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| upstream handler/platform 소유 계약 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | 수행계획서가 선택한 기존 공식 아키텍처 문서의 관련 문단만 최소 수정했다. |
| Issue #17 Linux thumbnail 공식 문서 | 기존 `devel`의 승인 위치 보존 | `docs/architecture/LINUX_THUMBNAILS.md`, `docs/operations/DESKTOP_RELEASE.md` | OK | Stage 4.5는 #17에서 승인·병합된 위치와 본문을 그대로 통합했고 새 공식 문서를 만들지 않았다. |
| 수행·구현 계획 | `mydocs/plans/` | `task_m010_20.md`, `task_m010_20_impl.md` | OK | 범위, 문서 위치, 단계와 correction 판단을 계획 위치에 보존했다. |
| 단계 보고 | `mydocs/working/` | `task_m010_20_stage1.md`부터 `task_m010_20_stage4_6.md`의 보고서 8개 | OK | 구현·검증·진단·통합·PR review correction 경계를 단계 보고 위치에 기록했다. |
| 최종 보고 | `mydocs/report/` | `task_m010_20_report.md` | OK | 장기 보관용 최종 판정 위치가 수행계획과 일치한다. |
| 오늘할일 | `mydocs/orders/` | `20260824.md`~`20260902.md`의 작업일 기록 | OK | 날짜별 상태와 완료 시각만 짧게 기록했다. |

Task #20이 직접 새 공식 문서나 `mydocs/manual` 문서를 만들지 않았다. `third_party/rhwp`는 수정하지
않았고 stable tag `v0.8.4`, resolved commit `496333b27d21ddb9114ba9ae340bcb895870c9a7`을
유지한다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| dispatcher 설치 수명 | setup 결과를 소유·해제하는 public lifecycle 없음 | active generation 1개, idempotent `dispose()`·stale generation 격리와 production `pagehide` 회수 |
| desktop native listener 정리 | host별 영구 cache, listener disposer 수집 없음 | Tauri unlisten 7개와 close·wheel·toolbar cleanup을 composite disposer로 회수 |
| embed handler acquisition | module 전역 handler와 동기 getter, waiter timer 수명 분산 | 여섯 handler leaf의 active registration 1개, resolve/reject/timeout/pagehide 뒤 waiter·timer 0개 |
| platform 판정 경로 | navigator detector와 hydration/cache/native `desktop_platform` IPC 중복 | job당 navigator detector 1회, 제거 대상 bridge 3개는 negative contract에만 존재 |
| 인쇄 후 editor 판정 | dialog·PDF 성공 뒤 본문 surface 복원 여부 미검증 | 동일 PID/window의 4 checkpoint×2 frame, dark pixel 9,385~9,411, ink row 59, baseline 99.72~100% |
| 플랫폼 중립 최종 gate | Task #20 전 전용 lifecycle·acceptance contract 없음 | Stage 4.6 focused 38, automation 348, upstream 36, Studio 125 test 통과; 제품 경계 322개 파일 검사 |
| Windows/Linux native 증적 | 반복 설치·exact artifact 근거 없음 | 3개 desktop target, Windows installer, 3개 thumbnail core, 2개 helper, 2개 package artifact 성공; inventory 44개 검산 |
| Linux GUI 문서·thumbnail lifecycle | native open/save/drag/system print·manager 자동 수용 없음 | 6 scenario, evidence 42개 참조·40개 고유 파일, 2개 manager와 direct·GTK·CUPS PDF 각 6쪽 A4 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 반복 setup과 최신 generation 소유권 | OK — 새 dispatcher가 이전 generation을 abort·dispose하고 stale disposer가 최신 registration을 제거하지 않는 focused test가 통과했다. |
| listener 부분 실패·late completion·중복 dispose | OK — 등록 완료분을 역순 rollback하고 abort 뒤 늦게 도착한 unlisten도 즉시 회수하며 두 번 dispose가 한 번만 정리한다. |
| embed handler replacement와 waiter timer | OK — 설치 실패 시 기존 registration을 보존하고 replacement·uninstall·timeout 모든 경로에서 waiter와 timer를 0개로 회수한다. |
| production teardown 도달성 | OK — dispatcher와 embed registration이 `pagehide`에서 실제 disposer를 호출하고 이후 명시 dispose가 중복 정리하지 않는 focused test가 통과했다. |
| Linux print completion·dialog parent | OK — Print 뒤 5분 watchdog과 single-settle state가 keepalive/timer를 회수하고 `gtk_window()` parent를 전달한다. Linux x64·arm64 desktop test·Clippy와 production GTK print가 통과했다. |
| stale print state 복구 | OK — 이전 container와 제품 전용 print class가 남은 fixture에서 다음 job 전·후 모두 회수하는 focused test가 통과했다. |
| dead bridge 제거와 upstream 경계 | OK — `getDesktopStudioHandlers`, `hydrateDesktopPlatform`, `desktop_platform`의 production 부재와 async acquisition·navigator detector 소유를 boundary/baseline test로 고정했다. |
| upstream pin·본문 무손실 | OK — upstream 36개 baseline·pin·update test가 통과했고 `third_party/rhwp`와 renderer/save source에는 변경이 없다. |
| Studio 통합·production build | OK — 23개 파일, 125개 test가 통과했고 `tsc && vite build`가 228개 module을 변환했다. dynamic import·chunk size는 기존 non-blocking warning이다. |
| 자동화·GUI 계약과 제품 경계 | OK — automation 348개, Stage 4.6 focused 38개 test와 GUI typecheck가 통과했고 제품 경계 322개 파일에서 violation이 없다. |
| exact Windows/Linux native | OK — [native run 33583778583](https://github.com/postmelee/alhangeul-tauri/actions/runs/33583778583)의 exact source에서 Windows x64, Linux x64, Linux arm64 build·Rust test·Clippy와 artifact 검증이 성공했다. |
| Windows installer lifecycle | OK — MSI·NSIS install/launch/uninstall exit 0, thumbnail 등록·제거, 기본 연결·외부 fixture 복원과 clean 상태를 확인했다. |
| Linux thumbnail lifecycle | OK — x64 DEB/RPM·arm64 DEB의 install/reinstall/update/rollback/uninstall과 helper ELF·SHA, MIME·제3자 파일·cache 보존이 성공했다. |
| Linux production GUI lifecycle | OK — [Linux GUI run 33585905913](https://github.com/postmelee/alhangeul-tauri/actions/runs/33585905913)의 13개 step, 여섯 scenario, Nautilus·Thunar와 네 editor checkpoint가 성공했다. |
| PDF·화면 원본 검토 | OK — direct·GTK·CUPS PDF 18쪽을 독립 재렌더링하고 editor·manager 원본 화면을 직접 확인했다. 빈 쪽·본문/표 잘림이 없다. |
| artifact 정합성 | OK — Windows 4개, Linux x64 22개, arm64 18개 inventory의 실제 size·SHA-256과 GUI manifest 42개 참조를 검산했다. |
| 문서·patch 정합성 | OK — 최종 보고서와 오늘할일 반영 전 통합 gate를 재실행했고 이후 `git diff --check`로 문서 변경을 검증한다. |

Stage 4.6 보고서 직전 제품 source에서 focused 38/38, `typecheck:gui`, automation 348/348,
upstream 36/36, Studio 125/125, Studio build 228 modules, product-boundary 322 files를 통과했다. 현재 macOS
호스트에서는 Rust desktop·Tauri build를 실행하지 않았고 Windows/Linux 원격 결과만 native 수용
근거로 사용했다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_20_stage1.md): dispatcher, desktop event와 toolbar subscription을 active generation의 composite disposer로 묶었다.
- [Stage 2](../working/task_m010_20_stage2.md): embed handler 설치·교체·해제를 registration으로 캡슐화하고 동기 getter와 waiter timer 누수를 제거했다.
- [Stage 3](../working/task_m010_20_stage3.md): platform 판정을 navigator leaf로 단일화하고 dead native bridge와 공식 경계를 정렬했다.
- [Stage 3.1](../working/task_m010_20_stage3_1.md): runner 전역 navigator에 의존하던 unknown fixture를 명시 입력으로 격리했다.
- [Stage 4.1](../working/task_m010_20_stage4_1.md): Stage 4 acceptance harness를 보정하고 첫 exact native·Linux GUI 전체 수용을 완료했다.
- [Stage 4.4](../working/task_m010_20_stage4_4.md): Stage 4.2·4.3 재수용에서 발견한 인쇄 후 흰 editor를 진단하고 최소 view 복원과 네 body checkpoint를 수용했다.
- [Stage 4.5](../working/task_m010_20_stage4_5.md): Issue #17 포함 최신 `devel`을 통합하고 새 exact SHA에서 native·GUI·thumbnail·본문·PDF를 모두 재수용했다.
- [Stage 4.6](../working/task_m010_20_stage4_6.md): PR #51 review 뒤 Linux print watchdog·GTK parent·stale print state와 production pagehide teardown을 보정하고 새 exact SHA를 전체 재수용했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- native와 GUI 수용은 GitHub Actions의 Windows runner와 Ubuntu Xvfb·Nautilus·Thunar·CUPS-PDF
  환경 기준이다. 지원 범위 안에서도 개별 Linux 배포판, desktop theme와 실제 프린터 driver 차이는
  포함하지 않았다.
- editor body gate와 evidence render는 고정 공개 fixture의 manifest, text와 pixel 지표로 검증했다.
  임의 HWP/HWPX와 글꼴 조합 전체의 주관적 시각 품질 보증을 의미하지 않는다.
- AppImage·RPM과 Linux arm64는 build·inventory·package lifecycle까지 확인했고 실제 GUI 실행은
  Linux x64 DEB에서 수행했다.
- Windows WebView2의 실제 top-level `window.print()` printer/PDF 출력은 실행하지 않았다. Windows
  Rust·bundle·installer 성공과 Linux GUI 출력을 Windows 출력 성공으로 확대하지 않는다.
- watchdog의 정상 `finished` 경로와 native compile/Clippy는 수용했지만 backend가 `finished`를
  영구 누락하는 fault injection은 수행하지 않았다.
- 제품 source·dependency·workflow를 `26794ce` 이후 변경하면 이번 exact-SHA 결과를 승계하지 않는다.
- release, 서명, package repository 게시, updater 활성화는 수행하지 않았다.

### 후속 작업 후보

- 지원 Linux 배포판·desktop theme·실제 프린터별 호환성 표본 검증은 별도 이슈로 분리한다.
- Windows WebView2 실제 인쇄/PDF 저장 acceptance와 대용량 문서 print surface 성능은 별도 이슈 후보로 분리한다.
- dependency caret 결합, source substring test 구조와 `formatMm` 정리는 동작 correction과 분리해 검토한다.
- release·서명·updater·package repository 게시 판단은 전용 release task에서 수행한다.

## 작업지시자 승인 요청

- 작업지시자의 2026-09-02 “이어서 진행해줘” 승인에 따라 PR review correction, 새 exact-SHA
  native/GUI 재수용과 이 최종 보고서 갱신을 커밋해 기존 PR #51에 반영한다.
- 보정 결과를 리뷰에 응답한 뒤 merge는 작업지시자가 별도로 결정한다. merge 전 self-merge나 Issue close는 수행하지 않는다.
