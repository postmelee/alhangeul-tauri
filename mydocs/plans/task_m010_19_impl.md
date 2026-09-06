# Task #19 구현계획서 — PDF snapshot과 stale job 회수 경계

수행계획서: [`task_m010_19.md`](task_m010_19.md)
GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
마일스톤: M010

2026-08-24 작업지시자가 수행계획 진행을 승인했다. 승인된 immutable snapshot, native stale job 회수, Studio/native 통합, Windows/Linux exact-SHA 수용의 네 경계를 유지한다. Task #20이 소유한 dispatcher·embed handler·platform lifecycle은 수정하지 않고, Task #34의 Linux GUI correction이 `devel`에 반영된 뒤 마지막 수용을 진행한다.

2026-08-24 Stage 4 첫 candidate `41bbf015ad140a4c7ff5db58110ea4d292798261`의 CI run `32693530357`은 플랫폼 중립 gate를 통과했지만 `pdf_temp_cleanup_tests.rs`가 sibling module의 private `PdfExportJobs.jobs` field를 직접 읽어 Rust test compile에서 `E0616`으로 실패했다. 작업지시자는 production API·reaper 동작을 바꾸지 않는 assertion 보정, Windows/Linux x64 artifact workflow의 Rust test·Clippy gate 연결과 새 exact-SHA 재실행을 Stage 4.1로 승인했다. 실패 candidate의 artifact build run `32693539285`는 correction 뒤 SHA가 바뀌므로 중단했고 어떤 artifact도 수용 증거로 재사용하지 않는다.

## 단계 개요

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
