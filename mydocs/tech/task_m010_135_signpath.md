# Task #135 — 데이터 흐름과 SignPath 신청 준비 조사

## 조사 배경
신청에 앞서 지원 버전·보안 제보·개인정보 처리 설명을 실제 동작과 맞춘다. 과거 초안의 v0.1.2나 이미 후원받는다는 표현을 근거로 삼지 않는다.

## 조사 질문
최신 안정 버전과 제보 경로는 무엇인가? 앱이 자동/수동으로 다루는 데이터와 제3자는 누구인가? SignPath 요구와 현재 확인 범위의 차이는 무엇인가?

## 조사 대상
2026-11-13 확인. 제품 기준은 devel `a3820452`, 공개 v0.1.3, rhwp `c9095c5f67632e6721e800ccc7fb43ea49d26682` (v0.9.0). 파일 경로는 이 기준에 대한 것이다. 조사 중 네트워크 재연결로 submodule 가져오기가 지연되어 upstream 주요 파일은 GitHub contents API의 고정 ref로 별도 조회했다.

## 발견 내용

### 릴리스와 제보
GitHub `releases/latest` 결과: `tag_name=v0.1.3`, `draft=false`, `prerelease=false`, `published_at=2026-11-11T12:19:34Z`. `private-vulnerability-reporting` GET 결과는 `enabled=true`다. 기존 SECURITY.md와 site/feedback의 이메일은 `alhangeul.feedback@gmail.com`. 실제 제보 생성이나 이메일 수신 시험은 하지 않았다.

### 데이터 흐름 근거
| 동작 | 데이터와 대상 | 근거 |
|---|---|---|
| 열기·편집·저장·PDF | 선택 문서 bytes·경로, 로컬 세션·선택 저장 경로·임시 파일 | apps/desktop/src-tauri/src/{commands,state,pdf_export,pdf_jobs,pdf_temp_cleanup}.rs; apps/studio-host/src/core/desktop-persistence.ts |
| 로컬 글꼴 | 시스템 글꼴 목록·파일을 문서 표시/PDF에 사용 | apps/desktop/src-tauri/src/font_catalog; apps/studio-host/vite.config.ts의 bundled fonts |
| 최근 파일 | 경로·이름 최대 10개, app_data_dir/recent-documents.json | apps/desktop/src-tauri/src/recent_documents.rs; native recent override |
| 설정·복구 | localStorage rhwp-settings, IndexedDB rhwpStudioAutosave; 파일명·형식·시각·복구 bytes | 고정 upstream core/user-settings.ts, recovery/autosave-store.ts, main.ts; main의 AutosaveManager 연결·host-save 삭제·복구 후보 삭제 |
| 시작/수동 업데이트 확인 | GitHub Pages /updater/stable.json HTTPS GET | updater/commands.rs setup, service/native.rs, tauri.updater.conf.json |
| 업데이트 다운로드 | 사용자가 apply 선택 시 GitHub Releases asset 요청; signature 검증·설치 | updater/service/{apply,native}.rs; site/release.json |
| 로그 | Tauri log 기본 stdout·LogDir; WebView console의 오류·인쇄 title 등 | src/lib.rs, direct-print.ts runLoggedSystemPrint; tauri-plugin-log 2.8.0 기본 targets |
| 썸네일·진단 | OS cache, 동의 후 공개 fixture 검사, 정제 요약 복사; 자동 제출 없음 | src/thumbnail_diagnostics; ui/thumbnail-diagnostics-dialog.ts |
| 사이트·다운로드 | Pages assets, release.json, downloads.json; GitHub asset 링크 | site/script.js, package-downloads.js, feedback/index.html |
| 사용자 제보 | 이메일 주소·본문·첨부는 수신 Gmail, 공개 issue는 GitHub; 메인테이너가 확인 | site/feedback/index.html, SECURITY.md |

업데이트 plugin 2.10.1은 User-Agent `tauri-plugin-updater/2.10.1`과 Accept 헤더를 사용한다. endpoint는 버전·target 치환 변수가 없는 고정 URL이며 custom header를 추가하지 않는다. 앱 버전 비교와 target 선택은 수신 manifest를 기준으로 수행한다. 이 사실은 IP·요청시각 등 서비스 측 처리가 없다는 뜻이 아니다.

prod CSP는 WebView connect-src를 self/IPC로 제한하지만 Rust updater 통신이나 사용자가 연 브라우저·OS 인쇄를 막는 증거가 아니다. `vite.config.ts`의 `__RHWP_AI__=false`로 upstream AI를 제외한다. 이 설정과 조사한 경로에서 자동 분석/광고/문서 업로드 구현을 찾지 못했으나 모든 OS·외부 서비스의 미수집을 보장하지 않는다. 네트워크 저장소·동기화 폴더·프린터를 사용자가 선택하면 해당 서비스가 별도로 처리할 수 있다.

### SignPath 공개 요구와 신청 전 차이
[공식 조건](https://signpath.org/terms)은 OSS 라이선스·활성 유지·공개 배포·기능 설명, 소유 프로젝트/바이너리 경계, MFA, 작성/검토/승인 역할, 재현 가능한 출처와 릴리스별 수동 서명 승인을 요구한다. 홈페이지·다운로드의 Code signing policy와 개인정보처리방침 링크도 요구한다. 사용자 지정 외 시스템에 데이터를 보내는 기능에는 정책 설명·설치 시 표시·비활성화 옵션 요구가 있다. 신청 전에는 자동 업데이트 요청에 대한 적용을 확인해야 한다.

- 현재 확인: 공개 저장소·릴리스·기능 안내가 있고 updater는 Minisign을 사용한다. 이것은 Windows Authenticode 또는 SignPath 후원 증거가 아니다.
- 확인 필요: 전체 배포 구성요소 라이선스·서명 대상 소유권, rhwp/bundled component 경계, 팀원의 실제 MFA, 서명 승인자와 권한, 검증 가능한 CI 연결, product/version 메타데이터 제한.
- 확인 필요: 설치 단계 개인정보 안내/옵션과 자동 업데이트 요청의 요구 충족 여부. 이번 문서 변경만으로 충족을 선언하지 않는다.
- 공개 Code signing policy는 승인된 실제 역할과 제공 관계를 기반으로 후속 확정한다. 요구 문구인 무료 서명 제공자/인증서 제공자 표시는 후원 승인 이전에 게시하지 않는다.
- [신청 페이지](https://signpath.org/apply)는 확인했으나 동적 양식 전체 필드·심사 결과는 검증하지 않았다. 계정·자격증명 생성과 신청 제출은 하지 않았다.

## 결정
SECURITY.md를 v0.1.3 확인 기준으로 갱신하고 활성 비공개 제보 경로를 명확히 한다. 공개 privacy 페이지에 로컬 저장·자동 요청·사용자 선택·제3자 정책·삭제 문의를 구분한다. 신청 전 점검은 내부 문서에 둔다.

## 비결정 / 보류
피드백의 고정 보관 기한, 제3자 보관 위치·기간, 실제 이메일 수신, OS별 로그 잔존/삭제, Windows/Linux 실행 트래픽은 검증하지 않았다. 무수집·즉시 삭제·완전 삭제를 약속하지 않는다. SignPath의 승인·후원·서명은 미확정이다.

## 적용 영향
문서와 기존 사이트 링크만 변경한다. 네트워크·설치·로깅 동작은 바꾸지 않는다. 실제 배포와 설치 UI 개선은 별도 승인 범위다.

## 참고 링크
- [공개 릴리스](https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.3)
- [비공개 제보](https://github.com/postmelee/alhangeul-tauri/security/advisories/new)
- [GitHub 개인정보처리방침](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)
- [GitHub Pages IP 보관 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection)
- [Google 개인정보처리방침](https://policies.google.com/privacy)
- [Tauri log 2.8.0 source](https://github.com/tauri-apps/plugins-workspace/blob/log-v2.8.0/plugins/log/src/lib.rs)
- [Tauri updater 2.10.1 source](https://github.com/tauri-apps/plugins-workspace/blob/updater-v2.10.1/plugins/updater/src/updater.rs)
- [고정 upstream 복구 저장](https://github.com/edwardkim/rhwp/blob/c9095c5f67632e6721e800ccc7fb43ea49d26682/rhwp-studio/src/recovery/autosave-store.ts)
- [고정 upstream 설정](https://github.com/edwardkim/rhwp/blob/c9095c5f67632e6721e800ccc7fb43ea49d26682/rhwp-studio/src/core/user-settings.ts)


## 2026-11-14 추가 관측에 따른 보완
Windows 2025 NSIS v0.1.3 시작·idle WFP 이벤트에서 Alhangeul.exe의 Pages DNS에 대응하는 185.199.108.153:443 연결과 별도 104.18.21.213:80 연결, WebView2의 52.123.247.12:443 연결이 관측되었다. IP만으로 목적·호스트명·payload를 확정하지 않는다. WebView2 프로세스와 로컬 진단 파일이 실제 존재하며, “앱 자체 별도 분석 구현을 찾지 못함”을 런타임 전체의 미수집으로 확대하면 안 된다.

[Microsoft WebView2 공식 안내](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/data-privacy)는 필수·선택 진단, 기본 SmartScreen, crash reporting을 설명한다. 이를 공개 개인정보처리방침에 명시하고 [Microsoft 정책](https://privacy.microsoft.com/privacystatement)을 연결했다. 개별 관측 패킷이 특정 진단 기능이라는 결론은 내리지 않는다.

## Stage 5 신청 준비 확인

### 운영자 확인
작업지시자가 postmelee의 Author·Reviewer·Approver 겸임과 GitHub MFA 활성화를 확인했다. 이는 사용자 확인이며 API의 MFA null 값을 false/true로 해석한 것이 아니다. 신청용 개인 연락처는 대화에서 받았으며 공개 저장소에 기록하지 않는다. SignPath 계정·MFA·서명 권한은 아직 만들지 않았다.

### 실제 신청 폼
2026-11-14 KST [신청 페이지](https://signpath.org/apply)의 HubSpot embedded form을 브라우저에서 읽었다. 입력·동의·제출은 하지 않았다. 필수 필드는 Project Name, Repository URL, Homepage URL, Tagline, Category, Description, Reputation, First Name, Last Name, Email, Build System, Primary Discovery Channel이며 Code of Conduct 및 개인정보 처리 동의가 있다. Download/Privacy URL도 제공한다. 마케팅 동의는 별도 선택 사항이다.

프로젝트 필드 초안:
- Project Name: Alhangeul
- Repository: https://github.com/postmelee/alhangeul-tauri
- Homepage/Download: https://postmelee.github.io/alhangeul-tauri/
- Privacy: https://postmelee.github.io/alhangeul-tauri/privacy/ (아직 배포 전)
- Tagline: Windows와 Linux용 오픈 소스 HWP/HWPX 문서 편집기.
- Description: 로컬 문서를 열고 편집·저장·인쇄·PDF 내보내기하는 데스크톱 앱. Alhangeul 소유 host·설치·배포 코드와 고정 rhwp 의존성 경계를 설명한다.
- Build System: GitHub Actions. Category는 실제 선택지에서 문서/생산성에 맞는 항목을 제출자가 선택한다.
- Reputation: 공개 저장소 2026-07-19 생성, 조회 시점 stars 3·forks 0. v0.1.3 2026-11-11 공개. 이 수치는 널리 신뢰받는다는 증거로 과장하지 않는다. 다운로드 수는 자동 검증·재다운로드를 포함하므로 사용자 수가 아니다. 최초 hop 또는 rhwp의 평판을 독립 제품의 평판으로 전용하지 않는다.

### 아직 충족했다고 선언할 수 없는 조건
1. 공개 정책 URL: 사용자 최종 브라우저 승인 전 PR·배포 금지. 로컬 초안을 공개 완료로 기재하지 않는다.
2. 설치 시 개인정보 표시와 비활성화: v0.1.3 시작 업데이트 opt-out이 없고 Windows WebView2 별도 처리가 있다. IP·런타임 진단 등을 고려할 때 외부 처리 없음 문장을 사용할 수 없다. 설치 선택권의 정확한 적용과 WebView2 시스템 구성요소 예외는 제공자 판단이 필요한 사항이다. 현재 정책 문서만으로 충족했다고 주장하지 않는다.
3. 라이선스: `vite.config.ts`는 assets/fonts의 모든 WOFF2를 복사한다. Cafe24·Happiness·Latin Modern Math도 실제 배포 입력에 포함된다. FONTS.md의 Happiness 출처를 파일 저작권과 [공식 제공자](https://thehyundaifont.com/)에 맞게 현대백화점으로 정정했다. 무료 이용·재배포 허락과 모든 구성요소의 OSI 적격성은 같은 판단이 아니다. 현재 tauri.conf.json의 별도 license resource는 FONTS.md와 Noto 두 원문뿐이다. 다른 글꼴·JS/Rust 의존성의 원문 동봉 및 적격성 전체 확인은 남아 있다.
4. rhwp는 고정 OSS 의존성이다. 독립 Alhangeul host/설치 패키지와 정적 링크/bundled Studio 경계를 설명하고, 타 프로젝트 독립 바이너리를 자신의 서명 대상으로 신청하지 않는다. 최종 artifact configuration은 제공자 승인 후 확정한다.
5. 제공자 표기: 신청 폼 Download 설명은 SignPath 사용 표기를 요구하지만 아직 승인받지 않았다. `site/code-signing/`은 준비 중 사실만 표기한다. 승인 전 허위 제공 문구로 요구를 맞추지 않는다.

따라서 현재는 제출 준비 초안이며 모든 적격 조건이 확인된 신청 가능 상태로 판정하지 않는다. 신청·계정 생성·약관 동의·서명 구성은 수행하지 않았다.


### Happiness 라이선스 후속 확인
공식 `https://thehyundaifont.com/assets/fonts/HappinessSans-Screen.zip`의 `screen/HapinessSans_License.pdf` 1쪽에는 SIL OFL 1.1을 명시하고, 2~3쪽에 원문을 제공한다. PDF 텍스트 추출은 문자 매핑이 깨져 화면 렌더링으로 확인했다. 저장소의 Happiness WOFF2 4개는 공식 ZIP의 같은 이름 파일과 bytes가 모두 일치한다. 따라서 Happiness를 비-OFL custom license라고 단정하지 않는다. FONTS.md는 OFL 1.1과 현대백화점 출처로 정정한다. 다만 현재 제품 resource에 이 원문이 동봉되는지와 전체 제3자 의존성 고지 검사는 별도 미완료 항목이다.
