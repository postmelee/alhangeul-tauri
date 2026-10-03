# Task M010 #102 Stage 4 보고서 — 운영 문서와 v0.1.1 적용 인계

GitHub Issue: [#102](https://github.com/postmelee/alhangeul-tauri/issues/102)
구현계획서: [task_m010_102_impl.md](../plans/task_m010_102_impl.md)
Stage: 4
상태: 구현·로컬 통합 검증 완료 / 최종 보고·PR 게시 승인 대기
승인: 2026-10-04, Stage 3 완료 보고 후 같은 스레드에서 작업지시자의 “진행해줘”.
보고일: 2026-10-04 KST

## 단계 목적

새 릴리즈 원문·본문·웹·짧은 updater 요약의 작성과 검사를 기존 공식 공개 절차에 연결한다. 규격 PR을 먼저 통합한 뒤 #97/PR #101에서 실제 body·Pages·manifest를 반영할 순서와 남은 검증을 인계한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/_templates/README.md` | 본문·웹 양식의 실제 원문 위치·생성/검사 진입점 연결 |
| `mydocs/_templates/release_record.md` | 생성물 역할·exact body/short notes hash·승인/read-back 기록 기준 |
| `docs/releases/README.md` | 96줄; 실제 v0.1.1 상태·원문 책임·7단계 작성/생성/검사/게시 절차 |
| `docs/operations/PUBLIC_RELEASE_RUNBOOK.md` | 기존 Gate 0~7에 원문·검사 연결; body만 수정하는 승인·read-back 경로 |
| `docs/operations/RELEASE_CHECKLIST.md` | 151줄; metadata·문구·출력 drift·short notes·버전별 화면 확인 추가 |
| `docs/architecture/PROVENANCE.md` | 62줄; 참조 commit·원본 파일·형식 차용/독립 구현·MIT 근거 |
| `README.md`, `docs/README.md` | GitHub v0.1.1과 사이트 0.1.0의 실제 상태·기록/작성 진입점 정합화 |
| `docs/releases/v0.1.1.md` | #97 인계에서 새 작성 절차와 runbook 연결; 공개/upgrade 상태 유지 |
| 계획서 2종·오늘할일 | 실제 Stage 4 승인·로컬 완료와 다음 승인/원격 CI 대기 표시 |

제품 문서 위치는 승인한 `docs/releases/`, `docs/operations/`, `docs/architecture/`와 기존 README를 유지했다. 양식은 중앙 `mydocs/_templates/`에 두고 제품 정책을 `mydocs/manual/`에 추가하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

- 기존 runbook의 Gate 0~7·exact bytes 수용·서명·공개·복구·실제 upgrade 기준을 보존하고 새 작성 흐름만 연결했다. 기존 309줄 파일은 338줄이며 기존 초과와 문서 위치/순서 보존 이유를 구현계획에 기록했다.
- 사용자 원문·생성 웹 페이지·사이트 feed·runtime·key·endpoint·rhwp pin은 Stage 3와 동일하다. Stage 4 source 변경은 Markdown 문서에 한정된다.
- draft 출력은 공개 전 검토용으로만 두며 실제 Release 공개일을 확인한 뒤 published metadata로 재생성하도록 명시했다. 이미 공개된 v0.1.1 예제를 제공했다.
- 원본 Bash·웹 코드·HTML/CSS를 직접 복사하지 않고 제목/구조를 참조한 사실과 고정 원본의 MIT notice를 기록했다. 제품 upstream은 계속 edwardkim/rhwp다.
- #97 오늘할일 행과 원래 checkout의 사용자 변경은 보존했다. 기존 공개 Release/body/asset·PR #101·Pages·manifest에 원격 변경을 하지 않았다.

## 검증 결과

구현계획서의 Stage 4 명령:

```bash
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run check:release-notes
pnpm run test:release-notes
pnpm run build:pages
pnpm run check:pages
pnpm run test:automation
git diff --check
```

| 수용 기준 | 실제 결과 |
|---|---|
| 제품 지원/출처 경계 | 775개 파일 검사 통과 |
| upstream | 39/39 통과, 실패·skip 0 |
| Studio | 39개 파일·251개 테스트 통과; 플랫폼 중립 web build 성공 |
| 원문·템플릿·생성물 drift | 원문 1개 검사 통과 |
| 릴리즈 규격 | 124/124 통과, 실패·skip 0 |
| Pages | source 17·output 20 통과, feed는 기존 0.1.0 유지 |
| 전체 Node 자동화 | 1184/1184 통과, 실패·skip 0; 개별 검사가 포함되므로 합산하지 않음 |
| 문서 링크·앵커 | 변경한 공식 문서/양식 9개, 로컬 링크·앵커 85개 통과 |
| 명령 예제 | Bash block 17개의 syntax-only 검사 통과; 공개 명령은 실행하지 않음 |
| 작성 예제 실행 | 새 temporary parent/generated 경로에서 실제 생성 성공; 3개 출력이 Stage 3 검토 bytes와 동일 |
| diff | whitespace 검사 통과 |

검증을 모두 이번 단계에서 실행했다. 로그는 `/tmp/task102-stage4-*.log`에 보존했다. Studio build의 기존 chunk/import 경고는 비차단이다. Windows/Linux native test·Tauri build·패키징은 실행하지 않았다.

화면 수용은 Stage 3의 같은 site/template/script/notes bytes에 대한 브라우저 결과를 재사용한다. 해당 경로의 diff가 없고 원문·HTML·feed SHA-256이 Stage 3 receipt와 일치한다. 1366px·390px·320px 화면, 목록/다운로드·최신 표시 근거는 [Stage 3](task_m010_102_stage3.md)에 있다.

2026-10-03T20:24:09Z 원격 읽기 전용 재확인:

- GitHub v0.1.1: Release ID `402604603`, non-draft/non-prerelease, 공개일 `2026-10-03T17:07:44Z`, asset 11개.
- PR #101: OPEN, 미병합, head `2d4d2b6ecb2697e874ec8be26e4f756feed0aae2`, base devel.
- #97/#102: OPEN. 사이트 release.json과 production stable.json의 version은 둘 다 0.1.0.
- 이 조회와 생성·HTTP 성공은 실제 이전 설치본의 upgrade 성공 근거가 아니다.

## 잔여 위험

- #102의 exact SHA Windows/Linux 빠른 CI는 PR 게시 후 확인해야 한다. 로컬 통합 검증 완료를 원격 required check 통과나 모든 수용 완료로 기록하지 않는다.
- #102 공통 규격 merge SHA는 아직 미확정이다. #97 인계 때 실제 merge commit을 기록하고 새 PR #101 head의 required check를 확인해야 한다.
- GitHub body 보정·PR #101 merge·exact Pages SHA 배포·production feed 전환은 각각 승인과 실제 read-back이 남아 있다.
- v0.1.0 → v0.1.1 NSIS/MSI/AppImage upgrade는 미실행이다. 기존 6종 설치 수용·same-version 조회·시험 endpoint 결과로 대신하지 않는다.
- 공개 파일의 Authenticode 미서명·NSIS raw 썸네일 실패·강제 MSI 재부팅 후 미검증·Wayland/GPU/물리 프린터 등의 한계는 v0.1.1 기록에서 유지했다.

## 다음 단계 영향

1. 최종 보고·PR 게시 승인 후 `task-final-report` 절차로 최종 기록과 publish/task102 → devel Open PR을 준비한다. 정확한 게시 SHA의 Windows/Linux 빠른 CI와 required check를 읽고 별도 merge 승인을 요청한다.
2. #102 merge 후 #97의 local/task97에서 `git fetch origin devel`, `git merge --no-edit origin/devel`로 반영한다. rebase/force/tag 이동은 하지 않는다. orders·기록 충돌은 양쪽 최신 결과를 보존한다.
3. #97/PR #101은 `docs/releases/v0.1.1.notes.json`의 metadata와 공개 inventory를 입력으로 사용한다. `site/release.json.notes`는 `content.updaterSummary` 문자열 그대로 적용하며 파일 끝 LF나 전체 GitHub body를 복사하지 않는다.
4. [작성 절차](../../docs/releases/README.md#작성과-생성-및-검사)의 새 directory 생성→release notes check/test→Pages build/check와 Pages/updater 계약을 새 head에서 실행한다. 기존 head의 통과를 재사용하지 않는다.
5. body 후보 hash `43b9a7b31f54ad5fb17cd4902801532d52ff3ecb49f8cc2e200f910ae387b8f7`, short notes 파일 hash `74457f7c870670f1da49fccd71989fcf7941d221bb22a334cb2ac81edfdaafa1`은 Stage 3와 동일하다. 새 입력이면 body/HTML/manifest hash를 다시 만든다.
6. 검토한 exact body 수정, PR #101 merge, merge된 exact devel SHA Pages/manifest 배포 승인을 순서대로 받는다. 기존 app source `96e89e900415ee9e1e942b5c01c833dea3415e86`와 Pages SHA를 구분하고 body·화면·피드·signature를 read-back한다.
7. #97의 실제 production upgrade 계획을 승인받아 이전 NSIS→NSIS, MSI→MSI, AppImage→AppImage를 별도 환경에서 확인한다. 실제 동의·dirty 보호·다운로드·서명·설치·재시작·0.1.1·문서 재열기 결과로 원문/기록을 갱신하고 다시 생성한다.

## 승인 요청

- Stage 4 산출물과 로컬 통합 검증 결과의 검토 및 최종 보고서 작성·PR 게시 단계 진입 승인을 요청한다.
- 이 승인은 #102/#101 merge·공개 body 수정·Pages 배포·actual upgrade 실행 승인을 대신하지 않는다. 미실행 원격 검증은 게시 후 실제 결과로 보완한다.
