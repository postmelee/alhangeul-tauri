# Task #57 구현계획서 — Windows 썸네일 설치 환경별 진단·대응

수행계획서: [task_m010_57.md](task_m010_57.md)
GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
마일스톤: M010
상태: Stage 6.1 로컬 검증 후보 확정 — 원격 CI 승인 대기, native 실행·수용 미완료

2026-09-10 구현계획 커밋 `3d1e24e` 뒤 같은 스레드의 “진행해줘”로 승인받아 6.1을 시작했다.
이번 6.1 검증 후보의 구현은 순수 판정·요청/수명 계약, Windows token/정책·Registry64·설치 형식
수집, 로컬 파일/재분석 지점·등록 사전 검사, STA Shell/COM probe, 자체 HWP/HWPX/JPG
fixture와 staged binary/build.rs 참조 검증, bounded process/pipe 실행기, scratch 소유권/정리,
headless 진입점과 형식별 suite 실행 흐름이다. 실행기는 재개 전 Job Object 할당, 제한된 pipe, 취소/시간 제한과
자기 프로세스 회수를 구현했다. scratch는 내부 scope UUID·고정 slot·hash로 12개 복사본과
소유권 manifest를 묶고, Windows에서 디렉터리 및 삭제 대상 핸들을 확보해 비재귀 정리한다.
알 수 없는 파일·링크·변조·잠금은 정리 실패로 남긴다. 준비 도중 실패해 manifest가 없는
잔여 디렉터리도 무조건 삭제하지 않는다. Shell/cache/force는 별도 복사본을 쓰며 force 뒤
cache 확인만 같은 복사본을 재사용한다. 이는 임의 경로를 받는 공개 API가 아닌 내부 계약이다.
`main.rs`에서 Windows 진단 전용 인자를 Tauri·plugin·single-instance 초기화 전에 분기하며,
잘못된 내부 인자는 일반 앱으로 fallback하지 않는다. Windows 제품 모듈에 child dispatch와
OUT_DIR 참조 포함을 연결했고, inspection 응답에 빌드 참조를 포함해 후속 inventory 대조가
가능하게 했다. suite는 상태 확인·fixture 준비·형식별 10개 probe·재확인·정리를 연결한다.
등록/환경/선택 처리기의 내부 hash 토큰과 fixture 무결성으로 실행 중 변동을 거부하며,
raw 경로·SID·오류 문자열·bitmap bytes는 출력하지 않는다. 내부 토큰은 향후 UI 요약에서 제외한다.
취소/시간 초과·비정상 종료 후 프로세스 회수와 scratch 정리는 하나의 추가 5초 deadline을
공유한다. 명확히 존재하지 않는 자기 scope만 이미 정리된 것으로 처리하고 부분 디렉터리는
남긴다. 창 소유권 API는 6.2의 Tauri caller 연결 전이며 사용자 UI·설치 정책은 바꾸지 않았다.
**Windows에서 실제 실행한 근거는 아직 없으며, 코드 연결·교차 타입 검사를 실행 수용으로
간주하지 않는다.**

Node 대상 64개·전체 automation 694개, product boundary 538파일·diff 검사를 통과했다.
Linux의 별도 harness에서 제품 lock을 기초로 Rust 45개 테스트가 통과했다. 공통 판정 44사례,
환경/등록 사전 조건, build.rs 참조의 source/version/bytes·중복 필드·symlink 거부, 자체 문서의
한 페이지 파싱·텍스트 및 비어 있지 않은 bitmap 렌더링, JPG 16×8 두 색조 디코딩,
응답 크기/identity/종료 상태, scratch 변조·링크·미소유 파일 보존, 인자·입력 라우팅,
고정 검사 순서·부분 형식 성공·등록 변동·정리 실패·공유 cleanup deadline을 포함한다.
build.rs 테스트는 같은 reference 모듈을 재사용해 중복 모듈/중복 테스트 적재를 제거했다.
fixture 첫 검사는 upstream 모듈 경로와 SVG 글자별 출력에 대한 테스트 가정을 수정한 뒤
재실행했다. upstream source/버전이나 실제 판정 조건을 완화하지 않았다.

Windows 교차 검사를 기존 최소 harness에서 실제 진단 모듈 전체·rhwp/fixture renderer·
scratch/child 통합 테스트까지 확장했다. 첫 시도는 blake3의 `ml64.exe` 부재로 실패했다.
검증용 harness에서만 기존 blake3 1.8.5의 `pure` feature를 사용한 뒤
`cargo clippy --tests --offline --target x86_64-pc-windows-msvc -- -D warnings`가 통과했다.
제품의 의존 버전·blake3 feature는 변경하지 않았다. harness는 OUT_DIR 참조를 `null`의
명시적 unverified로 두고 EXE 테스트 경로도 타입 검사 전용으로 지정했으며 실행하지 않았다.
**Tauri 전체 제품 컴파일·실제 EXE/Windows 테스트 실행·COM ABI/Shell 수용은 아니다**.
`tests/thumbnail_headless.rs`에는 실제 Cargo 제품 EXE를 사용하는 잘못된 인자/IPC 오류 종료,
상태 응답·WebView 자식 미생성, 입력 EOF 시간 제한, Job 소멸 시 자기 프로세스 회수 검사를
추가했다. Windows의 `pnpm run test:desktop`에서 실행되며 별도 workflow는 만들지 않았다.
Linux scratch 테스트도 Windows 파일 공유/잠금 동작의 근거가 아니다. PowerShell 공통 사례,
실제 Windows child/headless/lifecycle·잠금 정리, 제품 빌드·설치·inventory 대조는 남아 있다.

사용자가 Colima 실행을 요청해 기존 default 프로필(4 CPU·8 GiB)을 시작했다.
Linux aarch64 Docker의 기존 `rust:1.94-bookworm` 이미지에서 `rustc 1.94.1`로 위 검사를
실행했다. 일회성 컨테이너에 공식 rustfmt·clippy와 Windows 표준 라이브러리를 추가해 포맷/타입을
검사했다. Cargo lock은 Linux에서 갱신했으며 기존 패키지 버전 변경 없이 desktop의 직접
의존 연결 `image`, `sha2 0.10.9`, `windows` 3개만 추가됐다. image는 fixture 테스트용이다.
전역 Docker context는 default로 유지하며 명령별 `docker --context colima`를 사용한다.
Mac 호스트에서 Rust 제품 검증을 실행하지 않았으며 Windows COM 실행은 CI가 필요하다.
추가 실험/원격 CI/게시·6.2 진입은 하지 않았고 6.1 단계 완료 보고서·단계 완료 커밋도 아직 없다.
2026-09-10의 후속 “진행해줘”에 따라 변경을 점검하고 로컬 검증 후보 커밋을 준비했다.
`check:product-boundary`(538파일), `test:upstream`(36개), `test:studio`, `build:studio`,
`test:automation`(694개), `git diff --check`를 다시 통과했다. 제품 소스의 추가 변경은 없다.
PR #66 merge `f154b4d638d0b81565907829690fd9c28ee68fa9`와 원격 `publish/task57`의
`1dcac31504434b487b80d82398ebb8c6389d91c9`가 모두 현재 HEAD의 조상임을 확인했다.
현재 `origin/devel`도 위 PR #66 merge여서 추가 통합·rebase·force push가 필요하지 않다.

다음 승인 요청 범위는 이 기록과 6.1 소스를 묶은 후보를 `publish/task57`에 fast-forward
push하고 `ci.yml`의 `scope=full`, `profile=fast`, `thumbnail_context_experiment=false`를
**한 번** 실행하는 것이다. 실행 직전 원격 ref와 후보 exact SHA를 대조하고 실행 후 run의
head SHA·workflow·입력을 확인한다. 기존 fast 실행이 진행 중이면 자동 취소를 피하도록
먼저 확인한다. fast는 Windows PowerShell 공통 사례까지의 부분 검증이며 native 수용이 아니다.
이후 새 제품의 `full` 실행은 fast 결과와 exact 후보를 다시 제시해 승인받는다. 기존 bytes의
installer 재사용, 등록 범위 실험, 릴리즈·updater 게시, PR/이슈 종료는 이번 범위에 없다.
검증 후보 커밋은 단계 완료 보고서·완료 커밋을 대신하지 않으며 Windows native·패키지·
inventory 대조가 남은 상태를 그대로 유지한다.
아래 구현 승인 대기 표현은 계획 작성 당시 이력이다.

2026-09-10 작업지시자 결정으로 추가 등록 범위·보호 경로 실험을 중단하고 현재 NSIS/MSI
설치 방식을 유지한다. 최신 VDI 관측·완료 CI 결과와 진단·안내 UI 범위는
[수행계획서 상단의 보정안](task_m010_57.md)을 따른다. 아래 결과 대기·재실행 요청은
과거 이력이다. 수행계획 보정 커밋 `851b93f`에 대한 같은 스레드의 “진행해줘”를 승인으로
받아 아래 구현계획을 작성한다. 이번에는 두 계획서·오늘할일만 변경하고 제품 구현·원격
게시·CI 실행은 하지 않는다. 아래 Stage 6이 현재 구현 기준이며 Stage 5 실험을 재개하지 않는다.

## Stage 6 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 6.1 | Windows 네이티브 진단 기반 | 순수 판정·상태 수집·격리 child·자체 fixture·빌드 참조 | 판정 대조, Windows Rust, headless 실행·정리, package 정합성 |
| 6.2 | 제품 정보의 진단·안내 UI | 얇은 bridge·동의·진행/취소·결과·MSI 안내·요약 복사 | Studio controller/DOM, native command 소유권, Windows/Linux 회귀 |
| 6.3 | 패키지·현장 수용과 문서 | 기존 설치 검사에 진단 대조, VDI 확인, 제한/안내 문서 | fast 후 full, exact bytes, 현장 UI·Explorer 관측 분리 |

각 하위 단계의 구현·검증·보고 뒤 다음 단계 승인을 받는다. 이 단계는 기존 설치 정책을
유지한 지원 기능이며 NSIS 제한 해결·릴리즈 수용을 목표로 바꾸지 않는다. known-negative의
정확한 분류 성공과 기존 제품 gate 실패를 함께 기록하고, 같은 실패 때문에 추가 등록 실험을
자동 재개하지 않는다. 새 검증 자체가 실패하면 해당 단계에서 원인과 수정 범위를 보고한다.

## 문서 위치 확인

| 파일 | 수행계획상 위치 / Stage 산출물 | 일치 여부 | 용도 |
|---|---|---|---|
| `mydocs/plans/task_m010_57.md`, `task_m010_57_impl.md` | 기존 계획 / 승인·현재 구현 기준 | OK | 내부 작업 계획; 과거 실패를 지우지 않음 |
| `mydocs/orders/20260910.md` | 기존 오늘할일 | OK | 현재 단계 한 줄 |
| `docs/architecture/WINDOWS_THUMBNAILS.md` | Stage 6.3 기존 절 보완 | OK | 사용자·유지보수자에게 진단 계약과 오프라인 안내 설명 |
| `docs/releases/v0.1.0.md` | Stage 6.3 기존 근거·제한 절 | OK | 후보별 자동/현장 결과와 미검증 범위 |
| `docs/operations/RELEASE_CHECKLIST.md`, `README.md` | Stage 6.3 필요한 항목·링크만 수정 | OK | 수용 책임자와 사용자 진입점; 새 runbook 생성 없음 |
| `mydocs/working/task_m010_57_stage6.1.md`부터 `_stage6.3.md` | 기존 단계 보고 절차의 `working/` | OK | 각 단계 산출·검증·한계; 실제 단계 종료 시에만 작성 |

공식 문서는 각 수정 직전에 기존 내용을 읽는다. 공식 설명을 `mydocs/manual`로 옮기거나
별도 제품 문서 루트를 만들지 않는다. 이번 커밋에는 위 내부 계획·오늘할일 3개만 들어간다.

## Stage 6.1 — Windows 네이티브 진단 기반

### 산출물

신규는 `apps/desktop/src-tauri/src/thumbnail_diagnostics/` 아래 역할별 모듈로 나눈다.

- `model.rs`, `assessment.rs`, `assessment_tests.rs`: 상태·증거·판정과 기존 PS 판정 대조.
- `environment.rs`, `registration.rs`, `install_identity.rs`, `reference.rs`: x64 token/정책,
  읽기 전용 Registry64 관측, 실행 앱과 설치 근거·처리기 bytes 일치 검사.
- `child.rs`, `process.rs`, `protocol.rs`, `service.rs`: headless 진입·제한된 pipe 프로토콜,
  프로세스/요청 소유권·시간 제한·취소·정리와 판정 순서.
- `probe.rs`, `com.rs`, `fixtures.rs`, `scratch.rs` 및 각 테스트: Shell/COM 호출,
  자체 공개 테스트 문서 생성과 임시 파일 안전성. 파일 300 LOC·함수 50 LOC 이내로 역할 분리.
- `scripts/windows-thumbnail-diagnostic-reference.mjs`, 관련 `tests/windows-thumbnail-app-diagnostics.test.mjs`
  및 `tests/fixtures/windows-thumbnail-app-assessments.json`: 빌드 참조 생성·순수 판정 공통 사례.

수정은 desktop의 `src/main.rs`, `src/lib.rs`, `build.rs`, `Cargo.toml`, `Cargo.lock`,
`scripts/build-thumbnail-binaries.mjs`, 관련 build/automation 테스트와 `package.json`의
테스트 목록이다. child는 **기존 `Alhangeul.exe` 재실행**으로 구현하며 별도 EXE·Cargo package·
installer 형식·공개 asset 종류를 늘리지 않는다. `tauri.conf.json`과 NSIS/WiX 등록 정책은
변경하지 않는다. Windows native 의존성은 lock에 이미 있는 `windows` 0.61.3과 SHA-256
구현의 기존 version을 명시적으로 재사용하고 필요한 feature만 추가한다. lock 변경은
Windows/Linux에서만 수행·검증하고 upstream/다른 crate의 version을 갱신하지 않는다.

### 변경 내용 — 실행과 배포 경계

1. `main.rs`에서 정확한 내부 인자 `--alhangeul-thumbnail-diagnostic-child`를 먼저 분기한다.
   해당 모드는 Tauri Builder·single-instance·updater·WebView·문서 열기·앱 로그 초기화에
   진입하지 않는다. 잘못된 내부 인자는 오류로 종료하며 일반 문서 열기로 fallback하지 않는다.
   기존 일반 실행/파일 연결 인자는 그대로 유지한다. Linux에는 child 기능을 넣지 않는다.
2. 부모는 canonical 현재 EXE를 shell 없이 실행하고 표준 pipe로만 요청한다. 내부 schema 1,
   request ID, 고정 operation enum, fixture ID만 사용한다. 임의 URL·COM CLSID·문서 경로·
   실행 파일·출력 경로를 UI 입력으로 받지 않는다. 상태/fixture 준비/개별 probe와 CI용 suite는
   분리된 operation이며 suite가 자기 자신을 다시 호출하는 재귀는 거부한다.
3. 상태 확인은 15초, 개별 probe는 30초, 실제 검사 전체는 180초, 종료·정리는 추가 최대
   5초로 제한한다. pipe 입력 16 KiB·결과 256 KiB 상한을 두고 출력 초과/깨진 JSON/중복 ID/
   child crash/종료 코드 불일치를 `diagnostic-invalid`로 분류한다. 무기한 wait/join을 두지 않는다.
   시험용 한계 축소·가짜 backend는 test cfg에만 둔다.
4. child handle과 Job Object는 자기 실행만 소유한다. 취소·부모 종료 때 진단 child를
   종료/회수하되 Explorer·공유 dllhost·다른 앱·동명 프로세스를 검색해 종료하지 않는다.
   OS COM 서비스가 별도로 시작한 프로세스까지 Job Object로 정리된다고 보장하지 않는다.
   잠긴 임시 파일은 한계 안에서만 정리하고 잔여 상태를 결과에 표시한다.
5. build-thumbnail-binaries가 검증한 실제 staged DLL/worker의 SHA-256·크기와 source SHA,
   버전을 담은 참조를 생성한다. desktop `build.rs`는 Windows용 참조를 재검증해 `OUT_DIR`에
   넣고 실행 파일에 포함한다. 입력 변경은 `rerun-if-changed`로 추적한다. 릴리즈 package에서
   참조 누락/불일치는 build 실패다. 개발·순수 테스트에서 참조가 없으면 명시적 unverified이며
   제품 정상/known limitation 판정을 만들지 않는다. 빈 DLL이나 가짜 reference로 build를 통과시키지 않는다.
6. 참조는 app EXE 안에 포함하므로 기존 네 payload + inventory의 Windows bundle 계약과
   지원 묶음 13파일 계약을 유지한다. archive inventory와 app 참조의 handler/worker SHA·크기·
   source SHA가 같은지 패키지 검증에서 대조한다. 앱은 외부 지원 묶음을 내려받거나 신뢰하지 않는다.

### 변경 내용 — 상태·fixture·판정

- 상태 수집값은 OS build, x64/STA, **진단 호출 토큰**의 elevation/integrity, `EnableLUA`,
  `IconsOnly`, 기존 네 Explorer 정책 위치, HKCU/HKLM Registry64 Alhangeul CLSID·확장자
  등록이다. absent/unreadable/known 값을 구분한다. Explorer 토큰을 측정했다고 표현하지 않는다.
- `install_identity.rs`는 실제 실행 경로, 제품 기록, uninstall record를 교차 확인한다.
  기존 updater의 판별 계약을 참고하되 그 코드의 조회 실패→누락 축약을 그대로 재사용하지
  않는다. 진단 전용 collector에서 읽기 실패를 보존하고 updater 자격/설치 로직은 수정하지 않는다.
  MSI/NSIS/unknown 구분과 COM user-only/machine-only/ambiguous 구분은 서로 다른 필드다.
- 등록 경로와 실제 DLL/worker를 읽기 전용으로 비교한다. 비로컬/재분석 지점·누락·예상
  실행 경로 불일치·양쪽 hive 공존·reference 불일치가 있으면 문서 COM 실행을 생략한다.
  실행 직전·직후 등록과 bytes를 재검사하며 변동은 `diagnostic-invalid`다.
- 개인정보와 외부 sample 재배포 문제를 피하기 위해 자체 고정 텍스트 ‘Alhangeul 썸네일 검사’의
  한 페이지 HWP/HWPX와 자체 작은 색상 패턴 JPG를 쓴다. HWP/HWPX는 현재 rhwp의
  `Document`/`Section`/`Paragraph`와 `serialize_hwp`/`serialize_hwpx`를 사용해 격리된
  fixture 준비 단계에서 생성한다. JPG는 자체 고정 bytes로 포함한다. 사용자 파일·한컴 파일·
  upstream의 시험지/사진을 제품에 복사하지 않는다. 생성 실패는 fixture 실패이지 설치 제한이 아니다.
- fixture schema/생성 source와 실행 시 bytes/hash를 묶고 각 복사본의 검사 전후 무결성을
  확인한다. 파일당 최대 1 MiB, 새 전용 임시 디렉터리·고정 파일 목록·비재귀 삭제를 사용한다.
  알 수 없는 파일·junction은 따라가거나 삭제하지 않는다. 앱 시작 때 다른 실행의 임시 폴더를
  일괄 정리하지 않는다. 강제 종료 잔여 가능성과 정상 종료 정리 결과를 구분한다.
- 형식별 `AssocQueryStringW`가 Alhangeul을 선택하고 reference/등록이 준비된 뒤에만 실행한다.
  **최초 Shell → cache-only → force-extract → force 후 cache-only → 직접 COM 활성화** 순서다.
  Shell·cache·force는 각기 새 파일을 쓰고 force 후 cache만 같은 파일을 쓴다. 각 형식은 문서와
  JPG 대조군, association, activate의 기존 10개 label 계약으로 판정한다. 직접 COM 성공이
  최초 Shell을 미리 활성화해 관측을 바꾸지 않게 한다.
- x64 STA child에서 `IShellItemImageFactory.GetImage(SIIGBF_THUMBNAILONLY)`와
  `IThumbnailCache.GetThumbnail(WTS_FORCEEXTRACTION)`를 분리한다. HRESULT, API 단계,
  bitmap 유무·크기·flags를 수집하며 null/0 크기/요청 계약 위반은 성공이 아니다. bitmap bytes는
  IPC/로그에 넣지 않고 owned HBITMAP과 borrowed shared bitmap의 해제를 구분한다.
  [GetImage 공식 계약](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ishellitemimagefactory-getimage)과
  [GetThumbnail 공식 계약](https://learn.microsoft.com/en-us/windows/win32/api/thumbcache/nf-thumbcache-ithumbnailcache-getthumbnail)을 따른다.
- 판정의 기준은 기존 `windows-thumbnail-check-assessment.ps1`이며 위 공개 공통 JSON의
  모든 사례를 Rust와 PS 양쪽에서 검사한다. 성공/known failure만 비교하는 문자열 검사는 부족하다.
  진단 suite는 테스트 fixture의 API 수용이지 lifecycle·대형 문서·Explorer 화면 수용이 아니다.

| 판정 조건 | 결과·사용자 행동 |
|---|---|
| 상태만 확인했거나 권한/UAC 조합이 의심됨 | ‘제한 가능성’/미검사; 실제 실패·MSI 해결 확정 아님 |
| 다른 처리기, 모호한 등록, 참조 불일치, 정책에 의한 표시 제한 | 해당 상태 설명; 자동 등록 변경 없음, 실제 검사 생략 이유 표시 |
| JPG의 Shell 또는 force 검사 실패 | `shell-control-failed`; Windows 공통 환경 확인 |
| user-only·참조 일치·직접 COM 성공·문서 Shell/force 모두 `0x80040154`이고 JPG 대조 성공 | `per-user-shell-activation-failed`; NSIS 설치 형식까지 확인된 경우에만 구체 NSIS→MSI 절차 제시 |
| 위 패턴이나 성공 조건에 맞지 않는 실제 실패 | `unclassified-failure`; 진단 요약 확인, MSI로 해결된다고 단정하지 않음 |
| 문서 Shell/force bitmap 정상과 직접 COM 성공, 증거 완전·무결성 정상 | 형식별 `thumbnail-api-ok`; 다른 형식/다른 문서/Explorer는 별도 |
| 취소·시간 초과·불완전 증거·실행 중 등록 변경·정리 실패 | 해당 완료 불가 상태; 앞선 부분 성공으로 전체 정상 판정 금지 |

설치 형식 unknown이면 known pattern을 관측했더라도 NSIS 제거를 지시하지 않고 설치 이력
확인을 안내한다. 형식별 결과를 보존하고 둘 중 하나만 성공하면 ‘전체 정상’으로 합치지 않는다.
캐시 조회 실패는 진단 행위가 API까지 정상 도달한 경우 관측값일 뿐 추출 실패와 혼동하지 않는다.

### 검증

Windows/Linux의 기존 native 검사 환경에서 실행한다. 이 Mac에서는 Node/문서 검사만 한다.

```sh
node --test tests/windows-thumbnail-app-diagnostics.test.mjs tests/thumbnail-build.test.mjs tests/desktop-artifacts.test.mjs tests/windows-thumbnail-support.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

Windows에서는 `pnpm run build:thumbnail-binaries -- --target x86_64-pc-windows-msvc` 뒤
`pnpm run test:desktop`, `pnpm run clippy:desktop`와 desktop `cargo fmt -- --check`를 실행한다.
Rust는 판정 전 사례·실패/누락 구분·fixture parse/render·선택 처리기 차이·동시 등록 변경·
비정상 pipe·timeout/cancel·경로/handle 정리와 실제 child의 WebView 미시작을 검사한다.
build.rs 참조 stale/누락·binary 변조는 합성 build 입력으로 검사하고 설치 제품은 변조하지 않는다.
Rust 의존성/lock·빌드 스크립트를 변경하므로 remote 최종 범위는 `full`이며 먼저 `fast`를
선택할 수 있다. Windows 부분 실행은 부분 근거로만 남긴다. remote 실행 전 exact 후보와
한 번의 실행 범위를 따로 승인받는다.

### 커밋

`Task #57 [Stage 6.1]: Windows 네이티브 썸네일 진단 기반과 회귀`

## Stage 6.2 — 제품 정보의 진단·안내 UI

### 산출물

- 신규 `apps/studio-host/src/core/desktop-thumbnail-diagnostics.ts`,
  `desktop-thumbnail-diagnostics-model.ts`, 대응 테스트, `src/ui/thumbnail-diagnostics-dialog.ts`
  와 테스트. UI가 크면 상태별 rendering helper로 분리한다.
- 수정 `apps/studio-host/src/ui/about-dialog.ts`, `src/style.css`.
- 신규 native `thumbnail_diagnostics/commands.rs`, command 테스트; 수정 desktop `src/lib.rs`와
  `src/windows.rs`의 window destroy hook. 기존 문서/PDF/window 정리를 대체하지 않고 병행한다.

### 변경 내용

1. `isTauriRuntime()`와 `detectDesktopPlatform()==windows`일 때만 진입점을 표시한다.
   native도 Windows x64를 다시 확인한다. Linux/browser에서는 동적 native import·조회조차
   실행하지 않는다. 관리자 재실행이나 앱 시작 시 자동 검사를 추가하지 않는다.
2. command는 `thumbnail_diagnostics_inspect`, `thumbnail_diagnostics_start`,
   `thumbnail_diagnostics_get_state`, `thumbnail_diagnostics_cancel`로 제한한다. get_state는
   기존 메모리 snapshot만 읽으며 I/O를 재실행하지 않는다. 상태/실제 검사는 background service가
   수행하고 Tauri 호출을 즉시 돌려준다. start는 명시적 `consent=true`를 요구한다.
3. 앱 전체 active operation은 1개다. 서버가 request ID와 호출 window label을 연결하고
   다른 window의 취소·결과 가져오기를 거부한다. owner 창 닫힘은 취소, WebView reload는
   기존 operation을 복구하거나 닫기 동작으로 취소한다. 연결이 끊겨도 180초 상한으로 종료한다.
   controller는 active 동안 500ms 간격으로 snapshot을 조회하고 hide/dispose 뒤 타이머·listener를
   해제한다. 늦게 도착한 ID/sequence의 응답은 표시하지 않는다. 무제한 polling은 없다.
4. 화면 상태는 `상태 확인 중 → 검사 준비 → 검사 중 → 완료/취소/시간 초과/오류`다.
   검사 전 ‘공개 테스트 문서만 사용·임시 파일/캐시 생성·자동 전송 없음’을 설명하고 사용자가
   ‘동의하고 검사’를 눌러 시작한다. 진행 중 단계·취소/닫기를 제공하고 중복 시작은 막는다.
   닫기는 취소 요청을 보내며 네이티브 수명 관리가 최종 회수를 책임진다.
5. 결과는 HWP/HWPX별로 표시하고 환경 경고·실제 API 결과·정리 결과를 분리한다. 정상은
   ‘테스트 문서의 썸네일 검사 통과’라고 표현한다. 실패시 위 판정 표의 다음 행동을 안내한다.
   텍스트는 `textContent`로 삽입하고 backend 예외 원문을 UI/콘솔/복사 요약에 내보내지 않는다.
6. MSI 대안 문구는 ‘현재 실행 문맥에서 사용자별 처리기의 Shell 활성화가 실패했습니다.
   저장·종료 후 NSIS를 정상 제거하고 같은 버전/빌드의 MSI 설치를 대안으로 검토하세요.
   관리자 권한이나 IT 담당자의 도움이 필요할 수 있으며 모든 환경에서 해결을 보장하지 않습니다.’다.
   재부팅 요청 시 따르고 새 문서로 재확인한다는 후속 설명을 제공한다. 실제 파일의 존재·동일
   빌드를 앱이 원격 확인하지 않았다는 점을 표시한다.
7. ‘공식 설치 안내 열기’는 기존 `updater_open_manual_downloads`의 고정 업데이트 페이지
   열기만 재사용한다. updater check/apply/restart는 호출하지 않는다. 다운로드 버튼이나
   같은 빌드 MSI가 준비됐다는 문구는 제공하지 않는다. 미공개/오프라인이면 로컬 안내를
   읽고 신뢰 가능한 배포본 또는 IT 담당자를 통해 확인하도록 한다. 제품은 파일을 자동 받지 않는다.
8. 요약은 schema/version/source·진단 토큰의 제한된 속성·설치 형식·등록 범위·형식별 finding·
   enum/오류 코드·무결성/정리 결과만 allowlist로 생성한다. 경로·SID·사용자명·문서 내용·
   bitmap·예외 문자열은 제외한다. ‘진단 요약 복사’를 누를 때만 Clipboard API를 쓰고,
   실패하면 같은 정제된 텍스트를 선택해 수동 복사할 수 있게 한다. 업로드·저장 이력은 만들지 않는다.
9. 키보드 focus, Escape/닫기, 상태 알림, 긴 한국어 설명과 작은 창에서의 스크롤을 확인한다.
   썸네일 on/off 설정이나 설치 구성 선택은 추가하지 않는다.

### 검증

```sh
pnpm run test:studio
pnpm run build:studio
pnpm run test:upstream
pnpm run check:product-boundary
git diff --check
```

controller는 lazy import·동의 누락·중복 클릭·취소 경쟁·늦은 응답·다중 창 소유권·전체/부분
성공·offline/clipboard 실패를 검증한다. DOM 테스트는 실제 버튼 연결/노출/안내/닫기 동작을
검증하며 controller mock만으로 UI 수용했다고 하지 않는다. 기존 테스트 환경에 DOM이 없으면
현재 브라우저 테스트 도구의 가벼운 harness로 실행하고 새 JS 의존성은 별도 필요성을 보고한다.
Windows native command test와 실제 app UI 검증, Linux 숨김/기존 제품 정보 회귀는 별도로
수행한다. 공유 UI 변경의 CI 범위는 `full`, 빠른 피드백은 `fast`다.

### 커밋

`Task #57 [Stage 6.2]: 제품 정보에 썸네일 진단과 MSI 안내 연결`

## Stage 6.3 — 패키지·현장 수용과 문서

### 산출물과 변경 내용

- `scripts/windows-thumbnail-app-smoke.ps1`와 대응 Node/PS 회귀를 추가하고 기존
  `windows-thumbnail-fixtures.ps1`/installer smoke에 연결한다. 제품의 자체 fixture suite를
  **기존 최초 Shell 요청 이후** 실행해 초기 NSIS 관측을 오염시키지 않는다. 이 CI용 PS는
  제품 실행 의존성이 아니다. 앱의 headless suite와 UI는 같은 native service/판정을 사용한다.
- schema·sourceSha·실제 참조 bytes·종료 코드·bitmap/API 원시값·정리 결과를 대조하고
  `appDiagnosticStatus`와 기존 `thumbnailStatus`/lifecycle를 별도로 기록한다. 기존 공개 대형
  문서 검사는 그대로 둔다. 자체 fixture와 기존 sample은 다른 bytes이므로 결과 불일치를
  숨기거나 같은 문서 수용이라고 표시하지 않는다. 불일치는 분석/수용 판단 대상이다.
- `.github/workflows/alhangeul-windows-smoke.yml`에서 NSIS-only/MSI-only/강제 재설치를
  유지하고 `alhangeul-artifact-platform.yml`의 native/build 검사와 결과를 연결한다.
  제품 bytes 불변 재검사 연결이 필요한 경우에만 `alhangeul-installer-reuse.yml`를 수정한다.
  빠른 PS 계약 등록은 `scripts/ci/windows-tests.ps1`와 관련 `tests/ci-*.test.mjs`에 둔다.
  Desktop job 복제·추가 실험·gate 완화·숨은 재부팅·자동 repair는 하지 않는다.
- 승인된 공식 문서 위치에 실제 UI 사용법·개인정보/권한·판정 한계와 VDI/CI 근거를 반영한다.
  과거 지원 묶음과 신규 native 진단을 구분하고, 이전 artifact의 복사 문서를 수정하지 않는다.

### 검증과 수용 기준

`pnpm run test:automation`, `pnpm run test:studio`, `pnpm run build:studio`,
`pnpm run check:product-boundary`, `git diff --check`와 기존 Windows PS 격리 회귀를 실행한다.
원격은 승인한 exact 후보를 non-force 게시한 뒤 `ci.yml profile=fast`의 빠른 피드백과
최종 `profile=full, scope=full, thumbnail_context_experiment=false`를 선정한다. 동일 변경에서
이미 받은 적격 근거는 영향 diff로 재사용하고 변경 없는 반복 실행을 하지 않는다.

| 계층 | 수용 조건 | 대신하지 못하는 것 |
|---|---|---|
| 순수 계약 | PS/Rust 판정 공통 사례, 상태/요약 schema, UI 회귀 성공 | COM/Shell 실제 실행 |
| 실제 native/installed suite | 정확한 제품 참조·HWP/HWPX/JPG API·시간 제한·정리, 설치 전후 보존 계약 확인 | 앱 dialog와 Explorer 시각 결과 |
| VDI 일반 사용자 UI | exact 새 후보 NSIS로 진단 버튼/동의/결과/복사와 새 문서 표시를 사용자 확인 | PC방·모든 한컴/Windows 조합 |
| 진단 기능 수용 | 실제 실패를 실패로 분류, 미확인 상태에 MSI 해결을 단정하지 않음 | 기존 NSIS 제품 gate 성공 |
| 최종 통합 | 각 필수 job 실제 outcome과 실패/미검증 제한을 보고 | 릴리즈 위험 수용·게시 승인 |

VDI 재확인은 사용자 동의를 받아 새 후보 설치 파일 hash/출처, 앱 진단의 정제된 결과와
Explorer 표시를 수집한다. UAC/실행 정책/등록 범위는 변경하지 않고 개인 문서는 올리지 않는다.
MSI 전환 실설치나 PC방 재방문은 자동 요구하지 않으며 실행하지 않으면 안내 동작만 검증했다고
기록한다. UI 안내가 MSI 설치 성공을 재현한 것처럼 표현하지 않는다.

`installer` 재사용에는 성공 producer의 `product_sha`/`product_run_id`/`artifact_id`/
`artifact_digest` 네 값을 정확히 지정한다. 새 앱·native·fixture bytes는 반드시 새 제품으로
검증하고 ordinary workflow commit과 resolved build commit을 일치시킨다. 최신 failed run을
재사용 적격으로 만들거나 full 실패를 진단 테스트 성공으로 덮지 않는다.

### 커밋

`Task #57 [Stage 6.3]: 앱 썸네일 진단 수용과 설치 안내 문서 정합화`

## 단계 의존성·위험과 승인 요청

6.1 보고·승인 뒤 6.2, 6.2 보고·승인 뒤 6.3을 진행한다. 각 단계 소스와 실제 단계 보고서를
같은 커밋에 묶고 미실행 Windows/현장 검증을 남긴다. Stage 5의 invalid 정리와 MSI 3010은
이 구현으로 해결됐다고 기록하지 않는다. 최종 보고·PR·릴리즈는 기존 별도 승인 절차를 따른다.

주요 위험은 headless 진입점이 일반 앱 실행에 미치는 영향, COM/child hang·취소와 임시 잔여,
자체 fixture의 생성/렌더 적합성, 진단 문맥과 Explorer의 차이, AppLocker 등 외부 실행 제한이다.
자체 fixture의 실제 생성/렌더가 현재 pin에서 실패하면 사용자 sample을 몰래 대체하지 않고
동일 단계 안에서 원인을 보고한다. 별도 EXE/새 패키지/추가 JS 의존성/설치 정책 수정이 필요하면
이 구현계획을 다시 승인받는다. 구현 전에 Windows 지원 밖의 빌드나 검증을 추가하지 않는다.

이번 승인 요청은 위 **6.1–6.3의 구현 분할·정확한 변경 경계·검증·커밋 계획**이다.
승인 후에는 먼저 6.1만 구현한다. 원격 실행 입력과 후보 게시, 다음 하위 단계로의 진입은
각 시점에 별도 승인을 받는다.

### Stage 5.4 승인된 Windows 부분 비교 실행

2026-09-09 같은 스레드의 “진행해줘”로 아래 후보 게시·Windows 부분 비교 1회를 승인받았다.
clean HEAD와 승인 후보, 원격 이전 후보 `6b3d9ba`의 조상 관계를 확인했다. 실행 전 이 ref의
ci.yml에는 완료된 run만 있었다. non-force push 후 원격 exact SHA를 확인하고 1회 dispatch했다.

| 항목 | 기록 |
|---|---|
| 후보 / 실제 run head SHA | `1dcac31504434b487b80d82398ebb8c6389d91c9` |
| ref / workflow | `publish/task57` / `.github/workflows/ci.yml` |
| Run | [34328534574](https://github.com/postmelee/alhangeul-tauri/actions/runs/34328534574), attempt 1, workflow_dispatch |
| 생성 시각 | 2026-09-09 17:20:04 KST (`2026-09-09T08:20:04Z`) |
| 전송 입력 | `profile=windows-package`, `scope=full`, `thumbnail_context_experiment=true` |
| 최초 job 조회 | select `102391399398`·artifacts/plan `102391454263` success |
| 빠른 계약 | Node/Studio `102391506795`·Windows PS `102391506844` in_progress |

입력은 성공한 dispatch 명령의 전송 기록이며 API의 전체 입력 객체 read-back이 아니다.
entry의 standalone fast/installer/Unit tests·PDF cleanup은 선택 밖으로 skipped다.
실제 fast는 artifacts 내부에서 실행한다. 이후 Windows core·제품 생성, 독립 설치 검사 3개와
비교 replica 2개를 수행하는 실행안이다. Linux 제품 빌드와 릴리즈는 선택하지 않았다.
완료 후 새 bundle/support ID·digest·source provenance, 원시 비교와 cleanupDiagnostics를 확인한다.
현재 부분 수용·NSIS 해결·정리 성공은 주장하지 않는다. 임시 HKCU/HKLM·보호 경로 실험은
아래 승인된 hosted VM 범위만 유지하며 추가 실행·제품 수정·사용자 PC 조작은 하지 않는다.
이 실행 기록은 후보와 별도 로컬 문서 커밋으로 보존하고 추가 push/dispatch는 하지 않는다.
아래 승인 대기 표현은 당시 이력이다.

### Stage 5.4 fast 결과 확정과 실제 비교 실행안

작업지시자가 fast 결과 분석 뒤 “진행해줘”로 결과 기록·재실행 계획 정리를 승인했다.
이번 작업은 기존 두 계획서와 오늘할일만 갱신한다. 코드/공식 문서 위치는 변경하지 않고
Stage 5.4 전체 완료 보고서는 실제 Windows 진단 검증 전까지 보류한다.

[run 34272745938](https://github.com/postmelee/alhangeul-tauri/actions/runs/34272745938),
attempt 1은 success다. 실행 SHA는 `6b3d9baa6b0129c9c0ba7a8ce0ca06caa59be88f`이며
`profile=fast`, `scope=full`, `thumbnail_context_experiment=false` 전송 기록과 일치한다.

| 실제 실행 근거 | 결과 |
|---|---|
| select `102218165017` | success |
| Windows PS `102218226593` | success; 52 sources, 5 isolated tests |
| Node/Studio `102218226770` | success; automation 685개, Studio 147개·build, boundary 490파일 |
| artifacts / installer | skipped; 제품 생성·실제 설치/registry 관측 없음 |

로그의 `Pure thumbnail assessment/context regressions passed; no native or installer acceptance.`와
`PowerShell contracts passed: 52 sources, 5 isolated tests`를 대조했다. 새 정리 진단의
순수 실패 분류·개인정보/원래 오류 보존·JSON 계약은 Windows PS에서 통과했다. 로그는
`/private/tmp/task57-fast-34272745938.log`다. 실제 파일·registry 수집과 NSIS 제거 원인은
아직 검증하지 않았다. 아래 실행 대기 표현은 당시 이력으로 유지한다.

#### 다음 원격 실행 — 별도 승인 후 1회

- 후보는 이번 결과·계획 문서 커밋의 exact SHA다. 구현 코드는 검증된 `6b3d9ba`와 같지만
  새 workflow/source identity이므로 이전 run이 이 문서 후보까지 검증했다고 표현하지 않는다.
  clean 상태·원격 조상 관계·진행중 실행을 확인해 `publish/task57`에 non-force 게시하고,
  원격 SHA를 재조회한 후 `ci.yml`을 아래 입력으로 한 번 dispatch한다.
- 입력: `profile=windows-package`, `scope=full`, `thumbnail_context_experiment=true`.
  entry가 같은 `github.sha`를 build_ref로 넘기며 내부 artifacts profile=full/run_tests=true,
  platform=windows-x64로 실행한다. workflow/checkout/resolved source SHA 일치를 확인한다.
- fast Windows/Linux 계약 검사, Windows x64 core·native/package 생성, 독립 NSIS lifecycle/
  MSI lifecycle/MSI forced-reinstall 3개, 비교 replica 2개와 집계를 실행한다. Linux 제품 빌드는
  생략한다. 비교 job 최대 30분·기존 phase/probe 제한을 유지하고 비용을 수반하는 새 빌드임을 명시한다.
- 이번 변경은 Windows CI 진단 helper/회귀에 한정됐고 workflow/공유 제품·lock은 변경하지 않았다.
  Windows 부분 재실험으로 기록하며 이전 full 실패를 해소하거나 최종 통합 수용으로 대신하지 않는다.
  workflow/공유 코드 변경 또는 최종 통합 시에는 CI_VALIDATION.md에 따라 full이 다시 필요하다.
- 제품 bytes 불변 일반 설치 검사는 적격 producer의 exact 4개 입력으로 installer를 사용한다.
  그러나 이번 fast에는 제품 artifact가 없고 이전 `34259185689`는 전체 failure로 재사용 부적격이다.
  현 installer 재사용 경로에는 비교 opt-in도 없다. 이 때문에 현재 fresh Windows 경로를 선택하며,
  실패 producer 허용이나 workflow 우회로 비용을 줄이지 않는다. 새 bundle/support ID·digest·
  inventory sourceSha를 기록하고 같은 producer의 exact ID와 다운로드 digest 검증을 유지한다.

#### 관측·안전·판정 기준

1. Windows context 계약에서 실제 임시 파일/key 수집 회귀를 먼저 확인한다. 실패하면 실험은
   선행 실패로 구분하고 코드 보정·재실행을 자동 진행하지 않는다.
2. 기존 C0 → 가능한 C1 → C2 → C3 → 복원 비교를 두 clean hosted VM에서 유지한다.
   baseline 미재현·정상 사용자 문맥 부재는 각각 baseline-not-reproduced/context-unavailable로
   기록한다. HKCU 경로·HKLM 제품 COM 임시 개입은 기존 보호 경로/동일 bytes/소유권 journal
   조건에서만 수행한다. 사용자 PC·UAC/정책·기본 앱·제3자 handler를 바꾸지 않는다.
3. cleanupDiagnostics의 preflight/before-cleanup/after-uninstall-wait/실패 snapshot과
   cleanupFailure를 읽어 경로·프로세스·hive/view/key/제거 항목 잔존, 빈 key, unreadable을
   구분한다. not-run은 성공이 아니며 associationsRestored=false만으로 연결 훼손을 단정하지 않는다.
   원시 phase/probe·두 replica·MSI 대조와 함께 판단한다.
4. 진단 성공은 실패 항목이 구분됐다는 뜻이다. status=invalid 또는 cleanup=false이면 실험
   전체 성공으로 표시하지 않는다. 비교 실패 시 workflow의 후속 raw gate는 skipped일 수 있어
   수집 artifact의 별도 읽기 전용 분석과 구분한다. 부분 증거로 skipped gate를 성공 처리하지 않는다.
5. NSIS 썸네일 실패와 MSI 강제 재설치 3010은 기존 제품 gate에서 그대로 실패한다.
   제거 실패 항목이 밝혀져도 빈 key 허용·강제 삭제·host 종료·timeout 연장·재부팅은 하지 않는다.
   원인에 따른 수정은 새 계획/승인으로 진행하며 제품 전체 사용자 NSIS·#58·앱 UI로 확대하지 않는다.

현재 승인 요청은 이 exact 후보 게시와 Windows 부분 비교 **1회**다. 제한된 hosted VM의
임시 HKCU/HKLM·보호 경로 실험을 포함한다. 추가 실행·릴리즈·PR·이슈 close는 제외한다.
이번 문서 작업에서는 원격 게시/dispatch를 수행하지 않았으며 링크·상태·diff만 검증한다.

### Stage 5.4 승인된 후보 게시·fast 실행

2026-09-09 같은 스레드의 “진행해줘”로 후보 게시와 fast 1회 실행을 승인받았다.
clean 작업 트리·승인 후보 HEAD와 원격 이전 후보 `7083ccf`의 조상 관계를 확인했다.
실행 전 ci.yml의 이 ref에는 완료된 run만 있었으며 진행중 fast를 취소하지 않았다.
`publish/task57`에 non-force push 후 exact 원격 SHA를 재조회하고 한 번 dispatch했다.

| 항목 | 실행 기록 |
|---|---|
| 후보 / 실제 run head SHA | `6b3d9baa6b0129c9c0ba7a8ce0ca06caa59be88f` |
| ref / workflow | `publish/task57` / `.github/workflows/ci.yml` |
| Run | [34272745938](https://github.com/postmelee/alhangeul-tauri/actions/runs/34272745938), attempt 1, workflow_dispatch |
| 생성 시각 | 2026-09-09 05:05:24 KST (`2026-09-08T20:05:24Z`) |
| 전송 입력 | `profile=fast`, `scope=full`, `thumbnail_context_experiment=false` |
| 최초 job 조회 | select `102218165017` success, Windows PS `102218226593` in_progress, Node/Studio `102218226770` queued |

입력은 성공한 dispatch 명령의 전송값이며 API의 전체 입력 객체 재조회가 아니다.
artifacts와 Windows PDF cleanup은 skipped다. `scope=full`은 일반 profile 경로 선택이며
제품 전체 검증인 `profile=full`이 아니다. 실제 설치·임시 registry/COM 비교·릴리즈는
실행하지 않았다. 완료 뒤 Windows PS 순수 회귀와 Node/Studio 결과를 대조한다.
이 기록은 실행 후보와 별도 로컬 문서 커밋으로 보존하며 추가 push·dispatch는 하지 않는다.
현재 fast 성공·Stage 5.4 전체 수용·NSIS 해결은 선언하지 않는다. 아래 대기 표현은 당시 이력이다.

2026-09-09 같은 스레드의 “진행해줘”로 Stage 5.4의 CI 전용 진단 보완·회귀·로컬 검증·
후보 커밋을 승인받았다. 기존 #57 worktree와 계획을 이어가며 원격 게시/실행과 제품 변경은 제외한다.

### Stage 5.4 로컬 구현 결과와 원격 인계

- 신규 cleanup helper에 기존 24개 필수 대상(경로 2·제품 process 2·hive/view별 key/제거 항목
  20)의 읽기 전용 관측과 순수 판정을 분리했다. 빈 key도 present로 남기며 조회 실패·증거
  누락/중복·미실행은 clean이 될 수 없다. 기존 정리 assertion을 이 helper로 옮겼다.
- 초기 오염 검사·정리 직전·기존 제거 대기 후·실패 시점에 snapshot을 남긴다. 보호 복사본/
  요청 디렉터리와 Shell host 관측은 보충 증거로만 두고 이들의 존재만으로 설치 정리 gate를
  실패시키지 않는다. 별도 기존 보호 복사본 제거 gate는 유지한다. 파일 이름은 allowlist
  개수/기타 개수로만 기록하며 최대 256개 비재귀 관측과 reparse 경계를 유지한다.
- 오류의 고정 코드·수치 HRESULT·operation을 최초 실패 시 저장한 뒤 보충 관측을 수행한다.
  snapshot 실패는 unreadable로 남기고 최초 오류를 바꾸지 않는다. 정리 6단계에 not-run/
  running/passed/failed를 기록하며 additive cleanupDiagnostics/cleanupFailure의 version과
  JSON 판정을 검증한다. 원래 experiment schema와 실패 exit 2·소유권 복원 순서는 유지한다.
- Shell host는 이름/경로/명령행 대신 개수·handler 로드 수·동일 사용자/세션 수를 기록한다.
  권한/모듈 조회 실패는 unreadable이며 실패를 성공이나 host 없음으로 바꾸지 않는다.
- fast는 AST allowlist로 순수 함수/회귀만 읽는다. 실제 임시 파일·registry 검사는 기존
  CIConsent context 테스트에서만 호출한다. 새 helper는 사용자 support 묶음에 넣지 않았다.
  제품/installer/등록/worker·workflow·lock·기본 앱·#58에는 변경이 없다.
- 신규 helper와 회귀 파일은 각각 300 LOC 이내, 신규 함수는 50 LOC 이내로 분리했다.
  Windows 실행 전 후보인 만큼 Stage 5.4 전체 완료 보고서는 아직 만들지 않는다.

| 로컬 검증 | 결과 |
|---|---|
| context/CI 통합/fast Node 대상 | 21 passed |
| 전체 automation | 685 passed, 0 failed, 0 skipped |
| product boundary | 490 files, 통과 |
| 전체 workflow actionlint / diff | 통과 |
| 실제 PS 5.1·registry·native·설치/제거 | 미실행; 로컬 source-contract로 대체하지 않음 |

로그는 `/private/tmp/task57-stage54-automation.log`다. 회귀는 잔존 항목별 실패·빈 key·
읽기 거부/조회 중 소멸·복수 잔존·JSON round-trip·개인정보 sentinel·원래 오류 보존·미도달
단계 오판 방지·진단 판정과 raw 불일치를 포함한다. Windows 실행 성공은 아직 주장하지 않는다.

다음 승인 요청: 후보를 `publish/task57`에 non-force 게시하고 같은 exact SHA로 `ci.yml`
`profile=fast`, `scope=full`, `thumbnail_context_experiment=false` **1회** 실행한다.
진행중 동일 ref/profile을 먼저 확인하고 source/head SHA를 대조한다. 제품 빌드/설치·
임시 registry 비교는 이 fast 실행에 없다. 실제 비교 재실행은 fast 결과 뒤 별도로 승인받는다.
NSIS 해결·Stage 5 전체 수용·full 성공·PR/close/배포로 자동 전환하지 않는다.

## Stage 5.3 완료 결과 분석 — 전체 수용 실패 유지

실행은 [34259185689](https://github.com/postmelee/alhangeul-tauri/actions/runs/34259185689),
attempt 1, head `7083ccfb05b39516294d698de2ca124a3bfd6820`, full/비교 opt-in이며 failure다.
Windows x64·Linux x64/arm64 build 및 core, Windows/Linux fast가 모두 성공했다.
MSI 일반 job `102185264138`은 성공, NSIS `102185264148`은 처음/재설치의 문서 요청 12개가
`0x80040154`로 실패했다. 일반 NSIS lifecycle과 제거 상태 검사는 통과했다.
MSI 강제 재설치 `102185264290`은 썸네일 성공과 별개로 재설치 3010·재부팅 필요를 기록했다.
최종 result `102186431796`은 smoke 실패를 그대로 반영했다.

### 비교 원시 증거

| 단계 | 두 replica 공통 관측 |
|---|---|
| C0 initial: NSIS 기본 경로·HKCU | 작은 HWP·큰 HWP·HWPX의 Shell/force-extract 6개 실패 |
| C2: 같은 bytes·보호 경로·HKCU | 6개 실패; 경로 변경만으로 해소되지 않음 |
| C3: C2에 제품 CLSID의 HKLM COM 등록만 추가 | 6개 모두 HRESULT 0·실제 bitmap/양수 크기 성공 |
| C2 after machine restore | HKLM 제거 후 6개 다시 실패 |
| C0 final | 원래 HKCU 경로 복원 후 6개 실패 |

실패 코드는 모두 `0x80040154`이며 JPG/association/직접 COM 대조는 성공했다.
10개 phase의 각 16개 probe와 저장된 원시 JSON·종료 코드를 대조했다. phase별 status=observed,
cleanup=true, integrityChecks=12였다. Shell 실패의 bitmap=false와 force-extract 실패의
bitmap=null은 모두 실패 계약상 허용하며 성공으로 세지 않았다. C3 뒤 dllhost의 handler
로드도 관측했다. 동일 handler/worker hash, EnableLUA=1, elevated=true, integrityRid=12288,
image `20260824.214.3`이다. linked token/정상 Explorer 부재로 C1은 context-unavailable이다.

| 진단 artifact ID | archive SHA-256 (`sha256:` 접두사 생략) |
|---|---|
| `10070724915` — context 1 | `3ce13e836db8c99c245c0b2678a52e075708dce3bcd9abe9a75ea448283862e1` |
| `10070713028` — context 2 | `48ce27fefc725f4f8a3e66b3d026e62212db7023864bf55f84c6e6366f70a911` |
| `10070736285` — NSIS | `e2b0d36cae9da1e2dadeac04238d9f3d373880313202471ab6e79dd634e457b5` |
| `10070738144` — MSI 일반 | `0fd7a9404227631bc5d00b36a6fd719626622cfca6ac5737ab53447506cb8528` |
| `10070755726` — MSI 강제 재설치 | `f5f6d0aa85b4e47a5bf2310f444ae2c24ff73ef3729eae4af6cb193658f0b620` |

위 5개 archive를 다운로드해 hash를 GitHub metadata와 대조했다. 로컬 분석 자료는
`/private/tmp/task57-full-analysis.nS2dBB`, 실패 로그는
`/private/tmp/task57-full-34259185689-failed.log`다. Windows 제품 artifact `10070352612`의
API digest는 `sha256:5b14639ad57ed6ea0491ba8d36c7e2a615ebc8fb67cd47422f13d377b1f13184`이며
진단 archive 5개와 달리 제품 archive bytes를 이번 분석 호스트에서 재계산하지 않았다.
생산 run 전체가 failure이므로 이 제품을 성공 producer 조건의 installer 재사용 입력으로 쓰지 않는다.

### 관측의 한계와 정리 실패

context job `102185264185`/`102185264053` 모두 Windows context 계약 회귀는 성공했고 실제
비교에 도달했다. 이후 experiment.json은 operation=comparison-complete, error=null이지만
status=invalid, cleanupOperation=verify-uninstall, cleanupError=cleanup-failed,
cleanupErrorCode=-2146233087, installExit=0, uninstallExit=0이었다.
registryRestored=true는 임시 COM 변경의 복원 확인이다. associationsRestored=false와
cleanup=false는 뒤 검증에 도달하지 못한 결과이며 연결이 실제 훼손됐다는 증거는 아니다.
보호 복사본·요청 디렉터리 제거 단계도 도달하지 못했으므로 완료로 기록하지 않는다.
workflow의 후속 raw-evidence 검사는 비교 실패 때문에 skipped다. 위 로컬 JSON 대조는 그
Windows gate를 소급 성공으로 바꾸지 않는다.

`Assert-ContextEmptyInstall`은 경로·프로세스·32/64비트 HKCU/HKLM 제품 key·제거 항목을
순차 검사하고 첫 오류를 던진다. catch가 세부 코드를 버려 실제 잔존물과 읽기 오류를 구분할
수 없다. 일반 smoke는 일부 소유 value를 세지만 비교는 key 존재도 검사하므로 같은 계약이 아니다.
빈 key 차이·지연 제거·파일 잠금·조회 예외는 후보일 뿐 이번 실패 원인으로 확정하지 않는다.
HKLM 조건의 반복적인 성공/실패 전환은 이번 hosted 문맥에서 등록 범위 영향의 강한 근거지만,
정리까지 수용된 실험·정상 로그인 사용자 수용·실제 한컴 환경의 단일 원인 확정은 아니다.

## Stage 5.4 — 제거 실패 진단 보완 구현 승인안

분석 후 “진행해줘”로 아래 계획 작성만 승인받았다. 이번 산출물은 기존 두 계획서와
오늘할일이며 제품/공식 문서의 위치 변경이나 완료 보고서 추가는 없다.
다음 승인 단위는 **CI 전용 진단 코드·회귀 보완, 로컬 검증, 후보 커밋**이다.

### 코드 변경 범위와 증거 계약

1. `scripts/windows-thumbnail-context-cleanup.ps1`을 CI 전용 읽기 전용 수집/순수 판정 helper로
   분리한다. 기존 process helper의 정리 대상 allowlist와 동일한 경로·제품 프로세스·
   hive/view/key 역할·제거 항목을 관측한다. 각 항목을 absent/present/unreadable로 구분하고,
   읽기 오류·조회 도중 사라진 항목을 무조건 absent로 간주하지 않는다.
2. path는 local-install/machine-install/protected-copy/request-root 역할, 파일은 제품 파일
   allowlist·기타 개수, registry는 고정된 key 역할·hive/view·value/subkey 개수와 빈 key 여부만
   기록한다. 프로세스는 제품/host 역할·조회 가능 범위의 동일 사용자/세션·handler 로드 여부만
   기록한다. 실제 개인 경로·SID·전체 프로세스 명령행·임의 파일명·제3자 registry 내용은 출력하지 않는다.
   관측 대상 밖의 process/파일을 검사하기 위해 권한을 높이거나 재귀 탐색하지 않는다.
3. experiment의 정리 직전/제거 후 기존 제한 시간 내 관측 종료/실패 시점에 읽기 전용 snapshot을
   남긴다. `cleanupFailure`에 allowlist 코드·operation·수치 오류 코드와 snapshot 수집 상태를
   추가한다. 알려지지 않은 예외는 고정 unknown 코드로 보존하고 원문 Message/stack은 내보내지 않는다.
   관측 자체가 실패해도 최초 실패 원인을 덮어쓰거나 기존 experiment.json 생성을 막지 않는다.
4. `Assert-ContextEmptyInstall`의 gate는 현재 기준을 유지하고 helper의 판정 결과를 사용한다.
   기존 `status`, `cleanup`, `registryRestored`, `associationsRestored` 의미는 바꾸지 않는다.
   미도달 항목은 별도 not-run으로 구분한다. additive 진단 필드에 schemaVersion을 둬 검증한다.
   초기 오염 검사의 실패도 허용된 진단만 남기고 설치·비교 개입 전에 중단한다.
5. registry journal 충돌 시 제거를 시작하지 않는 기존 순서를 유지한다. 실패 후에는 읽기 전용
   관측만 허용하고 강제 삭제·잠긴 DLL의 host 종료·재부팅·권한/ACL 변경·timeout 연장은 하지 않는다.
   빈 key 잔존을 허용하거나 비교 cleanup을 expected-negative로 바꾸지 않는다.
6. 기존 `context-tests.ps1` 및 Node source-contract에 연결하고 별도 순수 cleanup 회귀 파일을
   추가한다. `tests/windows-thumbnail-fast.test.ps1`에는 순수 데이터 테스트만 연결한다.
   실제 registry/filesystem 수집 검사는 기존 CIConsent Windows context 계약 진입에 연결한다.
   실험 helper는 일반 사용자 support manifest에 넣지 않는다. workflow/제품/lock은 변경하지 않는다.

예정 파일: 신규 `scripts/windows-thumbnail-context-cleanup.ps1`,
`scripts/windows-thumbnail-context-cleanup-tests.ps1`; 기존 `context-process.ps1`,
`context-experiment.ps1`, `context-tests.ps1`, `tests/windows-thumbnail-fast.test.ps1`,
`tests/windows-thumbnail-context-experiment.test.mjs` 및 작업 기록.
파일 300 LOC/함수 50 LOC를 목표로 수집·정규화·판정을 분리하고 초과가 필요하면 먼저 계획을 조정한다.

### 회귀와 수용 기준

- 순수 회귀: 모두 absent, 경로/파일/프로세스/key/제거 항목 각각 present, 빈 key, unreadable,
  복수 잔존, 조회 중 소멸, 미도달 단계, unknown 예외, snapshot 실패 시 최초 오류 보존,
  개인정보 sentinel 제거, JSON round-trip. 하나라도 잔존/읽기 불명확하면 clean=true 금지.
- Windows 격리 검사: 임시 파일·task 소유 임시 key의 absent/present/empty 및 접근 실패 주입을
  확인한다. 실제 권한 정책을 바꾸어 접근 거부를 만들지 않는다. 기존 registry 충돌/복원·실패
  fixture·160개 원시 probe 재대조 계약도 유지한다. 일반 사용자 토큰을 임의로 합성하지 않는다.
- 로컬: `node --test tests/windows-thumbnail-context-experiment.test.mjs tests/ci-task57-integration.test.mjs tests/ci-fast.test.mjs`,
  `pnpm run test:automation`, `pnpm run check:product-boundary`, 전체 workflow actionlint,
  `git diff --check`. Windows PS/native는 이 호스트에서 실행하지 않는다.
- 원격 첫 피드백은 별도 승인 후 `ci.yml profile=fast`다. 실제 비교 재실행은 다시 승인받는다.
  bytes 불변 일반 설치 검사는 적격 producer의 exact product_sha/product_run_id/artifact_id/
  artifact_digest로 installer를 쓴다. 이번 failed producer는 부적격이며 현재 재사용 경로는
  비교 opt-in을 지원하지 않는다. 이번 보완만을 위한 재실험은 workflow 변경 없이
  `windows-package`+비교 opt-in의 새 exact SHA/bytes 실행안을 제시할 수 있다. 비용과 신규
  bytes임을 명시하고 부분 검증으로 기록한다. workflow/공유 코드 변경이나 최종 통합은 full이다.
- 진단 보완의 성공은 실패 항목·읽기 불가·미도달이 안전하게 구분된다는 뜻이다. cleanup가
  계속 실패하면 원인 분류만 완료이며 실험 전체 성공/NSIS 제품 해결로 올리지 않는다.

### NSIS 설치 범위 대응 방향 — 제품 변경 승인 아님

현재 tauri.conf의 NSIS는 currentUser이고 hook은 `/i:user` 등록/해제를 사용한다.
이번 임시 HKLM 성공을 제품 설치 정책으로 그대로 옮기지 않는다.

| 선택 | 판단 / 선행 조건 |
|---|---|
| 사용자별 NSIS 유지 + MSI 대안 | 당장의 기본 방향. 기존 진단/안내 근거를 유지하고 일반 사용자 문맥까지 일괄 실패라고 표시하지 않음 |
| 명시적 전체 사용자 NSIS | 후속 설계 후보. Program Files 보호 경로·HKLM·권한 동의·기본 앱 보존·업데이트/제거·기존 사용자별 설치 전환과 MSI 충돌을 함께 검증해야 함 |
| 사용자별 NSIS에서 조용히 HKLM 추가 | 채택하지 않음. 설치 범위/권한/소유권 계약을 바꾸고 사용자 쓰기 가능 경로를 시스템 COM으로 노출할 위험 |
| 한글 버전 분기·엔진 교체 | 현재 근거로 우선하지 않음. 같은 제품 bytes가 등록 조건 변경으로 성공했으므로 해당 경계를 먼저 검증 |

다음 제품 결정 전 제거 실패를 구분하고, 승인된 정상 로그인 Windows 10/11 환경에서 같은
NSIS의 비승격/승격 비교와 Explorer 시각 검증을 보완한다. UAC 값을 바꾸거나 실제 PC방/VDI를
임의 조작하지 않는다. 전체 사용자 NSIS가 필요하면 별도 이슈 생성·설계 승인을 요청한다.
#57은 진단·재현/원인 증거와 수용 한계를, #58은 선택 설치·앱 토글을 계속 소유한다.
앱 UI·설치 기본값·제품 등록·실제 안내 문구·새 이슈·PR·배포는 이번 Stage 5.4에 포함하지 않는다.

### 현재 승인 요청

위 CI 전용 진단 보완과 회귀·로컬 검증·후보 커밋을 승인받는다. 원격 게시/fast/실제 비교는
각 후보 결과 제시 뒤 별도 승인한다. 이번 계획 작성에서 코드 변경이나 CI 재실행은 하지 않았다.
이번 문서 검증은 로컬 링크·오늘할일 진행중 상태·`git diff --check`를 통과했다.
제품/테스트 변경이 없어 실행 회귀는 재수행하지 않았으며 기존 실패를 통과로 바꾸지 않았다.

## Stage 5.3 승인된 후보 게시·full 실행 기록

2026-09-09 작업지시자가 같은 스레드의 “진행해줘”로 후보 게시 및 full+비교 1회 실행을
승인했다. clean `local/task57`의 HEAD가 승인 후보와 일치했고, 원격 이전 후보
`26ded313dad49dfd8cd21145aff7e57e3c51cb77`이 그 조상임을 확인했다. 실행 전 이 ref의
ci.yml 조회에는 완료된 fast run만 있었으며 진행중/pending 실행과 충돌하지 않았다.
non-force push 후 원격 ref의 exact SHA를 재조회한 뒤 dispatch를 한 번만 수행했다.

| 항목 | 기록 |
|---|---|
| 후보 / 실제 run head SHA | `7083ccfb05b39516294d698de2ca124a3bfd6820` |
| ref / workflow | `publish/task57` / `.github/workflows/ci.yml` |
| Run | [34259185689](https://github.com/postmelee/alhangeul-tauri/actions/runs/34259185689), attempt 1, workflow_dispatch |
| 생성 시각 | 2026-09-09 02:47:18 KST (`2026-09-08T17:47:18Z`) |
| 전송 입력 | `profile=full`, `scope=full`, `thumbnail_context_experiment=true` |
| 최초 job 조회 | select `102172564657`·artifacts/plan `102172628770` success |
| 빠른 검사 | artifacts/fast Windows `102172685323`·Linux `102172685325` in_progress |

입력은 성공한 dispatch 명령의 전송값이며 run API의 전체 입력 객체 read-back이 아니다.
entry의 standalone fast/installer/Unit tests·Windows PDF cleanup은 선택 밖이므로 skipped다.
실제 full의 fast는 artifacts 내부에서 실행된다. workflow가 같은 `github.sha`를 build_ref로
전달하고 plan의 exact source 검사가 성공했다. 생성물 inventory·새 bundle/support ID/digest와
다운로드 bytes 검증, 실제 제품/비교/복원 결과는 후속 완료 분석에서 확인한다.

승인은 아래 계획의 Windows/Linux 생성·독립 installer 3개·비교 replica 2개와 폐기 가능한
hosted Windows의 제한된 임시 HKCU/HKLM·보호 경로 개입까지다. 사용자 PC·UAC/정책·기본 앱·
#58·제품 보정·재부팅·릴리즈는 변경하지 않는다. 현재 full 수용·NSIS 해결·Stage 5 완료는
선언하지 않는다. 이 로컬 기록 커밋을 실행된 후보 SHA로 표시하지 않으며 추가 push/dispatch는
수행하지 않는다. 아래 승인 대기 절은 실행 전 이력으로 유지한다.

## Stage 5.2 원격 결과 확정

[run 34256381653](https://github.com/postmelee/alhangeul-tauri/actions/runs/34256381653)의
attempt 1은 success이며 실제 head SHA는 `26ded313dad49dfd8cd21145aff7e57e3c51cb77`이다.
`profile=fast, scope=full, thumbnail_context_experiment=false` 전송 기록과 대조했다.
select·Windows PowerShell·Linux Node/Studio 3개 job이 성공했고 artifacts/installer는 skipped다.
Windows에서 50개 소스 계약과 5개 격리 테스트가 통과했으며 context의 순수 분류·원시 증거
회귀 성공 로그를 확인했다. Linux는 automation 681개·upstream 36개·Studio 147개·build와
boundary 488파일 및 GUI typecheck 등을 통과했다.

실제 token 전환·보호 registry/ACL·COM·설치·비교는 fast 범위가 아니므로 아직 미검증이다.
상세 provenance와 재실행한 로컬 검사는 [Stage 5.2 보고서](../working/task_m010_57_stage5.2.md)를
따른다. 보고 커밋은 실행 후보와 분리하며 문서 커밋까지 fast에서 검증했다고 표시하지 않는다.
이하 과거 절의 결과 대기·미실행은 해당 시점의 이력으로 보존한다.

## Stage 5.3 — full 통합·격리 비교 실행 승인안

이번 승인은 계획 작성까지다. 다음 원격 게시·실행은 별도 승인 후 1회만 진행한다.

### profile 선택과 출처

[CI_VALIDATION.md](../../docs/operations/CI_VALIDATION.md)의 workflow 통합·최종 통합 기준에
따라 `full`을 선택한다. 테스트 보정만의 빠른 회귀는 이미 fast에서 확인했다. 제품 bytes가
그대로인 일반 installer 검사에는 exact 4개 입력의 `installer`가 원칙이지만 현재
`alhangeul-installer-reuse.yml`에는 context opt-in 전달이 없다. 이번 비교를 위해 재사용
workflow를 추가 수정하거나 일반 smoke 성공을 비교 실험 성공으로 대신하지 않는다.
fast run에는 제품 bytes가 없으며, 이전 `34065777777`은 실패 run/구형 inventory로 부적격이다.
이는 모든 외부 artifact가 부적격이라는 판단이 아니라 현재 알려진 후보에 대한 판단이다.

1. 이번 보고·계획 커밋을 exact 후보로 삼고 clean 상태·원격 조상 관계·진행중 run을 확인한다.
   `publish/task57`에 non-force push 후 원격 SHA가 후보와 같은지 재조회한다.
2. `ci.yml`을 해당 ref에서 `profile=full`, `scope=full`,
   `thumbnail_context_experiment=true`로 한 번 dispatch한다. workflow가 `github.sha`를
   build_ref로 넘기므로 ordinary workflow SHA와 resolved source SHA가 같아야 한다.
   ci 입력에 없는 build_ref나 과거 product artifact 입력을 임의로 추가하지 않는다.
3. 실제 run head SHA·attempt·전송 입력·시각을 기록한다. 새 bundle/support의 ID·digest·
   inventory sourceSha를 확인하고 같은 producer의 정확한 artifact ID로 검사한다.
   다운로드 digest 검증을 유지하고 새 bytes를 과거 installer 수용의 연장으로 표시하지 않는다.

### 실행 범위와 비용

| 경로 | 실행 범위 |
|---|---|
| entry/plan/fast | 입력·exact SHA 확인, Linux Node/Studio와 Windows PowerShell 회귀 |
| core/native/package | Windows x64, Linux x64·arm64의 선택된 full 검사와 새 bundle/support 생성 |
| Windows installer | 독립 clean VM 3개: NSIS lifecycle, MSI lifecycle, MSI forced-reinstall |
| Windows context | 독립 clean VM replica 2개; 비교 job당 최대 30분, phase 최대 10분, probe 30초 |
| result | 선택된 전체 gate 집계; 일부 성공으로 full 수용을 대체하지 않음 |

`alhangeul-artifact-platform.yml`과 `alhangeul-windows-smoke.yml`의 현재 책임을 유지한다.
Desktop의 옮겨진 본문은 복원하지 않는다. full은 Windows만 빌드하는 실행보다 Linux 2종 등
runner 비용이 늘며 fresh 제품 생성·설치 검사를 포함한다. updater/릴리즈 게시·서명 활성화는
범위 밖이다. 추가 실행·자동 retry·self-hosted/유료 VM 구축은 이 1회 승인에 포함하지 않는다.

### 안전·판정·중단 기준

- 폐기 가능한 hosted Windows에서만 기존 C0→가능한 C1→C0→C2→C3→C2→C0를 관측한다.
  C0의 문서 Shell `0x80040154`와 JPG/직접 COM/연결 대조가 맞지 않으면 개입을 시작하지 않는다.
  실패 미재현은 `baseline-not-reproduced`, 정상 Explorer/linked token 부재는
  `context-unavailable`로 기록하며 성공으로 바꾸지 않는다.
- C2는 hash가 같은 DLL/worker를 관리자 쓰기 보호 task 전용 경로에 복사하고 해당 HKCU
  InprocServer32 경로만 바꾼다. C3는 같은 보호 경로의 해당 Alhangeul HKLM COM 값만
  임시 등록한다. 소유권 journal·사전 오염 검사·복원 비교를 유지한다.
  registry 복원 충돌/실패는 invalid이며 안전하지 않은 제거로 덮어쓰지 않는다.
- 사용자 PC·VDI·UAC·Explorer 정책·기본 앱·제3자 handler를 변경하지 않고 재부팅·
  무관한 Shell host 종료를 하지 않는다. 제품 설치 정책을 바꾸는 실험도 아니다.
- 두 replica의 phase JSON/원시 probe·A→B→A·정리 증거와 독립 MSI 대조를 함께 읽는다.
  `observed`는 증거 수집 완료이지 제품 해결이 아니며 API bitmap은 Explorer 시각 수용이 아니다.
- NSIS 제품 실패와 MSI 강제 재설치 3010은 기존 gate대로 실패를 유지한다. 비교 증거가
  수집돼도 full이 failure일 수 있다. 실패/누락/미실행을 나눠 보고하고 원인 보정·재실행은
  새 승인을 요청한다. 실제 한컴/Windows 10·11/VDI·재부팅 잔여 검증과 #58 경계는 유지한다.

### 승인 요청

Stage 5.2 보고와 이 실행안을 승인하면 exact 후보 게시 및 full+비교 1회를 진행한다.
승인에는 위 hosted VM의 임시 HKCU/HKLM·보호 경로 실험을 포함하며 제품 수정·앱 UI·#58·
PR 게시·이슈 close·배포는 포함하지 않는다. 현재 원격 push/dispatch는 수행하지 않았다.

## Stage 5.2 — 2026-09-09 승인된 테스트 보정

run `34065777777`은 failed 문서 force-extract의 phase가 성공의
`ISharedBitmap.GetSharedBitmap`으로 남아 중단됐다. 같은 fixture에 width/height도
남아 있었으므로 phase 한 필드만 고치지 않고 실제 probe 실패의 필드 조합을 만든다.
`New-ContextTestPhase -FailedDocuments`로 기존 성공 factory를 확장하고 다음을 검증한다.

1. 문서 3개 × Shell/force-extract 2개가 실제 실패 단계·`0x80040154`·exit 1·빈 이미지
   필드를 가지며 기존 `Test-ThumbnailProbeContract`를 통과한다.
2. JPG·association·activation 대조는 성공으로 유지하고 기존 분류기가 실패 패턴을 구분한다.
   force-extract를 성공 단계로 되돌린 반례는 mixed로 남으며 성공 크기 잔존도 계약에서 거부한다.
3. 성공/실패 데이터 모두 JSON round-trip과 저장된 원시 증거 대조를 통과해야 한다.
   기존 8개 증거 변조 반례는 성공 baseline 파일을 복원한 뒤 수행해 다른 실패로 가려지지 않는다.
4. fast의 AST allowlist에 누락돼 있던 순수 `Test-ContextEqual`만 추가해 원시 증거 검사의
   의존성을 충족한다. registry 파일의 top-level/다른 함수는 실행하지 않는다.
   create-only 증거 writer는 그대로 두고 실패 case의 알려진 임시 파일만 지운 후 성공 case를 쓴다.
   신규 native/registry 실행은 없다. 이는 fast 회귀 검증이 실제로 도달하기 위한 테스트 경계 보정이다.

로컬 source-contract는 실제 PowerShell 실행 결과가 아니다. Stage 5 전체 보고서는 보류하고
미검증 후보 커밋을 만든 뒤 fast 1회 게시·실행 승인을 요청한다. 이전 통합 기록은 당시 상태로 유지한다.

### Stage 5.2 로컬 결과와 인계

| 검사 | 결과 |
|---|---|
| context/CI 통합/fast Node 대상 | 17 passed |
| 전체 automation | 681 passed, 0 failed, 0 skipped |
| product boundary | 488 files, 통과 |
| 전체 workflow actionlint / diff | 통과 |
| 실제 PS 5.1 분류·원시 증거 회귀 | 미실행; 승인 후 fast에서 확인 |
| native/installer/COM/registry·full 수용 | 미실행 |

로그: `/private/tmp/task57-stage52-automation.log`. 실제 설치/분류기/context 증거 판정·registry
코드와 앱/workflow를 수정하지 않았음을 diff로 확인했다. 변경은 테스트 3개와 작업 기록 3개다.
기존 CreateNew writer를 overwrite로 완화하지 않았고, 자기 테스트의 알려진 임시 파일만 정리한다.
fast 의존성 검사에서 equality 함수 누락을 발견해 해당 순수 함수만 AST로 가져오도록 보완했다.
이는 이전 Windows run에서 관측한 실패는 아니며 이번 로컬 코드 점검에서 발견한 누락이다.

다음 승인 요청은 이 후보를 `publish/task57`에 non-force 게시하고 `ci.yml`에
`profile=fast`, `scope=full`, `thumbnail_context_experiment=false`로 **1회** 실행하는 것이다.
fast는 select와 Linux Node/Studio·Windows PowerShell 회귀이며 제품 재빌드/설치·비교 개입은 없다.
실행 직전 같은 profile의 진행중 run 유무도 확인해 의도하지 않은 취소를 피한다.
새 producer/installer/full·릴리즈·PR·issue close는 승인 범위를 넓혀서 수행하지 않는다.

### Stage 5.2 승인된 후보 게시·fast 실행

2026-09-09 같은 스레드의 “진행해줘”로 후보 게시·fast 1회 실행을 승인받았다.
작업 트리 clean, `local/task57` HEAD와 승인 후보가 일치함을 확인했다. 원격 이전 후보
`1cb8b9f6ba9c7f26190600e496720b26d5754675`가 조상임을 확인한 뒤 non-force push했다.
실행 전 `ci.yml`의 `publish/task57` run 조회는 빈 목록이어서 기존 fast 실행 취소는 없었다.

| 항목 | 기록 |
|---|---|
| 후보 / 실제 run head SHA | `26ded313dad49dfd8cd21145aff7e57e3c51cb77` |
| ref / workflow | `publish/task57` / `ci.yml` |
| 실행 | [34256381653](https://github.com/postmelee/alhangeul-tauri/actions/runs/34256381653), workflow_dispatch |
| 생성 시각 | 2026-09-09 02:19:21 KST (`2026-09-08T17:19:21Z`) |
| 전송 입력 | `profile=fast`, `scope=full`, `thumbnail_context_experiment=false` |
| 최초 API 확인 | head SHA·branch 일치; select 진행중, Windows PDF cleanup skipped |

dispatch는 1회이며 입력은 성공한 전송 명령 기준이다. API에서 전체 입력 객체를 재조회했다고
표현하지 않는다. 완료 후 Linux Node/Studio와 Windows PS 5.1 회귀의 실제 결과를 대조한다.
`scope=full`은 CI entry의 일반 경로 선택이며 `profile=full` 전체 제품 검증이 아니다.
현재 fast 성공·Stage 5 완료·NSIS 해결을 선언하지 않는다. 제품 빌드/설치/비교 개입/릴리즈·
재실행은 수행하지 않았으며 이 실행 기록의 문서 커밋은 검증 후보 SHA와 분리한다.

## 2026-09-09 CI 통합 구현 정렬

수행계획의 이번 승인 범위에 따라 `origin/devel`을 non-rewrite merge한다. 충돌은
Desktop entry·package automation 목록·workflow 계약·과거 보드에서 양쪽 책임을 보존한다.
제품/설치/진단 코드의 기존 #57 변경과 #19/#59 통합분을 유지한다.
support artifact ID는 platform → artifacts → Windows smoke로 전달하고 다운로드 digest를
강제한다. 비교 실험 입력은 기본 false이며 실제 registry/native 검사는 fast에 넣지 않는다.
installer reuse는 세 clean VM에 exact archive를 각각 검증한 뒤 현재 harness로 실행한다.
재사용용 지원 묶음의 sourceSha는 harness이며 inventory sourceSha는 product로 구분한다.
기존 manual evidence 계약 및 실제 제품 실패 gate도 보존한다.

이전 run `34065777777`의 비교 job 두 개는 `negative-classification`에서 실패했고
실제 비교/복원 검사는 skipped다. NSIS 12개 문서 Shell/force 요청 실패, MSI 일반 성공,
MSI 강제 교체 3010은 기존 분석대로 유지한다. 이 오류를 이번 merge에서 숨기거나 수정하지 않는다.
fast로 순수 회귀가 먼저 실행되므로 같은 결함은 제품 빌드 전에 드러나야 한다.
이번 통합 후 fast → (적격 exact artifact가 있을 때 installer) → full 순서의 승인안을 제시한다.
적격 producer가 없으면 승인된 새 제품 생성이 필요하며, 실패한 생산 run을 재사용 허용으로 바꾸지 않는다.

### 통합 결과와 후속 검증 계획

- `f154b4d638d0b81565907829690fd9c28ee68fa9`의 CI/제품 변경을 보존했다.
  이번 추가 작업은 앱·lock·rhwp를 수정하지 않았고, 기존 #57 installer/분류기/context
  테스트 데이터도 그대로다. 새 `tests/windows-thumbnail-fast.test.ps1`은 순수 함수 4개만
  AST allowlist로 읽어 격리 회귀에서 호출한다. 실제 registry/token 동작은 호출하지 않는다.
- 두 설치 경로에서 NSIS, MSI 일반, MSI 강제 교체를 fail-fast=false의 독립 runner matrix로
  보존했다. support는 별도 artifact ID와 digest 검증으로 전달한다. 재사용 시 현재 harness로
  지원 묶음만 생성하고 product version은 검증된 handoff에서 받으며 원래 inventory를 바꾸지 않는다.
  이 CI용 묶음을 과거 생산 run의 공식 지원 묶음이라고 부르거나 공개 배포하지 않는다.
- 새 source-contract 4개는 matrix/책임 분리/support ID 전달/product-harness 구분/fast의
  native 개입 금지를 검사한다. reuse 결과 집계는 support·manual·진단 검증 실패도 포함한다.
- 로컬 automation **679 passed, 0 failed, 0 skipped**, upstream **36 passed**,
  Studio **147 passed**, Studio build·GUI typecheck·boundary **488 files**·전체 actionlint·diff 통과.
  Studio build의 기존 dynamic import/chunk 크기 경고는 남아 있다.
  automation 로그는 `/private/tmp/task57-ci-merge-automation.log`에 보존했다.
- merge 전체를 옛 HEAD와 비교한 staged diff 검사에는 devel에서 유입된 기존 16개 파일의
  EOF 빈 줄 경고가 있었다. 해당 파일들이 origin/devel과 byte 동일함을 확인하고 임의로
  정리하지 않았다. 이번 통합 추가분의 `git diff --cached --check origin/devel`은 통과했다.
- Windows PS 5.1 실행·native/package·full 원격 수용은 **미실행**이다. 알려진
  `negative-classification` 보정은 별도 승인 후 수행하고 먼저 `ci.yml profile=fast`로 확인한다.
  이 부분 성공만으로 이번 workflow 통합의 full 수용을 선언하지 않는다.
- installer 실행 승인 시 exact `product_sha`, `product_run_id`, `artifact_id`,
  `artifact_digest`를 실제 성공 producer에서 조회·검증해 고정한다. 이전 후보
  `1cb8b9f6ba9c7f26190600e496720b26d5754675` / run `34065777777` /
  artifact `9999637150` / `sha256:f91031a1a594053be807a900f556d848abcd8e48032eae8fecb67e7233d7dd8a`는
  식별 가능한 과거 근거일 뿐, 전체 run failure와 구형 inventory 때문에 재사용 승인 입력이 아니다.
  latest 대체·실패 gate 완화는 하지 않는다. 적격 producer 확보와 full 실행도 별도로 승인받는다.

이번 merge 기록은 CI 구조 통합의 기록이며 Stage 5 성공 보고/최종 PR/issue close가 아니다.
아래 과거 실행 절의 Windows-only Desktop 6-job 실행안은 이후 반복 실행에 사용하지 않는다.

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
`publish_release=false`이며 당시 추가 실행은 승인받지 않았다.

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
**수용 기준 분리·구현·로컬 검증·후보 커밋**을 승인받았다. 이 승인만으로 원격 실행이나
Stage 3에 진입하지 않았으며, 추가 실행은 아래와 같이 따로 승인받았다.

Stage 2.2 원격 실행 승인: 후보 `001cc3adeab003260fb7b830f6f757b53c65d489` 게시와
Windows-only 추가 1회 실행 요청에 작업지시자가 “진행해줘”로 승인했다.
[run 34047889263](https://github.com/postmelee/alhangeul-tauri/actions/runs/34047889263)은
같은 SHA·artifact mode·windows-x64·run_tests=true·publish_release=false로 완료됐다.
진단 synthetic/증거 계약은 세 job 모두 성공, MSI 일반 lifecycle 성공이며 NSIS 썸네일과
MSI 강제 교체의 제품 gate 실패는 유지한다. 분석 후 “진행해줘” 지시에 따라
[Stage 2 보고서](../working/task_m010_57_stage2.md)에 근거와 수용 범위를 기록했다.
이후 추가 실행·제품 등록 보정·Stage 3 구현은 아직 승인받지 않았다.
Stage 2 보고 커밋 `343b5200009cd90aa23421d2402c5b4ac3b6a690` 제시 후 작업지시자가
“진행해줘”로 Stage 3 세부계획 확정을 지시했다. 아래 제공 방식·파일·검증 범위는
그 산출물이며 제품/진단 코드 수정이나 원격 실행까지 승인된 것은 아니다.

Stage 3.1 구현 승인: 세부계획 커밋 `fd046ad` 제시 후 2026-09-07 같은 스레드에서
작업지시자가 “진행해줘”로 **구현·로컬 검증·후보 커밋**을 승인했다.
아래 Stage 3 세부안을 구현했으며 추가 Windows-only 게시·실행은 아직 승인받지 않았다.

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

#### 4. Stage 2.2 후보 작성 당시 구현 결과와 로컬 검증

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
제공할 진단 도구의 파일 목록·진입점·제공 경로는 아래 세부안으로 승인받는다.

MSI 전환 안내는 문서 저장·앱 종료 → 기존 NSIS 제거 → 같은 버전/아키텍처 MSI 설치 →
재부팅 요청이 있으면 재부팅 → 사용자의 일반 Explorer 세션에서 재확인 순서로 작성한다.
두 설치본 중복 설치·기본 앱 강제 변경·설정/사용자 파일 삭제를 안내하지 않는다.
보안 정책 변경·NSIS 전체 사용자화·권한 helper·#58 선택 설치 및 토글은 계속 제외한다.
공식 문서는 기존 승인 위치인 README, `docs/architecture/WINDOWS_THUMBNAILS.md`,
`docs/operations/DESKTOP_RELEASE.md`를 필요한 만큼 보완하며 신규 FAQ/문서 루트는 만들지 않는다.

### Stage 3 세부안 — 구현 승인 대상

#### 제공 방식과 빌드 식별

- 앱 설정·installer 체크박스가 아닌 **별도 수동 PowerShell 진단 묶음**을 제공한다.
  사용자는 Windows x64 PowerShell 5.1에서 압축을 풀고 명령을 실행한다.
  Node/Rust/Git/rhwp submodule은 사용자 PC에서 요구하지 않는다.
- Windows 일반 artifact build의 inventory 검증 뒤, 별도 output directory에 지원 묶음을
  만들고 `alhangeul-windows-x64-thumbnail-support` artifact로 올리는 workflow 변경을 제안한다.
  14일 임시 검증물이며 설치 파일·릴리즈 asset·updater payload에는 넣지 않는다.
  기존 bundle의 정확히 5개 파일 계약과 공개 다운로드 목록도 바꾸지 않는다.
- 같은 run의 설치 파일과 지원 묶음을 사용한다. 버전 문자열만 같다는 이유로 다른 빌드의
  해시를 수용하지 않는다. 동봉 inventory와 실제 등록된 DLL/worker의 bytes·SHA-256을
  비교하며 맞지 않으면 `reference-mismatch`로 멈추고 맞는 묶음을 안내한다.
- `support-manifest.json`은 schemaVersion, exact source SHA, product version, platform,
  허용 파일 상대 경로·bytes·SHA-256을 담는다. 도구 시작 시 누락·변조·중복·경로 이탈을
  검사한다. 자기 해시는 manifest에 포함하지 않는다. hash 검사는 서명/출처 인증을
  대체하지 않으므로 GitHub run·source SHA·artifact digest를 별도로 확인하도록 안내한다.
- 지원 묶음은 아래 실행 파일 10개와 같은 빌드의 `alhangeul-artifact-inventory.json`,
  기존 공식 문서의 복사본 `WINDOWS_THUMBNAILS.md`, manifest만 포함한다.
  installer/DLL/worker/문서 fixture·MSI 로그·사용자 진단 결과는 포함하지 않는다.
- 런타임 자동 다운로드·업로드·설치·업데이트는 없다. Release/웹사이트 제공 전환은 별도 승인이다.

#### 사용자 진입점과 안전 계약

신규 `scripts/windows-thumbnail-check.ps1`의 입력은 네 개다.

```powershell
.\windows-thumbnail-check.ps1 `
  -DocumentPath 'C:\Samples\document.hwp' `
  -JpgPath 'C:\Samples\control.jpg' `
  -OutputDirectory 'C:\Samples\thumbnail-check-new' `
  -Consent
```

- `DocumentPath`: 명시한 HWP 또는 HWPX **한 개**. 두 형식·여러 문서를 확인하려면
  새 출력 디렉터리로 별도 실행한다. 작은/큰 문서를 검사했다고 임의 표기하지 않는다.
- `JpgPath`: 명시한 JPG/JPEG 대조군 한 개. 각 입력은 로컬 일반 파일, 0 초과 64 MiB 이하로
  제한한다. 이 제한은 진단 도구의 복사·자원 경계이지 새 제품 엔진 제한이 아니다.
- UNC·device namespace·원격 드라이브·alternate data stream·reparse point와 그 경유 경로,
  입력 중복·입력/출력 충돌은 거부한다. 출력은 새 디렉터리만 허용하고 기존 파일을 덮어쓰지 않는다.
- `Consent`가 없으면 부작용 안내와 사용법만 출력하고 종료 코드 2로 끝낸다.
  동의 전 문서 복사·COM/Shell 호출·결과 파일 생성은 하지 않는다.
- 사용자에게 문서/이미지 처리기 실행과 Windows thumbnail cache 생성 가능성을 알린다.
  일반 사용자 세션 실행을 기본 안내로 삼으며 자동 승격·관리자 권한 필수 요구는 하지 않는다.
  실행 정책·조직 보안 차단은 오류로 남기고 Bypass/전역 정책 변경을 기본 해법으로 안내하지 않는다.
- 입력 원본은 읽기만 한다. task 소유 임시 하위 폴더에 무작위 이름의 독립 복사본을 만들고,
  source/copy hash·크기·mtime을 메모리에서 확인한다. 동시 수정·무결성 실패는 중단한다.
  원본 파일명·경로·hash·문서 bytes·bitmap·예외 원문을 보고서나 console에 출력하지 않는다.
- finally에서 **해당 실행이 만든 임시 폴더만** 정리한다. 정리 실패는 코드로 남기고
  진단 완료로 취급하지 않는다. 사용자 출력 폴더나 기존 임시 폴더를 재귀 삭제하지 않는다.
- 기존 x64 STA 자식·256 px·probe별 30초 timeout 계약을 재사용한다. 타임아웃 시
  자신이 시작한 자식만 종료하고 Explorer/dllhost/사용자의 앱은 종료하지 않는다.

#### 실행 순서와 판정

1. 동의·입력·묶음 무결성을 검증한 뒤 state와 선택 확장자의 association을 읽는다.
   DLL/worker reference가 맞고 실제 조회 처리기가 Alhangeul일 때만 문서 API를 호출한다.
   다른 처리기 선택·등록 중복·scope 미확인·읽기 실패는 별도 결과로 남기고 강제 변경하지 않는다.
2. 문서·JPG의 fresh 복사본에 Shell 요청을 먼저 한다. 직접 COM/force 호출을 앞세우지 않는다.
3. 각 입력에서 별도 복사본의 cache-only, 또 다른 복사본의 force-extract와 그 복사본의
   after-force cache-only를 수집한다. 마지막에 직접 COM 생성과 종료 state를 수집한다.
4. 전체 실행 시 association 1 + activation 1 + 문서/JPG 각각 4모드 = **10개 probe**와
   state 2개를 기대한다. 사전 차단은 phase/skip reason을 명시하며 전체 검사를 통과했다고 쓰지 않는다.
5. CI의 `Get-ThumbnailPhaseAssessment`는 3종 fixture·19개 probe 전용으로 유지한다.
   사용자 진단은 신규 순수 분류 helper에서 `Test-ThumbnailProbeContract`,
   `Test-ThumbnailBitmap`, `Get-ThumbnailDocumentFinding`을 재사용한다.
   단일 문서를 3종으로 복제하거나 누락된 CI 증거를 성공 값으로 채우지 않는다.
6. HKCU/HKLM은 **관측한 등록 범위**로 기록하며 그 값만으로 실제 installer 종류를 확정하지 않는다.
   해당 확장자·등록 파일·threading·scope를 동봉 inventory와 비교하고, 양 hive 동시 등록은
   `registration-ambiguous`, 타 처리기 선택은 `other-handler-selected`로 판정한다.
7. JPG Shell/force 성공 + 선택 문서의 Shell/force 모두 0x80040154 + 직접 COM 성공 +
   검증된 HKCU-only 등록일 때만 `per-user-shell-activation-failed`와 `consider-msi`를 제시한다.
   UAC/IconsOnly 값만으로 이 분류를 만들지 않는다. HKLM 실패·부분 성공은 미분류로 남긴다.
8. 문서/JPG Shell/force 성공은 `thumbnail-api-ok`이며 선택한 문서와 실행 문맥에만 적용한다.
   Windows Explorer UI·다른 문서·재부팅 이후·제품 전체의 성공을 뜻하지 않는다.

출력은 원시 probe JSON, 비식별 state, `thumbnail-check-summary.json`과 짧은 한국어
console 요약이다. summary는 schema/source SHA, referenceStatus, registrationScope,
evidenceStatus, thumbnailStatus, finding, recommendedAction, probe label, 무결성·정리 여부를
담는다. lifecycleStatus는 `not-tested`로 명시하고 설치/재부팅 성공 값을 만들지 않는다.
종료 코드는 0=선택 문서 API 검사 통과, 1=유효한 검사에서 썸네일 실패,
2=진단 불완전·입력/참조 불일치·사전 차단·실행 불가다. 실패·생략을 0으로 바꾸지 않는다.
보고서는 로컬에만 저장하며 제출 여부는 사용자가 결정한다.

#### 사용자 안내와 문서 위치

| 독자 / 내용 | 위치 | 대안과 선택 이유 |
|---|---|---|
| 사용자: 제한 요약과 진단 진입 링크 | `README.md` 기존 Windows 썸네일 문단 | 새 FAQ 대신 기존 첫 진입점 보완 |
| 사용자·기여자: 실행 예, 결과 해석, MSI 전환, 개인정보·보안 한계 | `docs/architecture/WINDOWS_THUMBNAILS.md` | 상세 계약의 기존 진실 원천이며 지원 묶음에도 그대로 복사 |
| 유지보수자: 지원 artifact 식별·해시·보존 기간·실패 gate | `docs/operations/DESKTOP_RELEASE.md` | 새 배포 문서/루트 대신 기존 artifact 정책 보완 |

- 역사적인 VDI/기존 CI 성공은 삭제하지 않고 새 격리 검사 실패와 범위를 나란히 표시한다.
  “NSIS는 항상 실패”, “한글 2022 충돌”, “UAC를 꺼야/켜야 해결”로 안내하지 않는다.
- MSI 전환은 저장·앱 종료 → 기존 NSIS 제거 → 승인된 같은 빌드/아키텍처 MSI 설치 →
  재부팅 요청 시 사용자가 재부팅 → 일반 Explorer 세션 재확인 순서다. 자동 실행하지 않는다.
- 파일 연결·개인 설정의 보존을 무조건 보장하지 않는다. 사용자 파일/설정 삭제나 기본 앱
  강제 변경을 안내하지 않으며 회사/PC방 관리 정책상 설치 불가 시 관리자에게 문의하도록 한다.
- MSI 3010은 재부팅 필요 상태이며 설치 코드 0/파일 정리와 OS 재부팅 대기는 별개라고 설명한다.

### 산출물

| 파일 | 변경 범위 |
|---|---|
| `scripts/windows-thumbnail-check.ps1` (신규) | 네 입력의 사용자 진입점·안내·결과 출력 |
| `scripts/windows-thumbnail-check-support.ps1` (신규) | 입력/묶음 검증·임시 복사·무결성·정리·probe orchestration |
| `scripts/windows-thumbnail-check-assessment.ps1` (신규) | 1문서+JPG의 순수 분류, CI 판정 완화 없음 |
| 기존 `windows-thumbnail-diagnostics.ps1`, `-probe.ps1`, `-state.ps1`, `-assessment.ps1`, `-native.cs`, `-interop.cs`, `-token.cs` | 지원 묶음의 실행 의존 파일 7개; 기존 계약 유지, 원칙적으로 무수정 재사용 |
| `scripts/build-windows-thumbnail-support.mjs` (신규) | allowlist 10개 실행 파일·공식 문서·inventory 복사, manifest 생성/검증 |
| `scripts/windows-thumbnail-check-tests.ps1` (신규, 묶음 제외) | Windows PS 5.1 입력·오류·분류·안전 회귀 |
| `tests/windows-thumbnail-check.test.mjs`, `tests/windows-thumbnail-support.test.mjs` (신규), `package.json` | 플랫폼 중립 source/manifest 계약·automation 연결 |
| `.github/workflows/alhangeul-desktop.yml`, `tests/actions-workflows.test.mjs` | Windows 일반 build의 별도 지원 artifact, installer job 다운로드·검증 gate |
| `scripts/windows-thumbnail-fixtures.ps1`, `tests/windows-thumbnail-fixtures.test.mjs` | 기존 최초 fixture 관측 이후, 재설치 이전에 지원 묶음 실사용 검사 연결 |
| 위 공식 문서 3개, 단계 보고·계획·오늘할일 | 안내와 검증 범위 기록 |

신규 구현 파일 300 LOC·함수 50 LOC·입력 5개 이내를 유지한다. 범위를 넘는 helper 추가나
기존 smoke entry 변경이 필요하면 구현 전에 계획에 반영한다. NSIS/WiX/등록 Rust·엔진은 제외한다.

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

### 검증 및 실행 승인 경계

이번 세부계획 작성에서는 문서 섹션·의존 파일·공식 문서 경로·입력 계약·승인 경계와
변경 allowlist(계획 2개·오늘할일 1개), `git diff --check`를 검사했고 통과했다.
코드·native 검증·묶음 생성·원격 실행은 하지 않았다. 아래는 **구현 승인 후** 범위다.

```sh
node --test tests/windows-thumbnail-check.test.mjs tests/windows-thumbnail-support.test.mjs tests/windows-thumbnail-assessment.test.mjs tests/windows-thumbnail-diagnostics.test.mjs tests/windows-thumbnail-fixtures.test.mjs tests/windows-thumbnail-registration.test.mjs tests/windows-packaging.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
actionlint -shellcheck='' .github/workflows/alhangeul-desktop.yml
git diff --check
```

- 비지원 호스트는 플랫폼 중립 source/manifest 계약만 검사하며 PowerShell·native 실행이나
  실제 배포 묶음 생성은 Windows CI에서 한다. 테스트용 manifest 검사는 제품 패키징과 구분한다.
- Windows PS 5.1 회귀: consent 없음, x86/비지원 실행, 누락·중복·초과 크기·비로컬 입력,
  따옴표/한글 경로, 출력 충돌, 문서 동시 변경, timeout·깨진 JSON·권한 거부·정리 실패,
  manifest/file 변조·다른 빌드 reference·양 hive 등록·타 handler·정책 미설정/읽기 실패,
  JPG 실패·부분 성공·캐시만 성공·UAC 0/1 같은 결과·개인 경로/파일 hash 비출력을 검사한다.
- 지원 artifact의 파일 allowlist·source SHA·각 hash를 검증하고, 기존 installer job이
  다운로드한 묶음의 entry를 **압축 해제된 제공 형태 그대로** 실행한다. source tree에만 있는
  파일이나 submodule에 의존하면 실패한다. fake manifest만으로 native 검증을 대신하지 않는다.
- 기존 최초 Shell·19-probe 관측이 끝난 뒤 재설치 전에 공개 작은 HWP·큰 HWP·HWPX를
  각각 JPG와 함께 검사한다. 사용자는 1문서 단위로 실행하지만 CI는 세 번 실행해 형식을 덮는다.
  추가 진단이 DLL을 load할 수 있으므로 이후 재설치의 3010 및 표식은 기존처럼 관측한다.
- 지원 도구의 10개 probe/state/summary/종료 코드와 CI의 판정을 대조한다.
  NSIS의 알려진 실패는 사용자 도구에서도 exit 1과 `consider-msi`로 남고, 기존 제품 gate는
  실패를 유지한다. 도구 오류·판정 불일치·누락은 새 지원 도구 검증 실패다.
- 검증 결과는 기존 installer 진단 artifact의 `manual-check/<fixture-id>/`에 둔다.
  자동 artifact 업로드는 공개 CI fixture 결과만 대상이며 개인 문서는 포함하지 않는다.
- 구현·로컬 검사·후보 커밋 후 exact SHA로 Windows-only 비게시 **추가 1회** 게시/dispatch를
  따로 승인받는다. source/workflow/artifact SHA, 지원 묶음 해시 및 실제 installed hash를 대조한다.
  이번 계획 승인만으로 workflow 실행·릴리즈·기존 실행 재시도는 하지 않는다.
- Stage 3의 도구/안내 검증 수용은 Windows native 회귀·패키지 실사용 증거가 있어야 한다.
  Windows 10/11 일반 로그인 Explorer·실제 한컴·VDI·재부팅 후 검증은 별도 환경 승인 대상이며
  미실행 시 명시한다. 이 제한을 현장 해결 또는 #57 전체 완료로 바꾸지 않는다.

### 커밋

```text
Task #57 [Stage 3.1]: 수동 썸네일 진단 묶음과 MSI 안내 구현 후보
Task #57 Stage 3: 수동 진단 도구 검증과 제한 안내 결과 보고
```

### Stage 3.1 구현 후보와 로컬 검증 기록 — 2026-09-07

- 네 입력의 수동 진단 진입점과 입력 보호·임시 복사·정리 helper, 단일 문서/JPG 분류를
  구현했다. 묶음 allowlist/manifest 검증은 의존 파일 실행 전 entry에서 수행한다.
  설치된 처리기 reference·scope를 확인한 뒤 10개 probe와 state 2개를 수집한다.
- 미동의는 출력 파일 없이 코드 2, 알려진 사용자별 Shell 실패는 코드 1과 MSI 검토 안내,
  정리·원본 무결성·probe 실패는 불완전으로 남긴다. 캐시 성공으로 새 생성 실패를 가리지 않는다.
- Windows 전용 builder와 별도 14일 support artifact를 추가했다. 기존 5파일 installer bundle,
  최초 19개 fixture probe·NSIS 제품 실패 gate·MSI lifecycle 기준은 유지한다.
  최초 관측 이후 재설치 전 제공 묶음 그대로 공개 문서 3종을 각각 검사하고, 새 검증 gate가
  13개 결과 파일·원시 JSON·등록 scope/reference·판정·종료 코드·정리를 대조한다.
  추가 진단 이후에도 앱/WebView/worker 잔류를 검사한다.
- Windows PS 5.1용 회귀에는 manifest 변조, 입력 크기/공유 잠금/junction, 한글·따옴표 경로,
  원본 불변·예상하지 않은 임시 파일 보존, consent/x86 차단, malformed child JSON·timeout,
  비식별 출력·정리 실패 시 성공 취소·분류 반례를 넣었다. **작성만 했으며 native 미실행**이다.
- 기존 공식 문서 3곳에 시험용 사용법·MSI 전환·검증 한계를 반영했다. 새로운 문서 루트,
  앱 UI·선택 설치·등록 모델·엔진·release/updater 변경은 없다.

| 실행한 플랫폼 중립 검사 | 결과 |
|---|---|
| 위 대상 Node 계약 검사 8개 파일 | 102/102 통과 |
| `pnpm run test:automation` | 558/558 통과 |
| `pnpm run check:product-boundary` | 통과, 405파일 검사 |
| `actionlint -shellcheck='' .github/workflows/alhangeul-desktop.yml` | 통과 |
| `git diff --check` | 통과 |

초기 source privacy 검사 정규식이 사용법의 `-DocumentPath` 리터럴을 변수 출력으로 오인했다.
실제 `$DocumentPath`/`$JpgPath` 출력 검출로 고친 뒤 대상/전체 검사를 다시 통과했다.
이를 Windows 실행 오류나 제품 수정 결과로 해석하지 않는다.

이 호스트에서는 PowerShell/C#·Rust/Tauri 실행, 실제 support 묶음 생성, 원격 push/dispatch를
하지 않았다. 따라서 Stage 3 완료 보고서는 아직 작성하지 않는다. 후보 커밋의 exact SHA를
제시해 Windows-only 비게시 추가 1회 실행을 별도 승인받고, 원격 패키지·native 증거를 확인한다.
일반 Windows 10/11 Explorer·실제 한컴·VDI·재부팅 후의 현장 수용은 여전히 미검증이다.

### Stage 3.2 — 테스트 종료 코드 보완

Stage 3.1 후보 `b4fa125bccaad03e0aabf025fe861b488bde5105`의 원격 게시·Windows-only
비게시 1회 실행은 같은 스레드의 “진행해줘”로 승인받았다.
[run 34052696931](https://github.com/postmelee/alhangeul-tauri/actions/runs/34052696931)은
동일 SHA, `mode=artifact`, `artifact_platform=windows-x64`, `run_tests=true`,
`publish_release=false`로 완료됐다. Windows build·core·지원 묶음 생성은 통과했으나
세 installer job 모두 수동 진단 테스트의 통과 메시지 직후 코드 1로 종료됐다.
실제 설치·19-probe·수동 묶음 실사용 검사는 모두 skipped이며 새 Shell 증거는 없다.

지원 묶음 artifact `9995540618`의 archive SHA-256은
`59a4ecda36d9c5e229876790bb39cc590d4787a2308190e584662615061b89d6`이다.
다운로드 digest, manifest의 source SHA, payload 12개 hash와 총 13개 파일을 확인했다.
inventory를 제외한 11개 원본 파일도 checkout bytes와 같았다. core와 installer 진단
archive 4개의 digest도 일치하며, installer 결과물은 실행 정보 3개 파일만 포함한다.

원인은 테스트가 의도한 미동의/x86 자식 종료 코드 2를 검사한 뒤 전체 성공을 명시하지
않은 종료 계약이다. 단순 통과 문구가 실제 process exit 성공을 보장하지 않았다.
이 결과를 제품 썸네일의 실패·해결이나 Stage 3 수용으로 바꾸지 않는다.

분석 보고 후 2026-09-07 “진행해줘” 지시로 수정·로컬 검증·후보 커밋을 승인받았다.
변경은 아래 기존 파일로 한정한다. 새 helper 파일·제품 문서 위치 변경은 없다.

- `scripts/windows-thumbnail-check-tests.ps1`: 모든 assertion과 finally 정리가 성공한
  정상 끝에서만 `exit 0`을 명시한다. Windows 회귀는 별도 PS 5.1 process에서 실제
  전체 테스트 스크립트의 종료 코드 0을 확인하고, 잘못된 지원 묶음 입력은 nonzero를
  유지하는지 검사한다. Actions 방식의 종료 코드 전달도 함께 적용한다.
- `.github/workflows/alhangeul-desktop.yml`: 기존 manual-tests 단계에서 위 process
  종료 계약 검사를 활성화한다. 실패 무시·강제 성공·installer gate 완화는 하지 않는다.
- `tests/windows-thumbnail-check.test.mjs`: 마지막 성공 종료가 정리 뒤에 있고,
  expected negative 코드 2 검사와 Windows process 회귀 연결이 유지되는지 검사한다.
- 수행/구현계획·오늘할일: 관측·승인·미검증 범위를 기록한다. Stage 3 완료 보고는 보류한다.

로컬 검증은 Stage 3.1과 같은 Node 대상 8개 파일·전체 automation·product boundary·
actionlint·diff 검사다. 비지원 호스트에서 PowerShell/native 실행은 하지 않는다.
후보 커밋 뒤 exact SHA의 Windows-only 비게시 1회 실행은 다시 별도 승인받는다.

구현 결과: 정상 suite의 마지막 문장에서만 `exit 0`을 반환하도록 보완했다.
`-VerifyExitCode`는 같은 테스트 파일을 자식 PS 5.1에서 재귀 옵션 없이 실행하고
Actions의 LASTEXITCODE 전달 조건을 적용한다. 실제 전체 suite는 코드 0·통과 문구,
파일을 지원 디렉터리로 잘못 지정한 경우는 nonzero·통과 문구 없음이 요구된다.
자식은 60초 timeout과 stdout/stderr 수집을 가지며 해당 자식만 종료한다.
기존 미동의/x86 코드 2 assertion, finally 정리, 제품 실패 gate는 유지했다.
전체 테스트 파일은 281 LOC이며 새 함수는 50 LOC·입력 5개 이내다.

| Stage 3.2 로컬 검사 | 결과 |
|---|---|
| 기존 대상 8개 Node 계약 검사 파일 | 104/104 통과 |
| `pnpm run test:automation` | 560/560 통과 |
| `pnpm run check:product-boundary` | 통과, 405파일 검사 |
| `actionlint -shellcheck='' .github/workflows/alhangeul-desktop.yml` | 통과 |
| `git diff --check` | 통과 |

이번 턴에서는 Windows PowerShell/native·패키징·원격 push/dispatch를 실행하지 않았다.
추가한 실제 process 회귀 및 installer/Shell 검증은 Windows run 승인·실행 후에 수용한다.
후보 커밋 메시지: `Task #57 [Stage 3.2]: 수동 진단 테스트 종료 코드와 회귀 검사 보완`.

## Stage 4 — 회귀 수용·문서·#58 인계

### 진입 근거와 실행안 — 승인 완료

Stage 3.2 후보 `f1cdd0711f747b443c723a750f868faa5c0349f1`의 게시·Windows-only
비게시 1회 실행은 별도 “진행해줘” 승인 후
[run 34056210236](https://github.com/postmelee/alhangeul-tauri/actions/runs/34056210236)으로 완료됐다.
세 job의 진단 회귀·실제 process 종료 코드·묶음 실사용 증거 검사는 모두 통과했다.
MSI 일반 제품 검사는 성공했지만 NSIS 문서 썸네일과 MSI 강제 교체의 재부팅 필요 때문에
전체 workflow는 failure다. 분석 뒤 작업지시자가 이번 단계 보고와 잔여 범위 정리를 승인했다.
근거의 진실 원천은 [Stage 3 보고서](../working/task_m010_57_stage3.md)이며 여기서 복제하지 않는다.

2026-09-07 Stage 3 보고 커밋 `503fb17` 제시 뒤 작업지시자가 “진행해줘”로
**문서 정합화·플랫폼 중립 회귀·#58 인계** 진행을 승인했다.
제품 소스·installer·등록 모델·검증기·workflow를 바꾸지 않는 한 동일 후보의 Windows
증거를 재사용한다. 문서-only 보고 SHA를 원격 native 검증 SHA로 바꾸어 쓰지 않는다.

| 구분 | 다음 작업 / 판단 기준 | 위치와 승인 경계 |
|---|---|---|
| 사용자 안내 | “이번 변경 Windows 실검증 전”을 exact 후보의 CI 검증 완료/현장 미검증으로 정정. NSIS 실패·MSI 대안·캐시/보안 한계 유지 | 기존 `README.md`, `docs/architecture/WINDOWS_THUMBNAILS.md` |
| 운영 수용 | support artifact와 installer 제품 gate의 분리, 실패 run의 제한된 증거 사용, 검증 SHA·bytes·만료 상태 명시 | 기존 `docs/operations/DESKTOP_RELEASE.md`, `docs/operations/RELEASE_CHECKLIST.md` |
| 버전 근거 | 새 run을 검증 이력으로 추가하되 공개 Release·전체 지원 완료로 표시하지 않음 | 기존 `docs/releases/v0.1.0.md` |
| 로컬 회귀 | 아래 Stage 4 플랫폼 중립 명령 실행 및 문서 링크/용어/상태 일관성 검사 | 기존 계획 범위, native 실행 없음 |
| 현장 검증 준비 | 같은 run의 installer/support와 공개 fixture로 일반 Windows 10/11 로그인·Explorer·실제 한컴/VDI·MSI 전환을 비교하는 미검증 matrix 정리 | 계획·보고 안의 준비만. 실행 환경/사용자 동의/대상과 명령은 별도 승인 |
| 재부팅 잔여 | MSI 3010 이후 새 process·DLL hash·Shell·OS 지연 표식을 확인해야 함 | 전용 Windows 환경·재부팅 권한 별도 승인. 자동 수행 없음 |
| NSIS 전체 사용자 설치 | 현재 판단은 “추가 검증·별도 설계 승인 필요”; HKCU를 몰래 HKLM으로 바꾸지 않음 | 도입/불필요 확정 아님. 제품 변경 별도 범위 |

위 공식 문서 경로는 수행계획서에서 승인한 위치를 유지한다. 사용자/기여자/릴리즈 담당자별
기존 진입점이므로 새 FAQ·지원 사이트·공식 문서 루트로 분리하지 않는다.
이번 승인으로 위 기존 공식 문서를 수정한다. 추가 원격 실행·현장 시험·제품 변경은 제외한다.

### #58 인계할 경계 — 구현 아님

2026-09-07 #58 본문을 읽어 아래 범위가 기존 요구와 일치함을 확인했다. 이슈 본문·
수용 기준은 수정하지 않는다. #58 자체 수행계획에서 상태 schema·기본값·권한 helper를 승인받는다.

| 경계 | 확정 근거 / 후속 설계 제약 |
|---|---|
| 설치와 사용 상태 | 미포함은 전용 DLL·worker가 실제 없어야 함. 비활성은 파일 유지와 등록 해제. 설치/등록/API 성공을 별도로 표시 |
| 권한과 scope | 현행 NSIS=HKCU, MSI=HKLM. 시스템 전체 변경은 다른 사용자 영향·명시적 관리자 승인 필요. 앱 전체 상시 승격 금지 |
| 공유 등록 소유권 | Alhangeul 소유 상태만 조건부 해제·복원. UserChoice/기본 앱 강제 변경과 나중에 다른 프로그램이 바꾼 값 덮어쓰기 금지 |
| 실패·복구 | 등록/토글 성공만으로 Shell 성공을 표시하지 않음. 권한 거부·취소·부분 실패는 재조회 후 표시하고 오류를 보존 |
| 업데이트와 잠금 | 포함 여부와 활성화 선택을 각각 보존. 포함→미포함은 해제 뒤 파일 제거하며 3010·지연 삭제·재부팅 대기를 완료와 구분 |
| 진단 재사용 | #57의 공통 probe·분류·fixture 검사를 재사용. NSIS 실패는 호환성 제한으로 남기고 #58의 실제 Shell 생성 수용 기준을 완화하지 않음 |
| 자동화 제외 | 임의 구성요소 다운로드·캐시 전체 삭제·한컴 처리기 탈취·Preview Handler·MSI↔NSIS 교차 updater는 포함하지 않음 |

Stage 4 문서·회귀가 끝나도 현장 해결/NSIS 지원 수용이 남으면 #57 전체 완료·close를
자동 선언하지 않는다. 미검증 유지 또는 후속 범위 분리 여부를 작업지시자에게 요청한다.
최종 보고·PR 게시는 현재 요청과 분리하고 해당 절차에서 승인받는다.

### 산출물

- `docs/architecture/WINDOWS_THUMBNAILS.md`
- `docs/operations/DESKTOP_RELEASE.md`, `docs/operations/RELEASE_CHECKLIST.md`
- `docs/releases/v0.1.0.md`, 필요 시 `README.md`
- `mydocs/working/task_m010_57_stage4.md`, 계획서, 오늘할일
- 최종 보고서 `mydocs/report/task_m010_57_report.md`는 잔여 수용 판단과 별도 승인 후 작성

### 변경 내용

- 최종 코드 후보의 같은 SHA·installer bytes로 두 clean job·lifecycle·Shell 결과를 재확인한다.
  코드·검증기·환경이 동일한 근거는 재사용 이유를 적고 문서-only 변경 때문에 재빌드하지 않는다.
- 설치 방식·권한 범위·실제 검증 환경·미확정 조건·권장 대안을 기존 문서에 반영한다.
  기존 한컴 ProgID 충돌 가능성의 일반 설명과 이번 사례의 확인된 처리기 선택을 구분한다.
- #58에 필요한 설치 범위·활성 상태 진실 원천·등록/해제 소유권·권한 거부 처리·업데이트 보존
  경계를 단계 보고에 정리한다. #58 구현이나 MSI↔NSIS 교차 updater 도입은 하지 않는다.
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

### Stage 4 실행 결과 — 문서·회귀·인계 수용

승인된 기존 공식 문서 5개만 정합화했다. `f1cdd0711f747b443c723a750f868faa5c0349f1`과
현재 작업본의 차이는 README·docs·mydocs 문서뿐이다. installer·등록·진단 소스·workflow·
pin·lock은 그대로이므로 기존 run의 동일 bytes 증거를 재사용하고 native 재실행하지 않았다.
로컬 product boundary 405파일, automation 560개, upstream 36개, Studio 132개,
Studio build·diff 검사를 통과했다. 빌드의 혼합 import·chunk 크기 경고는 보존했다.

현장 검증 matrix와 #58 인계의 진실 원천은 [Stage 4 보고서](../working/task_m010_57_stage4.md)다.
Windows 10/11 일반 Explorer·실제 한컴/VDI 비교·NSIS→MSI 수동 전환·3010 후 재부팅은
모두 미실행이다. NSIS 전체 사용자 지원은 추가 검증·별도 설계 승인 필요로 남긴다.
현재 완료는 승인된 문서·회귀·인계 범위이며 #57 전체 완료·최종 보고·PR 승인이 아니다.

## Stage 5 — 원인 비교 실험 구현 정렬

2026-09-07 비교 계획 `f2ac8c0` 뒤 작업지시자가 “진행해줘”로 비교 코드 구현·로컬 회귀·
후보 커밋을 승인했다. 수행계획 Stage 5의 안전 경계와 기존 CI 후보/결과 보고 분리를 유지한다.
실제 Windows 검증 전에는 Stage 5 전체 보고·수용을 하지 않는다.

### Stage 5.1 파일과 실행 계약

- CI 전용 `windows-thumbnail-context-*.ps1`을 entry, registry, files/fixtures, phase,
  process context, tests 역할로 분리한다. C# interop은 별도 `windows-thumbnail-context.cs`에 둔다.
  기존 사용자용 support 파일·manifest·제품 installer·등록/엔진을 변경하지 않는다.
- `thumbnail_context_experiment=false`인 opt-in 입력과 별도 clean job 두 개를 기존 workflow에
  추가한다. 기본 build/installer 제품 gate는 그대로이며 실험은 artifact/windows-x64/비게시/
  run_tests=true/exact workflow SHA에서만 허용한다. matrix 두 VM에서 같은 A→B→A 비교를
  반복해 독립 관측을 확보한다. MSI 대조는 같은 run의 기존 MSI 일반 job을 재사용한다.
- 기존 workflow는 같은 SHA build를 전제로 하므로 이번에는 새 bundle/support를 생성하고
  같은 run 다운로드·manifest source SHA·inventory·실제 파일 hash를 대조한다. 과거 installer
  bytes를 재사용했다고 쓰지 않는다. 원격 총 job은 build 1+기존 smoke 3+비교 2, 실행 1회 제안이다.
- 실행 전 hosted Windows/x64/elevated·명시적 실험 동의·빈 출력/설치 경로·양 hive 잔존 class를
  확인한다. PowerShell 5.1에서 raw registry 값은 내부 복원에만 쓰고 artifact에 출력하지 않는다.
- C0 최초 NSIS 설치 직후 실제 probe 실패 패턴을 확인한 뒤에만 개입한다. C1은 실제 linked
  limited token과 같은 사용자/session의 정상 Explorer 관측이 있을 때만 시도하며 profile·권한
  증거를 자식에서 확인한다. 다른 사용자 credential/계정 생성·UAC 전환·token integrity 조작은 없다.
  지원 API 실패나 안전한 문맥 부재는 context-unavailable이며 원시 숫자 오류를 보존한다.
- C2는 임의 GUID 이름의 Program Files 하위 보호 폴더에 DLL/worker 두 파일만 복사한다.
  관리자/SYSTEM full, Users read/execute의 상속 차단 ACL·owner·reparse·hash를 확인한다.
  HKCU InprocServer32 기본값만 변경/조건부 복원한다. C3는 그 동일 경로에서 제품과 같은
  빈 HKLM class 부모와 InprocServer32 기본값·Apartment만 임시 추가한다. 확장자·기본 앱 등록은 바꾸지 않는다.
- 순서는 C0 → 가능한 C1 → C0 복귀 → C2 → C3 → C2 복귀 → C0 최종 복귀다.
  phase마다 새 공개 fixture 복사·기존 독립 STA probe를 사용하고 실제 Shell을 먼저 실행한다.
  읽을 수 있는 Explorer/dllhost/worker의 token/module 관측은 참고이며 전체 surrogate 추적 완료로
  주장하지 않는다. 캐시·기존 host 영향이 남으면 독립 job 결과까지 비교하고 인과 확정을 유보한다.
- registry는 값 kind/content·존재를 함께 비교한다. class 오염·부분 쓰기·복원 충돌을 반례로
  검사한다. 자신의 값만 되돌리고 예외 시도 finally 복원한다. 실패 시 원래 NSIS uninstaller가
  제3자 class를 지우지 않도록 자동 제거를 중단하고 cleanup failure를 남긴다.
- output JSON은 source/run/installer hash, phase 환경·probe·fixture 무결성, bounded 오류,
  설치/제거·복원 상태를 분리한다. 시험 관측 완료 0은 제품 성공이 아니며 baseline 미재현/증거
  누락/복원 실패는 nonzero다. actual native 결과는 별도 read-back 후 수용한다.

### 검증과 승인 요청

로컬: `pnpm run check:product-boundary`, `pnpm run test:automation`,
`actionlint -shellcheck='' .github/workflows/alhangeul-desktop.yml`, `git diff --check`.
Windows 전용 회귀는 AST/컴파일·실제 임시 registry의 부분 실패/소유권 복원·문맥 부재/권한
거부·fixture/probe 증거 계약을 검사하며 승인 후 Windows job에서 실행한다.
대형 기존 workflow와 package scripts의 제한된 추가는 기존 역할을 유지하는 예외다.
실제 실행에 필요한 함수가 권장 길이를 넘으면 구현 결과에 이유를 기록한다.
신규 파일은 모두 300 LOC 이내이며 함수도 역할별로 분리했다. P/Invoke 선언의 인자 수는
`CreateProcessWithTokenW` 등 Windows ABI 원형을 그대로 유지하는 예외다.

후보 커밋: `Task #57 [Stage 5.1]: CI 전용 NSIS 문맥·등록 비교 실험 추가`.
완료 후 exact SHA·입력·새 bytes 기준·6개 job/1회 실행안을 제시하고 별도로 승인받는다.
원격 전 native 성공·제품 해결·Stage 5 전체 완료를 선언하지 않는다.

### Stage 5.1 로컬 결과와 원격 인계

| 검사 | 결과 |
|---|---|
| 신규 source-contract | 9 passed; CI opt-in·복원·권한·공개 fixture·scope 계약 |
| 전체 automation | 569 passed, 0 failed, 0 skipped |
| product boundary | 414 files scanned, 통과 |
| actionlint / diff | 통과 |
| Windows PS 5.1 AST·C# 컴파일·registry unit·token/native·실제 NSIS | 미실행; 승인 후 Windows job에서 검증 |

출력은 로컬 `/private/tmp/task57-stage5-boundary.log`, `task57-stage5-automation.log`에 보존했다.
초기 신규 Node 테스트의 괄호 문법 오류를 수정한 뒤 대상·전체 검사를 재실행해 통과했다.
기존 앱/installer/handler/worker·일반 진단·support manifest·기존 product gate는 변경하지 않았다.
새 코드의 Windows 실행 성공은 아직 주장하지 않는다. 실제 API와 token/ACL 계약은 hosted 검증으로
확인해야 하며, 캐시·DLL 잠금·정상 Explorer/linked token 부재는 원시 관측 또는 미검증으로 남긴다.

원격 제안: `publish/task57`에 non-force 후보 게시 후 같은 exact SHA로 artifact/windows-x64,
run_tests=true, publish_release=false, thumbnail_context_experiment=true 1회.
build 1+기존 NSIS/MSI 일반/MSI 강제 교체 3+독립 비교 replica 2, 총 6개 job이다.
비교 job은 최대 30분이며 phase 자식은 최대 10분, 개별 probe는 30초다. 개입 전 baseline을
재현하지 못하면 조사를 멈추며 무작정 retry하지 않는다. 기존 MSI 일반은 C4 대조이고,
NSIS 및 강제 교체의 기존 실패 gate를 예상 실험 성공으로 덮어쓰지 않는다.

`experiment.json`의 observed/exit 0은 비교 증거와 복원 수집 완료일 뿐 제품 수용이 아니다.
raw phase와 개별 probe의 재대조·기존 COM 계약 검사를 수행한다. 실제 Shell HRESULT 분류는
`shell-class-not-registered`로 기록하고 hive는 환경 증거에서 별도로 읽는다. C3의 machine-visible
상태를 잘못 per-user-only 실패라고 이름 붙이지 않는다. 두 replica의 A→B→A·host/cache 상태와
MSI 대조를 함께 읽은 뒤 수정 후보를 판단한다. API bitmap 성공은 Explorer 시각 수용이 아니다.
Windows run 뒤 Stage 5 보고서를 작성하며 지금 최종 보고·PR·close로 넘어가지 않는다.

### Stage 5.1 후보 게시·Windows 1회 실행

2026-09-07 같은 스레드의 “진행해줘”로 위 후보 게시·Windows-only opt-in 비교
1회 실행을 승인받았다. 기존 원격 `f1cdd0711f747b443c723a750f868faa5c0349f1`이 후보의
조상임을 확인하고 `publish/task57`에 non-force push했다. 원격 SHA 재조회 뒤 dispatch를
한 번만 수행했으며 추가 실행·재실행·릴리즈 게시를 하지 않았다.

| 항목 | 실행 기록 |
|---|---|
| 후보 / workflow head SHA | `1cb8b9f6ba9c7f26190600e496720b26d5754675` |
| 원격 ref | `publish/task57` |
| Run | [34065777777](https://github.com/postmelee/alhangeul-tauri/actions/runs/34065777777), attempt 1, workflow_dispatch |
| 생성 시각 | 2026-09-07 08:03:28 KST (`2026-09-06T23:03:28Z`) |
| 전송 입력 | `mode=artifact`, `artifact_platform=windows-x64`, `build_ref=1cb8b9f6ba9c7f26190600e496720b26d5754675`, `run_tests=true`, `publish_release=false`, `thumbnail_context_experiment=true` |
| 최초 API read-back | head SHA·branch 일치, Windows build `101574159911` 진행중, updater·Linux 진단·릴리즈 게시 job skipped |
| 후속 예정 | build 성공 후 기존 smoke 3개와 독립 비교 replica 2개; 총 6개 활성 job 계획 |

입력은 성공한 dispatch 명령의 전송값이며 run API에서 전체 입력 객체를 재조회한 것으로
표현하지 않는다. 최초 조회 시 후속 job은 아직 시작 전이다. 새 bundle/support hash·Windows
native 검사·phase 원시 probe·복원·제품 gate 결과는 완료 후 읽어 검증한다. 현 시점에는
NSIS 해결·실험 성공·Stage 5 완료를 주장하지 않으며 결과 문서 커밋은 실행 후보와 분리한다.

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
- 현재는 Stage 3 진단 검증과 승인된 Stage 4 문서·플랫폼 중립 회귀·#58 인계를 완료했다.
  NSIS·강제 교체의 제품 실패 및 현장 미검증은 유지한다.
- Stage 4 뒤 작업지시자가 #57 지속 진행과 원인 비교 실험 계획 보완을 승인했다.
  이어 Stage 5 비교 코드 구현을 승인받아 구현계획 정렬·코드·로컬 회귀를 완료했다.
  원격 실험·제품 수정·#58 구현·최종 보고·PR로 자동 진입하지 않는다.

## 위험과 대응

- **interop 정의 오류**: 공식 COM vtable/handle 소유권에 맞추고 Windows 컴파일·실행으로 확인한다.
- **관측이 상태를 변경**: 최초 Shell 요청을 앞에 두고 probe별 process·fixture·실행 순서를 기록한다.
- **호스팅과 client 차이**: runner의 UAC 설정만으로 동일 환경을 주장하지 않는다.
- **원격 비용·영향**: Windows-only 비게시 2회 기본안을 제안하고 각 단계 진입 시 실행 승인을 받는다.
- **UI 오해**: 설치 제한은 실제 관측과 한계를 설명하며 JPG/API 성공을 Explorer 전체 성공으로 표현하지 않는다.

## 승인 상태와 다음 요청

1. Stage 2.2부터 진단/제품 수용을 분리하는 기준을 승인받았다. 기존 failed run이나
   현재 제품 실패를 성공으로 바꾸지 않는 조건을 Stage 3에도 적용했다.
2. Stage 3.1/3.2 구현과 각각의 후보 게시·1회 실행은 별도 승인받아 완료했다.
   최종 검증 후보는 `f1cdd0711f747b443c723a750f868faa5c0349f1`이다.
3. 최종 실행 분석 뒤 “진행해줘”로 Stage 3 보고와 Stage 4 잔여 검증·#58 인계 범위 정리를
   승인받았다. 보고 시 재검증은 대상 104개·전체 560개·boundary·actionlint·diff 모두 통과했다.
4. 이어 “진행해줘”로 Stage 4 문서 정합화·기존 근거 재사용·플랫폼 중립 회귀·인계를
   승인받아 완료했다. 추가 Actions·실제 client/VDI·재부팅은 실행하지 않았다.
   이후 #57 지속 진행·비교 계획 작성과 코드 구현을 순서대로 승인받았다.
   Stage 5.1 비교 코드·로컬 검사 후 후보 게시·Windows-only opt-in 비교 1회 실행도
   승인받아 run `34065777777`을 시작했다. 위의 exact SHA·6개 job·실험 전용 권한 경계를
   유지하며 현재 원격 결과를 기다린다. 추가 실행·제품 수정은 자동 진행하지 않는다.
5. 제품 등록 변경·NSIS 전체 사용자 설치·#58 구현·앱 UI·보안 정책 변경·최종 PR 게시·
   issue close·릴리즈는 별도 승인 대상이다.

## 기술 근거

- [IThumbnailCache::GetThumbnail](https://learn.microsoft.com/en-us/windows/win32/api/thumbcache/nf-thumbcache-ithumbnailcache-getthumbnail)
- [WTS_FLAGS](https://learn.microsoft.com/en-us/windows/win32/api/thumbcache/ne-thumbcache-wts_flags)
- [IShellItemImageFactory::GetImage](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ishellitemimagefactory-getimage)
- [CreateProcessWithTokenW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createprocesswithtokenw)
- [TOKEN_LINKED_TOKEN](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-token_linked_token)
- 그 외 원인 가설·공식 등록 규칙·runner 환경 근거는 수행계획서와 #57을 따른다.
