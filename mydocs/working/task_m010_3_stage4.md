# Task #3 Stage 4 완료보고서 — Stable pin 수용 기준 통합 검증

GitHub Issue: [#3](https://github.com/postmelee/alhangeul-tauri/issues/3)
구현계획서: [`task_m010_3_impl.md`](../plans/task_m010_3_impl.md)
Stage: 4

## 단계 목적

Stage 1~3에서 구현한 strict updater, `rhwp v0.8.2` source·native·WASM pin, provenance verifier, Studio adapter와 운영 문서를 Issue #3의 포함·제외 범위 및 수용 기준에 교차 대조하는 최종 구현 단계다.

새 기능이나 native 검증을 추가하지 않고 플랫폼 중립 명령, mismatch fixture, 저장소 remote와 Actions 권한을 읽기 전용으로 확인했다. 검증 실패가 없어 Stage 1~3 산출물의 소스 보정은 수행하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_3_stage4.md` | Issue #3 수용 기준별 증거, Stage 4 통합 검증 결과, 실행하지 않은 native/E2E 범위와 후속 Issue 후보를 기록했다. |

Stage 4 제품 코드·공식 문서·자동화 변경은 없다. Stage 1 진입 직전 commit `0de63b7`부터 Stage 3 commit `78b8592`까지 실제 diff는 submodule과 generated WASM을 포함해 31개 경로, 5,843 insertions, 468 deletions이며 Stage 4에서는 이 상태를 읽기 전용으로 검증했다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 4에서 제품·사용자·기여자용 공식 문서 본문은 수정하지 않았다. Stage 3에서 현행화한 `README.md`, `docs/DEVELOPMENT.md`, `docs/architecture/UPSTREAM.md`를 Issue 본문의 pin, rollback, known issue 요구사항에 대조했다.

source submodule, native Cargo lock, generated WASM, `rhwp-core.lock`, adapter와 테스트도 수정하지 않았다. Windows/Linux native compile·bundle, macOS Tauri build/test, GitHub Actions 활성화, release·배포는 실행하지 않았다.

## 검증 결과

구현계획서의 Stage 4 필수 명령:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
gh api repos/postmelee/alhangeul-tauri/actions/permissions
git diff --check
```

결과:

- OK — pnpm lockfile이 변경 없이 frozen install로 재현됨
- OK — product boundary가 176개 파일을 검사해 HOP 제품 경계와 지원하지 않는 플랫폼 식별자 재도입을 거부
- OK — pin verifier가 `v0.8.2`, resolved commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`와 managed artifact 6개를 승인
- OK — upstream suite 31/31 통과
- OK — Studio Vitest 21 files, 114/114 통과
- OK — TypeScript compile과 Vite production build 통과, 181 modules 변환
- OK — offline·locked Cargo metadata가 `rhwp` path dependency를 `third_party/rhwp`로 해석하고 종료 코드 0으로 통과
- OK — Rust format 검사가 출력 없이 종료 코드 0으로 통과
- OK — Actions API 응답이 `{"enabled":false,"sha_pinning_required":false}`로 저장소 실행 권한 비활성을 확인
- OK — `git diff --check`가 출력 없이 종료 코드 0으로 통과

Issue #3 수용 기준 대조:

| 수용 기준 | 결과 | 증거 |
|---|---|---|
| Stable tag와 resolved commit 명시 | OK | `rhwp-core.lock`: `v0.8.2`, `9b16aa9e23f476e2b335d7c029fc9f24a199d63c` |
| submodule·Cargo·WASM 동일 release 정렬 | OK | 실제 저장소 verifier, tag ref·submodule HEAD·Cargo/WASM version 검사 |
| branch/floating ref 없는 strict 갱신 | OK | 필수 tag/commit, branch·positional ref·legacy 환경변수 거부 fixture |
| tag/commit mismatch 거부 | OK | 기존 checkout을 보존하며 mismatch를 거부하는 updater fixture |
| dirty submodule 거부 | OK | updater preflight와 read-only verifier의 독립 fixture |
| Cargo/WASM/artifact 변조 거부 | OK | Cargo version, WASM package version, Cargo fingerprint, artifact hash·size·missing fixture |
| known issue와 Alhangeul 회귀 분리 | OK | `docs/architecture/UPSTREAM.md`의 pinned source·동일 재현 조건·실패 지점 분류 기준 |
| 실패 rollback 절차 | OK | `docs/DEVELOPMENT.md`의 현재 변경 확인 → 명시적 경로 restore → submodule update → 재검증 |
| HOP 지속 의존성 부재 | OK | remote는 Alhangeul `origin` 하나이며 manifest·lock·`.gitmodules`에 HOP repository/package 없음 |

추가 read-only 확인:

- `git -C third_party/rhwp rev-parse HEAD`와 `git -C third_party/rhwp rev-parse 'v0.8.2^{commit}'`은 모두 lock commit과 일치했다.
- Task #3 범위에서 `.github/workflows` diff는 없다. workflow 파일을 변경하거나 Actions를 활성화하지 않았다.
- HOP 문자열은 provenance·운영 규칙·검사 코드처럼 승인된 역사 경계에만 남아 있고 remote·package·submodule로 연결되지 않는다.
- `print-pdf-issue3126`(#3450), `issue-2214`(#3412)는 이번 플랫폼 중립 suite가 직접 실행하지 않는 upstream Studio E2E다. 이번 성공 결과로 해결·면제 처리하지 않았다.

production build는 성공했지만 `/images/icon_small_ko_dark.svg` runtime 해석, Tauri API static/dynamic import 혼용과 500 kB 초과 chunk 경고를 유지했다. Cargo metadata는 승인된 명령에 `--format-version`이 없다는 호환성 경고를 출력했지만 metadata 해석은 성공했다.

## 잔여 위험

- Windows/Linux native Rust test·clippy, Tauri compile·bundle과 설치 artifact smoke는 아직 실행하지 않았다.
- file-backed local font를 실제 Windows/Linux native catalog에서 읽어 CanvasKit typeface로 등록하는 동작은 mock 기반 Studio 테스트만 통과했다.
- upstream `print-pdf-issue3126`, `issue-2214` E2E known issue는 해결되지 않았고 이번 타스크 수용 결과에 포함하지 않는다.
- SVG runtime 자산, ineffective dynamic import와 대형 frontend chunk 경고는 별도 자산·성능 작업 후보다.
- `v0.8.2`는 lightweight tag이므로 `git submodule status`의 사람이 읽는 describe 문자열이 이전 annotated tag 기준으로 보일 수 있다. 운영 판단은 `rhwp-core.lock`과 exact `v0.8.2^{commit}` verifier를 사용해야 한다.

## 다음 단계 영향

- Stage 4는 구현계획의 마지막 단계다. 승인 후 `task-final-report` 절차로 Issue #3 최종 보고서, 오늘할일 완료 처리, 최종 검증과 `devel` 대상 PR 게시를 진행한다.
- 후속 Issue 후보는 Windows/Linux CI·native Tauri smoke와 Actions 활성화, 실제 OS local-font/CanvasKit smoke, frontend runtime 자산·chunk 경고 정리다. 현재 열린 Issue 목록에는 #3만 있으므로 이번 단계에서 새 Issue를 임의 등록하지 않았다.
- 최종 보고서에서도 native/E2E 미실행 항목을 성공 표에 포함하지 않고 검증 한계로 유지한다.
- release, 배포, 서명, package 게시와 macOS 검증은 계속 제외한다.

## 승인 요청

- Stage 4 산출물과 검증 결과를 승인하면 `task-final-report`로 Issue #3 최종 보고와 PR 게시 단계로 진행한다.
