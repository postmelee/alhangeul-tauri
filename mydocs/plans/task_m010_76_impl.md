# Task #76 구현계획서

수행계획서: [task_m010_76.md](task_m010_76.md)
GitHub Issue: [#76](https://github.com/postmelee/alhangeul-tauri/issues/76)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 운영 설정과 후보 생성 | writer gate, sync run, Draft PR | stable provenance, 반복 입력 멱등성 |
| 2 | v0.8.6 통합 | gitlink·WASM·locks·관리 참조, 최소 adapter 보정 | pin/neutral/native 회귀 |
| 3 | 설치본과 인계 | full CI, Linux GUI, Windows 점검 안내 | exact artifact/inventory/hash, 실제 화면·저장 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| UPSTREAM.md, LOCAL_FONTS.md | docs/architecture/ | 기존 위치 | OK | 실제 변경에 필요한 부분만 |
| DEVELOPMENT.md, README.md | 기존 위치 | 기존 위치 | OK | managed references |
| WINDOWS_FONT_ACCEPTANCE.md | docs/operations/ | 필요 시 동일 경로 | OK | 사용자 최종 설치본 점검 |
| 계획·단계·최종 보고 | mydocs/ | plans/, working/, report/ | OK | 내부 이력 |

## Stage 1 — 운영 설정과 후보 생성

### 산출물

- ALHANGEUL_UPSTREAM_SYNC_ENABLED=true 운영 설정.
- v0.8.6 sync run과 Draft 후보 PR, 반복 dispatch 증거.
- mydocs/working/task_m010_76_stage1.md.

### 변경 내용

- #74 병합 devel에서 기존 writer를 활성화하고 target_tag=v0.8.6, dry_run=false로 실행한다.
- 자동 검증이 실패하면 실패 지점과 수정 범위를 기록하고 성공 전 후보 수용을 선언하지 않는다.
- 후보 head를 보존한 반복 실행으로 existing_pr·추가 커밋 없음 확인.

### 검증

- live variable, run logs, candidate head pin, 반복 run decision.
- pnpm run test:automation, git diff --check.

### 커밋

`Task #76 Stage 1: 동기화 운영과 stable 후보 생성 검증`

## Stage 2 — stable 통합과 호환성 수용

### 산출물

- third_party/rhwp gitlink, vendor WASM, rhwp-core.lock, Cargo.lock과 관리 참조.
- 필요한 제품 adapter·회귀와 mydocs/working/task_m010_76_stage2.md.

### 변경 내용

- 자동 후보를 local/task76에 통합한다. 직접 upstream 소스를 패치하지 않는다.
- core·Studio·WASM release 기준을 일치시키고 기존 제품 소유 adapter를 새 API에 맞춘다.
- #74 글꼴 설정·별칭·새 창·재시작 회귀를 유지한다.

### 검증

- pnpm run check:rhwp-pin, check:product-boundary, check:product-version, check:release-metadata.
- pnpm run test:upstream, test:studio, build:studio.
- Linux CI native test:desktop·clippy:desktop, git diff --check.

### 커밋

`Task #76 Stage 2: rhwp v0.8.6 core·Studio·WASM 수용`

## Stage 3 — 설치본과 최종 인계

### 산출물

- Windows x64·Linux x64/arm64 full CI와 exact Linux GUI 증거.
- docs/operations/WINDOWS_FONT_ACCEPTANCE.md와 stage3/final 보고서.

### 변경 내용

- 최종 제품 source SHA에서 full producer를 실행하고 동일 producer 설치본을 Linux GUI에 전달한다.
- MSI/NSIS 원시 제한을 구분하고 archive digest, inventory, NSIS SHA256을 확인한다.
- Windows 설치→글꼴 감지→실제 표시→새 창/재시작→저장→재열기 점검을 사용자가 수행하도록 링크와 예상 결과를 정리한다.
- 자동 후보와 최종 수용 PR 관계를 기록하고 승인된 devel 반영 후 불필요한 작업 브랜치만 정리한다.

### 검증

- full CI와 Linux full/local-fonts GUI 통과, 저장 산출물 확인.
- archive digest/inventory/source SHA 대조, git diff --check.

### 커밋

`Task #76 Stage 3 + 최종 보고서: 새 설치본 검증과 Windows 최종 점검 인계`

## 검증·커밋·단계 의존성

- 각 단계의 검증 결과와 보고서를 함께 커밋하고 다음 단계로 진행한다.
- 실패는 보고에 보존한다. 필수 검증 실패 상태로 완료 처리하지 않는다.
- 실행 의존성에 따라 후보 preflight의 호환성 수정은 Stage 1 실패 해결과 Stage 2 구현을 연결해 진행할 수 있으며 실제 순서와 근거를 보고한다.

## 위험과 대응

- 새 API 호환성 수정은 제품 소유 경계로 제한한다.
- 사용자 Windows 최종 수용은 대기 상태로 유지하며 공개 release 작업을 하지 않는다.

## 승인 근거

수행계획서에 기록한 2026-09-26 사용자 순차 진행 지시를 적용한다. 운영 gate는 계속 활성화하며 자동 merge는 수행하지 않는다.

## Stage 1 조사 보완

- 기존 갱신기/검증기/allowlist는 desktop Cargo.lock만 관리하고 이후 생긴 세 native consumer lock을 놓쳤다. 네 lock을 함께 갱신·검증하도록 보완하고 stale lock 회귀를 추가한다.
- writer 비활성 때문에 create_candidate가 skip된 이유를 summary에 직접 표시한다. 기본 dry_run과 쓰기 권한 경계는 유지한다.
- 첫 운영 실행: 36223270009, baseline a1d8ac4669af370f2c428e1b73c222eb664c3c26. 이 실행은 보완 전 경로를 사용하므로 후보가 생성돼도 네 lock 수용은 별도 확인한다.
- v0.8.6은 선택적 hwpctrl plugin을 compile-time 상수로 분리한다. Alhangeul은 해당 플러그인 호스트가 아니므로 upstream standalone 모드와 동일하게 `__RHWP_HWPCTRL__=false`를 정의한다. upstream source나 추가 UI 기능은 변경하지 않는다.
- v0.8.6 사전 source 점검에서 Studio 230/233 통과. 1건은 의도적으로 남은 old pin이며 2건은 upstream의 자동 글꼴 prompt 제거와 toolbar inline→hidden 전환에 대한 과거 문자열 가정이었다. 원본 browser 함수 본문 보존과 모든 남은 inline-hidden의 CSP owner 검증으로 계약을 정리한다. toolbar 표시 복원은 inline display뿐 아니라 새 hidden 속성도 해제한다.
- 사전 TypeScript 실패 11건은 v0.8.4 binding에 없는 새 v0.8.6 WASM API이며 새 binding 수신 전 수용으로 기록하지 않는다.

- 첫 실행은 2026-09-26 15:27 KST에 upstream baseline의 저장 확인 함수가 새 options 인자를 받는 변경을 과거 정규식이 거부해 실패했다. 취소 요청 시 이미 실패 종료였다. 원본 로그는 run 36223270009에 보존한다.
- 저장 확인 adapter는 upstream 인자를 그대로 전달하는 Parameters 기반 rest signature로 맞춘다. Tauri native 저장 확인은 유지한다.
- 후보 workflow는 clean devel만 사용하므로 Stage 1.1의 backward-compatible 보완을 선행 PR로 devel에 반영한 뒤 Stage 1.2 후보 생성을 재실행한다. #76은 선행 PR에서 close하지 않는다. 최종 설치본 검증과 최종 보고는 Stage 3에서 수행한다.

## GUI harness 수용 준비

v0.8.6의 공개 source에서 시작 시 빈 문서 자동 열기·최초 스킨 안내가 추가된 것을 확인했다. 기존의 영구 빈 editor/status 문구 가정과 #74 이전 글꼴 modal 문구를 그대로 쓰면 알려진 자동화 실패가 되므로, 알려진 고유 modal만 처리하고 새 문서의 실제 canvas·상태를 기다리는 helper로 맞춘다. 알 수 없는 modal·중복 버튼은 실패하며 같은 버튼을 반복 클릭하지 않는다. native print도 스킨 안내와 제품 글꼴 사용 안 함 선택을 구분하고 문서 본문·포커스 사후 조건을 유지한다. Native UI 테스트 가이드에 따라 neutral 계약·typecheck 뒤 새 exact 설치본의 local-fonts/full GUI에서 검증한다. 이 변경은 제품 기능·public release 승인과 무관하다.

GUI 준비 검증: `pnpm run typecheck:gui` 통과, 공통 GUI 계약 22개·native print 계약 5개 통과. 실제 OS에서 새 첫 실행 화면의 selector/포커스 수용은 설치본 GUI 실행 전까지 미검증이다. 원본/업스트림의 DOM을 직접 수정하거나 localStorage 설정을 주입해 안내를 건너뛰지 않는다.


## v0.8.6 시작 문서 native 경계 보완

upstream `openBlankDocumentIfIdle`은 WASM에 빈 문서를 직접 만들어 DesktopHost.pendingNewDocument/Rust 세션을 거치지 않는다. 기존 `saveCurrent`는 native session을 요구하므로 이를 그대로 수용하면 최초 빈 문서의 저장이 실패한다. Alhangeul은 기존 idle 시작과 `파일 → 새로 만들기`의 native 생성 경로를 유지한다. 새 exact entry transform은 Tauri에서 해당 자동 시작만 반환하며 browser에서는 원본 동작을 보존한다. renderer·upstream source·일반 문서 생성 함수는 수정하지 않는다. strict marker 검증, Tauri/browser 분기 회귀, 새 설치본의 기존 문서·새 문서 저장으로 확인한다. Windows 안내와 GUI 준비 조건도 이 제품 동작으로 정정한다. 스킨 선택 안내는 유지한다.

## Stage 3 첫 native 실행 보완

run 36225178661에서 Linux x64/arm64 core 각각 88개 실제 결과·resource budget은 모두 통과했으나 fixture 명세의 이전 pin이 남아 `rhwp-pin-mismatch`로 실패했다. 고정 fixture bytes/hash가 변하지 않았음을 확인한 뒤 명세의 수용 pin을 v0.8.6으로 갱신하고 neutral 단계에서 현재 lock과 불일치를 잡는다. Windows fixture 4개도 bytes/hash 동일성을 확인했다.

새 upstream은 HWPX 필수 `Contents/content.hpf`·`Contents/header.xml` 없는 ZIP을 거부한다. preview만 넣었던 세 Rust fixture는 두 항목에 잘못된 XML을 넣어, HWPX 식별은 되지만 직접 parsing은 실패하는 원래 시험 조건을 복구한다. 일반 ZIP+preview는 계속 거부한다는 음성 회귀도 추가한다. production parser·resource 제한·upstream은 변경하지 않는다. 기존 300 LOC 초과 preview 계약 파일에는 이 fixture 관련 최소 변경만 두며 범위 밖 재구성을 하지 않는다. 보완 SHA에서 full CI를 다시 수행하고 첫 실패를 최종 보고에 보존한다.

v0.8.6은 preview 압축 해제 전에 10 MiB 상한으로 `None`을 반환한다. 기존 제품의 16 MiB 방어는 유지되며 더 엄격한 upstream 거부 결과를 검증한다. 기존 `docs/architecture/WINDOWS_THUMBNAILS.md` resource 표의 해당 한 행에 실효 제한을 기록한다. 공식 architecture 위치를 그대로 유지하는 문서 보정이다.

두 번째 full 36225908122에서 preview 계약 12개 중 11개는 통과했지만 단순 text인 `not valid XML`은 upstream에서 빈 문서로 허용돼 직접 실패 조건을 충족하지 못했다. pinned WASM으로 실제 parser를 조사하여 text/invalid UTF-8은 수용되고 불일치 닫는 태그는 XML 오류로 거부됨을 확인했다. 세 fixture를 `<broken></mismatch>`로 고정하고 Linux native profile로 우선 재검증한 뒤 전체 설치본을 생성한다. 테스트 성공 조건을 낮추지 않는다.

집중 native 36226889223은 성공했다. 세 번째 full 36227541535에서는 Windows worker 3개까지 통과한 뒤 COM handler의 별도 BMP fixture(`apps/thumbnail-handler/tests/support/mod.rs`)에 같은 package 항목 누락이 남아 fallback이 E_FAIL로 실패했다. 후속 2개 실패는 공유 mutex poison이다. repository의 Preview ZIP 생성 지점을 재검색해 네 번째 helper도 동일하게 보완한다. 제품 DLL/worker·성공 HRESULT 기준·deadline은 변경하지 않는다. 새 source에서 전체 검증을 수행한다.
