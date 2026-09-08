# Task #19 Stage 4.1 완료 보고서 — PDF reaper test와 native gate 보정

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [`task_m010_19_impl.md`](../plans/task_m010_19_impl.md)
Stage: 4.1

## 단계 목적

Stage 4 첫 exact candidate `41bbf015ad140a4c7ff5db58110ea4d292798261`의 CI run
`32693530357`에서 확인한 Rust test compile 오류를 production visibility 변경 없이
보정한다. sibling module test의 private field 직접 접근을 공개된 job 회수 동작 검증으로
바꾸고, 기존 artifact workflow가 Windows/Linux x64 양쪽에서 Rust test와 Clippy를
필수로 통과한 뒤 Tauri production build에 진입하도록 Stage 4 native gate를 닫는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/src/pdf_temp_cleanup_tests.rs` | 148 LOC. reaper 뒤 private `jobs` field 대신 `discard_for_window("main") == 0`으로 회수 결과 검증 |
| `.github/workflows/alhangeul-desktop.yml` | 318 LOC. Windows/Linux x64 `native_checks`와 conditional Rust test·Clippy gate 추가 |
| `tests/actions-workflows.test.mjs` | 425 LOC. matrix별 native gate와 test·Clippy·Tauri build 순서 계약 고정 |
| `mydocs/plans/task_m010_19_impl.md` | 첫 exact-SHA 실패 증거, 승인된 Stage 4.1 범위·검증·commit 기록 |
| `mydocs/orders/20260824.md` | Stage 4.1 로컬 gate 완료와 exact-SHA 재검증 진행 상태 반영 |
| `mydocs/working/task_m010_19_stage4.1.md` | 보정 산출물·로컬 검증·remote 잔여 gate 기록 |

workflow는 기존 307 LOC에서 318 LOC, 중앙 workflow contract test는 기존 409 LOC에서
425 LOC가 됐다. 둘 다 기존 단일 orchestration/contract inventory 역할 안에서 matrix
boolean과 인접한 두 command만 추가했으며 새 helper 책임을 만들지 않았다. production
Rust test 파일은 148 LOC를 유지하고 production 함수·파일 크기는 변하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

PDF snapshot, native job/reaper, startup orphan cleanup과 Studio pipeline production 코드는
수정하지 않았다. `PdfExportJobs.jobs` visibility와 public API도 넓히지 않았다. 보정된
assertion은 `reap_once()`가 job을 제거했다면 같은 owner cleanup이 제거할 항목이 없어
`0`을 반환하고, job이 남았다면 `1`을 반환하는 기존 동작으로 같은 결과를 관찰한다.

artifact workflow는 exact checkout, platform-neutral gate, Linux arm64 package build,
bundle inventory와 Windows installer smoke를 보존한다. `native_checks`는 Windows x64와
Linux x64만 활성화해 Stage 4 대상 두 환경의 Rust test·Clippy를 Tauri build 앞에 둔다.
공식 문서와 사용자 문서는 변경하지 않았다.

## 검증 결과

실행 명령:

```bash
node --test tests/actions-workflows.test.mjs
actionlint .github/workflows/alhangeul-desktop.yml
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml -- --check
git diff --check
```

결과:

- OK — focused workflow contract test `12/12` 통과. 두 x64 matrix만 `native_checks: true`이고 Rust test·Clippy가 Tauri build보다 앞선다.
- OK — `actionlint` 오류 없이 통과.
- OK — `pnpm run check:product-boundary`: 230 files scanned, 통과.
- OK — `pnpm run test:automation`: 201 tests 통과.
- OK — `pnpm run test:upstream`: 35 tests 통과.
- OK — `pnpm run test:studio`: 22 files, 112 tests 통과.
- OK — `pnpm run build:studio`: TypeScript와 Vite production build 통과, 214 modules transformed. 기존 CanvasKit externalization·dynamic import·chunk size 경고는 non-fatal이다.
- OK — Rust format check와 `git diff --check` 모두 출력 없이 통과.

## 잔여 위험

- macOS에서는 프로젝트 정책에 따라 Rust desktop test·Clippy와 Tauri build를 실행하지 않았다. private field compile 오류의 실제 회복과 OS별 cfg는 이 commit의 새 exact SHA를 사용하는 CI와 Windows/Linux x64 artifact job에서 확인해야 한다.
- 기존 `linux-arm64` job은 package build만 유지하며 Stage 4의 x64 native test 수용을 대신하지 않는다.
- repository에는 Windows GUI automation harness가 없다. Windows HWP/HWPX direct PDF, atomic replace와 source state는 artifact build 성공과 구분한 실제 Windows 수동 gate가 필요하다.

## 다음 단계 영향

- 이 보고서와 보정 source를 한 commit으로 묶고 `publish/task19`에 non-force push해 첫 candidate를 폐기한다.
- 새 exact SHA에서 CI와 desktop artifact workflow를 처음부터 다시 실행한다. Linux/Windows x64 Rust test·Clippy와 Tauri build가 모두 성공하기 전에는 Linux GUI/PDF acceptance로 넘어가지 않는다.
- native build 성공 뒤 같은 SHA와 Linux x64 artifact로 Linux GUI acceptance를 실행하고 evidence를 read-back한다. Windows GUI 수동 증거 없이 Stage 4를 완료 처리하지 않는다.

## 승인 요청

- 작업지시자가 2026-08-24 승인한 Stage 4.1 범위에는 이 보정 commit의 exact-SHA CI·artifact 재실행까지 포함된다. 원격 gate 결과를 Stage 4 완료 판단에 반영한다.
