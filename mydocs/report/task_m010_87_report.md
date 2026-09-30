# Task #87 — 공개 기본 브랜치 전환과 원격 정리 최종 보고

GitHub Issue: [#87](https://github.com/postmelee/alhangeul-tauri/issues/87)
마일스톤: M010

## 작업 요약

- 대상 이슈 #87, 3단계. 마케팅을 위한 공개 기본 main과 개발 통합 devel 책임을 정렬한다.
- 공개 이후 사용자·사이트·Community 안내를 main으로 반영할 PR과 설정 전환을 준비했다.
- 병합/종료된 원격 ref 3개를 정리하고 미병합 publish/task35를 보존했다.
- 이 보고서는 PR 게시 시점의 source 결과다. 아래 원격 전환 수용 항목은 두 PR 병합 후
  실제 API/UI/Release 대조 결과를 #87과 PR 본문에 추가하여 확정한다.

## 변경 파일과 영향 범위

| 경로 | 변경 | 영향 |
|---|---|---|
| docs/operations/DESKTOP_RELEASE.md | 기본 main·기여/동기화/Pages devel 책임 13행 추가 | 제품 운영 안내 |
| mydocs/plans/task_m010_87{,_impl}.md | 범위·승인·문서 위치·단계·검증 | 내부 작업 |
| mydocs/working/task_m010_87_stage{1,2,3}.md | 단계별 근거와 한계 | 내부 작업 |
| mydocs/report/task_m010_87_report.md | 최종 수용 인계 | 내부 작업 |
| mydocs/orders/20260930.md | #87 PR 준비 완료 | 오늘할일 |

## 문서 위치 검증

| 문서 | 계획·실제 위치 | 결과 |
|---|---|---|
| 제품 운영 책임 | 기존 docs/operations/DESKTOP_RELEASE.md | OK — 새 공식 문서 루트 없음 |
| 승인/단계/최종 기록 | 기존 mydocs/plans·working·report·orders | OK — milestone 포함 파일명 |

## 변경 전·후 정량 비교

| 항목 | 시작 | PR 준비 시점 |
|---|---|---|
| 원격 branches | 6 | 3: main/devel/publish/task35 |
| task35 고유 미병합 commits | 19 | 19, 보존 |
| 기본 브랜치 | devel | devel, main 승격·전환은 병합 후 확인 |
| v0.1.0 tag/Release asset | 고정 tag·11 assets | 변경 없음, 최종 대조 예정 |
| 이번 source diff | 없음 | 운영 문서 1개+내부 기록 7개 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 시작 CI/devel tree 정합성 | OK — f7b4917a와 1ee2883e 전체 tree 동일 |
| 공개 제품 유지 | OK — main/시작 devel apps·packages·pin·locks·gitlink diff 없음 |
| 승인 경로·본문·링크·diff 검토 | OK — 운영 정책 최소 추가·상대 링크·git diff --check |
| 로컬 계약 | OK — boundary 730 files, automation 995, upstream 39, Studio 235/38 files |
| Studio·Pages | OK — 두 build 성공, Pages source16/output19 |
| 종료 원격 ref 3개 삭제 | OK — 종료 PR/Issue·exact tip·devel ancestry·활성 run 부재·삭제 후 refs |
| 미병합 작업 보존 | OK — publish/task35 e3095c64/19 commits, 기존 다른 checkout 유지 |
| main 승격·default main·Community/UI | 병합 후 확인 — 설정과 UI는 아직 전환 전 |
| tag/11 assets/production manifest 최종 불변 | 병합 후 확인 — 시작 baseline 보존 |

### 단계별 결과

- [Stage 1](../working/task_m010_87_stage1.md): source/tree/공개 baseline·운영 문서 위치 수용.
- [Stage 2](../working/task_m010_87_stage2.md): ref 3개 정리·미병합 보존·관련 로컬 계약 수용.
- [Stage 3](../working/task_m010_87_stage3.md): 통합 diff·기여/동기화 경계 검토·두 PR/설정 준비.

## CI 재사용과 검증 한계

기존 [36711244690](https://github.com/postmelee/alhangeul-tauri/actions/runs/36711244690)은
head f7b4917a에서 성공했다. 시작 devel과 동일 tree이고 현재 task는 문서/기록만 달라
Windows PowerShell 증거를 재사용한다. 관련 Node/Studio/Pages 검증은 로컬에서 새로 수행했다.
새 Actions·native build·installer 검증·서명·Release/Pages 배포를 반복하지 않았고 테스트
신고나 이메일을 발송하지 않았다. 이미 공개한 제품 source와 문서용 main SHA를 구분한다.

## 잔여 위험과 후속 작업

main 승격 후 새 기본 branch의 8개 Community Standards, 제보·보안·README와 About를 확인한다.
upstream 예약 정의는 main에서 실행되지만 명시 BASE_BRANCH/checkout/후보 PR은 devel을 유지한다.
Pages devel 허용 환경 정책과 production manifest의 기존 hash를 재확인한다.
Branch protection #28·Action pinning #27·미병합 GUI 작업 #35는 이번 작업으로 종료하지 않는다.
기존 제품의 미서명·NSIS 환경 제한·production N→N+1 미검증도 유지한다.

## 승인 상태

작업지시자의 명시 승인 범위로 일반 문서 PR → devel/main 승격 PR 검토·병합 →
default main 변경 → 실제 최종 수용·#87 종료·이번 task 정리까지 진행한다.
새 제품/릴리즈/배포나 다른 미병합 작업 삭제는 승인 범위가 아니다.
