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
