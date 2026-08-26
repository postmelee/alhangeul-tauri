# Task #35 Stage 1 보고서 — Windows production driver와 branch probe 계약

GitHub Issue: [#35](https://github.com/postmelee/alhangeul-tauri/issues/35)
구현계획서: [`task_m010_35_impl.md`](../plans/task_m010_35_impl.md)
Stage: 1

## 단계 목적

설치된 Windows production `Alhangeul.exe`를 제품 runtime 변경 없이 외부 `tauri-driver`로 구동하고, Microsoft WinApp CLI가 같은 PID/HWND를 UIA로 식별하는 최소 probe 계약을 마련했다. default branch에 아직 없는 최종 전용 workflow 대신 기존 desktop workflow에 기본 비활성 branch probe를 연결해 Stage 1.1 exact-SHA MSI·NSIS 실측을 준비했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `tests/gui/wdio.windows.conf.ts` (37줄) | Windows production binary, external driver와 자동 version-matched EdgeDriver를 결합했다. |
| `tests/gui/windows/winapp-cli.mjs` (229줄) | shell 없는 argv 실행, bounded timeout/output, strict JSON·PID·HWND 검증을 구현했다. |
| `tests/gui/windows/winapp-cli.test.mjs` (119줄) | 성공·오류 JSON, target 고정과 잘못된 입력을 검증했다. |
| `tests/gui/windows/probe.mjs` (141줄) | WebView title/root와 WinApp CLI window tree·screenshot을 공통 evidence manifest로 결속했다. |
| `tests/gui/windows/probe.d.mts`, `probe.e2e.ts` (35줄) | WDIO 진입점과 TypeScript 경계를 추가했다. |
| `scripts/windows-gui-installer.ps1` (186줄) | verified artifact에서 MSI/NSIS 하나를 설치하고 state 기반 targeted uninstall·residue 판정을 수행한다. |
| `tests/windows-gui-installer.test.mjs`, `tests/windows-gui-probe.test.mjs` (192줄) | PowerShell lifecycle와 platform-neutral probe 계약을 고정했다. |
| `.github/workflows/alhangeul-desktop.yml` | 기본값 `false`의 MSI·NSIS fresh-runner branch probe, pinned WinApp CLI와 evidence/final gate를 추가했다. |
| `package.json`, `tests/actions-workflows.test.mjs`, `tests/gui-contracts.test.mjs` | focused 진입점, 전체 automation inventory와 제품/adapter 분리 계약을 갱신했다. |

공식 공급망 확인 결과 `microsoft/setup-WinAppCli` v0.2의 immutable commit `b93bbddc1f7abc061ca0d3a8119e3a0c7dd71495`와 stable WinApp CLI `v0.6.0`을 이중 고정했다. `v0.6.1` prerelease, `latest`, nightly, winget와 global npm 설치는 사용하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

제품 Rust/TypeScript runtime, Tauri capability, bundled Studio와 기존 build·Windows installer smoke 동작은 변경하지 않았다. 새 workflow input의 기본값은 `false`이며 opt-in하지 않은 기존 desktop candidate 실행에는 Windows GUI job이 추가되지 않는다. 공통 WebDriver helper에도 WinApp CLI 의존성을 역주입하지 않았다.

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
- OK — Windows focused 계약 17/17 통과.
- OK — 공통 GUI 계약 20/20 통과.
- OK — 전체 automation 계약 247/247 통과.
- OK — product boundary 245개 파일 통과.
- OK — desktop workflow YAML parse와 `git diff --check` 통과.

## 잔여 위험

- 실제 `windows-2025`에서 setup Action이 제공하는 executable path, production WebView2/EdgeDriver 연결과 WinApp CLI UIA JSON은 아직 실행하지 않았다.
- MSI·NSIS silent install path와 state 기반 uninstall·residue 판정은 중립 계약만 통과했으며 fresh runner 실측이 필요하다.
- Stage 1은 title/root·window tree·screenshot만 다루며 Open/Save As, drag, print는 아직 수용 범위가 아니다.

## 다음 단계 영향

- 승인 뒤 이 커밋을 `publish/task35`에 push하고 exact 40자리 SHA로 opt-in desktop workflow를 실행한다.
- MSI·NSIS 두 probe의 build/check-out SHA, tool version, PID/HWND/UIA tree, screenshot과 제거 결과를 Stage 1.1 evidence 문서에 기록한다.
- 두 installer 중 하나라도 실패하면 Stage 2로 넘어가지 않고 Stage 1 계약 또는 수행계획의 차이를 먼저 보정한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 1.1 exact-SHA Windows MSI·NSIS branch probe로 진행한다.
