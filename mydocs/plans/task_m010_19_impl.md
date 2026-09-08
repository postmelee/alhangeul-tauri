# Task #19 구현계획서 — PDF snapshot과 stale job 회수 경계

수행계획서: [`task_m010_19.md`](task_m010_19.md)
GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
마일스톤: M010

2026-08-24 작업지시자가 수행계획 진행을 승인했다. 승인된 immutable snapshot, native stale job 회수, Studio/native 통합, Windows/Linux exact-SHA 수용의 네 경계를 유지한다. Task #20이 소유한 dispatcher·embed handler·platform lifecycle은 수정하지 않고, Task #34의 Linux GUI correction이 `devel`에 반영된 뒤 마지막 수용을 진행한다.

2026-08-24 Stage 4 첫 candidate `41bbf015ad140a4c7ff5db58110ea4d292798261`의 CI run `32693530357`은 플랫폼 중립 gate를 통과했지만 `pdf_temp_cleanup_tests.rs`가 sibling module의 private `PdfExportJobs.jobs` field를 직접 읽어 Rust test compile에서 `E0616`으로 실패했다. 작업지시자는 production API·reaper 동작을 바꾸지 않는 assertion 보정, Windows/Linux x64 artifact workflow의 Rust test·Clippy gate 연결과 새 exact-SHA 재실행을 Stage 4.1로 승인했다. 실패 candidate의 artifact build run `32693539285`는 correction 뒤 SHA가 바뀌므로 중단했고 어떤 artifact도 수용 증거로 재사용하지 않는다.

## 단계 개요

### 2026-09-08 Stage 4.23 — PR #65 readback 및 예방적 보정

실행 checkpoint: 로컬 Windows 계약 **60/60**, confirmation/workflow 계약 **61/61**, product
boundary(445 files), `git diff --check` 통과. import된 중복 검사는 합산하지 않는다. 실제 Windows
검증은 아직 미실행이며 이 기록은 완료 보고서가 아니다. 새 fixture는 87 LOC다. workflow와
의존성/lockfile은 변경하지 않았고 앱 변경은 SVG 요청의 `Debug` 파생 제거 한 줄뿐이다.

- `windows-pdf-win32.ps1`의 readback을 private `VerifyFileName`으로 분리하고 버퍼를
  `text.Length + 2`로 둔다. WM_GETTEXT의 NUL 자리 외에 추가 한 글자를 관측하며 timeout과
  문자열 정확 일치 조건을 유지한다. SetFileName의 mode/PID/child/class/ID 검증은 그대로다.
- `tests/gui/windows-dialog/filename-readback.ps1`에 격리된 Win32 `#32770`/`Edit` fixture를 둔다.
  기존 native diagnostics suite에서 실행하며 새 workflow/패키지를 만들지 않는다. 실제 setter의
  Open/Save ASCII·한글 경로 성공, 같은 readback 함수의 단일/긴/한글 접미사·짧은/다른 문자열
  거부를 검사한다. 실패 원문/입력값은 출력하지 않으며 생성한 HWND만 finally에서 파괴한다.
- `AppendPdfPageRequest`의 Debug 파생만 제거하고 두 policy selector의 `$matches`를 `$found`로
  바꾼다. Node 계약으로 helper 연결/버퍼/민감 요청 Debug 금지/자동 변수 이름 회귀를 확인한다.
- 로컬: `pnpm run test:gui:windows:contracts`, 관련 confirmation/workflow Node 계약,
  `pnpm run check:product-boundary`, `git diff --check`. 기존 대형 command/계약 파일은 작은
  변경만 하며 권장 LOC 예외를 유지한다. 새 fixture 파일/함수는 300/50 LOC 이내로 둔다.
- 로컬 통과 뒤 실행 checkpoint를 기존 `publish/task19`에 non-force push한다. 기존
  `alhangeul-desktop.yml mode=windows-dialog-verify`와 `ci.yml scope=pdf-cleanup-windows`를
  각각 한 번 실행한다. 실제 PS5.1·readback·작은 대화상자 postcondition, Rust command 컴파일을
  확인하고 context/정확 SHA/결과를 read-back한다. macOS에서 native 코드를 실행하지 않는다.
- 검증 실패 시 같은 workflow를 자동 반복하지 않고 근거를 기록한다. 성공하면 stage-report/todo
  절차로 4.23 결과와 기존 최종 보고/PR 본문을 갱신한다. 별도 리뷰 답글·merge·릴리즈는 하지 않는다.

### 2026-09-07 최종 보고·Open PR 게시

후속 지시로 `task-final-report` 절차를 승인받았다. 4.22 이후 소스 변경이 없으므로 이미
통과한 통합 근거를 재사용하고 최종 보고/계획/orders/PR 본문의 형식·링크·diff를 검증한다.
최신 devel `c93ac8c`는 현재 작업 브랜치에 포함되어 있고 기존 #19 PR은 없다.
[최종 보고서](../report/task_m010_19_report.md)에 기본 4단계/보정 이력과 수용·한계를 정리한다.
`publish/task19`에 최종 문서를 게시하고 `devel` 대상 non-draft PR만 생성한다.
기존 보고서의 당시 실패/미완료 기록은 유지하며 merge·릴리즈·issue close는 별도 승인이다.

### 2026-09-07 Stage 4.22 — 수용 근거 보정과 최소 OS 회귀

#### 완료 결과 — 승인된 최소 보완 통과

[4.22 보고서](../working/task_m010_19_stage4.22.md)에 수용 근거와 한계를 정리했다.
후속 checkpoint `e401863450cfd33c2f9213d644270d4c1b7ee155`의 Windows run `34064903014`는
**8분 19초 통과**다. 실제 cleanup 6개(최상위/내부 junction 포함), failed/ignored 0,
92 filtered out이며 컴파일 5분 34초·실제 검사 3.05초다. full CI는 skipped다.
`windows-2025`, Rust 1.98.1이며 artifact `9998729762`(7093 bytes),
digest `sha256:0d415617ac164bc2549974c2f61f139ec65274fabf13d16e2f57959305015beb`를 확인했다.
이전 Linux run `34063977183` 성공을 재사용하고 다시 실행하지 않았다. 제품/배포 설정은
변경 없다. Stage 4 수용 근거 정리를 완료하고 #19 최종 보고/PR 승인을 요청한다.
조판 위험과 실제 동시 편집/reload/장시간/재시작 통합 미실행은 그대로 남긴다.

#### 후속 승인 — Windows cleanup test의 packaging resource 분리

작업지시자의 `진행해줘`로 아래 보정을 같은 4.22에서 승인받았다. 아래 최초 실패 기록은
보존한다. `ci.yml`의 `Test actual Windows PDF cleanup` step env에만
`TAURI_CONFIG={"bundle":{"resources":[]}}`를 둔다. 고정된 tauri-build 2.5.6은 JSON merge
patch를 읽으며 tauri-utils 2.8.3은 resources의 list/map을 허용한다. 빈 배열은 기존 resource
map을 대체하지만 빈 object는 map을 지우지 않으므로 사용하지 않는다.

실제 `tauri*.conf.json`/제품 경로/설치본은 수정하지 않는다. 정적 계약은 step-local JSON,
step 외부 override 부재, 기존 DLL/EXE mapping 보존과 가짜 resource 생성 부재를 확인한다.
공식 가이드는 승인된 기존 `DESKTOP_RELEASE.md` 위치에 테스트 전용 한계를 덧붙인다.
로컬 `node --test tests/actions-workflows.test.mjs`, `actionlint .github/workflows/ci.yml`,
`git diff --check` 후 실행 checkpoint를 commit/push하고 Windows 제한 scope만 한 번 실행한다.
기존 Linux·GUI·Rust format 검사는 해당 소스가 바뀌지 않아 이전 통과를 재사용한다.
Linux/PDF/전체 CI/패키지/썸네일/updater를 반복하지 않는다. 실패 시 다시 자동 재시도하지 않는다.
통과 시 최초 실행 근거와 함께 4.22 보고서/계획/orders를 묶고 최종 보고/PR 승인을 요청한다.

후속 보정의 로컬 workflow 계약 **55/55**, `actionlint .github/workflows/ci.yml`,
`git diff --check`가 통과했다. apps/crates/assets/third_party/lockfile은 최초 checkpoint
`0ab4745` 대비 차이가 없으며 실제 제품 설정도 변경하지 않았다. 아래 최초 실행 결과와
이번 보정/승인을 실행 checkpoint에 보존한 뒤 승인된 Windows 검사를 진행한다.

#### 실행 결과 — Linux 통과, Windows 테스트 준비 실패

checkpoint `0ab47459d3bc7b6137722e40b15b288468301e8c`로 각각 한 번 실행했다.
로컬 GUI 계약 19개, Linux 계약 62개, workflow 계약 65개, GUI typecheck·actionlint·Rust
format·product boundary·diff 통과다. workflow 계약의 full 분기 순서 assertion은 제한 분기와
구분하도록 로컬에서 보정한 뒤 모두 통과했다. Node 정적 계약을 실제 Rust 실행으로 세지 않는다.

- [Linux run 34063977183](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063977183):
  **3분 13초 통과**. `pdf-hwpx` scope, native print와 thumbnail 7단계 skipped. 제품
  `69b22650df96323a2c59e473d474ed3195cc9cc7`, native run `34021920074`, artifact `9986288884`
  (546063293 bytes, `sha256:af6c78143a0095ffda0361b410089b3ea7d0295538f89b0982259796de41efdd`) 재사용.
  HWPX 10쪽/A4/표제 검색/nonblank/쪽 가장자리, 정확한 title·쪽 수·원본 hash 보존을 확인했다.
  text counts는 `[994,1252,1005,1029,1010,1184,971,1185,982,1132]`다.
  PDF 763577 bytes, `5b7fea74f36666d8997b7df5bf01e2e415e1681094808922216c8adf174b2370`.
  14개 결과 파일의 size/hash를 재검산하고 10쪽 PNG와 앱 최종 화면을 직접 확인했다.
  기존 홀수 쪽 표의 긴 문구가 셀 경계에 밀착/잘리는 현상은 남는다. Linux 앱 첫 쪽의 같은
  위치에서도 관측되므로 PDF만의 결함으로 단정하지 않는다. 조판 동등성은 통과로 표시하지 않는다.
  evidence `9998392027`, 4835076 bytes,
  `sha256:aa8f08b9a5c29a35ba0511b84476f8c29f0c506c2358b745c6b6f6020f4c75e1`.
- [Windows run 34063975728](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063975728):
  **6분 7초 실패**, cleanup test는 **미실행**이다. 제한 job 구성 시 에이전트가
  `tauri.windows.conf.json`의 thumbnail bundle resource 선행조건을 놓쳤다.
  Tauri build script가 `windows/thumbnail-resources/AlhangeulThumbnailWorker.exe` 부재로
  중단했다. Rust assertion·junction 생성 실패나 제품 cleanup 결함으로 기록하지 않는다.
  full CI는 skipped, 실패 로그 업로드는 성공했다. evidence `9998431779`, 1141 bytes,
  `sha256:200be0d85d5901d6379f1d5de3458386a1fdeb093713a56efb8e7bbb004cad3b`.

증거는 `/private/tmp/alhangeul-task19-stage422.N6r0hl`에 보관한다. 기존 제품 대비 apps/crates/
third_party/assets/lockfile의 차이는 `#[cfg(test)]`로 로드하는 cleanup test 파일뿐이다.
제품·설치본 재빌드 및 Windows PDF/인쇄/thumbnail/updater 재실행은 하지 않았다.

최초 실행 당시 4.22는 미완료였다. `task-stage-report`의 실패 gate에 따라 완료 보고서/PR을
만들지 않고 결과 문서를 보정과 함께 묶도록 남겼다. 자동 수정·재dispatch는 하지 않았다.
당시 권고는 **이 cleanup test step에만** `TAURI_CONFIG`의 `bundle.resources=[]`를 적용해
무관한 packaging resource 요구를 분리하는 것이다. 빈 DLL/EXE를 만들거나 실제 package
설정을 바꾸지 않는다. 해당 설정이 test step 밖에 유출되지 않는 계약을 추가하고 Windows
제한 검사만 한 번 재검증하도록 승인받는다. Linux 성공은 재사용하며 다시 실행하지 않는다.

작업지시자가 남은 근거 검토의 권고를 승인했다. 기존 #19/M010/`local/task19`를 유지한다.
수행계획서의 문서 위치 판단을 따르며 아래 실행 요구가 과거 Stage 4 GUI 전체 재현 요구보다 우선한다.

1. `DESKTOP_RELEASE.md`의 PDF 수용을 결정적 Studio/native 테스트, OS 파일시스템 검사,
   설치본 PDF로 나눈다. 기존 수용 계약/수치 제한을 유지하고 실제 동시 편집/reload/장시간
   대기/재시작 통합 미실행을 명시한다. 실패 기록·기존 보고서는 그대로 보존한다.
2. `pdf_temp_cleanup_tests.rs`에 Windows junction 후보 및 후보 내부 junction 보존을 추가한다.
   PowerShell `New-Item -ItemType Junction`은 새 임시 경로에만 사용한다. 원본 sentinel,
   링크 reparse attribute, 정상 old 후보 삭제를 함께 확인해 검사 전체가 no-op인 통과를 막는다.
   production 함수·의존성·lockfile을 변경하지 않는다. 파일 300 LOC/함수 50 LOC 이내를 유지한다.
3. 기존 Linux native spec에 HWPX direct PDF를 추가한다. fixture hash/10쪽/A4/한글 표제/
   쪽별 text floor/nonblank/가장자리/원본 hash와 문서 상태 보존을 확인한다. PDF 분석 helper는 재사용한다.
4. 기존 CI에 `scope=pdf-cleanup-windows` 선택을 추가해 Windows Rust cleanup 테스트만 실행한다.
   기존 Linux GUI에는 `scope=pdf-hwpx`를 추가한다. full 기본 동작은 유지하고 좁은 선택에서는
   인쇄·thumbnail 검사를 명시적으로 skipped 처리하며 실제 실행한 항목만 success로 요구한다.
   제품 SHA/검증 harness SHA·artifact identity·실행 범위를 증거에 남긴다. 새로운 workflow 파일은 없다.

로컬 검증: `pnpm run typecheck:gui`, `pnpm run test:gui:contracts`,
`pnpm run test:gui:linux:contracts`, `node --test tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs`,
`pnpm run check:product-boundary`, 수정 Rust 파일 `rustfmt --check`, 수정 workflow `actionlint`, `git diff --check`.
실제 Windows test가 실행되기 전 Rust 성공으로 세지 않는다. Node 정적 계약과 실제 OS/PDF 검증도 구분한다.

로컬 통과 후 기존 원격 실행 checkpoint 예외로 소스/계획을 `publish/task19`에 게시한다.
CI의 Windows 제한 scope와 Linux GUI의 HWPX 제한 scope를 각각 한 번 실행한다.
Linux 제품은 `69b22650df96323a2c59e473d474ed3195cc9cc7`, native run `34021920074`의
미만료·SHA/digest/inventory를 재확인해 재사용한다. 새 Rust 변경은 `#[cfg(test)]` 파일뿐이므로
제품 실행 경로 동일성을 diff로 확인한다. Windows는 테스트 바이너리 컴파일만 하며 설치본을 만들지 않는다.
실패 시 해당 근거를 기록하고 자동 재시도·guard 완화·다른 suite 실행을 하지 않는다.
성공한 PDF의 생성 PNG는 PDF skill로 확인한다. 보고서/계획/orders는 결과 확인 뒤 묶는다.
이 단계 종료 후 #19 최종 보고/PR 승인을 요청하며 merge·release·issue close는 하지 않는다.

### 2026-09-07 Stage 4.19 보조 수집 분리 보정 승인

작업지시자의 후속 `진행해줘`로 정상 검증과 보조 tree 진단 분리를 승인받았다. 기존 #19/M010,
`local/task19`와 앞선 실패 기록 5개 문서의 미커밋 변경을 보존하고 같은 4.19 안에서 보정한다.
새 issue/branch·devel 재통합·별도 진단 workflow는 추가하지 않는다.

- 기존 `ConfirmationProbe` 관측-only 모드에서만 tree 수집을 활성화한다. 일반 PDF/Open 및
  확인/거절 실행 검증은 callback을 호출하지 않고 `disabled`/빈 노드를 기록한다.
  필수 dialog 탐색·의미/target/owner/identity/native guard·확인 adapter는 그대로 유지한다.
- 진단용 ControlType 직렬화는 실제 타입을 확인한 뒤에만 ProgrammaticName을 읽는다.
  null/미지원 값은 고정 `unavailable` 토큰으로 표현한다. 새 수집 전에 이전 snapshot을 비워
  실패가 과거 available로 보이지 않게 한다. 일반 예외/필수 판정 오류를 catch-all하지 않는다.
- 기존 실제 PS 회귀에 기본 비활성·명시 활성·callback 미호출·누락/다른 타입/정상 ControlType
  직렬화를 추가한다. 기존 PDF workflow의 설치 전 PS5.1 parser/정책/native/tree 검사를
  모든 mode에서 실행하여 긴 준비 전에 이 경계를 검증한다. Node 계약도 해당 연결을 검사한다.
- 수정 범위는 두 helper, 기존 PS/Node tree 회귀, PDF reusable workflow와 기존 가이드/사건 기록/
  plans/orders, 성공 시 4.19 보고서다. 공식 독자는 자동화 유지보수자이며 기존
  `docs/operations/NATIVE_UI_TESTING.md`를 유지한다. 새 공식 문서/manual은 만들지 않는다.
- 로컬 focused 계약·GUI typecheck·workflow/handoff·actionlint·diff 통과 후 실행용 checkpoint를
  `publish/task19`에 게시한다. 동일 제품 artifact의 유효성 확인 후 `windows-pdf-acceptance`를
  한 번만 실행해 PS 사전 검사와 실제 fresh/restart/기존 분석을 함께 확인한다.
  별도 작은 workflow·제품 재빌드·MSI/썸네일/updater/릴리즈·Mac native 검증은 실행하지 않는다.
- 원격 실행에 필요한 소스 checkpoint 뒤 결과 문서를 묶는 기존 예외를 유지한다.
  실패 시 근거를 남기고 자동 재시도/범위 확장을 하지 않는다. 전체 PDF 결과와 HWPX 조판 관측,
  #19의 동시 편집/reload/TTL 수용은 구분한다.

보정 후 로컬 focused 계약 **58/58**, workflow/handoff **83/83**(중복 import 포함), GUI
typecheck·actionlint·diff가 통과했다. 실제 PS 검사는 아래 Windows 실행에서 확인했다.
필수 guard/클릭 adapter와 제품 경로는 이전 checkpoint 대비 변경 없다.
기존 Windows artifact의 미만료·SHA/digest/크기도 재확인했다.

checkpoint `fdbf481858a3853f107a990725bdf46cc9c607c6`, run `34058443345`는 Windows **14분 45초**,
Ubuntu 분석 **36초** 모두 통과했다. PS 정책 62개/native 50개/tree 16개, HWP/HWPX fresh/restart
네 경로의 정확한 문서·원본/dirty 보존·PDF 저장·덮어쓰기와 cleanup을 확인했다.
Open/Save evidence 8개의 보조 tree는 모두 disabled다. PDF 4개/32쪽의 hash·쪽 수·검색·분석이
통과했고 fresh/restart 렌더는 앞서 시각 검토한 16쪽과 각각 byte-identical이다.
HWPX 표의 기존 셀 경계 밀착/잘림 관측은 유지하며 원본 조판 동등성이나 #19 전체 완료를
선언하지 않는다. [4.19 보고서](../working/task_m010_19_stage4.19.md)에 자동 회귀 검증 완료와
시각 한계를 구분한다. 다음은 동일 workflow 반복이 아니라 HWPX 조판 관측과 #19 고유
수용 경계의 남은 근거를 검토하는 단계이며 별도 승인받는다.

### 2026-09-07 Stage 4.19 전체 PDF 검증 재개 승인 — 4.21 adapter 사용

작업지시자가 4.21 보고 후 `진행해줘`로 기존 HWP/HWPX PDF 전체 회귀 검증을 승인했다.
새 구현 단계를 만들지 않고 미완료인 4.19를 재개한다. clean `local/task19`/열린 #19/M010을
유지하며 devel 재통합·새 issue/branch 생성은 하지 않는다.

- 제품 SHA `69b22650df96323a2c59e473d474ed3195cc9cc7`, native run `34021920074`,
  Windows artifact `9986364323`/123231295 bytes/digest
  `sha256:02c13e35d515d08c7793d315905125932a33209b8e63b1f750998a62b1226bdc`를 재사용한다.
  재개 전 미만료·동일 SHA/digest/크기를 확인했다.
- 4.21 실행 harness `b980e10` 이후 scripts/tests/workflow 변경 없음과 기존 제품 bytes 대비
  apps/crates/third_party/lockfile 변경 없음을 확인했다. 이번에는 제품/helper/workflow를 수정하지 않는다.
- 기존 Desktop dispatcher의 `windows-pdf-acceptance`, `confirmation_cases=all` 기본값,
  candidate SHA/native run 지정, `run_tests=false`, `publish_release=false`로 한 번 실행한다.
  Windows NSIS 설치 후 HWP/HWPX fresh/restart, 기존 Ubuntu PDF 분석을 그대로 수행한다.
- 네 결과의 정확한 문서·원본/dirty 보존·저장/덮어쓰기, hash·검색 marker·쪽 수/A4·쪽별 내용·
  빈 쪽/쪽 경계와 cleanup을 검토한다. PDF 스킬로 생성 PNG를 시각 확인하며 수치 통과와 구분한다.
  fresh/restart PNG가 byte-identical이면 동일 쪽은 중복 열람하지 않는다. 기존 HWPX 표 관측은
  확보된 앱 screenshot/결과와 대조하고, 원본 동등성 근거가 부족하면 미확정으로 남긴다.
- 변경 문서는 승인된 기존 plans/orders·사건 기록·공식 가이드 및 검증 완료 시 4.19 보고서뿐이다.
  실패 이력은 보존한다. 계획/결과 문서는 이번 단계 종료에 묶어 커밋하며, 코드가 같으므로
  새 실행 checkpoint 없이 이미 게시된 `910289e` harness를 사용한다.
- 변경 없는 로컬 계약/PS/작은 확인창 검증·제품 재빌드·MSI/썸네일/updater/릴리즈·Mac native
  검증은 반복하지 않는다. 실패 시 원인/범위를 기록하고 자동 보정/재시도하지 않는다.
  #19의 동시 편집/reload/TTL 등 별도 수용 경계를 이번 전체 PDF smoke 통과로 완료 처리하지 않는다.

재개 run `34056914386`은 **14분 27초 실패**다. fresh HWP/HWPX 저장·원본/dirty 보존은
통과했으나 HWP restart에서 보조 tree 수집기의 `ControlType.ProgrammaticName` 접근이
`PropertyNotFoundStrict`로 실패했다. 확인 adapter 호출 전이며 제품 덮어쓰기 결함으로
판정하지 않는다. HWPX restart·원격 analyze는 미실행, NSIS cleanup·WebView2 복구는 통과했다.
다운로드한 source/target hash 보존 및 fresh 두 PDF의 별도 분석은 통과했다. 16쪽 렌더는
앞서 시각 검토한 4.19 fresh 결과와 byte-identical이다. HWPX 동봉 미리보기와의 폰트/배치
차이는 확인했지만 현재 앱의 같은 위치 대조가 없어 원인·조판 동등성을 확정하지 않는다.
상세는 [사건 기록](../troubleshootings/task_m010_19_windows_pdf_automation.md)에 둔다.
당시 4.21의 제한 통과는 유지하고 4.19는 미완료로 남겼다. 자동 보정·재시도는 하지 않았다.
당시 다음 승인 권고는 **정상 PDF 경로에서 보조 tree 수집을 제외하고 명시적 진단 mode에 한정**하는
최소 보정이다. 필수 탐색/의미/target/owner/identity/native guard와 확인 adapter는 유지한다.
최상단 후속 승인과 보정 결과로 이어졌으며 이 실패 run 자체는 실패 상태를 유지한다.

### 2026-09-07 Stage 4.21 native 호출 보정·실제 앱 제한 검증 승인

#### 같은 단계의 보조 진단 보정·Confirm-only 후속 승인

작업지시자의 후속 `진행해줘`로 아래 보정을 승인받았다. 이전 실패 기록과 5개 미커밋 문서를
보존한다. 새 단계/이슈를 만들지 않고 4.21을 계속한다.

- 보조 tree 수집을 작은 `scripts/windows-pdf-tree-diagnostics.ps1`로 분리한다. 이미 관측한
  dialog root 안에서 최대 100개 노드를 순회하며 desktop 전체를 다시 열거하지 않는다.
  typed `ElementNotAvailableException` 및 제한된 InnerException 체인만 수집 불능으로 기록한다.
  노드는 비우고 상태/reason을 명시하며, 다른 예외와 필수 dialog/의미/identity 판정은 그대로 실패한다.
- 실제 수집 wrapper를 호출하는 `tests/windows-pdf-tree-diagnostics.test.ps1`에서 정상·직접/감싼
  typed 예외·동일 문구의 다른 예외·알 수 없는 오류와 정보 비노출을 검증한다. 합성 예외 회귀를
  실제 UI 전환 재현이라고 부르지 않는다. 기존 Windows 설치 전 PS5.1 단계에서 실행한다.
- 기존 dispatcher/reusable의 `confirmation_cases=all|confirm-only` 입력을 연결한다. 기본은 all이며
  confirm-only는 확인창 검증에서만 허용한다. 선택 사례를 증거와 cleanup에 기록/대조한다.
  새 workflow/mode는 만들지 않는다. spec은 같은 공개 HWP에서 Confirm 한 사례만 실행한다.
- 로컬 focused 계약·GUI typecheck·workflow/handoff·actionlint·diff 통과 후 checkpoint commit/push,
  기존 제품 SHA/native artifact를 재사용하는 원격 Confirm-only 한 번만 실행한다.
  Decline/WrongTarget·제품 빌드·전체 PDF는 반복하지 않는다. 클릭 adapter/안전 guard는 변경하지 않는다.
- 문서 위치는 승인된 기존 가이드/사건 기록/plans/orders와 성공 시 4.21 보고서를 유지한다.
  두 실행을 합친 부분별 증거임을 명시하며, 현재 harness의 세 사례 일괄 통과로 표현하지 않는다.

후속 구현의 focused Node 계약 **57/57**, workflow/handoff **82/82**(중복 import 포함),
GUI typecheck·actionlint·diff가 통과했다. 기본 세 사례 배열을 직접 찾던 정적 assertion은
선택 함수의 실제 동작 테스트와 spec 연결 검사로 갱신했다. PS5.1의 새 합성 예외 회귀 10개는
Windows 설치 전 실행 예정이며 로컬 통과라고 기록하지 않는다. 기존 제품 artifact는 미만료이고
SHA/digest/크기가 동일하다. 제품 파일과 클릭/안전 판정 helper는 checkpoint 이전 대비 변경 없다.

checkpoint `b980e10355fe7f8fe5841de131951c14a0f4b909`, run `34055921568`의 Windows job은
**8분 55초 통과**했다. 실제 PS 정책 62개·native 진단 50개·새 합성 예외 10개가 통과했다.
Confirm 한 사례에서 `Win32-BM_CLICK-command`, dialog 0개, PDF 교체/저장 완료와 source/other
보존·clean title을 확인했다. 앱 cleanup 뒤 세 hash 검사와 별도 다운로드 검사가 모두 통과했다.
target은 349190 bytes, SHA-256 `07b891d3b5669825ad4585ac701cd6d274c4e938bef9117852ad3980c3ef9b52`다.
최종 tree 상태는 available이며 같은 UI 전환 예외의 실제 재현·포착을 주장하지 않는다.
Stage 4.21은 이전 두 거절과 이번 확인의 부분별 증거로 완료한다. [보고서](../working/task_m010_19_stage4.21.md)에
두 harness 경계와 미실행 항목을 기록한다. HWPX/restart/전체 PDF와 #19 전체 완료는 별도다.

작업지시자가 4.20의 후속 권고를 승인했다. clean `local/task19`와 열린 #19/M010을 유지하며
신규 issue/branch 생성·devel 재통합은 하지 않는다. 기존 제품 SHA `69b22650df96323a2c59e473d474ed3195cc9cc7`,
native run `34021920074`/Windows artifact `9986364323`을 유효성 재확인 후 재사용한다.

- 공유 확인창 adapter는 기존 의미/정확한 target·owner/PID·command 유일성/재조회를 유지한다.
  UIA Invoke를 지원하면 기존 경로를 사용하며, 관측된 Pane/Invoke 미지원인 경우에만 native
  `Button` HWND에 `BM_CLICK`을 게시한다. 실패 뒤 다른 API로 재시도하지 않는다.
- 두 command의 서로 다른 nonzero HWND와 재조회 동일성, 각각의 native guard 및 dialog 활성
  상태를 확인한다. 숫자 ID 0/6/7로 탐색하지 않는다. 메시지 게시와 실제 저장/취소를 구분한다.
  비활성·모호한 후보·wrong target은 fail-closed이며 전역 키/좌표/강제 활성화는 추가하지 않는다.
- 기존 reusable/dispatcher에 `windows-pdf-dialog-verify` mode를 연결한다. 한 fresh session에서
  공개 HWP 복사본 한 개만 열어 Decline, WrongTarget 거부 후 Decline, Confirm을 검사한다.
  두 거절은 저장창 복귀·Cancel·sentinel/source/다른 target 불변, 확인은 같은 sentinel의 PDF
  교체·저장 완료·clean title·원본/다른 target 보존과 출력 header/EOF를 검사한다.
  시험 target은 고유 output에 새로 만들며 사용자 문서를 덮어쓰지 않는다.
- 기존 관측-only spec은 유지한다. 새 짧은 spec/거절 helper를 기존 PDF helper에 연결한다.
  앱 정리 뒤 expected source/target/other hash를 다시 검사한다. raw 증거와 실패 업로드를 유지한다.
- 예상 수정: 기존 policy/observation/confirmation/Win32/dialog 및 진단 필터, 새
  `scripts/windows-pdf-confirmation-verify.ps1`, `tests/gui/specs/windows-confirmation-verify.e2e.ts`,
  기존 config/두 workflow/PS·Node 계약. 새 파일 300 LOC/함수 50 LOC 이내. 기존 대형
  dispatcher/계약 suite와 dialog 상태 루프는 필요한 연결만 추가하며 이 크기 예외를 유지한다.
- 검증: focused Node 계약·GUI typecheck·workflow/handoff 계약·actionlint·diff. 원격 설치 전에
  PS5.1 parser·실제 policy/native 진단 테스트로 중복 HWND/미지원 capability/비활성/guard 거부를
  검사한다. checkpoint commit/push 후 실제 앱 제한 run 한 번. 실패 시 원인/증거를 기록하고
  같은 전체 테스트 반복·임의 API 변경은 하지 않는다.
- 문서 위치는 승인된 기존 가이드/사건 기록/plans/orders와 성공 시 Stage 4.21 보고서다.
  제품 재빌드·HWPX·restart·편집/IME·전체 PDF 품질/Ubuntu 분석·MSI/썸네일/updater/릴리즈는 제외한다.
  HWPX 표 대조와 4.19/#19 전체 수용은 이 단계 성공 여부와 별개로 남긴다.

구현 후 로컬 focused 계약 53개·workflow/handoff 78개(중복 import 포함), GUI typecheck,
actionlint·diff 검사가 통과했다. artifact metadata의 SHA/digest/크기·미만료 상태를 재확인했다.
checkpoint `816edd5aa3366a1c88c98e2596952b935eaecbfe` 게시 후 원격 한 번을 실행했다.

결과: run `34053001644`는 **11분 8초 실패**다. 실제 PS 정책 62개·native 진단 50개,
Decline 및 WrongTarget 거부 뒤 Decline은 통과했다. 새 HWND 메시지 경로로 No·저장창 복귀·
Cancel·앱 이전 상태 복구·source/target/other 보존을 확인했다. Confirm은 호출 전 기존
`Read-AppTree`의 desktop-wide `FindAll`(helper 59행)에서 `ElementNotAvailableException`이
발생해 중단했다. 필수 버튼/의미 판정이 아니라 보조 진단 열거가 실패 원인이다.
어느 노드가 사라졌는지는 로그만으로 확정하지 않는다. Confirm의 `overwriteConfirmed=false`,
`confirmationObservation=null`이며 PDF를 만들지 않았다. NSIS cleanup·WebView2 복구는 통과했다.
정리 후 검증 step은 전체 결과 미완료를 정상적으로 거부했고, 다운로드한 세 파일의 SHA-256이
모두 최초 값과 일치함을 별도로 확인했다. 이를 해당 step 성공으로 소급하지 않는다.

첫 실행 당시 Stage 4.21은 미완료여서 단계 완료 보고/커밋·추가 실행을 보류했다. 당시 승인 권고는
**보조 트리 진단의 좁은 탐색·ElementNotAvailable 예외 격리와 남은 Confirm 한 사례 검증**이다.
필수 target/owner/identity/native guard와 호출 adapter는 그대로 유지하고 해당 오류를
저장 성공으로 바꾸지 않는다. 진단 unavailable을 명시하며 일반 예외/필수 판정 오류는 삼키지
않는다. 예외 분류 회귀와 같은 설치 bytes의 Confirm-only 실행만 추가하고 이미 통과한
두 거절 사례·제품 재빌드·전체 PDF를 반복하지 않는 범위였다. 이후 위 후속 승인과 검증으로
완료했으며 이 실패 run 자체는 실패 상태를 유지한다. 상세는 사건 기록에 둔다.

### 2026-09-07 Stage 4.20 실제 앱 확인창 최소 진단 승인

작업지시자가 4.19의 Invoke 미지원 결과 뒤 실제 앱 확인창만 대상으로 하는 최소 진단을
승인했다. 같은 issue/branch에서 미커밋 실패 기록을 보존한다. 제품 SHA/native run/artifact는
4.19와 같으며 유효성 재확인 뒤 기존 bytes를 설치한다.

- 기존 PDF reusable/dispatcher에 `windows-pdf-dialog-probe`를 추가한다. 한 fresh session에서
  공개 HWP 복사본만 열고 새로 만든 sentinel `.pdf`에 저장 요청한다. 실제 PDF 생성·marker 입력·
  HWPX·restart·Ubuntu analyze는 실행하지 않는다. 기존 driver/설치/권한/cleanup 경계를 재사용한다.
- 별도 짧은 spec은 기존 dialog helper에 관측-only switch를 전달한다. helper는 기존 파일·Save
  의도·정확한 prompt/target·owner/PID를 검사한 뒤 두 command의 UIA/native 속성만 수집하고
  `observed`를 반환한다. 확인창 Yes/No를 호출하지 않는다. sentinel/source hash 불변을 확인하며
  modal/앱 종료는 기존 설치본 cleanup에 맡긴다. 이것을 사용자 Cancel 성공으로 기록하지 않는다.
- 기존 확인창 adapter의 관측 부분과 native snapshot을 실행 부분에서 추출해 함께 사용한다.
  Invoke 조건/guard는 유지한다. native class·control ID·dialog 활성 상태·13개 guard,
  UIA type/pattern을 허용된 구조로 기록하며 원문 prompt·문서 본문·경로는 새 진단에 넣지 않는다.
- 예상 파일: 기존 `scripts/windows-pdf-{dialog,confirmation,win32}.ps1`, 새
  `scripts/windows-pdf-confirmation-probe.ps1`, 새 `tests/gui/specs/windows-confirmation-probe.e2e.ts`,
  기존 Wdio config/두 workflow/focused 계약. 새 파일 300 LOC·함수 50 LOC 이내.
  기존 대형 dispatcher/계약 suite는 이번 진단에 필요한 연결만 추가하며 구조 분리하지 않는다.
- 검증: focused Windows contracts·GUI typecheck·workflow/handoff contracts·actionlint·diff,
  Windows PS5.1 parser 및 기존 policy/native 진단 tests를 원격 probe의 사전 단계로 연결한다.
  checkpoint commit/push 후 원격 진단 한 번. 관측 결과와 호출 성공을 구분하며 API 변경/전체
  재실행은 별도 승인이다. 기존 가이드·사건 기록·plans/orders 및 진단 완료 시 4.20 보고서만 갱신한다.
- HWPX 표의 원본 대조는 이번 확인창 진단에 섞지 않고 미확정 관측으로 유지한다.

구현 후 focused Node 계약 51개, workflow/handoff 계약 76개(중복 import 포함), GUI typecheck,
actionlint와 diff 검사가 통과했다. 기존 artifact의 SHA/digest/크기와 유효성도 다시 확인했다.
checkpoint `f090ea0c7e22544829c3c2a6d0cf76c17f64a0fe` 게시 후 관측-only를 한 번 실행했다.

결과: run `34051827068`은 **8분 34초 통과**했다. Windows PS5.1 parser·정책 50개·native
진단 23개가 통과했다. 실제 앱의 두 command는 UIA Pane/Invoke 미지원, native `Button`이며
각각 13개 guard가 모두 true이고 dialog가 active였다. `GetDlgCtrlID` 반환값은 둘 다 0으로,
숫자 6/7 또는 유효한 고유 native ID가 확인된 것은 아니다. 오류 코드와 두 HWND의 상호
동일성은 이번 자료에 없어 추정하지 않는다. source/sentinel hash는 관측 시점·앱 cleanup 뒤·
내려받은 파일에서 모두 불변이다. NSIS cleanup·WebView2 정책 복구도 통과했다.
`observed`/`commandInvoked=false`/`pdfTested=false`이며 실제 확인·거절·PDF 성공이 아니다.
Stage 4.20은 진단 완료로 [보고서](../working/task_m010_19_stage4.20.md)에 기록한다.

다음 승인 권고는 기존 의미/대상·UIA command 유일성/재조회와 native guard를 유지한
HWND 기반 `BM_CLICK` adapter 및 실제 앱 단일 HWP의 제한된 호출 검증이다. native 숫자 ID로
선택하지 않으며 두 command의 HWND가 별개인지와 활성 상태도 호출 전에 검증해야 한다.
이 API는 관측된 native class에 근거한 후보이지 검증된 제품 지원이 아니다. 승인 뒤 실제
Confirm/Decline·잘못된 target 거부와 파일 사후 조건을 확인하고, 전체 PDF 수용은 그 뒤 별도
승인한다. 다른 API의 연쇄 시도·강제 활성화·제품 재빌드는 추가하지 않는다. 아직 구현하지 않았다.

### 2026-09-07 Stage 4.19 기존 설치본 전체 PDF 검증 승인

작업지시자가 Stage 4.18 결과 뒤 `진행해줘`로 기존 설치본의 실제 HWP/HWPX PDF 전체 검증을
승인했다. #19/`local/task19`를 유지한다. 제품·helper·workflow는 변경하지 않고 4.18에서
검증한 adapter를 그대로 사용한다. 변경 파일은 기존 plans/orders·사건 기록·공식 가이드의
검증 상태와 성공 시 `working/task_m010_19_stage4.19.md`뿐이며 기존 승인 문서 위치를 유지한다.

- 제품: `69b22650df96323a2c59e473d474ed3195cc9cc7`, 성공한 native run `34021920074`.
- 사전 확인: Windows artifact `9986364323` / `alhangeul-desktop-windows-x64`,
  123231295 bytes, 만료 아님(만료 예정 `2026-09-20T09:07:23Z`).
  digest `sha256:02c13e35d515d08c7793d315905125932a33209b8e63b1f750998a62b1226bdc`.
- 실행: 기존 Desktop dispatcher `windows-pdf-acceptance`, candidate SHA와 native run 지정,
  `publish_release=false`, 한 번. 기존 Windows job이 artifact provenance/digest/inventory를
  검증하고 NSIS 설치 후 HWP/HWPX fresh/restart를 수행한다. Ubuntu analyze job은 생성 PDF의
  hash·한글 marker·쪽수/A4·쪽별 text·blank/clipping을 검사하고 모든 쪽 PNG를 만든다.
- 검토: 네 PDF 결과·원본/dirty 보존·overwrite 증거와 cleanup을 확인한다. 생성된 PNG도
  시각 검토하며 수치 검사만으로 시각 통과를 선언하지 않는다. 개인 문서 대신 기존 공개 fixture만 쓴다.
- 로컬: 4.18 이후 scripts/tests/workflow 변경 없음 확인, 문서 링크·diff 검사.
  변경 없는 로컬 suite와 작은 Windows 통합을 반복하지 않는다.
- 제외: 제품 재빌드·MSI/썸네일/updater 반복·릴리즈/배포·Mac native 검증. 환경 준비용 기존
  driver 설치는 Windows job에서 그대로 수행한다. 실패하면 증거를 분류하고 자동 보정/재시도하지 않는다.

결과: harness `23b631d03ee84cce631c3e798ffb4875d39297bc`, run `34049930142`는 실패했다.
HWP 6쪽/HWPX 10쪽 fresh 저장·source/dirty 보존은 통과했으나 실제 HWP restart 확인창의
InvokePattern 미지원으로 호출 전 중단했다. 작은 WinForms fixture와 실제 앱의 capability 차이를
확인했으며 native button guard까지 도달하지 않았다. HWPX restart·원격 analyze는 skipped다.
NSIS cleanup·WebView2 정책 복구는 통과했다. 전체 PDF summary/단계 완료 보고는 만들지 않는다.
받아둔 fresh PDF 두 개만 로컬 Poppler 26.07.0으로 별도 분석했다. hash·검색 marker·쪽수/A4·
쪽별 text·blank/page-edge 검사는 통과했고 16쪽 PNG를 열람했다. HWPX 홀수 쪽 상단 표의 긴
문구가 우측 셀 경계에 밀착하는 관측은 원본 대비 미확정으로 남긴다. Mac 앱 검증은 아니다.
상세 근거·다음 승인 범위는 [사건 기록](../troubleshootings/task_m010_19_windows_pdf_automation.md)에 둔다.

### 2026-09-07 Stage 4.18 확인창 adapter·작은 통합 승인

작업지시자가 4.17 결과와 미확정 제품 capability를 확인하고 다음 구현을 승인했다.
같은 #19 브랜치를 유지한다. 확인창은 native owner가 직전 저장창이며 같은 PID인지,
Save/기존 파일/제출 경로와 관측된 영문 대체 질문의 파일명이 일치하는지 검사한다.
`CommandButton_6/7`·`CCPushButton`의 유일성·enabled·HWND/부모·InvokePattern을 재조회하고
확인된 UIA Invoke만 호출한다. ControlType.Button/Panes를 지원 여부로 추측하지 않는다.
일반 파일창 취소는 검증된 ID2 native 버튼으로 처리한다. 다른 API fallback은 추가하지 않는다.

- 코드: `scripts/windows-pdf-confirmation.ps1`, 기존 policy/observation/Win32/dialog helper.
  실제 PDF helper와 작은 통합이 같은 확인창 adapter를 호출한다.
- 테스트: 기존 실제 PS 정책 suite에 prompt/command 선택 거부 사례 추가.
  `tests/gui/windows-dialog/`의 integration host/support/runner에서 열기·새 저장·overwrite·
  No 후 취소·다른 target 거부의 다섯 사례를 실행한다. 공개 sentinel만 다루고 host는 OK 및
  정확한 fixture 경로를 확인한 경우에만 지정 파일에 새 sentinel을 쓴다. PDF 렌더링은 아님.
- workflow: 기존 reusable에 verify 입력, dispatcher에 `windows-dialog-verify` mode 추가.
  관측-only mode는 유지하고 통합 mode는 정책 검사 뒤 다섯 사례만 실행한다. 기존 8분 상한,
  읽기 전용·no retry·always cleanup/증거 정책을 재사용한다. 제품 설치/build/서명 없음.
- 검증: focused Node 계약, workflow inventory, GUI typecheck, actionlint, diff 후 checkpoint
  commit/push 및 작은 Windows 통합 한 번. 실패를 전체 E2E 반복으로 우회하지 않는다.
- 문서: 승인된 기존 공식 가이드·사건 기록·plans/orders/working만 갱신한다.
  새 의존성 없음. 새 파일 300 LOC/함수 50 LOC 이내로 역할을 분리한다.

실행 결과: run `34048114390`/harness `f198449`의 PS 50개·Open·Fresh·cleanup은 통과했다.
Overwrite는 실제 Invoke 직전 native 재검증에서 실패했고 Decline/WrongTarget은 미실행이다.
당시에는 **Stage 4.18 미완료**로 완료 보고서를 보류했다. 원인 후보와 증거 한계는
[사건 기록](../troubleshootings/task_m010_19_windows_pdf_automation.md)에 둔다.
첫 실행 로그에는 native 세부 조건이 없어 당시 UIA/native class 동일성 가정을 의심했다.
이후 아래 후속 승인의 진단으로 class 조건이 원인임을 확인했다. 4.19 전체 PDF 수용은 진행하지 않는다.

#### Stage 4.18 후속 승인 — native 실패 조건 진단

작업지시자의 후속 `진행해줘`로 guard별 진단과 작은 Windows 재검증 한 번을 승인받았다.
기존 비교 조건·Invoke 방식은 유지한다. native 관측과 검증은 같은 구조화 snapshot을 사용하고
실패 예외에 알려진 guard의 boolean과 native class만 첨부한다. UIA class와 별도 필드로 저장한다.
제품 helper와 integration catch가 같은 허용 목록 기반 추출 함수를 사용하며 원문 경로·본문·
임의 예외 메시지는 새로 기록하지 않는다. 관측 불능도 명시적으로 거부한다.

- 수정: Win32/helper, integration runner, 작은 workflow의 사전 진단 테스트 연결,
  기존 Node 계약. 신규: `scripts/windows-pdf-native-diagnostics.ps1`,
  `tests/windows-pdf-native-diagnostics.test.ps1` (각 파일 300 LOC/함수 50 LOC 이내).
- 테스트: 실제 native 판정 함수를 합성 guard 데이터로 검사하고 실패 필드 누락·타입 오류·
  exception unwrap/허용 목록을 PS5.1에서 확인한다. native HWND 0도 클릭 없이 거부한다.
- 검증: focused Node 계약·workflow 계약·GUI typecheck·actionlint·diff 뒤 checkpoint 게시,
  기존 `windows-dialog-verify` 한 번. 실패 이유를 수집해도 통합 성공으로 바꾸지 않는다.
- 문서 위치는 기존 승인된 공식 가이드·사건 기록·plans/orders다. 이전 미커밋 실패 기록을
  보존하며 같은 변경에 포함한다. guard 수정·다른 클릭 API·전체 PDF 실행은 이번 범위 밖이다.

결과: run `34048778670`/harness `5096438`에서 PS 정책 50개·진단 22개·Open/Fresh·cleanup이
통과했다. Overwrite의 13개 native guard 중 `buttonClassMatches`만 false였다.
UIA `CCPushButton`과 달리 native class는 `Button`이다. 이 잘못된 동일성 가정을 확인했으며
진단 목적은 달성했다. 당시 Stage 4.18 통합은 실패로, Invoke/Decline/WrongTarget은 미실행이었다.
당시 다음 승인 요청은 UIA 조건·다른 guard·Invoke 방식을 유지한 native class 비교 보정과
작은 통합 재검증 한 번이었다. 아래 후속 승인 전에는 비교 보정을 적용하지 않았다.

#### Stage 4.18 후속 승인 — 관측된 native class로 비교 보정

작업지시자의 후속 `진행해줘`로 비교 보정과 작은 Windows 통합 한 번을 승인받았다.
`scripts/windows-pdf-win32.ps1`의 native button class 기대값만 `Button`으로 바꾼다.
UIA selector의 `CCPushButton`, 다른 12개 native guard, 의미/대상 검증, InvokePattern,
실제 파일 사후 조건은 유지한다. 기존 PS 진단의 합성 class 값과 Node 계약도 이를 반영한다.
새 helper·workflow·의존성·제품 변경은 없다. 이전 실패 기록을 같은 승인 범위에서 보존한다.

focused Node 계약, GUI typecheck, actionlint, diff 검사 후 checkpoint commit/push하고
기존 `windows-dialog-verify` 한 번을 실행한다. 정책/진단과 Open·Fresh·Overwrite·Decline·
WrongTarget이 모두 통과해야 4.18 완료 보고를 작성한다. 실제 제품 PDF 수용은 4.19 별도 승인이다.
문서는 기존 승인된 가이드·사건 기록·plans/orders와 `working/task_m010_19_stage4.18.md`를 쓴다.

결과: run `34049005561`, harness `d553f8ef4e3711f19828d3d297a8f1355981e8be`에서 **43초 통과**.
PS 정책 50개·native 진단 22개, Open/Fresh/Overwrite/Decline/WrongTarget 5개와 cleanup을
확인했다. Overwrite는 실제 Invoke 승인·정확한 target 갱신, Decline은 No 후 저장창 복귀·Cancel·
세 파일 보존, WrongTarget은 잘못된 요청의 거부 뒤 취소·보존까지 통과했다.
Stage 4.18은 완료이며 [보고서](../working/task_m010_19_stage4.18.md)에 한계를 기록한다.
제품/PDF는 미실행으로, 4.19의 기존 설치본 전체 검증은 별도 승인 대기다.

### 2026-09-07 Stage 4.17 판단 분리·작은 Windows 관측 승인

실제 helper가 사용하는 `windows-pdf-dialog-policy.ps1`와 UIA 관측 adapter를 분리한다.
ID/class뿐 아니라 가장 가까운 dialog/PID, enabled, 후보 중복을 검사하며 클릭 직전에
재조회와 native 검증을 한다. 확인창 의미 adapter는 아직 없으므로 legacy ID6도 ID만으로
자동 승인하지 않는다. 순수 overwrite 정책은 합성 입력으로 검사하고 실제 helper는
미확정 의미/대상을 거부한다. 이 제한은 4.18 관측 기반 adapter로만 해제한다.

- 코드: policy/observation helper, 기존 dialog/Win32, 실제 함수를 dot-source하는
  `tests/windows-pdf-dialog-policy.test.ps1`, 관측 ID/class 축약 fixture.
- OS 관측: `tests/gui/windows-dialog/`의 자체 fixture host/probe. Windows PowerShell 5.1
  STA에서 공개 임시 파일·WinForms SaveFileDialog만 사용한다. 실제 Win32 helper를 로드하고
  새 경로가 아닌 기존 fixture target을 제출해 확인창까지 관측하되 Yes를 호출하지 않는다.
  시험 process만 종료하고 hash 불변·정확한 임시 폴더 삭제 결과를 남긴다.
- workflow: `windows-dialog-probe` dispatcher mode와 `alhangeul-windows-dialog.yml`.
  windows-2025, contents read, 8분 job 상한, 자동 retry 없음, always 증거 업로드.
  policy 테스트 실패 시 native 관측은 실행하지 않는다. 설치·build·submodule·서명 없음.
- 검증: focused Node 계약, GUI typecheck, actionlint, 변경 범위·diff 검사 후 원격 한 번.
  원격 실행에는 커밋된 harness가 필요하므로 구현 checkpoint를 먼저 게시하고, 실제 Windows
  결과가 통과한 뒤 단계 완료 보고를 기록한다. 예상 밖 관측은 troubleshooting에 남기고 중단한다.
- 문서: 수행계획서에서 승인된 기존 공식 가이드·사건 기록·orders/working만 갱신한다.
  신규 외부 의존성 없음. PowerShell 동작·native 관측·제품 수용 결과를 구분한다.

결과: run `34047467032`/harness `cd77b57`에서 PS 검사 28개와 제어된 확인창 관측·cleanup이
27초에 통과했다. 실제 제품은 미실행이다. WinForms는 InvokePattern을 제공하지만 이전 제품
관측은 Pane이므로 capability를 일반화하지 않는다. 다음 adapter는 관측된 InvokePattern만
후보로 하며, 구현·작은 통합 검증은 Stage 4.18 승인 뒤 진행한다.

### 2026-09-07 Stage 4.16 재발 방지 지식·동작 회귀 연결 승인

공통 native UI 가이드와 사건 기록, 기존 실행 경로가 쓰는 문서 identity·PDF evidence
판정 함수의 재현 데이터 테스트를 묶는다. 수행계획서의 새 문서 위치 판단을 적용한다.
기존 branch/issue를 유지하며 제품·helper·workflow 및 Win32 adapter는 바꾸지 않는다.
증거 재생은 실제 UI 조작이나 PDF 렌더링 검증이 아니며, ID 충돌/미지원 확인창의
native 동작 테스트 공백은 숨기지 않고 가이드의 현재 상태·후속 항목에 명시한다.

- 신규: `docs/operations/NATIVE_UI_TESTING.md`,
  `mydocs/troubleshootings/task_m010_19_windows_pdf_automation.md`,
  `tests/fixtures/windows-pdf-regressions.json`, `tests/windows-pdf-regressions.test.mjs`.
- 수정: 기존 개발 안내·docs 인덱스·릴리즈 체크리스트의 링크,
  `package.json` focused 명령과 `test:automation` 등록, plans/orders/단계 보고서.
- 검증: `pnpm run test:gui:windows:contracts`, `pnpm run typecheck:gui`,
  문서 상대 링크/앵커·fixture 원본 대조·`git diff --check`.
- 결과 기록: Stage 4.16 가이드/판정 회귀만 완료 여부를 판단한다. 이전 전체 Windows
  run `34043594332`의 overwrite 실패를 통과로 바꾸지 않으며 긴 workflow는 재실행하지 않는다.

### 2026-09-07 Stage 4.15 버튼 ID/class 충돌 보정 승인

작업지시자가 ID1 파일 목록 항목과 실제 버튼의 충돌 보정 및 open-only 재검증을 승인했다.
공통 버튼 탐색을 ID AND class Button으로 제한하고 중복 버튼은 실패 처리한다. submit과
기존 ID6 확인 버튼만 이 탐색을 사용하며 진단용 Find-Id는 유지한다. helper/계약 테스트 및
내부 plans/working만 수정한다. focused 계약·diff 후 동일 제품으로 open-only 한 번을 실행한다.

### 2026-09-07 Stage 4.14 Open 제출 방식 비교 승인

작업지시자가 Open 버튼 제출 방식을 동일 native BM_CLICK으로 고정한 비교 진단을 승인했다.
Open mode의 ID1에만 native 경로를 우선하며 Save/overwrite의 기존 경로는 보존한다.
입력·포커스·fixture·제품 artifact·workflow 조건은 유지한다. helper와 계약 테스트 및 내부
plans/working만 수정한다. focused 계약·diff 검증 후 open-only 한 번을 실행하고 결과를 확인한다.

### 2026-09-06 Stage 4.13 Native 포커스 확인 승인

작업지시자가 UIA 포커스 대신 앱 소유 HWND의 native 포커스 지정·검증과 open-only 재실행을
승인했다. helper의 PID/class/ID/자식 검증 뒤 WM_NEXTDLGCTL을 게시하고 GetGUIThreadInfo의
hwndFocus가 해당 Edit인지 최대 2초 확인한다. 전역 키 입력·AttachThreadInput은 사용하지 않는다.
두 helper·계약 테스트·내부 plans/working만 수정한다. focused 계약·GUI typecheck·diff 확인 후
같은 제품 artifact로 open-only 한 번을 실행한다. 제품/릴리스 변경은 하지 않는다.

### 2026-09-06 Stage 4.12 Open 전용 진단 승인

작업지시자가 파일 열기 경계를 좁혀 검증하도록 승인했다. 기존 #19 브랜치를 유지한다.
기존 dispatcher/reusable workflow에 open-only 진단을 추가하고 같은 fixture 두 개를 새
session으로 열어 정확한 title identity만 확인한다. PDF 편집/저장/분석은 실행하지 않으며
진단 통과를 PDF 수용으로 오인하지 않도록 증거 이름·scenario를 구분한다.
입력 전 UIA SetFocus와 HasKeyboardFocus를 확인하는 최소 보정으로 포커스 가설을 검사한다.
포커스 실패 시 즉시 중단하고 우회하지 않는다. 제품·driver·timeout 변경은 제외한다.
변경은 두 workflow, 기존 PDF config/spec/helper/계약 테스트와 내부 plans/working이다.
GUI typecheck·focused contracts·actionlint·diff 검사 후 게시하고 Open 전용 진단을 한 번
실행한다. 문서 위치는 기존 내부 plans/working이며 공식 제품 문서는 변경하지 않는다.

### 2026-09-06 Stage 4.11 재사용 가능한 문서 identity 검증 승인

작업지시자는 Windows NSIS 수동 HWP/HWPX PDF 저장·검색/쪽수/시각 확인·원본 보존·
재실행 덮어쓰기를 문제없이 완료했다고 보고했다. 사용자 보고 증거이며 exact 설치 SHA와
OS 상세 버전은 별도 제공되지 않았으므로 원격 exact-SHA 자동 통과로 치환하지 않는다.
반복 수동 검증을 요구하지 않는다. 자동화 보정은 장기 회귀 검증의 신뢰성을 위한 승인 범위다.

기존 local/task19에서 이어가며 브랜치/이슈를 새로 만들지 않는다. PDF spec에서 편집 전
정확한 문서 title identity를 검증하고 증거·분석기에 반영한다. 재사용 pure helper와 실제
실패 사례의 회귀 테스트를 추가한다. Win32 Edit 입력을 Open/Save 공통 편집 경로로 통일하고
입력/버튼 방식별 진단 및 예상치 못한 추가 modal의 빠른 실패를 추가한다. 무조건 Yes 클릭,
기대 경로 완화, timeout 증가, 제품 변경은 제외한다. helper/spec/analyzer/계약 테스트 및
내부 plans/working/orders만 수정한다. 공식 제품 문서는 변경하지 않는다.
검증은 GUI typecheck, Windows PDF·GUI 계약, diff check로 제한한다. 원격 재실행은 단계
보고 후 진행하며 사용자 수동 통과와 자동화 미완료를 구분한다.

### 2026-09-06 Stage 4.10 저장 파일명 편집 반영 승인

작업지시자가 입력 문자열과 실제 저장 파일명 불일치의 helper 보정 및 재검증을 승인했다.
Save fallback만 EM_SETSEL/EM_REPLACESEL의 실제 Edit 편집 경로로 바꾸고 readback 및
최종 PDF 경로 검증은 유지한다. 이미 확인된 Open 경로는 변경하지 않는다.
제품 코드·workflow·드라이버는 수정하지 않으며 helper/계약 테스트와 내부 plans/working
기록만 수정한다. focused 계약·diff 검증 후 동일 제품 artifact로 PDF acceptance를 한 번 실행한다.
로컬 계약 검증은 Windows 메시지 실행의 증거가 아니므로 원격 결과와 구분한다.

### 2026-09-06 Stage 4.9 열기/저장 입력칸 구분 승인

작업지시자가 관측된 Open=1148, Save=1001 입력칸 구분 보정과 재검증을 승인했다.
두 Windows helper와 전용 계약 테스트, plans/working 내부 기록만 수정한다.
선택 mode에서 기대하는 ID만 허용하며 PID·class·dialog 자식 검증은 유지한다.
focused 계약·diff 검증 후 기존 제품 artifact로 PDF 전용 검증을 실행한다.

### 2026-09-06 Stage 4.8 Win32 대화상자 fallback 승인

작업지시자가 Pane으로 노출되는 파일명 입력칸/버튼의 Win32 fallback과 재검증을 승인했다.
`scripts/windows-pdf-win32.ps1`에 HWND·process·dialog 자식·class·control ID 검증과
bounded WM_SETTEXT/readback, BM_CLICK을 분리한다. 기존 helper는 UIA pattern이 없을 때만
fallback을 호출한다. 좌표 클릭·전역 키 입력·제품 수정은 제외한다.
helper/전용 계약 테스트 및 plans/working 내부 기록만 수정한다. focused 계약·diff 검증 후
동일 제품 artifact로 한 번 재실행하며 실제 수용 결과와 구현 검증을 구분한다.

### 2026-09-06 Stage 4.7 대화상자 대기 경계와 진단 보정 승인

작업지시자가 첫 Windows PDF timeout의 최소 harness 보정 및 재실행을 승인했다.
메뉴 클릭 완료 뒤 native helper를 실행해 90초를 전부 대화상자 조작에 사용한다.
helper는 앱 소유 UIAutomation tree(값·문서 내용 제외), process ID, 진행 상태와 시간을
성공·실패 모두 기록한다. 제품 코드나 드라이버 버전은 변경하지 않는다.
spec/helper/전용 contract 및 plans/working 내부 기록만 수정하고 GUI typecheck·focused
contract·diff 검증 뒤 기존 제품 artifact로 한 번 재실행한다.

### 2026-09-06 Stage 4.6 기존 dispatcher 연결 승인

작업지시자가 새 workflow의 default branch 미등록(404)을 해결하기 위해 기존 Desktop
dispatcher에 `windows-pdf-acceptance` 모드를 연결하고 원격 검증까지 이어가도록 승인했다.
신규 PDF workflow에 `workflow_call` 입력을 추가하고 기존 acceptance candidate/run 입력을
PDF buildRef/nativeRunId로 전달한다. 기존 build·updater·publish 조건은 유지한다.
변경 파일은 두 workflow와 Windows PDF focused contract, 이 계획 및 단계 보고서다.
문서는 내부 작업 증거인 기존 plans/working 경로에만 둔다. 제품 소스와 default branch는
변경하지 않는다. focused contracts·actionlint·diff check 후 커밋/게시하고 기존 산출물로 실행한다.

### 2026-09-06 Stage 4.5 Windows PDF 최소 자동화 승인

작업지시자가 Windows 자동화 기반을 재사용하는 최소 PDF 검증 구현을 승인했다.
과거 4.1~4.3의 Windows harness 부재 판단은 당시 상태로 보존하며, 이번 범위에는 적용하지 않는다.

- `.github/workflows/alhangeul-windows-pdf.yml`, `tests/gui/wdio.windows-pdf.conf.ts`,
  `tests/gui/windows-pdf/`, `tests/gui/specs/windows-pdf.e2e.ts`,
  `scripts/windows-pdf-dialog.ps1`과 focused contract test를 추가한다.
- 승인된 제품 SHA `69b22650df96323a2c59e473d474ed3195cc9cc7`의 기존 artifact를 검증해
  NSIS만 설치한다. acceptanceRef와 buildRef를 구분하고 제품 재빌드·서명·배포는 하지 않는다.
- 실제 파일 대화상자에서 HWP/HWPX를 열고 편집 입력, PDF 저장, source hash·dirty 보존을
  검증한다. 별도 앱 프로세스 재실행 후 같은 target 덮어쓰기를 확인한다.
- Windows에서 생성한 PDF를 Linux Poppler로 페이지 수·검색 text·nonblank 검사하고 PNG로 남긴다.
  HWP는 고정 6쪽, HWPX는 편집 전후 앱 page count를 증거로 기록한다.
- 동시 편집 snapshot, WebView reload, TTL 실제 회수와 시각적 조판 판정은 이 smoke의
  완료 범위가 아니다. native/unit 증거와 혼동하지 않는다. #35 전체 GUI 범위는 확장하지 않는다.
- 현재 호스트 검증: GUI typecheck, focused Windows PDF/handoff/PDF analysis contracts,
  product boundary, workflow actionlint와 diff check. Windows 실행은 구현 단계 보고 후 승인받는다.
- 테스트의 단일 fixture 흐름은 50 LOC를 초과한다. open→edit→export→source/dirty 확인을
  하나의 try/finally 증적 경계로 읽을 수 있도록 유지하며 제품 함수에는 적용하지 않는다.
- 문서 위치: 내부 작업자 대상 승인·결과 기록만 기존 `mydocs/plans`, `mydocs/working`,
  `mydocs/orders`에 둔다. 공식 제품 문서·manual은 수정하지 않는다.

### 2026-09-06 Stage 4 원격 수용 진행 결과

작업지시자가 Stage 4.4 이후 원격 수용 진행을 승인했다. 제품 후보는
`69b22650df96323a2c59e473d474ed3195cc9cc7`로 고정했다.
최신 desktop workflow가 native test/Clippy와 플랫폼 중립 검사를 포함하므로 별도 CI는
중복 실행하지 않았다. 기본 matrix의 arm64도 기존 workflow 범위대로 함께 검사했다.
artifact mode·run_tests=true·publish_release=false만 사용하며 서명/게시 mode는 실행하지 않았다.

최초 dispatch 34021826744는 에이전트가 짧은 SHA를 입력해 checkout 전에 실패했다.
입력만 전체 SHA로 바로잡은 34021920074는 세 build와 Windows installer smoke 모두 성공했다.
같은 artifact를 사용한 Linux GUI 34024320576도 성공했다. 제품 소스는 수정하지 않았다.
상세 증거와 미완료 실제 실행 gate는 [Stage 4 진행 보고서](../working/task_m010_19_stage4.md)에 둔다.
Windows 직접 PDF와 양 플랫폼의 #19 고유 실제 동작 수용이 남아 있어 Stage 4/Issue 완료는 아니다.
이번 결과 기록은 문서만 변경하며 native 후보를 재빌드하지 않는다.

### 2026-09-06 Stage 4.4 재개 승인

작업지시자가 재개 수행계획의 devel 통합 단계를 승인했다. 기존 Stage 1~4.3을 재작성하지
않고 devel `c93ac8c58a796a45227f764f37b7aaffaa81899e`를 merge한다.
재개 계획에서 확인한 8개 충돌과 재개 보드의 add/add 충돌을 의미 단위로 해소한다.

- 최신 source save·암호 보호와 PDF snapshot export를 함께 보존한다.
- native registry·updater 초기화는 유지하고 PDF reaper·startup cleanup을 결합한다.
- 최신 desktop workflow는 이미 Rust test/Clippy gate를 포함하므로 workflow와 그
  contract test를 devel 그대로 채택한다. 구형 `native_checks` matrix 분기를 중복 추가하지 않는다.
- baseline은 최신 pin/source export 검사를 유지하고 snapshot 사용·live SVG 미사용 검사를 결합한다.
- 오늘할일은 양쪽 이력을 보존한다. pin·vendor·서명·Pages·release 데이터는 devel 기준을 유지한다.
- 기존 300 LOC 초과 workflow·test·host 문서는 통합 과정에서 구조 분리하지 않는다.
  최신 계약을 보존하는 병합 예외이며 새 기능/대규모 리팩터링의 근거로 사용하지 않는다.
- 로컬 검증은 PDF focused, 전체 Studio, upstream, automation, product boundary,
  Studio build, 두 workflow actionlint, Rust formatting과 diff 검사로 한정한다.
  동일 Studio suite가 먼저 전부 실행되면 불필요하게 재실행하지 않는다.
- 이번 단계는 원격 CI·artifact 생성·서명·배포를 실행하지 않는다.
  최신 snapshot fixture 조판이 불일치하면 설계를 자동 변경하지 않고 승인 요청으로 돌아간다.

산출물은 충돌 해소·필요한 통합 보정, 본 구현계획서, 오늘할일 및
`mydocs/working/task_m010_19_stage4.4.md`다. 검증 성공 뒤 함께
`Task #19 [Stage 4.4]: 최신 devel과 PDF snapshot 통합`으로 커밋한다.
단계 보고 뒤 Windows/Linux 최종 후보 수용 승인을 요청한다.

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | immutable PDF snapshot 계약 | snapshot module·실제 HWP/HWPX round-trip test | 같은 page count·SVG, 격리 lifecycle, Studio gate |
| 2 | native job freshness와 resource limit | snapshot 결속·TTL reaper·startup orphan cleanup | 경계 test 작성, formatting·정적 gate |
| 3 | Studio/native 통합과 공식 문서 정렬 | direct PDF pipeline·timeout·source 불변·기존 문서 보정 | focused/전체 Studio·upstream·automation gate |
| 4 | exact-SHA Windows/Linux 수용 | Stage 3 source SHA의 native·GUI 결과와 `_stage4.md` | 양 플랫폼 Rust/Clippy/Tauri build·PDF/recovery smoke |

## 사전 측정과 고정 limit

구현계획 작성 전에 현재 pin의 bundled WASM을 직접 초기화하고 repository fixture를 메모리에서 읽어 serializer round-trip과 SVG 크기를 측정했다. 이 측정은 limit 산정을 위한 진단값이며 Stage 완료 증적을 대신하지 않는다. 실제 Stage 1 test는 제품 `WasmBridge` 경로로 다시 실행한다.

| fixture | source | snapshot | 쪽 수 | 최대 SVG UTF-8 | 누적 SVG UTF-8 | snapshot load·전체 render |
|---|---:|---:|---:|---:|---:|---:|
| `biz_plan.hwp` | 33,792 B | 28,160 B | 6 / 6 | 336,727 B | 1,092,219 B | 20 ms |
| `form-002.hwpx` | 131,571 B | 111,769 B | 10 / 10 | 654,052 B | 5,230,531 B | 80 ms |
| `[2027] 온새미로 1 본교재.hwpx` | 865,033 B | 565,113 B | 46 / 46 | 906,079 B | 9,991,435 B | 368 ms |

앞의 HWP/HWPX 대표 fixture는 live 문서와 round-trip snapshot의 모든 SVG 문자열도 일치했다. 측정용 text-width callback과 현재 호스트 성능에 종속되는 시간은 회귀 수치로 고정하지 않고, page count·SVG 결과와 byte limit만 계약으로 고정한다.

| guard | 고정값 | 적용 위치와 이유 |
|---|---:|---|
| serializer snapshot bytes | 128 MiB | Studio가 격리 문서를 만들기 전에 거부한다. 측정 최대치의 200배 이상 여유를 둔다. |
| page count | 4,096쪽 | Studio와 native begin에서 같은 값으로 거부한다. |
| 단일 normalized SVG | 16 MiB | Studio 조기 검사와 native font fallback 적용 뒤 byte 검사에 모두 적용한다. |
| 한 job의 누적 normalized SVG | 512 MiB | native staging에 적용하고 초과 시 job 전체를 폐기한다. |
| process active job | 4개 | window별 1개와 별도로 전체 동시 job을 제한한다. |
| idle TTL | 5분 | 마지막 성공 begin/append 이후 활동이 없으면 만료한다. |
| absolute lifetime | 15분 | append가 계속되어도 job이 무기한 유지되지 않게 한다. |
| native reaper tick | 30초 | idle job은 최대 5분 30초, absolute job은 최대 15분 30초 안에 회수한다. |
| Studio snapshot capture | 2분 | capture 전후 wall-clock을 검사한다. 동기 WASM 호출의 선점 취소를 주장하지 않는다. |
| Studio 전체 pipeline | 10분 | 각 비동기 경계와 page loop 전후 남은 시간을 검사한다. |
| startup orphan 최소 age | 24시간 | 다른 실행 중 프로세스의 최근 temp를 건드리지 않는다. |
| startup scan / remove | 4,096개 / 64개 | OS temp 직접 자식 scan과 한 번의 삭제량을 제한한다. |
| orphan 내부 entry | 4,096개 | 허용된 page SVG 외 항목이 있거나 한도를 넘으면 디렉터리를 보존한다. |

동기 WASM serializer·renderer가 JavaScript event loop를 영구 점유하면 `Promise.race`로 선점할 수 없다. Studio deadline은 반환한 작업의 지연을 fail-closed 처리하고, WebView가 멈추거나 reload된 경우에는 native reaper가 job·target lock·temp를 제한 시간 안에 회수하는 최종 경계다. Stage 1 실제 fixture가 round-trip 불일치 또는 정상 문서가 limit의 절반을 넘는 결과를 보이면 Stage 2로 넘어가지 않고 수행계획 보정 승인을 요청한다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| upstream snapshot 소유 계약 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | Stage 3에서 live page handler 설명만 최소 보정 |
| desktop PDF 수용·cleanup gate | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | Stage 3에서 Windows/Linux exact-SHA 기준만 추가 |
| 구현계획·단계 판단 | `mydocs/plans/`, `mydocs/working/` | `task_m010_19_impl.md`, `task_m010_19_stage{1..4}.md` | OK | 승인·측정·검증 기록 |
| 오늘할일 | `mydocs/orders/` | `mydocs/orders/20260824.md` | OK | 현재 승인 대기 단계만 기록 |

신규 공식 문서, `mydocs/manual` 문서와 upstream `third_party/rhwp` source는 만들거나 수정하지 않는다. 아래에 명시한 native helper·test 분리는 300 LOC 권장 상한을 지키기 위한 내부 source 배치이며 공식 문서 위치 변경이 아니다.

## Stage 1 — immutable PDF snapshot 계약

### 산출물

신규:

- `apps/studio-host/src/core/pdf-export-snapshot.ts`
- `apps/studio-host/src/core/pdf-export-snapshot.test.ts`
- `mydocs/working/task_m010_19_stage1.md`

수정:

- `apps/studio-host/vitest.config.ts`

### 변경 내용

- `createPdfExportSnapshot()`은 active session의 현재 format에 맞춰 `exportHwp()` 또는 `exportHwpx()`를 정확히 한 번 호출한다. live `pageCount()`와 `getPageSvg()`는 snapshot 진실 원천으로 사용하지 않는다.
- serializer bytes가 0이거나 128 MiB를 넘으면 격리 문서를 만들지 않고 명시적으로 실패한다. snapshot ID는 WebView의 `crypto.randomUUID()`로 만들고 test에서는 ID factory를 주입한다.
- 제품 font-policy leaf adapter가 적용된 `WasmBridge`의 새 인스턴스를 초기화하고 `snapshot.hwp` 또는 `snapshot.hwpx` 이름으로 bytes를 로드한다. 반환 handle은 immutable `id`, `pageCount`, `renderPageSvg(index)`, `dispose()`만 노출한다.
- `pageCount`는 1~4,096 정수인지 검사한다. page index와 16 MiB UTF-8 SVG limit을 render 직후 검사하고, handle은 dispose 뒤 render를 거부한다.
- 초기화·load·page count 검증 중 실패하면 생성된 bridge를 즉시 release한다. `dispose()`는 idempotent하며 성공·실패·취소 경로에서 같은 격리 문서를 한 번만 해제한다.
- capture는 source path, active format, native revision, dirty, recent, recovery와 `notifySaved`를 호출하거나 수정하지 않는다. source handler가 capture 뒤 다른 SVG를 반환하도록 바뀌어도 snapshot handle은 격리 bridge의 시작 상태만 렌더한다.
- Vitest에서 bundled `@wasm/rhwp.js`를 production vendor와 같은 파일로 해석하도록 test alias만 추가한다. fixture는 새로 복사하지 않고 pin된 `third_party/rhwp/samples/biz_plan.hwp`와 `third_party/rhwp/samples/hwpx/form-002.hwpx`를 사용한다.
- 실제 fixture test는 source와 snapshot의 page count, 각 page SVG 문자열, 대표 한글 text와 SVG root/viewBox를 비교한다. HWP·HWPX serializer 선택, capture 1회, live edit 격리, load/render 오류와 dispose 1회도 fake bridge test로 분리한다.

### 검증

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/pdf-export-snapshot.test.ts src/core/font-policy-wasm-bridge.test.ts
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

현재 호스트에서 실행하는 Stage 1은 TypeScript·bundled WASM의 플랫폼 중립 검증이다. fixture page count 또는 SVG가 불일치하면 serializer snapshot 설계를 통과시키지 않고 계획 보정으로 되돌린다.

### 커밋

```text
Task #19 Stage 1: immutable PDF snapshot 계약 추가
```

Stage 1 source와 `mydocs/working/task_m010_19_stage1.md`를 같은 커밋에 묶는다.

## Stage 2 — native job freshness와 resource limit

### 산출물

신규:

- `apps/desktop/src-tauri/src/pdf_jobs_tests.rs`
- `apps/desktop/src-tauri/src/pdf_temp_cleanup.rs`
- `apps/desktop/src-tauri/src/pdf_temp_cleanup_tests.rs`
- `mydocs/working/task_m010_19_stage2.md`

수정:

- `apps/desktop/src-tauri/src/pdf_jobs.rs`
- `apps/desktop/src-tauri/src/commands.rs`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/src/state.rs`

### 변경 내용

- begin request는 `snapshotId`, `targetPath`, `pageCount`를 한 구조체로 받고 append는 `jobId`, `snapshotId`, `pageIndex`, `svg`, commit·abort는 `jobId`, `snapshotId`를 받는다. snapshot ID는 UUID로 parse하고 빈 값·과대 page count를 temp 생성 전에 거부한다.
- `PdfExportJob`은 owner label, snapshot ID, target, page count, created/last-activity `Instant`, normalized SVG 누적 bytes와 page paths를 소유한다. test는 주입된 `Instant`와 policy로 경계값을 sleep 없이 검증한다.
- begin은 요청과 target parent를 먼저 검증한 뒤 expired job과 같은 owner의 기존 job을 폐기한다. 남은 다른 owner의 같은 target lock과 process 4-job 상한은 유지한다.
- append는 owner와 snapshot을 먼저 확인한 뒤 expected page 순서, 단일 16 MiB, 누적 512 MiB와 absolute/idle expiry를 검사한다. font fallback 적용 결과의 UTF-8 byte를 기준으로 저장한다.
- 다른 owner의 잘못된 요청은 유효 job을 제거하지 않는다. owner가 확인된 뒤 snapshot mismatch, 순서·limit 위반 또는 write 실패가 발생하면 해당 job을 fail-closed 폐기해 부분 SVG와 target lock을 함께 회수한다.
- commit은 owner·snapshot·expiry와 정확한 page 수를 확인하고 registry에서 job을 제거한 뒤 기존 searchable/outlined fallback·atomic target replace를 호출한다. 변환 실패에도 기존 target과 temp cleanup 계약을 유지한다.
- `AppState.pdf_jobs`를 `Arc<Mutex<_>>`로 바꾸고 setup에서 `Weak`만 소유하는 단일 30초 reaper를 시작한다. AppState가 해제되면 worker가 종료하며 process당 worker 하나와 active job 4개 상한을 넘기지 않는다.
- startup cleanup은 `std::env::temp_dir()` 바로 아래만 최대 4,096개 scan한다. 이름이 `.alhangeul-pdf-`로 시작하고 24시간보다 오래된 실제 directory이며 root·내부 항목에 symlink가 없고, 내부가 최대 4,096개의 `page-{8자리}.svg` 일반 파일로만 구성된 경우에 한해 최대 64개를 삭제한다.
- recent directory, prefix 불일치, symlink, nested directory, 알 수 없는 파일, metadata/age 확인 실패는 보존한다. 사용자 문서·target PDF를 탐색하거나 temp root 밖을 재귀 정리하지 않는다.
- 기존 `pdf_jobs.rs` test를 별도 test module로 옮겨 production file을 300 LOC 안쪽으로 유지한다. cleanup도 별도 module/test로 분리하고 `commands.rs`에는 request 변환과 lock acquisition만 둔다.

### 검증

현재 macOS 호스트에서는 Rust desktop test, Clippy와 Tauri build를 실행하지 않는다. Stage 2에서는 Rust test source와 경계 fixture를 작성하고 다음 플랫폼 중립 검증만 수행하며, 실제 native 실행은 같은 source SHA를 Stage 4에서 Windows/Linux 양쪽으로 닫는다.

```bash
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml -- --check
pnpm run check:product-boundary
git diff --check
```

Stage 2에 작성하는 Rust focused test는 Stage 4에서 다음 계약을 모두 실행한다.

- snapshot UUID mismatch, owner mismatch, 중복·누락·역순 page가 fail-closed다.
- page count, 단일/누적 SVG와 global job 경계의 직전 값은 통과하고 초과 값은 target을 바꾸지 않는다.
- same-owner begin, window destroy, idle 5분, absolute 15분과 reaper tick에서 job·temp·target lock이 회수된다.
- cross-window 유효 target lock은 유지되고 다른 owner 요청이 그 job을 제거하지 않는다.
- startup cleanup은 old safe directory만 제한 개수 삭제하고 recent·symlink·unknown content·nested·prefix 불일치 sentinel을 보존한다.

### 커밋

```text
Task #19 Stage 2: native PDF job freshness와 limit 추가
```

Stage 2 source·test와 `mydocs/working/task_m010_19_stage2.md`를 같은 커밋에 묶는다. 보고서에는 macOS에서 native 실행을 하지 않았고 Stage 4 exact-SHA가 미완료 gate임을 명시한다.

## Stage 3 — Studio/native 통합과 공식 문서 정렬

### 산출물

수정:

- `apps/studio-host/src/core/desktop-persistence.ts`
- `apps/studio-host/src/core/desktop-persistence.test.ts`
- `apps/studio-host/src/core/desktop-host.ts`
- `apps/studio-host/src/core/desktop-host.test.ts`
- `docs/architecture/UPSTREAM.md`
- `docs/operations/DESKTOP_RELEASE.md`

신규:

- `mydocs/working/task_m010_19_stage3.md`

### 변경 내용

- `DesktopHost`는 active session의 `fileName`, `sourcePath`, `format`을 PDF persistence에 전달하고 기존 host별 in-flight Promise dedupe를 유지한다. native session revision을 Studio 편집 revision으로 오인해 snapshot token으로 사용하지 않는다.
- `DesktopPersistence.exportPdf()`는 save dialog가 취소되면 snapshot과 native job을 만들지 않는다. target 확정 뒤 handler를 acquire하고 Stage 1 snapshot을 한 번 만든 다음 그 `pageCount`와 `snapshotId`로 native begin을 호출한다.
- page SVG는 오직 snapshot handle에서 순서대로 얻고, 모든 append·commit·abort request에 같은 snapshot ID를 전달한다. live handler의 `pageCount()`·`getPageSvg()`는 direct PDF pipeline에서 호출하지 않는다.
- snapshot capture 2분, 전체 pipeline 10분 deadline을 capture·native invoke·page loop 전후에 검사한다. 비동기 경계 timeout과 limit 초과는 명시적 오류로 끝내며 `finally`에서 native abort를 best-effort로 호출한 뒤 snapshot을 반드시 dispose한다.
- commit 성공 뒤 job ID를 비우고 기존 outlined fallback warning UX를 유지한다. source `notifySaved`, source save, active path/format/revision/dirty/recent/recovery 갱신은 호출하지 않는다.
- focused test는 dialog cancel, HWP/HWPX snapshot 선택, capture 뒤 live edit, append 중 timeout·reload를 모사한 새 begin, snapshot/render/append/commit 실패, fallback warning과 double export dedupe를 고정한다.
- `UPSTREAM.md`의 live `getPageSvg` 직접 전달 설명을 현재 형식 serializer로 만든 격리 snapshot 설명으로 바꾼다. `DESKTOP_RELEASE.md`에는 source state 불변, mixed revision 방지, stale/orphan cleanup과 limit 초과 target 보존을 Windows/Linux gate로 추가한다.
- Task #20 소유 파일인 `command/dispatcher.ts`, `embed/desktop-runtime.ts`, `core/platform.ts`와 native `desktop_platform` 함수는 수정하지 않는다. `commands.rs`·`lib.rs`의 shared registry는 Stage 2 PDF request/module 줄만 최소 수정한다.

### 검증

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/pdf-export-snapshot.test.ts src/core/desktop-persistence.test.ts src/core/desktop-host.test.ts src/command/commands/file.test.ts
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

focused test에서 snapshot capture 이후 live handler 결과를 바꿔도 native append가 시작 snapshot의 page count·SVG만 받는지 확인한다. timeout·append 실패·commit 실패 뒤 abort와 dispose가 각각 한 번 실행되고 existing target/source session을 성공 상태로 바꾸는 호출이 없는지도 분리해 검증한다.

### 커밋

```text
Task #19 Stage 3: PDF snapshot pipeline과 공식 경계 통합
```

Stage 3 source·공식 문서와 `mydocs/working/task_m010_19_stage3.md`를 같은 커밋에 묶는다. 이 source commit을 Stage 4 exact-SHA 입력으로 고정한다.

## Stage 4 — exact-SHA Windows/Linux 수용

### 산출물

신규:

- `mydocs/working/task_m010_19_stage4.md`

제품 source와 공식 문서는 Stage 4에서 수정하지 않는다. native 검증 중 correction이 필요하면 Stage 4를 완료하지 않고 구현계획 보정 승인을 요청한다.

### 변경 내용

- Stage 3 승인 뒤 Task #34 Linux GUI correction이 merge된 최신 `devel`을 통합한다. Task #20이 먼저 merge됐으면 shared `commands.rs`, `lib.rs`, `UPSTREAM.md`에서 두 task의 의미가 모두 보존되는지 확인하고 Stage 1~3 gate를 다시 실행한다.
- 통합 충돌이 dispatcher/embed/platform lifecycle 또는 PDF 설계 변경을 요구하면 자동 해결하지 않고 두 task diff와 통합 순서를 제시해 승인을 요청한다.
- exact source SHA를 Windows x64와 Linux x64 지원 환경에 각각 checkout하고 동일한 frozen pnpm dependency, `rhwp-core.lock`과 submodule pin으로 검증한다.
- 원격 Actions가 exact commit을 요구하면 Stage 4 진입 승인 범위에서 candidate를 `publish/task19`에 push하되 PR은 만들지 않는다. 최종 보고·PR 단계 전에는 release, 서명, updater, package 게시와 이슈 close를 수행하지 않는다.
- 양 플랫폼에서 Stage 2 Rust unit test, Clippy와 Tauri production build를 통과시키고 job reaper·startup orphan cleanup이 OS별 path와 symlink/reparse 경계를 보존하는지 확인한다.
- Linux에서는 기존 6쪽 `biz_plan.hwp` direct PDF의 A4 page count, searchable 한글 text와 nonblank render를 재검증한다. Windows에서는 같은 fixture와 대표 HWPX를 직접 PDF로 저장해 page count·text·atomic replace를 확인한다.
- 46쪽 HWPX 또는 동등한 비기밀 장문 fixture에서 snapshot capture 뒤 live edit를 발생시켜 결과가 시작 snapshot으로 완성되고 source dirty가 유지되는지 확인한다. 자동화가 편집 타이밍을 재현하지 못하면 Stage 3 deterministic test와 수동 시나리오를 구분해 기록한다.
- test가 만든 old/recent/symlink temp sentinel만 사용해 app 재시작 cleanup을 검증한다. WebView reload 뒤에는 idle TTL+tick 안에 old job target으로 새 export가 가능하고, window destroy·timeout·append/변환 실패 뒤 제품 prefix temp가 남지 않는지 확인한다.
- 환경, exact SHA, run/artifact URL, 명령 결과, PDF 분석 summary, temp sentinel과 source state 전후, 수동 시나리오 및 검증 한계를 Stage 4 보고서에 기록한다. 개인 문서 내용·token·로컬 비밀은 증적에 넣지 않는다.

### 검증

Windows x64와 Linux x64 각각:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run test:desktop
pnpm run clippy:desktop
pnpm run build:studio
pnpm run build:desktop
git status --short
```

플랫폼 공통 acceptance:

- checkout SHA가 Stage 3 이후 승인된 exact source SHA와 일치한다.
- HWP/HWPX snapshot page count와 모든 append가 하나의 UUID에 결속되고 mixed revision fixture가 통과한다.
- 6쪽 HWP PDF의 searchable 한글 text, page count, nonblank render와 atomic replace가 유지된다.
- reload stale job은 최대 5분 30초, absolute job은 최대 15분 30초 안에 회수되며 다른 window의 유효 target lock은 유지된다.
- app 재시작은 24시간보다 오래된 safe product temp만 최대 64개 삭제하고 recent·symlink·unknown sentinel을 보존한다.
- source dirty/path/format/revision/recent와 기존 target은 성공·timeout·limit·변환 실패의 각 기대값을 유지한다.
- 검증 checkout은 명령 실행 뒤 source diff 없이 clean하다. build artifact와 test temp는 commit하지 않는다.

### 커밋

```text
Task #19 Stage 4: Windows Linux PDF snapshot 수용
```

Stage 4 검증이 모두 통과한 뒤 `mydocs/working/task_m010_19_stage4.md`만 커밋한다.

## Stage 4.1 — Rust reaper test privacy와 양 플랫폼 native gate 보정

### 산출물

수정:

- `apps/desktop/src-tauri/src/pdf_temp_cleanup_tests.rs`
- `.github/workflows/alhangeul-desktop.yml`
- `tests/actions-workflows.test.mjs`
- `mydocs/plans/task_m010_19_impl.md`
- `mydocs/orders/20260824.md`

신규:

- `mydocs/working/task_m010_19_stage4.1.md`

### 변경 내용

- reaper test는 `PdfExportJobs.jobs` private field를 직접 읽지 않는다. `reap_once()` 뒤 public `discard_for_window("main")`이 제거할 job을 찾지 못해 `0`을 반환하는지 검사해 같은 회수 결과를 외부 동작으로 검증한다. production field visibility와 API는 넓히지 않는다.
- desktop artifact matrix에는 `native_checks`를 명시한다. Stage 4 대상인 `windows-x64`와 `linux-x64`만 `true`, 기존 `linux-arm64` package build는 `false`로 두어 다른 architecture gate 의미를 만들지 않는다.
- `run_tests`와 `native_checks`가 모두 참인 matrix job은 Studio test 뒤 `pnpm run test:desktop`, `pnpm run clippy:desktop`을 순서대로 통과해야 Tauri production build에 진입한다. 기존 exact checkout, platform-neutral gate, bundle inventory와 installer smoke는 유지한다.
- workflow contract test는 native gate가 Windows/Linux x64에만 결속되고 Rust test·Clippy가 Tauri build보다 앞서는 순서를 고정한다.
- Stage 4.1은 test·workflow 검증 경계만 보정한다. PDF snapshot, native job/reaper, startup cleanup, Studio pipeline, 사용자 문서와 공식 문서는 수정하지 않는다.
- Stage 4.1 commit을 새 exact-SHA candidate로 push한 뒤 CI와 desktop artifact workflow를 처음부터 다시 실행한다. 첫 실패 candidate의 성공 step이나 중단 artifact는 새 candidate 수용 증거로 승계하지 않는다.
- Windows GUI HWP/HWPX direct PDF는 repository에 자동화 harness가 없으므로 artifact build 성공과 구분한 별도 native 수동 gate로 유지한다. 실제 Windows 증거 없이 Stage 4를 완료 처리하지 않는다.

### 검증

Stage 4.1 commit 전 현재 macOS 호스트에서:

```bash
node --test tests/actions-workflows.test.mjs
actionlint .github/workflows/alhangeul-desktop.yml
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml -- --check
git diff --check
```

Stage 4.1 commit 뒤 새 exact SHA에서:

```bash
gh workflow run ci.yml --ref publish/task19
gh workflow run alhangeul-desktop.yml --ref publish/task19 \
  -f build_ref={exact_sha} -f run_tests=true
```

CI의 Linux Rust test·Clippy와 desktop workflow의 Windows/Linux x64 Rust test·Clippy·Tauri build가 모두 통과해야 Stage 4 PDF/recovery acceptance를 재개한다. macOS에서는 Rust desktop test, Clippy와 Tauri build 결과를 수용 증거로 사용하지 않는다.

### 커밋

```text
Task #19 [Stage 4.1]: PDF reaper test와 native gate 보정
```

## Stage 4.2 — Linux GUI CUPS 환경 증거 보정

### 산출물

수정:

- `.github/workflows/alhangeul-linux-gui.yml`
- `tests/linux-gui-workflow.test.mjs`
- `mydocs/plans/task_m010_19_impl.md`
- `mydocs/orders/20260824.md`

신규:

- `mydocs/working/task_m010_19_stage4.2.md`

### 변경 내용

- Stage 4.1 exact candidate `243387060a4c1cf640a15c20c59552ab36524ae8`의 CI run `32694496874`와 desktop artifact run `32694505687`은 성공했다. artifact run은 Windows/Linux x64 Rust test·Clippy·Tauri build, Linux arm64 package build와 Windows installer smoke를 모두 통과했다.
- 같은 SHA와 Linux x64 artifact를 전달한 GUI acceptance run `32696052385`는 exact checkout·artifact handoff, DEB 설치와 CUPS-PDF A4 구성까지 성공했다. 다음 `Record native environment` 단계에서 Ubuntu 22.04의 `cupsd`가 지원하지 않는 `-v` 옵션을 호출해 exit 1을 반환했고 제품 GUI 단계는 실행되지 않았다.
- CUPS 환경 증거는 daemon binary의 미지원 version flag를 호출하지 않는다. 이미 필수 설치하는 `cups`가 제공하는 `cups-daemon` Debian package version을 `dpkg-query -W cups-daemon`으로 기록해 fail-closed 설치/version 증거를 유지한다.
- workflow contract test는 `cups-daemon` package version 기록을 요구하고 `cupsd -v`와 `cupsd --version` 호출 부재를 고정한다. Node/pnpm/Rust, exact tauri-driver input, WebKitWebDriver path/package, GTK와 Poppler 증거 계약은 유지한다.
- Stage 4.2는 Linux GUI acceptance workflow와 focused contract만 보정한다. 제품 Rust/Studio, PDF snapshot·job/reaper·startup cleanup, package 산출물, 사용자 문서와 공식 문서는 수정하지 않는다.
- 새 Stage 4.2 commit으로 candidate SHA가 바뀌므로 CI와 desktop artifact workflow를 처음부터 다시 실행한다. 새 artifact run의 exact Linux x64 산출물만 Linux GUI acceptance에 전달하며 이전 성공 artifact를 새 SHA의 수용 증거로 재사용하지 않는다.
- Windows GUI HWP/HWPX direct PDF는 자동화되지 않은 별도 native 수동 gate로 남는다. Linux GUI 성공만으로 Stage 4를 완료 처리하지 않는다.

### 검증

Stage 4.2 commit 전 현재 macOS 호스트에서:

```bash
node --test tests/linux-gui-workflow.test.mjs
actionlint .github/workflows/alhangeul-linux-gui.yml
pnpm run check:product-boundary
pnpm run test:automation
git diff --check
```

Stage 4.2 commit 뒤 새 exact SHA에서:

```bash
gh workflow run ci.yml --ref publish/task19
gh workflow run alhangeul-desktop.yml --ref publish/task19 \
  -f build_ref={exact_sha} -f run_tests=true
gh workflow run alhangeul-linux-gui.yml --ref publish/task19 \
  -f build_ref={exact_sha} -f native_run_id={artifact_run_id}
```

CI와 desktop artifact workflow가 성공한 뒤 Linux GUI acceptance에서 환경 증거 기록, 실제 GUI HWP/HWPX 시나리오, direct/GTK/CUPS PDF 분석과 evidence upload가 모두 통과해야 한다. evidence artifact의 workflow context, handoff digest, installed DEB hash, native environment, step outcomes와 PDF summary를 read-back한다.

### 커밋

```text
Task #19 [Stage 4.2]: Linux GUI CUPS 환경 증거 보정
```

## Stage 4.3 — Issue #34 close gate 기준 통합

### 산출물

수정:

- `.github/workflows/alhangeul-linux-gui.yml`
- `tests/linux-gui-workflow.test.mjs`
- `mydocs/orders/20260824.md`
- `mydocs/orders/20260826.md`
- `mydocs/plans/task_m010_19_impl.md`

신규:

- `mydocs/working/task_m010_19_stage4.3.md`

### 변경 내용

- Issue #34 correction PR #43·#44 merge commit `424bb9c43769d2d92fcfede6b7ddd13bba7561d0`을 `origin/devel`에서 비재작성 merge로 반영한다. 이미 게시된 #19 단계 이력과 `publish/task19`을 유지하며 rebase·force push를 사용하지 않는다.
- Issue #34 close gate는 native artifact run `32869377875`와 Linux GUI acceptance run `32871216329`에서 같은 merge exact SHA를 사용해 성공했다. HWP/HWPX open·native save·재열기, drag-in, 직접 PDF, GTK Print to File·취소·CUPS-PDF와 editor restore가 모두 통과했다.
- `.github/workflows/alhangeul-linux-gui.yml`과 `tests/linux-gui-workflow.test.mjs` 충돌은 close gate에서 검증된 `dpkg-query -W cups` 환경 증거 계약을 채택한다. Stage 4.2의 `cups-daemon` 보정은 미지원 `cupsd -v` 제거 원인을 확인한 과거 후보 기록으로 보존하되 새 candidate의 canonical workflow로 유지하지 않는다.
- `mydocs/orders/20260824.md` add/add 충돌은 당시 병렬 진행한 #19와 #34 행을 모두 보존한다. 현재 작업 상태는 8월 26일 보드에 #19 Stage 4.3으로 기록한다.
- Issue #35 Windows GUI E2E는 #19의 선행 조건으로 두지 않는다. #19는 계획된 Windows HWP/HWPX direct PDF, snapshot/source state, atomic replace와 stale-job 회수 수동 gate를 유지하며 #35 automation harness를 중복 구현하지 않는다.
- 통합된 `.github/workflows/alhangeul-linux-gui.yml`은 337 LOC로 권장 300 LOC를 넘지만, Issue #34에서 exact-SHA close gate까지 승인·검증한 orchestration과 fail-closed evidence 경계를 그대로 가져온 결과다. #19에서 구조를 다시 나누면 검증된 workflow를 변경하므로 Stage 4.3에서는 분리하지 않고 후속 전용 구조 개선 판단으로 남긴다.
- merge commit을 새 exact-SHA candidate로 `publish/task19`에 non-force push한 뒤 CI와 desktop artifact workflow를 처음부터 다시 실행한다. 성공한 같은 SHA의 Linux x64 artifact만 Linux GUI acceptance에 전달하고 evidence를 read-back한다.

### 검증

Stage 4.3 merge commit 전 현재 macOS 호스트에서:

```bash
node --test tests/linux-gui-workflow.test.mjs
pnpm run test:gui:contracts
pnpm run test:gui:linux:contracts
pnpm run typecheck:gui
actionlint .github/workflows/alhangeul-linux-gui.yml .github/workflows/alhangeul-desktop.yml
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

Stage 4.3 merge commit 뒤 새 exact SHA에서:

```bash
gh workflow run ci.yml --ref publish/task19
gh workflow run alhangeul-desktop.yml --ref publish/task19 \
  -f build_ref={exact_sha} -f run_tests=true
gh workflow run alhangeul-linux-gui.yml --ref publish/task19 \
  -f build_ref={exact_sha} -f native_run_id={artifact_run_id}
```

CI와 desktop artifact workflow가 성공한 뒤 Linux GUI acceptance의 두 phase와 6개 scenario manifest, PDF 분석과 evidence upload를 확인한다. Windows #19 고유 수동 gate 전에는 Stage 4를 완료 처리하지 않는다.

### 커밋

```text
Task #19 [Stage 4.3]: Issue #34 acceptance 기준 통합
```

## 통합 검증

- 각 Stage focused test와 `git diff --check`를 해당 단계 보고서 작성 전에 실행한다.
- Stage 1에서 실제 HWP/HWPX serializer round-trip page count와 SVG가 같고, 격리 snapshot release가 모든 종료 경로에서 한 번 수행된다.
- Stage 2 native tests는 Stage 4 Windows/Linux 양쪽에서 실행되어 snapshot/owner/order/bytes/time/concurrency/orphan 경계를 닫는다.
- Stage 3에서 product boundary, automation, upstream, Studio test/build를 모두 통과하고 direct PDF가 live page handler를 사용하지 않는다.
- Stage 4에서 같은 exact source SHA의 Windows/Linux native build와 PDF/recovery evidence를 확보한다.
- searchable PDF, outlined fallback 경고, atomic target replace와 source dirty 불변 계약이 유지된다.
- source 파일 300 LOC와 함수 50 LOC 권장 상한을 지키며, 기존 초과 파일에는 request delegation 외 책임을 추가하지 않는다.
- 실패한 검증은 단계 완료로 처리하지 않고 계획 범위를 바꾸는 correction은 먼저 승인을 받는다.

## 커밋

- 현재 구현계획 승인용 커밋: `Task #19: 구현 계획서 작성과 오늘할일 갱신`
- 각 Stage source와 `mydocs/working/task_m010_19_stage{N}.md`는 해당 Stage 커밋에 함께 묶는다.
- 세부 correction이 승인되면 `Task #19 [Stage N.M]: 내용` 형식을 사용한다.
- Stage 4 완료 승인 전 최종 보고서와 PR 게시 단계로 넘어가지 않는다.

## 단계 의존성과 병렬 작업 경계

- Stage 1은 이 구현계획 승인 후 Task #20과 병렬로 시작할 수 있으며 Task #20 소유 파일을 수정하지 않는다.
- Stage 2는 Stage 1 검증·보고서 승인 후 시작한다. 시작 직전에 Task #20의 native registry 진행 상태를 확인하고 이미 merge됐으면 승인 후 최신 `devel`을 먼저 통합한다.
- Stage 3은 Stage 2 검증·보고서 승인 후 시작한다. Task #20이 미merge 상태면 PDF 문단과 registry 줄만 최소 수정하고 두 branch의 shared-file diff를 기록한다.
- Stage 4는 Stage 3 검증·보고서 승인, Task #34 correction merge와 exact source commit 확정 후 시작한다. Task #20이 merge됐으면 함께 통합한다.
- 모든 Stage는 `task-stage-report` 절차로 보고·커밋하고 작업지시자 승인 없이 다음 Stage로 넘어가지 않는다.

## 위험과 대응

- **serializer snapshot 조판 차이**: 실제 HWP/HWPX fixture의 모든 page SVG를 비교하고 불일치 시 mutation lock이나 revision guard로 임의 전환하지 않는다.
- **WASM memory·응답 증가**: 128 MiB snapshot, 4,096쪽, 16 MiB/page와 512 MiB/job을 양쪽에서 검사하고 handle·temp를 단계적으로 해제한다.
- **동기 renderer hang**: Studio deadline의 선점 한계를 문서화하고 native idle/absolute reaper를 최종 회수 경계로 둔다.
- **stale request가 새 job을 오염**: job UUID와 별도 snapshot UUID, owner와 expected page를 매 command에서 함께 검사하고 same-owner replacement 뒤 old job ID를 찾지 못하게 한다.
- **orphan cleanup 오삭제**: temp direct child, prefix, age, root/child symlink, content whitelist와 scan/remove 상한을 모두 만족한 test artifact만 삭제한다.
- **Task #20 충돌**: dispatcher/embed/platform을 제외하고 shared registry·공식 문서는 최소 hunk만 수정한다. merge 시 의미 충돌은 계획 보정 승인으로 돌린다.
- **Task #34 evidence 변동**: 과거 Linux artifact를 재사용하지 않고 correction merge 후 Task #19 exact source SHA로 양 플랫폼을 다시 검증한다.
- **macOS 검증 오용**: Stage 1·3 플랫폼 중립 gate와 Rust formatting만 현재 호스트에서 실행하고 Rust desktop/Tauri·실제 PDF 성공은 Stage 4 Windows/Linux 결과만 인정한다.

## 승인 요청 사항

- 사전 fixture 측정에 근거한 128 MiB snapshot, 4,096쪽, 16 MiB/page, 512 MiB/job과 process 4-job limit
- 5분 idle·15분 absolute TTL, 30초 native reaper와 24시간 startup orphan age 및 4,096 scan/64 remove 경계
- Stage 1에서 현재 format serializer bytes와 별도 product `WasmBridge`를 사용하는 immutable handle 및 실제 HWP/HWPX SVG 동등성 gate
- Stage 2에서 UUID/owner/order/bytes/time을 native job에 결속하고 safe-content temp cleanup을 별도 module로 분리하는 파일 범위
- Stage 3에서 dialog 뒤 snapshot을 만들고 모든 native request에 같은 snapshot ID를 전달하며 source save/notify/revision을 건드리지 않는 통합 순서
- Stage 4에서 Task #34 correction과 선행 merge된 Task #20을 통합한 exact SHA의 Windows/Linux Rust·Clippy·Tauri·PDF/recovery 검증 범위
- 원격 exact-SHA 검증이 필요할 때 Stage 4 candidate만 `publish/task19`에 미리 push하되 PR·release·이슈 close는 하지 않는 한정된 handoff
- 각 Stage 산출물, 검증 명령과 커밋 메시지

승인되면 Stage 1 구현을 시작하고, 완료 시 `task-stage-report` 절차로 Stage 1 source·보고서 커밋과 다음 단계 승인을 요청한다.
