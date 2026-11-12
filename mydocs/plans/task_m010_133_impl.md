# Task #133 구현계획서

사용자의 이슈 등록·안전한 설치 안내 수정 지시 및 후속 진행 승인 범위에서 구현한다.

## Stage 1
기존 site/index.html Windows 패널에 보안 안내 링크를 추가하고 site/updates/index.html에 현재 v0.1.3 미서명 및 안전한 제보 안내를 넣는다. 설치/실행 우회나 지원 완료를 약속하지 않는다.

## Stage 2
pages.test.mjs에서 안내 링크·문구 계약을 검증한다. Pages source 검사/빌드/회귀와 product boundary 검사 및 diff check를 실행한다. Windows native 설치는 미실행으로 기록한다.

## 완료 경계
문서 변경만 완료할 수 있으며 실제 SAC 설치 차단과 서명은 미해결이다. 배포는 실행하지 않는다.
