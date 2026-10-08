# Alhangeul 릴리즈 기록

이 폴더는 Windows/Linux 제품의 버전별 준비 상태, 승인, 검증 출처와 공개 결과를 보관한다.
기록 파일이 있다는 사실은 해당 버전이 공개됐다는 뜻이 아니다.

## 릴리즈 목록

2026-10-04T06:40:03.560Z 확인: GitHub stable v0.1.1과 설치 파일11개, 규격 body·웹 안내·production manifest0.1.1 및 실제 업데이트 검증 결과 문구를 공개했다. Windows NSIS·MSI와 Linux x64 AppImage의 v0.1.0 → v0.1.1 업데이트·설정 유지·HWP/HWPX 재열기를 수용했다. PR #101·#104 병합, exact Pages37183359064와 실제 공개 HTTP20/20 bytes·표시·링크 대조를 완료했다.

| 버전 | 상태 | 이전 공개 버전 | GitHub Release | 기록 |
|---|---|---|---|---|
| v0.1.2 | GitHub/Pages/feed012·HTTP23·실제011→012 지원3종 수용 / 최종 결과 안내·PR120 통합 후속 | v0.1.1 | [v0.1.2](https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.2) | [v0.1.2 공개 기록](v0.1.2.md) |
| v0.1.1 | Release·규격 body·웹·피드·검증 결과 안내 공개, 세 형식 실제 upgrade·HTTP 수용 완료 | v0.1.0 | [v0.1.1](https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.1) | [v0.1.1 공개 기록](v0.1.1.md), [안내 원문](v0.1.1.notes.json) |
| v0.1.0 | stable 공개·Pages/updater 전환 및 동일 버전 조회 완료 | 없음 | [v0.1.0](https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.0) | [v0.1.0 공개 기록](v0.1.0.md) |

2026-10-08T16:50:52.403Z 확인: GitHub 최신 Stable는 v0.1.2이며 main6dcb05e9의11파일·서명3·본문·tag 검산을 완료했다. 사이트/production feed는 v0.1.1, 실제011→012 미실행이다.

최신 공개 버전은 실제 non-draft Release와 공개 read-back으로 판정한다. 가장 높은 파일명이나
현재 source version을 최신 공개 버전으로 취급하지 않는다. 상태 확인 시점을 함께 갱신한다.

## 문서 책임

| 위치 | 역할 |
|---|---|
| [데스크톱 릴리즈 정책](../operations/DESKTOP_RELEASE.md) | 반복 승인·지원 matrix·신뢰·복구 기준 |
| [공개 실행 가이드](../operations/PUBLIC_RELEASE_RUNBOOK.md) | 입력·명령·승인·중단·재개 순서 |
| [최소 검증 체크리스트](../operations/RELEASE_CHECKLIST.md) | 매 공개 기본 확인과 변경 영향별 추가 확인 |
| 이 인덱스 | 버전별 상태와 기록 진입점 |
| `v<version>.notes.json` | 사용자 문구·공개 metadata의 단일 원문; published는 GitHub 상태이며 Pages 게시를 뜻하지 않음 |
| `site/updates/v<version>.html` | 원문과 웹 템플릿에서 생성하는 버전별 안내; download는 고정 tag |
| [본문·웹 양식](../../mydocs/_templates/README.md#사용자-릴리즈-안내-양식) | 제목·토큰·escaping·짧은 안내 구조 |
| `v<version>.md` | 해당 버전의 식별자·변경점·검증·결정·실패 재개·인계 |
| [기록 템플릿](../../mydocs/_templates/release_record.md) | 다음 버전의 작성 형식; 실제 결과를 미리 채우지 않음 |
| [GitHub Releases](https://github.com/postmelee/alhangeul-tauri/releases) | 공개 installer·서명·inventory와 사용자 릴리즈 노트 |
| [사용자 업데이트 페이지](https://postmelee.github.io/alhangeul-tauri/updates/) | 짧은 변경 요약과 플랫폼별 다운로드 진입점 |
| `site/release.json`, Pages output manifest | 별도 승인으로 게시하는 다운로드·updater 기계 입력 |
| `mydocs/working/`, `mydocs/report/` | 특정 Task의 단계·최종 결과; 제품 공개 기록과 구분 |

## 작성·갱신 규칙

1. 승인된 릴리즈 작업에서 템플릿을 읽고 목표 tag와 같은 이름의 `v<version>.md`를 만든다.
   source version이 있어도 공개 채널·후보가 미정이면 `준비 중`으로 시작한다.
2. 이전 공개 tag·commit과 후보 범위를 확정한 뒤 포함 PR·해결된 Issue·참고 Issue를 구분한다.
   첫 공개에는 이전 버전 대신 `없음`을 적고 분석 시작 기준을 별도로 승인받는다.
3. 기본 검증과 변경 영향별 추가 검증의 실행·재사용·미실행 근거를 기록한다. build SHA,
   workflow SHA, Pages SHA, archive digest와 installer hash를 서로 대체하지 않는다.
4. Release·Pages·updater 상태는 각각 실제 결과를 확인한 뒤 갱신한다. 일부 게시 성공이나
   같은 버전의 업데이트 없음 확인만으로 전체 공개·업그레이드 완료를 선언하지 않는다.
5. 사용자 요약은 앱·upstream의 사용자에게 보이는 변화로 작성한다. 긴 검증 로그·운영 변경은
   이 기록에 두며 공개 노트와 웹 페이지에 그대로 복제하지 않는다.
6. 이후 문제가 발견되면 해당 공개 version 기록에 알려진 한계와 후속 링크를 덧붙인다.
   과거 결과를 새 결과로 덮어쓰거나 tag·asset이 교체된 것처럼 기록하지 않는다.

## 작성과 생성 및 검사

1. `v<version>.md`에서 previous..candidate 범위와 실제 PR/Issue 상태를 분석한 뒤
   `v<version>.notes.json`을 작성한다. [v0.1.1 원문](v0.1.1.notes.json)이 첫 예제다.
   metadata의 source·UTC 공개일·rhwp tag/commit·6개 asset·3개 updater inventory를 검증한 근거와 대조한다.
   미래 날짜·해결 추정·운영 PR을 주요 기능으로 넣지 않는다. draft는 공개 완료로 표시하지 않는다.
2. content의 summary·rhwpChanges·appChanges·지원/설치·업데이트·한계·references와
   4000자 이하 updaterSummary를 검토한다. rhwp pin 유지 시 unchanged로 설명한다.
   `references.checkedAt`과 merge/해결 근거를 실제 조회로 확정한다. validator는 의미상 해결 판단을 대신하지 않는다.
3. 새 output directory에 생성한다. 공개 전 draft 출력은 검토용으로만 두고 사이트에 넣지 않는다.
   Release 공개 후 실제 publishedAt과 published 상태를 대조·갱신해 다시 생성하고 웹 결과를
   같은 버전 경로에 반영한다. 이미 공개된 v0.1.1에 대한 root Bash의 예:

```bash
ALH_VERSION=0.1.1
ALH_NOTES_PARENT=$(mktemp -d)
ALH_NOTES_DIR="$ALH_NOTES_PARENT/generated"
pnpm run generate:release-notes -- --version "$ALH_VERSION" --output-dir "$ALH_NOTES_DIR"
cp "$ALH_NOTES_DIR/website-release-note.html" "site/updates/v$ALH_VERSION.html"
pnpm run check:release-notes
pnpm run test:release-notes
pnpm run build:pages
pnpm run check:pages
```

출력은 `release-body.md`, `website-release-note.html`, `updater-notes.txt`다. 기존 output을
덮어쓰지 않으므로 재생성은 새 directory를 사용한다. 입력은 typed JSON이며 임의 HTML을 받지 않는다.
웹 HTML을 직접 고치면 drift 검사에서 실패한다. 원문·템플릿을 수정한 뒤 다시 생성한다.

4. release data PR의 version과 원문 version이 같으면 `site/release.json.notes`를
   `content.updaterSummary` 문자열 그대로 반영한다. short notes 파일의 출력용 마지막 LF를 붙이지 않는다.
   전체 GitHub 본문을 manifest에 복사하지 않는다. 다른 버전의 기존 feed는 전환 승인 전 유지한다.
5. 넓은/좁은 화면·공개 날짜·고정 6개 다운로드·최신 메뉴·기술 기록 링크를 확인한다.
   최신은 실제 공개 release data로만 표시하며 높은 파일명이나 원문 published만으로 추정하지 않는다.
6. exact body와 생성물 hash를 기록하고 [runbook Gate 4](../operations/PUBLIC_RELEASE_RUNBOOK.md#gate-4--github-release-게시와-원격-파일-재검증)의 공개 승인을 받는다.
   source drift·CI 통과와 PR merge는 게시 승인이 아니다. body만 수정할 때도 승인된 bytes와 read-back을 남긴다.
7. [Gate 5~7](../operations/PUBLIC_RELEASE_RUNBOOK.md#gate-5--release-data-pr과-pages-배포)에서
   데이터 PR·exact Pages SHA 승인·배포·HTTP 대조·실제 production upgrade를 각각 수행하고 기록한다.

과거 버전은 당시 승인 metadata/pin으로 검사하며 현재 pin을 억지로 적용하지 않는다. 원문이 없는
과거 v0.1.0은 GitHub 안내를 유지한다. 기계 검사는 원문이 존재하는 버전의 실패를 건너뛰지 않는다.
Linux/Windows 빠른 CI는 릴리즈 규격 계약을 검사하며 native 설치·실제 upgrade는 별도 근거다.

과거 Actions archive는 만료될 수 있다. 고유 SHA·run·digest·수용 한계는 Task 원본 보고서와
고정 commit 링크로 보존하되 archive 가용성이나 현재 후보의 성공을 보장하는 값으로 쓰지 않는다.
private key·암호·token·개인 문서·실제 credential 보관 경로는 기록하지 않는다.

2026-10-08T17:03:40.244Z 확인: v0.1.2 본문을 actual published metadata로 보정해 read-back했다.012 원문/웹/manifest 데이터는 로컬 검증과 devel PR 준비 상태이며 원격 Pages/feed는011 유지다.

2026-10-08T17:31:23.125Z 확인: PR119 일반 merge·devel `1f33d03918b50a5b9140978a9eb28d1b5e65ebe6` 및 Pages19/23 bytes 고정을 완료했다.012 Pages/manifest dispatch는 승인 대기, 현재 production feed는011이다.

2026-10-08T18:00:10.828089+00:00 확인: exact Pages37819153172/source1f33·artifact/HTTP23·production012/hash58ca348b...·서명3/공개6파일·desktop/mobile 확인을 완료했다. updates 목록의 local v012 연결 보정 및 실제011→012는 후속 승인·검증 대상이다.

2026-10-09 03:17 KST 확인: 새011→012 fixed 입력·동일형식3종 harness 및 local v012 목록 항목을 source/generic1347/75로 수용했다. 실제 upgrade·PR/필수CI/merge·목록 재배포는 후속이고 과거010→01159회귀와 공개012 bytes/key/endpoint를 유지한다.


2026-10-09 04:45 (Asia/Seoul) 확인: v0.1.2 공개 product6d의 Windows NSIS/MSI·Linux x64 AppImage 실제011→012 업데이트·설정·HWP/HWPX 수용을 완료했다. [Stage4.8](../../mydocs/working/task_m010_113_stage4.8.md)에 Windows bc082d00/37828940744 각 success job과 Linux H8a5a28c7/37832348063 whole success의 별도 evidence identity를 기록했다. 두 과거 whole failure를 유지한다. 공개 안내의 미실행 문구 갱신·PR120 통합·새 Pages·#113 종료는 후속 승인이다.
