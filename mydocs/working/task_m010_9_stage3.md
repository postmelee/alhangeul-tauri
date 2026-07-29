# Task #9 Stage 3 보고서 — exact-SHA prerelease candidate 검증

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
구현계획서: [`task_m010_9_impl.md`](../plans/task_m010_9_impl.md)
Stage: 3

## 단계 목적

Stage 2 승인 commit을 candidate exact SHA로 고정하고, 같은 SHA의 platform-neutral CI와 Windows x64·Linux x64·Linux arm64 native build를 실행한다. 업로드된 Actions artifact를 다시 내려받아 inventory와 공개 후보 `SHA256SUMS`를 독립 검증한다.

이 단계는 release PR, tag, GitHub Release, signing, package repository, updater와 Windows ARM64를 다루지 않는다. 지원 범위 밖 현재 macOS host에서는 Windows/Linux desktop Rust·Tauri 성공을 로컬 결과로 주장하지 않고 Actions runner 결과만 사용한다.

## 산출물

| 대상 | 변경·생성 요약 |
|---|---|
| `publish/task9` | Stage 2 승인 commit만 가리키는 exact-SHA candidate branch |
| CI run `30426710424` | candidate SHA의 platform-neutral 검사와 Ubuntu desktop Rust test·Clippy |
| Native run `30426711693` | Windows x64·Linux x64·Linux arm64 bundle·inventory·upload |
| `docs/operations/DESKTOP_RELEASE.md` | run·artifact·installer·checksum 증적과 final tag 비재사용 경계 |
| `mydocs/orders/20260729.md` | Stage 3 완료와 Stage 4 승인 대기 상태 |
| `mydocs/working/task_m010_9_stage3.md` | 본 단계 결과와 잔여 위험 |

제품 source, workflow와 build 설정은 변경하지 않았다. Stage 3 보고·운영 문서 commit은 candidate build 뒤에 생기므로 `publish/task9` candidate SHA를 이동하지 않는다.

## exact-SHA run 결과

Candidate commit:

```text
6e0adc941b9eedbd2d7cceab12bf31dddf184c3a
```

`git ls-remote --heads origin refs/heads/publish/task9`로 원격 branch가 candidate commit과 일치함을 확인한 뒤 두 workflow를 dispatch했다.

| Workflow | Run | Event | Head branch | Head SHA | 결과 |
|---|---:|---|---|---|---|
| Alhangeul CI | [30426710424](https://github.com/postmelee/alhangeul-tauri/actions/runs/30426710424) | `workflow_dispatch` | `publish/task9` | candidate와 일치 | success |
| Alhangeul Desktop Artifact Build | [30426711693](https://github.com/postmelee/alhangeul-tauri/actions/runs/30426711693) | `workflow_dispatch` | `publish/task9` | candidate와 일치 | success |

Job 결과:

| Run | Job ID | Job | 시작 (UTC) | 종료 (UTC) | 결과 |
|---:|---:|---|---|---|---|
| `30426710424` | `90494647177` | Unit tests | `2026-07-29T05:59:32Z` | `2026-07-29T06:06:03Z` | success |
| `30426711693` | `90494650429` | Build linux-arm64 | `2026-07-29T05:59:33Z` | `2026-07-29T06:06:43Z` | success |
| `30426711693` | `90494650447` | Build windows-x64 | `2026-07-29T05:59:36Z` | `2026-07-29T06:14:30Z` | success |
| `30426711693` | `90494650461` | Build linux-x64 | `2026-07-29T05:59:38Z` | `2026-07-29T06:10:53Z` | success |

## artifact archive와 installer inventory

GitHub API 조회 시 세 archive는 모두 `expired: false`였다.

| Platform | Artifact ID | Archive 크기 (bytes) | API archive digest | 만료 시각 (UTC) |
|---|---:|---:|---|---|
| Windows x64 | `8714152971` | 53,660,040 | `sha256:3577c43739592df2f992046f73c40beefc5ad2f968f08459ded3dcb68d6d1fc9` | `2026-08-12T06:13:55Z` |
| Linux x64 | `8714085967` | 354,129,629 | `sha256:2751d8990c6e1234770268b25df9662008490d588fab647d7dc1c2ef4e34f8cc` | `2026-08-12T06:10:21Z` |
| Linux arm64 | `8714005780` | 90,029,873 | `sha256:e5806c1263b2c25453646421f279bf960faeeb8d2eb9c62840f51bf444c38b48` | `2026-08-12T06:06:25Z` |

`gh run download`로 세 artifact를 `/private/tmp/alhangeul-task9-stage3.Sz2nk6`에 내려받고 각 platform inventory를 다시 계산했다. 필수 bundle 여섯 개의 파일명·크기·SHA-256은 다음과 같으며 세 inventory가 모두 일치했다.

| Platform | 종류 | 파일 | 크기 (bytes) | SHA-256 |
|---|---|---|---:|---|
| Windows x64 | MSI | `msi/Alhangeul_0.1.0_x64_en-US.msi` | 28,192,768 | `b7647416466cff7a3ac787d5d903f2950c2a1b735974482899e7778ce2de5aa4` |
| Windows x64 | NSIS | `nsis/Alhangeul_0.1.0_x64-setup.exe` | 25,706,433 | `af7968393f05d042d62a0331640ab73cf29471021ee2eb35e8f1ca8112600fb9` |
| Linux x64 | AppImage | `appimage/Alhangeul_0.1.0_amd64.AppImage` | 106,842,616 | `a21c422eff17e38a80f301d7bd97d1256a9b2e706668593acaae02f1d2475d23` |
| Linux x64 | DEB | `deb/Alhangeul_0.1.0_amd64.deb` | 30,092,878 | `253ebe576131f62d8a1c1d2f2f8e885eea09ed9bc7947d739ed9502b2470ccd9` |
| Linux x64 | RPM | `rpm/Alhangeul-0.1.0-1.x86_64.rpm` | 30,093,097 | `b4101b9cca740472103d262d14c11abafa7c8962b9c1551e27100e777da1463b` |
| Linux arm64 | DEB | `deb/Alhangeul_0.1.0_arm64.deb` | 30,049,998 | `7cbd918634bbe6cc15d656cbc7a3e3caa67d0e06b6857c5334ef505ba8e7d62e` |

## candidate checksum

원본 Actions artifact에는 inventory와 Tauri의 DEB/RPM 중간 전개 파일도 들어 있다. checksum 도구의 installer-only 입력 계약에 따라 필수 installer 여섯 개를 같은 임시 경로 아래의 깨끗한 `release-assets` root로 평탄화하고 `SHA256SUMS`를 생성했다.

```text
b4101b9cca740472103d262d14c11abafa7c8962b9c1551e27100e777da1463b  Alhangeul-0.1.0-1.x86_64.rpm
a21c422eff17e38a80f301d7bd97d1256a9b2e706668593acaae02f1d2475d23  Alhangeul_0.1.0_amd64.AppImage
253ebe576131f62d8a1c1d2f2f8e885eea09ed9bc7947d739ed9502b2470ccd9  Alhangeul_0.1.0_amd64.deb
7cbd918634bbe6cc15d656cbc7a3e3caa67d0e06b6857c5334ef505ba8e7d62e  Alhangeul_0.1.0_arm64.deb
af7968393f05d042d62a0331640ab73cf29471021ee2eb35e8f1ca8112600fb9  Alhangeul_0.1.0_x64-setup.exe
b7647416466cff7a3ac787d5d903f2950c2a1b735974482899e7778ce2de5aa4  Alhangeul_0.1.0_x64_en-US.msi
```

- `shasum -a 256 -c SHA256SUMS`: 6 files, 모두 `OK`
- `SHA256SUMS` 파일 크기: 568 bytes
- `SHA256SUMS` 자체 SHA-256: `9e80f506fcc73f0b60018b383fba15b872e03bb9f69a8c6a9f90fb45a870cab2`

검증 후 `/private/tmp/alhangeul-task9-stage3.Sz2nk6`만 삭제했고 artifact나 checksum 초안을 저장소 또는 공개 다운로드 위치로 옮기지 않았다.

## 검증 결과

로컬 platform-neutral 검증:

```bash
CI=true pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
```

결과:

- OK — frozen lockfile 설치 완료, lockfile 변경 없음.
- OK — product boundary 185 files, violation 없음.
- OK — 제품 version surface 모두 `0.1.0`.
- OK — release metadata `Alhangeul 0.1.0`.
- OK — `rhwp` `v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`.
- OK — automation 51/51, upstream 32/32, studio 114/114.
- OK — studio production build 완료. 기존 runtime image URL과 chunk 관련 경고만 있었고 종료 코드는 0이었다.

일반 `pnpm install --frozen-lockfile`은 비대화형 환경에서 modules directory 제거 확인을 할 수 없어 중단됐다. `CI=true`를 지정한 동일 frozen-lockfile 설치를 다시 실행했으며 네트워크 권한 재시도 뒤 package 54개를 lockfile 변경 없이 설치했다.

remote·artifact·checksum 검증:

```bash
git ls-remote --heads origin refs/heads/publish/task9
gh run view 30426710424 --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
gh run view 30426711693 --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
pnpm run check:desktop-artifacts -- \
  --platform <platform> \
  --root <artifact-root> \
  --verify-inventory <artifact-root>/alhangeul-artifact-inventory.json
pnpm run create:release-checksums -- \
  --root <temporary-release-assets-root> \
  --output <temporary-release-assets-root>/SHA256SUMS
shasum -a 256 -c SHA256SUMS
gh release list --repo postmelee/alhangeul-tauri
git ls-remote --tags origin
```

결과:

- OK — remote candidate branch와 두 run의 head SHA가 모두 exact candidate와 일치.
- OK — CI 1개 job과 native 3개 job 모두 success.
- OK — Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB inventory 독립 재검산 통과.
- OK — installer 6개 checksum 생성과 독립 검증 통과.
- OK — 공개 GitHub Release와 remote tag 없음.
- OK — 검증 전용 임시 디렉터리 삭제 확인.
- OK — 문서 변경 포함 product boundary 185 files와 `git diff --check` 통과.

## 본문 변경 정도 / 본문 무손실 여부

- 제품 source, workflow, dependency와 build 설정은 변경하지 않았다.
- `DESKTOP_RELEASE.md`에는 Task #9의 새 성공 증적과 checksum 선별 절차만 추가했다.
- Task #5와 Task #7의 과거 run, artifact ID, 파일명·크기·hash 기록은 수정하지 않았다.
- remote `publish/task9`의 candidate SHA는 Stage 3 보고 commit으로 이동하지 않는다.

## 잔여 위험

- Stage 3는 bundle 생성·upload·inventory·checksum을 검증했으며 실제 installer 설치·실행·파일 연결·제거·rollback은 검증하지 않았다.
- Linux RPM 호환 native 환경과 Linux arm64 GUI session은 Stage 4 필수 gate다.
- Windows installer는 unsigned이고 SmartScreen 경고 가능성이 남는다.
- Actions artifact는 2026-08-12에 만료되며 final tag artifact나 공개 release asset으로 재사용하지 않는다.
- Stage 3 보고 commit은 candidate SHA 뒤에 생긴다. 게시 task에서는 release PR로 승격된 `main`의 immutable `v0.1.0` tag exact SHA에서 bundle과 checksum을 새로 생성해야 한다.
- Windows ARM64는 Issue #10 소유이며 Task #9의 baseline 또는 Go 판정에 포함하지 않는다.

## 다음 단계 영향

- Stage 4에서는 Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB의 설치·실행·파일 연결·제거와 rollback을 승인된 native 환경에서 검증한다.
- 필수 native 환경 하나라도 확보하지 못하거나 필수 시나리오가 실패하면 Task #9는 No-Go다.
- Stage 4 승인 전에는 native 설치 지시, release PR, tag, GitHub Release와 asset 게시를 수행하지 않는다.

## 승인 요청

- Stage 3 exact-SHA build·artifact·checksum 결과를 승인하면 Stage 4 native 설치·실행·rollback 검증으로 진행한다.
