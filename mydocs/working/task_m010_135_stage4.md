# Task #135 Stage 4 — 추가 실증 검증

GitHub Issue: [#135](https://github.com/postmelee/alhangeul-tauri/issues/135)
구현계획서: [계획](../plans/task_m010_135_impl.md)

## 단계 목적
2026-11-14 KST 사용자의 명시 지시에 따라 이전에 미실행한 이메일 수신·사이트 화면·실제 지원 OS 연결 관측을 수행한다.

## 산출물
전용 Actions workflow 및 scripts/privacy 관측 도구, [화면 증거](assets/task135/visual-check.json), desktop/mobile PNG, 실제 OS 실행 결과.

## 본문 변경 정도 / 본문 무손실 여부
제품 실행·업데이트·서명·배포 동작 무변경. 공개 v0.1.3 설치본을 exact SHA-256으로 확인해 관측한다. 이슈 #135의 추가 검증이며 새로운 기능 구현이 아니다.

## 검증 결과
### 이메일 수신
사용자가 선택한 업무용 Gmail에서 공개 제보 주소로 첨부 없는 시험 메일 1통을 발송했다. 수신 계정 API에서 식별자 TASK135-20261114-PRIVACY-CHECK 및 INBOX 라벨을 확인했다. 수신 시각은 2026-11-14 00:39 KST. 실제 취약점·문서 내용 없이 시험임을 명시했고 회신을 요청하지 않았다. 개인 발신 주소와 메일 ID는 저장소에 기록하지 않는다. 일반 제보 이메일의 이번 수신 성공이며 모든 발신 서비스의 배달·응답 SLA를 보장하지 않는다.

### 사이트 화면
로컬 build output을 Chrome에서 1440×1000 및 390×844 viewport로 렌더링했다. full-page PNG를 직접 확인했고 제목·한글 본문·구분선·푸터가 잘리지 않는다. document scrollWidth는 각각 1440/390으로 가로 넘침이 없다. JS pageerror 0, 홈·업데이트·문의의 정책 링크 이동 모두 성공. 이 작업은 정적 웹사이트 검증이며 macOS 데스크톱 앱 검증이 아니다.

### 자동화 검사
node --check prepare.mjs, bash -n observe-linux.sh, actionlint workflow 검사 통과. Action pin 테스트는 최초 로컬 yaml 의존성 부재로 시작 실패했고, lockfile 동일 yaml 2.9.0을 임시 폴더에 설치해 재실행해 14/14 통과했다. Action pin inventory 검사(30 files, 168 references)와 최종 Pages 106/106 테스트·build/check도 통과했다.

### 실제 OS 관측
| OS / 실행 | 결과 | 증거 |
|---|---|---|
| Windows 2025 NSIS, [run 43455118867](https://github.com/postmelee/alhangeul-tauri/actions/runs/43455118867) | Windows job 성공, 최초 전체 run은 Linux 실패 | [identity](assets/task135/windows/identity.json), [연결](assets/task135/windows/connections.json), [화면](assets/task135/windows/app-windows.png) |
| Ubuntu 22.04 x64 AppImage, [run 43455719096](https://github.com/postmelee/alhangeul-tauri/actions/runs/43455719096) | Linux 단독 재관측 성공 | [identity](assets/task135/linux/identity.json), [연결](assets/task135/linux/connections.txt), [화면](assets/task135/linux/app-linux.png) |

공개 제품 source SHA는 `bcb892d49a9003615f3acd980babd71e59e147dd`. Windows installer SHA-256은 `932c3316d9ea83cd5c38e3fe528518535751ac60fedd72776c5306085437c490`, Linux AppImage는 `740b622792eb6201691f5993c66f351d6b7cf3b66b5bbdda5771b5d0a2fc997e`로 고정 입력과 일치한다. Windows harness `3927d03e8814ca41ec91199e5f4778381dd250c8`, Linux harness `edafbd6dc421eb557acb4d7ac1400cf3a84cbb17`을 구분한다.

- Windows: Alhangeul PID 2172의 `185.199.108.153:443`과 `104.18.21.213:80` 허용 이벤트를 관측. WebView2 PID 2336은 부모 7456 → Alhangeul 2172 관계이며 `52.123.247.12:443` 등 추가 연결 이벤트가 있다. 185.199.108.153은 관측 직후 Pages DNS 결과에 포함되었다. 그 외 IP의 호스트·목적·데이터 내용을 단정하지 않는다.
- Linux: DNS resolver 127.0.0.53 연결 및 Pages DNS에 대응하는 `185.199.108.153:443` nonblocking connect 시작을 관측. IPv6 ENETUNREACH와 port 0 주소 선택용 connect를 성공한 외부 데이터 전송으로 세지 않는다. connect 성공/진행 중 표시는 HTTP 완료나 payload 증거가 아니다.
- 로그: Windows 앱 `Alhangeul.log`는 0 bytes지만 WebView2 진단·저장 파일이 존재했다. Linux `Alhangeul.log`는 20,302 bytes. [Windows inventory](assets/task135/windows/log-inventory.json) / [Linux inventory](assets/task135/linux/log-inventory.txt). 이번 관측은 존재·크기만 수집했고 내용·삭제·보관 기간은 검증하지 않았다.
- 첫 Linux 시도는 45초 뒤 추적 프로세스가 사라져 실패. 원래 stderr는 artifact에 포함하지 않아 정확한 원인을 확정하지 않았다. FUSE/ptrace 상호작용 가능성을 피하기 위해 공식 `--appimage-extract-and-run`으로 변경하고 재관측했다. FUSE mount 방식의 성공으로 기록하지 않는다.
- 성공한 Windows job은 같은 제품·관측 코드이므로 재사용했다. 현재 workflow는 수동 실행만 지원하며 OS 선택이 가능하다. 문서 변경으로 다시 실행하지 않는다.

### 발견 사항의 정책 반영
WebView2 추가 외부 연결·로컬 진단 파일 관측과 Microsoft 공식 문서를 근거로 공개 정책에 Microsoft WebView2의 필수·선택 진단, 기본 SmartScreen·오류 보고, Windows 설정 및 Microsoft 정책 링크를 추가했다. 개별 IP가 특정 진단 요청이라는 추정은 하지 않았다. 최종 변경 뒤 사이트 build/check·106개 테스트 및 화면 검증을 다시 통과했다.

보관한 텍스트 증거는 CRLF와 줄 끝 공백을 정규화했으며 값은 보존했다. sha256.json은 정규화된 저장소 파일 기준이다. 원시 artifact는 위 Actions run에 별도로 연결된다. 최종 전체 diff --check에서 발견한 원시 출력 공백을 정리한 뒤 통과했다.

## 잔여 위험
관측은 앱을 실행한 뒤 45초 대기한 구간이다. 추출·초기화 시간이 포함되므로 45초 전체가 idle인 것은 아니다. 이 시작·idle 연결 관측은 모든 작업·시간대·환경의 무통신 증명이 아니다. TLS 본문·개인 문서를 수집하지 않는다. 사이트 전체 외부 서비스 접근성이나 모든 이메일 제공자의 수신도 보장하지 않는다.

## 다음 단계 영향
관측 결과로 이전 보고서의 미검증 항목을 갱신했다. TLS 본문, 문서 열기·편집·저장·인쇄 중 트래픽, 수동 다운로드, MSI/DEB/RPM/arm64, 장시간 동작은 이번 실측 범위가 아니다. SignPath 신청·서명·계정 생성은 범위 밖이다.

## 승인 및 진행
이번 사용자의 명시 추가 검증 요청에 따라 진행한다.
