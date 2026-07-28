# Task #3 Stage 3 완료보고서 — rhwp v0.8.2 adapter 호환성과 upstream 운영 문서 정리

GitHub Issue: [#3](https://github.com/postmelee/alhangeul-tauri/issues/3)
구현계획서: [`task_m010_3_impl.md`](../plans/task_m010_3_impl.md)
Stage: 3

## 단계 목적

Stage 2에서 원자적으로 고정한 `rhwp v0.8.2` source·native·WASM을 실제 Alhangeul Studio host가 소비할 수 있는지 먼저 검증하고, 실패한 API 경계를 Alhangeul 소유 adapter에서만 최소 보정하는 단계다.

수정 전 `pnpm run test:studio`는 21 files, 113 tests가 통과했지만 `pnpm run build:studio`는 v0.8.2가 추가한 command context, edit mode, style snapshot, local-font/CanvasKit type과 `@noble/hashes` module 계약에서 실패했다. upstream source와 generated WASM은 수정하지 않고 adapter·tooling 경계를 맞췄으며, 현재 Stable pin과 strict 갱신·rollback·known issue 분류를 공식 문서에 현행화했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/main.ts` | 671줄, +30/-4. v0.8.2 `EditorContext`의 format/table/form/paragraph-mark 상태와 `setEditMode` service를 연결하고, `MenuBar`에 command registry를 전달했다. |
| `apps/studio-host/src/ui/style-edit-dialog.ts` | 321줄, +54/-8. v0.8.2 생성자 계약, base char/paragraph shape, 250자 이름 제한과 snapshot operation을 반영하면서 기존 비동기 font mod 해석을 유지했다. |
| `apps/studio-host/src/core/local-fonts.ts` | 433줄, +185/-4. Tauri native font catalog 위에 v0.8.2 local-font record/snapshot/state/resolve/CanvasKit byte-loading API를 제공하고 force·clear 시 runtime cache를 일관되게 초기화한다. |
| `apps/studio-host/src/core/local-fonts.test.ts` | 192줄, +59. native catalog 탐지부터 PostScript name 해석, file-backed byte load, 상태와 clear 계약까지 회귀 테스트를 추가했다. |
| `apps/studio-host/src/core/font-loader.ts` | 218줄, +5. v0.8.2 CanvasKit renderer가 요구하는 bundled font source type을 adapter 경계에 노출했다. |
| `apps/studio-host/package.json`, `pnpm-lock.yaml` | upstream Studio가 사용하는 `@noble/hashes 2.2.0`을 Studio host의 직접 의존성으로 고정했다. |
| `apps/studio-host/tsconfig.json`, `apps/studio-host/vite.config.ts` | upstream의 명시적 `.ts` import와 `@noble/hashes/*` TypeScript/Vite 해석 경로를 추가했다. |
| `README.md` | 현재 Stable pin `v0.8.2`, resolved commit과 `rhwp-core.lock`/운영 문서 링크를 간단히 반영했다. |
| `docs/DEVELOPMENT.md` | strict apply 명령, read-only verifier, platform-neutral 검증과 자동 reset 없는 명시적 경로 rollback 절차를 기록했다. |
| `docs/architecture/UPSTREAM.md` | source·native·WASM pin 기준, lock schema·managed artifact, updater/writer/verifier 소유권, dirty/floating ref 거부와 v0.8.2 known issue 분류 기준을 공식화했다. |

보고서 작성 전 Stage 3 source·문서 diff는 12개 파일, 435 insertions, 42 deletions다. `third_party/rhwp`, vendored WASM과 native Cargo lock에는 Stage 3 변경이 없다.

## 본문 변경 정도 / 본문 무손실 여부

`README.md`는 기존 의존성 항목 한 줄을 현재 pin과 관련 링크 세 줄로 교체했으며 제품 설명과 개발 시작 본문은 유지했다.

`docs/DEVELOPMENT.md`는 완료된 release pin 상태와 승인된 strict updater 계약에 맞지 않던 전환기 설명을 교체하고, 계획에서 승인된 검증·rollback 절차만 추가했다. `docs/architecture/UPSTREAM.md`는 과거 `v0.7.13`과 후속 계획 중심 문단을 현재 `v0.8.2` 운영 계약으로 현행화했으며 코드 소유권 문단은 유지했다. 다른 공식 문서는 수정하지 않았다.

코드에서는 Alhangeul의 document load 보정, unsaved guard, upstream engine 위임, About version 분리와 PDF menu-only 경계를 유지했다. 신규 upstream 기능을 backport하거나 engine/renderer source를 수정하지 않았다. local-font adapter는 기존 Tauri native catalog와 authoring 차단 정책을 유지하면서 v0.8.2 소비자가 요구하는 export surface만 추가했다.

## 검증 결과

구현계획서의 Stage 3 필수 명령:

```bash
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
rg -n 'v0\.8\.2|9b16aa9e23f476e2b335d7c029fc9f24a199d63c|rhwp-core\.lock' README.md docs/DEVELOPMENT.md docs/architecture/UPSTREAM.md
! rg -n 'v0\.7\.13|b3e16ef212af81ef37d973ddb86d6816d3804642' README.md docs/DEVELOPMENT.md docs/architecture/UPSTREAM.md scripts tests package.json
git diff --check
```

결과:

- OK — pin verifier가 `v0.8.2`, resolved commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`와 managed artifact 6개를 승인
- OK — upstream suite 31/31 통과
  - Alhangeul renderer baseline과 adapter 경계 6개
  - pin writer·실제 저장소·mismatch fixture 13개
  - updater 정상·거부·실패 보존·실행 순서 fixture 12개
- OK — Studio Vitest 21 files, 114/114 통과
- OK — TypeScript compile과 Vite production build 통과, upstream/adapter 181 modules 변환
- OK — Rust format 검사가 출력 없이 종료 코드 0으로 통과
- OK — 세 공식 문서에서 현재 tag, commit과 `rhwp-core.lock` 참조 확인
- OK — 공식 문서·script·test·`package.json` 범위에서 이전 `v0.7.13` tag와 commit 참조 없음
- OK — `git diff --check`가 출력 없이 종료 코드 0으로 통과

추가 재현성 검증:

```bash
pnpm install --frozen-lockfile
```

- OK — lockfile 변경 없이 pnpm workspace 의존성 설치 상태가 재현됨

빌드는 성공했지만 runtime에서 해석할 `/images/icon_small_ko_dark.svg`, Tauri API의 정적·동적 import 혼용, 500 kB 초과 chunk 경고를 출력했다. 경고는 Stage 3 수용을 차단하지 않으며 이번 adapter 호환 범위에서 build failure로 승격되지 않았다.

upstream changelog의 `print-pdf-issue3126`(#3450), `issue-2214`(#3412)는 이번 Alhangeul 단위 테스트·production build가 직접 실행하는 upstream Studio E2E가 아니다. 따라서 이번 통과 결과로 해결 또는 성공 처리하지 않았고, 같은 pinned source·재현 조건·실패 지점일 때만 upstream known issue로 분류한다는 기준을 공식 문서에 남겼다.

## 잔여 위험

- Windows/Linux native compile·bundle, Tauri smoke와 실제 OS font catalog 연동은 후속 플랫폼/CI task 범위이며 이번 단계에서 검증하지 않았다.
- `print-pdf-issue3126`과 `issue-2214` upstream Studio E2E known issue는 그대로 남아 있다. Stage 4에서는 이번 test/build 결과와 분리된 검증 한계로 유지해야 한다.
- production build의 SVG runtime 해석, ineffective dynamic import와 대형 chunk 경고는 실패가 아니지만 후속 frontend 자산·성능 작업 후보로 남는다.
- local-font 호환 회귀는 Tauri invoke mock으로 검증했다. file-backed font byte를 실제 Windows/Linux CanvasKit typeface로 등록하는 native smoke는 아직 증명하지 않았다.
- `local-fonts.ts`는 Tauri catalog와 v0.8.2의 단일-module export 계약을 한 override에서 함께 제공해 권장 300줄을 넘는다. 승인된 Stage 3 산출물의 “신규 파일 없음”과 최소 호환 보정 범위를 지키기 위해 이번 단계에서 구조 분리를 추가하지 않았으며, 역할이 더 늘어날 때 별도 계획으로 분리해야 한다.

## 다음 단계 영향

- Stage 4는 Stage 1~3 실제 diff를 Issue #3 수용 기준과 교차 검증하고, pin 변조 fixture·HOP dependency 부재·GitHub Actions 비활성 경계를 확인한다.
- Stage 4에서 새 기능이나 upstream known issue 보정을 추가하지 않는다. 플랫폼 중립 검증에서 새 Alhangeul 회귀가 발견될 때만 Issue #3 범위의 최소 보정을 검토한다.
- Windows/Linux native compile·bundle, macOS Tauri build/test, 공개 release는 실행하지 않는다.
- Stage 4 진입 전까지 Stage 3 adapter·문서 산출물과 이 보고서를 한 커밋으로 고정하고 작업지시자 승인을 기다린다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4의 Issue 수용 기준 통합 검증으로 진행한다.
