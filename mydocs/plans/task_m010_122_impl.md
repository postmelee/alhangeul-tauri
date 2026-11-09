# Task #122 구현계획서 — rhwp v0.9.0 통합과 Alhangeul v0.1.3 후보 검증

M010 · 2026-11-09 · 구현계획 승인 · Stage 1 미완료 · 선행 보정 구현·검증 완료, 후보 재생성 예정
[수행계획서](task_m010_122.md) · [GitHub 이슈 #122](https://github.com/postmelee/alhangeul-tauri/issues/122)

## 단계 개요

출발점은 `devel`의 `4a68111194f2102370eabf5a323ea4fa107a2da4`다. 현재 앱의 rhwp v0.8.7 커밋은 `1a76570e833917d15817415a53c09ad61ab3203f`, 수용할 v0.9.0 태그 커밋은 `c9095c5f67632e6721e800ccc7fb43ea49d26682`다.

| Stage | 제목 | 주요 산출 | 완료 기준 |
|---|---|---|---|
| 1 | upstream 후보 확보 | 동기화 PR, pin 및 생성물, 변경 영향 목록 | 한 커밋에서 생성한 Rust·Studio·WASM의 출처와 Worker 경로 확인 |
| 2 | 앱 통합 | adapter 보정, v0.1.3 제품 메타데이터, 후보 노트 | Studio 빌드와 제품·노트 계약 검사 통과 |
| 3 | 설치본 검증 | 설치 파일 6종의 식별 정보와 실행 결과 | 형식별 설치·실행, 양쪽 OS의 문서·인쇄·썸네일 시나리오 수용 |
| 4 | 릴리즈 후보 인계 | 버전별 기록·최종 보고·검토용 PR | 각 파일의 해시와 검증 결과를 추적하고 공개 판단에 필요한 항목 제시 |

## 문서 위치 확인

| 파일 | 수행계획서상 위치 | 실제 경로 | 판단 |
|---|---|---|---|
| pin·연동 계약 | 기존 개요·개발·아키텍처 문서 | README.md, docs/DEVELOPMENT.md, docs/architecture/UPSTREAM.md | 일치. 현재 pin 표기와 달라진 계약만 갱신 |
| 릴리즈 노트·상태 | docs/releases/ | v0.1.3.notes.json, v0.1.3.md, README.md | 일치. 준비 상태와 수용 결과를 기록 |
| 단계별 증거·최종 보고 | mydocs/ | working/task_m010_122_stage{N}.md, report/task_m010_122_report.md, 작업일 orders/ | 일치. run·파일 식별 정보와 미결 항목을 연결 |

## Stage 1 — v0.9.0 후보 확보

**산출물.** 자동 동기화 PR, `third_party/rhwp` gitlink, 관련 native Cargo.lock, `rhwp-core.lock`, 생성된 vendor WASM 패키지, Stage 1 보고서.

1. release의 Stable 상태와 태그 커밋을 재조회한다. 원격 main과 devel SHA, 실행 중인 sync와 같은 태그의 열린 PR을 확인한다. 기존 후보가 있으면 base·commit을 대조해 재사용한다.
2. 후보가 없고 실행 중인 작업도 없으면 아래 workflow를 한 번 실행한다. workflow는 main에서 읽고 내부에서 devel을 checkout한다. 해당 dispatch의 run ID와 실제 base SHA를 기록한다.

   ```sh
   gh workflow run rhwp-upstream-sync.yml -R postmelee/alhangeul-tauri --ref main -f target_tag=v0.9.0 -f dry_run=false
   ```

3. 후보 diff에서 gitlink, upstream Cargo.lock 해시, desktop·document-preview·thumbnail-worker·linux-thumbnailer lock, 생성된 JS·타입 선언·WASM의 해시를 대조한다. 대상 태그의 Cargo 기본 feature에는 PDF import와 wasm-api가 있으므로 실제 빌드 인자와 산출물 크기 변화도 기록한다.
4. 대상 Studio의 `src/main.ts`, `src/core/wasm-bridge.ts`, `src/engine/form-action-worker.ts`부터 import를 추적한다. 실제 앱에서 사용하는 Worker, 로드 방식, 함께 배치할 JS·WASM, 기존 제품 adapter와의 차이를 목록화한다.
5. run에서 `pnpm run check:rhwp-pin`, `pnpm run test:upstream`, allowlist와 커밋된 후보 검사 결과를 확인한다. draft PR의 head·base, required checks와 열린 동일 후보 수를 기록한다. 검증된 후보 커밋을 이력과 함께 작업 브랜치에 통합한다.

실패하면 첫 실패 step과 정확한 입력, 해결에 필요한 Alhangeul 파일을 특정한다. 생성기가 PR을 만들기 전에 실패한 경우에도 같은 기준을 적용한다. 필요한 선행 보정이 승인 범위를 바꾸면 보고서에 성공을 기록하기 전에 계획을 조정한다.

커밋 `Task #122 Stage 1: rhwp v0.9.0 동기화 후보와 변경 영향 검증`

### 첫 실행 결과와 승인된 선행 보정 (2026-11-09)

[동기화 run 42561853953](https://github.com/postmelee/alhangeul-tauri/actions/runs/42561853953/job/128980735091)은 main `6dcb05e96ec2075d09d8a60160e1d82f08c0811b`에서 실행해 devel `4a68111194f2102370eabf5a323ea4fa107a2da4`를 기준으로 후보를 판정했다.

- 새 gitlink 대상과 native lock 4종, fresh WASM 및 provenance 생성이 runner에서 성공했다. pin 검사는 v0.9.0 커밋과 관리 산출물 6개를 확인했다. 태그 소스에서 별도로 계산한 upstream Cargo.lock SHA-256은 `6184ebd0c4d86f71314b11e756f1e910001b8eac7f4fc7d4cbd2acfac393c86f`다.
- 제품 경계·버전·릴리즈 메타데이터·pin 검사와 upstream 테스트 39/39가 통과했다. Studio는 283개 중 261개 통과, 22개 실패였다. 실패 파일은 local-font-application(4), consumers(6), controller(6), entry-hooks(5), overrides(1)다.
- 같은 제품 변환 함수를 두 태그의 Studio main.ts에 적용했다. v0.8.7에는 두 지점 모두 삽입됐고 v0.9.0에서는 `upstream local-font hook marker mismatch`가 재현됐다. v0.9.0의 initializeDocument 옵션에 suppressLocalFontPrompt가 추가됐고 promptLocalFontsIfNeeded의 인자는 displayName 하나로 바뀌었다.
- upstream document-font-status가 사용하는 `resolveLocalFontProgramCandidates`가 제품 local-fonts 모듈에 없어 CI에서 예외 및 번들 export 검사가 실패했다. 새 main.ts가 가져오는 `localFontNamesIntersect`도 현 adapter에 없다. 프롬프트 선택·취소, 오래된 문서 콜백, 렌더러 갱신을 관련 동작 검사로 검증한다.
- 태그 소스에서 입력 처리기가 form-action-worker.ts를 module Worker로 열고, Worker가 rhwp-shared/forms/action-runtime.ts를 사용하는 경로를 확인했다. Studio 빌드·설치본 확인은 남아 있다. CI는 Studio 검사에서 종료되어 후속 Studio 빌드, native test/Clippy, allowlist, 후보 커밋·PR 게시를 실행하지 않았다. 저장소의 제품 pin은 v0.8.7이다.

**승인 기록.** 작업지시자의 “그렇게 진행해줘”로 글꼴 선행 PR·일반 병합·재실행을 승인받았다. 후속 “같은 PR에 반영”으로 PDF Worker의 제품 WASM 연결과 선택적 AI 도우미 비활성화도 이 PR에 포함한다. 후보 생성기가 Studio 검사를 통과해야 draft PR을 내므로 2단계에 잡았던 글꼴 호환 보정을 아래 순서로 앞당긴다.

1. **Stage 1.1** — Alhangeul의 `apps/studio-host/local-font-entry-hooks.ts`, `src/core/local-fonts.ts`, 필요한 controller·상대 import 연결 및 위 다섯 파일의 회귀 검사를 보정한다. 기존 v0.8.7과 대상 v0.9.0 각각에서 실제 초기화 구문과 글꼴 후보 해석을 확인한다. 양쪽의 권한 선택·카탈로그·렌더러 수명주기를 보존하고 기존 pin의 제품·Studio 검사를 수행한다. v0.9.0 소스에 대한 집중 검증 결과와 두 태그에서 실행한 범위를 단계 보고에 남긴다.
2. **선행 통합** — 검증된 보정을 devel 대상 PR로 제출한다. 현 v0.8.7 기준의 필수 검사 및 검토를 통과한 뒤 일반 병합한다. 이 PR은 #122를 열린 상태로 유지한다.
3. **Stage 1 재개** — 병합된 devel SHA와 동일 태그 후보의 유무를 확인해 기존 후보를 재사용하거나 동일 입력으로 동기화를 다시 실행한다. 새 runner가 생성한 6개 산출물·lock과 Studio 빌드·native 검사·allowlist·draft PR을 검증하고 후보를 작업 브랜치에 통합한다. 이후 단계는 기존 계획을 따른다.

## Stage 2 — 호환성 보정과 v0.1.3 후보 노트

**산출물.** 1단계에서 충돌을 확인한 Studio host·native bridge와 회귀 검사, 제품 버전 메타데이터, 후보 노트 원문과 버전 기록.

- upstream entry와 제품 leaf adapter 소유 경계를 유지한다. Worker 사용 경로는 Vite 산출물에서 참조한 파일이 실제로 존재하는지 확인한다. 설치본 실행 결과는 3단계에서 보완한다.
- `scripts/check-product-version.mjs`의 검사 대상에 제품 버전 0.1.3을 반영한다. 노트에는 앱에 노출되는 upstream 변경과 Alhangeul 자체 보정을 구분한다. 공개 사이트와 updater는 현재 공개 버전을 유지한다.
- 아래 명령을 실행하고 변경된 adapter의 동작 회귀를 함께 확인한다. 변경 사항을 새로 생성한 upstream 패키지와 함께 검증한다.

```sh
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run test:studio
pnpm run build:studio
pnpm run test:release-notes
pnpm run check:release-notes
```

커밋 `Task #122 Stage 2: 데스크톱 호환성 보정과 v0.1.3 후보 노트 작성`

## Stage 3 — Windows·Linux 설치본 수용

**산출물.** 제품의 40자리 SHA, workflow·검증 도구 SHA, producer run ID, artifact ID·archive digest, 파일별 이름·크기·SHA-256 및 설치·GUI 결과.

2단계에서 검증한 제품 커밋을 가리키는 원격 ref를 사용한다. dispatch 직전 ref가 같은 SHA인지 확인한다. `alhangeul-desktop.yml`에 `mode=artifact`, `build_ref=<제품 SHA>`, `artifact_platform=all`, `validation_profile=full`, `run_tests=true`, `publish_release=false`를 전달한다. 필수 job과 파일 6개가 모두 있는지 확인한다.

| 설치 파일 | 파일별 검증 | 대표 GUI와 추가 검증 |
|---|---|---|
| Windows x64 NSIS, MSI | 형식별 설치·기동·제거, 파일 연결과 Explorer 썸네일 등록·복구 | 대표 설치본의 문서 작업과 실제 Shell 첫 페이지 bitmap |
| Linux x64 DEB | 설치·기동, MIME·thumbnailer 등록 | Nautilus·Thunar 첫 페이지, 문서 작업과 GTK/CUPS 출력 |
| Linux x64 RPM | 해당 RPM 설치·기동·제거와 helper 등록 | Fedora 환경 및 실제 실행한 파일 관리자 확인 범위 기록 |
| Linux x64 AppImage | 해당 파일 직접 실행 및 문서 열기 | UI에서 앱 버전·문서 표시 확인 |
| Linux arm64 DEB | arm64 환경에서 설치·기동·제거, helper 렌더 | arm64 수용 결과를 x64 결과와 별도 기록 |

양쪽 대표 설치본에는 HWP와 HWPX를 각각 열고 편집·저장·재열기 후 내용·형식을 대조한다. 글꼴 재감지 후 렌더링, 직접 PDF의 페이지 수·한글 검색·내용, 시스템 인쇄의 출력·취소 후 편집 복귀를 확인한다. 사용하는 Worker 경로를 실제로 작동시켜 자원 로드와 완료 결과를 확인한다.

기존 `alhangeul-windows-pdf.yml` 및 `alhangeul-linux-gui.yml`에는 해당 제품 SHA와 성공한 `native_run_id`를 넘긴다. 추가 설치 검증은 같은 run에서 가져온 원본 파일로 수행한다. 서명이 필요한 공개용 검증기는 별도 서명 단계에 둔다. 설치·GUI·해시 증거가 빠진 항목은 미결로 기록한다.

커밋 `Task #122 Stage 3: Windows와 Linux 설치 파일 6종과 대표 문서 검증`

## Stage 4 — 후보 인계

**산출물.** 버전 기록·노트, 6종 파일과 근거를 연결한 단계·최종 보고서, 오늘할일 및 devel 대상 PR.

- 3단계 결과에 따라 노트를 교정한다. 설치 형식별로 검증한 파일과 공개 전 다시 확인할 사항을 버전 기록에 연결한다. production 키 서명·tag·Release·Pages·updater 전환은 후보 인계 이후 별도 승인 사항으로 제시한다.
- `pnpm run check:release-notes`, `git diff --check` 및 최종 커밋 후 작업 트리를 확인한다. 최종 보고 승인 후 `publish/task122`에서 `devel`로 PR을 열고 required checks를 확인한다.

커밋 `Task #122 Stage 4 + 최종 보고서: Alhangeul v0.1.3 릴리즈 후보 인계`

## 단계 의존성과 검증

각 단계의 변경과 보고서를 함께 커밋하고 검증 명령·결과·실제 실행 환경을 남긴다. 다음 단계는 이전 단계 결과에 대한 승인 후 시작한다. 같은 후보에서 성공한 검사는 SHA와 영향 경로를 대조해 재사용한다. 제품이 바뀌면 영향을 받는 검사를 다시 선정하고, 설치 파일이 달라지면 새 파일의 해시와 설치 결과를 확인한다.

## 위험과 대응

- 정기 동기화와 수동 실행이 겹치면 동일 태그·base의 진행 중 run을 끝까지 확인한다. branch만 남은 경우 workflow의 판정과 branch 내용을 확인한 뒤 복구 범위를 정한다.
- 구형 adapter, Worker URL 또는 새 Rust 의존성 탓에 빌드나 설치 실행이 실패할 수 있다. 로그를 해당 단계 및 제품 SHA에 연결하고 소비 경로의 최소 보정부터 검증한다.

## 승인 요청 사항

이 구현계획과 Stage 1 착수를 승인받는다. Stage 1 실행 범위는 기존 v0.9.0 후보 재사용 또는 자동 draft PR 생성, 후보 검증·로컬 통합과 단계 보고까지다.
