# Task #27 최종 보고서 — GitHub Actions immutable dependency

GitHub Issue: [#27](https://github.com/postmelee/alhangeul-tauri/issues/27)
마일스톤: M010

## 작업 요약

- 대상 이슈: #27; 마일스톤 M010; 단계 수 3.
- 목적: 외부 Action의 출처를 검토 가능한 SHA·version으로 통일하고 floating ref 재유입을 차단한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| .github/action-pins.json | action11개의 공식 ref·resolved SHA·risk inventory | workflow dependency provenance |
| .github/workflows·actions의 YAML19개 | uses152개 SHA·version 정렬 | job·입력·권한 유지 |
| scripts/verify-action-pins.mjs·tests/action-pins.test.mjs | YAML AST 검사·실패 회귀14개 | CI/static supply chain |
| package.json·pnpm-lock.yaml | automation 편입, yaml2.9.0 직접 dev 선언 | importer3행 추가, 제품 runtime 동일 |
| workflow 회귀4개 | 승인 SHA 기대값 반영 | 기존 계약 유지 |
| docs/operations/ACTION_DEPENDENCIES.md·CI_VALIDATION.md·docs/README.md | 정책·검사·갱신·rollback | 공식 운영 문서 |
| mydocs/plans·working·report·orders | 단계·검증·사용자 진행 승인 | task 기록 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| ACTION_DEPENDENCIES.md | docs/operations | docs/operations | OK | 수행계획서 문서 위치 판단 일치 |
| CI_VALIDATION.md·docs/README.md | 기존 위치 | 기존 위치 | OK | 기존 내용 최소 보완 |
| 단계·최종 기록 | mydocs/working·report | mydocs/working·report | OK | 공식 정책과 task 증거 분리 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| external uses | 152 | 152 |
| floating ref | 98 | 0 |
| provenance inventory | 없음 | 11 action paths |
| yaml 직접 dev 선언 | transitive2.9.0 | exact2.9.0, lock importer3행 |
| 실패 회귀 | 없음 | 14개 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 외부 uses SHA40·대응 version 출처 | OK — 공식 ref recursive resolve와 action.yml 입력152개 대조 |
| floating/unknown/comment/alias 우회 차단 | OK — action pin14회귀 및 automation1009/1009 |
| 기존 Node·Studio·pin 경계 | OK — upstream39, Studio235, build/typecheck, boundary715 |
| 기존 workflow job·입력·권한 보존 | OK — YAML19 AST 비교, actionlint·diff 검사 |
| Windows/Linux native·artifact·installer 전체 gates | OK — fresh full36730348163의 모든 필수 gates와 전체 conclusion=success |
| 정책·rollback | OK — 공식 운영 문서 및 링크 확인 |

### 단계별 검증 결과

- [Stage1](../working/task_m010_27_stage1.md): inventory·upstream provenance.
- [Stage2](../working/task_m010_27_stage2.md): 참조 정렬·AST 검사·회귀.
- [Stage3](../working/task_m010_27_stage3.md): 정책·로컬 통합·원격 fresh full. run [36730348163](https://github.com/postmelee/alhangeul-tauri/actions/runs/36730348163), source dcef92a1031f5abeef66eeef1adb4fc158c7c0b6.
- 첫 run [36723402631](https://github.com/postmelee/alhangeul-tauri/actions/runs/36723402631)은 installer-status/result 실패로 전체 수용하지 않는다. 완료 후 같은 API 계약 재검산 성공과 fresh full 결과를 구분한다.
- 원격 검증 이후 task 문서만 추가한 경우 source diff를 대조해 동일 source의 검증으로 재사용한다.

## 잔여 위험과 후속 작업

### 잔여 위험

- Pages/서명/Release 게시와 App token 발급은 실행하지 않았다. dtolnay SHA pin은 compiler stable 자체의 immutable pin이 아니다.
- 설치 계약은 NSIS 진단 제한·MSI 재부팅 후 미검증을 명시하며 전체 GUI/VDI/제품 공개 수용과 구분한다.
- 최초 metadata gate의 일시 실패 원인은 확정하지 않았으며 fresh 전체 run 결과만 최종 수용에 사용한다.

### 후속 작업 후보

- #28에서 devel PR 자동 검증과 실제 보호 정책을 적용한다.
- scheduled definition의 기본 브랜치 적용을 위해 task27 동일 head의 main 운영 PR을 리뷰/병합한다. 해당 PR은 Release/Pages 배포가 아니며 task90은 포함하지 않는다.

## 작업지시자 승인 요청

사용자가 #27 수행·PR 생성·리뷰·병합을 명시 승인했다. 모든 실제 gates 성공 확인 후 이 승인으로 devel 및 필요한 main 운영 PR을 리뷰/병합한다. 기존 dirty task69·별도 task90 변경을 보존한다.
