# Task #1 Stage 3 보고서 — 공식 문서·사이트·워크플로 독립화

GitHub Issue: [#1](https://github.com/postmelee/alhangeul-tauri/issues/1)
구현계획서: [`task_m010_1_impl.md`](../plans/task_m010_1_impl.md)
Stage: 3

## 단계 목적

초기 저장소의 공식 문서, 소개 사이트와 GitHub workflow에 남아 있던 이전 제품·배포 경계를 Alhangeul의 Windows/Linux 개발 단계에 맞게 독립화한다. 존재하지 않는 다운로드와 릴리스를 제공한다고 주장하지 않고, 초기 코드·아이콘 출처와 현재 `rhwp` submodule 및 후속 Stable release pin 경계를 분리해 기록한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `README.md`, `AGENTS.md`, `package.json` | Alhangeul 제품·개발 상태와 platform-neutral 검증 명령을 정리하고 `check:product-boundary` script를 등록했다. |
| `docs/README.md`, `docs/DEVELOPMENT.md`, `docs/KEYBOARD_SHORTCUTS.md` | 공식 문서 구조, Windows/Linux 개발 절차와 단축키를 현재 package 이름에 맞게 다시 작성했다. |
| `docs/architecture/LOCAL_FONTS.md`, `assets/fonts/FONTS.md` | 지원 플랫폼의 로컬 폰트 정책과 번들 폰트 제품명을 Alhangeul 기준으로 정리했다. |
| `docs/architecture/UPSTREAM.md` | 현재 `rhwp` submodule commit과 후속 Stable release tag + resolved commit pin 전환 경계를 구분했다. |
| `docs/architecture/PROVENANCE.md` | HOP 기준 commit, 독립 remote 원칙, MIT 라이선스 보존과 Alhangeul icon source commit·경로·SHA-256을 기록했다. |
| `docs/operations/DESKTOP_RELEASE.md` | 아직 배포 절차가 준비되지 않았음을 명시하고 수동 artifact workflow와 후속 배포 task의 진입 조건만 남겼다. |
| `.github/ISSUE_TEMPLATE/*.yml` | Alhangeul 및 Windows/Linux 범위로 bug/feature form을 정리했다. |
| `.github/workflows/ci.yml`, `.github/workflows/pages.yml` | workflow 이름·concurrency와 정적 검증 명령을 새 저장소 기준으로 바꿨다. |
| `.github/workflows/alhangeul-desktop.yml` | Windows x64, Linux x64, Linux arm64 수동 Tauri artifact build matrix를 추가했다. Release 생성·서명·updater 단계는 포함하지 않았다. |
| `.github/workflows/hop-desktop.yml` | 이전 다중 플랫폼 release workflow를 삭제했다. |
| `site/index.html`, `site/styles.css` | 제품 소개, 개발 중 상태와 GitHub 링크만 남긴 정적 페이지로 축소했다. |
| `site/downloads.js` | 존재하지 않는 release asset 탐색과 download link hydration script를 삭제했다. |
| `scripts/check-product-boundary.mjs` | `third_party/rhwp`, `mydocs/`, Git metadata를 분리하고 나머지 저장소의 legacy 제품명·native build/distribution marker를 검사한다. 역사 표기는 `AGENTS.md`, `LICENSE`, `PROVENANCE.md`로 제한했다. |
| `docs/operations/*1pager.md` 3개 | 이전 release 및 플랫폼 전용 운영 계획서를 archive 없이 삭제했다. |

## 본문 변경 정도 / 본문 무손실 여부

- README, site와 release 운영 문서는 현재 프로젝트 상태와 맞지 않아 구조와 본문을 전면 재작성했다. 이전 download URL, 설치 명령, 공개 release·서명·updater 주장은 의도적으로 보존하지 않았다.
- 실제로 유지되는 HWP/HWPX 열기, HWP 저장, PDF export, 인쇄, drag/drop과 다중 창 기능 설명은 Alhangeul 이름으로 유지했다.
- `rhwp`의 현재 resolved commit `b3e16ef212af81ef37d973ddb86d6816d3804642`와 `v0.7.13` 관계는 보존하고, 아직 구현하지 않은 release pin 구조를 현재 완료 상태처럼 설명하지 않았다.
- 초기 HOP 코드 이력과 icon 출처는 제품 문구에서 제거하는 대신 `PROVENANCE.md`에 집중해 보존했다.
- application runtime 동작은 변경하지 않았으며 root package에 지속 검증 script만 추가했다.

## 검증 결과

실행 명령:

```bash
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
ruby -e 'require "yaml"; Dir[".github/workflows/*.yml", ".github/ISSUE_TEMPLATE/*.yml"].each { |path| YAML.load_file(path); puts path }'
test ! -e .github/workflows/hop-desktop.yml
test ! -e site/downloads.js
if rg -n 'macos-|aarch64-apple|x86_64-apple|\.dmg|notari|APPLE_|Quick Look|quicklook' .github README.md docs site package.json; then exit 1; fi
if rg -n 'github\.com/golbin/hop/releases|golbin/hop/releases/latest' README.md docs site .github; then exit 1; fi
git diff --check
```

결과:

- `check:product-boundary`: OK, 분리 대상 외 173개 파일 검사 통과
- `test:upstream`: OK, 12개 테스트 통과
- `test:studio`: OK, 22개 test file의 115개 테스트 통과
- `build:studio`: OK, 기존 Vite dynamic import 및 500 kB 초과 chunk 경고만 발생
- workflow 및 Issue Form YAML: OK, 6개 파일 parse 통과
- 이전 workflow와 download script 삭제 확인: OK
- 지원 범위 밖 native build/distribution marker 검색: OK
- 이전 release URL 검색: OK
- `git diff --check`: OK

## 잔여 위험

- 저장소 수준 GitHub Actions가 비활성 상태이므로 workflow는 YAML과 matrix를 정적으로만 검증했다.
- Pages 배포와 Windows/Linux native artifact 생성·실행은 수행하지 않았다.
- 현재 `rhwp` 의존성은 여전히 전환기 submodule 구조다. Stable release pin 구조는 별도 후속 Issue가 필요하다.
- studio build에는 기존 dynamic import와 큰 bundle chunk 경고가 남아 있으나 build 실패는 아니다.

## 다음 단계 영향

- Stage 4에서 package·Rust·Tauri·UI·문서·workflow 식별자를 교차 검색하고 product boundary allowlist와 scan 범위가 필요한 출처 기록보다 넓지 않은지 최종 검토한다.
- Windows file association 설정과 Linux runtime source가 Stage 1~3에서 보존됐는지 정적으로 확인한다.
- 실제 native CI, release pin, signing, 배포 또는 updater가 필요해 보여도 Stage 4 범위를 확장하지 않고 후속 Issue 후보로 기록한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 — 통합 정합성 검증으로 진행한다.
