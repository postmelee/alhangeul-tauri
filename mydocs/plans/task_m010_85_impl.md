# Task #85 구현계획서 — 사용자·커뮤니티 공개 정비

수행계획서: [task_m010_85.md](task_m010_85.md)
GitHub Issue: [#85](https://github.com/postmelee/alhangeul-tauri/issues/85)
마일스톤: M010

작업지시자의 “작업을 계속진행하고 PR 생성까지 진행해줘” 승인을 적용한다.
각 단계 결과·검증·커밋을 남기며 최종 PR 게시까지 계속한다. 병합·이슈 close는 제외한다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 사용자 문서 | README, CODE_OF_CONDUCT, CONTRIBUTING, SECURITY | 공개 상태·링크·pin marker·실제 이미지·표준 원문/출처 |
| 2 | 기여 진입점·About | 기존 bug/feature 폼·chooser·docs 인덱스, remote metadata/private reporting | 폼 스키마·labels·기밀 보호·원격 정확한 값 |
| 3 | 통합·최종 PR | 단계/최종 보고·orders·PR | GFM 렌더링·링크·관련 기존 계약·제품 불변·PR head/base |

## 문서 위치 확인

README·커뮤니티 문서는 승인한 저장소 루트, 폼/chooser는 기존 .github/ISSUE_TEMPLATE,
인덱스는 기존 docs/README.md, 내부 산출물은 mydocs/plans·working·report·orders를 사용한다.
새 공식 문서 루트·파일 이동·site 소스 변경은 없다.

## Stage 1 — 사용자 문서

- 첫 화면: 제품명·사용자 가치·다운로드/업데이트/문의 링크, 실제 두 OS 이미지.
- 지원 패키지·설치 선택·글꼴·썸네일·PDF/인쇄·known limits를 간단히 정리하고 운영 상세는 기존 docs로 연결.
- 현재 Stable pin 한 줄은 upstream managed-reference 계약과 동일한 문자열을 유지한다.
- 한국어 Contributor Covenant 2.1 공식 원문, 실제 연락처와 출처를 보존한다.
- 외부 기여자에게 fork/devel PR와 재현·검증을 안내하고 내부 task 문서 전체 작성을 요구하지 않는다.
- SECURITY는 최신 stable 보안 수정 대상·GitHub 비공개 제보/기존 feedback 대안을 안내한다.
  SLA·보상·장기 지원은 약속하지 않는다.

검증: 상대/외부 링크, GitHub Markdown 렌더링, 이미지·다운로드/지원 형식·공개 상태 대조,
`node --test tests/rhwp-managed-references.test.mjs`, `git diff --check`.
커밋: `Task #85 Stage 1: 사용자 README와 커뮤니티 안내 정비`.

## Stage 2 — 기여 진입점·원격 설정

- bug/feature 폼은 한국어로 안내한다. engine/demo 비교는 선택적이며 private 문서 업로드를 요구하지 않는다.
- 제품 통합 문제의 engine 데모 확인 의무를 제거하고 유효한 package/version/OS/재현 정보를 받는다.
- 기존 task form·PR template은 그대로 유지한다. chooser에 사이트/문의/security를 연결한다.
- 기존 docs 인덱스에 root 기여·행동·보안 링크를 연결한다.
- 승인한 About description/homepage/topics와 private vulnerability reporting=true를 CLI로 반영.
  변경 전 json을 임시 증거로 보존하고 read-back으로 확인한다. 다른 저장소 설정은 수정하지 않는다.

검증: GitHub Issue Form schema/YAML 확인, 기존 label·내부 template hash 보존,
metadata·topics·private reporting API read-back과 공개 링크 정상 접근, `git diff --check`.
커밋: `Task #85 Stage 2: 사용자 제보 동선과 저장소 소개 설정 반영`.

## Stage 3 — 통합·최종 PR

- 임시 로컬 Markdown 렌더링과 게시 브랜치의 GitHub 파일/Issue preview 확인.
- 관련 기존 문서/Pages/upstream 계약을 실행한다. 문서 정비로 제품 native/full 재빌드를 반복하지 않는다.
- 최종 보고서와 완료 시각을 기록하고 publish/task85 → devel Open PR을 생성·연결한다.
- Community Standards UI는 새 파일이 devel에 병합된 뒤에만 최종 수용한다.
  API는 SECURITY/Issue Forms 인식 범위가 다를 수 있어 실제 UI 대조를 우선한다.

검증: GFM·로컬 링크/anchor·외부 링크/이미지, 관련 계약·Pages build/check·product-boundary,
제품/upstream/lock/workflow 불변, reports·diff·PR head/base. 신규 implementation-mirror 테스트는 추가하지 않는다.
커밋: `Task #85 Stage 3 + 최종 보고서: 공개 안내 검증과 Community Standards 인계`.

## 단계 의존성과 잔여 확인

단계 종료 보고를 작성하며 승인한 순서로 계속한다. 문서 PR 게시가 모든 Community Standards
체크 충족이나 운영 Pages 배포를 의미하지 않는다. 체크 충족의 마지막 근거는 병합 후 기본 브랜치 UI다.
기존 Release·설치본·updater/tag는 불변이다. 이메일·실제 보안 신고·일반 Issue는 테스트로 전송하지 않는다.
