# Task #5 Stage 5 완료보고서 — Actions 수용 기준 통합 검증

GitHub Issue: [#5](https://github.com/postmelee/alhangeul-tauri/issues/5)
구현계획서: [`task_m010_5_impl.md`](../plans/task_m010_5_impl.md)
Stage: 5

## 단계 목적

Stage 4까지의 최종 실행 가능 head를 remote `publish/task5`와 정확히 일치시킨 뒤, 같은 commit에서 Ubuntu CI와 Windows/Linux native artifact matrix를 다시 실행해 Task #5의 Actions 수용 기준을 통합 검증하는 단계다.

최종 실행 가능 SHA는 `583bf6878fa2ec5308009b692644ac80a4dc99da`다. CI run `30363411397`과 native run `30363760943`은 모두 이 SHA에서 성공했다. 현재 macOS host에서는 계획대로 platform-neutral 검증만 실행했으며, desktop Rust test·Clippy와 Tauri native bundle 성공은 각각 Ubuntu와 Windows/Linux Actions 결과로 판정했다.

## 산출물

| 파일 또는 외부 상태 | 변경 요약 |
|---|---|
| `publish/task5` | Stage 4 commit까지 포함한 `583bf6878fa2ec5308009b692644ac80a4dc99da`로 fast-forward하고 remote SHA 일치를 확인했다. |
| [CI run `30363411397`](https://github.com/postmelee/alhangeul-tauri/actions/runs/30363411397) | 같은 SHA에서 Ubuntu CI의 제품 경계, pin, 자동화, upstream, Studio, desktop Rust test·Clippy가 모두 성공했다. |
| [Native run `30363760943`](https://github.com/postmelee/alhangeul-tauri/actions/runs/30363760943) | 같은 SHA에서 Windows x64, Linux x64, Linux arm64 native build·inventory 검증·artifact upload가 모두 성공했다. |
| `mydocs/working/task_m010_5_stage5.md` | 로컬·원격 통합 검증, artifact metadata·inventory, 비배포 경계와 잔여 위험을 기록한 본 완료보고서다. |

Stage 5에서는 제품 소스, workflow, 공식 운영 문서를 수정하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 4 commit `583bf6878fa2ec5308009b692644ac80a4dc99da`를 원격 검증한 뒤 본 보고서만 신규 작성했다. 따라서 마지막 remote 검증 SHA 이후 executable, workflow, `docs/operations/` 경로는 무손실이며 동작 변경이 없다.

Stage 3의 마지막 성공 canary commit `b8847f5086eab7c0f8243e999f2c145271ef713c`부터 Stage 5 검증 SHA까지의 변경도 `docs/DEVELOPMENT.md`, `docs/operations/DESKTOP_RELEASE.md`, Stage 3·4 보고서뿐이었다. Stage 4에서 공식 운영 문서를 갱신했기 때문에 Stage 5에서 새 SHA를 다시 검증했고, 그 이후 증적 문서 commit에는 native workflow를 반복하지 않는다는 구현계획서 기준을 적용했다.

Stage 4 공식 문서의 installer SHA-256은 Stage 3 native run `30357240402`에서 다운로드해 독립 검증한 해당 run의 byte inventory다. Stage 5 native run은 새 packaging 실행이므로 일부 installer hash와 byte size가 달라졌으며, 이 차이를 재현 가능한 byte-for-byte build로 주장하지 않는다. 두 기록은 각 run과 exact commit에 귀속된 inventory로 구분한다.

## 검증 결과

### 최종 SHA와 remote branch

```bash
git push origin HEAD:refs/heads/publish/task5
git ls-remote --heads origin refs/heads/publish/task5
```

- OK — local HEAD와 `origin/publish/task5`가 모두 `583bf6878fa2ec5308009b692644ac80a4dc99da`로 일치
- OK — push 전후 worktree clean

### 현재 host의 platform-neutral 검증

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo metadata \
  --manifest-path apps/desktop/src-tauri/Cargo.toml \
  --locked \
  --offline \
  --no-deps
cargo fmt \
  --manifest-path apps/desktop/src-tauri/Cargo.toml \
  --all \
  -- \
  --check
git diff --exit-code devel -- .github/workflows/pages.yml
git diff --check
```

- OK — frozen lockfile install 완료
- OK — product boundary 179개 파일 검사 통과
- OK — `rhwp` v0.8.2, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, 산출물 6개 pin 검사 통과
- OK — automation test 23/23 통과
- OK — upstream test 32/32 통과
- OK — Studio test 21개 파일, 114/114 통과
- OK — Studio production build 완료
- OK — Cargo metadata와 Rust format 검사 통과
- OK — Pages workflow diff 없음
- OK — `git diff --check` 통과
- INFO — Studio build의 기존 runtime SVG resolve, dynamic import, 500KB 초과 chunk 경고는 실패가 아니며 이번 Stage에서 새로 발생한 오류가 아니다.
- 미실행 — 현재 macOS host의 `pnpm run test:desktop`, `pnpm run clippy:desktop`, `pnpm tauri build`

### Ubuntu CI

```bash
gh run view 30363411397 \
  --repo postmelee/alhangeul-tauri \
  --json databaseId,url,event,headBranch,headSha,status,conclusion,jobs
```

| 항목 | 결과 |
|---|---|
| Event | `workflow_dispatch` |
| Branch | `publish/task5` |
| Head SHA | `583bf6878fa2ec5308009b692644ac80a4dc99da` |
| Run conclusion | `success` |
| Unit tests job | `90288465399`, `success` |

- OK — product boundary, core pin, automation, upstream, Studio test/build가 모두 성공
- OK — Ubuntu desktop Rust test와 `cargo clippy -- -D warnings` 성공

### Windows/Linux native matrix

```bash
gh run view 30363760943 \
  --repo postmelee/alhangeul-tauri \
  --json databaseId,url,event,headBranch,headSha,status,conclusion,jobs
gh api \
  repos/postmelee/alhangeul-tauri/actions/runs/30363760943/artifacts
```

| 항목 | 결과 |
|---|---|
| Event | `workflow_dispatch` |
| Branch | `publish/task5` |
| Head SHA | `583bf6878fa2ec5308009b692644ac80a4dc99da` |
| Run conclusion | `success` |
| Windows x64 job | `90289654049`, `success` |
| Linux x64 job | `90289654189`, `success` |
| Linux arm64 job | `90289653984`, `success` |

세 job 모두 exact checkout, core pin, automation, upstream, Studio, Tauri build, artifact verifier와 upload 단계를 성공했다.

| Artifact | ID | 크기 (bytes) | Archive digest | Expired | 만료 시각 |
|---|---:|---:|---|---|---|
| `alhangeul-desktop-windows-x64` | `8690128712` | 53,612,250 | `sha256:147393d4ae7cdcc933985c23b114385017ba59f3fc34cc31fcd78f4ba18d9e06` | `false` | 2026-08-11 13:38:00Z |
| `alhangeul-desktop-linux-x64` | `8690130511` | 354,121,575 | `sha256:290ce0b1ac75ef1b00fde2fefaecee6fc51b1facb1636a7738839c0dec4f520b` | `false` | 2026-08-11 13:37:49Z |
| `alhangeul-desktop-linux-arm64` | `8690002677` | 90,023,044 | `sha256:9c681d5791723418f9ba463a7ccbc3329e383a1c3881ab9b452a07f15b675e53` | `false` | 2026-08-11 13:34:04Z |

세 artifact API 항목의 workflow run head는 모두 최종 실행 가능 SHA와 일치했다.

Runner artifact verifier가 기록한 필수 installer inventory:

| Platform | 종류 | 파일 | 크기 (bytes) | SHA-256 |
|---|---|---|---:|---|
| Windows x64 | MSI | `msi/Alhangeul_0.3.1_x64_en-US.msi` | 28,192,768 | `d4ad15e5de65074f077d0e1ccf18e41a5bdb76e650d38c49b58a548598af66fa` |
| Windows x64 | NSIS | `nsis/Alhangeul_0.3.1_x64-setup.exe` | 25,658,471 | `477be11d491f781df06966207622ddcc51fcdae3231f0da1dbbe8b6faf91ddb9` |
| Linux x64 | AppImage | `appimage/Alhangeul_0.3.1_amd64.AppImage` | 106,834,424 | `706a7033176b44bd37ea1e0da437e9ca55a2ce7667bb61b5dd384896c4b79480` |
| Linux x64 | DEB | `deb/Alhangeul_0.3.1_amd64.deb` | 30,091,766 | `ca2ebfd94eb0c582b2c07239bc465cdae451dbfa274939e5b5188eb38526582a` |
| Linux x64 | RPM | `rpm/Alhangeul-0.3.1-1.x86_64.rpm` | 30,092,577 | `fd1e27b4c84e5411bd93728448bf4bb3167d5104ab1095ea353ec8497631c44b` |
| Linux arm64 | DEB | `deb/Alhangeul_0.3.1_arm64.deb` | 30,049,142 | `f8e11990fa261eca4278d9e2136b1c11ee4a04dc95bff01a2bb6dd483b6b3f09` |

### Stage 4 다운로드 후 독립 inventory 검증

Stage 4에서는 native run `30357240402`, head `b8847f5086eab7c0f8243e999f2c145271ef713c`의 세 artifact를 workspace 밖 임시 디렉터리에 실제로 다운로드했다. 각 platform에 대해 동봉된 `alhangeul-artifact-inventory.json`과 압축 해제된 모든 파일을 `--verify-inventory`로 다시 비교했고 Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB가 모두 통과했다.

다운로드 후 독립 검증 결과와 당시의 파일별 SHA-256은 [`task_m010_5_stage4.md`](task_m010_5_stage4.md)에 보존했다. 검증용 임시 디렉터리는 배포 경로로 사용하지 않고 삭제했다. Stage 5에서는 새 run의 inventory 생성·검증 성공을 runner log와 artifact API로 확인했으며 artifact를 다시 다운로드하지 않았다.

### 자동화 경계와 외부 상태

```bash
gh api repos/postmelee/alhangeul-tauri/actions/permissions
gh api repos/postmelee/alhangeul-tauri/releases
git ls-remote --tags origin
gh run list \
  --repo postmelee/alhangeul-tauri \
  --workflow pages.yml
```

- OK — repository Actions 활성 상태: `enabled: true`
- OK — 대상 workflow는 수동 `workflow_dispatch`, `permissions: contents: read`, secret 참조 없음
- OK — macOS runner·target, 자동 trigger, Release·Pages·deploy·signing 단계 없음
- OK — GitHub Releases API 응답 `[]`
- OK — remote tag 없음
- OK — `pages.yml` run 이력 없음
- INFO — repository Actions의 `allowed_actions`는 `all`, `sha_pinning_required`는 `false`이며 repository-level 정책 강화는 Task #5 범위에 포함하지 않았다.

### 수행하지 않은 항목

- Windows/Linux installer 설치·실행 smoke
- Windows signing, Linux package signing, macOS signing·공증
- GitHub Release 생성, tag 생성, Pages 실행·배포
- updater, package registry 또는 Homebrew 배포
- macOS native Rust/Tauri build·검증

## 잔여 위험

- Actions artifact는 14일 retention을 사용하므로 2026-08-11 만료 뒤에는 이 run에서 다운로드할 수 없다.
- 필수 installer 생성, 비어 있지 않음과 inventory checksum은 검증했지만 실제 설치·실행과 서명은 검증하지 않았다.
- Stage 3과 Stage 5의 packaging 결과가 byte-for-byte 같지 않으므로 재현 가능한 build는 입증하지 않았다. 각 run 내부 inventory의 무결성만 검증했다.
- GitHub Release, tag, Pages, updater가 없는 현재 상태는 배포 준비 완료나 공개 릴리스를 뜻하지 않는다.
- repository-level Actions SHA pinning 강제는 활성화하지 않았으며 별도 보안 정책 작업이 필요할 수 있다.

## 다음 단계 영향

- Stage 1~5가 모두 완료됐다. 작업지시자 승인 후 `task-final-report` 절차로 최종 보고서 작성, 오늘할일 완료 처리, 최종 커밋, `publish/task5` push와 `devel` 대상 Open PR 생성을 진행한다.
- 최종 remote native 검증 기준 SHA는 `583bf6878fa2ec5308009b692644ac80a4dc99da`다.
- 본 보고서, 최종 보고서와 오늘할일 상태처럼 실행에 영향을 주지 않는 `mydocs` 증적만 추가되는 동안에는 native workflow를 다시 실행하지 않는다. executable, workflow 또는 공식 운영 문서가 바뀌면 이 전제를 폐기하고 재검증한다.
- 최종 보고서에서는 Ubuntu CI, Windows/Linux matrix, Stage 4 다운로드 후 독립 inventory 검증과 실행하지 않은 배포 항목을 계속 분리해 기록한다.

## 승인 요청

- Stage 5의 exact-SHA 통합 검증과 본 완료보고서를 승인하면 `task-final-report` 절차로 최종 보고서와 PR 게시를 진행한다.
