# Task #74 구현계획서 — 로컬 글꼴 상태·선택·적용 통합

수행계획서: [`task_m010_74.md`](task_m010_74.md)
GitHub Issue: [#74](https://github.com/postmelee/alhangeul-tauri/issues/74)
마일스톤: M010 / bug
작성일: 2026-09-24
상태: 2026-09-24 구현계획과 Stage 1 승인·완료 보고 뒤 “진행해줘.”로 Stage 2 착수 승인. Stage 2 구현·플랫폼 중립 검증 통과, native 검증 미실행. 원격 push/CI 실행은 미승인이다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 소비자 연결·상태 통합 | exact import resolver, 누락 export, 실제 upstream 연결 회귀 | 플랫폼 중립 집중 회귀·전체 Studio test/build |
| 2 | 선택 지속·복원·안내 | native 설정, 문서 초기화/감지 hook, 설정 UI | 선택·창·동시성·저장 실패 및 Windows/Linux native test |
| 3 | 실제 공급·캐시·적용 | 필요 bytes/FontFace 공급, renderer 갱신, 실패 상태 | 실제 소비자·공개 글꼴·무효화·문서 상태 회귀 |
| 4 | 지원 환경 수용·문서 | exact 후보 full, Windows/Linux 설치 검증, 공식 문서·보고 | 설치본 시나리오와 renderer별 증거·한계 |

각 Stage의 소스와 완료보고서를 묶어 커밋하고 다음 Stage 진입 승인을 받는다. 현재 승인된 범위는 Stage 2 구현·검증까지이며 원격 push/CI 실행 승인은 포함하지 않는다.

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
