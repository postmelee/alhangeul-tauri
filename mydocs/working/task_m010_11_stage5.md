# Task #11 Stage 5 보고서 — Windows installer packaging 계약 보정

GitHub Issue: [#11](https://github.com/postmelee/alhangeul-tauri/issues/11)
구현계획서: [`task_m010_11_impl.md`](../plans/task_m010_11_impl.md)
Stage: 5

## 단계 목적

Stage 4 exact-SHA runtime evidence를 packaging 결함, automation 결함 또는 실행 환경 한계로 분류하고, 확인된 packaging 결함만 최소 수정한다. Installer 수용 기준은 낮추지 않으며 Windows native bundle과 실제 설치 수용은 Stage 6으로 분리한다.

Stage 4에서 MSI·NSIS silent install과 uninstall은 모두 exit code `0`이었으므로 VDI의 MSI `1602`를 WiX action 결함으로 재현하지 못했다. 반면 양 installer의 실행 파일명, shortcut, handler와 extension default가 Stage 1 계약과 불일치하는 상태는 registry·path evidence로 재현됐다. 따라서 Stage 5는 hosted runner 환경이나 smoke assertion을 완화하지 않고 Cargo, WiX와 NSIS packaging source를 보정했다.

## 구현 내용

### 제품 실행 파일명 정렬

- Cargo package와 Rust library 이름은 각각 `alhangeul-desktop`, `alhangeul_desktop`으로 유지했다.
- 단일 `[[bin]]` target만 `Alhangeul`로 변경해 Windows bundle의 main binary가 `Alhangeul.exe`가 되도록 했다.
- `cargo metadata --locked --offline --no-deps`에서 binary target name이 `Alhangeul`로 해석되고 lockfile이 바뀌지 않음을 확인했다.

### MSI handler와 shortcut

Stage 4 MSI log에는 `ShortcutsFeature`와 관련 component가 `Action: Local`이었지만 `CreateShortcuts` action에 `ShortcutCreate` operation이 없었다. 기존 component-level `[!Path]` shortcut을 main executable `File`의 non-advertised shortcut으로 옮기고 대상 directory를 명시했다.

| Shortcut | Directory | Target 소유 |
|---|---|---|
| Desktop | `DesktopFolder` | main executable `File Id="Path"` |
| Start Menu | `ApplicationProgramsFolder` | main executable `File Id="Path"` |

advertised `ProgId`/`Extension` table은 canonical class를 만들면서 extension default를 변경했다. 이를 제거하고 `Path` component가 다음 registry만 소유하게 했다.

- `HKLM\Software\Classes\Alhangeul.hwp`
- `HKLM\Software\Classes\Alhangeul.hwpx`
- 각 class의 `DefaultIcon`, `shell\open\command`
- `.hwp\OpenWithProgids`의 `Alhangeul.hwp`
- `.hwpx\OpenWithProgids`의 `Alhangeul.hwpx`

`.hwp`, `.hwpx` key의 default value는 작성하지 않는다. Handler command와 shortcut은 같은 `File Id="Path"`를 참조하므로 binary rename과 분리되지 않는다.

### NSIS association과 default 보존

고정된 Tauri CLI 2.10.1은 `fileAssociations[].name`을 file class로 사용하고 `APP_ASSOCIATE`에서 extension default를 직접 바꾼다. 전체 installer template를 복제하지 않고 Tauri가 제공하는 `installerHooks` 확장 지점만 사용했다.

- association name을 `Alhangeul.hwp`, `Alhangeul.hwpx`로 변경했다.
- `startMenuFolder`를 `Alhangeul`로 고정해 `Programs\Alhangeul\Alhangeul.lnk` 계약과 맞췄다.
- `NSIS_HOOK_PREINSTALL`은 extension default의 존재 여부와 값을 임시 marker로 snapshot한다.
- `NSIS_HOOK_POSTINSTALL`은 원래 default를 복원하고 marker·Tauri backup을 지운 뒤 canonical `OpenWithProgids`만 등록한다.
- `NSIS_HOOK_PREUNINSTALL`은 사용자가 설치 뒤 바꿨을 수 있는 현재 default를 다시 snapshot하고 Alhangeul `OpenWithProgids`를 제거한다.
- `NSIS_HOOK_POSTUNINSTALL`은 default의 값과 존재 여부를 복원하고 product marker와 빈 key만 정리한다.
- extension key 전체를 광범위하게 삭제하지 않는다.

### 회귀 계약

`tests/windows-packaging.test.mjs`를 `test:automation`에 연결해 다음을 고정했다.

- Cargo binary `Alhangeul`
- MSI file-owned Desktop·Start Menu shortcut
- advertised `ProgId`·`Extension` 미사용
- MSI canonical class·quoted command·`OpenWithProgids`
- NSIS canonical association, Start Menu folder와 hook 경로
- install·uninstall 전후 extension default의 값과 존재 여부 보존
- extension key의 비표적 전체 삭제 금지

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/Cargo.toml` | main binary target를 `Alhangeul`로 정렬 |
| `apps/desktop/src-tauri/tauri.conf.json` | canonical association name, NSIS Start Menu folder와 hook 연결 |
| `apps/desktop/src-tauri/windows/main.wxs` | file-owned shortcut, 명시적 canonical handler와 `OpenWithProgids` 등록 |
| `apps/desktop/src-tauri/windows/nsis-hooks.nsh` | NSIS default snapshot·복원과 canonical Open With lifecycle 구현 |
| `tests/windows-packaging.test.mjs` | Windows packaging source 회귀 계약 4개 추가 |
| `package.json` | 신규 packaging test를 `test:automation`에 연결 |
| `mydocs/plans/task_m010_11_impl.md` | Stage 4 evidence 기반 Stage 5 판정과 실제 산출물 반영 |
| `mydocs/working/task_m010_11_stage5.md` | Stage 5 구현·검증·잔여 위험 기록 |
| `mydocs/orders/20260731.md` | Stage 5 완료와 Stage 6 승인 대기 상태 반영 |

원인과 source-level 해결 방향은 고정했지만 Windows native 수용이 아직 남았으므로 `mydocs/troubleshootings/task_m010_11_windows_installer.md`는 생성하지 않았다. Stage 6에서 실제 해결이 검증된 뒤 재사용 가치와 함께 작성 여부를 결정한다.

## 본문 변경 정도 / 본문 무손실 여부

제품 UI, 문서 편집 동작, Rust native API, version, bundle identifier, publisher, Windows/Linux build matrix와 workflow는 수정하지 않았다. HWP/HWPX extension과 MIME type도 유지했다. 기존 WiX template의 installer UI, install scope, update, WebView2와 uninstall 흐름은 보존하고 handler·shortcut 부분만 교체했다.

NSIS는 고정된 Tauri template 전체를 복제하지 않고 공식 hook 네 지점과 기존 association 생성·제거 순서를 계승한다. Hook은 Alhangeul이 소유한 class, `OpenWithProgids`와 임시 marker만 수정하며 기존 extension default와 `UserChoice`를 소유하지 않는다.

## 검증 결과

실행 명령:

```bash
node --test tests/windows-packaging.test.mjs tests/windows-installer-smoke.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps --format-version 1
pnpm --filter alhangeul-desktop tauri info
xmllint --noout apps/desktop/src-tauri/windows/main.wxs
actionlint .github/workflows/alhangeul-desktop.yml
git diff --check
```

결과:

- OK — focused installer·packaging source contract `12/12` 통과.
- OK — 전체 automation `52/52` 통과.
- OK — product boundary `185 files scanned`.
- OK — product version의 5개 surface가 `0.1.0`으로 일치.
- OK — `rhwp` pin `v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개 일치.
- OK — upstream test `32/32` 통과.
- OK — studio test files `21/21`, tests `114/114` 통과.
- OK — studio TypeScript·Vite production build 성공.
- OK — Cargo metadata가 package name은 유지하고 binary target `Alhangeul`을 확인.
- OK — Tauri CLI 2.10.1이 변경된 config와 installer hook 경로를 정상 해석.
- OK — WiX template XML, workflow lint와 whitespace 검사 통과.

현재 macOS에는 `makensis`가 없으며 지원 범위 밖 host에서 NSIS toolchain을 추가하거나 Rust desktop·Tauri bundle을 빌드하지 않았다. Windows/Linux native build와 Windows MSI·NSIS compile·runtime 검증은 Stage 6 workflow에서 수행한다.

## 참고 근거

- [Tauri CLI 2.10.1 NSIS installer template](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.10.1/crates/tauri-bundler/src/bundle/windows/nsis/installer.nsi)
- [Tauri CLI 2.10.1 NSIS file association macro](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.10.1/crates/tauri-bundler/src/bundle/windows/nsis/FileAssociation.nsh)

## 잔여 위험

- WiX compiler가 빈 `OpenWithProgids` string value와 file-owned shortcut을 기대한 MSI table로 생성하는지는 Windows native build 전까지 미확정이다.
- NSIS compiler가 hook의 registry context와 LogicLib 분기를 기대대로 해석하는지는 Windows native build 전까지 미확정이다.
- 실제 install에서 양 installer의 `Alhangeul.exe`, version resource, shortcut target, canonical handler와 default 불변이 모두 통과하는지는 Stage 6 smoke가 판정해야 한다.
- binary target casing 변경이 Windows x64와 Linux x64·ARM64 package inventory에 미치는 영향도 Stage 6 세 플랫폼 build에서 확인해야 한다.
- 자동 smoke는 GUI open·save·print와 Explorer 기본 앱 선택 UI를 검증하지 않는다.

## 다음 단계 영향

- Stage 6은 이 Stage 5 commit을 포함한 exact SHA를 `publish/task11`에 push하고 desktop workflow를 새로 dispatch한다.
- 세 플랫폼 build와 Windows MSI·NSIS artifact inventory가 모두 성공해야 한다.
- Windows smoke는 설치·version·Desktop/Start Menu shortcut·launch·canonical handler·`OpenWithProgids`·default 불변·uninstall cleanup과 fixture를 모두 통과해야 한다.
- 실패하면 diagnostic artifact의 MSI log와 installer별 summary로 packaging compile/runtime 결함을 분류하며 수용 기준을 완화하지 않는다.
- 성공 뒤에만 `docs/operations/DESKTOP_RELEASE.md`의 자동 package smoke와 GUI 수동 gate 경계를 갱신하고 Task #9 handoff를 확정한다.

## 승인 요청

- Stage 5 산출물과 검증 결과를 승인하면 Stage 6 최종 exact-SHA Windows installer 수용 검증과 Task #9 handoff로 진행한다.
