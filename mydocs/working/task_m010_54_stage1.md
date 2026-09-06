# Task #54 Stage 1 완료 보고서

GitHub Issue: [#54](https://github.com/postmelee/alhangeul-tauri/issues/54)
구현계획서: [task_m010_54_impl.md](../plans/task_m010_54_impl.md)
Stage: 1 — 정책과 기록 구조 정비
작성일: 2026-09-04
승인: 구현계획 보고 뒤 작업지시자의 “진행해줘”

## 단계 목적

반복되는 릴리즈 정책과 특정 시점의 검증 증거를 분리하고, v0.1.0 준비 기록과 다음 버전의
기록 형식을 만든다. 기존 exact SHA·run·artifact digest·수용 한계를 잃지 않으면서 실제
게시되지 않은 기능·산출물을 공개 완료로 안내하지 않는 것이 이 단계의 완료 기준이다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| [DESKTOP_RELEASE.md](../../docs/operations/DESKTOP_RELEASE.md) | 565 → 217줄, 제품 정책·matrix·승인·신뢰·검증 재사용·복구 중심으로 재구성 |
| [릴리즈 인덱스](../../docs/releases/README.md) | 신규 49줄, 준비/공개 상태와 표면별 정보 소유·작성 순서 |
| [v0.1.0 준비 기록](../../docs/releases/v0.1.0.md) | 신규 162줄, 미확정 identity·기존 수용 근거·원문 보존·#9 결정 목록 |
| [기록 템플릿](../_templates/release_record.md) | 신규 136줄, 준비/공개 후 필수 항목과 검증·승인·실패·updater 인계 양식 |
| #54 계획 2개·[오늘할일](../orders/20260904.md) | 구현계획 승인, Stage 1 완료와 Stage 2 승인 대기 |
| 이 보고서 | 과거 절 대응표·source 대조·문서 검증 결과 |

선택된 공식 경로 `docs/operations/`, `docs/releases/`와 중앙 `mydocs/_templates/` 안에서만
제품 문서를 정비했다. Stage 2 runbook·체크리스트는 아직 만들지 않았으며 해당 예정 문서로
깨진 링크를 추가하지 않았다. README·개발 안내·템플릿 인덱스 정렬은 Stage 3에 남아 있다.

## 본문 변경 정도 / 본문 무손실 여부

운영 문서는 단순 복사가 아니라 역할별 재작성이다. 고유 근거는 버전 기록에서
[정비 전 565줄 전체 원문][original]과 원본 Task 보고서를 연결해 보존했다.
14개 연속 행 범위가 원문 1~565줄 전체를 덮으며 원문의 제목 23개, 고유 SHA/digest 69개가
고정 원문에 모두 남아 있다. 원문 archive 자체가 현재 다운로드 가능하다는 뜻은 아니다.

과거 ‘공개 전 미완료’, ‘썸네일 제외’, ‘Stage 6 이전 dispatch 금지’는 당시 결정으로만 남긴다.
Task #14·#24의 과거 제외 범위는 현재 작업지시자의 썸네일 포함 요청을 덮어쓰지 않는다.

### 원래 절과 현재 위치 대응

행 번호는 위 고정 원문 기준이다. 아래 새 위치의 `정책`은 DESKTOP_RELEASE,
`기록`은 v0.1.0, `원문 보존`은 기록 안의 14개 고정 행 링크다.

| 원래 제목·시작 행 | 현재 위치와 처리 |
|---|---|
| 데스크톱 artifact와 배포 준비 · L1 | 정책 서두·문서 읽는 순서; 실제 공개 상태는 기록 |
| 제품 version 기준 · L5 | 정책 ‘제품 version과 source 기준’; 과거 계보는 원문 보존 |
| 현재 workflow 범위 · L11 | 정책 ‘workflow와 산출물 계층’; 시험 고정 버전은 원문 보존 |
| Linux x64 exact-SHA GUI acceptance · L39 | 정책 동일 이름 절; 과거 floor·probe·#34 상태는 기록 원문 보존 |
| 검증된 `0.1.0` 기준선 · L78 | 기록 ‘기존 검증 근거’ Task #7 + 원문 L78–108 |
| 검증된 Windows installer package smoke · L109 | 기록 Task #11·#14·#13 + 원문 L109–201 |
| Windows installer 자동 gate를 다시 돌려야 하는 변경 · L176 | 정책 ‘검증 선택과 수용 한계’; 원문 포함 |
| 실제 인쇄와 PDF 직접 저장의 분리 gate · L202 | 정책 동일 이름 절; 과거 Stage 승인 문구는 원문 L202–218 |
| 검증된 rhwp `v0.8.4` native 수용 기준선 · L219 | 정책에 역사적 진입점 유지 → 기록 Task #24·원문 L219–286 |
| Task #24 artifact provenance · L230 | 기록 Task #24·원문 L219–286, package/압축 hash 구분 보존 |
| Windows x64 GUI 경계 · L253 | 기록 Task #24·공개 전 결정·원문 L219–286 |
| Linux x64 GUI 경계 · L262 | 기록 Task #24·공개 전 결정·원문 L219–286 |
| 검증된 native canary · L287 | 기록 Task #5·원문 L287–317, `0.3.1` 계보 구분 |
| Task #17 Linux thumbnail package 기준선 · L318 | 기록 Task #17·원문 L318–363 |
| Native package evidence · L322 | 기록 Task #17·원문 L318–363, helper/package hash 보존 |
| Package-installed file-manager evidence · L344 | 기록 Task #17·#50·원문 L318–363, 합성 fixture 한계 보존 |
| Task #50 Linux HWPX package-only MIME와 실사용 문서 기준선 · L364 | 기록 Task #50·원문 L364–393, 두 candidate·render hash·환경 보존 |
| 현재 source 변경만으로 완료되지 않는 작업 · L394 | 정책 ‘승인과 게시 순서’·기록 ‘공개 전 결정’; 원문 L394–450 |
| Pages와 공개 릴리스 게시 순서 · L405 | 정책 ‘승인과 게시 순서’·‘Pages와 updater 신뢰 사슬’; 원문 L394–450 |
| Production updater key와 Secret 책임 · L451 | 정책 동일 이름 절·원문 L451–477 |
| Test-only negative manifest 수용 · L478 | 정책 ‘실패와 복구’의 시험 경계; 기록 #16·원문 L478–498 |
| 실패, rollback과 no-rerun · L499 | 정책 ‘실패와 복구’; 기록 원문 L499–514 |
| 로컬과 다운로드 후 검증 · L515 | 정책 ‘검증 선택과 수용 한계’·개발 문서; 원문 L515–565; 실행 walkthrough는 Stage 2 |

기존 상대 링크의 `DESKTOP_RELEASE.md#...` 직접 앵커 참조는 없었다. 다만 UPSTREAM 문서가
본문으로 ‘Task #24 절’을 안내하므로 정책에 기존 rhwp 수용 제목과 새 기록 연결을 남겼다.
기존 Task 문서와 `tests/rhwp-managed-references.test.mjs`의 역사적 fixture는 수정하지 않았다.

### macOS 참고와 적용 차이

2026-09-04 GitHub API로 macOS `devel`의
`b8c45fb1c9f749e45895aa5b5b7eae181decfe16`을 고정해
[public runbook][mac-runbook], [기록 인덱스][mac-index]와 [v0.1.10 기록][mac-record]을 참고했다.
웹 읽기가 cache miss여서 GitHub contents API로 원문을 확인했다.

- 릴리즈마다 identity 재확인, 이전 버전 대비 PR 분석, 실행/미실행 분리, 게시 후 read-back과
  실패 재개·인계라는 운영 질문을 반영했다.
- macOS의 DMG·notarization·Sparkle·Homebrew 명령과 `mydocs/manual`·`mydocs/release` 경로는
  복제하지 않았다. Tauri의 MSI·NSIS·AppImage와 공식 `docs/` 책임에 맞췄다.
- macOS의 draft smoke→official publish를 Tauri에 이미 구현된 흐름으로 쓰지 않았다.
  비게시 후보와 재빌드 게시 파일의 bytes 차이도 동일 파일 수용으로 간주하지 않는다.

## 검증 결과

실행 명령:

```bash
git diff --check
git diff --name-only
git show 10c8c9aedb2b72436896ea3296b5200aa88793a7:docs/operations/DESKTOP_RELEASE.md
rg -n 'DESKTOP_RELEASE\.md(#[^ )]+)?' README.md docs mydocs tests scripts
wc -l docs/operations/DESKTOP_RELEASE.md docs/releases/README.md docs/releases/v0.1.0.md mydocs/_templates/release_record.md
```

결과:

- OK — diff 공백 오류 없음. 네 제품 문서 217/49/162/136줄로 각 300 LOC 이내.
- OK — 일회성 읽기 전용 Node 검사로 네 문서의 상대 링크·앵커 48개, reference link 정의,
  한국어 locale과 원문 14개 행 범위의 연속성·완전성을 확인했다.
- OK — 원문 565줄·제목 23개·고유 SHA/digest 69개가 고정 원문으로 추적된다.
- OK — 미공개·미확정·미실행 항목을 구분하고 기록/정책/template 경로가 승인 계획과 일치한다.
- OK — 보고서·계획·오늘할일을 포함한 최종 8개 파일의 상대 링크·앵커 62개와 Stage 보고서
  필수 섹션을 확인했다. 원래 제목 23개가 위 대응표에 각각 존재하며 승인 밖 변경은 없다.
- OK — `site/release.json`은 `unreleased`, `manifestPublished=false` 그대로다.
  앱·workflow·scripts·tests·pin·site 변경이 없다.

### source와 현재 원격 상태 대조

| 확인 | 결과 |
|---|---|
| workflow 입력·build/publish 분기 | `artifact`와 `updater` 구분, stable exact identity, 같은 run의 7개 asset 게시 확인 |
| Tauri 기본/overlay·package config | 기본은 updater 설정 없음, overlay의 production key·endpoint, DEB/RPM 3개 통합 경로 확인 |
| release data·inventory·manifest source | 3 target·stable-only·구조 검증·검증 inventory 투영 확인; 원격 bytes 검증과 구분 |
| 마지막 일반 native run | `33734252261`, source `50e91247841b47d5dc50773c0a2584720829dbdc`, 4개 실행 job success, updater build/publish skipped |
| 위 SHA → 정비 기준 diff | #16 결과·단계·오늘할일 3개 문서뿐; 이 확인으로 native를 재실행하지 않음 |
| Release 목록·v0.1.0 tag | 목록 `[]`, exact remote tag 조회 빈 출력; 둘 다 미생성 |
| 관련 작업 | #9·#19·#28 OPEN, macOS PR #491 OPEN; 현재 상태를 기록에 명시 |
| github-pages 환경 | custom branch policy `devel`; task branch 배포 우회 금지 |
| release 환경 | required reviewer `postmelee`, self-review 방지 false, ref policy null; 공개 전 결정으로 기록 |

원격 읽기는 `gh release list`, `gh issue/pr view`, `gh run view`, `gh api` 환경/참고 문서 조회와
exact `git ls-remote`만 사용했다. `release` branch-policy endpoint의 404는 환경 목록 조회로
ref policy null임을 확인해 해석했으며 환경 부재나 보호 완료로 단정하지 않았다.
읽기 중 잘못 짚은 template/manifest 경로는 실제 `stage_report.md`·`scripts/updater/manifest.mjs`로
바로잡았다. 해당 파일 부재를 제품 결함이나 gate 실패로 기록하지 않는다.

실행하지 않은 검증: native·GUI·Studio build·test, signing, Actions dispatch, 공개 artifact 다운로드,
Release·Pages 배포와 production updater. 이번 통과는 문서의 정합성 검증이지 새 제품 수용이 아니다.

## 잔여 위험

- 현재 updater/Pages stable-only와 #9 prerelease 계획, 수동 패키지 게시 경로가 정렬되지 않았다.
- 동일 게시 bytes의 사전 설치 승인 gate와 Windows Authenticode/미서명 정책을 확정해야 한다.
- release 환경의 승인자 설정은 ref 제한이나 branch protection 완료를 의미하지 않는다.
- PDF #19 및 미실행 OS·GUI 조합의 위험 판단은 #9/owner에게 남아 있다.
- 과거 archive는 retention으로 사라질 수 있다. 고정 원문 보존은 binary를 영구 보관하는 방식이 아니다.

## 다음 단계 영향

- Stage 2에서 현재 구현에 존재하는 명령만 사용해 runbook·최소 체크리스트를 만든다.
- 위 미구현·미승인 경로는 명시 중단 지점으로 다루고 문서 작업 중 workflow를 임의 확장하지 않는다.
- Stage 3에서 README·개발 문서·템플릿 인덱스와 #9 인계를 정렬하고 모의 walkthrough를 확인한다.

## 승인 요청

- Stage 1 산출물·이력 보존·검증 결과를 승인하면 Stage 2로 진행한다.
- 이 승인 요청은 실제 릴리즈, key/environment 변경, CI 실행이나 #9 Go 판정을 포함하지 않는다.

[original]: https://github.com/postmelee/alhangeul-tauri/blob/10c8c9aedb2b72436896ea3296b5200aa88793a7/docs/operations/DESKTOP_RELEASE.md
[mac-runbook]: https://github.com/postmelee/alhangeul-macos/blob/b8c45fb1c9f749e45895aa5b5b7eae181decfe16/mydocs/manual/public_release_runbook.md
[mac-index]: https://github.com/postmelee/alhangeul-macos/blob/b8c45fb1c9f749e45895aa5b5b7eae181decfe16/mydocs/release/index.md
[mac-record]: https://github.com/postmelee/alhangeul-macos/blob/b8c45fb1c9f749e45895aa5b5b7eae181decfe16/mydocs/release/v0.1.10.md
