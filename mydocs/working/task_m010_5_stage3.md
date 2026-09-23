# Task #5 Stage 3 완료보고서 — GitHub Actions canary 검증

GitHub Issue: [#5](https://github.com/postmelee/alhangeul-tauri/issues/5)
구현계획서: [`task_m010_5_impl.md`](../plans/task_m010_5_impl.md)
Stage: 3

## 단계 목적

Stage 2에서 정적으로 고정한 수동 GitHub Actions workflow를 실제 Windows/Linux hosted runner에서 exact commit으로 실행하고, `rhwp v0.8.2` pin 검증부터 Tauri bundle 생성·artifact inventory·upload까지 이어지는 canary 경로를 검증하는 단계다.

repository Actions를 작업지시자 승인 뒤 활성화하고 `publish/task5`를 canary ref로 사용했다. 각 run은 `headSha`와 remote ref를 대조했으며, CI 성공 전에는 native artifact workflow를 dispatch하지 않았다. runner에서 발견된 문제는 실패 로그와 공식 계약을 근거로 Issue 범위 안에서 최소 보정하고 같은 ref를 fast-forward하여 다시 검증했다.

최종 canary commit은 `b8847f5086eab7c0f8243e999f2c145271ef713c`이며, CI와 Windows x64·Linux x64·Linux arm64 native matrix가 모두 이 SHA에서 성공했다.

## 산출물

Stage 2 commit `80421cfdf61f02ead385c8560c5357d918fe45a9` 이후 Stage 3 source·test·계획 변경은 9개 파일, 165 insertions, 6 deletions다.

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/src/state.rs` | `rhwp v0.8.2`의 `split_paragraph_native` 네 번째 `restore_meta` 인자에 upstream 일반 Enter 경로와 같은 `None`을 전달했다. |
| `tests/rhwp-baseline.test.mjs` | native split adapter가 일반 Enter metadata 경로를 유지하는 회귀 검사를 추가했다. |
| `apps/desktop/src-tauri/src/linux_runtime.rs` | 동작을 바꾸지 않고 함수 끝의 불필요한 `return;` 한 줄을 제거해 hosted Ubuntu Clippy 기준을 충족했다. |
| `.github/workflows/alhangeul-desktop.yml` | checkout 전에 Git command-scope `core.autocrlf=false`를 적용해 Windows에서도 upstream pin 대상 byte를 LF로 보존했다. |
| `scripts/verify-desktop-artifacts.mjs` | 최종 installer가 아닌 bundle root의 `appimage/*.AppDir` 디렉터리만 Tauri 중간 산출물로 scan에서 제외했다. |
| `tests/actions-workflows.test.mjs` | Git command-scope LF 설정과 checkout 선행 순서를 정적 계약으로 고정했다. |
| `tests/desktop-artifacts.test.mjs` | AppDir 중간 트리만 제외되고 최종 DEB·RPM·AppImage와 다른 경로의 파일은 계속 inventory에 포함되는 회귀 검사를 추가했다. |
| `mydocs/plans/task_m010_5.md` | 세 canary 실패 원인과 승인된 최소 보정 범위를 단계 계획에 반영했다. |
| `mydocs/plans/task_m010_5_impl.md` | Stage 3.1~3.3 구현·검증·commit·rollback 기준을 구체화했다. |
| `mydocs/working/task_m010_5_stage3.md` | canary 시도, 최종 run, artifact와 검증 결과를 모은 본 완료보고서다. |

Stage 3의 runner 보정과 계획 보정은 remote 검증의 순환 의존성을 해소하기 위해 구현계획서에서 승인한 하위 commit 예외를 사용했다.

| Commit | 내용 |
|---|---|
| `217f38592ac0ef7fa7625d4e24227f179dca003b` | Stage 3 native adapter 보정 계획 |
| `ab312e95b7dca05f19b87e1da44c4743e410157e` | Stage 3.1 split paragraph adapter 호환성 보정 |
| `cfd222a83857fb9a684d7de5bf82e039dfbff6f1` | Stage 3 Linux Clippy 보정 계획 |
| `b959d8bb68359625f8c88e96efdde62cffbb784e` | Stage 3.2 Linux runtime Clippy 호환성 보정 |
| `ac13f671115d482d3eb86152fd73052f084353a7` | Stage 3 Windows·AppImage 보정 계획 |
| `b8847f5086eab7c0f8243e999f2c145271ef713c` | Stage 3.3 Windows pin·AppImage artifact 검증 보정 |

## 본문 변경 정도 / 본문 무손실 여부

코드·workflow·test와 내부 작업 문서를 변경한 단계이므로 제품 문서 본문 무손실 여부는 해당하지 않는다.

`docs/`, `.github/workflows/pages.yml`, `rhwp-core.lock`, `third_party/rhwp`, Tauri dependency와 lockfile은 변경하지 않았다. native matrix, 필수 bundle 종류, pin hash·size 기준, 수동 trigger, `contents: read`, retention 14일과 release·Pages 비배포 경계도 유지했다.

AppDir 보정은 `appimage` 바로 아래 이름이 `.AppDir`로 끝나는 실제 디렉터리만 재귀 scan에서 제외한다. 해당 경계 밖 symbolic link 거부, bundle root 탈출 거부, 필수 bundle·0바이트·inventory 변조 거부는 그대로 유지했다.

macOS는 제품 대상과 CI matrix에 추가하지 않았고 현재 macOS host에서 native Rust test·Clippy·Tauri bundle 검증을 실행하지 않았다.

## Canary 진행 기록

| 순서 | Run / SHA | 결과 | 판정과 후속 |
|---|---|---|---|
| 1 | [CI 30353284044](https://github.com/postmelee/alhangeul-tauri/actions/runs/30353284044) / `80421cf` | 실패 | `rhwp v0.8.2`의 `split_paragraph_native` 네 번째 `restore_meta` 인자 누락을 확인했다. upstream 일반 Enter 경로의 `None`만 전달하도록 계획 보정과 Stage 3.1을 적용했다. |
| 2 | [CI 30354133936](https://github.com/postmelee/alhangeul-tauri/actions/runs/30354133936) / `ab312e9` | 실패 | Ubuntu Clippy가 `linux_runtime.rs` 함수 끝의 `return;`을 `needless_return`으로 거부했다. 한 줄만 제거하는 계획 보정과 Stage 3.2를 적용했다. |
| 3 | [CI 30355031203](https://github.com/postmelee/alhangeul-tauri/actions/runs/30355031203) / `b959d8b` | 성공 | Unit tests와 Linux desktop test·Clippy가 모두 성공해 첫 native canary 실행 조건을 충족했다. |
| 4 | [Native 30355545016](https://github.com/postmelee/alhangeul-tauri/actions/runs/30355545016) / `b959d8b` | 실패 | Linux arm64는 DEB 검증·upload까지 성공했다. Windows는 checkout CRLF 변환으로 upstream `Cargo.lock` byte hash가 달라졌고, Linux x64는 AppImage 중간 AppDir의 표준 `.DirIcon` symlink를 verifier가 거부했다. 계획 보정과 Stage 3.3을 적용했다. |
| 5 | [CI 30357007192](https://github.com/postmelee/alhangeul-tauri/actions/runs/30357007192) / `b8847f5` | 성공 | 최종 exact SHA에서 전체 CI gate가 성공했다. |
| 6 | [Native 30357240402](https://github.com/postmelee/alhangeul-tauri/actions/runs/30357240402) / `b8847f5` | 성공 | Windows x64·Linux x64·Linux arm64의 checkout, pin, pretest, Tauri build, artifact 검증과 upload가 모두 성공했다. |

## 검증 결과

구현계획서의 Stage 3 필수 명령:

```bash
gh api repos/postmelee/alhangeul-tauri/actions/permissions
git ls-remote --heads origin refs/heads/publish/task5
pnpm run test:upstream
cargo fmt \
  --manifest-path apps/desktop/src-tauri/Cargo.toml \
  --all \
  -- \
  --check
gh run view 30357007192 \
  --repo postmelee/alhangeul-tauri \
  --json databaseId,url,event,headBranch,headSha,status,conclusion,jobs
gh run view 30357240402 \
  --repo postmelee/alhangeul-tauri \
  --json databaseId,url,event,headBranch,headSha,status,conclusion,jobs
gh api \
  repos/postmelee/alhangeul-tauri/actions/runs/30357240402/artifacts
git diff --check
```

결과:

- OK — repository Actions는 `enabled: true`, `allowed_actions: all`이며 활성 상태다.
- OK — remote `publish/task5`는 `b8847f5086eab7c0f8243e999f2c145271ef713c`를 가리킨다.
- OK — upstream suite 32/32 통과
- OK — Rust format 검사가 출력 없이 종료 코드 0으로 통과
- OK — `git diff --check`가 출력 없이 종료 코드 0으로 통과
- OK — 최종 CI run `30357007192`
  - event `workflow_dispatch`
  - branch `publish/task5`
  - head SHA `b8847f5086eab7c0f8243e999f2c145271ef713c`
  - `Unit tests` job과 product boundary, pin, automation, upstream, Studio, desktop Rust test·Clippy 전 단계 `success`
- OK — 최종 native run `30357240402`
  - event `workflow_dispatch`
  - branch `publish/task5`
  - head SHA `b8847f5086eab7c0f8243e999f2c145271ef713c`
  - `Build windows-x64`, `Build linux-x64`, `Build linux-arm64` 세 job `success`
  - 세 job 모두 `Verify checked out commit`, `Verify rhwp pin`, `Build Tauri bundles`, `Verify bundle artifact`, `Upload bundle artifact` 성공
- OK — `pages.yml` run 이력 조회 결과 `[]`; Stage 3에서 Pages workflow를 dispatch하지 않음

최종 native verifier가 기록한 필수 installer:

| Platform | Kind | 상대 경로 | 크기 (bytes) | SHA-256 |
|---|---|---|---:|---|
| Windows x64 | MSI | `msi/Alhangeul_0.3.1_x64_en-US.msi` | 28,192,768 | `bfab22693473c2cbd60b5e3aa396ccad9a6b7c7649d19d671f84ecf11afa45b9` |
| Windows x64 | NSIS | `nsis/Alhangeul_0.3.1_x64-setup.exe` | 25,661,219 | `c2e152bcec79a1c423f1ae1410840a96b1441f50710320b12a93eb5ce89191be` |
| Linux x64 | AppImage | `appimage/Alhangeul_0.3.1_amd64.AppImage` | 106,834,424 | `1c8f678f3a1e97d0498129934f637ffc82e8479378df8a07be3c76d56246b10b` |
| Linux x64 | DEB | `deb/Alhangeul_0.3.1_amd64.deb` | 30,091,764 | `f6df90bf962ef33759b50f1c7452998278ec72fbe941751c9698ad5015d6422d` |
| Linux x64 | RPM | `rpm/Alhangeul-0.3.1-1.x86_64.rpm` | 30,092,577 | `5445382ba9f4d5e7f30a61a47991d7becd333ff0f7725f253f05b1e52ed98293` |
| Linux arm64 | DEB | `deb/Alhangeul_0.3.1_arm64.deb` | 30,049,140 | `f0b841837cc66a699c1f917552287d263394e562be01bd1f2e5b419c3544595f` |

GitHub Actions artifact API는 세 archive가 모두 `expired: false`이고 최종 run의 exact SHA에 연결됐음을 반환했다.

| Artifact | ID | Archive 크기 (bytes) | Archive digest |
|---|---:|---:|---|
| `alhangeul-desktop-windows-x64` | `8687655675` | 53,615,008 | `sha256:fc9f6dc395475d699eb2b7bbf00da80139474318ac4cc6776f1f12459f77b595` |
| `alhangeul-desktop-linux-x64` | `8687615390` | 354,121,922 | `sha256:0b9c5826c1726ee06639b265acff254cb6468a5375f6d9240909881bcf792d4d` |
| `alhangeul-desktop-linux-arm64` | `8687395654` | 90,022,918 | `sha256:7581e2cc2fb76cf6f2ad8e6335751fe3e06db804fe627fdfa70d223eb7dd353d` |

세 artifact의 retention 만료 예정일은 2026-08-11이다.

## 잔여 위험

- Stage 3의 installer hash와 size는 hosted runner가 bundle 직후 기록한 값이다. artifact archive를 별도 환경에 내려받아 inventory와 파일을 독립 재검증하는 작업은 Stage 4에서 수행해야 한다.
- bundle 생성과 artifact upload 성공은 installer 설치·실행 smoke, 코드 서명, 공증, 배포 또는 사용자 환경 호환성을 증명하지 않는다.
- GitHub Release, tag, Pages, signing, secret과 배포 채널은 만들거나 사용하지 않았다.
- repository Actions 설정의 `sha_pinning_required`는 기존과 같이 `false`다. action SHA 고정 전환은 이번 Issue 범위 밖이다.
- artifact는 14일 retention으로 만료되므로 Stage 4 독립 검증은 만료 전에 완료해야 한다.
- repository Actions는 활성 상태를 유지한다. Task를 중단해야 하면 구현계획서의 rollback 승인 절차에 따라 비활성으로 복구해야 한다.

## 다음 단계 영향

- Stage 4는 성공한 native run `30357240402`의 세 artifact를 다운로드하고, 각 archive의 inventory와 필수 installer 종류·크기·SHA-256을 로컬에서 독립 검증해야 한다.
- 독립 검증 결과가 runner 기록과 일치한 뒤에만 `docs/operations/DESKTOP_RELEASE.md`와 `docs/DEVELOPMENT.md`에 검증 일자, exact SHA, run ID와 artifact 계약을 반영한다.
- Stage 4 문서는 build artifact 확보와 검증 사실만 기록해야 하며, 서명·설치·배포까지 완료한 것으로 표현하면 안 된다.
- Stage 4 진입 전까지 artifact를 다운로드하거나 공식 운영 문서를 수정하지 않는다.

## 승인 요청

- Stage 3 canary 결과와 본 완료보고서를 승인하면 Stage 4의 native artifact 다운로드·독립 inventory 검증과 운영 문서 갱신으로 진행한다.
