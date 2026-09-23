# Task #19 Stage 4.20 — 실제 앱 확인창 관측 전용 진단

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [`task_m010_19_impl.md`](../plans/task_m010_19_impl.md)
Stage: 4.20

## 단계 목적

Stage 4.19의 실제 앱 InvokePattern 미지원 원인을 확인창 한 곳으로 좁힌다. 기존 설치본과
공개 HWP 한 개로 의미/대상·UIA/native 속성을 관측하고 확인 버튼은 호출하지 않는다.
진단 완료와 실제 덮어쓰기·전체 PDF 수용을 분리한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-pdf-confirmation-probe.ps1` | 24 LOC, 공유 의미/owner 판정 뒤 두 command의 제한된 관측만 반환 |
| `scripts/windows-pdf-confirmation.ps1` | 기존 의미/소유/후보 관측을 추출; Invoke 요구와 실행 정책 유지 |
| `scripts/windows-pdf-win32.ps1` | 기존 13개 guard snapshot 재사용, native class/ID·dialog 활성 상태의 read-only 관측 |
| `scripts/windows-pdf-dialog.ps1` | 기존 파일 Save에만 허용되는 관측 switch, 확인 호출 전 `observed` 증거 반환 |
| `tests/gui/specs/windows-confirmation-probe.e2e.ts` | 67 LOC, 공개 HWP·새 sentinel·정확한 문서 identity·두 hash 불변 검사 |
| `tests/gui/wdio.windows-pdf.conf.ts` | fresh 단일 진단 spec 분기; 기존 PDF/restart 경로 유지 |
| `.github/workflows/alhangeul-desktop.yml`, `alhangeul-windows-pdf.yml` | 관측 mode, PS 사전 검사, 기존 설치/cleanup 재사용, 정리 뒤 hash 검사 |
| `tests/windows-pdf-native-diagnostics.test.ps1`, `windows-pdf-workflow.test.mjs` | read-only Win32 무효 handle 검사와 probe/안전 경계 정적 계약 |
| 기존 가이드·사건 기록·plans/orders 및 이 보고서 | 실제 관측·검증 한계·다음 승인 범위 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품·rhwp·패키지/릴리즈 bytes는 바꾸지 않았다. 기존 구현/문서와 4.19 실패 기록을 보존했다.
관측은 실행 함수와 같은 의미/owner·후보 판정을 재사용한다. Invoke 조건 삭제, 다른 클릭 API,
확인창 강제 승인, 원문 prompt/문서 본문을 새 진단에 저장하는 변경은 하지 않았다.
기존 dispatcher/계약 suite의 크기 예외는 승인 계획에 기록했고 새 두 파일은 300 LOC 이내다.

## 검증 결과

구현 checkpoint 전 로컬 검증:

```sh
pnpm run test:gui:windows:contracts
pnpm run typecheck:gui
node --test tests/actions-workflows.test.mjs tests/workflow-artifact-handoff.test.mjs
actionlint -shellcheck= .github/workflows/alhangeul-windows-pdf.yml .github/workflows/alhangeul-desktop.yml
git diff --check
```

- focused Node 계약 **51/51**, workflow/handoff **76/76**, GUI typecheck·actionlint·diff 통과.
  두 suite는 import 중복이 있어 합산하지 않는다. Node 정적 계약은 PS/native 실행 증거가 아니다.
- [run 34051827068](https://github.com/postmelee/alhangeul-tauri/actions/runs/34051827068)의
  Windows job **8분 34초 통과**. harness `f090ea0c7e22544829c3c2a6d0cf76c17f64a0fe`.
- 재사용한 제품 SHA `69b22650df96323a2c59e473d474ed3195cc9cc7`, native run `34021920074`,
  Windows artifact `9986364323`, 123231295 bytes,
  digest `sha256:02c13e35d515d08c7793d315905125932a33209b8e63b1f750998a62b1226bdc`.
  handoff·inventory·NSIS 설치 통과. 제품 재빌드는 없고 기존 driver 준비만 수행했다.
- Windows PowerShell `5.1.26100.33296` parser·실제 정책 **50/50**·native 진단 **23/23** 통과.
  정책/진단의 합성 입력·무효 HWND 검사를 실제 버튼 호출 성공으로 세지 않는다.
- 실제 확인창: 정확한 target 질문 일치, `CommandButton_6/7` 모두 UIA `CCPushButton`/Pane,
  enabled, `supportsInvoke=false`, `patterns=[]`. native는 저장창·확인창 `#32770`, 버튼 `Button`.
  두 후보 각각 13개 native guard가 true이고 dialog thread 관측/활성 상태가 true였다.
- `GetDlgCtrlID`는 두 후보에서 모두 0을 반환했다. 오류 코드가 없어 유효 ID인지 조회 실패인지
  미확정이며 UIA 숫자와 같은 native ID가 확인된 것으로 해석하지 않는다. HWND 상호 구별도
  이번 자료에 없다. [상세 관측과 API 근거](../troubleshootings/task_m010_19_windows_pdf_automation.md).
- `confirmation-probe-Save.json`: `observed`, `overwriteConfirmed=false`.
  `confirmation-probe.json`: 문서 identity 통과, `commandInvoked=false`, `pdfTested=false`.
  source/target hash는 관측 시점·앱 cleanup 뒤·다운로드한 파일에서 모두 불변이었다.
- `confirmation-probe-cleanup.json`, `cleanup.json`, `webview2-policy-after.json`에서
  두 파일 보존·NSIS 제거·WebView2 정책 복구 통과. 앱 종료는 사용자 No/Cancel 검증이 아니다.
- raw artifact `9994901868` / `windows-pdf-raw-34051827068`, 294742 bytes,
  digest `sha256:d4dfa633d2e3374e0c189546ad3f3b4a887d34b07d65ac5e881b0f758d1e3361`.
  원본 raw 파일은 커밋하지 않고 필요한 판정/출처만 사건 기록에 보존했다.
- HWPX·restart·PDF 생성/분석·다른 제품 build/썸네일/updater/릴리즈 job은 미실행이다.
- 승인 계획대로 원격 실행에 필요한 checkpoint를 먼저 게시했다. 실제 통과 확인 후에는
  결과 문서만 갱신하며 history rewrite나 변경 없는 원격 재실행은 하지 않는다.
- 결과 문서 6개의 상대 링크 50개·보고서 필수 섹션·diff 검사가 통과했다.
  제품 SHA 대비 `apps`/`crates`/`third_party`/두 lockfile의 차이가 없음을 재확인했다.

## 잔여 위험

- 진단 `observed`는 호출 가능 또는 전체 수용 통과가 아니다. 현재 Invoke-only adapter는
  실제 앱에서 계속 미지원 상태이며 제품의 저장 결함으로 단정하지 않는다.
- native class/guard가 맞더라도 두 UIA command와 HWND의 고유 대응·실제 메시지 처리는
  검증하지 않았다. 숫자 ID 0이나 UIA ID의 접미사로 이를 대체하지 않는다.
- 이 runner/실행 시점의 관측을 다른 OS image·언어·provider에 일반화하지 않는다.
- Stage 4.19의 전체 PDF 검증, HWPX 표 원본 대조, #19의 나머지 수용 경계는 미완료다.
  사용자의 Windows 수동 정상 보고는 별도 근거로 유지하고 exact-SHA 자동 성공으로 바꾸지 않는다.

## 다음 단계 영향

Stage 4.20은 관측·파일 보존 진단으로 완료다. 다음 후보는 관측된 native `Button`에 대한
HWND 기반 `BM_CLICK` adapter와 실제 앱 단일 HWP의 제한된 호출 검증이다. API 후보 선정은
관측/공식 계약에 근거한 추론이며 아직 실제 지원 검증은 아니다.

기존 의미/target·UIA command의 유일성/재조회·native guard를 유지하고 두 HWND의 구별과
활성 상태를 호출 전에 검사해야 한다. Confirm/Decline·잘못된 target 거부 및 각 파일/창의
사후 조건을 검증한다. 메시지 전달 성공만으로 저장 성공을 보고하지 않는다. 다른 API의
연쇄 fallback·강제 활성화·제품 재빌드 없이 해당 경로부터 확인한다.
전체 HWP/HWPX fresh/restart·PDF 품질 검증은 이 차단 원인이 해소된 뒤 별도 승인한다.

## 승인 요청

Stage 4.20 결과 검토 후 관측 기반 native 확인창 adapter 보정과 실제 앱 제한 검증의
진행 승인을 요청한다. 아직 이 다음 단계의 구현·확인 버튼 호출은 수행하지 않았다.
