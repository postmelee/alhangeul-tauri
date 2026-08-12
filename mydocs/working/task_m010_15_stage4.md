# Task #15 Stage 4 완료 보고서 — exact-SHA Windows/Linux 인쇄 후보 handoff

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 4

## 단계 목적

Stage 3 구현 commit을 exact SHA로 고정해 Windows/Linux 네이티브 bundle을 만들고, 자동 CI·artifact inventory·Windows installer smoke를 통과한 Windows x64 MSI·NSIS를 작업지시자가 수동 인쇄 검증할 수 있는 상태로 준비했다.

이 보고서는 다운로드 후보 준비까지만 확정한다. 전용 페이지 SVG preview, system print dialog와 실제 출력물의 수동 성공은 아직 판정하지 않으며 Issue #15도 완료 처리하지 않는다.

## exact 후보

| 항목 | 값 |
|---|---|
| source branch | `publish/task15` |
| candidate SHA | `299c3face6df0a10a71349a34560826053a61107` |
| base 경계 | 미merge Task #13 exact SHA `63a2703cebf3a79d11a010974203fdaf4ccd3e76` 포함 |
| CI | [Alhangeul CI #31258278549](https://github.com/postmelee/alhangeul-tauri/actions/runs/31258278549) — success |
| native bundle | [Desktop Artifact Build #31258279496](https://github.com/postmelee/alhangeul-tauri/actions/runs/31258279496) — success |
| Windows 다운로드 | [`alhangeul-desktop-windows-x64`](https://github.com/postmelee/alhangeul-tauri/actions/runs/31258279496/artifacts/9022168709) |
| artifact 만료 | 2026-08-22 22:07 KST (`2026-08-22T13:07:26Z`) |

CI와 native workflow 모두 `workflow_dispatch`, `publish/task15`, 위 candidate SHA를 가리키는지 API 결과로 확인했다. release tag·서명·updater·package repository 게시는 수행하지 않았다.

## 자동 검증 결과

### CI

- OK — product boundary, version, rhwp pin, automation, upstream, Studio test/build
- OK — Windows/Linux 지원 코드의 desktop Rust test와 Clippy
- OK — `Unit tests` job success

### 네이티브 매트릭스

| Job | 결과 | 주요 gate |
|---|---|---|
| Build windows-x64 | success, 14m10s | exact commit, 공통 test, Tauri MSI·NSIS build, inventory 검증, artifact upload |
| Build linux-x64 | success, 15m21s | exact commit, 공통 test, Tauri bundle build, inventory 검증, artifact upload |
| Build linux-arm64 | success, 7m39s | exact commit, 공통 test, Tauri bundle build, inventory 검증, artifact upload |
| Smoke Windows x64 installers | success, 45s | Windows artifact 다운로드, MSI·NSIS 설치·실행 smoke, diagnostics upload |

업로드된 artifact:

| 이름 | GitHub archive size | 만료 |
|---|---:|---|
| `alhangeul-desktop-windows-x64` | 101,006,715 bytes | 2026-08-22 |
| `alhangeul-desktop-linux-x64` | 501,349,685 bytes | 2026-08-22 |
| `alhangeul-desktop-linux-arm64` | 163,889,806 bytes | 2026-08-22 |
| `alhangeul-desktop-windows-x64-installer-smoke` | 31,091 bytes | 2026-08-22 |

## Windows artifact 독립 확인

GitHub artifact를 임시 디렉터리에 내려받은 뒤 다음 명령으로 포함 inventory와 실제 파일을 대조했다.

```bash
pnpm run check:desktop-artifacts -- \
  --platform windows-x64 \
  --root <downloaded-artifact-root> \
  --verify-inventory <downloaded-artifact-root>/alhangeul-artifact-inventory.json
```

결과:

| 종류 | 파일 | 크기 | SHA-256 |
|---|---|---:|---|
| MSI | `msi/Alhangeul_0.1.0_x64_en-US.msi` | 52,772,864 bytes | `5d3374f5c156ca05f5a733c437bc88822ffddb45ee5150a180abbf0237298036` |
| NSIS | `nsis/Alhangeul_0.1.0_x64-setup.exe` | 48,463,111 bytes | `36345f856ad0eae88af99ea196e2c7f979efe54e50a9e25de38fcbbd594314a7` |

필수 종류 `msi`, `nsis`가 모두 존재하고 실제 크기·SHA-256이 `alhangeul-artifact-inventory.json`과 일치했다.

## Windows 수동 검증 handoff

1. Windows artifact를 내려받고 ZIP을 해제한다.
2. 빠른 기능 확인은 `nsis/Alhangeul_0.1.0_x64-setup.exe`로 진행한다. 패키징 동등성 gate에는 NSIS 제거 후 MSI도 별도로 설치해 같은 절차를 반복한다.
3. 단일·다중 페이지 및 가능하면 세로·가로 HWP/HWPX를 연다.
4. `파일 > 인쇄`를 누른다.
5. editor 전체를 인쇄한 system dialog가 바로 열리지 않고, 문서 쪽만 조립된 upstream 전용 인쇄 preview가 먼저 열리는지 확인한다.
6. preview의 쪽 수·방향·한글 본문·이미지·표가 editor와 맞는지 확인한다.
7. preview 안의 인쇄 동작으로 system dialog를 열고 `Microsoft Print to PDF`로 저장해 결과 쪽 수와 본문을 확인한다.
8. preview를 닫은 뒤 같은 문서를 다시 인쇄하고 다른 문서로도 반복해 빈 화면·이전 문서 잔존·창 재사용 오류가 없는지 확인한다.
9. 회귀 확인으로 `파일 > PDF로 저장`도 한 번 실행해 기존 searchable PDF 직접 저장이 유지되는지 확인한다.

## 잔여 위험과 다음 판정

- 자동 workflow는 설치·실행과 정적 artifact 정합성을 보증하지만 WebView2 popup, opener/same-origin, CSP, preview 렌더와 system print dialog의 GUI 결과는 보증하지 않는다.
- Windows에서 preview가 열리지 않거나 빈 화면이면 현재 artifact를 최종 후보로 사용하지 않고 구현계획서의 조건부 Stage 2.x `on_new_window` 보정으로 돌아간다.
- 수동 검증이 성공하면 Task #13 merge 상태를 확인한 뒤 #15 최종 보고·PR 순서를 판단한다. #13 merge 전에는 #15 PR·merge·close를 진행하지 않는다.

## 승인 경계

작업지시자의 연속 진행 승인에 따라 Issue 등록부터 이 다운로드 후보 준비까지 완료했다. 다음 작업은 작업지시자의 Windows 수동 검증 결과를 받아 success 또는 Stage 2.x 보정 필요로 판정하는 것이다.
