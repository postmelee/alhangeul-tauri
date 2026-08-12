# Task #15 최종 보고서 — upstream 페이지 SVG 기반 Windows/Linux 시스템 인쇄

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
마일스톤: M010

## 작업 요약

- 대상 이슈: #15
- 마일스톤: M010
- 단계 수: 22
- 작업 목적: editor WebView 전체를 인쇄하던 Tauri override를 제거하고, rhwp v0.8.2의
  페이지별 `profile=print` SVG를 hidden same-origin surface에 조립해 Windows/Linux
  system print dialog로 직접 인쇄한다.

최종 제품 후보 source SHA는 `b5b75e2bea6258338e6df5bd6d36fa10e78a4ced`다. 이 SHA의
CI와 Windows/Linux native workflow, 6개 installer inventory와 Windows MSI·NSIS smoke가
성공했다. PR review에서 발견된 stale focus IPC race, 5분 surface 조기 철거, Linux 혼합
크기 보정 범위, CSP style fallback과 upstream ID drift도 merge 전에 보정했다.

직접 GUI 근거는 `89718976a7fa44ebe7f8981ca01ce6bfcbebc979` Windows/Linux x64와
`da488a87e9c3b4ca325bebefc611aea853f714cc` Linux arm64 후보에서 확보했다. 최종
`b5b75e2` GUI는 접근 가능한 Windows VDI·Linux GUI가 없어 반복하지 못했으며, review
보정 경로는 focused test와 exact native build로 검증했다. 이 제한을 자동 gate 성공과
구분해 최종 판정한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/studio-host/src/command/` | upstream print surface primitive를 재사용하는 Tauri direct print와 Windows modal lifecycle, focus race·watchdog 회귀 test 추가 | system dialog 직접 진입, 페이지 조립, 상태 복원·반복 인쇄 |
| `apps/studio-host/src/core/` | editor WebView native print bridge 제거, upstream command·surface ID drift guard 확장 | upstream/local 소유 경계와 회귀 방지 |
| `apps/studio-host/src/style.css` | CSP가 inline hidden style을 무시해도 print surface가 노출되지 않는 외부 CSS 경계 추가 | production WebView surface visibility |
| `apps/desktop/src-tauri/` | 더 이상 쓰지 않는 `print_webview` command 제거, window geometry 독립 module 분리 | Windows/Linux native command·window lifecycle |
| `docs/architecture/UPSTREAM.md` | pagination·page SVG·print DOM은 upstream, Tauri host lifecycle과 동일 크기 Linux 보정은 local이라는 계약 정렬 | 기여자·유지보수자 아키텍처 기준 |
| `docs/operations/DESKTOP_RELEASE.md` | direct PDF와 실제 system print 분리, exact bundle GUI gate 추가 | prerelease/release 수용 절차 |
| `mydocs/` | 수행·구현 계획, Stage 1~4.12 결과, exact artifact·GUI 근거와 최종 판정 기록 | 하이퍼-워터폴 추적 문서 |

전체 `origin/devel...HEAD` diff는 최종 문서 commit 전 기준 45 files, 4,355 insertions,
195 deletions이다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| upstream 인쇄 소유 계약 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | 수행계획서에서 선택한 장기 아키텍처 문서에 page SVG·surface 소유 경계만 최소 보정했다. |
| desktop release gate | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | 실제 인쇄와 direct PDF의 독립 gate를 기존 운영 문서에 반영했다. |
| 수행·구현 계획 | `mydocs/plans/` | `task_m010_15.md`, `task_m010_15_impl.md` | OK | 단계 설계, review 판단과 최종 exact 판정을 task 작업 기억에 보존했다. |
| 단계·최종 보고 | `mydocs/working/`, `mydocs/report/` | `task_m010_15_stage{1..4.12}.md`, `task_m010_15_report.md` | OK | 승인된 단계 보고와 최종 보고 위치를 따랐다. |

신규 `mydocs/manual`·`mydocs/tech` 문서는 만들지 않았다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| `file:print` 대상 | editor WebView 전체를 native `print_webview`로 인쇄해 Windows에서 빈 앱 1쪽 | upstream page SVG를 hidden print surface에 조립하고 system dialog 직접 진입 |
| Linux 6쪽 system print | WebKitGTK에서 원문 각 쪽 뒤 빈 쪽이 생겨 12쪽 | CUPS-PDF·GTK Print to File 모두 6쪽 A4, 교대 빈 쪽·잘림·누락 없음 |
| Windows modal 상태 | Print-to-PDF 저장창 전에 조기 `인쇄 완료` 또는 상태 복원 | system dialog와 driver 저장창 동안 처리 중 유지, focus 안정화 뒤 복원·재인쇄 |
| 5분 경과 | timeout이 surface를 철거하고 인쇄 job을 조기 종료 | 비종료 watchdog이 focus만 재확인하고 surface·job을 유지 |
| focused Studio test | Task #15 전 전용 direct-print/lifecycle test 없음 | 전체 Studio 21 files·97 tests, direct-print·lifecycle·upstream guard 포함 |
| 플랫폼 중립 gate | Task 시작 전 기준 | product boundary 184, automation 71, upstream 35, Studio 97, build 213 modules 통과 |
| exact native 산출물 | Task #13 후보는 실제 인쇄 No-Go | Windows MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB 6개와 installer smoke 통과 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| upstream 페이지 surface 계승 | OK — `renderPageSvgWithProfile(page, 'print')`와 upstream surface/style primitive를 source guard로 고정하고 editor `print_webview`를 제거했다. |
| Windows 문서 system print | OK — `8971897` GUI에서 별도 Alhangeul preview 없이 system dialog 직접 진입, 본문·다중 페이지와 Print-to-PDF 동작을 확인했다. |
| Windows modal lifecycle | OK — system dialog와 driver 저장창 동안 처리 중 상태를 유지하고 저장·취소 뒤 상태 복원과 반복 인쇄를 확인했다. stale poll과 5분 경로는 focused test로 추가 고정했다. |
| Linux 동일 크기 pagination | OK — `8971897` x64에서 CUPS-PDF·GTK Print to File·direct PDF가 각각 6쪽 A4였고 빈 쪽·잘림·누락이 없었다. |
| Linux 혼합 크기 보정 경계 | OK(자동) — local 1px/default-page override 전체를 제거하고 upstream stylesheet 유지 test를 고정했다. 실제 GTK media 전환은 미검증이다. |
| direct PDF·HWP/HWPX 회귀 분리 | OK — direct PDF searchable 계약과 source save 경계를 focused test와 GUI에서 유지했다. |
| 플랫폼 중립 통합 검증 | OK — product/version/release/rhwp pin, automation 71/71, upstream 35/35, Studio 97/97와 production build 213 modules 통과. |
| Windows/Linux exact native | OK — CI [#31578400323](https://github.com/postmelee/alhangeul-tauri/actions/runs/31578400323), native [#31578819989](https://github.com/postmelee/alhangeul-tauri/actions/runs/31578819989), 6개 bundle inventory와 MSI·NSIS smoke 통과. |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_15_stage1.md): upstream 페이지 SVG·preview surface 소유 계약과 drift guard를 고정했다.
- [Stage 2](../working/task_m010_15_stage2.md): editor WebView native print override를 제거하고 upstream command를 계승했다.
- [Stage 2.1](../working/task_m010_15_stage2_1.md): Windows popup 차단 증거에 따라 제한적 popup host를 보정했다.
- [Stage 2.2](../working/task_m010_15_stage2_2.md): popup 없이 hidden page surface에서 system dialog로 직접 진입하도록 전환했다.
- [Stage 2.3](../working/task_m010_15_stage2_3.md): WebKitGTK 동일 크기 named-page 이중 pagination을 보정하고 Linux 6쪽을 수용했다.
- [Stage 2.4](../working/task_m010_15_stage2_4.md): system print 반환과 완료 상태를 분리했다.
- [Stage 2.5](../working/task_m010_15_stage2_5.md): Windows native focus listener로 driver modal chain을 관찰했다.
- [Stage 2.6](../working/task_m010_15_stage2_6.md): dialog handoff 사이의 일시 focus를 1초 안정화로 걸러냈다.
- [Stage 3](../working/task_m010_15_stage3.md): 플랫폼 중립 회귀와 공식 아키텍처·release 문서를 정렬했다.
- [Stage 4](../working/task_m010_15_stage4.md): 첫 exact Windows/Linux 후보와 artifact handoff를 만들었다.
- [Stage 4.1](../working/task_m010_15_stage4_1.md): popup host exact 후보를 검증했다.
- [Stage 4.2](../working/task_m010_15_stage4_2.md): hidden direct-print exact 후보를 검증했다.
- [Stage 4.3](../working/task_m010_15_stage4_3.md): Linux pagination 보정 후보를 게시했다.
- [Stage 4.4](../working/task_m010_15_stage4_4.md): system print lifecycle 후보를 게시했다.
- [Stage 4.5](../working/task_m010_15_stage4_5.md): native modal lifecycle 후보를 게시했다.
- [Stage 4.6](../working/task_m010_15_stage4_6.md): modal focus 안정화 후보를 게시했다.
- [Stage 4.7](../working/task_m010_15_stage4_7.md): Windows WebView2 GUI 필수 gate를 확정했다.
- [Stage 4.8](../working/task_m010_15_stage4_8.md): Linux x64 WebKitGTK GUI 필수 gate를 확정했다.
- [Stage 4.9](../working/task_m010_15_stage4_9.md): Task #13 merge 결과를 통합하고 exact 후보를 고정했다.
- [Stage 4.10](../working/task_m010_15_stage4_10.md): workflow·artifact와 Linux arm64 GUI 근거, 검증 한계를 확정했다.
- [Stage 4.11](../working/task_m010_15_stage4_11.md): PR review의 focus race·timeout·Linux/CSP drift를 보정했다.
- [Stage 4.12](../working/task_m010_15_stage4_12.md): review 보정 exact 후보의 CI·native·inventory와 installer smoke를 수용했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- 최종 `b5b75e2` Windows/Linux GUI는 접근 가능한 환경이 없어 직접 반복하지 못했다.
  이전 exact GUI 결과와 최종 native build 외에 review 보정 경로를 focused test로 검증했다.
- 실제 system dialog를 5분 넘게 유지하는 시나리오와 혼합 페이지 크기 Linux GTK media
  전환은 GUI 미검증이다. watchdog은 focus 복귀가 없으면 surface와 job을 의도적으로 계속
  유지하며, 사용자 강제 취소 UX는 현재 범위에 없다.
- AppImage와 RPM은 build·inventory까지만 확인했고 GUI 실행은 DEB에서 수행했다.
- focus 복귀는 modal chain 종료를 뜻하며 physical printer spool 완료나 저장 성공·취소를
  구분하지 않는다. Microsoft Print to PDF 기본 basename도 system UI 제약으로 보장하지 않는다.
- 공개 prerelease, release tag, 서명, updater와 package repository 게시는 수행하지 않았다.

### 후속 작업 후보

- [Issue #19](https://github.com/postmelee/alhangeul-tauri/issues/19)에서 PDF immutable snapshot과 stale job TTL을 다룬다.
- [Issue #20](https://github.com/postmelee/alhangeul-tauri/issues/20)에서 desktop adapter lifecycle과 dead bridge를 정리한다. 시스템 인쇄는 이관하지 않았다.
- [Issue #21](https://github.com/postmelee/alhangeul-tauri/issues/21)에서 native Rust 대형 module을 기능 변경 없이 분리한다.
- Task #15 merge 뒤 Task #9에서 새 `devel` exact prerelease 후보와 공개 release Go를 별도로 판정한다.

## 작업지시자 승인 요청

- 작업지시자의 “진행해줘” 지시에 따라 PR review 보정과 exact 자동 gate, 보고서·PR 본문과
  review 답변을 갱신한다.
- PR 검토 후 merge 여부는 작업지시자가 별도로 결정하며, merge 전 Issue #15를 닫지 않는다.
