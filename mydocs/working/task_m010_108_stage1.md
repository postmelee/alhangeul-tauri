# Task M010 #108 Stage 1 — 공개 설치 파일 목록 생성·데이터 경계

GitHub Issue: [#108](https://github.com/postmelee/alhangeul-tauri/issues/108)
구현계획서: [task_m010_108_impl.md](../plans/task_m010_108_impl.md)
Stage: 1
기록일: 2026-10-05 KST
상태: 구현·검증 완료 · Stage 2 승인 대기
작업 브랜치: `local/task108`
기준 커밋: `fb5127f0` (구현계획서 작성·수행계획 승인 기록)

## 단계 목적

공개된 설치 파일 6종을 릴리즈 원문에서 읽어 웹용 목록으로 생성한다. 기존 signed updater 3종과 일반 다운로드 목록의 경계를 유지하고, 현재 원문 누락·불일치·출력 변조가 있으면 공개 준비를 실패시킨다.

작업지시자가 구현계획서와 Stage 1 구현·검증·단계 보고 요청을 확인한 뒤 같은 스레드에서 “진행해줘.”로 승인했다. 이 단계에는 UI 수정·PR 게시·병합·Pages 배포를 포함하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/pages/package-downloads.mjs` | 기존 release/notes validator와 소유 경로 검사 재사용; 6종 목록 생성·정확한 output bytes 비교 |
| `scripts/build-pages.mjs` | 출력 삭제 전 원문 검증, 목록 생성, source/output 부모 경로 검사; source 복사 루프를 함수로 분리 |
| `scripts/check-pages.mjs` | source 원문 필수 계약, output 다운로드 목록 정확한 bytes 검사 |
| `scripts/pages/site-files.mjs` | source의 수동 downloads.json 금지; 검증 output에서만 허용 |
| `tests/pages-package-downloads.test.mjs` | 6종·다음 버전·미공개·원문/출력 실패·updater 보존·소유 경로 계약 |
| `tests/fixtures/pages-package-fixtures.mjs` | published 상태에 유효한 6종 원문·템플릿·생성 HTML을 설치하는 helper |
| `tests/fixtures/pages-release-fixtures.mjs` | 원문 필수 fixture와 명시적 includeNotes=false 음성 경로; helper 동적 import로 순환 초기화 회피 |
| `tests/fixtures/release-note-fixtures.mjs` | 버전별 fixture 구성·원문 inventory 복제; 과거 최초 릴리즈 상태 구성 |
| `tests/fixtures/release-note-files.mjs` | 원문 전용 fixture의 자동 원문 생성을 꺼 중복 구성 방지 |
| `tests/pages.test.mjs` | 신규 테스트를 자동화 진입점에 연결, 생성 파일·원문 페이지 증가 반영 |
| `tests/release-notes-integration.test.mjs` | 공개 상태의 원문 필수 계약과 과거/다음 버전 공존 사례 반영 |
| `mydocs/plans/task_m010_108{,_impl}.md` | 구현계획 승인과 Stage 1 완료·다음 승인 상태 기록 |
| `mydocs/orders/20261005.md` | #108 진행중·Stage 1 완료와 Stage 2 승인 대기 |
| `_site/downloads.json` | 6종 공개 목록 2,737 bytes; 빌드 출력만 생성하며 커밋하지 않음 |

목록은 schemaVersion/status/version/tag/sourceSha/packages를 포함한다. package의 target/platform/architecture/format/updateMode와 원문 name/size/sha256/url을 출력한다. Windows x64 NSIS·MSI와 Linux x64 AppImage만 updateMode=app이고 Linux x64 DEB·RPM, Linux arm64 DEB는 manual이다. 미공개 상태는 식별자 null·빈 packages로 출력한다.

manifestPublished=false에서도 공개 원문은 필수이며 원문의 검증된 sourceSha를 사용한다. 활성 updater에서는 inventory 전체를 원문과 비교해 source·keyFingerprint·서명·크기·hash drift를 거부한다. 비활성 inventory=null 기존 계약은 유지한다.

신규 helper·테스트 파일은 300 LOC 이내이며 생성기 핵심 함수도 50 LOC 이내이다. 기존 큰 테스트 파일에는 진입점과 계약 변경만 반영했다.

## 본문 변경 정도 / 본문 무손실 여부

제품 코드·site UI·릴리즈 원문·site/release.json·GitHub body·웹 안내 템플릿은 변경하지 않았다. 기존 feed 생성 함수를 그대로 호출하며 생성 피드는 변경 전 기준과 같은 bytes/hash이다. signature fixture는 구조 검사만 수행하며 실제 서명 성공의 증거로 표현하지 않는다.

| 대상 | SHA-256 | 결과 |
|---|---|---|
| `site/release.json` | `aa2bce9bf52a37a37c091b80be47e0146d5b15e6b338cabcc6e8b204cce07efd` | 변경 전·후 동일 |
| `docs/releases/v0.1.1.notes.json` | `2a927d64d364688660f96f6b620be6be189b8c2cfcb5a27ae1c16dbba6c158fb` | 변경 전·후 동일 |
| 생성 `updater/stable.json` | `654efd7efc5f57de061d56743d30ab55c0f152d693df52c4022306261edbc638` | 변경 전·후 동일, 2,295 bytes |
| 생성 `downloads.json` | `3a4e7b29cba59b24bfc9e8fdad3ab192472e4b7706fa383c754be7060ab05eb9` | 신규, 6종·2,737 bytes |

## 검증 결과

실행 명령:

```bash
node --test tests/pages-package-downloads.test.mjs tests/pages.test.mjs tests/release-notes-integration.test.mjs
pnpm run build:pages
pnpm run check:pages
pnpm run check:release-notes
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — 단계 테스트 138회 실행·138 pass·0 fail·0 skipped. 지정 명령과 pages.test.mjs import에 따라 신규 파일 테스트는 두 진입점에서 실행되므로 138을 서로 다른 테스트 수로 해석하지 않는다.
- OK — build:pages: `Pages build completed: 17 source files, 2 root assets`.
- OK — check:pages: `Pages check passed: source=17, output=21`. 기존 output 20개에 생성 목록 1개가 추가된다.
- OK — check:release-notes: `Release notes check passed: 1 documents`.
- OK — check:product-boundary: `Product boundary check passed (779 files scanned).`.
- OK — git diff --check: 출력 없음.
- OK — 수정 fixture의 영향을 확인하는 추가 `node --test tests/release-notes.test.mjs tests/release-notes-generation.test.mjs`: 101 pass·0 fail·0 skipped.
- OK — 원문/출력 bytes 대조: 공개 6종·app 3종·manual 3종, v0.1.1 식별자와 기존 feed hash 유지.

초기 테스트 실패는 fixture가 release와 notes의 inventory 객체를 공유하던 문제와 과거 최초 릴리즈의 rhwpChanges 상태 구성에서 발생했다. 원문 inventory를 복제하고 최초 상태를 맞춘 뒤 같은 단계 검사를 다시 실행해 모두 통과했다. 실패를 통과 근거로 포함하지 않는다.

필수 사례: 원문 없는 published(false/true), draft/다른 날짜/요약/버전/URL, manual 패키지 누락·잘못된 크기/hash, 활성 inventory source/key/서명/크기/hash 불일치, source JSON 충돌, output 변조/누락, notes 파일·부모/output symlink, output 부모 symlink의 외부 삭제 방지. 빌드 실패 전에 기존 output이 보존되는지도 검사했다.

출력 보존: `/tmp/task108-stage1-tests.log`, `/tmp/task108-stage1-notes-tests.log`, `/tmp/task108-stage1-baseline.json`, `/tmp/task108-stage1-receipt.json`. 영구 근거는 위 명령·요약·hash에 기록한다.

## 잔여 위험

- 현재 화면은 기존 UI이며 6종 목록 조회·선택 영역·제목 굵기는 Stage 2에서 적용한다.
- 공개 asset/API·HTTP 대조와 PR 필수 CI는 Stage 3 및 공개 승인 후의 검증 대상이다.
- Mac에서 중립 Node/Pages 검사만 수행했다. Windows/Linux 실제 설치·업데이트 수용을 이번 결과로 재증명하지 않는다.
- Windows에서 symlink 권한이 없는 환경의 해당 음성 테스트는 명시적으로 skip할 수 있다. 이번 로컬 검사에는 skip이 없었다.

## 다음 단계 영향

- UI는 downloads.json과 release.json의 상태·버전·tag·필수 6종 필드를 검증하고 하나라도 불일치하면 직접 다운로드를 활성화하지 않는다.
- 홈·업데이트 페이지가 공유할 classic defer helper와 6종 설명을 추가한다. signed updater JSON을 6종으로 확장하지 않는다.
- 업데이트 목록/상세 제목 굵기·별도 최신 배지, 중앙 템플릿·생성 HTML·cache key를 함께 반영한다.
- 다음 published 릴리즈는 현재 버전의 유효 원문을 준비해야 Pages 빌드가 통과한다. Stage 3의 기존 runbook에 이를 반영한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 선택 UI·제목 표현 구현, 브라우저 검증, 단계 보고·커밋까지 진행한다.
- PR 게시·병합·Pages 공개는 이후 실제 후보를 제시하고 승인받는다.
