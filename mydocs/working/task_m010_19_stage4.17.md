# Task #19 Stage 4.17 — 실제 판단 함수와 작은 Windows 확인창 관측

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [`task_m010_19_impl.md`](../plans/task_m010_19_impl.md)
Stage: 4.17

## 단계 목적

정적 source 계약과 긴 제품 E2E 사이에 실제 PowerShell 판단 테스트 및 제어된 Windows
확인창 관측을 둔다. 사용자 승인 범위는 이 단계까지이며 overwrite 실행 구현은 다음 승인 대상이다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-pdf-dialog-policy.ps1` | UI/파일 조회 없는 버튼 선택·overwrite 의도 판단 |
| `scripts/windows-pdf-dialog-observation.ps1` | 가장 가까운 dialog/PID 관측, 실제 정책 호출, 클릭 직전 UIA 재조회·native 검증 |
| `scripts/windows-pdf-dialog.ps1`, `scripts/windows-pdf-win32.ps1` | 실제 helper 연결, 의미 미확정 legacy Yes 차단, native 검증 재사용 |
| `tests/windows-pdf-dialog-policy.test.ps1` | Windows PS5.1에서 실제 함수를 dot-source하는 28개 검사(환경 1개 포함) |
| `tests/gui/windows-dialog/` | 공개 sentinel·WinForms host, 실제 native 제출과 확인창 관측, 독립 cleanup |
| `.github/workflows/alhangeul-windows-dialog.yml`, `alhangeul-desktop.yml` | read-only `windows-dialog-probe`, 8분 상한, retry 없이 always cleanup·증거 업로드 |
| `tests/fixtures/windows-dialog-controls.json` | 실제 ID 충돌·제품 확인창 형태와 작은 관측의 축약 근거를 구분 보존 |
| `tests/windows-pdf-workflow.test.mjs`, `tests/actions-workflows.test.mjs`, `package.json` | 정적 wiring·workflow inventory·관측 provenance, Windows 전용 정책 명령 |
| 기존 공식 가이드·사건 기록·plans/orders | 지원 경계·실행 결과·다음 승인 상태 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

제품·rhwp·릴리즈 설정은 변경하지 않았다. 기존 문서 이력을 보존하고 현재 검사와 미지원
경계만 갱신했다. 기존 ID6 자동 승인은 의미/대상이 검증되지 않았으므로 차단했다.
순수 정책의 `eligible`은 호출 permission 전체가 아니라 필요한 의도 조건의 통과다.
실제 호출 capability·live identity·사후 조건은 별도로 검증해야 한다.

## 검증 결과

로컬 명령:

```sh
pnpm run test:gui:windows:contracts
pnpm run typecheck:gui
node --test tests/actions-workflows.test.mjs
actionlint .github/workflows/alhangeul-desktop.yml .github/workflows/alhangeul-windows-dialog.yml
git diff --check
```

- focused 계약·판정 회귀 **47/47**, workflow 관련 **42/42**, 타입·actionlint·diff 통과.
  두 Node suite에 겹치는 검사가 있으므로 합산한 고유 테스트 수로 보고하지 않는다.
- actionlint가 초기 `runner.temp`의 job env 위치 오류를 잡아 첫 원격 실행 전에 수정했다.
- 이 Mac 호스트에서는 PowerShell/native를 실행하지 않았다. source 계약을 PS 동작으로 세지 않는다.
- 원격 [run 34047467032](https://github.com/postmelee/alhangeul-tauri/actions/runs/34047467032),
  harness `cd77b5704470f14ee674c72351b60af92e638b05`: **첫 실행 성공, job 27초**.
  Windows image `20260824.214.3`, OS `10.0.26100.0`, PS `5.1.26100.33296`, UI `en-US`.
- 실제 PS 검사 **28/28**: ID collision·중복/disabled/wrong PID/parent·missing 후보,
  미확정 prompt·다른 target·Open·취소 의도 거부 등. 입력의 PID/HWND는 합성이며 클릭하지 않는다.
- 실제 OS: C# Add-Type compile/load, filename focus·교체·readback, 버튼 live 재검증,
  native submit 후 확인창 관측 성공. policy 단계 약 1초, compile/probe 단계 약 6초.
- artifact `policy.json`, `probe.json`, `cleanup.json`, `context.json` 확인:
  `overwriteInvoked=false`, `productTested=false`, `fixtureUnchanged=true`,
  `processStopped=true`, `fixtureRemoved=true`. fallback cleanup 및 state 정리도 통과.
- 제품 build·설치·서명·전체 PDF/updater workflow는 실행되지 않았다.
- 원격 실행을 위한 구현 checkpoint `cd77b57` 뒤에는 결과·축약 데이터·정적 회귀·보고만
  추가했다. 검증된 PS/native/workflow 코드를 변경하지 않아 같은 OS job을 재실행하지 않는다.

## 잔여 위험

- WinForms의 `CCPushButton`은 `ControlType.Button`, InvokePattern(10000), HWND를 제공했다.
  이전 실제 Alhangeul은 `ControlType.Pane`이며 pattern은 미관측이다. API 지원을 일반화할 수 없다.
- 확인창의 저장창 owner·정규화된 대체 질문·fixture 이름은 확인했지만 Yes는 호출하지 않았다.
  이번 cleanup은 시험 process 회수이며 사용자 취소·원본 복귀 수용과는 다르다.
- 실제 제품에서 변경된 helper의 열기/새 PDF/overwrite와 전체 PDF 분석은 아직 미실행이다.
  이전 제품 run의 fresh 성공·restart 실패와 사용자의 수동 통과 근거는 별도로 보존한다.
- 강제 runner 소실 시 always step 실행 자체는 보장할 수 없다. hosted runner 자원 외 사용자
  시스템을 정리하지 않으며, 정상/스크립트 실패 경로에는 한정 cleanup과 host 자체 상한이 있다.

## 다음 단계 영향

Stage 4.18은 검증된 의미·대상·소유 관계와 실제 지원 pattern이 있는 경우에만 확인 버튼을
호출한다. 우선 관측된 InvokePattern 경로 하나로 작은 fixture의 overwrite·취소/거부 사후
조건을 검사한다. 실제 앱의 capability가 다르면 미지원으로 보고하며 다른 API를 맹목적으로
순회하지 않는다. 전체 HWP/HWPX PDF는 작은 경계 검증 후 Stage 4.19에서 승인받아 실행한다.

## 승인 요청

Stage 4.17 결과 검토 후, Stage 4.18의 관측 기반 확인창 adapter와 작은 통합 검증 진행을 요청한다.
