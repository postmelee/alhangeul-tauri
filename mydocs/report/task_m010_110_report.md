# Task #110 최종 보고서 — 완료 변경의 main 정렬

GitHub Issue: [#110](https://github.com/postmelee/alhangeul-tauri/issues/110)
마일스톤: M010
기록 시점: 구현·로컬 검증 3단계 완료, devel/main PR 게시·원격 검증·병합 전.

## 작업 요약

- 대상 이슈: #110, 마일스톤 M010, 구현 단계 3개.
- #97/#102/#108에서 완료된 릴리즈 작성 규격·업데이트 검증 도구·웹 다운로드 개선을 공개 기본 브랜치 main에 정렬한다.
- main 전용 이력을 일반 merge로 보존하고 README에 v0.1.1 공개 안내 한 줄을 추가해 두 릴리즈 안내 링크를 유지했다.
- 이번 신규 변경은 README와 #110 작업 기록에 한정된다. 새 제품 source·workflow·의존성 변경, installer 생성·서명·Release/updater/Pages 게시는 없다.
- 작업지시자는 “진행해줘. 병합및 이번 작업 마무리까지 별도 승인없이 계속 진행해줘.”로 구현·검증·두 PR·병합·정리를 승인했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| README.md | main/devel 릴리즈 안내 링크를 모두 유지 | 공개 저장소 안내 |
| mydocs/plans/task_m010_110.md, _impl.md | 범위·문서 위치·단계·검증·승인 | 작업 추적 |
| mydocs/working/task_m010_110.json, _stage1/2/3.md | exact 기준선·검증 결과·한계 | 수용 증거 |
| mydocs/report/task_m010_110_report.md | PR 게시 직전 구현 결과 | 장기 보고 |
| mydocs/orders/20261005.md | 기존 행 보존과 #110 상태 | 오늘할일 |

누적 main 승격 대상의 103개 경로는 기존 #97/#102/#108의 완료 변경이다. 이번 task의 신규 제품 구현으로 분류하지 않는다. 시작 main 7bab9062와 devel 1d3817c7, 기존 제품 tag source 96e89e90은 working JSON에 전체 SHA로 고정했다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| README | root README.md | README.md | OK | 공개 안내 한 줄 통합 |
| 수행·구현계획 | mydocs/plans | 동일 | OK | 기존 중앙 템플릿 사용 |
| 단계·기계 근거 | mydocs/working | 동일 | OK | 현재 task 근거만 추가 |
| 최종 보고 | mydocs/report | 동일 | OK | 본 문서 |
| 오늘할일 | mydocs/orders | 동일 | OK | 기존 #108 행 보존 |
| 누적 공식 docs/site/templates | 기존 위치 유지 | 이동·새 수정 없음 | OK | 승인된 완료 작업을 그대로 승격 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| main/devel 예상 README merge 충돌 | 1개 | 0개 |
| README 릴리즈 안내 링크 | 각 브랜치 1개 | 통합 후보 2개 |
| 새 제품·workflow·lock 변경 | 0개 | 0개 |
| 공개 Release asset | 11개 | 기준선 11개 유지 |
| 기존 Pages output 대조 | 직전 공개 22개 | 통합 output 22/22 동일 |
| 제품 버전 / rhwp Stable pin | 0.1.1 / v0.8.6 | 동일 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| main/devel 이력 보존 | OK — Stage 2 merge de9a5227의 두 parent와 양쪽 ancestry 확인 |
| 공개 안내 충돌 해결 | OK — 안정 버전·업데이트 검증·두 링크 유지 |
| 제품 경계·version·release metadata·rhwp pin·committed-rhwp | OK — 5개 검사 성공 |
| 릴리즈 작성 규격 | OK — 1개 문서 check와 124 테스트 passed |
| 자동화 계약 | OK — 1308 passed, fail/skipped 0 |
| upstream | OK — 39 passed, fail/skipped 0 |
| Studio | OK — 251 passed / 39 files, Vite build 성공 |
| GUI harness typecheck | OK |
| Pages source/output | OK — source 18/output 22, 전 파일 기존 공개 hash/크기와 동일 |
| 앱·crate·asset·lock·workflow·script·test·site 경계 | OK — 수용된 시작 devel 대비 동일 |
| 원격 PR acceptance 및 실제 main 반영 | 후속 PR 단계 — 이 기록 시점에는 미실행. 실제 결과를 PR 본문·#110 종료 기록에 추가한다. |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_110_stage1.md): 시작 ref·기존 CI/Pages·Release 11 assets·22개 공개 파일 확정.
- [Stage 2](../working/task_m010_110_stage2.md): main 일반 merge, README 한 줄 통합, 제품 계약 5개·보호 경로 동일성.
- [Stage 3](../working/task_m010_110_stage3.md): 릴리즈·Node·Studio·Pages 계약 및 output 동일성.

### 기존 원격 증거

기존 [PR #109 fast run 37222603474](https://github.com/postmelee/alhangeul-tauri/actions/runs/37222603474)과 [Pages run 37223289065](https://github.com/postmelee/alhangeul-tauri/actions/runs/37223289065)의 모든 job/step 성공을 다시 확인했다. 기존 Windows 실제 업그레이드 [37179376994](https://github.com/postmelee/alhangeul-tauri/actions/runs/37179376994)는 전체 success다. 기존 Linux AppImage [job 111307414907](https://github.com/postmelee/alhangeul-tauri/actions/runs/37158705809/job/111307414907)는 success지만 소속 전체 run은 failure이며 그대로 구분한다. 이번 신규 업그레이드 실행으로 표현하지 않는다.

## 잔여 위험과 후속 작업

### 잔여 위험

- 이번 통과 범위는 플랫폼 중립·fast 계약이며 새 native/installer/GUI 수용이 아니다. 기존 v0.1.1 기록의 실제 환경·Windows NSIS 썸네일 등 제한은 유지된다.
- 원격 ref가 이동하면 PR head/base와 검증 tree를 다시 대조한다. main PR의 자동 acceptance 부재는 tree 동일성 및 승인된 exact fast 근거로 처리한다.
- 문서용 main commit을 기존 제품 source로 기록하지 않는다. 이미 공개된 tag/Release/asset/피드·Pages source는 보존한다.

### 후속 작업 후보

본 task의 남은 실행은 devel PR의 새 fast 수용·merge, main PR의 tree 검토·merge, 공개 상태 read-back·이슈 종료·이번 작업 cleanup이다. 모두 이번 포괄 승인으로 진행하며 새 이슈로 분리하지 않는다. 새 기능·새 릴리즈는 본 범위에 포함되지 않는다.

## 작업지시자 승인 요청

명시된 포괄 승인에 따라 PR 게시부터 병합·검증·정리까지 계속 진행한다. 이 문서는 PR 게시 직전 source 기록으로 보존하며 실제 원격 완료 결과는 두 PR 본문과 #110 이슈에 기록한다.
