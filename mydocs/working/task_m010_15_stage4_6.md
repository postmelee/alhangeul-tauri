# Task #15 Stage 4.6 완료 보고서 — modal handoff stability exact-SHA 후보 handoff

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 4.6

## 단계 목적

Stage 2.6의 Windows modal handoff 안정화를 포함한 exact source SHA로 CI,
Windows/Linux native bundle과 Windows installer smoke를 다시 수행했다. system print
dialog에서 Microsoft Print to PDF 저장창으로 전환되는 동안
`시스템 인쇄 처리 중...`과 hidden print surface가 유지되는지 확인할 MSI·NSIS 후보를
제공한다.

## exact 후보

| 항목 | 값 |
|---|---|
| source branch | `publish/task15` |
| candidate SHA | `89718976a7fa44ebe7f8981ca01ce6bfcbebc979` |
| source commit | `Task #15 [Stage 2.6]: Windows modal handoff 안정화` |
| base 경계 | 미merge Task #13 exact SHA `63a2703cebf3a79d11a010974203fdaf4ccd3e76` 포함 |
| CI | [Alhangeul CI #31480733084](https://github.com/postmelee/alhangeul-tauri/actions/runs/31480733084) — success |
| native bundle | [Desktop Artifact Build #31480736454](https://github.com/postmelee/alhangeul-tauri/actions/runs/31480736454) — success |
| Windows 다운로드 | [`alhangeul-desktop-windows-x64`](https://github.com/postmelee/alhangeul-tauri/actions/runs/31480736454/artifacts/9097319137) |
| artifact 만료 | 2026-08-25 |

release tag, GitHub Release, 서명, updater, package repository 게시는 수행하지 않았다.

## 산출물

| 산출물 | 결과 |
|---|---|
| CI Unit tests | success, 3m8s — product/version/rhwp pin, automation, upstream, Studio build/test, desktop Rust test와 Clippy 통과 |
| Build windows-x64 | success, 8m26s — MSI·NSIS build, inventory 검증·upload |
| Build linux-x64 | success, 10m56s — AppImage·DEB·RPM build, inventory 검증·upload |
| Build linux-arm64 | success, 4m33s — DEB build, inventory 검증·upload |
| Smoke Windows x64 installers | success, 1m26s — exact SHA 확인, MSI·NSIS 설치·실행·제거와 post-clean 통과 |

업로드 artifact:

| 이름 | Artifact ID | GitHub archive size | 만료 |
|---|---:|---:|---|
| `alhangeul-desktop-windows-x64` | `9097319137` | 101,015,275 bytes | 2026-08-25 |
| `alhangeul-desktop-linux-x64` | `9097391766` | 501,376,010 bytes | 2026-08-25 |
| `alhangeul-desktop-linux-arm64` | `9097207769` | 163,908,703 bytes | 2026-08-25 |
| `alhangeul-desktop-windows-x64-installer-smoke` | `9097434738` | 30,943 bytes | 2026-08-25 |

독립 다운로드한 Windows artifact:

| 종류 | 파일 | 크기 | SHA-256 |
|---|---|---:|---|
| MSI | `msi/Alhangeul_0.1.0_x64_en-US.msi` | 52,781,056 bytes | `56e3169dfdb35a6af3de073577f10ffb8b29a7ea7120347de82b48fa3d39b7da` |
| NSIS | `nsis/Alhangeul_0.1.0_x64-setup.exe` | 48,463,953 bytes | `3fb29bb7635f67ff56f3ed7543efe8d22af77b480d517a57f7f1500265d8459a` |

## 본문 변경 정도 / 본문 무손실 여부

Stage 2.6 source commit 이후 제품 코드는 변경하지 않았다. upstream page SVG, print
stylesheet, browser visible preview, Linux pagination CSS와 HWP/HWPX/direct PDF 데이터는
직전 exact 후보와 같다. 변경 경계는 Tauri adapter의 Windows 인쇄 상태 문구 시점과
native main window focus 안정화 판정에 한정된다.

## 검증 결과

실행 명령:

```bash
git push origin HEAD:refs/heads/publish/task15
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task15
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri \
  --ref publish/task15 \
  -f build_ref=89718976a7fa44ebe7f8981ca01ce6bfcbebc979 \
  -f run_tests=true
gh run watch 31480733084 --repo postmelee/alhangeul-tauri --exit-status
gh run watch 31480736454 --repo postmelee/alhangeul-tauri --exit-status
gh run download 31480736454 --repo postmelee/alhangeul-tauri \
  --name alhangeul-desktop-windows-x64 --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform windows-x64 \
  --root <artifact-root> --verify-inventory <inventory-path>
shasum -a 256 <msi-path> <nsis-path>
```

결과:

- OK — 두 workflow가 exact SHA `89718976a7fa44ebe7f8981ca01ce6bfcbebc979`에서 성공
- OK — Windows x64, Linux x64, Linux arm64 bundle build와 workflow inventory 검증 성공
- OK — 독립 다운로드한 Windows MSI·NSIS 크기·SHA-256이 inventory와 일치
- OK — installer smoke checked-out SHA와 requested build ref가 exact candidate와 일치
- OK — smoke의 checkout, verifyCommit, download가 모두 `success`
- OK — MSI·NSIS install/uninstall, 외부 fixture 무손실과 post-clean이 모두 `passed`
- 보류 — Windows WebView2에서 system print dialog와 PDF driver 저장창 사이의 상태 유지,
  최종 focus 복귀 뒤 상태 복원은 GUI 수동 결과가 필요하다.

## Windows 수동 검증

1. 위 Windows artifact ZIP을 내려받아 압축을 푼다.
2. `nsis/Alhangeul_0.1.0_x64-setup.exe`를 설치하고 다중 페이지 HWP/HWPX를 연다.
3. `파일 > 인쇄`가 별도 Alhangeul preview 없이 system print dialog를 직접 여는지 확인한다.
4. system print dialog가 떠 있는 동안 하단이 `시스템 인쇄 처리 중...`인지 확인한다.
5. `Microsoft Print to PDF`를 선택하고 `인쇄`를 누른다.
6. 파일 이름 지정 저장창에서도 하단이 계속 `시스템 인쇄 처리 중...`인지 확인한다.
7. 저장 또는 취소한 뒤 Alhangeul로 최종 복귀하면 약 1초 뒤 기존 문서 상태가 복원되는지
   확인한다.
8. 같은 세션에서 다시 `파일 > 인쇄`를 실행할 수 있는지 확인한다.
9. Microsoft Print to PDF 기본 파일명은 비어 있어도 acceptance 실패가 아니다. 정확한
   basename이 필요하면 `파일 > PDF로 저장`을 사용한다.

## 잔여 위험

- Windows installer smoke는 native dialog focus와 status text를 자동 검증하지 않는다.
- Windows에서 driver 저장창 생성이 1초보다 늦어 main window focus가 먼저 1초간
  유지되는 환경이면 상태가 조기 복원될 수 있다. 새 exact GUI 결과로 판정한다.
- native focus 복귀는 modal chain 종료만 뜻하며 저장 성공, 취소 또는 physical printer
  spool 완료를 구분하지 않는다.
- focus 복귀 신호가 오지 않으면 5분 safety timeout 뒤 title·surface를 정리한다.
- 기본 파일명은 system print UI 제약으로 보장하지 않는다. 앱 `PDF로 저장`이 보장되는
  basename·쓰기 완료 UX를 담당한다.
- Task #13 merge 전에는 Task #15 PR·merge·close를 진행하지 않는다.

## 다음 단계 영향

- Windows GUI 필수 gate가 통과하면 Stage 2.6 Windows acceptance를 확정한다.
- 저장창에서 상태가 조기 복원되면 해당 환경의 focus transition 시간과 event sequence를
  측정한 뒤 stability window를 다시 판단한다.
- Windows 결과 이후 새 exact Linux artifact GUI 반복 범위를 판단한다.

## 승인 요청

- 위 exact Windows artifact에서 modal handoff lifecycle을 수동 검증하고 결과를 알려주면
  다음 판정을 이어간다.
