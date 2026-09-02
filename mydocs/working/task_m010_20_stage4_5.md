# Task #20 Stage 4.5 완료보고서 — Issue #17 통합과 exact-SHA 재수용

GitHub Issue: [#20](https://github.com/postmelee/alhangeul-tauri/issues/20)
구현계획서: [`task_m010_20_impl.md`](../plans/task_m010_20_impl.md)
Stage: 4.5

## 단계 목적

Stage 4.4에서 수용한 Task #20의 adapter lifecycle·system print·editor body restore 경계를
Issue #17이 병합된 최신 `devel`과 통합한다. 두 타스크의 workflow·패키지·GUI gate를 모두 보존한
새 merge exact SHA에서 Windows/Linux native와 Linux GUI 전체를 다시 수용하는 것이 승인된 완료
기준이었다.

통합 대상 `origin/devel`은 `8b865fa55b55aea232d0fb034a518c807ac4c003`, Task #20의 통합 전
계획 commit은 `bd819214b05ed604816afc32a61465ac1b7fc42d`이다. 일반 merge commit
`bddbe88797cc38b463302c5a47ca7d71b44444b1`을 새 수용 source로 고정했다. rebase·history
rewrite는 하지 않았고 격리 worktree의 `local/task20`만 사용했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-desktop.yml`, `.github/workflows/alhangeul-linux-gui.yml` | Issue #17의 Linux x64/arm64 thumbnail core·helper·package lifecycle·manager probe와 Task #20의 exact artifact handoff·system print·editor body gate를 함께 보존한다. |
| `apps/linux-thumbnailer/`, `apps/desktop/src-tauri/linux/alhangeul.thumbnailer`, `apps/desktop/src-tauri/tauri.conf.json` | `devel`에서 검증된 Linux thumbnail helper crate와 DEB/RPM registration·bundle resource를 통합한다. |
| `scripts/linux-thumbnail-*`, `scripts/build-linux-thumbnailer.mjs`, `scripts/verify-linux-thumbnail-package-evidence.mjs`, `scripts/verify-desktop-artifacts.mjs` | build·resource probe·package install/reinstall/update/rollback/uninstall·Nautilus/Thunar 수용과 artifact inventory 계약을 통합한다. |
| `tests/linux-thumbnail-*.test.mjs`, `tests/gui/linux/native-ui/thumbnail-files.test.mjs`, 공통 automation test | Issue #17의 source·workflow·package·manager 경계와 기존 Task #20 native print 경계를 함께 회귀 검증한다. |
| `docs/architecture/LINUX_THUMBNAILS.md`, `docs/architecture/UPSTREAM.md`, `docs/operations/DESKTOP_RELEASE.md`, 관련 README | Issue #17에서 이미 승인·병합된 공식 문서와 Task #20의 기존 수용 조건을 의미 손실 없이 통합한다. 신규 공식 문서는 만들지 않는다. |
| `mydocs/orders/20260830.md` | 유일한 add/add 충돌이다. 완료된 #17 행과 당시 진행 중이던 #20 역사 행을 모두 남겼다. |
| `mydocs/plans/task_m010_20_impl.md`, `mydocs/orders/20260901.md`, 본 보고서 | Stage 4.5 승인 범위, 수행 상태와 exact-SHA 재수용 결과를 기록한다. |

`bd81921..bddbe88`의 통합량은 50개 파일, 7,171 insertions, 28 deletions다. 자동 병합된 두
workflow, `UPSTREAM.md`, `DESKTOP_RELEASE.md`, `20260828.md`, `linux-gui-workflow.test.mjs`는
의미 단위로 확인해 어느 타스크의 gate도 빠지지 않았음을 확인했다.

수용 source를 먼저 게시·실행한 뒤 증적을 검토해야 하므로 source merge와 본 완료보고서는 서로
다른 commit이다. 본 보고서 commit은 이미 검증한 `bddbe88`의 제품 source를 바꾸지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

Task #20의 adapter lifecycle, registration identity, print cleanup, editor body restore source는
Stage 4.4 수용 상태를 유지했다. `third_party/rhwp`도 수정하지 않았으며 stable tag `v0.8.4`, resolved
commit `496333b27d21ddb9114ba9ae340bcb895870c9a7`과 clean 상태를 확인했다.

Issue #17의 Linux thumbnail source·패키지·문서 변경은 이미 `devel`에 병합된 내용을 그대로
통합했다. 충돌 해소를 이유로 제품 source나 공식 문서를 다시 작성하지 않았다. 공개 fixture의
본문과 binary artifact는 저장소에 추가하지 않았다.

## 검증 결과

### 플랫폼 중립 검증

실행 명령:

```bash
pnpm exec node --test tests/gui/linux/native-ui/xdotool.test.mjs tests/gui/linux/native-ui/atspi.test.mjs tests/gui/linux/native-ui/virtual-printer.test.mjs tests/gui/linux/native-ui/editor-frame.test.mjs tests/gui/linux/native-ui/thumbnail-files.test.mjs tests/gui/linux/native-print.test.mjs tests/gui-contracts.test.mjs tests/actions-workflows.test.mjs tests/desktop-artifacts.test.mjs tests/linux-gui-workflow.test.mjs tests/linux-thumbnail-build.test.mjs tests/linux-thumbnail-core-probe.test.mjs tests/linux-thumbnail-packaging.test.mjs tests/linux-thumbnail-registration.test.mjs tests/product-boundary.test.mjs
pnpm run typecheck:gui
pnpm run test:automation
pnpm run test:upstream
pnpm run check:product-boundary
pnpm run test:studio
pnpm run build:studio
git diff --check
```

- OK — Task #17/#20 focused contract 133/133, automation 348/348, upstream 36/36.
- OK — GUI typecheck, `Product boundary check passed (321 files scanned)`.
- OK — Studio `Test Files 23 passed (23)`, `Tests 122 passed (122)`.
- OK — Studio build `227 modules transformed`. 기존 CanvasKit externalization·dynamic import·chunk-size
  메시지만 non-blocking warning으로 남았다.
- OK — `git diff --check`, worktree와 submodule clean.

첫 `pnpm run test:studio`는 현재 격리 환경이 `node_modules/.vite-temp`에 쓰지 못한 `EPERM`으로
test 수집 전에 중단됐다. 같은 source와 명령을 승인된 권한에서 다시 실행해 122/122 통과했으며,
제품 실패로 분류하지 않는다. 현재 macOS 호스트에서 Rust desktop이나 Tauri build를 성공으로
대체하지 않았고 아래 Windows/Linux 원격 결과만 native 완료 근거로 사용한다.

### Windows/Linux native exact-SHA 수용

[native run 33495757127](https://github.com/postmelee/alhangeul-tauri/actions/runs/33495757127)은
2026-09-01에 source `bddbe88797cc38b463302c5a47ca7d71b44444b1`로 실행했다. Linux x64
34분 58초, Windows x64 40분 2초, Linux arm64 23분 56초, Windows installer smoke 1분 55초로
모두 성공했다.

- OK — Linux x64/arm64 thumbnail core probe, helper build·test·Clippy와 ELF identity 검증.
- OK — Linux x64 DEB/RPM, arm64 DEB의 install·same-version reinstall·update·injected failure
  rollback·uninstall. MIME 기본값·제3자 thumbnailer·cache sentinel 보존과 제품 파일 제거 확인.
- OK — Windows thumbnail core·worker·handler test/Clippy, desktop Rust test/Clippy와 Tauri bundle.
- OK — Windows MSI/NSIS install·launch·uninstall exit 0, thumbnail 등록·제거, 기존 기본 연결 복원,
  외부 fixture 보존과 제거 후 clean 상태. MSI rollback probe의 1603은 의도한 실패 주입 결과다.

| artifact | ID | API archive digest (`sha256:`) |
|---|---:|---|
| Windows x64 installer smoke | 9797031798 | `8900fc0c75ea600aaf02548111a90fae3fe7a3584ece1e135308a63c3fe7c88c` |
| Linux x64 desktop | 9796763525 | `9e993fe7a2b349b902a0f84a9c6f3bacf51a353f1b57cc650d562acab27361dc` |
| Linux x64 thumbnail package | 9796749695 | `739e195c4358c29961dd956ca472538f18d955c7143139e5b82947930ea61457` |
| Windows x64 desktop | 9796737845 | `2f6bf5235bb3a566728c851060de52ad1c87b8a9a6e4465763eec5396f518b10` |
| Linux arm64 desktop | 9796399027 | `877ce3f66f31bb272ed5cdd9fcbe5b49b2b910c1d28a9d5944faa5f756ce7cc2` |
| Linux arm64 thumbnail package | 9796395256 | `7ce1158701aa4838272b0334c1c96617d9d168d1052242f884b6d4f4d2187ffd` |
| Windows x64 thumbnail core | 9796137309 | `eeb8547180e4b02da3fd2d42e0427c38980c09ef31f018c853f395944d490707` |
| Linux x64 thumbnailer | 9795913190 | `5723f945c1a36dbca8f95157df6d35c5222d8a0b23d2e323d6dce0d990cd8f82` |
| Linux arm64 thumbnailer | 9795879530 | `f57ca8e315674fbc8e11a97327194c7a0e1faa81b5420594aa53caa9c80892ea` |
| Linux x64 thumbnail core | 9795799626 | `70c257a97cafe835de553cd54abf877ed0b11510c5d212fc1fb1f458d77c96f4` |
| Linux arm64 thumbnail core | 9795791721 | `d8be91f5d9db7dfbeb6e5bb9b28882cfedae1cb7be45835458e892e7518e8d41` |

위 digest는 GitHub API가 제공한 artifact archive digest다. 로컬에서는 내려받은 Windows 4개,
Linux x64 22개, Linux arm64 18개, 총 inventory 44개 파일의 실제 size·SHA-256을 독립 검산했다.
GUI에 전달된 Linux x64 inventory도 native artifact 원본과 byte-for-byte 동일했다. 모든 artifact는
exact run/source에 속하고 `expired=false`임을 확인했다.

Linux helper 원본도 직접 검산했다. x64는 target `x86_64-unknown-linux-gnu`, ELF machine 62,
21,103,448 bytes, SHA-256 `5773973c142b84412eb7a51491daf36babf38bf008a2c3dea1ea655ad6ba7af5`,
arm64는 target `aarch64-unknown-linux-gnu`, ELF machine 183, 19,830,920 bytes, SHA-256
`554f85681cd6518738a310d15c3c67450af9b3e35305ca9e186c5b40b3c0d725`로 summary와 일치했다.

### Linux GUI·thumbnail manager·PDF 시각 검증

[GUI run 33499398931](https://github.com/postmelee/alhangeul-tauri/actions/runs/33499398931)은 같은
source와 native run `33495757127`을 입력으로 사용해 6분 7초에 성공했다. GUI artifact
`9797253339`의 API archive digest는
`a90bffbefddfd30a16fc83a03420aa0b93f152f72d69fd59023a0785895aa1df`다.

- OK — source·native handoff·thumbnailer handoff/download/verify·inventory·install·installed
  thumbnail·manager·GUI의 13개 step outcome 모두 success, nativePrint/WebDriver phase exit 0.
- OK — `biz-plan-hwp`, `form-hwpx`, `linux-native-save`, `linux-native-drag-in`,
  `linux-direct-pdf`, `linux-system-print` 여섯 scenario 모두 success. manifest의 42개 참조와
  40개 고유 파일 size·SHA-256을 검산했다.
- OK — Nautilus와 Thunar의 first/cached/changed 화면에서 direct·preview·failure fallback과 공개
  HWP/HWPX 실사용 thumbnail을 직접 확인했다. 128·256·333·512·1024 edge PNG도 요구 크기와
  direct/preview 출력을 유지했다.
- OK — production process PID `9084`, X11 window `4194307`, geometry
  `(321,117,1280,900)`이 인쇄 전·GTK Print to File·Cancel·CUPS-PDF 뒤까지 동일했다. 네 checkpoint
  각각 첫 연속 두 frame이 성공했고 본문 dark pixel은 9,385~9,411개, ink row는 59개,
  baseline ink 일치율은 99.72~100%였다. 네 시점 원본 화면도 직접 확인했다.
- OK — direct PDF 287,282 bytes, GTK Print to File 2,651,506 bytes, CUPS-PDF 548,488 bytes.
  각각 6쪽 A4이며 한글 표제·본문·표·페이지 구분을 유지한다. Poppler로 별도 재렌더링한 18쪽을
  모두 직접 확인해 빈 쪽·본문/표 잘림이 없었다.
- OK — 페이지별 공백 제외 추출 문자 수는 direct `[45,642,410,638,478,250]`, GTK/CUPS
  `[45,54,408,637,478,250]`이며 원격 분석과 일치했다. Poppler가 포함 Type 3 글꼴의 bounding-box
  warning을 냈지만 시각 결과와 텍스트 추출에는 결함이 없었다.

다운로드한 원본 artifact, 검산 script와 독립 PDF 렌더는 재검토·재개용 로컬 경로
`/private/tmp/alhangeul-task20-stage4-5.ws57FH`에 보존했다. 저장소에는 binary 증적을 추가하지 않았다.

## 잔여 위험

- GUI·본문·PDF 수용은 고정 공개 fixture와 Ubuntu Xvfb·Nautilus·Thunar·CUPS-PDF 환경을
  대상으로 한다. 임의 문서·배포판·실제 프린터 전체 호환성으로 확대하지 않는다.
- Poppler의 Type 3 bounding-box warning은 세 출력 경로의 페이지를 전부 직접 확인해 현재 fixture의
  시각 결함이 아님을 확인했지만, 임의 글꼴 조합까지 보증하지 않는다.
- 수용 source 이후 제품 source·dependency·workflow가 바뀌면 `bddbe88`의 exact-SHA 결과를 새
  source에 승계하지 않는다. 본 보고서와 오늘할일만 추가하는 완료 기록 commit은 제품 source를
  바꾸지 않는다.
- release·서명·패키지 게시·updater 활성화·PR 생성/merge·Issue close는 수행하지 않았다.

## 다음 단계 영향

- Issue #17 포함 최신 `devel` 통합과 Stage 4.5 exact-SHA 재수용이 완료됐다. Stage 4.4 결과를
  단순 승계하지 않고 새 source에서 native·GUI·thumbnail·본문·PDF를 모두 다시 확인했다.
- 다음 경계는 Issue #20 최종 보고서와 `publish/task20` push·`devel` 대상 Open PR 생성이다.
  `task-final-report` 절차와 작업지시자의 새 승인을 받기 전에는 진행하지 않는다.
- Issue #20과 오늘할일 상태는 PR 게시 전이므로 `진행중`을 유지한다.

## 승인 요청

- Stage 4.5 산출물과 검증 결과를 승인하면 최종 보고서 작성과 PR 게시 단계로 진행한다.
  승인 전에는 제품 source, 원격 branch, PR과 Issue 상태를 더 변경하지 않는다.
