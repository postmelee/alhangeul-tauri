# Task #135 구현계획서

수행계획서: [task_m010_135.md](task_m010_135.md)
GitHub Issue: [#135](https://github.com/postmelee/alhangeul-tauri/issues/135)
마일스톤: M010

## 단계 개요
| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 사실 확인 | 기술 조사·보안 경로·데이터 흐름 | source·API·공식 원문 대조 |
| 2 | 공개 정책 | SECURITY.md, site/privacy/index.html, 세 진입 링크 | 문구·상대 링크 |
| 3 | 검증·보고 | 단계·최종 보고서 | Pages check/build/test, diff check |

## 문서 위치 확인
수행계획서의 경로를 그대로 사용한다. 공개 정책은 root SECURITY.md 및 기존 site/, 신청 전 조사와 승인 미확정 항목은 mydocs/tech/, 작업 기록은 plans/working/report/orders에 둔다.

## Stage 1 — 사실 확인
산출물: mydocs/tech/task_m010_135_signpath.md 및 stage1 보고서.
최신 안정 release, private-vulnerability-reporting 활성 상태, 로컬·자동·수동·제3자 처리를 source와 공식 정책으로 대조한다. 개인정보 미수집/자동 삭제를 추정하지 않는다.
검증: GitHub GET과 source/config inspection, git diff --check.
커밋: `Task #135 Stage 1: 데이터 흐름과 SignPath 신청 요건 조사`

## Stage 2 — 공개 정책
산출물: SECURITY.md, site/privacy/index.html, site/{index.html,updates/index.html,feedback/index.html}, stage2 보고서.
기존 사이트 CSS와 구조를 재사용한다. 코드 서명 후원 문구를 추가하지 않는다.
검증: source 근거 대조, 상대 링크·민감정보 주의 안내 검토, git diff --check.
커밋: `Task #135 Stage 2: 보안 정책과 개인정보처리방침 작성`

## Stage 3 — 검증·최종 보고
산출물: stage3 보고서와 report/task_m010_135_report.md, orders 상태.
검증: `pnpm run build:pages`, `pnpm run check:pages`, `node --test tests/pages.test.mjs`, `git diff --check`.
기존 검사로 충분한 문서 변경이므로 별도 구현 미러링 테스트는 추가하지 않는다. native 빌드·배포는 실행하지 않는다.
커밋: `Task #135 Stage 3 + 최종 보고서: 정책 문서 검증 결과 기록`

## 단계 의존성
조사 결과를 공개 문구에 반영한 뒤 빌드와 검증한다. 실패는 통과로 기록하지 않는다.

## 위험과 대응
제3자 보관·삭제는 해당 사업자 정책으로 연결한다. 이메일 수신 시험, 실제 Windows/Linux 트래픽 캡처, SignPath 승인 여부는 검증 범위 밖으로 명시한다.

## 승인 및 진행 근거
후속 명시 지시의 task-start·계획·구현·검증 범위 안에서 진행한다. 최종 보고 후 PR 게시·merge는 별도 지시를 기다린다.
