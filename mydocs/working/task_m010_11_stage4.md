# Task #11 Stage 4 보고서 — exact-SHA Windows installer 진단 canary

GitHub Issue: [#11](https://github.com/postmelee/alhangeul-tauri/issues/11)
구현계획서: [`task_m010_11_impl.md`](../plans/task_m010_11_impl.md)
Stage: 4

## 단계 목적

Stage 3에서 연결한 Windows installer smoke를 승인된 exact SHA로 실행해 Windows x64 MSI·NSIS를 실제 설치·검사·제거하고, 원본 로그와 cleanup 증적을 보존해 Stage 5의 보정 원인을 분류한다.

다섯 번째 canary에서 build artifact 생성, smoke source exact-SHA 검증, MSI·NSIS 실행, diagnostic upload와 cleanup이 모두 수행됐다. installer 수용 검사는 실패했지만 packaging 계약 불일치가 구체적인 runtime evidence로 확인됐으므로 구현계획서의 “진단 canary 목적 충족” 조건으로 Stage 4를 완료한다. 이 결과를 installer 수용 성공으로 해석하지 않는다.

## canary 실행 이력

모든 run은 `workflow_dispatch`, `publish/task11`, `run_tests=true`로 실행했고 Windows/Linux 세 build job은 모두 성공했다.

| Run | exact SHA | smoke 결과 | 확인한 원인 | 후속 보정 |
|---|---|---|---|---|
| [30600969373](https://github.com/postmelee/alhangeul-tauri/actions/runs/30600969373) | `04f19e861043ab9c7258097d180fc7f3a1c8a95f` | 실패 | diagnostic 준비 뒤 checkout이 작업 디렉터리를 정리해 checked-out SHA 기록 전에 중단 | checkout을 diagnostic 준비보다 앞으로 이동 |
| [30602141411](https://github.com/postmelee/alhangeul-tauri/actions/runs/30602141411) | `78ee28a4730e8a9dcb397cb791772c80ab71ba79` | 실패 | Windows PowerShell 5.1이 BOM 없는 UTF-8 source의 한국어 문자열을 잘못 해석해 parser error 발생 | PowerShell source에 UTF-8 BOM과 byte-level test 추가 |
| [30603734563](https://github.com/postmelee/alhangeul-tauri/actions/runs/30603734563) | `01e51e099290976c08a42d9f705b08c3a4d5b107` | 실패 | StrictMode에서 빈 process 배열의 `.Id` 속성 투영이 fatal error 발생 | pipeline 기반 process ID 투영으로 변경 |
| [30604711021](https://github.com/postmelee/alhangeul-tauri/actions/runs/30604711021) | `3bf50191b7f039203c4f1758cc9331c9280adf3a` | 실패 | shortcut 배열이 nested array로 `Test-Path`에 전달돼 존재하지 않는 네 경로를 잔여 상태로 오판 | 검사 전 후보 경로를 평탄화 |
| [30610672455](https://github.com/postmelee/alhangeul-tauri/actions/runs/30610672455) | `7a48f0dbc5f1039c44b2dbc191cc1adf3a47ffcc` | 진단 목적 충족, 수용 실패 | 양 installer의 실제 packaging 계약이 실행 파일명·handler·shortcut·기본 연결 수용 기준과 불일치 | Stage 5 packaging 보정 입력으로 확정 |

첫 네 run은 installer 수용 기준이나 packaging 설정을 바꾸지 않고 canary 선행 결함만 최소 보정했다. 각 보정은 별도 exact SHA로 push한 뒤 새 run으로 검증했다.

## 최종 exact-SHA run

### run과 job

| 항목 | 값 |
|---|---|
| Run | [30610672455](https://github.com/postmelee/alhangeul-tauri/actions/runs/30610672455) |
| Event / branch | `workflow_dispatch` / `publish/task11` |
| Head SHA | `7a48f0dbc5f1039c44b2dbc191cc1adf3a47ffcc` |
| Build windows-x64 | success, job `91092509408` |
| Build linux-x64 | success, job `91092509423` |
| Build linux-arm64 | success, job `91092509448` |
| Smoke Windows x64 installers | failure, job `91093832504` |
| Workflow 결론 | failure |

smoke job의 checkout, diagnostic 준비, exact-SHA 검증, Windows artifact download, smoke 실행, outcome 기록과 diagnostic upload step은 모두 성공했다. `Run Windows installer smoke`는 `continue-on-error`로 원래 failure outcome을 보존했고, 마지막 `Require Windows installer smoke success` gate가 이를 workflow failure로 전달했다.

### artifact

모든 artifact의 보존 기간은 14일이다.

| Artifact | ID | 압축 크기 | 만료 시각(UTC) | Digest |
|---|---:|---:|---|---|
| `alhangeul-desktop-windows-x64-installer-smoke` | `8785475657` | 29,153 bytes | 2026-08-14 06:55:53 | `sha256:fabeedb74d30b546db28e0ca19f54735fee38b89c1e5e4ca242d35943d8eb4f8` |
| `alhangeul-desktop-windows-x64` | `8785443121` | 53,655,997 bytes | 2026-08-14 06:54:11 | `sha256:5fa3548a5fdd38c736100671278195d708080f1af5fdf7c3d3421c1088d45303` |
| `alhangeul-desktop-linux-x64` | `8785462844` | 354,129,308 bytes | 2026-08-14 06:54:57 | `sha256:083679e184d1e405cf9bda5c0470b304daca16f48e68d5f88dc5c4e83c538ef6` |
| `alhangeul-desktop-linux-arm64` | `8785376285` | 90,030,122 bytes | 2026-08-14 06:50:30 | `sha256:cdd4fc8667daeeb87dde0fd0aefe52416a7cb2c6227f7e13525fac0fb33c7697` |

선행 canary의 diagnostic artifact도 각 실패 시점의 원본 증적을 보존한다.

| Run | Diagnostic artifact ID | 크기 | 만료 시각(UTC) | Digest |
|---|---:|---:|---|---|
| `30600969373` | `8782104116` | 239 bytes | 2026-08-14 03:27:16 | `sha256:3113c7ff4594f412f1205904a3c0ba61ac4587dc8a6064312fd293d983dc68f9` |
| `30602141411` | `8782404570` | 654 bytes | 2026-08-14 03:48:19 | `sha256:99e942e3a005e9ed6c2199adcbc6d5007c3d983473187e83cbaa695e3315a968` |
| `30603734563` | `8782969804` | 2,244 bytes | 2026-08-14 04:25:40 | `sha256:488863ce708c4b1094603d806cccfa531698d76ad4144a9592e2bbad8661aef0` |
| `30604711021` | `8783293933` | 2,651 bytes | 2026-08-14 04:47:57 | `sha256:a0e4357234a23984ad742f2f5ed79f984ce906607e6b2bed9f9928a4f036eec2` |

### Windows artifact inventory

| 파일 | 크기 | SHA-256 |
|---|---:|---|
| `msi/Alhangeul_0.1.0_x64_en-US.msi` | 28,192,768 bytes | `9d9dc72c3c513b8f8473993b30babc10b5cc96135bc7a3014c0ec91ea099fa46` |
| `nsis/Alhangeul_0.1.0_x64-setup.exe` | 25,702,407 bytes | `f4e257a297c9fa57e29e845c30ca3e77ac6088c10c6d5fef83b1999c589331d8` |

repository의 artifact verifier로 inventory와 실제 파일의 kind, 크기와 SHA-256 일치를 재확인했다.

## installer runtime evidence

### 공통 결과

- MSI와 NSIS 모두 silent install exit code `0`, uninstall exit code `0`을 반환했다.
- 두 installer 모두 설치 뒤 실제 실행 파일을 `alhangeul-desktop.exe`로 등록했지만 Stage 1 수용 계약은 설치 디렉터리 아래 `Alhangeul.exe`를 요구한다.
- 따라서 version resource, launch와 shortcut target 검사가 연쇄 실패했다. 이는 installer 실행 실패가 아니라 제품 실행 파일명 packaging 계약 불일치다.
- 각 installer 제거 뒤 process, install directory, uninstall entry와 소유 registry의 clean-state는 통과했다.
- 외부 fixture의 전후 SHA-256은 모두 `5B1B2C78885979086ACC790098BB28E71DAC9FB0FC1335D6C32CF3B091BDAE4B`로 일치했다.
- smoke가 설정한 `.hwp`, `.hwpx` sentinel과 원래 기본 연결 상태는 최종 cleanup에서 복원됐다.

### MSI

| 관찰점 | 결과 |
|---|---|
| 설치 위치 | `C:\Program Files\Alhangeul` |
| uninstall metadata | HKLM Registry64, `DisplayVersion=0.1.0`, `Publisher=postmelee`, install location 일치 |
| 실제 open command | `"C:\Program Files\Alhangeul\alhangeul-desktop.exe" "%1"` |
| canonical class | `Alhangeul.hwp`, `Alhangeul.hwpx` 존재 |
| `OpenWithProgids` | 두 extension 모두 canonical value 없음 |
| extension default | HKLM `.hwp`, `.hwpx` 기본값을 각각 canonical ProgID로 변경 |
| shortcut | Desktop, Start Menu 모두 없음 |

`msi-install.log`에는 `Product: Alhangeul -- Installation completed successfully.`와 `MainEngineThread is returning 0`, `msi-uninstall.log`에는 `Removal completed successfully.`와 return code `0`이 기록됐다. `Return value 3`은 없었다. 따라서 VDI에서 관찰된 MSI `1602`는 GitHub-hosted Windows에서 재현되지 않았고, 이 canary만으로 WiX install action 실패로 분류하지 않는다.

### NSIS

| 관찰점 | 결과 |
|---|---|
| 설치 위치 | `C:\Users\runneradmin\AppData\Local\Alhangeul` |
| uninstall metadata | HKCU Registry64, `DisplayVersion=0.1.0`, `MainBinaryName=alhangeul-desktop.exe` |
| canonical class / `OpenWithProgids` | 모두 없음 |
| extension default | 기존 sentinel을 `HWP Document`, `HWPX Document`로 변경 |
| Desktop shortcut | 존재, target은 `alhangeul-desktop.exe` |
| Start Menu shortcut | 없음 |

NSIS가 설치·제거에 성공한 사실은 file handler 수용 성공을 뜻하지 않는다. legacy class 이름과 extension 기본값 직접 변경은 Stage 1의 canonical ProgID, `OpenWithProgids`, 기존 기본 연결 불변 계약에 어긋난다.

## 원인 분류

Stage 4 결과는 다음처럼 분류한다.

- **packaging 결함**: 실행 파일 product name, MSI/NSIS shortcut, 양 installer의 `OpenWithProgids`, 기본 연결 불변과 NSIS canonical ProgID가 승인된 수용 계약과 불일치한다.
- **hosted runner 설치 환경 정상**: MSI와 NSIS의 silent install·uninstall은 모두 exit code `0`으로 완료됐다.
- **VDI `1602`는 환경 한계 후보**: hosted runner에서 재현되지 않았고 기존 VDI에는 verbose log가 없으므로 제품 WiX action 결함으로 확정하지 않는다.
- **automation 계약 유지**: Stage 1 수용 기준을 실제 installer 동작에 맞춰 낮추지 않는다. Stage 5는 packaging source를 기준에 맞게 최소 보정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-desktop.yml` | Stage 4.1에서 checkout과 diagnostic 준비 순서를 보정 |
| `scripts/windows-installer-smoke.ps1` | UTF-8 BOM, 빈 process ID 투영, clean-state 후보 경로 평탄화 보정 |
| `tests/windows-installer-smoke.test.mjs` | BOM·StrictMode-safe 투영·평탄화 회귀 계약 추가 |
| `mydocs/plans/task_m010_11_impl.md` | 승인된 Stage 4.1~4.4 canary 선행 결함 보정 조건 기록 |
| `mydocs/working/task_m010_11_stage4.md` | 다섯 canary와 최종 packaging 원인 분류 기록 |
| `mydocs/orders/20260731.md` | Stage 4 완료와 Stage 5 승인 대기 상태 반영 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드, WiX/Tauri packaging 설정, installer 수용 기준과 공식 운영 문서는 수정하지 않았다. workflow와 smoke source는 실제 installer 실행 전에 발생한 네 canary 선행 결함만 최소 보정했다. 원격 변경은 승인된 `publish/task11` fast-forward push와 workflow dispatch에 한정했으며 release, tag, signing, 배포와 package 게시는 수행하지 않았다.

## 검증 결과

실행 명령:

```bash
node --test tests/actions-workflows.test.mjs tests/windows-installer-smoke.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
actionlint .github/workflows/alhangeul-desktop.yml
git diff --check
git ls-remote origin refs/heads/publish/task11
gh run view 30610672455 --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download 30610672455 -n alhangeul-desktop-windows-x64
gh run download 30610672455 -n alhangeul-desktop-windows-x64-installer-smoke
pnpm run check:desktop-artifacts -- --platform windows-x64 --root <windows-artifact-root> --verify-inventory <inventory-path>
```

결과:

- OK — workflow·PowerShell source contract `19/19` 통과.
- OK — 전체 automation `48/48` 통과.
- OK — product boundary `183 files scanned`.
- OK — product version의 5개 surface가 `0.1.0`으로 일치.
- OK — `rhwp` pin `v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개 일치.
- OK — upstream test `32/32` 통과.
- OK — studio test files `21/21`, tests `114/114` 통과.
- OK — studio TypeScript·Vite production build 성공.
- OK — `actionlint`와 whitespace 검사 통과.
- OK — 로컬·원격 candidate ref가 exact SHA `7a48f0dbc5f1039c44b2dbc191cc1adf3a47ffcc`로 일치.
- OK — 세 플랫폼 build job과 artifact upload 성공.
- OK — Windows MSI·NSIS inventory, 크기와 SHA-256 검증 통과.
- OK — smoke source exact SHA, diagnostic upload, MSI 원본 log, installer별 summary, fixture와 cleanup 증적 보존.
- MISS — installer 수용 기준은 실행 파일명, handler, shortcut과 기본 연결 정책 불일치로 실패. Stage 5에서 보정한다.

## 잔여 위험

- 공개 release에 사용할 Windows installer는 아직 수용 실패 상태다.
- packaging source를 보정한 뒤 양 installer가 동일한 실행 파일명·handler·shortcut·기본 연결 불변 계약을 만족하는지는 Stage 6 exact-SHA run 전까지 미확정이다.
- VDI `1602`는 hosted runner에서 재현되지 않았지만 원본 verbose log가 없어 발생 조건을 완전히 배제할 수 없다.
- 자동 smoke는 제한 process 생존만 확인하며 실제 HWP/HWPX open·save·print와 Windows Explorer GUI 연결 선택은 별도 수동 gate로 남는다.
- diagnostic artifact는 2026-08-14에 만료되므로 재현 가능한 핵심 관찰은 이 보고서에 보존하되 원본 binary와 log를 저장소에 커밋하지 않는다.

## 다음 단계 영향

- Stage 5는 `alhangeul-desktop.exe`를 `Alhangeul.exe`로 정렬하고 양 installer의 Desktop·Start Menu shortcut target을 같은 executable로 맞추는 packaging 경계를 우선 확인한다.
- MSI와 NSIS 모두 canonical `Alhangeul.hwp`, `Alhangeul.hwpx`와 대응 `OpenWithProgids`를 등록하되 기존 extension default와 `UserChoice`를 바꾸지 않도록 최소 수정한다.
- Stage 5는 Windows runtime 증적이 가리키는 WiX/Tauri 설정만 수정하고 automation 수용 기준은 완화하지 않는다.
- 원인과 해결을 source test로 고정하고 재사용 가치가 확인되면 `mydocs/troubleshootings/task_m010_11_windows_installer.md`를 작성한다.
- Stage 5 플랫폼 중립 검증이 끝나도 installer 수용 성공을 주장하지 않으며 최종 판정은 Stage 6 새 exact-SHA canary에서 수행한다.

## 승인 요청

- Stage 4 산출물과 진단 결과를 승인하면 Stage 5 증거 기반 packaging 원인 판정과 보정으로 진행한다.
