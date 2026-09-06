# Task #57 구현계획서 — Windows 썸네일 설치 환경별 진단·대응

수행계획서: [task_m010_57.md](task_m010_57.md)
GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
마일스톤: M010
상태: 구현계획 승인 대기

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 진단·관측 계약 | registry/COM/Shell 진단 helper, source-contract tests | 스키마·bitmap 소유권·실패 분류·민감 정보 배제 |
| 2 | Actions 설치별 격리 재현 | NSIS-only/MSI-only matrix, installer 선택, fixture probe | Windows 실제 exact-SHA install·Shell·rollback·제거 |
| 3 | 관측에 따른 대응 | 최소 설치 보정 또는 진단·MSI 안내, 조건부 client 결과 | 검출 조건의 반례·원래 재현 조건·취소/오류 보존 |
| 4 | 회귀 수용·인계 | 최종 근거·기존 문서 보완·#58 인계 | 최종 installer bytes·기존 연결·문서·worker 상태 |

- 작업 경로: `.claude/worktrees/task57`, 브랜치: `local/task57`.
- 시작 source: `c93ac8c58a796a45227f764f37b7aaffaa81899e`, 수행계획 커밋: `f05e01e`.
- #19 메인 worktree와 #35 GUI E2E 범위를 보존한다. 브랜치 최신화가 필요하면 차이를
  확인하고 별도 승인받으며 임의 rebase·merge하지 않는다.
- 현재 단계는 문서만 작성한다. 아래 native/원격 명령은 실행 계획이며 실행 결과가 아니다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 수행/구현계획 | `mydocs/plans/` | `task_m010_57.md`, `task_m010_57_impl.md` | OK | 승인·단계 계약 |
| 단계 보고 | `mydocs/working/` | `task_m010_57_stage{N}.md` | OK | 실패 관측과 검증 한계 포함 |
| 최종 보고 | `mydocs/report/` | `task_m010_57_report.md` | OK | #58 인계와 잔여 수용 gate |
| 오늘할일 | `mydocs/orders/` | 실제 작업일 `yyyymmdd.md` | OK | 기존 task 행 보존 |
| 아키텍처 | `docs/architecture/` | `WINDOWS_THUMBNAILS.md` | OK | 확정된 registry/진단 계약 |
| 릴리즈 검증 | `docs/operations/` | `DESKTOP_RELEASE.md`, `RELEASE_CHECKLIST.md` | OK | clean installer별 gate |
| 버전별 근거 | `docs/releases/` | `v0.1.0.md` | OK | 현장/CI 근거의 범위 구분, 공개 상태 불변 |
| 사용자 진입 | 루트 | `README.md` | OK | 필요 시 제한·MSI 대안과 기존 문서 링크 |

## Stage 1 — 진단·관측 계약

### 산출물

신규:

- `scripts/windows-thumbnail-diagnostics.ps1` — standalone 상태 수집·자식 probe 실행
- `scripts/windows-thumbnail-interop.cs` — COM·Shell/GDI 진단 interop
- `tests/windows-thumbnail-diagnostics.test.mjs` — 독립 실행·출력·실패·자원 소유권 계약

수정:

- `scripts/windows-thumbnail-smoke.ps1` — inline interop의 중복 제거 및 결과 연결 준비
- `tests/windows-installer-smoke.test.mjs` — interop 분리와 UTF-8 BOM 계약 반영
- `package.json` — 기존 `test:automation`에 신규 검사 포함
- `mydocs/working/task_m010_57_stage1.md`, 오늘할일

### 변경 내용

1. 진단 entry는 `InputPath`, `OutputPath`, `Mode`, `Size`, `TimeoutSeconds` 이내의
   명시적 입력을 사용한다. Mode는 `state`, `association`, `activate`, `shell`,
   `cache-only`, `force-extract`로 제한하고 shell 문자열 실행·임의 CLSID/registry 쓰기를 받지 않는다.
   Windows x64 PowerShell 5.1의 STA 실행을 기준으로 하고 실제 apartment를 결과에 기록한다.
2. JSON `schemaVersion`, `mode`, `status`, `phase`, `hresult`, `bitmapPresent`,
   `width/height`, `elapsedMs`, `cacheFlags`와 수집 실패 상태를 구분한다.
   `missing`/`unreadable`을 0이나 성공으로 바꾸지 않는다. HRESULT는 8자리 16진수로 보존한다.
3. 환경 정보는 OS build·image version·64비트 여부·UAC·token elevation/integrity·세션 ID,
   제품 범위의 registry view·등록·파일 hash를 allowlist로 수집한다. SID·계정명·개인 경로·
   전체 registry dump·문서 내용은 로그에 남기지 않는다. local profile 경로는 역할 토큰으로 치환한다.
4. 연결은 `AssocQueryStringW`로 조회하고 직접 COM 생성은 고정 Alhangeul CLSID만 사용한다.
   Shell 요청은 `IShellItemImageFactory::GetImage`의 `SIIGBF_THUMBNAILONLY`를 사용한다.
   `S_OK`여도 bitmap이 null이거나 크기가 유효하지 않으면 성공으로 판정하지 않는다.
5. 캐시는 `IThumbnailCache::GetThumbnail`의 `WTS_INCACHEONLY`와
   `WTS_FORCEEXTRACTION`을 별도 호출해 구분한다. 반환 cache flag와 실패 API 단계를 기록한다.
   `GetImage`용 HBITMAP은 `DeleteObject`, `ISharedBitmap`에서 빌린 handle은 객체 소유권대로
   처리한다. 강제 in-process 옵션·DisableProcessIsolation은 사용하지 않는다.
6. `state`와 association 조회는 읽기 전용이다. COM 생성·Shell 요청은 DLL/worker 실행 및
   Windows 캐시 변경 가능성이 있는 실행 진단으로 구분한다. 진단을 전부 무부작용이라고 부르지 않는다.
7. 각 실행 probe는 신선한 자식 PowerShell process로 제한한다. 부모가 15초 기본 timeout을
   적용하고 종료 대상은 자신이 시작한 PID뿐이다. stdout 손실·비정상 종료·JSON 누락은 실패다.
   모든 COM/GDI handle 해제를 보장하고 예외 원문 대신 오류 단계·코드 중심으로 보고한다.
8. helper별 300 LOC·함수 50 LOC를 목표로 한다. interop이 상한을 넘으면 작은 역할별 파일로
   분리하되 동일 scripts 경계에 두고 실제 파일 목록은 단계 보고서에 명시한다.

### 검증

```sh
node --test tests/windows-thumbnail-diagnostics.test.mjs tests/windows-installer-smoke.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
git diff --check
```

- source-contract는 금지 mutation·명시적 null 검사·해제 경계·타임아웃·스키마를 검사한다.
- macOS에서 C#·PowerShell COM 실행 검증을 했다고 주장하지 않는다. Windows Add-Type 컴파일과
  실제 API 판정은 Stage 2의 native gate에서 수행하며 그 전까지 실행 수용은 미완료다.
- dependency/submodule이 없으면 고정 pin·frozen pnpm을 사용해 준비하고 사용자 작업 폴더의
  node_modules나 upstream checkout을 변경하지 않는다.

### 커밋

```text
Task #57 Stage 1: Windows 썸네일 진단과 Shell bitmap 관측 계약 추가
```

## Stage 2 — Actions 설치별 격리 재현

### 산출물

- `.github/workflows/alhangeul-desktop.yml`
- `scripts/windows-installer-smoke.ps1`, `scripts/windows-installer-smoke-support.ps1`
- `scripts/windows-thumbnail-smoke.ps1`, Stage 1 진단 helper
- `tests/windows-installer-smoke.test.mjs`, `tests/actions-workflows.test.mjs`,
  `tests/windows-packaging.test.mjs`, 필요 시 동일 검증의 fixture helper 분리
- `mydocs/working/task_m010_57_stage2.md`, 오늘할일

### 변경 내용

1. 기존 artifact build에 optional `artifact_platform` 선택(`all` 기본값, `windows-x64`)을
   추가한다. 이번 원격 시험은 Windows만 빌드한다. 기본 Linux matrix는 유지하고 updater·
   release 경로의 의미나 permission을 바꾸지 않는다. 입력·matrix 선택은 source test로 고정한다.
2. installer smoke를 `installer: [nsis, msi]`, `fail-fast: false`의 별도 `windows-2025`
   job으로 분리한다. 한쪽 실패가 다른 쪽의 증거 수집을 중단하지 않게 한다.
3. smoke entry에 `InstallerKind`를 추가한다. 동일 bundle inventory·MSI/NSIS·검증 binary를
   검증하되 실제 실행은 선택한 설치본만 한다. 기본 수용 경로에서 순차 실행을 제거한다.
4. 실제 순서는 초기 오염 점검 → 선택 installer 최초 설치 → fresh Shell 최초 요청 →
   별도 프로세스 cache/force-extract/직접 COM 진단 → lifecycle 검증 → 정리다.
   MSI rollback 주입은 최초 성공 관측 전에 실행하지 않는다. 앱 launch 및 WebView 시험도
   최초 Shell 요청 뒤에 배치한다. registry sentinel은 복원 검사 입력임을 기록한다.
5. `.hwp`/`.hwpx`의 임의 첫 파일 검색을 명시적 fixture 목록으로 바꾼다. pinned rhwp의
   작은 문서·큰 문서·HWPX를 선택해 경로·bytes·SHA-256·선정 근거를 기록한다. JPG 대조군은
   공개 asset 또는 테스트에서 생성한 비개인 이미지로 한정한다. 원본과 복사본 hash를 검증한다.
6. `GetImage` 최초 요청에는 다른 probe가 쓰지 않은 복사본을 사용한다. cache-only·강제 추출은
   별도 복사본과 phase에 둔다. 성공 후의 캐시 hit를 새 handler 추출 성공으로 대체하지 않는다.
   고정 256px로 비교하고 기존 worker timeout/resource 상한은 변경하지 않는다.
7. 설치 전 HKCU/HKLM 제품 등록·worker 상태, 설치 후 처리기 선택과 실제 bitmap,
   재설치 후 동작, 제3자 takeover 후 제거·snapshot 복원, MSI 실패 주입 rollback을 확인한다.
   진단 helper는 fixture registry 조작을 소유하지 않고 기존 installer harness가 담당한다.
8. 결과 artifact는 `alhangeul-desktop-windows-x64-{installer}-installer-smoke`로 분리한다.
   phase별 JSON·선택 installer metadata·실제 hash·workflow/source SHA·image version을
   `always()`로 보관한다. 필수 증거 누락은 검사 실패이며 UI 성공과 API 성공을 구분한다.

### 검증

```sh
node --test tests/windows-thumbnail-diagnostics.test.mjs tests/windows-installer-smoke.test.mjs tests/windows-packaging.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
git diff --check
```

Windows job은 기존 pinned dependency 준비와 native test·Clippy·bundle build를 유지하고
설치된 산출물에 다음 형식으로 실행한다. 경로는 job이 만든 task 소유 디렉터리다.

```powershell
& .\scripts\windows-installer-smoke.ps1 -ArtifactRoot artifacts/windows-x64 -OutputDirectory diagnostics/windows-installer-smoke-nsis -ExpectedVersion 0.1.0 -InstallerKind nsis
# MSI는 위 명령과 같은 VM이 아니라 별도 job에서 실행한다.
& .\scripts\windows-installer-smoke.ps1 -ArtifactRoot artifacts/windows-x64 -OutputDirectory diagnostics/windows-installer-smoke-msi -ExpectedVersion 0.1.0 -InstallerKind msi
```

실제 ExpectedVersion은 package.json에서 읽고 유효성을 확인한다. 위 버전은 현재 기준선 예시다.

### 원격 실행과 승인 경계

- Stage 2 진입 시 대상 SHA와 함께 원격 non-force push·비게시 dispatch 승인을 요청한다.
  최종 PR 전 실제 CI 검증에 필요한 `publish/task57` 조기 게시 예외이며, `local/task57`
  원격 push·release/tag·PR 자동 생성은 하지 않는다. 충돌한 원격 branch가 있으면 멈춘다.
- 실행 후보 커밋은 로컬 검사 통과 뒤 만든다. 원격 검증 후 결과·단계 보고를 추가 커밋한다.
  실패한 probe를 관측한 것은 허용되지만, 실패한 검증을 Stage 완료로 바꾸지 않는다.
- 첫 비교 1회, Stage 4 최종 후보 1회를 기본으로 제안한다. 추가 run은 실패 원인·변경점과
  입력을 보고 후 승인받는다. 동일 상태 반복 retry로 통과를 기다리지 않는다.

```sh
git rev-parse HEAD
# 확인·승인한 40자리 SHA를 build_ref에 직접 입력한다.
git push origin local/task57:publish/task57
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri --ref publish/task57 -f mode=artifact -f artifact_platform=windows-x64 -f build_ref=<승인한-40자리-SHA> -f run_tests=true -f publish_release=false
```

실행 전·후 remote ref/workflow SHA/source SHA 정합성을 확인한다. run ID를 명시해 상태·job
conclusion·artifact를 읽고 hash를 재계산한다. Actions에서 재현하지 못하면 client 환경까지
완료됐다고 쓰지 않는다. 과거 run의 파일을 다시 빌드한 bytes와 동일하다고 취급하지 않는다.

### 커밋

```text
Task #57 [Stage 2.1]: NSIS와 MSI clean job 분리 및 native 검증 후보 구성
Task #57 Stage 2: 설치별 격리 관측 결과와 단계 보고
```

## Stage 3 — 관측에 따른 대응

### 산출물

- 공통 진단 helper와 실패 분류 tests
- 조건부 `apps/desktop/src-tauri/windows/nsis-hooks.nsh`,
  `apps/desktop/src-tauri/windows/main.wxs`,
  `apps/thumbnail-handler/src/registration/windows.rs` 및 관련 registration/packaging tests
- 안내가 확정되면 `README.md`, `docs/architecture/WINDOWS_THUMBNAILS.md`의 최소 보완
- `mydocs/working/task_m010_57_stage3.md`, 오늘할일

### 변경 내용

| Stage 2 관측 | 다음 판단·조치 | 금지할 단정 |
|---|---|---|
| NSIS 실패, MSI 성공 | 실패 API·scope·호스트 문맥을 비교하고 최소 보정/안내 제안 | UAC만 원인으로 확정 |
| 두 설치본 모두 성공 | client OS·로그인 세션·현장 설치 이력 추가 비교 | 현장 문제 해결 선언 |
| 두 설치본 또는 JPG도 실패 | 환경·probe 구현·공통 Shell 경로부터 검토 | 전부 Alhangeul 등록 결함으로 분류 |
| 최초/force-extract 실패, cache 경로 성공 | 캐시가 실패를 가리는지 확인 | 캐시 성공을 새 생성 성공으로 수용 |

- 제품 보정은 Stage 2 결과를 붙인 구체적 변경안 승인 후 수행한다. 안전하게 검출 가능한
  조건만 안내하고 UAC=0 전체 차단·몰래 HKLM 등록·강제 기본 앱 변경을 하지 않는다.
- MSI 대안은 기존 NSIS와 무조건 중복 설치시키지 않고 저장·종료·기존 설치 제거·MSI 설치의
  승인된 절차를 안내한다. 기본 앱 유지 및 기존 등록 보존을 검증한다.
- client가 필요하면 동일 installer hash·동일 공개 fixture·동일 진단 스크립트로 Windows
  10/11 VM·VDI의 실제 로그인 세션에서 시험한다. 현재 토큰·Explorer 문맥을 구분한다.
  UAC 전환은 전용 VM에서 사전 승인·재부팅 후 확인하며 업무용 PC 설정은 변경하지 않는다.
- self-hosted runner가 필요하면 전용 테스트 환경·신뢰한 코드·권한·비용·세션/재부팅 관리
  범위를 먼저 승인받는다. 실사용 VDI를 자동으로 runner로 등록하지 않는다.
- 전체 사용자 NSIS나 신규 권한 helper가 필요하면 별도 범위 승인을 요청하고 자동 확대하지 않는다.

### 검증

```sh
node --test tests/windows-thumbnail-diagnostics.test.mjs tests/windows-thumbnail-registration.test.mjs tests/windows-packaging.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
git diff --check
```

검출 조건의 positive/negative·정보 미설정·권한 거부·다른 처리기 변경을 검사한다. native 보정은
Windows에서 실제 적용 전후를 검증한다. client 환경을 확보하지 못했으면 해당 수용은 미실행으로
남기고 해결 완료나 단계 통과로 포장하지 않는다. 필요한 추가 검증은 대상별로 승인받는다.

### 커밋

```text
Task #57 Stage 3: 재현 근거에 따른 썸네일 설치 대응과 제한 안내
```

## Stage 4 — 회귀 수용·문서·#58 인계

### 산출물

- `docs/architecture/WINDOWS_THUMBNAILS.md`
- `docs/operations/DESKTOP_RELEASE.md`, `docs/operations/RELEASE_CHECKLIST.md`
- `docs/releases/v0.1.0.md`, 필요 시 `README.md`
- `mydocs/working/task_m010_57_stage4.md`, `mydocs/report/task_m010_57_report.md`, 오늘할일

### 변경 내용

- 최종 코드 후보의 같은 SHA·installer bytes로 두 clean job·lifecycle·Shell 결과를 재확인한다.
  코드·검증기·환경이 동일한 근거는 재사용 이유를 적고 문서-only 변경 때문에 재빌드하지 않는다.
- 설치 방식·권한 범위·실제 검증 환경·미확정 조건·권장 대안을 기존 문서에 반영한다.
  기존 한컴 ProgID 충돌 가능성의 일반 설명과 이번 사례의 확인된 처리기 선택을 구분한다.
- #58에 필요한 설치 범위·활성 상태 진실 원천·등록/해제 소유권·권한 거부 처리·업데이트 보존
  경계를 최종 보고에 정리한다. #58 구현이나 MSI↔NSIS 교차 updater 도입은 하지 않는다.
- NSIS 전체 사용자 설치 필요성을 채택/불필요/추가 검증 필요로 구분한다. 필요한 현장 수용이
  남으면 해결 완료·close·공개 승인을 선언하지 않고 작업지시자에게 판단을 요청한다.

### 검증

```sh
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

Windows native는 Stage 2의 승인된 Windows-only artifact 경로를 사용한다. 실제 Shell bitmap,
문서 hash 불변, 기존 기본 앱·제3자 handler 보존, worker 잔류·COM 등록 cleanup을 확인한다.
공유 Linux build 경로의 기본 matrix 유지도 source-contract로 확인하고, 실제 Linux native
재검증이 필요할 정도로 범위가 바뀌면 추가 승인받는다. 지원 밖 host에서 native build하지 않는다.

### 커밋

```text
Task #57 Stage 4: Windows 썸네일 회귀 수용과 후속 설정 작업 인계
```

최종 보고·PR 게시·이슈 종료는 각 해당 절차와 승인을 따른다. 단계별 코드·보고를 함께 묶고,
CI 실행을 위한 후보 커밋과 결과 보고 커밋의 SHA 차이를 명시한다.

## 검증

- 이번 구현계획 작성은 문서 필수 섹션·경로·승인 경계·diff만 확인한다. 제품 검증 결과가 아니다.
- 각 Stage는 해당 명령과 관측 가능한 결과를 보고서에 기록하고 실패/미실행을 통과로 바꾸지 않는다.
- 진단 도구 구현 결함과 실제 제품/환경 실패를 구분한다. 사전에 승인하지 않은 실패를
  expected-negative로 뒤늦게 이름만 바꾸지 않는다.
- 구현계획과 다른 파일 역할·권한·환경·문서 위치가 필요하면 수정안을 먼저 승인받는다.

## 커밋

- 이번 문서: `Task #57: 구현 계획서 작성과 수행계획 승인 반영`.
- 각 Stage는 소스·검증·단계 보고를 task 브랜치에 보존한다. 미검증 native 후보는 미검증으로 표시한다.
- local 브랜치는 원격에 직접 올리지 않고, 조기 CI 게시 예외는 Stage 2의 별도 승인을 따른다.

## 단계 의존성

- 구현계획 승인 후 Stage 1을 시작한다. Stage 1 보고 승인 후 Stage 2를 진행한다.
- Stage 2 관측을 근거로 Stage 3의 제품 보정·client 시험 범위를 승인받는다.
- Stage 3 결과 승인 후 Stage 4로 진행한다. #58은 확정된 등록·권한 경계를 인계받는다.

## 위험과 대응

- **interop 정의 오류**: 공식 COM vtable/handle 소유권에 맞추고 Windows 컴파일·실행으로 확인한다.
- **관측이 상태를 변경**: 최초 Shell 요청을 앞에 두고 probe별 process·fixture·실행 순서를 기록한다.
- **호스팅과 client 차이**: runner의 UAC 설정만으로 동일 환경을 주장하지 않는다.
- **원격 비용·영향**: Windows-only 비게시 2회 기본안을 제안하고 각 단계 진입 시 실행 승인을 받는다.
- **UI 오해**: 설치 제한은 실제 관측과 한계를 설명하며 JPG/API 성공을 Explorer 전체 성공으로 표현하지 않는다.

## 승인 요청 사항

1. 4개 Stage와 위 산출물·진단 계약·명령·커밋 구조를 승인한다.
2. Stage 2의 optional Windows-only artifact 선택과 NSIS/MSI 독립 VM 검증 방향을 승인한다.
3. Stage 2 원격 후보 게시·dispatch 및 Stage 3 제품 보정/client 환경은 해당 단계에서 구체적으로 승인받는다.
4. 이번 승인 뒤 Stage 1부터 시작하며 제품 배포·NSIS 전체 사용자 설치·#58 구현은 제외한다.

## 기술 근거

- [IThumbnailCache::GetThumbnail](https://learn.microsoft.com/en-us/windows/win32/api/thumbcache/nf-thumbcache-ithumbnailcache-getthumbnail)
- [WTS_FLAGS](https://learn.microsoft.com/en-us/windows/win32/api/thumbcache/ne-thumbcache-wts_flags)
- [IShellItemImageFactory::GetImage](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ishellitemimagefactory-getimage)
- 그 외 원인 가설·공식 등록 규칙·runner 환경 근거는 수행계획서와 #57을 따른다.
