# Task #135 Stage 2 — 공개 정책 작성

GitHub Issue: [#135](https://github.com/postmelee/alhangeul-tauri/issues/135)
구현계획서: [구현계획](../plans/task_m010_135_impl.md)

## 단계 목적
확인한 처리 경계와 최신 보안 지원 정보를 사용자에게 안내.
## 산출물
SECURITY.md의 버전·확인 날짜·latest 링크, site/privacy/index.html, 홈페이지/업데이트/문의의 정책 링크. 문의 페이지에 보안 제보 안내 추가.
## 본문 변경 정도 / 본문 무손실 여부
SECURITY.md의 기존 제보·공개 원칙과 이메일을 보존. 사이트 기존 내용은 보존하고 링크만 추가. 개인정보처리방침 신규 작성. 제품 코드·upstream·서명 설정 무변경.
## 검증 결과
source·설정·외부 정책과 문구 수동 대조. `git diff --check` 통과. 사이트 자동 검증은 Stage 3에서 실행.
## 잔여 위험
실제 OS 트래픽·로그 잔존·이메일 수신은 미검증. 외부 서비스 처리와 보관은 해당 정책에 따름.
## 다음 단계 영향
신규 페이지를 포함한 전체 사이트 build/check와 기존 테스트 실행 필요.
## 승인 및 진행
명시 진행 지시에 따라 Stage 3 검증·보고 진행.
