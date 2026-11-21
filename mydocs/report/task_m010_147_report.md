# Task #147 최종 보고서 — Alhangeul v0.1.4

GitHub Issue [#147](https://github.com/postmelee/alhangeul-tauri/issues/147)

마일스톤 M010

## 작업 요약

- 5개 단계에서 rhwp v0.9.1을 수용하고 Alhangeul v0.1.4를 Windows·Linux용 stable로 공개했다.
- rhwp pin은 `981ce66b4183b13c1a3b5907e04a8969c8c42034`이며 제품 source는 `dad348a78f059dad282c8803737306d31b163c9d`다.
- 공개 설치 파일 6종, 서명과 체크섬을 포함한 파일 11개, Pages 27개 파일 및 실제 운영 업데이트 3종을 검증했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `third_party/rhwp`, `apps/studio-host`, `apps/desktop`, `assets/fonts` | upstream 고정과 버전, 글꼴 고지, 설치 라이선스 경로 보정 | Windows·Linux 편집기와 설치 파일 |
| `.github/workflows`, `scripts/ci`, `scripts/updater`, `tests/gui` | 정확한 설치 파일·Explorer·PDF·라이선스 검증 및 운영 업그레이드 | 검증·릴리즈 자동화 |
| `docs/releases`, `site`, `README.md` | 공개 노트·현재 버전, 6개 다운로드·3개 업데이트 경로 | 사용자 안내 |
| `mydocs/working`, `mydocs/report`, `mydocs/orders` | 수용 증거, 완료 기록과 후속 인계 | 작업 추적 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 공개 기록·사용자 원문 | `docs/releases` | 동일 | OK | 공개 정책과 구현계획 |
| 생성 웹·공개 피드 입력 | `site` | 동일 | OK | 생성 노트·Pages 계약 |
| 후보 ID·단계·최종 보고·보드 | `mydocs`의 승인 폴더 | 동일 | OK | M010 파일명과 중앙 템플릿 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 최신 안정 버전 | v0.1.3 | v0.1.4 |
| 포함 rhwp | v0.9.0 | v0.9.1 |
| v0.1.4 공개 파일 | 준비 | 설치 파일 6종, 전체 11개 |
| 실제 Windows 클라이언트 Explorer | 사전 후보 | 서명 후보의 9개 실행에서 bitmap 4/4와 화면 확인 |
| 운영 v0.1.3→v0.1.4 | 준비 | NSIS·MSI·AppImage 3/3 |
| 공개 웹 | v0.1.3 | 27/27 바이트 대조, 화면 8개 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 정확한 source·pin 및 필수 검사 | OK — #150·#151, 일반 전체 44952809342, 비게시 서명 44952809158 |
| 게시 파일의 실제 설치·고지 | OK — Windows NSIS·MSI와 Linux AppImage·DEB x64/arm64·Fedora RPM의 문서 검증 및 각각 고지 원문 23개 |
| Windows 10·11 탐색기와 MSI 실제 재부팅 | OK — 신규·동일 형식 업그레이드, 9개 실제 Explorer 캡처, MSI 3010 후 재부팅·새 프로세스와 해시 |
| Windows 및 Linux PDF·Linux GUI | OK — Windows 첫 실행·재실행 PDF 4개, AppImage PDF 2개, DEB GUI 8개 및 시스템 인쇄 |
| 릴리즈와 공개 무결성 | OK — Release 454047556, 11개 파일 재검증, Minisign 서명 3종 |
| 웹과 운영 피드 | OK — Pages 44960976347, 공개 HTTP 27개, 운영 SHA-256 `1bb8c4511a3aa25625a7f598f94555d75ef86868450da9faa21c57e48c1d10f1` |
| 실제 운영 자동 업데이트 | OK — 44961070571, 동일 설치 형식 3종에서 버전·설정·HWP/HWPX·소스 보존 |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_147_stage1.md)에서 정확한 upstream v0.9.1을 수용했다.
- [Stage 2](../working/task_m010_147_stage2.md)에서 제품 버전과 main 통합 후보를 확정했다.
- [Stage 3](../working/task_m010_147_stage3.md)에서 WiX 충돌, Windows PDF 줄바꿈 및 AppImage 시나리오 격리를 보정하고 최종 파일을 수용했다.
- [Stage 4](../working/task_m010_147_stage4.md)에서 GitHub·Pages·안정 피드를 공개하고 파일을 원격에서 재검증했다.
- [Stage 5](../working/task_m010_147_stage5.md)에서 실제 운영 업데이트를 확인했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- Windows 설치 프로그램은 Authenticode `NotSigned` 상태다. 사용자별 NSIS는 표준 사용자 탐색기에서 수용했다. 관리자 환경에는 MSI를 제공한다.
- 최초 Linux 사전 후보의 간헐적 저장 오류는 반복·격리 및 최종 GUI 검증에서 재현되지 않았다. 그 원인은 확정하지 않았다.
- Windows 10·11의 관측 범위는 기록한 클라이언트 게스트다. 다양한 프린터, 배포판과 모든 문서 배치를 포괄하지 않는다.
- Actions 아카이브는 보존 기한이 있다. 공개 파일, 식별자와 결과는 릴리즈와 단계 문서를 참고한다.

### 후속 작업 후보

Windows 신뢰 정책·코드 서명 도입은 [#133](https://github.com/postmelee/alhangeul-tauri/issues/133)과 [#135](https://github.com/postmelee/alhangeul-tauri/issues/135)에서 계속 추적한다.

## 작업지시자 승인 기록

Windows 전체와 Linux GUI를 재검증하고 필수 검사 통과 후 별도 승인 없이 배포·공개 검증·후속 정리까지 진행하라는 지시를 적용했다. 이 보고의 병합 뒤 이슈와 임시 작업을 정리한다.
