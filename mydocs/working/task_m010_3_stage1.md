# Task #3 Stage 1 완료보고서 — Stable upstream 갱신 계약과 안전장치

GitHub Issue: [#3](https://github.com/postmelee/alhangeul-tauri/issues/3)
구현계획서: [`task_m010_3_impl.md`](../plans/task_m010_3_impl.md)
Stage: 1

## 단계 목적

branch, floating ref와 legacy 환경변수를 허용하던 `rhwp` submodule 갱신 경로를 제거하고 Stable release tag와 resolved commit을 함께 요구하는 명시적 계약으로 바꾸는 단계다.

실제 `v0.8.2` source·Cargo lock·WASM을 반영하기 전에 입력 검증, tag resolve, dirty source 보호와 실패 시 기존 checkout 보존을 fixture로 고정해 Stage 2의 원자적 pin 작업이 사용할 안전한 출발점을 만든다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/update-upstream.sh` | 146줄, +115/-23. `--tag`/`--commit` 필수 CLI, Stable SemVer·SHA 검증, legacy 입력 거부, remote·dirty·tag/commit 검증과 platform-neutral `--run-checks`를 구현했다. |
| `tests/update-upstream.test.mjs` | 396줄, +215/-45. lightweight/annotated tag 정상 경로와 입력·mismatch·remote·dirty·legacy 입력 거부 및 검증 명령 순서를 10개 fixture로 고정했다. |

전체 Stage 1 source diff는 2개 파일, 330 insertions, 68 deletions다. 구현계획의 필수 계약 외에 `.gitmodules` URL과 submodule `origin` 불일치 거부, SemVer leading-zero 거부를 같은 안전장치 범위에서 추가했다.

## 본문 변경 정도 / 본문 무손실 여부

코드·테스트 작업이므로 문서 본문 무손실 여부는 해당하지 않는다.

기존 updater의 핵심 목적인 `third_party/rhwp` source checkout과 선택적 검증 실행은 유지했지만, branch·floating ref·legacy 환경변수 호환성은 Stable 운영 정책에 따라 의도적으로 제거했다. script executable mode `100755`는 보존했다.

실제 submodule HEAD는 계속 `v0.7.13`의 `b3e16ef212af81ef37d973ddb86d6816d3804642`이며 Cargo lock과 bundled WASM도 변경하지 않았다. native Tauri build, `cargo test`, clippy와 macOS 검증 명령은 실행하거나 추가하지 않았다.

## 검증 결과

구현계획서의 Stage 1 필수 명령:

```bash
node --test tests/update-upstream.test.mjs
bash -n scripts/update-upstream.sh
git diff --check
```

결과:

- OK — updater fixture 10/10 통과
  - lightweight/annotated tag 정상 적용
  - 필수 tag/commit·Stable SemVer·40자리 SHA 검증
  - tag/commit mismatch 시 기존 checkout 보존
  - branch/floating/positional ref와 legacy 환경변수 거부
  - `.gitmodules`와 `origin` 불일치 거부
  - missing/dirty submodule 거부
  - platform-neutral `--run-checks` 순서 검증
- OK — `bash -n`이 출력 없이 종료 코드 0으로 통과
- OK — `git diff --check`가 출력 없이 종료 코드 0으로 통과

추가 회귀 검증:

```bash
pnpm run test:upstream
pnpm run check:product-boundary
scripts/update-upstream.sh --help
```

- OK — 전체 upstream suite 16/16 통과
- OK — product boundary 172개 파일 검사 통과
- OK — help가 strict `--tag <vX.Y.Z> --commit <40-char-sha> [--run-checks]` 계약과 floating ref·legacy 환경변수 금지를 표시

## 잔여 위험

- Stage 1 updater는 source checkout 안전장치만 완성한 상태다. Cargo lock, fresh WASM, `rhwp-core.lock` write/verify는 Stage 2 전까지 연결되지 않는다.
- `--run-checks`에는 Stage 2에서 만들 `pnpm run check:rhwp-pin`이 아직 포함되지 않는다.
- `docs/DEVELOPMENT.md`와 `docs/architecture/UPSTREAM.md`에는 이전 환경변수 기반 사용 예가 남아 있어 task branch 안에서 script와 공식 문서가 일시적으로 다르다. Stage 3에서 strict 명령과 rollback 절차로 교체한다.
- custom local remote가 `.gitmodules` URL과 다르면 의도적으로 실패한다. 이는 다른 source를 Stable tag로 오인하는 것을 방지하는 정책이다.
- Windows/Linux native compile·bundle은 후속 CI task 범위이며 이번 단계에서 검증하지 않았다.

## 다음 단계 영향

- Stage 2는 이 strict updater를 `--tag v0.8.2 --commit 9b16aa9e23f476e2b335d7c029fc9f24a199d63c` 기준으로 사용한다.
- source checkout 후 desktop Cargo lock 갱신, `wasm-pack 0.15.0` fresh release build, generated allowlist 동기화, deterministic `rhwp-core.lock` write와 read-only verify를 같은 pin 경계로 연결해야 한다.
- Stage 2 fixture는 `check:rhwp-pin` 추가와 source → Cargo → WASM → lock → verify 실행 순서를 반영해 `--run-checks` 최종 계약을 완성해야 한다.
- Stage 2 진입 전까지 실제 submodule pointer와 binary artifact를 변경하지 않는다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2의 `v0.8.2` source·native·WASM 원자적 고정으로 진행한다.
