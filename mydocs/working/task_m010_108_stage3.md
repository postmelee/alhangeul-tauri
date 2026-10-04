# Task M010 #108 Stage 3 — 통합 검증·공개 인계 준비

GitHub Issue: [#108](https://github.com/postmelee/alhangeul-tauri/issues/108)
구현계획서: [task_m010_108_impl.md](../plans/task_m010_108_impl.md)
Stage: 3
기록일: 2026-10-05 KST
상태: 통합 검증 완료 · 최종 보고서 승인 대기
작업 브랜치: `local/task108`
기준 커밋: `c147427a0e8037948195f3ff31ef5161cfe3b819` (Stage 2)
기준/조회 devel: `b925faa31251114e7064e76209c5640147dd013e`

## 단계 목적

사용자가 로컬 UI를 확인한 후보의 통합 검증·공개 링크 대조를 완료하고 운영 문서와 최종 보고를 준비한다. 작업지시자가 로컬 서버 확인 후 “확인했어. 다음을 진행해줘.”라고 지시해 이 단계 진행을 승인했다. 원격 push·PR 게시·병합·Pages 공개는 후속 승인 대상이다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/operations/PUBLIC_RELEASE_RUNBOOK.md` | 기존 Gate 5/6에 원문 기반 downloads.json 생성 순서·6종 웹/3종 updater 경계·불일치 거부·새 공개 UI 확인 추가 |
| `mydocs/plans/task_m010_108{,_impl}.md` | Stage 3 승인과 완료 상태 기록 |
| `mydocs/working/task_m010_108_stage3.md` | 본 단계 결과·공개 파일 대조·증거 재사용 경계 |
| `mydocs/report/task_m010_108_report.md` | 전체 수용 결과·남은 공개 절차·승인 요청 |
| `mydocs/orders/20261005.md` | 구현/로컬 검증 완료 시각과 PR 승인 대기 표시 |

PR 본문은 최종 커밋의 exact SHA 링크로 `/tmp/task108-pr-body.md`에 준비한다. 임시 로그·receipt는 아래 핵심 결과를 보고서로 옮기며 영구 다운로드 증거로 간주하지 않는다. 로컬 미리보기 서버 `http://127.0.0.1:8108/updates/#latest-download`는 사용자 테스트용으로 유지했다.

## 본문 변경 정도 / 본문 무손실 여부

공식 문서 위치는 승인된 기존 runbook이다. 기존 Gate 절차와 서명·공개 승인 정책을 보존하며 Pages 관련 문장만 최소 보정했다. 이 단계는 사이트·템플릿·제품 코드·릴리즈 원문·업데이트 설정을 수정하지 않았다.

기준 devel과 제품 version/lockfile/rhwp pin·gitlink·updater 설정·release.json·v0.1.1 원문의 bytes가 같다. 초기화한 submodule은 `f1f9c6ae58344ee9368996d3543f76b9345cf227` (`v0.8.6`)이며 작업트리는 clean이다. source 수정이나 upstream 갱신을 수행하지 않았다.

## 검증 결과

실행 환경: Node `v24.15.0`, pnpm `10.33.0`. 아래는 플랫폼 중립 Node/Studio 웹 검사이며 호스트 OS의 native 제품 수용 검사가 아니다.

```bash
pnpm install --frozen-lockfile
pnpm run test:automation
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run check:release-notes
pnpm run build:pages
pnpm run check:pages
git diff --check
git status --short
```

| 검사 | 결과 |
|---|---|
| 자동화 계약 | OK — 1,308 pass / 0 fail / 0 skipped |
| upstream 계약 | OK — 39 pass / 0 fail / 0 skipped |
| Studio Vitest | OK — 39 test files / 251 tests passed |
| Studio TypeScript/Vite | OK — `tsc && vite build`, 294 modules transformed, built in 882ms |
| 제품 경계 | OK — 804 files scanned |
| 릴리즈 원문·공식 템플릿 | OK — 1 documents |
| Pages build/check | OK — 18 source files / 2 root assets; source=18, output=22 |
| diff 공백 | OK — git diff --check 출력 없음 |
| 사용자 기존 변경 보존 | OK — 주 작업트리 local/task69의 HEAD/삭제 2건/untracked 문서 2건 유지 |

초기 실행은 분리 작업트리의 미초기화 submodule·미설치 의존성 때문에 automation 9건/upstream 5건 실패하고 Studio 실행 도구가 없었다. lockfile 설치와 고정 source 준비 후 세 검사를 전체 재실행해 위 결과를 얻었다. upstream 전체 이력 다운로드는 중단하고 동일 pin이 준비된 다른 작업트리를 읽기 전용으로 복제했다. 원본 작업트리와 pin은 변경하지 않았다. pnpm은 driver/esbuild 의존성 build script를 실행하지 않았으며 추가 승인이나 lockfile 변경 없이 Studio 빌드가 통과했다.

Studio 빌드에는 기존 CanvasKit의 fs/path browser externalization, Tauri 정적/동적 import 중복 및 큰 chunk 경고가 남는다. 웹 변경의 검사 실패가 아니며 이번 task에서 제품 번들 구조를 변경하지 않았다.

로그: `/tmp/task108-stage3-automation.log`, `/tmp/task108-stage3-upstream.log`, `/tmp/task108-stage3-studio-test.log`, `/tmp/task108-stage3-studio-build.log`. 최초 실패는 `*-initial.log`로 보존했다.

### 공개 Release·설치 파일 대조

조회 시각: `2026-10-04T17:48:11.302088+00:00`. 공개 Release ID `402604603`는 stable·non-draft·non-prerelease `v0.1.1`, 공개일 `2026-10-03T17:07:44Z`, asset 11개다. 6종의 실제 API 이름/URL/크기/digest를 승인 원문과 생성 목록 양쪽에 대조했다. 각 exact asset URL에 redirect를 따르는 HEAD 요청만 수행해 200을 확인했다.

| target | Asset ID | 크기 (bytes) | API SHA-256 | HEAD / 다운로드 |
|---|---:|---:|---|---|
| `windows-x86_64-nsis` | 608174618 | 56,793,106 | `9ff5e10e9b99f2605ab77b2d8525870819f3ed9d138b84fe2e6009b2222a1ca3` | 200 / 0 bytes |
| `windows-x86_64-msi` | 608174620 | 64,102,400 | `6a34ae3a52c59bf4737cf1595d65a914fdd2ec588a3a1c54270c7d83c578fc98` | 200 / 0 bytes |
| `linux-x86_64-appimage` | 608174616 | 135,346,680 | `c3a599fdea3b52353d875a4c50738babaf91102c26fcd7a6079e69e96b6bebf0` | 200 / 0 bytes |
| `linux-x86_64-deb` | 608174714 | 66,954,862 | `6ad4492529dd228d38d37b697d0175323e71e2632212f472c1557f3868913862` | 200 / 0 bytes |
| `linux-x86_64-rpm` | 608174760 | 66,948,539 | `185c399e737c2a686f5d5f599866fa3a63abac442e928f9442c29d9f178564b3` | 200 / 0 bytes |
| `linux-aarch64-deb` | 608179311 | 66,823,896 | `3e29375bf7f824bdc84ae3f1dbff5b5cbeacae5ae694fa64d30c423a5be58859` | 200 / 0 bytes |

API digest 대조는 GitHub metadata 검증이다. installer 본체를 재다운로드해 계산하거나 Minisign을 재검증한 결과로 확대하지 않는다.

원격 annotated tag object는 `b7b858e13c3f9153562e28e33cc398e75e896adf`, peeled product source는 `96e89e900415ee9e1e942b5c01c833dea3415e86`로 원문과 같다. 현재 devel도 기준 `b925faa31251114e7064e76209c5640147dd013e`와 같다. 공개 GitHub body와 기존 생성 body의 UTF-8 bytes도 같다.

### updater 불변과 브라우저 증거 재사용

공개 `release.json`과 `updater/stable.json`을 내려받아 로컬 source/생성 feed와 exact bytes 비교했다. feed 2,295 bytes의 version/pub_date/notes/세 URL·signature 모두 동일하며 inventory source/keyFingerprint도 release.json 전체 비교에 포함된다. updater source는 제품 source `96e89e9…`, Pages/UI 후보 source는 별도로 관리한다.

아래 9개 hash는 Stage 2 receipt와 같다. 따라서 1366×900·390×844·320×760의 본문 겹침/overflow·6종 링크·키보드·최신 배지·제목 600/항목 500/설명 400, 홈/문의/버전 상세의 실제 브라우저 관측을 재사용한다. 사용자의 로컬 화면 확인도 받았다.

| 파일/출력 | SHA-256 | Stage 2 비교 |
|---|---|---|
| `site/release.json` | `aa2bce9bf52a37a37c091b80be47e0146d5b15e6b338cabcc6e8b204cce07efd` | 동일 |
| `docs/releases/v0.1.1.notes.json` | `2a927d64d364688660f96f6b620be6be189b8c2cfcb5a27ae1c16dbba6c158fb` | 동일 |
| `_site/updater/stable.json` | `654efd7efc5f57de061d56743d30ab55c0f152d693df52c4022306261edbc638` | 동일 |
| `_site/downloads.json` | `3a4e7b29cba59b24bfc9e8fdad3ab192472e4b7706fa383c754be7060ab05eb9` | 동일 |
| `site/package-downloads.js` | `3502910ccb88aa520850a7e2d6859ff01365070fbb7fe8199c54c7466d234fa7` | 동일 |
| `site/script.js` | `466a9c33406cf758364495477da5ff273280936ad723da550b36b747ccbea941` | 동일 |
| `site/styles.css` | `fe758b86ff87b724e8db9ab73a884a11b0f1d8f603707a8f9fd3ed48a5de24a6` | 동일 |
| `mydocs/_templates/website_release_note.html` | `59f438c607643578370c940f6eaf8d55622063f268bc8eafa6d2d39851104f7c` | 동일 |
| `site/updates/v0.1.1.html` | `b1b034edf27ad4d7dbe8a30271b0641fdb76d1bdc402bd66556ff9904f20906e` | 동일 |

공개/API receipt: `/tmp/task108-stage3-public-receipt.json`, `/tmp/task108-stage3-public-release.json`, `/tmp/task108-stage3-remote-refs.txt`. 브라우저 근거와 상세 한계는 [Stage 2 보고서](task_m010_108_stage2.md)에 있다.

## 잔여 위험

- PR required CI와 공개 Pages는 아직 수행하지 않았다. 현재 결과는 로컬 후보의 통합 수용이며 원격 배포 완료가 아니다.
- 실제 제품 설치/업그레이드와 사용자 Wayland·하이브리드 그래픽의 재검증은 범위 밖이다. 기존 v0.1.1 수용 근거를 웹 변경의 테스트로 대체하지 않는다.
- 공개 후 CDN 캐시가 release/catalog를 혼합하면 직접 다운로드 대신 안내 링크가 유지될 수 있다. exact 출력 read-back과 공개 UI 확인이 필요하다.

## 다음 단계 영향

- 최종 보고서 승인 후 `local/task108`을 `publish/task108`으로 push하고 `devel` 대상 Open PR을 게시한다.
- 자동 PR acceptance의 Node/Studio·Windows PowerShell fast·Alhangeul PR required 세 job과 필수 step를 exact 후보에서 확인한다. 동일 source 수동 fast를 중복 dispatch하지 않는다.
- 실제 CI/diff 후보를 제시한 뒤 일반 merge·exact Pages 배포·read-back·#108 close·정리를 별도 승인받는다. 현재 사용자 미리보기와 다른 작업트리는 보존한다.

## 승인 요청

- Stage 3와 [최종 보고서](../report/task_m010_108_report.md)를 승인하면 PR 게시·필수 CI 확인까지 진행한다.
- 병합·Pages 공개는 실제 원격 후보와 결과를 제시한 뒤 별도 승인받는다.
