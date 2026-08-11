# Task #13 Stage 6 보고서 — Windows/Linux native 수용과 Task #15 의존 분리

GitHub Issue: [#13](https://github.com/postmelee/alhangeul-tauri/issues/13)
구현계획서: [`task_m010_13_impl.md`](../plans/task_m010_13_impl.md)
Stage: 6

## 단계 목적

upstream-first Studio shell과 Tauri native HWP/HWPX 저장·직접 PDF adapter를 exact SHA의
Windows/Linux bundle로 수용한다. CI, artifact inventory, installer smoke와 수동 GUI
결과를 하나로 묶고, Task #13에서 발견됐지만 저장·PDF와 독립적인 실제 인쇄 결함을
후속 Task #15로 분리한 뒤 Task #9 prerelease handoff 조건을 확정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_13_impl.md` | exact Stage 6 결과와 Task #13 PR Go·Task #9 handoff No-Go 판정을 기록한다. |
| `docs/operations/DESKTOP_RELEASE.md` | Task #13 exact run과 Task #15 병합 뒤 새 exact 검증이 필요한 release gate를 추가한다. |
| `mydocs/orders/20260812.md` | Stage 6 보고 완료와 최종 보고·PR 승인 대기 상태를 기록한다. |
| `mydocs/working/task_m010_13_stage6.md` | workflow, artifact, GUI, 분리 이슈와 잔여 위험을 기록한다. |

## exact 후보

| 항목 | 값 |
|---|---|
| source branch | `publish/task13` |
| candidate SHA | `63a2703cebf3a79d11a010974203fdaf4ccd3e76` |
| source commit | `Task #13 [Stage 6.6]: 번들 한글 fallback과 searchable PDF 판정 보정` |
| CI | [#31255124269](https://github.com/postmelee/alhangeul-tauri/actions/runs/31255124269) — success |
| native bundle | [#31255131950](https://github.com/postmelee/alhangeul-tauri/actions/runs/31255131950) — success |
| artifact retention | 2026-08-22까지, 확인 시 `expired: false` |

release tag, GitHub Release, 서명, updater, package repository 게시는 수행하지 않았다.

## artifact와 package 결과

| Platform | 종류 | 크기 | SHA-256 |
|---|---|---:|---|
| Windows x64 | MSI | 52,776,960 bytes | `b0a08cce407dc9dacfd9487539cc18dfeaa131d759e9d84abf6c48286c1262dd` |
| Windows x64 | NSIS | 48,464,261 bytes | `a2bd344c4ec7eefeea2101060b89fee9e2387883571c86c44f07b7a08e4945c8` |
| Linux x64 | AppImage | 131,127,800 bytes | `deb857927b663988ba29ce887cd7659d9a3812edf68b83381fad15d70ad6ada2` |
| Linux x64 | DEB | 54,712,902 bytes | `ba445ea96e918cde84414be6a355ea8b91f813c37fabc259bb8d875beb5dae1a` |
| Linux x64 | RPM | 54,713,638 bytes | `92963f980040a7081e1409eed5eb22f7f598b7713984f3c2af6e7cd9d6193f47` |
| Linux arm64 | DEB | 54,668,188 bytes | `5bb4e83e806441df041502396953a126928fc3f4ef1141a0792c0f1ae7b63688` |

Actions artifact:

| 이름 | ID | archive 크기 | archive SHA-256 |
|---|---:|---:|---|
| `alhangeul-desktop-windows-x64` | `9021246299` | 101,012,149 bytes | `5225fd0b4dfca64d6809e577923b640447d4ced8c6910aca14b6a2b20d68d8ea` |
| `alhangeul-desktop-linux-x64` | `9021272811` | 501,371,426 bytes | `18285bf340d22b32247548950ee2faa396c3ee0ca81a7b86274fd0c4e5949cd1` |
| `alhangeul-desktop-linux-arm64` | `9021216018` | 163,892,532 bytes | `f70f970e00b4f5e31eb4d4f35b2b64dffa39466d6dc29e65e9c91e71d411d51a` |
| `alhangeul-desktop-windows-x64-installer-smoke` | `9021284510` | 31,254 bytes | `c61075c30243ebad55dcf13292a501b0519031709a52e0af4dc3c4b364ec4bb4` |

세 platform artifact를 2026-08-12에 다시 내려받아 동봉 inventory를 독립 검증했고 모든
파일 크기·SHA-256이 일치했다. Windows smoke summary는 MSI·NSIS 설치, 0.1.0 version,
HWP/HWPX handler·Open With, shortcut, 기존 기본 연결 보존, 5초 제한 실행, 제거,
외부 fixture 무손실과 최종 clean state를 모두 `passed`로 기록했다.

## GUI 수용과 범위 분리

| 항목 | 판정 | 증거·제한 |
|---|---|---|
| upstream Studio shell | Go | upstream 메뉴·리본, 초기 문서 중앙 위치와 상황별 toolbar/CSP 초기 숨김 보정을 Windows에서 확인했다. |
| HWP/HWPX native 저장 | Go | source format 저장, 다른 이름과 HWP/HWPX 명시 저장, 재열기와 절대 기본 경로 보정을 exact 후보 연속 검증에서 확인했다. Stage 6.6은 save pipeline을 변경하지 않았다. |
| 직접 PDF 저장 | Go | 최소 Linux와 Windows VDI에서 성공했다. Windows Edge에서 한글 검색·선택·복사를 확인했고 bundle fallback·license·searchable audit test를 exact CI가 통과했다. |
| drag-in·문서 lifecycle | Go | drag-in 중앙 열기와 기존 native open/session 연동을 Windows에서 확인했다. |
| Windows/Linux package | Go | exact build·inventory와 Windows MSI·NSIS fresh installer smoke가 모두 통과했다. Linux arm64는 build·inventory만 주장한다. |
| `file:print` 실제 인쇄 | Task #13 범위에서 No-Go | exact 후보가 editor WebView의 빈 한 쪽을 인쇄했다. 저장·직접 PDF와 독립된 결함으로 Issue #15에 이관했다. |
| Task #9 prerelease handoff | No-Go | Task #13과 #15 병합 뒤 두 변경을 포함한 새 exact Windows/Linux gate가 필요하다. |

Issue #15는 Task #13 exact SHA에서 분기해 upstream page SVG 전용 인쇄 surface를 구현했고,
후속 exact 후보에서 Windows/Linux 인쇄 gate를 통과했다. 그러나 아직 두 Issue 모두 open이고
PR이 없으므로 Task #13 보고서는 후속 결과를 merge된 제품 상태로 간주하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 6.6 source SHA 이후 제품 코드, upstream submodule, font binary, save/PDF pipeline과
artifact는 변경하지 않았다. 수행계획서와 기존 release 문서의 역사적 증거는 보존하고,
exact 수용 결과와 Task #15 의존 gate만 추가했다. 원격 `publish/task13`은 candidate SHA
`63a2703cebf3a79d11a010974203fdaf4ccd3e76`에 유지한다.

## 검증 결과

실행 명령:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run check:release-metadata
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
gh run view 31255124269 --repo postmelee/alhangeul-tauri --json headSha,conclusion,jobs
gh run view 31255131950 --repo postmelee/alhangeul-tauri --json headSha,conclusion,jobs
gh run download 31255131950 --repo postmelee/alhangeul-tauri --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform <platform> \
  --root <artifact-root> --verify-inventory <inventory-path>
```

결과:

- OK — product boundary 176 files, violation 0; version·release metadata `0.1.0` 일치.
- OK — rhwp Stable `v0.8.2`, resolved commit
  `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개 일치.
- OK — automation 71/71, upstream 35/35, Studio 73/73 test 통과.
- OK — exact upstream production build 210 modules 완료. CanvasKit browser externalization,
  ineffective dynamic import와 500kB chunk 경고는 실패가 아니다.
- OK — exact CI의 desktop Rust test와 Clippy, Windows/Linux native build와 inventory 통과.
- OK — 다운로드한 Windows x64·Linux x64·Linux arm64 inventory 독립 재검증 통과.
- OK — Windows MSI·NSIS installer smoke의 install·launch·uninstall·post-clean 통과.
- MISS — Task #13 exact `file:print`는 문서 page surface를 인쇄하지 못했다. Issue #15로
  분리했으며 Task #9 handoff를 막는 명시적 dependency로 유지한다.

## 잔여 위험

- Task #15가 아직 merge되지 않아 `devel`에는 실제 인쇄 보정이 없다.
- Task #13 final report commit과 PR head는 문서 commit 때문에 `63a2703...`와 달라진다.
  제품 수용 candidate SHA와 PR 문서 head를 혼동하지 않는다.
- Linux arm64는 GUI 실행 없이 build·inventory만 검증했다.
- AppImage·RPM은 bundle/inventory와 이전 Linux exact 실행 경계가 있으나 Stage 6.6 GUI의
  주 수용 경로는 Windows installer와 Linux x64였다.
- 공개 prerelease, release tag, 서명, updater와 package repository 게시는 미수행이다.

## 다음 단계 영향

- Stage 6 승인 뒤 Task #13 최종 보고서를 작성하고 `publish/task13`을 갱신해 `devel` 대상
  PR을 만든다.
- Task #13 merge 뒤 Task #15를 새 `devel`에 정렬하고 exact Windows/Linux workflow를
  다시 실행한다.
- Task #15까지 merge·수용된 뒤에만 Task #9 prerelease 후보를 재생성한다.

## 승인 요청

- Task #13의 upstream-first·HWP/HWPX·직접 PDF·package 수용과 `file:print`의 Task #15
  분리 판정을 승인하면 Task #13 최종 보고서와 PR 게시 단계로 진행한다.
