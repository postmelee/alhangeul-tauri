# README 배지와 운영체제별 홈페이지 안내 구현계획서

수행계획서: [task_m010_90.md](task_m010_90.md)
GitHub Issue: [#90](https://github.com/postmelee/alhangeul-tauri/issues/90)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 산출 | 검증 |
|---|---|---|---|
| 1 | 상단 배지 안내 | README·Stage 1 | SVG 4개·실제 pin·본문 보존 |
| 2 | 동기화 정합성 | updater·기존 테스트·Stage 2 | 갱신·무쓰기·관련 계약 |
| 3 | 실제 렌더링과 PR | Stage 3·최종 보고·PR | GitHub 이미지·링크·전체 diff |
| 4 | 홈페이지 상호 안내 | site 헤더·CSS·Stage 4·PR 갱신 | Pages 계약·실제 desktop/mobile |

## 문서 위치 확인

| 파일 | 수행계획서 위치 | 실제 위치 | 일치 |
|---|---|---|---|
| 배지 | README.md | 제목 아래·기존 본문 앞 | OK |
| 홈페이지 링크 | site 기존 HTML·styles.css | 공통 헤더 3개·기존 모바일 media query | OK |
| 내부 기록 | mydocs/plans·working·report·orders | 기존 역할별 위치 | OK |

## Stage 1 — 상단 배지 안내

- README 제목 아래 Markdown 배지 4개를 넣고 기존 버전·본문·이미지를 보존한다.
- 릴리즈는 GitHub 안정 릴리즈 조회, rhwp는 lock의 tag와 동일한 정적 표시와 tag 링크다.
- 플랫폼은 설치 페이지, MIT는 LICENSE로 연결한다. 불필요한 통계·CI 배지는 넣지 않는다.
- 검증: git diff --check, 네 SVG 응답의 status/type/title, 원문 블록 제외 전체 일치, lock 대조.
- 커밋: `Task #90 Stage 1: README 상단 릴리즈와 포함 rhwp 배지 추가`.

## Stage 2 — 동기화 정합성

- 기존 updater에 README 전체 rhwp 배지 exact rule 1개와 표시 생성 helper를 추가한다.
- 기존 정상 갱신 fixture에 배지를 넣고 alt·표시값·tag 링크가 함께 바뀌는지 확인한다.
- marker 누락·중복·다른 버전·다른 링크 시 어떤 관리 파일도 쓰지 않는 사례를 검증한다.
- 실제 저장소 snapshot을 후보 tag로 바꾸는 기존 테스트로 현재 lock와 관리 marker를 대조한다.

```sh
node --test tests/rhwp-managed-references.test.mjs tests/rhwp-sync-changes.test.mjs tests/rhwp-upstream-sync-workflow.test.mjs
pnpm run check:product-boundary
pnpm run test:upstream
git diff --check
```

- 커밋: `Task #90 Stage 2: 포함 rhwp 배지의 동기화 갱신과 실패 경계 검증`.

## Stage 3 — 실제 렌더링과 PR

- 전체 diff 허용 목록·문서 위치·원문 보존·pin/제품 경로 불변을 확인한다.
- publish/task90 게시 후 GitHub README에서 배지 4개 natural size·alt·링크와 배치를 확인한다.
- 최종 보고와 완료 시각을 기록하고 non-draft publish/task90 → devel PR을 만든다.
- 커밋: `Task #90 Stage 3 + 최종 보고서: README 배지 검증과 PR 준비`.

## Stage 4 — 홈페이지 상호 안내

- site/index.html·updates/index.html·feedback/index.html 헤더에 ‘알한글 for macOS’와
  https://postmelee.github.io/alhangeul-macos/를 추가한다.
- 기존 링크의 탐색 동작을 유지하고 모바일 520px 이하에서는 브랜드와 nav를 두 행으로 배치한다.
- 세 HTML의 stylesheet cache key만 갱신한다. 본문·다운로드·updater 데이터는 보존한다.
- 등록명 rhwp-mac, origin alhangeul-macos인 프로젝트에 새 세션을 생성해 사용자가 요청한
  rhwp 배지·‘알한글 for Windows / Linux’ 링크의 구현·검증·PR 작업을 전달한다.
- 검증: pnpm run build:pages, pnpm run check:pages, node --test tests/pages.test.mjs,
  원문 비교·manifest hash, 로컬 1280px/320px 실제 헤더·링크·다운로드 확인.
- 커밋: `Task #90 Stage 4 + 최종 보고서: 운영체제별 홈페이지 링크와 모바일 헤더 보완`.
- 기존 PR #91의 제목·본문·수용 기준·보고를 최종 범위로 갱신한다. 새 CI를 기다리지 않는다.

## 검증·커밋·단계 의존성

검증 후 단계 산출물과 보고서를 묶어 커밋한다. Stage 1 → 2 → 3 순서로 진행한다.
PR 게시 이후의 추가 사용자 지시를 Stage 4로 진행하며 이전 검증 source가 동일하면 재실행하지 않는다.
수행계획서의 작은 문서 보완 요청 범위를 유지하고 PR 병합·main 공개 반영은 별도 승인 사항이다.
새 설치본·native 검증은 이 변경의 수용 기준이 아니며 Actions를 기다리는 절차를 추가하지 않는다.

## 위험과 대응

외부 배지 캐시 지연과 서비스 장애는 기존 텍스트 안내로 보완한다. exact marker가 잘못되면
동기화가 쓰기 전에 실패하도록 검증한다. pin·제품 코드·workflow를 수정하지 않는다.

## 승인 범위

요청된 배지와 관리 참조 보완·검증·PR 준비, 후속 승인된 홈페이지 링크·새 macOS 세션 전달로 한정한다.
