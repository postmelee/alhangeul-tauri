# Task #85 최종 보고서 — 사용자·커뮤니티 공개 정비

GitHub Issue: [#85](https://github.com/postmelee/alhangeul-tauri/issues/85)
마일스톤: M010

## 작업 요약

- 대상 이슈: #85, M010, 총 3단계.
- 목적: 첫 안정 릴리즈를 소개할 수 있도록 사용자 README·Community Standards·저장소 소개를 정비한다.
- README는 공개 v0.1.0 다운로드·사용 순서·실제 Windows/Linux 화면·제한과 제보를 먼저 안내한다.
- 기여·행동 강령·보안 문서와 한국어 제보 양식, 다운로드 홈페이지·12개 토픽·비공개 신고를 준비/반영했다.
- 구현·로컬/공개 브랜치 검증과 첫 fast CI 수용·PR 검토를 완료했다. 검토 후 내부 기록/공백만 정리했으며 새 head CI는 PR에서 확인한다. PR 병합과 기본 브랜치 Community Standards 최종 수용은 남아 있다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| README.md | 공개 버전·패키지·기능·화면·사용·제보·출처 | 사용자 첫 화면 |
| CODE_OF_CONDUCT.md | 한국어 Contributor Covenant 2.1·연락처·CC BY 4.0 출처 | 커뮤니티 기준 |
| CONTRIBUTING.md | 외부 fork/devel PR·검증·안전한 샘플 | 외부 기여 |
| SECURITY.md | 최신 stable 지원·비공개 취약점 경로 | 보안 제보 |
| .github/ISSUE_TEMPLATE/bug_report.yml | 한국어 환경·재현, upstream 비교 선택화 | 버그 진입점 |
| .github/ISSUE_TEMPLATE/feature_request.yml | 한국어 문제·해결·영역 | 개선 진입점 |
| .github/ISSUE_TEMPLATE/config.yml | 설치·문의·비공개 신고 연락 경로 | chooser |
| docs/README.md | 사용자·커뮤니티 문서 연결·현재 상태 우선 안내 | 기존 인덱스 |
| mydocs/plans/task_m010_85{,_impl}.md | 승인·범위·문서 위치·단계 | 내부 계획 |
| mydocs/working/task_m010_85_stage{1,2,3}.md | 단계별 변경·검증·한계 | 실행 기록 |
| mydocs/report/task_m010_85_report.md, orders/20260930.md | 통합 결과·상태 | 보고·인계 |
| GitHub About·topics·private reporting | 승인값 반영·API 재조회 | 이미 적용한 원격 설정 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| README·CODE_OF_CONDUCT·CONTRIBUTING·SECURITY | 저장소 루트 | 저장소 루트 | OK | 수행계획서 위치 판단·diff |
| bug/feature/config.yml | 기존 .github/ISSUE_TEMPLATE | 동일 | OK | 내부 task 폼·PR template 불변 |
| docs/README.md | 기존 docs 인덱스 | 동일 | OK | 새 공식 루트·파일 이동 없음 |
| 내부 계획·보고·orders | 기존 mydocs 역할별 폴더 | 동일 | OK | 승인된 파일명·중앙 템플릿 기준 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| README 행 수 | 77 | 87 |
| 루트 커뮤니티 문서 | 0 | 3 |
| README 실제 화면 | 0 | OS별 편집·탐색기 4개 + 기존 로고 |
| repository homepage | null | 공개 다운로드 페이지 |
| repository topics | 0 | 12 |
| private vulnerability reporting | false | true |
| bug upstream 데모 강제 checkbox | 1 | 0, 선택 dropdown |
| chooser contact links | 0 | 3 |
| 기본 브랜치 Community Standards UI | 5/8 | 5/8 — 새 문서 3개는 병합 후 확인 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 사용자 README와 현재 공개 상태 | OK — Release v0.1.0 draft=false/prerelease=false·6종 설치 파일 대조 |
| 행동 강령·기여·보안 문서 | OK — 공식 한국어 2.1 원문 대조, 실재 공개 연락처, private reporting enabled |
| 저장소 소개 | OK — 승인한 description·homepage·12 topics를 원격 read-back |
| 폼·chooser 구조 | OK — YAML/schema·고유 field/labels/required 검증, 실제 GitHub bug/feature preview |
| Markdown 표시·이미지 | OK — 로컬 GFM·실제 게시 브랜치 preview, 이미지 5개 정상·강조 파싱 보정 |
| 링크·경로 | OK — 로컬 41개·anchor 1개, 외부 16개 HTTP 200; 비공개 경로는 설정 API 확인 |
| 기존 계약 | OK — 59 passed/0 failed/0 skipped, product boundary 730 files, Pages build/check |
| 변경 경계 | OK — 제품·upstream·lock·workflow·release·사이트 소스 및 내부 양식 불변 |
| 모든 Community Standards 최종 체크 | 미수용 — 기본 브랜치의 3개 새 문서 인식은 PR 병합 후 확인 |

반영한 원격 설정은 [Stage 2](../working/task_m010_85_stage2.md)에 변경 전후와 확인 시각을 기록했다.
설정은 문서 PR 병합 여부와 별개로 이미 적용됐다. 다른 저장소 기능 설정은 변경하지 않았다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_85_stage1.md): 공개 상태·상대 링크·실제 이미지·pin marker·원문 출처.
- [Stage 2](../working/task_m010_85_stage2.md): 폼 schema·기존 label/양식 bytes·원격 설정 exact read-back.
- [Stage 3](../working/task_m010_85_stage3.md): GitHub 표시·59개 회귀·Pages·링크 통합·기본 브랜치 5/8 확인.

## 잔여 위험과 후속 작업

### 잔여 위험

- 최초 PR head `e50d9f986558a5a3ad68bfab06cc5b31d1584e94`의 fast CI는 아래 후속 확인에서 수용했다. 검토 후 변경은 내부 기록·공백에 한정되며 최종 head의 새 fast CI는 PR에 연결하고 결과를 기다리지 않는다.
- Community Standards는 PR 병합 후 기본 브랜치 UI의 8개 체크를 확인해야 한다. API score는 YAML/Security 인식이 달라 최종 수용 근거로 쓰지 않는다.
- 새 chooser와 보안 정책의 기본 브랜치 자동 노출도 병합 후 확인한다. 이메일·실제 취약점 전송은 시험하지 않았다.
- 문서만 변경해 새 native 설치본·서명·Pages/manifest 배포를 만들지 않았다. 기존 설치본의 Authenticode 미서명,
  환경별 NSIS 썸네일 문제와 실제 production N→N+1 미검증은 제품의 알려진 제한으로 유지한다.
- 기존 개발·출처 문서의 역사적 준비 상태는 범위를 확장해 재작성하지 않았다. 최신 공개 상태는 README·사이트·버전별 최신 기록을 우선한다.

### 후속 작업 후보

1. 검토 후 최종 head의 fast CI 확인과 별도 병합 승인.
2. 병합 후 Community Standards 8개·chooser·보안 정책·README 연결 확인 및 #85 종료/부산물 정리.
3. 완료된 공개 소개를 바탕으로 사용자가 마케팅을 진행할 수 있다. 메시지 발송은 이번 작업에 포함하지 않는다.

## 작업지시자 승인 상태

작업지시자가 “작업을 계속진행하고 PR 생성까지 진행해줘”로 이슈 등록·문서 위치·설정·각 단계와
Open PR 게시를 명시 승인했다. 그 범위까지 진행하며 병합·이슈 close·릴리즈/배포는 실행하지 않는다.

## PR #86 CI 수용·검토 — 2026-09-30

작업지시자가 CI 완료를 알리고 다음 진행을 지시했다. 기존 계획의 PR 제출 범위에 이어
CI 수용·PR 검토와 내부 기록/공백 보정을 수행한다. 새 제품 기능이나 공식 문서 위치 변경은 없다.

- [fast CI 36709677925](https://github.com/postmelee/alhangeul-tauri/actions/runs/36709677925):
  completed/success, workflow_dispatch, source/head `e50d9f986558a5a3ad68bfab06cc5b31d1584e94`.
- `select`, `fast / Fast Node and Studio contracts`, `fast / Fast Windows PowerShell contracts`가 success다.
  native/package/installer/PDF cleanup은 이 profile에서 선택하지 않아 skipped이며 통과로 확대하지 않는다.
- CI 로그 대조: automation 995 passed/0 failed/0 skipped, upstream 39 passed/0 failed/0 skipped,
  Studio 38 test files/235 tests passed. GUI typecheck·Studio build·version/release/pin 검사도 성공했다.
- Windows 계약 artifact: ID `11093347406`, `alhangeul-fast-windows-script-contracts`, 7,466 bytes,
  SHA-256 `c1493cb0bf2c182193b043e54ed33678e9a6afaacde6e933b29f3f12b034892d`.
  API digest와 다운로드 ZIP digest를 대조했다. 합성 실패 입력의 거부 결과는 의도한 negative case이며
  설치 제품 수용을 뜻하지 않는다.
- 공개 문서 8개와 내부 기록 7개를 검토했다. README의 공개 상태·다운로드·지원 패키지/제한,
  행동 강령 출처·연락처, 외부 기여와 비공개 제보, chooser·선택적 upstream 비교에서 차단할 문제를 찾지 못했다.
- 전체 PR diff의 `git diff --check`가 계획서 EOF의 불필요한 빈 줄 1개를 지적해 정리했다.
  기존 작업 트리만의 diff 검사에서 놓친 커밋된 공백이므로 전체 base..head 범위로 다시 확인한다.
- 검토 후 수정은 수행계획서 EOF와 이 보고서·오늘할일뿐이다. 공개 안내·제품·검증 script/workflow는
  성공한 CI 기준선과 동일하다. 새 최종 head에 fast CI를 실행하고 PR 본문에서 결과를 추적한다.
- About description/homepage/12 topics 및 private reporting=true를 재조회해 승인값 유지 확인.
  PR은 devel 대상 Open, draft=false이며 병합 전 Community Standards 최종 체크와 #85 종료는 남아 있다.
