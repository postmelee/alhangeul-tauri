# Task #147 Stage 2 — v0.1.4 소스 통합

[이슈 #147](https://github.com/postmelee/alhangeul-tauri/issues/147) · [구현계획](../plans/task_m010_147_impl.md)

## 단계 목적

rhwp v0.9.1 고정과 제품·글꼴 고지 변경을 devel에서 검증한 뒤 main의 비게시 후보 소스로 통합한다.

## 산출물

| 위치 | 내용 |
|---|---|
| [통합 PR #148](https://github.com/postmelee/alhangeul-tauri/pull/148) | #146의 원래 고정 커밋, Windows 설치 검사 보정, 다섯 버전 설정, Studio 글꼴과 고지 입력 |
| [릴리즈 준비 PR #149](https://github.com/postmelee/alhangeul-tauri/pull/149) | `main` 후보 `b2d22963d5e0524484c409a9196aa9b58fa82834` |

## 본문 변경과 동작 보존

업스트림 Rust와 Studio의 고정 커밋은 `981ce66b4183b13c1a3b5907e04a8969c8c42034`다. 기존 v0.1.3 공개 파일과 사이트 피드는 이 단계에서 교체하지 않았다.

## 검증 결과

- 통합 브랜치의 메타데이터·Windows 설치 검사 계약 27건과 제품 버전 검사를 통과했다.
- [PR 필수 검사 44943891886](https://github.com/postmelee/alhangeul-tauri/actions/runs/44943891886)의 Node/Studio·PowerShell·required 검사를 통과했다. devel merge tree가 PR head와 동일하고 main merge tree가 devel과 동일하다.
- [Linux 반복 저장 44942975755](https://github.com/postmelee/alhangeul-tauri/actions/runs/44942975755)은 최초 오류가 나타난 동일 DEB로 한 편집기에서 HWP·HWPX 각 네 번 저장 및 재열기를 통과했다.

## 잔여 위험

최초 Linux 저장 오류는 재현되지 않았다. MSI 강제 재설치의 재부팅 후 확인과 실제 v0.1.4 파일 수용은 배포 전에 완료한다. Windows Authenticode와 production Minisign은 별도 판정이다.

## 다음 단계 영향

[일반 후보 44944606600](https://github.com/postmelee/alhangeul-tauri/actions/runs/44944606600)과 [비게시 서명 후보 44944605249](https://github.com/postmelee/alhangeul-tauri/actions/runs/44944605249)는 같은 main SHA를 사용한다. 서명 실행은 기존 release 환경 리뷰를 적용한다.

## 진행 승인

작업지시자의 배포·공개 검증·후속 정리 지시에 따라 다음 단계로 진행한다.
