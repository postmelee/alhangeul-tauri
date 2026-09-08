# Task #19 Stage 4.21 — 실제 앱 native 확인창 호출·보조 진단 격리

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [`task_m010_19_impl.md`](../plans/task_m010_19_impl.md)
Stage: 4.21

## 단계 목적

4.20에서 관측한 실제 앱의 Invoke 미지원/native Button 확인창을 안전하게 조작하고 파일/창의
사후 조건을 검증한다. 첫 제한 실행의 보조 tree 예외는 후속 승인으로 같은 단계 안에서 격리했다.
제품 재빌드와 전체 PDF 검증을 반복하지 않고, 남은 Confirm 한 사례만 검증한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-pdf-{confirmation,dialog-policy,dialog-observation,win32}.ps1` | 첫 checkpoint에서 실제 capability에 따라 호출 경로 선택, 두 HWND 구별/재조회·native guard·활성 상태 유지 |
| `scripts/windows-pdf-confirmation-verify.ps1` | 43 LOC, wrong-target 호출 전 거부·No·Save 복귀·Cancel·dialog 닫힘 검증 |
| `scripts/windows-pdf-dialog.ps1` | 184 LOC, 실제 확인/거절 분기와 별도 보조 진단 상태 기록 |
| `scripts/windows-pdf-tree-diagnostics.ps1` | 52 LOC, dialog 하위 최대 100개 순회, typed stale 예외만 unavailable, 부분 노드 폐기 |
| `tests/windows-pdf-tree-diagnostics.test.ps1` | 87 LOC, 실제 wrapper의 합성 예외 회귀 10개 |
| `tests/gui/specs/windows-confirmation-verify.e2e.ts` | 공개 HWP·고유 sentinel/other, 사례별 실제 파일/앱 사후 조건 |
| `tests/gui/support/confirmation-cases.ts`, Wdio config | 7 LOC 선택 함수, all/confirm-only 검증·잘못된 mode 조합 거부 |
| 기존 두 workflow·Node/PS 계약 | 재사용 artifact, 설치 전 PS 검사, 선택 사례와 cleanup 증거 일치 검증 |
| 기존 가이드·사건 기록·plans/orders·이 보고서 | 두 실행의 부분별 근거, 재사용 경계와 전체 수용 미완료 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품·rhwp·패키지 bytes는 변경하지 않았다. 기존 실패 기록은 보존하며 전체 실패를 통과로 소급하지
않았다. `816edd5` → `b980e10` 후속 보정에서 클릭 adapter·필수 target/owner/identity/native guard는
변경하지 않았다. 보조 진단만 이미 발견한 dialog 안으로 좁혔고 일반 예외나 필수 판정 오류를
삼키지 않는다. 전역 키/좌표 입력·강제 활성화·다른 API 연쇄 시도·timeout 증가는 없다.

신규 파일/함수는 권장 상한 이내다. 기존 dispatcher/계약 suite 및 dialog 상태 루프의 크기 예외는
승인 계획대로 유지한다. 공식 가이드는 기존 `docs/operations` 위치에 갱신하고 별도 제품 매뉴얼은
만들지 않았다. 승인 계획의 원격 실행용 checkpoint 예외를 따라 소스를 먼저 게시한 뒤 실제 결과
문서만 후속 커밋한다. history rewrite와 변경 없는 원격 재실행은 하지 않는다.

## 검증 결과

후속 checkpoint 전 로컬 명령:

```sh
pnpm run test:gui:windows:contracts
pnpm run typecheck:gui
node --test tests/actions-workflows.test.mjs tests/workflow-artifact-handoff.test.mjs
actionlint .github/workflows/alhangeul-desktop.yml .github/workflows/alhangeul-windows-pdf.yml
git diff --check
```

- focused 계약 **57/57**, workflow/handoff **82/82**, GUI typecheck·actionlint·diff 통과.
  suite 간 import 중복이 있으므로 합산하지 않는다. Node 정적 계약은 PS/native 동작 검증이 아니다.
- 최초 로컬 검사에서 세 사례 배열을 spec 안에서 직접 찾던 정적 assertion이 실패했다.
  선택 함수의 실제 동작 테스트와 spec 연결 검사로 보정한 뒤 위 검사가 모두 통과했다.
- Windows 실행은 승인된 Desktop dispatcher의 `windows-pdf-dialog-verify`를 사용했다.
  후속은 `confirmation_cases=confirm-only`, candidate SHA/native run 지정,
  `run_tests=false`, `publish_release=false`로 한 번만 실행했다.

공통 제품: SHA `69b22650df96323a2c59e473d474ed3195cc9cc7`, native run `34021920074`,
Windows artifact `9986364323`, 123231295 bytes,
digest `sha256:02c13e35d515d08c7793d315905125932a33209b8e63b1f750998a62b1226bdc`.
미만료 상태와 SHA/digest/크기를 재확인했으며 handoff·inventory·NSIS 설치가 통과했다.

| 실행 | 결과와 수용 범위 |
|---|---|
| [34053001644](https://github.com/postmelee/alhangeul-tauri/actions/runs/34053001644), `816edd5aa3366a1c88c98e2596952b935eaecbfe` | 전체 run 실패 유지. PS 정책 62/native 진단 50, Decline·WrongTarget 거부 뒤 Decline 통과. Confirm은 보조 tree의 ElementNotAvailable 예외로 호출 전 중단 |
| [34055921568](https://github.com/postmelee/alhangeul-tauri/actions/runs/34055921568), `b980e10355fe7f8fe5841de131951c14a0f4b909` | **8분 55초 통과**. PS 정책 62/native 진단 50/tree 합성 예외 10, 실제 Confirm 한 사례·PDF 교체·파일 보존·cleanup 통과 |

후속 증거 확인:

- `workflow-context.json`, `confirmation-verify.json`, cleanup JSON 모두 confirm-only이며
  선택/실행 사례는 `Confirm` 하나다. Decline/WrongTarget helper 파일은 없고 반복하지 않았다.
- helper의 `status=passed`, `buttonMethod=Win32-BM_CLICK-command`, `overwriteConfirmed=true`,
  `dialogCount=0`. 저장 완료·정확한 clean title·source/other hash 불변을 spec에서 확인했다.
  중첩 `confirmationObservation.commandInvoked=false`는 호출 전 snapshot이지 최종 실행 결과가 아니다.
- target은 29-byte sentinel에서 **349190-byte PDF**로 교체됐다. `%PDF-`/`%%EOF`와 hash 변경을
  확인했다. SHA-256은 `07b891d3b5669825ad4585ac701cd6d274c4e938bef9117852ad3980c3ef9b52`다.
- source HWP 33792 bytes 및 다른 sentinel 22 bytes의 hash는 최초 값과 같다. 앱 cleanup 뒤
  원격 hash 검사와 다운로드한 세 파일의 독립 hash·PDF envelope 검사도 통과했다.
- NSIS cleanup·WebView2 정책 복구·정리 후 선택 사례 검증이 모두 통과했다.
- raw artifact `9996072906` / `windows-pdf-raw-34055921568`, 559437 bytes,
  digest `sha256:5cf90fa371a3fe8e687d65d709fe21a80d34df37db125bca64b6d3443d7699bb`.
  raw는 커밋하지 않고 [사건 기록](../troubleshootings/task_m010_19_windows_pdf_automation.md)에 근거를 보존했다.
- PS5.1 `5.1.26100.33296`에서 typed/감싼 예외·부분 결과 폐기·동일 문구의 다른 예외 거부·
  알 수 없는 오류/누락 callback·깊이 제한·민감 문자열 필터 등 실제 wrapper 테스트 10개 통과.
  합성 예외 회귀이며 실제 UI race를 재현한 테스트는 아니다. 최종 tree 상태는 available이다.
- 이번 두 실행은 제품 build·MSI·썸네일·updater·릴리즈·Mac native 검증을 실행하지 않았다.
  후속은 HWPX/restart/편집·IME·전체 PDF 품질/Ubuntu analyze도 실행하지 않았다.
- 결과 문서 6개의 상대 링크 **58개**, 보고서 필수 섹션 7개와 diff 검사가 통과했다.

## 잔여 위험

- Stage 4.21 완료는 **두 실행의 부분별 증거**다. 같은 제품/호출 adapter를 사용했지만 현재
  harness에서 세 사례를 일괄 재검증한 것은 아니다. 첫 run의 실패 상태는 그대로 유지한다.
- 진단 예외 분류는 합성 회귀로 확인했다. 이번 실제 앱에서 같은 stale-element 예외가 발생하고
  포착됐다는 증거는 없으며 모든 UI 타이밍/provider/언어에서의 동작을 일반화하지 않는다.
- PDF envelope/저장 완료는 쪽 수·검색·시각 조판 품질의 수용이 아니다. HWPX/restart와
  4.19 전체 PDF 검증, HWPX 표 원본 대조 및 #19 고유 수용 경계는 미완료다.
- 사용자 Windows 수동 정상 보고는 별도 근거이며 설치 SHA가 특정되지 않은 보고를
  이 exact-SHA 자동 검증으로 대체하거나 합산하지 않는다.

## 다음 단계 영향

확인창 호출 차단 원인의 제한 검증을 마쳤으므로 자동화 helper 보정을 더 추가할 근거는 현재 없다.
다음 후보는 새 기능/테스트 프레임워크가 아니라 기존 제품 bytes로 HWP/HWPX fresh/restart의
PDF 회귀 검증을 한 번 수행하는 것이다. 기존 4.19 실패는 새 성공 근거가 생길 때까지 유지한다.
HWPX 표의 원본 대조와 #19 나머지 수용 경계도 분리해 확인해야 하며 이번 단계로 릴리즈를 승인하지 않는다.

## 승인 요청

Stage 4.21 결과 검토 후 기존 설치본 전체 PDF 회귀 검증 진행 승인을 요청한다.
아직 다음 실행·제품 재빌드·PR/merge/릴리즈는 수행하지 않았다.
