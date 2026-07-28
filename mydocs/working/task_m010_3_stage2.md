# Task #3 Stage 2 완료보고서 — rhwp v0.8.2 source·native·WASM 원자적 고정

GitHub Issue: [#3](https://github.com/postmelee/alhangeul-tauri/issues/3)
구현계획서: [`task_m010_3_impl.md`](../plans/task_m010_3_impl.md)
Stage: 2

## 단계 목적

Stable release tag와 resolved commit을 함께 요구하는 Stage 1 계약 위에서 `rhwp v0.8.2` source, desktop native dependency graph와 bundled WASM을 하나의 검증 가능한 pin으로 고정하는 단계다.

source checkout 후 Cargo lock 갱신, stale 출력을 재사용하지 않는 fresh WASM build, generated allowlist 동기화, deterministic provenance 기록과 read-only 검증을 순서대로 연결해 source와 binary가 서로 다른 버전을 가리키는 상태를 자동으로 거부한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `third_party/rhwp` | gitlink를 `b3e16ef212af81ef37d973ddb86d6816d3804642`에서 Stable `v0.8.2`의 `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`으로 갱신했다. submodule 내부 파일은 수정하지 않았다. |
| `apps/desktop/src-tauri/Cargo.lock` | 6,732줄, +83/-7. `rhwp 0.7.13 → 0.8.2`, `quick-xml 0.40.1 → 0.41.0`과 v0.8.2가 요구하는 신규 transitive dependency 8개를 반영했다. |
| `apps/studio-host/vendor/rhwp-core/*` | `wasm-pack 0.15.0 --target web --release` fresh build 결과로 package/JS/type/WASM 5개를 교체했다. `rhwp_bg.wasm`은 7,189,445 bytes이며 upstream `LICENSE` 1,072 bytes는 기존과 동일해 source diff가 없다. |
| `rhwp-core.lock` | 신규 38줄. repository, release tag, resolved commit, upstream Cargo lock SHA-256, wasm-pack version/profile과 managed artifact 6개의 경로·SHA-256·크기를 기록한다. |
| `scripts/write-rhwp-pin.mjs` | 신규 106줄. 현재 source/native/WASM 정합성을 먼저 확인하고 timestamp 없는 deterministic TOML을 임시 파일과 rename으로 기록한다. |
| `scripts/verify-rhwp-pin.mjs` | 신규 471줄. strict lock schema, canonical repository, submodule HEAD/tag/commit, 세 version 경계, source Cargo lock fingerprint와 artifact hash/size를 읽기 전용으로 검증한다. |
| `scripts/update-upstream.sh` | 282줄. preflight → tag resolve/checkout → Cargo lock → fresh WASM → vendor sync → lock write/verify 순서를 완성하고, 실패 시 staging만 정리하며 source와 사용자 변경은 자동 reset하지 않는다. |
| `tests/update-upstream.test.mjs` | 586줄, 12개 fixture. 전체 apply 순서, annotated/lightweight tag, wasm-pack version, staging cleanup, partial state 보존과 platform-neutral 검증 순서를 고정한다. |
| `tests/rhwp-pin.test.mjs` | 신규 270줄, 13개 test. deterministic writer와 실제 저장소 pin을 승인하고 repo/tag/commit/version/fingerprint/hash/size/missing/dirty 변조를 거부한다. |
| `tests/rhwp-baseline.test.mjs`, `package.json` | hard-coded `v0.7.13` 기준을 `rhwp-core.lock` 기반으로 바꾸고 `check:rhwp-pin`과 pin test suite를 공식 명령에 연결했다. |

추적 중인 기존 파일의 Stage 2 source diff는 11개 파일, 3,958 insertions, 393 deletions이며 여기에 신규 provenance·writer·verifier·fixture 4개 파일이 추가됐다. 대규모 JS/type diff와 WASM binary 증가는 upstream v0.8.2의 생성 결과이며 수작업으로 편집하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

코드·생성물 작업이므로 문서 본문 무손실 여부는 해당하지 않는다.

`third_party/rhwp` 내부 source는 upstream release를 detached checkout했을 뿐 수정하지 않았고 최종 `git status --porcelain --untracked-files=all`이 비어 있다. WASM은 submodule 내부의 검증된 prefix 임시 디렉터리에서 생성했으며 성공·실패 후 모두 제거했다. vendor 파일에는 로컬 절대 경로나 staging 디렉터리 문자열이 포함되지 않는다.

upstream `LICENSE`는 allowlist와 lock 관리 대상에 포함했지만 이전 bundle과 byte-identical하여 별도 diff가 없다. macOS Tauri build, native test, GitHub Actions 활성화, release·서명·updater 작업은 수행하지 않았다.

## 검증 결과

구현계획서의 Stage 2 필수 명령:

```bash
wasm-pack --version
pnpm run check:rhwp-pin
pnpm run test:upstream
cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps
git submodule status third_party/rhwp
git diff --submodule=log -- third_party/rhwp apps/desktop/src-tauri/Cargo.lock apps/studio-host/vendor/rhwp-core rhwp-core.lock
git diff --check
```

결과:

- OK — `wasm-pack 0.15.0`
- OK — pin verifier가 `v0.8.2`, resolved commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개를 승인
- OK — upstream suite 31/31 통과
  - Alhangeul baseline/adapter 경계 6개
  - pin writer·실제 저장소·mismatch fixture 13개
  - updater 정상·거부·실패 보존·실행 순서 fixture 12개
- OK — Cargo metadata가 `--locked --offline --no-deps`로 종료 코드 0 통과
- OK — submodule HEAD가 `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`
- OK — tag `v0.8.2^{commit}`, submodule HEAD와 lock commit이 모두 동일함을 verifier로 재확인
- OK — Cargo lock diff는 `rhwp 0.8.2`가 요구하는 version과 transitive dependency 변화로 한정
- OK — `git diff --check`가 출력 없이 종료 코드 0으로 통과

추가 정합성:

- upstream `Cargo.lock` SHA-256:
  `64ff4041c1874c01c7a901b28df2639082836ced44df392cd37b3227d4772279`
- vendored `package.json`, upstream `Cargo.toml`, desktop `Cargo.lock`의 `rhwp` version:
  모두 `0.8.2`
- fresh build 후 submodule 내부 tracked/untracked 변경:
  없음

## 잔여 위험

- upstream v0.8.2 release note에 기록된 `print-pdf-issue3126`(#3450), `issue-2214`(#3412) 실패는 upstream 기준선으로 남아 있다. Stage 3 검증에서 Alhangeul 회귀와 구분해야 한다.
- checkout 중 Git LFS가 `pdf-large/hwpx/2026_oss_rst.pdf`에 대해 pointer 경고를 출력했다. 최종 submodule clean 검사와 source/tag/commit 검증은 통과했고 해당 PDF는 이번 WASM build 입력이 아니지만, upstream 전체 fixture를 직접 실행할 때 환경별 LFS 상태를 구분해야 한다.
- 생성 artifact hash는 `wasm-pack 0.15.0`과 release profile을 기록하지만 host toolchain 전체를 재현 환경으로 고정하지는 않는다. 현재 pin 검증은 배포될 byte의 변조 탐지를 보장한다.
- Stage 2는 source/native/WASM provenance 경계까지만 확인했다. Alhangeul Studio adapter의 v0.8.2 API 호환성과 build 결과는 Stage 3 범위다.
- Windows/Linux native compile·bundle과 CI 활성화는 후속 task 범위이며 이번 단계에서 수행하지 않았다.

## 다음 단계 영향

- Stage 3는 `rhwp-core.lock`을 현재 Stable pin의 단일 진실 원천으로 사용하고 Studio adapter·override 경계를 v0.8.2 API에 맞춰 검증한다.
- `pnpm run test:studio`, `pnpm run build:studio`, product boundary와 known upstream failure 분류를 실행하고 필요한 경우에만 Alhangeul 소유 adapter를 최소 보정한다.
- `README.md`, `docs/DEVELOPMENT.md`, `docs/architecture/UPSTREAM.md`의 이전 v0.7.13·환경변수 기반 갱신 설명을 strict command와 rollback 절차로 현행화한다.
- upstream source와 generated vendor는 수작업으로 수정하지 않고 adapter·문서 변경만 Alhangeul 소유 경계에서 수행해야 한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3의 v0.8.2 Studio adapter 호환성 검증·최소 보정과 운영 문서 현행화로 진행한다.
