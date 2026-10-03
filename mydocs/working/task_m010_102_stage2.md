# Task M010 #102 Stage 2 보고서 — 릴리즈 안내 생성과 Pages·CI 검사 연결

GitHub Issue: [#102](https://github.com/postmelee/alhangeul-tauri/issues/102)
구현계획서: [task_m010_102_impl.md](../plans/task_m010_102_impl.md)
Stage: 2
상태: Stage 2 완료 / Stage 3 승인 대기
검증 시점: 2026-10-04 04:15 KST
Stage 2 승인: Stage 1 완료 보고 뒤 같은 스레드에서 작업지시자의 “진행해줘”.

## 단계 목적

승인 원문에서 GitHub 전체 본문·짧은 웹 안내·updater 요약을 재현 가능하게 생성하고, 원문·템플릿·생성 HTML·같은 버전의 사이트 데이터가 달라지면 Pages와 CI에서 실패하도록 연결했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/releases/notes-render.mjs` | GitHub 필수 heading·token 계약, Markdown escaping, 설치 형식 6종·metadata·PR/Issue 출력 |
| `scripts/releases/website-render.mjs` | 기존 사이트 구조의 HTML 생성, 문구·attribute escaping, 실제 UTC 공개 시각의 KST 표시, draft 구분 |
| `scripts/releases/notes-files.mjs` | 명시한 원문·템플릿 읽기, root 정규화, version 파일명·repository 내부 경로·symlink 검사 |
| `scripts/releases/notes-cli.mjs` | check/generate CLI, version 대조, 새 output directory에만 3종 파일 생성, 기존 파일 덮어쓰기 거부 |
| `scripts/releases/notes-check.mjs` | schema/metadata·template 검사, source/output HTML drift·orphan·draft 페이지·동일 버전 데이터 정합성 검사 |
| `scripts/build-pages.mjs`, `scripts/check-pages.mjs`, `scripts/pages/site-files.mjs` | output 삭제 전에 source 검증, output drift 검증, root asset 참조 정규화의 공용 함수화 |
| `package.json`, `.github/workflows/alhangeul-ci-fast.yml` | pnpm 명령 3종과 test:automation 연결, Linux Pages 검사·Windows Node 검사 연결 |
| `tests/release-notes-generation.test.mjs`, `tests/release-notes-integration.test.mjs`, `tests/fixtures/release-note-files.mjs` | 재현성·escaping·날짜·token·경로·drift·Pages/feed 기존 상태 회귀 |
| `tests/ci-pr-acceptance.test.mjs`, `tests/release-notes.test.mjs` | fast CI의 무조건 실행·실패 전파 계약, 제품 경계에 맞춘 기존 음성 테스트 정리 |
| #102 plans/orders | 실제 Stage 2 승인·완료 및 Stage 3 대기 기록 |

신규 모듈과 테스트 파일은 모두 300 LOC 이내이며 함수는 50 LOC 이내다. 기존 `tests/pages.test.mjs`의 374 LOC를 늘리지 않고 별도 integration 파일에서 실제 build/check API를 검증했다. 새 패키지와 lockfile 변경은 없다.

## 본문 변경 정도 / 본문 무손실 여부

제품 runtime, upstream pin/gitlink, 설치본, 실제 GitHub Release body, site/release.json을 변경하지 않았다. 생성 명령은 검토용 `release-body.md`, `website-release-note.html`, `updater-notes.txt`만 새 directory에 저장한다. 원문이나 실제 사이트 페이지를 자동으로 덮어쓰지 않으며 원격 mutation도 실행하지 않는다.

원문 없는 기존 unreleased/published fixture를 유지한다. 새 published 원문에는 정확한 버전 페이지가 필요하고, source/output의 페이지 drift 및 원문 없는 버전 페이지를 거부한다. draft 원문은 보관·생성할 수 있지만 공개 tree의 draft 페이지는 거부한다. 원문 버전과 live release 버전이 다르면 live 데이터를 자동 변경하지 않는다.

## 검증 결과

승인된 실행 명령:

```bash
pnpm run test:release-notes
pnpm run check:release-notes
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs tests/actions-workflows.test.mjs tests/ci-pr-acceptance.test.mjs
git diff --check
```

추가 기본·통합 검증:

```bash
pnpm run test:automation
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
```

결과:

- 릴리즈 회귀 **124/124 pass, fail 0, skip 0**. Stage 1의 80개와 Stage 2의 44개를 포함한다.
- Pages·Actions·PR acceptance 회귀 **75/75 pass, fail 0, skip 0**.
- 전체 Node 자동화 **1175/1175 pass, fail 0, skip 0**. 위 릴리즈·Pages 검사를 포함한 집계이며 합산하지 않는다.
- 제품 경계 **770 files scanned / passed**, upstream **39/39 pass**, Studio **39 files / 251 tests pass**, Studio 웹 빌드 성공.
- 원문 검사 **0 documents**: 현재 저장소에 실제 버전 notes.json이 아직 없으며 템플릿 자체는 검사했다. 실제 v0.1.1 적용 검증으로 표시하지 않는다.
- 기존 Pages source **16 files**, output **19 files** 검사 통과. manifest 생성 정책을 보존했다.
- 동일 입력의 2회 생성 bytes 일치, LF 출력, CRLF 템플릿 정규화, 공백 경로와 Windows 경로 인자 계약을 확인했다.
- 6종 exact tag 다운로드, actual publication UTC→KST, draft 미게시, inline Markdown/HTML attribute escaping, template unknown/missing/malformed token·heading·marker 오류를 검사했다.
- 원문·template·source 페이지 drift가 기존 output을 삭제하기 전에 실패했고 output만 변조한 경우도 실패했다. 짧은 notes·공개일·source·inventory가 같은 버전의 release.json과 어긋나면 거부했다.
- source/template parent/output/output parent/explicit input symlink와 기존 output 덮어쓰기를 거부했다. 실제 회귀에서 root의 호스트 alias가 symlink 검사를 우회한 문제를 확인해 canonical root에 내부 경로를 대응시키도록 수정했다.
- Windows CI는 원문 검사와 신규 Node 테스트를 별도 step으로 두어 첫 명령의 실패가 다음 명령의 성공으로 가려지지 않게 했다. Linux는 규격·Pages build/check 및 test:automation을 실행한다.
- 첫 전체 검사 실패 5개는 새 worktree의 submodule 미초기화로 고정 fixture가 없었던 원인이었다. 초기 clone 중단 후 남은 stale lock·부분 checkout은 확인·보존 후 복구했으며, 자동 승인 검토의 pin 변경 오해도 parent gitlink·lock 근거로 해소했다. 최종 pin은 `v0.8.6` / `f1f9c6ae58344ee9368996d3543f76b9345cf227`이고 submodule status는 clean이다. 부분 checkout 임시 사본은 복구 후 정리했다.
- 제품 경계 검사가 Stage 1/2 음성 테스트 안의 금지 배포 형식 문자열도 지적했다. 해당 문자열을 제거했으며 실제 6종 지원 형식·출력 검사는 유지했다. 검사를 skip하거나 allowlist로 완화하지 않았다.
- Studio 빌드의 chunk size/dynamic import 경고는 남아 있다. 이 단계는 bundling 구조를 변경하지 않았다.

로그는 `/tmp/task102-stage2-*-tests.log`, `*-check.log`, `*-build.log`, `*-upstream.log`, `*-boundary.log`에 보존했다. macOS 호스트에서는 Node·Studio 웹 검증만 실행했으며 Rust/Tauri native build/test는 실행하지 않았다.

## 잔여 위험

- 새 Linux/Windows CI의 실제 runner 실행은 아직 수행하지 않았다. 전체 stage 완료 후 게시할 exact PR SHA의 required check에서 검증한다. 로컬의 Windows 경로 인자·개행 검사를 Windows 실행 수용으로 표시하지 않는다.
- schema와 snapshot·inventory 대조는 원격 파일 bytes/서명·Issue 해결·게시 승인의 인증이 아니다. 기존 공개 gate와 실제 원격 조회·검토가 필요하다.
- 실제 v0.1.1 문구·웹 안내·목록 연결·브라우저 화면 검토는 Stage 3에 남아 있다. GitHub body와 PR #101의 미게시 적용안도 그 원문에서 생성해야 한다.
- production updater feed와 실제 NSIS/MSI/AppImage upgrade 수용은 #97의 후속 공개 절차다. 이 단계에서 완료했다고 기록하지 않는다.

## 다음 단계 영향

- Stage 3에서 실제 v0.1.1 공개 metadata·PR/Issue snapshot으로 notes.json을 작성하고 페이지를 생성한다. 목록·latest 표시는 live release.json 기준으로 판단하며 현재보다 높은 파일명을 근거로 삼지 않는다.
- 새 버전 페이지 추가 후 제품 경계의 기존 family link 규칙과 fixture 파일 수·원문 대응을 함께 정합화한다. 기존 Pages 상태와 manifest 정책을 유지해야 한다.
- #102 merge 뒤 #97이 merge 방식으로 최신 devel을 반영하고 PR #101의 새 exact source를 재검증한다. 실제 Release body·Pages/feed 공개 승인은 #97 gate에서 처리한다.

## 승인 요청

Stage 2 산출물과 검증 결과를 검토하고 Stage 3의 실제 v0.1.1 원문·웹 안내·PR #101 적용안 준비 및 브라우저 화면 수용 진입 승인을 요청한다.
