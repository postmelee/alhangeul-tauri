# Task #54 Stage 3 보고서 — 릴리즈 문서 진입점과 walkthrough 인계

GitHub Issue: [#54](https://github.com/postmelee/alhangeul-tauri/issues/54)
구현계획서: [task_m010_54_impl.md](../plans/task_m010_54_impl.md)
Stage: 3
작성일: 2026-09-04
작업 브랜치: `local/task54`
시작 commit: `76c1050` — Stage 2 완료
승인: Stage 2 보고 뒤 작업지시자의 “진행해줘”

## 단계 목적

README부터 정책·실행 가이드·체크리스트·버전 기록에 도달하는 경로를 정렬하고, 첫 공개
작업 #9가 받아야 할 입력과 승인·검증 경계를 확정한다. 정상/실패 5개 상황을 문서로 따라가
작업자가 시작·중단·재개·기록 위치를 판단할 수 있는지 확인한다. 실제 배포를 수행하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| [README.md](../../README.md) | 77줄; 현재 기능·공개 상태 보정, 릴리즈 문서와 첫 공개 인계 진입점 |
| [docs/README.md](../../docs/README.md) | 44줄; 읽는 순서·디렉터리 구조에 updater·운영 문서·릴리즈 기록 추가 |
| [DEVELOPMENT.md](../../docs/DEVELOPMENT.md) | 273줄; 오래된 미구현/수용 전 문구와 증거 위치·관련 링크만 정렬 |
| [템플릿 인덱스](../_templates/README.md) | 59줄; release_record 형식과 실제 docs/releases 출력 위치 안내 |
| [v0.1.0 준비 기록](../../docs/releases/v0.1.0.md) | 192줄; #9의 9개 입력·결정·승인 주체·중단 지점과 후속 순서 |
| [PUBLIC_RELEASE_RUNBOOK.md](../../docs/operations/PUBLIC_RELEASE_RUNBOOK.md) | 290줄; 모의 점검에서 발견한 미게시/실패/첫 공개 복구 조건 보완 |
| [RELEASE_CHECKLIST.md](../../docs/operations/RELEASE_CHECKLIST.md) | 124줄; 위 미게시·실패 판정과 정합성 유지 |
| [수행계획](../plans/task_m010_54.md)·[구현계획](../plans/task_m010_54_impl.md) | Stage 3 승인·완료, 최종 보고·PR 게시 승인 대기 |
| [오늘할일](../orders/20260904.md) | M010의 #54는 진행중 유지, Stage 1~3 완료 기록 |
| 이 보고서 | 문서 대조·모의 진행·검증 결과와 공개 전 잔여 결정 |

이번 단계는 11개 Markdown 파일이다. Task #54 전체는 baseline 대비 16개 문서이며
앱·site·workflow·script·test·pin·Secret·환경 설정은 변경하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

- README의 과거 ‘#15 인쇄 제외’, 개발 문서의 ‘저장 native 수용 전/외부 변경 감지 없음/
  updater 준비 안 됨/#24 진행 중’을 현재 source·기존 수용 보고서와 대조해 보정했다.
- Windows thumbnail VDI 대표 수용과 모든 DPI·제3자 조합 수용을 구분했다. MSI 전체 GUI,
  Linux arm64/Fedora GUI와 physical printer 등 미검증 환경을 성공으로 확대하지 않았다.
- 개발 명령·build/script 인터페이스·upstream pin은 변경하지 않았다. 개요의 상세 증거는
  버전 기록과 기존 아키텍처로 연결하고 반복 복제를 줄였다.
- Stage 1의 고정 원문 링크·역사적 절 대응표, Stage 2 보고서, 다른 Task 문서는 그대로다.
  고유 SHA/digest의 보존이 실제 binary archive의 영구 보존을 뜻하지 않는다는 경계도 유지했다.
- 템플릿과 실제 산출물 위치는 기존 승인 경로를 사용했다. 새 운영 경로나 Skill은 만들지 않았다.

### 현재 상태 문구의 근거

| 보정한 주장 | 대조 근거·범위 |
|---|---|
| 인쇄·형식별 저장 수용 전 | [#24 결과](../report/task_m010_24_report.md)의 Windows NSIS·Linux x64 DEB 대표 GUI/PDF/인쇄; 새 파일 수용과 별개 |
| 외부 파일 변경 감지 없음 | [state.rs](../../apps/desktop/src-tauri/src/state.rs)의 commit 전 검사와 [desktop-persistence.ts](../../apps/studio-host/src/core/desktop-persistence.ts)의 덮어쓰기 확인; 구현 확인이며 새 GUI test 아님 |
| Windows 시각 수용 없음 | [#14 결과](../report/task_m010_14_report.md)의 Stage 6.1 VDI와 final source 재사용 근거; 모든 DPI/보기 크기 보증 아님 |
| updater/서명 준비 안 됨 | [updater 아키텍처](../../docs/architecture/UPDATER.md)와 [기존 수용 목록](../../docs/releases/v0.1.0.md#기존-검증-근거); 시험용 수용과 production 미공개 구분 |

## 검증 결과

구현계획 Stage 3 명령:

```bash
git diff --check
git diff --name-status 10c8c9aedb2b72436896ea3296b5200aa88793a7 --
rg -n '\]\([^)]*\)' README.md docs/README.md docs/DEVELOPMENT.md docs/operations/*.md docs/releases/*.md mydocs/_templates/release_record.md
wc -l README.md docs/README.md docs/DEVELOPMENT.md docs/operations/DESKTOP_RELEASE.md docs/operations/PUBLIC_RELEASE_RUNBOOK.md docs/operations/RELEASE_CHECKLIST.md docs/releases/*.md mydocs/_templates/release_record.md
```

결과:

- 4개 명령 exit 0. 공백 오류 없음. `rg` 115개 해당 행의 링크는 별도 대상/앵커 검사와 함께 확인.
- 최종 line count: 위 명령의 9개 문서가 각각 77/44/273/218/290/124/49/192/138줄.
  템플릿 인덱스와 Task 계획·보고 문서도 300 LOC 이내다.
- 일회성 읽기 전용 Node 검사에서 제품 문서·템플릿 인덱스 10개의 상대 링크/앵커
  **122개**, reference link **15개**의 정의·대상 정합성을 확인했다.
- runbook Bash 예제 11개는 `bash -n` 문법 검사만 통과했다. 해당 명령을 실행하지 않았다.
- 고정 원문 링크를 Stage 1 commit과 비교해 동일함을 확인했다. 14개 연속 구간이 원문
  565줄·제목 23개·고유 SHA/digest 69개 전체를 보존하며 역사적 진입점도 유지된다.
- `site/release.json`은 `unreleased`, `manifestPublished=false`다. 대상 문서 밖의 코드·설정
  변경은 없으며 #9 후보·채널·공개 시각은 계속 미확정이다.
- 보고서 작성 후 Task 전체 16개 문서의 상대 링크/앵커 179개·reference link 19개,
  Stage 3 변경 11개 파일의 승인 범위, 보고서 필수 7개 섹션과 오늘할일 형식을 재검사했다.
  모두 통과했으며 앱·workflow·site 변경은 0개다.

### 5개 문서상 walkthrough

아래 입력은 **모의 상황**이다. 통과는 문서의 시작·정상 결과·정지·재개·기록 경로가 명확하다는
뜻이며 실제 release·signing·앱 실행의 성공이 아니다. version·SHA를 공개 승인값으로 만들지 않았다.

| 상황·입력 | 따라간 문서·정상 경로 | 중단·재개·기록 위치 | 판정 |
|---|---|---|---|
| 첫 공개: 이전 없음, source 0.1.0, #9 채널·후보 미정 | README→정책→runbook Gate 0~1→v0.1.0 인계; 승인 뒤 Gate 2~7, 첫 설치본 보존 | stable-only와 prerelease 차이는 Gate 0, 동일 bytes 게시 경로 미정은 Gate 3에서 정지. owner 결정 후 재개, 기록의 identity/공개 gate 갱신. N→N+1은 미실행 | 통과 — 현재 입력으로 게시하지 않음 |
| 다음 공개: 보존된 첫 설치본, 별도 rhwp v0.8.6 갱신·다음 앱 version 제안 | 영향표의 upstream 행→새 source/파일 검증→Release read-back→Pages→Gate 6의 MSI/NSIS/AppImage 동일 형식 전환 | 새 pin·앱 version·candidate는 별도 승인. 이전 파일이 없거나 형식이 다르면 해당 전환을 성공 처리하지 않음. 두 버전 기록의 설치본/업데이트·인계 항목 연결 | 통과 — 실제 실행은 후속 작업 |
| 서명 실패: 비게시 updater 후보 중 한 target 실패 | Gate 2 필수 job/upload와 Gate 3 서명·inventory 검사 | 공개 금지, 기존 feed 보존. 비밀 없는 오류·run·입력·영향 기록 후 원인 변화/승인 확인, Gate 1~3 영향 부분만 재개. 다른 run slice 혼합 금지 | 통과 |
| Release 성공, Pages 실패: exact Release 정상·deploy 응답 실패 | Gate 4 근거 보존→Gate 5→실패 표 | 실제 공개 feed 상태부터 조회. 그대로면 원인 수정·승인 후 Pages만 재개. 변경됐다면 사후 결함 복구로 전환. Release/tag 재생성 없이 Pages SHA/run·실패 재개 기록 | 보완 후 통과 |
| manifest 게시 후 결함: 이미 노출/일부 설치 가능 | Gate 6 read-back·설치본 결과→실패 표→owner 복구 판단 | 이전 검증 feed/안내 또는 더 높은 fixed version 승인. 첫 공개라 이전 stable이 없으면 unreleased 안내/manifest 미게시 복구를 별도 승인. 이미 업데이트한 앱 downgrade·tag 이동·asset 교체 금지, 해당 버전 한계/복구 기록 | 보완 후 통과 |

모의 진행 중 수정한 문구:

1. 다운로드만 공개하고 manifest를 아직 게시하지 않은 경로는 '업데이트 없음' 통과가 아니다.
   runbook Gate 6과 체크리스트에서 미게시·조회 오류와 동일 version 정상 응답을 분리했다.
2. Pages 배포 실패 응답만으로 기존 공개 상태가 유지됐다고 단정하지 않는다. 원격 상태에 따라
   Pages 재시도와 게시 후 복구를 나누도록 실패 표를 보완했다.
3. 첫 공개에는 복구할 이전 stable이 없을 수 있다. 이전 version을 가정하지 않고 안내/manifest
   복구 또는 더 높은 수정 버전의 승인과 앱 조회 오류 안내를 명시했다.

### 범위와 미실행

실제 native/GUI/negative test, Studio·Pages build, artifact 다운로드·서명·공개 read-back,
Actions dispatch, Release/tag·Pages·manifest 게시, upstream sync, 환경·Secret 변경은 하지 않았다.
제품·원격 상태에 대한 근거는 기존 보고서·source와 Stage 1의 날짜 있는 조회 결과다.
이번 단계는 그 상태를 새 원격 실행으로 재수용한 것이 아니다.

## 잔여 위험

- 문서 체계는 마련됐지만 곧바로 release Go는 아니다. #9 재승인, 채널·candidate·수동 package
  공개 경로·동일 bytes 사전 설치 gate·서명/환경 정책·#19 위험 처리가 필요하다.
- 현재 workflow의 재빌드 게시 제약은 문서만으로 해결되지 않는다. owner가 승인할 운영 방법
  또는 별도 구현이 필요하며 source·이전 artifact 수용을 새 게시 파일에 전가하지 않는다.
- 기존 서명 검증 CLI는 공개 inventory와 원격 파일 metadata의 전체 비교를 자동화하지 않는다.
  runbook의 별도 field/hash 대조가 필요하다. 추가 도구는 이번 문서 Task에 넣지 않았다.
- 과거 artifact 만료·미검증 OS 환경과 production N→N+1 미실행은 버전 기록에 계속 남는다.

## 다음 단계 영향

- Stage 1~3 문서 작업은 완료했다. 다음 승인은 최종 보고와 `publish/task54` push·`devel` 대상
  Open PR 게시다. 해당 단계에서 `task-final-report`와 중앙 최종 보고서/PR 형식을 따른다.
- PR merge 후 정리를 마친 뒤 [#9 인계](../../docs/releases/v0.1.0.md#첫-공개-작업-9-인계)로
  실제 릴리즈 범위와 gate를 승인받는다. #54 문서 PR 자체가 #9 close나 공개 승인은 아니다.
- 첫 공개→별도 upstream 갱신→다음 앱 공개→production updater 실제 시험 순서를 유지한다.

## 승인 요청

- Stage 3 산출물·5개 모의 점검·문서 검증을 검토하고 최종 보고·PR 게시 진행 승인을 요청한다.
- `task-stage-report`에 따라 이 보고서와 단계 문서를 한 커밋으로 묶고 승인 전에는 PR을
  생성하거나 실제 공개 작업을 시작하지 않는다.
