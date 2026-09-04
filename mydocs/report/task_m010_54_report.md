# Task #54 최종 보고서 — Windows/Linux 릴리즈 운영 문서와 기록 체계

GitHub Issue: [#54](https://github.com/postmelee/alhangeul-tauri/issues/54)
마일스톤: M010
작성일: 2026-09-04
작업 브랜치: `local/task54` → 게시 브랜치 `publish/task54`, PR base `devel`
시작 기준: `10c8c9aedb2b72436896ea3296b5200aa88793a7`
최종 보고·PR 게시 승인: Stage 3 보고 뒤 작업지시자의 “진행해줘”

## 작업 요약

- 대상 이슈: #54, 마일스톤 M010, 완료 단계 3개.
- 정책·실행 가이드·최소 체크리스트·버전별 기록·양식을 분리하고 README부터 연결했다.
- macOS 저장소의 반복 운영 구조를 참고하되 Windows/Linux의 실제 workflow·서명·updater
  계약에 맞췄다. macOS 패키징·Sparkle·Homebrew 명령이나 제품 문서 경로를 복제하지 않았다.
- 첫 공개 → 별도 rhwp 갱신 → 다음 앱 공개 → 세 형식의 실제 updater 확인 순서를 문서화했다.
  이번 완료는 문서 Task의 완료이며 릴리즈 Go/No-Go나 production 업데이트 성공이 아니다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `README.md` | 현재 기능·미공개 상태와 운영 문서 진입점 | 제품 개요 |
| `docs/README.md` | 읽는 순서·운영/기록 디렉터리 구조 | 공식 문서 탐색 |
| `docs/DEVELOPMENT.md` | 과거 미구현 표현·증거 위치 최소 보정 | 개발 안내; 명령 변경 없음 |
| `docs/operations/DESKTOP_RELEASE.md` | 반복 정책·지원/서명/승인 경계 | 제품 배포 정책 |
| `docs/operations/PUBLIC_RELEASE_RUNBOOK.md` | Gate 0~7 입력·명령·중단·재개 | 승인 후 실행할 walkthrough |
| `docs/operations/RELEASE_CHECKLIST.md` | 기본·영향별 검증과 근거 재사용 | 검증 비용·수용 한계 |
| `docs/releases/README.md` | 버전별 준비/공개 상태 인덱스 | 공식 릴리즈 기록 |
| `docs/releases/v0.1.0.md` | 준비 상태·기존 근거·결정·#9 인계 | 첫 공개; 미공개 유지 |
| `mydocs/_templates/release_record.md` | 식별자·영향·산출물·승인·복구 양식 | 다음 릴리즈 재사용 |
| `mydocs/_templates/README.md` | 새 양식과 실제 출력 위치 연결 | 템플릿 탐색 |
| `mydocs/plans/task_m010_54.md` | 범위·문서 위치·승인 이력 | 수행계획 |
| `mydocs/plans/task_m010_54_impl.md` | 3개 단계·검증·의존성·승인 | 구현계획 |
| `mydocs/working/task_m010_54_stage1.md` | 원문 대응표·정책/기록 검증 | Stage 1 근거 |
| `mydocs/working/task_m010_54_stage2.md` | 명령·workflow 계약 대조 | Stage 2 근거 |
| `mydocs/working/task_m010_54_stage3.md` | 진입점·5개 모의 점검·인계 | Stage 3 근거 |
| `mydocs/orders/20260904.md` | #54 완료·완료 시각 | 당일 작업 보드 |
| `mydocs/report/task_m010_54_report.md` | 수용 기준·통합 결과·잔여 결정 | 이 최종 보고서 |

총 17개 Markdown 파일이다. 앱·test·script·workflow·package/lock·upstream pin·site 데이터,
환경·Secret은 변경하지 않았다. 다른 Task의 계획·보고서·브랜치도 수정하지 않았다.

## 문서 위치 검증

[수행계획의 문서 위치 판단](../plans/task_m010_54.md#문서-위치-판단)과 diff를 대조했다.

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 정책·runbook·체크리스트 | `docs/operations/` | 동일 | OK | 승인된 세 파일 |
| 인덱스·v0.1.0 기록 | `docs/releases/` | 동일 | OK | 제품 기록, Task 보고서와 분리 |
| 기록 양식·양식 인덱스 | `mydocs/_templates/` | 동일 | OK | 실제 기록 폴더에 양식을 두지 않음 |
| 제품/문서 README·개발 안내 | 기존 root·`docs/` | 동일 | OK | 새 개요 문서·공식 루트 없음 |
| #54 계획·단계·최종 보고·오늘할일 | `mydocs/plans/`, `working/`, `report/`, `orders/` | 동일 | OK | 승인된 Task 파일명·역할 |

`mydocs/manual/`로 제품 문서를 옮기지 않았으며 `site/`의 사용자용 릴리즈 노트도 변경하지 않았다.

## 변경 전·후 정량 비교

비교 기준은 시작 commit이다. 문서 분리는 총량 감소가 아니라 책임·탐색·반복 실행 기준의 정비다.

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 단일 배포 정책 문서 | 565줄, 반복 정책·과거 결과 혼재 | 218줄, 반복 정책과 링크 중심 |
| 전용 공개 walkthrough / 체크리스트 | 없음 / 없음 | 290줄 / 124줄 |
| 공식 버전 기록 인덱스 / 첫 버전 기록 | 없음 / 없음 | 49줄 / 192줄, 준비 상태 |
| 재사용 릴리즈 기록 양식 | 없음 | 138줄, 준비/공개 후 필수 항목 구분 |
| 원문 역사적 근거 | 565줄·제목 23개·고유 SHA/digest 69개 | 14개 연속 원문 구간과 원본 보고서로 추적 유지 |
| 문서상 정상·실패 walkthrough | 별도 수용표 없음 | 5개 상황의 시작·정지·재개·기록 경로 확인 |
| Task 변경 / 비문서 변경 | 해당 없음 | Markdown 17개 / 0개 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 정책·실행·검증 선택·버전 기록 역할 분리 | OK — 공식 진입점과 양식·기록 출력 위치 연결 |
| 과거 증거와 현재 공개 상태 구분 | OK — 원문 링크 불변, 565줄 전체 연결; v0.1.0은 준비 상태 |
| 실제 구현과 명령 정합성 | OK — Stage 2에서 workflow 입력·권한·script 인자·산출물 대조, 없는 승격 기능은 중단 조건 |
| 최소 검증·재사용 기준 | OK — source 근거와 새 bytes 검증 분리, 문서-only 전체 native/negative 재실행 금지 |
| 첫 공개·다음 공개·실패 인계 | OK — 5개 모의 점검과 #9의 9개 결정·승인·중단 지점 |
| 승인된 문서 위치·변경 경계 | OK — 문서 17개, 제품 코드·workflow·site·pin 변경 0개 |
| 링크·양식·길이·예제 문법 | OK — 상대 경로/앵커·reference 정의, 필수 섹션·300 LOC 목표·Bash 문법 확인 |
| 실제 미실행·미승인 작업 표시 | OK — 릴리즈·배포·native·production N→N+1을 성공으로 기록하지 않음 |

통합 검증은 구현계획의 마지막 Stage 명령으로 수행했다.

```bash
git diff --check
git diff --name-status 10c8c9aedb2b72436896ea3296b5200aa88793a7 --
rg -n '\]\([^)]*\)' README.md docs/README.md docs/DEVELOPMENT.md docs/operations/*.md docs/releases/*.md mydocs/_templates/release_record.md
wc -l README.md docs/README.md docs/DEVELOPMENT.md docs/operations/DESKTOP_RELEASE.md docs/operations/PUBLIC_RELEASE_RUNBOOK.md docs/operations/RELEASE_CHECKLIST.md docs/releases/*.md mydocs/_templates/release_record.md
```

- 위 명령 모두 exit 0; `rg` 115개 해당 행은 링크/앵커 검사와 함께 대조했다.
- 최종 보고 작성 전 16개 문서의 상대 링크/앵커 179개·reference 사용 19개를 확인했다.
  최종 보고·계획 링크·완료 상태 작성 후에는 17개 문서의 상대 링크/앵커 186개·reference
  사용 19개와 최종 보고 필수 7개 섹션·오늘할일 완료 시각을 다시 검사해 통과했다.
- 일회성 읽기 전용 Node 검사로 승인 경로·링크·앵커·공백·마지막 개행·길이를 확인했다.
  모든 변경 문서가 300 LOC 이내이며 가장 긴 파일은 runbook 290줄이다.
- runbook의 Bash 예제 11개는 `bash -n`만 수행했다. 예제의 배포 명령은 실행하지 않았다.
- Stage 1 commit 대비 원문 reference 정의 불변, 14개 구간의 연속성·565줄 전체 포함을 확인했다.
- `site/release.json`은 `unreleased`, `manifestPublished=false`다. 원격 조회는 2026-09-04
  최종 보고 시 #54 OPEN/M010, 기존 task54 PR·원격 게시 브랜치 없음, `devel` 시작 SHA 불변을 확인했다.
- 최종 커밋·PR 게시 후에는 clean worktree와 Open/non-draft·base/head·본문 고정 SHA 링크를 확인한다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_54_stage1.md), `9e8ffd0`: 원문 절별 대응·보존, macOS 참고 SHA,
  현재 workflow·릴리즈/환경의 날짜 있는 조회와 미공개 경계를 기록했다.
- [Stage 2](../working/task_m010_54_stage2.md), `76c1050`: 명령·입력·권한·산출물의 source 대조,
  stable-only·재빌드 게시·수동 패키지·inventory 비교의 미구현/수동 경계를 확인했다.
- [Stage 3](../working/task_m010_54_stage3.md), `5668244`: 진입점·현 상태 문구·#9 인계와 5개
  모의 점검을 완료했다. 미게시 feed, Pages 실패 후 실제 상태 확인, 첫 공개 복구 조건을 보완했다.

### 검증 한계

새 native/GUI/negative test, Studio·Pages build, 서명·artifact 다운로드, 실제 Release read-back,
Actions dispatch·Release/tag·Pages/manifest 게시와 production N→N+1 시험은 수행하지 않았다.
문서-only Task에는 필요하지 않으며 과거 수용 결과를 이번의 새 실행 성공으로 재표기하지 않았다.
링크 검사는 저장소 상대 링크·앵커·고정 원문 근거 중심이며 모든 외부 URL 가용성 시험은 아니다.

## 잔여 위험과 후속 작업

### 잔여 위험

- #9의 기존 prerelease/updater 제외 계획은 현재 요청 및 stable-only 구현과 다르다.
  version/tag·candidate·채널과 rhwp v0.8.4 유지 판단을 공개 전에 재승인해야 한다.
- `publish_release=true`는 새 build 뒤 게시한다. 동일 bytes의 사전 설치 확인을 보장하는
  승인된 운영 경로나 별도 구현이 없으면 공개를 진행하지 않는다. 문서화로 해결된 것이 아니다.
- DEB/RPM·arm64는 updater publish의 7개 asset에 포함되지 않는다. 실제 공개 범위와
  checksum·게시/안내 경로는 따로 확정해야 한다.
- Windows Authenticode/미서명 안내, release 환경 허용 ref·승인자와 #28 보호 조건은 owner 판단이다.
  updater Minisign 검증이 Authenticode 서명을 대체하지 않는다.
- #19 PDF revision/stale job 위험, 암호 저장 GUI·배포판/architecture 한계는 수정 또는 명시
  수용·안내가 필요하다. 모든 열린 이슈의 종료를 일괄 릴리즈 선행 조건으로 삼지는 않는다.
- 과거 artifact의 보존 기간과 production 실제 업데이트 미실행은 계속 남는다.

### 후속 작업 후보

1. 이 PR의 리뷰·merge 승인 후 `pr-merge-cleanup` 절차로 #54 정리 및 `devel` 복귀.
2. [첫 공개 #9 인계](../../docs/releases/v0.1.0.md#첫-공개-작업-9-인계)로 공개 범위·위험·
   필요한 검증만 재승인. 동일 bytes 게시/수동 패키지 경로에 구현이 필요하면 별도 Issue로 분리.
3. 첫 공개 설치본 3종을 보존하고 별도 Tauri Task에서 rhwp Stable tag·resolved commit과
   core·Studio·WASM을 갱신. macOS PR #491은 참고이며 직접 병합 대상이 아니다.
4. 다음 앱 버전 공개 후 NSIS→NSIS, MSI→MSI, Linux x64 AppImage→AppImage의 실제
   production 업데이트·재실행·버전을 확인. `0.1.1`은 승인 전 제안값이다.

## 작업지시자 승인 요청

- 이번 지시로 최종 보고와 `publish/task54` push·`devel` 대상 Open PR 게시를 진행한다.
- 최종 보고·문서 diff를 검토한 뒤 PR merge 승인을 요청한다. self-merge·#54 close는 하지 않는다.
- 실제 릴리즈·배포·서명·updater 활성화·upstream 갱신은 각각의 후속 승인 작업으로 유지한다.
