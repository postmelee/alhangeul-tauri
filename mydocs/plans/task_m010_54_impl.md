# Task #54 구현계획서 — Windows/Linux 릴리즈 운영 문서와 기록 체계

수행계획서: [task_m010_54.md](task_m010_54.md)
GitHub Issue: [#54](https://github.com/postmelee/alhangeul-tauri/issues/54)
마일스톤: M010
상태: 구현계획 승인 대기
작성일: 2026-09-04
수행계획 승인: 같은 날 작업지시자의 “진행해줘”
기준: `devel` / `10c8c9aedb2b72436896ea3296b5200aa88793a7`
작업 브랜치: `local/task54`

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 정책과 기록 구조 정비 | 운영 정책, 릴리즈 인덱스·준비 기록, 기록 템플릿 | source 대조, 과거 근거 대응표, 준비 상태 |
| 2 | 실행 runbook과 최소 체크리스트 | 공개 walkthrough, 변경 영향별 검증 선택표 | 명령·입력·권한·산출물·실패 재개 대조 |
| 3 | 진입점 정렬과 walkthrough 검증 | README·문서 인덱스·개발 안내, #9 인계 | 링크·앵커, 5개 모의 진행, 문서-only 범위 |

모든 Stage는 문서 작업이다. 실제 릴리즈, native·GUI 검증, Actions 실행, upstream 갱신은
하지 않는다. 아래 명령은 저장소를 읽거나 문서 diff를 확인하는 검증이며 배포 명령이 아니다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 배포 정책 | `docs/operations/DESKTOP_RELEASE.md` | 동일, Stage 1 | OK | 기존 진입 경로 보존 |
| 공개 runbook | `docs/operations/PUBLIC_RELEASE_RUNBOOK.md` | 동일, Stage 2 | OK | 실행 순서·실패 재개 |
| 체크리스트 | `docs/operations/RELEASE_CHECKLIST.md` | 동일, Stage 2 | OK | 반복 기준, 결과는 기록으로 분리 |
| 릴리즈 인덱스 | `docs/releases/README.md` | 동일, Stage 1 | OK | 새 공식 기록 하위 폴더 |
| 준비 기록 | `docs/releases/v0.1.0.md` | 동일, Stage 1·3 | OK | 미공개 상태, #9 인계 |
| 기록 템플릿 | `mydocs/_templates/release_record.md` | 동일, Stage 1 | OK | 후속 버전 공통 양식 |
| 제품 README | `README.md` | 동일, Stage 3 | OK | 현재 기능·상태·진입 링크 |
| 문서 인덱스 | `docs/README.md` | 동일, Stage 3 | OK | 운영·아키텍처·기록 연결 |
| 개발 안내 | `docs/DEVELOPMENT.md` | 동일, Stage 3 | OK | 관련 링크·문구만 보정 |
| 템플릿 안내 | `mydocs/_templates/README.md` | 동일, Stage 3 | OK | 새 양식 안내만 보충 |
| #54 계획·보고·오늘할일 | `mydocs/plans/`, `working/`, `report/`, `orders/` | 동일, 각 단계 | OK | 제품 공개 기록과 분리 |

각 단계는 위 파일 중 이미 만든 문서의 상호 링크도 정렬할 수 있다. 아직 만들지 않은 문서로
깨진 링크를 먼저 추가하지 않는다. `site/`, framework manual과 다른 Task 산출물은 수정하지 않는다.

## Stage 1 — 정책과 기록 구조 정비

### 산출물

신규:

- `docs/releases/README.md`
- `docs/releases/v0.1.0.md`
- `mydocs/_templates/release_record.md`
- `mydocs/working/task_m010_54_stage1.md`

수정:

- `docs/operations/DESKTOP_RELEASE.md`
- #54 계획 상태와 실제 수행일의 오늘할일

### 변경 내용

1. 기존 release 문서 전체와 참조 보고서를 읽고 각 절을 반복 정책·과거 검증·미확정 결정으로
   분류한다. macOS 참고 runbook·기록은 읽기 전용으로 다시 확인하고 비교 SHA·시점을 남긴다.
2. 실제 `.github/workflows/alhangeul-desktop.yml`, `pages.yml`, updater·package config와
   validator를 대조해 지원 패키지, updater 대상, 썸네일 등록, 공개키·서명 책임을 정리한다.
3. `DESKTOP_RELEASE.md`는 현재 정책과 읽는 순서 중심으로 정비한다. 구현, 자동화 수용,
   실기기 수용과 공개 여부를 분리하며 반복 문서에 과거 완료 주장을 그대로 누적하지 않는다.
4. 원래 문서 절 → 새 정책·버전 기록·Task 보고서·기준 commit 원문 위치 대응표를 Stage 1
   보고서에 둔다. 고유 SHA·run·digest·수용 한계는 원본 보고서 또는 고정 commit 링크로
   추적할 수 있어야 한다. 기존 문서 내부 앵커 참조를 조사해 필요하면 호환 앵커를 유지한다.
5. 릴리즈 인덱스에는 `준비 중`과 `공개 완료`를 구분한다. v0.1.0 기록의 공개 채널·최종
   후보·게시 시각은 미확정이며 과거 성공 run의 source SHA를 자동으로 후보로 지정하지 않는다.
6. 준비 기록에는 기존 근거, 남은 결정, #9 인계와 후속 upstream·updater 시나리오를 둔다.
   #19 위험 수용, stable/prerelease 차이, 수동 패키지 게시 경계는 해결된 것처럼 쓰지 않는다.
7. 템플릿에는 식별자·이전 버전·변경 요약·upstream provenance·영향 판정·gate 결과·승인·
   산출물 및 공개 read-back 근거·미실행 범위·실패 재개·인계를 넣는다. 비밀 값과 개인 보관
   경로는 제외하고, 준비 시점과 공개 후 필수 항목을 구분한다.

### 검증

```bash
git diff --check
git diff --name-only
git show 10c8c9aedb2b72436896ea3296b5200aa88793a7:docs/operations/DESKTOP_RELEASE.md
rg -n 'DESKTOP_RELEASE\.md(#[^ )]+)?' README.md docs mydocs tests scripts
wc -l docs/operations/DESKTOP_RELEASE.md docs/releases/README.md docs/releases/v0.1.0.md mydocs/_templates/release_record.md
```

- baseline 각 절에 대응표 항목이 있는지 확인한다. 고유 값이 현재 기록에서 생략되면 고정
  원문 링크와 해당 절을 명시하고, 원본과 달라진 현재 상태를 구분한다.
- 지원 범위는 Windows/Linux만, updater는 MSI·NSIS·Linux x64 AppImage만인지 확인한다.
- AppImage에 DEB/RPM 파일 관리자 등록을 약속하지 않으며 미실행·미공개 항목을 완료로
  표시하지 않는다. 새 문서의 링크 대상 존재 여부와 300 LOC 이내 목표를 확인한다.
- 완료 기준: 정책·기록·템플릿 역할 분리, 이력 추적 가능, 공개 판단 미승계, 범위 밖 변경 없음.

### 커밋

```text
Task #54 Stage 1: 릴리즈 정책과 버전별 기록 구조 정비
```

단계 산출물·Stage 1 보고서·진행 상태를 함께 커밋하고 Stage 2 승인을 요청한다.

## Stage 2 — 실행 runbook과 최소 체크리스트

### 산출물

신규:

- `docs/operations/PUBLIC_RELEASE_RUNBOOK.md`
- `docs/operations/RELEASE_CHECKLIST.md`
- `mydocs/working/task_m010_54_stage2.md`

수정:

- Stage 1의 운영 정책·인덱스·기록·템플릿 중 새 문서 연결에 필요한 부분
- #54 계획 상태와 실제 수행일의 오늘할일

### 변경 내용

1. runbook을 입력 확정 → 변경 영향 판정 → 후보·산출물 검증 → 공개 승인 → GitHub Release
   → Pages·manifest → public read-back·설치본 확인 → 기록·인계 순서로 작성한다.
2. 각 gate에 선행 입력, 현재 구현에 존재하는 명령, 기대 결과, 저장할 증거, 승인·중단·재개
   위치를 둔다. 읽기 전용 명령과 원격 쓰기·서명 명령을 구분하고 후자는 별도 승인 후에만
   실행하도록 표시한다. 예제 변수는 승인 값으로 채우게 하며 과거 SHA를 기본 후보로 쓰지 않는다.
3. source version·tag·channel·upstream pin과 workflow/source SHA 정합성, `release` 및
   `github-pages` environment, artifact ID/digest, 파일 SHA-256·서명·inventory를 연결한다.
4. 현재 updater 게시 job은 MSI·NSIS·AppImage와 `.sig`, inventory를 다루는 stable 경로다.
   `publish_release=true`는 기존 파일의 draft 승격이 아니라 빌드를 거친 게시임을 명시한다.
   prerelease 입력, 동일 artifact 승격, DEB/RPM·arm64의 같은 job 게시를 가정하지 않는다.
5. 체크리스트는 매 공개 기본 확인과 upstream·updater·installer/썸네일·Pages·문서-only
   변경별 추가 확인으로 나눈다. 기존 source 증거의 재사용 조건과 새 바이너리의 무결성·
   서명·설치 확인을 구분한다. 전체 native·negative suite를 매번 의무화하지 않는다.
6. 첫 공개에는 이전 버전이 없음을 기록하고 production 공개키·endpoint를 확인한다.
   Windows MSI/NSIS 각각의 격리 설치본과 쓰기 가능한 Linux AppImage 기준선을 보존한다.
   다음 실제 릴리즈 후 각 형식의 `N → N+1` 설치·재실행·버전 확인을 수행하도록 연결한다.
7. 같은 버전에서 업데이트 없음, test-only endpoint의 기존 수용, production 실제 업그레이드를
   서로 다른 근거로 기록한다. 삭제된 시험 릴리즈를 공개 상태 확인 명령의 대상으로 쓰지 않는다.
8. 실패 시 원인·입력·영향을 확인하기 전 재실행하지 않는다. 공개 전 실패, Release 이후
   Pages 실패, manifest 게시 후 결함의 재개점을 분리하고 tag 이동·asset 교체·공개 정책
   우회는 금지한다. 복구 게시와 fixed version 결정도 별도 승인을 요구한다.

### 검증

```bash
git diff --check
rg -n 'workflow_dispatch|build_ref|run_tests|release_version|release_tag|release_notes|publish_release|permissions:|environment:|WORKFLOW_SHA|gh release create' .github/workflows/alhangeul-desktop.yml
rg -n 'deploy_ref|WORKFLOW_SHA|environment:|permissions:|pnpm|node --test' .github/workflows/pages.yml
rg -n 'check:|build:pages|test:updater|test:studio|test:upstream' package.json
rg -n 'stable|SEMVER|signature|sha256|inventory|manifestPublished' scripts/pages/release-data.mjs scripts/updater/release-inventory.mjs
wc -l docs/operations/PUBLIC_RELEASE_RUNBOOK.md docs/operations/RELEASE_CHECKLIST.md
```

- 추출 결과뿐 아니라 각 script의 인자 처리와 workflow job 본문을 읽고 문서의 명령마다
  입력·권한·생성물·성공/중단 조건을 대조한다.
- `check:updater-acceptance-release`는 시험 prerelease 전용임을 확인하고 production 공개
  read-back 검증기로 잘못 안내하지 않는다. 실제 없는 CLI·자동화 스크립트를 추가하지 않는다.
- source/파일/배포 SHA의 역할, 수동 패키지 경계, 지원 matrix를 Stage 1과 대조한다.
- 완료 기준: 현재 가능한 경로는 실행 순서가 명확하며, 불가능하거나 미승인인 경로는 원인·
  결정 주체·중단 위치가 명확하다. 아직 실행하지 않은 명령의 성공을 검증 결과로 쓰지 않는다.

### 커밋

```text
Task #54 Stage 2: 공개 릴리즈 runbook과 최소 검증 체크리스트 작성
```

단계 산출물·Stage 2 보고서·진행 상태를 함께 커밋하고 Stage 3 승인을 요청한다.

## Stage 3 — 진입점 정렬과 walkthrough 검증

### 산출물

신규:

- `mydocs/working/task_m010_54_stage3.md`

수정:

- `README.md`, `docs/README.md`, `docs/DEVELOPMENT.md`
- `mydocs/_templates/README.md`
- Stage 1·2 문서의 상호 링크, 준비 기록의 인계 항목과 모의 진행 중 발견한 문서 불일치
- #54 계획 상태와 실제 수행일의 오늘할일

### 변경 내용

1. README의 현재 기능·배포 상태를 바로잡고 정책·runbook·체크리스트·기록으로 연결한다.
   `docs/README.md`에는 운영·기록 구조와 기존 updater 아키텍처 진입점을 포함한다.
2. 개발 문서는 관련 링크·현재 상태 문구만 보정한다. 템플릿 인덱스에는 양식과 실제 출력
   경로를 설명한다. 제품 설명을 framework manual로 옮기거나 별도 루트를 만들지 않는다.
3. v0.1.0 준비 기록의 미확정 입력·필수 확인·승인 주체를 #9 인계 목록으로 확정한다.
   문서 merge 뒤 첫 릴리즈 → 별도 rhwp 갱신 → 다음 릴리즈 → 실제 updater 확인 순서를
   연결하되 버전·채널·후보를 승인 완료로 기록하지 않는다.
4. 아래 시나리오를 문서만으로 따라가 입력·정상 결과·정지·재개·기록 위치를 점검한다.
   실행 명령은 실제 수행하지 않고 Stage 3 보고서에 모의 점검임을 명시한다.

| 모의 상황 | 통과 기준 |
|---|---|
| 첫 공개, 이전 릴리즈 없음 | 이전 버전 필드와 업그레이드 미실행을 구분하고 공개 결정 전 정지 가능 |
| 다음 공개, 이전 설치본 있음 | upstream 변경 영향과 MSI·NSIS·AppImage 각각의 실제 전환 경로 확인 |
| 서명 실패 | 비밀 없는 실패 기록, 게시 전 중단, 원인 수정·승인 후 재개 위치 확인 |
| Release 성공 후 Pages 실패 | 기존 manifest 유지, 같은 Release 식별자 보존, Pages 단계 재개 |
| manifest 게시 후 결함 | 영향 확인·복구 승인·고정 버전 결정 경계, tag/asset 덮어쓰기 없음 |

### 검증

```bash
git diff --check
git diff --name-status 10c8c9aedb2b72436896ea3296b5200aa88793a7 --
rg -n '\]\([^)]*\)' README.md docs/README.md docs/DEVELOPMENT.md docs/operations/*.md docs/releases/*.md mydocs/_templates/release_record.md
wc -l README.md docs/README.md docs/DEVELOPMENT.md docs/operations/DESKTOP_RELEASE.md docs/operations/PUBLIC_RELEASE_RUNBOOK.md docs/operations/RELEASE_CHECKLIST.md docs/releases/*.md mydocs/_templates/release_record.md
```

- 변경된 Markdown의 상대 링크와 앵커를 실제 대상 파일·제목에 대조한다. 필요하면 일회성
  읽기 전용 Node 명령으로 파일 존재 여부를 확인하되 저장소에 새 검사 도구를 만들지 않는다.
- 승인 경로 외 diff가 없는지, Stage 1의 과거 근거 대응표가 최종 구조에서도 유효한지 확인한다.
- 템플릿의 준비/공개 후 필수 항목, 미실행 범위·승인·비밀 제외 조건과 다섯 모의 결과를 확인한다.
- 완료 기준: 새 작업자가 입력·근거·승인·실행/정지·인계 위치를 찾을 수 있고 문서-only 범위와
  이력 추적이 유지된다. 각 문서는 300 LOC 이내 목표를 충족하거나 먼저 보정 승인을 받는다.

### 커밋

```text
Task #54 Stage 3: 릴리즈 문서 진입점과 walkthrough 인계 검증
```

Stage 3 보고 후 최종 보고·PR 게시 승인을 별도로 요청한다. 이 단계에서 PR을 자동 생성하지 않는다.

## 검증

- 각 단계 검증은 보고서 작성 전에 수행하고 결과·미실행 항목을 구분한다. `rg` 추출 자체를
  정합성 통과로 간주하지 않고 원문 대조 결과를 보고서에 남긴다.
- native build·Studio build·전체 test·원격 Actions는 문서 검증으로 실행하지 않는다.
- 범위·경로·지원 정책·300 LOC 목표 예외가 필요하면 구현 전 계획 보정 승인을 요청한다.
- 단계마다 `git diff --check`, 커밋 대상 검토, 커밋 후 `git status --short`를 확인한다.

## 커밋

- 각 Stage 산출물은 해당 `mydocs/working/task_m010_54_stage{N}.md`와 함께 커밋한다.
- 단계 보고에는 `task-stage-report`, 오늘할일 갱신에는 저장소의 `todo` 절차를 적용한다.
- 최종 승인 후에만 `task-final-report`로 `mydocs/report/task_m010_54_report.md`와 최종
  상태를 기록하고 `publish/task54`를 push해 `devel` 대상 PR을 게시한다. merge는 별도 승인이다.

## 단계 의존성

- 현재는 구현계획 작성 단계다. 구현계획 승인 후 Stage 1을 시작한다.
- Stage 1 보고·승인 후 Stage 2, Stage 2 보고·승인 후 Stage 3을 진행한다.
- 문서 PR merge가 첫 공개 승인, #9 완료, #19 위험 수용 또는 updater 활성화가 되지 않는다.

## 위험과 대응

- **형식만 복제**: macOS의 운영 질문을 참고하되 명령·서명·OS·경로는 Tauri 실제 구현에 맞춘다.
- **증거 소실/과장**: 원래 절과 고정 근거를 연결하고 source 성공과 재빌드 파일 성공을 분리한다.
- **미구현 경로 오인**: stable/prerelease, draft 승격, 수동 패키지 게시 차이는 승인 대기 항목이다.
- **과검증/검증 생략**: 변경 영향에 따른 재사용은 허용하되 새 공개 파일·URL·설치본은 별도 확인한다.
- **다른 작업 충돌**: 다른 브랜치·Task 문서·공개 상태는 건드리지 않고 #9 인계만 작성한다.

## 승인 요청 사항

- 승인된 경로 안에서 위 3개 Stage의 산출물, 문서 전용 검증과 커밋 단위로 진행한다.
- 이 구현계획 승인 시 Stage 1부터 수행하고 각 Stage 보고 후 다시 승인을 요청한다.
- 실제 릴리즈와 upstream 수용·앱 updater 시험은 이번 문서화 밖의 별도 승인 작업으로 유지한다.
