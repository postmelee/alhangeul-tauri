# Task #7 구현계획서 — 제품 버전 기준과 공개 프로젝트 상태 정렬

수행계획서: [`task_m010_7.md`](task_m010_7.md)
GitHub Issue: [#7](https://github.com/postmelee/alhangeul-tauri/issues/7)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 버전 계보 조사와 선택 승인 | `mydocs/working/task_m010_7_stage1.md` | 외부 계약 hard gate, provenance와 두 대안 비교 |
| 2 | 선택 버전 정렬과 자동 검증 | `check-product-version.mjs`, 회귀 테스트, 제품 version surface | 일치 성공, 개별 drift·구조 오류 거부 |
| 3 | CI 연결과 공개 문서 정렬 | Actions workflow, README와 공식 문서 | build 전 version gate, 현재 공개 상태와 역사 증적 보존 |
| 4 | 플랫폼 중립 수용 검증 | 통합 검증 기록과 reviewable commit | frozen install, version·boundary·pin·automation·Studio·Cargo |
| 5 | exact-SHA 원격 검증과 최종 경계 | CI run, 조건부 native inventory, 운영 문서 | remote SHA 일치, 조건부 Windows/Linux artifact 재검증 |

## 문서 위치 확인

수행계획서에서 승인된 공식 문서와 Issue 내부 승인 기록의 경계를 그대로 사용한다. 새 공식 version 문서는 만들지 않는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 버전 비교·선택 증적 | `mydocs/working/` | `mydocs/working/task_m010_7_stage1.md` | OK | Stage 1 추천과 작업지시자 선택을 함께 보존 |
| 현재 공개 상태 | 저장소 루트 | `README.md` | OK | Actions·native smoke·비배포 상태 |
| 제품 version 계보 | `docs/architecture/` | `docs/architecture/PROVENANCE.md` | OK | HOP 이력과 Alhangeul version 정책 관계 |
| version·release 운영 경계 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | Task #5 역사 증적과 Task #7 검증을 분리 |
| 기여자 검증 명령 | `docs/` | `docs/DEVELOPMENT.md` | OK | `check:product-version` 안내 |
| 단계·최종 보고 | `mydocs/` | `mydocs/working/task_m010_7_stage*.md`, `mydocs/report/task_m010_7_report.md` | OK | 공식 제품 문서와 작업 기록 분리 |

## Stage 1 — 버전 계보 조사와 선택 승인

### 산출물

신규:

- `mydocs/working/task_m010_7_stage1.md`

제품 코드와 공식 문서는 수정하지 않는다.

### 변경 내용

- root·desktop `package.json`, Cargo manifest·lock, Tauri config와 About Vite/UI 연결을 현재 제품 version surface inventory로 고정한다.
- `apps/studio-host/package.json`, vendored `rhwp`, dependency/tool version, test fixture와 Task #5 artifact 증적은 제품 version이 아닌 별도 책임으로 분류한다.
- Git 이력에서 HOP `0.1.x → 0.2.0 → 0.3.0 → 0.3.1`, 기준 commit과 Task #1의 제품명·Tauri identifier·updater 분리를 확인한다.
- Alhangeul repository의 GitHub Release, remote tag, updater endpoint, package repository, 공식 다운로드 안내와 지원 설치 기반 계약을 확인한다. 확인할 수 없는 실제 개인 설치 여부를 “없음”으로 단정하지 않고 공식 지원 계약과 분리한다.
- 수행계획서 순서대로 외부 계약, 지원 설치 기반·downgrade, 제품 계보, M010 정합성, Task #5 증적 보존과 향후 SemVer를 표로 기록한다.
- 각 증거의 출처, 확인 결과, 미확인 한계, 두 선택지에 미치는 영향과 추천안을 Stage 1 보고서에 작성한다.
- 최초 Stage 1 보고서의 `작업지시자 선택`은 `승인 대기`로 둔다. 작업지시자가 `0.1.0 재시작` 또는 `0.3.1 계승`을 명시하면 같은 보고서에 선택값, 승인일과 다음 Stage 제약을 반영하고 Stage 1.1 커밋으로 보존한다.
- 선택이 모호하거나 외부 계약 hard gate가 해소되지 않으면 Stage 2로 진행하지 않는다.

### 검증

```bash
git log --all --date=short --format='%h %ad %s' -- package.json apps/desktop/package.json apps/desktop/src-tauri/Cargo.toml apps/desktop/src-tauri/tauri.conf.json
git show bbd6bf69db05f275d714e7c61cef58b662809c6a:package.json
gh release list --repo postmelee/alhangeul-tauri --limit 100
git ls-remote --tags origin
rg -n '0\.1\.0|0\.3\.1|version|updater|releases/latest|package repository' README.md package.json apps docs scripts tests mydocs/report/task_m010_1_report.md
git diff --name-only
git diff --check
```

- 최초 Stage 1 commit 전 diff는 `mydocs/working/task_m010_7_stage1.md`만 포함해야 한다.
- Stage 1.1은 같은 보고서의 선택 승인 필드만 변경해야 한다.

### 커밋

```text
Task #7 Stage 1: 제품 버전 판단 근거 정리
Task #7 [Stage 1.1]: 제품 버전 선택 승인 반영
```

## Stage 2 — 선택 버전 정렬과 자동 검증

### 산출물

신규:

- `scripts/check-product-version.mjs`
- `tests/product-version.test.mjs`

수정:

- `package.json`
- `apps/desktop/package.json`, `apps/desktop/src-tauri/Cargo.toml`, `tauri.conf.json`, `Cargo.lock` — `0.1.0` 선택 시

### 변경 내용

- root `package.json`의 `version`을 제품 version 진실 원천으로 사용한다.
- `0.1.0 재시작`이 승인되면 allowlist의 다섯 surface만 `0.1.0`으로 맞춘다. Cargo lock은 Cargo metadata로 갱신하고 생성 결과에서 `alhangeul-desktop` entry만 바뀌었는지 확인한다.
- `0.3.1 계승`이 승인되면 기존 제품 version 값은 바꾸지 않고 verifier만 도입한다.
- dependency를 추가하지 않는 Node.js ESM verifier를 만들고 기본 repository root와 fixture용 `--root <path>`를 지원한다.
- JSON 세 파일은 `JSON.parse`로 읽고, Cargo manifest의 첫 `[package]`와 Cargo lock의 `[[package]] name = "alhangeul-desktop"` 단일 entry를 구조적으로 찾는다.
- root version은 strict SemVer인지 검사하고 나머지 네 값과 exact match를 요구한다. 필드 누락, parse 실패, Cargo package 누락·중복, unknown option과 값 불일치는 경로·expected·actual을 포함한 오류로 실패한다.
- verifier는 stdout/stderr 외 파일을 수정하지 않는다.
- `package.json`에 다음을 추가한다.
  - `check:product-version`: `node scripts/check-product-version.mjs`
  - `test:automation` 대상에 `tests/product-version.test.mjs`
- fixture test는 정상 일치, 네 비교 surface의 개별 drift, invalid SemVer, 필드 누락, Cargo lock entry 누락·중복과 CLI 오류를 검증한다.
- 기존 `tests/rhwp-baseline.test.mjs`의 About version 주입 계약으로 Tauri value와 `rhwp` version 분리를 재검증한다. 이 계약이 이미 충분하므로 예상 수정 파일에는 포함하지 않는다.

### 검증

```bash
node --test tests/product-version.test.mjs
pnpm run check:product-version
pnpm run test:automation
pnpm run test:upstream
cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps
git diff --check
```

### 커밋

```text
Task #7 Stage 2: 제품 버전 정렬과 자동 검증 도입
```

## Stage 3 — CI 연결과 공개 문서 정렬

### 산출물

수정:

- `.github/workflows/ci.yml`, `.github/workflows/alhangeul-desktop.yml`
- `tests/actions-workflows.test.mjs`
- `README.md`
- `docs/DEVELOPMENT.md`, `docs/architecture/PROVENANCE.md`, `docs/operations/DESKTOP_RELEASE.md`

### 변경 내용

- 두 대상 workflow에서 dependency 설치 뒤, build와 `rhwp` 검증 전에 `pnpm run check:product-version`을 실행한다.
- workflow 정적 test는 새 gate의 존재와 build 이전 순서를 검사한다. `workflow_dispatch`, `contents: read`, exact Windows/Linux matrix와 비배포 경계는 유지한다.
- README의 Actions 비활성·native 미검증 문구를 수동 CI와 Windows/Linux native artifact smoke 성공 상태로 고친다. Actions artifact가 공식 release나 지원 설치 파일이 아님을 같은 문맥에 둔다.
- DEVELOPMENT의 모든 호스트 기본 검증 목록에 `check:product-version`을 추가한다.
- PROVENANCE에는 승인 결과에 따라 HOP `0.3.1`을 출처 이력으로 두고 Alhangeul SemVer를 `0.1.0`부터 시작하거나, code/version 계보만 잇고 소유권·identifier·release channel은 독립이라는 해석을 기록한다.
- DESKTOP_RELEASE에는 선택한 제품 version, M010 `v0.1.0` 설명과의 관계, version verifier와 공식 release 부재를 기록한다.
- Task #5의 `0.3.1` canary run, artifact 파일명·크기·checksum과 `mydocs` 보고서는 수정하지 않는다. Stage 5 증적 위치만 미리 만들거나 성공을 선기록하지 않는다.
- `.github/workflows/pages.yml`은 수정하지 않는다.

### 검증

```bash
pnpm run check:product-version
pnpm run test:automation
pnpm run check:product-boundary
git diff --exit-code origin/devel -- .github/workflows/pages.yml
git diff --exit-code origin/devel -- mydocs/report/task_m010_5_report.md mydocs/working/task_m010_5_stage1.md mydocs/working/task_m010_5_stage2.md mydocs/working/task_m010_5_stage3.md mydocs/working/task_m010_5_stage4.md mydocs/working/task_m010_5_stage5.md
rg -n '0\.3\.1|30357007192|30357240402|bfab2269|f0b84183' docs/operations/DESKTOP_RELEASE.md
git diff --check
```

### 커밋

```text
Task #7 Stage 3: 버전 검증 CI와 공개 상태 문서 정렬
```

## Stage 4 — 플랫폼 중립 수용 검증

### 산출물

신규:

- `mydocs/working/task_m010_7_stage4.md`

검증 실패 보정 외 제품 파일 수정은 허용하지 않는다. 보정이 Stage 1~3 승인 범위를 넘으면 구현계획서를 갱신하고 승인을 다시 받는다.

### 변경 내용

- Stage 1 선택이 version surface, verifier, workflow와 공식 문서에 같은 의미로 반영됐는지 교차 확인한다.
- 지원 대상 밖 현재 host에서는 Windows/Linux native Rust test·Clippy와 Tauri build 성공을 주장하지 않고 Stage 5 Actions로 넘긴다.
- 전체 플랫폼 중립 검증을 통과한 commit을 remote canary 입력으로 확정한다.
- Stage 4 보고서에 명령별 결과, 기존 warning, 검증 한계, canary SHA와 Stage 5 조건을 기록한다.

### 검증

```bash
pnpm install --frozen-lockfile
pnpm run check:product-version
pnpm run check:product-boundary
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
git diff --exit-code origin/devel -- .github/workflows/pages.yml
git diff --check
```

### 커밋

```text
Task #7 Stage 4: 플랫폼 중립 수용 검증 완료
```

## Stage 5 — exact-SHA 원격 검증과 최종 경계 확정

### 산출물

repository 외부 상태:

- `publish/task7`, exact-SHA `Alhangeul CI` run
- `0.1.0 재시작` 선택 시 exact-SHA native run과 platform artifact 세 개

수정:

- `docs/operations/DESKTOP_RELEASE.md`

신규:

- `mydocs/working/task_m010_7_stage5.md`

### 변경 내용

- Stage 5 별도 승인 후 clean Stage 4 head를 `publish/task7`에 push한다. remote `local/task7`은 만들지 않는다.
- remote SHA가 local canary SHA와 같을 때 `ci.yml`을 `publish/task7` ref에서 dispatch한다. run의 event, head branch, head SHA, 생성 시각과 conclusion을 확인하고 log에서 `check:product-version` 성공을 기록한다.
- `0.1.0 재시작`을 선택한 경우에만 같은 SHA로 `alhangeul-desktop.yml`을 `run_tests=true`와 함께 dispatch한다.
  - Windows x64 MSI·NSIS, Linux x64 DEB·RPM·AppImage, Linux arm64 DEB를 요구한다.
- native artifact 세 개는 `mktemp -d`가 만든 명시적 임시 경로에 내려받고 동봉 inventory를 `check:desktop-artifacts --verify-inventory`로 재계산한다. 검증 후 그 임시 경로만 정리한다.
- `0.3.1 계승`이면 version 값이 바뀌지 않았으므로 native packaging을 반복하지 않는다. Task #5 exact-SHA native 증적은 그대로 보존하고 새 CI에서 version gate만 검증한다.
- CI/native failure는 failed job log를 먼저 분석한다. 제품·workflow 보정이 필요하면 Stage 5 안에서 임의 수정하지 않고 구현계획서 변경 승인을 요청한다.
- DESKTOP_RELEASE에 Task #7 CI run과 선택 결과를 기록한다. 재시작이면 새 `0.1.0` artifact 이름·크기·checksum을 Task #5 표와 분리된 새 절에 추가한다.
- canary 성공 뒤에는 run 대상 source/workflow를 바꾸지 않는다. Stage 5 보고서와 운영 증적 문서만 commit한다.

### 검증

```bash
gh auth status
git status --short
git push origin HEAD:refs/heads/publish/task7
git ls-remote --heads origin refs/heads/publish/task7
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task7
gh run view <ci-run-id> --repo postmelee/alhangeul-tauri --json event,headBranch,headSha,status,conclusion,url,jobs
```

`0.1.0 재시작`일 때만 추가한다.

```bash
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri --ref publish/task7 -f build_ref=<canary-sha> -f run_tests=true
gh run view <native-run-id> --repo postmelee/alhangeul-tauri --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download <native-run-id> --repo postmelee/alhangeul-tauri --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform <platform> --root <artifact-root> --verify-inventory <artifact-root>/alhangeul-artifact-inventory.json
```

마지막으로 공통 확인한다.

```bash
gh release list --repo postmelee/alhangeul-tauri --limit 100
git ls-remote --tags origin
git diff --exit-code <canary-sha> -- package.json apps/desktop apps/studio-host scripts tests .github/workflows
git diff --check
```

### 커밋

```text
Task #7 Stage 5: exact-SHA 제품 버전 경계 검증
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- 계획 변경이 필요하면 구현계획서를 먼저 갱신하고 작업지시자 승인을 받는다.
- Task #5 증적·Pages·금지 범위 변경은 성공으로 간주하지 않으며, Windows/Linux native 성공은 Stage 5 hosted runner로만 판정한다.

## 커밋

- 단계 커밋은 단계 산출물과 `mydocs/working/task_m010_7_stage{N}.md`를 함께 묶는다.
- Stage 1 선택 승인은 같은 보고서만 수정하는 `Task #7 [Stage 1.1]: 제품 버전 선택 승인 반영`으로 보존하고, 모든 커밋 뒤 status·log·diff check를 확인한다.

## 단계 의존성

- Stage 1 조사 보고 승인과 명시적 version 선택이 Stage 2의 선행 조건이다.
- Stage 2는 Stage 1.1 선택 승인 기록 뒤에만 제품 surface를 변경한다.
- Stage 3은 Stage 2 검증과 보고서 승인 뒤 진행한다.
- Stage 4는 Stage 3 검증과 보고서 승인 뒤 통합 검증만 수행한다.
- Stage 5는 Stage 4 승인 뒤 remote push·hosted runner 사용을 별도 승인받아 수행한다.
- 각 Stage 완료보고서 승인 전 다음 Stage를 시작하지 않는다.

## 위험과 대응

- **승인과 문서 기록의 시차**: Stage 1 보고서 승인 시 선택값을 Stage 1.1 commit으로 즉시 반영하고 그 commit 전에는 제품 파일을 바꾸지 않는다.
- **지원 설치 기반 오판**: 공식 계약과 확인할 수 없는 개인 설치를 구분하고, hard gate 근거가 부족하면 version을 유지한 채 범위를 재승인받는다.
- **역사 증적 손상**: 제품 surface allowlist만 변경하고 Task #5 보고서·artifact inventory는 immutable evidence로 검증한다.
- **Cargo lock 과잉 변경**: `0.1.0` 선택 시 offline metadata로 갱신한 뒤 `alhangeul-desktop` version 외 dependency graph 변경이 없는지 확인한다.
- **remote canary 순서 예외**: Stage 5 승인 뒤 `publish/task7`만 push하고 최종 PR도 같은 branch를 사용한다.
- **검증과 배포 혼동**: Actions artifact는 task 증적으로만 사용하고 Release, tag, signing, updater와 다운로드 채널은 만들지 않는다.

## 승인 요청 사항

- Stage 1 보고서의 추천과 작업지시자 선택을 Stage 1.1 commit으로 기록한 뒤에만 제품 변경을 시작하는 승인 게이트
- root `package.json` 기준 read-only verifier, fixture CLI와 비교 surface의 구체화
- 선택값에 따라 Stage 2의 version 변경 파일과 Stage 5 native matrix 실행 여부를 조건부로 고정하는 방향
- README, PROVENANCE, DEVELOPMENT, DESKTOP_RELEASE의 Stage별 수정 범위와 Task #5 증적 보존 검증
- Stage 5에서 `publish/task7`을 PR 전 canary ref로 사용하고 모든 선택은 remote CI, version 변경 시에만 native matrix를 실행하는 절차
- 위 Stage별 산출물, 검증 명령과 커밋 메시지
