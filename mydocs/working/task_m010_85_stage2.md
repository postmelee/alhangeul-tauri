# Task #85 Stage 2 — 사용자 제보와 저장소 소개

GitHub Issue: [#85](https://github.com/postmelee/alhangeul-tauri/issues/85)
구현계획서: [task_m010_85_impl.md](../plans/task_m010_85_impl.md)
Stage: 2

## 단계 목적

사용자가 설치·글꼴·OS 통합 문제도 바로 신고할 수 있도록 양식을 정비하고 승인한 저장소 소개와
비공개 보안 신고 설정을 실제 GitHub에 반영한다.

## 산출물

| 파일 또는 설정 | 변경 요약 |
|---|---|
| .github/ISSUE_TEMPLATE/bug_report.yml | 한국어 필수 환경·버전·문제·재현·기대 결과, upstream 비교 선택화 |
| .github/ISSUE_TEMPLATE/feature_request.yml | 한국어 문제·원하는 동작·영역과 선택 자료 |
| .github/ISSUE_TEMPLATE/config.yml | blank issue 비활성화, 설치 안내·일반 문의·비공개 보안 신고 3개 경로 |
| docs/README.md | 사용자·기여·행동·보안 안내 연결 및 공개 상태의 우선 문서 |
| GitHub About/topics | 승인한 description/homepage·12 topics |
| GitHub private vulnerability reporting | false → true |

## 본문 변경 정도 / 본문 무손실 여부

기존 bug/feature 폼을 한국어 사용자 안내로 재작성했다. 필수 환경·버전·재현 정보는 유지하고
모든 버그에서 upstream 공개 데모 비교를 강제하던 checkbox를 제거했다. 설치·OS 통합 문제의
비교 불필요 및 기밀 문서의 미비교를 허용하며, 관련 upstream 이슈도 선택 항목이다.
기존 task 폼과 PR template bytes는 변경하지 않았다. docs 인덱스는 기존 항목을 보존하며 연결만 추가했다.

## 검증 결과

```sh
ruby -ryaml <임시 스키마 점검 스크립트>
shasum -a 256 .github/ISSUE_TEMPLATE/task.yml .github/pull_request_template.md
gh api repos/postmelee/alhangeul-tauri
gh api repos/postmelee/alhangeul-tauri/private-vulnerability-reporting
git diff --check
```

- OK: YAML 파싱, name/description·field type·고유 ID·label·dropdown options·required boolean 점검.
  버그 10 fields, 개선 4 fields, chooser 3 contacts. upstream 비교에 required=true 없음.
- OK: 기존 GitHub labels `bug`, `enhancement` 존재. 내부 task/PR 양식 hash 보존:
  `3425ce2cbec9d585c5795da3212233761c28f431bccca38d726b9f4d4d6fe927` /
  `a103afe7d9c4183c1b83179b1a600114dffb7c388a5d02f80153fa4ca1048cc4`.
- OK: 다운로드·updates·feedback·최신 Release 공개 URL은 모두 HTTP 200.
- OK: 2026-09-30 20:22 KST GitHub API read-back:
  - description: `Windows와 Linux를 위한 오픈소스 HWP/HWPX 문서 편집기 · Open-source HWP/HWPX editor for Windows and Linux`
  - homepage: `https://postmelee.github.io/alhangeul-tauri/`
  - topics: `hwp`, `hwpx`, `hangul`, `document-editor`, `desktop-app`, `tauri`, `rust`, `typescript`, `windows`, `linux`, `rhwp`, `open-source`
  - private vulnerability reporting: `enabled=true`.
- OK: 변경 전 description(영어 viewer), homepage=null, topics=[], private reporting=false를 기록하고
  전후 대조했다. default_branch=devel, issues/projects/wiki/discussions, archived와 visibility는 불변이다.
- OK: `git diff --check`.

## 잔여 위험

- 양식·문서의 GitHub 기본 브랜치 인식은 PR 병합 후 확인한다. YAML 구조 점검을 실제 chooser 수용으로 대체하지 않는다.
- 비공개 제보 설정 활성화만 확인했으며 실제 취약점 제보나 이메일을 테스트로 발송하지 않았다.
- About/settings는 이미 원격에 반영되었으며 문서 PR의 병합 상태와 별개다.

## 다음 단계 영향

- 게시 브랜치 Markdown/폼 preview와 기존 빠른 계약을 검증한 후 최종 보고·PR을 생성한다.
- Community Standards 최종 UI 체크는 병합 후 확인할 잔여 수용 항목으로 인계한다.

## 승인 상태

작업지시자의 PR 생성까지 계속 진행 승인에 따라 결과를 기록하고 Stage 3으로 진행한다.
