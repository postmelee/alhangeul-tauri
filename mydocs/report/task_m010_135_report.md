# Task #135 최종 보고서 — SignPath 신청 준비

GitHub Issue: [#135](https://github.com/postmelee/alhangeul-tauri/issues/135)
마일스톤: M010

## 작업 요약
- 대상 이슈 #135, 단계 수 3.
- 최신 안정 버전과 활성 보안 제보 경로를 확인해 SECURITY.md를 정비하고 실제 처리에 근거한 개인정보처리방침을 작성했다.
- `local/task135`, 별도 worktree `/tmp/alhangeul-task135`. 기존 `local/task69` 변경은 보존했다.

## 변경 파일 목록과 영향 범위
| 경로 | 변경 요약 | 영향 |
|---|---|---|
| SECURITY.md | v0.1.3·확인 날짜·latest 링크, 활성 비공개 제보 안내 | 보안 정책 |
| site/privacy/index.html | 로컬 문서/설정/복구·업데이트 통신·로그·제보·외부 서비스·삭제 문의 | 신규 공개 정책 원본 |
| site/index.html, site/updates/index.html | 정책 푸터 링크 | 공개 진입 동선 |
| site/feedback/index.html | 정책 링크·보안 제보 경로 | 제보 전 안내 |
| tests/pages.test.mjs | 새 페이지에 따른 inventory 기대 개수 +1 | 기존 테스트 정합성 |
| mydocs/tech/task_m010_135_signpath.md | source 근거·SignPath 요건과 미확정 항목 | 내부 신청 준비 |
| plans/working/orders/report의 #135 문서 | 단계와 검증 기록 | 작업 추적 |

## 문서 위치 검증
| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 보안 정책 | root SECURITY.md | 동일 | OK | 기존 GitHub 정책 유지 |
| 개인정보처리방침 | site/privacy/index.html | 동일 | OK | 기존 공개 사이트 구조 |
| 진입 링크 | site 홈·업데이트·문의 | 동일 | OK | 기존 문구 보존·링크 추가 |
| SignPath 조사 | mydocs/tech/task_m010_135_signpath.md | 동일 | OK | 아직 확정되지 않은 후원·서명 정책 분리 |

## 변경 전·후 정량 비교
| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| SECURITY.md 지원 최신 버전 | v0.1.0 | v0.1.3 (2026-11-13 확인) |
| 개인정보처리방침 페이지 | 0 | 1 |
| 정책에 연결되는 기존 주요 페이지 | 0 | 3 |
| Pages source 파일 | 20 | 21 |
| Pages 테스트 | 106개 | 106개, 모두 통과 |

## 검증 결과
| 수용 기준 | 결과 |
|---|---|
| 실제 최신 안정 버전 | OK — GitHub latest API v0.1.3, draft/prerelease false |
| 제보 경로 | OK — private-vulnerability-reporting enabled=true; 이메일 수신 시험 제외 |
| 자동/수동 및 로컬/외부 처리 구분 | OK — 시작 확인·선택 다운로드·로그·자발적 제보와 GitHub/Google 구분 |
| 미확인 무수집 주장 회피 | OK — 조사 범위와 제3자 처리, 삭제 보장 한계 명시 |
| 후원·서명 완료 주장 방지 | OK — 신청 요구 조사로 한정, 공개 제공자 문구 미삽입 |
| 사이트 build/check | OK — source 21·output 25 |
| 기존 Pages 테스트 | OK — 106/106. 처음 5개 실패는 새 HTML로 인한 파일 개수 차이였으며 기대값만 갱신 |
| whitespace·범위 | OK — diff check 통과, 제품/native/upstream 무변경 |
| 기존 사용자 변경 보존 | OK — 원래 worktree 삭제 2건·미추적 2건 그대로 |

### 단계별 검증 결과
- [Stage 1](../working/task_m010_135_stage1.md): 고정 소스·release·보안 API·외부 원문.
- [Stage 2](../working/task_m010_135_stage2.md): 정책 문구·진입 링크.
- [Stage 3](../working/task_m010_135_stage3.md): build/check/test, 기존 변경 보존.

## 잔여 위험과 후속 작업
### 잔여 위험
실제 Windows/Linux 네트워크 캡처와 로그 잔존, 이메일 수신, 시각 렌더링 검증은 하지 않았다. 코드·설정·공식 서비스 정책 조사와 사이트 정적 검증을 구분한다. 보관 기간·모든 사본 삭제·제3자 미수집을 보장하지 않는다. 라이선스/서명 대상 전체 적합성, 팀원 MFA, 서명 승인자, 검증 가능한 CI, 설치 시 안내/옵션 요구와 현재 자동 업데이트 동작의 적합성은 SignPath 신청 전 확인이 필요하다.

조사용 임시 upstream 전체 checkout의 공간 부족은 이번 task의 복제본만 제거해 해소했다. 원본 사용자 worktree는 변경하지 않았다. submodule은 작업 worktree에서 미초기화 상태이며 사이트 문서 검사에는 필요하지 않다.

### 후속 작업 후보
실제 팀 역할·MFA·서명 대상·CI 신뢰 경계와 설치 개인정보 안내/옵션 확인. 후원 승인 후에만 공개 Code signing policy의 제공 관계를 확정한다. 이번 작업으로 신청 적합성이나 승인을 선언하지 않는다.

## 작업지시자 보고
구현·검증 완료. PR 게시·merge·사이트 배포, SignPath 신청 제출·계정·자격증명 생성은 하지 않았다. 공개 정책 URL은 배포 전이므로 현재 접근 가능하다고 보고하지 않는다. 최종 검토 후 다음 지시 범위에 따라 진행한다.
