# Task #9 구현계획서 — 첫 공개 준비 재정렬과 게시 진입 판단

수행계획서: [task_m010_9.md](task_m010_9.md)
GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
마일스톤: M010
상태: 2026-09-06 Stage 5 승인, 최종 보고 완료·devel PR 게시 진행

## 기준과 승인 경계

수행계획 승인 뒤 구현계획을 보정했고, 2026-09-04 후속 “진행해줘”를 이 문서 승인과
Stage 4.8 진입 지시로 기록한다. 공개·위험 수용·원격 실행과 Stage 4.9 승인은 별개다.
Stage 4.8의 허용 변경은 아래 산출물과 #9 제목/본문이며 제품 소스는 변경하지 않는다.

현재 준비 기준은 local/task9의 병합 e9eb6cc와 수행계획 보정 12190e0이다.
앱 0.1.0 stable·rhwp v0.8.4·다운로드 6종·updater 3종을 기본안으로 구체화한다.
Windows 미서명 공개, #19 등 위험 수용, 환경 보호, 최종 candidate는 Stage 4.8의 명시 결정으로 남긴다.
#9의 Go는 준비 완료/게시 작업 진입 판단이며, 실제 파일의 설치·서명·공개 Go가 아니다.

과거 Stage 1~4.7은 다시 실행하지 않는다. 652행의 옛 구현계획 전체는 commit
`f00287f30e18570f3ddca2c0514d7bcc790033d0`의 같은 경로에 보존되어 있다.
[Stage 1](../working/task_m010_9_stage1.md), [Stage 2](../working/task_m010_9_stage2.md),
[Stage 3](../working/task_m010_9_stage3.md), [Stage 4](../working/task_m010_9_stage4.md),
[4.5](../working/task_m010_9_stage4_5.md), [4.6](../working/task_m010_9_stage4_6.md),
[4.7](../working/task_m010_9_stage4_7.md)의 승인·실패·run·hash도 수정하지 않는다.
옛 prerelease/updater 제외·전체 CI 재실행 명령은 현행 실행 지침이 아니다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 4.8 | 공개 계약·동일 파일 게시 경로·최소 검증 확정 | 이슈/운영 가이드/버전 기록·stage4_8 | 실제 workflow/CLI 옵션·보호 조건·책임·미결정 항목 |
| 4.9 | Pages 전환 테스트와 제품 경계 최소 보정 | 테스트/fixture·boundary checker·stage4_9 | 3개 release 상태·기존 금지 경계·Pages build/check |
| 5 | 준비 Go/No-Go와 후속 게시 작업 인계 | stage5·버전 기록·최종 보고·devel PR | 준비 완료 조건과 후속 최종 파일/공개 gate 분리 |

각 단계는 보고·검증 후 승인받고 다음 단계로 간다. 아래 명령 블록은 해당 단계용이며
계획 문서를 읽거나 보정하는 지금 일괄 실행하지 않는다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 실행 가이드 | docs/operations/ | docs/operations/PUBLIC_RELEASE_RUNBOOK.md | OK | Gate 2~4의 동일 bytes 게시 경로 보정 |
| 정책·최소 체크리스트 | docs/operations/ | DESKTOP_RELEASE.md, RELEASE_CHECKLIST.md | OK | 바뀐 승인·검증 의미만 정렬 |
| 특정 버전 기록 | docs/releases/ | docs/releases/v0.1.0.md | OK | 확정값·미정·후속 gate의 진실 원천 |
| 도구 사용 설명 | docs/ | docs/DEVELOPMENT.md | OK | 실제 checksum 사용 설명 보정이 필요한 경우만 |
| 단계·최종 산출물 | mydocs/working·report/ | task_m010_9_stage4_8.md·stage4_9.md·stage5.md / task_m010_9_report.md | OK | 단계와 최종 결과 분리 |
| 공개 데이터 | site/ | site/release.json | OK | #9에서는 변경하지 않고 후속 공개 PR에 인계 |

새 공식 문서 위치나 mydocs/manual 제품 문서를 추가하지 않는다. runbook은 기존 Gate를
수정·정리해 300행 이내를 우선 유지하며 새 문서 분리가 필요하면 위치 승인을 먼저 받는다.

## Stage 4.8 — 공개 계약·게시 경로·최소 검증 확정

### 산출물

- mydocs/working/task_m010_9_stage4_8.md와 해당 날짜 오늘할일.
- docs/operations/PUBLIC_RELEASE_RUNBOOK.md, docs/releases/v0.1.0.md.
- 필요 시 DESKTOP_RELEASE.md·RELEASE_CHECKLIST.md·DEVELOPMENT.md의 관련 문단만.
- GitHub #9 제목/본문: 승인된 첫 공개 준비 범위·updater 포함·준비/공개 검증 책임 정렬.

### 변경 내용

1. 실제 Release/tag, main/devel, release·github-pages 환경과 #19/#28 상태를 조회한다.
   실패한 조회는 “없음”으로 해석하지 않는다. 기존 기록 시점과 새 확인 시점을 구분한다.
2. 기본안의 version/tag/channel, pin 유지, 6종 패키지·3종 updater·썸네일을 표로 고정한다.
   Windows Authenticode/경고, 알려진 PDF·암호 저장 위험, 미검증 배포판/GUI, 환경 보호는
   권고·근거·owner 결정 칸을 분리한다. 계획 승인만으로 위험 수용을 채우지 않는다.
3. main exact source의 비게시 updater run과 같은 SHA의 지정 일반 package run을 구분한다.
   일반 run의 MSI/NSIS/AppImage가 아니라 production overlay의 서명된 세 파일을 게시한다.
4. 검증된 bytes를 재사용하는 CLI 게시 명령을 현재 설치된 gh 옵션으로 확인해 runbook에 적는다.
   인증 주체·승인 기록·허용 ref를 명시하며 CI environment 보호가 CLI에도 자동 적용된다고
   가정하지 않는다. 필요한 보호 결정 전에는 해당 경로를 사용하지 않는다.
5. 기존 tag/Release 선조회, tag exact SHA 확인, 업로드할 파일의 명시 목록·hash,
   재빌드/덮어쓰기 금지, 불명확한 응답의 read-back·중단 지점을 고정한다.
   tag 생성과 Release 게시도 별도 승인된 후속 작업이며 자동 수행하지 않는다.
6. 공개 asset 목록은 installer 6개 + updater signature 3개 + complete inventory 1개 +
   SHA256SUMS 1개를 기본안으로 대조한다. asset 범위를 바꾸면 개수와 목록도 함께 재승인한다.
   installer 전용 checksum 도구에 .sig/inventory를 넣지 않는다. 전체 10개 입력 파일의
   hash는 명시 목록으로 계산하며 SHA256SUMS 자체 hash는 별도 기록한다.
   Pages의 세 target schema는 유지하고 수동 패키지는 기존 GitHub Releases 안내로 연결한다.
7. 실제 공개 files의 Windows 격리 MSI/NSIS, writable AppImage, DEB/RPM·arm64 설치 환경을
   후속 게시 작업 입력으로 명시한다. Linux desktopTemplate 영향은 DEB/RPM뿐 아니라
   AppImage에 포함되는 launcher도 확인하며 실제 argv·열린 문서로 판정한다.
8. 제품 코드·workflow·key/Secret·환경 설정은 변경하지 않는다. 원격 write는 승인 범위의
   #9 제목/본문 정렬뿐이며 다른 이슈 close·릴리즈·설정 변경은 금지한다.

기존 source 수용 재사용은 SHA·영향 diff·환경을 연결한다. 새 게시 bytes의 metadata,
hash·서명·설치·문서 열기/저장/재열기를 과거 성공으로 대체하지 않는다.
owner 결정이 필요한 항목은 구체적 선택과 근거를 보고하고 확정 전 단계 완료로 처리하지 않는다.

### Stage 4.8 진행 메모

2026-09-04 Release/tag·main/devel·환경·#19/#28·CLI 권한을 조회하고 #9 제목/본문을
편집 후 read-back했다. runbook의 동일 bytes draft/public 경로와 11개 파일 계약, 버전 기록의
근거/권고/결정 표와 최소 후속 검증을 보정했다. Windows 미서명·#19 선행·CLI/#28 분리의
세 owner 결정은 2026-09-06 확정됐다: Windows 미서명 공개+경고 안내, #19 첫 공개 전
수정, 승인된 CLI 게시 경로와 #28 후속 분리다. 실제 파일 공개·서명·환경 변경 승인은 아니다.
문서 7개 상대 링크/앵커 82개·Bash 블록 18개 구문 검사와 `git diff --check`가 통과했다.
runbook은 300행, 버전 기록의 기존 검증 근거·고정 원문 링크는 HEAD와 동일하다.
제품 소스/테스트/workflow/release.json 변경, native/CI·서명·게시 실행은 없다. 2026-09-06
원격 상태를 다시 조회해 Release/tag가 없고 #19/#28이 OPEN이며 환경·branch 보호가 같음을 확인했다.
전체 product-boundary는 기존 알려진 실패를 Stage 4.9에서 다루며 이 단계에서 재실행하지 않았다.

### 검증

조회·도움말만 실행한다. gh release create/edit의 실제 실행은 포함하지 않는다.

```bash
git status --short --branch
git diff --name-status 46e3b010398ee391db0ed59b510f49421e2dd13c HEAD
gh release list -R postmelee/alhangeul-tauri --limit 100
git ls-remote origin refs/heads/devel refs/heads/main 'refs/tags/v0.1.0*'
gh issue view 9 -R postmelee/alhangeul-tauri --json title,state,body
gh issue view 19 -R postmelee/alhangeul-tauri --json title,state,body
gh issue view 28 -R postmelee/alhangeul-tauri --json title,state,body
gh api repos/postmelee/alhangeul-tauri/environments/release
gh api repos/postmelee/alhangeul-tauri/environments/github-pages
gh api repos/postmelee/alhangeul-tauri/environments/github-pages/deployment-branch-policies
gh release create --help
gh release upload --help
gh release edit --help
git diff --check
```

release 환경에 branch policy가 있으면 그 목록도 조회한다. 문서의 Bash 블록은
`bash -n`으로 구문만 확인하고 실행하지 않는다. 상대 링크·앵커, 실제 CLI option,
서명/일반 산출물 구분과 동일 bytes handoff를 대조한다.
수행계획에 기록한 기존 product-boundary 실패는 Stage 4.9의 예정 보정이며 이 단계에서
전체 검사 성공으로 쓰지 않는다. 이슈 편집 후에는 제목·본문을 다시 읽어 반영을 확인한다.

### 커밋

```text
Task #9 [Stage 4.8]: 첫 공개 계약과 동일 파일 게시 경로 확정
```

## Stage 4.9 — 공개 전환에 필요한 최소 검사 보정

### 산출물

- tests/pages.test.mjs.
- 필요 시 tests/fixtures/pages-release-fixtures.mjs: 기존 published fixture·명시적인
  unreleased fixture·test-only signature 생성 등 fixture 책임만 분리한다.
- scripts/check-product-boundary.mjs, tests/product-boundary.test.mjs.
- mydocs/working/task_m010_9_stage4_9.md와 오늘할일.
- 실제 보정 내용을 설명할 필요가 있는 승인된 공식 문서의 해당 문단만.

### 변경 내용 — Pages

- 실제 tracked release data 검사는 현재 status에 맞는 validator 계약을 확인한다.
  manifest 허용 옵션은 검사 대상 상태의 구조 검증용이지 배포 승인이 아니다.
- `requireUnreleased`와 null·manifest 부재 단언은 고정 unreleased fixture에 남긴다.
- createFixture는 복사한 site의 release.json을 명시적으로 선택한 test 데이터로 고정한다.
  실제 source의 미래 published 상태가 다른 fixture 검사에 스며들지 않게 한다.
- 세 상태 모두 source 검사 → build → output 검사와 source 무변경을 확인한다.
  실제 source 검사는 덮어쓰지 않은 입력으로 별도 검증한다.
- 테스트 데이터의 임시 파일은 mkdtemp 아래에만 만든다. tracked release.json과
  production manifest는 변경하지 않으며 synthetic signature를 실제 서명 성공으로 쓰지 않는다.
- 디자인·UI·release schema·validator 자체는 바꾸지 않는다. 테스트 삭제/skip으로 우회하지 않는다.

| 고정 상태 | 필수 단언 |
|---|---|
| unreleased | version/tag/notes/download null, manifest/inventory 부재, 직접 다운로드 미노출 |
| published + manifest false | 세 exact tag URL·notes 반영, inventory null, manifest 부재 |
| published + manifest true | complete inventory와 생성 manifest 내용 일치, source manifest는 없음 |
| 잘못된 조합 | unreleased의 공개값, published 누락 URL, 불완전/불일치 inventory 및 미허용 manifest 거부 |

### 변경 내용 — 제품 경계

- 현재 devel과 동일한 두 문서의 출처 문구·외부 참조만 경로와 정확한 문맥을 제한해 처리한다.
  같은 문서의 다른 금지 식별자나 runtime/API 금지 항목까지 면제하지 않는다.
- 실제 등록된 중첩 Git worktree를 구분해 제외한다. .claude 전체나 임의 .git 이름의
  파일만으로 검사를 건너뛰지 않으며 제품 source는 계속 검사한다.
- positive: 허용된 두 참조와 중첩 worktree가 오탐을 만들지 않음.
- negative: 같은 문서의 다른 금지 문자열, 일반 source의 동일 문자열, 가짜 worktree marker,
  기존 bytes-only/native 소유 경계 위반이 계속 거부됨.
- 다른 작업자의 worktree 내용·위치·등록은 건드리지 않는다. 재현 fixture만 임시 경로에 생성한다.

### 검증

```bash
pnpm exec node --test tests/pages.test.mjs tests/updater-release.test.mjs tests/actions-workflows.test.mjs tests/product-boundary.test.mjs
pnpm run build:pages
pnpm run check:pages
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
git diff --exit-code 12190e0 -- site/release.json
git diff --check
```

- 두 published 상태는 임시 fixture에서만 만들고 실제 site source는 unreleased 상태를 유지한다.
- 반복된 source/output 결과와 미래 공개 데이터에도 테스트가 독립적인지 확인한다.
- 모든 기존 automation 대상이 유지되는지 package.json과 대조한다. fixture는 기존 pages
  test에서 import하므로 별도 테스트 실행 누락을 만들지 않는다.
- 복구 단계 집중 테스트는 source/test/hash가 그대로인 경우 결과를 재사용한다.
  metadata/Linux config/checksum을 추가로 수정해야 하면 먼저 범위 승인을 받고 관련 검사만 추가한다.
- 앱 runtime·pin·workflow는 바꾸지 않으므로 native/전체 upstream/Studio/negative CI를 반복하지 않는다.
- 기존 418행 Pages 테스트는 fixture 책임을 분리해 축소한다. 300행을 넘는 책임이 남으면
  이유와 범위를 기록하며 이번 보정과 무관한 재구성을 추가하지 않는다.
- product-boundary 실패나 필수 테스트 누락이 남으면 Stage 4.9 완료·준비 Go로 처리하지 않는다.

### 커밋

```text
Task #9 [Stage 4.9]: Pages 공개 상태 검증과 제품 경계 오탐 보정
```

## Stage 5 — 준비 Go/No-Go와 후속 게시 작업 인계

### 산출물

- mydocs/working/task_m010_9_stage5.md, docs/releases/v0.1.0.md의 준비 결과.
- 최종 보고 시 mydocs/report/task_m010_9_report.md와 오늘할일.
- 후속 게시 Issue 초안은 최종 보고 안에 둔다. Issue 생성은 별도 승인으로 분리한다.

### 변경 내용

준비 Go에는 Stage 4.8의 필수 결정·게시 경로 확정과 Stage 4.9 통과가 모두 필요하다.
남으면 No-Go와 원인·책임·재개 조건을 기록하고 실제 공개 gate로 넘어가지 않는다.

후속 게시 작업에 다음을 전달한다.
- #9 PR devel merge → 별도 release PR main 승격 → 최종 exact source/태그 승인.
- 지정 비게시 run·원본 archive·installer 6종·서명 3종·inventory·checksum 목록.
- 실제 새 파일의 설치·문서 시나리오와 Linux launcher 영향, 환경별 한계.
- 동일 bytes 공개 승인·게시·원격 read-back, 이후 release data PR·Pages/manifest 별도 승인.
- 첫 공개 MSI/NSIS 격리 설치본·writable AppImage 보존 → 별도 upstream 갱신 →
  다음 공개의 실제 production N → N+1 확인. 첫 공개에는 이를 성공으로 기록하지 않음.

최종 보고·PR은 task-final-report 절차의 별도 승인 시 수행한다.
원격 publish/task9는 그때 이전 ref가 HEAD의 조상인지 확인하고 일반 fast-forward push만 한다.
새 CI canary push·force push·release/tag/Pages 변경은 포함하지 않는다.

### 검증

```bash
git diff --name-status 46e3b010398ee391db0ed59b510f49421e2dd13c HEAD
git diff --exit-code 12190e0 -- apps crates rhwp-core.lock third_party/rhwp pnpm-lock.yaml .github/workflows site
git merge-base --is-ancestor 8b4ae60bb0f9619caa6c1f4d9f5a3796a42edcd9 HEAD
gh release list -R postmelee/alhangeul-tauri --limit 100
git ls-remote origin 'refs/tags/v0.1.0*'
git diff --check
```

Stage 4.9 이후 diff가 문서뿐인 경우에만 해당 검사 결과를 재사용하며 새 실패가 없다고 추정하지 않는다.
실제 공개 파일·서명·설치·Pages/manifest 결과는 후속 작업의 미실행 항목으로 명시한다.
문서 링크·기록 정합성·준비 Go 정의·위험 승인 누락을 확인한다.
원격 공개 상태가 다른 작업으로 변경됐다면 입력을 재정렬하며 직접 되돌리지 않는다.

### 커밋

```text
Task #9 Stage 5: 첫 공개 준비 Go No-Go와 후속 게시 입력 확정
Task #9: 최종 보고서 작성과 게시 준비
```

## 검증·커밋 공통 규칙

### PR #56 리뷰 보정 승인 — 2026-09-06

작업지시자의 “권고대로 진행해줘”를 다음 보정·집중 검증·최종 head CI 1회·리뷰 답변 승인으로 기록한다.
문서 위치는 기존 docs/operations/와 본 계획·최종 보고서이며 별도 제품 문서를 만들지 않는다.
Pages requireUnreleased의 published 거부 회귀, 승인 참조의 규칙군 분리·실제 문서 존재 검사,
updater 게시 파일을 checksum 도구에 넣었을 때 Gate 4 안내를 보완한다. runbook·체크리스트의
전환 완료 상태와 PR 승인 책임, Linux 아이콘 그룹핑 인계, 과거 orders 파일 목록을 정렬한다.
검사 파일 수는 로컬 생성물에 따른 관측값이며 합격 조건은 위반 0건이다. 기존 예외 경로는 확대하지 않는다.
관련 Pages/updater/boundary/checksum/metadata/Linux entry/workflow 테스트와 문서·Pages·경계 검사를
통과한 단일 보정 commit을 push하고, ci.yml을 publish/task9에서 한 번 dispatch한다.
CI의 head SHA를 확인하고 결과를 리뷰 코멘트로 게시한다. 이 승인은 PR merge·릴리즈 게시를 포함하지 않는다.

- 계획 보정은 문서 구조·링크·Bash 구문·변경 경계만 검사한다. 위 실행 명령은 미실행이다.
- 단계별 명령은 해당 단계 승인 뒤 수행하고 실제 결과를 보고서와 함께 커밋한다.
- source·계획·scope가 달라지면 변경 영향과 필요한 검사부터 다시 승인받는다.
- runtime/판정 도구가 같다는 근거가 있어야 과거 결과를 재사용한다. 새 bytes 수용은 재사용하지 않는다.
- 단계 보고는 working/, 최종 보고는 report/에 둔다. PR 직전 working tree는 clean이어야 한다.
- 304행 metadata checker는 복구 상태 그대로 둔다. 불필요한 리팩터링을 이번 계획에 추가하지 않는다.

## 단계 의존성

수행계획 승인 → 구현계획 승인 → Stage 4.8 결과·필수 결정 승인 →
Stage 4.9 검증·보고 승인 → Stage 5 판단 승인 → 최종 보고·devel PR 승인 →
merge 확인·cleanup → 별도 게시 Issue/실행 승인 순서다.
새 workflow는 추가하지 않고 #28은 후속으로 분리한다. #19는 owner가 명시적으로
첫 공개 전 수정을 선택했으며 #9의 암묵적 범위 확장이 아닌 별도 선행 작업으로 인계한다.

## 위험과 대응

- **승인 혼동**: 계획 승인은 unsigned·known risk 수용이나 공개 실행 승인이 아니다.
- **참조 면제 확대**: docs 전체 allowlist·가짜 worktree 제외·테스트 skip을 금지한다.
- **후보 재빌드**: 검증 후 다시 만들면 새 파일로 Gate 3부터 돌아간다.
- **검증 한계**: RPM/arm64 GUI·새 installer 기본 수용은 근거 없이 통과로 쓰지 않는다.
- **scope 확대**: CLI 게시가 보호 조건과 맞지 않으면 대안 구현 전에 별도 승인을 받는다.

## 승인 요청 사항

남은 4.8 → 4.9 → 5의 산출물·최소 검사·문서 위치·커밋과 단계 승인 경계를 요청한다.
승인 후 다음 작업은 **Stage 4.8의 공개 입력·게시 경로·남은 위험 결정 정리**이며,
아직 Pages 테스트 구현·CI·서명·공개는 진행하지 않는다.
