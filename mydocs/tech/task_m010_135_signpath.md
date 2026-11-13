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
