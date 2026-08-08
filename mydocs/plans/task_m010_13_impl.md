# Task #13 구현계획서 — upstream-first Studio와 Tauri native 저장 adapter

수행계획서: [`task_m010_13.md`](task_m010_13.md)
GitHub Issue: [#13](https://github.com/postmelee/alhangeul-tauri/issues/13)
마일스톤: M010

2026-08-04 작업지시자가 upstream-first 소유 원칙, 최소 typed Tauri adapter, upstream PDF 메뉴의 native 직접 저장 override, HWP/HWPX 형식 안전 저장, drag-in 정상 기능 분류, 문서 위치와 6개 Stage를 승인했다.

같은 날 구현계획서 승인 전 PDF 경계를 추가 확정했다. PDF 메뉴·대상 경로·완료 UX는 Alhangeul이 소유하고, 현재 편집 상태의 페이지 SVG는 upstream handler에서 직접 받으며, Windows/Linux 공통 Rust `svg2pdf` 경로가 검색 가능한 PDF를 우선 생성한다. 플랫폼별 WebView PDF API는 도입하지 않고 text embedding 실패 시에만 명시적인 path fallback을 허용한다. PDF export는 source save가 아니므로 문서 dirty·recovery·path·format·revision을 변경하지 않는다.

구현 target은 upstream `index.html`과 `src/main.ts`를 Vite 실제 entry로 쓰는 구조다. upstream main이 설치하는 embed runtime의 typed handler를 leaf wrapper가 받아 Tauri host에 직접 연결한다. open·export·notify-saved는 DOM 추측이나 same-window byte RPC 없이 이 handler로 호출한다. `third_party/rhwp`는 수정하지 않고 local 전체 main/view/toolbar 복제본을 유지하지 않는다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | override 소유 계약과 drift guard | typed override spec·boundary test | 31개 override 분류·금지 shadow 계약 |
| 2 | exact upstream Studio entry 전환 | upstream Vite root·embed seam·복제 UI 제거 | upstream index/main/view/menu build |
| 3 | Tauri native lifecycle 재결합 | host·dispatcher·dirty·recent·font adapter | open/close/drag/print/recent/font test |
| 4 | HWP/HWPX·PDF 저장 통합 | format-aware save·upstream SVG 기반 searchable PDF | round-trip·텍스트 추출·rollback test |
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
| save·PDF·print | upstream command ID의 execute와 native 저장 경계만 교체 | 별도 file menu HTML·플랫폼별 WebView PDF backend |
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
- 수정: Rust `commands.rs`, `state.rs`, `lib.rs`, `pdf_export.rs`, font fallback 경계와 TypeScript·Rust·automation test
- 제거: HWPX 저장 차단과 HWP 전용 staging/commit 명명, 별도 `file:export-pdf`
- 신규: 필요 시 공통 save-format module과 page-at-a-time PDF job module, `mydocs/working/task_m010_13_stage4.md`

### 변경 내용

- save request는 `hwp | hwpx`, target path, expected revision과 external-overwrite 결정을 명시한다.
- `file:save`는 commit된 native session format을 유지한다. save-as는 현재 format, 명시적 HWP/HWPX command는 선택 format으로 저장한 뒤 active path/format을 갱신한다.
- `exportHwp()`/`exportHwpx()` bytes는 기존 chunked staging으로 쓰고 전체 byte IPC는 사용하지 않는다.
- Rust 저장 API를 format-aware 이름으로 일반화한다. 요청 format·target extension·`DocumentCore::from_bytes` parser 결과가 일치한 뒤에만 atomic replace한다.
- HWP/HWPX source save가 성공한 뒤에만 path/format/fingerprint/revision/dirty/cache/recent를 갱신하고 `notifySaved`로 upstream dirty와 recovery draft를 정리한다. 실패·취소·충돌은 기존 target/session을 clean으로 확정하지 않는다.
- upstream `file:print-to-pdf` 위치·label·활성 규칙은 유지하고 execute만 Alhangeul direct PDF adapter로 교체한다. 브라우저 인쇄 창은 열지 않으며 `file:print`의 실제 인쇄 경로와 분리한다.
- PDF adapter는 active upstream handler의 `pageCount()`와 `getPageSvg(page)`를 호출한다. 편집 상태를 staged HWP로 export·재파싱하지 않고 HWP/HWPX 원본 형식과 무관하게 현재 미저장 편집 상태의 SVG를 사용한다.
- native PDF job은 begin/append/commit/abort 수명주기를 갖고 SVG를 한 페이지씩 받아 임시 저장한다. 전체 페이지 SVG나 PDF byte를 TypeScript 메모리·단일 IPC payload에 쌓지 않고, 최종 target은 기존 atomic write 원칙으로 교체한다.
- `svg2pdf`는 `embed_text: true`를 기본으로 사용한다. 기존 제한 폰트 family 제거·safe fallback 정책을 적용한 뒤 font subset을 만들며, searchable 변환 실패 시에만 같은 SVG를 `embed_text: false`로 다시 변환한다. fallback은 결과의 `textMode`와 사용자 경고로 드러내고 조용히 강등하지 않는다.
- PDF 성공·실패·취소는 active source path/format/fingerprint/revision/dirty/cache/recent와 upstream recovery draft를 변경하지 않으며 `notifySaved`를 호출하지 않는다.

### 검증·커밋

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/desktop-host.test.ts src/core/desktop-session.test.ts src/core/chunked-fs.test.ts src/command/commands/file.test.ts
pnpm run test:automation
pnpm run check:product-boundary
pnpm run test:studio
pnpm run build:studio
git diff --check
```

focused test는 source save에서만 `notifySaved`가 호출되는지, PDF가 current upstream SVG를 페이지 순서대로 전달하는지, begin/append/commit/abort 정리와 searchable/path 결과가 구분되는지를 고정한다. Rust unit test·Clippy·Tauri build와 실제 PDF text extraction은 Windows/Linux Stage 6에서 실행하며 그전에는 native 성공·검색 가능성을 주장하지 않는다.

`Task #13 Stage 4: HWPX native 저장과 직접 PDF override 통합`

## Stage 5 — 플랫폼 중립 회귀 검증과 공식 문서 정렬

### 산출물

- 수정: `README.md`, `docs/architecture/UPSTREAM.md`, 필요 시 `LOCAL_FONTS.md`, `docs/operations/DESKTOP_RELEASE.md`, 누락 test/guard
- 신규: `mydocs/working/task_m010_13_stage5.md`

### 변경 내용

- `legacy-upstream-copy` 0개, 남은 alias가 leaf adapter뿐인지 확정하고 300 LOC 초과 adapter는 책임별로 분리한다.
- README는 검증된 HWPX·PDF 범위만, `UPSTREAM.md`는 exact entry·금지 shadow·`getPageSvg` PDF 경계·drift guard를 기록한다. 폰트 문서는 text embedding과 제한 폰트 fallback 계약이 바뀌므로 그 범위만 보정한다.
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
- PDF는 대표 한글·영문·숫자·표·도형·이미지·회전 텍스트 fixture에서 페이지 수·용지 크기·시각 정합을 확인하고 `pdftotext`와 실제 선택·검색으로 searchable 결과를 검증한다. font subset·제한 폰트 대체·fallback 경고·긴 문서 메모리·중간 실패 임시 파일 정리도 증적에 포함한다.
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

### Stage 6.1 — Actions shallow checkout의 pinned tag 확보 보정

2026-08-04 최초 exact-SHA 후보 `a006936ae9838da71cbb23f5e24156a5090a5b6b`의 CI와 세 native build가 모두 `Verify rhwp pin`에서 중단됐다. `actions/checkout`은 lock commit의 submodule worktree는 만들었지만 shallow checkout에 `refs/tags/v0.8.2`를 제공하지 않았고, 검증기는 해당 stable tag를 해석할 수 없었다. 이는 제품 코드나 pin 불일치가 아니라 Actions 입력 준비 결함으로 판정했으며 작업지시자가 최소 보정을 승인했다.

- Task #9 Stage 4.3에서 검증한 방식을 현재 Task #13 파일에 선택 이식한다. Task #9 문서·branch·다른 변경은 가져오지 않는다.
- lock의 repository와 현재 submodule origin, lock commit과 현재 HEAD를 network fetch 전에 확인한다.
- `+refs/tags/v0.8.2:refs/tags/v0.8.2`처럼 lock의 exact tag 하나만 `--no-tags --depth=1`로 fetch한다. 전체 history나 모든 tag는 받지 않는다.
- fetch 뒤 tag가 lock commit으로 resolve되는지 재검증하며 pin·gitlink·submodule worktree·제품 코드는 변경하지 않는다.
- CI와 `run_tests=true` native matrix에서 기존 pin 검증 전에 실행하고 workflow 순서·최소 fetch 계약을 자동화 test로 고정한다.
- 보정 commit을 새 exact SHA로 `publish/task13`에 fast-forward하고 CI/native workflow를 새로 dispatch한다. 실패한 최초 run과 artifact는 수용 증거로 사용하지 않는다.

보정 commit 메시지는 `Task #13 [Stage 6.1]: Actions rhwp release tag 확보 보정`으로 고정한다.

### Stage 6.2 — 저장 command request 구조화와 Clippy 보정

Stage 6.1 후보 `3dc4734abafccdda2e4e90b8bd73b0be3f91b342`는 pinned tag gate와 Windows/Linux native build·Windows installer smoke를 통과했지만, CI의 Rust 1.97 Clippy가 Stage 4에서 추가한 `commit_staged_document_save`의 8개 인자를 `too_many_arguments`로 거부했다. 작업지시자는 저장 동작을 바꾸지 않는 request 구조화를 승인했다.

- 여섯 frontend 저장 필드를 camelCase `CommitStagedDocumentSaveRequest`로 묶고 Tauri command는 `AppHandle`, request, `State` 세 인자만 받는다.
- TypeScript invoke는 같은 필드를 `request` 아래 전달하며 test가 중첩 IPC 계약과 HWP/HWPX 값을 고정한다.
- 저장 format·revision·external overwrite·atomic replace·recent 기록 로직은 변경하지 않는다. lint 예외 annotation은 추가하지 않는다.
- 전체 중립 gate 뒤 새 exact SHA를 게시하고 CI와 native workflow를 모두 재실행한다. Stage 6.1 artifact는 최종 후보 증거로 재사용하지 않는다.

보정 commit 메시지는 `Task #13 [Stage 6.2]: 저장 command request 구조화와 Clippy 보정`으로 고정한다.

### Stage 6.3 — 상황별 도구 모음 상태 동기화 보정

Stage 6.2 exact-SHA Windows GUI 검증에서 PDF 직접 저장, HWP/HWPX 저장과 drag-in 중앙 열기는 통과했지만, 그림 회전·머리말/꼬리말·주석 상황별 도구 그룹이 기본 리본과 동시에 남아 두 줄로 표시됐다. `rhwp v0.8.2`와 Alhangeul macOS bundle은 동일한 숨김 markup과 독립 event handler를 포함하므로 Tauri 전용 메뉴 추가가 아니라 upstream에 잠재된 상태 전환 결함으로 판정한다. macOS에서는 같은 전환 순서가 재현되지 않았으며 WKWebView host script의 별도 toolbar 보정도 없다. 작업지시자는 Tauri 후보의 최소 leaf 보정을 승인했다.

- `third_party/rhwp`와 Alhangeul macOS는 수정하지 않는다. exact upstream entry·메뉴·버튼과 기존 12개 alias override 경계를 유지한다.
- Tauri command adapter가 이미 받는 upstream `EventBus`에 작은 상태 coordinator를 연결한다. 머리말/꼬리말, 각주/미주, 그림 선택 상태를 한곳에서 계산하고 upstream 동기 handler가 끝난 microtask에 최종 DOM 표시를 투영한다.
- 머리말/꼬리말과 주석 편집 모드는 상호 배타적으로 처리하고, 비활성 event가 다른 활성 모드의 도구 모음을 덮어쓰지 못하게 한다. 그림 회전 그룹은 upstream 규칙대로 그림 선택 중이며 주석 모드가 아닐 때만 표시한다.
- 초기 숨김, 머리말→주석 비활성, 주석→머리말 비활성, 그림 선택과 주석 전환 순서를 focused test로 고정하고 기존 upstream boundary test에서 local entry·toolbar shadow가 추가되지 않았음을 유지한다.
- 플랫폼 중립 test·build 뒤 새 exact SHA를 게시하고 CI/native workflow를 모두 재실행한다. Stage 6.2 artifact는 기능 통과 참고로만 남기고 최종 후보 증거로 재사용하지 않는다.

보정 commit 메시지는 `Task #13 [Stage 6.3]: 상황별 도구 모음 상태 동기화 보정`으로 고정한다.

### Stage 6.4 — Tauri CSP 초기 숨김과 도구 상태 투영 보정

Stage 6.3 exact-SHA Windows GUI 재검증에서 상황별 도구 그룹의 기본 노출은 해소됐지만,
upstream HTML에서 `style="display:none"`인 `#file-input`이 계속 표시됐다. 같은 inline 숨김에
의존하는 그림 회전·머리말/꼬리말·주석 그룹이 이전 후보에서 함께 노출된 사실과 Tauri가
production asset CSP에 nonce/hash를 추가하는 계약을 대조해, 실행 직후 주원인을 event
경합보다 앞선 CSP style attribute 차단으로 재판정한다. Stage 6.3 coordinator는 독립 event가
다른 활성 모드를 덮는 동적 상태 결함을 막으므로 유지하되, inline style 투영을 CSP-safe class
투영으로 바꾼다. 작업지시자는 이 최소 보정과 새 Windows/Linux exact-SHA 재검증을 승인했다.

- Tauri CSP와 asset CSP 변환은 끄지 않고 `style-src-attr 'unsafe-inline'` 같은 광범위한 예외도
  추가하지 않는다. `third_party/rhwp`와 Alhangeul macOS도 수정하지 않는다.
- 제품 CSS는 coordinator 준비 전 세 상황별 그룹을 숨겨 첫 paint 노출을 막고, 제품 전용 숨김
  class, 항상 숨겨야 하는 `#file-input`, 내용이 없을 때 숨겨야 하는 `#sb-field`를 관리한다.
- toolbar coordinator는 hidden class를 진실 원천으로 사용한다. 표시 전환 시 upstream inline
  `display` 잔여값을 제거하고 준비 완료 class를 설정하며, upstream handler가 먼저 실행된 뒤
  microtask에서 최종 상태를 투영하는 Stage 6.3 순서는 유지한다.
- upstream `index.html`의 inline `display:none` 요소 목록을 boundary test로 고정하고 다섯 요소가
  모두 제품 CSS/coordinator 소유에 매핑되는지 검증한다. 향후 release pin에서 목록이 늘면
  무조건 숨기는 generic selector 대신 별도 소유 판단을 요구한다.
- 플랫폼 중립 test·build 뒤 새 exact SHA를 게시하고 CI/native workflow를 모두 재실행한다.
  Windows에서는 실행 직후 상황별 그룹·파일 입력 비노출과 모드 전환, Linux에서는 production
  화면과 bundle을 재검증한다. Stage 6.3 artifact는 최종 후보 증거로 재사용하지 않는다.

보정 commit 메시지는 `Task #13 [Stage 6.4]: Tauri CSP 초기 숨김과 도구 상태 투영 보정`으로 고정한다.

### Stage 6.5 — Linux AppImage 절대 저장 기본 경로 보정

Stage 6.4 exact-SHA `ba888ff28893455f5da583f3225f1341fa670987`는 CI와 Windows/Linux
native build·artifact inventory를 통과했고 Windows와 Linux 화면에서 CSP-safe 초기 숨김을
확인했다. 이후 Linux AppImage 실기에서 PDF 저장 대화상자의 상대 `defaultPath`가
`/tmp/.mount_Alhangeul…` 아래 읽기 전용 실행 위치로 해석되어 `Read-only file system
(os error 30)`으로 PDF 임시 디렉터리 생성이 실패했다. 이는 `file:print`나 공통 `svg2pdf`
finalizer 결함이 아니라 변환 전에 발생한 native 저장 경로 결함이다. 같은 상대 기본 경로를
쓰는 HWP/HWPX save-as·교차 형식 저장도 잠재 영향 범위로 판정하며, 작업지시자는 이 최소
보정과 새 exact-SHA Windows/Linux 재검증을 승인했다.

- 저장 대화상자에는 파일명만 전달하지 않고 항상 절대 `defaultPath`를 전달한다. 기존 문서는
  absolute source parent를 유지하고, 새 문서나 상대·유효하지 않은 source는 사용자 Documents,
  Documents를 해석할 수 없으면 home directory를 사용한다.
- 실행 cwd와 AppImage mount를 저장 위치 판단에 사용하지 않는다. 선택 결과의 확장자 보정,
  atomic save/PDF job, active source state, dirty·recovery 계약은 변경하지 않는다.
- PDF뿐 아니라 같은 chooser 경계를 쓰는 HWP/HWPX save-as와 cross-format save를 focused test에
  포함한다. Linux AppImage에서는 기본 위치 그대로 PDF를 저장하고 PDF 형식·page·text를 확인하며,
  HWP/HWPX 저장을 재검증한다. Windows에서는 저장 경로와 기존 PDF/HWP/HWPX 동작을 회귀검증한다.
- 전체 중립 gate 뒤 새 exact SHA를 게시하고 CI/native workflow를 모두 재실행한다. Stage 6.4
  artifact는 CSP 화면 통과 참고로만 남기고 최종 후보 증거로 재사용하지 않는다.

보정 commit 메시지는 `Task #13 [Stage 6.5]: Linux AppImage 절대 저장 기본 경로 보정`으로 고정한다.

## 공통 검증·의존성

- 각 Stage는 검증 통과와 단계 보고서 승인 뒤 다음 Stage로 간다. 계획·문서 위치 변경은 먼저 승인받는다.
- Rust desktop test·Clippy·Tauri build는 Windows/Linux에서만 수행한다. native evidence 없는 platform/bundle은 성공으로 추정하지 않는다.
- Stage 2→3→4→5→6은 직전 Stage 승인에 의존한다. Stage 6 외부 push/dispatch는 별도 승인을 받는다.
- 최종 보고 승인 전 #13 close, #9 candidate 재생성, 공개 release를 수행하지 않는다.

## 위험과 대응

- **초기 event race**: handler ready 뒤 Rust pending queue를 drain하고 event와 dedupe한다.
- **upstream autosave 효과**: upstream 동작만 상속하고 native recovery는 만들지 않는다. HWP/HWPX source save 성공 후에만 `notifySaved` 완료를 기다리며 PDF export에서는 호출하지 않는다.
- **cross-format state**: 최초 WASM format이 아니라 commit된 native session format을 후속 저장 기준으로 둔다.
- **HWPX fidelity**: extension/ZIP만이 아니라 parser·editable conversion·page/text round-trip을 검증한다.
- **font regression**: upstream loader/Toolbar를 유지하고 file-backed face 준비만 leaf adapter test로 고정한다.
- **PDF text·font regression**: SVG가 실제 `<text>`를 포함해도 문자별 배치·font subset·fallback 때문에 추출 순서나 외형이 달라질 수 있다. Windows/Linux의 `pdftotext`·선택·검색·시각 gate를 모두 통과해야 searchable을 기본으로 확정하고, 실패 시 path fallback을 명시한다.
- **platform PDF drift**: WebView2/WebKitGTK 직접 PDF backend는 사용하지 않고 공통 Rust `svg2pdf` finalizer를 유지한다. 공통 경로가 수용 gate를 통과하지 못할 때만 별도 Issue에서 플랫폼 backend를 재검토한다.
- **large document memory**: HWP/HWPX는 typed handler와 chunked staging을 연결하고, PDF는 page-at-a-time SVG job으로 단일 페이지보다 큰 payload를 만들지 않는다.
- **Task #9 증거 폐기**: #13 이전 candidate와 GUI 증거를 최종 수용에 재사용하지 않는다.

## 승인 요청 사항

- upstream HTML/main을 실제 entry로 쓰고 local 전체 entry/view/toolbar를 제거하는 Stage 2
- embed handler 직접 연결과 native recent·dirty·dispatcher·font leaf adapter 구조
- upstream built-in recovery/autosave는 상속하되 native recovery 신규 구현은 제외하는 경계
- cross-format commit 뒤 native session format을 후속 저장 진실 원천으로 두는 계약
- `file:print-to-pdf` execute만 upstream current page SVG → 공통 searchable `svg2pdf` 경로로 교체하고 `file:export-pdf`를 제거하는 계약
- PDF에서 staged-HWP 재파싱과 `notifySaved`를 제거하고 명시적 path fallback만 허용하는 계약
- 6개 Stage 산출물·검증·커밋 메시지

승인되면 Stage 1 override 소유 계약과 drift guard부터 구현한다.
