# Task #50 Stage 3 — 조상 symlink 경로 정책 정렬

GitHub Issue: [#50](https://github.com/postmelee/alhangeul-tauri/issues/50)
구현계획서: [`task_m010_50_impl.md`](../plans/task_m010_50_impl.md)
Stage: 3
검증일: 2026-08-31

## 단계 목적

파일 자체의 symlink 거부와 조상 폴더의 symlink 허용을 구분한다. 정상적인
별칭 경로는 resolved absolute path로 worker에 전달하되, 원본 덮어쓰기 방지와
실패 시 기존 output·Tumbler 빈 파일 inode 보존 계약을 유지한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/linux-thumbnailer/src/cli.rs` | 193 LOC; input leaf 검사 후 canonicalize, output parent canonicalize 후 leaf 결합, 동일 resolved 파일 거부 |
| `apps/linux-thumbnailer/tests/thumbnailer_contract.rs` | 188 LOC; 기존 10개 회귀 유지, 공통 도우미만 이동 |
| `apps/linux-thumbnailer/tests/symlink_contract.rs` | 181 LOC; 조상·parent 별칭, 실패 보존, alias retargeting 및 worker 종료 6개 테스트 |
| `apps/linux-thumbnailer/tests/support/mod.rs` | 121 LOC; 기존 fixture·PNG·worker·resource 검증 도우미 분리 |
| `tests/linux-thumbnail-build.test.mjs` | 226 LOC; 분리 파일 상한, Linux fmt·진단 artifact·실패 전파 계약 |
| `.github/workflows/alhangeul-desktop.yml` | Linux fmt 연결, test/fmt/Clippy 로그와 exact SHA·outcome 전용 artifact |
| `mydocs/plans/task_m010_50_impl.md`, `mydocs/orders/20260831.md` | 승인 및 검증 결과, Stage 4 승인 대기 상태 |

## 본문 변경 정도 / 본문 무손실 여부

- `output.rs`, `main.rs`, `render.rs`, 공유 renderer, worker protocol 및 `third_party/rhwp`는 변경하지 않았다.
- input의 absolute·regular file·64 MiB 제한과 leaf symlink 거부를 유지한다. output의 존재하는 parent만 해석하고 leaf를 그대로 결합한다.
- 기존 output leaf 재검사, `O_NOFOLLOW`, device/inode 확인, Tumbler precreated 빈 파일의 동일 inode 쓰기를 유지한다.
- worker의 1,500 ms deadline, 256 MiB `RLIMIT_AS`, timeout kill/reap 및 임시 파일 정리 계약을 유지한다.
- 기존 통합 테스트 10개의 함수 이름과 이동한 도우미 본문을 이전 commit과 대조했다. 도우미의 공개 범위 변경 외 본문은 동일하다.
- 원본은 hash 대신 원본 byte와의 정확한 동일성을 검사한다. 실패 로그에 문서 byte가 노출되지 않도록 boolean assertion을 사용한다.
- 신규·변경 Rust/test 파일은 모두 300 LOC 이하다. 공식 제품 문서 변경은 Stage 5에 남겼다.

## 검증 결과

### 플랫폼 중립

```bash
node --test tests/linux-thumbnail-build.test.mjs tests/actions-workflows.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
actionlint .github/workflows/alhangeul-desktop.yml
git diff --check
```

- 관련 계약 테스트: **29 pass, 0 fail**.
- 전체 automation: **390 pass, 0 fail**.
- Product boundary: **312 files scanned, passed**.
- Actionlint 및 diff whitespace: OK.
- Bash `set -euo pipefail`에서 exit 42인 명령을 `tee`에 연결해 최종 exit 42를 확인했다. 진단 보존 때문에 test/lint 실패가 성공으로 바뀌지 않는다.
- 지원 범위 밖 호스트에서 Rust desktop test/build/fmt는 실행하지 않았다.

### Exact Linux native candidate

두 Linux 환경에서 다음 명령을 실행했다.

```bash
cargo fmt --manifest-path apps/linux-thumbnailer/Cargo.toml -- --check
pnpm run test:linux-thumbnailer
pnpm run clippy:linux-thumbnailer
```

- 기준 `devel`: `8b865fa55b55aea232d0fb034a518c807ac4c003`
- source/workflow candidate: `dc6be3fe11fa8b0bd524365a551f22d228cf39b5`
- rhwp pin: `496333b27d21ddb9114ba9ae340bcb895870c9a7`
- [Native run 33377678863](https://github.com/postmelee/alhangeul-tauri/actions/runs/33377678863), attempt 1, `run_tests=true`.

| 환경 | unit / symlink / 기존 contract | fmt | Clippy | 진단 upload |
|---|---:|---|---|---|
| Ubuntu 22.04 x64 | 4 / 6 / 10, 총 20 pass | 성공 | 성공 | 성공 |
| Ubuntu 22.04 arm64 | 4 / 6 / 10, 총 20 pass | 성공 | 성공 | 성공 |

두 artifact의 `tests.log`, `fmt.log`, `clippy.log`, `step-outcomes.json`을
내려받아 source/workflow SHA·run·target 및 `test=success`, `lint=success`를
대조했다. 20개 테스트 각각의 성공을 확인했으며 failed/ignored/filtered는 모두
0이다. fmt 로그는 비어 있고 Clippy는 정상 완료됐다.

| 진단 artifact | ID | Artifact SHA-256 |
|---|---|---|
| [x64 tests](https://github.com/postmelee/alhangeul-tauri/actions/runs/33377678863/artifacts/9752902018) | `9752902018` | `47e71b12eadb7ad35a7db97f33ce893d760aa62fe041a3f82f4f84fd06833d1e` |
| [arm64 tests](https://github.com/postmelee/alhangeul-tauri/actions/runs/33377678863/artifacts/9752853466) | `9752853466` | `944108008bcfb772104ed1dbc898fac3b1b8396d04b1517daeabf1d520bdb910` |

보존 기간은 14일이다. architecture 판정에는 명시적인 `target`을 사용한다.

### 경로·실패 보존 회귀

- normal 경로, input ancestor symlink, output parent 자체 symlink, 더 위 ancestor symlink, 양쪽 별칭 및 한글·공백 경로에서 PNG를 생성했다.
- 별칭 아래 새 output, 기존 non-empty output 및 Tumbler 빈 output을 검사했다. 빈 output은 held reader와 같은 device/inode를 유지했다.
- 입력 leaf/dangling symlink, directory·relative·oversize 입력을 거부하고 원본·기존 final을 보존했다.
- 서로 다른 별칭으로 같은 원본을 가리키는 output, output leaf/dangling link, missing/dangling/non-directory parent 및 directory·relative/root output을 거부했다. target sentinel과 원본을 보존하고 불필요한 output·임시 파일을 남기지 않았다.
- partial/panic worker는 빈 파일과 non-empty final의 byte·inode를 보존했다.
- 실행 중 `/proc`에서 worker에 전달된 input·임시 output이 resolved path이고 memory limit이 256 MiB임을 확인했다. 이후 조상 alias를 decoy로 바꾸어도 decoy·원본·기존 final을 보존하며 timeout 뒤 worker가 kill/reap되고 임시 파일이 없어졌다.
- 기존 timeout, panic/partial, 동시 요청, memory 및 Tumbler 회귀 10개도 함께 통과했다.

### 검증 중 보정 및 최종 commit 경계

- 첫 candidate `cf9c48e7021c649c267967e93da710e9fd8513a0`의 [run 33376235566](https://github.com/postmelee/alhangeul-tauri/actions/runs/33376235566)에서 두 Linux 환경 모두 20개 테스트는 통과했으나 fmt가 줄바꿈 세 곳을 거부했다. 이 실행의 Clippy는 통과 근거로 사용하지 않는다.
- Linux formatter diff만 반영해 위 exact candidate에서 test/fmt/Clippy를 모두 재실행했다. gate와 예산은 완화하지 않았다.
- 이전 Stage 2 실행의 필수 core 증적과 첫 Stage 3 실행의 실패 로그를 확보한 뒤, 더 최신 검증과 중복되는 잔여 CI만 취소했다. 최종 수용 근거는 새 실행이며 취소된 실행을 전체 성공으로 표현하지 않는다.
- artifact의 `runner`는 실제 GitHub runner 이름이었다. 최종 정리에서 효과 없던 예약 환경 변수 `RUNNER_NAME` 재정의 한 줄을 제거하고 이를 금지하는 계약 테스트를 추가했다. 기존 metadata 출력과 명시적 `target`은 유지한다.
- 위 정리 뒤 플랫폼 중립 검증을 다시 통과했다. `git diff dc6be3fe11fa8b0bd524365a551f22d228cf39b5 -- apps/linux-thumbnailer`는 비어 있어 native 검증 후 Rust 소스·테스트 변경이 없음을 확인했다. 최종 보고서 commit 전체 workflow가 실행된 것으로 표현하지 않는다.

## 잔여 위험

- canonicalization은 race-free file handle 고정이 아니다. resolved 위치 자체의 동시 변경까지 막는 fd 기반 재설계는 이번 범위에 없다.
- 이번 Stage의 필수 범위는 Linux x64·arm64 helper test/fmt/Clippy다. 보고 시점에 같은 실행의 후속 desktop/package 및 Windows 추가 CI는 진행 중이며 전체 workflow 성공을 주장하지 않는다.
- package만 설치한 환경의 MIME 매칭과 파일 관리자 GUI 수용은 아직 Stage 4다. 이번 단위·통합 회귀를 실사용 문서 화면 검증으로 대신하지 않는다.

## 다음 단계 영향

- Stage 4에서 probe가 주입하던 MIME 보완을 제거하고 설치 package만으로 Nautilus·Thunar/Tumbler를 재수용한다.
- exact source/build SHA 및 artifact digest를 일치시킨 뒤 온새미로 HWP와 form-002 HWPX의 최초·cached·changed 화면과 helper 실행 근거를 함께 확인하고 캡처를 작업지시자에게 보여준다.
- 승인된 native 검증 예외에 따라 source candidate를 먼저 기록했고, 검증 증적·최종 metadata 정리·단계 상태는 완료 commit으로 묶는다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 검토한 뒤 Stage 4 진입 승인을 요청한다.
- 승인 전 Stage 4 소스 변경, PR 게시, release 또는 이슈 close는 진행하지 않는다.
