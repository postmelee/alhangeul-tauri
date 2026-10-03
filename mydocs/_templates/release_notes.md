# 릴리즈 본문 작성 템플릿

## 사용 위치와 시점

- 사용자 문구의 원문: `docs/releases/v<version>.notes.json`.
- 기술 검증·공개 승인 기록: 기존 `docs/releases/v<version>.md`와 `release_record.md` 템플릿.
- 작성 시점: 이전 공개 tag와 후보의 변경 범위를 분석한 뒤, 생성·공개 승인 전 작성한다.
- 언어: 한국어(`ko`). 앱 사용자에게 보이는 변화와 실제 한계를 설명한다.
- Markdown 생성물은 검토용 output directory에 둔다. 템플릿 자체나 placeholder를 공개하지 않는다.

## 원문 계약

top level은 `schemaVersion: 1`, `metadata`, `content`다. 자세한 기계 검사는
`scripts/releases/notes-schema.mjs`를 사용한다.

| 필드 | 작성 기준 |
|---|---|
| metadata.repository/version/tag/sourceSha | 제품 저장소와 stable version, 일치하는 tag, exact 40자리 source |
| metadata.status/publishedAt | draft는 null, published는 실제 UTC ISO 공개 시각; 예정 시간을 공개일로 쓰지 않음 |
| metadata.rhwp | Stable tag와 resolved commit; core·Studio가 같은 release라는 기존 pin 근거 |
| metadata.previous | 첫 공개는 null, 이후는 직전 공개 version/tag/source/rhwp |
| metadata.assets | Windows NSIS/MSI, Linux x64 AppImage/DEB/RPM, Linux arm64 DEB 6종의 exact URL·size·SHA-256 |
| metadata.updaterInventory | 검증된 자동 업데이트 3종 complete inventory; 위 asset과 version/source/hash 일치 |
| content.summary/appChanges | 짧은 사용자용 요약과 앱 변화 문단 배열 |
| content.rhwpChanges | initial/unchanged/updated와 문단 배열; 이전 pin과 같은데 새 upstream 변화로 표시하지 않음 |
| content.supportedEnvironments/installation/updateInstructions | 지원 환경·설치·업데이트 설명 문단 배열 |
| content.limitations | 실제 알려진 한계 문단 배열; 없으면 '없음'을 명시 |
| content.updaterSummary | 짧은 별도 요약, 4000자 이하; 전체 GitHub 본문을 복사하지 않음 |
| content.references | 확인 시각, PR 목록, 해결된 Issue와 참고 Issue의 별도 목록 |

문단은 비어 있지 않은 한 줄 문자열이며 HTML·heading·code fence·placeholder를 넣지 않는다.
updaterSummary만 LF 문단 구분을 허용한다. 문구의 의미·실제 근거는 작성자가 검토한다.
현재 source version이나 가장 높은 파일명을 과거/최신 공개의 판단 근거로 쓰지 않는다.

## PR·Issue 작성 기준

- number·실제 제목·canonical GitHub URL과 1개 이상 근거 링크를 넣는다.
- PR은 app/upstream/operations/documentation으로 분류한다. 운영·문서 PR을 주요 앱 변화로 표시하지 않는다.
- 해결 Issue는 실제 CLOSED·completed 및 해당 릴리즈 해결 근거를 확인한 경우에만 적는다.
- 관련 언급만 있거나 아직 OPEN이면 참고 목록에 둔다. not-planned 종료는 해결로 표시하지 않는다.
- checkedAt은 조회 시각이다. 기계 검사는 입력한 snapshot의 정합성만 확인하며 원격 상태·실제 해결을 증명하지 않는다.
- 목록에 항목이 없으면 생성기가 `- 없음`을 출력한다. 같은 Issue를 두 목록에 중복하지 않는다.

## 필수·선택 섹션

아래 본문 heading과 순서는 필수다. 실제 변화가 없으면 그 사실을 명시한다.
선택 항목은 상세 기록의 추가 근거 링크이며 핵심 변경 요약 앞에 기술 로그를 붙이지 않는다.
다운로드는 6종 설치 형식, 앱 내 업데이트는 NSIS/MSI/AppImage 3종을 정확히 구분한다.

## 출력 템플릿

생성기는 두 marker 사이를 사용한다. 문구·표·목록 token은 검증된 입력에서 생성하며
unknown/missing token을 허용하지 않는다. 이 템플릿은 원격 게시 명령을 실행하지 않는다.

<!-- release-body-template:start -->
# Alhangeul {{tag}}

## 이번 버전의 주요 변경 사항

### 변경 요약

{{summary}}

### 포함된 rhwp 변화

{{rhwpChanges}}

### 알한글 앱 변화

{{appChanges}}

## 다운로드 및 설치

### 다운로드

{{downloadTable}}

### 지원 환경

{{supportedEnvironments}}

### 설치 후 첫 실행

{{installation}}

### 업데이트 확인

{{updateInstructions}}

## 알려진 제한 사항

{{limitations}}

## 이번 릴리즈 관련 PR과 Issue

### 릴리즈 요약에 반영된 PR

{{pullRequests}}

### 해결된 Issue

{{resolvedIssues}}

### 참고/연관 Issue

{{relatedIssues}}

## 상세 기록

{{detailLinks}}

### Release metadata

{{releaseMetadata}}
<!-- release-body-template:end -->

## 검증과 승인 기준

- 필수 구조·정합성과 source drift 검사를 통과한 뒤 exact 본문을 검토한다.
- URL/hash/signature 필드가 유효해도 원격 bytes·서명 검증 완료를 의미하지 않는다. 기존 공개 runbook의 근거를 연결한다.
- 실제 공개일과 Release/Pages/manifest/실제 업그레이드 상태를 구분한다.
- 생성·검사 성공으로 공개 승인을 대체하지 않는다. 본문 수정과 새 릴리즈 게시는 검토한 정확한 산출물로 승인받는다.
