# Task #74 구현계획서 — 로컬 글꼴 상태·선택·적용 통합

수행계획서: [`task_m010_74.md`](task_m010_74.md)
GitHub Issue: [#74](https://github.com/postmelee/alhangeul-tauri/issues/74)
마일스톤: M010 / bug
작성일: 2026-09-24
상태: 2026-09-24 구현계획과 Stage 1 승인·완료 보고 뒤 “진행해줘.”로 Stage 2 착수 승인. Stage 2 구현·플랫폼 중립 검증 통과. 후보 `ebe5729`의 push·native CI 1회 실행을 “진행해줘.”로 승인받았으며 run 35969672923이 성공했다. Stage 2 보고 뒤 “진행해줘.”로 Stage 3 착수 승인. Stage 3 완료보고 뒤 “진행해줘.”로 Stage 4 진입과 `8e7d26e` push·full CI 1회를 승인받았다. run 35972535353 full 성공, 사용자 설치본 GUI 검증 결과 대기다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 소비자 연결·상태 통합 | exact import resolver, 누락 export, 실제 upstream 연결 회귀 | 플랫폼 중립 집중 회귀·전체 Studio test/build |
| 2 | 선택 지속·복원·안내 | native 설정, 문서 초기화/감지 hook, 설정 UI | 선택·창·동시성·저장 실패 및 Windows/Linux native test |
| 3 | 실제 공급·캐시·적용 | 필요 bytes/FontFace 공급, renderer 갱신, 실패 상태 | 실제 소비자·공개 글꼴·무효화·문서 상태 회귀 |
| 4 | 지원 환경 수용·문서 | exact 후보 full, Windows/Linux 설치 검증, 공식 문서·보고 | 설치본 시나리오와 renderer별 증거·한계 |

각 Stage의 소스와 완료보고서를 묶어 커밋하고 다음 Stage 진입 승인을 받는다. 현재 승인된 범위는 Stage 4와 후보 `8e7d26e`의 push·full CI 1회다. 추가 CI 실행과 최종 PR·릴리즈는 별도 승인한다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 글꼴 정책·설정·렌더 범위 | `docs/architecture/LOCAL_FONTS.md` | 동일 | OK | Stage 4, 실제 확인된 결과만 반영 |
| host import/hook 경계 | `docs/architecture/UPSTREAM.md` | 동일 | OK | Stage 1 resolver, Stage 2 hook 계약을 각 단계에 맞춰 최소 갱신 |
| 구현계획 | `mydocs/plans/` | `mydocs/plans/task_m010_74_impl.md` | OK | 본 문서 |
| 단계 보고 | `mydocs/working/` | `task_m010_74_stage1.md`~`stage4.md` | OK | 검증 실행·제한·승인 요청 |
| 최종 보고 | `mydocs/report/` | `mydocs/report/task_m010_74_report.md` | OK | task-final-report 시점 |
| 작업 보드 | `mydocs/orders/20260924.md` | 동일 | OK | 날짜 변경 시 해당 날짜 보드 사용 |

제품 문서는 기존 공식 위치만 갱신한다. #69 릴리즈 문서, 매뉴얼, 원래 checkout은 수정하지 않는다.

## Stage 1 — 소비자 연결·상태 통합

### 산출물

신규:

- `apps/studio-host/local-font-overrides.ts`: exact upstream 상대 import resolver.
- `apps/studio-host/src/core/local-font-consumers.test.ts`: 실제 upstream 분석·대체 소비자 통합 회귀.
- `apps/studio-host/src/core/local-font-overrides.test.ts`: resolver 경계 및 build 연결 계약.

수정:

- `apps/studio-host/vite.config.ts`, `vitest.config.ts`: 동일 resolver 사용.
- `apps/studio-host/src/core/local-fonts.ts`, `local-fonts.test.ts`: 누락된 `getLocalFontDetectionMethod` 등 실제 소비자 계약 보완.
- `apps/studio-host/src/core/upstream-boundary.test.ts`, 필요한 연결 계약만 `tests/rhwp-baseline.test.mjs`.
- `docs/architecture/UPSTREAM.md`, 단계 보고와 오늘할일.

### 변경 내용

1. 이 worktree의 읽기 전용 submodule을 gitlink `496333b27d21ddb9114ba9ae340bcb895870c9a7`로 초기화하고 `pnpm install --frozen-lockfile`로 의존성을 준비한다. pin/lock 변경과 다른 checkout의 의존성 변경은 금지한다.
2. 실패 회귀를 먼저 고정한다. 실제 `@upstream/core/document-font-status`의 `analyzeDocumentFonts`와 `@upstream/core/font-substitution`의 `fontFamilyChainForDisplay`를 실행하며 native catalog/환경 경계만 대체한다. 후자가 `resolveLocalFont`를 소비하고 내부에서 `resolveFont`를 호출하므로 실제 표시 체인 진입점으로 검증한다. 누락 글꼴을 포함해 기존 분리 캐시의 반복 안내 조건을 드러낸다.
3. `local-font-overrides.ts`의 pre resolver는 pinned upstream `core/document-font-status.ts`와 `core/font-substitution.ts`에서 오는 `./local-fonts.ts`만 Alhangeul `src/core/local-fonts.ts`로 연결한다. 경로 separator/query 정규화와 importer 검사를 수행하고 다른 상대 모듈은 그대로 둔다.
4. 기존 `@/core/local-fonts` alias와 위 상대 경로가 같은 canonical module ID를 사용한다. 기존 12개 alias 목록과 owner는 유지하고 resolver를 별도 명시적 경계로 검사한다. UI/renderer shadow를 추가하지 않는다.
5. upstream 소비자에 필요한 detection method export와 반환 타입을 맞춘다. 이 단계는 캐시 소유권만 통합하며 설정 영속성 수용은 Stage 2에 남긴다. `stored` 의미를 억지로 참으로 만들어 실패를 숨기지 않는다.

### 검증

```bash
pnpm --filter @postmelee/alhangeul-studio-host test src/core/local-font-consumers.test.ts src/core/local-font-overrides.test.ts src/core/local-fonts.test.ts
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

감지 전·성공 후·빈 목록·force reset 후 상태를 실제 소비자와 대조한다. Vite dev/build와 Vitest가 같은 adapter를 읽고, 원본 상대 import가 직접 upstream 캐시에 닿지 않는지 검사한다. submodule clean과 pin 불변도 확인한다. 현재 호스트에서는 위 플랫폼 중립 검증만 수행한다.

### 커밋

```text
Task #74 Stage 1: 로컬 글꼴 소비자 상태와 import 경계 통합
```

## Stage 2 — 선택 지속·복원·안내

### 산출물

- 신규 native `apps/desktop/src-tauri/src/local_font_preferences.rs`, `local_font_preferences_tests.rs`, `local_font_commands.rs`.
- 신규 Studio `src/core/local-font-preferences.ts`, `local-font-state.ts`, `local-font-controller.ts`, `local-font-lifecycle.ts` 및 대응 `.test.ts`.
- 신규 제품 UI `src/ui/desktop-local-font-settings.ts` 및 `.test.ts`. upstream 모달 복제본을 만들지 않는다.
- 신규 `apps/studio-host/local-font-entry-hooks.ts`, 대응 `src/core/local-font-entry-hooks.test.ts`.
- 수정 `apps/desktop/src-tauri/src/lib.rs`, Studio `local-fonts.ts`, `local-font-overrides.ts`, `vite.config.ts`, `vitest.config.ts`, `src/command/dispatcher.ts`, 경계 테스트와 `UPSTREAM.md`.
- Stage 2 보고와 오늘할일.

### 변경 내용

**native 설정 계약**

- 앱 데이터 폴더의 `local-font-preferences.json`에 `{version: 1, choice: 'enabled' | 'disabled'}`만 저장한다. 파일 없음은 `unset`이고 미지원 version/손상/읽기 실패는 별도 오류다. 글꼴 목록·경로·bytes는 저장하지 않는다.
- `get_local_font_preferences`, `set_local_font_preferences`를 전용 command 모듈에 두고 `lib.rs`에 등록한다. 입력 enum을 검증하며 경로를 frontend 인자로 받지 않는다.
- 기존 `state::atomic_write`를 재사용하되 앱 데이터 디렉터리 생성과 설정 접근 mutex는 설정 모듈이 소유한다. 저장 실패는 경로가 없는 오류 코드로 변환한다. 별도 store 의존성은 추가하지 않는다.
- 앱 단일 프로세스의 창들은 하나의 설정 service를 사용한다. revision을 포함한 `alhangeul-local-font-preferences-changed` 이벤트를 게시하고, 창은 이벤트 등록 후 snapshot을 읽어 초기 경합을 막는다. 이벤트 누락에 대비해 문서 진입·focus 복귀 시 최신 revision을 확인한다.

**상태와 사용 선택**

- `choice`, `preferencePersisted`, `catalogStatus`, `generation`, `lastError`를 분리한다. legacy `loaded`는 catalog 준비 여부, `complete`는 현재 지원 catalog 조사 완료 여부다. `stored`는 native 사용 설정이 실제 저장된 경우에만 참이고 snapshot/bytes를 디스크에 저장했다는 뜻으로 쓰지 않는다. storage 값과 안내도 native 설정 저장 의미를 명시한다.
- `enabled` 복원 시 자동 catalog 조회를 한 번 합쳐 수행한다. `disabled`/`unset`에서는 자동 목록·bytes 공급을 하지 않는다. 첫 수동 감지 후 저장 실패는 해당 창의 임시 사용으로 유지하고, 미사용 저장 실패도 해당 창의 임시 선택임을 알린다. 재시작 지속을 약속하지 않는다.
- “대체 글꼴로 보기”는 disabled를 저장한다. 닫기/Escape는 영구 저장 없이 해당 실행의 재안내만 억제한다. 필요 시 native service의 메모리 상태로 새 창에도 취소 상태를 공유하되 재실행에서는 해제한다.
- 감지·설정 응답의 generation/revision을 비교해 늦은 이전 결과를 버린다. 오류 안내는 반복 문서마다 모달로 띄우지 않고 상태와 명시적 재시도 경로로 제공한다.

**entry hook과 UI**

- 기존 12개 alias는 유지한다. hook은 `local-font-entry-hooks.ts`에 정의한 exact upstream `src/main.ts`의 다음 두 함수 진입점으로 제한하고, product controller import를 추가한다. 원본 파일에는 쓰지 않는다.
- `initializeDocument(docInfo, displayName, options)`의 글꼴 준비 이전: native 선택 복원·문서 요청 세대 시작·필요한 catalog 준비, 활성 문서와 안전한 뷰 갱신 callback을 controller에 등록한다.
- `promptLocalFontsIfNeeded(docInfo, displayName)`의 시작: Tauri일 때만 제품 controller가 안내·선택·저장 결과·공급 요청을 처리한 뒤 반환한다. 브라우저 경로는 upstream 본문을 유지한다. upstream 고정 성공 toast가 Tauri에서 실행되지 않도록 실제 hook 회귀를 둔다.
- hook은 함수 서명과 주변 marker가 각각 정확히 한 번인지 확인하고 미일치 시 build를 실패시킨다. 함수 본문 전체 복사, 광범위 문자열 치환, renderer transform은 하지 않는다.
- 기존 dispatcher 등록 시 제품 메뉴의 “로컬 글꼴 설정…” command를 추가하고 기존 Vite HTML transform의 메뉴 위치에 연결한다. 설정 UI는 사용/미사용, 다시 감지, 저장/감지 상태와 대체 안내만 제공한다. 새 범용 dialog나 toolbar 복제본은 만들지 않는다.
- controller의 뷰 callback은 기존 `rendererSession.invalidateDocument()`와 `canvasView.loadDocument()`를 사용한다. 문서 재열기/serializer/dirty 변경 함수를 호출하지 않는다. event listener·menu·callback은 기존 dispatcher/pagehide 수명주기에서 회수한다.

### 검증

```bash
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
pnpm run test:upstream
git diff --check
```

Windows/Linux 환경에서만 다음을 실행한다.

```bash
pnpm run test:desktop -- local_font_preferences
pnpm run clippy:desktop
```

설정 없음·허용·거절·취소·empty catalog·손상·저장 실패·복원 실패, 두 창 순서 역전, 이벤트 등록 중 변경, 늦은 감지·창 폐기를 검증한다. 실제 새 native service로 디스크 복원을 검사하며 JS module reset만으로 앱 재실행을 수용하지 않는다. native 실행 환경/CI 승인이 없으면 그 검증을 미실행으로 남기고 단계 완료 승인 전에 해소한다.

### 커밋

```text
Task #74 Stage 2: 로컬 글꼴 사용 선택 지속과 자동 복원 연결
```

### Stage 2 중간 검증 후보 — 2026-09-24

구현은 native 설정 service/command, frontend 선택·catalog 상태, 두 entry hook,
설정 modal·menu와 창 lifecycle로 분리했다. `dismiss`는 같은 설정 command의 action으로
처리하되 native 메모리에만 유지한다. catalog 실패 시 빈 목록으로 뷰를 갱신하고,
뷰 갱신 실패도 저장 상태와 구분해 안내한다. 기존 alias 12개와 upstream pin은 그대로다.

| 검증 | 결과 |
|---|---|
| `pnpm run check:product-boundary` | 통과, 644 files scanned |
| `pnpm run test:upstream` | 36 passed, 0 failed |
| `pnpm run test:studio` | 35 files, 212 passed |
| `pnpm run build:studio` | 통과, 241 modules; 기존 externalization/chunk/dynamic-import 경고 유지 |
| `git diff --check` | 통과 |
| upstream source/pin | clean, `496333b27d21ddb9114ba9ae340bcb895870c9a7` 불변 |
| native 설정 test·desktop Clippy | 미실행; Windows/Linux 검증 필요 |
| Windows/Linux 설치본·실제 글꼴 표시 | 미실행; Stage 4 수용에 유지 |

Studio 회귀는 저장 실패의 임시 선택, 취소, 두 창 revision과 오래된 응답, 문서 전환,
감지 실패 및 UI 선택·닫기·재감지를 포함한다. UI 테스트는 제품 body/action을 실행하며
upstream modal shell을 대체하므로 실제 keyboard/focus·설치본 UI 수용을 뜻하지 않는다.
native에는 새 service에서 디스크 복원, 손상·실패와 동시 쓰기 회귀 6개를 준비했지만 아직
실행하지 않았으므로 Stage 2 완료보고서는 작성하지 않는다.

플랫폼 중립 출력은 `/tmp/task74-stage2-{boundary,upstream,studio,build}.log`에 보관했다.
현재 호스트에서 Rust desktop 검증은 수행하지 않았다. 읽기 전용 Docker 확인에서
Linux 엔진은 응답했으나 이미지 조회가 containerd blob I/O 오류로 실패했다.
기존 컨테이너나 엔진을 변경하지 않았다.

검증용 중간 커밋 `Task #74: Stage 2 native 검증 후보 준비`를 고정한 뒤 다음 승인을 요청한다.

- 원격 `publish/task74`로 non-force push. 사전 조회에서 같은 원격 branch는 없었다.
- 같은 후보를 workflow/source SHA로 `ci.yml`, `scope=full`, `profile=native` 1회 실행.
  profile의 fast 선행 검사 뒤 Linux desktop/document-preview Rust test·Clippy를 수행한다.
  native profile의 성공은 최종 full·설치본 GUI 수용을 대신하지 않는다.
- run 결과를 확인한 뒤 Stage 2 완료 여부를 보고한다. Stage 3 진입은 그 보고 후 별도 승인이다.

### Stage 2 native 검증 확정 — 2026-09-24

중간 후보 보고 뒤 “진행해줘.”를 exact 후보의 push와 native CI 1회 실행 승인으로 적용했다.
`publish/task74`에 non-force push했으며 [run 35969672923](https://github.com/postmelee/alhangeul-tauri/actions/runs/35969672923), attempt 1이 completed/success다.
workflow/source SHA는 모두 `ebe57297e84cab8426b44558200093e05936df5a`이고 실제 Linux checkout 로그에서도 확인했다.
빠른 Node/Studio·Windows PowerShell 계약과 Linux native job 모두 통과했다.
새 설정 6개를 포함한 desktop 테스트 183+21+3개, document-preview 11+4개 및 모든 해당 Clippy가 통과했다.
설치본 artifact/installer job은 native profile에서 의도적으로 생략되며 full/GUI 수용으로 계산하지 않는다.

위 중간 후보 절의 미실행·승인 대기는 후보 준비 당시 기록이다. 현재 확정 결과와 잔여 범위는
[Stage 2 완료보고](../working/task_m010_74_stage2.md)를 따른다. 검증된 중간 커밋을 재작성하지 않고
동일 제품 소스 위에 보고 문서만 후속 커밋한다. Stage 2 보고 시점에는 추가 push/CI와 Stage 3을 수행하지 않았다.

## Stage 3 — 실제 공급·캐시·적용

### 산출물

- 수정 Studio `local-fonts.ts`, `local-font-provider.ts`, `local-font-records.ts`, controller/lifecycle와 대응 회귀 테스트.
- 신규 `src/core/local-font-application.test.ts`: 실제 renderer/session 소비 경계와 캐시 세대 회귀.
- 필요 시 native `font_catalog.rs`의 기존 허용 root 안 유효성 확인과 전용 테스트. 허용 root를 넓히는 command는 추가하지 않는다.
- 신규 `tests/gui/local-fonts/`의 공개 fixture 준비·결과 수집 helper와 계약 테스트. 기존 GUI 실행 환경을 사용하며 새 CI workflow를 만들지 않는다.
- Stage 3 보고와 오늘할일.

### 변경 내용

- 문서가 요구하는 family/alias를 현재 catalog에 대조하고 제한 family는 목록·resolve·bytes 공급 단계 모두에서 기존 정책대로 제외한다. 모호한 face나 지원을 확인하지 못한 collection/variable face는 성공으로 표시하지 않는다.
- CSS/SVG/Canvas2D 계열은 `ensureLocalFontsAvailable`을 문서 준비·선택 변경 경로에 연결한다. system-installed의 OS 해석과 file-backed의 명시적 FontFace 등록을 구분하고, web substitute가 설치 글꼴을 덮어쓰는지 실제 소비자로 확인한다.
- provider는 자신이 추가한 FontFace 객체를 보관해 `document.fonts.delete`로 회수한다. 다른 소유자의 FontFace는 제거하지 않는다. bytes promise·등록 결과·읽기 실패는 generation별로 관리하고 실패한 항목을 계속 사용 가능으로 노출하지 않는다.
- 문서 전환/수동 재감지에서 이전 문서의 bytes를 무조건 재사용하지 않는다. 필요한 파일을 현행 native read 검증으로 다시 확인하며 삭제·읽기 실패 때 엔트리와 공급 상태를 무효화한다. 전체 목록 재스캔과 필요한 bytes 확인은 구분한다.
- upstream CanvasKit `prepareLocalFonts`는 성공뿐 아니라 실패 face도 캐시한다. 재감지·미사용·실패 후에는 공개된 `rendererSession.invalidateDocument()`가 `resetDocumentResources()`를 호출하도록 기존 lifecycle을 사용하고 재준비/재렌더한다. private map 접근이나 upstream renderer 수정은 금지한다.
- 등록된 수, 확인한 renderer, 대체된 수를 구분한다. system 디렉터리 목록은 있으나 bytes root 밖인 대표 음성 사례를 유지한다. `stored=true`, CSS family, `document.fonts.check`, 등록 수만으로 화면 적용 완료를 선언하지 않는다.
- 공개 fixture는 번들 대체와 구별되는 OFL 단일 face TTF/OTF 및 HWP/HWPX를 사용한다. 선정 시 출처·라이선스·hash를 고정하고 사용자/시스템 기존 폰트 파일을 덮어쓰지 않는 격리 환경에서 지원 root에 설치한다. 임시 설치물은 검증 후 회수한다.

### 검증

```bash
pnpm --filter @postmelee/alhangeul-studio-host test src/core/local-font-application.test.ts src/core/local-font-consumers.test.ts
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

단일 등록·읽기 실패 후 재시도·삭제·force refresh·미사용·문서 전환 중 오래된 응답, provider FontFace 회수와 CanvasKit 세대 변경을 검증한다. 실제 pinned renderer/session API를 사용하고 검증할 정책 함수를 mock하지 않는다. native 경로 검사가 바뀌면 Windows/Linux에서 `pnpm run test:desktop -- font_catalog`와 clippy를 추가한다.

문서 변경 없이 보기만 갱신했는지 dirty·원본 글꼴명·저장/재열기 결과를 확인한다. 화면 증거는 Stage 4 설치본에서 renderer별로 수집하며 Stage 3의 단위/통합 성공과 구분한다.

### 커밋

```text
Task #74 Stage 3: 필요한 로컬 글꼴 공급과 실패 캐시 무효화 보정
```

### Stage 3 구현 세부 확정

- native root·catalog 구현은 수정하지 않는다. provider에서 읽은 standalone static sfnt(TTF/OTF)만 직접 공급한다. collection index·variation coordinate가 없는 TTC/OTC·가변 face와 기타 미확인 container는 fallback으로 둔다.
- product provider의 소유 FontFace·등록 promise·bytes·실패는 문서/선택 세대로 관리한다. 문서 진입에서 catalog는 재사용하되 provider를 비워 필요한 파일을 다시 검증한다.
- file-backed 실패는 local resolve에서 제외하고 system-installed의 OS 해석과 bytes 공급 실패는 분리한다. 모호한 동명 face는 family 추측으로 선택하지 않는다.
- `tests/gui/local-fonts/`에 Google Fonts exact commit의 unmodified Abel Regular TTF·OFL과 bundled WASM으로 생성한 HWP/HWPX를 고정한다. Abel은 bundled 대체와 구별되는 Latin fixture이며 한글 coverage 수용은 아니다.
- `manifest.json`에 출처·라이선스·hash·engine pin을 기록한다. `generate.mjs`, `fixture.mjs`, `fixture.test.mjs`는 생성·무결성·격리 root 설치/회수·관측 기록 및 저장/재열기 계약을 담당한다. 실제 화면 수용은 하지 않는다.
- 단계 기본 명령에 `node --test tests/gui/local-fonts/fixture.test.mjs`를 추가한다. 신규 workflow나 package script는 추가하지 않는다.

## Stage 4 — Windows/Linux 통합 수용·문서

### 산출물

- `docs/architecture/LOCAL_FONTS.md`: 선택 저장·복원/미사용 의미·재감지·오류와 renderer별 확인 범위.
- `docs/architecture/UPSTREAM.md`: 구현된 resolver/hook 계약 최종 정합 확인.
- `tests/gui/local-fonts/` helper와 fixture metadata의 최종 검증 결과.
- `mydocs/working/task_m010_74_stage4.md`, 오늘할일. 단계 승인 후 task-final-report 절차에서 최종 보고.

### 변경 내용

- 집중 회귀가 통과한 후보만 원격 검증 대상으로 선정한다. 검증용 중간 커밋이 필요하면 단계 완료보고와 구분하고 exact source/workflow SHA·변경 범위·선택 profile을 제시해 push/dispatch 승인을 받는다.
- `fast`로 초기 계약을 고정한다. native 설정 검증을 위해 중간 `native` 등 추가 profile이 필요하면 근거와 실행 범위를 별도 승인받는다. 동일 원인으로 full을 반복 실행하지 않는다.
- 공유 제품 변경의 최종 통합 후보는 `full`을 실행한다. Windows x64·Linux x64/arm64의 필수 job·설치·package 결과와 raw 진단 제한을 각각 기록한다.
- 같은 후보의 Windows x64 설치본과 Linux x64 설치본에서 최초 선택, 동일/상이 문서, 새 창, 완전 종료 후 재실행, 미사용 복원, 수동 재감지, 삭제·읽기 실패를 확인한다. 새 창과 새 프로세스는 별도 증거로 남긴다.
- CSS/SVG/Canvas2D와 CanvasKit 중 실제 활성 경로를 기록한다. 대표 공개 글꼴의 공급/등록 증거와 fallback과 구별 가능한 화면·metric을 함께 확인한다. 지원되지 않는 경로는 명시적 fallback/미검증으로 남기며 다른 경로의 성공으로 대체하지 않는다.
- HWP/HWPX 글꼴명·저장·재열기와 기존 PDF/인쇄/썸네일의 대표 최소 회귀를 확인한다. 정확한 출력 글꼴 지원 확대나 physical printer·Linux arm64 GUI까지 수용했다는 주장은 하지 않는다.

### 검증

승인된 비게시 push/CI 실행에만 다음 명령을 사용한다. dispatch 직전 remote ref와 승인 SHA 일치를 확인하고 실행 직후 실제 workflow/source SHA를 재조회한다.

```bash
git push origin local/task74:publish/task74
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task74 -f profile=fast
# 집중 회귀 결과와 최종 후보를 확정하고 별도 승인받은 뒤 실행
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task74 -f profile=full
```

제품 bytes가 바뀌면 새 artifact를 사용한다. run/attempt·workflow/source SHA·artifact ID/digest·installer hash·OS·renderer·fixture 및 원시 관측을 단계 보고에 남긴다. 기존 run 35817024213은 증상/비교 기준이며 새 제품 수용 근거가 아니다. full 성공도 GUI 글꼴 적용을 대신하지 않는다.

Windows/Linux GUI 환경이나 사용자 설치 확인이 없으면 해당 항목을 미실행으로 유지한다. `unverified`를 완료로 바꾸지 않으며 이후 승인도 실제 검증 성공과 구분한다. 개인정보·proprietary bytes/path가 evidence에 들어가지 않도록 공개 fixture만 사용한다.

### 커밋

```text
Task #74 Stage 4: Windows/Linux 로컬 글꼴 수용과 지원 경계 문서화
```

### Stage 4 설치본 검증 인계

2026-09-24 작업지시자가 “설치본을 받아 직접 검증하겠습니다”로 응답했다.
에이전트는 승인된 full CI의 결과와 exact artifact를 확인해 전달하고, 실제 설치본 관측은
작업지시자의 결과를 기다린다. 이 대기는 실행 승인 부족이 아니라 실제 수용 증거가 필요한 상태다.

후보는 `8e7d26e44c09406d3203bb9140b2dbd8576d2375`,
[run 35972535353](https://github.com/postmelee/alhangeul-tauri/actions/runs/35972535353), attempt 1이다.
설치 전 artifact 이름·ID·digest와 선택한 installer hash를 아래 확정 결과에 대조한다.

검증은 Windows x64와 Linux x64 각각에서 기록한다. 기존 개인 문서/폰트 대신
`tests/gui/local-fonts/`의 Abel·HWP/HWPX 또는 별도의 공개 문서를 사용한다.
Abel fixture는 Latin 대비용이며 한글 지원 전체를 판단하지 않는다.

1. 설치한 OS·설치 파일·후보 SHA와 활성 renderer를 기록한다.
2. 로컬 글꼴 사용을 선택한 뒤 같은/다른 HWP/HWPX를 반복 열어 안내 반복 여부와 화면을 확인한다.
3. 새 창과 앱 완전 종료 후 재실행을 각각 검사한다. 미사용 선택도 같은 방식으로 유지되는지 확인한다.
4. 설정 메뉴에서 다시 감지·사용/미사용을 전환한다. 격리된 사용자 font root의 공개 fixture 추가·제거 후 열린 문서의 반영을 확인한다.
5. 같은 공개 문서의 local/fallback 화면과 구별 가능한 metric을 renderer별로 기록한다. 목록·등록 수만으로 적용 완료를 판정하지 않는다.
6. 원본 글꼴명·내용과 dirty 상태를 확인하고 HWP/HWPX 저장·재열기, PDF·인쇄 dialog·썸네일의 대표 회귀를 기록한다.

결과에는 **OS / 설치 파일 / 시나리오 / 정상·실패·미실행 / 실제 관측**을 적는다.
실패 시 공개 문서의 재현 순서와 화면을 남긴다. 개인 문서 내용·proprietary font bytes/path는
증거에 포함하지 않는다. 확인되지 않은 renderer·플랫폼·시나리오는 미검증으로 유지한다.

### Stage 4 full CI 확정 결과와 설치 파일

- run 35972535353 / attempt 1 / `scope=full`, `profile=full`: completed/success.
- workflow/source SHA: `8e7d26e44c09406d3203bb9140b2dbd8576d2375`.
- fast 2개, core 3개, Windows·Linux x64/arm64 제품 3개, Windows 설치 계약 3개,
  설치 계약 집계와 전체 result가 모두 success다. 별도 PDF cleanup·context experiment 등
  선택하지 않은 job은 skipped다.
- Linux x64 DEB/RPM 및 arm64 DEB package lifecycle 통과. core는 예상된 음성 사례를 포함한
  진단 계약 통과이며 GUI 표시 수용을 뜻하지 않는다.
- Windows MSI 일반 lifecycle raw passed. NSIS는 thumbnail-render `0x80040154`,
  MSI forced-reinstall은 reboot-required `3010`으로 raw failed, diagnosticContract는 success다.
  NSIS raw 실패를 일반 설치 성공으로 바꾸어 보고하지 않는다. 사용자 검증에는 MSI를 우선 안내했다.
- Windows·Linux x64 archive를 내려받아 GitHub digest를 대조했고 내부 inventory의 source SHA와
  모든 파일 hash도 일치했다. arm64 archive digest는 API 기록이며 별도 로컬 다운로드 검증은 하지 않았다.

| 설치 대상 | artifact ID | GitHub archive digest |
|---|---|---|
| [Windows x64](https://github.com/postmelee/alhangeul-tauri/actions/runs/35972535353/artifacts/10797838038) | 10797838038 | `sha256:d9663c9395f6028c13e3bd5f4cb52abe7634e5e932ab6620604bb8872b4e0e31` |
| [Linux x64](https://github.com/postmelee/alhangeul-tauri/actions/runs/35972535353/artifacts/10797564590) | 10797564590 | `sha256:0c7b8f4e0563b5cb0ca96d62bba45495d2493edbb81e12f6ddc195e989fe2d6e` |
| Linux arm64 | 10797209552 | `sha256:18d189411c06437fbd5dc37ec8dee5b1467d1d336db100a768ff8f1809bbf184` |

| 사용자 검증 파일 | SHA-256 |
|---|---|
| `msi/Alhangeul_0.1.0_x64_en-US.msi` | `176df9b0bb3534976d2d67c30ee9c94b30ce30ba9447075fd7fe6fd124ed883b` |
| `deb/Alhangeul_0.1.0_amd64.deb` | `2b1440bcba2f63263bae522d3fc21921a47f6efc611fe9e7c8a7cf6482f8fca3` |
| `appimage/Alhangeul_0.1.0_amd64.AppImage` | `8c84a94e511e604f8369dc1953fefc59be87cd547a2e686d51f97798834c833b` |

전체 artifact 식별자·설치 파일 hash·job/원시 상태와 GUI 미검증은
`tests/gui/local-fonts/acceptance.json`에 보존했다. CI 원문은 `/tmp/task74-full-ci.log`,
진단 원문은 `/tmp/task74-full-diagnostics`, `/tmp/task74-installer-evidence`에 있다.

현재 제품·workflow는 검증 후보와 동일하며 로컬 변경은 문서와 수용 metadata뿐이다.
사용자 GUI 결과 전까지 Stage 4 완료보고서·최종 PR은 작성하지 않는다. 이번 인계는
계획의 중간 검증 기록으로 커밋하고 추가 push/CI는 실행하지 않는다.

## 검증

- 단계별 검증은 완료보고 전에 실행하고 실패를 해결한 뒤 완료를 요청한다. CI 환경 제약은 미실행으로 기록하고 필요한 실행 승인을 별도로 받는다.
- platform-neutral test/build는 현재 호스트에서 실행 가능하나 Rust desktop·Tauri·제품 GUI는 Windows/Linux에서만 실행한다.
- 새 코드 파일 300 LOC, 함수 50 LOC, 매개변수 5개, 복잡도 10을 기준으로 역할을 나눈다. native command 등록은 별도 모듈을 사용해 기존 큰 `commands.rs`에 설정 구현을 쌓지 않는다.
- 새 renderer patch, 추가 alias, 보안 root/제한 정책 변경, 신규 의존성이 필요하면 구현 전에 범위 보정 승인을 요청한다.
- 구현계획 작성 시점에는 문서 검증만 수행했으며, 승인된 Stage에서는 해당 단계 검증 범위를 적용한다.

## 커밋

- 단계 산출물과 `mydocs/working/task_m010_74_stage{N}.md`를 같은 커밋으로 묶는다.
- 구현계획 문서 커밋은 `Task #74: 수행계획 승인 반영과 구현계획 작성`으로 기록한다.
- 최종 보고·PR 게시·merge는 단계 승인과 별개이며 해당 시점의 스킬을 따른다. 원격 `local/task74`와 릴리즈/tag/서명 변경은 만들지 않는다.

## 단계 의존성

- Stage 1은 이 구현계획 승인 후 착수한다.
- Stage 2는 Stage 1 검증·보고 승인 후 진행한다. Stage 1 성공만으로 저장/자동 적용 해결을 선언하지 않는다.
- Stage 3은 Stage 2 검증·보고 승인 후 진행하며 공급 결과와 상태 UI를 함께 정렬한다.
- Stage 4는 Stage 3 검증·보고 승인과 원격 실행 승인 후 진행한다. 마지막 단계의 full과 설치본 수용이 끝나야 최종 보고로 넘어간다.

## 위험과 대응

- **hook 유지보수**: upstream exact 함수/marker 계약과 부정 테스트로 변경을 검출한다. 원본 source·renderer를 복제하거나 자동 추정해 patch하지 않는다.
- **초기 렌더 순서**: upstream은 prompt 이전에 문서를 그린다. 문서 초기화 hook에서 먼저 복원하고, 최초 허용 후에는 뷰만 다시 준비해 dirty·undo·문서 bytes를 보존한다.
- **캐시 세대와 폰트 우선순위**: reset으로 bundled resource까지 다시 준비될 수 있다. repaint 완료와 실제 face 선택을 확인하고 같은 화면의 stale 성공 표시를 방지한다.
- **저장/알림 부분 실패**: 디스크 저장 결과와 창 이벤트 전달 결과를 구분하고 다음 snapshot read로 회복한다. 원시 경로 오류를 frontend 로그로 전달하지 않는다.
- **미사용 의미**: 제품의 직접 감지/공급만 중단한다. 시스템 CSS의 OS 글꼴 사용 전체를 차단한다고 설명하지 않는다.
- **지원 환경 부족**: native/GUI 근거가 없으면 작업 완료를 주장하지 않는다. 부분 profile 결과와 실제 UI 결과를 나누어 보고한다.

## 승인 요청 사항

1. 위 4단계 산출물·검증·커밋과 Stage 1 착수.
2. 12개 alias 유지, 두 상대 import만 연결하는 resolver 및 Stage 2의 두 entry hook 범위.
3. native 선택 전용 저장·revision 동기화·취소의 실행 중 억제와 임시 선택/저장 실패 안내 계약.
4. 기존 renderer 공개 lifecycle로 자원을 갱신하고 dirty·문서 데이터는 보존하는 방식.

승인 후 Stage 1만 구현·검증·보고한다. 다음 Stage, 비게시 원격 push/CI와 최종 PR은 해당 경계에서 별도 승인받는다.

### Stage 4 Linux GUI 추가 승인 — 2026-09-24

Windows는 작업지시자가 직접 설치 검증한다. Linux는 에이전트가 기존 GUI workflow를
보완하고 기존 x64 설치본으로 추가 CI 1회를 실행하는 제안을 “진행해줘.”로 승인받았다.
제품 source `8e7d26e44c09406d3203bb9140b2dbd8576d2375`, 생산 run `35972535353`,
artifact `10797564590`와 archive digest를 유지하고 검증 harness SHA만 분리한다.

기존 `alhangeul-linux-gui.yml`에 `local-fonts` scope를 추가하고 성공한 `ci.yml` 또는
`alhangeul-desktop.yml`의 exact artifact 전달을 검사한다. inventory sourceSha와 파일
hash 검사는 설치 전에 수행한다. 새 workflow·제품 재빌드·릴리즈는 수행하지 않는다.
`tests/gui/local-fonts/` helper와 `tests/gui/specs/local-fonts.e2e.ts`에서 공개 fixture의
설치 전후 canvas, 실제 backend diagnostics, 설정 미사용/사용/재탐색과 앱 재실행을
검사한다. Canvas2D와 CanvasKit 결과를 분리하고 fallback을 CanvasKit 성공으로
기록하지 않는다. SVG는 별도 interactive renderer 선택지가 없어 수용하지 않는다.
fixture hash와 문서 font 이름 보존, 화면 변화 및 공급 상태는 서로 구분한다.

문서는 기존 승인 위치에 실행·결과만 추가하며 Stage 4 완료 처리는 Windows 결과와
Linux 실제 관측 검토 뒤 결정한다. 검증 후보의 non-force push와 위 GUI 1회만 실행한다.

Linux GUI 검증 후보는 GUI typecheck, automation 966개, fixture 3개, Studio 222개,
upstream 36개, product-boundary 658 files, Studio build, actionlint와 diff whitespace를
통과했다. 기존 full CI가 확인한 제품 bytes를 재사용하며 이 검사는 Linux 글꼴 GUI
범위만 수용한다. 테스트의 renderer별 단일 시나리오는 설치 전후·재탐색·재실행 순서를
한 흐름으로 유지하기 위해 권장 함수 50 LOC를 초과하고, 공통 UI/캡처는 별도 helper에 둔다.

### Stage 4 Linux GUI 1회 결과와 보정 — 2026-09-24

[run 35978518579](https://github.com/postmelee/alhangeul-tauri/actions/runs/35978518579),
attempt 1, harness `a99dced3581532c7027d0b5d37b22ce4e6ab9a59`, `scope=local-fonts`는
7분 32초 뒤 failure로 종료됐다. 승인된 추가 1회를 사용했으며 재실행하지 않았다.

- exact producer/artifact handoff, 다운로드 digest, inventory sourceSha·파일 hash,
  DEB 설치, 앱 시작과 설정 UI 조작까지 통과했다. 설치한 DEB SHA-256은
  `2b1440bcba2f63263bae522d3fc21921a47f6efc611fe9e7c8a7cf6482f8fca3`다.
- Canvas2D/CanvasKit 두 시나리오는 문서를 열기 전 첫 미사용 설정 대기에서 각각
  120초 timeout됐다. 원시 WebDriver exit는 1이며 `continue-on-error`와 별개로
  `step-outcomes.json`의 gui=failure, 최종 gate=failure를 유지한다.
- 실패 캡처의 상태표시줄에는 “로컬 글꼴 감지·직접 공급을 사용하지 않습니다.”가
  실제 표시됐고 status DOM mutation도 관측됐다. 그러나 WebKitWebDriver의
  `getElementText(#sb-message)`가 빈 문자열을 반환했다. 제품 글꼴 표시 실패라는
  판정은 하지 않으며, 실제 문서·설치 글꼴 비교 관측은 0건이다.
- 검증 helper를 기존 `readStudioStatus`의 DOM `textContent` 조회로 보정했다.
  모달 본문도 같은 방식으로 읽고 renderer별 실패 캡처·DOM 상태를 분리 보존한다.
  보정 후 GUI typecheck와 관련 계약 69개, diff whitespace가 통과했다.
- 환경: Ubuntu 22.04 x64, WebKitGTK/WebKitWebDriver 2.50.4, tauri-driver 2.0.6.
  증거 artifact `10799363182`, digest
  `sha256:2d97445c5208499fe02a00c86a6772587b882524e650ca1c1a158bb761ed6841`.
  로컬 자료는 `/tmp/task74-linux-gui-evidence`와 `/tmp/task74-linux-gui-run.log`다.

Windows 직접 검증과 Linux 문서 글꼴 GUI 수용은 계속 미검증이다. Stage 4 완료보고서는
작성하지 않는다. 보정한 harness를 non-force push하고 동일 `8e7d26e` 설치본에 대해
`alhangeul-linux-gui.yml`, `scope=local-fonts` 1회를 추가 실행하는 승인을 요청한다.

### Stage 4 Linux GUI 보정본 추가 실행 승인 — 2026-09-24

보정본 `664d493e7bf79741daec0ed97c776491c3ae3dcf`의 non-force push와 동일 설치본의
GUI 추가 1회 실행 요청에 작업지시자가 “진행해줘.”로 승인했다.
`publish/task74`에 push하고 [run 35979852070](https://github.com/postmelee/alhangeul-tauri/actions/runs/35979852070),
attempt 1, `scope=local-fonts`를 실행했다. 제품 SHA와 생산 run/artifact는 기존과 동일하다.

### Stage 4 Linux GUI 보정본 결과·제품 결함 — 2026-09-24

run `35979852070`, attempt 1은 4분 3초 뒤 failure로 종료됐다. GUI 시나리오 자체는
55.4초, 1 passed/1 failed다. 상태표시줄 읽기 보정은 통과했고 설치·artifact 검증도
통과했다. 증거 artifact는 `10800100959`, digest
`sha256:4a96d92ed189d4628d8f45e64b88487c6b12863e1bdcc5e82c8f3e2452ce6189`다.
18개 화면/diagnostics 관측과 4회의 PID 변경이 수집됐다.

| 항목 | 실제 관측 |
|---|---|
| Canvas2D HWP/HWPX | Abel 공급 전후 픽셀 변화, FontFace loaded, 글꼴명 보존 통과 |
| Canvas2D 재감지·삭제·복구 | 재감지 유지, 삭제 시 fallback, 복구 시 원래 픽셀 복원 |
| Canvas2D 사용/미사용 재실행 | 각각 새 PID 확인과 동일 픽셀 복원 통과 |
| CanvasKit 최초 HWP/HWPX | effectiveBackend=canvaskit, localTypefaceCount=1, fontSubstitutions=[] |
| CanvasKit 수동 재감지 | effectiveBackend는 유지하나 localTypefaceCount=0, Abel → Noto Sans KR Thin unregisteredFallback |
| CanvasKit 파일 복구 후 재감지 | FontFace는 loaded지만 CanvasKit localTypefaceCount=0과 fallback 지속 |
| CanvasKit 재실행 | 새 PID에서 localTypefaceCount=1, fallback 없음, 원래 Abel 픽셀로 복원 |
| HWP/HWPX export readback | 설치본의 공개 export API 결과에서 Abel과 fixture 본문 보존 확인 |
| 새 창·Windows 직접 수용 | 미검증/사용자 결과 대기 |

CanvasKit 재감지 전후는 단순 픽셀 노이즈가 아니다. enabled의 픽셀 hash는
`01eea1f1bb61e3cedb5a5b96f42fd15cab473731fd0686181c7860fb57438a0b`,
재감지 후는 absent와 동일한
`514cf38c99b18030ad62fca58b538428dd08eddd5ca909ee336330e63bdeaab5`다.
재실행하면 다시 enabled hash가 된다. 전체 창 캡처에서도 글자 형태 변화가 확인된다.
개별 element screenshot은 WebKit의 잘못된 crop을 포함하므로 전체 창 캡처와 실제 canvas
`toDataURL` 기반 hash·renderer diagnostics를 판정 근거로 사용했다.

원인은 제품 `local-font-entry-hooks.ts`의 refreshView 경계다. session 무효화와
`canvasView.loadDocument()`가 글꼴 자원을 초기화하며, 후자는 내부적으로
`prepareDocumentLoad()` → `rendererSession.beginDocument()`도 실행한다. 최초 문서
초기화는 loadDocument 뒤 `prepareCanvasKitLocalFonts()`를 호출하지만 제품의 설정
갱신 callback에는 그 재공급 단계가 없다. CSS FontFace 정상 여부로 이를 가릴 수 없다.

**승인 요청 범위**: 제품 adapter의 현재 두 entry hook 안에서 loadDocument가 끝난 뒤
현재 CanvasKit renderer에 문서의 로컬 글꼴을 다시 공급하고 완료를 기다린 후 보기만
갱신한다. 문서 전환 중 stale renderer와 cache 재초기화를 피하는 조건을 둔다.
upstream/submodule, native 허용 root, serializer는 수정하지 않는다. 실제 session의
beginDocument 자원 초기화까지 포함하는 회귀를 추가하고, GUI는 재감지 직후
Typeface count/fallback과 enabled 픽셀 유지도 직접 검사하도록 보강한다.

변경 대상은 `apps/studio-host/local-font-entry-hooks.ts`와 기존 controller 경계가 필요한
최소 adapter, 해당 회귀, `tests/gui/local-fonts/`·GUI spec이다. 문서는 기존 승인 위치만
갱신한다. 승인 후 플랫폼 중립 집중 회귀, 전체 Studio/upstream test/build와 boundary,
GUI typecheck/관련 계약을 실행하고 새 제품 후보 SHA를 제시한다. 제품 bytes가 달라지므로
기존 설치본의 성공을 새 후보에 이전하지 않으며 새 설치본 생성·원격 CI는 별도 승인한다.
현재 턴에서는 제품 소스를 수정하지 않았으며 Stage 4도 완료 처리하지 않는다.

### Stage 4 CanvasKit 재감지 제품 보정 승인 — 2026-09-24

작업지시자가 “진행해줘.”로 위 제품 수정·로컬 회귀 검증을 승인했다. 원격 CI와 새 설치본
생성은 아직 실행하지 않는다. 기존 두 entry hook 중 refreshView callback에서
loadDocument 완료 후 현재 CanvasKit의 `prepareLocalFonts`를 await하고 보기 변경만
게시한다. controller는 문서 generation/identity 확인 함수를 전달하고 callback은
await 전후 view/session/renderer와 decisionKey가 여전히 같은지도 확인한다.

GUI에서 확인한 `beginDocument`의 실제 자원 초기화를 포함하는 회귀를 먼저 추가했다.
보정 전 Typeface count=0으로 실패함을 확인했으며 보정 후 사용/미사용/재활성 공급과
문서 또는 renderer decision 변경 중 오래된 갱신 억제를 검사한다. GUI에서는 재감지
직후부터 Typeface count>0, unregistered fallback=0, enabled 픽셀 보존을 검사한다.
page 캡처는 WebKit element screenshot의 crop 오류를 피하도록 실제 canvas PNG를
저장하며 전체 창 캡처도 유지한다. upstream/native/문서 직렬화는 변경하지 않는다.

### Stage 4 제품 보정 로컬 검증 결과 — 2026-09-24

| 검증 | 결과 |
|---|---|
| 보정 전 새 회귀 | 예상 실패: 실제 session beginDocument 후 localTypefaceCount 0 (기대 1) |
| 집중 회귀 | 3 files, 26 passed; 사용/미사용·문서 전환·decision 변경 포함 |
| 전체 Studio | 36 files, 227 passed |
| upstream | 36 passed |
| GUI typecheck | 통과 |
| 관련 GUI/fixture/artifact 계약 | 69 passed |
| product-boundary | 658 files, 통과 |
| Studio build | 통과, 기존 externalization/dynamic-import/chunk 경고 유지 |
| diff whitespace / upstream 상태 | 통과 / clean, release pin 불변 |

로그는 `/tmp/task74-refresh-{red,focused,studio,upstream,contracts,boundary,build,gui-types}.log`다.
실제 CanvasKit parser/native 실행은 로컬 회귀에서 대체된 경계이므로 새 설치본에서의
해결을 아직 선언하지 않는다. 이전 run의 Canvas2D 성공 역시 새 제품 후보의 수용으로
자동 이전하지 않는다. Stage 4와 Windows 사용자 검증은 미완료로 유지한다.

**다음 실행 승인 요청**: 최종 고정한 보정 후보를 `publish/task74`로 non-force push하고
동일 source/workflow SHA로 `ci.yml`, `profile=full`, `scope=full` 1회를 실행한다.
성공하면 그 run의 Linux x64 exact artifact를 새 후보와 동일한 GUI harness에서
`alhangeul-linux-gui.yml`, `scope=local-fonts` 1회로 검증한다. 두 실행 중 실패하면
원시 결과를 기록하고 승인 없는 추가 재실행은 하지 않는다. 새 Windows MSI도 같은
full run에서 확인해 작업지시자에게 제공한다. 릴리즈/PR 게시는 이 승인에 포함하지 않는다.


### Stage 4 보정 후보 원격 검증 승인 — 2026-09-24

작업지시자가 “진행해줘.”로 후보 `c4e9714123cdce801ec876ea9908f428d36b7df7`의
non-force push, full CI 1회와 성공 시 같은 후보의 Linux GUI 1회를 승인했다.
`publish/task74`에 push했으며 [full run 35981563185](https://github.com/postmelee/alhangeul-tauri/actions/runs/35981563185),
attempt 1, workflow/source SHA 동일, `profile=full`, `scope=full`로 실행했다.

### Stage 4 보정 후보 원격 검증 결과 — 2026-09-24

후보 `c4e9714123cdce801ec876ea9908f428d36b7df7`의 full run `35981563185`와
[Linux GUI run 35984829169](https://github.com/postmelee/alhangeul-tauri/actions/runs/35984829169)는
각각 attempt 1에서 success다. 승인한 두 실행만 수행했다. source/workflow/harness SHA는
동일하며 GUI는 full run의 Linux x64 artifact `10801835084`를 재사용했다.

- full CI: Windows x64·Linux x64/arm64 core/product/package와 필수 집계 통과.
- Windows 설치 원시 결과: MSI 일반 lifecycle passed. NSIS는 썸네일 `0x80040154`로
  failed, MSI 강제 재설치는 `3010` 재부팅 필요로 failed이며 두 진단 계약만 passed다.
- Linux GUI: Ubuntu 22.04 x64, WebKitGTK 2.50.4, tauri-driver 2.0.6에서 두 시나리오 통과.
  Canvas2D·CanvasKit HWP/HWPX 적용, 재감지, 파일 삭제·복구, 사용/미사용 재실행을
  20개 화면 관찰과 6회 PID 변경으로 확인했다. CanvasKit 재감지·복구의 Typeface=1,
  unregistered fallback=0과 enabled 픽셀 보존을 검증했다.
- 실제 canvas PNG를 시각 확인했고 내려받은 HWP/HWPX 내보내기 파일을 WASM으로
  다시 열어 Abel 글꼴명과 공개 fixture 본문 보존을 확인했다.
- Windows artifact `10801646330`의 archive digest와 inventory source/file hash를 로컬에서
  검증했다. MSI는 `msi/Alhangeul_0.1.0_x64_en-US.msi`, SHA-256
  `9303bf8a856a0382f81ac868864f286ca6c148cc23f21ebc22e92cc5d9dca008`이다.
- Linux GUI에서 producer archive digest·inventory·설치를 검증한 DEB SHA-256은
  `05154576a1a35a065d0706cc75937a1aed20c087dac20f6a2f50538bb7ef2e17`이다.
- GUI evidence artifact `10801892314`와 exact artifact 목록, 이전 실패 이력은
  `tests/gui/local-fonts/acceptance.json`에 기록했다. recorder의 unverified 값은
  그대로 두고 실제 검토한 범위의 결과를 별도로 기록했다.

Windows 사용자 검증과 새 창 시나리오는 미완료다. 공개 Latin Abel 검증을 한글 전체,
모든 문서, 물리 인쇄/PDF GUI 수용으로 확대하지 않는다. Stage 4 완료 보고·최종 PR은
작성하지 않으며 이번 결과 기록 커밋은 제품 bytes를 변경하지 않는다.

### Stage 4 Windows VDI 사용자 확인 — 2026-09-24

작업지시자가 이전 full run `35972535353`의 artifact `10797838038`, 후보 `8e7d26e`를
NSIS로 설치한 Windows VDI에서 문서 다시 열기·다른 파일 열기·앱 종료 후 재실행 시
모달이 반복 표시되지 않음을 확인했다. 첨부 화면은 제품의 로컬 글꼴 설정 모달이다.
실제 로컬 글꼴 적용은 확인하지 못했다고 명시했으므로 해당 항목은 미검증으로 유지한다.
새 창과 보정 후보 `c4e9714`도 이 보고의 수용 범위에 포함하지 않는다.
기존 후보의 모달 지속성 성공은 유효하며 새 후보에서는 재감지·설정 변경 후 실제 표시와
간단한 재실행 확인을 중심으로 검증한다. NSIS 앱 실행 보고를 Shell 썸네일 CI 실패의
해소로 해석하지 않는다.

### Stage 4 Windows 나눔스퀘어 이름 연결 조사 — 2026-09-25

작업지시자가 EML 본문과 8개 캡처로 나눔스퀘어 적용 이상을 보고하고 조사를 지시했다.
Abel `iii`의 굵기는 작업지시자가 upstream 문단 폭 처리 문제로 설명했으므로 본 제품
조사의 근거와 수정 범위에서 제외한다. 이메일 원문·개인 정보·전체 화면은 저장소에 넣지 않는다.
기존 모달 반복 표시 해결 결과와 Linux Abel 성공은 보존하되 Windows 글꼴 수용은 불합격이다.

공식 배포 `https://hangeul.naver.com/hangeul_static/webfont/zips/nanum-square.zip`의
`NanumSquareB.ttf`를 설치 없이 분석했다. SHA-256은
`f737d58294faec9c632189af3a2a3e48e49c03c0256de09db61e879e2857bfbf`이며 weight=700이다.
name ID 1/4는 `NanumSquare Bold`·`나눔스퀘어 Bold`, ID 16은
`NanumSquare`·`나눔스퀘어`, ID 6은 `NanumSquareB`다.

현재 고정된 fontdb 0.23은 ID 16을 우선하고 없을 때만 ID 1을 읽는다. 제품
`font_catalog.rs`는 그 family와 PostScript만 전달하고, `local-font-records.ts`도
family와 PostScript만 별칭에 넣는다. 따라서 샘플 문서가 요청하는 `나눔스퀘어 Bold`가
목록에서 빠진다. 샘플의 제목과 별표 본문 모두 해당 face를 참조하며 symbol/latin/hangul
참조도 동일하다. 별표만 다른 글꼴로 지정된 문서라는 설명은 이 파일에 해당하지 않는다.

별도의 결함도 확인했다. 같은 파일의 한글/영문 family를 각각 record로 만들기 때문에
`resolveLocalFont('NanumSquareB')`가 동일 face를 후보 2개로 세어 null을 반환한다.
CanvasKit은 prepareLocalFonts에서 fullName(현재 제품은 PostScript명)을 다시 조회하므로
최초 family 매칭만 고쳐서는 이 경로가 해결되지 않는다. upstream 브라우저 구현은 실제
fullName·sfnt 별칭을 보존하지만 제품 desktop adapter는 이를 충분히 보존하지 않는다.

현재 제품 TypeScript를 임시 폴더에 transpile하고 공식 TTF의 실제 이름을 fontdb 규칙에
맞춰 catalog 입력으로 공급했다. native IPC와 브라우저 FontFace만 대체한 조사다.
Bold 단독 및 R/B/EB/L 동시 설치 모델에서 문서 이름 매칭=null, 글꼴 파일 읽기=0,
CSS 등록=0, CanvasKit byte map=0을 재현했다. 같은 코드의 영문 family 단일 대조군은
정확한 이름으로 요청하면 실제 TTF를 1회 읽고 등록/byte map 각 1개로 통과했다.
원본 제품 소스·submodule은 변경하지 않았고 macOS에서 Rust desktop/네이티브 앱은
실행하지 않았다. 임시 재현 스크립트·출력은 `/tmp/task74-font-investigation/`에 있다.

이는 제품 이름 연결 결함의 재현이며 VDI의 실제 설치 파일·경로·renderer까지 확정한
것은 아니다. 작업지시자에게 파일명·설치 방식·경로를 질의했다. 감지 목록 152개는
개별 face의 실제 공급 성공을 뜻하지 않으므로 이 알림으로 수용하지 않는다.

**후속 수정 제안(아직 소스 수정 미승인)**: 현재 native catalog/desktop record 경계에서
실제 legacy/full/typographic 이름을 보존하고 동일 파일·face의 다국어 별칭을 통합한다.
PostScript명만 같은 별도 파일이나 다른 굵기는 임의 통합하지 않는다. 문서의 명시된
Bold 이름을 정확한 face로 연결하고 CSS 등록 이름과 CanvasKit의 재조회까지 검증한다.
기존 `font_catalog.rs`, `local-font-records.ts`, `local-fonts.ts` 및 필요 최소 provider 경계,
해당 테스트와 기존 승인 문서 위치에서 수행한다. upstream/core의 문단 폭 처리와
native 허용 root 확장은 제외한다. 공식 나눔스퀘어 이름·굵기 조합, 다국어 중복,
다른 파일 충돌, 잘못된 face fallback을 집중 회귀로 검사하고 Studio/upstream/build/boundary를
실행한다. Rust Windows/Linux 검증·새 exact artifact GUI 재실행은 후보 고정 후 별도 승인한다.
Stage 4와 최종 보고/PR은 계속 미완료로 유지한다.

### Stage 4 이름·별칭 보정 및 새 설치본 승인 — 2026-09-25

작업지시자가 “진행해줘. 새 설치본으로 windows 환경에서 내가 직접 다시 테스트할게”로
위 보정과 새 설치본 생성을 승인했다. 기존 Task #74/분리 worktree에서 구현하고 후보를
non-force push한 뒤 공유 native/Studio 변경에 필요한 full CI를 실행한다. 새 Windows
artifact를 확인해 인계하며 실제 Windows GUI 수용은 작업지시자가 수행한다.

native 이름 추출은 기존 전이 의존성과 같은 ttf-parser 0.25를 직접 사용하고 별도 작은
모듈로 분리한다. native catalog의 fullName/aliases를 확장하며 폰트 bytes의 name table에서
실제 이름을 읽는다. 동일 face 통합 및 요청별 CSS 별칭 등록은 desktop leaf adapter 안에 둔다.
공식 NanumSquareB.ttf·라이선스·출처/hash를 기존 tests/gui/local-fonts 하위에 고정하고
실제 이름을 읽는 native 회귀와 다국어/다중 굵기/충돌/byte 공급 Studio 회귀에 사용한다.
기존 승인 문서 위치를 갱신하며 upstream/submodule·허용 root는 유지한다.

### Stage 4 이름·별칭 보정 구현·로컬 검증 — 2026-09-25

native `font_names.rs`가 name ID 1/4/6/16을 보존하며 fontdb의 family 목록과 함께
전달한다. 기존 catalog 테스트는 별도 파일로 옮겨 production 파일 250 LOC를 유지했다.
Studio는 같은 path/PostScript/style/weight/source의 다국어 행을 통합하며 실제 fullName을
CSS face 이름으로 사용한다. 직접 등록하지 않는 system-installed 경로는 기존 CSS family를
유지한다. 정확한 PostScript/fullName 우선 선택 뒤 모호한 family는 fallback한다.
byte 조회와 CanvasKit cache key도 선택한 entry를 유지하여 같은 PostScript명의 다른 파일을
잘못 읽지 않는다. CSS의 원래 요청 별칭도 등록하고 bytes 읽기는 경로별 1회로 합친다.

보정 전 새 집중 회귀는 이름 연결·잘못된 파일 조회 2건이 실패했고 보정 후 통과했다.
최종 Studio는 37 files/233 passed(새 회귀 6개), upstream 36 passed, 기존 fixture 계약
3 passed, Studio typecheck/build 및 product-boundary가 통과했다.
Rust 변경 파일 rustfmt 및 `cargo metadata --no-deps --locked --offline` 정합도 통과했다.
Rust desktop 실행·Clippy는 Windows/Linux CI에서 수행한다. 실제 Windows GUI 수용은 미완료다.
기존 조사 metadata의 지원 범위 밖 OS 식별자 문구를 플랫폼 중립 조사 표현으로 바꿔
boundary 검사를 정합화했다. upstream/submodule pin은 변경하지 않았다.
로그는 `/tmp/task74-names-{red,studio,upstream,build,boundary,fixture}.log`다.

### Stage 4 이름·별칭 보정 full CI 실행 — 2026-09-25

후보 `8d7c19e9c9013b0715ac73066af0c893e59ab11d`를 `publish/task74`에 non-force push하고
[full CI 36078615608](https://github.com/postmelee/alhangeul-tauri/actions/runs/36078615608),
attempt 1, source/workflow 동일 SHA, `profile=full`, `scope=full`을 실행했다.
이 run의 새 Windows 설치본으로 작업지시자가 직접 GUI를 재검증한다.

### Stage 4 Windows 회귀 fixture 경로 정합화 — 2026-09-25

full run `36078615608`에서 Windows desktop 검사 188개 중 187개가 통과하고 새 catalog
회귀 1개가 실패했다. 실제 이름 추출(`font_names`)은 Windows에서도 통과했다. 실패는
`source_kind` 기대 file-backed/실제 system-installed이며 원인은 테스트의 임시 root다.
제품 진입점 `desktop_extra_font_dirs()`는 canonical root를 전달하지만 새 테스트는 raw
임시 root를 직접 전달했다. Windows에서는 canonical 파일 경로에 확장 경로 prefix가 붙어
raw root와 prefix 비교가 맞지 않는다. Linux에서는 두 표현이 같아 이 설정 오류가 드러나지 않았다.

테스트 root를 실제 제품 호출처럼 `fs::canonicalize`한 뒤 fixture를 만들고 전달하도록
수정한다. 제품의 경로 정책이나 production 코드는 변경하지 않는다. 실패 run은 보존하고,
요청된 새 설치본을 완성하기 위해 테스트 정합화 후보를 고정해 full CI를 다시 실행한다.
앞선 Studio 233개·upstream 36개 성공은 같은 제품 소스에 대한 로컬 결과이며 새 run의
native/installer 결과와 분리한다. 이 수정 전후 production 소스 diff는 없다.

첫 run `36078615608`은 최종 failure이며 Linux x64/arm64 product/package와 세 core는
success다. Windows 설치본 생성은 desktop 검사 실패로 도달하지 않았다.
테스트 정합화 후보 `639563ad7221d451cd5277c28c3c9b87566d4dec`로
[full CI 36080570543](https://github.com/postmelee/alhangeul-tauri/actions/runs/36080570543),
attempt 1, source/workflow 동일, `profile=full`, `scope=full`을 실행했다.

### Stage 4 Windows 동일 파일의 경로 표현 중복 보정 — 2026-09-25

최종 점검에서 fontdb 0.23의 Windows system scan도 USERPROFILE/AppData/Local의
사용자 글꼴을 읽는 것을 확인했다. 제품 extra scan은 canonical root로 같은 파일을 다시
읽으므로 일반 경로와 Windows 확장 경로 prefix가 각각 source_path에 남을 수 있다.
이를 서로 다른 파일로 취급하면 별칭을 보존해도 매칭이 모호해진다. 승인된 동일 파일/face
통합 범위 안에서 native source_path도 canonical 파일 경로로 통일한다. 허용 root는 확대하지
않고 실제 다른 파일은 계속 구분한다. 두 경로로 같은 fixture를 스캔하는 native 회귀를 추가한다.

중간 후보 `639563a`의 run `36080570543`은 이 추가 보정을 포함하지 않아 인계 후보에서
제외하고 취소를 요청했다. GitHub 인증 401로 취소되지 않았으며 현재 결과는 미확인이다.
결과를 성공으로 간주하지 않으며 경로 보정까지 포함한 최종 후보로
full CI를 실행한다. 제품 검증 성공 없이 설치본을 인계하지 않는다.

`gh auth status`는 invalid를 보고했으나 추가 조사에서 `gh auth token`이 인증 값을
반환하지 못했고, GitHub CLI 전용 키체인 항목은 존재하지만 값 읽기는 실패했다.
토큰 만료는 확인되지 않았다. 샌드박스 밖·일반/로그인 셸·PTY에서도 동일했다.
연결된 GitHub 도구로 run `36080570543`의 20개 job과 최종 result success를 확인했다.
중간 후보의 full gate는 통과했지만 추가 경로 보정은 포함하지 않아 인계하지 않는다.
최종 소스 후보는 `00dbe6b88a6a54c4768351a148b80a883b9185ca`다. 작업지시자에게
일반 터미널의 `gh api user --jq .login` 결과를 요청했다. 인증 접근 복구 전에는
최종 후보 push·새 full CI 실행·설치본 인계를 완료했다고 기록하지 않는다.

### Stage 4 최종 이름·경로 보정 후보 검증 — 2026-09-25

작업지시자가 GitHub CLI 재로그인을 완료했고 `gh api user --jq .login`으로 postmelee
인증 성공을 확인했다. 최종 source/workflow 후보 `a2f48b5013e86f9d21b67f4f36c79895f6a61297`를
non-force push하고 [full CI 36104289925](https://github.com/postmelee/alhangeul-tauri/actions/runs/36104289925)
(attempt 1, profile=full, scope=full)을 실행했다. 중복 경로 native 회귀의 실행 결과와
새 Windows artifact를 확인한 뒤 인계한다. 실제 Windows 표시 수용은 사용자 검증 대기다.


### Stage 4 최종 설치본 인계 — 2026-09-25

full CI `36104289925` attempt 1은 최종 success다. source/workflow SHA는
`a2f48b5013e86f9d21b67f4f36c79895f6a61297`이며 Windows x64·Linux x64/arm64
core/product/package와 필수 설치 계약·집계가 모두 통과했다. Windows desktop 189개,
Linux arm64 desktop 187개가 통과했고 실제 NanumSquareB 이름·한글 별칭과 같은 파일의
중복 경로 회귀 성공을 개별 native 로그에서 확인했다.

[Windows x64 설치본](https://github.com/postmelee/alhangeul-tauri/actions/runs/36104289925/artifacts/10850898849)
archive `10850898849`의 SHA-256은
`f141646409c524d0a208a8fc69e2776ed042049238d5ae4062f06f565067a69c`다.
로컬 다운로드 bytes와 GitHub digest를 대조했으며 기존 desktop verifier로 내부 inventory의
source SHA·모든 파일 크기/hash·PE 계약을 확인했다.
NSIS `nsis/Alhangeul_0.1.0_x64-setup.exe` SHA-256은
`5f8e8940c3f325abff75de65b30d61385e9b627d0c6e5044a118c521d9e57770`,
MSI `msi/Alhangeul_0.1.0_x64_en-US.msi`는
`8ade5d4e51ae6604b923f71b7c6a5e0cc7c28f9d99303ed3e8d78c71bae0ff8c`다.

원시 설치 증거를 내려받아 확인했다. MSI 일반 lifecycle은 passed/exit 0이다.
NSIS는 기존 Shell thumbnail `0x80040154`로 12건 raw failed/exit 1이며 진단 계약만
passed다. MSI 강제 재설치는 3010 재부팅 요구로 1건 raw failed/exit 1이며 진단 계약만
passed다. 재부팅 후 수용·모든 썸네일 성공으로 확대하지 않는다.

작업지시자는 이전과 같은 NSIS 방식으로 새 설치본을 설치하고 기존 나눔스퀘어/문서를
유지하여 사용·다시 감지 후 별표와 한글 본문을 한컴과 같은 배율에서 비교한다.
문서 재열기·앱 재실행 후 표시 유지와 모달 재등장 여부도 확인한다. 글꼴 파일의 사용자용
설치 경로가 확인되지 않았으므로 실제 적용이 계속 다르면 설치 위치/파일명과 비교 화면을
추가 확인한다. Abel `iii`의 문단 폭 맞춤 차이는 upstream 범위로 유지한다.
현재 후보의 Windows GUI·Linux GUI·새 창 수용은 미완료이며 이전 후보의 Linux Abel
성공을 새 후보로 이전하지 않는다. Stage 4 완료 보고·최종 PR은 아직 작성하지 않는다.


### Stage 4 Windows 사용자 적용 확인·릴리즈 전 제안 검토 — 2026-09-26

작업지시자가 새 설치본 안내에 이어 나눔스퀘어와 Abel의 설치 후 재감지 시 정상 적용을
확인했다고 보고했다. 첨부 3개 화면에서 Abel 표시·감지 안내와 문서 글꼴 범주를 확인했다.
사용자 보고에 해당하는 실제 적용 항목을 수용하며 현재 후보의 재실행·새 창, 전체 글꼴,
현재 Linux GUI와 release 수용으로 확대하지 않는다. 개인정보가 포함된 원본 캡처는
저장소에 넣지 않고 `acceptance.json`에 결과 요약만 남겼다.

기존 upstream Toolbar의 `system` 범주는 제품 `getLocalFonts()`를 사용하므로 감지된
로컬 글꼴 목록이 이미 있다. 별도 중복 범주 추가보다 ‘시스템 글꼴’ 명칭/빈 상태 안내의
명확화를 권장하며 실제 목록 누락 여부는 해당 범주에서 구분한다. v0.8.6에도 같은 범주가
존재함을 read-only로 확인했다. 신규 UI 구현은 이번 조사에서 수행하지 않았다.

지정 [sync run 36101759959](https://github.com/postmelee/alhangeul-tauri/actions/runs/36101759959)은
current v0.8.4에서 target v0.8.6 `f1f9c6ae58344ee9368996d3543f76b9345cf227`을
`create_candidate`로 판정했지만 writer job은 skipped다. 저장소 variable
`ALHANGEUL_UPSTREAM_SYNC_ENABLED=false`이며 App client ID/secret은 이름·존재만
확인했다. [Issue #23 완료 기록](https://github.com/postmelee/alhangeul-tauri/issues/23#issuecomment-5277849996)은
actual sync·멱등성 검증 후 이 값을 false로 되돌렸음을 명시한다. 현재 열린 PR은 없다.
이 실행의 success는 판정 성공이며 PR 생성 성공이 아니다.

릴리즈 전에는 현재 #74 수용 결과 정리·반영 후 별도 upstream 수용 Issue에서 writer 운영
정책과 exact v0.8.6 동기화·제품 adapter 호환성을 확인하고 Windows/Linux 최종 후보를
재검증하는 순서를 권장한다. 최신 stable 변경은 조판·저장·입력 안전성에도 걸쳐 있으므로
단순 pin 치환으로 완료하지 않는다. writer 설정 변경·dispatch·pin 갱신은 이번 판단 요청에
포함된 실행 승인으로 간주하지 않고 아직 수행하지 않았다.


### Stage 4 잔여 검증·후속 통합 승인 — 2026-09-26

작업지시자가 글꼴 목록 UI 개선을 제외하고 '#74 남은 검증 정리·반영 → 별도 이슈에서
동기화 운영 설정과 v0.8.6 수용 → 새 Windows/Linux 설치본 최종 릴리즈 검증' 순서의
실행을 명시했다. 이 지시에 따라 기존 #74 결과와 잔여 검증을 정리하고 PR·devel 반영을
진행한다. 후속 작업은 별도 이슈·계획·단계 보고를 유지한다. 공개 release/tag/서명/updater
게시 권한으로 확대하지 않는다. 최종 Windows 실환경 점검은 작업지시자가 새 통합 설치본에서 수행한다.

현재 제품 source `a2f48b5` / full producer `36104289925`의 exact Linux DEB를 기존
`local-fonts` GUI scope로 재사용한다. 제품 bytes와 source pin은 유지한다. harness에만
사용/미사용 선택의 새 native 창 복원을 추가하고 기존 파일 재열기·프로세스 재시작·
삭제/복구·Canvas2D/CanvasKit 공급 검증을 다시 수행한다. 새 창은 UI 명령으로 만들고
별도 WebDriver handle과 동일 프로세스를 확인한 뒤 실제 문서 적용을 관측한다.
문서 위치는 기존 계획·acceptance metadata·LOCAL_FONTS와 승인된 단계/최종 보고 위치를
유지한다. 현재 Windows 사용자 보고를 미검증 시나리오로 확대하지 않으며 최종 Windows
재실행·새 창·전체 통합 점검은 후속 v0.8.6 후보 수용에 명시적으로 남긴다.
