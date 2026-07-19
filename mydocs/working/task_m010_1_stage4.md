# Task #1 Stage 4 보고서 — 독립 제품 경계 통합 검증

GitHub Issue: [#1](https://github.com/postmelee/alhangeul-tauri/issues/1)
구현계획서: [`task_m010_1_impl.md`](../plans/task_m010_1_impl.md)
Stage: 4

## 단계 목적

Stage 1~3에서 제거·개명·재작성한 package, Rust, Tauri, studio UI, 문서와 workflow 경계를 통합 검증한다. Issue #1의 수용 기준과 교차 검색 결과를 대조해 부분 전환이나 지원 범위 밖 실행 경로만 최소 보정하고, `rhwp` release pin·CI 활성화·배포 같은 제외 범위는 후속 작업으로 분리한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/core/platform.ts`, `platform.test.ts` | desktop platform type과 감지를 Windows/Linux/unknown으로 한정하고 지원 플랫폼 hydration·fallback 테스트를 유지했다. |
| `apps/studio-host/src/core/desktop-chrome.ts` | 지원 범위 밖 shortcut label 변환을 제거하고 non-editor context menu guard만 남겼다. |
| `apps/studio-host/src/core/desktop-chrome.test.ts` | 제거한 platform 전용 표시 변환 테스트를 삭제했다. |
| `apps/studio-host/src/command/shortcut-map.ts`, `shortcut-map.test.ts` | primary modifier를 Ctrl로 고정하고 Alhangeul custom shortcut, Ctrl+E와 Meta 비매핑을 검증했다. |
| `apps/studio-host/src/main.ts` | 지원 플랫폼 hydration은 Windows 전용 wheel zoom 분기에만 유지하고 global shortcut은 Ctrl 기준으로 단순화했다. |
| `apps/studio-host/src/core/font-loader.ts` | 지원 범위 밖 OS font 후보를 system font detection 목록에서 제거했다. |
| `apps/desktop/src-tauri/src/pdf_font_fallbacks.rs` | PDF SVG fallback chain에서 지원 범위 밖 OS font family를 제거하고 테스트 기대값을 갱신했다. |
| `scripts/check-product-boundary.mjs` | `macos`, `darwin`, `apple` 식별자까지 저장소 전체에서 검사하고 provenance, 생성 lockfile, 검사 script만 정확한 파일 allowlist로 허용했다. |

## 본문 변경 정도 / 본문 무손실 여부

- HWP/HWPX document engine, 파일 열기·저장, PDF export, 인쇄, drag/drop, 다중 창 기능은 변경하지 않았다.
- Windows/Linux platform hydration과 Windows WebView2 wheel zoom 보정은 유지했다.
- Windows/Linux의 Ctrl shortcut과 기존 upstream command mapping을 유지하고 지원 범위 밖 Meta shortcut만 제거했다.
- font fallback은 `함초롬바탕`, `함초롬돋움`, `바탕`, `맑은 고딕`과 generic serif/sans-serif를 유지했다.
- Windows `.hwp`/`.hwpx` file association, WiX template와 Linux runtime source·초기화 경로가 보존됐음을 정적으로 확인했다.
- HOP 기준 commit `bbd6bf69db05f275d714e7c61cef58b662809c6a`와 MIT `LICENSE`는 수정하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
ruby -e 'require "yaml"; Dir[".github/workflows/*.yml", ".github/ISSUE_TEMPLATE/*.yml"].each { |path| YAML.load_file(path) }'
test -f apps/desktop/src-tauri/tauri.windows.conf.json
test -f apps/desktop/src-tauri/src/linux_runtime.rs
git diff --check
git status --short
```

결과:

- `pnpm install --frozen-lockfile`: OK
- `check:product-boundary`: OK, 분리 대상 외 172개 파일 검사 통과
- `test:upstream`: OK, 12개 테스트 통과
- `test:studio`: OK, 21개 test file의 113개 테스트 통과
- `build:studio`: OK, 기존 Vite dynamic import 및 500 kB 초과 chunk 경고만 발생
- Rust format: OK
- workflow와 Issue Form YAML parse: OK
- Windows config와 Linux runtime 존재 검사: OK
- `git diff --check`: OK

추가 수동·정적 검토:

- Issue #1 본문과 포함·제외 범위·수용 기준을 GitHub에서 다시 읽어 대조했다.
- 사용자 제품명은 Alhangeul로 통일됐고 HOP 표기는 `PROVENANCE.md`, `AGENTS.md` 역사 경계와 검사 rule에만 남았다.
- 지원 범위 밖 platform 식별자는 `PROVENANCE.md`의 icon 출처, generated `pnpm-lock.yaml`, 경계 검사 rule에만 남는다.
- Git remote는 `https://github.com/postmelee/alhangeul-tauri.git` origin 하나이며 HOP remote가 없다.
- 기준 HOP commit object와 MIT `LICENSE` 존재를 확인했다.
- updater dependency·command·UI, workflow write permission과 release 생성 명령의 부재를 확인했다.
- README와 site는 공식 설치 파일이나 공개 release가 아직 없다고 명시한다.
- GitHub API `repos/postmelee/alhangeul-tauri/actions/permissions` 결과가 `enabled: false`임을 확인했다.

## 잔여 위험

- 저장소 Actions가 비활성 상태이므로 Windows/Linux native compile, Tauri bundle, artifact와 Pages 배포는 실행하지 않았다.
- 현재 `rhwp` 의존성은 전환기 submodule 구조이며 Stable release tag + resolved commit pin은 후속 전용 Issue가 필요하다.
- workspace·desktop version `0.3.1`은 이번 독립화 task에서 release version으로 확정하거나 재설정하지 않았다.
- signing, package 게시, 실제 release와 updater 재도입은 별도 보안·운영 설계와 명시 승인이 필요하다.
- studio build의 dynamic import와 큰 bundle chunk 경고는 별도 성능·bundling 개선 후보다.

## 다음 단계 영향

- 모든 구현 Stage가 종료됐다. 다음에는 `task-final-report` 절차로 Stage 1~4 결과, 검증 한계와 후속 Issue 후보를 최종 보고서에 통합한다.
- 후속 Issue 후보는 `rhwp` Stable release pin·studio 동기화 자동화, Actions 활성화와 Windows/Linux native CI, version·signing·배포 정책, 필요 시 독립 updater, studio bundle 최적화다.
- 최종 보고 승인 전 remote push, Actions 활성화, release·배포는 수행하지 않는다.

## 승인 요청

- Stage 4 산출물과 검증 결과를 승인하면 `task-final-report` 절차로 최종 보고서 작성, 오늘할일 완료 처리와 PR 게시를 진행한다.
