# Task M010 #108 Stage 2 — 페이지 안 다운로드 선택·릴리즈 제목 표현

GitHub Issue: [#108](https://github.com/postmelee/alhangeul-tauri/issues/108)
구현계획서: [task_m010_108_impl.md](../plans/task_m010_108_impl.md)
Stage: 2
기록일: 2026-10-05 KST
상태: 구현·검증 완료 · Stage 3 승인 대기
작업 브랜치: `local/task108`
기준 커밋: `7d1c76a5` (Stage 1)

## 단계 목적

다운로드 버튼 아래에 설치 파일 선택 영역을 펼쳐 본문을 가리지 않게 한다. Windows 2종·Linux 4종의 형식·아키텍처·용도·업데이트 방식을 홈과 업데이트 페이지에서 같은 정의로 표시하고 릴리즈 제목의 굵기와 최신 배지를 정리한다.

작업지시자는 Stage 1 결과와 Stage 2 구현·브라우저 검증·단계 보고 요청을 확인한 뒤 같은 스레드에서 “진행해줘.”로 승인했다. PR 게시·병합·Pages 공개는 이 단계에서 수행하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `site/package-downloads.js` | 공통 6종 표시 정의, release/downloads 전체 정합성 검사, 안전한 DOM 행 생성·다운로드 활성화 |
| `site/script.js` | 패널 펼침·hash 진입, OS 선택/숨김/초점·키보드, 목록 조회, 별도 최신 배지 |
| `site/updates/index.html` | 버튼·aria-expanded/controls와 문서 흐름의 선택 영역; Windows/Linux radio·6종 행·noscript 안내 |
| `site/index.html` | 동일 helper 로딩·숨겨진 OS 패널 상태 반영; 전체 홈 배치 보존 |
| `site/styles.css` | 절대 위치 드롭다운 제거, 선택 영역·형식별 업데이트 설명·좁은 화면 줄바꿈; 업데이트 제목/항목/설명 굵기 한정 |
| `mydocs/_templates/website_release_note.html` | release-page 클래스·108-2 캐시 참조·공통 helper의 classic defer 순서 |
| `site/updates/v0.1.1.html` | 수정 중앙 템플릿으로 공식 재생성; 본문/버전 고정 6종 링크 보존 |
| `site/feedback/index.html` | 공유 자산의 cache key만 변경; 문의 레이아웃·문구·제목 굵기 보존 |
| `tests/pages-package-ui.test.mjs` | 6종 전체 활성화/실패·mode·명명·OS·키보드·hash·초점 계약 |
| `tests/fixtures/pages-ui-dom.mjs` | classic 두 script를 같은 순서로 실행하는 DOM/fetch fixture |
| 기존 `tests/pages{,-design,-showcase,-release-notes}.test.mjs` | 이전 드롭다운/3종 VM 검사를 새 동작으로 이관, 양쪽 최신 배지·출력 파일 증가 연결 |
| 계획서 2종·오늘할일·본 보고서 | 승인 기록과 단계 상태 갱신 |

신규 helper·테스트/fixture는 300 LOC 이내이며 함수를 역할별로 분리했다. private factory를 긴 함수로 유지하지 않고 classic script의 명시적 helper 정의와 packageDownloads 진입점을 사용한다. 외부 문자열은 href/textContent/aria-label 속성으로 전달하며 innerHTML을 사용하지 않는다.

다운로드 목록과 release.json은 각각 한 번 조회한다. 상태·버전·tag·정확한 6종 target/OS/architecture/format/updateMode·파일명/저장소/tag URL·양수 크기/hash·활성 inventory source/3종 URL·크기/hash를 모두 확인한 뒤 전체를 활성화한다. 하나라도 잘못되면 여섯 링크 모두 ‘다운로드 안내’와 GitHub Releases 경로를 유지한다.

Windows/Linux 수동 전환은 항상 가능하다. desktop Linux 문자열을 기본 선택에만 쓰며 판별 불가 OS와 Android의 Linux 문자열은 Windows 초기 선택을 유지한다. 지원 OS 추가 선언이 아니다.

## 본문 변경 정도 / 본문 무손실 여부

v0.1.1 안내의 변경은 body 클래스와 CSS/JS 캐시·helper 참조에 한정된다. 이를 정규화한 HTML과 Stage 1의 파일을 byte 비교해 같음을 확인했다. 공개일·다섯 본문 section·성능 수치·한계·6종 고정 다운로드는 보존했다. 중앙 GitHub body 템플릿, 승인 원문, 짧은 updater notes, release.json, updater feed는 변경하지 않았다.

| 대상 | SHA-256 | 결과 |
|---|---|---|
| `site/release.json` | `aa2bce9bf52a37a37c091b80be47e0146d5b15e6b338cabcc6e8b204cce07efd` | Stage 1 기준과 동일 |
| `docs/releases/v0.1.1.notes.json` | `2a927d64d364688660f96f6b620be6be189b8c2cfcb5a27ae1c16dbba6c158fb` | 동일 |
| 생성 `updater/stable.json` | `654efd7efc5f57de061d56743d30ab55c0f152d693df52c4022306261edbc638` | 동일, 2,295 bytes |
| 생성 `downloads.json` | `3a4e7b29cba59b24bfc9e8fdad3ab192472e4b7706fa383c754be7060ab05eb9` | 동일, 6종 |
| 생성 GitHub body | `3544f72d3e3aac3d4f7aab2955ef245bc3cb8cda30dfc5bde1ee889678e250b4` | 기존 승인 body와 동일 |
| 생성 v0.1.1 HTML | `b1b034edf27ad4d7dbe8a30271b0641fdb76d1bdc402bd66556ff9904f20906e` | UI 참조 변경만 반영 |

## 검증 결과

실행 명령:

```bash
node --test tests/pages.test.mjs tests/release-notes-generation.test.mjs tests/release-notes-integration.test.mjs
pnpm run generate:release-notes -- --version 0.1.1 --output-dir /tmp/task108-release-notes
pnpm run check:release-notes
pnpm run build:pages
pnpm run check:pages
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — Node 계약 검사: 150 pass·0 fail·0 skipped.
- OK — 공식 생성: release-body.md, website-release-note.html, updater-notes.txt. 웹 산출물을 source에 반영했다.
- OK — 릴리즈 검사: `Release notes check passed: 1 documents`.
- OK — 빌드: `Pages build completed: 18 source files, 2 root assets`.
- OK — Pages 검사: `Pages check passed: source=18, output=22`.
- OK — 제품 경계: `Product boundary check passed (804 files scanned).`.
- OK — git diff --check: 파일 끝 빈 줄을 정리한 후 출력 없음.
- OK — 별도 bytes 대조: 원문·release.json·feed·웹 다운로드 JSON·GitHub body·짧은 notes 보존, 버전 HTML의 UI 참조 외 내용 동일.

초기 검사에서 이전 드롭다운 기대값/공식 HTML 재생성 전 drift와 helper 함수 분리 중 외부 속성명 변경을 검출했다. 새 동작의 검사를 연결하고 생성물을 반영하며 외부 속성 계약을 복구한 뒤 같은 단계 검사 전체를 다시 실행해 통과했다.

Browser 스킬로 localhost 후보를 확인했다. 아래 결과는 DOM/computed style과 화면에서 관측했으며 native 제품 설치·GUI 수용 검증이 아니다.

| 관측 | 결과 |
|---|---|
| 1366×900 업데이트 목록 | 기본 접힘, 클릭 시 본문 흐름에서 펼침; Linux 4행·Windows 2행, 전체 6종 exact URL과 접근 가능한 이름 |
| 390×844 / 320×760 업데이트 목록 | document scrollWidth=390/320; 가로 잘림 없음, 형식/architecture·mode·다운로드 버튼 표시 |
| 본문 가림 여부 | 최종 desktop 패널 bottom=728.77, 다음 본문 top=770.77; 42px 간격으로 아래 배치 |
| 제목/항목/설명 | computed font-weight=600/500/400; 목록 최신 배지 1개 |
| 키보드 | Enter/Space 펼침·닫힘, Linux→ArrowRight Windows 전환, Tab은 보이는 Linux AppImage 링크로 이동; hidden 영역 초점 복귀는 단위 계약도 통과 |
| 기존 최신 다운로드 링크 | 버전 안내에서 ./#latest-download로 이동하면 선택 영역 펼침·aria-expanded=true |
| 원문 버전 혼합 | 로컬 output 목록만 다른 버전으로 바꿔 관측: ready=0, 6종 모두 GitHub Releases ‘다운로드 안내’; 이후 정확한 bytes 복구 |
| 홈 Linux 선택 | 320/390px 가로 잘림 없음·Linux 4행과 실제 Linux 화면 쌍 유지; 1366×768 copy bottom=664.55 < footer top=707 |
| v0.1.1 상세 | h1/h2 600, 5개 section·6종 고정 링크 유지; 390/320px 가로 잘림 없음 |
| 문의 320px | 제목 650 유지·두 문의 카드·복사 버튼·기존 이메일/Issue 경로; 메시지 전송 없음 |

출력 근거: `/tmp/task108-stage2-tests.log`, `/tmp/task108-stage2-browser-evidence.json`, `/tmp/task108-stage2-receipt.json`. 화면: `/tmp/task108-stage2-preview.png`, `/tmp/task108-stage2-mobile390.png`, `/tmp/task108-stage2-mobile320.png`. 최종 helper/hash는 receipt에 기록한다.

임시 viewport를 reset하고 테스트 탭만 닫았다. 사용자 소유의 공개 v0.1.1 탭은 유지했다. 설치 파일 다운로드·설치나 외부 이메일/Issue 제출은 실행하지 않았다.

## 잔여 위험

- 공개 사이트에는 아직 이 후보를 배포하지 않았다. 로컬 화면과 공개 화면의 결과를 구분한다.
- Linux 기본 OS 감지는 Node의 합성 desktop Linux UA 계약으로 확인했다. 로컬 브라우저에서는 판별 불가 환경 기본값과 수동 전환을 관측했다.
- JavaScript 미지원 안내 경로는 HTML 계약으로 확인했다. 브라우저 설정 변경으로 JavaScript를 끄지는 않았다.
- 새 선택 UI는 사이트의 일반 다운로드 목록을 사용한다. 실제 앱 자동 업데이트의 기존 수용 증거를 이번 웹 검사로 대체하지 않는다.

## 다음 단계 영향

- Stage 3에서 기존 PUBLIC_RELEASE_RUNBOOK의 생성 원문·6종 웹 목록/3종 updater 경계 규칙을 최소 보정한다.
- 통합 중립 검사와 공개 asset/API·최소 HTTP 대조를 수행하고 최종 보고서·PR 후보를 준비한다.
- 같은 source/hash의 브라우저 결과는 재사용하고, UI 입력이 바뀌면 영향받는 검사를 다시 실행한다.
- 최종 보고서·PR 게시·필수 CI·병합/Pages 공개는 기존 수행계획의 승인 경계를 유지한다.

## 승인 요청

- Stage 2 산출물·검증 결과를 승인하면 Stage 3 통합 검증·운영 문서 최소 보정·최종 보고서 작성까지 진행한다.
- 최종 보고서 승인 후 PR 게시, 실제 후보와 CI를 확인한 뒤 병합·Pages 공개를 별도 승인받는다.
