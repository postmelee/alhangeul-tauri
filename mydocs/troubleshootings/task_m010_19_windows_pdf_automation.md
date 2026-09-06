# Task #19 — Windows PDF 자동화의 탐색·입력·확인창 함정

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
공통 기준: [Native UI 테스트 가이드](../../docs/operations/NATIVE_UI_TESTING.md)

## 증상

helper가 성공을 반환해도 다른 문서가 열리거나 요청과 다른 파일명으로 저장되었다.
열기 보정 이후 최초 HWP/HWPX PDF 생성은 통과했으나 재실행 덮어쓰기 확인창에서 중단했다.
최신 전체 run `34049930142`도 실패다. 새 확인창 adapter는 실제 앱이 InvokePattern을
제공하지 않아 호출 전에 중단했다. 아래 해결 상태는 경계별로 구분한다.
후속 제한 run `34053001644`는 native 거절 경로를 통과했지만 Confirm 전 보조 UIA 트리
수집 예외로 실패했다. 실제 Confirm의 새 경로 지원은 여전히 미검증이다.

## 재현 조건

- 관측 환경: GitHub hosted `windows-2025`, Windows NSIS 설치본,
  `tauri-driver 2.0.6`, `@wdio/tauri-service 1.3.0`.
- 이전 전체 run `34043594332`의 WebView2 보고 버전: `151.0.4129.101`.
  runner label은 고정 OS image build를 뜻하지 않는다. 언어/DPI의 별도 검증 근거는 없다.
- 제품 SHA: `69b22650df96323a2c59e473d474ed3195cc9cc7`.
  기존 installer artifact run: `34021920074`.
- 이전 열기 성공 harness: `903164b428a4d19265f7d078a85323596261a7c2`.
  최신 전체 실행 harness: `23b631d03ee84cce631c3e798ffb4875d39297bc`.
- 입력은 저장소의 공개 HWP/HWPX fixture 복사본이다. 개인 문서는 사용하지 않았다.

현재 판정 함수의 빠른 재현:

```sh
pnpm run test:gui:windows:contracts
```

이는 Windows dialog 재현 명령이 아니다. 실제 재현은 별도 승인 후 기존 Desktop dispatcher의
`windows-pdf-open-probe`, 확인창만 관측하는 `windows-pdf-dialog-probe` 또는
`windows-pdf-acceptance`를 사용하며, candidate SHA와
성공한 native artifact run ID를 명시한다. artifact 만료 여부를 먼저 확인한다.
현재 미지원 overwrite를 그대로 둔 전체 실행을 반복하지 않는다.

## 원인

| 관측 | 확인된 원인/한계 | 재발 방지 |
|---|---|---|
| helper 성공인데 HWPX 대신 이전 HWP가 열림 | ID `1`이 `UIItem`과 `Button` 양쪽에 존재; ID-only `FindFirst`는 파일 항목을 고를 수 있었음 | ID/class·범위·중복 검사와 최종 문서 identity를 모두 유지 |
| 입력칸이 보이지만 UIA focus/pattern이 안 됨 | 관측된 control이 기대 pattern을 제공하지 않음; 표시된 ControlType만으로 조작 방식을 추정했음 | 관측 capability 기반 adapter와 focus/readback/실제 결과를 구분 |
| 입력 문자열 readback 후에도 다른 파일명/문서 | readback은 텍스트 상태만 확인하며 실제 dialog 선택·처리 완료의 증거가 아님 | 실제 경로·title 사후 조건 추가; 문자열 확인만으로 성공 금지 |
| 재시작 Save에서 `Unsupported overwrite confirmation controls` | 당시 helper는 ID `6`/class `Button`만 실행했지만 실제 확인창은 `CommandButton_6/7`, UIA class `CCPushButton`으로 관측 | ID 교체만으로 해결하지 않고 의미·대상·capability를 확인 |
| 작은 확인창에서 native 재검증 실패 | UIA class `CCPushButton`을 native에도 요구했으나 실제 native class는 `Button`; 다른 12개 guard는 통과 | UIA/native 속성을 별도로 관측·검증하고 같은 판정 snapshot에서 실패 조건 기록 |
| 새 adapter에서 `Confirmation InvokePattern unsupported.` | 작은 WinForms host는 Button/InvokePattern을 제공하지만 실제 앱의 두 command는 Pane, `patterns=[]` | 실제 host의 capability 차이를 별도 경계로 취급; native guard/호출 성공을 추정하지 않음 |
| UIA command 이름은 6/7인데 native ID 조회는 둘 다 0 | 실제 제품 관측에서 native class/owner/상태는 확인됐으나 ID는 고유 선택 근거가 아님; 조회 실패 여부는 미확정 | UIA ID 숫자를 native ID로 이식하지 않음; HWND 기반 호출은 별도 의미/identity/상태 검증과 승인 필요 |
| 새 native No는 성공하지만 Confirm 전에 `ElementNotAvailableException` | 보조 `Read-AppTree`의 desktop-wide `FindAll` 오류가 실행 흐름까지 중단; Confirm adapter에는 도달하지 않음 | 보조 진단의 unavailable과 필수 identity 실패를 분리; 진단 예외로 성공/실패를 잘못 승격하지 않음 |

관측한 ID/class는 이 runner의 사실이며 Windows 공통 API 계약으로 일반화하지 않는다.
Yes/No 모양만으로 덮어쓰기라고 단정하지 않는다. 실제 확인창 대상·소유 관계를 검증하는
adapter를 구현하기 전에는 무조건 Yes 또는 숫자 ID 교체로 우회하지 않는다.

## 해결

- **열기: 이전 harness 검증됨.** `903164b`에서 ID AND class `Button`, 중복 거부를 적용했다.
  focus·입력·native submit 뒤 spec이 clean title을 정확히 검사한다.
- **최초 PDF 생성: 해당 시나리오 통과.** 최신 전체 실행에서 HWP 6쪽/HWPX 10쪽의 정확한
  title·파일 생성·source hash·dirty 보존을 확인했다. 두 PDF의 별도 분석/시각 관측은 아래
  Stage 4.19에 둔다. 원격 전체 PDF 분석과 재실행 수용의 통과로 쓰지 않는다.
- **제품 재실행 덮어쓰기: 새 adapter의 미지원 capability 확인.** HWP 첫 확인창에서
  InvokePattern이 없어 안전하게 중단했다. HWPX restart와 원격 전체 PDF 분석은 미실행이다.
  제품 저장 결함이 확인된 것은 아니다.
- **판단 분리: Stage 4.17 Windows 검사 28개 통과.** 실제 helper의 순수 함수와 PS5.1
  실행 테스트를 연결했다. ID/class 충돌의 관측값을 재사용하고 PID/HWND는 합성한다.
  클릭 직전 UIA 재조회와 native 재검증을 추가했으므로 이전 open-only 성공을 새 helper의
  성공으로 그대로 옮기지 않는다. legacy ID6도 의미 adapter가 없으면 거부한다.
- **작은 OS 관측: 첫 실행 통과.** `windows-dialog-probe`는 제어된 저장창의 확인창까지
  관측하고 Yes는 누르지 않는다. 제품 재빌드·설치·PDF 분석 없이 지원 pattern·소유 관계를
  수집하며, 이 결과가 확인창 실행 adapter의 다음 승인 근거다.
- **작은 OS 통합: Stage 4.18 완료.** `d553f8e`에서 열기·새 저장·덮어쓰기·No/Cancel·
  잘못된 target 거부와 공개 fixture의 파일 사후 조건·cleanup이 모두 통과했다. 제품/PDF 성공은 아니다.
- **실제 앱 확인창 관측: Stage 4.20 완료.** native `Button`/활성 상태와 13개 guard true,
  UIA Invoke 미지원·native ID 조회 0을 확인했다. 버튼 실행 지원은 여전히 미검증이다.
- **실제 앱 native 거절: Stage 4.21 일부 통과.** No·저장창 복귀·Cancel·파일 보존과 잘못된
  target의 호출 전 거부를 검증했다. Confirm은 보조 진단 예외 때문에 호출 전 중단했다.

### Stage 4.19 실제 설치본 — InvokePattern 미지원 확인

[run 34049930142](https://github.com/postmelee/alhangeul-tauri/actions/runs/34049930142),
harness `23b631d03ee84cce631c3e798ffb4875d39297bc`의 Windows job은 14분 13초에 실패했다.
4.18 이후 제품/helper/workflow 변경은 없고 승인·상태 문서만 변경했다.
기존 제품 SHA/native run은 위와 같다. artifact `9986364323`의 provenance·digest·inventory와
NSIS 설치가 통과했으며 제품을 재빌드하지 않았다.

- fresh HWP/HWPX: 정확한 clean title에서 시작해 편집 입력·PDF 저장·source hash/dirty 보존을
  통과했다. 입력은 DOM event이며 physical IME나 동시 편집 검사가 아니다.
- HWP restart: 정확한 문서를 열었으나 Save helper의 `confirming-overwrite`에서
  `Confirmation InvokePattern unsupported.`로 중단했다. `CommandButton_6/7`은 모두
  `CCPushButton`, enabled, `ControlType.Pane`, `patterns=[]`로 기록됐다.
- 실패 위치는 `Select-PdfConfirmationButton`이다. 소유·의미 판정을 거쳐 후보 capability에서
  거부됐고 `ValidateCommand`/실제 Invoke는 호출되지 않았다. `nativeFailure=null`은 native
  guard 통과를 뜻하지 않는다. 실제 native button class/ID의 실행 적합성은 여전히 미확정이다.
- HWPX restart와 Ubuntu analyze job은 skipped다. `windows-pdf-summary.json`은 없다.
  NSIS cleanup과 WebView2 정책 복구는 passed다. 수집된 source 두 개·기존 target PDF 두 개의
  SHA-256이 fresh 기록과 그대로 일치함을 추가 확인했다. restart 저장 성공은 아니다.
- raw artifact `9994424240`, `windows-pdf-raw-34049930142`, 3737995 bytes,
  digest `sha256:896c6d18fb71c69d2b9b9b483f6d7371f75dc5798c0bec6e5764976b56b9f71c`.
  로컬 증거는 `/private/tmp/alhangeul-pdf-stage419.Zyl9q7`에 보존했다. raw 자료는 커밋하지 않는다.

부분 PDF 검토: 이미 Windows에서 생성된 `biz-plan-hwp-fresh.pdf`, `form-hwpx-fresh.pdf`만
로컬 Poppler 26.07.0과 기존 `analyzePdf()`로 검사했다. Mac 제품 실행/build가 아니며
skipped된 원격 analyze의 성공으로 기록하지 않는다. 두 PDF hash가 evidence와 일치하고,
쪽수 6/10·A4·`PDF검증` 검색·쪽별 text·nonblank·페이지 가장자리 clipping 검사가 통과했다.
HWP text counts는 `[50,642,410,638,478,250]`, HWPX는
`[994,1257,1005,1029,1010,1184,971,1185,982,1132]`다.

`partial-analysis/pdf/`의 16쪽 PNG를 모두 열람했다. 빈 쪽·전면적인 문자 깨짐은 없고,
HWP 본문/표는 판독 가능하다. HWPX 1/3/5/7/9쪽 상단 표의 긴 프로젝트 문구 등이 오른쪽
셀 경계에 밀착한다. 페이지 가장자리 검사로 셀 내부 잘림까지 보장할 수 없으므로 원본 앱의
같은 위치/기준 출력과 대조하기 전에는 조판 전체 정상 또는 신규 PDF 결함으로 단정하지 않는다.
제공된 앱 screenshot은 2쪽 일부여서 이 상단 표의 대조 근거가 아니다.

Stage 4.19는 미완료다. 완료 보고서·완료 커밋·새 원격 실행은 보류했다.
다음 승인 권고는 **같은 실제 앱의 확인창만 대상으로 native 속성/호출 경로를 확정하는 최소
진단**이다. 기존 bytes·공개 fixture를 재사용하고 PDF 전 사례·제품 build는 반복하지 않는다.
관측 없이 BM_CLICK/TDM_CLICK_BUTTON/다른 API를 순차 시도하거나 Invoke 조건만 삭제하지 않는다.
이 제한된 진단/보정 계획과 HWPX 표의 원본 대조 범위를 승인받은 뒤 진행한다.

### Stage 4.20 실제 앱 확인창 — 관측 완료, 호출은 미검증

후속 승인으로 실제 확인창 관측-only mode를 구현했다. HWP 한 개와 사전 생성한
sentinel만 사용하고 확인 버튼은 호출하지 않는다. 기존 의미/owner 관측과 native guard snapshot을
재사용해 UIA pattern, native class/ID, dialog 활성 상태를 함께 수집한다. 기존 Invoke 정책은
바꾸지 않았다. HWPX 원본 대조는 제외했다.

[run 34051827068](https://github.com/postmelee/alhangeul-tauri/actions/runs/34051827068),
harness `f090ea0c7e22544829c3c2a6d0cf76c17f64a0fe`의 Windows job은 **8분 34초 통과**했다.
제품 SHA/native run/artifact는 4.19와 같고 제품을 재빌드하지 않았다. PS5.1 parser 및 실제
정책 50개·native 진단 23개가 통과했다. 합성 조건 검사는 실제 UI 호출 검증과 별개다.

`confirmation-probe-Save.json`에서 `status=observed`, `stage=observed-confirmation`,
`overwriteConfirmed=false`, 정확한 시험 target 질문 일치와 다음 관측을 확인했다.
아래는 원문 경로/본문·수치 PID/HWND를 제외한 진단 필드 요약이다.

| 관측 | Confirm / Decline 각각의 결과 |
|---|---|
| UIA ID | `CommandButton_6` / `CommandButton_7` |
| UIA class / type | 둘 다 `CCPushButton` / `ControlType.Pane` |
| UIA capability | 둘 다 enabled, `supportsInvoke=false`, `patterns=[]` |
| native class | 저장창·확인창 `#32770`, 버튼 `Button` |
| native 13개 guard | 두 후보 각각 모두 true: PID·owner·자식/창 class·enabled 및 저장창 disabled |
| dialog 상태 | 둘 다 `dialogThreadObserved=true`, `dialogActive=true` |
| `GetDlgCtrlID` 반환값 | 둘 다 `0`; 숫자 6/7 또는 고유 native ID가 확인된 것이 아님 |

`GetDlgCtrlID`는 실패할 때도 0을 반환한다. 이번 probe는 오류 코드를 수집하지 않아
실패인지 실제 0 ID인지 판정하지 않는다. UIA 이름의 숫자를 native ID로 바꾸는 근거로
쓰지 않는다. 두 후보의 HWND가 서로 다른지도 이번 축약 자료만으로는 확인할 수 없다.
([Microsoft GetDlgCtrlID 계약](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getdlgctrlid))

`confirmation-probe.json`은 `documentIdentityVerified=true`, `commandInvoked=false`,
`pdfTested=false`다. 원본 HWP와 시험 target은 관측 시점 및 앱 정리 뒤 hash가 불변이다.
다운로드한 두 파일도 같은 hash임을 재확인했다. source는
`8b786d6824622afae2220b203beeef6e5592157e1896fea055ebc602817113c1`, target은
`d603dd3f3cbfbc96cc4d7c2acd1d4c6be600c4080bb7c0b3af6019ccac73223a`다.
`confirmation-probe-cleanup.json`의 두 보존 판정, `cleanup.json`의 NSIS 제거,
`webview2-policy-after.json`의 정책 복구가 통과했다. 확인창 No/Cancel 성공은 아니다.

raw artifact `9994901868`, `windows-pdf-raw-34051827068`, 294742 bytes,
digest `sha256:d4dfa633d2e3374e0c189546ad3f3b4a887d34b07d65ac5e881b0f758d1e3361`.
로컬 원본은 `/private/tmp/alhangeul-confirmation-stage420.yLLsCm`에 보존하고 커밋하지 않는다.
이 run은 실제 앱을 실행했지만 PDF 생성·HWPX·restart·Ubuntu analyze를 수행하지 않았다.

**다음 승인 권고**: native `Button`/활성 상태 관측을 근거로 HWND 대상 `BM_CLICK` 경로 하나를
구현하고, 같은 설치본·HWP 한 개로 실제 호출을 제한 검증한다. UIA command/의미·target·owner
재조회와 모든 native guard를 유지하고 두 HWND의 구별·활성 상태를 호출 전에 확인한다.
UIA Invoke 호출 실패 후 다른 API를 차례로 시도하지 않고, capability에 따라 지원 경로를
호출 전에 선택한다. native 숫자 ID 0/6/7로 버튼을 탐색하지 않는다.
`BM_CLICK`은 반환값이 없으므로 Confirm 후 실제 파일 생성/원본 보존, Decline 후 저장창
복귀/target 보존, 잘못된 target의 호출 전 거부를 별도 검사해야 한다.
([Microsoft BM_CLICK 계약](https://learn.microsoft.com/en-us/windows/win32/controls/bm-click))
이 경로는 아직 구현/검증하지 않았다. API 후보에 대한 추론과 실제 호출 지원은 구분한다.
Stage 4.19/#19 전체 수용, HWPX 표 대조, 전체 PDF 재실행은 미완료/별도 승인으로 유지한다.

### Stage 4.21 실제 앱 native 호출 보정 — 거절 통과, Confirm 전 보조 진단 실패

후속 승인에 따라 기존 의미/target·owner·유일한 UIA command와 native guard를 유지한
HWND `BM_CLICK` 경로를 구현했다. Invoke 지원 시 기존 경로를 사용하고, 두 command가
Pane/Invoke 미지원일 때만 native 경로를 선택한다. 두 HWND의 nonzero·구별·재조회 동일성,
각 native guard·dialog 활성 상태를 확인한다. native 숫자 ID는 선택 근거로 사용하지 않는다.
메시지 게시 후 다른 API로 재시도하지 않는다. 아래 원격 결과는 경로별로 구분한다.

`windows-pdf-dialog-verify`는 실제 앱·공개 HWP 한 개에서 Decline, WrongTarget 거부 뒤
Decline, Confirm을 검사한다. No 후 저장창 복귀·Cancel·앱 이전 상태 복구·세 파일 보존,
확인 후 PDF header/EOF·저장 완료·원본/다른 target 보존을 구분한다. 형식 외 쪽수/검색/조판,
HWPX/restart/전체 PDF 수용은 이번에 실행하지 않는다. 기존 cleanup 뒤 hash 검사도 유지한다.

[run 34053001644](https://github.com/postmelee/alhangeul-tauri/actions/runs/34053001644),
harness `816edd5aa3366a1c88c98e2596952b935eaecbfe`: Windows job **11분 8초 실패**.
제품 SHA/native run/artifact는 4.20과 같고 재빌드하지 않았다. PS5.1 parser·정책 **62/62**·
native 진단 **50/50**은 통과했다. 실제 spec은 다음 두 사례만 완료했다.

| 사례 | 실제 결과 |
|---|---|
| Decline | `Win32-BM_CLICK-command` No, enabled 저장창 복귀, native ID2 Cancel, dialog 0개, 이전 앱 상태 복구·clean title·세 파일 보존 통과 |
| WrongTarget | 다른 존재하는 target 요청을 `unknown-prompt`로 호출 전에 거부; 정확한 intent로 No 후 같은 복귀/취소/보존 통과 |
| Confirm | 저장창 제출 뒤 보조 트리 열거 예외; 확인 버튼/새 native 호출·PDF 생성은 미실행 |

Confirm helper는 2개 dialog를 관측한 뒤 `Read-AppTree`의
`RootElement.FindAll($scope, $AppCondition)`에서 실패했다. 실행 harness의
`scripts/windows-pdf-dialog.ps1:59`이며 로그의 `FullyQualifiedErrorId`는
`ElementNotAvailableException`이다. 호출부는 같은 파일 115행의 보조 `tree` 갱신이다.
필수 확인창 의미·후보 판정이나 `ClickCommand`의 실패로 해석하지 않는다.
`status=failed`, `stage=waiting-dialog-close`, `submitted=true`, `dialogCount=2`,
`overwriteConfirmed=false`, `confirmationObservation=null`, `nativeFailure=null`이다.
`buttonMethod=Win32-BM_CLICK`은 직전 **저장창 제출** 기록이지 확인 버튼 실행 기록이 아니다.

Microsoft는 이 예외를 더 이상 사용 가능한 UI에 대응하지 않는 요소 접근으로 설명한다.
따라서 이번 근본 결합 문제는 **보조 진단 열거 오류가 필수 실행까지 중단**한 것이다.
실제로 사라진 노드나 provider 내부 원인은 현재 로그만으로 확정하지 않는다.
([ElementNotAvailableException](https://learn.microsoft.com/en-us/dotnet/api/system.windows.automation.elementnotavailableexception))
desktop root의 전체 하위 탐색은 광범위하다. 상위 window를 찾을 때는 Children을 사용하라는
공식 권고와, 앱/dialog 범위로 좁힌 후 진단을 수집하는 설계를 후속에 적용한다.
([FindAll 탐색 범위](https://learn.microsoft.com/en-us/dotnet/api/system.windows.automation.automationelement.findall))

NSIS cleanup과 WebView2 정책 복구는 통과했다. 후속 `Verify confirmation files after app
cleanup`은 전체 `status=failed`를 보고 hash 비교 전에 거부했다. cleanup 실패나 파일 훼손이
관측된 것은 아니다. 업로드된 정리 후 세 파일의 SHA-256을 별도 로컬 검사한 결과 최초 값과
모두 일치한다. `confirmation-verify-cleanup.json`은 없으므로 원격 후속 step 성공으로 기록하지 않는다.

- source HWP (33792 bytes): `8b786d6824622afae2220b203beeef6e5592157e1896fea055ebc602817113c1`.
- target sentinel (29 bytes): `602e30f3952244156aac2dfdc4f84ac4c07e75adafd0b592a5b83859f8800489`.
- other sentinel (22 bytes): `24b02870c932659268c975abfe50d39a1867361e942eda30ef25128fd5bf7947`.
- raw artifact `9995278936`, `windows-pdf-raw-34053001644`, 460297 bytes,
  digest `sha256:6f84a1583af73414c5541ffc0108e215b9dc3a8afa437811d2188396d3217ff1`.
  로컬 `/private/tmp/alhangeul-confirmation-stage421.osqT2f`에 보존하고 raw는 커밋하지 않는다.

Stage 4.21은 미완료다. 완료 보고서와 추가 실행을 보류한다. 다음 승인 범위는 **보조 진단
탐색 축소·ElementNotAvailable 예외 격리·Confirm-only 검증**이다. 진단 수집 불능은 명시하되
원문 예외/문서 내용을 저장하지 않는다. 필수 의미/target/owner/identity·native guard의 오류는
그대로 실패시키며 일반 catch-all·무조건 클릭·timeout 증가를 추가하지 않는다. 새 예외 분류를
실제 PowerShell 함수 회귀로 확인하고, 같은 설치본에서 남은 Confirm만 한 번 검증한다.
이미 통과한 두 거절 사례를 반복하거나 제품을 재빌드하지 않는 범위로 승인을 요청한다.

후속 `진행해줘`로 같은 4.21의 보정을 승인받았다. 보조 진단은 관측된 dialog 하위 최대 100개
노드로 줄이고, typed `ElementNotAvailableException`만 제한된 inner chain에서 분류해
`unavailable`/고정 reason/빈 tree로 기록한다. 예외 문구로 판정하지 않고 부분 snapshot을 버린다.
필수 dialog/정확한 target/owner/identity/native guard와 클릭 adapter는 그대로 유지한다.
기존 verify mode의 `confirmation_cases=confirm-only`로 남은 Confirm만 실행하며 선택 범위를
spec/cleanup 증거에 명시한다. PS 합성 예외 회귀는 실제 wrapper를 호출하고 설치 전에 실행한다.
이전 실패 run 및 두 거절 결과는 그대로 유지한다. 원격 결과는 검증 뒤 별도로 기록한다.

### Stage 4.18 작은 통합 — class 비교 보정 후 완료

4.17에서 관측한 InvokePattern만 사용하는 확인창 adapter를 실제 PDF helper와 작은 통합에
연결했다. 저장창 owner/PID·Save 및 제출 경로·기존 target·영문 질문의 정확한 파일명·
command 유일성/상태/pattern을 확인하고 호출 직전 재조회한다. No 후 저장창 복귀와 ID2 취소,
다른 파일을 기대한 잘못된 요청의 거부를 제어된 Windows fixture에서 검사한다.

[run 34048114390](https://github.com/postmelee/alhangeul-tauri/actions/runs/34048114390),
harness `f1984497320945f7bf62d6504657393fc0973be7`에서 작은 통합을 한 번 실행했다.
Windows image `20260824.214.3`, PS `5.1.26100.33296`이며 제품 설치·PDF 렌더링은 없다.

- 실제 PS 정책 검사 50개(환경 확인 1개 포함)는 통과했다. 합성 정책 입력의 통과이지
  확인 버튼의 실제 호출 성공을 뜻하지 않는다.
- Open·Fresh는 실제 dialog와 host의 선택 경로, target 내용·source/다른 target 보존까지 통과했다.
- Overwrite는 `windows-pdf-confirmation.ps1:45`의 `ValidateCommand` 호출에서
  `MethodInvocationException`으로 중단했다. 실행 순서상 두 번의 소유·의미·target·UIA 후보/
  pattern 검사와 후보 동일성 검사를 지났으나, native 재검증 뒤의 `Invoke()`에는 도달하지 않았다.
- Decline·WrongTarget은 앞선 실패 때문에 미실행이다. 실패한 Overwrite의 파일 사후 조건도
  수집되지 않았으므로 보존 검증 통과로 쓰지 않는다. 시험 process·임시 파일 cleanup은 통과했다.

첫 실행 당시 진단의 한계: `ValidateCommand`는 native owner, button PID, `IsChild`,
`GetClassName`, enabled를 한 조건으로 검사한다. artifact에는 UIA class `CCPushButton`과
InvokePattern 및 native owner/직접 parent만 있고, 해당 버튼의 **native class와 각 guard 결과는 없다**.
따라서 당시에는 정확히 어느 native 조건이 실패했는지 미확정이었다.

이번 구현은 UIA에서 관측한 `CCPushButton`을 native `GetClassName`에도 그대로 요구했다.
이는 관측으로 확인하지 않은 가정이었다. Microsoft는 UIA ClassName을 provider 구현에
따른 이름으로 설명한다. UIA와 native class의 동일성을 가정하지 말아야 하지만, 이번 실패가
실제로 class 차이 때문인지는 당시 가설로 남겼다. 아래 후속 진단에서 이를 확인했다.
([Microsoft ClassName 계약](https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-automation-element-propids))

다음 승인 범위는 같은 확인창의 guard별 구조화 진단이다. UIA/native class를 분리하고
PID 일치·자식 관계·enabled·owner 검사 결과를 각각 남긴다. 원문 경로/본문/임의 예외 문자열은
추가하지 않는다. 실제 native 실패 이유를 확인하기 전 guard 삭제·다른 class 추측·다른 클릭 API
fallback은 하지 않는다. 이 보정과 작은 재검증 승인을 받은 뒤 진행하며 전체 PDF 재실행은 보류한다.

후속 승인에 따라 같은 native 판정 snapshot의 13개 guard 결과와 별도 native class를
허용 목록으로 추출하도록 보정했다. 실패 조건의 누락/타입 오류, 예외 중첩, class 필터와
무효 HWND 거부를 실제 PS/C# 함수로 검사한다. 비교 조건과 클릭 방식은 바꾸지 않았으며
작은 `windows-dialog-verify` 한 번으로 실패 이유를 확인한다. 실행 전 로컬 focused 계약 50개,
workflow/handoff 계약 75개(중복 import 포함), GUI typecheck, actionlint와 diff 검사는 통과했다.

#### 후속 진단 결과 — native class 불일치 확인

[run 34048778670](https://github.com/postmelee/alhangeul-tauri/actions/runs/34048778670),
harness `5096438a84654c0b4ac232067f99def3e5e892ab`의 작은 job은 36초에 종료했다.
image `20260824.214.3`, PS `5.1.26100.33296`으로 앞선 실행과 같다.
실제 PS 정책 50개와 native 진단 테스트 22개가 통과했다. 후자는 합성 guard와 무효 HWND를
검사한 것이며 확인 버튼 클릭 22회를 뜻하지 않는다. Open/Fresh 및 세 파일 사후 조건·cleanup은
다시 통과했다. Overwrite는 Invoke 전 거부됐고 Decline/WrongTarget은 미실행이다.

같은 native 판정 snapshot에서 `failedChecks = ["buttonClassMatches"]`만 남았다.
`nativeSaveClass = "#32770"`, `nativeConfirmationClass = "#32770"`,
`nativeButtonClass = "Button"`이다. 나머지 12개 guard는 모두 true다. 별도 UIA 관측은
`CommandButton_6`, class `CCPushButton`, ControlType.Button, InvokePattern(10000)이었다.
즉 이번 작은 fixture의 차단 원인은 **UIA class를 native class에도 요구한 구현의 잘못된 가정**이다.
특정 guard 실패를 구분하는 진단 목적은 달성했으나 통합 결과 자체는 여전히 실패다.

권고 보정은 UIA `CCPushButton` 조건을 유지하면서 native class 조건만 관측된 `Button`으로
고치는 것이다. PID·owner·자식 관계·enabled·의미/대상·capability 및 사후 조건은 그대로 둔다.
이 비교 변경과 작은 통합 재실행은 당시 다음 승인 범위로 남겼다.
실제 Alhangeul에서의 InvokePattern 지원/덮어쓰기는 미검증이며 당시 Stage 4.18도 미완료였다.

후속 승인으로 native class 비교만 `Button`으로 보정했다. UIA `CCPushButton`·다른 guard·
Invoke 방식은 유지한다. 관련 합성 데이터/정적 계약을 정렬한 뒤 작은 통합 재검증 한 번으로
실제 overwrite와 No/Cancel·잘못된 target 거부의 사후 조건을 확인했다.

#### 비교 보정 결과 — 작은 통합 5개 통과

[run 34049005561](https://github.com/postmelee/alhangeul-tauri/actions/runs/34049005561),
harness `d553f8ef4e3711f19828d3d297a8f1355981e8be`: **43초 통과**.
image `20260824.214.3`, OS `10.0.26100.0`, PS `5.1.26100.33296`이다.
정책 50개와 native 진단 22개, 아래 실제 작은 통합 5개 및 cleanup이 통과했다.

| 사례 | 실제 사후 조건 |
|---|---|
| Open | 정확한 선택 경로, target/source/다른 target 보존 |
| Fresh | 정확한 선택 경로와 새 target 내용, source/다른 target 보존 |
| Overwrite | `UIA-InvokePattern` Confirm, OK, 지정 target 갱신, source/다른 target 보존 |
| Decline | `UIA-InvokePattern` No, enabled 저장창 복귀, ID2 Cancel, 세 파일 보존 |
| WrongTarget | 잘못된 요청이 `unknown-prompt`로 거부됨, 이후 No/Cancel, 세 파일 보존 |

`integration.json`의 `passed=true`, 모든 case의 `passed=true`, `cleanupPassed=true`,
`productTested=false`를 확인했다. 취소 사례의 `selectedExpected=false`는 Cancel 결과에 맞다.
실제 제품 설치·PDF 렌더링은 실행하지 않았다. 이전 실패와 수동 근거를 통과로 바꿔 쓰지 않는다.
검증 후에는 문서/보고만 수정하므로 같은 작은 OS job을 반복하지 않는다.

### Stage 4.17 관측과 당시 adapter 판단

run `34047467032`, harness `cd77b5704470f14ee674c72351b60af92e638b05`의 작은 job은
27초에 통과했다. Windows image `20260824.214.3`, PS `5.1.26100.33296`, UI 언어 `en-US`다.
PS 실행 검사 28개(환경 확인 1개 포함), 실제 C# Add-Type compile/load, Save focus·입력·
readback·재조회/native 검증·제출을 확인했다. 시험 파일 hash 불변, 시험 process 종료와
임시 디렉터리·cleanup state 정리가 통과했다. 제품 설치나 PDF 렌더링은 실행하지 않았다.

- 확인창은 저장창을 native owner로 가지며 같은 process다. 저장창 disabled/확인창 enabled.
- `ContentText`는 공개 fixture 이름과 기존 파일 대체 질문에 정확히 대응했다.
- `CommandButton_6/7`의 class는 이전 제품 관측과 같은 `CCPushButton`이다.
  다만 이번 **WinForms fixture는 ControlType.Button과 InvokePattern(10000)**을 제공한다.
  이전 **Alhangeul은 ControlType.Pane**이었고 pattern 근거가 없다. 같은 형태라는 이유로
  실제 앱도 InvokePattern을 지원한다고 단정하지 않는다.
- 다음 단계 후보는 소유·의미·target·capability 재검증 뒤 **확인된 InvokePattern만 호출**하는
  경로다. fixture로 호출·취소/거부 사후 조건을 먼저 확인하고, 실제 앱에서 pattern이 없다면
  미지원으로 보고한다. BM_CLICK/TDM_CLICK_BUTTON/LegacyIAccessible를 차례로 시도하지 않는다.
- Yes는 이번 단계에서 호출하지 않았으므로 overwrite adapter는 아직 미구현/미검증이다.
  이 단계의 cleanup은 프로세스 회수이지 사용자 취소 시나리오의 통과가 아니다.

수치 HWND/PID, 원문 경로와 중복 노드를 제외한 관측은
[축약 fixture](../../tests/fixtures/windows-dialog-controls.json)의 `controlledProbe`에 보존한다.

변경 경계는 [dialog helper](../../scripts/windows-pdf-dialog.ps1),
[Win32 adapter](../../scripts/windows-pdf-win32.ps1),
[문서 identity](../../tests/gui/support/document-identity.ts)와
[PDF evidence 판정](../../tests/gui/windows-pdf/analyze.mjs)이다.

## 재발 방지

- [축약 데이터](../../tests/fixtures/windows-pdf-regressions.json)는 실제 run 결과에서
  필요한 판정 필드만 남긴 것이다. 개인 경로·stack trace·본문·PID/HWND는 저장하지 않는다.
- [동작 테스트](../../tests/windows-pdf-regressions.test.mjs)는 spec/analyzer가 실제 사용하는
  `assertDocumentIdentity`, `validateEvidence`, `analyzeWindowsPdfs`를 호출한다.
  원본 PDF 대신 합성 bytes와 mock 분석기를 쓰므로 실제 PDF 품질이나 클릭 검증은 아니다.
- wrong title은 identity flag를 true로 바꿔도 거부하고, 실패/부분/open-only 증거로
  전체 summary가 생성되지 않는지 확인한다. 합성 변형은 관측 결과와 분리한다.
- 버튼 선택/메시지 보정 시에는 작은 대상 OS 검증을 먼저 설계한다. 알려진 미지원 경로를
  남긴 채 전체 성공을 기대하거나 timeout만 늘리지 않는다.
- UIA와 Win32에서 이름이 비슷한 속성도 관측 출처를 분리한다. 복합 guard 실패를 한 예외로
  뭉개지 말고, 실패 조건을 구분할 수 있는 안전한 판정값을 남긴다.
- 사실·명령·관련 테스트가 바뀌면 이 기록과 공통 가이드를 같은 변경에서 갱신한다.
  원격 artifact가 만료돼도 이 최소 데이터와 출처 링크는 남긴다.

## 검증

| 원격 근거 | 판정 |
|---|---|
| [34039516394](https://github.com/postmelee/alhangeul-tauri/actions/runs/34039516394), harness `e52d0fa` | HWPX 요청에서 HWP title을 관측, 새 identity 검증이 편집 전에 거부 |
| [34042086165](https://github.com/postmelee/alhangeul-tauri/actions/runs/34042086165), harness `1021b8d` | native identity 검증으로 ID-only selector의 파일 항목 오선택 발견 |
| [34042833704](https://github.com/postmelee/alhangeul-tauri/actions/runs/34042833704), harness `903164b` | HWP/HWPX open-only 성공; `pdfTested=false` |
| [34043594332](https://github.com/postmelee/alhangeul-tauri/actions/runs/34043594332), harness `903164b` | fresh 두 문서 성공, HWP restart의 미지원 확인창 실패; Linux PDF 분석 skipped |
| [34047467032](https://github.com/postmelee/alhangeul-tauri/actions/runs/34047467032), harness `cd77b57` | 작은 policy/WinForms 확인창 관측·cleanup 통과, 실제 제품/PDF/Yes 호출 없음 |
| [34048114390](https://github.com/postmelee/alhangeul-tauri/actions/runs/34048114390), harness `f198449` | PS 50개·Open/Fresh·cleanup 통과; Overwrite native 재검증 실패, Invoke/Decline/WrongTarget 미실행 |
| [34048778670](https://github.com/postmelee/alhangeul-tauri/actions/runs/34048778670), harness `5096438` | PS 정책 50개·진단 22개·Open/Fresh·cleanup 통과; native class만 불일치 확인, 통합은 실패 유지 |
| [34049005561](https://github.com/postmelee/alhangeul-tauri/actions/runs/34049005561), harness `d553f8e` | PS 정책 50개·진단 22개·통합 5개·cleanup 통과; 실제 제품/PDF는 미실행 |
| [34049930142](https://github.com/postmelee/alhangeul-tauri/actions/runs/34049930142), harness `23b631d` | fresh 두 문서 저장 통과; 실제 HWP restart 확인창의 Invoke 미지원으로 실패, HWPX restart/원격 analyze skipped; fresh PDF만 별도 로컬 분석 |
| [34051827068](https://github.com/postmelee/alhangeul-tauri/actions/runs/34051827068), harness `f090ea0` | PS 정책 50개·native 진단 23개·실제 앱 확인창 관측·파일 보존·cleanup 통과; 확인 버튼 호출/PDF 미실행 |
| [34053001644](https://github.com/postmelee/alhangeul-tauri/actions/runs/34053001644), harness `816edd5` | PS 정책 62개·native 진단 50개·Decline/WrongTarget 통과; Confirm 전 보조 UIA 열거 예외, 세 파일 보존 별도 확인; 전체 제한 검증은 실패 |

2026-09-06 작업지시자는 실제 Windows NSIS에서 두 문서의 PDF 저장·검색·쪽 수·시각 확인,
원본 보존과 재실행 덮어쓰기를 문제없이 완료했다고 보고했다. 해당 수동 근거는 유지한다.
설치 SHA/OS 상세 버전은 별도 제공되지 않아 위 exact-SHA 자동 성공으로 바꾸어 기록하지 않는다.

로컬 회귀와 이전 가이드 작업은 [Stage 4.16](../working/task_m010_19_stage4.16.md),
작은 Windows 관측은 [Stage 4.17](../working/task_m010_19_stage4.17.md),
작은 확인창 실행·통합은 [Stage 4.18](../working/task_m010_19_stage4.18.md),
실제 앱 관측과 다음 승인 경계는 [Stage 4.20](../working/task_m010_19_stage4.20.md)에 둔다.

## 참고

- [Stage 4.11 조사·수동 수용](../working/task_m010_19_stage4.11.md)
- [Stage 4.15 열기 보정과 실제 결과](../working/task_m010_19_stage4.15.md)
- [작업 수행계획과 문서 위치](../plans/task_m010_19.md)
- [Microsoft AutomationId 설명](https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/use-the-automationid-property)
