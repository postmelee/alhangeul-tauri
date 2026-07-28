# Task #3 최종 보고서 — rhwp v0.8.2 Stable release pin

GitHub Issue: [#3](https://github.com/postmelee/alhangeul-tauri/issues/3)
마일스톤: M010

## 작업 요약

- 대상 이슈: #3
- 마일스톤: M010
- 단계 수: 4
- 작업 목적: `rhwp v0.8.2` source·native·WASM을 하나의 검증 가능한 Stable pin으로 고정하고, branch/floating ref 없는 갱신·검증·rollback 운영 기준을 확립한다.

Stage 1에서 Stable tag와 resolved commit을 모두 요구하는 strict updater 계약과 실패 안전장치를 만들었다. Stage 2에서 `third_party/rhwp`, desktop Cargo lock과 fresh WASM을 `v0.8.2` commit에 맞추고 deterministic `rhwp-core.lock` writer와 read-only verifier를 도입했다. Stage 3에서 v0.8.2 Studio API에 필요한 Alhangeul adapter를 최소 보정하고 공식 upstream·개발 문서를 현행화했다. Stage 4에서 Issue #3 수용 기준, mismatch fixture, HOP 지속 의존성 부재와 Actions 비활성을 통합 검증했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `third_party/rhwp`, `apps/desktop/src-tauri/Cargo.lock` | source gitlink와 native dependency graph를 `rhwp v0.8.2`로 갱신 | Rust core·native dependency provenance |
| `apps/studio-host/vendor/rhwp-core/**` | 동일 source commit에서 `wasm-pack 0.15.0 --target web --release`로 생성한 package/JS/type/WASM 반영 | Studio parser·renderer binary |
| `rhwp-core.lock` | repository, release tag, commit, upstream Cargo fingerprint, WASM 도구·profile과 managed artifact 6개 hash/size 기록 | machine-readable Stable provenance |
| `scripts/update-upstream.sh` | 필수 `--tag`/`--commit`, floating ref·legacy 환경변수·dirty source 거부와 source→Cargo→WASM→lock→verify 순서 구현 | 의존성 갱신 자동화 |
| `scripts/write-rhwp-pin.mjs`, `scripts/verify-rhwp-pin.mjs` | deterministic lock 기록과 repository/source/native/WASM/artifact read-only 정합성 검증 분리 | pin 생성·지속 검증 |
| `tests/update-upstream.test.mjs`, `tests/rhwp-pin.test.mjs`, `tests/rhwp-baseline.test.mjs` | 정상 pin, tag/commit·origin·dirty·version·fingerprint·artifact 변조 거부와 기존 Alhangeul 경계 고정 | 회귀·실패 안전성 |
| `apps/studio-host/src/**` | v0.8.2 command context/edit mode/style snapshot/local-font/CanvasKit API 호환 보정 | Alhangeul Studio adapter |
| `apps/studio-host/package.json`, `pnpm-lock.yaml`, TypeScript/Vite 설정 | upstream Studio의 `@noble/hashes`와 명시적 `.ts` import 해석 반영 | frontend dependency·build |
| `README.md`, `docs/DEVELOPMENT.md`, `docs/architecture/UPSTREAM.md` | 현재 pin, strict apply/check, 명시적 rollback과 upstream known issue 분류 현행화 | 사용자·기여자·유지보수자 문서 |
| `mydocs/plans/`, `mydocs/working/`, `mydocs/report/`, `mydocs/orders/` | 승인된 계획, Stage별 검증 근거, 최종 결과와 작업 상태 기록 | Hyper-Waterfall 운영 기록 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| dependency provenance | 저장소 루트 | `rhwp-core.lock` | OK | writer·verifier가 사용하는 machine-readable 고정 경로 |
| upstream 아키텍처·운영 문서 | `docs/architecture/` | `docs/architecture/UPSTREAM.md` | OK | 지속 upstream, pin 계약과 known issue 분류를 공개 아키텍처로 유지 |
| 개발·rollback 절차 | `docs/` | `docs/DEVELOPMENT.md` | OK | 기여자가 반복 실행할 strict update/check/rollback 명령 위치 |
| 제품·개발 진입 요약 | 저장소 루트 | `README.md` | OK | 현재 Stable pin과 상세 문서 링크만 간단히 제공 |
| 작업 계획·단계·최종 보고 | `mydocs/` | `mydocs/plans/task_m010_3*.md`, `mydocs/working/task_m010_3_stage*.md`, `mydocs/report/task_m010_3_report.md` | OK | 공식 제품 문서와 Issue #3 승인·검증 기록 분리 |
| 오늘할일 | `mydocs/orders/` | `mydocs/orders/20260719.md`, `mydocs/orders/20260728.md` | OK | 시작·재개·완료 시점의 작업 상태 기록 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| Stable source pin | `v0.7.13` / `b3e16ef212af81ef37d973ddb86d6816d3804642` | `v0.8.2` / `9b16aa9e23f476e2b335d7c029fc9f24a199d63c` |
| native/WASM `rhwp` version | `0.7.13` | `0.8.2` |
| vendored WASM binary | 5,062,177 bytes | 7,189,445 bytes |
| repository-owned provenance | 없음 | `rhwp-core.lock` + managed artifact 6개 hash/size |
| Stable updater 입력 | 기본 branch·환경변수·임의 ref 가능 | 필수 tag + 40자리 commit, branch/floating/legacy 입력 거부 |
| read-only pin verifier | 없음 | source/tag/commit/Cargo/WASM/artifact 6개 정합성 검사 |
| `test:upstream` | 12 tests | 31 tests 통과 |
| Studio test | 21 files / 113 tests | 21 files / 114 tests 통과 |
| product boundary 검사 | 172 files | 176 files 통과 |
| Stage 1~4 구현·보고 diff | 해당 없음 | `devel..50657e8`: 35 files, 6,428 insertions, 467 deletions |
| 단계 커밋·보고서 | 0 | Stage commit 4개, 단계 보고서 4개 |
| Actions 저장소 권한 | 비활성 | 비활성 (`enabled: false`) |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| Stable provenance에 `v0.8.2`와 resolved commit 명시 | OK — `rhwp-core.lock`과 verifier가 exact tag/commit 확인 |
| submodule·Cargo lock·bundled WASM 동일 release 정렬 | OK — source HEAD/tag ref, native `rhwp 0.8.2`, WASM package `0.8.2`와 artifact hash 일치 |
| Stable 갱신의 release tag 필수·floating ref 금지 | OK — 필수 인자·SemVer·SHA 검사와 branch/positional/legacy 입력 거부 fixture |
| tag/commit·core/WASM/Cargo 불일치 실패 | OK — mismatch, version, Cargo fingerprint, artifact hash/size/missing fixture 독립 통과 |
| 정상·불일치·dirty submodule 회귀 테스트 | OK — updater와 read-only verifier의 정상·거부 경로 31-test suite에 포함 |
| v0.8.2 adapter 최소 호환 | OK — upstream source backport 없이 Studio 114 tests와 TypeScript/Vite build 통과 |
| upstream known issue와 Alhangeul 회귀 분리 | OK — 같은 pinned source·재현 조건·실패 지점일 때만 upstream known issue로 분류 |
| 실패 시 직전 검증 완료 pin rollback | OK — 자동 reset 없이 변경 확인→명시적 경로 restore→submodule update→재검증 절차 문서화 |
| HOP 지속 dependency 미추가 | OK — 원격은 Alhangeul `origin` 하나이며 manifest·lock·`.gitmodules`에 HOP dependency 없음 |
| Actions·native·배포 제외 범위 유지 | OK — Task #3 workflow diff 없음, Actions API `enabled: false`, native/package/release 미실행 |
| 최종 플랫폼 중립 suite | OK — frozen install, product/pin 검사, upstream 31, Studio 114, build, Cargo metadata·format과 diff 검사 통과 |

### 단계별 검증 결과

- Stage 1: [`task_m010_3_stage1.md`](../working/task_m010_3_stage1.md) — strict tag/commit 계약, floating ref·dirty·mismatch 거부 fixture 확정
- Stage 2: [`task_m010_3_stage2.md`](../working/task_m010_3_stage2.md) — v0.8.2 source·native·fresh WASM과 managed artifact 6개 provenance 원자적 고정
- Stage 3: [`task_m010_3_stage3.md`](../working/task_m010_3_stage3.md) — Studio adapter 114 tests/build 통과와 공식 update/check/rollback 문서 현행화
- Stage 4: [`task_m010_3_stage4.md`](../working/task_m010_3_stage4.md) — Issue 수용 기준, HOP 부재, Actions 비활성과 전체 platform-neutral suite 통합 확인

## 잔여 위험과 후속 작업

### 잔여 위험

- GitHub Actions가 비활성이고 현재 환경은 지원 대상이 아니므로 Windows/Linux native Rust test·clippy, Tauri compile·bundle과 설치 artifact smoke를 실행하지 않았다.
- file-backed local font를 실제 Windows/Linux catalog에서 읽어 CanvasKit typeface로 등록하는 경로는 mock 기반 Studio 테스트만 통과했다.
- upstream `v0.8.2` release note의 `print-pdf-issue3126`(#3450), `issue-2214`(#3412) Studio E2E known issue는 해결하지 않았고 이번 성공 결과에 포함하지 않았다.
- Studio build에 SVG runtime 해석, Tauri API static/dynamic import 혼용과 500 kB 초과 chunk 경고가 남아 있다.
- `local-fonts.ts`는 Tauri catalog와 v0.8.2 단일-module API를 함께 제공해 권장 파일 길이를 넘는다. 기능이 더 늘기 전에 별도 계획으로 역할 분리를 검토해야 한다.
- 실제 `v0.8.2` tag는 lightweight tag이므로 사람이 보는 `git submodule status` describe 문자열보다 `rhwp-core.lock`과 exact `v0.8.2^{commit}` verifier를 운영 기준으로 사용해야 한다.

### 후속 작업 후보

- Actions 활성화 승인 후 Windows x64, Linux x64/arm64 native CI·Tauri bundle·artifact smoke
- 실제 Windows/Linux local-font catalog, file-backed byte와 CanvasKit typeface 통합 smoke
- Studio SVG runtime 자산, dynamic import와 bundle chunk 최적화
- adapter override 파일 역할 분리와 권장 길이 복구
- v0.8.2 이후 Stable release 반영 시 이번 strict updater·lock·rollback 절차 재사용

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과, 게시된 PR을 검토한 뒤 merge 여부를 승인한다.
