# Task #20 Stage 4.6 완료보고서 — PR 리뷰 후 인쇄·teardown 복구 경계 보정

GitHub Issue: [#20](https://github.com/postmelee/alhangeul-tauri/issues/20)
구현계획서: [`task_m010_20_impl.md`](../plans/task_m010_20_impl.md)
Stage: 4.6

## 단계 목적

[PR #51 review 5077569953](https://github.com/postmelee/alhangeul-tauri/pull/51#pullrequestreview-5077569953)의
지적을 독립 검토한 뒤, 재현 가능한 동작 위험인 Linux native print 무기한 대기, parent 없는 GTK
dialog, stale print class와 production teardown 미도달을 보정한다. Windows `window.print()` 실제 출력이
아직 수용되지 않았다는 한계를 명시하고, 보정한 제품 source를 새 exact SHA에서 Windows/Linux native와
Linux GUI 전체로 다시 수용하는 것이 완료 기준이다.

작업지시자는 2026-09-02 같은 스레드에서 이 correction 진행을 승인했다. 격리 worktree의
`local/task20`만 사용했고, 승인된 계획 commit `fbf623e51531b7884d38ac418e6a11a6767ad4f0` 뒤 제품
source commit `26794ce52b32f637c79c470693c1d3ed257363e4`를 수용 source로 고정했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/src/system_print.rs` | 사용자가 `Print`를 선택한 뒤에만 5분 completion watchdog을 시작하고, 정상 finish·cancel·오류·timeout이 하나의 `PrintState`를 settle하도록 했다. 정상 완료 시 timer를 제거하고 timeout 시 keepalive를 해제한다. Tauri `gtk_window()`를 GTK print dialog parent로 전달한다. |
| `apps/studio-host/src/core/page-lifecycle.ts` | `pagehide`에 일회성 cleanup을 연결하고 명시 cleanup 시 listener를 제거하는 19줄 leaf helper를 추가했다. |
| `apps/studio-host/src/command/dispatcher.ts`, `dispatcher.test.ts` | active desktop registration의 기존 idempotent disposer를 `pagehide`에서도 호출한다. production navigation 경로와 중복 dispose를 focused test로 고정했다. |
| `apps/studio-host/src/embed/desktop-runtime.ts`, `desktop-runtime.test.ts` | embed runtime registration도 `pagehide`에서 upstream uninstaller와 waiter를 회수한다. 반환 disposer와 replacement 동작은 유지한다. |
| `apps/studio-host/src/command/direct-print.ts`, `direct-print.test*` | 새 surface를 만들기 전에 stale container와 제품 전용 `alhangeul-print-active` class를 함께 제거하고, 현재 job disposer도 class를 항상 회수한다. |
| `apps/studio-host/src/core/upstream-boundary.test.ts` | 예전 keepalive 지역 변수명이 아니라 shared state 해제, bounded watchdog과 parent dialog라는 새 native 불변식을 확인한다. |
| `mydocs/plans/task_m010_20_impl.md`, `mydocs/orders/20260902.md`, 본 보고서 | 승인 범위, 작업일 상태와 새 exact-SHA 수용 결과를 기록한다. |

제품 source는 10개 파일, 218 insertions, 59 deletions다. source를 먼저 게시해야 원격 native·GUI
증적을 만들 수 있으므로 제품 source와 본 완료보고서는 서로 다른 commit이다. 본 보고서 commit은 이미
검증한 `26794ce`의 제품 source를 바꾸지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

upstream renderer·save·document data와 `third_party/rhwp`는 수정하지 않았다. stable tag `v0.8.4`,
resolved commit `496333b27d21ddb9114ba9ae340bcb895870c9a7`과 clean 상태를 확인했다.
인쇄 보정은 native dialog 수명과 임시 top-level surface cleanup에 한정하고 dirty/clean 상태를 변경하지
않는다. dispatcher·embed API, 명시 disposer와 replacement 계약도 유지한다. 신규 공식 제품 문서나
`mydocs/manual` 문서는 만들지 않았다.

## 검증 결과

### 플랫폼 중립 검증

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run src/command/direct-print.test.ts src/command/dispatcher.test.ts src/embed/desktop-runtime.test.ts src/core/upstream-boundary.test.ts
pnpm run test:studio
pnpm run test:automation
pnpm run test:upstream
pnpm run typecheck:gui
pnpm run check:product-boundary
pnpm run build:studio
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml -- --check
git diff --check
```

- OK — Stage 4.6 focused 38/38, Studio 23 files·125/125, automation 348/348, upstream 36/36.
- OK — GUI typecheck, `Product boundary check passed (322 files scanned)`.
- OK — Studio production build 228 modules. 기존 CanvasKit externalization·dynamic import·chunk-size
  메시지만 non-blocking warning으로 남았다.
- OK — Rust format과 `git diff --check`. 현재 macOS 호스트의 Rust desktop/Tauri build를 성공으로
  대체하지 않고 아래 Windows/Linux 원격 결과만 native 근거로 사용했다.

첫 focused 실행은 package script 뒤 인자가 Vitest file filter가 되지 않아 Studio 전체를 실행했고,
기존 source substring 계약 한 건이 변경된 keepalive 지역 변수명을 기대해 실패했다. 새 동작 불변식으로
계약을 최소 갱신한 뒤 Studio 전체 125/125와 올바른 focused 명령 38/38을 통과했다. 격리 worktree의
Vite temp 쓰기가 sandbox에서 거부된 첫 실행도 승인된 동일 명령으로 재실행했으며 제품 실패가 아니다.

### Windows/Linux native exact-SHA 수용

[native run 33583778583](https://github.com/postmelee/alhangeul-tauri/actions/runs/33583778583)은
2026-09-02에 source `26794ce52b32f637c79c470693c1d3ed257363e4`로 실행해 전체 성공했다.
Linux x64 21분 19초, Linux arm64 14분 5초, Windows x64 29분 51초, Windows installer smoke
2분 26초다.

- OK — Linux x64·arm64에서 새 watchdog·GTK parent 코드를 포함한 desktop Rust test와
  `-D warnings` Clippy, Tauri bundle이 성공했다.
- OK — Windows x64 desktop·thumbnail core/worker/handler test·Clippy, Tauri bundle과
  MSI·NSIS install/launch/uninstall·rollback·thumbnail 등록 복원·clean 상태가 성공했다.
- OK — Linux x64/arm64 thumbnail core, helper build·test·Clippy·ELF identity와 x64 DEB/RPM,
  arm64 DEB의 install/reinstall/update/injected rollback/uninstall이 성공했다.

| artifact | ID | API archive digest (`sha256:`) |
|---|---:|---|
| Windows x64 installer smoke | 9830026302 | `ab997357c21f775137081d48d246e5c0cca21bf2bafcc019bf7da456d520c5db` |
| Windows x64 desktop | 9829967248 | `d5be848cf414e491219674845c30a103dd4b327362cfd6cd2adc74e8e053225b` |
| Linux x64 desktop | 9829786353 | `5a73d4f5edd1a03be73c9dd8bc33321f16e37d020a070d1782b0a838d49b7362` |
| Linux x64 thumbnail package | 9829777703 | `95988848b0ef6ccc4a65ca61432bc4280c6c139921a7f01237127da80eec8d4a` |
| Linux arm64 desktop | 9829626977 | `28f8da6b72b58799c89489f1a1a84f0d346d73d8ded3e4e28a64d2cb287ef6da` |
| Linux arm64 thumbnail package | 9829624448 | `a6021a2cf7e180ac8b5a83b683256a4f3a39d16f56010c02685e162d87f7455a` |
| Windows x64 thumbnail core | 9829613870 | `cc16deae5d572c46c8d691d7cbb11c788f07d8d18dc074ef69a095f1de5b022e` |
| Linux x64 thumbnailer | 9829476966 | `b3cce62f39e5d6962ac67eceb920c7a16c68c8f14085a7105154b2d116bc4edb` |
| Linux arm64 thumbnailer | 9829454797 | `fb09c50ba3c95e815dda4dae99c75b6c2b1ede5602cc481dd80d6b73baa1d9c5` |
| Linux x64 thumbnail core | 9829438184 | `8970137f3fc049f98bb32b15c9dd736f66e75f5ccc0086d002338a236c7dc223` |
| Linux arm64 thumbnail core | 9829423112 | `32a4ccb5317fdb93e5786eddec06a5aea0b43ebc6954188af29c41addd9e209e` |

세 desktop artifact의 Windows 4개, Linux x64 22개, Linux arm64 18개 파일 size·SHA-256을
독립 검산했다. macOS 대소문자 비구분 파일시스템에서 Linux bundle의 `/usr/lib/Alhangeul`과
`/usr/lib/alhangeul`이 합쳐져 helper 경로의 대소문자만 달라졌고 모든 file hash는 일치했다. Linux
runner와 GUI handoff에서는 case-sensitive 원본 inventory 자체가 성공했다. helper 원본도 x64
21,103,448 bytes·ELF machine 62·SHA-256
`5773973c142b84412eb7a51491daf36babf38bf008a2c3dea1ea655ad6ba7af5`, arm64
19,830,920 bytes·machine 183·SHA-256
`554f85681cd6518738a310d15c3c67450af9b3e35305ca9e186c5b40b3c0d725`로 summary와 일치했다.

### Linux GUI·thumbnail manager·PDF 시각 검증

[GUI run 33585905913](https://github.com/postmelee/alhangeul-tauri/actions/runs/33585905913)은 같은
source와 native run `33583778583`을 입력으로 사용해 6분 20초에 성공했다. GUI artifact
`9830185840`의 API archive digest는
`9e352eda95c94ea29ee8e1432adb8fb7b38acfd44442d6fca5406dad58945577`다.

- OK — source/native/helper handoff, inventory, DEB install, installed thumbnail, manager와 GUI 등
  13개 step이 모두 success이고 nativePrint/WebDriver phase exit는 각각 0이다.
- OK — `biz-plan-hwp`, `form-hwpx`, `linux-native-save`, `linux-native-drag-in`,
  `linux-direct-pdf`, `linux-system-print` 여섯 scenario가 같은 exact source/native run으로 성공했다.
  scenario manifest 42개 참조·40개 고유 파일과 editor restore 참조의 size·SHA-256을 독립 검산했다.
- OK — production PID `9327`, X11 window `4194307`, geometry `(321,117,1280,900)`이 인쇄 전,
  GTK Print to File, Cancel, CUPS-PDF 뒤에 유지됐다. 네 checkpoint의 2개 연속 frame은 dark pixel
  9,385~9,411, ink row 59, baseline ink agreement 99.72~100%로 모두 success다.
- OK — direct PDF 287,282 bytes, GTK Print to File 2,651,506 bytes, CUPS-PDF 548,488 bytes.
  각각 6쪽 A4이며 추출 문자 수는 direct `[45,642,410,638,478,250]`, GTK/CUPS
  `[45,54,408,637,478,250]`이다. 원격 render 18쪽을 직접 확인해 빈 쪽·본문/표 잘림이 없다.
- OK — Nautilus와 Thunar first/cached/changed, direct·preview·failure fallback, 공개 HWP/HWPX와
  128·256·333·512·1024 edge 원본을 직접 확인했다.

다운로드한 원본 artifact, 검산 자료와 contact sheet는 재검토·재개용 로컬 경로
`/private/tmp/alhangeul-task20-stage4-6.rhfm31`에 보존했다. binary 증적은 저장소에 추가하지 않았다.

## 잔여 위험

- Windows x64는 새 source의 Rust/TypeScript test·bundle과 installer lifecycle까지 성공했지만,
  WebView2 top-level `window.print()`의 실제 printer/PDF 출력은 실행하지 않았다. Linux GUI 성공을
  Windows 출력 성공으로 확대하지 않으며 별도 Windows GUI/출력 수용 후보로 남긴다.
- 5분 watchdog은 Linux test·Clippy와 source contract로 고정했고 정상 `finished` 경로는 production
  GUI에서 통과했다. 실제 backend가 `finished`를 영구 누락하는 fault injection은 수행하지 않았다.
- GUI·PDF·thumbnail 시각 수용은 Ubuntu Xvfb, Nautilus·Thunar·CUPS-PDF와 고정 공개 fixture
  범위이며 임의 배포판·theme·실제 프린터·대용량 문서 전체를 보증하지 않는다.
- 리뷰의 dependency caret 결합, source substring test 구조 개편, `formatMm` 정리와 대용량 문서
  live DOM 성능은 이번 동작 correction과 분리해 후속 후보로 남긴다.
- release·서명·package repository 게시·updater 활성화·self-merge·Issue close는 수행하지 않았다.

## 다음 단계 영향

- Stage 4.6 보정 source와 exact-SHA native/GUI 재수용이 완료됐다. 기존 `bddbe88` 수용 결과를
  새 source에 승계하지 않았다.
- 다음 작업은 기존 최종 보고서와 PR #51 본문을 새 source/run·Windows 출력 한계로 갱신하고 리뷰
  응답을 게시하는 문서/PR review 단계다. 제품 source를 더 변경하지 않는다.

## 승인 요청

- Stage 4.6 산출물과 검증 결과를 승인하면 갱신된 PR #51에서 리뷰 재검토·merge 판단 단계로 진행한다.
  승인 전 self-merge나 Issue close는 수행하지 않는다.
