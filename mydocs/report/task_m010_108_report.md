# Task M010 #108 최종 보고서 — 설치 파일 선택 UI·릴리즈 제목 표현 개선

GitHub Issue: [#108](https://github.com/postmelee/alhangeul-tauri/issues/108)
마일스톤: M010
기록일: 2026-10-05 KST
상태: 구현·로컬 통합 검증 완료 · PR 게시 승인 대기
작업 브랜치: `local/task108`
기준 devel: `b925faa31251114e7064e76209c5640147dd013e`

## 작업 요약

- 대상 이슈: #108, 마일스톤 M010, 총 3단계.
- 문제: 최신 다운로드 메뉴가 updater 대상 3종만 보여 Linux DEB/RPM/arm64를 찾기 어려웠고, 펼친 메뉴가 본문을 덮으며 릴리즈 제목과 설명의 굵기가 과했다.
- 결과: 버튼 아래에 선택 영역을 펼쳐 Windows 2종·Linux 4종의 형식·아키텍처·업데이트 방식을 표시한다. 홈과 같은 정의를 사용하며 릴리즈 제목/항목/설명의 굵기를 600/500/400으로 조정했다.
- 사용자 로컬 화면 확인과 통합 검증을 완료했다. 현재 앱 버전 v0.1.1과 공개 updater bytes를 보존한다. 원격 게시·병합·Pages 배포는 완료 전이다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `scripts/pages/package-downloads.mjs` | 승인 원문 6종에서 deterministic downloads.json 생성·입력/출력 대조 | 웹 일반 다운로드 목록 |
| `scripts/build-pages.mjs`, `scripts/check-pages.mjs`, `scripts/pages/site-files.mjs` | 새 출력 소유 경로와 exact bytes 검사 연결 | Pages build/check; updater 생성 계약 유지 |
| `site/package-downloads.js`, `site/script.js` | 공통 6종 정의·전체 정합성·실패 안내·패널/OS/초점·별도 배지 | 홈·업데이트 동작 |
| `site/index.html`, `site/updates/index.html`, `site/styles.css` | classic defer·본문 흐름 패널·좁은 화면·페이지 한정 글꼴 굵기 | 웹 선택 UI와 릴리즈 표현 |
| `site/feedback/index.html` | 공유 자산 캐시 참조만 갱신 | 문의 UI·본문 보존 |
| `mydocs/_templates/website_release_note.html`, `site/updates/v0.1.1.html` | 중앙 템플릿과 공식 생성 HTML의 UI 참조 갱신 | 현재/앞으로의 웹 릴리즈 안내; 본문 규격 유지 |
| `tests/pages-package-{downloads,ui}.test.mjs`, `tests/fixtures/pages-{package-fixtures,ui-dom}.mjs` | 6종·버전 혼합/실패·키보드·DOM 계약 | 순수 Node 자동 검사 |
| 기존 Pages/release-notes 테스트·fixture | published 유효 원문과 신규 output/helper 연결, 기존 경계 유지 | test:automation·PR fast에 새 계약 포함 |
| `docs/operations/PUBLIC_RELEASE_RUNBOOK.md` | 원문/생성 순서·6종 웹과 3종 updater·불일치 대응·공개 화면 확인 | 기존 공개 운영 절차 |
| 계획서 2종·단계 보고서 3종·본 보고서·오늘할일 | 승인·검증·후속 공개 경계 | #108 추적과 인계 |

제품 runtime, rhwp pin/managed artifacts, pnpm lock, native 빌드/workflow, release.json·notes 원문·GitHub body·updater key/설정/manifest, tag와 Release asset은 바꾸지 않았다. 신규 helper/테스트는 300 LOC 이내로 역할을 분리했다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 목록·홈·v0.1.1 안내 | 기존 `site/`·`site/updates/` | 동일 | OK | 수행계획의 승인 위치와 최종 diff 일치 |
| 웹 안내 템플릿 | `mydocs/_templates/website_release_note.html` | 동일 | OK | 중앙 템플릿에서 공식 생성; 직접 본문 편집 없음 |
| 공개 규칙 | `docs/operations/PUBLIC_RELEASE_RUNBOOK.md` | 동일 | OK | 기존 Gate 5/6 최소 보정 |
| task 문서 | `mydocs/plans`·`working`·`report`, `task_m010_108` 계열 | 동일 | OK | 공식 문서 root 추가 없음 |
| 일반 다운로드 데이터 | 빌드 output `_site/downloads.json` | 동일, 미추적 생성물 | OK | source JSON 작성 금지·출력 exact bytes 계약 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 최신 다운로드 설치 형식 | 3종 (Windows 2 / Linux 1) | 6종 (Windows 2 / Linux 4) |
| 웹에서 명시하는 업데이트 방식 | 앱 대상 3종 중심 | 앱 대상 3종 / 수동 3종 구분 |
| 선택 UI | 본문 위 절대 위치 드롭다운 | 문서 흐름의 접기/펼치기 패널 |
| 선택 영역과 다음 본문 간격 | 본문 겹침 사례 | desktop 실제 42px 간격 |
| 좁은 화면 가로 폭 | 기존 화면 | 390/320px에서 scrollWidth=390/320 |
| signed updater target/bytes | 3종 / 2,295 bytes | 3종 / 2,295 bytes, SHA-256 동일 |
| release 목록 title/description 구조 | strong 제목·최신 문구 결합 | 제목 span·별도 최신 배지 1개; 굵기 500/400 |
| Pages source/output 파일 수 | 17 / 20 | 18 / 22 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 6종 최신 링크를 공개 원문으로 자동 생성 | OK — exact 이름/URL/크기/hash·고정 순서; 새 버전/미공개/누락/불일치 계약 |
| updater 경계와 기존 활성화 보존 | OK — 3종 feed·원문·release.json 불변; 공개 feed bytes도 동일 |
| 공통 OS 선택과 올바른 형식·mode | OK — Windows 2종/Linux 4종, 전체 정합성 확인 후 동시 활성화 |
| 조회 실패·캐시 버전 혼합 | OK — 직접 다운로드 활성화 0건, 여섯 GitHub 안내 경로 유지 |
| 본문 겹침·키보드·좁은 화면 | OK — Stage 2 실제 브라우저와 단위 계약; 사용자 로컬 확인 |
| 릴리즈 굵기·최신 배지 | OK — 실제 computed 600/500/400·배지 1개 |
| 기존 홈·문의·고정 버전 본문 | OK — 홈/문의 회귀와 5개 section·6종 링크, 정규화 HTML 본문 보존 |
| 앞으로의 공식 생성/검사 | OK — 중앙 템플릿·생성 drift 검사·runbook 순서 반영 |
| 통합 중립 검사 | OK — automation 1,308, upstream 39, Studio 251 모두 통과; Studio build 성공 |
| 원격 설치 파일 링크 | OK — 공개 API 6종 exact metadata·HEAD 200, 본체 다운로드 0 bytes |
| 문서/소스/작업 경계 | OK — 승인 경로·고정 product/rhwp/lock·다른 작업자 변경 보존 |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_108_stage1.md): 6종 생성·원문/metadata/출력 경계·updater 불변. 단계 138 실행 및 추가 원문 계약 101 통과(명시/자동 import 중복 실행 포함).
- [Stage 2](../working/task_m010_108_stage2.md): UI/공식 HTML 생성·150 계약 통과, desktop/mobile·키보드·실패 시나리오 실제 브라우저 관측.
- [Stage 3](../working/task_m010_108_stage3.md): Node24.15.0/pnpm10.33.0, 전체 계약·Studio 빌드·Pages 18/22, API·tag/feed/body 대조. 환경 미준비 초기 실패를 복구해 전체 재실행했다.

Stage 2의 UI/템플릿·catalog 9개 SHA-256을 Stage 3에서 대조해 동일한 브라우저 근거를 재사용했다. 상세 hash/asset ID/크기/API digest·조회 시각은 Stage 3 보고서에 기록했다. 임시 로그·스크린샷 경로는 로컬 관측 보조 자료이며 GitHub에 영구 게시된 증거가 아니다.

## 잔여 위험과 후속 작업

### 잔여 위험

- PR required CI와 Pages 공개는 아직 실행하지 않았다. 로컬 성공을 Windows/Linux native 수용이나 공개 완료로 확대하지 않는다.
- installer 본체 재다운로드·서명 검사·v0.1.0→v0.1.1 업그레이드는 반복하지 않았다. 이번 변경은 웹 전용이며 제품 source `96e89e900415ee9e1e942b5c01c833dea3415e86`를 유지한다.
- 기존 제품의 Wayland/그래픽·모든 배포판/문서/프린터 및 NSIS 썸네일 제한은 그대로다. 이번 UI가 제품 제한을 해결한 것으로 안내하지 않는다.
- Studio의 기존 externalization/import/chunk 경고는 남는다. 로컬 생성물과 원격 배포의 CDN 캐시 정합성은 공개 후 확인해야 한다.

### 후속 작업 후보

새 기능 이슈는 필요 없다. #108의 아래 남은 절차를 계속 진행한다.

1. 최종 보고서 승인 후 exact local head를 `publish/task108`으로 push하고 `devel` 대상 Open PR을 게시한다. 제목 후보는 `Task #108: 설치 파일 선택 UI와 릴리즈 제목 표현 개선`이다.
2. 자동 PR acceptance의 Node/Studio·Windows PowerShell fast·Alhangeul PR required 세 job과 필수 step가 모두 성공했는지 확인한다. head/base/merge candidate·diff·최신 devel 충돌을 대조한다. 동일 소스의 수동 fast를 중복 실행하지 않는다.
3. 실제 PR 후보와 CI 결과를 제시해 일반 merge·exact Pages 공개·read-back·이슈 close·정리를 승인받는다. 승인 전 공개 workflow를 dispatch하지 않는다.
4. 승인 후 일반 merge를 확인하고 remote devel exact SHA를 Pages workflow ref/deploy_ref/checkout에 동일하게 고정한다. 사이트 output 22개와 downloads.json·stable feed를 해당 SHA 생성 bytes에 대조하고 실제 공개 UI·6종 링크·넓은/좁은 화면을 확인한다.
5. 결과를 보고하고 #108 close/부산물 정리를 수행한다. 현재 사용자 preview 서버·다른 작업트리는 승인된 수명과 소유 경계를 존중한다.

## 작업지시자 승인 요청

최종 보고서와 로컬 수용 결과를 승인하면 원격 PR 게시·필수 CI 확인까지 진행한다. 일반 merge와 Pages 공개는 실제 원격 후보를 제시한 뒤 별도 승인받는다. 이 최종 보고/커밋은 공개 승인이나 이슈 종료를 의미하지 않는다.
