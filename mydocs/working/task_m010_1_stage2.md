# Task #1 Stage 2 보고서 — Alhangeul 제품 식별자와 런타임 전환

- GitHub Issue: [#1](https://github.com/postmelee/alhangeul-tauri/issues/1)
- 마일스톤: `M010`
- 수행계획서: [`task_m010_1_impl.md`](../plans/task_m010_1_impl.md)
- 대상 단계: Stage 2

## 단계 목적

초기 저장소에 남아 있던 HOP 제품 식별자를 Windows/Linux용 Alhangeul 제품 식별자로 전환하고, 독립 릴리스 정책이 확정되지 않은 기존 HOP updater 경로를 제거한다. `rhwp` renderer 동작과 upstream 갱신 동작은 유지하면서 패키지·런타임·아이콘 자산의 소유 경계를 Alhangeul로 정리한다.

## 산출물

- root workspace를 `alhangeul-tauri`, desktop npm/Rust package와 binary를 `alhangeul-desktop`, studio package를 `@postmelee/alhangeul-studio-host`로 개명했다.
- Tauri 제품명과 창 제목을 `Alhangeul`, identifier를 `io.github.postmelee.alhangeul`, publisher를 `postmelee`, copyright를 `Alhangeul contributors`로 전환했다.
- `hop-overrides.ts`, `hop-page-renderer.ts`와 테스트를 Alhangeul 이름으로 개명하고 TypeScript 식별자, 이벤트, 임시 파일 접미사, CSS selector, 사용자 노출 문구를 함께 정리했다.
- Tauri updater plugin·dependency·state·command와 studio update notice UI를 제거하고, 사용하지 않게 된 Cargo dependency graph를 lockfile에서 정리했다.
- `postmelee/alhangeul-macos` commit `dcef80cae43195a3e353de084f7246614da924be`의 `assets/logo-256@2x.png`를 `assets/logo/logo-source.png`로 가져왔다. 원본 SHA-256은 `cc8b326aa54bff659689222fca317b561c7984d86c479b61b534bf4fddec3cd5`다.
- Windows/Linux용 PNG·ICO와 studio favicon을 새 원본에서 생성하고, icon 생성 script를 Tauri CLI와 Node 기반의 교차 플랫폼 방식으로 전환했다.
- 기존 HOP screenshot을 대체 이미지 없이 제거하고, upstream script와 baseline 테스트의 제품 명칭을 Alhangeul로 맞췄다.
- `scripts/update-upstream.sh`의 `rhwp` submodule 갱신 동작과 검증 순서는 변경하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

- 제품 식별자, 패키지명, 파일명, UI 문구와 updater 경계는 계획한 범위에서 전면 변경했다.
- `rhwp` renderer, 편집기 동작, 파일 열기·저장, PDF export, local font 처리의 제품 기능 로직은 유지했다.
- updater 제거는 의도한 기능 삭제다. 새 저장소의 독립 릴리스 주소를 추정하여 대체하지 않았다.
- `pnpm-lock.yaml`은 workspace 이름을 별도 항목으로 저장하지 않아 `pnpm install --lockfile-only` 후 내용 변경이 발생하지 않았고, frozen install로 일관성을 확인했다.

## 검증 결과

- `corepack enable`: 통과
- `pnpm install --lockfile-only`: 통과
- `pnpm install --frozen-lockfile`: 통과
- `pnpm run test:upstream`: 12개 테스트 통과
- `pnpm run test:studio`: 22개 test file, 115개 테스트 통과
- `pnpm run build:studio`: 통과. 기존 Vite dynamic import 및 500 kB 초과 chunk 경고만 발생했다.
- 이전 package·binary·identifier·updater 식별자 `rg` 부재 검사: 통과
- `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check`: 통과
- `git diff --check`: 통과
- 추가 경계 검사에서 HOP 제품 식별자, updater 식별자와 삭제 대상 파일의 잔존이 없음을 확인했다.
- icon source SHA-256 일치와 생성 대상 PNG·ICO·favicon 존재를 확인했다.
- `cargo metadata --locked --offline --no-deps`: 통과

## 잔여 위험

- 계획에 따라 macOS에서 `pnpm run test:desktop`, `pnpm run clippy:desktop`, Tauri build를 실행하지 않았다.
- Windows/Linux native compile·bundle과 shell/desktop 환경의 실제 icon 표시는 후속 플랫폼 CI와 수동 검증이 필요하다.
- 공식 문서, 사이트와 GitHub workflow에는 아직 이전 HOP/macOS 전용 설명과 식별자가 남아 있으며 Stage 3 범위에서 정리해야 한다.
- 버전 결정, 서명, 배포와 독립 updater 재도입은 이번 단계 범위가 아니다.

## 다음 단계 영향

Stage 3에서는 현재 구현된 Alhangeul 제품 경계를 기준으로 provenance 문서, 공식 문서·사이트, issue template와 workflow를 독립화한다. 제품 경계 검사 script와 Windows/Linux desktop workflow를 추가하되 GitHub Actions 활성화와 실제 배포는 별도 승인 범위로 유지한다.

## 승인 요청

Stage 2 구현과 검증을 완료했다. 이 보고서와 Stage 2 변경을 묶어 커밋한 뒤, 작업지시자의 명시 승인 후 Stage 3 — 공식 문서·사이트·워크플로 독립화를 시작한다.
