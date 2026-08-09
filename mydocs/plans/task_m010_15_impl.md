# Task #15 구현계획서 — upstream 전용 페이지 SVG 인쇄 surface 계승

수행계획서: [`task_m010_15.md`](task_m010_15.md)
GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
마일스톤: M010

작업지시자는 2026-08-08 Issue 등록부터 Windows 다운로드 후보까지 별도 단계 승인 없이 진행하도록 승인했다. `local/task15`는 미merge Task #13 exact SHA `63a2703cebf3a79d11a010974203fdaf4ccd3e76`에서 분기했으며, #13 merge 전에는 `devel` 대상 #15 PR을 만들지 않는다.

Stage 1 사전 조사에서 rhwp v0.8.2의 `file:print`는 사용자 동기 클릭 구간에서 same-origin `print.html` 창을 열고 모든 페이지를 `renderPageSvgWithProfile(page, 'print')`로 준비한 뒤 그 창의 `window.print()`를 호출함을 확인했다. 반면 local adapter는 이 command만 `printCurrentWebview()`로 교체하고 Rust `WebviewWindow.print()`로 editor 전체를 인쇄한다. Tauri 공식 API도 DOM `window.print()`는 모든 desktop platform에서 사용할 수 있다고 설명하고, `WebviewWindowBuilder::on_new_window`를 `window.open()` 요청의 명시적 fallback 경계로 제공한다.

따라서 1차 구현은 `file:print`를 desktop executor 목록에서 제거해 upstream command를 browser/Tauri 양쪽에서 동일하게 실행하는 최소안이다. upstream 페이지 조립·style·preview UI를 local이나 Rust에 복제하지 않는다. exact Windows/Linux 후보에서 popup이 차단되거나 opener/same-origin 접근이 깨질 때만 별도 하위 보정으로 editor builder의 `on_new_window`를 추가한다. 그 경우에도 `NewWindowResponse`가 upstream popup을 host할 뿐 페이지 payload나 print DOM은 upstream이 계속 소유한다.

참고:

- [Tauri 2.10.3 `WebviewWindowBuilder::on_new_window`](https://docs.rs/crate/tauri/2.10.3/source/src/webview/webview_window.rs)
- [Tauri `WebviewWindow::print`와 DOM `window.print()` 플랫폼 설명](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindow.html#method.print)

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | upstream 인쇄 소유 경계와 drift guard | `upstream-boundary.test.ts`, 조사·계획 | upstream page SVG/preview command source 계약 |
| 2 | editor 직접 인쇄 override 제거 | file command·desktop host·Rust command와 focused test | Tauri에서도 upstream `file:print` execute 호출 |
| 3 | 플랫폼 중립 회귀와 공식 문서 정렬 | 전체 test/build, `UPSTREAM.md`, release gate | product/upstream/Studio 전체 gate |
| 4 | exact-SHA Windows/Linux 후보 | `publish/task15` 후보·CI/native artifact | Windows 다운로드와 수동 인쇄 handoff |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| upstream 인쇄 소유 계약 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | Stage 3에서 실제 구현과 일치하는 최소 계약만 보정 |
| desktop release gate | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | 기존 인쇄 gate가 충분하지 않을 때만 수정 |
| 구현·단계 판단 | `mydocs/plans/`, `mydocs/working/` | `task_m010_15_impl.md`, `_stage{1..4}.md` | OK | task 작업 기억 |

추가 `mydocs/manual` 문서는 만들지 않는다. 실제 구현에 새로운 장기 장애 대응 절차가 생길 때만 승인된 `mydocs/troubleshootings/` 후보를 재검토한다.

## Stage 1 — upstream 인쇄 소유 경계와 drift guard

### 산출물

수정:

- `apps/studio-host/src/core/upstream-boundary.test.ts`

신규:

- `mydocs/working/task_m010_15_stage1.md`

### 변경 내용

- exact upstream file command가 `file:print`를 `runPrintPreview`로 연결하고, preview가 `createPrintPreviewSurface`, `profile=print` 페이지 렌더, 전용 document setup을 함께 유지하는지 source guard로 고정한다.
- local `file:print-to-pdf` override와 upstream `file:print` 계승을 서로 다른 책임으로 명시한다.
- Tauri popup fallback은 exact bundle에서 실제 차단이 확인되기 전에는 도입하지 않는 최소 변경 원칙을 단계 보고서에 기록한다.

### 검증

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/upstream-boundary.test.ts
pnpm run check:product-boundary
git diff --check
```

### 커밋

```text
Task #15 Stage 1: upstream 페이지 인쇄 surface 계약 고정
```

## Stage 2 — editor 직접 인쇄 override 제거

### 산출물

수정:

- `apps/studio-host/src/command/commands/file.ts`
- `apps/studio-host/src/command/commands/file.test.ts`
- `apps/studio-host/src/core/desktop-host.ts`
- `apps/desktop/src-tauri/src/commands.rs`
- `apps/desktop/src-tauri/src/lib.rs`
- 관련 host/Rust source guard test

신규:

- `mydocs/working/task_m010_15_stage2.md`

### 변경 내용

- Tauri `desktopExecutors`에서 `file:print`를 제거한다. file command wrapper는 override가 없는 command를 기존 그대로 반환하므로 browser와 Tauri 모두 exact upstream `execute(services)`를 사용한다.
- 더 이상 호출되지 않는 `DesktopHost.printCurrentWebview`, Rust `print_webview` command와 invoke handler 등록을 제거한다.
- focused test는 Tauri runtime에서도 `file:print`가 upstream execute를 한 번 호출하고 native editor-print invoke를 호출하지 않는지 고정한다.
- `file:print-to-pdf`는 계속 `exportCurrentPdf()`로 연결되고 save/new-window/recent adapter가 변하지 않는지 함께 검증한다.
- upstream popup이 실패하면 upstream의 기존 `PrintPreviewBlockedError`/status/toast 계약을 사용한다. 이 단계에서 자체 fallback dialog나 iframe 복제는 추가하지 않는다.

### 검증

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/commands/file.test.ts src/core/desktop-host.test.ts src/core/upstream-boundary.test.ts
pnpm run test:studio
pnpm run build:studio
git diff --check
```

Rust unit test·Clippy·Tauri build는 지원 Windows/Linux Stage 4 workflow에서 실행한다. 현재 macOS 호스트에서 native 성공을 주장하지 않는다.

### 커밋

```text
Task #15 Stage 2: upstream 전용 페이지 인쇄 surface 계승
```

### 조건부 Stage 2.x 보정

exact Windows 또는 Linux에서 `window.open()`이 null을 반환하거나 preview realm이 same-origin opener 접근을 제공하지 않을 때만 적용한다.

- `WebviewWindowBuilder::on_new_window`로 `print.html` 요청만 허용하고 다른 외부 URL은 거부한다.
- Windows에서는 caller와 같은 WebView2 environment, Linux에서는 related view가 필요한 Tauri 계약을 따른다.
- 2026-08-09 Windows exact 후보에서 upstream `window.open(print.html)`이 null을 반환하고 popup 차단 안내가 표시되어 이 조건이 충족됐다.
- initial `main`은 `tauri.conf.json`과 `tauri.windows.conf.json`의 기존 window config에 `create: false`를 지정한 뒤 `WebviewWindowBuilder::from_config`로 수동 생성한다. 크기·제목·URL·Windows zoom hotkey metadata는 config에 그대로 보존한다.
- initial `main`과 동적 `main*` editor 모두 동일한 제한적 `print_preview_handler`를 builder에 연결한다. handler는 production Tauri origin 또는 고정된 local dev origin의 정확한 `/print.html`만 허용하고, `window_features(features)`로 Windows WebView2 environment와 Linux related view를 계승한다.
- preview window label은 요청마다 고유하게 만들고, preview가 전달한 document title을 native title에 반영한다. window 생성 실패와 허용되지 않은 URL은 `NewWindowResponse::Deny`로 닫힌 경계를 유지한다.
- native 파일 책임은 `windows.rs`의 editor lifecycle, `window_geometry.rs`의 work-area 계산, `print_preview.rs`의 제한적 popup host로 분리해 파일 300 LOC 권장 상한을 지킨다.
- popup lifecycle·title·close·반복 인쇄를 native test와 exact GUI로 재검증한다.

## Stage 3 — 플랫폼 중립 회귀와 공식 문서 정렬

### 산출물

수정:

- `docs/architecture/UPSTREAM.md`
- 필요 시 `docs/operations/DESKTOP_RELEASE.md`
- 누락된 focused test/guard

신규:

- `mydocs/working/task_m010_15_stage3.md`

### 변경 내용

- 장기 소유 계약을 “upstream: page pagination/SVG/preview DOM, Alhangeul: direct PDF와 Tauri window host의 필수 경계”로 정렬한다.
- release gate는 direct PDF와 실제 인쇄를 분리하고, 실제 인쇄가 editor WebView 전체가 아닌 전용 page surface인지 확인하게 한다.
- source 전체에서 `print_webview`와 `printCurrentWebview` 잔존 참조가 없는지 확인한다.

### 검증

```bash
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run check:release-metadata
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
rg -n "print_webview|printCurrentWebview" apps
git diff --check
```

`rg`는 빈 출력이어야 한다.

### 커밋

```text
Task #15 Stage 3: 인쇄 소유 경계와 플랫폼 중립 gate 정렬
```

## Stage 4 — exact-SHA Windows/Linux 후보와 수동 검증 handoff

### 산출물

- 원격 `publish/task15` exact SHA
- CI 및 Windows/Linux native workflow run
- artifact inventory와 Windows x64 다운로드 후보
- `mydocs/working/task_m010_15_stage4.md`

### 변경 내용

- Stage 3 승인 commit을 `publish/task15`로 push하고 exact SHA를 고정한다.
- CI와 `run_tests=true` native workflow를 실행해 Windows x64/x64 installer와 Linux 지원 bundle을 만든다.
- artifact inventory와 SHA-256, head SHA를 확인하고 작업지시자에게 Windows x64 MSI·NSIS 다운로드 위치와 수동 검증 절차를 제공한다.
- Windows 수동 gate는 단일·다중 페이지, 세로·가로, 한글, 반복 인쇄, 닫기, Microsoft Print to PDF, direct PDF 회귀를 포함한다.
- 첫 exact 후보에서 upstream popup 차단이 관찰되면 Stage 2.x로 돌아가 새 commit·새 exact workflow를 만들고 실패 artifact는 최종 후보로 재사용하지 않는다.

### 검증

```bash
git status --short
git push origin HEAD:refs/heads/publish/task15
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task15
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri --ref publish/task15 -f build_ref=<candidate-sha> -f run_tests=true
gh run view <run-id> --repo postmelee/alhangeul-tauri --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download <run-id> --repo postmelee/alhangeul-tauri --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform <platform> --root <artifact-root> --verify-inventory <inventory-path>
```

release·tag·서명·updater·package repository 게시는 하지 않는다. #13 merge 전에는 #15 PR도 만들지 않는다.

### 커밋

```text
Task #15 Stage 4: Windows Linux exact 인쇄 후보와 검증 handoff
```

Stage 4 보고서는 수동 Windows 결과 전에는 “다운로드 후보 준비”까지만 확정하고, Issue 완료나 release Go를 판정하지 않는다.

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않고 같은 Stage에서 회복한다.
- direct PDF searchable 결과와 HWP/HWPX source save는 변경하지 않는다.
- platform GUI 성공은 exact-SHA bundle의 실제 결과로만 주장한다.

## 커밋

- 단계 소스와 `mydocs/working/task_m010_15_stage{N}.md`를 같은 커밋에 묶는다.
- Task #13 의존 base와 Task #15 고유 commit 범위를 각 Stage 보고서에 기록한다.

## 단계 의존성

- Stage 2는 Stage 1의 upstream source guard와 최소 override 판단 확정 후 진행한다.
- Stage 3은 Stage 2 focused test/build 통과 후 진행한다.
- Stage 4는 Stage 3 전체 중립 gate와 clean worktree 뒤 진행한다.
- Task #13 merge 전에는 Task #15 PR·merge·close를 진행하지 않는다.

## 위험과 대응

- **popup runtime 차이**: browser에서 동작하는 `window.open()`이 Tauri WebView2/WebKitGTK에서 차단될 수 있다. 먼저 최소 계승 후보를 검증하고, 실제 실패 증거가 있을 때만 공식 Tauri `on_new_window` fallback을 추가한다.
- **same-origin realm**: preview `Window`의 DOM 접근이 끊기면 upstream setup이 실패한다. Tauri related view/environment 계약을 사용하되 페이지 조립은 upstream에 남긴다.
- **CSP**: `print.html`과 동적 print style이 production CSP에 막힐 수 있다. exact 후보에서 computed style과 페이지 visibility를 확인하고 필요하면 local external CSS/non-inline state만 보충한다.
- **의존 branch**: #13 merge 전 #15를 devel PR로 만들지 않으며, candidate SHA가 #13 base를 포함한다고 inventory에 명시한다.

## 승인 요청 사항

- 작업지시자의 2026-08-08 연속 진행 지시에 따라 4개 Stage를 별도 승인 없이 수행한다.
- 첫 후보는 upstream command 계승 최소안으로 만들고, 실제 popup 실패가 확인될 때만 Stage 2.x native window 보정을 적용한다.
- Windows x64 다운로드 후보와 검증 절차 제공 시점에서 작업지시자 수동 결과를 기다린다.
