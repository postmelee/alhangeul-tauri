# Task #19 Stage 4.18 — 확인창 adapter와 작은 Windows 통합

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [`task_m010_19_impl.md`](../plans/task_m010_19_impl.md)
Stage: 4.18

## 단계 목적

관측된 확인창의 의미·대상·소유 관계·capability를 검증하고, 실제 PDF helper와 작은
Windows fixture가 같은 adapter를 사용하도록 한다. 작은 통합의 덮어쓰기·취소/거부까지
검증하며 Alhangeul 설치본의 전체 PDF 수용은 다음 승인 단계로 구분한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-pdf-confirmation.ps1` | 의미/target·owner/PID·유일한 UIA command·InvokePattern을 재검증한 승인/거절, 저장창 취소 |
| `scripts/windows-pdf-dialog-policy.ps1`, `windows-pdf-dialog.ps1` | 실제 정책·확인창 adapter 연결, 안전한 조건에서만 overwrite 허용 |
| `scripts/windows-pdf-win32.ps1` | owner/버튼 13개 조건의 공통 snapshot, UIA와 native class 구분, native ID2 취소 |
| `scripts/windows-pdf-native-diagnostics.ps1` | 예외의 알려진 guard boolean과 native class만 추출, 임의 경로·본문 필터 |
| `tests/gui/windows-dialog/integration*.ps1` | 공개 sentinel의 Open/Fresh/Overwrite/Decline/WrongTarget, 선택 경로·파일 보존·자원 정리 |
| `tests/windows-pdf-dialog-policy.test.ps1` | 실제 순수 정책 50개 검사(PS5.1 환경 확인 1개 포함) |
| `tests/windows-pdf-native-diagnostics.test.ps1` | 실제 native 판정 함수의 합성 조건·진단 추출·무효 HWND 22개 검사 |
| `tests/windows-pdf-confirmation.test.mjs`, `windows-pdf-workflow.test.mjs` | 같은 adapter 사용과 안전장치·UIA/native 기대값 분리의 정적 계약 |
| `.github/workflows/alhangeul-desktop.yml`, `alhangeul-windows-dialog.yml` | 기존 reusable의 verify 모드, PS 진단 검사, 작은 통합 연결; readonly/no retry 유지 |
| 기존 가이드·사건 기록·plans/orders | 원인·보정·검증 한계 및 다음 승인 경계 정렬 |

## 본문 변경 정도 / 본문 무손실 여부

제품·rhwp·릴리즈 bytes는 변경하지 않았다. 기존 문서/실패 기록은 보존한다.
초기 구현에서 UIA `CCPushButton`을 native에도 요구한 가정이 잘못됐음을 진단했다.
실측 `Button`으로 native 비교만 보정했으며 UIA 조건·나머지 guard·Invoke API는 유지한다.
미지원 언어/pattern, 잘못된 target과 모호한 후보를 무조건 Yes나 다른 API로 우회하지 않는다.

## 검증 결과

최종 로컬 명령:

```sh
pnpm run test:gui:windows:contracts
pnpm run typecheck:gui
actionlint -shellcheck= .github/workflows/alhangeul-windows-dialog.yml .github/workflows/alhangeul-desktop.yml
git diff --check
```

- focused Node 계약/판정 **50/50**, GUI typecheck·actionlint·diff 통과.
  Mac에서는 PowerShell/native/Tauri build를 실행하지 않았다.
- 앞선 `f198449`/run `34048114390`은 native 재검증에서 실패했다.
  `5096438`/run `34048778670`의 진단에서 13개 native guard 중 class 비교만 실패함을 확인했다.
  이 두 실행은 성공으로 소급하지 않는다. [상세 사건 기록](../troubleshootings/task_m010_19_windows_pdf_automation.md).
- 최종 [run 34049005561](https://github.com/postmelee/alhangeul-tauri/actions/runs/34049005561),
  harness `d553f8ef4e3711f19828d3d297a8f1355981e8be`: **작은 job 43초 통과**.
  Windows image `20260824.214.3`, OS `10.0.26100.0`, PS `5.1.26100.33296`.
- PS 정책 **50/50**, native 진단 **22/22**. 합성 조건·무효 HWND 검사는 실제 클릭 성공과 구분한다.
- 작은 실제 UI 통합 **5/5**:
  - Open/Fresh: 정확한 선택 경로 및 target 내용, source/다른 target 보존.
  - Overwrite: 실제 `UIA-InvokePattern` Confirm, OK, 지정 target 갱신·나머지 파일 보존.
  - Decline: No 후 enabled 저장창 복귀, native ID2 Cancel, 세 파일 보존.
  - WrongTarget: 잘못된 요청 거부 후 No/Cancel, 세 파일 보존.
- `context.json`, `policy.json`, `native-diagnostics.json`, `integration.json`,
  `integration-cleanup.json`, `cleanup.json`을 확인했다. `passed=true`, `cleanupPassed=true`,
  `productTested=false`. fixture process와 임시 디렉터리/state 정리도 통과했다.
- 승인된 checkpoint 게시가 원격 실행의 선행 조건이므로 코드 커밋 뒤 결과 보고를 기록한다.
  최종 원격 검증 후에는 문서/보고만 변경했다. 같은 OS job은 다시 실행하지 않는다.

## 잔여 위험

- 시험 host는 WinForms이며 public sentinel을 쓴다. PDF 확장자여도 PDF 렌더링 검증은 아니다.
- 실제 Alhangeul의 이전 UIA 관측은 Pane이었고 InvokePattern 지원은 미확인이다.
  이번 fixture 성공을 설치본 성공으로 일반화하지 않는다. 미지원이면 명시적으로 실패해야 한다.
- 이전 제품 fresh 성공/restart 실패, 사용자 수동 정상 확인은 별도 근거로 유지한다.
  새 helper의 실제 HWP/HWPX full PDF 수용은 아직 미실행이다.
- 강제 runner 소실은 always cleanup 실행을 보장하지 않는다. 정상/스크립트 실패에서는
  자기 PID/시작 시각·고유 임시 경로만 정리하며 helper/step/host 상한을 유지한다.

## 다음 단계 영향

Stage 4.18은 완료다. Stage 4.19 승인 후 기존 제품 SHA
`69b22650df96323a2c59e473d474ed3195cc9cc7`, native artifact run `34021920074`의 유효성을
확인하고 같은 설치 bytes로 HWP/HWPX fresh/restart·PDF 분석을 한 번 실행한다.
artifact 만료/누락이면 자동 재빌드하지 않고 필요한 범위를 먼저 보고한다.
제품이 그대로라면 이번 helper 보정 때문에 재빌드하지 않는다. 릴리즈/배포는 하지 않는다.

## 승인 요청

Stage 4.18 결과 검토 후 Stage 4.19의 기존 설치본 전체 PDF 검증 진행 승인을 요청한다.
