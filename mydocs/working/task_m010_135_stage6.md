# Task #135 Stage 6 — 전체 조건 판정 감사

## 승인과 판정 기준
2026-11-14 작업지시자의 “신청 요건 전체 충족 판정 될때까지 필요한 검증” 지시를 적용했다. [공식 조건](https://signpath.org/terms)을 다시 읽고, 내부 시험 통과와 제공자 적격 심사·가입 후 설정을 분리했다. PR·배포는 브라우저 승인 전 금지, 신청·계정·서명 credential 생성 제외 조건은 유지된다.

## 의존성 원본 조사
- `scripts/privacy/audit-cargo-licenses.py`: Cargo.lock 789 entries 중 registry 773개를 공식 crate archive로 받아 lock SHA-256과 대조했다. 전부 일치. 각 archive의 manifest license와 고지 파일 경로·hash를 기록했다. path/git 16개는 registry 검사 대상이 아니므로 별도로 구분했다.
- `scripts/privacy/audit-js-licenses.py`: pnpm-lock.yaml registry 543개를 공식 registry archive로 받아 lock integrity와 대조했다. 전부 일치. 설치·postinstall·package 실행 없음.
- 773 Rust archive에는 모두 license 선언이 있다. 고지 파일명 탐색상 62개에는 LICENSE/COPYING/NOTICE/COPYRIGHT로 시작하는 별도 파일이 없었다. 이는 소스 헤더·README 내 고지까지 없는 것으로 단정할 수 없다.
- 543 JS 중 css-value 0.0.1은 manifest license 선언이 없었다. lockfile상 webdriverio 9.29.1의 의존성으로 GUI 시험 경로다. 제품 bundle에 포함됐다고 단정하지 않는다. 74개는 같은 파일명 탐색상 별도 고지 파일이 없다.
- 고정 rhwp commit의 중첩 path manifest 14개를 읽었다. root는 MIT지만 JPEG vendor에는 `(MIT OR Apache-2.0) AND IJG`와 `(MIT OR Apache-2.0 OR Zlib) AND IJG`가 있다. 전체를 MIT 하나로 표시하면 부정확하다. rhwp-svg2pdf는 workspace license 상속을 사용한다.
- 결과는 [Cargo](assets/task135/readiness/cargo-license-inventory.json), [JS](assets/task135/readiness/js-license-inventory.json), [rhwp path](assets/task135/readiness/rhwp-path-licenses.json). lock 전체에는 개발·빌드·optional·다른 target 의존성이 포함된다. 지원 외 OS를 빌드·실행한 것은 아니다. 대상별 실제 링크/bundle closure, 원문 고지의 설치 산출물 포함 여부, 라이선스 조합 적합성은 이 inventory만으로 통과시키지 않는다.

## 조건별 상태
| 조건 | 확인한 근거 | 판정 |
|---|---|---|
| 공개·유지되는 프로젝트와 기능 설명 | 공개 v0.1.3, 저장소 및 사이트 | 확인 |
| 프로젝트 소유·역할 | collaborators API postmelee admin, 사용자 세 역할 확인 | 확인 |
| GitHub MFA | 사용자 활성화 확인; API 독립 검증 아님 | 사용자 확인 |
| 릴리스 수동 승인 | GitHub release environment required_reviewers=postmelee, prevent_self_review=false | GitHub 측 확인; SignPath 승인 체계와 구분 |
| 모든 구성요소 OSS·원문 고지 | exact archives 확보·혼합 license 확인, 대상별 산출물 closure 필요 | 미완료 |
| 자신의 바이너리만 서명 | 독립 host/installer와 bundled rhwp 경계 존재 | 제공자 해석 필요 |
| 개인정보 정책 공개 | 사용자 브라우저 승인 후 PR #136·Pages exact 배포; /privacy/ HTTP 200·실제 화면 확인 | Stage 7 공개 완료 |
| Code signing policy 공개 | /code-signing/ HTTP 200; 미승인·미서명 상태 명시 | Stage 7 공개 완료; 후원 주장 없음 |
| 설치 시 정책 표시·통신 선택권 | Stage 7 Windows/Linux x64 실제 첫 실행 화면·명시 선택·재시작 TLS 관측 성공 | 비게시 시험 구성 수용; 일반 설치본 안내 화면·제공자 해석 별도 |
| 시스템 변경 안내 | COM/MIME·WebView2 bootstrap 존재 | installer 화면에서 전체 안내 확인 필요 |
| 제거 | Stage 5 NSIS·AppImage 제거와 잔존 구분; MSI 추가 관측 | 제한된 실측 완료 |
| 악성/PUA·취약점 공격 도구 없음 | 조사한 기능은 문서/썸네일 진단; 시험 harness는 제품 배포와 분리 | 전체 코드·AV 무위험 증명으로 확대 불가 |
| 제품/버전 메타데이터 강제 | Stage 7 Windows helper 빌드의 ProductName·ProductVersion·FileVersion 검사 성공 | 새 설치본 수용 필요; SignPath artifact restriction 미구성 |
| 검증 가능한 소스 빌드 | 고정 source·artifact identity·GitHub Actions 경로 | SignPath origin 연동 미구성 |
| SignPath 계정 MFA·릴리스별 승인 | 계정 생성 자체가 제외 범위 | 가입 후 확인 항목 |
| 평판 및 최종 수용 | 공개 실제 수치만 제공 | SignPath 결정, 자체 충족 선언 불가 |

## 검증으로 대체할 수 없는 보완
1. 설치 UI에 로컬 정책과 시스템 변경 안내를 넣고, 자체 자동 업데이트를 명시적으로 선택/해제하는 기능이 필요하다. silent install의 기본값과 옵션, 재설치/업데이트의 선택 보존도 정의해야 한다. 현재 바이너리를 반복 실행해도 없는 기능은 생기지 않는다.
2. WebView2 필수 처리에 대한 설치 opt-out 적용과 System Libraries 예외, rhwp 정적 링크/bundled Studio의 소유·fork 요구는 제공자에게 확인해야 한다. 임의의 Chromium flag로 보안을 낮추거나 필수 처리가 모두 꺼졌다고 주장하지 않는다.
3. 라이선스 inventory를 실제 Windows/Linux 배포 closure와 연결해 원문·copyright 고지를 설치 산출물에 포함하고 재검증해야 한다. metadata 선언만으로 고지 의무 충족을 판정하지 않는다.
4. 초기 404는 당시 미배포를 나타냈다. Stage 7에서 브라우저 승인 후 정책·서명 정책 공개 URL의 200·내용·실제 화면을 확인하여 이 공개 요건은 해소했다.
5. 가입 후에만 SignPath MFA·artifact 제한·origin·수동 승인 경로를 실증할 수 있다. 현 제외 범위를 자동으로 풀지 않는다.

## 사전 문의
위 2번의 두 쟁점에 대한 구체적 영어 문의 초안을 작업지시자에게 제시했다. 대상은 공식 support@signpath.io, 발신은 사용자가 제공한 신청 연락 계정이며 개인 주소는 이 문서에 기록하지 않는다. 신청·계정 생성 없는 사전 문의만 요청했다. 작업지시자가 초안 그대로 발송을 승인했다. 지정 Gmail 계정의 profile을 확인하고 support@signpath.io로 발송해 SENT 상태를 확인했다. 첨부·신청·가입 없음. 답변을 받기 전 적격성 해석을 확정하지 않는다.

## 현재 결론
전체 요건 충족으로 판정하지 않는다. Stage 7에서 공개 정책 배포와 제품 보완 구현은 진행했으나 새 설치본 수용·잔여 원문 고지·제공자 판단·가입 후 설정이 남아 있다. 이 구분을 유지하고 이슈 #135를 완료/close하지 않는다.


## 공개 Windows 패키지 실측
[성공 run 43466130358](https://github.com/postmelee/alhangeul-tauri/actions/runs/43466130358), harness 4b4c7fb2. 기존 exact release inventory로 NSIS와 MSI 다운로드 hash를 확인하고 순서대로 설치·제거했다. [결과](assets/task135/readiness/windows/windows-package-audit.json).
- 두 형식의 메인 Alhangeul.exe는 productName=Alhangeul, productVersion/fileVersion=0.1.3. Authenticode NotSigned. 후원 승인 전 미서명 상태 자체를 결함으로 세지는 않는다.
- 두 형식의 AlhangeulThumbnailHandler.dll과 AlhangeulThumbnailWorker.exe에는 productName/productVersion/fileVersion이 없다. 이 파일을 직접 서명하려면 제품명·버전 resource를 추가하고 산출물 제한 검증이 필요하다. 단순 서명 설정으로 없는 metadata를 검증했다고 주장할 수 없다.
- 설치 폴더의 license/notice 이름 탐색 결과는 FONTS.md와 Noto OFL 원문 2개다. source 설정과 일치한다. 실행 파일 내부의 embedded metadata/주석까지 검사한 결과는 아니므로 고지가 전혀 없다고 확대하지 않는다. 전체 배포 고지 구성의 보완이 필요하다.
- MSI 검사 경로에 중복 snake_case thumbnail DLL도 관측되었다. 동일 hash이지만 NSIS 선행 설치/제거 상태의 잔존 가능성이 있어 clean MSI 패키지 자체에 중복 포함됐다고 단정하지 않는다.
- 최초 run 43465246045는 예상 Program Files 경로가 없을 때 PowerShell -Path 재귀가 상위 폴더를 탐색하다 접근 거부로 실패했다. template의 이전 NSIS 설치 경로 재사용 로직을 확인하고, 실행 파일이 실제 존재하는 두 명시적 제품 경로만 허용하고 -LiteralPath를 사용해 재검증했다. 시스템 접근 권한을 확장하지 않았다. 성공한 재시험에서 두 형식 uninstall 후 실행 파일 부재를 확인했다.

## 후속 수용 항목
설치 UI·선택 저장·silent 옵션의 실제 구현과 OS 검증, worker/DLL product/version resource 및 신규 exact artifact 재검증, 대상별 고지 원문 bundle 구성, clean MSI/NSIS 설치 안내 화면 확인이 필요하다. 이들은 현재 공개 v0.1.3에 없는 것을 반복 검사하는 방식으로 통과시킬 수 없다. SignPath 답변에 따라 dependency와 WebView2 조건 해석을 확정한 뒤 구현 범위·산출물 수용을 일치시킨다.

## 이번 감사의 검증
Rust registry 773/773 SHA-256, JS registry 543/543 integrity 일치. source product-version 5개 위치 일치(0.1.3), actionlint·prepare.mjs syntax·git diff --check 통과. source 제품 동작 변경·공개 배포·서명·신청·계정 생성 없음. 구현 미완료를 검증 성공으로 기록하지 않는다.

## Stage 7 후속 대조
정책 공개·기본 브랜치 SECURITY.md v0.1.3 정렬을 완료했다. 위 조건표는 이 후속 결과를 반영하며, 앞선 공개 v0.1.3 패키지 관측은 당시 제품의 역사적 증거다. 미출시 보완 기능을 기존 릴리스 기능으로 소급하지 않는다.

검증한 원문 47개를 추가한 현재 ZIP은 1,408 package, filename gap 89개다. e0a674e7 Windows normal graph와 새 ZIP의 교차 검사에서 desktop 532 package 중 convert_case 0.4.0, fxhash 0.2.1, mac 0.1.1, seahash 4.1.0, zune-core 0.4.12가 남는다. worker 287개에서는 zune-core 1개, handler 9개에서는 0개다. 이 graph는 build/dev 전용 edge를 제외하지만 proc-macro·feature 통합을 포함하므로 최종 바이너리 SBOM으로 단정하지 않는다. fxhash 소스 header, mac README, zune-core 소스 header에서 허가 문구를 확인했으나 전체 원문 고지 동봉 완료로 세지 않는다. convert_case의 정확한 VCS root에는 별도 license 파일이 없었다. [대조 결과](assets/task135/readiness/windows-normal-notice-gaps.json).

사전 문의 thread를 재확인했으며 아직 발송 메시지 1건뿐이다. 새로운 문의나 신청을 발송하지 않았다. 진행 중 native/TLS/설치 수용은 최종 보고서에서 실제 run과 source SHA별로 구분한다.

### OSI 승인과 자유 소프트웨어 구분
[SignPath 조건](https://signpath.org/terms.html)의 OSI 승인 요구와 [SPDX 공식 JSON](https://spdx.org/licenses/IJG.json)을 별도로 대조했다. 실제 Windows normal graph의 필수 AND 항목인 IJG는 SPDX `isOsiApproved=false`, `isFsfLibre=true`다. CDLA-Permissive-2.0도 OSI 승인 표시는 false다. OFL-1.1·LPPL-1.3c·Unicode-3.0은 true다. 이는 metadata에 허가명이 있거나 일반적인 자유 이용이 가능하다는 점만으로 모든 SignPath 요건 충족을 선언할 수 없다는 추가 근거다. [조회 결과](assets/task135/readiness/spdx-approval-review.json).

기존 사전 문의는 WebView2/rhwp 경계 두 항목만 다뤘으므로 이 라이선스 쟁점까지 제공자가 승인했다고 보지 않는다. 원문 고지 완성·정확한 포함 범위를 먼저 구분하고 제공자 해석이 필요하다. upstream 라이선스를 임의 변경하거나 readonly pin을 바꾸지 않았으며 추가 이메일은 보내지 않았다.
