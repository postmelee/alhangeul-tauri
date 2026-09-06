# Task #19 — Windows PDF 자동화의 탐색·입력·확인창 함정

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
공통 기준: [Native UI 테스트 가이드](../../docs/operations/NATIVE_UI_TESTING.md)

## 증상

helper가 성공을 반환해도 다른 문서가 열리거나 요청과 다른 파일명으로 저장되었다.
열기 보정 이후 최초 HWP/HWPX PDF 생성은 통과했으나 재실행 덮어쓰기 확인창에서 중단했다.
최신 전체 run은 실패이며, 아래 해결 상태는 경계별로 구분한다.

## 재현 조건

- 관측 환경: GitHub hosted `windows-2025`, Windows NSIS 설치본,
  `tauri-driver 2.0.6`, `@wdio/tauri-service 1.3.0`.
- 최신 전체 run의 WebView2 보고 버전: `151.0.4129.101`.
  runner label은 고정 OS image build를 뜻하지 않는다. 언어/DPI의 별도 검증 근거는 없다.
- 제품 SHA: `69b22650df96323a2c59e473d474ed3195cc9cc7`.
  기존 installer artifact run: `34021920074`.
- 열기 성공·최신 전체 실행 harness: `903164b428a4d19265f7d078a85323596261a7c2`.
- 입력은 저장소의 공개 HWP/HWPX fixture 복사본이다. 개인 문서는 사용하지 않았다.

현재 판정 함수의 빠른 재현:

```sh
pnpm run test:gui:windows:contracts
```

이는 Windows dialog 재현 명령이 아니다. 실제 재현은 별도 승인 후 기존 Desktop dispatcher의
`windows-pdf-open-probe` 또는 `windows-pdf-acceptance`를 사용하며, candidate SHA와
성공한 native artifact run ID를 명시한다. artifact 만료 여부를 먼저 확인한다.
현재 미지원 overwrite를 그대로 둔 전체 실행을 반복하지 않는다.

## 원인

| 관측 | 확인된 원인/한계 | 재발 방지 |
|---|---|---|
| helper 성공인데 HWPX 대신 이전 HWP가 열림 | ID `1`이 `UIItem`과 `Button` 양쪽에 존재; ID-only `FindFirst`는 파일 항목을 고를 수 있었음 | ID/class·범위·중복 검사와 최종 문서 identity를 모두 유지 |
| 입력칸이 보이지만 UIA focus/pattern이 안 됨 | 관측된 control이 기대 pattern을 제공하지 않음; 표시된 ControlType만으로 조작 방식을 추정했음 | 관측 capability 기반 adapter와 focus/readback/실제 결과를 구분 |
| 입력 문자열 readback 후에도 다른 파일명/문서 | readback은 텍스트 상태만 확인하며 실제 dialog 선택·처리 완료의 증거가 아님 | 실제 경로·title 사후 조건 추가; 문자열 확인만으로 성공 금지 |
| 재시작 Save에서 `Unsupported overwrite confirmation controls` | helper는 ID `6`/class `Button` 실행만 지원하지만 실제 확인창은 `CommandButton_6/7`, class `CCPushButton`으로 관측 | 형태 인식과 의미/대상 확인 및 실제 승인 구현을 분리; 아직 미해결 |

관측한 ID/class는 이 runner의 사실이며 Windows 공통 API 계약으로 일반화하지 않는다.
Yes/No 모양만으로 덮어쓰기라고 단정하지 않는다. 실제 확인창 대상·소유 관계를 검증하는
adapter를 구현하기 전에는 무조건 Yes 또는 숫자 ID 교체로 우회하지 않는다.

## 해결

- **열기: 이전 harness 검증됨.** `903164b`에서 ID AND class `Button`, 중복 거부를 적용했다.
  focus·입력·native submit 뒤 spec이 clean title을 정확히 검사한다.
- **최초 PDF 생성: 해당 시나리오 통과.** HWP 6쪽/HWPX 10쪽의 정확한 title,
  파일 생성, source hash·dirty 보존이 최신 전체 실행의 fresh 결과에 기록되었다.
  후속 PDF 내용/렌더 분석은 실행되지 않았으므로 PDF 품질 전체 통과로 쓰지 않는다.
- **재실행 덮어쓰기: 미해결.** HWP의 첫 overwrite 확인창에서 안전하게 실패했다.
  HWPX restart와 전체 PDF 분석은 미실행이다. 제품 저장 결함이 확인된 것은 아니다.
- **판단 분리: Stage 4.17 Windows 검사 28개 통과.** 실제 helper의 순수 함수와 PS5.1
  실행 테스트를 연결했다. ID/class 충돌의 관측값을 재사용하고 PID/HWND는 합성한다.
  클릭 직전 UIA 재조회와 native 재검증을 추가했으므로 이전 open-only 성공을 새 helper의
  성공으로 그대로 옮기지 않는다. legacy ID6도 의미 adapter가 없으면 거부한다.
- **작은 OS 관측: 첫 실행 통과.** `windows-dialog-probe`는 제어된 저장창의 확인창까지
  관측하고 Yes는 누르지 않는다. 제품 재빌드·설치·PDF 분석 없이 지원 pattern·소유 관계를
  수집하며, 이 결과가 확인창 실행 adapter의 다음 승인 근거다.

### Stage 4.18 구현 — 작은 통합 실행 대기

4.17에서 관측한 InvokePattern만 사용하는 확인창 adapter를 실제 PDF helper와 작은 통합에
연결했다. 저장창 owner/PID·Save 및 제출 경로·기존 target·영문 질문의 정확한 파일명·
command 유일성/상태/pattern을 확인하고 호출 직전 재조회한다. No 후 저장창 복귀와 ID2 취소,
다른 파일을 기대한 잘못된 요청의 거부를 제어된 Windows fixture에서 검사한다.
아직 이번 adapter의 Windows 실행 결과와 실제 제품 PDF 결과는 미검증이다.

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

2026-09-06 작업지시자는 실제 Windows NSIS에서 두 문서의 PDF 저장·검색·쪽 수·시각 확인,
원본 보존과 재실행 덮어쓰기를 문제없이 완료했다고 보고했다. 해당 수동 근거는 유지한다.
설치 SHA/OS 상세 버전은 별도 제공되지 않아 위 exact-SHA 자동 성공으로 바꾸어 기록하지 않는다.

로컬 회귀와 이전 가이드 작업은 [Stage 4.16](../working/task_m010_19_stage4.16.md),
작은 Windows 검증과 다음 승인 경계는 [Stage 4.17](../working/task_m010_19_stage4.17.md)에 둔다.

## 참고

- [Stage 4.11 조사·수동 수용](../working/task_m010_19_stage4.11.md)
- [Stage 4.15 열기 보정과 실제 결과](../working/task_m010_19_stage4.15.md)
- [작업 수행계획과 문서 위치](../plans/task_m010_19.md)
- [Microsoft AutomationId 설명](https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/use-the-automationid-property)
