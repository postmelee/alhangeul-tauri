# README 배지와 포함 rhwp 안내 최종 보고서

GitHub Issue: [#90](https://github.com/postmelee/alhangeul-tauri/issues/90)
마일스톤: M010

## 작업 요약

- 대상 이슈: #90, M010, Stage 1~3.
- README 제목 아래 안정 릴리즈·포함 rhwp·Windows/Linux·MIT 배지 4개를 추가했다.
- rhwp v0.8.6 표시와 exact release 링크를 기존 관리 참조 updater에서 함께 갱신한다.
- 구현·검증은 완료했으며 devel PR 검토·병합과 공개 main 반영은 별도 승인 사항이다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| README.md | 배지 4개, 5행 추가 | 사용자 첫 진입 안내 |
| scripts/update-rhwp-managed-references.mjs | private 배지 helper·exact rule | 후보 rhwp 동기화의 관리 참조 |
| tests/rhwp-managed-references.test.mjs | 정상 갱신·실패 4개·snapshot 정합성 | 기존 동기화 회귀 검증 |
| mydocs/plans·working·report·orders | 계획·단계·통합 수용·완료 상태 | 내부 작업 기록 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 사용자 배지 | 루트 README.md | 기존 제목 아래 | OK | 기존 본문·이미지 보존 |
| 내부 산출물 | 기존 mydocs 역할별 위치 | task_m010_90 문서와 당일 orders | OK | 수행계획서와 동일 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| README 배지 | 0 | 4 |
| README LOC | 87 | 92 |
| updater LOC | 167 | 172 |
| managed-reference tests | 5 | 9 |
| 제품·pin·workflow·site diff | 0 | 0 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 배지·링크와 실제 버전 | OK — SVG 4개 HTTP 200, Alhangeul v0.1.0·rhwp v0.8.6·Windows/Linux·MIT |
| 실제 lock 정합성 | OK — alt·SVG 표시·tag 링크와 lock tag 일치, core/WASM/native pin 검증 |
| 후보 버전 갱신 | OK — 배지 alt·표시·링크·Stable pin 함께 전환, 실제 snapshot 테스트 통과 |
| 실패 시 무쓰기 | OK — 누락·중복·표시·링크 드리프트에서 writes=0·기존 bytes 보존 |
| 관련 계약 | OK — focused tests 25/25, upstream 39/39, boundary 730 files |
| 실제 GitHub 렌더링 | OK — 배지 4개 같은 행·높이 20px, README 이미지 총 9개 정상 로드 |
| 기존 사용자 본문과 제품 불변 | OK — 배지 제외 원문 bytes 동일, 제품·pin·workflow·site diff 없음 |
| 전체 diff | OK — 허용 목록·문서 위치·공백 검증 통과 |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_90_stage1.md): 실제 SVG·공개 릴리즈·현재 pin·원문 보존.
- [Stage 2](../working/task_m010_90_stage2.md): 관련 테스트 64개와 갱신·무쓰기 계약.
- [Stage 3](../working/task_m010_90_stage3.md): GitHub 실제 화면·링크·전체 diff와 PR 준비.

## 잔여 위험과 후속 작업

### 잔여 위험

- 외부 배지 서비스·GitHub 캐시 지연 가능성이 있어 기존 안정 버전 텍스트를 보존했다.
- 실제 scheduled rhwp 갱신은 실행하지 않았고 새 설치본·native 검증은 이번 영향 범위에 없다.
- devel PR만 게시한다. 공개 main 첫 화면 반영은 병합 후 별도 승격이 필요하다.

### 후속 작업 후보

새 기능 이슈는 없다. 이 PR 검토·병합 후 승인된 변경을 main에 반영하고 #90 부산물을 정리한다.

## 작업지시자 승인 요청

PR의 변경과 검증 결과를 검토한 뒤 devel 병합과 공개 main 반영을 지시하면 이어서 진행한다.
