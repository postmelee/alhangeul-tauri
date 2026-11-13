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
기존 검사로 충분한 문서 변경이므로 별도 구현 미러링 테스트는 추가하지 않는다. Stage 3에서 신규 페이지로 인한 고정 파일 개수 실패가 확인되어 tests/pages.test.mjs의 기대 개수만 1 증가시킨다. native 빌드·배포는 실행하지 않는다.
커밋: `Task #135 Stage 3 + 최종 보고서: 정책 문서 검증 결과 기록`

## 단계 의존성
조사 결과를 공개 문구에 반영한 뒤 빌드와 검증한다. 실패는 통과로 기록하지 않는다.

## 위험과 대응
제3자 보관·삭제는 해당 사업자 정책으로 연결한다. 이메일 수신 시험, 실제 Windows/Linux 트래픽 캡처, SignPath 승인 여부는 검증 범위 밖으로 명시한다.

## 승인 및 진행 근거
후속 명시 지시의 task-start·계획·구현·검증 범위 안에서 진행한다. 최종 보고 후 PR 게시·merge는 별도 지시를 기다린다.

## Stage 4 — 추가 실증 검증 (2026-11-14 KST 승인)
사용자가 “실제 OS 트래픽·이메일 수신·시각 렌더링 등 남은 작업” 진행을 명시했다.
- 사이트: 로컬 Chrome 1440/390px 렌더링, 화면 read-back·가로 넘침·세 진입 링크 확인. 데스크톱 앱의 지원 외 OS 검증과 구분한다.
- 메일: 사용자가 선택한 업무용 계정에서 제보함으로 시험 식별자만 보낸 뒤 INBOX 수신 확인. 개인 주소·메일 ID는 저장소에 기록하지 않는다.
- OS: 로컬 실행 환경이 없어 publish/task135의 전용 Actions에서 Windows 2025 NSIS 및 Ubuntu 22.04 AppImage 공개 v0.1.3을 고정 SHA-256으로 확인 후 시작·idle 45초 관측. 빌드·릴리스·배포·서명·신청 없음.
- Windows WFP 연결 이벤트, Linux strace connect syscall로 프로세스의 목적지·포트를 관측한다. 문서·계정·credential 없이 실행하고 TLS 복호화나 전체 패킷 본문 수집은 하지 않는다. 스크린샷과 로그 파일 존재·크기만 함께 기록한다.
- 수용: 실제 앱 생존·화면과 연결 기록을 확인한다. 기록 0개·앱 실패는 네트워크 없음으로 판정하지 않는다. 시작/idle 이외 편집·모든 통신 부재는 증명하지 않는다.
- 산출: .github/workflows/alhangeul-privacy-observation.yml, scripts/privacy/{prepare.mjs,observe-linux.sh,observe-windows.ps1}, working의 stage4 보고 및 assets/task135, 최종 보고서 보완.
- 파일 위치: 검증 자동화는 기존 .github/workflows·scripts/ 관습, 증거는 mydocs/working/assets/task135. 공개 제품 정책은 기존 위치 유지. 원격 실행을 위해 publish/task135 push만 수행하고 PR·merge는 하지 않는다.
