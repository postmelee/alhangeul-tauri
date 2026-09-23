# Task #15 Stage 4.2 완료 보고서 — direct print exact-SHA Windows/Linux 후보 handoff

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 4.2

## 단계 목적

Stage 2.2의 Tauri hidden page surface 직접 인쇄를 포함한 exact source SHA로 CI, Windows/Linux native bundle과 Windows installer smoke를 다시 수행했다. 별도 Alhangeul preview 없이 system print dialog를 직접 여는 Windows 수동 gate에 사용할 MSI·NSIS 후보를 제공한다.

## exact 후보

| 항목 | 값 |
|---|---|
| source branch | `publish/task15` |
| candidate SHA | `33e6287e397b6aee47963ef5460e7d15ae67b904` |
| source commit | `Task #15 [Stage 2.2]: Tauri hidden page surface 직접 인쇄` |
| base 경계 | 미merge Task #13 exact SHA `63a2703cebf3a79d11a010974203fdaf4ccd3e76` 포함 |
| CI | [Alhangeul CI #31311633798](https://github.com/postmelee/alhangeul-tauri/actions/runs/31311633798) — success |
| native bundle | [Desktop Artifact Build #31311632841](https://github.com/postmelee/alhangeul-tauri/actions/runs/31311632841) — success |
| Windows 다운로드 | [`alhangeul-desktop-windows-x64`](https://github.com/postmelee/alhangeul-tauri/actions/runs/31311632841/artifacts/9037624877) |
| artifact 만료 | 2026-08-23 20:54 KST (`2026-08-23T11:54:43Z`) |

두 workflow 모두 `workflow_dispatch`, `publish/task15`, 위 candidate SHA를 가리키는지 API 결과로 확인했다. release tag·GitHub Release·서명·updater·package repository 게시는 수행하지 않았다.

## 산출물

| 산출물 | 결과 |
|---|---|
| CI Unit tests | success, 2m54s — 공통 gate, desktop Rust unit test와 Clippy 포함 |
| Build windows-x64 | success, 8m8s — MSI·NSIS build, inventory 검증·upload |
| Build linux-x64 | success, 12m1s — 지원 bundle build, inventory 검증·upload |
| Build linux-arm64 | success, 3m48s — DEB build, inventory 검증·upload |
| Smoke Windows x64 installers | success, 49s — MSI·NSIS 설치·실행·제거 및 진단 artifact |

업로드 artifact:

| 이름 | Artifact ID | GitHub archive size | 만료 |
|---|---:|---:|---|
| `alhangeul-desktop-windows-x64` | `9037624877` | 101,003,584 bytes | 2026-08-23 |
| `alhangeul-desktop-linux-x64` | `9037667817` | 501,363,468 bytes | 2026-08-23 |
| `alhangeul-desktop-linux-arm64` | `9037578607` | 163,893,974 bytes | 2026-08-23 |
| `alhangeul-desktop-windows-x64-installer-smoke` | `9037676857` | 31,192 bytes | 2026-08-23 |

## 본문 변경 정도 / 본문 무손실 여부

Stage 2.2 source commit 이후 제품 코드는 변경하지 않았다. 이 Stage에서는 exact workflow와 artifact 검증 증적, 오늘할일과 계획의 수동 gate 표현만 갱신한다. upstream browser visible preview, Tauri hidden print page surface, direct PDF와 HWP/HWPX 저장 데이터에는 추가 변경이 없다.

## 검증 결과

실행 명령:

```bash
git push origin HEAD:refs/heads/publish/task15
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task15
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri --ref publish/task15 -f build_ref=33e6287e397b6aee47963ef5460e7d15ae67b904 -f run_tests=true
gh run view 31311633798 --repo postmelee/alhangeul-tauri --json event,headBranch,headSha,status,conclusion,url,jobs
gh run view 31311632841 --repo postmelee/alhangeul-tauri --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download 31311632841 --repo postmelee/alhangeul-tauri --name alhangeul-desktop-windows-x64 --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform windows-x64 --root <artifact-root> --verify-inventory <artifact-root>/alhangeul-artifact-inventory.json
```

독립 다운로드한 Windows artifact 결과:

| 종류 | 파일 | 크기 | SHA-256 |
|---|---|---:|---|
| MSI | `msi/Alhangeul_0.1.0_x64_en-US.msi` | 52,776,960 bytes | `7ab169f2529b3f1004123725e6a3463e64c0ceb3866cf82b4e597fd3fdc25dae` |
| NSIS | `nsis/Alhangeul_0.1.0_x64-setup.exe` | 48,458,416 bytes | `9d887a1d1029c339c11869f81253c16ca9ada1d1b396478387db4bbb06f8a581` |

- OK — 포함 inventory의 필수 종류 `msi`, `nsis`와 실제 크기·SHA-256 일치
- OK — exact candidate SHA의 CI, Windows/Linux native matrix와 Windows installer smoke 성공
- 보류 — 실제 Windows WebView2 system print dialog 직접 진입과 page content는 GUI 수동 결과가 필요하다.
- 보류 — Linux WebKitGTK system print dialog·한글 page content는 실제 Linux GUI 검증 전까지 미확정이다.

## Windows 수동 검증

1. 위 Windows artifact ZIP을 내려받아 압축을 푼다.
2. 빠른 확인은 `nsis/Alhangeul_0.1.0_x64-setup.exe`를 설치해 진행한다. packaging 동등성까지 확인하려면 NSIS 제거 뒤 MSI도 같은 절차로 반복한다.
3. 단일 페이지와 다중 페이지 HWP/HWPX를 각각 연다.
4. `파일 > 인쇄`를 누른다.
5. 별도 Alhangeul 인쇄 preview 창이 나타나지 않고 Windows system print dialog가 직접 열리는지 확인한다.
6. system preview의 쪽 수·세로/가로 방향·한글·표·이미지가 문서와 일치하고 메뉴·리본·상태 표시줄이 포함되지 않는지 확인한다.
7. 한 번은 취소하고 다시 인쇄해 dialog가 반복해서 열리는지 확인한다.
8. Microsoft Print to PDF로 저장해 출력 PDF의 쪽 수·내용을 확인한다.
9. `파일 > PDF로 저장`도 실행해 기존 searchable direct PDF가 유지되는지 확인한다.

## 잔여 위험

- installer smoke는 설치·실행·제거를 확인하지만 WebView2 system print dialog와 숨은 iframe의 실제 page surface를 자동 검증하지 않는다.
- Linux native bundle은 성공했지만 GUI 인쇄는 아직 수동 검증되지 않았다.
- Task #13 merge 전에는 Task #15 PR·merge·close를 진행하지 않는다.

## 다음 단계 영향

- Windows 수동 결과가 성공하면 Task #15의 Windows direct-print 기능 gate를 확정한다.
- Windows system dialog가 열리지 않거나 빈/잘못된 문서가 표시되면 이 candidate를 최종 후보로 재사용하지 않고 같은 Stage 2.x에서 hidden surface lifecycle을 측정·보정한다.
- Linux GUI 결과는 별도 실제 환경에서 확인할 때까지 release 기록에 미검증으로 유지한다.

## 승인 요청

- 위 exact Windows x64 artifact에서 직접 system print dialog와 page content를 수동 검증하고 결과를 알려주면 다음 판정을 이어간다.
