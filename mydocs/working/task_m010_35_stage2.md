# Task #35 Stage 2 보고서 — Windows 문서 UX와 native file UI 수용 추가

GitHub Issue: [#35](https://github.com/postmelee/alhangeul-tauri/issues/35)
구현계획서: [`task_m010_35_impl.md`](../plans/task_m010_35_impl.md)
Stage: 2

## 단계 목적

Stage 1.1에서 확정한 production WebDriver와 WinApp CLI PID/HWND 경계 위에 Windows 문서 수용 시나리오를 추가했다. 공통 HWP/HWPX WebView 검증을 Windows에서도 그대로 실행하고, native Open·Save As·취소·현재 저장·재열기 및 Explorer drag-in을 고정 좌표나 blind retry 없이 자동 검증할 수 있게 했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `tests/gui/specs/windows-native.e2e.ts` | HWP/HWPX native Open·Save As·현재 저장·재열기, dialog 취소 반복과 Explorer drag-in 수용 시나리오를 추가했다. |
| `tests/gui/windows/native-ui/file-dialog.mjs` | owner app의 신규 dialog HWND를 고정하고 AutomationId `1148`·`1`·`2`, Value/Invoke pattern과 dialog 종료를 검증하는 adapter를 추가했다. |
| `tests/gui/windows/native-ui/file-dialog.d.mts` | Windows file dialog adapter의 TypeScript 계약을 추가했다. |
| `tests/gui/windows/native-ui/file-dialog.test.mjs` | 영문·한글 control, selector 모호성, Open·Save As 취소와 복수 dialog fail-closed 계약을 추가했다. |
| `tests/gui/windows/native-ui/drag-drop.mjs` | Explorer source와 Alhangeul `BrowserRootView`의 실측 bounds 사이에서 한 번만 drag하는 adapter와 evidence 기록을 추가했다. |
| `tests/gui/windows/native-ui/drag-drop.d.mts` | Windows drag-in helper의 TypeScript 계약을 추가했다. |
| `tests/gui/windows/native-ui/drag-drop.test.mjs` | window 배치, 숨은 확장자 fallback, 단일 gesture, 모호 source 거부와 cleanup 계약을 추가했다. |
| `tests/gui/windows/native-ui/arrange-windows.ps1` | PID/HWND를 재검증한 뒤 `SetWindowPos`로 Explorer와 앱을 작업영역 양쪽에 배치하는 제한 helper를 추가했다. |
| `tests/gui/windows/winapp-cli.mjs` | 같은 HWND에 고정된 `search`, `set-value`, `invoke`, bounded `drag` 명령과 입력 검증을 추가했다. |
| `tests/gui/windows/winapp-cli.test.mjs` | 새 UIA·drag argv, 값·좌표·시간 제한 계약을 추가했다. |
| `tests/gui/wdio.windows.conf.ts` | 공통 문서 UX spec과 Windows native spec을 기존 production probe에 포함했다. |
| `tests/gui-contracts.test.mjs` | Windows adapter 분리, semantic selector, 단일 gesture, 파일 크기 상한과 Linux 경계 비침범을 고정했다. |
| `package.json` | Windows focused 및 전체 automation test inventory에 native UI test를 포함했다. |
| `mydocs/orders/20260827.md` | Task #35의 Stage 2 진행 및 Stage 2.1 승인 대기 상태를 기록했다. |

기존 `document-ux.ts`의 플랫폼 중립 hook으로 필요한 postcondition을 모두 표현할 수 있어 공통 helper와 제품 workflow는 수정하지 않았다. 기존 desktop workflow의 opt-in probe가 Windows WDIO config를 실행하므로 별도 workflow 변경 없이 새 시나리오가 같은 MSI·NSIS job에 포함된다.

## 본문 변경 정도 / 본문 무손실 여부

제품 Rust·TypeScript runtime, bundled Studio, Tauri capability와 installer 동작은 변경하지 않았다. 변경은 외부 GUI acceptance adapter, 수용 spec, 계약 test와 작업 문서에만 한정했다.

file dialog는 trigger 전 app window 목록을 기준선으로 잡고 같은 process·owner HWND의 신규 dialog가 정확히 하나일 때만 입력한다. Explorer drag-in은 fixture basename 또는 Windows가 확장자를 숨긴 경우의 stem을 semantic name으로 찾고, 실측 bounds가 검증된 두 window 안에 있을 때 한 번만 입력을 보낸다. 실패 시 예상하지 않은 desktop 전체를 수집하지 않고 대상 app/dialog UIA tree와 screenshot 또는 제한된 layout tree만 evidence로 남긴다.

## 검증 결과

실행 명령:

```bash
pnpm run typecheck:gui
node --test tests/gui/windows/*.test.mjs tests/gui/windows/native-ui/*.test.mjs
pnpm run test:gui:contracts
pnpm run test:automation
pnpm run test:studio
pnpm run build:studio
git diff --check
```

추가 경계 확인:

```bash
pnpm run test:gui:windows:contracts
pnpm run check:product-boundary
```

결과:

- OK — GUI TypeScript typecheck 통과.
- OK — Stage 2 Windows helper focused test 24/24 통과.
- OK — installer·probe를 포함한 Windows 계약 test 36/36 통과.
- OK — 공통 GUI 계약 22/22 통과.
- OK — 전체 automation 계약 270/270 통과.
- OK — Studio test 97/97 통과 및 production build 성공.
- OK — product boundary 253개 파일 통과.
- OK — 새 Windows native source는 모두 300줄 이하이며 `git diff --check` 통과.

## 잔여 위험

- macOS host의 중립 검증만 완료했다. 실제 Windows 표준 file dialog의 UIA tree, owner HWND, 한글/영문 control name과 Explorer `BrowserRootView` bounds는 Stage 2.1의 fresh `windows-2025` MSI·NSIS run으로 확정해야 한다.
- Stage 1.1 evidence에는 file dialog를 열지 않은 시작 화면만 있으므로 AutomationId `1148`·`1`·`2`가 현재 runner에서 유지되는지 아직 실측하지 않았다. 모호하거나 다른 구조이면 text/좌표 우회 없이 tree evidence를 근거로 같은 Stage를 보정한다.
- system print, Microsoft Print to PDF와 직접 PDF 품질 판정은 Stage 3 범위이며 이번 spec에는 포함하지 않았다.

## 다음 단계 영향

- Stage 2 source/report commit을 `publish/task35`에 push한 뒤 그 exact 40자리 SHA로 desktop workflow의 `run_windows_gui_probe=true`를 실행한다.
- MSI와 NSIS fresh runner에서 공통 문서 UX, native save/reopen/cancel과 drag-in 결과 및 evidence hash를 확인하고 `task_m010_35_stage2.1.md`에 기록한다.
- 두 installer가 모두 성공하기 전에는 Stage 3 출력·PDF 수용으로 진행하지 않는다.

## 승인 요청

- Stage 2 산출물과 중립 검증 결과를 승인하면 Stage 2.1 exact-SHA Windows MSI·NSIS live acceptance를 실행한다.
