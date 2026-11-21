# Task #147 Stage 5 — 운영 업그레이드와 인계

GitHub Issue [#147](https://github.com/postmelee/alhangeul-tauri/issues/147)

구현계획서 [task_m010_147_impl.md](../plans/task_m010_147_impl.md)

Stage 5

## 단계 목적

이미 공개된 동일 설치 형식에서 실제 앱 안 업데이트와 사용자 데이터 보존을 확인하고 릴리즈 결과를 인계한다.

## 산출물

| 파일 또는 검사 | 변경 요약 |
|---|---|
| [운영 업그레이드 44961070571](https://github.com/postmelee/alhangeul-tauri/actions/runs/44961070571) | NSIS·MSI·AppImage에서 같은 설치 형식으로 v0.1.3→v0.1.4 |
| `README.md`, `docs/releases/` | 운영 확인 결과 및 수동 패키지 경로 |
| `mydocs/report/task_m010_147_report.md`, `mydocs/orders/20261120.md` | 최종 보고와 작업 시간 기록 |

## 본문 변경 정도 / 본문 무손실 여부

기존 릴리즈 기록과 공개 검증 이력을 보존하고 v0.1.4 운영 업데이트 결과를 추가했다.

## 검증 결과

- `df278ceac5c4aef460418803ca8150304257f014`의 정확한 테스트 입력으로 두 공개 Release의 ID·tag·선택 파일·업데이터 서명과 실제 운영 피드 `1bb8c4511a3aa25625a7f598f94555d75ef86868450da9faa21c57e48c1d10f1`를 검증했다. v0.1.3은 재배포된 공개 파일 기준이다.
- 운영에서 시작/수동 업데이트 확인, 편집 중 문서 보호, 사용자의 설치 동의, 설치·재실행, v0.1.4 제품 정보, 업데이트 없음, 기존 설정 보존을 확인했다. 각 형식에서 실제 HWP 6쪽·HWPX 10쪽이 열리고 원본 바이트가 보존됐다.
- AppImage는 앱이 교체한 원래 AppImage 파일의 SHA-256이 공개 v0.1.4와 일치했다. Windows는 설치 항목과 실행 파일의 버전, HWP/HWPX 연결을 대조하고 테스트 설치를 제거했다.

| 설치 형식 | 운영 결과 | 원시 증거 ZIP |
|---|---|---|
| NSIS | 통과, Windows v0.1.4 재실행 | 14730325614 |
| MSI | 통과, Windows v0.1.4 재실행 | 14729213664 |
| AppImage | 통과, 실제 파일 교체와 재실행 | 14729169929 |

- 공개 페이지에서 DEB x64·RPM x64·DEB arm64의 수동 다운로드와 안내 문구를 확인했다. [v0.1.4 안내](https://postmelee.github.io/alhangeul-tauri/updates/v0.1.4.html)

## 잔여 위험

Windows Authenticode와 Smart App Control의 설치 제약, 사용자별 NSIS의 관리자 탐색기 제약을 3단계 기록과 공개 안내에 남겼다. Actions 진단 아카이브는 보존 기한이 있다.

## 다음 단계 영향

결과를 일반 PR로 병합하고 기본 브랜치에 기록을 동기화한 뒤 #147과 임시 작업 브랜치를 정리한다. 새 버전에서는 v0.1.4 공개 파일과 피드 식별자를 기준으로 검증한다.

## 승인 기록

검사 통과 후 배포·공개 검증·후속 정리를 별도 승인 없이 진행하라는 작업지시를 적용했다.
