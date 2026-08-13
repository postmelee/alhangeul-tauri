# Task #24 구현계획서 — rhwp v0.8.4 core·전체 Studio bundle 동일 release 갱신

수행계획서: [`task_m010_24.md`](task_m010_24.md)
GitHub Issue: [#24](https://github.com/postmelee/alhangeul-tauri/issues/24)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | candidate 채택과 provenance·source diff 감사 | exact bot commit merge, diff 분류, Stage 1 보고 | parent·allowlist·tag·pin 정합성 |
| 2 | adapter 호환성과 플랫폼 중립 수용 | 호환성 판정, 필요한 최소 adapter/test 보정 | 기본 gate, desktop Rust·Clippy |
| 3 | exact-SHA CI와 native artifact 생성 | CI/native runs, artifact inventory·checksum | 세 native matrix와 Windows package smoke |
| 4 | Windows x64 native·GUI 수용 | MSI·NSIS 및 대표 문서 GUI 증적 | 저장·PDF·인쇄·toolbar·drag-in |
| 5 | Linux native·GUI 수용과 공식 증적 | Linux x64 GUI, arm64 한계, 공식 운영 문서 | bundle·PDF·인쇄·문서 정합성 |
| 6 | 최종 gate와 candidate handoff 종료 | final CI, path audit, 최종 보고·Task PR | 실행 가능 SHA 계승·전체 경계 확인 |

각 Stage가 끝나면 `task-stage-report` 절차로 `mydocs/working/task_m010_24_stage{N}.md`를 작성하고 해당 Stage 산출물과 함께 커밋한다. 검증 실패나 수행계획서 밖 변경이 필요하면 보고서·커밋을 만들지 않고 같은 Stage에서 원인을 분석한 뒤 계획 보정 승인을 요청한다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 제품 진입 pin | 저장소 루트 | `README.md` | OK | candidate가 v0.8.4로 원자 갱신 |
| 개발·재현 절차 | `docs/` | `docs/DEVELOPMENT.md` | OK | candidate 갱신 후 실제 검증과 대조 |
| upstream 소유 경계 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | Stage 5에서 최종 pin·수용 경계 확정 |
| desktop release 증적 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | Stage 5에서 새 exact-SHA 결과 추가 |
| 단계 증적 | `mydocs/working/` | `mydocs/working/task_m010_24_stage{1..6}.md` | OK | 실행 결과와 승인 handoff |
| 최종 보고 | `mydocs/report/` | `mydocs/report/task_m010_24_report.md` | OK | Stage 6 뒤 `task-final-report` 적용 |

새 공식 문서나 `mydocs/manual` 문서는 만들지 않는다. candidate allowlist 밖 공식 문서가 필요하면 먼저 수행계획서를 보정한다.

## 공통 실행 계약

- `origin/devel` 기준 commit은 `070eefa0828a907849ce4a059e57bca026c91221`, immutable candidate는 `b3712714f6733aa75ff50dd346b89850136b5458`, upstream target은 `v0.8.4` / `496333b27d21ddb9114ba9ae340bcb895870c9a7`로 고정한다.
- PR #32 branch를 checkout해 수정하거나 push하지 않는다. candidate commit은 `local/task24`의 merge parent로 한 번만 연결하고 원본 bot author·SHA를 보존한다.
- `third_party/rhwp`는 읽기 전용이며 source를 직접 수정하지 않는다. 필요 보정은 Alhangeul의 기존 Tauri leaf adapter와 그 test에만 둔다.
- 현재 macOS host에서는 platform-neutral 분석·test/build만 수행한다. desktop Rust·Tauri bundle·GUI 성공은 Windows/Linux 또는 지정된 Ubuntu Actions에서만 판정한다.
- 원격 workflow는 Stage 3 승인을 받은 뒤 `publish/task24` canary ref에서만 실행한다. release/tag, GitHub Release, 서명, package 게시와 updater는 실행하지 않는다.
- Stage 3 native SHA 뒤 실행 코드·workflow·generated artifact가 바뀌면 CI와 native matrix를 새 exact SHA에서 다시 실행한다. Stage 보고·공식 증적 문서만 바뀌면 path audit으로 실행 가능 SHA 계승을 입증한다.
- 임시 artifact는 `mktemp -d`의 명시 경로에만 내려받고 inventory 재검증 뒤 그 임시 경로만 정리한다. artifact를 release asset이나 영구 다운로드 경로로 옮기지 않는다.

## Stage 1 — candidate 채택과 provenance·source diff 감사

### 산출물

수정 또는 채택:

- PR #32의 13개 allowlist 경로
- `mydocs/working/task_m010_24_stage1.md`

### 사전 불변성 확인

- PR #32가 open draft이며 head branch와 exact SHA가 계획값과 같은지 GitHub에서 확인한다.
- candidate parent가 task-start 기준 `origin/devel`이고, commit 수가 1개이며, changed path가 수행계획서의 13개 목록과 정확히 같은지 확인한다.
- 실제 sync·exact-SHA CI·멱등성 run이 success이고 writer가 `false`인지 read-back한다.
- 위 항목이 하나라도 달라졌으면 merge하지 않고 candidate drift를 보고한다.

### 채택과 분석

- `git merge --no-ff --no-commit b3712714...`로 candidate를 index·working tree에 가져온다. merge conflict가 발생하면 자동 해결하지 않고 중단한다.
- `git submodule update --init --recursive`로 v0.8.4 source working tree를 맞춘다.
- old/new commit diff를 Rust core, `rhwp-studio`, build/packaging, public WASM/native surface, release note·known issue로 분류한다.
- local adapter가 import·호출하는 symbol과 upstream에서 바뀐 symbol의 교집합을 기록한다. 자동 생성 JS·WASM은 수동 내용 비교보다 source commit·tool version·hash·pin verifier를 진실 원천으로 사용한다.
- Stage 1 보고서에 source diff 요약, adapter 영향 후보, known issue 승계 여부, Stage 2 집중 검증 목록을 기록하고 merge commit에 함께 넣는다.

### 검증

```bash
git rev-parse origin/devel \
  origin/automation/rhwp-v0.8.4-full-sync^ \
  origin/automation/rhwp-v0.8.4-full-sync
git diff --name-status \
  origin/devel...b3712714f6733aa75ff50dd346b89850136b5458
pnpm run fetch:rhwp-pin-tag
git -C third_party/rhwp rev-parse 'v0.8.4^{commit}' HEAD
git -C third_party/rhwp diff --stat \
  9b16aa9e23f476e2b335d7c029fc9f24a199d63c..496333b27d21ddb9114ba9ae340bcb895870c9a7
pnpm run check:rhwp-pin
pnpm run check:product-boundary
git diff --check
```

### 커밋

```text
Task #24 Stage 1: v0.8.4 candidate와 provenance 확정
```

이 커밋은 candidate 원본 commit을 두 번째 parent로 갖는 merge commit이며 Stage 1 보고서를 포함한다.

## Stage 2 — adapter 호환성과 플랫폼 중립 수용

### 산출물

조건부 수정:

- `apps/desktop/src-tauri/src/`
- `apps/studio-host/src/`
- `apps/studio-host/alhangeul-overrides.ts`
- 관련 `tests/`와 `*.test.ts`
- `mydocs/working/task_m010_24_stage2.md`

회귀가 없으면 제품 코드를 억지로 수정하지 않고 호환성 판정과 검증 증적만 Stage 보고서에 남긴다.

### 변경 내용

- Stage 1 영향 목록을 native document session, HWP/HWPX exporter, page SVG·searchable PDF, hidden system print surface, toolbar command, font/window adapter별로 기존 focused test와 대조한다.
- exact upstream entry, shadow copy 0개, 허용 alias 12개, adapter 300 LOC 상한과 Tauri 고유 override disposition을 재확인한다.
- compile·test 또는 source 계약으로 재현되는 adapter 회귀만 기존 허용 경로에서 최소 보정한다. public upstream API를 local에서 복제하거나 source를 backport하지 않는다.
- upstream 자체의 새 known issue 또는 엔진/renderer 결함이면 재현 조건·실패 지점을 기록하고 Alhangeul adapter 보정으로 위장하지 않는다.
- API 의미 변경, 새 adapter owner, 13개 candidate 경로 재생성이 필요하면 Stage 2를 멈추고 구현계획서 보정 승인을 받는다.

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
git diff --check
```

desktop Rust 검증은 candidate exact-SHA CI [31680791369](https://github.com/postmelee/alhangeul-tauri/actions/runs/31680791369)의 성공을 사전 근거로 사용하되, Stage 2 최종 실행 가능 commit은 Stage 3에서 새 CI로 다시 검증한다.

### 커밋

```text
Task #24 Stage 2: v0.8.4 adapter 호환성과 중립 gate 확정
```

## Stage 3 — exact-SHA CI와 native artifact 생성

### 산출물

- `publish/task24` canary ref
- exact-SHA `Alhangeul CI` run
- 같은 build SHA의 `Alhangeul Desktop Artifact Build` run
- Windows x64, Linux x64, Linux arm64 bundle과 Windows installer smoke diagnostic artifact
- 독립 inventory·checksum 결과
- `mydocs/working/task_m010_24_stage3.md`

### 원격 실행 순서

1. Stage 2 보고서 commit까지 포함한 clean `local/task24`를 새 `publish/task24`로 non-force push한다.
2. 해당 ref에서 `ci.yml`을 dispatch하고 run의 `headSha`가 canary SHA와 같은지 확인한다.
3. CI가 성공한 뒤 `alhangeul-desktop.yml`을 같은 ref에서 `build_ref=<40자리 canary SHA>`, `run_tests=true`로 dispatch한다.
4. Windows x64, Linux x64, Linux arm64 build와 Windows installer smoke가 모두 success인지 확인한다.
5. 네 Actions artifact를 임시 경로에 내려받고 bundle inventory, 크기, SHA-256, archive metadata를 독립 검증한다.
6. artifact ID·만료 시각·run URL·job ID·canary SHA와 필수 installer 목록을 Stage 보고서에 기록한다.

### 검증

```bash
gh workflow run ci.yml \
  --repo postmelee/alhangeul-tauri \
  --ref publish/task24
gh run view <ci-run-id> \
  --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
gh workflow run alhangeul-desktop.yml \
  --repo postmelee/alhangeul-tauri \
  --ref publish/task24 \
  -f build_ref=<40자리-canary-sha> \
  -f run_tests=true
gh run view <native-run-id> \
  --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
pnpm run check:desktop-artifacts -- \
  --platform <windows-x64|linux-x64|linux-arm64> \
  --root <artifact-root> \
  --verify-inventory <artifact-root>/alhangeul-artifact-inventory.json
git diff --check
```

CI 또는 native job 실패 시 artifact가 일부 생성됐더라도 Stage 성공으로 처리하지 않는다. 실패한 platform log를 먼저 분석하고 제품 보정이 필요하면 Stage 2 범위와 계획 변경 여부를 판단한다.

### 커밋

```text
Task #24 Stage 3: v0.8.4 exact-SHA native artifact 확정
```

## Stage 4 — Windows x64 native·GUI 수용

### 산출물

- Stage 3 Windows MSI·NSIS의 실제 환경 검증 기록
- 대표 HWP/HWPX·PDF·system print 결과
- `mydocs/working/task_m010_24_stage4.md`

### 검증 시나리오

- MSI와 NSIS를 각각 clean install → 앱 제한 실행 → uninstall 순서로 검증하며 installer 간 잔존 상태를 분리한다.
- HWP와 HWPX를 파일 선택·drag-in으로 열고 최초 문서 중앙 정렬, toolbar 초기 상태와 한글 dialog 표시를 확인한다.
- 현재 형식 저장과 HWP/HWPX 다른 이름 저장 뒤 재열기·문서 상태·recent 경계를 확인한다.
- `PDF로 저장` 결과가 예상 쪽 수이며 한글 검색·선택·복사가 가능한지 확인한다.
- `인쇄`가 별도 Alhangeul preview 없이 system dialog로 들어가고 문서 쪽 수·방향·본문을 표시하는지 확인한다. Microsoft Print to PDF 저장·취소·반복 뒤 editor 복원과 상태 lifecycle을 확인한다.
- 자동 Windows installer smoke의 canonical association, shortcut, 기존 기본 연결 보존과 uninstall cleanup 결과를 수동 관찰과 대조한다.

### 판정

- 앱 crash, HWP/HWPX 손상, 빈 PDF/인쇄, 문서 대신 editor chrome 출력, modal 종료 뒤 복원 실패는 No-Go다.
- Microsoft Print to PDF의 기본 파일명 자동 입력처럼 Task #15에서 OS 소유 제약으로 확정한 항목은 회귀가 아니며, 앱이 소유하는 `PDF로 저장` UX와 혼동하지 않는다.
- 환경 정책으로 특정 physical printer를 사용할 수 없으면 Microsoft Print to PDF와 system preview까지 검증하고 한계를 기록한다.
- 이번 Task의 Windows VDI처럼 관리자 권한이 없어 MSI 수동 설치를 실행할 수 없으면, 같은 exact SHA의 Stage 3 MSI clean install·제한 실행·association·uninstall 자동 smoke와 NSIS 전체 GUI 수동 수용을 결합해 판정할 수 있다. 이 경우 MSI 수동 GUI를 통과했다고 표현하지 않고 환경과 미실행 범위를 Stage 보고서에 명시한다.

### 검증

```text
Stage 3 Windows artifact SHA-256 대조
MSI 설치·GUI smoke·제거
NSIS 설치·GUI smoke·제거
대표 HWP/HWPX 저장·PDF·인쇄 결과와 화면 증적 확인
```

### 커밋

```text
Task #24 Stage 4: Windows x64 v0.8.4 GUI 수용 확정
```

## Stage 5 — Linux native·GUI 수용과 공식 증적

### 산출물

수정:

- `docs/architecture/UPSTREAM.md`
- `docs/operations/DESKTOP_RELEASE.md`

신규:

- `mydocs/working/task_m010_24_stage5.md`

### Linux 수용

- Linux x64 검증 환경·WebKitGTK·GTK·배포판 version을 기록하고 Stage 3 DEB/RPM/AppImage 중 실제 사용 bundle과 SHA-256을 명시한다.
- 앱 실행, 파일 선택·drag-in, HWP/HWPX 저장·재열기, searchable PDF와 toolbar/dialog 한글 표시를 Windows와 같은 대표 문서로 확인한다.
- system print dialog 직접 진입, 전체 페이지·방향·한글, 저장·취소 뒤 재인쇄를 확인한다. Task #15의 동일 크기 page context 보정이 v0.8.4 전체 Studio에서도 유지되는지 집중 검증한다.
- Linux arm64는 hosted runner bundle, inventory와 checksum만 수용한다. 실제 arm64 GUI를 실행하지 않았다면 명시적 한계로 남긴다.

### 공식 문서 보정

- `UPSTREAM.md`의 current pin, 재현 명령과 known issue 분류가 실제 v0.8.4 결과와 맞는지 확정한다. candidate가 자동 치환하지 않은 v0.8.2 known issue 기록은 재현 근거 없이 v0.8.4로 바꾸지 않는다.
- `DESKTOP_RELEASE.md`에 실행 가능 canary SHA, CI/native run, artifact ID·inventory·checksum, Windows/Linux GUI 결과와 Linux arm64 한계를 별도 v0.8.4 절로 기록한다.
- 과거 Task #5·#7·#11·#13·#15 증적은 수정하거나 새 candidate의 근거로 재사용하지 않는다.

### 검증

```bash
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
rg -n 'v0\.8\.4|496333b27d21ddb9114ba9ae340bcb895870c9a7|<canary-sha>|<run-id>' \
  README.md docs/DEVELOPMENT.md docs/architecture/UPSTREAM.md \
  docs/operations/DESKTOP_RELEASE.md rhwp-core.lock
git diff --check
```

### 커밋

```text
Task #24 Stage 5: Linux 수용과 v0.8.4 운영 증적 확정
```

## Stage 6 — 최종 gate와 candidate handoff 종료

### 산출물

- final `publish/task24` ref와 플랫폼 중립 CI
- 실행 가능 native SHA 이후 path audit
- `mydocs/working/task_m010_24_stage6.md`
- 이후 `task-final-report`가 만드는 `mydocs/report/task_m010_24_report.md`와 Task #24 PR

### 변경 내용

- Stage 5까지 branch를 non-force fast-forward push하고 final head의 CI를 실행한다.
- Stage 3 native accepted SHA 이후 변경 경로를 감사한다. Stage 보고서와 승인된 official evidence 문서만 바뀌었으면 기존 native 결과를 계승하고, 실행 코드·workflow·generated artifact가 포함되면 새 SHA로 native matrix를 다시 실행한다.
- core/source/WASM/Studio의 단일 release, adapter 소유 경계, Windows/Linux 수용, arm64 한계와 배포 제외 항목을 최종 대조한다.
- `task-final-report`로 최종 보고와 `devel` 대상 Open PR을 게시한다. PR 본문은 PR #32 immutable input과 superseded 관계를 설명하고 `Refs #24`를 사용한다.
- PR #32는 이 Stage에서 직접 merge·close하지 않는다. Task #24 PR 게시 뒤 처리 승인을 받거나 Task #24 merge 확인 후 정리한다.

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
git diff <native-accepted-sha>..HEAD --name-only
git diff --check
git status --short
```

final remote CI의 `headSha`는 Stage 5 head와 같아야 한다. Stage 6 보고서·최종 보고서처럼 실행에 영향을 주지 않는 후속 task 문서 commit은 native 재실행 사유가 아니며 PR 전 clean status와 path audit으로 구분한다.

### 커밋

```text
Task #24 Stage 6: v0.8.4 최종 수용 경계 확정
```

최종 보고 커밋과 PR 게시 메시지는 `task-final-report` 절차를 따른다.

## 검증

- 각 Stage 검증은 단계 보고서 작성 전에 통과해야 한다.
- native 또는 수동 GUI 실패는 성공으로 완화하지 않고 해당 platform No-Go로 기록한다.
- source commit, generated artifact, run head SHA와 다운로드 inventory가 하나의 실행 가능 SHA로 연결돼야 한다.
- 실제 실행하지 않은 Linux arm64 GUI, physical printer, release·서명·업dater 검증을 완료로 표시하지 않는다.
- 문서 위치나 제품 수정 경계가 수행계획서와 달라지면 구현 전에 계획 변경 승인을 받는다.

## 커밋

- Stage source·증적과 `mydocs/working/task_m010_24_stage{N}.md`는 하나의 Stage commit에 묶는다.
- candidate 원본 `b3712714...`는 Stage 1 merge commit의 parent로 보존한다.
- remote canary는 non-force push만 사용하고 `publish/task24` 외 branch를 수정하지 않는다.

## 단계 의존성

- Stage 1은 이 구현계획 승인 뒤에만 candidate를 통합한다.
- Stage 2는 Stage 1 source diff·영향 목록과 보고서 승인을 입력으로 사용한다.
- Stage 3은 Stage 2 플랫폼 중립 gate 승인 뒤에만 hosted runner와 Actions quota를 사용한다.
- Stage 4는 Stage 3 Windows artifact·checksum을 고정 입력으로 사용한다.
- Stage 5는 Stage 3 Linux artifact와 Stage 4의 공통 GUI 판정 기준을 사용한다.
- Stage 6은 Windows/Linux 수용이 모두 Go이거나 명시적으로 승인된 한계가 정리된 뒤 진행한다.

## 위험과 대응

- **candidate drift**: PR #32 head·parent·path가 바뀌면 merge하지 않고 계획의 exact SHA와 비교해 보고한다.
- **merge 중 provenance 손실**: cherry-pick·squash·재생성 없이 original bot commit을 merge parent로 보존한다.
- **generated diff 오판**: generated JS·WASM은 source tag·toolchain·hash verifier와 재현 build로 검증한다.
- **native 비용과 실패 반복**: 플랫폼 중립 CI 성공 뒤 한 exact SHA에서 native matrix를 한 번 실행하고 실패 job부터 분석한다.
- **GUI 환경 제약**: 자동 package smoke와 실제 GUI를 분리해 기록하고 실행하지 않은 platform·driver를 명시한다.
- **중복 candidate PR**: PR #32를 immutable draft로 유지하고 Task #24 PR이 안전하게 게시되기 전에는 close하지 않는다.

## 승인 요청 사항

- Stage 1에서 candidate exact bot commit을 non-fast-forward merge parent로 보존하고 conflict 시 즉시 중단하는 절차
- Stage 2에서 실제 재현된 adapter 회귀만 기존 허용 경로에서 보정하고 회귀가 없으면 제품 코드를 수정하지 않는 기준
- Stage 3에서 `publish/task24` canary를 먼저 push하고 CI 성공 뒤 Windows/Linux native matrix와 Actions quota를 사용하는 순서
- Stage 4·5의 Windows x64/Linux x64 수동 GUI gate와 Linux arm64 build-only 한계
- Stage 3 native SHA 이후 docs/report-only 변경은 path audit으로 계승하되 실행 경계가 바뀌면 native를 재실행하는 정책
- Stage 6 Task PR 전까지 PR #32를 immutable draft로 유지하는 candidate 처리 순서

승인되면 Stage 1의 read-only 불변성 확인부터 시작하며, candidate merge와 Stage 1 보고서 커밋은 그 확인이 모두 통과한 경우에만 수행한다.
