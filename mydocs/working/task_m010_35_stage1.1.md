# Task #35 Stage 1.1 보고서 — Windows MSI·NSIS exact-SHA probe 증거 확정

GitHub Issue: [#35](https://github.com/postmelee/alhangeul-tauri/issues/35)
구현계획서: [`task_m010_35_impl.md`](../plans/task_m010_35_impl.md)
Stage: 1.1

## 단계 목적

Stage 1에서 만든 Windows production GUI branch probe를 실제 `windows-2025` fresh runner에서 MSI와 NSIS 각각에 적용했다. 설치된 production `Alhangeul.exe`를 외부 `tauri-driver`와 Microsoft WinApp CLI로 교차 식별하고, exact source SHA·same-run Windows bundle·installer lifecycle·WebView·UIA evidence를 하나의 성공 run에 결속했다.

초기 live run에서 확인된 WebView2 150+ 정책 회귀, WebView/native title 초기화 경합과 Tauri 내부 HWND를 사용자 window로 오인하는 문제를 우회하지 않고 측정했다. Microsoft WinApp CLI v0.6의 실제 `ui list-windows` 계약에 맞춰 무제목 과도 상태와 같은 PID의 내부 HWND를 안전하게 허용하되, 유일한 visible/foreground production window와 선택한 PID/HWND의 동일성은 계속 fail-closed로 고정했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-desktop.yml` | WebView2 150+ remote debugging 정책을 fresh runner HKLM과 격리 user-data 경로에 한정하고, 실패·성공 evidence와 정책 cleanup을 항상 보존했다. |
| `tests/actions-workflows.test.mjs` | 정책 범위, cleanup, evidence upload와 final outcome gate 계약을 고정했다. |
| `tests/gui/wdio.windows.conf.ts` | production WebView 초기화에 필요한 bounded connection timeout을 branch probe에 반영했다. |
| `tests/gui/windows/probe.mjs` | WebView title 과도 상태, title 원문을 노출하지 않는 discovery evidence, visible/foreground HWND 선택과 내부 HWND 재조회 허용을 구현했다. |
| `tests/gui/windows/winapp-cli.mjs` | WinApp CLI의 빈 문자열·`null`·누락 title을 정상화하고 선택한 target PID/HWND만 command 결과로 고정했다. |
| `tests/gui/windows/winapp-cli.test.mjs` | 무제목 과도 상태와 같은 PID의 내부 HWND가 함께 존재하는 실제 production topology를 회귀 계약으로 추가했다. |
| `tests/windows-gui-probe.test.mjs` | WebView readiness, foreground window 선택, failure manifest와 title 비노출 계약을 고정했다. |
| `tests/gui-contracts.test.mjs` | Windows branch probe의 WebView/native 경계를 공통 제품 계약과 함께 재검증했다. |

Stage 1.1 코드 보정 범위는 Stage 1 commit `6773042` 이후 8개 파일, 332줄 추가·42줄 삭제다. 제품 Rust/TypeScript runtime, bundled Studio와 installer 제품 동작은 수정하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

제품 UI와 문서 처리 본문은 변경하지 않았다. 모든 보정은 task branch의 opt-in CI probe, 외부 automation adapter와 계약 test에만 한정했다. WebView2 정책은 GitHub-hosted runner의 HKLM에 probe 실행 동안만 적용하고, `--remote-debugging-port=0` 및 scenario별 격리 user-data 경로만 허용한 뒤 `finally` cleanup으로 제거했다.

`discovery.json`에는 raw native title을 기록하지 않고 `hasTitle`, PID/HWND, 크기, class, owner와 foreground 여부만 남긴다. screenshot과 UIA tree도 선택한 Alhangeul window 범위만 수집하며 unrelated desktop tree나 개인 문서를 포함하지 않는다.

## exact-SHA 원격 검증

### 최종 성공 run

- Workflow run: [32952401240](https://github.com/postmelee/alhangeul-tauri/actions/runs/32952401240)
- exact build/source SHA: `91df796d4de2a5b7c4d888bbb8bb862021154c34`
- workflow ref: `publish/task35`
- workflow `head_sha`, checkout SHA와 `build_ref`: 모두 위 40자리 SHA와 일치
- 전체 결론: `success`

| Job | Job ID | 결과 | 시간 |
|---|---:|---|---:|
| Linux arm64 native build | `98126539608` | 성공 | 5분 0초 |
| Linux x64 native build | `98126539704` | 성공 | 16분 29초 |
| Windows x64 native build | `98126539817` | 성공 | 18분 24초 |
| Windows MSI GUI probe | `98131666074` | 성공 | 2분 25초 |
| Windows NSIS GUI probe | `98131666114` | 성공 | 2분 32초 |
| Windows installer smoke | `98131666198` | 성공 | 43초 |

### artifact 결속

| Artifact | ID | SHA-256 digest | 크기 |
|---|---:|---|---:|
| Windows MSI GUI probe | `9601333050` | `3f810e8650d01c5d61e5368b4520a03c08376a90022b918d0b413b28ff051803` | 232,744 bytes |
| Windows NSIS GUI probe | `9601336801` | `fc821dd85f05bdc1275f4ddbd580c7869a6206938e50027b1aadfbaa186c185e` | 207,366 bytes |
| Windows installer smoke | `9601279360` | `556494038ca9f1da1cc1acc9597e28da76a482d91f44ff5d48c4011eecc1053b` | 31,094 bytes |
| Windows x64 native bundle | `9601250523` | `12c450bfe4716c69fc82c7f430821f525ea141e1dd76a90b6f72d9826bc6d664` | 101,011,420 bytes |
| Linux x64 native bundle | `9601190256` | `5abd519fc81c3738070927dea240022c6b207a0a9d521a31d60a746903b19e5c` | 501,176,190 bytes |
| Linux arm64 native bundle | `9600806841` | `21335f0be85d2f32ece408f14a1c4c160c5f49b41a3d678af063fe57169de40a` | 163,994,623 bytes |

### MSI production probe

- install path: `C:\Program Files\Alhangeul\Alhangeul.exe`
- MSI product code: `{A5E931CF-35EF-4453-8E85-46BF79D6B3BC}`
- selected production window: PID `3680`, HWND `131426`, title `Alhangeul`, `1044x808`, class `Tauri Window`, owner `0`, foreground `true`
- 동일 process 내부 HWND: `16x16` single-instance coordination window와 `16x16` `Tao Thread Event Target`; 둘 다 foreground `false`
- WebDriver title/root readiness와 WinApp CLI status/inspect의 PID/HWND 일치
- UIA tree: window root 1개, 총 12개 요소(`Window` 1, `TitleBar` 1, `Pane` 5, `MenuBar` 1, `MenuItem` 1, `Button` 3)
- install, screenshot/tree capture, uninstall과 targeted residue 판정 모두 성공
- uninstall 뒤 residue 없음, automation policy cleanup `cleared: true`

MSI evidence manifest와 다운로드 파일의 SHA-256을 다시 계산한 결과 모두 일치했다.

| Evidence | SHA-256 |
|---|---|
| `discovery.json` | `24b73118d4bf8631267425a6627c5bfef2a6fa8cee5021f535dff849f95e689b` |
| `windows.json` | `a2d6a0ef1c520ca70b6b1c040e86b7252f234d35a6f4bfb099bf025c70d0a57a` |
| `status.json` | `368ca1c69a17764ff2a8e85a7db2a5ae043dd1d5ba81210b8813935823d45ca5` |
| `inspect.json` | `28f34ce1a70f4f801927fc9ff69b82bf2742abf21307c3c69b04b132379f7733` |
| `window.png` | `9e50463e32afbcfed2e864fb761efa8c1be0d21bf2dfad4a8a9f552fbce1c411` |

### NSIS production probe

- install path: `C:\Users\runneradmin\AppData\Local\Alhangeul\Alhangeul.exe`
- selected production window: PID `3432`, HWND `196942`, title `Alhangeul`, `1044x808`, class `Tauri Window`, owner `0`, foreground `true`
- 동일 process 내부 HWND topology, WebDriver readiness와 UIA tree 구성은 MSI와 동일
- install, screenshot/tree capture, uninstall과 targeted residue 판정 모두 성공
- uninstall 뒤 residue 없음, automation policy cleanup `cleared: true`

NSIS evidence manifest와 다운로드 파일의 SHA-256도 모두 일치했다.

| Evidence | SHA-256 |
|---|---|
| `discovery.json` | `8daf6498430efd1c13234676b3e40d7ee07f17629ca5d453cd21db437f7d770a` |
| `windows.json` | `ff1f6c4159219a6438f19614a8b59d710f424f6fe5dc566fd8864fb01b5383ce` |
| `status.json` | `532f8db9762d0150dc0d6a414e67bc6747ffec0851f4e146951a938e4907c6b9` |
| `inspect.json` | `e773bd4a4274eb182a0dbf12c9109f915d3bee66e125584271b0b1022d6900d9` |
| `window.png` | `9e50463e32afbcfed2e864fb761efa8c1be0d21bf2dfad4a8a9f552fbce1c411` |

두 screenshot은 byte 단위로 동일했다. 육안 read-back에서도 Korean Studio toolbar/menu/status가 있는 정상 빈 문서 시작 화면, 관련 modal 없음과 app window 외부 내용 미수집을 확인했다.

### installer smoke 교차검증

MSI와 NSIS 모두 install/uninstall exit code `0`, version·registry·handler·shortcut·기본 연결 검사 통과, 실행 뒤 5초 생존과 cleanup 통과를 기록했다. 설치 전·제거 후 process/path/registry residue가 없고 외부 fixture의 전후 SHA-256도 동일해 기본 연결 보존·복원 계약을 충족했다.

## WinApp CLI 실측과 보정 근거

WinApp CLI v0.6의 [`UiListWindowsCommand.cs`](https://github.com/microsoft/WinAppCli/blob/v0.6.0/src/winapp-CLI/WinApp.Cli/Commands/UiListWindowsCommand.cs)는 title이 없는 positive-size window를 목록에 포함하고, 빈 title은 JSON `null`이 될 수 있다. `-a` target은 PID, exact process, partial process와 title 순으로 해석될 수 있으므로 production Tauri process에서 사용자 window 하나만 존재한다고 가정할 수 없다.

최종 probe는 다음 판정으로 이 실제 동작을 수용한다.

1. WebView title은 초기화 중 빈 문자열을 허용하되 bounded wait 뒤 `Alhangeul`과 root DOM을 요구한다.
2. native discovery는 title을 필수 식별자로 쓰지 않고 positive-size visible window가 하나이면 선택한다.
3. visible 후보가 여러 개면 foreground인 후보가 정확히 하나일 때만 선택한다.
4. 선택 뒤 WinApp command 결과에는 선택한 PID/HWND가 정확히 한 번 있어야 한다.
5. 같은 PID의 16x16 내부 HWND가 함께 재조회되는 것은 허용하지만 선택한 HWND와 바꾸지 않는다.

이 규칙은 실제 사용자 window를 유일하게 고정하면서 Tauri single-instance/tao 내부 window를 정상 topology로 취급한다. 후보가 없거나 visible/foreground 후보가 복수이면 계속 입력 전에 실패한다.

## 측정·보정 run 이력

| Run | 결과 | 측정과 처리 |
|---:|---|---|
| `32921738726` | GUI false failure | build와 installer smoke는 성공했으나 PowerShell의 `LASTEXITCODE` null을 실패로 오판해 성공 판정을 보정했다. |
| `32922984141` | 취소 | 잘못된 `build_ref` 입력을 즉시 취소했다. |
| `32923005451` | GUI 실패 | WebView2 151에서 `DevToolsActivePort` 준비 실패를 확인했다. |
| `32924788248` | GUI 실패 | WebView가 준비된 뒤 WebView/native title 초기화 경합을 측정했다. |
| `32943863372` | 취소 | 잘못된 `build_ref` 입력을 즉시 취소했다. |
| `32943910411` | GUI 실패 | WinApp JSON의 누락/`null` title parse 실패를 확인했다. |
| `32945921109` | GUI 실패 | title 정상화 뒤에도 native title 필수 조건이 timeout을 일으켜 title 비의존 discovery로 보정했다. |
| `32947984127` | GUI 실패 | production process에 사용자 HWND 외 내부 HWND가 함께 존재해 generic 단일 PID/HWND 가정이 잘못됨을 확인했다. |
| `32950461131` | GUI 실패·측정 성공 | foreground 사용자 `Tauri Window`와 16x16 내부 HWND 두 개를 확정했으나 target 재검증이 세 HWND를 모두 거부해 선택 HWND 재조회 계약을 보정했다. |
| `32952401240` | 전체 성공 | exact SHA `91df796d…`, MSI·NSIS GUI probe와 installer smoke, build matrix가 모두 통과했다. |

취소 run은 잘못된 입력을 검증 대상으로 사용하지 않았고, 실패 run은 Stage 2로 넘기지 않았다. 각 수정은 새 exact SHA를 commit·push한 뒤 fresh run으로 재측정했다.

## 검증 환경

- GitHub runner: `win25-vs2026 20260818.207.1`
- OS: `Microsoft Windows NT 10.0.26100.0`
- Node.js `v24.19.0`, pnpm `10.33.0`
- rustc/cargo `1.97.1`
- WinApp CLI `0.6.0`
- `microsoft/setup-WinAppCli` immutable Action commit `b93bbddc1f7abc061ca0d3a8119e3a0c7dd71495`
- tauri-driver `2.0.6`
- resolved WebView2 session `151.0.4129.86`

WebView2와 driver 연결은 실제 session 성공으로 검증했지만 로그가 별도 msedgedriver version 문자열을 출력하지 않으므로 독립 EdgeDriver version 값은 주장하지 않는다.

## 검증 결과

실행 명령:

```bash
pnpm run typecheck:gui
node --test tests/gui/windows/winapp-cli.test.mjs tests/windows-gui-installer.test.mjs tests/windows-gui-probe.test.mjs
pnpm run test:gui:contracts
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — GUI TypeScript typecheck 통과.
- OK — Windows focused 계약 23/23 통과.
- OK — 공통 GUI 계약 20/20 통과.
- OK — 전체 automation 계약 255/255 통과.
- OK — product boundary 245개 파일 통과.
- OK — `git diff --check` 통과.
- OK — final exact-SHA Windows MSI·NSIS GUI probe, installer smoke와 native build matrix 통과.
- OK — 다운로드 evidence manifest와 실제 파일 SHA-256 일치, UIA tree와 screenshot 육안 read-back 통과.

## 잔여 위험

- Stage 1.1은 빈 문서 시작 화면의 production WebDriver/UIA 식별, 설치·제거와 증거 수집만 수용했다. HWP/HWPX open/save/reopen, native Open/Save As, drag-in은 Stage 2 범위다.
- system print, Microsoft Print to PDF와 직접 PDF의 저장·취소·반복 및 PDF 품질 판정은 Stage 3 범위다.
- GitHub-hosted `windows-2025` 성공은 Windows 10/11 실제 사용자 환경의 공개 릴리즈 gate를 대체하지 않는다. 해당 경계는 Stage 4 운영 문서와 최종 release gate에 유지한다.

## 다음 단계 영향

- Stage 2는 이번에 확정한 유일 visible/foreground 사용자 HWND 선택과 동일 PID 내부 HWND 허용 계약을 그대로 사용한다.
- native dialog는 선택한 app HWND의 새 owner/dialog HWND를 별도로 발견해야 하며, app process의 내부 16x16 window를 dialog로 취급하면 안 된다.
- MSI와 NSIS 모두 같은 screenshot/UIA 구조를 만들었으므로 Stage 2 문서 UX는 installer별 fresh runner에서 동일 scenario를 실행하되 결과를 각각 보존한다.
- WebView2 정책과 cleanup은 task branch probe에만 유지하고 Stage 4에서 잠정 hook을 별도 exact-SHA workflow로 옮길 때 다시 검증한다.

## 승인 요청

- Stage 1.1 exact-SHA MSI·NSIS probe 결과를 승인하면 Stage 2 Windows 문서 UX와 native file UI 수용 구현으로 진행한다.
