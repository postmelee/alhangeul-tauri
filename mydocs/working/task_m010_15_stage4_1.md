# Task #15 Stage 4.1 완료 보고서 — popup 보정 exact-SHA Windows/Linux 후보 handoff

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 4.1

## 단계 목적

Windows에서 popup 차단이 확인된 이전 candidate `299c3face6df0a10a71349a34560826053a61107`을 폐기하고, Stage 2.1 제한적 Tauri print popup host를 포함한 새 exact SHA로 CI·Windows/Linux native bundle·Windows installer smoke를 다시 수행했다. 작업지시자가 같은 Windows 환경에서 popup 차단 해소와 upstream 전용 page SVG preview를 수동 검증할 수 있는 MSI·NSIS 후보를 제공한다.

## exact 후보

| 항목 | 값 |
|---|---|
| source branch | `publish/task15` |
| candidate SHA | `b7a09123479b92ba7140f432185bf8b1edd7e8bb` |
| base 경계 | 미merge Task #13 exact SHA `63a2703cebf3a79d11a010974203fdaf4ccd3e76` 포함 |
| CI | [Alhangeul CI #31290629500](https://github.com/postmelee/alhangeul-tauri/actions/runs/31290629500) — success |
| native bundle | [Desktop Artifact Build #31290631506](https://github.com/postmelee/alhangeul-tauri/actions/runs/31290631506) — success |
| Windows 다운로드 | [`alhangeul-desktop-windows-x64`](https://github.com/postmelee/alhangeul-tauri/actions/runs/31290631506/artifacts/9031332644) |
| artifact 만료 | 2026-08-23 11:43 KST (`2026-08-23T02:43:29Z`) |

두 workflow 모두 `workflow_dispatch`, `publish/task15`, 위 candidate SHA를 가리키는지 API 결과로 확인했다. release tag·서명·updater·package repository 게시는 수행하지 않았다.

## 산출물

| 산출물 | 결과 |
|---|---|
| CI Unit tests | success, 3m28s — 공통 gate, desktop Rust unit test, Clippy 포함 |
| Build windows-x64 | success, 8m42s — MSI·NSIS build, inventory 검증·upload |
| Build linux-x64 | success, 11m49s — 지원 bundle build, inventory 검증·upload |
| Build linux-arm64 | success, 3m55s — 지원 bundle build, inventory 검증·upload |
| Smoke Windows x64 installers | success, 48s — MSI·NSIS 설치·실행·제거 및 진단 artifact |

업로드 artifact:

| 이름 | GitHub archive size | 만료 |
|---|---:|---|
| `alhangeul-desktop-windows-x64` | 101,025,655 bytes | 2026-08-23 |
| `alhangeul-desktop-linux-x64` | 501,435,247 bytes | 2026-08-23 |
| `alhangeul-desktop-linux-arm64` | 163,935,131 bytes | 2026-08-23 |
| `alhangeul-desktop-windows-x64-installer-smoke` | 31,163 bytes | 2026-08-23 |

## 본문 변경 정도 / 본문 무손실 여부

Stage 2.1 source commit 이후 코드 변경 없이 exact workflow와 artifact 검증만 수행했다. upstream preview content, direct PDF, HWP/HWPX 저장 데이터에는 추가 변경이 없다.

## 검증 결과

Windows artifact를 독립 임시 디렉터리에 내려받은 뒤 다음 명령으로 포함 inventory와 실제 파일을 대조했다.

```bash
pnpm run check:desktop-artifacts -- \
  --platform windows-x64 \
  --root <downloaded-artifact-root> \
  --verify-inventory <downloaded-artifact-root>/alhangeul-artifact-inventory.json
```

결과:

| 종류 | 파일 | 크기 | SHA-256 |
|---|---|---:|---|
| MSI | `msi/Alhangeul_0.1.0_x64_en-US.msi` | 52,785,152 bytes | `53b19537fb4560198e4b34462601fb99ef2d318e70b3916429fa17b34aeb31e5` |
| NSIS | `nsis/Alhangeul_0.1.0_x64-setup.exe` | 48,472,304 bytes | `3c0e2487c00a376ef5c7504004e32775e0139337755f1fbbf5abb78e9bc2448e` |

- OK — 필수 종류 `msi`, `nsis` 존재
- OK — 실제 크기·SHA-256과 `alhangeul-artifact-inventory.json` 일치
- OK — exact candidate SHA의 CI, Windows/Linux native matrix, Windows installer smoke 성공
- 보류 — 실제 WebView2 `window.open()` 반환, preview DOM 접근과 system print dialog는 Windows GUI 수동 결과가 필요하다.

## Windows 수동 재검증

1. 이전 0.1.0 후보가 설치돼 있으면 제거하고 새 artifact ZIP을 해제한다.
2. 빠른 확인은 `nsis/Alhangeul_0.1.0_x64-setup.exe`를 설치해 진행한다. packaging 동등성 확인이 필요하면 NSIS 제거 뒤 MSI도 같은 절차로 반복한다.
3. 이전에 popup 차단을 재현한 HWP/HWPX를 연다.
4. `파일 > 인쇄`를 누른다.
5. “인쇄 미리보기 팝업이 차단되었습니다” 안내가 나오지 않고 별도 Alhangeul preview 창이 열리는지 확인한다.
6. preview에 문서 page surface만 표시되고 쪽 수·방향·한글·표·이미지가 맞는지 확인한다.
7. preview의 인쇄 버튼을 눌러 Windows system print dialog가 열리는지 확인한다.
8. preview를 닫고 같은 문서와 다른 문서에서 다시 인쇄해 빈 화면·이전 문서 잔존·창 재사용 오류가 없는지 확인한다.
9. `파일 > PDF로 저장`도 한 번 실행해 searchable direct PDF가 유지되는지 확인한다.

## 잔여 위험

- installer smoke는 설치·실행을 확인하지만 popup/opener와 실제 인쇄 GUI를 자동화하지 않는다.
- 이 후보에서 popup은 열리지만 browser/WebView2 system print preview가 반복된다면, Tauri popup 차단 보정과 구분해 별도 upstream/browser 환경 이슈의 측정 결과로 처리한다.
- Task #13 merge 전에는 Task #15 PR·merge·close를 진행하지 않는다.

## 다음 단계 영향

- Windows 수동 결과가 성공하면 Task #15의 기능 gate를 확정하고 Task #13 의존 상태에 맞춰 최종 보고·PR 순서를 판단한다.
- popup 차단이 반복되면 새 후보를 최종 후보로 사용하지 않고 `on_new_window` runtime URL·opener 측정으로 Stage 2.2를 연다.

## 승인 요청

- 새 Windows x64 artifact에서 위 수동 재검증을 진행하고 popup 차단 해소 여부를 알려주면 다음 판정을 이어간다.
