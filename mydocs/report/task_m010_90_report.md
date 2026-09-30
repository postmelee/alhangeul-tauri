# README 배지와 운영체제별 홈페이지 안내 최종 보고서

GitHub Issue: [#90](https://github.com/postmelee/alhangeul-tauri/issues/90)
마일스톤: M010

## 작업 요약

- 대상 이슈: #90, M010, Stage 1~5.
- README 제목 아래 안정 릴리즈·포함 rhwp·Windows/Linux·MIT 배지 4개를 추가했다.
- rhwp v0.8.6 표시와 exact release 링크를 기존 관리 참조 updater에서 함께 갱신한다.
- 데스크톱 헤더에 ‘알한글 for macOS’를 유지하고, 모바일은 기존 세 메뉴 한 행과
  홈 다운로드 아래·하위 페이지 푸터의 보조 안내로 정리했다.
- 새 macOS 프로젝트 세션에 실제 rhwp 배지와 ‘알한글 for Windows / Linux’ 링크 작업을 전달했다.
- 구현·검증은 완료했으며 devel PR 검토·병합과 공개 main 반영은 별도 승인 사항이다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| README.md | 배지 4개, 5행 추가 | 사용자 첫 진입 안내 |
| scripts/update-rhwp-managed-references.mjs | private 배지 helper·exact rule | 후보 rhwp 동기화의 관리 참조 |
| tests/rhwp-managed-references.test.mjs | 정상 갱신·실패 4개·snapshot 정합성 | 기존 동기화 회귀 검증 |
| site HTML 3개·styles.css | 데스크톱 헤더·모바일 보조 링크·한 행 헤더·cache key | 사용자 홈페이지 탐색 |
| scripts/check-product-boundary.mjs | exact 외부 링크 문장만 source/output 세 경로에 허용 | 기존 제품 지원 범위 유지 |
| tests/pages-design.test.mjs·product-boundary.test.mjs | 메뉴 기대·exact 예외와 거부 사례 | Pages·제품 경계 회귀 검증 |
| mydocs/plans·working·report·orders | 계획·단계·통합 수용·완료 상태 | 내부 작업 기록 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 사용자 배지 | 루트 README.md | 기존 제목 아래 | OK | 기존 본문·이미지 보존 |
| 홈페이지 안내 | 기존 site HTML·CSS | 헤더·모바일 홈 다운로드 아래·하위 페이지 푸터 | OK | 승인된 링크와 cache 이외 HTML 원문 보존 |
| 내부 산출물 | 기존 mydocs 역할별 위치 | task_m010_90 문서와 당일 orders | OK | 수행계획서와 동일 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| README 배지 | 0 | 4 |
| README LOC | 87 | 92 |
| updater LOC | 167 | 172 |
| managed-reference tests | 5 | 9 |
| 홈페이지 헤더의 macOS 링크 | 0 | 3 |
| 모바일 보조 링크 | 0 | 홈 다운로드 아래 1·하위 페이지 푸터 2 |
| 제품·pin·workflow diff | 0 | 0 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 배지·링크와 실제 버전 | OK — SVG 4개 HTTP 200, Alhangeul v0.1.0·rhwp v0.8.6·Windows/Linux·MIT |
| 실제 lock 정합성 | OK — alt·SVG 표시·tag 링크와 lock tag 일치, core/WASM/native pin 검증 |
| 후보 버전 갱신 | OK — 배지 alt·표시·링크·Stable pin 함께 전환, 실제 snapshot 테스트 통과 |
| 실패 시 무쓰기 | OK — 누락·중복·표시·링크 드리프트에서 writes=0·기존 bytes 보존 |
| 관련 계약 | OK — focused tests 25/25, upstream 39/39, boundary 730 files |
| 홈페이지·제품 경계 계약 | OK — Pages·product-boundary tests 64/64, build/check source=16/output=19 |
| 실제 헤더와 링크 | OK — 320/390px 홈 미리보기, 320px 하위 페이지·520/521px 헤더 시각 확인, 1280px 헤더 52px·네 링크 같은 행 |
| macOS 새 세션 작업 전달 | OK — 실제 origin 확인·세션 생성·지시 전달·활성 작업 확인 |
| 실제 GitHub 렌더링 | OK — 배지 4개 같은 행·높이 20px, README 이미지 총 9개 정상 로드 |
| 기존 사용자 본문과 제품 불변 | OK — README 배지 제외, HTML 상호 링크/stylesheet key/푸터 줄바꿈 제외 원문 bytes 동일, 제품·pin·workflow diff 없음 |
| Release·updater 불변 | OK — release.json 원문 및 output stable.json SHA-256 e3c27ee4… 유지 |
| 전체 diff | OK — 허용 목록·문서 위치·공백 검증 통과 |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_90_stage1.md): 실제 SVG·공개 릴리즈·현재 pin·원문 보존.
- [Stage 2](../working/task_m010_90_stage2.md): 관련 테스트 64개와 갱신·무쓰기 계약.
- [Stage 3](../working/task_m010_90_stage3.md): GitHub 실제 화면·링크·전체 diff와 PR 준비.
- [Stage 4](../working/task_m010_90_stage4.md): 홈페이지 링크·좁은 화면·Pages/경계 테스트·새 macOS 세션 전달.
- [Stage 5](../working/task_m010_90_stage5.md): 모바일 보조 안내·한 행 헤더·실제 미리보기·기존 PR 갱신.

## 잔여 위험과 후속 작업

### 잔여 위험

- 외부 배지 서비스·GitHub 캐시 지연 가능성이 있어 기존 안정 버전 텍스트를 보존했다.
- 실제 scheduled rhwp 갱신은 실행하지 않았고 새 설치본·native 검증은 이번 영향 범위에 없다.
- devel PR만 게시한다. 공개 main 첫 화면 반영은 병합 후 별도 승격이 필요하다.
- 홈페이지 헤더의 공개 반영에는 별도 Pages 배포가 필요하다. 새 macOS 세션의 구현·PR 결과는
  해당 세션이 별도 보고하며 이 보고서는 세션 생성·작업 전달 완료만 수용한다.

### 후속 작업 후보

새 기능 이슈는 없다. 이 PR 검토·병합 후 승인된 변경을 main에 반영하고 홈페이지를 배포한다.
별도 macOS 세션의 PR도 해당 저장소에서 검토한다. #90 병합 후 이번 task 부산물을 정리한다.

## 작업지시자 승인 요청

PR의 변경과 검증 결과를 검토한 뒤 devel 병합·공개 main 반영·홈페이지 배포를 지시하면 이어서 진행한다.
