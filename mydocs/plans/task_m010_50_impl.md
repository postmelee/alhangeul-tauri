# Task #50 구현계획서 — Linux HWPX MIME 매칭과 thumbnail 검증 gate 보정

수행계획서: [`task_m010_50.md`](task_m010_50.md)
GitHub Issue: [#50](https://github.com/postmelee/alhangeul-tauri/issues/50)
마일스톤: M010

2026-08-31 작업지시자의 "진행해줘"를 수행계획 승인과 구현계획서 작성 지시로
기록한다. 이후 같은 날 작업지시자의 "진행해줘"를 구현계획 승인과 Stage 1
진입 승인으로 기록한다. Stage 2 이후는 각 단계 보고 후 별도 승인을 받는다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | HWPX MIME와 package lifecycle 계약 | 제품 MIME XML, refresh hook, DEB/RPM mapping·evidence | MIME canary, archive·hook·owner·원복 계약 |
| 2 | Core probe required gate | 기대값 manifest, summary module, 음성 테스트 | 결과·exit·시간·RSS·record 누락/중복 판정 |
| 3 | 조상 symlink path 정책 | resolved Request, CLI·output 회귀 | Linux x64·arm64 Rust test/Clippy |
| 4 | Package-installed file-manager 재수용 | MIME 주입 제거, install 전후 evidence, GUI 캡처 | x64 DEB/RPM, arm64 DEB, x64 Nautilus·Thunar |
| 5 | 공식 문서와 최종 회귀 | architecture·개발·운영·README 정렬 | 플랫폼 중립 검증과 exact-SHA native 결과 |
| 6 | PR 리뷰 package lifecycle·evidence 보정 | remove hook, upstream canary, stale/purge evidence | x64 DEB/RPM, arm64 DEB, Windows와 Linux GUI 재수용 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `LINUX_THUMBNAILS.md` | `docs/architecture/` | `docs/architecture/LINUX_THUMBNAILS.md` | OK | Stage 5에서 기존 공식 계약 보정 |
| `DEVELOPMENT.md` | `docs/` | `docs/DEVELOPMENT.md` | OK | Linux 실행 환경·검증 명령 |
| `DESKTOP_RELEASE.md` | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | package 및 GUI 수용 범위·증거 |
| `README.md` | 저장소 루트 | `README.md` | OK | 실제 검증된 지원 범위만 요약 |
| 수행·구현계획 | `mydocs/plans/` | `mydocs/plans/task_m010_50*.md` | OK | 승인·단계 판단 |
| 단계 보고 | `mydocs/working/` | `mydocs/working/task_m010_50_stage{N}.md` | OK | exact SHA와 단계 증적 |
| 최종 보고 | `mydocs/report/` | `mydocs/report/task_m010_50_report.md` | OK | 최종 보고 절차에서 작성 |
| 오늘할일 | `mydocs/orders/` | `mydocs/orders/20260831.md` 및 작업일 보드 | OK | 날짜 전환에 따른 상태 기록 |

## 공통 구현 규칙

- 작업 위치는 `local/task50` 분리 worktree다. 시작 기준은
  `origin/devel=8b865fa55b55aea232d0fb034a518c807ac4c003`, 수행계획 커밋은
  `fd5d0ef4730959b45f390838f1c37046fcdda68e`다. 2026-08-31 fetch 후 기준선
  변경이 없음을 확인했다. Stage 진입마다 다시 비교하며 다른 task branch를
  임의 merge/rebase하거나 미커밋 변경을 되돌리지 않는다.
- 이번 구현계획은 승인된 기능 범위를 유지한다. 수행계획의 예상 파일 목록에서
  빠졌던 package fixture 생성기·artifact test 및 HWPX MIME을 고정하는 release
  metadata checker도 함께 정렬한다. 새 MIME·core 보조 모듈은 아래 Stage별
  경로로 한정한다.
- 신규 소스는 파일 300 LOC, 함수 50 LOC, 매개변수 5개, 복잡도 10의 권장
  상한을 지킨다. 기존 큰 smoke·test에 동작을 누적하지 않고 MIME snapshot과
  core fixture/summary 책임을 분리한다. 상한 예외가 필요하면 먼저 승인받는다.
- Rust compile/test/Clippy, MIME database 도구, package transaction과 GUI는
  Linux에서만 실행한다. 현재 호스트에서는 문서 및 플랫폼 중립 source test만
  실행한다. Rust desktop/Tauri 검증을 지원 범위 밖의 호스트에서 수행하지 않는다.
- system path를 쓰는 검증은 기존 `GITHUB_ACTIONS=true`와
  `ALHANGEUL_PACKAGE_SMOKE_ALLOW_SYSTEM=1` opt-in ephemeral runner만 허용한다.
  개발 장비의 `/usr/share/mime`, 기본 앱과 file manager는 변경하지 않는다.
- 공유 `document-preview`, `third_party/rhwp` gitlink, Windows handler,
  1,500 ms worker deadline과 256 MiB `RLIMIT_AS`는 변경하지 않는다.
- fixture는 현재 pin의 공개 sample을 사용하고 원본 SHA-256·size·mtime 불변을
  검사한다. artifact에 비공개 문서, 사용자 절대 경로 또는 본문을 기록하지 않는다.
- 원격 검증에 필요한 candidate는 일반 fast-forward push로
  `local/task50:publish/task50`에만 올린다. exact source SHA, workflow SHA,
  run ID와 artifact digest를 보고서에 연결한다. `local/task50` 이름으로 원격
  branch를 만들거나 force push, tag, release, package 게시를 하지 않는다.
- 이 구현계획의 승인 범위에는 해당 Stage의 candidate push와 기존 수동 Actions
  dispatch를 포함한다. 이 턴에서는 push·dispatch·PR 게시를 수행하지 않는다.

## Stage 1 — HWPX MIME와 package lifecycle 계약

### 산출물

신규:

- `apps/desktop/src-tauri/linux/alhangeul-hwpx.xml`
- `apps/desktop/src-tauri/linux/update-mime-database.sh`
- `scripts/linux-thumbnail-mime-contract.mjs` — MIME snapshot·보존·evidence 비교
- `scripts/linux-thumbnail-mime-smoke.sh` — 격리 MIME root old/new 정의 canary
- `tests/linux-thumbnail-mime.test.mjs` — XML·hook·snapshot 의미 검증
- `mydocs/working/task_m010_50_stage1.md`

수정:

- `apps/desktop/src-tauri/linux/alhangeul.thumbnailer`
- `apps/desktop/src-tauri/tauri.conf.json`
- `scripts/linux-thumbnail-package-smoke.mjs`
- `scripts/linux-thumbnail-package-contract.mjs`
- `scripts/linux-thumbnail-package-fixtures.mjs`
- `scripts/verify-linux-thumbnail-package-evidence.mjs`
- `scripts/check-release-metadata.mjs`, `tests/release-metadata.test.mjs`
- `tests/linux-thumbnail-registration.test.mjs`
- `tests/linux-thumbnail-packaging.test.mjs`
- `tests/desktop-artifacts.test.mjs`
- `.github/workflows/alhangeul-desktop.yml`, `tests/actions-workflows.test.mjs`
- `package.json` — 새 MIME test를 기존 automation inventory에 포함

### 변경 내용

- 제품 XML에 `application/x-hwpx`, `*.hwpx`, ZIP 하위 타입과
  `application/hwp+zip` mimetype magic을 선언한다. alias는
  `application/hwp+zip`, `application/vnd.hancom.hwpx`,
  `application/x-hwp+zip`로 정렬한다. HWP·일반 ZIP 전체를 제품 타입으로
  가로채거나 제3자 정의를 지우는 `glob-deleteall`·`magic-deleteall`은 쓰지 않는다.
- registration은 `application/x-hwp;application/x-hwpx;`로 정렬하고 `%i %o %s`,
  절대 helper 경로와 기타 handler 경계는 유지한다. Tauri HWPX association의
  MIME만 정렬하고 Windows ProgID·extension·installer template은 변경하지 않는다.
  release metadata checker도 동일 canonical 값을 요구하게 하고 이전 alias로의
  config drift를 실제 negative test로 거부한다. 다른 release metadata와 updater
  금지 조건은 바꾸지 않는다.
- DEB/RPM은 `/usr/share/mime/packages/alhangeul-hwpx.xml`을 mode `0644`로
  소유한다. XML, helper, registration의 archive cardinality, installed mode,
  content/hash와 단일 owner를 각각 검사한다. generated MIME cache는 package
  파일로 직접 소유하거나 배포하지 않는다.
- 공통 post-install/post-remove hook은 고정된 system MIME root에만 refresh를
  실행한다. argument·환경 변수로 임의 root를 받거나 오류를 무조건 숨기지 않는다.
  command 부재·비정상 종료는 silent success로 처리하지 않는다. 필요한
  `shared-mime-info` dependency는 Tauri 기본 dependency를 보존하며 명시하고,
  실제 DEB/RPM metadata에서 두 조건을 검증한다.
- hook 단위 테스트는 command double로 인자와 종료 상태를 검사하며 개발
  호스트의 실제 MIME command는 실행하지 않는다. `mimeapps.list`, default 앱,
  cache purge, file manager 종료와 제품 XML 외 삭제는 금지한다.
- canary는 private MIME root에 제품 XML을 설치·제거하면서 old 정의 부재와
  new 동일 canonical 정의 공존을 나눠 검사한다. glob과 magic을 따로 검증하고
  일반 ZIP negative도 둔다. 이 canary는 MIME 단위 검증이며 Stage 4의
  package-only GUI evidence를 대신하지 않는다.
- package smoke는 설치 전후 `gio` type, XML hash/owner, canonical/alias 조회와
  제3자 MIME sentinel을 기록한다. 제거 후에는 항상 ZIP이어야 한다고 가정하지
  않고 설치 전 baseline 의미로 복귀하는지 확인한다. system cache의 timestamp나
  byte 단위 동일성 대신 제품 정의 제거와 기존 정의·기본 앱 보존을 판정한다.
- 기존 pre-install failure rollback은 그대로 유지한다. refresh 실패 경로도
  disposable fixture에서 별도 주입하고, failure 후 설치 상태·cache를 관측한 뒤
  알려진 candidate 재설치/제거로 복구한다. package manager가 자동 rollback을
  하지 않은 경우 이를 자동 rollback 성공으로 기록하지 않는다.
- evidence에는 transition별 실행 결과를 넣는다. 기존처럼 lifecycle 이름 목록만
  존재하거나 MIME 관측값이 빠진 summary는 verifier가 거부한다. producer,
  consumer와 synthetic artifact fixture를 같은 Stage에서 갱신한다.

### 검증

플랫폼 중립:

```bash
node --test tests/linux-thumbnail-mime.test.mjs tests/linux-thumbnail-registration.test.mjs tests/linux-thumbnail-packaging.test.mjs tests/desktop-artifacts.test.mjs tests/actions-workflows.test.mjs
node --test tests/release-metadata.test.mjs
node scripts/check-release-metadata.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck apps/desktop/src-tauri/linux/update-mime-database.sh scripts/linux-thumbnail-mime-smoke.sh scripts/linux-thumbnail-package-smoke.sh
actionlint .github/workflows/alhangeul-desktop.yml
git diff --check
```

Linux native candidate에서 MIME canary, x64 DEB/RPM 및 arm64 DEB archive·hook
metadata와 lifecycle이 통과해야 한다. 이 시점의 기존 GUI MIME 주입과 기존 core
gate는 Task #50 전체 성공 근거로 사용하지 않는다.

2026-08-31 Stage 1 검증 보정: candidate `56c2ce7`의 native run
`33367986557`에서 arm64 MIME canary와 실제 HWPX glob/magic 등록은 통과했다.
다만 기본 앱이 없는 runner에서 HWP의 조회 fallback이 설치된 앱으로 바뀌어
"기존 기본 앱 보존" 검사가 실패했다. 설치 전 테스트 전용 XDG config/data에
제3자 desktop entry와 명시적 기본 앱 fixture를 준비하고, 선택이 유효함을 먼저
확인한 뒤 매 transition의 선택·설정 파일 SHA를 동일하게 요구하도록 보정한다.
이는 CI의 임시 사용자 설정이며 제품 hook이나 실제 사용자 설정 변경이 아니다.
private MIME XML/cache는 만들지 않고 system MIME 경로를 그대로 검사한다.
기존 Task #17 Stage 4에서 확인된 Ubuntu RPM의 reverse-file lookup 문제도
유지해서 회피한다. `rpm -qf`로 되돌리지 않고 전체 설치 package inventory를
열거하여 세 제품 파일의 실제 owner가 각각 하나인지 검사한다.

Stage 1 결과: candidate `dd1e2a308158854c9ec69a2e7eec4b3bc5ccfd31`의
native run `33370108591`에서 Linux x64 DEB/RPM과 arm64 DEB의 검증을 완료했다.
플랫폼 중립 automation은 351 pass다. 상세는
[`Stage 1 보고서`](../working/task_m010_50_stage1.md)에 기록하며 Stage 2 승인을
기다린다. 같은 실행의 Windows 추가 CI는 단계 보고 시점에 계속 진행 중이다.

### 커밋

```text
Task #50 [Stage 1.1]: HWPX MIME와 package lifecycle candidate
Task #50 Stage 1: HWPX MIME 소유권과 설치 제거 계약 확정
```

## Stage 2 — Core probe required gate 강화

2026-08-31 작업지시자의 "진행해줘"를 Stage 1 보고 승인과 Stage 2 진입
승인으로 기록한다. 진입 시 fetch한 `origin/devel`은 기존 기준선
`8b865fa55b55aea232d0fb034a518c807ac4c003`과 같으며 worktree는 깨끗했다.
pin의 `saved/` 원본 7개의 SHA·size와 preview 구조를 독립 검사했다. HWP 3개는
`/PrvImage` PNG를 보유하고, HWPX 4개는 동일한 68-byte PNG의 IDAT CRC가
손상돼 preview 기대값을 `false`로 고정한다. 정상 direct 기대값은 모두 `true`다.
변형은 `03-blank_hwpx.hwpx`를 고정 source로 사용하며 stale PNG의 mode·mtime과
ZIP extra field를 고정해 네 변형도 SHA로 식별한다. 기존 임의 첫 HWPX 선택과
실행 시각에 따라 달라지던 변형 SHA를 제거하는 보정이며 renderer는 수정하지 않는다.
candidate `559d86c` dispatch 후 ZIP 헤더 재점검에서 `touch`만 UTC여도
`zip`이 로컬 timezone으로 DOS timestamp를 쓰는 차이를 발견했다. `zip` 실행에도
UTC를 명시하고 1980-01-01 00:00 헤더의 독립 SHA로 보정한다. 기대 성공/실패와
시간·RSS 한도는 바꾸지 않는다.

### 산출물

신규:

- `scripts/linux-thumbnail-core-summary.mjs` — record 판정과 summary CLI
- `scripts/linux-thumbnail-core-fixtures.mjs` — pinned fixture별 독립 기대값
- `mydocs/working/task_m010_50_stage2.md`

수정:

- `scripts/benchmark-linux-thumbnail-core.sh`
- `tests/linux-thumbnail-core-probe.test.mjs`
- `.github/workflows/alhangeul-desktop.yml`, `tests/actions-workflows.test.mjs` — 실제
  required outcome와 진단 upload 연결에 필요한 부분만

### 변경 내용

- 기존 세 positional input, 128/256/512/1024 edge와 direct/preview 독립 process
  계측을 유지한다. expectation은 측정된 `result.success`에서 역산하지 않는다.
  현재 pin의 fixture SHA와 preview 보유 구조를 확인해 manifest로 고정하며
  알려지지 않은 fixture, 누락/중복 조합은 실패한다.

| Fixture class | direct 기대값 | preview 기대값 |
|---|---|---|
| `normal-hwp`, `normal-hwpx` | `true` | 고정 SHA manifest의 preview 보유 기대값 |
| `preview-absent` | `true` | `false` |
| `preview-stale` | `true` | `true` — 유효하지만 의도적으로 다른 preview |
| `corrupt-truncated` | `false` | `false` |
| `size-boundary-64mib-plus-one` | `false` | `false` |

- 기대값과 관측값이 다르면 실패한다. 정상 fixture direct 실패를 preview 성공으로
  덮지 않으며, negative fixture의 의도된 `false`는 process 성공과 구분한다.
  현재 계측 binary의 `exitCode=0`은 결과 JSON 출력 성공을 뜻하므로 모든 record에
  exit 0과 `timedOut=false`를 요구한다.
- 모든 record의 metric은 유효한 유한 수여야 한다. 누락·NaN·음수 wall 또는
  0/누락 RSS를 정상 측정으로 간주하지 않는다. 기대 성공 render마다 wall
  `<=1,500 ms`, peak RSS `<=268435456 bytes`를 검사한다. p95와 max는 진단으로
  유지하되 일부 느린 record를 평균·백분위로 숨기지 않는다.
- shell 안전 timeout은 5초, TERM 후 강제 회수 유예는 1초로 줄인다. 성공 예산은
  여전히 1,500 ms다. JSON 파손을 단순 `success:false`로 바꿔 negative fixture
  성공으로 만들지 않고 parse 오류를 별도 실패로 남긴다.
- 256 MiB peak RSS gate는 core 측정 기준이다. 실제 helper의 256 MiB
  `RLIMIT_AS`는 가상 주소공간 제한이며 서로 동일한 검증이라고 주장하지 않는다.
  worker deadline/limit는 Stage 3 native contract에서도 별도로 재검증한다.
- summary는 기대·실제 결과, 초과 항목, exact repository/rhwp SHA와 manifest
  식별값을 기록한다. 실패 JSON도 먼저 저장하고 CLI nonzero로 끝내 기존 required
  outcome gate에 전달한다. CLI로 성공/실패 fixture를 실제 실행해 종료 코드를 본다.
- 경계 테스트는 1,500/1,501 ms, 268435456/268435457 bytes, 정상 및 비정상 exit,
  timeout, malformed JSON, 빈 records, unknown fixture, 누락·중복 edge/mode,
  정상 render 실패와 negative 기대값 뒤집기를 각각 검증한다.

### 검증

```bash
node --test tests/linux-thumbnail-core-probe.test.mjs tests/actions-workflows.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck scripts/benchmark-linux-thumbnail-core.sh
actionlint .github/workflows/alhangeul-desktop.yml
git diff --check
```

Linux x64·arm64의 실제 core probe가 모든 expected record를 처리해야 한다.
strengthened gate에서 새로운 실제 render 실패가 확인되면 기준을 낮춰 통과시키지
않고 renderer 변경 제외 범위와 대조해 보고한다.

Stage 2 결과: candidate `f228a601520266229eaeb75e6d46bea8d8f25cc9`의
native run `33374841115`에서 Linux x64·arm64 core가 각각 88개 조합과 required
gate를 통과했다. 전체 automation 389 pass이며 상세는
[`Stage 2 보고서`](../working/task_m010_50_stage2.md)에 기록한다. Stage 3 승인을
기다리며, 같은 실행의 후속 package/desktop 및 Windows 추가 CI는 보고 시점에 진행 중이다.

### 커밋

```text
Task #50 [Stage 2.1]: Linux thumbnail core semantic gate candidate
Task #50 Stage 2: 렌더 결과와 resource 예산의 required 판정 강화
```

## Stage 3 — 조상 symlink path 정책 정렬

2026-08-31 작업지시자의 "진행해줘"를 Stage 2 보고 승인과 Stage 3 진입 승인으로
기록한다. fetch한 `origin/devel`은 기존 `8b865fa` 기준선과 같고 worktree는
깨끗했다. 기존 통합 테스트가 299 LOC이므로 동일 승인 시나리오를 별도 test target에
배치하고 공통 도우미만 분리한다. 300 LOC 상한 검사의 파일 목록도 함께 보강한다.
Linux에서만 실행하도록 승인된 fmt 명령은 기존 native lint step에 연결한다.
제품 동작 범위는 기존 경로 보정 그대로이며 output 구현은 변경하지 않는다.
검증 로그는 기존 helper artifact가 test 전에 올라가는 구조와 분리하여 test/fmt/
Clippy 전용 artifact에 항상 보존한다. `pipefail`로 실제 실패를 유지하고 exact
source/workflow SHA 및 outcome을 기록한다. 테스트의 원본 byte 동일성 검사는
실패해도 문서 byte를 출력하지 않도록 boolean assertion을 사용한다.
첫 candidate `cf9c48e`의 run `33376235566`에서 arm64의 20개 Rust test가
통과했으나 fmt가 신규 코드의 줄바꿈 세 곳을 거부했다. Linux formatter diff만
반영하고 같은 범위에서 재실행하며 lint나 test gate를 완화하지 않는다.

### 산출물

- `apps/linux-thumbnailer/src/cli.rs`
- `apps/linux-thumbnailer/tests/thumbnailer_contract.rs`
- `apps/linux-thumbnailer/tests/symlink_contract.rs` — 승인된 symlink 시나리오 분리
- `apps/linux-thumbnailer/tests/support/mod.rs` — 기존 공통 도우미 이동
- `tests/linux-thumbnail-build.test.mjs` — 분리 파일의 크기·검증 연결 계약
- `.github/workflows/alhangeul-desktop.yml` — fmt 검사 및 test/lint 진단 보존
- `mydocs/working/task_m010_50_stage3.md`

### 변경 내용

- input leaf를 `symlink_metadata`로 검사해 파일 자체 symlink, non-regular,
  초과 크기·상대 경로를 거부한 뒤 canonical path와 metadata를 확인한다.
  caller의 원래 문자열 대신 resolved absolute input을 Request에 저장한다.
- output은 존재하는 parent를 canonicalize한 뒤 원래 leaf name을 결합한다.
  parent 자체와 더 위 조상 symlink는 허용하되 missing/dangling parent,
  non-directory parent와 output leaf symlink는 거부한다. resolved input과 output
  동일성을 검사한 후 worker에도 resolved path만 전달한다.
- canonicalization을 race-free 파일 handle 고정과 동일시하지 않는다. 기존
  output leaf 재검사, `O_NOFOLLOW`, device/inode 확인과 Tumbler 빈 파일 동일
  inode 쓰기를 유지한다. 이를 위해 output 구현의 추가 변경이 필요하면 먼저
  계획을 보정하고 승인받는다.
- 테스트는 input ancestor link, output parent 자체/ancestor link, 양쪽 link,
  한글·공백 경로를 정상 처리하는지 본다. 서로 다른 표기로 같은 resolved 파일을
  가리키는 입력/출력, leaf/dangling link, directory·relative·oversize는 거부한다.
- symlinked parent 아래 새 output, 기존 non-empty output과 Tumbler precreated
  output을 각각 검증한다. 실패 시 원본 hash, 기존 final 및 target sentinel을
  보존하고 temporary·orphan worker가 없어야 한다.

### 검증

Linux x64·arm64에서만 실행:

```bash
cargo fmt --manifest-path apps/linux-thumbnailer/Cargo.toml -- --check
pnpm run test:linux-thumbnailer
pnpm run clippy:linux-thumbnailer
```

플랫폼 중립 및 회귀:

```bash
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

기존 timeout/kill/reap, memory limit, panic/partial, 동시 요청과 Tumbler inode
테스트를 생략하지 않는다. 공유 renderer·worker protocol은 변경하지 않는다.

Stage 3 결과: candidate `dc6be3fe11fa8b0bd524365a551f22d228cf39b5`의
native run `33377678863`에서 Linux x64·arm64 각각 Rust test 20개와 fmt·Clippy가
통과했다. 전체 automation 390 pass이며 상세 증적과 최종 metadata 정리의 검증
경계는 [`Stage 3 보고서`](../working/task_m010_50_stage3.md)에 기록한다.
Stage 4 승인을 기다리며, 같은 실행의 후속 desktop/package·Windows 추가 CI는
보고 시점에 진행 중이다.

### 커밋

```text
Task #50 [Stage 3.1]: Linux thumbnail resolved path candidate
Task #50 [Stage 3.2]: Linux fmt 정렬과 native 검증 진단 보존
Task #50 Stage 3: 조상 symlink 허용과 leaf output 방어 정렬
```

## Stage 4 — 실제 package와 file-manager 재수용

2026-09-01 작업지시자의 "진행해줘"를 Stage 3 보고 승인과 Stage 4 진입 승인으로
기록한다. fetch한 `origin/devel`은 기존 `8b865fa` 기준선과 같고, Stage 3 완료
worktree도 깨끗했다. Stage 3의 exact run `33377678863`은 보고 뒤 Linux x64·arm64,
Windows 및 installer smoke까지 전체 성공으로 끝났다. 기존 manager probe가
private `XDG_DATA_HOME`에 `alhangeul-probe.xml`과 구 HWPX MIME을 만들던 false
positive를 확인했다. 이 생성·`update-mime-database` 호출을 제거하고 설치된
system XML·registration·helper만 신뢰한다. 실제 HWP/HWPX는 합성 fixture와
별도로 최초·cached·changed 호출을 모두 판정하며 성공 cache PNG metadata와
손상 fixture의 성공 PNG 부재를 기록한다. 기존 GUI workflow와 그 계약 test는
이미 권장 300 LOC를 넘는 단일 역할 파일이다. 이번 변경은 동일 acceptance
순서·outcome 계약에 한정하고, unrelated 구조 분리는 이 Stage에 섞지 않는다.
첫 GUI run `33500966551`은 pre/post MIME, installed owner, Nautilus lifecycle과
전체 앱 GUI가 통과했으나 nested `thumbnails/fail/gnome-thumbnail-factory`의
실패 marker를 immediate parent 이름만 보고 성공 PNG로 잘못 셌다. artifact에서
해당 URI의 PNG가 failure cache 아래에만 있고 정상 네 문서는 `large` cache에
있음을 확인했다. 전체 relative path component로 failure cache를 제외하고 같은
gate를 재실행하며 손상 문서의 성공 PNG 허용으로 기준을 낮추지 않는다.

2026-09-01 최종 candidate
`241e0674d2abe41b8fc5bd521725321ddadc4398`에서 native run `33502167628`의
Linux x64·arm64, Windows x64 및 Windows installer smoke가 모두 성공했다.
같은 SHA와 native run ID를 받은 Linux GUI run `33504817069`도 pre-install MIME,
package 설치, installed thumbnail, Nautilus·Thunar/Tumbler manager probe와 기존
제품 GUI를 모두 통과했다. private MIME path는 전후 모두 없었고 실제 HWPX는
설치 전 `application/zip`, 설치 후 `application/x-hwpx`였다. 두 manager 모두
실제 HWP/HWPX의 최초·cached·changed 호출·cache metadata와 손상 문서의 성공
PNG 부재를 충족했다. 실사용 512px PNG 및 file-manager screenshot을 사람이
판독해 온새미로 표지와 form-002 표·본문이 서로 구분되어 보임을 확인했다.
상세 증적은 `mydocs/working/task_m010_50_stage4.md`에 고정하며 Stage 5 공식 문서
변경은 작업지시자 승인을 기다린다.

### 산출물

- `scripts/linux-thumbnail-manager-probe.sh`
- `scripts/linux-thumbnail-manager-session.sh`
- `.github/workflows/alhangeul-linux-gui.yml`
- `tests/gui/linux/native-ui/thumbnail-files.test.mjs`
- `tests/linux-gui-workflow.test.mjs`, `tests/linux-thumbnail-registration.test.mjs`
- Stage 1 package smoke·evidence — 실제 전후 관측 보정이 필요한 부분만
- `mydocs/working/task_m010_50_stage4.md`

### 변경 내용

- `create_mime_database()`와 `alhangeul-probe.xml` 생성을 제거한다. fresh
  `XDG_DATA_HOME`/cache 격리는 유지하되 private MIME package/cache가 없음을
  확인한다. system MIME 검색 경로를 evidence에 기록하며 probe 안에서 제품
  XML을 복사하거나 `update-mime-database`를 추가 실행해 설치를 보완하지 않는다.
- GUI workflow는 앱 설치 전에 실제 공개 HWP/HWPX의 `gio` content-type과
  shared-mime-info version을 수집한다. 설치 뒤 XML/helper/registration hash와
  package owner를 확인하고, real HWP와 HWPX 및 합성 fixture 각각의 MIME이
  registration과 매칭되는지 검사한다. 실패해도 전후 evidence부터 보존한다.
- exact source의 온새미로 HWP와 form-002 HWPX를 그대로 사용한다. 두 manager에서
  최초 helper `execve >=1`, cached 호출 증가 없음, 변경 뒤 호출 증가를 각각
  검사한다. 실제 PNG·cache metadata와 screenshot을 함께 확인한다.
- 최초/cached/changed 화면을 안정된 window paint 뒤 캡처하고 두 실제 문서의
  서로 다른 첫 페이지가 보이는지 사람이 검토한다. 이 Stage 보고 시 캡처를
  작업지시자에게 보여주며 문서 첫 페이지 fidelity 개선은 이슈 범위에 추가하지
  않는다. 손상 fixture는 generic icon과 final PNG 부재로 판정한다.

| 환경 | Package 수용 | File-manager GUI 수용 |
|---|---|---|
| Linux x64 `ubuntu-22.04` | DEB 및 RPM transaction·MIME lifecycle | 설치된 DEB의 Nautilus·Thunar/Tumbler |
| Linux arm64 `ubuntu-22.04-arm` | DEB transaction·MIME·직접 helper | 제외 |

- x64 RPM은 기존 Ubuntu runner의 `rpm --nodeps` transaction 검증임을 명시한다.
  Fedora 전체 dependency resolution이나 RPM 설치 GUI 검증으로 표현하지 않는다.
  old/new MIME canary 역시 실제 최신 배포판 전체 지원의 근거로 확장하지 않는다.
- exact desktop native 성공 후 같은 build SHA와 native run ID를 GUI workflow에
  전달한다. 두 SHA·artifact digest·package XML hash가 다른 evidence는 합치지
  않는다. 기존 제품 GUI 필수 check를 제거해 thumbnail만 통과시키지 않는다.

### 검증

```bash
node --test tests/gui/linux/native-ui/thumbnail-files.test.mjs tests/linux-gui-workflow.test.mjs tests/linux-thumbnail-registration.test.mjs tests/linux-thumbnail-packaging.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck scripts/linux-thumbnail-manager-probe.sh scripts/linux-thumbnail-manager-session.sh
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

승인된 candidate의 원격 명령 형식:

```bash
git push origin local/task50:publish/task50
gh workflow run alhangeul-desktop.yml --ref publish/task50 -f build_ref=<exact-sha> -f run_tests=true
gh workflow run alhangeul-linux-gui.yml --ref publish/task50 -f build_ref=<exact-sha> -f native_run_id=<successful-native-run-id>
```

세 package lifecycle, 강화된 core gate, helper 계약과 DEB GUI 두 manager가 모두
통과해야 한다. GUI content-type 주입 부재와 uninstall 원복 증거가 없으면
기존 PR #49 결과를 재사용해 이 Stage를 완료하지 않는다.

### 커밋

```text
Task #50 [Stage 4.1]: MIME 주입 없는 package-installed GUI candidate
Task #50 [Stage 4.2]: nested failure cache 경로 판정 보정
Task #50 Stage 4: Linux HWPX 실제 설치와 파일 관리자 시각 수용
```

## Stage 5 — 공식 문서와 최종 회귀 정렬

2026-09-02 작업지시자의 "진행해줘"를 Stage 4 보고 승인과 Stage 5 진입 승인으로
기록한다. fetch한 `origin/devel`은 `8b865fa55b55aea232d0fb034a518c807ac4c003`,
원격 `publish/task50`은 Stage 4 완료 commit
`39e98f9c614606530c617cfddeafe96b9a704804`로 기존 기준과 같고 worktree는
깨끗했다. 대상 독자는 Linux 사용자·기여자·배포 운영자이며, 기존 공식 문서
루트의 `README.md`, `docs/architecture/LINUX_THUMBNAILS.md`,
`docs/DEVELOPMENT.md`, `docs/operations/DESKTOP_RELEASE.md`를 최소 보정한다.
아키텍처 계약은 architecture 문서, 개발 명령은 DEVELOPMENT, exact artifact와
운영 한계는 DESKTOP_RELEASE, 요약만 README에 두는 기존 소유 경계를 유지한다.
새 문서나 `mydocs/manual` 대안은 중복 진실 원천이 되므로 선택하지 않는다.
기존 문서를 구현과 대조해 canonical HWPX MIME, 세 package 소유 경로와 MIME
refresh, 조상/leaf symlink 구분, peak RSS와 `RLIMIT_AS`의 독립 경계 및 Stage 4
실사용 evidence만 보정했다. 플랫폼 중립 검증은 product boundary 312 files,
upstream 35 tests, Studio 105 tests, Studio production build, automation 390 tests와
`git diff --check`를 통과했다. 첫 Studio test는 분리 worktree의 Vite 임시 폴더
쓰기가 sandbox에 막혀 같은 명령을 허용된 worktree write로 재실행했으며 제품
실패가 아니었다. 문서 commit 뒤 exact SHA로 native와 GUI를 새로 실행한다.

### 산출물

- `README.md`
- `docs/architecture/LINUX_THUMBNAILS.md`
- `docs/DEVELOPMENT.md`
- `docs/operations/DESKTOP_RELEASE.md`
- `mydocs/working/task_m010_50_stage5.md`

### 변경 내용

- architecture에 canonical MIME, 제품 XML 경로와 install/remove refresh를
  명시한다. system-wide MIME database를 전혀 변경하지 않는다는 기존 문구를
  제품 XML·파생 cache 갱신 범위로 보정하되 기본 앱·제3자 정의·thumbnail cache
  보존 정책은 유지한다.
- 입력/output parent ancestor symlink 허용과 leaf symlink 거부, core RSS 판정과
  runtime 주소공간 제한의 차이, 기대값 matrix와 실제 required gate를 반영한다.
- README와 개발·운영 문서는 Stage 4에서 입증한 배포판/version/package 조합만
  표시한다. PR #49의 MIME 주입 GUI evidence는 역사적 결과로 보존하고 실제
  package-only 수용의 한계를 짧게 정정해 새 evidence를 연결한다.
- 문서 최종 candidate에서도 동일 SHA의 native 및 GUI 결과를 확보한다. 코드나
  workflow가 바뀌면 이전 source의 성공을 새 SHA 성공으로 표현하지 않는다.
  공유 config의 MIME 변경이 Windows association 경로를 깨지 않았는지 기존
  Windows x64 installer/thumbnail gate도 확인한다.

### 검증

```bash
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run test:automation
git diff --check
```

최종 native candidate의 Linux x64·arm64 helper/core/package와 Windows x64 기존
installer gate, 같은 SHA의 Linux x64 GUI를 확인한다. 결과는 run ID·artifact
digest와 함께 보고하며 릴리스 게시를 수행하지 않는다.

Stage 5 결과: 공식 문서 candidate
`a07bd1330363ee767b9e1cc7a80bed6a685cebcf`를 기준으로 native run
`33582889787`의 Linux x64·arm64 및 Windows x64 4개 job과 GUI run
`33585227125`를 모두 통과했다. Linux package evidence는 x64 DEB·RPM과 arm64
DEB의 설치·재설치·update·주입된 refresh 실패·명시적 복구·제거를 확인했고,
core probe는 두 architecture 모두 88 records와 1,500 ms/256 MiB gate를
통과했다. Windows MSI·NSIS installer smoke도 HWP/HWPX thumbnail 호출과 제거를
통과했다. Linux GUI는 package 소유 system MIME XML만으로 실제 온새미로 HWP와
form-002 HWPX를 Nautilus·Thunar에서 최초·cached·changed 수용했고 손상 문서의
성공 PNG는 0개였다. 512px 실제 문서 render는 Stage 4와 같은 SHA로 재현됐다.
최종 플랫폼 중립 검증은 product boundary 312 files, upstream 35 tests, Studio
105 tests와 production build, automation 390 tests 및 `git diff --check`를
통과했다. 상세 artifact ID·digest와 미검증 조합은
[`Stage 5 보고서`](../working/task_m010_50_stage5.md)에 기록한다. 다섯 구현
Stage는 완료했으며 작업지시자의 승인 전 최종 보고서·PR 절차에는 진입하지 않는다.

### 커밋

```text
Task #50 [Stage 5.1]: Linux thumbnail MIME 계약과 공식 문서 정렬
Task #50 Stage 5: 플랫폼 회귀와 최종 수용 증적 확인
```

## Stage 6 — PR 리뷰 package lifecycle·evidence 보정

2026-09-02 작업지시자의 "진행해줘"를 PR #52 리뷰
`issuecomment-5504713215` 검토 결과 승인과 Stage 6 진입 승인으로 기록한다.
시작 시 `origin/devel`은 `28d01b9a4e1a642b3834755cfe3623c6eb543b39`,
원격 `publish/task50`과 로컬 HEAD는
`4958631989e438e2d1ce5dce3daa6921473a18b8`로 일치하고 worktree는 깨끗하다.
리뷰의 merge blocker인 DEB `postrm` dependency 부재를 우선 해소하고, 같은
package/MIME evidence 계약에 속하는 medium·low 지적을 함께 고정한다. renderer,
공유 preview, Windows handler, `third_party/rhwp` gitlink와 공개 release 범위는
변경하지 않는다.

공식 문서는 기존 승인 위치를 유지한다. package·magic 계약은
`docs/architecture/LINUX_THUMBNAILS.md`, 최종 exact run·artifact chain은
`docs/operations/DESKTOP_RELEASE.md`가 소유한다. README는 run ID의 진실 원천이
아니므로 기능 범위가 바뀌지 않는 한 수정하지 않는다. shared-mime-info 2.5의
HWPX 한 블록은 제품 문서가 아니라 외부 호환성 test fixture이므로 출처 tag와
URL을 기록해 `tests/fixtures/`에 둔다. 새 공식 문서나 `mydocs/manual`은 만들지
않는다.

### 산출물

- `apps/desktop/src-tauri/linux/update-mime-database-remove.sh`
- `apps/desktop/src-tauri/tauri.conf.json`
- `scripts/linux-thumbnail-mime-contract.mjs`
- `scripts/linux-thumbnail-package-contract.mjs`
- `scripts/linux-thumbnail-package-smoke.mjs`
- `scripts/verify-linux-thumbnail-package-evidence.mjs`
- `tests/fixtures/shared-mime-info-2.5-hwpx.xml`
- `tests/linux-thumbnail-mime.test.mjs`
- `tests/linux-thumbnail-packaging.test.mjs`
- `tests/desktop-artifacts.test.mjs`
- `scripts/linux-thumbnail-mime-smoke.sh` — executable mode 정렬
- `docs/architecture/LINUX_THUMBNAILS.md`
- `docs/operations/DESKTOP_RELEASE.md`
- `mydocs/working/task_m010_50_stage6.md`

### 변경 내용

- install hook은 명령 부재와 refresh 실패를 계속 nonzero로 전달한다. remove
  hook은 `command -v update-mime-database`가 실패할 때 성공 종료하고, 명령이
  존재하지만 refresh가 실패하면 nonzero를 유지한다. DEB와 RPM config의
  post-remove만 새 hook을 사용한다.
- DEB lifecycle은 최종 remove 뒤 제한된 PATH에서 실제 `dpkg --purge`를 실행해
  dependency command가 없는 `postrm purge`가 성공하고 package가 완전히
  사라지는지 관측한다. RPM에는 존재하지 않는 purge 의미를 합성하지 않고
  evidence verifier가 format별 기대 transition을 판정한다.
- refresh failure fixture는 제품 MIME이 cache에 없는 interim uninstall 직후에
  설치한다. 제품 XML은 배치됐지만 cache는 baseline인 실제 stale 상태와 hook
  exit 42를 관측하고, candidate 재설치만이 canonical MIME을 복구하는지
  단언한다. 이후 old-install/update/rollback/uninstall 회귀를 유지한다.
- new-generation canary는 제품 XML 복제본이 아니라 shared-mime-info 2.5 tag의
  실제 `application/x-hwpx` 블록 fixture를 사용한다. canonical type, glob,
  magic과 alias가 제품 설치·제거 전후에 병합·복원되는지 검증한다.
- archive 계약은 `/usr/share/mime/` 하위 regular file 중
  `packages/alhangeul-hwpx.xml`만 허용한다. aliases, magic뿐 아니라 모든 media
  directory와 향후 생성 cache 파일의 package 소유를 거부한다.
- 공식 문서는 Stage 4 역사적 chain을 보존하면서 최종 Stage 6 source
  `dbf09404e8b2e4fd07f510ddc60329e71a596643`, native run `33607431684`, GUI run
  `33610310800`과 artifact digest를 추가한다. 비표준 HWPX ZIP은 mimetype magic이
  맞지 않아 확장자 glob에 의존한다는 알려진 한계를 기록한다.
- URL 실행 path는 `fileURLToPath()`를 사용하고 Linux MIME smoke wrapper를
  executable mode로 정렬한다.

### 검증

플랫폼 중립:

```bash
node --test tests/linux-thumbnail-mime.test.mjs tests/linux-thumbnail-packaging.test.mjs tests/desktop-artifacts.test.mjs
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run test:automation
shellcheck apps/desktop/src-tauri/linux/update-mime-database.sh apps/desktop/src-tauri/linux/update-mime-database-remove.sh scripts/linux-thumbnail-mime-smoke.sh scripts/linux-thumbnail-package-smoke.sh
git diff --check
```

지원 대상 native/GUI:

- final source/workflow candidate를 `publish/task50`에 push한 뒤
  `alhangeul-desktop.yml`을 exact SHA로 실행한다.
- Linux x64는 DEB purge-without-command, DEB/RPM stale-cache recovery와
  archive allowlist를, Linux arm64는 DEB 동일 lifecycle을 통과해야 한다.
- Windows x64 build와 MSI·NSIS installer smoke를 기존 required gate로 유지한다.
- 같은 candidate와 성공 native run ID를 `alhangeul-linux-gui.yml`에 전달해
  package-only HWP/HWPX, Nautilus·Thunar first/cached/changed와 기존 제품 GUI를
  다시 수용한다.

Stage 6 결과: 최종 source/workflow candidate
`dbf09404e8b2e4fd07f510ddc60329e71a596643`의 native run
`33607431684`에서 Linux x64·arm64, Windows x64와 MSI·NSIS installer smoke
4개 job이 모두 통과했다. x64 DEB/RPM과 arm64 DEB는 실제 stale MIME cache,
명시적 복구, update/rollback/uninstall을 확인했고 DEB는
`update-mime-database` 없는 purge까지 성공했다. 같은 candidate와 native run을
입력한 GUI run `33610310800`도 package-only Nautilus·Thunar 실사용 문서와 기존
제품 GUI를 통과했다. 플랫폼 중립 검증은 대상 48 tests, automation 413 tests,
product boundary 332 files, upstream 36 tests, Studio 125 tests와 228-module build를
통과했다. 상세 진단 실행과 artifact ID·digest는
[`Stage 6 보고서`](../working/task_m010_50_stage6.md)에 기록한다.

### 커밋

```text
Task #50 [Stage 6.1]: Linux remove hook과 MIME lifecycle 보정
Task #50 [Stage 6.2]: Linux MIME 검증 근거 문서 정렬
Task #50 [Stage 6.3]: Linux CI lifecycle failure injection 보정
Task #50 [Stage 6.4]: Debian MIME trigger 복구 절차 보정
Task #50 Stage 6 + 최종 보고서: PR 리뷰 package evidence 재수용
```

## 검증

- 각 Stage는 위 검증을 통과한 뒤 단계 보고서를 작성한다. 검증 실패 상태를
  완료로 처리하거나 threshold·기대값을 근거 없이 완화하지 않는다.
- 단계 보고서에는 실행한 명령과 결과, 실행 host, exact SHA, evidence 및 아직
  입증하지 않은 조합을 구분한다. 모든 shell/workflow 변경에 해당 lint를 실행한다.
- 오늘할일은 작업일 보드의 #50 행만 갱신하고 이전 날짜·다른 task 행은 보존한다.
- 문서 위치나 기능 범위가 수행계획을 벗어나면 구현 전에 계획 보정 승인을 받는다.

## 커밋

- native candidate를 먼저 커밋할 수 있지만 Stage 종료 커밋에는 해당 Stage의
  `mydocs/working/task_m010_50_stage{N}.md`와 결과 보정을 함께 포함한다.
- 이번 구현계획 커밋은 `Task #50: 구현 계획서 작성과 오늘할일 갱신`으로 한다.
- 모든 Stage 완료 후 `task-final-report` 절차로 최종 보고서·완료 보드·Open PR을
  준비한다. 이 구현계획 승인은 자동 merge나 공개 release 승인이 아니다.

## 단계 의존성

- 구현계획 승인 뒤 Stage 1에 진입한다.
- Stage 2는 Stage 1 결과 승인, Stage 3은 Stage 2 결과 승인 뒤 진행한다.
- Stage 4는 MIME·core·path 세 변경이 검증된 상태에서 시작한다.
- Stage 5는 Stage 4 실제 설치·GUI evidence 승인 뒤 진행한다.
- 각 Stage 종료 시 다음 Stage 승인 요청을 남기며 승인 없이 넘어가지 않는다.

## 위험과 대응

- **Refresh 실패의 복구 한계**: post-install 실패와 pre-install 거부는 다른
  상태를 남길 수 있다. 자동 rollback 여부를 관측하고 수동 복구 canary와
  구분해 기록하며 package manager 보장을 과장하지 않는다.
- **기본 앱 조회 변화**: MIME alias 정규화나 `.desktop` 등록으로 resolver
  결과가 바뀔 수 있다. 기존 명시적 기본 앱 설정과 제3자 sentinel 보존을 검사하고
  단순 빈 조회값만으로 기본 앱 보존을 증명하지 않는다.
- **누락된 기대값**: source fixture 추가·삭제나 preview 보유 변경이 silent
  pass를 만들지 않도록 fixed hash manifest와 전체 edge/mode cardinality를 검증한다.
- **민감한 path 완화**: canonicalization이 모든 TOCTOU를 없애지는 않는다.
  기존 leaf·inode 방어를 보존하며 추가 보안 구조 변경이 필요하면 먼저 보고한다.
- **낙관적인 환경 표현**: core, private MIME canary, Ubuntu RPM transaction과
  실제 DEB GUI를 서로 대체하지 않고 지원 matrix에 각각 분리한다.

## 승인 요청 사항

- 위 6단계의 세부 산출물·검증·커밋과 candidate push/기존 수동 workflow 실행
- MIME helper·fixture·artifact verifier 보조 파일을 포함한 예상 변경 경로 보정
- fixture 기대값 matrix, record 완전성, 1,500 ms/256 MiB 경계와 실패 증적 보존
- Stage 4에서 실제 설치 문서 screenshot을 다시 제시하는 수용 기준
- 구현계획 승인 후 Stage 1부터 진행하며 각 단계 완료 후 승인을 받는 절차
