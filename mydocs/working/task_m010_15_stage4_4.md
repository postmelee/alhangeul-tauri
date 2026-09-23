# Task #15 Stage 4.4 완료 보고서 — system print lifecycle exact-SHA 후보 handoff

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 4.4

## 단계 목적

Stage 2.4의 Windows system print lifecycle 보정을 포함한 exact source SHA로 CI,
Windows/Linux native bundle과 Windows installer smoke를 다시 수행했다. Windows
system print dialog와 `Microsoft Print to PDF` driver 저장창에서 거짓 완료 표시,
상태 복원과 best-effort 기본 파일명을 확인할 MSI·NSIS 후보를 제공한다.

## exact 후보

| 항목 | 값 |
|---|---|
| source branch | `publish/task15` |
| candidate SHA | `4c1f3f3aba9b32bcc060c9e4a44defeade63edb1` |
| source commit | `Task #15 [Stage 2.4]: Windows system print lifecycle 보정` |
| base 경계 | 미merge Task #13 exact SHA `63a2703cebf3a79d11a010974203fdaf4ccd3e76` 포함 |
| CI | [Alhangeul CI #31474744509](https://github.com/postmelee/alhangeul-tauri/actions/runs/31474744509) — success |
| native bundle | [Desktop Artifact Build #31474759372](https://github.com/postmelee/alhangeul-tauri/actions/runs/31474759372) — success |
| Windows 다운로드 | [`alhangeul-desktop-windows-x64`](https://github.com/postmelee/alhangeul-tauri/actions/runs/31474759372/artifacts/9094979256) |
| artifact 만료 | 2026-08-25 |

release tag, GitHub Release, 서명, updater, package repository 게시는 수행하지 않았다.

## 산출물

| 산출물 | 결과 |
|---|---|
| CI Unit tests | success, 3m5s — product/version/rhwp pin, automation, upstream, Studio build/test, desktop Rust test와 Clippy 통과 |
| Build windows-x64 | success, 7m51s — MSI·NSIS build, inventory 검증·upload |
| Build linux-x64 | success, 10m44s — AppImage·DEB·RPM build, inventory 검증·upload |
| Build linux-arm64 | success, 4m15s — DEB build, inventory 검증·upload |
| Smoke Windows x64 installers | success, 1m11s — exact SHA 확인, MSI·NSIS 설치·실행·제거와 post-clean 통과 |

업로드 artifact:

| 이름 | Artifact ID | GitHub archive size | 만료 |
|---|---:|---:|---|
| `alhangeul-desktop-windows-x64` | `9094979256` | 101,012,090 bytes | 2026-08-25 |
| `alhangeul-desktop-linux-x64` | `9095064508` | 501,361,524 bytes | 2026-08-25 |
| `alhangeul-desktop-linux-arm64` | `9094876788` | 163,894,520 bytes | 2026-08-25 |
| `alhangeul-desktop-windows-x64-installer-smoke` | `9095100645` | 31,041 bytes | 2026-08-25 |

독립 다운로드한 Windows artifact:

| 종류 | 파일 | 크기 | SHA-256 |
|---|---|---:|---|
| MSI | `msi/Alhangeul_0.1.0_x64_en-US.msi` | 52,776,960 bytes | `600c24e3340a53fefa35ac3c4e015367a4035f54e03e7b38afab51fab107e002` |
| NSIS | `nsis/Alhangeul_0.1.0_x64-setup.exe` | 48,462,978 bytes | `ed1f4b7fcf59443a723737bf3c66cd3d464ea56e727e688444947a92da8055d4` |

## 본문 변경 정도 / 본문 무손실 여부

Stage 2.4 source commit 이후 제품 코드는 변경하지 않았다. hidden print surface의 page
SVG, stylesheet와 출력 내용은 이전 exact 후보와 같으며 lifecycle cleanup과 상태
표시만 변경됐다. browser upstream preview, direct PDF와 HWP/HWPX 저장 데이터에는
추가 변경이 없다.

## 검증 결과

실행 명령:

```bash
git push origin HEAD:refs/heads/publish/task15
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task15
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri \
  --ref publish/task15 \
  -f build_ref=4c1f3f3aba9b32bcc060c9e4a44defeade63edb1 \
  -f run_tests=true
gh run watch 31474744509 --repo postmelee/alhangeul-tauri --exit-status
gh run watch 31474759372 --repo postmelee/alhangeul-tauri --exit-status
gh run download 31474759372 --repo postmelee/alhangeul-tauri \
  --name alhangeul-desktop-windows-x64 --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform windows-x64 \
  --root <artifact-root> --verify-inventory <inventory-path>
```

결과:

- OK — 두 workflow가 exact SHA `4c1f3f3aba9b32bcc060c9e4a44defeade63edb1`에서 성공
- OK — Windows x64, Linux x64, Linux arm64 bundle build와 workflow inventory 검증 성공
- OK — 독립 다운로드한 Windows MSI·NSIS 크기·SHA-256이 inventory와 일치
- OK — installer smoke checked-out SHA가 exact candidate와 일치
- OK — smoke의 checkout, verifyCommit, download, MSI·NSIS install/uninstall/post-clean 모두 `passed`
- 보류 — Windows WebView2 system print modal lifecycle과 기본 파일명은 GUI 수동 결과가 필요하다.

## Windows 수동 검증

1. 위 Windows artifact ZIP을 내려받아 압축을 푼다.
2. `nsis/Alhangeul_0.1.0_x64-setup.exe`를 설치하고 다중 페이지 HWP/HWPX를 연다.
3. `파일 > 인쇄`가 별도 Alhangeul preview 없이 system print dialog를 직접 여는지 확인한다.
4. `Microsoft Print to PDF`를 선택하고 `인쇄`를 누른다.
5. driver 저장창이 열린 동안 하단이 `인쇄 완료`가 아닌 `시스템 인쇄 처리 중...`인지 확인한다.
6. 파일명에 원본 basename이 제안되는지 기록한다. 비어 있어도 이번 acceptance 실패는 아니다.
7. 저장 또는 취소 후 기존 문서 상태가 복원되고 다시 인쇄할 수 있는지 확인한다.
8. Microsoft Print to PDF 결과의 쪽 수·한글·표·이미지와 `파일 > PDF로 저장` 회귀를 확인한다.

## 잔여 위험

- 기본 파일명은 Windows PDF driver가 WebView2 document title을 사용하는지에 달려 있어
  보장되지 않는다. 보장되는 파일명 UX는 앱 `PDF로 저장`이 담당한다.
- Windows installer smoke는 GUI modal과 status text를 자동 검증하지 않는다.
- Stage 2.4는 공통 lifecycle code이므로 Linux native build는 통과했지만 새 exact
  artifact의 CUPS/GTK GUI 출력은 아직 반복하지 않았다. 직전 `d194050` exact DEB의
  6쪽 pagination 결과는 통과 상태다.
- Task #13 merge 전에는 Task #15 PR·merge·close를 진행하지 않는다.

## 다음 단계 영향

- Windows GUI 결과가 필수 lifecycle gate를 통과하면 기본 파일명 결과와 별개로
  Stage 2.4 Windows acceptance를 확정한다.
- 상태가 계속 조기 복원되거나 surface 재사용이 막히면 exact 후보를 폐기하고 focus
  lifecycle을 다시 측정한다.
- Windows 결과 이후 새 exact Linux artifact GUI 반복 범위를 판단한다.

## 승인 요청

- 위 exact Windows artifact에서 system print lifecycle을 수동 검증하고 결과를
  알려주면 다음 판정을 이어간다.
