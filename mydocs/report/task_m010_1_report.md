# Task #1 최종 보고서 — Alhangeul 독립화 리브랜딩 및 지원 범위 확정

GitHub Issue: [#1](https://github.com/postmelee/alhangeul-tauri/issues/1)
마일스톤: M010

## 작업 요약

- 대상 이슈: #1
- 마일스톤: M010
- 단계 수: 4
- 작업 목적: HOP 기준 코드를 독립적인 Alhangeul Windows/Linux 제품 기준선으로 전환하고 후속 `rhwp` release pin·CI 작업의 안전한 출발점을 만든다.

Stage 1에서 지원 범위 밖 native 경로를 제거하고, Stage 2에서 package·Rust·Tauri·UI·asset 식별자를 Alhangeul로 전환하며 기존 updater를 제거했다. Stage 3에서 공식 문서·사이트·workflow와 provenance를 독립화했고, Stage 4에서 Issue #1 수용 기준을 교차 검증해 잔존 runtime·shortcut·font 경계를 최소 보정했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/desktop/quicklook/**`, native platform 전용 source·script | preview extension, recent document integration, build hook와 관련 dependency 삭제 | 지원 플랫폼·native build 경계 |
| `apps/desktop/src-tauri/**` | Rust package·binary, Tauri identifier·제품 metadata, updater와 지원 범위 밖 fallback 제거 | desktop runtime·bundle·file association |
| `apps/studio-host/**` | Alhangeul package·UI·event·renderer 명명, updater notice와 지원 범위 밖 shortcut/runtime 분기 제거 | webview UI·desktop bridge·editor integration |
| `assets/logo/**`, `assets/fonts/FONTS.md` | Alhangeul icon source·PNG·ICO·favicon 전환과 font 문서 정리 | 제품 자산·bundle icon |
| `scripts/**`, `tests/**`, `package.json` | 제품 경계 검사 추가, icon·upstream script 명명과 baseline test 갱신 | 지속 검증·유지보수 자동화 |
| `README.md`, `AGENTS.md`, `docs/**` | 제품·개발·upstream·font·artifact 문서 독립화, provenance 추가와 obsolete 문서 삭제 | 사용자·기여자·아키텍처·운영 문서 |
| `.github/**` | Issue Form, CI·Pages 이름과 Windows/Linux 수동 artifact workflow 정리 | GitHub 협업·정적 CI 정의 |
| `site/**` | 미출시 상태와 저장소 링크 중심의 정적 소개 페이지로 축소 | 사용자 공개 설명 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 제품 진입 문서 | 저장소 root | `README.md` | OK | 수행계획서의 제품 진입 문서 위치와 일치 |
| 기여자·사용자 문서 | `docs/` | `docs/README.md`, `docs/DEVELOPMENT.md`, `docs/KEYBOARD_SHORTCUTS.md` | OK | 기존 공식 문서 root 유지 |
| 출처 문서 | `docs/architecture/` | `docs/architecture/PROVENANCE.md` | OK | HOP·icon 출처를 제품 설명과 분리 |
| upstream·font 아키텍처 | `docs/architecture/` | `UPSTREAM.md`, `LOCAL_FONTS.md` | OK | 지속 dependency와 제품 font 정책 위치 일치 |
| 운영 문서 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | artifact 검증과 후속 배포 진입점만 유지 |
| 사용자 소개 페이지 | `site/` | `site/index.html`, `site/styles.css` | OK | 다운로드 script 없이 미출시 상태를 설명 |
| 작업 계획·보고 | `mydocs/` | `mydocs/plans/`, `mydocs/working/`, `mydocs/report/` | OK | 공식 제품 문서와 운영 기록 분리 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 지원 제품 플랫폼 | 3개 플랫폼 경로 혼재 | Windows/Linux 2개 제품 범위 |
| Stage 1~4 구현 diff | 해당 없음 | 117 files, 1,809 insertions, 7,238 deletions |
| 단계 커밋·보고서 | 0 | Stage commit 4개, 단계 보고서 4개 |
| persistent 제품 경계 검사 | 없음 | 분리 대상 외 172개 파일 검사 |
| upstream baseline test | Alhangeul 전환 전 12개 | 12개 통과 |
| studio test | 지원 범위 밖 test 포함 22 files / 115 tests | 21 files / 113 tests 통과 |
| updater surface | Tauri plugin·native command·studio notice 존재 | dependency·command·UI 0건 |
| 공식 download claim | 기존 release direct link와 detection script 존재 | 공식 설치 파일 미제공 상태 명시, detection script 0개 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 사용자 노출 제품명을 Alhangeul로 통일 | OK — package, Rust, Tauri, UI, README와 site 식별자 교차 검사 통과 |
| HOP 참조를 출처·라이선스·마이그레이션 기록으로 제한 | OK — `PROVENANCE.md`, `AGENTS.md` 역사 경계와 검사 rule만 허용 |
| 지원 범위 밖 build·서명·bundle·preview 실행 경로 제거 | OK — product boundary 172개 파일 검사와 파일·문구 부재 검사 통과 |
| Windows/Linux 코드와 설정 유지 | OK — `.hwp`/`.hwpx` association, WiX template, Linux runtime와 3-target workflow matrix 존재 확인 |
| HOP remote·지속 dependency 미추가 | OK — origin은 `postmelee/alhangeul-tauri` 하나이며 지속 upstream은 `edwardkim/rhwp`만 문서화 |
| 기존 Git 이력과 라이선스 고지 보존 | OK — 기준 commit `bbd6bf69db05f275d714e7c61cef58b662809c6a` object와 MIT `LICENSE` 확인 |
| 후속 `rhwp` pin과 CI 작업 경계 명확화 | OK — `UPSTREAM.md`, `DEVELOPMENT.md`, `DESKTOP_RELEASE.md`에 현재 상태와 후속 범위 분리 |
| platform-neutral test와 studio build | OK — upstream 12개, studio 113개 테스트, TypeScript/Vite build 통과 |
| Rust format과 YAML 정합성 | OK — `cargo fmt --check`, workflow·Issue Form parse 통과 |
| GitHub Actions 비활성 유지 | OK — GitHub API 확인 결과 `enabled: false` |

### 단계별 검증 결과

- Stage 1: [`task_m010_1_stage1.md`](../working/task_m010_1_stage1.md) — native 전용 경로 부재, Rust format과 upstream baseline 통과
- Stage 2: [`task_m010_1_stage2.md`](../working/task_m010_1_stage2.md) — 제품·runtime·asset 전환, upstream 12개와 studio 115개 테스트 및 build 통과
- Stage 3: [`task_m010_1_stage3.md`](../working/task_m010_1_stage3.md) — 공식 문서·사이트·workflow 독립화, 제품 경계·YAML 검사 통과
- Stage 4: [`task_m010_1_stage4.md`](../working/task_m010_1_stage4.md) — Issue 수용 기준 통합 대조, 제품 경계 172개 파일과 studio 113개 테스트 통과

## 잔여 위험과 후속 작업

### 잔여 위험

- GitHub Actions가 비활성 상태이므로 Windows/Linux native compile, Tauri bundle, artifact와 Pages 배포를 실행하지 않았다.
- 현재 `rhwp` dependency는 전환기 submodule 구조다. Stable release tag + resolved commit pin은 아직 구현하지 않았다.
- workspace·desktop version `0.3.1`은 독립 release version으로 확정하거나 재설정하지 않았다.
- signing, package 게시, 실제 release와 updater는 운영·보안 정책이 준비되지 않았다.
- studio build에 기존 dynamic import 및 500 kB 초과 chunk 경고가 남아 있다.

### 후속 작업 후보

- `rhwp` Stable release pin, Rust core·bundled studio 동일 release 동기화와 dependency lock 자동화
- Actions 활성화 승인 후 Windows x64, Linux x64/arm64 native CI·artifact smoke 검증
- v0.1.0 version·tag·bundle 이름, Windows signing과 Linux package metadata·배포 정책 확정
- 필요 시 독립 updater threat model, signing key 보관과 rollback 설계
- studio dynamic import와 bundle chunk 최적화

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과, 게시된 PR을 검토한 뒤 merge 여부를 승인한다.
