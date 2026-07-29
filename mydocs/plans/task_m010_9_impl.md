# Task #9 구현계획서 — v0.1.0 prerelease 후보 준비와 공개 배포 Go/No-Go 검증

수행계획서: [`task_m010_9.md`](task_m010_9.md)
GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | prerelease 계약과 수용 매트릭스 확정 | `task_m010_9_stage1.md` | signing·bundle·checksum·rollback·native 환경 결정 |
| 2 | 제품 metadata·공식 문서와 자동 검증 정렬 | metadata/checksum 도구·테스트, Tauri config, workflow·문서 | 실제 기능 설명, 결정적 checksum, 비배포 경계 |
| 3 | 플랫폼 중립 수용 검증과 exact-SHA candidate 생성 | exact-SHA CI/native run, artifact inventory·checksum | 전체 자동 검사, remote SHA, 다운로드 후 독립 검증 |
| 4 | Windows/Linux 설치·실행·rollback 검증 | `task_m010_9_stage4.md` | bundle별 native install·launch·핵심 시나리오·uninstall |
| 5 | Go/No-Go 판정과 후속 게시 입력 확정 | `task_m010_9_stage5.md`, release notes·후속 Issue 초안 | 모든 required gate 대조, 공개 작업 미실행 확인 |

## 문서 위치 확인

수행계획서의 공식 제품 문서와 task 증적 경계를 그대로 사용한다. 새 공식 release 문서와 `mydocs/manual` 문서는 만들지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 사용자 기능·공개 상태 | 저장소 루트 | `README.md` | OK | 실제 Release 전 비공개 상태와 다운로드 링크 금지 유지 |
| release 운영 계약 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | checksum, signing, candidate와 게시 경계 |
| 기여자 검증 명령 | `docs/` | `docs/DEVELOPMENT.md` | OK | 새 명령이 도입될 때만 수정 |
| package metadata | Tauri config | `apps/desktop/src-tauri/tauri.conf.json` | OK | 실제 bundle 설명과 file association |
| 단계 증적 | `mydocs/working/` | `mydocs/working/task_m010_9_stage*.md` | OK | 조사, run, hash와 native 시나리오 결과 |
| 최종 판단·release notes 초안 | `mydocs/report/` | `mydocs/report/task_m010_9_report.md` | OK | 후속 게시 Issue 입력이며 공개 Release 본문이 아님 |

## Stage 1 — prerelease 계약과 수용 매트릭스 확정

### 산출물

신규:

- `mydocs/working/task_m010_9_stage1.md`

### 변경 내용

- GitHub의 열린 M010, tag·Release 부재, `main`/`devel` 차이, Task #7 CI/native run과 artifact 만료 상태를 live 조회한다.
- root version, Tauri bundle config, README·DEVELOPMENT·DESKTOP_RELEASE와 `rhwp v0.8.2` known issue를 현재 근거로 고정한다.
- 다음 결정 필드를 수용 매트릭스에 기록한다.
  - 공개 등급: GitHub prerelease
  - 예정 version/tag: source `0.1.0`, 예정 immutable tag `v0.1.0`
  - checksum: release asset 전체를 정렬한 `SHA256SUMS`
  - Windows signing: `signed-required` 또는 `unsigned-prerelease-allowed`
  - candidate bundle: MSI, NSIS, AppImage, DEB, RPM과 Linux arm64 DEB의 포함 여부
  - print 경계: OS print dialog 또는 승인된 virtual printer
  - rollback: candidate 폐기, tag 불변, withdraw/supersede 또는 fix-forward
- bundle별 build 환경, native install 환경, 자동/수동 검증 책임, fixture와 필수 증적을 표로 고정한다.
- 실제 native 호환 환경이 없는 bundle은 다른 형식의 결과로 대체하지 않고 후보 제외 또는 No-Go 중 하나를 선택하도록 한다.
- 최초 보고서는 결정 필드를 `승인 대기`로 두고 추천안을 제시한다. 작업지시자 선택 뒤 같은 보고서에 승인값·승인일·Stage 2 제약을 반영한다.
- signed release가 필수인데 인증서·secret이 준비되지 않았으면 signing 인프라를 별도 Issue로 분리하고 Stage 2로 진행하지 않는다.

### 검증

```bash
gh release list --repo postmelee/alhangeul-tauri --limit 100
git ls-remote --tags origin
gh run view 30383886807 --repo postmelee/alhangeul-tauri --json headSha,status,conclusion,url
gh run view 30384403366 --repo postmelee/alhangeul-tauri --json headSha,status,conclusion,url
git rev-list --left-right --count origin/main...origin/devel
rg -n 'HWPX|sign|checksum|rollback|GitHub Release|updater|known issue' README.md apps/desktop/src-tauri/tauri.conf.json docs
git diff --check
```

- 최초 Stage 1 diff는 `mydocs/working/task_m010_9_stage1.md`만 포함한다.
- 선택 반영 commit은 같은 보고서의 결정 필드만 수정한다.

### 커밋

```text
Task #9 Stage 1: prerelease 계약과 수용 매트릭스 정리
Task #9 [Stage 1.1]: prerelease 후보 정책 승인 반영
```

## Stage 2 — 제품 metadata·공식 문서와 자동 검증 정렬

### 산출물

신규:

- `scripts/check-release-metadata.mjs`
- `scripts/create-release-checksums.mjs`
- `tests/release-metadata.test.mjs`
- `tests/release-checksums.test.mjs`

수정:

- `package.json`
- `apps/desktop/src-tauri/tauri.conf.json`
- `.github/workflows/ci.yml`
- `.github/workflows/alhangeul-desktop.yml`
- `tests/actions-workflows.test.mjs`
- `docs/DEVELOPMENT.md`
- `docs/operations/DESKTOP_RELEASE.md`

Stage 1에서 hosted runner install smoke를 승인하면 OS별 helper script를 역할별 300 LOC 미만 파일로 추가하고 이 구현계획서를 먼저 보정한다.

### 변경 내용

- Tauri long description을 HWP/HWPX 열기·편집, HWP 저장과 PDF 내보내기의 실제 기능 범위로 고친다.
- metadata checker는 dependency 없이 JSON을 구조적으로 읽고 product name/version/identifier, publisher, descriptions, category, file association·MIME, updater 비활성 경계를 검사한다.
- checker는 기본 repository root와 fixture용 `--root`를 지원하고 파일을 수정하지 않는다. 누락·오인 표현·구조 오류는 경로와 기대값을 포함해 실패한다.
- checksum 도구는 명시적 artifact root만 읽고 지원 installer를 상대 경로로 정렬해 표준 SHA-256 줄 형식으로 출력한다. inventory·임시 파일·중간 AppDir은 제외하며 empty/duplicate/unsupported 입력을 거부한다.
- `package.json`에 `check:release-metadata`, `create:release-checksums`를 추가하고 두 test를 `test:automation`에 연결한다.
- CI와 native workflow는 dependency 설치 뒤 build·upstream 검증 전에 release metadata checker를 실행한다.
- workflow는 계속 `workflow_dispatch`, `contents: read`, 14일 artifact와 비배포 경계를 유지하고 release action, secret과 write permission을 추가하지 않는다.
- DESKTOP_RELEASE에 Stage 1 계약, candidate와 tag artifact 재생성, checksum·signing·rollback 원칙을 기록한다. 성공 run이나 설치 결과는 선기록하지 않는다.
- DEVELOPMENT에는 새 read-only 검사와 candidate checksum 생성 명령만 추가한다.

### 검증

```bash
pnpm run check:release-metadata
pnpm run test:automation
git diff --exit-code origin/devel -- .github/workflows/pages.yml
git diff --check
```

- `tests/actions-workflows.test.mjs`는 새 gate 순서와 기존 trigger·permission·matrix·비배포 계약을 함께 확인한다.

### 커밋

```text
Task #9 Stage 2: prerelease metadata와 검증 자동화 정렬
```

## Stage 3 — 플랫폼 중립 수용 검증과 exact-SHA candidate 생성

### 산출물

repository 외부 상태:

- `publish/task9`
- exact-SHA `Alhangeul CI` run
- 같은 SHA의 Windows x64, Linux x64, Linux arm64 native run과 Actions artifact

신규:

- `mydocs/working/task_m010_9_stage3.md`

수정:

- `docs/operations/DESKTOP_RELEASE.md`

### 변경 내용

- 지원 범위 밖 현재 macOS host에서는 Windows/Linux desktop Rust·Tauri 성공을 주장하지 않고 플랫폼 중립 검사만 실행한다.
- Stage 2 승인 commit을 candidate exact SHA로 고정하고 Stage 3 별도 승인 뒤 `publish/task9`에 push한다.
- CI와 native workflow를 같은 exact SHA로 dispatch하고 run의 event, head branch, head SHA, jobs와 conclusion을 기록한다.
- artifact는 `mktemp -d`의 명시적 경로에 내려받아 platform inventory를 재계산하고 candidate `SHA256SUMS` 초안을 생성·재검증한다.
- artifact 검증 후 임시 경로만 정리하고 bundle을 저장소나 공개 다운로드 경로로 옮기지 않는다.
- source·workflow 실패는 Stage 3에서 임의 보정하지 않고 구현계획서 변경 승인을 요청한다.
- 성공 run, artifact ID·만료 시각, 파일명·크기·SHA-256을 DESKTOP_RELEASE와 Stage 보고서에 기록한다.
- candidate 이후 Stage 3 보고·운영 문서 commit이 추가되므로 이 artifact가 최종 tag artifact가 아님을 함께 기록한다.

### 검증

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git push origin HEAD:refs/heads/publish/task9
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task9
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri --ref publish/task9 -f build_ref=<candidate-sha> -f run_tests=true
gh run view <run-id> --repo postmelee/alhangeul-tauri --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download <native-run-id> --repo postmelee/alhangeul-tauri --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform <platform> --root <artifact-root> --verify-inventory <artifact-root>/alhangeul-artifact-inventory.json
pnpm run create:release-checksums -- --root <temporary-directory> --output <temporary-directory>/SHA256SUMS
git diff --check
```

### 커밋

```text
Task #9 Stage 3: exact-SHA prerelease candidate 검증
```

## Stage 4 — Windows/Linux 설치·실행·rollback 검증

### 산출물

신규:

- `mydocs/working/task_m010_9_stage4.md`

검증 실패 보정 외 repository 파일은 수정하지 않는다. 자동화나 product 보정이 필요하면 구현계획서를 먼저 갱신한다.

### 변경 내용

- Stage 1에서 승인된 native 환경과 Task #9 candidate artifact만 사용한다.
- Windows MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB 중 후보에 포함된 모든 형식을 각각 native package 환경에서 검증한다.
- clean install, launch/version, HWP/HWPX open·edit, HWP save/reopen, HWPX save block, PDF export, print 경계, file association, relaunch, uninstall과 rollback을 수행한다.
- 비민감 fixture만 사용하고 사용자 문서가 uninstall·rollback 과정에서 삭제되지 않는지 확인한다.
- 자동화할 수 없는 항목은 OS·architecture·package·exact SHA, 절차, 실제 관찰, 증적과 한계를 기록한다.
- 필수 시나리오 누락, 다른 package manager/architecture의 대체 결과와 환경 미확보는 성공으로 처리하지 않는다.
- 실패하면 candidate bundle 제외 또는 No-Go를 작업지시자에게 요청하고 Stage 4 보고서를 완료·commit하지 않는다.

### 검증

```text
Windows x64: MSI와 NSIS install → launch → document scenarios → association → uninstall
Linux x64: AppImage 실행, DEB Debian 계열 install, RPM RPM 계열 install → scenarios → uninstall
Linux arm64: arm64 Debian 계열 DEB install → launch → scenarios → uninstall
공통: package/version/candidate SHA, checksum, 결과와 증적 위치 대조
```

### 커밋

```text
Task #9 Stage 4: Windows Linux prerelease 설치 시나리오 검증
```

## Stage 5 — Go/No-Go 판정과 후속 게시 입력 확정

### 산출물

신규:

- `mydocs/working/task_m010_9_stage5.md`

수정:

- `docs/operations/DESKTOP_RELEASE.md`

### 변경 내용

- Issue #9 수용 기준과 Stage 1 matrix의 모든 required 항목을 자동·remote·native 증적에 대조한다.
- signed/unsigned 상태, 후보 asset·checksum, 지원 환경, 미지원 기능, upstream known issue와 검증 한계를 release notes 초안으로 정리한다.
- known issue는 pinned source의 동일 재현 조건·실패 지점이 확인된 경우만 분류하고 다른 실패는 No-Go로 둔다.
- Go이면 후속 “v0.1.0 prerelease 게시와 배포 후 검증” Issue의 배경·범위·수용·검증 초안을 작성한다. 이 Stage에서 Issue를 생성하지 않는다.
- 후속 Issue는 `devel → main` release PR, immutable tag, tag exact-SHA 새 build, GitHub prerelease 게시와 공개 후 재검증을 소유한다.
- No-Go이면 차단 조건, 필요한 별도 Issue와 재검증 진입 조건을 기록한다.
- GitHub Release, tag, main PR, signing secret, updater와 package repository가 생성되지 않았음을 최종 확인한다.

### 검증

```bash
gh release list --repo postmelee/alhangeul-tauri --limit 100
git ls-remote --tags origin
gh pr list --repo postmelee/alhangeul-tauri --base main --state open --json number,title,headRefName,baseRefName,url
pnpm run check:release-metadata
git diff --check
```

### 커밋

```text
Task #9 Stage 5: prerelease Go No-Go 판정과 게시 입력 확정
```

## 검증

- 각 Stage 명령과 승인된 native 시나리오는 단계 보고서 작성 전에 실행한다.
- 실패한 검증이나 누락된 required bundle은 단계 완료로 처리하지 않는다.
- planned path, workflow permission, bundle matrix 또는 signing 경계가 바뀌면 구현계획서를 먼저 갱신하고 승인을 받는다.
- 현재 macOS host에서 Windows/Linux native install 성공을 주장하지 않는다.
- tag·Release·main PR·secret과 package 게시가 생기면 Task #9 범위 위반으로 처리한다.

## 커밋

- 단계 source·문서와 `mydocs/working/task_m010_9_stage{N}.md`는 같은 단계 커밋으로 묶는다.
- Stage 1 정책 선택은 `Task #9 [Stage 1.1]: prerelease 후보 정책 승인 반영`으로 같은 보고서에 보존한다.

## 단계 의존성

- Stage 1 보고서 승인과 signing·bundle·print·rollback의 명시 선택이 Stage 2 선행 조건이다.
- Stage 2는 Stage 1.1 정책 기록 뒤에만 product metadata와 workflow를 변경한다.
- Stage 3은 Stage 2 보고 승인과 remote push·Actions 실행의 별도 승인을 받은 뒤 진행한다.
- Stage 4는 Stage 3 exact-SHA artifact 성공과 native 환경 확보 뒤 진행한다.
- Stage 5는 Stage 4의 모든 required 시나리오 승인 뒤 Go/No-Go를 판정한다.
- 각 Stage 완료보고서 승인 전 다음 Stage를 시작하지 않는다.

## 위험과 대응

- **Stage 1 환경 미확정**: 실제 native 환경이 없는 package는 제외 또는 No-Go 중 하나를 승인받고 임의 면제하지 않는다.
- **checksum 도구 범위 확장**: 명시적 root와 installer allowlist만 읽고 기존 파일을 암묵적으로 덮어쓰지 않는다.
- **workflow 권한 확대**: Task #9 workflow는 `contents: read`와 build artifact만 유지하며 Release API를 호출하지 않는다.
- **candidate SHA 이동**: run dispatch 뒤 `publish/task9`을 움직이지 않고 run head SHA를 먼저 확인한다.
- **GUI 검증 증적 부족**: 필수 시나리오는 수동이라도 환경·절차·관찰 결과를 남기며 미실행을 검증 한계로 낮추지 않는다.
- **파일 크기 증가**: 신규 script/test는 역할별 300 LOC 미만으로 분리하고 기존 300 LOC 초과 test 파일은 확대하지 않는다.

## 승인 요청 사항

- 위 5개 Stage의 산출물, 검증 명령, 승인 게이트와 커밋 메시지
- Stage 1 최초 보고와 정책 선택 반영을 Stage 1/1.1 두 commit으로 보존하는 방식
- Stage 2에서 metadata checker와 checksum 도구를 독립 script/test로 추가하고 CI/native build 전에 연결하는 범위
- Stage 3에서 승인 후 `publish/task9`을 remote canary ref로 사용하고 candidate artifact를 임시 경로에서만 검증하는 순서
- Stage 4의 native package별 필수 시나리오와 미실행 bundle을 후보 제외 또는 No-Go로 처리하는 규칙
- Stage 5는 후속 게시 Issue 초안만 만들고 Issue·release PR·tag·GitHub Release를 생성하지 않는 경계

승인되면 Stage 1 조사와 `task_m010_9_stage1.md` 작성만 시작한다. 이 구현계획서 승인만으로 unsigned prerelease, bundle 제외, remote push, Actions dispatch 또는 외부 공개가 승인된 것으로 간주하지 않는다.
