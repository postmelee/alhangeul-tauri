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

## Stage 6.7 — PR 리뷰 보정과 후속 책임 분리

PR #18의 maintainer review를 다시 코드와 exact 이력에 대조했다. Task #9의
`check-release-metadata.mjs`와 Task #13 guard는 실제로 충돌하지만 리뷰에 언급된
`6e0adc9`에는 Linux `desktopTemplate` 검사가 없고 이후 Task #9 commit에서 추가됐다.
따라서 Task #13이 현재 HWP/HWPX·font resource metadata의 canonical guard를 소유하고,
Task #9는 #13 merge 뒤 rebase하여 Linux prerelease 검사를 같은 guard에 확장하는 것으로
소유권을 확정했다.

### 즉시 보정

- release metadata 반환 계약을 `fileAssociations`로 통일하고 CI/native workflow에 독립
  `check:release-metadata` step을 추가했다.
- README의 시스템 인쇄를 Issue #15 merge와 새 exact-SHA 수용 전 공개 후보 범위에서 제외했다.
- upstream HTML의 title, accessible name과 새 창 menu marker가 정확히 한 번 존재하지 않으면
  production build를 실패시키고 exact index marker test를 추가했다.
- PDF job을 OS 임시 경로에 staging하고 WebView window owner를 검증한다. 같은 target의 동시
  job을 거부하고 window 파괴 시 소유 job을 회수하며, 같은 WebView의 중복 export 요청은 하나로
  합친다.
- 최근 문서 단건 삭제를 native path store까지 전달하고 Rust·TypeScript test를 추가했다.
- Windows WebView2에서 문서 surface 밖의 Ctrl/Meta+wheel도 upstream scroll container로
  전달하는 40 LOC leaf adapter를 추가했다. upstream viewport zoom 구현은 복제하지 않는다.
- Studio handler 준비의 무한 대기를 15초 timeout으로 바꾸고 generic monospace의 Noto Sans KR
  선택이 고정폭 fidelity가 아닌 CJK coverage fallback임을 test와 공식 font 문서에 명시했다.

### 후속 Issue

- [#19](https://github.com/postmelee/alhangeul-tauri/issues/19) — PDF 내보내기의 immutable
  revision snapshot, stale-job TTL과 시작 시 회수.
- [#20](https://github.com/postmelee/alhangeul-tauri/issues/20) — dispatcher disposer,
  idempotent adapter lifecycle과 dead native/platform bridge 정리.
- [#21](https://github.com/postmelee/alhangeul-tauri/issues/21) — 1,168 LOC `state.rs`와
  487 LOC `commands.rs`의 기능 무변경 책임별 분리.

`state.rs`와 `commands.rs`는 기존 공개 command·session 경계를 흔들지 않기 위해 이번 보정에서
분리하지 않았다. 새 PDF lifecycle은 244 LOC 전용 `pdf_jobs.rs`, Windows wheel 보정은 40 LOC
전용 adapter에 두어 추가 비대화를 피했다.

### 플랫폼 중립 검증

- OK — product boundary 179 files, product version/release metadata `0.1.0`, rhwp `v0.8.2` pin.
- OK — automation 71/71, upstream 35/35, Studio 19 files·78/78.
- OK — exact upstream production build 211 modules와 `git diff --check`.
- 참고 — Rust unit 86개는 source 진단으로 통과했지만 지원 대상 밖 host 결과를 native 수용
  근거로 사용하지 않는다.

보정 source commit을 `publish/task13`에 fast-forward한 뒤 CI와 Windows/Linux native workflow를
새 exact SHA로 다시 실행한다. 기존 `63a2703...` artifact는 Stage 6.7 수용 근거로 재사용하지 않는다.

## Stage 6.8 — Windows CI 테스트 환경 계약 보정

Stage 6.7 exact workflow에서 Windows `Test studio host`만 실패했다. 네 개의 실패는 모두
`installWindowsWheelZoomReroute()`가 테스트용 `document.addEventListener`를 호출한 지점에서
같은 `TypeError`로 발생했다. macOS와 Linux test host에서는 platform detection이 해당 leaf
adapter를 실행하지 않아 숨겨졌고, 실제 Windows WebView가 아니라 테스트 double의 DOM 계약이
부족한 것이 원인이었다.

### 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/core/desktop-events.test.ts` | 테스트 `document`에 EventTarget 계약을 보충하고 모든 host에서 Windows wheel 등록 경로를 실행한다. |
| `mydocs/plans/task_m010_13_impl.md` | Stage 6.8 원인·범위·exact 재검증 계획을 기록한다. |
| `mydocs/orders/20260812.md` | Stage 6.8 보정과 exact workflow 대기 상태를 기록한다. |
| `mydocs/working/task_m010_13_stage6.md` | Windows CI 실패 원인, 최소 보정과 검증 결과를 기록한다. |

### 본문 변경 정도 / 본문 무손실 여부

production TypeScript, Rust, upstream bundle, 저장·PDF·인쇄·wheel 동작은 변경하지 않았다.
테스트 double만 실제 `Document`가 제공하는 listener 계약에 맞췄으며, Windows 분기를 모든
개발 host에서 실행하도록 회귀 검출 범위를 강화했다.

### 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run \
  src/core/desktop-events.test.ts src/core/windows-wheel-zoom.test.ts
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

결과:

- OK — focused Windows wheel·desktop event 7/7.
- OK — product boundary 179 files, version·release metadata `0.1.0`, rhwp `v0.8.2` pin.
- OK — automation 71/71, upstream 35/35, Studio 19 files·78/78.
- OK — production Studio build 211 modules와 `git diff --check`.
- PENDING — 보정 commit의 새 exact SHA로 CI와 Windows/Linux native workflow를 재실행한다.

### 잔여 위험

- 새 exact workflow가 완료되기 전 Windows bundle 수용은 미확정이다.
- Linux x64 Stage 6.7 build는 진행 중이더라도 실패한 Windows job과 같은 run이므로 최종
  수용 근거로 사용하지 않는다.

### 다음 단계 영향

- Stage 6.8 commit을 `publish/task13`에 fast-forward하고 exact workflow가 통과하면 PR #18에
  실패 원인·보정·새 검증 결과를 추가한다.

## 다음 단계 영향

- Stage 6.7 보정 commit을 기존 `publish/task13`과 PR #18에 갱신하고 새 exact Windows/Linux
  workflow 결과를 PR review 대응에 기록한다.
- Task #13 merge 뒤 Task #15를 새 `devel`에 정렬하고 exact Windows/Linux workflow를
  다시 실행한다.
- Task #15까지 merge·수용된 뒤에만 Task #9 prerelease 후보를 재생성한다.

## 승인 요청

- Task #13의 upstream-first·HWP/HWPX·직접 PDF·package 수용과 `file:print`의 Task #15
  분리 판정을 승인하면 Task #13 최종 보고서와 PR 게시 단계로 진행한다.
