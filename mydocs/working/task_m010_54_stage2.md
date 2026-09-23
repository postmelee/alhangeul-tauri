# Task #54 Stage 2 보고서 — 공개 실행 가이드와 최소 검증 체크리스트

GitHub Issue: [#54](https://github.com/postmelee/alhangeul-tauri/issues/54)
구현계획서: [task_m010_54_impl.md](../plans/task_m010_54_impl.md)
Stage: 2
작성일: 2026-09-04
작업 브랜치: `local/task54`
시작 commit: `9e8ffd0` — Stage 1 완료
진행 승인: Stage 1 보고 뒤 작업지시자의 “진행해줘”

## 단계 목적

정책·버전별 기록을 실제 운영 순서로 연결한다. 각 gate의 입력·현재 명령·기대 결과·근거·
승인·중단·재개 위치와 변경 영향별 최소 검증을 명시한다. 문서 검증만 수행하며 실제 CI·
서명·Release·Pages·updater 활성화는 하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| [PUBLIC_RELEASE_RUNBOOK.md](../../docs/operations/PUBLIC_RELEASE_RUNBOOK.md) | 신규 286줄; Gate 0~7, 현재 명령·공개 경계·실패 재개 |
| [RELEASE_CHECKLIST.md](../../docs/operations/RELEASE_CHECKLIST.md) | 신규 124줄; 기본 확인·영향 선택·첫/다음 공개 구분 |
| [DESKTOP_RELEASE.md](../../docs/operations/DESKTOP_RELEASE.md) | 218줄; 새 실행/검증 진입 링크 |
| [릴리즈 인덱스](../../docs/releases/README.md) | 49줄; 새 문서 역할 연결 |
| [v0.1.0 준비 기록](../../docs/releases/v0.1.0.md) | 164줄; 가이드·체크리스트 링크만 추가 |
| [release_record.md](../_templates/release_record.md) | 138줄; gate·검증 선택 기준 연결 |
| [수행계획서](../plans/task_m010_54.md)·[구현계획서](../plans/task_m010_54_impl.md) | Stage 2 승인·완료와 Stage 3 승인 대기 |
| [오늘할일](../orders/20260904.md) | 기존 M010 행의 단계 상태 갱신, Task는 진행중 |
| 이 보고서 | 실제 문서 검증과 미실행·잔여 위험 기록 |

총 10개 문서다. README·개발 문서·템플릿 인덱스 및 최종 #9 인계 정렬은 Stage 3에 남겼다.

## 본문 변경 정도 / 본문 무손실 여부

- runbook·체크리스트는 승인된 `docs/operations/`에 새로 작성했다. 중앙 기록 양식과 공식
  릴리즈 기록의 역할을 바꾸거나 framework manual에 제품 문서를 추가하지 않았다.
- Stage 1 문서는 예정 문구를 실제 진입 링크로 교체하고 기존 정책·과거 증거·공개 상태를
  보존했다. v0.1.0은 여전히 준비 중이며 candidate·채널·공개 시각은 승인되지 않았다.
- 과거 증거 원문 링크와 Task #14/#17/#24/#50/#16의 결과·제한을 수정하지 않았다.
- 앱·workflow·script·test·site·설정·Secret·upstream pin은 변경하지 않았다.

## 검증 결과

구현계획 Stage 2 명령을 그대로 실행했다. 아래 `rg`는 원문 위치 추출이며 실행 검증이 아니다.

```bash
git diff --check
rg -n 'workflow_dispatch|build_ref|run_tests|release_version|release_tag|release_notes|publish_release|permissions:|environment:|WORKFLOW_SHA|gh release create' .github/workflows/alhangeul-desktop.yml
rg -n 'deploy_ref|WORKFLOW_SHA|environment:|permissions:|pnpm|node --test' .github/workflows/pages.yml
rg -n 'check:|build:pages|test:updater|test:studio|test:upstream' package.json
rg -n 'stable|SEMVER|signature|sha256|inventory|manifestPublished' scripts/pages/release-data.mjs scripts/updater/release-inventory.mjs
wc -l docs/operations/PUBLIC_RELEASE_RUNBOOK.md docs/operations/RELEASE_CHECKLIST.md
```

결과: 6개 명령 모두 exit 0. `git diff --check` 출력 없음. 신규 문서 286/124줄.
추출 위치에서 workflow job 본문과 script 인자 처리·검증 함수를 읽고 다음과 같이 대조했다.

| 항목 | 원문 근거 | 문서 반영·판정 |
|---|---|---|
| dispatch 입력 | [desktop workflow](../../.github/workflows/alhangeul-desktop.yml) inputs | `mode`, exact `build_ref`, `run_tests`, version/tag/notes, `publish_release`만 실제 입력으로 사용 |
| updater source·서명 | 같은 workflow `build-updater` | workflow SHA=build_ref=checkout, stable version, tracked overlay, release 환경; Secret 사용과 공개 승인 분리 |
| 일반 build와 updater | 같은 workflow `build`, `windows-installer-smoke` | updater에서 `run_tests=true`로 일반 전체 suite를 실행한다는 설명 없음 |
| complete inventory | 같은 workflow `verify-updater-release` | 두 slice와 `alhangeul-updater-release-inventory` artifact, 필수 job/upload 성공 확인 |
| 게시 경로 | 같은 workflow `publish-updater` | 같은 run의 installer 3+sig 3+inventory 1; 재빌드, draft/prerelease·과거 run 승격·수동 package 입력 없음 |
| 일반 archive 검사 | [verify-desktop-artifacts.mjs](../../scripts/verify-desktop-artifacts.mjs) | 실제 `--platform/--root/--verify-inventory` 지원, 내부 경로·verification 파일 유지 |
| updater 파일 검사 | [release-inventory.mjs](../../scripts/updater/release-inventory.mjs), [artifact-verifier.mjs](../../scripts/updater/artifact-verifier.mjs) | root/version/tag/source-sha/public-key-env 지원, 실제 bytes 서명 검증과 기존 inventory field 대조 분리 |
| product·pin | [release metadata](../../scripts/check-release-metadata.mjs), [rhwp pin](../../scripts/verify-rhwp-pin.mjs), package scripts | 공개키/endpoint, root product version, Stable tag+commit·vendor hash 정합성 확인 위치 연결 |
| Pages 실행 | [pages.yml](../../.github/workflows/pages.yml) | exact devel SHA/workflow/deploy_ref, github-pages 환경, build/check/3개 계약 test 및 upload/deploy |
| 데이터·manifest | [release-data.mjs](../../scripts/pages/release-data.mjs), [manifest.mjs](../../scripts/updater/manifest.mjs), [build-pages.mjs](../../scripts/build-pages.mjs) | stable-only·3 target·manifest false/null 또는 true/complete inventory, 로컬 구조 검사는 remote read-back 아님 |
| 시험 전용 도구 | [verify-acceptance-release.mjs](../../scripts/updater/verify-acceptance-release.mjs) | 승인된 시험 tag·prerelease=true 강제; production 검증기로 사용하지 않도록 명시 |

추가 문서 검사:

- 로컬 `gh workflow run`, `gh run download/view`, `gh release view/download`의 `--help`로
  문서에 사용한 ref·입력·이름·dir·JSON field 옵션을 확인했다. 원격 dispatch·다운로드는 안 했다.
- 저장소 파일을 읽는 일회성 Node 명령으로 제품 문서 6개를 검사했다. 상대 링크·앵커
  **73개** 유효, Bash 예제 **11개**는 `bash -n`만 통과, `pnpm run` 참조 **8개** 모두 존재.
- 같은 검사에서 6개 문서의 300 LOC 이내·끝 개행·trailing whitespace 없음 확인.
- `site/release.json`은 `unreleased`, `manifestPublished=false`임을 읽기 전용으로 확인.
- 기존 7개 파일 diff는 링크·진행 상태만 변경했으며 신규 파일은 runbook·체크리스트·보고서다.
- 보고서 작성 후 전체 10개 문서의 상대 링크·앵커 **104개**, 300 LOC 이내, 보고서 필수
  7개 섹션·오늘할일 M010/진행중 형식과 승인된 파일만의 변경 범위를 재검사해 통과했다.

문서의 shell 예제를 실행하거나 실제 installer/manifest를 검증한 결과가 아니다. source 대비
명령·입력·권한·기대 산출물·실패 경계를 확인한 결과다. 전체 native/GUI/negative suite,
Studio build, Pages build·배포, Release·tag 생성, production 업그레이드는 모두 미실행이다.
환경 정책의 날짜 있는 확인값은 Stage 1 조회 근거를 사용했고 이번 단계에 재조회·변경하지 않았다.

## 잔여 위험

- 현재 workflow는 비게시 후보를 그대로 승격하지 않는다. 게시할 동일 bytes의 설치 확인을
  보장하는 승인된 운영 경로 또는 별도 구현이 미정이면 runbook Gate 3에서 멈춰야 한다.
  required reviewer 존재가 build 이후 별도 수동 대기를 보장한다고 문서화하지 않았다.
- 첫 공개 #9의 prerelease 목표와 현재 stable-only updater/Pages 사이의 결정, 수동 package
  게시 경로, 실제 후보·서명 정책·환경 보호 및 #19 위험 판단은 공개 작업으로 인계한다.
- 기존 inventory를 자동 비교하는 production read-back CLI는 없다. 기존 서명 CLI와 exact
  Release 조회·원격 bytes의 hash/크기·inventory field 대조를 분리했고 새 도구는 추가하지 않았다.
- 첫 공개의 같은 version 확인과 시험 endpoint 수용은 실제 production N→N+1이 아니다.
  첫 공개 설치본 보존과 다음 실제 공개 후 MSI/NSIS/AppImage 각각의 전환 확인이 남는다.
- historical GUI·배포판·architecture·printer 한계를 넓혀 해석하지 않는다. 새 파일에는 이전
  무결성·서명·설치 결과를 승계할 수 없다.

## 다음 단계 영향

- Stage 3에서는 README·docs 인덱스·개발 안내·템플릿 인덱스를 새 진입점으로 정렬한다.
- v0.1.0의 #9 인계 항목을 확정하고 첫 공개/다음 공개/서명 실패/Release 후 Pages 실패/
  manifest 게시 후 결함의 5개 walkthrough를 문서만으로 점검한다. 이번 단계에서는 수행하지 않았다.
- 완료 후에도 최종 보고·PR 게시 승인을 별도로 요청한다. 문서 merge는 실제 릴리즈 승인이 아니다.

## 승인 요청

- Stage 2 산출물·문서 검증을 검토하고 Stage 3 진입점 정렬·walkthrough 검증 진행을 승인받는다.
- `task-stage-report`에 따라 단계 산출물과 이 보고서를 한 커밋으로 묶고 다음 승인까지 멈춘다.
