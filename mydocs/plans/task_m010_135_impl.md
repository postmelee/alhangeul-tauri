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

## Stage 5 — 신청 준비 심화 검증 (후속 명시 지시)
작업지시자가 TLS 내용·편집 중 통신·로그 삭제를 포함하여 신청 가능한 상태까지 진행하도록 지시했다. PR·배포는 최종 개인정보처리방침 브라우저 검토 승인 뒤에만 수행한다.
- 공개 v0.1.3 고정 바이너리의 별도 Windows/Linux 일회용 실행기에서 TLS 프록시를 사용한다. 해당 실행기에만 임시 CA를 신뢰시키고 종료 시 폐기한다. 서버 인증서 검증을 끄지 않는다. 개인 문서·메일·계정은 사용하지 않는다.
- 시작/idle, 합성 문서 열기·편집·저장, 종료/재시작, uninstall 또는 AppImage 삭제, 남은 로그 수동 삭제를 단계별 관측한다. 원문·쿠키·토큰·임시 CA private key는 업로드하지 않는다. HTTP method/host/고정 경로, body 크기·구조와 합성 marker 포함 여부만 증거로 보존한다.
- 프록시 사용이 동작을 바꾸므로 Stage 4의 직접 연결과 구분하고, 프록시 우회·TLS 실패는 미관측으로 명시한다. 성공한 업데이트 manifest 응답을 positive control로 요구한다.
- 공식 신청 항목·역할·MFA·라이선스·공개 코드 서명 정책·설치 안내/선택권을 점검한다. 미확인 운영자 정보는 추정하지 않는다. 후원/서명 제공 사실은 승인 전 주장하지 않는다.
- 검증 harness는 scripts/privacy와 기존 전용 workflow, 증거는 working/assets/task135, 조사·보고서는 기존 파일에 갱신한다. 제품 변경이 필요하면 범위·검증 계획을 구체화한 다음 구현한다. 신청 제출·서명 credential 생성은 제외한다.

### Stage 5 문서 위치 구체화
공개 서명 정책은 기존 사이트의 새 `site/code-signing/index.html`에 두고 홈페이지·업데이트(다운로드)에서 `Code signing policy`로 연결한다. 사용자에게 현재 미승인 상태, 확인된 역할, 개인정보 방침을 함께 보여주기 위해 내부 조사 문서 대신 공개 페이지를 선택한다. 후원 제공 문장은 실제 승인 전 추가하지 않는다. 사용자 확인: postmelee가 세 역할 담당, GitHub MFA 활성화. 이 문서·경로 결정은 신청 준비 완료까지의 후속 명시 지시 범위에 해당한다.

### 폰트 출처 정정
신청 요건 조사에서 `assets/fonts/FONTS.md`의 Happiness 출처가 실제 파일 name table 저작권(THE HYUNDAI)과 공식 제공자 안내와 다름을 확인했다. 기존 제품 자산 manifest 위치에서 해당 행만 정정하고, 무료 재배포 가능성·원문 라이선스 동봉·SignPath의 OSI 적격 판단을 혼동하지 않도록 조사 보고에 기록한다. 폰트 바이너리나 upstream은 변경하지 않는다.

정책의 긴 로그 경로가 모바일에서 넘치지 않도록 기존 site/styles.css의 updates-section code에 줄바꿈을 허용한다. 정책 공개 페이지 검증 범위에 포함한다.

## Stage 6 — 전체 신청 조건 판정 (2026-11-14 후속 지시)
사용자의 전체 요건 충족 판정까지 검증하라는 지시에 따라 공식 조건별 수용표를 만들고, 공개 URL·팀 권한·릴리스 출처·설치 안내/선택권·라이선스 고지를 점검한다. Stage 5 성공을 전체 적격성으로 확대하지 않는다. 라이선스 검사는 exact lockfile과 로컬 cached package manifest/원문 존재를 대조하며 누락 자료는 미확인으로 표시한다. 산출물은 기존 scripts/privacy와 working/assets/task135, working/task_m010_135_stage6.md에 둔다. 제공자의 해석이 필요한 항목은 구체적인 문의 초안까지만 준비하며 외부 발송·신청·계정 생성은 하지 않는다. PR·배포의 사용자 승인 게이트는 유지한다.

Stage 6 Windows 공개 NSIS·MSI를 exact hash로 확인해 일회용 실행기에서 각각 설치·제거한다. PE product/version/signature, 설치된 license/notice 파일의 목록·hash를 보존한다. 서명을 새로 만들거나 바이너리를 수정하지 않는다. 신규 package-audit 관측 모드만 실행하며 성공한 TLS 시험은 반복하지 않는다.

## Stage 7 — 정책 공개와 제품 보완 (2026-11-14 후속 승인)
작업지시자가 사전 문의 답변 전 제품 보완 진행을 요청했고, 브라우저 검토 후 정책 PR·배포를 명시 승인했다. Stage 1~6 정책을 PR #136으로 먼저 통합·배포한다. 이슈 #135는 제품 보완과 제공자 답변 때문에 유지한다. 앱 릴리스·신청·가입·서명은 제외한다.

### 변경과 문서 위치 판단
- 자체 업데이트: 기존 updater Rust 경계에 사용자별 `updater-preferences.json`을 추가한다. 선택이 없거나 손상되면 자동 확인 기본 꺼짐. 앱 업데이트 창에서 켜기/끄기·설정 저장 오류를 안내하며 수동 확인·선택 다운로드를 유지한다. 기존 설정·문서를 건드리지 않고 재실행·앱 업데이트에도 선택을 보존한다. WebView2의 처리를 끄는 기능으로 표시하지 않는다.
- 설치 안내: 기존 Windows NSIS hooks·WiX template에 설치 전 정책/시스템 변경 안내와 자체 자동 확인의 기본 꺼짐을 표시한다. silent 설치도 기본 꺼짐이며 사용자별 명시 선택이 있으면 보존한다. Linux package/AppImage는 패키지 동봉 안내와 앱 첫 실행 안내를 사용하며 GUI 없는 설치를 인터랙티브 prompt로 막지 않는다. 설치 화면 적용·제공자 조건 해석은 별도로 검증한다.
- Windows helper metadata: worker/handler의 build script에 제품명 Alhangeul과 root 제품 버전을 고정한 VERSIONINFO를 삽입한다. 라이브러리 자체 crate 버전은 변경하지 않는다. 기존 desktop thumbnail reference 파일과 사용자 삭제 변경은 수정하지 않는다.
- 라이선스: 기존 `assets/fonts/licenses/`에 해당 폰트 원문 고지를 보완하고 기존 FONTS.md에서 출처·동봉 파일을 연결한다. 실제 배포 closure와 build/dev inventory를 구별하며 부재 원문·적격성 불확실성을 남긴다. 제품 고지는 기존 bundle resources에서 설치 폴더로 복사한다.
- 공식 설치 안내는 기존 `docs/operations/` 및 installer 동봉 resource를 사용한다. 대안인 mydocs/manual은 사용자 제품 안내 위치가 아니므로 제외한다. 공개 `site/privacy/`는 현재 안정 v0.1.3 설명을 유지하고, 미출시 동작을 현재 릴리스 기능으로 바꾸지 않는다. 작업 근거와 실패/수용은 기존 plans/working/report/orders에 기록한다.

### 검증과 수용
- 필수 fast 검사, 기본 product-boundary·upstream·Studio test/build. 로컬 submodule 미초기화에 필요한 검사는 exact pin을 준비한 Windows/Linux Actions에서 실행한다.
- 자동 확인: 선택 없음/꺼짐/켜짐/손상/저장 실패/재시작 테스트, UI 설정 저장과 명시 수동 확인 테스트. 실제 Windows/Linux 새 bytes에서 설정에 따른 자체 updater 요청 유무를 positive control과 함께 확인한다. 런타임 통신 부재로 일반화하지 않는다.
- metadata: Windows worker/DLL 파일의 ProductName·ProductVersion·FileVersion을 PowerShell로 읽어 root product version과 대조한다. 새 package 생성과 clean NSIS/MSI 설치 검증이 필요하다.
- 설치: 정책 안내 표시, default-off·선택 보존, native 등록/제거 회귀. 라이선스는 원문 hash·설치 경로를 확인한다. 공유 native/product 변경에는 CI full, 필요하면 실패 원인에 한정한 profile을 사용한다. 기존 public v0.1.3 증거를 새 bytes 수용으로 재사용하지 않는다.
- Pages는 PR 필수 검사 성공 후 exact merge SHA를 배포하고 공개 두 정책 URL 200·내용·진입 링크를 확인한다.

### 경계
WebView2 opt-out/System Libraries 및 rhwp 서명 대상의 최종 해석은 발송한 사전 문의 답변 전 확정하지 않는다. SignPath 가입 후 MFA·origin·artifact restriction·수동 승인 검증은 현재 제외 범위로 남는다. 부분 성공을 전체 신청 요건 충족으로 기록하지 않는다.
