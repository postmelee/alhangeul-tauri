# Task #69 구현계획서 — 첫 공개 실행과 검증 경계

수행계획서: [task_m010_69.md](task_m010_69.md)
GitHub Issue: [#69](https://github.com/postmelee/alhangeul-tauri/issues/69)
마일스톤: M010

2026-09-20 수행계획 승인 후 작성. 같은 스레드의 작업지시자 `진행해줘`로 구현계획 승인.
현재 상태: Stage 1 완료 보고, 최소 검증안·비게시 후보 진입 조건 조정 승인. 준비 PR 생성 승인 대기.
아래 명령은 실행 계획이며, 이 문서 작성 중 제품 검증·CI·서명·게시를 실행한 것이 아니다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 범위·차단 조건 확정 | 현재 gate·환경·검증/재사용표, 공개 정책 결정 | 이슈/PR/환경 조회, version·metadata·pin·문서 계약 |
| 2 | 후보 고정·비게시 빌드 | release PR, 승인 main SHA, 일반/updater 두 run 및 archive identity | source/workflow 동일성, 필수 job·inventory·publish skipped |
| 3 | 실제 파일 수용 | 파일별 hash·서명·설치 결과, 공개 Go/No-Go | 게시 bytes의 Windows/Linux 최소 동작·잔여 위험 |
| 4 | Release 공개·원격 대조 | exact tag, 11 asset draft/public, 사용자 notes | 원격 bytes·서명·metadata와 승인 파일 일치 |
| 5 | 사이트·updater 전환 | 별도 데이터 PR, Pages run, production 확인 | 상태별 회귀·원격 URL/manifest·동일 버전 조회 |
| 6 | 기준선·인계 | 보존 자료·최종 기록·보고서 | gate/승인 근거 완결, 후속 인계·최종 문서 검증 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 버전별 공개 기록 | `docs/releases/` | `docs/releases/v0.1.0.md` | OK | Stage 1~6 현재 결과만 추가/갱신, 과거 판단 보존 |
| 기존 운영 안내 | `docs/operations/` | `PUBLIC_RELEASE_RUNBOOK.md`, `RELEASE_CHECKLIST.md`, `DESKTOP_RELEASE.md` | OK | 불일치가 확인된 부분만 최소 수정 |
| 공개 데이터·notes | `site/`·GitHub Release | `site/release.json`·Release 본문 | OK | 공개 원격 확인 및 별도 승인 후 반영 |
| 계획·단계·최종 보고 | `mydocs/` 역할별 폴더 | #69 plans/working/report·일별 orders | OK | 실행 기록과 공식 사용자 안내 분리 |

기존 `docs/releases/v0.1.0.md`는 이미 권장 300행을 넘는다. 이번 단계는 승인된 기존 위치에서
과거 증거를 보존하고 현재 판단만 보완한다. 별도 문서 분할·링크 이동으로 범위를 확대하지 않는다.

## 실행·승인 공통 규칙

- 구현계획 승인 다음에 Stage 1을 시작한다. 각 Stage 보고 승인 없이 다음 Stage에 진입하지 않는다.
- 원격 변경은 실행할 PR/ref/SHA·파일·입력·영향을 먼저 제시하고 별도 승인받는다.
  Stage 승인만으로 서명·tag·draft·stable 공개·Pages/manifest 배포까지 일괄 실행하지 않는다.
- 전체 source 검증과 게시 파일 검증을 분리한다. archive digest, installer SHA-256,
  product SHA, harness SHA, Pages SHA를 서로 대신 사용하지 않는다.
- `ALH_*`는 실행 직전에 승인값으로 채운다. 빈 값·추정한 ID·latest run 검색으로 진행하지 않는다.
  Secret 값은 읽거나 출력하지 않고 필요한 설정명·공개키 fingerprint만 기록한다.
- 파일별 검증표는 `파일/target/producer run·attempt·ID·digest/파일 hash/환경/실행 또는 재사용/
  실제 결과/근거/미검증·위험 승인`을 기록한다. 필요한 최소 근거만 남기며 새 집계 도구는 만들지 않는다.

### PR·브랜치와 운영 task 예외 승인 요청

릴리즈 실행은 공개 전후에 PR이 필요하므로 일반 task의 단일 최종 PR 흐름과 구분한다.
다음 단계별 PR 운용을 이 구현계획의 승인 대상으로 둔다. 매 PR 생성·merge는 별도 승인한다.

1. Stage 1 결과는 `local/task69 → publish/task69 → devel`의 준비 checkpoint PR로 통합한다.
   PR에 단계 보고를 연결하며 전체 완료 보고를 미리 작성하거나 `closes #69`를 넣지 않는다.
2. 그 후 별도 `devel → main` release PR을 검토/merge하고 최종 main SHA를 승인받는다.
   중간 task PR merge 이후에도 #69는 OPEN이며 작업 브랜치를 완료 정리하지 않는다.
3. Stage 2~4 결과는 작업 브랜치에 기록한다. 공개 후 최신 devel을 안전하게 통합하고,
   같은 publish 브랜치에 Stage 5 데이터 PR을 새로 연다. 이전 PR과 새 PR을 구분해 기록한다.
   반영할 diff에 의도하지 않은 제품 변경이 없는지 확인하며 rebase/force push는 하지 않는다.
4. Stage 6에서 실제 완료된 최종 보고와 오늘할일을 묶어 최종 문서 PR을 게시한다.
   전체 완료 확인 후에만 #69 close·브랜치/worktree 정리를 한다.

## Stage 1 — 범위·차단 조건 확정

### 2026-09-22 재개

- 사용자 승인으로 #69 미커밋 변경을 `40aa0ec`에 보존하고 최신 devel을 `1cf5589`로 통합했다.
  오늘할일 행 충돌은 #69/#70 양쪽 기록을 유지해 해결했다. stash·강제 덮어쓰기·다른 task 삭제는 하지 않았다.
- [#70 최종 보고](../report/task_m010_70_report.md)의 새 키 복구·full·미게시 서명/bytes 검증을 인계받았다.
  키 준비 미확정은 해소됐지만 최종 main SHA·6종 공개 bytes·설치 수용은 아직 미확정이다.
- 사용자 직접 설치는 최종 후보에서 한 번으로 모은다. 현재 추가 환경 제공이 어렵다는 답변을 보존하고
  같은 환경 제공 요청을 반복하지 않는다. 기존 CI로 가능한 항목/미검증을 구분한 제안이 다음 작업이다.
- MSI 관리자 환경과 Linux 배포판/architecture GUI 확인을 NSIS VDI 또는 서명 성공으로 대체하지 않는다.
  아래 추가 승인으로 비게시 후보 준비는 허용하되 미확보 범위의 공개 판단은 Stage 3에 남긴다.
- 통합 후 `check:product-version`, `check:release-metadata`, `check:rhwp-pin` 및
  release-metadata/product-version/pages 회귀 65개가 통과했다. `git diff --check`도 통과했으며
  `origin/devel` 대비 제품 앱·스크립트·테스트·workflow 변경은 없다. 새 CI·서명·게시 실행은 하지 않았다.

### 2026-09-22 최소 검증안 — 승인 완료

사용자가 최소 검증안 설명 뒤 `진행해줘`로 조건 조정을 승인했다.
종전의 환경 확보 전 Stage 2 미착수 조건을 변경한다. 새 CI 구현 없이 비게시 후보 준비까지 진행하되, 게시할 파일의 필수 검증
미실행은 Stage 3 공개 판단 전에 추가 확인 또는 명시적인 범위/위험 승인으로 처리한다.
후보 빌드 승인과 미검증 파일 공개 승인을 구분하고, 미실행을 통과로 기록하지 않는다.

#### 6종 파일별 실행·미검증 구분

아래는 실행 계획이지 새 후보의 성공 결과가 아니다. exact source/run/attempt/archive ID·digest와
개별 파일 hash는 후보 생성 후 채운다. #70 결과는 키 준비 근거이며 새 파일 설치 결과가 아니다.

| 게시 파일·출처 | 기존 경로로 수행할 최소 확인 | 기존 경로로 남는 공백 |
|---|---|---|
| NSIS x64·서명 run | 서명/hash/inventory 확인 후 사용자 VDI에 최종 파일 한 번 설치, 버전·HWP/HWPX 저장/재열기·새 문서 썸네일·앱 진단·대표 PDF/인쇄 확인 | hosted ordinary NSIS 계약은 이 서명 파일 설치 근거 아님. 다른 UAC/권한·한컴 조합 및 제거/재설치는 별도 범위 |
| MSI x64·서명 run | 서명/hash/inventory. 같은 source 일반 full의 MSI 설치·제거·강제 재설치 원시 결과를 참고 | 서명 MSI 자체 설치·GUI·production 조회 미확보. 일반 MSI 성공과 3010 관측은 대체 근거 아님 |
| AppImage x64·서명 run | 서명/hash/inventory 및 production 설정 정합성 | 최종 AppImage의 실행·문서 저장/재열기·실효 쓰기 자격·production 조회 미확보. DEB GUI로 대체 불가 |
| DEB x64·일반 run | full의 package lifecycle + 같은 DEB를 소비하는 기존 Linux GUI workflow로 설치·문서 저장/재열기·PDF/인쇄·썸네일 확인 | 실제 환경은 Ubuntu 22.04 x64/Xvfb. 24.04·Wayland·다른 데스크톱 수용 아님. launcher 파일 인자·taskbar 그룹핑은 별도 증거 없으면 미검증 |
| RPM x64·일반 run | full의 해당 파일 package/helper/MIME lifecycle와 hash 확인 | Ubuntu의 `rpm --nodeps`는 Fedora 의존성 해결·GUI 실행·문서 저장/재열기 확인이 아님 |
| DEB arm64·일반 run | arm64 runner에서 해당 파일 package/helper/MIME lifecycle와 hash 확인 | arm64 앱 GUI 실행·문서 저장/재열기 미확보. x64 GUI 및 로컬 Docker 가동으로 대체 불가 |

코드 근거:

- [Windows artifact handoff](../../scripts/ci/artifact-handoff.mjs)는
  `alhangeul-desktop-windows-x64`를 고정한다. `profile=installer`에 서명 archive ID를 넣거나
  archive 이름/inventory를 바꿔 서명 MSI 수용 경로로 사용하는 것은 허용하지 않는다.
- [Linux GUI workflow](../../.github/workflows/alhangeul-linux-gui.yml)는 Ubuntu 22.04에서
  일반 x64 DEB를 설치한다. [native 문서 시나리오](../../tests/gui/specs/linux-native.e2e.ts)에
  HWP/HWPX Save As·current save·reopen이 있다. runner 변경이나 새 시나리오 추가는 제안에 없다.
- [package 검사](../../scripts/linux-thumbnail-package-smoke.mjs)의 RPM transaction은
  `--nodeps`를 사용한다. package 통과를 Fedora 실사용 성공으로 쓰지 않는다.
- 기존 updater native acceptance는 시험용 N/N+1 artifact를 소비한다.
  production MSI/AppImage 단독 설치 검사를 대신하도록 시험 build를 추가하지 않는다.

#### 실행량과 담당

1. 최종 main SHA 승인 후 일반 `all/full/run_tests=true`와 비게시 서명 후보를 각 1회 생성한다.
   같은 후보의 `ci.yml full`을 중복 실행하지 않는다. 필수 실패는 원인을 분류한 뒤 필요한 부분만 보정한다.
2. 일반 run 성공 후 같은 x64 DEB로 `alhangeul-linux-gui.yml`, `scope=full`을 1회 실행한다.
   별도 제품 빌드는 없다. Ubuntu 22.04를 이번 hosted 검증 환경으로 사용하며 지원 범위를 확대하지 않는다.
3. 담당 에이전트는 6파일 hash·3서명·inventory와 raw CI/GUI 증거를 대조한다.
   사용자는 그 최종 서명 NSIS를 VDI에서 한 번 설치 확인한다. 개인 문서 원문은 수집하지 않는다.
   manifest 공개 후 같은 설치본에서 같은 버전 조회를 확인하며 재설치를 요구하지 않는다.
4. MSI/AppImage 자체 설치, RPM/arm64 GUI 및 launcher 등 남은 항목은 미실행 목록으로 유지한다.
   Stage 3에서 추가 검증 경로의 좁은 보완, 공개 범위 변경 또는 구체적 위험 수용을 승인받는다.
   이번 계획 승인만으로 해당 파일의 공개나 검증 면제가 승인되는 것은 아니다.

6종 유지 여부도 최종 판단 대상이다. 단순히 NSIS·DEB만 공개하는 대안은 현재 세 updater target을
필수로 하는 inventory/Pages 계약과 충돌하므로 파일만 누락하는 방식으로 진행하지 않는다.
그 대안은 별도 제품·배포 계약 변경 승인이 필요하다. 신규 CI 고도화·#58·#67은 계속 제외한다.

### 산출물·변경 내용

- `docs/releases/v0.1.0.md`의 현재 gate와 `mydocs/working/task_m010_69_stage1.md`.
- #9·#19·#57 완료 근거, #58 릴리즈 후·#67 백로그, 기타 열린 이슈의 실제 출시 영향만 대조한다.
  과거 #19 OPEN/No-Go 기록은 당시 기록으로 보존하고 최신 판단과 구분한다.
- `0.1.0` stable, 6종 installer·11 asset, 현 rhwp pin 유지, 서명·지원 한계 기본안을 확인한다.
  최종 후보/분석 시작 SHA·포함 PR·사용자 notes 초안과 Windows/Linux 환경표를 승인 요청한다.
- 관리자 없는 VDI는 NSIS 경로에만 배정한다. MSI와 Linux 배포판/architecture 환경은
  확보 여부·담당·실행 방법을 명시한다. hosted CI로 가능한 범위와 일반 로그인 GUI를 구분한다.
  미확보 항목은 위 승인된 표로 보존하고 비게시 후보 준비와 Stage 3 공개 판단을 분리한다.
- 서명 환경·Pages 환경·원격 release/tag·key fingerprint를 읽기 전용으로 확인한다.
  지원 범위·서명 정책·필수 설치 미검증을 미정으로 둔 채 공개 Go를 만들지 않는다.

### 검증

```bash
gh issue view 69 --json number,state,body,milestone
gh api --paginate repos/postmelee/alhangeul-tauri/releases
gh api repos/postmelee/alhangeul-tauri/environments/release
gh api repos/postmelee/alhangeul-tauri/environments/github-pages
git ls-remote origin refs/heads/devel refs/heads/main 'refs/tags/v0.1.0*'
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
node --test tests/release-metadata.test.mjs tests/product-version.test.mjs tests/pages.test.mjs
git diff --check
```

환경의 ref 제한은 설정에 따라 branch policy/ruleset도 확인한다.
없는 pin tag는 기존 upstream 절차로 exact tag/commit을 확인하며 의존성을 갱신하지 않는다.

### 커밋·승인

`Task #69 Stage 1: 첫 공개 범위와 최소 검증 기준 확정`
검증·문서 정합화와 owner 결정이 갖춰진 뒤 보고한다. 준비 PR 생성·merge 승인을 별도로 받는다.

## Stage 2 — 후보 고정·비게시 빌드

### 산출물·변경 내용

- release PR·승인된 main SHA·두 생산 run의 ID/attempt·archive 목록을 버전 기록과 Stage 2 보고에 연결한다.
- 원격 ref와 승인 후보가 일치하는지 dispatch 직전 확인한다. 일반 패키지/full과 updater 서명
  후보를 각각 한 번 요청하는 기본안이며, 원인 변화 없는 재실행이나 중복 full은 하지 않는다.
- 일반 run은 수동 3종의 출처, updater run은 NSIS/MSI/AppImage·서명·inventory의 출처다.
  updater 서명 사용 승인과 Actions environment 승인을 구분한다.

### 검증·실행 명령

아래 두 dispatch는 ref·40자리 SHA·version/tag/notes를 제시하고 원격 실행·서명을 승인받은 후만 수행한다.
최종 통합은 `alhangeul-desktop.yml`의 기존 all/full 경로를 사용하며 같은 후보의 `ci.yml full`을 중복 실행하지 않는다.

```bash
git ls-remote origin refs/heads/main
gh workflow run alhangeul-desktop.yml --ref "$ALH_WORKFLOW_REF" \
  -f mode=artifact -f build_ref="$ALH_SOURCE_SHA" -f run_tests=true \
  -f artifact_platform=all -f validation_profile=full -f publish_release=false
gh workflow run alhangeul-desktop.yml --ref "$ALH_WORKFLOW_REF" \
  -f mode=updater -f build_ref="$ALH_SOURCE_SHA" -f release_version="$ALH_VERSION" \
  -f release_tag="$ALH_TAG" -f release_notes="$ALH_NOTES" -f publish_release=false
gh run view "$ALH_RUN_ID" --json url,headSha,event,status,conclusion,jobs
gh api --paginate "repos/postmelee/alhangeul-tauri/actions/runs/$ALH_RUN_ID/artifacts"
```

각 run의 workflow/build_ref/checkout SHA·필수 job·upload를 대조한다. publish는 skipped여야 한다.
일반 설치 계약의 raw NSIS 제한/3010은 숨기지 않는다. 빌드 성공을 파일 수용이나 공개 승인으로 쓰지 않는다.

### 커밋

`Task #69 Stage 2: 첫 공개 후보와 비게시 산출물 출처 고정`

## Stage 3 — 실제 파일 수용

### 산출물·변경 내용

- 버전 기록의 파일별 검증표와 `mydocs/working/task_m010_69_stage3.md`에 공개 Go/No-Go를 정리한다.
- 새 임시 폴더에 고정된 run/ID의 archive를 받아 archive digest와 내부 파일 hash를 확인한다.
  게시용 staging은 명시한 10개 원본 파일만 담고 SHA256SUMS 10행과 자체 hash를 별도 기록한다.
- 각 installer의 설치·실행·version·공개 fixture 열기/저장/재열기와 영향받은 기능을 확인한다.
  Windows NSIS/MSI는 격리하고, Linux 수동 3종은 실제 해당 배포판/architecture에서 확인한다.
- 서명 updater bytes와 ordinary installer를 혼용하지 않는다. 기존 ordinary-only 재사용 경로에
  updater archive를 억지로 넣지 않는다. Stage 1에서 확정한 실행 환경·기존 도구로 게시 파일을 직접 확인한다.
- 순수 문서 변경이면 과거 기능 검증은 diff 근거로 재사용하되 새 파일의 최소 검증은 남긴다.
  MSI 3010 관측 시 재부팅 이후 확인 없이는 완료로 수용하지 않는다.

### 검증

```bash
pnpm run check:desktop-artifacts -- --platform "$ALH_PLATFORM" \
  --root "$ALH_ARTIFACT_DIR" --source-sha "$ALH_SOURCE_SHA" \
  --verify-inventory "$ALH_ARTIFACT_DIR/alhangeul-artifact-inventory.json"
pnpm run check:updater-artifacts -- --root "$ALH_UPDATER_DIR" \
  --version "$ALH_VERSION" --tag "$ALH_TAG" --source-sha "$ALH_SOURCE_SHA" \
  --public-key-env TAURI_UPDATER_PUBLIC_KEY
git diff --check
```

공개키 변수에는 후보 설정 파일의 공개키만 넣으며 비밀키를 사용하지 않는다.
complete inventory의 source/version/tag/fingerprint·target별 URL/크기/hash/signature는 별도 대조한다.
실제 환경 명령·설치 옵션은 Stage 1 승인 환경표에서 고정하며 위 CLI 성공으로 대체하지 않는다.
결과를 제출하고 exact tag·SHA·11개 파일·notes·실행자에 대한 공개 승인을 받는다.

### 커밋

`Task #69 Stage 3: 게시 파일 무결성과 설치 수용 결과 확정`

## Stage 4 — Release 공개·원격 대조

### 산출물·변경 내용

- 동일 파일의 tag·draft·stable Release, 원격 검증 결과와 Stage 4 보고.
- 기존 runbook Gate 4의 명령을 사용한다. tag/draft 승인 후 정확한 main SHA에 tag를 만들고
  명시한 11 asset을 draft로 업로드한다. 다른 tag/Release가 있거나 응답이 불명확하면 먼저 조회한다.
- draft에서 다운로드한 bytes를 승인한 로컬 hash·서명·notes와 대조한 후 결과를 보고한다.
  stable 공개는 별도 승인 뒤 수행하며, 공개 후 다시 내려받아 같은 대조를 반복한다.

### 검증

```bash
gh api user --jq .login
gh release view "$ALH_TAG" --json url,tagName,isDraft,isPrerelease,publishedAt,assets,body
git ls-remote origin "refs/tags/$ALH_TAG" "refs/tags/$ALH_TAG^{}"
gh release download "$ALH_TAG" -D "$ALH_PUBLIC_DIR"
```

새 read-back 폴더, checksum 자체 hash → 10행 → 각 파일/서명/inventory 순서로 확인한다.
명령 전문은 기존 [Gate 4](../../docs/operations/PUBLIC_RELEASE_RUNBOOK.md#gate-4--github-release-게시와-원격-파일-재검증)를 따른다.
`targetCommitish` 문자열만 믿지 않고 annotated tag의 peeled commit을 확인한다.
asset 덮어쓰기·tag 이동·검증 뒤 재빌드는 하지 않는다. 공개 오류가 생기면 Pages로 넘어가지 않는다.

### 커밋

`Task #69 Stage 4: 동일 파일 공개와 원격 무결성 검증 기록`

## Stage 5 — 사이트·updater 전환

### 산출물·변경 내용

- `site/release.json`, 필요한 `tests/pages.test.mjs` 보정, 버전 기록·Stage 5 보고.
- Stage 4의 실제 URL·시각·notes·검증 inventory를 사용한다. 기존 세 target schema를 유지하고
  수동 패키지는 기존 Release 안내로 연결한다. 다운로드 공개와 manifest 활성화 승인을 구분한다.
- 고정 unreleased/published fixture 회귀는 유지한다. 테스트 skip이나 공개 전 published 선반영은 금지한다.
- 데이터 PR 검토/merge 후 exact Pages SHA와 deploy 입력을 승인받아 기존 `pages.yml`을 실행한다.

### 검증

```bash
pnpm run build:pages
pnpm run check:pages
node --test tests/updater-release.test.mjs tests/pages.test.mjs tests/actions-workflows.test.mjs
git diff --check
```

배포 승인 후 `gh workflow run pages.yml --ref devel -f deploy_ref="$ALH_PAGES_SHA"`를 사용한다.
실제 홈페이지·updates·feedback의 링크/버튼·줄바꿈, manifest와 exact build output을 대조한다.
승인된 production manifest에서 MSI/NSIS/AppImage의 동일 버전 조회를 확인한다.
endpoint 오류를 업데이트 없음으로 세지 않는다. Pages-only 실패는 앱 빌드/Release를 반복하지 않는다.

### 커밋

`Task #69 Stage 5: 첫 공개 다운로드와 production 업데이트 안내 반영`

## Stage 6 — 기준선·인계

### 산출물·변경 내용

- `docs/releases/v0.1.0.md`, Stage 6 보고, `mydocs/report/task_m010_69_report.md`, 오늘할일.
- installer/hash/서명·inventory·run·환경·승인·공개 URL과 격리된 첫 공개 설치본 보존 위치를
  기록한다. 비밀·개인 문서·개인 경로는 공개하지 않는다. Actions 보존 기간에만 의존하지 않는다.
- #58·#67 및 실제 다음 version의 동일 형식 N → N+1 검증을 인계한다. 새 이슈는 필요 시 별도 승인한다.
- 전체 gate 결과 확인 후 최종 보고·문서 PR·merge·이슈 close와 부산물 정리를 승인 요청한다.
  보존해야 할 기준선은 정리 대상에서 제외한다.

### 검증

```bash
pnpm run check:release-metadata
node --test tests/release-metadata.test.mjs tests/pages.test.mjs
git diff --check
git status --short
```

공식 기록의 상대 링크·승인 입력·원격 Release/Pages 최종 상태를 대조한다. 문서-only full은 반복하지 않는다.

### 커밋

`Task #69 Stage 6 + 최종 보고서: 첫 공개 수용과 후속 기준선 인계`

## 검증·커밋·단계 의존성

- 각 단계의 실제 검증 뒤 `task-stage-report`로 산출물과 해당 단계 보고를 함께 커밋한다.
  실패한 단계를 성공 완료로 기록하지 않는다. 계획 변경은 먼저 보고하고 승인받는다.
- Stage 2는 최소 검증안·미확보 범위의 처리 경계 승인, Stage 3은 후보 bytes 확보, Stage 4는 파일 수용과 공개 승인,
  Stage 5는 Release 원격 대조, Stage 6은 사이트/production 확인 이후 진행한다.
- 원시 증거 누락·필수 실패는 해당 gate를 중단한다. 승인 입력이 같다는 이유로 무의미하게 CI만 반복하지 않는다.
- 검사 코드 수정이 필요하면 빠른 계약/PowerShell은 fast, 제품 bytes 동일 설치 검사는 적격
  ordinary artifact의 네 입력을 고정한 installer profile을 선택한다. 제품 변경은 해당 package,
  공유 코드·lock·workflow 변경과 최종 통합은 full이다. workflow 소유 경계는 기존 구조를 유지한다.
- 구현계획 작성 커밋은 `Task #69: 첫 공개 실행 구현계획과 승인 경계 정리`로 한다.

## 위험과 대응

- **검증 환경·권한 부족**: Stage 1에서 필요한 결정만 묶어 요청한다. 구현 없는 도구 조사나
  합성 회귀를 실제 MSI/배포판 설치 성공으로 부풀리지 않는다.
- **기존 제한·새 결함 혼동**: #57 제한은 명시하고 새로운 실패는 별도 분류한다. 릴리즈 차단이면
  최소 변경 범위를 승인받으며 #58·#67을 자동으로 다시 포함하지 않는다.
- **다중 PR·SHA 이동**: 체크포인트마다 diff와 base를 확인한다. 제품 tag의 SHA와 기록/Pages SHA는
  달라도 되지만 이를 서로의 제품 bytes 검증으로 주장하지 않는다.
- **부분 게시/배포 실패**: 기존 runbook 복구 표를 따르며 중복 생성·덮어쓰기·강제 tag 이동을 하지 않는다.

## 승인 요청 사항

- 위 6단계의 산출물·최소 검증·커밋과 Stage 1 착수
- 공개 전후 단계별 PR이 필요한 운영 task의 예외 운용과 중간 merge 시 #69 OPEN 유지
- 실제 공개 파일의 수용을 유지하면서 과거 근거를 재사용하고 불필요한 CI 반복을 제한하는 원칙
- 각 외부 실행 직전 exact 입력을 제시하고 별도 승인받는 경계
