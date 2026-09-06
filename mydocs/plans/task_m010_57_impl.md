# Task #57 구현계획서 — Windows 썸네일 설치 환경별 진단·대응

수행계획서: [task_m010_57.md](task_m010_57.md)
GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
마일스톤: M010
상태: Stage 2.2 구현·로컬 검증 완료 — Windows 후보 실행 승인 대기, Stage 2 미완료

승인 근거: 2026-09-06 같은 스레드의 구현계획 승인 요청에 작업지시자가
“진행해줘”로 Stage 1 진행을 지시했다. Stage 2 원격 게시·실행은 별도 승인 대상으로 유지한다.

Stage 2 승인: Stage 1 보고 뒤 작업지시자가 “진행해줘”로 Stage 2 구현을 승인했다.
원격 후보 게시·Actions 실행은 후보 SHA를 제시한 후 별도 승인받는다.

원격 실행 승인: 2026-09-07 작업지시자가 후보
`32c903dd3d54f0388ccec81788cbdd3b2f9a68fe`의 게시와 Windows-only Actions 1회
실행 요청에 “진행해줘”로 승인했다. `publish/task57`이 없음을 확인한 뒤 non-force
push했고 원격 SHA가 후보와 일치함을 확인했다.
[run 34042095817](https://github.com/postmelee/alhangeul-tauri/actions/runs/34042095817)의
`headSha`도 동일하다. 입력은 `mode=artifact`, `artifact_platform=windows-x64`,
`build_ref=32c903dd3d54f0388ccec81788cbdd3b2f9a68fe`, `run_tests=true`,
`publish_release=false`이며 추가 실행은 승인받지 않았다.

동일 run의 선행 core 진단은 통과했다. artifact `9992208828`
(`alhangeul-windows-x64-thumbnail-core`)의 다운로드 archive SHA-256은
`fbc04cce52cd2a1397f77b5d5cfece848374208f2770c4eae16e5063f44736c0`이며
GitHub digest와 일치한다. 내부 `Status=passed`, fixture 11개,
repository SHA `32c903dd3d54f0388ccec81788cbdd3b2f9a68fe`,
rhwp SHA `496333b27d21ddb9114ba9ae340bcb895870c9a7`을 확인했다.
이 결과는 installer/COM/Shell 검증 완료와 구분한다.

보완 계획 작성 승인: 2026-09-07 실측 보고 후 작업지시자가 “진행해줘”로
NSIS 제한 감지·MSI 안내와 MSI 재부팅 상태 처리의 계획 구체화를 승인했다.
아래 Stage 2.2는 그 산출물이다. 이어 같은 스레드의 “진행해줘”로
**수용 기준 분리·구현·로컬 검증·후보 커밋**을 승인받았다. 추가 원격 실행과 Stage 3는
별도 승인 대상이며 이번 구현 승인으로 push/dispatch하지 않는다.

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
- 아래 native/원격 명령은 실행 계획이며 Stage 1의 로컬 source-contract 검사와 구분한다.

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

### Stage 2.1 후보 구현·로컬 검증 결과 — 2026-09-07

- ordinary artifact build에 `artifact_platform=all|windows-x64` 선택을 추가했다.
  기본 Linux/Windows target과 updater 경로는 유지한다.
- installer job은 `installer: [nsis, msi]`, `fail-fast: false`로 분리했다.
  두 job이 같은 bundle을 받지만 선택 installer만 실행하며 진단 artifact 이름도 분리한다.
- 최초 설치의 Shell 요청 → 별도 cache/force/COM probe → 재설치와 재검사 →
  앱 launch·제3자 takeover·제거 순서다. MSI rollback은 최초 Shell 성공과 clean 제거를
  확인한 뒤에만 주입하며 기본 연결 불변도 확인한다.
- `scripts/windows-thumbnail-fixtures.json`과 `windows-thumbnail-fixtures.ps1`을
  승인된 fixture helper 분리 범위로 추가했다. small HWP 13,824 bytes,
  large HWP 10,418,688 bytes, HWPX 131,571 bytes, JPG 81,040 bytes의 경로·hash·선정
  근거를 고정했다. 네 파일은 현재 pin에서 LFS pointer가 아닌 실제 파일이다.
- 최초·재설치별 19개 probe, 합계 38개의 결과와 설치 전·설치 후·정리 후 환경 JSON을
  남긴다. Shell·force-extract에는 실제 bitmap 성공을 요구한다. cache-only의 API 실패는
  원래 실패 status/HRESULT를 보존하는 관측값이며 이를 cache miss나 새 추출 성공으로
  단정하지 않는다. cache API 진입 전 실패·timeout·JSON 누락은 harness 실패다.
  Stage 2 보고에서는 cache API 오류의 의미까지 검토하며 workflow 통과만으로 수용하지 않는다.
- fixture 복사본은 진단 업로드 디렉터리 밖의 전용 임시 폴더에 두고 원본/복사본 hash를
  확인한 뒤 해당 폴더만 정리한다. 설치 DLL/worker의 실제 hash도 bundle과 비교한다.
- `tests/windows-thumbnail-fixtures.test.mjs` 9개를 추가하고 automation에 포함했다.
  관련 검사 72개, 전체 automation 522개가 통과했다. 제품 경계 검사
  `394 files scanned`, `git diff --check`, 추가 workflow 문법 검사
  `actionlint -shellcheck='' .github/workflows/alhangeul-desktop.yml`도 통과했다.
- Windows PowerShell/COM/GDI·설치 실행은 아직 수행하지 않았다. Stage 2 전체 완료 보고서는
  원격 실행 결과를 수집한 뒤 작성한다. 제품 등록 모델·엔진·worker 제한 변경은 없다.
- 원격 read-only 확인에서 #57은 OPEN이며 `publish/task57` 브랜치는 없었다.
  실제 push 직전 다시 확인한다. 승인 요청 대상은 이번 Stage 2.1 후보 커밋의 전체 SHA이며,
  아래 Windows-only 비게시 dispatch 1회다. source/workflow ref를 같은 후보에 고정한다.

추가 로컬 검증:

```sh
node --test tests/windows-thumbnail-diagnostics.test.mjs tests/windows-installer-smoke.test.mjs tests/windows-packaging.test.mjs tests/actions-workflows.test.mjs tests/windows-thumbnail-fixtures.test.mjs
actionlint -shellcheck='' .github/workflows/alhangeul-desktop.yml
```

cache/강제 추출의 의미는 [Microsoft WTS_FLAGS](https://learn.microsoft.com/en-us/windows/win32/api/thumbcache/ne-thumbcache-wts_flags)
및 [GetThumbnail 반환 계약](https://learn.microsoft.com/en-us/windows/win32/api/thumbcache/nf-thumbcache-ithumbnailcache-getthumbnail)을 확인했다.

### Stage 2.1 원격 관측 결과 — 2026-09-07

- 승인된 [run 34042095817](https://github.com/postmelee/alhangeul-tauri/actions/runs/34042095817)
  1회만 실행했다. 전체 결과는 **failure**다. 재실행·제품 보정·릴리즈는 하지 않았다.
- build job `101510593274`는 성공했다(59분 16초). Windows core 11개 fixture,
  desktop/preview/handler/worker test·Clippy와 NSIS/MSI bundle 생성이 통과했다.
- 독립 MSI job `101518875502`는 2분 4초, NSIS job `101518875560`은 2분 12초 뒤
  각각 실패했다. 두 job 모두 checkout·SHA 확인·bundle 다운로드·진단 업로드는 성공했다.
- workflow SHA·요청 source SHA·각 checkout SHA는 모두
  `32c903dd3d54f0388ccec81788cbdd3b2f9a68fe`다. Linux·updater·게시 job은 실행되지 않았다.

#### 산출물 정합성

| Artifact | ID | 내려받은 archive SHA-256 (GitHub digest와 일치) |
|---|---|---|
| Windows core | `9992208828` | `fbc04cce52cd2a1397f77b5d5cfece848374208f2770c4eae16e5063f44736c0` |
| Windows bundle | `9992781946` | `df2174178fa0f8c58eef5184cca859fe20a6b9488b2101b1b922e7f92d88006b` |
| NSIS smoke | `9992902911` | `bf24073d7b2510d9d64ad043476395d096847c811db3a468fcd8231ea1bc3b93` |
| MSI smoke | `9992900327` | `db962c9b6641c3c1f45daa4696ee125e80fcbb08bb89d801126aa05c4f4e0907` |

bundle inventory의 4개 파일 hash도 실제 bytes와 대조했다.

| 구성요소 | Bytes | SHA-256 |
|---|---|---|
| MSI | 61652992 | `81ce0d5350cb488623fd7067cd36e1ab0ab0aee2bd83a3e7a1db53c3b439ca0b` |
| NSIS EXE | 54848807 | `4bfae681ed1e50e48482d9acaea16f021cf2197272452860ee45a918d56b92b4` |
| Handler DLL | 320512 | `18d8fe088887fea09b1270cfb723aa10e887b9453645c76d9b19b8a70c0143b6` |
| Worker EXE | 17583104 | `7e8d1a17f00fbb0beddf5a1e4a1b7e368784d4a5cb9052dcd1fcc6b891877c3d` |

각 smoke의 inventory는 bundle과 같고, 설치 후 수집한 DLL/worker hash도 일치한다.
installer별 probe JSON 38개와 summary의 각 Result가 모두 일치했다. 환경 JSON 3개,
fixture 불변 검사 32건(4파일 × 4요청 × 2phase), 기본 연결 원상 복원도 확인했다.
최초 read-back 보조 명령은 불변 검사 수를 24로 잘못 예상해 중단됐으며, 실제 요청
구조의 32건으로 바로잡아 양쪽 전체 대조를 통과했다. 원격 run을 반복한 것은 아니다.

#### 환경과 API 결과

양쪽 image version은 `20260824.214.3`, OS build/revision은 `26100.33296`,
x64·STA·session 2, elevated=true·elevationType=1·integrityRid=12288이었다.
**EnableLUA 실측값은 1**이며 IconsOnly=1, 네 DisableThumbnails 정책 값은 missing이다.
PC방의 EnableLUA=0·IconsOnly=0과 같다고 취급하지 않는다. Explorer UI의 썸네일
표시는 검사하지 않았으며 아래는 명시적인 thumbnail-only API 결과다.

| 관측 (최초 설치와 재설치 후 동일 경향) | NSIS | MSI |
|---|---|---|
| 최초 설치 / 제거 exit code | 0 / 0 | 0 / 0 |
| 제품 COM 등록 | HKCU Registry64, HKLM 없음 | HKLM Registry64, HKCU 없음 |
| HWP/HWPX 연결 조회 | Alhangeul CLSID | Alhangeul CLSID |
| 직접 COM 생성 | S_OK | S_OK |
| 작은 HWP·큰 HWP·HWPX Shell | 모두 `0x80040154`, bitmap=false | 모두 S_OK, bitmap=true, 181×256 |
| 위 세 문서 force-extract | 모두 `0x80040154` | 모두 S_OK, bitmap=true, 181×256 |
| JPG Shell / force-extract | S_OK, 256×134 | S_OK, 256×134 |
| 새 cache-only 복사본 | 네 파일 모두 `0x80030002` | 네 파일 모두 `0x80030002` |
| force 후 동일 복사본 cache-only | 문서 실패, JPG 성공 | 네 파일 모두 성공 |
| 같은 설치본 재설치 | exit 0 | exit 3010 |

`0x80030002`는 원본 파일 부재나 임의의 추출 성공으로 재해석하지 않는다. 별도 cache
복사본의 byte·mtime 불변과 강제 추출 후 동일 경로의 결과 전환을 함께 기록했다.
성공한 cache API 결과는 `cacheFlags=2`였다. 이는 캐시 반환 관측이며 handler 실행 횟수나
force 요청이 언제나 캐시와 완전히 무관했음을 증명하지는 않는다.

NSIS failure 12건은 문서 3개 × Shell/force 2종 × 최초/재설치 2회다.
직접 COM·연결은 성공하는데 Shell에서만 class-not-registered가 나오는 현장 패턴을
한컴 프로그램이 없는 synthetic ProgID 환경에서도 관측했다. 등록 범위·실행 문맥
가설을 지지하지만, 특정 surrogate의 registry 접근을 추적한 것은 아니다. 한글 버전,
EnableLUA 값 또는 이전 MSI가 남긴 캐시만을 단독 원인으로 확정하지 않는다.

#### MSI 재설치의 별도 미수용 상태

MSI의 유일한 failure는 `msi reinstall exit code: 3010`이다. 기존 Shell bitmap은 모두
성공했고, `REINSTALL=ALL REINSTALLMODE=amus`로 모든 파일을 덮어쓰는 단계에서 발생했다.
`msi-reinstall.log` 451행에 강제 덮어쓰기, 457행에 handler DLL 사용 중, 573행에
Config.Msi 백업 파일의 재부팅 시 삭제 예약, 713~718행에 재부팅 필요와 3010 반환이 있다.
Microsoft의 [MSI 종료 코드](https://learn.microsoft.com/en-us/windows/win32/msi/error-codes)는
3010을 성공 후 재부팅 필요 상태로 정의한다. 무재부팅 완료나 rollback 실패와 동일하지 않다.
DLL 점유 process의 신원은 수집하지 않았으므로 dllhost/Explorer라고 단정하지 않는다.

양쪽 앱 2회 실행·정상 종료, 제3자 thumbnail takeover 보존, 기본 연결 복원,
제품 소유 registry/path/process clean 검사는 통과했다. MSI 실패 주입 rollback은 최초
Shell 성공·제거 후 실행돼 예상 1603과 정리를 확인했다. 다만 재설치의 3010 이후
재부팅하지 않았으므로 rollback을 완전한 무잔여 환경에서 검증했다고 일반화하지 않는다.
현재 clean 검사는 Windows Installer의 지연 삭제 예약까지 포함하지 않는다.

#### 단계 상태와 후속 승인안

- native gate 실패를 유지한다. `task-stage-report` 규칙에 따라 Stage 2 완료 보고서와
  완료 커밋은 보류한다. 이번 승인·실측은 계획서/오늘할일의 미커밋 기록으로 보존한다.
- 다음 승인에서는 먼저 Stage 2 보완 계획과 수용 기준을 구체화한다. NSIS의 실패를
  성공으로 완화하지 않고, 실제 Shell 실패를 기준으로 제한 진단·MSI 안내를 설계한다.
  EnableLUA=0만 검사하는 단순 분기나 자동 HKLM 전환은 채택하지 않는다.
- MSI는 3010을 재부팅 필요 상태로 별도 수집하고, 정상 재설치와 강제 파일 교체 시험의
  목적을 분리한다. 지연 삭제·재부팅 후 확인을 포함한 수용 경계를 정하며 3010을
  exit 0처럼 숨기거나 시스템 process 종료로 우회하지 않는다.
- 이 계획 보완의 승인과 제품 대응(Stage 3) 승인은 구분한다. 수정 후보의 SHA·변경점·
  실행 입력을 제시하기 전에는 추가 push/dispatch하지 않는다. client VM/VDI 검증,
  #58·전체 사용자 NSIS·릴리즈는 계속 별도 승인 대상이다.

### Stage 2.2 보완 구현 — 승인 반영, native 검증 대기

이번 소단계는 진단·시험 코드만 보완한다. 제품의 HKCU/HKLM 등록, NSIS/WiX 설치
코드, 앱 설정, 엔진은 변경하지 않는다. 사용자 안내 적용은 Stage 3의 별도 승인 대상이다.

#### 1. 진단 판정과 제품 수용 분리

기존 raw probe의 status/HRESULT/bitmap 및 smoke `Status=failed`를 보존한다.
새 assessment에는 `evidenceStatus`, `thumbnailStatus`, `lifecycleStatus`, `finding`,
`recommendedAction`, 근거 probe label을 별도 기록한다. 환경 값만으로 성공·제한을 판정하지 않는다.

| 조건 | finding / 조치 | 제품 수용 |
|---|---|---|
| JSON 누락·손상, SHA/hash 불일치, timeout, 잘못된 bitmap 계약 | `diagnostic-invalid` / 진단 오류 확인 | 미수용 |
| 등록 파일 없음·hash 불일치·잘못된 scope, 연결이 다른 CLSID | `registration-mismatch` / 설치·연결 상태 확인 | 미수용 |
| JPG Shell/force도 실패 | `shell-control-failed` / 공통 Shell·환경 조사 | 미수용 |
| HWP/HWPX 연결과 직접 COM 성공, HKCU 전용 등록, JPG 성공, 문서 Shell/force에 0x80040154 | `per-user-shell-activation-failed` / MSI 대안 검토 | 실패 유지 |
| 문서 Shell/force 모두 유효 bitmap, JPG 성공 | `thumbnail-api-ok` / 이번 실행 문맥에서 API 정상 | thumbnail만 수용 |
| 위 조건에 맞지 않는 오류·혼합 결과 | `unclassified-failure` / 원래 오류 보존·추가 조사 | 미수용 |

- 위 표는 우선순위 순서다. 문서별 판정을 남기고 일부 성공을 전체 성공으로 합치지 않는다.
  MSI에서도 0x80040154가 나면 HKCU 제한으로 오분류하지 않는다.
- `EnableLUA`, token, IconsOnly, 정책 값은 설명용 관측값이다. 미설정·읽기 실패를
  false/0으로 바꾸지 않고, UAC on/off 양쪽의 같은 API 패턴에 동일 판정을 내린다.
- `recommendedAction=consider-msi`는 원인 확정이나 자동 설치 명령이 아니다.
  JPG 대조군 부재·직접 COM 실패·캐시 성공만으로 이 권고를 확정하지 않는다.
- 캐시 결과는 별도 관측 배열에 두고, fresh Shell·force 성공을 대신하지 않는다.

**승인된 단계 수용 기준 변경:** Stage 2의 완료 대상을 “진단 도구·증거 수집 계약”으로
한정하고 제품 기능 수용과 분리한다. 기존 run의 failure는 소급 변경하지 않는다.
새 Windows 실행에서 분류 회귀 검사·필수 증거 확인이 통과해야 진단 단계 완료를 요청할 수 있다.
제품 검증 실패 job과 원래 exit code는 계속 실패로 남기며 workflow 전체를 녹색으로 만들기
위한 허용 목록이나 `continue-on-error` 확대는 하지 않는다. 미분류 실패·증거 누락·예상 밖
기본 연결 변경이 있으면 진단 단계도 완료하지 않는다. 기준 분리는 승인받았으나
새 Windows 검증 전에는 Stage 2 완료 보고서를 작성하지 않는다. Stage 3/4의 제품 수용·현장 확인은 별도로 남는다.

#### 2. MSI 정상 재설치와 강제 교체 분리

- 기본 lifecycle job은 MSI `REINSTALL=ALL REINSTALLMODE=omus`와 기존 `/qn /norestart`
  조합을 사용한다. registry·shortcut·설치 파일 hash와 재설치 후 fresh Shell을 다시 검사한다.
  이 시험을 손상 파일 복구·새 버전 업그레이드·잠긴 DLL 교체 수용이라고 표현하지 않는다.
- `amus` 강제 교체 시험은 별도 `windows-2025` VM의 `msi-forced-reinstall` job으로
  유지한다. 같은 bundle 설치 → 최초 Shell → 강제 재설치 → 재부팅 상태 기록 → 정리 순서다.
  정상 lifecycle·rollback 증거와 섞지 않고 이 VM에서 후속 rollback을 실행하지 않는다.
- installer entry에 다섯 번째 입력 `Scenario=lifecycle|forced-reinstall`을 추가한다.
  `forced-reinstall`은 MSI만 허용한다. 기존 NSIS/MSI lifecycle artifact 이름을 보존하고
  추가 증거는 `alhangeul-desktop-windows-x64-msi-forced-reinstall`에 둔다.
- 재설치가 `0`이면 후속 검사를 계속한다. `3010`이면 `reboot-required`, `1641`이면
  `reboot-initiated`로 기록하고 무재부팅 lifecycle 수용을 막는다. `/norestart` 조건의
  1641은 예상 밖 결과다. `1602` 취소와 다른 실패 코드도 독립적으로 보존한다.
- 3010 이후의 bitmap은 `pre-reboot-observation`일 뿐 재부팅 후 새 DLL 검증이 아니다.
  3010/1641/실패/재부팅 상태 불명인 job에서는 rollback을 건너뛰고 사유를 기록한다.
  NSIS 종료 코드에는 MSI의 코드 의미를 일괄 적용하지 않는다.
- 제품 범위 `Get-CleanState`와 `rebootState`를 구분한다. 재부팅 요청 exit code,
  MSI 로그의 지연 작업·MsiSystemRebootPending, 설치 전후 PendingFileRenameOperations·
  CBS RebootPending·Windows Update RebootRequired의 존재/변화/읽기 실패를 수집하되
  전체 registry 값·외부 파일 경로는 출력하지 않는다.
  기존 표식은 baseline과 구분하며 표식이 없다는 사실만으로 재부팅 불필요를 단정하지 않는다.
- 표식은 읽기 전용이며 삭제하거나 되돌리지 않는다. 제품 소유 파일·등록·기본 연결 정리는
  기존 finally 경로를 유지한다. 점유 process 강제 종료·재부팅·전역 캐시 삭제는 하지 않는다.
- 실제 재부팅 후 검증은 별도 승인된 Windows client VM에서 수행한다. 이전/이후 boot 식별,
  installer·DLL/worker hash, 새 process의 Shell·기본 연결·지연 작업 상태를 확인해야 한다.
  해당 환경을 확보하지 못하면 강제 교체 lifecycle은 미수용으로 남긴다.

근거: [REINSTALLMODE](https://learn.microsoft.com/en-us/windows/win32/msi/reinstallmode),
[MSI 종료 코드](https://learn.microsoft.com/en-us/windows/win32/msi/error-codes).

#### 3. 구현 파일과 검증

| 파일 | 변경 범위 |
|---|---|
| `scripts/windows-thumbnail-assessment.ps1` (신규) | 수집 결과를 읽는 공통 순수 분류 함수; 설치·COM 실행 없음 |
| `scripts/windows-installer-reboot.ps1` (신규) | MSI exit code·재부팅 상태의 비식별 읽기 전용 수집 |
| `scripts/windows-thumbnail-assessment-tests.ps1` (신규) | Windows PS 5.1에서 synthetic 입력의 분류·재부팅 계약 회귀 |
| `scripts/windows-installer-smoke.ps1`, `windows-thumbnail-fixtures.ps1`, `windows-thumbnail-smoke.ps1` | assessment, scenario, 재설치 뒤 분기·증거 목록, rollback gate 연결 |
| `.github/workflows/alhangeul-desktop.yml` | 분류 회귀·증거 계약 검사, 강제 교체 독립 job; 기존 기능 실패 gate 보존 |
| `tests/windows-thumbnail-assessment.test.mjs` (신규), 기존 Windows/workflow 계약 검사, `package.json` | 신규 helper 경계·회귀 실행을 automation에 포함 |

신규 파일은 300 LOC, 함수는 50 LOC, 입력은 5개 이내로 유지한다. 기존 대형 orchestration
파일은 필요한 호출만 추가하고 판단 로직은 helper로 분리한다. 개인 자료·원본 MSI 로그를
테스트 fixture로 커밋하지 않으며 알려진 값으로 만든 최소 synthetic JSON만 사용한다.

로컬(지원 밖 호스트에서는 이 범위만 실행):

```sh
node --test tests/windows-thumbnail-assessment.test.mjs tests/windows-thumbnail-diagnostics.test.mjs tests/windows-thumbnail-fixtures.test.mjs tests/windows-installer-smoke.test.mjs tests/windows-packaging.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
actionlint -shellcheck='' .github/workflows/alhangeul-desktop.yml
git diff --check
```

Windows: `powershell.exe -NoProfile -NonInteractive -STA -File scripts/windows-thumbnail-assessment-tests.ps1`.
UAC 0/1의 동일 실패, 성공 NSIS, HKLM 실패, JPG 실패, 부분 성공, cache-only 성공,
누락/손상/권한 거부, MSI 0/3010/1641/1602/1603, 재부팅 표식 baseline·변화·읽기 실패를
검사한다. classifier 검증 통과와 실제 제품 실패가 동시에 보존되는지도 검사한다.
필수 probe 수는 scenario·종료 상태별 명세로 검증하고 임의 누락을 skip으로 바꾸지 않는다.

원격 실행은 구현·로컬 검사 후 exact SHA를 제시해 **추가 1회**를 별도로 요청한다.
기존 `mode=artifact`, `artifact_platform=windows-x64`, `run_tests=true`,
`publish_release=false`를 유지하고 세 독립 Windows job이 같은 새 bundle을 사용한다.
현재 승인으로 push/dispatch하지 않는다. 실패 원인이 남아도 동일 입력을 반복 실행하지 않는다.

커밋안: `Task #57 [Stage 2.2]: 썸네일 진단 판정과 MSI 재부팅 시험 분리`.
이 후보 커밋은 미검증 표시 후 원격 실행 승인을 요청하며, 진단 단계 보고는 위 새 수용
계약의 명시 승인과 실제 검증 후에만 작성한다.

#### 4. Stage 2.2 구현 결과와 로컬 검증

- 순수 assessment는 19개/phase의 probe 계약, 등록 파일 hash/크기·scope, 연결·직접 COM,
  JPG 대조군과 문서별 Shell/force를 검사한다. 원시 status/HRESULT/bitmap은 변경하지 않는다.
- MSI 정상 `omus`와 강제 `amus`를 세 독립 installer job 중 두 scenario로 분리했다.
  재부팅 상태 미확인·대기·필요 시 rollback을 건너뛰고, 3010 후 bitmap은
  `pre-reboot-observation`으로만 남긴다. rollback 실행 시 예상 종료 코드 1603과
  이후 재부팅 관측도 검사한다. 표식 원문은 메모리 안에서만 비교한다.
- summary schema 3에 phase별 assessment와 lifecycle·진단 계약 판정을 추가했다.
  별도 진단 gate는 원본 JSON·환경 JSON·inventory·checkout/workflow SHA를 대조하고
  판정을 재계산한다. 진단 gate 통과가 기존 제품 실패 gate를 우회하지 않는다.
- Windows synthetic 회귀에 UAC 0/1, 정상·실패·부분 성공·잘못된 증거와 재부팅 코드,
  표식 변화·baseline·읽기 실패, JSON round-trip 및 원시 증거 불변 검사를 작성했다.
  이 회귀의 Windows PowerShell 5.1 실행은 아직 하지 않았다.
- 로컬 관련 Node 계약 검사 **82/82 통과**, `pnpm run test:automation` **532/532 통과**,
  `pnpm run check:product-boundary`, `actionlint .github/workflows/alhangeul-desktop.yml`,
  `git diff --check` 통과. Node 검사는 native PowerShell·COM 동작을 증명하지 않는다.
- 제품 설치 코드·등록 범위·엔진·설정은 수정하지 않았다. Stage 3 안내·#58·PR·릴리즈,
  원격 push/dispatch도 수행하지 않았다. 이번 커밋은 Windows 미검증 후보이며
  실제 커밋 SHA와 추가 1회 실행 입력을 작업지시자에게 제시한다.

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

Stage 2.2 이후의 우선 제안은 **진단 결과 기반 안내**다. 다음 내용도 아직 구현 승인이 아니다.
공통 assessment를 수동 진단 진입점에서 재사용하고, 사용자에게는 “현재 실행 환경에서
사용자별 썸네일 처리기를 Shell이 활성화하지 못했습니다. MSI 설치를 대안으로 검토하세요”처럼
관측과 대안을 구분해 안내한다. 설치 직후에는 “등록됨·동작 미검증”과 “실제 bitmap 성공”을
구별한다. 설치 성공만으로 썸네일 사용 가능을 보장하지 않는다.

사용자가 실행하는 진단은 요청한 HWP/HWPX와 JPG만 대상으로 하며, 원본 대신 task 소유
임시 복사본을 사용하고 새 자식 process·timeout·민감 경로 비출력 계약을 유지한다.
실제 API 실행과 캐시 변경 가능성을 안내하고 관리자 권한 실행을 필수로 요구하지 않는다.
설치 중 자동 문서 탐색·진단 실행이나 앱 설정 UI 추가는 이번 우선안에 포함하지 않는다.
배포할 진단 도구의 파일 목록·진입점·제공 경로는 Stage 3 진입 승인 때 확정한다.

MSI 전환 안내는 문서 저장·앱 종료 → 기존 NSIS 제거 → 같은 버전/아키텍처 MSI 설치 →
재부팅 요청이 있으면 재부팅 → 사용자의 일반 Explorer 세션에서 재확인 순서로 작성한다.
두 설치본 중복 설치·기본 앱 강제 변경·설정/사용자 파일 삭제를 안내하지 않는다.
보안 정책 변경·NSIS 전체 사용자화·권한 helper·#58 선택 설치 및 토글은 계속 제외한다.
공식 문서는 기존 승인 위치인 README, `docs/architecture/WINDOWS_THUMBNAILS.md`,
`docs/operations/DESKTOP_RELEASE.md`를 필요한 만큼 보완하며 신규 FAQ/문서 루트는 만들지 않는다.

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
- 현재는 Stage 2.1 실패 관측 후 Stage 2.2 구현·로컬 검증을 완료했다. 승인된 진단 단계
  수용 기준은 새 후보에 적용하며 기존 실행의 실패 상태는 유지한다. Windows 검증은 미실행이다.
- Stage 2 관측을 근거로 Stage 3의 제품 보정·client 시험 범위를 승인받는다.
- Stage 3 결과 승인 후 Stage 4로 진행한다. #58은 확정된 등록·권한 경계를 인계받는다.

## 위험과 대응

- **interop 정의 오류**: 공식 COM vtable/handle 소유권에 맞추고 Windows 컴파일·실행으로 확인한다.
- **관측이 상태를 변경**: 최초 Shell 요청을 앞에 두고 probe별 process·fixture·실행 순서를 기록한다.
- **호스팅과 client 차이**: runner의 UAC 설정만으로 동일 환경을 주장하지 않는다.
- **원격 비용·영향**: Windows-only 비게시 2회 기본안을 제안하고 각 단계 진입 시 실행 승인을 받는다.
- **UI 오해**: 설치 제한은 실제 관측과 한계를 설명하며 JPG/API 성공을 Explorer 전체 성공으로 표현하지 않는다.

## 승인 상태와 다음 요청

1. Stage 2.2의 진단/제품 수용 분리와 새 진단 단계 완료 조건은 승인받았다.
   기존 failed run·향후 제품 기능 실패를 성공으로 바꾸지 않는 조건이다.
2. 공통 assessment, MSI 재부팅 상태 수집, 정상 lifecycle와 강제 교체의 독립 job,
   지정된 회귀 검사의 **구현·로컬 검증·후보 커밋까지** 승인받았다.
3. 후보 SHA 확정 후 Windows-only 추가 1회 실행을 다시 승인받는다. 이번 계획 승인만으로
   원격 push/dispatch·재부팅·client VM 사용을 수행하지 않는다.
4. Stage 3의 진단 진입점·사용자 안내 적용은 별도 승인받는다. 제품 등록 변경,
   NSIS 전체 사용자 설치·#58·릴리즈는 이번 구현 승인 범위에도 포함하지 않는다.

## 기술 근거

- [IThumbnailCache::GetThumbnail](https://learn.microsoft.com/en-us/windows/win32/api/thumbcache/nf-thumbcache-ithumbnailcache-getthumbnail)
- [WTS_FLAGS](https://learn.microsoft.com/en-us/windows/win32/api/thumbcache/ne-thumbcache-wts_flags)
- [IShellItemImageFactory::GetImage](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ishellitemimagefactory-getimage)
- 그 외 원인 가설·공식 등록 규칙·runner 환경 근거는 수행계획서와 #57을 따른다.
