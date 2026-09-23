# Task #15 Stage 4.5 완료 보고서 — native modal lifecycle exact-SHA 후보 handoff

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 4.5

## 단계 목적

Stage 2.5의 Windows native modal lifecycle 보정을 포함한 exact source SHA로 CI,
Windows/Linux native bundle과 Windows installer smoke를 다시 수행했다. Microsoft
Print to PDF 저장창이 닫힐 때까지 `시스템 인쇄 처리 중...`을 유지하는지 확인할
MSI·NSIS 후보를 제공한다.

## exact 후보

| 항목 | 값 |
|---|---|
| source branch | `publish/task15` |
| candidate SHA | `dc568b08de8452cb4cfd8010e97db26ba13bec34` |
| source commit | `Task #15 [Stage 2.5]: Windows native modal lifecycle 보정` |
| base 경계 | 미merge Task #13 exact SHA `63a2703cebf3a79d11a010974203fdaf4ccd3e76` 포함 |
| CI | [Alhangeul CI #31477931871](https://github.com/postmelee/alhangeul-tauri/actions/runs/31477931871) — success |
| native bundle | [Desktop Artifact Build #31477948174](https://github.com/postmelee/alhangeul-tauri/actions/runs/31477948174) — success |
| Windows 다운로드 | [`alhangeul-desktop-windows-x64`](https://github.com/postmelee/alhangeul-tauri/actions/runs/31477948174/artifacts/9096235715) |
| artifact 만료 | 2026-08-25 |

release tag, GitHub Release, 서명, updater, package repository 게시는 수행하지 않았다.

## 산출물

| 산출물 | 결과 |
|---|---|
| CI Unit tests | success, 3m6s — product/version/rhwp pin, automation, upstream, Studio build/test, desktop Rust test와 Clippy 통과 |
| Build windows-x64 | success, 7m57s — MSI·NSIS build, inventory 검증·upload |
| Build linux-x64 | success, 9m43s — AppImage·DEB·RPM build, inventory 검증·upload |
| Build linux-arm64 | success, 4m3s — DEB build, inventory 검증·upload |
| Smoke Windows x64 installers | success, 45s — exact SHA 확인, MSI·NSIS 설치·실행·제거와 post-clean 통과 |

업로드 artifact:

| 이름 | Artifact ID | GitHub archive size | 만료 |
|---|---:|---:|---|
| `alhangeul-desktop-windows-x64` | `9096235715` | 101,017,422 bytes | 2026-08-25 |
| `alhangeul-desktop-linux-x64` | `9096290523` | 501,378,068 bytes | 2026-08-25 |
| `alhangeul-desktop-linux-arm64` | `9096120260` | 163,908,539 bytes | 2026-08-25 |
| `alhangeul-desktop-windows-x64-installer-smoke` | `9096312581` | 31,142 bytes | 2026-08-25 |

독립 다운로드한 Windows artifact:

| 종류 | 파일 | 크기 | SHA-256 |
|---|---|---:|---|
| MSI | `msi/Alhangeul_0.1.0_x64_en-US.msi` | 52,781,056 bytes | `0775e90eed8c0c300e6b51be2fd6e6b2c5d17d692cd278ebaa8114510299aaa2` |
| NSIS | `nsis/Alhangeul_0.1.0_x64-setup.exe` | 48,466,161 bytes | `684796ba873c65fe3a5a491e43742873c656fed3c07e1988a40638e6f8612f89` |

## 본문 변경 정도 / 본문 무손실 여부

Stage 2.5 source commit 이후 제품 코드는 변경하지 않았다. hidden print surface의 page
SVG, stylesheet와 출력 내용은 직전 exact 후보와 같으며 lifecycle waiter만 Windows에서
DOM focus 대신 Tauri native main window focus를 사용한다. browser upstream preview,
Linux pagination CSS, direct PDF와 HWP/HWPX 저장 데이터에는 추가 변경이 없다.

## 검증 결과

실행 명령:

```bash
git push origin HEAD:refs/heads/publish/task15
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task15
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri \
  --ref publish/task15 \
  -f build_ref=dc568b08de8452cb4cfd8010e97db26ba13bec34 \
  -f run_tests=true
gh run watch 31477931871 --repo postmelee/alhangeul-tauri --exit-status
gh run watch 31477948174 --repo postmelee/alhangeul-tauri --exit-status
gh run download 31477948174 --repo postmelee/alhangeul-tauri \
  --name alhangeul-desktop-windows-x64 --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform windows-x64 \
  --root <artifact-root> --verify-inventory <inventory-path>
```

결과:

- OK — 두 workflow가 exact SHA `dc568b08de8452cb4cfd8010e97db26ba13bec34`에서 성공
- OK — Windows x64, Linux x64, Linux arm64 bundle build와 workflow inventory 검증 성공
- OK — 독립 다운로드한 Windows MSI·NSIS 크기·SHA-256이 inventory와 일치
- OK — installer smoke checked-out SHA가 exact candidate와 일치
- OK — smoke의 checkout, verifyCommit, download, MSI·NSIS install/uninstall/post-clean 모두 `passed`
- 보류 — Windows WebView2 system print와 PDF driver 저장창의 native focus lifecycle은 GUI 수동 결과가 필요하다.

## Windows 수동 검증

1. 위 Windows artifact ZIP을 내려받아 압축을 푼다.
2. `nsis/Alhangeul_0.1.0_x64-setup.exe`를 설치하고 다중 페이지 HWP/HWPX를 연다.
3. `파일 > 인쇄`가 별도 Alhangeul preview 없이 system print dialog를 직접 여는지 확인한다.
4. `Microsoft Print to PDF`를 선택하고 `인쇄`를 누른다.
5. system print dialog뿐 아니라 파일 이름 지정 저장창에서도 하단이 계속
   `시스템 인쇄 처리 중...`인지 확인한다.
6. 저장 또는 취소한 뒤 Alhangeul로 돌아왔을 때 기존 문서 상태가 복원되고 다시
   인쇄할 수 있는지 확인한다.
7. 기본 파일명은 비어 있어도 acceptance 실패가 아니다. 정확한 이름이 필요하면
   `파일 > PDF로 저장`을 사용한다.
8. Microsoft Print to PDF 결과의 쪽 수·한글·표·이미지를 확인한다.

## 잔여 위험

- Windows installer smoke는 native dialog focus와 status text를 자동 검증하지 않는다.
- Tauri native main window focus가 system dialog에서 PDF 저장창으로 전환할 때 중간에
  잠깐 복귀하는 환경이라면 상태가 조기 복원될 수 있다. 새 exact GUI 결과로 판정한다.
- 저장 성공과 취소는 구분하지 않으며 physical printer spool 완료도 주장하지 않는다.
- 기본 파일명은 system print UI 제약으로 보장하지 않는다. 앱 `PDF로 저장`이 보장되는
  basename·쓰기 완료 UX를 담당한다.
- Task #13 merge 전에는 Task #15 PR·merge·close를 진행하지 않는다.

## 다음 단계 영향

- Windows GUI 필수 gate가 통과하면 Stage 2.5 Windows acceptance를 확정한다.
- 저장창에서 상태가 계속 조기 복원되면 native focus event sequence를 Windows에서
  측정한 뒤 modal transition 안정화 여부를 별도 판단한다.
- Windows 결과 이후 새 exact Linux artifact GUI 반복 범위를 판단한다.

## 승인 요청

- 위 exact Windows artifact에서 native modal lifecycle을 수동 검증하고 결과를 알려주면
  다음 판정을 이어간다.
