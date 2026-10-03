# Task M010 #102 최종 보고서 — 릴리즈 본문·웹 안내 작성 규격

GitHub Issue: [#102](https://github.com/postmelee/alhangeul-tauri/issues/102)
마일스톤: M010
작성일: 2026-10-04 KST
상태: 완료 / PR #103 원격 CI 통과·merge·이슈 close / 공개 적용은 #97 인계
최종 보고·PR 게시 승인: Stage 4 완료 보고 후 같은 스레드에서 작업지시자의 “진행해줘”.

## 작업 요약

- 대상 이슈: #102, 마일스톤 M010, 단계 수 4.
- 작업 목적: 이후 릴리즈에서 같은 사용자 원문과 검증된 metadata를 사용해 GitHub 본문·웹 안내·짧은 updater 요약을 작성하고 drift를 검사한다.
- `docs/releases/v<version>.notes.json`을 원문으로 고정하고 중앙 템플릿·Node 생성/검사 도구·pnpm/Pages/Windows/Linux 빠른 CI 연결을 마련했다.
- 공개 v0.1.1의 실제 앱 변화·rhwp pin·다운로드·PR/Issue 근거를 첫 예제에 적용하고 버전별 웹 안내와 PR #101의 미게시 적용안을 수용했다.
- 이 보고서의 완료는 #102 구현 범위다. 기존 v0.1.1 body 수정·PR #101 merge·Pages/manifest 배포·실제 v0.1.0 → v0.1.1 upgrade는 #97에서 남아 있다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `scripts/releases/` 8개 모듈 | schema·metadata·문구·template·renderer·owned path·CLI·drift | 플랫폼 중립 릴리즈 작성/검사 |
| `mydocs/_templates/release_notes.md`, `website_release_note.html` | GitHub 16개 heading·웹 5개 구역·실제 사용법 | 사용자 안내 형식 |
| `docs/releases/v0.1.1.notes.json`, `v0.1.1.md` | 공개 metadata·성능 조건·6개 파일·3개 updater·실제 공개/미실행 상태 | 첫 적용 예제·공식 공개 기록 |
| `site/updates/v0.1.1.html`, index/script/styles 및 공통 HTML cache | 버전 안내·현재 release data에 따른 최신 표시·읽을 수 있는 링크 | Pages UI |
| `scripts/build-pages.mjs`, `check-pages.mjs`, `pages/site-files.mjs` | source 삭제 전 drift 검사·output 검증·asset 참조 공용화 | 기존 Pages 상태/manifest 계약 |
| `package.json`, `.github/workflows/alhangeul-ci-fast.yml` | pnpm 명령 3종·자동화·Linux Pages·Windows Node 계약 | 작성 도구·빠른 CI |
| 릴리즈 규격 테스트/fixture·Pages·제품 경계·CI 회귀 | 오류·주입·재현성·경로·최신 표시·실패 전파 | 새 규격과 기존 공개 계약 |
| `scripts/check-product-boundary.mjs` | stable 버전 안내의 기존 family 링크 2줄만 허용 | Windows/Linux 제품 지원 경계 유지 |
| 기존 runbook/checklist·릴리즈/문서 index·README·provenance·양식 index/record | 원문 작성→생성/검사→exact 승인→게시→read-back | 반복 운영·출처·상태 정합성 |
| #102 계획·단계·최종 보고·오늘할일 | 승인·구현·검증·인계 기록 | Task 추적; #97 행 보존 |

runtime·installer·updater key/endpoint·rhwp pin/gitlink·공개 asset/tag·`site/release.json`은 변경하지 않았다. root checkout과 #97 분리 작업 공간의 변경은 보존했다. pnpm 외 패키지 관리자·새 lockfile/의존성을 추가하지 않았다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 본문·웹 양식과 index/record | `mydocs/_templates/` | 동일 | OK | 기존 중앙 양식 정책 |
| v0.1.1 원문·공식 기록·index | `docs/releases/` | 동일 | OK | 승인한 공식 릴리즈 루트 |
| 버전별 안내·목록 | `site/updates/` | 동일 | OK | 기존 Pages source |
| runbook·checklist | 기존 `docs/operations/` | 동일 | OK | 제품 공개 기준 소유 위치 유지 |
| 참조 출처 | 기존 `docs/architecture/PROVENANCE.md` | 동일 | OK | 고정 원본·독립 구현·MIT 판단 |
| 제품/문서 진입점 | 기존 README·docs/README | 동일 | OK | 실제 GitHub/사이트 상태 반영 |
| 작업 산출물 | `mydocs/plans/`, `working/`, `report/`, `orders/` | 동일 | OK | 수행/구현계획과 stage diff |

제품 공개 정책을 `mydocs/manual/`에 추가하지 않았다. 기존 309줄 runbook은 Gate 0~7과 복구 흐름을 보존해 338줄로 연결했으며 이유를 구현계획에 기록했다. 신규 구현 모듈은 각각 108줄 이하, 신규 fixture·회귀 파일도 300줄 이하로 분리했다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 사용자 안내 생성 원문 | 반복 가능한 notes 계약 없음 | schemaVersion 1, v0.1.1 원문 1개 |
| 안내 중앙 템플릿 | 본문/웹 양식 없음 | 2종 |
| 생성·검사 pnpm 진입 | 없음 | generate/check/test 3종 |
| 동일 원문 생성 결과 | 수동 작성 | GitHub body·HTML·짧은 notes 3개 |
| 릴리즈 규격 전용 회귀 | 없음 | 124개 통과 |
| 버전별 웹 안내 | 없음 | v0.1.1 1개, 목록과 최신 표시 연결 |
| Pages source/output | 16/19개 | 17/20개 |
| 원격/제품 변경 | 기존 v0.1.1 GitHub·0.1.0 feed | 공개 body/asset·feed·runtime bytes 유지 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| typed 원문·metadata·6개 설치/3개 updater 계약 | OK — 필수 key·stable version/tag/source/pin·asset/inventory·references 상태 검사 |
| 재현 생성·escaping·path·drift | OK — 124/124 회귀, 같은 입력 bytes 일치·변조 실패·symlink/기존 output 거부 |
| 기존 Pages/manifest 상태 보존 | OK — 17 source/20 output; unreleased/published true/false fixture 및 자동/수동 형식 계약 유지 |
| 전체 Node 자동화 | OK — Stage 4에서 1184/1184, 실패·skip 0; 개별 규격/Pages 검사를 포함하므로 합산하지 않음 |
| 플랫폼 중립 기본 검사 | OK — 제품 경계 775개 파일, upstream 39/39, Studio 39개 파일/251개 테스트·web build |
| 공개 v0.1.1 metadata·변경 분류 | OK — source 96e89e90, 실제 공개일·11개 asset identity, 13개 merged PR·#97 OPEN snapshot 대조 |
| 공개 bytes 재사용 근거 | OK — 보존 public bytes 재해시·작은 파일 5개 새 read-back·checksum 10행·Minisign 3종 일치; 이번 단계의 새 설치 수용 아님 |
| 웹 수용 | OK — 1366px/390px/320px, 고정 다운로드·최신 메뉴·공개일·링크·0.1.0/후보0.1.1 상태·가로 넘침/console 오류 없음 |
| 문서·실행 예제 | OK — 공식 문서/양식 9개·로컬 링크/앵커 85개·Bash syntax 17개; 생성 예제 3개 bytes 일치 |
| 원격 CI | OK — [PR #103 run 37152620380](https://github.com/postmelee/alhangeul-tauri/actions/runs/37152620380) Windows/Linux와 Alhangeul PR required 성공; head 23263b60 / merge candidate 167b2b42 |

Stage 4의 필수 로컬 통합 명령을 모두 실행했다. 최종 보고 단계는 문서 상태만 변경하므로 같은 code/template/site/pin bytes의 결과를 재사용한다. 최종 커밋 전 diff/본문 섹션·링크·보존 feed·submodule을 추가 확인한다. 새 원격 CI 실패를 기존 로컬 성공으로 상쇄하지 않는다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_102_stage1.md) ([88c9650b](https://github.com/postmelee/alhangeul-tauri/commit/88c9650b9b0070ad08815a7e04cc32a4ae3ac36e)): 원문 계약·양식, 신규 80개 및 기존 31개 통과.
- [Stage 2](../working/task_m010_102_stage2.md): 생성·drift·CI 연결, 규격 124개·전체 자동화 1175개 통과.
- [Stage 3](../working/task_m010_102_stage3.md): 실제 v0.1.1·공식 기록·웹 화면, 자동화 1184개·Studio 251개·공개 자료 대조.
- [Stage 4](../working/task_m010_102_stage4.md): 운영 문서·출처·#97 인계, 자동화 1184개·upstream 39개·Studio 251개·문서 링크/예제 통과.

Stage 3 screenshot은 검토용 `/tmp/task102-stage3-screens/`에 보존했다. 임시 폴더를 GitHub 공개 artifact나 영구 증거로 취급하지 않는다. 고정 HTML·원문·test와 각 보고서의 확인 조건을 검토 근거로 사용한다.

### 게시 전 검토 자료

- 사용자 원문: [v0.1.1.notes.json](../../docs/releases/v0.1.1.notes.json), 기술 기록: [v0.1.1.md](../../docs/releases/v0.1.1.md).
- body SHA-256: `43b9a7b31f54ad5fb17cd4902801532d52ff3ecb49f8cc2e200f910ae387b8f7`.
- short notes 파일 SHA-256: `74457f7c870670f1da49fccd71989fcf7941d221bb22a334cb2ac81edfdaafa1`.
- PR #101 후보 manifest SHA-256: `62fae230339497b132be013ec91df7cd83b710b69c9de4f56ffff1c407463728`. 입력 변경 시 재생성해야 하며 예전 PR #101 hash를 재사용하지 않는다.
- 출력은 `/tmp/task102-v011-preview/`, 후보 root는 `/tmp/task102-pr101-preview/`다. 이후 새 directory에서 원문/템플릿으로 동일 bytes를 재생성할 수 있다.

## 잔여 위험과 후속 작업

### 잔여 위험

- PR #103 fast/required는 통과했다. 이 범위는 전체 native/GUI/installer 수용을 뜻하지 않는다.
- 기존 v0.1.1 body는 아직 새 규격으로 수정하지 않았다. 현재 live feed는 0.1.0, PR #101은 OPEN이다.
- production NSIS/MSI/AppImage의 실제 v0.1.0 → v0.1.1 upgrade는 미실행이다. 기존 설치 수용·same-version·시험 endpoint 성공을 대체 근거로 쓰지 않는다.
- Authenticode 미서명·NSIS raw 썸네일 실패·강제 MSI 재부팅 후 미검증·실제 Wayland/GPU/프린터 환경 등의 제품 한계는 공식 기록에 유지한다.
- 구조 validator는 의미상 Issue 해결이나 서명 신뢰·실제 공개 승인을 인증하지 않는다. 실제 조회/리뷰와 기존 공개 gate가 계속 필요하다.

### 후속 작업 후보

새 이슈 생성 없이 기존 [#97](https://github.com/postmelee/alhangeul-tauri/issues/97)과 [PR #101](https://github.com/postmelee/alhangeul-tauri/pull/101)에서 이어간다.

1. #102 CI·리뷰·merge 승인 후 devel에 일반 merge commit으로 통합한다. #97은 최신 devel을 merge하고 실제 공통 merge SHA를 기록한다.
2. PR #101의 short notes를 원문의 updaterSummary 그대로 적용하고 새 head의 원문/Pages/manifest·required checks를 확인한다.
3. 검토한 exact body 수정·PR #101 merge·exact Pages SHA 공개 승인을 순서대로 받아 게시하고 body/화면/feed를 read-back한다.
4. #97의 실제 upgrade 계획 승인 후 NSIS→NSIS, MSI→MSI, AppImage→AppImage를 각각 검증한다. 동의·dirty 보호·서명·설치/재시작·version·공개 문서 재열기 결과로 원문/기록을 갱신·재생성한다.
5. 승인 후 merge 확인 때 이슈 close와 불필요 부산물 정리·devel 복귀를 수행한다. #97에 필요한 검토 자료는 인계 전에 지우지 않는다.

## 작업지시자 승인 요청

PR #103 exact CI 보고 뒤 작업지시자의 “진행해줘”로 일반 merge를 승인받았다. 2026-10-03T20:55:47Z merge `73faf113e8a75cd847e10b4aa3e7fc7e3cb66f41`, #102 close는 2026-10-03T20:58:10Z다. head `23263b60b6ef03955ce53d889814f54d16ad3ef6`와 checkout/workflow merge candidate `167b2b4208d80f4f281eeb4c81bf1a4f2b12d4bd`의 tree가 같고 GitHub Actions App 15368의 required check를 확인했다. 원격 publish/task102를 삭제하고 #97에 통합했다. 현재 승인은 Release body 수정·PR #101 merge·Pages 배포·actual upgrade를 대신하지 않는다.
