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

- **열기: 검증됨.** `Find-NativeButton`에 ID AND class `Button`, 중복 거부를 적용했다.
  focus·입력·native submit 뒤 spec이 clean title을 정확히 검사한다.
- **최초 PDF 생성: 해당 시나리오 통과.** HWP 6쪽/HWPX 10쪽의 정확한 title,
  파일 생성, source hash·dirty 보존이 최신 전체 실행의 fresh 결과에 기록되었다.
  후속 PDF 내용/렌더 분석은 실행되지 않았으므로 PDF 품질 전체 통과로 쓰지 않는다.
- **재실행 덮어쓰기: 미해결.** HWP의 첫 overwrite 확인창에서 안전하게 실패했다.
  HWPX restart와 전체 PDF 분석은 미실행이다. 제품 저장 결함이 확인된 것은 아니다.
- **selector/message 동작 단위 테스트: 공백.** 현재 소스 문자열 계약은 있지만 실제
  helper가 쓰는 판단 함수를 분리·재생하는 테스트는 아직 없다. 가이드 작성으로 해결했다고 하지 않는다.

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

2026-09-06 작업지시자는 실제 Windows NSIS에서 두 문서의 PDF 저장·검색·쪽 수·시각 확인,
원본 보존과 재실행 덮어쓰기를 문제없이 완료했다고 보고했다. 해당 수동 근거는 유지한다.
설치 SHA/OS 상세 버전은 별도 제공되지 않아 위 exact-SHA 자동 성공으로 바꾸어 기록하지 않는다.

로컬 회귀 결과와 단계 승인 상태는 [Stage 4.16](../working/task_m010_19_stage4.16.md)에 둔다.

## 참고

- [Stage 4.11 조사·수동 수용](../working/task_m010_19_stage4.11.md)
- [Stage 4.15 열기 보정과 실제 결과](../working/task_m010_19_stage4.15.md)
- [작업 수행계획과 문서 위치](../plans/task_m010_19.md)
- [Microsoft AutomationId 설명](https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/use-the-automationid-property)
