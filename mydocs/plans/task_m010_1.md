# Task #1 수행계획서 — Alhangeul 독립화 리브랜딩 및 macOS 지원 범위 제거

GitHub Issue: [#1](https://github.com/postmelee/alhangeul-tauri/issues/1)
마일스톤: M010

## 목적

HOP에서 일회성으로 가져온 코드베이스를 독립적인 Alhangeul Tauri 제품 기준으로 전환한다. 사용자에게 노출되는 이름, 패키지와 Rust crate 식별자, Tauri 앱 식별자, 산출물 이름을 Alhangeul 기준으로 통일하고 지원 플랫폼을 Windows와 Linux로 한정한다.

HOP는 최초 코드와 Git 이력의 출처로만 남기고 지속 upstream, 업데이트 URL, 배포 채널로 사용하지 않는다. 기존 HOP Git 이력과 MIT 라이선스·저작권 고지는 보존하며, 후속 `rhwp` release pin 및 Windows/Linux CI·릴리스 자동화가 들어갈 수 있는 독립 제품 기준선을 만든다.

## 배경

`postmelee/alhangeul-tauri`는 HOP v0.3.1 기준 커밋 `bbd6bf69db05f275d714e7c61cef58b662809c6a`까지의 이력을 일회성으로 가져오고 Hyper-Waterfall v0.3.0 한국어 locale을 적용했다. 저장소 remote와 기본 브랜치는 이미 독립됐지만 제품 코드, 패키지, 앱 식별자, README, 사이트, 문서, 테스트, 워크플로에는 HOP와 macOS 전용 경로가 남아 있다.

대표적으로 `apps/desktop/quicklook/`, `scripts/*quicklook-macos*`, `macos_recent_documents.rs`, Tauri `bundle.macOS`, Apple target dependency, DMG·공증·Apple 서명 release matrix, `golbin/hop` updater endpoint가 존재한다. 현재 GitHub Actions는 이 경로가 실행되지 않도록 저장소 수준에서 비활성화돼 있다.

이 task는 독립화와 Windows/Linux 제품 경계를 확정하는 작업이다. `edwardkim/rhwp`의 stable release tag + resolved commit pin, 같은 release의 bundled `rhwp-studio`, Actions 재활성화, 서명과 실제 배포는 후속 task로 분리한다.

## 범위

### 포함

- HOP 제품명, npm package, Rust package/crate, Tauri product name·identifier, 앱 창 제목, 산출물 이름을 Alhangeul 기준으로 전환
- `apps/desktop/quicklook/`, Quick Look build/test script, macOS recent documents 모듈과 Apple 전용 Rust dependency 제거
- Tauri macOS bundle, Apple UTI, DMG·공증·Apple 서명, Darwin target과 macOS release asset 경로 제거
- updater가 `golbin/hop` release를 가리키지 않도록 현재 updater endpoint와 자동 확인 경로 비활성화 또는 제거
- Windows/Linux 범위에 맞게 package script, repository test, GitHub workflow 정의 정리
- README, 기존 `docs/`, `site/`, GitHub Issue template 등 사용자·기여자 노출 문구와 링크 정리
- HOP 출처와 기준 커밋을 설명하는 provenance 문서 작성, 기존 Git 이력과 MIT 라이선스 고지 보존
- 호환되는 경우 `postmelee/alhangeul-macos`의 Alhangeul 아이콘을 출처 commit과 함께 재사용하고 Windows/Linux용 PNG/ICO 세트로 정리
- AGENTS.md의 임시 HOP 구조 설명과 현재 검증 명령을 실제 전환 결과에 맞게 갱신

### 제외

- `edwardkim/rhwp` stable release tag + resolved commit pin 및 provenance lock 구현
- Rust core와 bundled `rhwp-studio`의 동일 release 동기화·갱신 자동화
- GitHub Actions 저장소 설정 재활성화와 필수 branch check 설정
- Windows/Linux 네이티브 서명, 패키지 게시, updater 재도입, 실제 GitHub Release 생성
- 새로운 보기·편집 기능과 문서 렌더링 동작 변경
- macOS 빌드, CI, 개발 검증, 패키징, 배포 지원
- `postmelee/alhangeul-macos` 저장소 변경

## 설계 방향

- 제품명은 사용자 표시에서 `Alhangeul`, 저장소·workspace 식별자는 `alhangeul-tauri`를 사용한다.
- npm workspace package는 `alhangeul-tauri`, `alhangeul-desktop`, `@postmelee/alhangeul-studio-host`로 정리한다. Rust package/bin은 `alhangeul-desktop`, lib crate는 `alhangeul_desktop`을 사용한다.
- Tauri identifier는 공개 저장소 소유권을 표현하는 `io.github.postmelee.alhangeul`을 사용한다. 기존 `net.golbin.hop.*` UTI는 macOS 전용이므로 함께 제거한다.
- macOS 전용 파일은 호환 shim으로 남기지 않고 삭제한다. 공용 파일의 macOS 조건 분기는 Windows/Linux 동작에 영향이 없는지 호출부와 테스트를 확인한 뒤 제거한다.
- HOP 명칭은 `LICENSE`, Git 이력, 새 provenance 문서와 필요한 migration 설명에서만 허용한다. 코드·패키지·실행 경로·다운로드 링크에는 남기지 않는다.
- 현재 `golbin/hop` updater endpoint는 새 release 채널로 즉시 바꾸지 않고 제거한다. updater와 release channel은 후속 배포 task에서 별도 승인 후 재도입한다.
- `.github/workflows/hop-desktop.yml`은 Windows/Linux 수동 build 검증 정의로 축소·개명한다. release 생성, 서명, updater artifact 게시 로직은 이번 범위에서 제거하며 저장소 수준 Actions는 계속 비활성 상태로 둔다.
- `docs/`를 기여자·아키텍처·운영 공식 문서 루트로 유지하고, `site/`는 사용자 대상 소개 페이지 위치로 유지한다. `mydocs/`에는 Hyper-Waterfall 작업 산출물과 운영 규칙만 둔다.
- 기존 Alhangeul 아이콘 재사용 시 `postmelee/alhangeul-macos`의 source commit과 원본 경로를 provenance 문서에 기록한다. 시각 자산의 신규 디자인은 하지 않는다.
- JavaScript package manager는 `pnpm`만 사용하고 `pnpm-lock.yaml`은 package rename 결과를 반영해 재생성·검증한다.

## 문서 위치 판단

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `README.md` | 공식 제품 진입 문서 | 사용자·기여자 | 저장소 루트 | `docs/README.md` | GitHub 첫 화면에서 제품명, 지원 플랫폼, 현재 배포 상태를 즉시 보여준다. |
| `docs/DEVELOPMENT.md`, `docs/KEYBOARD_SHORTCUTS.md` | 공식 기여자·사용자 문서 | 기여자·사용자 | `docs/` | 루트 개별 문서 | 기존 공식 문서 구조를 유지하면서 HOP·macOS 설명만 현재 제품 경계에 맞춘다. |
| `docs/architecture/PROVENANCE.md` | 공식 아키텍처·출처 문서 | 기여자·유지보수자 | `docs/architecture/` | README Credits | HOP 일회성 도입과 허용된 잔여 참조를 제품 설명과 분리해 장기 추적한다. |
| `docs/operations/*` | 공식 운영 문서 | 유지보수자 | `docs/operations/` | 삭제 | Windows/Linux에 유효한 운영 내용만 유지하고 HOP release·Quick Look 전용 계획 문서는 삭제한다. |
| `site/` | 공식 사용자 소개 페이지 | 사용자 | `site/` | README만 유지 | 기존 Pages 자산을 재사용하되 다운로드를 제공하는 것처럼 오인시키는 링크는 제거한다. |
| `mydocs/orders/20260719.md`, `mydocs/plans/task_m010_1*.md` | 작업 산출물 | 작업지시자·에이전트 | `mydocs/` | 해당 없음 | Hyper-Waterfall 진행 기록이며 제품 공식 문서와 역할이 다르다. |

## 예상 변경 파일

신규:

- `docs/architecture/PROVENANCE.md`
- `.github/workflows/alhangeul-desktop.yml` (`hop-desktop.yml` 개명 결과)

수정:

- `AGENTS.md`
- `README.md`
- `package.json`, `pnpm-lock.yaml`
- `apps/desktop/package.json`
- `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/Cargo.lock`
- `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/src-tauri/tauri.windows.conf.json`
- `apps/desktop/src-tauri/src/*.rs`
- `apps/studio-host/package.json`, `apps/studio-host/index.html`, `apps/studio-host/vite.config.ts`, `apps/studio-host/vitest.config.ts`
- `apps/studio-host/src/**/*.ts`, `apps/studio-host/src/**/*.css`
- `assets/logo/*`, `assets/screenshots/*`
- `.github/ISSUE_TEMPLATE/*.yml`, `.github/workflows/ci.yml`, `.github/workflows/pages.yml`
- `docs/**/*.md`, `site/*`
- `scripts/*.mjs`, `scripts/update-upstream.sh`, `tests/*.mjs`

삭제:

- `apps/desktop/quicklook/**`
- `apps/desktop/src-tauri/src/macos_recent_documents.rs`
- `scripts/build-quicklook-macos.mjs`
- `scripts/test-quicklook-macos.mjs`
- `.github/workflows/hop-desktop.yml` (개명)
- HOP release 및 Quick Look에만 해당하는 `docs/operations/*.md`
- Windows/Linux에서 사용하지 않는 macOS icon 자산

이번 task 산출물:

- `mydocs/orders/20260719.md`
- `mydocs/plans/task_m010_1.md`
- `mydocs/plans/task_m010_1_impl.md`
- `mydocs/working/task_m010_1_stage{N}.md`
- `mydocs/report/task_m010_1_report.md`

## 잠정 단계

- **Stage 1 — 플랫폼 경계와 HOP 잔여 참조 기준 확정**
  - macOS 전용 Quick Look·Rust·Tauri·script 경로 제거
  - HOP provenance allowlist와 Windows/Linux 공용 코드 보존 여부 확인
  - Rust formatting과 잔여 플랫폼 참조 정적 검증
- **Stage 2 — 제품 식별자와 런타임 브랜드 전환**
  - npm/Rust/Tauri 식별자, 창 제목, UI 문구, 내부 파일·symbol 이름 전환
  - updater의 HOP release endpoint 제거와 Alhangeul icon 적용
  - lockfile, studio unit test, platform-neutral build 검증
- **Stage 3 — 공식 문서·사이트·워크플로 정리**
  - README, `docs/`, `site/`, Issue template의 Alhangeul·Windows/Linux 기준 반영
  - HOP provenance 문서 작성, macOS/release 문서 삭제
  - Windows/Linux 수동 build workflow 정의와 YAML 정적 검증
- **Stage 4 — 통합 정합성 및 수용 기준 검증**
  - 브랜드·플랫폼 잔여 참조 allowlist 검사
  - 플랫폼 중립 테스트와 studio build, Git diff·문서 링크 검증
  - Windows/Linux 네이티브 CI가 후속 task임을 최종 보고서에 명시

## 검증 계획

### 단계별 검증

- Stage 1
  - `git diff --check`
  - macOS 전용 경로와 Rust `cfg(target_os = "macos")` 잔여 참조 검사
  - `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check`
- Stage 2
  - `pnpm install --frozen-lockfile`
  - `pnpm run test:upstream`
  - `pnpm run test:studio`
  - `pnpm run build:studio`
  - HOP package·crate·Tauri identifier와 updater URL 잔여 참조 검사
- Stage 3
  - GitHub workflow YAML 구문 검사
  - `macos-*`, Apple target, DMG, 공증, Quick Look, `golbin/hop` 다운로드 링크 잔여 참조 검사
  - README와 `docs/`, `site/` 내부 링크·자산 경로 확인
- Stage 4
  - `git diff --check`
  - `pnpm run test:upstream`
  - `pnpm run test:studio`
  - `pnpm run build:studio`
  - HOP·macOS allowlist 최종 검사
  - Tauri macOS build와 macOS 개발 검증은 수행하지 않음

### 통합 검증

- 사용자 노출 제품명, package/crate, Tauri identifier가 승인된 Alhangeul 명명과 일치한다.
- HOP 참조는 `LICENSE`, Git 이력, provenance·migration 설명에만 남는다.
- macOS 실행·빌드·배포 경로가 없고 Windows/Linux 관련 파일은 유지된다.
- `golbin/hop` remote, dependency, updater, download endpoint가 없다.
- GitHub Actions 저장소 설정은 비활성 상태이며 workflow 소스도 Windows/Linux 범위만 정의한다.
- Windows/Linux 네이티브 build·test는 Actions 재활성화 후 별도 CI task에서 수행한다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **광범위한 rename으로 import·package graph 손상**: package, Rust crate, TypeScript import를 계층별로 변경하고 lockfile·studio test·build로 확인한다.
- **macOS 전용 코드 제거 중 공용 동작 훼손**: 전용 디렉터리와 `cfg(target_os = "macos")` 경계부터 제거하고 Windows/Linux 공용 호출부는 테스트와 정적 검색으로 확인한다.
- **HOP 출처 또는 라이선스 고지 손실**: Git 이력과 `LICENSE`를 보존하고 별도 provenance 문서에 기준 commit과 자산 출처를 기록한다.
- **기존 HOP updater로 잘못 연결**: 새 채널을 추정해 연결하지 않고 updater endpoint와 자동 확인을 제거해 후속 배포 task까지 명시적으로 비활성화한다.
- **Windows/Linux 네이티브 회귀를 현재 환경에서 검출하지 못함**: macOS native build를 대체 검증으로 사용하지 않고 platform-neutral 검증과 정적 검사를 수행하며, 실제 native 검증은 후속 CI task의 선행 조건으로 남긴다.
- **문서와 site가 아직 배포 가능하다고 오인시킴**: 다운로드 링크를 제거하고 현재 개발·배포 상태를 명확히 표시한다.

## 승인 요청 사항

- 제품명 `Alhangeul`, npm/Rust 명명 `alhangeul-*`, Tauri identifier `io.github.postmelee.alhangeul` 사용
- macOS 전용 코드·Quick Look·Apple package/release 경로와 obsolete HOP release 문서를 보존 archive 없이 삭제
- `docs/`를 공식 기여자·아키텍처·운영 문서 루트로, `site/`를 사용자 소개 페이지로 유지
- `postmelee/alhangeul-macos`의 호환 가능한 icon을 source commit 기록과 함께 재사용
- 기존 HOP updater endpoint와 updater 자동 확인을 제거하고 새 updater는 후속 배포 task로 연기
- workflow 파일은 Windows/Linux 기준으로 정리하되 GitHub Actions 저장소 설정은 계속 비활성화
- 이번 task에서 macOS native build를 수행하지 않고 Windows/Linux native 검증은 후속 CI task로 분리

승인되면 `task_m010_1_impl.md`에서 단계별 산출물, 검증 명령, 커밋 메시지를 구체화한다.
