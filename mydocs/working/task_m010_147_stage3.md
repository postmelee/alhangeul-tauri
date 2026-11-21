# Task #147 Stage 3 — v0.1.4 최종 설치 파일 수용

GitHub Issue [#147](https://github.com/postmelee/alhangeul-tauri/issues/147)

구현계획서 [task_m010_147_impl.md](../plans/task_m010_147_impl.md)

Stage 3

## 단계 목적

배포할 6개 설치 파일 각각을 최종 main SHA `dad348a78f059dad282c8803737306d31b163c9d`의 생산 아카이브에서 식별하고 해당 OS에서 설치·문서 동작과 고지를 검증한다. 서명 파일은 공개 전에 독립 검산한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_147.json` | 승인한 아카이브와 파일 SHA-256, producer 실행 고정 |
| `.github/workflows/` 및 `scripts/ci/` | 정확한 서명 파일로 Windows 클라이언트·PDF·패키지 고지와 실제 MSI 재부팅 검증 |
| `tests/gui/specs/release-files.e2e.ts` | AppImage의 HWP·HWPX PDF를 격리된 세션에서 검사 |
| `docs/releases/v0.1.4.md` | 후보별 식별자와 원시 결과 기록 |

## 본문 변경 정도 / 본문 무손실 여부

WiX가 두 원본의 동일 파일명을 보존해 한 설치 폴더에서 충돌했다. #150과 #151에서 알한글과 rhwp의 `LICENSE` 설치 폴더를 분리했다. 각 고지 원문은 그대로 동봉했다. Windows PDF 체크아웃에서는 Git 줄바꿈 변환을 비활성화했고 AppImage PDF 검증은 두 문서 사이에서 앱 세션을 재시작하도록 수정했다.

## 검증 결과

- [일반 전체 검사](https://github.com/postmelee/alhangeul-tauri/actions/runs/44952809342)와 [비게시 업데이터 서명](https://github.com/postmelee/alhangeul-tauri/actions/runs/44952809158)이 위 main SHA에서 성공했다. 첫 WiX 실패 소스와 산출물은 별도로 보존했다. [실패한 비게시 실행](https://github.com/postmelee/alhangeul-tauri/actions/runs/44944605249)
- 서명 Windows ZIP 14728500241, Linux ZIP 14727067046, 통합 서명 inventory ZIP 14727199126, 일반 Linux x64 ZIP 14727454982, Linux arm64 ZIP 14728295653을 각 기록의 아카이브 digest와 대조했다. Windows NSIS·MSI와 Linux AppImage의 Minisign 3개를 공개키로 다시 검증했다. Linux ZIP은 원래의 대소문자 경로와 바이트를 직접 읽어 inventory와 비교했다. 공개 파일용 `SHA256SUMS` SHA-256은 `0b36e95a92ba59c1081966508f904f0a7891e16c88241681bea795dead39e44c`다.
- [최종 서명 파일 설치](https://github.com/postmelee/alhangeul-tauri/actions/runs/44958026853)에서 Windows NSIS·MSI와 Linux AppImage의 HWP·HWPX 열기·Save As·현재 파일 저장·프로세스 재시작 후 재열기를 통과했다. 각 설치 환경에서 고지 23개를 원문과 비교했다. Windows EXE·MSI의 Authenticode 상태는 각각 `NotSigned`다. AppImage 분석 ZIP 14728459589의 HWP 6쪽과 HWPX 10쪽은 한글 텍스트와 페이지 렌더를 확인했다.
- [Windows 직접 PDF](https://github.com/postmelee/alhangeul-tauri/actions/runs/44958026930)에서 같은 서명 NSIS를 설치하여 첫 실행·재시작에서 HWP 6쪽·HWPX 10쪽씩 네 파일을 만들었다. 원시 ZIP 14728966217과 분석 ZIP 14728782842를 검산했다. 원본 보존 및 네 PDF SHA-256이 일치하고 두 실행의 렌더링 바이트도 같았다. 16개 고유 렌더를 확인했다.
- [Linux x64 DEB GUI](https://github.com/postmelee/alhangeul-tauri/actions/runs/44959050203)에서 실제 설치 후 HWP·HWPX, 문서 저장·끌어놓기, 시스템 인쇄·직접 PDF와 썸네일 등 GUI 시나리오 8개를 통과했다. 원문 고지 23개와 증거 ZIP 14728404065를 검산했다.
- [Fedora x64 RPM](https://github.com/postmelee/alhangeul-tauri/actions/runs/44959053788)은 Fedora 44 x64 KVM 게스트의 Xfce/X11에서 `alhangeul x86_64 0.1.4-1`을 설치했다. HWP·HWPX 편집·저장·재실행·재열기와 고지 원문 23개가 통과했다. 증거 ZIP은 14729190753이다.
- [Linux arm64 DEB](https://github.com/postmelee/alhangeul-tauri/actions/runs/44959053508)의 설치 식별은 `alhangeul arm64 0.1.4`다. HWP·HWPX 편집·저장·재실행·재열기와 라이선스 원문 23개가 통과했다. ZIP 14729220803을 대조했다.

Windows 10 19045와 Windows 11 26300의 실제 Explorer 캡처와 Shell bitmap은 아래 9개 실행에서 확인했다. 각 경로에서 HWP·HWPX 및 대조 JPG 4/4를 검사했고 작은 HWP는 원본이 빈 문서다. 업그레이드에서는 직전 공개 v0.1.3 설치 파일의 해시를 고정했고 사용자별 데이터 보존을 확인했다.

| Windows | NSIS 신규 | MSI 신규 | NSIS 업그레이드 | MSI 업그레이드 |
|---|---|---|---|---|
| 10 | [44957098412](https://github.com/postmelee/alhangeul-tauri/actions/runs/44957098412) | [44957097316](https://github.com/postmelee/alhangeul-tauri/actions/runs/44957097316) | [44957099144](https://github.com/postmelee/alhangeul-tauri/actions/runs/44957099144) | [44957098266](https://github.com/postmelee/alhangeul-tauri/actions/runs/44957098266) |
| 11 | [44957099823](https://github.com/postmelee/alhangeul-tauri/actions/runs/44957099823) | [44957098934](https://github.com/postmelee/alhangeul-tauri/actions/runs/44957098934) | [44957099984](https://github.com/postmelee/alhangeul-tauri/actions/runs/44957099984) | [44957098576](https://github.com/postmelee/alhangeul-tauri/actions/runs/44957098576) |

Windows 11 MSI 강제 재설치 [44957099232](https://github.com/postmelee/alhangeul-tauri/actions/runs/44957099232), ZIP 14727709134에서 실제 `3010`을 관측했다. 게스트의 부팅 시각이 바뀌고 대기 파일 교체 표시가 해제됐으며 실행 파일·핸들러·워커의 해시, 새 편집기, 재부팅 전후 bitmap 4/4와 제거를 확인했다.

첫 [Windows PDF](https://github.com/postmelee/alhangeul-tauri/actions/runs/44957098180)는 체크아웃의 CRLF 때문에 원본 Git blob 대조에서 실패했다. 실패 해시를 같은 LF→CRLF 변환으로 재현했다. 첫 [AppImage 설치 검사](https://github.com/postmelee/alhangeul-tauri/actions/runs/44957098108)의 HWP PDF에는 성공했지만 HWP가 열린 상태에서 HWPX 사례가 빈 창을 기다려 시간 초과됐다. 실패 화면에 첫 HWP와 PDF 저장 완료 상태가 남았다. 검사기 보정 [계약 검사](https://github.com/postmelee/alhangeul-tauri/actions/runs/44958025188)와 실제 재검증을 완료했다. 같은 설치 파일을 사용했다.

## 잔여 위험

- Windows 사용자별 NSIS는 표준 사용자 탐색기 기준이다. 호스티드 관리자 문맥에서 원시 `0x80040154`가 관측된다. 관리자 환경에는 MSI를 사용한다.
- Windows Authenticode 및 Smart App Control 관련 이슈 #133·#135는 계속 열린 상태다. 업데이터 Minisign은 위 세 파일에서 검증했다.
- 최초 Linux GUI의 간헐적 저장 오류는 반복 검증에서 재현되지 않았다. 보존한 실패 이력에 원인 미확정으로 남겼다.
- 실제 앱 내부 production 업데이트는 공개 피드 활성화 후 동일 형식별로 검증한다.

## 다음 단계 영향

독립 검산 파일 11개와 생성한 GitHub 본문으로 draft의 바이트를 검증한다. stable 게시 후 파일을 익명으로 다시 내려받아 검산하고 실제 공개 시각으로 웹 원문과 피드를 확정한다.

## 승인 기록

작업지시자의 “필수 검사 통과하면 별도 승인 없이 v0.1.4 배포·공개 검증·후속 정리까지 완료” 지시에 따라 검증 결과를 바탕으로 다음 공개 단계를 진행한다.
