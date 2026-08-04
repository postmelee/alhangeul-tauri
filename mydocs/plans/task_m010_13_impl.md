# Task #13 구현계획서 — upstream-first Studio와 Tauri native 저장 adapter

수행계획서: [`task_m010_13.md`](task_m010_13.md)
GitHub Issue: [#13](https://github.com/postmelee/alhangeul-tauri/issues/13)
마일스톤: M010

2026-08-04 작업지시자가 upstream-first 소유 원칙, 최소 typed Tauri adapter, upstream PDF 메뉴의 native 직접 저장 override, HWP/HWPX 형식 안전 저장, drag-in 정상 기능 분류, 문서 위치와 6개 Stage를 승인했다.

구현 target은 upstream `index.html`과 `src/main.ts`를 Vite 실제 entry로 쓰는 구조다. upstream main이 설치하는 embed runtime의 typed handler를 leaf wrapper가 받아 Tauri host에 직접 연결한다. open·export·notify-saved는 DOM 추측이나 same-window byte RPC 없이 이 handler로 호출한다. `third_party/rhwp`는 수정하지 않고 local 전체 main/view/toolbar 복제본을 유지하지 않는다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | override 소유 계약과 drift guard | typed override spec·boundary test | 31개 override 분류·금지 shadow 계약 |
| 2 | exact upstream Studio entry 전환 | upstream Vite root·embed seam·복제 UI 제거 | upstream index/main/view/menu build |
| 3 | Tauri native lifecycle 재결합 | host·dispatcher·dirty·recent·font adapter | open/close/drag/print/recent/font test |
| 4 | HWP/HWPX·PDF 저장 통합 | format-aware staging·atomic commit | round-trip·PDF·rollback test |
| 5 | 플랫폼 중립 회귀·문서 정렬 | 전체 test/build·공식 문서 | 기본 gate·override 최소성 |
| 6 | Windows/Linux exact-SHA 수용 | 지원 bundle·native 증적·#9 handoff | GUI/package/rollback·SHA-256 |

## 문서 위치 확인

| 파일 | 수행계획서상 위치 | Stage 산출물 | 일치 | 비고 |
|---|---|---|---|---|
| 제품 기능 | 저장소 루트 | `README.md` | OK | Stage 5 실제 수용 범위만 반영 |
| upstream 계약 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | exact entry·허용 adapter·drift guard |
| 로컬 폰트 | `docs/architecture/` | `docs/architecture/LOCAL_FONTS.md` | OK | 구현 경로 변경 시에만 보정 |
| release gate | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | Stage 6 증적·#9 재개 조건 |
| 단계·최종 보고 | `mydocs/working/`, `mydocs/report/` | `task_m010_13_stage{1..6}.md`, `_report.md` | OK | task 산출물 |

추가 `mydocs/tech/`·`mydocs/manual/` 문서는 만들지 않는다. Stage 판단은 단계 보고서에, 장기 계약은 승인된 공식 문서에 기록한다.

## 최종 override 허용 경계

| 책임 | 허용 | 금지 |
|---|---|---|
| embed 연결 | upstream handler를 등록하는 leaf wrapper | upstream `main.ts` 복사 |
| command·dirty | dispatcher/document-state wrapper | 별도 command system·DOM dirty 추측 |
| open·recent·drag | upstream load handler+Tauri path adapter | 별도 CanvasView 초기화 |
| save·PDF·print | upstream command ID의 execute 교체 | 별도 file menu HTML |
| local font 정책 | upstream API re-export+provider/filter | font-loader·Toolbar 전체 복제 |
| 제품 UX | 새 창·제품 정보·소형 CSS augmentation | index/dialog/style 전체 복제 |

## Stage 1 — override 소유 계약과 drift guard

### 산출물

- 수정: `apps/studio-host/alhangeul-overrides.ts`
- 신규: `apps/studio-host/src/core/upstream-boundary.test.ts`
- 신규: `mydocs/working/task_m010_13_stage1.md`

### 변경 내용

- 31개 alias를 `native-host`, `font-policy`, `product-ux`, `legacy-upstream-copy`로 분류하고 목표 disposition과 제거 Stage를 typed spec에 기록한다. 기존 alias 생성은 spec에서 파생해 Stage 1 동작을 바꾸지 않는다.
- test는 alias 중복·누락, exact pin, read-only submodule, 최종 금지 대상(`index.html`, `main.ts`, CanvasView, Ruler, Toolbar, 일반 dialog/style)을 고정한다.
- Stage 2~4 삭제 checklist와 native 기능 회귀 matrix를 단계 보고서에 확정한다.

### 검증·커밋

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/upstream-boundary.test.ts
pnpm run check:product-boundary
pnpm run test:studio
pnpm run build:studio
git diff --check
```

`Task #13 Stage 1: Studio override 소유 계약과 drift guard 확정`

## Stage 2 — exact upstream Studio entry 전환

### 산출물

- 신규: `apps/studio-host/src/embed/desktop-runtime.ts`와 test, 필요 시 virtual CSS Vite helper
- 수정: `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, override spec, `src/style.css`, boundary/build test
- 제거: local `index.html`, `src/main.ts`, `src/view/` 복제 구현·test, local Toolbar·validation modal, upstream과 같은 역할의 일반 UI/style override
- 신규: `mydocs/working/task_m010_13_stage2.md`

### 변경 내용

- Vite `root`는 exact `third_party/rhwp/rhwp-studio`, `build.outDir`은 기존 local `dist`로 고정한다. upstream public assets·HTML·main·CSS를 실제 bundle entry로 쓴다.
- 제품 title/version·asset과 Windows/Linux form-control 글꼴 보정만 `transformIndexHtml`/virtual CSS로 추가한다.
- `@/embed/runtime` wrapper는 upstream runtime을 그대로 설치하면서 전달된 `loadFile`, `exportHwp`, `exportHwpx`, `getPageSvg`, `notifySaved` handler를 desktop registry에 등록한다.
- upstream MenuBar, CanvasView, VirtualScroll, RendererSession, Ruler, Toolbar와 theme lifecycle을 복원한다.
- upstream main의 browser recovery/autosave는 macOS와 동일한 upstream 동작으로 상속하되 native recovery 저장소·명령은 만들지 않는다. 이 효과가 승인 범위와 충돌하면 Stage 2를 중단한다.

### 검증·커밋

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/embed/desktop-runtime.test.ts src/core/upstream-boundary.test.ts
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

`Task #13 Stage 2: exact upstream Studio entry와 renderer 복원`

## Stage 3 — Tauri native lifecycle·font·recent adapter 재결합

### 산출물

- 신규/분리: `core/desktop-host.ts`, `core/desktop-session.ts`, `command/dispatcher.ts`, `core/document-dirty-state.ts`, `recent/recent-store.ts`와 test
- 수정: `core/desktop-events.ts`, `document-files.ts`, `platform.ts`, `font-loader.ts`, `local-fonts.ts`, `font-authoring-policy.ts`, `command/commands/file.ts`, 최소 제품 정보 adapter, override spec
- 제거: `bridge-factory.ts`, WasmBridge subclass형 `tauri-bridge.ts`, 불필요한 edit/shortcut/UI/font 전체 override
- 신규: `mydocs/working/task_m010_13_stage3.md`

### 변경 내용

- `desktop-host`는 active docId/path/format/revision과 native 호출만 소유하고 문서 모델·render는 upstream handler에 맡긴다.
- native dialog·association·pending open·drag path는 `prepare_document_open`과 chunked read 뒤 `loadFile`로 전달한다. load 성공 뒤 session/recent를 확정하고 실패 session은 닫는다.
- Rust drag-drop producer는 바꾸지 않고 event+pending 중복 제거와 `loadFile` 1회 호출을 test한다.
- dispatcher wrapper는 upstream 동작을 상속하며 native menu event도 같은 registry로 보낸다. dirty wrapper는 upstream `DocumentDirtyState`를 진실 원천으로 native close/session과 동기화한다.
- upstream 최근 문서 submenu를 native recent store와 연결한다. DOM에는 file name만 표시하고 path mapping은 adapter 내부에 둔다.
- upstream font loader·CanvasKit plan을 re-export하고 local provider·authoring 금지 filter·file-backed face 준비만 유지한다. Toolbar 전체는 복제하지 않는다.
- upstream 메뉴를 유지하고 `file:new-window`, Alhangeul version 같은 필수 제품 항목만 작게 보충한다. `file:print`는 native print에 연결한다.

### 검증·커밋

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/desktop-events.test.ts src/core/desktop-host.test.ts src/core/desktop-session.test.ts src/recent/recent-store.test.ts src/core/local-fonts.test.ts src/core/font-authoring-policy.test.ts src/command/commands/file.test.ts
pnpm run check:product-boundary
pnpm run test:studio
pnpm run build:studio
git diff --check
```

`Task #13 Stage 3: Tauri native lifecycle과 font recent adapter 재결합`

## Stage 4 — HWP/HWPX 저장 일반화와 native PDF override

### 산출물

- 수정: `desktop-host.ts`, `desktop-session.ts`, `chunked-fs.ts`, `command/commands/file.ts`
- 수정: Rust `commands.rs`, `state.rs`, `lib.rs`와 TypeScript·Rust·automation test
- 제거: HWPX 저장 차단과 HWP 전용 staging/commit 명명, 별도 `file:export-pdf`
- 신규: 필요 시 공통 save-format module, `mydocs/working/task_m010_13_stage4.md`

### 변경 내용

- save request는 `hwp | hwpx`, target path, expected revision과 external-overwrite 결정을 명시한다.
- `file:save`는 commit된 native session format을 유지한다. save-as는 현재 format, 명시적 HWP/HWPX command는 선택 format으로 저장한 뒤 active path/format을 갱신한다.
- `exportHwp()`/`exportHwpx()` bytes는 기존 chunked staging으로 쓰고 전체 byte IPC는 사용하지 않는다.
- Rust 저장 API를 format-aware 이름으로 일반화한다. 요청 format·target extension·`DocumentCore::from_bytes` parser 결과가 일치한 뒤에만 atomic replace한다.
- 성공 뒤 path/format/fingerprint/revision/dirty/cache/recent를 갱신한다. 실패·취소·충돌은 기존 target/session을 clean으로 확정하지 않는다.
- upstream `file:print-to-pdf` 위치·label·활성 규칙은 유지하고 execute만 native direct PDF로 교체한다. 성공한 native commit 뒤에만 `notifySaved`로 dirty와 recovery draft를 정리한다.

### 검증·커밋

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/desktop-host.test.ts src/core/desktop-session.test.ts src/core/chunked-fs.test.ts src/command/commands/file.test.ts
pnpm run test:automation
pnpm run check:product-boundary
pnpm run test:studio
pnpm run build:studio
git diff --check
```

Rust unit test·Clippy·Tauri build는 Windows/Linux Stage 6에서 실행하며 그전에는 native 성공을 주장하지 않는다.

`Task #13 Stage 4: HWPX native 저장과 직접 PDF override 통합`

## Stage 5 — 플랫폼 중립 회귀 검증과 공식 문서 정렬

### 산출물

- 수정: `README.md`, `docs/architecture/UPSTREAM.md`, 필요 시 `LOCAL_FONTS.md`, `docs/operations/DESKTOP_RELEASE.md`, 누락 test/guard
- 신규: `mydocs/working/task_m010_13_stage5.md`

### 변경 내용

- `legacy-upstream-copy` 0개, 남은 alias가 leaf adapter뿐인지 확정하고 300 LOC 초과 adapter는 책임별로 분리한다.
- README는 검증된 HWPX 범위만, `UPSTREAM.md`는 exact entry·금지 shadow·drift guard를 기록한다. 폰트 문서는 경로가 바뀔 때만 보정한다.
- release 문서는 과거 #9 candidate 폐기와 Stage 6 뒤 새 exact-SHA candidate 필요성을 기록한다.

### 검증·커밋

```bash
git diff --check
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run check:release-metadata
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
```

`Task #13 Stage 5: upstream-first 회귀 검증과 제품 문서 정렬`

## Stage 6 — Windows/Linux exact-SHA native 수용과 #9 handoff

### 산출물

- 외부 상태: 승인된 `publish/task13`, CI/native runs, Windows/Linux bundle·inventory·GUI 증적
- 수정: `docs/operations/DESKTOP_RELEASE.md`, 수행일 오늘할일
- 신규: `mydocs/working/task_m010_13_stage6.md`

### 변경 내용

- 별도 Stage 6 승인 뒤 Stage 5 승인 commit을 exact SHA로 push·dispatch한다.
- Windows MSI·NSIS, Linux x64 AppImage·DEB·RPM과 arm64 DEB에서 승인된 package/native gate를 수행한다.
- 메뉴·리본·초기 중앙 위치, HWP/HWPX open/edit/save/save-as/cross-format/reopen, HWPX parser/page/text, PDF 형식/page/원본 불변, print, 정상 drag-in, association, recent, close guard, uninstall·rollback을 확인한다.
- 미수행 gate는 면제하지 않고 No-Go로 기록한다. exact SHA·run·inventory·SHA-256·제한과 #9 handoff를 문서화한다.

### 검증·커밋

```bash
pnpm run check:product-boundary && pnpm run check:product-version
pnpm run check:rhwp-pin && pnpm run check:release-metadata
pnpm run test:automation && pnpm run test:upstream && pnpm run test:studio && pnpm run build:studio
git diff --check
git push origin HEAD:refs/heads/publish/task13
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task13
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri --ref publish/task13 -f build_ref=<candidate-sha> -f run_tests=true
gh run view <run-id> --repo postmelee/alhangeul-tauri --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download <run-id> --repo postmelee/alhangeul-tauri --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform <platform> --root <artifact-root> --verify-inventory <inventory-path>
```

release tag·GitHub Release·서명·updater·package 게시는 하지 않는다.

`Task #13 Stage 6: Windows Linux native 수용과 Task #9 handoff`

## 공통 검증·의존성

- 각 Stage는 검증 통과와 단계 보고서 승인 뒤 다음 Stage로 간다. 계획·문서 위치 변경은 먼저 승인받는다.
- Rust desktop test·Clippy·Tauri build는 Windows/Linux에서만 수행한다. native evidence 없는 platform/bundle은 성공으로 추정하지 않는다.
- Stage 2→3→4→5→6은 직전 Stage 승인에 의존한다. Stage 6 외부 push/dispatch는 별도 승인을 받는다.
- 최종 보고 승인 전 #13 close, #9 candidate 재생성, 공개 release를 수행하지 않는다.

## 위험과 대응

- **초기 event race**: handler ready 뒤 Rust pending queue를 drain하고 event와 dedupe한다.
- **upstream autosave 효과**: upstream 동작만 상속하고 native recovery는 만들지 않는다. 저장 성공 후 `notifySaved` 완료를 기다린다.
- **cross-format state**: 최초 WASM format이 아니라 commit된 native session format을 후속 저장 기준으로 둔다.
- **HWPX fidelity**: extension/ZIP만이 아니라 parser·editable conversion·page/text round-trip을 검증한다.
- **font regression**: upstream loader/Toolbar를 유지하고 file-backed face 준비만 leaf adapter test로 고정한다.
- **large document memory**: embed legacy RPC/base64를 쓰지 않고 typed handler와 chunked staging을 직접 연결한다.
- **Task #9 증거 폐기**: #13 이전 candidate와 GUI 증거를 최종 수용에 재사용하지 않는다.

## 승인 요청 사항

- upstream HTML/main을 실제 entry로 쓰고 local 전체 entry/view/toolbar를 제거하는 Stage 2
- embed handler 직접 연결과 native recent·dirty·dispatcher·font leaf adapter 구조
- upstream built-in recovery/autosave는 상속하되 native recovery 신규 구현은 제외하는 경계
- cross-format commit 뒤 native session format을 후속 저장 진실 원천으로 두는 계약
- `file:print-to-pdf` execute만 direct PDF로 교체하고 `file:export-pdf`를 제거하는 계약
- 6개 Stage 산출물·검증·커밋 메시지

승인되면 Stage 1 override 소유 계약과 drift guard부터 구현한다.
