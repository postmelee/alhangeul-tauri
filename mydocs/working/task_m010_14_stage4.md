# Task #14 Stage 4 완료보고서 — Windows bundle·등록·공존·rollback

GitHub Issue: [#14](https://github.com/postmelee/alhangeul-tauri/issues/14)
구현계획서: [`task_m010_14_impl.md`](../plans/task_m010_14_impl.md)
Stage: 4

## 단계 목적

Stage 3에서 구현한 Windows x64 COM thumbnail handler DLL과 제한 worker EXE를 MSI·NSIS 설치 root의 고정 이름으로 배치하고, 설치·재설치·제거·실패 rollback 전체에서 기존 HWP/HWPX thumbnail handler와 기본 앱 연결을 훼손하지 않는 등록 transaction을 완성하는 단계다.

MSI는 HKLM Registry64, NSIS는 HKCU Registry64를 소유 범위로 사용한다. `.hwp`와 `.hwpx`의 기존 ShellEx thumbnail owner는 raw kind/data 또는 부재 상태로 snapshot하고 commit marker 뒤에만 유효한 backup으로 취급한다. 제거 시 현재 owner가 Alhangeul CLSID인 경우에만 원래 상태를 복원하며, 설치 중간 실패와 제3자 변경은 보존한다.

설치 artifact와 native 경계를 exact SHA에서 함께 검증하기 위해 Windows bundle inventory에 handler DLL·worker EXE의 cardinality, PE x64 type과 SHA-256을 추가했다. 별도 Windows installer smoke는 MSI rollback failure injection, NSIS 동일 버전 재설치, 한컴 sentinel 공존, 실제 `IShellItemImageFactory` HWP/HWPX 256 px 호출, 기본 앱 보존, 제거 뒤 등록·파일·프로세스 cleanup을 hard gate로 수행한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/tauri.conf.json` | Windows custom WiX·NSIS hook을 Tauri bundle 설정에 연결했다. |
| `apps/desktop/src-tauri/windows/main.wxs` | handler/worker 설치 component와 machine 등록·제거·rollback custom action 순서를 추가했다. |
| `apps/desktop/src-tauri/windows/nsis-hooks.nsh` | x64 filesystem redirection을 제어한 native `regsvr32 /n /i:user` 설치·제거 transaction과 실패 전파를 추가했다. |
| `apps/thumbnail-handler/src/{lib,registration}.rs` | machine/user 등록 export와 표준 `DllInstall` export를 같은 transaction으로 연결하고 HRESULT 경계를 고정했다. |
| `apps/thumbnail-handler/src/registration/{windows,windows/registry}.rs` | HKLM/HKCU Registry64 snapshot, raw value 보존, commit marker, conditional restore와 targeted association notify를 구현했다. |
| `apps/thumbnail-handler/tests/com_contract.rs` | staged DLL이 `DllInstall`을 포함한 필수 COM/등록 export를 제공하는지 Windows native test로 검증한다. |
| `scripts/verify-desktop-artifacts.mjs` | Windows bundle과 verification copy의 handler DLL·worker EXE cardinality, PE x64 type, SHA-256 정합성을 inventory에 포함한다. |
| `scripts/windows-installer-smoke.ps1`, `windows-installer-smoke-support.ps1` | 공통 installer 검증과 thumbnail 전용 검증을 분리하고 MSI·NSIS 실행, 기본 앱·shortcut·경로·version·cleanup 증적을 구조화한다. |
| `scripts/windows-thumbnail-smoke.ps1` | rollback, 32/64 registry view, 제3자 sentinel, 실제 HWP/HWPX Shell bitmap, 원본 무손실과 conditional restore를 검증한다. |
| `.github/workflows/alhangeul-desktop.yml`, `package.json` | exact-SHA Windows bundle 뒤 별도 fresh installer-smoke job과 always 진단 artifact 업로드를 연결하고 automation inventory를 갱신했다. |
| `tests/{actions-workflows,desktop-artifacts,windows-installer-smoke,windows-packaging,windows-thumbnail-registration}.test.mjs` | workflow 순서, artifact 경계, WiX/NSIS 등록 transaction, snapshot/restore와 smoke hard gate를 source contract로 고정했다. |
| `mydocs/orders/20260826.md` | Stage 4 완료·Stage 5 승인 대기 상태로 갱신했다. |
| `mydocs/working/task_m010_14_stage4.md` | 구현, exact-SHA native 증적, 진단 보정, 잔여 위험과 Stage 5 인계 사항을 기록했다. |

Stage 3 완료 커밋 `e164629` 대비 Stage 4 source는 21개 파일에 1,320줄 추가·176줄 삭제가 반영됐다. Stage 4 source의 최종 exact SHA는 `e407c20cfd23059b997590462a5e66fb47e1aa03`이다.

Stage source와 진단 보정은 다음 하위 단계 커밋으로 기록했다.

- `a7c4ae47135fd621d5207ff9556effbab282049e` — Windows 등록과 installer native gate 준비
- `2c17e923ecc9f7470973fd29e7228f66731a3d05` — 최신 Clippy UTF-16 decode 계약 보정
- `bc679b60f906b6e0491a3421511e102a227b73f4` — MSI deferred regsvr32 실행 문자열 보정
- `b79e0bbd170a6e12ab79cebfd0afe7e02bd7a9f4` — Windows installer smoke 판정 보정
- `e407c20cfd23059b997590462a5e66fb47e1aa03` — NSIS x64 등록 경계 보정

## 본문 변경 정도 / 본문 무손실 여부

코드·테스트·workflow·내부 작업 보드 작업이다. 제품 공식 문서는 수정하지 않았고 `third_party/rhwp` gitlink와 내용도 변경하지 않았다. upstream pin은 `v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`로 유지했다.

설치 transaction은 active ProgID, `SystemFileAssociations`, `UserChoice`를 쓰지 않는다. installer smoke가 설정한 `Hancom.Hwp.Document`, `Hancom.Hwpx.Document` 기본값과 제3자 thumbnail sentinel은 설치·재설치·제거 뒤 보존됐다. fixture HWP/HWPX의 SHA-256, size, mtime과 설치 root 밖 canary hash도 전후 동일했다.

등록은 고정 CLSID `{C1DCF316-0771-49DD-BFEA-C85F69B1674B}`와 설치 root의 `AlhangeulThumbnailHandler.dll`만 `InprocServer32`에 사용한다. MSI는 machine scope, NSIS는 current-user scope의 Registry64만 소유하고 다른 hive/view의 CLSID를 제거하지 않는다. association 변경 뒤에는 targeted notification만 보내며 Explorer·DllHost를 강제 종료하지 않는다.

새로 분리한 Rust registration source와 PowerShell smoke source는 각각 300 LOC 이하를 유지한다. 기존 WiX 단일 product source `main.wxs`는 Stage 4 전부터 권장 상한을 초과했으며, 승인된 계획의 해당 파일 안에 40줄의 component/custom action wiring만 추가하고 전체 재구성은 수행하지 않았다.

## 검증 결과

구현계획서의 Stage 4 플랫폼 중립 명령:

```bash
pnpm run test:automation
pnpm run check:product-boundary
pnpm run check:product-version
git diff --check
```

결과:

- OK — automation contract test 232/232 통과
- OK — product boundary 261개 파일 검사 통과
- OK — package, desktop, Cargo, Tauri surface의 제품 version `0.1.0` 정합
- OK — `git diff --check` 출력 없이 종료 코드 0

구현계획서의 Windows x64 명령:

```powershell
pnpm tauri build --verbose --target x86_64-pc-windows-msvc
pnpm run check:desktop-artifacts -- --platform windows-x64 --root apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle --write-inventory apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/alhangeul-artifact-inventory.json
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows-installer-smoke.ps1 -ArtifactRoot apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle -OutputDirectory diagnostics/windows-thumbnail-installer -ExpectedVersion 0.1.0
```

GitHub Actions exact-SHA 증적:

- run: [32948057314](https://github.com/postmelee/alhangeul-tauri/actions/runs/32948057314), conclusion `success`
- exact source SHA: `e407c20cfd23059b997590462a5e66fb47e1aa03`
- Linux arm64 job `98113033201`: success, 8분 24초
- Linux x64 job `98113033413`: success, 14분 36초
- Windows x64 job `98113033443`: success, 26분 16초
- Windows x64 installer smoke job `98120085085`: success, 1분 27초
- 세 build job 모두 exact commit 확인, product/automation/upstream gate, document preview test·Clippy, desktop test·Clippy, Tauri bundle, artifact inventory 검증·업로드 성공
- Windows job의 thumbnail core probe, worker/handler PE build, native test, `DllInstall` export contract, worker/handler Clippy와 MSI·NSIS bundle이 모두 success
- installer smoke 진단 artifact `alhangeul-desktop-windows-x64-installer-smoke` ID `9599909116`을 내려받아 `windows-installer-smoke-summary.json`의 `Status: passed`, `Failures: []`를 재확인

Windows installer smoke 원시 결과:

| 검증 | MSI | NSIS |
|---|---|---|
| 설치 / 제거 | exit `0` / `0` | exit `0` / `0` |
| 실패 rollback / 동일 버전 재설치 | injected rollback exit `1603`, 예상대로 실패 후 복원 | `Reinstall: true` |
| 등록 scope | HKLM Registry64, exact 설치 DLL | HKCU Registry64, exact 설치 DLL |
| HWP 256 px Shell 호출 | HRESULT `0` | HRESULT `0` |
| HWPX 256 px Shell 호출 | HRESULT `0` | HRESULT `0` |
| 등록·경로·version·handler·shortcut·기본 앱 | 전부 `true` | 전부 `true` |
| thumbnail 제거 | `true` | `true` |
| 최종 cleanup | `Clean: true`, owned registry `0` | `Clean: true`, owned registry `0` |

추가 확인:

- OK — MSI failure injection은 등록 직후 의도한 `1603`으로 중단되고 WiX rollback이 기존 association/backup 상태를 복원했다.
- OK — NSIS silent initial install과 `/S /UPDATE` 동일 버전 재설치가 모두 current-user x64 handler 등록을 유지했다.
- OK — MSI/NSIS 모두 `.hwp`와 `.hwpx` owner를 Alhangeul CLSID로 등록하면서 기존 값을 backup하고 제거 시 원래 sentinel을 복원했다.
- OK — 실제 공개 fixture `111exam_social.hwp`와 `03-blank_hwpx.hwpx`를 `IShellItemImageFactory`로 요청해 256 px bitmap을 반환했다.
- OK — 설치·썸네일 호출·제거 중 Alhangeul 앱/WebView가 기동하지 않았고, fixture와 설치 root 밖 canary를 수정하지 않았다.

### exact-SHA 진단 보정 이력

| Run / SHA | 결과 | 원인과 최소 보정 |
|---|---|---|
| `32924937502` / `bc679b60...` | 실패 | Windows build와 실제 HWP/HWPX thumbnail 호출은 성공했지만 shared `Software\Classes` key를 Registry32/64의 독립 물리 key로 오판했고 NSIS current-user 등록·재설치가 실패했다. Linux x64의 별도 실패는 AppImage `linuxdeploy` 다운로드 중 외부 연결 reset이었다. registry view 판정과 smoke 진단을 보정했다. |
| `32944473881` / `b79e0bb...` | 실패 | Linux arm64/x64와 Windows build, MSI rollback/install/thumbnail/uninstall은 모두 성공했다. NSIS는 32-bit installer process에서 x64 DLL을 직접 호출해 HKCU Registry64 등록이 생기지 않았고 동일 버전 재설치가 exit `2`였다. x64 filesystem redirection을 끈 native `regsvr32`와 표준 `DllInstall` current-user transaction으로 보정했다. |
| `32948057314` / `e407c20...` | 성공 | Windows/Linux build matrix, MSI rollback, MSI/NSIS 설치·재설치·HWP/HWPX Shell bitmap·제거·conditional restore와 최종 cleanup이 모두 통과했다. |

현재 macOS host에서는 계획서의 플랫폼 중립 검증만 완료 판정에 사용했다. Windows COM 등록, MSI/NSIS, Shell bitmap과 Tauri Windows build 성공 근거는 위 exact-SHA Windows jobs와 내려받은 원시 smoke summary로 한정한다.

## 잔여 위험

- hosted Windows runner의 `IShellItemImageFactory` 호출은 실제 handler 등록과 bitmap 반환을 검증했지만 Explorer 창의 Large/Extra large icon UI, cache 갱신, DPI별 시각 품질을 눈으로 확인하지는 않았다. 정식 Windows VDI Explorer 수용은 Stage 6 범위다.
- Stage 4는 unsigned 0.1.0 artifact의 silent install을 검증했다. 서명·SmartScreen, Explorer가 DLL을 장시간 load한 상태의 update/file-lock, 실제 사용자 정책 차이는 Stage 6 수용에서 확인한다.
- MSI failure injection과 NSIS 동일 버전 재설치·정상 제거는 검증했으나 다른 제품 버전 간 upgrade/downgrade matrix는 아직 없다. 후속 version 변경 시 installer migration gate가 필요하다.
- 임시 remote ref `codex/task14-stage4-probe`는 exact-SHA artifact와 source의 도달 가능성을 유지하기 위해 남겨 두었다. 최종 `publish/task14` push 또는 타스크 정리 시 삭제한다.

## 다음 단계 영향

- Stage 5는 공식 문서에 DLL/worker process, IPC/fallback/resource, HKLM/HKCU Registry64 ownership, snapshot/conditional restore, MSI/NSIS bundle과 native gate를 정렬해야 한다.
- `README.md`는 Stage 6 전 Explorer 수용 완료를 단정하지 않고 구현 후보와 native 자동 검증 완료, 수동 UI 검증 대기 상태를 구분해야 한다.
- Windows VDI에서 exact-SHA artifact의 설치와 Explorer 썸네일을 빠르게 확인하는 비공식 preflight는 Stage 4 승인 뒤 진행할 수 있다. DPI·크기·cache·문서 변경·fallback을 포함한 공식 결과 기록은 Stage 5 문서 정렬 뒤 Stage 6 수용 matrix에서 수행한다.
- Stage 5 source·공식 문서 수정은 본 보고서와 검증 결과에 대한 작업지시자 승인 뒤에만 시작한다.

## 승인 요청

- Stage 4 산출물과 Windows/Linux exact-SHA 검증 결과를 승인하면 Stage 5의 플랫폼 중립 회귀와 공식 문서 정렬로 진행한다.
