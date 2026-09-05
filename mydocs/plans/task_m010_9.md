# Task #9 수행계획서 — 첫 공개 준비 재정렬과 게시 진입 판단

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
마일스톤: M010
상태: 2026-09-06 Stage 4.9 산출물·검증 완료, 단계 결과 승인 대기

## 목적

최신 devel의 썸네일·Pages·MSI/NSIS/AppImage updater를 포함하는 첫 공개 준비를 마친다.
현재 구현과 맞지 않는 prerelease·updater 제외 계획을 보정하고, 필요한 검사와 게시 경로를
확정해 후속 릴리즈 작업이 같은 준비·CI를 반복하지 않도록 한다.

#9는 준비 변경을 devel에 병합하는 일반 Task다. 실제 devel → main release PR,
서명 빌드·tag·Release·Pages/manifest 공개는 후속 게시 Issue와 별도 실행 승인으로 분리한다.
이 Task의 Go는 **게시 작업 진입 가능** 판단이지 실제 게시 파일의 Gate 3 공개 Go가 아니다.

## 배경

- PR #55 / Task #54가 devel에 병합되어 [정책](../../docs/operations/DESKTOP_RELEASE.md),
  [runbook](../../docs/operations/PUBLIC_RELEASE_RUNBOOK.md),
  [체크리스트](../../docs/operations/RELEASE_CHECKLIST.md),
  [v0.1.0 준비 기록](../../docs/releases/v0.1.0.md)이 기준이 됐다.
- 원래 #9는 rhwp v0.8.2·prerelease·updater 제외 계약이었다. HWPX 저장 금지와
  전체 native 반복을 포함하던 당시 판단을 현재 수용 기준으로 재사용하지 않는다.
- 현재 pin은 rhwp v0.8.4 / `496333b27d21ddb9114ba9ae340bcb895870c9a7`이다.
  첫 공개 뒤 별도 upstream 갱신 → 다음 실제 공개 → 세 형식 N → N+1 확인 순서를 제안한다.
- 마지막 일반 native 수용 SHA `50e91247841b47d5dc50773c0a2584720829dbdc`에서
  PR #55 merge `46e3b010398ee391db0ed59b510f49421e2dd13c`까지는 문서만 달랐다.
  이 근거는 새 installer의 서명·설치 성공을 뜻하지 않는다.
- 수행계획 승인 후 [구현계획서](task_m010_9_impl.md)를 보정했고, 2026-09-04 후속
  “진행해줘”로 구현계획과 Stage 4.8 진입이 승인됐다. GitHub Issue도 이 단계에서 정렬한다.
  위험 수용·실제 서명/게시와 다음 Stage 승인은 포함하지 않는다.

### 승인된 브랜치 복구와 이력 보존

2026-09-04 작업지시자가 이력 보존 병합·최신 정책 기준 충돌 정리·수행계획 보정을 승인했다.
기존 head `f00287f30e18570f3ddca2c0514d7bcc790033d0`와 devel `46e3b010…`을
merge commit `e9eb6cc3b0e2653a23c34beb484c9509eee4cac6`에 함께 보존했다.
원격 publish/task9는 `8b4ae60bb0f9619caa6c1f4d9f5a3796a42edcd9` 그대로다.

- 충돌 6곳: DEVELOPMENT, DESKTOP_RELEASE, 20260812 orders, package.json,
  release metadata 검사와 테스트. 최신 updater·MIME·문서 정책과 기존 #9 기능을 통합했다.
- Tauri 자동 병합의 중복 linux key를 제거하고 DEB/RPM의 desktopTemplate을 최신
  thumbnail helper·MIME hook 설정 안에 합쳤다. 기존 `Exec={{exec}} %F`를 보존했다.
- 기존 checksum 도구·테스트를 보존했다. 이 도구는 installer 전용이며 .sig/inventory의
  검증이나 게시를 대신하지 않는다. 최신 automation 테스트도 모두 보존했다.
- 따라서 통합 후 diff는 문서-only가 아니다. Linux launcher/package와 관련 검사에
  영향이 있으며, 실제 공개 Linux package의 파일 열기·설치 확인이 후속 gate에 필요하다.
- Rust/Studio runtime, rhwp pin, thumbnail 구현, updater overlay, workflow는
  현재 devel과 동일하다. 다른 작업자의 worktree는 변경하지 않았다.
- 옛 수행계획·정책 원문은 위 f00287f commit에서 복원할 수 있다.
  [Stage 4.7](../working/task_m010_9_stage4_7.md)과 앞선 단계 보고서도 그대로 보존한다.

복구 시 release metadata·Linux desktop entry·checksum·Linux thumbnail packaging/MIME·
workflow 6개 집중 테스트 파일, version/metadata/pin 검사, 설정·테스트 보존 대조와 diff
검사가 통과했다. 전체 product-boundary는 **실패**했다. 현재 devel과 같은 문서 2건
(DESKTOP_RELEASE의 출처 표현, v0.1.0의 외부 프로젝트 참조)과 중첩 review worktree
128건 때문이다. 검사 코드·두 문서가 devel과 동일함을 대조했으며 이를 성공으로 면제하지 않는다.
아래 승인 대상에 최소 보정을 포함한다. CI/native/서명/게시 검증은 실행하지 않았다.

## 범위

### 포함

- 첫 공개 version/tag/channel·패키지·서명 정책·위험·필수 검증 책임의 재승인.
- 최신 runtime/updater를 유지한 기존 #9 변경 통합과 필요한 source 계약 검증.
- Pages의 미공개 고정 테스트를 고정 fixture와 실제 source 상태별 검사로 분리.
  unreleased, published/manifest false, published/manifest true를 모두 검증.
- 제품 경계 검사의 문서 참조·중첩 worktree 오탐을 좁게 보정하고 실제 금지 항목 검사를 유지.
- 검증한 파일을 재빌드 없이 게시하는 운영 경로, 수동 package·checksum·notes 인계 확정.
- 기존 검증 재사용 근거와 새 Linux 설정 영향, 실제 공개 bytes 검증 책임 분리.
- 준비 결과·남은 공개 gate를 공식 버전 기록과 최종 보고서에 연결한 devel 대상 PR.

### 제외

- 이번 수행계획 승인만으로 CI/native 실행·서명·Release/tag·Pages 배포·manifest 활성화.
- rhwp 갱신, 기능 확장, PDF 위험 #19의 구현, 보호 정책 #28의 일괄 구현.
- 인증서 구매·Secret/key 읽기·등록·회전, 환경 보호 설정 임의 변경.
- Windows ARM64 등 지원 확대, package repository 게시, 신규 자동 배포 시스템.
- updater negative 전체 반복, 첫 공개 전 production N → N+1 성공 주장.
- 옛 검증 이력 삭제·tag 이동·force push·기존 artifact와 새 파일의 무검증 혼합.
- 작업지시자 승인 없는 미검증 환경의 지원 성공 표시와 M010 close.

## 설계 방향

### 공개 입력 제안 — 확정은 승인 후

| 항목 | 제안 | 결정·남길 한계 |
|---|---|---|
| 앱 version / tag / 채널 | 0.1.0 / v0.1.0 / stable | 현재 updater·Pages의 stable-only 계약을 사용; prerelease 기능은 추가하지 않음 |
| 첫 공개 upstream | 현재 검증된 rhwp v0.8.4 유지 | 최신 upstream 여부는 게시 시작 시 재조회; 자동 갱신하지 않음 |
| 다운로드 | Windows x64 NSIS·MSI, Linux x64 AppImage·DEB·RPM, arm64 DEB | 6종 범위를 제안하며 미검증 배포판·GUI 한계를 명시 |
| updater | NSIS·MSI·Linux x64 AppImage 세 형식 | 동일 형식만, production 설정과 실제 파일 서명 확인 |
| 썸네일 | 현재 Windows/Linux package 통합 | AppImage 자체 등록이나 모든 file manager 지원으로 확대하지 않음 |
| Windows Authenticode | 첫 공개 미서명 허용 확정 | SmartScreen 경고 가능성을 안내하되 보호 기능 해제는 요구하지 않음; updater Minisign과 별개 |
| 공개 후보 | #9 PR merge 뒤 main 승격의 exact SHA | 이번 merge commit을 최종 tag 후보로 미리 지정하지 않음 |
| Pages | 기존 디자인 유지, 공개 데이터는 Release read-back 뒤 별도 PR | 이 준비 단계의 release.json은 unreleased/null 유지 |
| #19·암호 저장·환경 한계 | #19는 첫 공개 전 수정 확정; 나머지는 최종 파일의 최소 GUI 수용에서 판정 | #19를 #9에서 구현하지 않고 별도 작업 완료 후 후속 게시 작업 진입 |
| release 환경 / #28 | 첫 공개는 owner가 승인한 main SHA·명시 파일을 CLI로 게시; #28은 후속 분리 | 현재 자동 보호 부재를 기록하고 실제 파일 공개 승인을 다시 받음 |

### 동일 파일 게시와 불필요한 재빌드 제거

현 publish_release=true 경로는 매번 새로 빌드하며, 비게시 run 파일의 승격이나 수동
설치 대기를 보장하지 않는다. 첫 공개에는 **기존 비게시 빌드 + 검증한 파일의 승인된 CLI 게시**
운영 경로를 우선 제안한다. 새 workflow 개발을 먼저 필수화하지 않는다.

1. #9 준비 PR → devel → 별도 게시 Issue/release PR → main exact source를 확정한다.
2. 그 source에서 비게시 updater 빌드와 필요한 수동 package 빌드를 한 번씩 수행한다.
   updater 세 형식은 한 완전한 검증 run, DEB/RPM·arm64는 같은 exact source의 지정 run으로
   구분한다. 일반 build의 MSI/NSIS/AppImage로 updater 서명 파일을 대체하지 않는다.
3. 게시할 파일·서명·inventory·checksum 목록을 고정하고 해당 bytes의 설치를 확인한다.
4. 별도 공개 승인 뒤 그 파일들을 재빌드·덮어쓰기 없이 exact tag에 게시한다.
   명령·인증 주체·권한·tag 존재 검사·중단/복구 기준은 Stage 4.8에서 확정한다.
5. 원격 asset을 다시 받아 hash·서명·inventory를 대조한 뒤 Pages/manifest 단계로 간다.

CLI 게시 운영안이 승인되지 않거나 보호 정책과 맞지 않으면 게시하지 않는다.
필요한 workflow 변경은 별도 승인 범위로 분리하며 기존 publish 옵션으로 우회하지 않는다.
checksum 도구는 installer만 지원하므로 .sig/inventory를 섞어 실행하지 않는다.
공개 전체 asset의 hash 목록은 검토한 명시 파일 목록으로 생성·대조하는 방법을 확정한다.
과거 #9 candidate 파일 재사용 금지는 유지한다. 새 최종 source의 비게시 파일을 검증 후
그대로 게시하는 것이며, 옛 candidate를 공개 산출물로 바꾸는 것이 아니다.

### 준비와 공개 검증의 책임 분리

준비 중에는 바뀐 source/config/test 계약만 검증한다. 최종 main/tag에서 다시 만들 파일을
미리 반복 생성하지 않는다. 실제 공개 파일의 Gate 2~3 설치·서명·무결성은 후속 게시 작업에서
반드시 수행한다. 이를 #9에서 이미 통과했다고 쓰거나 나중 updater 시험으로 미루지 않는다.

수동 package의 실제 지원 환경·필수 설치 확인을 확보하지 못하면 owner에게 범위 축소 또는
추가 검증을 요청한다. Ubuntu RPM transaction을 Fedora GUI, x64를 arm64 GUI로 대체하지 않는다.
미검증 한계 문구만 붙여 필수 설치 실패를 허용하지 않는다.

### Pages와 제품 경계 테스트

Pages 보정은 공개 전에 준비 PR으로 반영하되 release data는 미공개 상태로 유지한다.
현 source를 복사한 fixture가 release 상태에 따라 깨지는 구조를 분리하고,
미공개 fail-closed와 published/manifest true·false, 불완전 inventory 거부를 보존한다.
Gate 5 공개 데이터 PR에서는 같은 검사를 실제 입력으로 다시 확인한다.

제품 경계는 출처·비교 참조를 Windows/Linux 외 제품 지원으로 오인하지 않도록
정확한 문구/참조 경계만 허용한다. docs 전체를 제외하거나 금지 정규식을 제거하지 않는다.
다른 Git worktree는 제품 source가 아니므로 명확한 중첩 worktree 경계만 제외하며,
그 폴더를 삭제·이동하거나 다른 작업자의 내용을 수정하지 않는다.

## 문서 위치 판단

#54가 승인한 docs/와 site/의 책임을 유지하고 운영 정책을 새로 복제하지 않는다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| docs/operations/PUBLIC_RELEASE_RUNBOOK.md | 공식 실행 가이드 | 릴리즈 담당 | docs/operations/ | mydocs/manual/ | 승인된 동일 파일 게시 경로·재개 지점의 지속 기준 |
| docs/operations/DESKTOP_RELEASE.md·RELEASE_CHECKLIST.md | 공식 정책·최소 검증 | 릴리즈 담당 | docs/operations/ | 버전 기록 | 현 정책 보존, 필요한 좁은 참조·명령 정합성만 보정 |
| docs/releases/v0.1.0.md | 특정 버전 준비·인계 | 사용자/릴리즈 담당 | docs/releases/ | 작업 최종 보고 | 공개 입력·실행 상태·한계의 공식 기록 |
| docs/DEVELOPMENT.md | 도구 사용 설명 | 기여자 | docs/ | 루트 README | 기존 checksum 명령과 일반/updater 산출물 차이 설명 |
| mydocs/plans·working·report | 계획·단계·결과 | 내부 작업자 | mydocs/ | 공식 운영 가이드 | 특정 Task의 승인·검증 이력, 공개 완료와 구분 |
| site/release.json | 공개 다운로드·manifest 입력 | 사용자/앱 | site/ | 문서/환경 변수 | 기존 진실 원천 유지; 수정은 후속 공개 데이터 PR |

## 예상 변경 파일

복구 통합: Tauri config·linux/main.desktop, package.json, release metadata 검사/테스트,
checksum script/테스트, Linux desktop entry 테스트, DEVELOPMENT와 과거 #9 문서.
updater overlay·runtime·pin·workflow 자체 변경은 이번 계획에 포함하지 않는다.

후속 최소 보정:
- tests/pages.test.mjs 및 필요 시 tests/fixtures/ 아래 상태별 fixture.
- scripts/check-product-boundary.mjs·tests/product-boundary.test.mjs.
- 위 문서 위치 표의 공식 문서 중 실제 승인·명령·기록 변화가 있는 파일만.
- GitHub #9 제목/본문의 옛 prerelease·updater 제외·검증 책임은 계획 승인 뒤 정렬.

이번 Task 산출물:
- mydocs/orders/20260904.md
- mydocs/plans/task_m010_9.md, 승인 후 기존 task_m010_9_impl.md 보정
- mydocs/working/task_m010_9_stage4_8.md, task_m010_9_stage4_9.md, task_m010_9_stage5.md
- mydocs/report/task_m010_9_report.md

## 잠정 단계

과거 Stage 1~4.7은 재실행·덮어쓰기하지 않고 남은 세 단계만 재정의한다.

- **Stage 4.8 — 공개 계약·게시 경로·최소 검증 확정**
  - version/channel/패키지/미서명·known risk·보호 조건과 동일 파일 게시 운영안 확정.
  - 기존 증거 재사용, 새 Linux 설정 영향, 후속 실제 bytes 검증 책임표 작성.
  - 승인 후 GitHub 이슈·공식 실행 가이드/버전 기록을 필요한 범위만 정렬.
- **Stage 4.9 — 공개 전환에 필요한 최소 검사 보정**
  - Pages 고정 fixture/상태별 계약과 제품 경계 오탐 보정. 공개 입력·runtime는 유지.
  - 관련 테스트·Pages build/check·source 경계 검사, diff/링크 검증.
- **Stage 5 — 준비 Go/No-Go와 게시 작업 인계**
  - 미결정 입력·실패·검사 누락이 없을 때 준비 Go, 남으면 No-Go와 담당/재개 조건.
  - #9 최종 보고·devel PR 후 별도 게시 Issue로 main/tag·최종 파일·공개 승인을 인계.
  - 실제 installer 수용과 production 게시 상태는 미실행으로 남긴다.

## 검증 계획

### 단계별 검증

- 수행계획 보정: 병합 부모/원격 ref 보존, 변경 범위, 필수 섹션·링크·diff 검사.
  기존 경계 실패는 보정 계획에 남기며 전체 검증 성공으로 기록하지 않는다.
- Stage 4.8: 원격 공개 상태·승인 환경 조회, 문서 명령과 실제 workflow/CLI 옵션 대조,
  package/서명/manifest 역할·확정값·미결정 risk 확인. 원격 write는 #9 제목/본문 정렬만;
  릴리즈·설정 변경과 서명 dispatch는 없음.
- Stage 4.9: pnpm exec node --test로 pages, updater-release, actions-workflows,
  product-boundary 및 변경된 회귀 테스트만 실행. pnpm run build:pages / check:pages,
  check:product-boundary / check:product-version / check:release-metadata / check:rhwp-pin.
  제품 경계 negative와 공개 상태별 테스트를 삭제·skip하여 통과시키지 않는다.
- Stage 5: 준비 산출물·승인·후속 Issue 입력 대조, 최종 diff/링크와 미공개 상태 확인.
  native 실행은 새 영향으로 꼭 필요하다는 근거와 별도 승인 없이는 추가하지 않는다.

### 통합 검증

- 기존 #9 이력과 최신 제품 기능·pin·updater 신뢰 설정을 보존한다.
- Pages 실제 source와 고정 fixture가 unreleased/두 published 상태를 정확히 구분한다.
- 제품 경계 오탐은 해소되고 실제 금지 runtime/지원 플랫폼 검사는 계속 실패한다.
- 동일 bytes의 검사 → 승인 → 게시 → read-back 방법이 명확하고 재빌드 우회가 없다.
- 공개 대상 6종과 updater 3종·manual 3종, 소스별 provenance·설치 책임이 추적된다.
- 후속 실제 공개에는 최종 bytes의 설치·파일 열기/저장/재열기·서명·hash 확인이 남는다.
  Linux DEB/RPM·arm64의 launcher 변경은 해당 package/file association gate에서 확인한다.
- 공개 전 수정되는 site/release.json, manifest, tag/Release가 없다.
- PR 준비 전 git status --short가 비고, git diff --check가 통과한다.

## 리스크

- **옛 기준의 재유입**: 기존 impl/Stage 보고는 역사 기록이다. 수행·구현계획 재승인 전 실행하지 않는다.
- **검사 실패 은폐**: product-boundary의 기존 실패도 후속 준비 Go 전 해소한다. 다른 worktree는 보존한다.
- **위험 수용 누락**: #19·암호 저장·RPM/arm64 GUI·환경 보호 결정은 별도 명시 항목이며 자동 면제하지 않는다.
- **미서명 오인**: Minisign은 Authenticode가 아니다. unsigned 허용 여부와 사용자 경고를 확정한다.
- **서로 다른 bytes 혼합**: 동일 SHA라도 재빌드 결과를 같은 파일로 간주하지 않는다.
- **검증 과소/과다**: Linux launcher 변경은 재확인하되 무관한 updater negative 전체는 반복하지 않는다.
- **범위 확장**: CLI 게시로 해결 불가하면 새 workflow 구현 승인부터 받는다. 이 계획만으로 배포하지 않는다.
- **파일 상한**: 복구한 metadata checker는 기존 두 계약 통합으로 304 LOC다. 이번 병합은 불필요한
  모듈 재구성 없이 보존하며 추가 확장이 필요하면 구현계획에서 분리를 검토한다.

## 승인 요청 사항

- stable v0.1.0·현재 rhwp v0.8.4·6종 다운로드·3종 updater와 현재 썸네일을 기본안으로 삼는 범위.
- Windows unsigned 공개 제안, 환경별 한계·#19 등 위험은 Stage 4.8에서 별도 명시 판단하는 방식.
- 비게시 최종 빌드 파일을 검증 후 그대로 CLI 게시하는 경로를 우선 구체화하고, 실제 실행은 별도 승인.
- #9는 준비 PR까지, main/tag·최종 bytes 수용·Release/Pages/manifest는 후속 게시 Issue로 분리.
- Pages 테스트와 제품 경계 오탐의 최소 보정 및 위 문서 위치 판단.
- 남은 Stage 4.8 → 4.9 → 5와 영향 기반 최소 검증; 수행계획 승인 뒤 구현계획을 먼저 보정.

2026-09-04 작업지시자가 수행계획에 따른 구현계획 보정을 승인했다. 공개 승인이나 위험
수용은 아니며, 구현계획서의 단계·명령·커밋 승인 전에는 다음 구현 단계에 진입하지 않는다.
