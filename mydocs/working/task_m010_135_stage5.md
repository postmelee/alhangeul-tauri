# Task #135 Stage 5 — TLS·문서 작업·로그 삭제·신청 준비

## 승인과 범위
작업지시자가 TLS 내용·문서 편집 중 통신·로그 삭제까지 진행하도록 명시했다. PR·배포는 최종 정책 페이지를 브라우저에서 확인하고 승인한 뒤 진행한다. 신청 제출·계정·서명 credential 생성은 제외한다.

## 실제 OS 검증
공개 v0.1.3의 기존 exact SHA-256 installer/AppImage를 사용했다. 제품 소스·바이너리를 바꾸지 않았다. 일회용 Actions 실행기에만 mitmproxy 시험 CA를 설치하고 서버 인증 검증은 유지했다. 이 프록시 환경은 Stage 4의 직접 연결 관측과 구분한다.

| 대상 | 실행·harness | 결과·증거 |
|---|---|---|
| Ubuntu 22.04 AppImage | [43460258600](https://github.com/postmelee/alhangeul-tauri/actions/runs/43460258600), bd10b0be | Linux job 성공. 전체 run은 이전 Windows CA 정체 때문에 취소. [문서](assets/task135/deep-linux/document-results.json), [TLS](assets/task135/deep-linux/tls-requests.jsonl), [identity](assets/task135/deep-linux/identity.json) |
| Windows 2025 NSIS | [43461436549](https://github.com/postmelee/alhangeul-tauri/actions/runs/43461436549), 586c83b3 | 단독 run 성공. [문서](assets/task135/deep-windows/document-results.json), [TLS](assets/task135/deep-windows/tls-requests.jsonl), [identity](assets/task135/deep-windows/identity.json) |

양 OS에서 공개 합성 Abel HWP/HWPX에 TASK135-SYNTHETIC-DOCUMENT를 입력했다. SVG 변화, export, native staged commit, 저장 bytes 동일성, 재열기(각 1쪽)를 확인했다. HWP 13,312 bytes·HWPX 7,439 bytes로 저장됐다. [Linux 화면](assets/task135/deep-linux/document-hwpx.png), [Windows 화면](assets/task135/deep-windows/document-hwpx.png)을 직접 확인했다. 파일 선택 dialog와 frontend fs plugin 쓰기는 생략하고 테스트 harness가 staged bytes를 쓴 뒤 실제 native commit을 호출했다. 일반 사용자 저장 UI 전체를 검증했다고 쓰지 않는다.

### TLS 내부 요청
- 양 OS: 시작·재시작의 `GET https://postmelee.github.io/alhangeul-tauri/updater/stable.json`, query 없음·request body 0 bytes·HTTP 200. Accept/Host/User-Agent를 관측했고 응답은 notes/platforms/pub_date/version 구조다. TLS 관측이 정상 동작한 positive control이다.
- Linux: 문서 시나리오를 위해 새로 실행한 프로세스의 시작 GET 외에 document-hwp/document-hwpx 구간의 프록시 요청은 관측되지 않았다.
- Windows: 시작 때 config.edge.skype.com 구성 GET 2건(200). document-hwpx 구간에 edge.microsoft.com JSON POST 2건. 4,908 bytes 요청은 200, 1,279 bytes 요청은 종료 시점에 응답을 받지 못했으므로 성공 응답으로 세지 않는다.
- Windows POST 구조에는 OS/arch/hw, 앱·구성요소 version/install/update 상태, requestid/sessionid, 구성요소 업데이트 이벤트 등이 있다. 구조는 런타임 업데이트와 일치하지만 문서 편집이 그 요청을 유발했다는 인과관계는 증명하지 않는다. 관측한 요청에서 합성 문구는 검출되지 않았다. 이것은 모든 문서 데이터·모든 통신의 부재 증명이 아니다.
- HTTP 원문, query 값, cookie/authorization, scalar body 값, 임시 CA·key는 증거 artifact/저장소에 포함하지 않는다. Windows 구조 검사는 scalar 대신 type만 남긴다. `tests/privacy_observer_test.py`로 body/query/header secret 비보존 및 marker boolean 검출을 확인했다.

### 로그 수명·삭제
- Linux: 종료·재실행 뒤 로그가 존재했고 AppImage 파일 삭제 뒤에도 logs/Alhangeul.log 3,035 bytes가 남았다. 수동 대상 로그 삭제 후 inventory 0. AppImage 삭제는 package-manager uninstall과 다르다.
- Windows: NSIS uninstall 후 exe 부재를 확인했지만 앱 로그·WebView 진단·DB journal 13개가 남았다. `logs/Alhangeul.log*`만 별도 삭제한 뒤 12개 WebView 파일은 그대로 있고 앱 로그는 없다. [제거 후](assets/task135/deep-windows/lifecycle-uninstall.json), [진단 로그 삭제 후](assets/task135/deep-windows/lifecycle-manual-log-delete.json).
- WebView의 LevelDB/IndexedDB `.log`는 DB journal일 수 있다. 초기 43460669958 시험은 모든 `.log*`를 지워 구분이 불충분했다. 최종 시험은 앱 진단 로그만 삭제하도록 수정했다. 정책에도 DB journal을 로그처럼 지우지 말라고 안내한다.
- 실행기는 강제 프로세스 종료를 사용했다. graceful quit·crash·장기간 rotation/보관·OS/백업 캐시 전체 삭제의 보장은 아니다.

## 실패와 재검증
43459272704 Linux 시작 TLS·삭제 시험은 성공. Windows는 CurrentUser Root CA import 이후 관측 자료가 생성되지 않고 정체해 취소했다. 43460258600은 Linux 문서 시험까지 성공했지만 Windows 동일 정체로 취소했다. 단계 출력을 추가하고 disposable LocalMachine store로 변경한 43460669958 Windows는 성공했다. 최종 구조·진단 로그 구분은 43461436549에서 재검증했다. 사용자 Mac의 trust store를 변경하지 않았다.

## 사이트·신청 자료
- 정책에 Microsoft 구성요소 업데이트 데이터 유형, 편집 중 외부 요청 가능성, uninstall 후 잔존, 진단 로그만 지우는 경로·주의를 반영했다.
- `site/code-signing/`에 아직 미승인임을 명시하고 postmelee의 세 역할·MFA·수동 승인 원칙을 작성했다. 홈페이지·다운로드에서 Code signing policy 링크를 확인했다.
- 사용자 확인으로 GitHub MFA·팀 역할을 기록했다. 신청 폼을 브라우저에서 읽었으며 개인 항목은 공개 저장소에 넣지 않았다.
- Happiness 공식 ZIP 4개 WOFF2와 저장소 파일이 byte 단위로 동일함을 확인했다. 공식 PDF를 시각적으로 확인해 OFL 1.1·현대백화점 출처로 manifest를 정정했다. 제품 전체 라이선스 적격성 인증을 의미하지 않는다.
- 최종 build/check source 22·output 26, Pages 106/106, evidence scrubber 1/1, actionlint·JS/shell syntax·diff check 통과.
- 최종 CUA 브라우저 확인: privacy 390px/1280px에서 scrollWidth=viewport, 긴 경로 줄바꿈 정상. Code signing policy 390px 정상, 홈/업데이트 링크 이동 성공. 새 문구는 열어 둔 로컬 http://127.0.0.1:8135/privacy/에서 검토 가능하다. 이전 Stage 4 PNG는 당시 화면이며 새 문구의 화면 증거로 재사용하지 않는다.

## 신청 준비 판정과 남은 범위
정책 초안과 실증 증거는 검토 가능하나 아직 신청 요건 전체 충족으로 판정하지 않는다. 공개 정책 배포에는 사용자 브라우저 승인이 필요하다. 설치 중 정책 표시·자동 요청 비활성화 옵션, WebView2 필수 처리의 취급, 전체 의존성 라이선스 원문 동봉·서명 대상 경계는 해결/확인이 필요하다. 자세한 신청 필드와 차이는 [조사](../tech/task_m010_135_signpath.md)에 기록했다. 최신 v0.1.3에 후속 업데이트가 없으므로 실제 앱의 새 버전 다운로드/설치 트래픽은 재시험하지 않았다. MSI/DEB/RPM/arm64, 인쇄·PDF·복구 장기 동작, 프록시 우회/QUIC 전체, 모든 외부 서비스 처리를 망라한 무수집 검증도 아니다.

## 상태
PR·merge·배포·신청·계정/서명 credential 생성 없음. 정책 검토 승인 대기이며 이슈 #135는 open 유지한다. 기존 사용자 worktree 변경은 보존했다.
