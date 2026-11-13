# Task #135 최종 보고서 — SignPath 신청 준비

GitHub Issue: [#135](https://github.com/postmelee/alhangeul-tauri/issues/135)
마일스톤: M010

## 작업 요약
- 대상 이슈 #135, Stage 7 제품 보완 진행 중. 정책 공개는 완료했고 전체 신청 적격성 판정은 보류한다.
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

## 정책 공개 승인
2026-11-14 작업지시자가 브라우저에서 확인했고 정책 PR·배포를 승인했다. Stage 1~6의 정책·검증 자료를 먼저 devel PR로 통합하고 exact commit Pages 배포를 수행한다. 이 승인은 앱 신규 릴리스나 SignPath 신청/계정 생성 승인이 아니다. 제품 보완은 정책 공개 뒤 후속 단계로 진행하며 이슈 #135는 유지한다.

## 정책 PR 필수 검사 보완
PR #136의 첫 필수 검사 run 43467248700에서 automation 1,384개 중 1개가 실패했다. 신규 개인정보 관측 workflow의 inventory 등록 누락이 원인이므로 기존 inventory와 수동 실행·contents:read 계약 검사에 추가했다. 정책 내용 변경은 없다. 필수 check 성공 전에는 병합하지 않는다.

## 정책 공개 완료
사용자 브라우저 승인 후 PR [#136](https://github.com/postmelee/alhangeul-tauri/pull/136)을 일반 merge로 병합했다. 필수 PR run [43467937687](https://github.com/postmelee/alhangeul-tauri/actions/runs/43467937687)의 Node/Studio·Windows PS·최종 required check 모두 성공. merge SHA `644d0ac52bb364e57907fd7cd98c57ceaf86dce2`를 [Pages run 43468722947](https://github.com/postmelee/alhangeul-tauri/actions/runs/43468722947)에서 성공 배포했다. 공개 privacy/code-signing 및 홈·updates·feedback 5개 URL의 HTTP 200·핵심 문구를 확인했고 공개 개인정보 페이지 브라우저 표시를 확인했다. [응답 hash 기록](../working/assets/task135/readiness/policy-public-readback.json). 이 단락이 앞선 미배포/PR 없음 시점 기록을 대체한다. 앱 릴리스·SignPath 신청/가입/서명은 하지 않았다.

## Stage 7 진행
자체 자동 업데이트 확인의 기본 꺼짐·명시 선택 저장과 Windows helper 제품명/버전 resource 보완을 구현했다. 새로운 bytes의 native/package 수용 전이므로 현재 안정 릴리스 기능으로 안내하지 않는다. 로컬 submodule 전체 다운로드는 대용량 때문에 중단했고 Git이 임시 clone을 정리했다. 이후 blob filter와 sparse checkout으로 exact v0.9.0 소스만 확보했다. 큰 saved fixture 모음은 내려받지 않아 전체 automation의 fixture 의존 검사는 CI에서 수행한다. 기존 사용자 checkout은 보존한다.

## Stage 7.2 제품 보완 후보
- 첫 실행·제품 정보에 설치본의 로컬 개인정보 안내를 연결하고 NSIS·MSI에는 설치 전 안내를 추가했다. 닫기/계속은 자체 자동 확인을 켜지 않는다. 선택 기본 꺼짐, native 사용자 파일에 명시 선택 저장, 표시 여부는 WebView 로컬 저장소로 분리한다. 공개 v0.1.3 방침은 미출시 기능으로 바꾸지 않았다.
- Windows helper build dependency 잠금 파일의 초기 중복 버전 오류를 run 43470702938 Windows에서 확인했다. 자동 승인 검토가 upstream sparse-checkout 변경 + workspace 갱신 명령을 거절해 실행하지 않았다. Cargo 공식 도움말과 단일 helper dry-run을 확인한 뒤 upstream 변경 없이 보수적인 단일 패키지 갱신으로 수정했다. 기존 worker 330개/handler 26개의 version·source·checksum이 모두 보존됨을 별도 JSON에 기록했다. 새로운 native 빌드 성공 전에는 해결 수용으로 기록하지 않는다.
- 27개 웹폰트 원문 고지와 설치 경로를 대조했다. 나눔 3개는 고정 upstream의 전체 원본 WOFF2로 제품 자산만 복원했으며 기존 문자 advance·outline 차이 0, 공식 원본 cmap/name/metrics 일치를 기록했다. 지원 OS 화면 수용은 별도로 남는다.
- lock archive 1,408개에서 원문 고지 ZIP을 생성했다. 136개 filename-notice gap은 그대로 남기며 build/dev/optional을 포함한 목록을 실제 배포 SBOM으로 부르지 않는다. 지원 target normal graph 수집을 native CI에 추가했다.
- 로컬: 개인정보 안내·설정·desktop event 14개, 설치/workflow/font/native graph 계약 45개, upstream 39개 통과. product-boundary·action pins·diff check 통과. Studio build 통과. 전체 Studio는 291/293, 없는 sparse 예제 문서 2개로 실패하여 전체 통과로 보고하지 않는다. 완전한 고정 checkout을 사용하는 CI에서 다시 검증한다.
- 제품 변경은 CI 후보이며 앱 릴리스·제품 PR 병합·신청·계정 생성·서명 적용은 하지 않았다. 이슈 #135는 열린 상태로 유지한다.

## 공개 기본 브랜치 정렬과 Stage 7.3 검증 준비
정책 PR [#137](https://github.com/postmelee/alhangeul-tauri/pull/137)을 devel→main 일반 merge했다. merge SHA `f52450053a391313bab6969e3bf8e4267151b471`. 실제 tree의 제품 코드/version/lock/pin/폰트 bytes 차이가 없음을 검토했고 공개 기본 SECURITY.md가 v0.1.3으로 바뀐 것을 재조회했다. main의 PR 자동 필수 검사는 구성되어 있지 않아 새 성공 check로 주장하지 않는다. Pages는 기존 승인된 exact devel 배포를 유지한다.

수정 제품 후보 `e0a674e7`의 full run [43475282411](https://github.com/postmelee/alhangeul-tauri/actions/runs/43475282411)에서 Node/Studio·Windows PS fast가 성공했고 native/package 검증은 진행 중이다. 이전 run 43470702938은 Windows 잠금 충돌로 이미 실패했으므로 부분 결과를 보존하고 남은 작업을 취소했다. 전체 성공으로 기록하지 않는다.

일반 artifact는 updater release 설정이 없어 실제 자동 확인 positive control에 사용할 수 없음을 확인했다. 기존 공개 endpoint/public key만 넣고 createUpdaterArtifacts=false인 별도 비게시 시험 구성으로 Windows/Linux x64 native 선택·재시작·TLS를 검사하는 preferences 모드를 준비했다. 앱 릴리스, tag, SignPath 신청·계정·서명 credential 생성은 포함하지 않는다. MSI의 새 제목/버튼은 en-US codepage와 맞는 영문으로 수정했고 한국어 정책은 Unicode escape RTF를 유지한다. 새 시험 실행 결과는 아직 미수용이다.

원문 누락 Rust 62개 중 47개는 검증된 archive의 VCS commit에서 root 원문 고지를 찾았다. `notice-supplement-review.json`은 추가 검토 후보이며 현재 동봉 ZIP에 반영됐다고 주장하지 않는다. 남은 고지·실제 target graph·설치 화면·새 bytes 통신 검증과 제공자 해석은 별도 수용 항목이다. 사전 문의 thread를 다시 읽었으며 여전히 발송 메시지 1건만 있다.

## Stage 7.4 실패 수정과 고지 보완
full run 43475282411에서 세 target core가 통과했고 Windows helper 빌드 및 PE 제품명/버전 검사도 통과했다. Linux x64/arm64 desktop Rust 테스트는 통과했으나 Rust 1.100 clippy가 기존 임시 PDF 정리의 `needless_bool`을 거부하여 두 package job은 실패했다. Windows package는 아직 진행 중이며 full 성공으로 기록하지 않는다. symlink/reparse 처리 의미를 유지한 cfg별 반환식으로 정리했고 새 full 검증이 필요하다.

별도 fast run [43478394073](https://github.com/postmelee/alhangeul-tauri/actions/runs/43478394073)은 성공했다. 완전한 checkout의 automation 1,388개, Studio 296개, upstream 39개가 통과해 로컬 sparse fixture 부재와 구분했다. 실제 선택/TLS run [43479164615](https://github.com/postmelee/alhangeul-tauri/actions/runs/43479164615)은 456451a8의 비게시 후보를 빌드 중이며 아직 결과를 수용하지 않았다.

47개 원문 보완을 ZIP에 실제 반영했다. 1,408개 package의 전체 notice hash를 검증했고 filename gap은 136→89개다. crate checksum·repository·VCS commit·원문 hash 불일치 네 경우가 거부됨을 검증했다. 기본 Python 3.9에는 tomllib가 없어 이 검사를 실행하지 못했으며 문서 요구에 맞는 Python 3.13으로 다시 검사했다. 단순 원문 확보를 대상별 라이선스 적합성 판정으로 바꾸지 않는다.

나눔 3개의 공식 원본 전체 48,016 glyph는 outline/hint 차이 0, 변환 대상 외 table은 동일했다. DSIG 제거, head flag bit 11, glyf/loca 인코딩 차이는 WOFF2 변환 명세와 구분해 [추가 증거](../working/assets/task135/readiness/font-official-tables.json)에 기록했다. 이 단계에서는 폰트 bytes를 바꾸지 않았다. 로컬 고지/graph 테스트 4개, 설치/workflow 계약 43개, 변경 Rust 파일 format 및 diff check가 통과했다.

## Stage 7 설치본 소비자 검증 준비
이전 e0a674e7 full run은 Windows desktop/worker/handler 테스트·lint와 metadata, 세 target core 성공을 보존한 뒤 남은 패키징을 취소했다. Linux lint 실패를 수정한 7b37eec86f53db8eb02ca2e021493d2d0060d508 full run [43482991954](https://github.com/postmelee/alhangeul-tauri/actions/runs/43482991954)으로 전환했다. 이전 run을 성공으로 재분류하지 않는다.

기존 privacy workflow에 candidate-audit 소비자를 추가했다. 성공한 producer의 source/run/artifact metadata 및 다운로드 digest·파일 inventory를 확인한 뒤 재빌드 없이 Windows 실제 안내 화면·설치 resource hash, Linux AppImage 내부 resource hash를 검증한다. 로컬 workflow 계약 28개·actionlint·resource verifier의 정상 bytes 수용/변조 bytes 거부가 통과했다. 실제 OS 소비자 결과는 아직 없다.

## 실제 Linux 선택·재시작·TLS 수용
run 43479164615의 Linux 관측 step과 증거 upload가 성공했다. exact source/harness `456451a8ffae83213b8932e955939006187b2f2d`, AppImage SHA-256 `a2781d4b0896212e628c12132ccd9e2b86e1c05243c7e7fd2b47e0a91b631b13`. 별도 비게시 updater 시험 구성이며 현재 일반 full 후보 7b37eec8의 같은 설치 bytes를 검사한 것은 아니다.

실제 첫 실행 안내 화면에서 명시 checkbox 선택을 저장했다. 선택 없음/끄고 재시작/손상 설정의 자체 startup manifest 요청은 각 0건, 켠 뒤 재시작은 HTTP 200 1건이었다. 켜기 직후에는 요청하지 않았으며 수동 확인과 손상 설정 복구 뒤 수동 확인 각각 200 positive control을 확인했다. 스크린샷에서 기본 꺼짐/켜짐과 안내·닫기 버튼이 표시되는 것을 직접 확인했다. [증거](../working/assets/task135/readiness/preferences-linux/identity.json). 이 시험은 자체 업데이트 endpoint에 관한 것으로 OS·런타임 전체 무통신을 뜻하지 않는다. Windows 시험과 full/package/소비자 수용은 별도다.

소비자 harness 60a0ba7d의 fast run [43483824931](https://github.com/postmelee/alhangeul-tauri/actions/runs/43483824931)은 Node/Studio와 Windows PowerShell parser·회귀 모두 성공했다. Linux 실제 선택 관측 job도 최종 성공했다. 새 full producer 43482991954는 native/package 단계가 진행 중이며 아직 설치본 소비자를 실행하지 않았다.
