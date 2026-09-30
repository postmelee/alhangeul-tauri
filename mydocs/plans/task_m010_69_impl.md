# Task #69 구현계획서 — 첫 공개 실행과 검증 경계

수행계획서: [task_m010_69.md](task_m010_69.md)
GitHub Issue: [#69](https://github.com/postmelee/alhangeul-tauri/issues/69)
마일스톤: M010

2026-09-20 수행계획 승인 후 작성. 같은 스레드의 작업지시자 `진행해줘`로 구현계획 승인.
현재 상태(2026-09-30): Stage 4 stable/latest 공개 및 11개 파일·3서명 원격 대조 완료. Stage 5 Pages 배포·공개 manifest 대조 성공. 안내 문구 보정과 실제 설치본 production 조회 잔여.
아래 초기 계획과 과거 실행 기록은 보존하며, 최신 결과는 Stage 4 보고서와 문서 끝의 실행 기록을 따른다.

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

## 2026-09-29 — Stage 3 추가 설치본 검증 구현

작업지시자의 추가 검증 진행 승인으로 아래 범위는 실행한다. 과거의 신규 CI 제외 조건을
최종 산출물을 읽는 좁은 검증 경로 보완에 한해 조정한다. 공개/제품 변경 권한은 확대하지 않는다.

### 3.1 MSI·AppImage 우선 실행

- 제품 SHA `fc3cad15682f35723ab6558d1301e9096f7eec67`, updater run `36320371932`.
  MSI는 artifact `10933208421` / archive digest `fbd15d72bcf126e3a22947f3a1ece3779291a768404c50e8fb94202abb07a091`,
  AppImage는 `10933550939` / `59aa3cd56a7dd0bf31a8107bf31a5a283439dd9ac5f6e0c1a7ee2f4bd89e34d6`.
- 새 reusable workflow와 기존 Desktop의 `release-file-acceptance` mode를 연결한다.
  Secrets·release environment·contents write 없이 actions read만 사용한다.
- artifact metadata·원본 ZIP digest·개별 installer SHA·Minisign을 검증한 뒤에만 설치/실행한다.
  제품 버전/샘플/공개키는 product SHA의 파일과 일치하는지 확인한다. harness SHA와 product SHA를
  분리해 기록한다. 불일치 또는 누락 시 실행 전 실패한다.
- Windows: 기존 updater native Install/Cleanup 스크립트로 MSI를 격리 설치/제거하고
  tauri-driver/UIA로 문서를 열어 실제 editor input으로 수정한다. Save As/current save 뒤
  앱 재시작·재열기와 저장 파일의 텍스트 marker를 검증한다. 3010은 성공으로 면제하지 않는다.
- Linux: AppImage 자체를 실행 경로로 사용한다. FUSE·Xvfb/DBus/openbox/AT-SPI 환경에서
  동일 문서 시나리오를 실행하고 파일/부모 디렉터리의 실효 쓰기 권한을 기록한다.
  AppImage 추출 실행으로 대체하거나 production 업데이트 요청을 수행하지 않는다.
- 테스트 보조 파일은 역할별로 `scripts/ci/`와 `tests/gui/`에 둔다. workflow는 300행 아래로
  유지하고 기존 GUI helper를 재사용한다. 증거는 always upload하고 설치/GUI/cleanup/upload의
  필수 성공을 gate로 검사한다. 실패를 출력 캡처 성공으로 상쇄하지 않는다.
- 로컬: 새 metadata/hash 변조 회귀, GUI typecheck, 관련 workflow 계약과 제품 경계 검사를 실행한다.
  Windows PowerShell·실제 native 실행은 Windows/Linux Actions에서 수행한다.
- 승인된 `publish/task69-validation`의 정확한 harness SHA로 Desktop mode를 dispatch한다.
  사용자 요청에 따라 완료 대기 없이 run 링크와 실제 요청 입력을 보고한다.

2026-09-29 실행 전 확인: metadata/installer 변조 거부와 workflow 안전 경계를 포함한
`pnpm run test:automation` 982건, `pnpm run typecheck:gui`, 두 변경 workflow의 `actionlint`,
`pnpm run check:product-boundary`, `git diff --check`를 통과했다. 설치/GUI 실제 수용은
Actions 결과 확인 전까지 미검증으로 유지한다. 제품 소스와 공개 후보 파일은 변경하지 않았다.

2026-09-29 첫 실행 결과: run `36455831548`의 AppImage job은 성공했다. 원본 실행/FUSE·쓰기
권한·HWP/HWPX 편집 저장·재시작 재열기를 통과했다. 증거 ZIP `10984674594`의 digest
`1a2af4de0505bc082bd7b71714cbfabc2deaa7856f3625d5d90d213900ad2a1c`와 두 시나리오의 참조 파일
4개 크기/hash를 확인하고, 저장 파일 2개의 marker를 pinned WASM으로 다시 확인했다.
HWPX 재열기 화면의 한글/표 표시도 확인했다.

MSI job은 설치/제거 exit 0 및 metadata/handler 검사를 통과했으나 WebDriver session 생성에서
`DevToolsActivePort file doesn't exist`로 실패했다. 문서 시나리오는 실행되지 않았다.
증거 ZIP `10985720561`의 digest는 `85f578854752316a562ea0766e11777cbfd04bf8e8f0dfc8b18d50341067dd97`로
검증했다. 기존 Windows native/PDF 경로에 있는 elevated WebView2 automation policy setup/cleanup이
이번 경로에서 누락된 것을 확인했다. 같은 설정과 always 복원·필수 gate를 재사용하고,
`artifact_platform=windows-x64`로 MSI만 재실행한다. 제품 파일 변경 없이 harness만 보완하며,
전체 수용 및 MSI GUI 성공은 재실행 결과 확인 전까지 선언하지 않는다.

### 3.2 Fedora RPM·arm64 후속 실행

3.1의 결과를 반영한 뒤 기존 일반 producer `36320353815`의 RPM과 arm64 DEB를 재사용한다.
Fedora에서 `dnf` 의존성 해결을 포함한 설치와 가상 화면 실행을 시도하고, native arm64 runner에서
DEB GUI를 시도한다. 실제 사용할 배포판·driver·의존성 및 fixture를 실행 전 고정한다.
환경 준비나 driver가 실패하면 설치/GUI가 통과했다고 기록하지 않는다. 제품 파일을 고치거나
재생성해야 하는 결함이면 먼저 영향과 새 후보 필요성을 보고한다.

2026-09-29 MSI 재실행 `36457019871`은 성공했다. 증거 artifact `10986131635`의 ZIP digest
`005c4caa07408effd162da667f71434ec1770e38f634475ff10fd77885731c91`와 두 시나리오 참조 파일
4개의 크기/hash, 저장 파일 2개의 marker를 재검증했다. 설치/제거 exit 0, WebView2 policy
`restored=true`, HWPX 재열기 한글/표 화면을 확인했다. Stage 3.1의 MSI·AppImage 수용을
기록하고 이미 승인된 다음 추가 검증 범위로 진행한다.

Stage 3.2 실행 환경·구현 고정:

- `release-linux-file-acceptance` mode와 별도 reusable workflow를 추가한다. 기존 GUI spec을
  그대로 사용해 HWP/HWPX 편집·저장·재시작/재열기를 검사한다. 성공한 MSI/AppImage는 반복하지 않는다.
- arm64: `ubuntu-24.04-arm` native runner, 일반 artifact `10932449136`, ZIP digest
  `5b2260d5c43934641a8f8607a652062d4796e2ccc87b3774497359cca13cfe6f`,
  DEB SHA `a317382ff9b3ec911ec8761de3be7d641309d1f97d58b8a19601a8adb4a21a2e`.
  apt 의존성 해결 설치·dpkg arm64/version·Xvfb/DBus/AT-SPI GUI를 검사한다.
- RPM: `ubuntu-22.04` host의 Docker에서 Fedora 44 x64
  `quay.io/fedora/fedora@sha256:fb31d002de20bfa7742b8c9b0d0ff723bb9fa2534fd43ecac0101a35f703fef0`.
  [공식 Fedora 이미지 안내](https://fedoraproject.org/misc/)의 registry에서 manifest를 조회해
  amd64 digest를 고정했다. 일반 artifact `10932826761`, ZIP digest
  `91ace60dbe2ac5b818a8f2f572afae8bb8f00908a497e119ce21a07900da2660`,
  RPM SHA `6c87ba0321f6a9c8ca5068915217064f8c839cabaf3a8d60451df8f3e496308c`.
- RPM은 Fedora 기본 image에서 `dnf install`로 실제 의존성을 해결한다. `--nodeps`는 금지한다.
  설치와 GUI 준비/실행의 결과를 분리 기록한다. GTK3/WebKit4.1 제품에 Fedora가 제공하는
  [WebKitWebDriver](https://packages.fedoraproject.org/pkgs/webkitgtk/webkitgtk6.0/fedora-44-updates.html)를
  사용하며 설치된 4.1/6.0/driver 버전과 OS/architecture를 증거에 남긴다.
- Fedora GUI는 비root 사용자와 Xvfb/DBus/AT-SPI로 수행한다. read-only checkout·Node/driver와
  쓰기 가능한 evidence directory만 mount한다. WebKit의 중첩 sandbox용 container seccomp 제한은
  해제하되 privileged/host network/Docker socket mount는 쓰지 않는다. 실제 Fedora 데스크톱·
  Wayland·물리 프린터·Shell 전체 수용으로 확대 해석하지 않는다.
- 공통: 원본 ZIP·source SHA·전체 package inventory·선택 installer SHA를 검증한 뒤 설치한다.
  tauri-driver 2.0.6만 검증 도구로 컴파일하고 제품은 빌드하지 않는다. package/GUI 필수 성공 및
  증거 upload를 gate로 유지한다. 실패 시 단계와 로그를 보존하고 성공으로 면제하지 않는다.

Stage 3.2 실행 전 로컬 확인: 자동화 987건, 새 source/archive/package 변조 회귀,
변경 workflow의 actionlint, 실행 스크립트 3개의 shellcheck, 제품 경계와 diff 검사를 통과했다.
최종 스크립트 조정 후 관련 회귀 10건과 shellcheck를 다시 통과했다. native 설치/GUI는 아직
미검증이며 Actions 완료를 기다리지 않고 링크를 전달한다.

2026-09-29 첫 Linux 추가 실행 `36464534232`는 양쪽 failure다. 원본 ZIP/inventory 검증과
Fedora 44 dnf RPM 설치(`alhangeul x86_64 0.1.0-1`), Ubuntu 24.04 arm64 apt DEB 설치
(`alhangeul arm64 0.1.0`), GUI 의존성 준비·비root 실행 진입은 통과했다. 다만 공통 harness가
tauri-driver 2.0.6의 미지원 `--version` 옵션을 호출해 GUI 세션 시작 전에 exit 1로 중단됐다.
제품 결함/GUI 실패로 단정하지 않으며 GUI 수용은 여전히 미검증이다.

증거 ZIP 검증: arm64 `10989116902` / `c2a583909623b6e5f0c25747863ed93ef6f8c44a2e31b50ec0157553bf9a00b1`,
RPM `10988712121` / `06354474c21a296252c97d1d572bfad47fec8e35c7826461270e2db5faa90611`.
버전 증거는 host의 `cargo install --list`에서 정확한 2.0.6을 확인해 보존하고, 실행 환경에서는
실제 driver binary의 SHA-256을 기록한다. 지원하지 않는 CLI 호출은 제거하고 이를 회귀 검사에
추가한다. 같은 제품/이미지/fixture 입력으로 양쪽 GUI를 재실행하며 MSI/AppImage는 반복하지 않는다.

2026-09-29 재실행 `36465315970`: arm64 job success. artifact `10989578015` ZIP digest
`1c33585d8c0544031b093e709b75561bbbadd2dc40c8e1fa2331bbb7a855b67c`와 두 시나리오의 파일 4개
크기/hash, 저장 문서 2개 marker를 재검증했다. HWPX 재열기 화면의 한글/표 표시도 확인했다.
RPM job은 설치와 WebDriver session/Studio 초기화까지 성공했으나 native Open 후 AT-SPI에서
대화상자를 찾지 못했다. 이후 screenshot 요청은 `session deleted because of page crash or hang`
이며 접근성 트리에 application 0개였다. 제품/환경 중 원인은 아직 확정하지 않는다.
RPM 증거 `10988863866` ZIP digest `d7711621aab01d8b94a997bdcfebeb8fc2e3f7137683ec038cc60ee7f7161e9d`를 확인했다.

RPM만 `artifact_platform=linux-x64`로 재실행한다. 성공한 arm64는 반복하지 않는다.
관찰된 `which` 누락을 보완하고 비root XDG runtime directory·X11 session·D-Bus activation
환경을 명시한다. [portal session 통합 지침](https://flatpak.github.io/xdg-desktop-portal/docs/system-integration.html)을
따르는 준비이며 portal/FUSE 경고가 crash 원인이라고 단정하지 않는다.
[Docker 기본 shared memory 64MiB](https://docs.docker.com/engine/containers/run/)의 영향을 배제하도록
컨테이너 `/dev/shm`을 1GiB로 설정하고 실측값을 기록한다. WebDriver 연결이 끊겨도 수집되는
독립 desktop screenshot·process 목록·cgroup memory events를 보완한다. 진단 결과는 원래 GUI
exit code를 덮어쓰지 않는다. 제품/설치본/이미지 digest와 문서 통과 조건은 그대로 유지한다.

2026-09-29 RPM 단독 재실행 `36466879752`도 failure다. 원본 후보 검증·dnf 설치·앱 초기화는
성공했으나 첫 native Open에서 AT-SPI chooser 대기가 만료되어 문서 검증을 진행하지 못했다.
증거 artifact `10991030222`의 ZIP digest
`c09a57c4e2de9ae02060ef7b0d5c42dcfb0fa3dc144cdfae37e7ec30bed75e92`를 검증했다.
`package-acceptance.json`은 `lastPhase=gui`, `exitCode=1`이다.

독립 화면/프로세스 증거에서 실행 초기 Alhangeul 창과 WebKit 프로세스가 살아 있음을 확인했다.
cgroup memory events의 OOM/OOM-kill은 0이고 `/dev/shm` 크기는 1GiB다. 이 자료로 모든 자원
문제를 배제할 수는 없으나 관찰된 메모리 부족 종료 증거는 없다. 종료 시 검은 화면과 프로세스
소멸은 WebDriver 정리 이후 자료이므로 자발적 앱 crash의 증거로 사용하지 않는다.
AT-SPI의 application 0개는 Alhangeul 이름으로 필터한 결과이며 시스템 전체 접근성 앱 수가 아니다.
WebDriver의 `page crash or hang` 오류만으로 제품 crash 또는 컨테이너 원인을 확정하지 않는다.

제품 의존성은 GTK3 dialog 경로다. portal/FUSE 경고를 원인으로 단정하거나 portal 설정만 바꿔
동일 검사를 반복하지 않는다. 다음 검증 방향은 동일 RPM을 실제 Fedora 44 x64 데스크톱 VM에서
열어 native Open을 비교하는 것이다. VM 실행이나 새 Actions dispatch는 이번 결과 확인에 포함하지
않았다. 컨테이너와 실제 데스크톱의 차이 또는 제품 결함은 여전히 미확정이다.

Stage 3.1 MSI·AppImage 및 Stage 3.2 arm64의 수용은 유지하고 RPM GUI는 미수용으로 남긴다.
Stage 3 전체 완료·릴리즈 전체 통과를 선언하지 않는다. 기존 Windows Shell/재부팅 후 제한도
해소된 것으로 간주하지 않는다. 제품 SHA와 설치본은 변경하지 않았으며 Windows 사용자 재점검,
제품 재빌드·재서명·공개는 수행하지 않았다.

### 3.3 동일 RPM의 Fedora 데스크톱 VM 비교

작업지시자가 `진행해줘`로 실제 Fedora 데스크톱 VM 비교를 승인했다. #69와 현재 검증 브랜치에서
Stage 3을 이어간다. 현재 Mac은 arm64/여유 공간 약 9GiB이며 로컬 VM은 생성하지 않는다.
Ubuntu 24.04 x64 Actions runner의 QEMU/KVM에 Fedora 44 Cloud 1.7을 부팅하고 LightDM·Xfce·
Xorg 로그인 세션을 설치한다. cloud image 기반 데스크톱이며 Fedora Workstation/GNOME/Wayland
전체 수용으로 확대하지 않는다. KVM 가용성은 사전 검사하고 불가하면 환경 준비 실패로 기록한다.

- 공식 image: `Fedora-Cloud-Base-Generic-44-1.7.x86_64.qcow2`, SHA-256
  `28680fe5b371a5a82ebf43a31926e086a168e59949d03969c5093e7071f90b7f`.
  출처: Fedora 공식 Cloud 다운로드와 `dl.fedoraproject.org`의 44/Cloud/x86_64/images CHECKSUM.
  다운로드 bytes를 이 값으로 확인한다. SHA 고정 확인이며 OpenPGP 검증 수행으로 주장하지 않는다.
- 원본 RPM·producer·artifact·inventory 검사는 기존 helper를 재사용한다. VM 전달 후에도 RPM
  SHA를 대조한다. driver 2.0.6과 Node/잠금된 JS 의존성·공개 fixture만 전달하며 제품 빌드는 없다.
- guest systemd/system bus/logind와 LightDM의 비root Xfce X11 session에서 기존 HWP/HWPX
  문서 시나리오를 실행한다. Xvfb·컨테이너·새로운 dbus-run-session으로 대체하지 않는다.
- 게스트 SSH는 일회성 키와 host loopback 포트만 사용한다. GH token·서명 secret·Git 자격증명은
  전달하지 않는다. 임시 VM과 키는 runner의 임시 디렉터리에 두고 종료 시 VM 프로세스를 정리한다.
- VM boot/provision/session/GUI를 구분한다. system journal·desktop screenshot·process와
  시나리오 증거를 회수하고 모든 필수 단계와 upload가 성공해야 수용한다. 수집 실패도 gate 실패다.
- 문서 위치는 기존 승인된 `mydocs/plans/`와 `mydocs/orders/`를 유지한다. 구현은
  `.github/workflows/alhangeul-release-fedora-vm.yml`, Desktop 진입 mode 및 역할별
  `scripts/ci/release-fedora-vm*.sh`, 회귀 검사는 `tests/ci-release-fedora-vm.test.mjs`에 둔다.
  각 신규 파일은 300행 미만이다. guest 준비/수집 셸은 순차 운영 스크립트로 분리한다.
- 로컬 검증: workflow actionlint, shellcheck, 자동화 계약과 제품 경계. 실제 Linux VM 검증은
  Actions에서만 수행한다. 승인된 RPM만 실행하며 성공한 다른 설치 형식은 반복하지 않는다.
  dispatch 후 링크를 전달하고 사용자 요청대로 완료를 기다리지 않는다.

VM 실행 전 검증: 자동화 989건, 두 변경 workflow의 actionlint, 신규 셸 3개 shellcheck,
제품 경계 688파일, diff 검사를 통과했다. 이후 SSH keepalive·접근성 앱 이름 진단·UID 충돌 방지
조정 후 관련 VM 계약 2건과 shellcheck를 다시 통과했다. Fedora VM 실제 실행과 문서 수용은
Actions 결과 확인 전까지 미검증이며 이전 RPM 실패 근거를 보존한다.

2026-09-29 VM 첫 실행 `36511679150`은 failure다. 원본 RPM 후보 검사·KVM 장치 사전 검사·
검증 도구 설치는 통과했다. VM 단계는 exit 2로 중단됐고, 종료 처리에서 root 소유 qemu.pid를
runner가 읽지 못했다. 이어 upload가 root 소유 vm-serial.log의 EACCES로 실패해 artifact는 0개다.
따라서 증거 ZIP/hash 확인이나 Fedora desktop/RPM 문서 성공을 주장하지 않는다. 이전 컨테이너의
native Open 문제를 VM에서도 재현했다고 판단할 근거도 없다.

harness 보정: serial log를 QEMU 실행 전에 runner 소유로 생성하고 PID는 sudo로 읽어 해당 VM만
정리한다. 정리 실패는 원래 실패를 보존하며 원래 성공이면 실패로 바꾼다. cloud-init 대기 단계의
상세 상태를 tee로 실행 로그와 파일 양쪽에 남기고 관련 system journal도 회수한다. 기존 exit 2의
정확한 원인은 업로드 실패로 아직 미확정이다. cloud-init의 nonzero는 면제하지 않는다.
같은 RPM/image/문서 시나리오로 VM만 재실행한다. 제품 변경이나 새 후보 생성은 없다.
보정 후 자동화 990건, VM 관련 회귀 3건, 셸 3개 shellcheck와 diff 검사를 통과했다.
실제 VM 부팅/GUI 검증은 다음 run의 결과 확인 전까지 미검증으로 유지한다.

2026-09-29 VM 재실행 `36512713947`은 failure다. 증거 upload와 VM 종료는 성공했다.
artifact `11009446808` ZIP SHA-256
`59fa7cb128c745f8cd17290922b10ef2d80725a3eb87ab5ed8d258e07e78768d`를 검증했다.
`vm-outcome.json`은 lastPhase=cloud-init / exitCode=2이며 `cloud-init-status.txt`는
status=done, extended_status=degraded done, errors=[]이다. recoverable_errors는 지정한
`alhangeul-rpm-vm` hostname 설정 실패 경고 4개다. VM 부팅/SSH 연결까지 진행됐지만 RPM 전달·
설치·desktop/GUI는 시작하지 않았다. 제품 실패나 이전 native Open의 VM 재현으로 기록하지 않는다.

문서 검증과 무관한 hostname 변경을 제거한다. NoCloud metadata에는 instance-id만 유지하고
[cloud-init 공식 설정](https://docs.cloud-init.io/en/latest/reference/yaml_examples/set_hostname.html)의
`preserve_hostname: true`로 이미지의 기본 이름을 유지한다. cloud-init nonzero/GUI 실패를 통과로
처리하는 변경은 없다. 동일 image digest·RPM bytes로 VM만 재실행한다. 이전 root 로그/PID 권한
보정은 이번 실제 upload/cleanup 결과로 확인됐으며 Windows 재점검이나 제품 재빌드는 필요 없다.
보정 후 VM 계약 3건, 셸 3개 shellcheck와 diff 검사를 통과했다. workflow·제품 소스는 변경하지 않았다.


2026-09-29 Fedora VM `36513158401`은 모든 필수 단계 success다. artifact `11009958648` ZIP
SHA-256 `98661376753ef6ab2f29ecfe96f1d3b3d3359af785d0b90e5d7b6f832b4da0af`를 재계산했다.
VM/GUI outcome은 모두 complete/0, cloud-init errors와 recoverable_errors는 비어 있다.
LightDM·Xfce·X11 비root 실제 guest session, 동일 RPM의 dnf 설치·HWP/HWPX 수정 저장·재시작
재열기가 통과했다. 두 시나리오의 참조 파일 4개 크기/hash와 두 저장 문서 marker를 재검증하고
두 재열기 화면의 한글/표/추가 marker를 확인했다. VM 정리와 증거 upload도 성공했다.

승인된 추가 형식 검증 결과를 [Stage 3 보고서](../working/task_m010_69_stage3.md)에 정리했다.
동일 RPM의 VM 성공은 컨테이너 실패의 정확한 원인을 확정하지 않는다. 기존 Windows Shell·3010
재부팅 후 미검증과 공개 승인 경계는 유지한다. 제품 변경·사용자 Windows 재점검·추가 CI는 없다.

### Stage 3 검토와 Stage 4 승인 입력 준비 — 2026-09-29

작업지시자의 `진행해줘`로 검증 변경 검토와 최종 릴리즈 실행안 확정을 진행했다.
`ef2e42c2`까지의 검증 경로를 검토해 후보 고정·원본 검증·실패 전달·GUI 수용 결과를 무효화하는
차단 결함을 발견하지 못했다. 원격 devel은 현재 HEAD의 조상이며 다른 작업을 덮어쓰지 않았다.
제품/서명/fixture는 final SHA와 같다. 고정 artifact용 검증 경로를 후속 버전에 일반화하지 않는다.

이미 승인한 공식 기록 위치 `docs/releases/v0.1.0.md`에 최신 수용 상태·게시 11개 파일의 크기/해시·
알려진 제한·tag/draft 승인 범위·Release 본문 초안을 추가했다. 과거 기록은 보존했다.
source version `0.1.0`, rhwp `v0.8.6`/6관리 artifact, release metadata와 관련 회귀 65건 통과.
로컬 staging 정확히 11개 파일·SHA256SUMS 10행·3개의 실제 Minisign을 재검증하고 complete
inventory 전체를 대조했다. 임시 검증 코드가 verifier 반환값에 sourceSha가 있다고 잘못 가정한
첫 대조는 중단됐으며, createReleaseInventory의 실제 반환 스키마로 전체 대조를 수정해 통과했다.
제품/파일 결함이 아니라 로컬 대조 스크립트의 오류였으며 실패를 통과로 기록하지 않았다.

원격 main `fc3cad15682f35723ab6558d1301e9096f7eec67`, devel `c54498c6fef1de125181175b75995145f715342e`,
Release 0개·tag v0.1.0 없음, CLI 사용자 postmelee, release reviewer/self-review/ref 제한과
Pages devel 제한을 재확인했다. 사용 archive 4개 모두 expired=false, 만료 예정 2026-10-11 UTC다.
본문 UTF-8 SHA-256 `f61b3d9d799eeab17775cd724e2c8dd8f8f20bd5dabae266e1d08c04ce959c52`.

다음 승인 요청은 잔여 위험 수용 및 CLI 경로의 exact SHA annotated tag 생성/push·draft 11개
asset 업로드까지다. draft read-back 후 stable 공개는 별도 승인이다. 이번에는 PR 생성/merge,
새 CI, tag/draft/stable, Pages/manifest 변경을 하지 않았다. #69는 계속 OPEN이다.

### Stage 4 tag·draft 실행 승인 — 2026-09-30

작업지시자는 명시한 잔여 위험과 exact 제품 SHA·11개 asset·본문·CLI 실행안에 대한 질문에
`진행해줘`로 승인했다. 승인 범위는 postmelee CLI로 annotated v0.1.0 tag 생성/push 및 draft
생성·read-back까지이며 stable 공개·Pages/updater 전환은 포함하지 않는다.
직전 main SHA·Release/tag 부재·계정과 로컬 11개 hash/3서명/본문 SHA를 다시 대조했다.
annotated tag object `3b6b4bc5eef0a5e290b8060b81191c5460cc4c63`을 생성해 원격 push했고,
peeled commit `fc3cad15682f35723ab6558d1301e9096f7eec67` 일치를 확인했다.

Draft Release ID `399698591`을 생성했고 11개 asset 업로드가 완료됐다. 새 폴더로 다시 다운로드해
파일 이름·개수·크기·SHA/API digest·SHA256SUMS 자체를 승인값과 대조했다. 원격 파일의 실제
Minisign 3개 및 complete inventory 전체도 일치했다. 본문은 개행 정규화 후 승인 텍스트와 같다.
Draft URL은 `https://github.com/postmelee/alhangeul-tauri/releases/tag/untagged-a10602970e2dbe1ce46a`.
draft=true / prerelease=false / published_at=null이다. 증거는 로컬 read-back verification.json과
공식 버전 기록, #69에 남긴다. Stable 공개·Pages/manifest·새 CI·제품 빌드는 실행하지 않았다.

### Stage 4 stable 공개 승인·완료 — 2026-09-30

작업지시자가 draft 대조 결과에 대해 다시 `진행해줘`로 stable/latest 전환과 공개 후 대조를
승인했다. `postmelee`가 동일 Release ID `399698591`을 공개했다.

- [Alhangeul v0.1.0](https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.0):
  draft=false, prerelease=false, published_at=`2026-09-30T03:46:46Z`.
  `/releases/latest`도 같은 ID를 반환했다.
- 새 폴더에 공개 파일 11개를 다시 다운로드해 이름·개수·크기·SHA-256·API digest를
  공식 버전 기록의 승인 목록과 대조했다. SHA256SUMS 자체와 대상 10개 파일 모두 일치한다.
- 공개 bytes로 complete inventory를 다시 구성해 승인 inventory 전체와 일치하고,
  Minisign 3개를 검증했다. 본문은 개행 정규화 후 승인 텍스트와 일치한다.
- 원격 annotated tag object `3b6b4bc5eef0a5e290b8060b81191c5460cc4c63`,
  peeled commit `fc3cad15682f35723ab6558d1301e9096f7eec67`은 변경되지 않았다.
- **Stage 4 완료**. 재빌드·재서명·파일 교체 없이 이미 수용한 파일을 공개했다.
  사용자 Windows 재설치 점검은 추가로 필요하지 않다. 알려진 제한은 기존 수용 범위 그대로다.
- 다음은 Stage 5 사이트 다운로드 데이터·updater 전환 준비다. 데이터 PR 생성/병합과
  Pages/manifest 배포는 각각 별도 승인 대상으로 유지하며 #69는 OPEN이다.

### Stage 5 데이터 준비 승인 — 2026-09-30

작업지시자가 Stage 4 보고 뒤 `진행해줘`로 사이트 다운로드·updater 데이터 반영과 로컬 검증을
승인했다. 기존 #69 검증 브랜치에서 계속한다. 실제 stable API와 Stage 4 read-back inventory를
사용해 `site/release.json`을 published로 변경하고, 배포 후보에 manifestPublished=true 및 검증
inventory를 포함한다. 이는 로컬 manifest 생성 준비이며 실제 Pages/manifest 활성화는 별도 배포
승인 이후다. PR 생성/merge도 별도 승인 경계를 유지한다.

문서 위치는 기존 `docs/releases/v0.1.0.md`와 #69 계획·오늘할일을 유지한다. 공개 인덱스
`docs/releases/README.md`도 기존 docs/releases 내 상태 표만 실제 공개 결과로 갱신한다.
고정 fixture 회귀와 source 계약은 이미 상태 독립적이므로 실패 근거 없이 테스트를 변경하지 않는다.

Stage 5 로컬 결과: `pnpm run build:pages`, `pnpm run check:pages` 통과(source 11/output 14).
`node --test tests/updater-release.test.mjs tests/pages.test.mjs tests/actions-workflows.test.mjs`는
83 passed, 0 failed/skipped다. 기존 unreleased 및 published manifest true/false fixture를
변경하지 않았다. 현재 GitHub Release API의 tag·시각·asset URL/크기/digest를 대조했고,
tracked inventory는 Stage 4에서 검증한 공개 inventory와 전체 일치한다. 생성 manifest의 세
URL·서명도 일치한다. manifest SHA-256:
`e3c27ee429063ae12d0f12e7188f5ee2a3e498104963900889501228caba88d1`.

최신 origin/devel `c54498c6fef1de125181175b75995145f715342e`는 현재 브랜치의 조상이며
추가 통합 충돌이 없다. 기존 `publish/task69-validation`의 열린 PR은 없다. 다음 데이터 PR에는
Stage 3 검증 harness와 Stage 3/4 기록도 포함된다. 제품 코드·upstream pin·공개 installer는
변경하지 않았다. PR 생성/merge, Pages dispatch와 production 동일 버전 조회는 아직 수행하지
않았으므로 Stage 5 전체 완료로 기록하지 않는다.

### Stage 5 PR #81 병합 — 2026-09-30

작업지시자가 PR 생성과 병합을 각각 `진행해줘`로 승인했다. PR #81의 head는
`498fd0b36605b6d29d33770b8a821e66209cf4fa`, base는
`c54498c6fef1de125181175b75995145f715342e`였으며 mergeable/CLEAN을 확인했다.
현재 head에는 Actions/check-run이 0개다. 최근 정기 upstream sync 성공을 PR CI 성공으로
취급하지 않는다. 기존 Pages 83건과 추가 후보 검증 계약 13건 통과, 코드 검토에서 병합을 막는
결함을 발견하지 못했고 제품 코드·pin·설치본 변경이 없음을 확인했다.

2026-09-30T04:06:24Z에 merge commit
`6e2d8deb3caa22a98a2c4c2d480bc1e9478754f1`로 devel에 병합됐다.
원격 devel이 같은 SHA이며 검증한 head와 Pages 입력·생성 코드·workflow가 동일하다.
진행 중인 #69와 작업 브랜치/worktree는 Stage 5~6에 필요하므로 유지한다.

다음 승인 대상은 `pages.yml --ref devel`에 deploy_ref=
`6e2d8deb3caa22a98a2c4c2d480bc1e9478754f1`을 전달해 사이트 다운로드 및 production
updater manifest를 게시하는 것이다. 실행 직전 원격 devel 일치를 다시 확인한다.
이번 턴에는 Pages dispatch를 하지 않았고 production 조회도 아직 미검증이다.

### Stage 5 Pages 배포 실행 승인

작업지시자가 `진행해줘`로 exact devel SHA
`6e2d8deb3caa22a98a2c4c2d480bc1e9478754f1`의 Pages 및 production updater manifest
배포를 승인했다. 실행 직전 원격 devel 일치와 중복 실행 부재를 확인했다.
첫 dispatch는 HTTP 500을 반환했다. 해당 SHA/event의 실행 0개를 재확인한 후 동일 입력으로
한 번 재시도했고 [run 36667548738](https://github.com/postmelee/alhangeul-tauri/actions/runs/36667548738)
생성 응답을 받았다. `pages.yml --ref devel`, deploy_ref는 위 SHA다.

사용자 요청대로 Actions 완료를 기다리거나 반복 조회하지 않았다. run 성공, 실제 배포,
공개 화면·manifest 일치와 설치본 동일 버전 조회는 아직 미확인이다. 사용자가 완료를 알리면
이 run을 확인하고 승인된 배포 후 검증을 이어간다.

### Stage 5 Pages 게시 API 오류와 동일 실행 재시도

사용자 완료 알림 후 run 36667548738을 확인했다. exact SHA 검증, dependency 설치,
Pages build/check, 계약 검사, Pages 설정과 artifact 업로드까지 성공했다. 마지막 deploy-pages의
배포 생성 요청만 HTTP 500으로 실패했다. 로그는 GitHub 서버 오류와 재실행을 안내하며
제품 코드나 검증 실패로 판단할 근거는 없다.

artifact ID는 11076572172, Pages environment deployment 6751285452의 마지막 상태는
failure였다. production `/updater/stable.json`은 HTTP 404로 아직 게시되지 않았다.
기존 승인 범위에서 `gh run rerun 36667548738 --failed`로 같은 SHA의 실패 작업을 한 번
재실행했고 CLI 요청이 성공했다. 코드·데이터·권한 설정 변경은 없고 완료를 기다리지 않았다.
실제 게시 및 production 검증은 재실행 결과 확인 전까지 미완료로 유지한다.

### Stage 5 중복 Pages artifact 실패와 새 실행

run 36667548738 attempt 2는 build/check/tests/upload를 통과했지만 deploy-pages가 같은 이름의
`github-pages` artifact 2개를 발견해 배포 생성 전에 실패했다. 이전 HTTP 500과 다른 원인이다.
artifact ID 11076572172와 11077490415가 모두 expired=false로 존재함을 API에서 확인했다.
동일 run 전체 작업 재시도가 업로드도 반복하는 점을 놓친 복구 선택이었다. 실패 증거는 보존한다.

원격 devel이 승인 SHA `6e2d8deb3caa22a98a2c4c2d480bc1e9478754f1` 그대로이고
Pages 실행이 완료 상태임을 확인했다. 코드·설정·승인 입력 변경 없이 새 workflow_dispatch로
[run 36668279136](https://github.com/postmelee/alhangeul-tauri/actions/runs/36668279136)을 생성했다.
`pages.yml --ref devel`, deploy_ref는 동일 SHA다. 새 run은 이전 run의 artifact와 분리된다.
완료를 기다리지 않았으며 실제 배포와 production 검증은 결과 확인 전까지 미완료다.

### Stage 5 Pages 공개 성공 및 read-back

run 36668279136은 success다. head SHA는 승인한
`6e2d8deb3caa22a98a2c4c2d480bc1e9478754f1`, deploy step 완료 시각은
2026-09-30T04:19:27Z다. exact SHA·build/check/tests/upload/deploy 모두 통과했다.
공개 release.json과 updater/stable.json을 curl --fail로 내려받아 승인 출력과 cmp 일치를
확인했다. manifest SHA-256은 기존
`e3c27ee429063ae12d0f12e7188f5ee2a3e498104963900889501228caba88d1` 그대로다.
HTTP 성공은 실제 앱 업데이트 조회 성공으로 대신 기록하지 않는다.

인앱 브라우저에서 홈 Windows NSIS/MSI 링크, Linux 선택 시 AppImage 링크와 DEB/RPM/arm64
수동 Release 링크, 업데이트 메뉴의 세 다운로드·v0.1.0 릴리즈 노트 링크, 문의 화면을 확인했다.
390px 모바일 업데이트 화면에서 메뉴와 줄바꿈을 관찰했다. 홈 Linux 전환은 키보드 ArrowRight로
확인했으며 radio check 도구 호출 실패 자체를 제품 클릭 장애로 판단하지 않았다.

공개 후 남은 문구: site/index.html:78의 “공개 전에는…” 안내가 published에서도 남는다.
site/updates/index.html:54의 “첫 공개 릴리스 검증이 끝나면…”도 후속 조회 완료 후 정리가 필요하다.
사이트 문구 보정은 별도 변경 승인 대상으로 제시한다. 실제 NSIS/MSI/AppImage의 production
동일 버전 조회는 여전히 미검증이므로 Stage 5 전체 완료나 Stage 6 진입을 선언하지 않는다.


### Stage 5 production 동일 버전 조회 보완 승인 — 2026-09-30

작업지시자는 #82 운영 배포 완료 후 제안한 #69 잔여 검증에 `진행해줘`로 진행을 승인했다.
기존 `local/task69-validation`의 기록을 보존하며 devel `c3ee834c`를 통합했다. 충돌은 오늘할일
#69 상태 한 행이며 현재 상태와 #82 행을 함께 유지했다. 제품 소스·upstream·공개 파일은 변경하지 않는다.

기존 release-file acceptance consumer에 `production-updater-check` 조회 모드를 추가한다.
Windows 2025 별도 runner의 NSIS/MSI, Ubuntu 22.04의 원본 writable AppImage를 실행한다.
제품 SHA는 `fc3cad15682f35723ab6558d1301e9096f7eec67`, producer run은 `36320371932`다.
기존 고정 archive ID/digest와 installer SHA 및 Minisign 검증을 재사용한다. NSIS hash는
공개 승인 목록의 `a5eca9761defb46065187430b8274fe5b7a90c163ffe6f19410011e29af96d0c`다.
Windows 두 종류는 서로 다른 runner에서 설치/제거하므로 install marker가 섞이지 않는다.

- manifest: `https://postmelee.github.io/alhangeul-tauri/updater/stable.json`, SHA-256
  `e3c27ee429063ae12d0f12e7188f5ee2a3e498104963900889501228caba88d1`.
- 실제 운영 manifest HTTP 200·해시·버전, 고정 제품 updater config의 endpoint를 확인한 뒤
  실제 native `updater_check`를 호출한다. 성공 조건은 idle/manual/operationId 존재,
  currentVersion=0.1.0, availableVersion/blocker/failure=null이다.
- disabled/manual fallback, HTTP 오류, 다른 manifest와 조회 실패는 통과하지 않는다.
  `updater_apply` 및 endpoint override는 사용하지 않는다. 새 버전 설치는 수행하지 않는다.
- 기존 문서 roundtrip 모드는 유지한다. 이번 조회 모드에서 이미 통과한 roundtrip을 반복하지 않는다.
- native snapshot, 운영 manifest bytes/hash, GUI 화면, installer/cleanup 및 driver 진단을 남긴다.
  필수 단계와 evidence upload가 모두 성공해야 통과한다.
- 문서 위치는 기존 plans/working/orders와 `docs/releases/v0.1.0.md`를 유지한다.
  Stage 5 완료 보고서와 Stage 6은 실제 원격 결과 대조 후 별도 단계로 진행한다.

로컬 검증: actionlint 두 workflow, GUI 타입 검사, candidate/Pages/updater/workflow 회귀
93건 통과(실패·skip 0), diff 검사 통과. 운영 manifest 해시와 Release API의 세 installer
해시도 일치했다. Pages `36692552385` success/head=`c3ee834c`를 재확인했다.
이는 native production 조회 통과를 의미하지 않는다.

원격 실행 입력은 `alhangeul-desktop.yml`, 기존 `publish/task69-validation`의 검증 commit,
mode=`production-updater-check`, artifact_platform=`all`, publish_release=`false`다.
제품 재빌드·서명·게시·Pages 배포 권한은 사용하지 않는다. 승인된 잔여 검증 실행 후 대기하지 않고
run URL을 보고하며, 작업지시자의 완료 알림 이후 원격 증거를 읽는다. #69는 OPEN을 유지한다.


Stage 5 조회 실행: [36695858456](https://github.com/postmelee/alhangeul-tauri/actions/runs/36695858456),
harness SHA `4b3366e7`. 위의 mode/all/publish=false 입력으로 dispatch했다.
실행 완료를 기다리지 않았으며 결과는 아직 미수용이다.


### Stage 5 원격 증거 수용·완료 — 2026-09-30

작업지시자의 완료 알림 후 run `36695858456`의 exact harness SHA 및 세 대상 success를 확인했다.
각 ZIP을 다시 내려받아 API digest와 SHA-256을 대조했고 native 자동/수동 조회 응답,
운영 manifest bytes/hash 및 후보 hash/서명 확인 기록, 설치/cleanup/정책 복원/증거 upload를 확인했다.
NSIS·MSI·AppImage 모두 실제 production 동일 버전 조회가 통과했다. disabled/error/fallback을
성공으로 처리하지 않았다. updater 적용은 없었다. screenshot은 MSI 1×1, 나머지는 스킨 선택
화면이므로 updater UI 표시 검증으로 확대하지 않는다.

`pnpm run build:pages` 및 `pnpm run check:pages` 재확인: source=16/output=19 통과.
직전 실행 준비의 회귀 93건·타입·actionlint 통과를 재사용했다. 조회 완료로 Stage 5 완료이며
Stage 6 최종 인계·최종 보고서·PR은 다음 단계 승인 후 진행한다. #69는 OPEN이다.
