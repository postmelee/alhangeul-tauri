# Task #135 최종 보고서 — SignPath 신청 준비

GitHub Issue: [#135](https://github.com/postmelee/alhangeul-tauri/issues/135)
마일스톤: M010

## 작업 요약
- 대상 이슈 #135, 단계 수 5 (TLS·문서 작업·로그 삭제 추가 검증 포함).
- 최신 안정 버전과 활성 보안 제보 경로를 확인해 SECURITY.md를 정비하고 실제 처리에 근거한 개인정보처리방침을 작성했다.
- `local/task135`, 별도 worktree `/tmp/alhangeul-task135`. 기존 `local/task69` 변경은 보존했다.

## 변경 파일 목록과 영향 범위
| 경로 | 변경 요약 | 영향 |
|---|---|---|
| SECURITY.md | v0.1.3·확인 날짜·latest 링크, 활성 비공개 제보 안내 | 보안 정책 |
| site/privacy/index.html | 로컬 문서/설정/복구·업데이트 통신·로그·제보·외부 서비스·삭제 문의 | 신규 공개 정책 원본 |
| site/index.html, site/updates/index.html | 정책 푸터 링크 | 공개 진입 동선 |
| site/feedback/index.html | 정책 링크·보안 제보 경로 | 제보 전 안내 |
| tests/pages.test.mjs | 두 새 페이지에 따른 inventory 기대 개수 +2 | 기존 테스트 정합성 |
| .github/workflows/alhangeul-privacy-observation.yml, scripts/privacy/ | 수동 OS 선택·공개 파일 hash 검증·메타데이터 관측 | 검증 자동화 |
| mydocs/working/assets/task135/ | 화면·연결·파일 identity·log inventory | 검증 증거 |
| mydocs/tech/task_m010_135_signpath.md | source 근거·SignPath 요건과 미확정 항목 | 내부 신청 준비 |
| plans/working/orders/report의 #135 문서 | 단계와 검증 기록 | 작업 추적 |

## 문서 위치 검증
수행/구현계획서에 기록한 root SECURITY.md, site/privacy·code-signing, 기존 사이트 링크, scripts/privacy·workflow, mydocs 작업 기록·증거 위치와 일치한다. 폰트 출처 정정은 기존 assets/fonts/FONTS.md에서 수행했다.

## 변경 전·후 정량 비교
| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| SECURITY.md 지원 최신 버전 | v0.1.0 | v0.1.3 (2026-11-13 확인) |
| 개인정보처리방침 페이지 | 0 | 1 |
| 정책에 연결되는 기존 주요 페이지 | 0 | 3 |
| Pages source 파일 | 20 | 22 |
| Pages 테스트 | 106개 | 106개, 모두 통과 |

## 검증 결과
| 수용 기준 | 결과 |
|---|---|
| 실제 최신 안정 버전 | OK — GitHub latest API v0.1.3, draft/prerelease false |
| 제보 경로 | OK — private-vulnerability-reporting enabled=true; 추가 시험 메일 INBOX 수신 확인 |
| 자동/수동 및 로컬/외부 처리 구분 | OK — 시작 확인·선택 다운로드·로그·자발적 제보와 GitHub/Google 구분 |
| 미확인 무수집 주장 회피 | OK — 조사 범위와 제3자 처리, 삭제 보장 한계 명시 |
| 후원·서명 완료 주장 방지 | OK — 신청 요구 조사로 한정, 공개 제공자 문구 미삽입 |
| 사이트 build/check | OK — source 22·output 26 |
| 기존 Pages 테스트 | OK — 106/106. 처음 5개 실패는 새 HTML로 인한 파일 개수 차이였으며 기대값만 갱신 |
| whitespace·범위 | OK — diff check 통과, 제품/native/upstream 무변경 |
| 기존 사용자 변경 보존 | OK — 원래 worktree 삭제 2건·미추적 2건 그대로 |

### 단계별 검증 결과
- [Stage 1](../working/task_m010_135_stage1.md): 고정 소스·release·보안 API·외부 원문.
- [Stage 2](../working/task_m010_135_stage2.md): 정책 문구·진입 링크.
- [Stage 3](../working/task_m010_135_stage3.md): build/check/test, 기존 변경 보존.
- [Stage 4](../working/task_m010_135_stage4.md): 이메일 실제 수신·Chrome 1440/390px 화면·Windows/Linux 공개 v0.1.3 시작 연결·로그 존재 관측. 상세 run, SHA와 증거 링크 포함.

## 잔여 위험과 후속 작업
### 잔여 위험
Stage 5에서 양 OS TLS 요청 내부, HWP/HWPX 편집·native staged 저장·재열기, 종료·재시작·앱 제거 후 로그 잔존·진단 로그 삭제를 확인했다. Windows 편집 구간에도 Microsoft 런타임 요청이 발생했다. 합성 marker 미검출은 모든 문서 정보 미전송의 증거가 아니다. 파일 선택 UI·frontend fs plugin, graceful quit, 실제 새 버전 다운로드, MSI/DEB/RPM/arm64, 장기 인쇄/PDF/복구·프록시 우회 통신은 범위 밖이다. 설치 정책 안내/비활성화 옵션, WebView2 필수 처리의 취급, 전체 의존성 원문 동봉·서명 대상 경계는 신청 전 해결/확인이 필요하다. GitHub MFA와 세 역할은 사용자 확인을 받았다. SignPath MFA/계정은 만들지 않았다.

조사용 임시 upstream 전체 checkout의 공간 부족은 이번 task의 복제본만 제거해 해소했다. 원본 사용자 worktree는 변경하지 않았다. submodule은 작업 worktree에서 미초기화 상태이며 사이트 문서 검사에는 필요하지 않다.

### 후속 작업 후보
실제 팀 역할·MFA·서명 대상·CI 신뢰 경계와 설치 개인정보 안내/옵션 확인. 후원 승인 후에만 공개 Code signing policy의 제공 관계를 확정한다. 이번 작업으로 신청 적합성이나 승인을 선언하지 않는다.

## 작업지시자 보고
구현·추가 검증 완료. 원격 실행을 위해 publish/task135 브랜치에 push했으며 PR은 만들지 않았다. PR 게시·merge·사이트 배포, SignPath 신청 제출·계정·자격증명 생성은 하지 않았다. 공개 정책 URL은 배포 전이므로 현재 접근 가능하다고 보고하지 않는다. 최종 검토 후 다음 지시 범위에 따라 진행한다.


## 추가 검증의 핵심 결과 (2026-11-14 KST)
메일 시험 1건 INBOX 수신, 사이트 1440/390px 화면·진입 링크·가로 넘침 검사 통과. Windows 연결 관측에서 WebView2의 별도 외부 연결을 확인해 Microsoft 개인정보 처리 안내를 공개 정책에 보완했다. Windows 앱 log는 0 bytes, Linux 앱 log는 20,302 bytes로 이번 실행에서도 로컬 로그 차이가 관측되었다. 이를 통신·로그가 없다는 주장으로 바꾸지 않았다. Pages 106개·Action pin 14개 테스트와 actionlint 통과. SignPath 신청이나 후원·서명 적용은 수행하지 않았다.


## Stage 5 후속 결과
[심화 검증 보고](../working/task_m010_135_stage5.md)에 exact run·실패/재시도·증거와 한계를 기록했다. 정책과 Code signing policy 초안, 실제 신청 폼 필드를 준비했다. 공개 정책은 아직 배포 전이며 사용자의 최종 브라우저 승인 전 PR·배포를 하지 않는다. 현재 신청 요건 전체 충족이나 SignPath 후원·서명을 선언하지 않는다.


## Stage 6 전체 조건 감사
[조건별 감사](../working/task_m010_135_stage6.md)에서 고정 의존성 1,316개 archive 무결성, 공개 NSIS/MSI 설치 산출물의 signature·metadata·notice와 제거를 확인했다. worker/DLL 제품명·버전 resource 부재, 별도 notice 구성 부족, 공개 URL 404를 확인해 전체 충족 판정을 유지 보류한다. 사용자 승인한 사전 문의를 실제 발송했고 답변 대기 중이다. 아직 제품 보완·브라우저 승인·정책 공개 및 가입 후 SignPath 설정 검증이 남아 있어 Task #135 전체 완료가 아니다.
