# Task M010 #102 Stage 1 보고서 — 릴리즈 원문 계약과 템플릿

GitHub Issue: [#102](https://github.com/postmelee/alhangeul-tauri/issues/102)
구현계획서: [task_m010_102_impl.md](../plans/task_m010_102_impl.md)
Stage: 1
상태: Stage 1 완료 / Stage 2 승인 대기
검증 시점: 2026-10-04 03:29 KST
구현계획·Stage 1 승인: 구현계획 보고 뒤 같은 스레드에서 작업지시자의 “진행해줘”.

## 단계 목적

승인한 릴리즈 작성 규격의 첫 단계로 사용자 원문·공개 metadata의 구조를 고정하고, 잘못된 입력을 거부하는 검사기와 GitHub/웹 작성 템플릿을 마련했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/releases/notes-fields.mjs` | 91 LOC, 정확한 key/type·문구·시각·URL·hash 검사 |
| `scripts/releases/notes-metadata.mjs` | 87 LOC, version/tag/source·rhwp·이전 공개·6종 asset와 complete inventory 대조 |
| `scripts/releases/notes-schema.mjs` | 102 LOC, 사용자 문단·변화 분류·참조 목록·Issue snapshot 검사 |
| `mydocs/_templates/release_notes.md` | 122 LOC, 사용법·원문 필드·고정 GitHub heading·생성 token·승인 기준 |
| `mydocs/_templates/website_release_note.html` | 89 LOC, 기존 site 구조의 짧은 사용자 안내·버전별/최신 다운로드 구분 |
| `tests/fixtures/release-note-fixtures.mjs` | 75 LOC, 명시적인 합성 문구/hash/서명 구조 fixture |
| `tests/release-notes.test.mjs` | 166 LOC, 정상 입력과 실제 게시 오류를 막는 80개 회귀 |
| #102 plans/orders | 실제 구현계획·Stage 1 승인 및 다음 stage 대기 상태 기록 |

모든 신규 파일은 300 LOC 이내다. 모듈은 필드/metadata/사용자 계약으로 역할을 나눴으며 각 함수는 권장 상한 내에 둔다. 추가 패키지·lockfile 변경은 없다.

### 확정한 입력 계약

- top level은 schemaVersion 1, metadata, content다. 알 수 없는 key와 필수 key 누락을 거부한다.
- draft metadata의 publishedAt은 null이고 published에는 실제 UTC ISO 시각이 필요하다. 현재와 이전 stable version/tag/source와 rhwp tag/commit을 기록한다.
- 6개 설치 형식의 exact filename/URL·크기·SHA-256을 검사하고 기존 inventory validator로 자동 3종과 version/source/URL/hash/크기를 대조한다.
- 사용자 문단과 4000자 이하의 별도 updaterSummary를 입력받는다. 빈 문구·placeholder·raw HTML·heading·code fence·제어문자와 잘못된 배열을 거부한다.
- rhwp의 initial/unchanged/updated는 이전 pin과 대조한다. 운영·문서 PR은 주요 앱 변화로 분류할 수 없다.
- PR/Issue의 실제 제목·canonical URL·근거 링크·확인 시각을 기록한다. CLOSED completed만 해결 목록에 허용하고 OPEN/not-planned·중복 해결/참고 항목을 거부한다.

## 본문 변경 정도 / 본문 무손실 여부

문서 출력 형식과 검사기는 신규 파일이다. 기존 제품/runtime·updater 검사·site/release.json 및 실제 v0.1.1 공개 body를 수정하지 않았다. 기존 metadata와 inventory의 구조 검사를 재사용했다. #97 브랜치의 작업도 보존했다.

템플릿은 기존 사이트 header/hero/actions/footer 구성과 Windows/Linux 정책을 따른다. 참고 저장소의 본문 구조를 참고했으며 Mac 전용 shell·Sparkle/Homebrew 구현은 차용하지 않았다. 출처 설명의 공식 문서 연결은 Stage 4에서 수행한다.

## 검증 결과

실행 명령:

```bash
node --test tests/release-notes.test.mjs
node --test tests/updater-release.test.mjs tests/release-metadata.test.mjs
git diff --check
```

결과:

- 신규 회귀 **80/80 pass, fail 0, skip 0**.
- 기존 updater·release metadata 검사 **31/31 pass, fail 0, skip 0**.
- diff 검사 통과. 새 단계 산출물·승인 상태 문서만 변경했음을 확인했다.
- 정상 원문을 deep freeze한 검사로 읽기 전용 동작을 확인했다. 최초 공개/초안, pin 변경, 빈 참조와 해결·참고 분류의 정상 경로를 포함한다.
- 누락·prerelease·version/tag/source/pin 오류, 같은/더 높은 이전 버전, target 혼동·중복, URL 추가 경로/인자·hash/size/inventory 불일치를 거부했다.
- 4000/4001자 경계, placeholder/HTML/heading/제어문자, sparse 배열, 공개일·Issue 상태·참조 중복·제목/URL/근거 오류를 검사했다.
- fingerprint 개행 회귀의 초기 기대 문구가 기존 validator의 `key fingerprint` 오류와 달라 1개 assertion이 실패했다. 입력은 정상 거부되었으며 기대 문구를 실제 오류에 맞춘 뒤 80개 전체가 통과했다. 검사를 skip하거나 완화하지 않았다.
- 이미 read-back한 #97의 실제 공개 v0.1.1 metadata를 임시 메모리 입력으로 대조해 설치본 **6종**과 complete inventory **3종**이 계약을 통과함을 확인했다. 문구는 합성 fixture이고 실제 v0.1.1 원문 적용 결과는 아니다.

로그는 `/tmp/task102-stage1-release-notes-tests.log`, `/tmp/task102-stage1-existing-tests.log`에 보존했다. Node 플랫폼 중립 검사만 수행했으며 native Rust/Tauri 검증·새 CI·게시를 실행하지 않았다.

## 잔여 위험

- 검사기는 구조·입력된 snapshot의 정합성을 확인한다. 원격 파일 bytes/서명, PR의 실제 포함, Issue의 의미상 해결, 원격 상태를 인증하는 도구가 아니다. 기존 gate와 원격 조회·본문 리뷰가 필요하다.
- 생성·token 치환·HTML escaping·source drift·Pages/CI 연결은 아직 구현하지 않았고 Stage 2 범위다.
- 실제 v0.1.1 사용자 문구·버전별 페이지 적용은 Stage 3 범위다. draft 입력의 페이지는 검토용으로 취급하고 공개 상태를 미리 표시하지 않아야 한다.
- manifest와 실제 production upgrade는 아직 0.1.1 수용 결과가 없다. PR #101은 규격 적용·재검증 전 보류한다.

## 다음 단계 영향

- Stage 2 renderer/CLI는 metadata/content 계약과 두 템플릿의 token을 사용한다. raw 사용자 문자열은 HTML로 직접 치환하지 않고 Markdown heading/표 등도 출력 문맥에 맞게 escape한다.
- 원문 없는 과거 fixture를 허용하되 원문이 있는 버전의 오류·drift는 실패시킨다. 현재 0.1.0 site와 0.1.1 예제를 같은 version으로 억지로 맞추지 않는다.
- 실제 공개 본문·feed 수정은 생성·검토한 exact 산출물로 승인받은 후 #97의 공개 순서에서 진행한다.

## 승인 요청

Stage 1 산출물과 검증 결과를 검토하고 Stage 2의 생성·drift 검사·Pages/CI 연결 진입 승인을 요청한다.
