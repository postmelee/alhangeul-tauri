# Task #9 Stage 3 보고서 — Task #11 통합 exact-SHA candidate 재검증

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
구현계획서: [`task_m010_9_impl.md`](../plans/task_m010_9_impl.md)
Stage: 3

## 단계 목적

Task #11의 Windows installer 계약이 `devel`에 merge된 뒤 과거 Task #9 candidate를 현재 수용 근거에서 제외하고, 최신 `devel`을 통합한 commit을 새 exact-SHA candidate로 고정한다. 같은 SHA의 platform-neutral CI와 Windows x64·Linux x64·Linux arm64 native build, Windows MSI·NSIS installer smoke를 실행하고 Actions artifact의 inventory와 공개 후보 `SHA256SUMS`를 독립 재검증한다.

이 단계는 release PR, tag, GitHub Release, signing, package repository, updater와 Windows ARM64를 다루지 않는다. 지원 범위 밖 현재 macOS host에서는 Windows/Linux desktop Rust·Tauri 성공을 로컬 결과로 주장하지 않고 Actions runner 결과만 사용한다.

## 산출물

| 파일·대상 | 변경 요약 |
|---|---|
| `package.json` | Task #9 release 검증과 Task #11 Windows packaging·smoke 자동화 test를 합집합으로 유지 |
| `scripts/check-release-metadata.mjs` | HWP/HWPX file association을 canonical ProgID `Alhangeul.hwp`·`Alhangeul.hwpx`로 검증 |
| `tests/release-metadata.test.mjs` | legacy association 이름을 거부하는 회귀 검증 추가 |
| `publish/task9` | 통합 commit `dd67d58f5367b478315417279ac8f6561bd5b718`을 가리키는 exact-SHA candidate branch |
| CI run `30707725441` | candidate SHA의 platform-neutral 검사와 Ubuntu desktop Rust test·Clippy |
| Native run `30707721476` | Windows x64·Linux x64·Linux arm64 bundle과 Windows installer smoke |
| `docs/operations/DESKTOP_RELEASE.md` | 현재 candidate run·artifact·installer·checksum·smoke 증적과 과거 후보 폐기 경계 |
| `mydocs/plans/task_m010_9_impl.md` | Task #11 merge 뒤 Stage 3 재검증 보정 계약 |
| `mydocs/orders/20260802.md` | Stage 3 candidate 재검증 완료 시각 |
| `mydocs/working/task_m010_9_stage3.md` | 본 단계 결과와 잔여 위험 |

candidate source commit 뒤에 생성되는 본 보고·운영 문서 commit으로 `publish/task9`을 이동하지 않는다. 게시 task에서는 `main`의 immutable tag exact SHA에서 artifact를 다시 생성해야 한다.

## exact-SHA run 결과

Candidate commit:

```text
dd67d58f5367b478315417279ac8f6561bd5b718
```

`git ls-remote --heads origin publish/task9`로 원격 branch가 candidate commit과 일치함을 확인한 뒤 두 workflow를 dispatch했다.

| Workflow | Run | Event | Head branch | Head SHA | 결과 |
|---|---:|---|---|---|---|
| Alhangeul CI | [30707725441](https://github.com/postmelee/alhangeul-tauri/actions/runs/30707725441) | `workflow_dispatch` | `publish/task9` | candidate와 일치 | success |
| Alhangeul Desktop Artifact Build | [30707721476](https://github.com/postmelee/alhangeul-tauri/actions/runs/30707721476) | `workflow_dispatch` | `publish/task9` | candidate와 일치 | success |

Job 결과:

| Run | Job ID | Job | 시작 (UTC) | 종료 (UTC) | 결과 |
|---:|---:|---|---|---|---|
| `30707725441` | `91389621886` | Unit tests | `2026-08-01T16:15:23Z` | `2026-08-01T16:18:35Z` | success |
| `30707721476` | `91389611183` | Build linux-arm64 | `2026-08-01T16:15:17Z` | `2026-08-01T16:19:11Z` | success |
| `30707721476` | `91389611153` | Build windows-x64 | `2026-08-01T16:15:17Z` | `2026-08-01T16:23:40Z` | success |
| `30707721476` | `91389611122` | Build linux-x64 | `2026-08-01T16:15:24Z` | `2026-08-01T16:23:57Z` | success |
| `30707721476` | `91390470144` | Smoke Windows x64 installers | `2026-08-01T16:23:59Z` | `2026-08-01T16:25:01Z` | success |

## artifact archive와 installer inventory

GitHub API 조회 시 build artifact 세 개와 installer smoke 진단 artifact는 모두 `expired: false`였다. API archive digest와 아래 installer SHA-256은 서로 다른 검증 대상이다.

| 대상 | Actions artifact | ID | Archive 크기 (bytes) | API archive digest | 만료 시각 (UTC) |
|---|---|---:|---:|---|---|
| Windows x64 | `alhangeul-desktop-windows-x64` | `8820936566` | 53,661,441 | `sha256:ecd2acfeedc05a0662e491fb0db940ff6200dd97d6b3a883532d1369d78d0232` | `2026-08-15T16:23:30Z` |
| Linux x64 | `alhangeul-desktop-linux-x64` | `8820940757` | 353,969,511 | `sha256:0c7fedc1226e6fa563df72c11e7edc3751e6f568fc8cd3dfe2e5f5fa26c81272` | `2026-08-15T16:23:35Z` |
| Linux arm64 | `alhangeul-desktop-linux-arm64` | `8820883528` | 90,029,396 | `sha256:3e2e54b86297e0abcce0289d99b90ef1bb24e8ec5dee568c54af1fce140cd747` | `2026-08-15T16:19:04Z` |
| Windows smoke | `alhangeul-desktop-windows-x64-installer-smoke` | `8820953739` | 28,948 | `sha256:e933e52682279c15b2fe541c09363a9ba4d0d400b2534095965772ef1f0e2204` | `2026-08-15T16:24:57Z` |

`gh run download`로 네 artifact를 `/private/tmp/alhangeul-task9-stage3.w0XYbv`에 내려받고 각 platform inventory를 다시 계산했다. 필수 bundle 여섯 개의 파일명·크기·SHA-256은 다음과 같으며 세 inventory가 모두 일치했다.

| Platform | 종류 | 파일 | 크기 (bytes) | SHA-256 |
|---|---|---|---:|---|
| Windows x64 | MSI | `msi/Alhangeul_0.1.0_x64_en-US.msi` | 28,188,672 | `065e5d8e073128f4d6ffb6a764fd31c36843d38933efeb55796bf81e8df13c02` |
| Windows x64 | NSIS | `nsis/Alhangeul_0.1.0_x64-setup.exe` | 25,708,275 | `20463d0021610a6607f7bb8752d185bcf7b8cf4be4d5437f02c1389492e1ecec` |
| Linux x64 | AppImage | `appimage/Alhangeul_0.1.0_amd64.AppImage` | 106,838,520 | `5478ab6beff2e46e2a1290c35ae38ab27b8eb35d77e4678638c5595fb6c8bf1e` |
| Linux x64 | DEB | `deb/Alhangeul_0.1.0_amd64.deb` | 30,092,908 | `67312f5720a4013388bd7d962f76ea73ff52dec29519e6428bd9766a90d8f040` |
| Linux x64 | RPM | `rpm/Alhangeul-0.1.0-1.x86_64.rpm` | 30,093,106 | `54436f3e689760978031dcf1fe2d6ce035c4958c1d7ca34c07fd72996b78f259` |
| Linux arm64 | DEB | `deb/Alhangeul_0.1.0_arm64.deb` | 30,050,132 | `9c45634f7486be1effa5983f76f1eb33acaa4f376fc94c7dfee79841572658e4` |

## Windows installer smoke

진단 artifact의 `checked-out-sha.txt`와 `workflow-context.json`이 candidate full SHA와 run `30707721476`을 가리켰다. `windows-installer-smoke-summary.json`의 전체 상태는 `passed`, failure는 0건이었다.

| Installer | 설치 | version·path·handler·shortcut | 기존 기본 연결 보존 | 제한 실행 | 제거 | 최종 clean | 소유 registry 잔여 |
|---|---:|---|---:|---|---:|---:|---:|
| MSI | exit `0` | 모두 `true` | `true` | 5초 생존 | exit `0` | `true` | `0` |
| NSIS | exit `0` | 모두 `true` | `true` | 5초 생존 | exit `0` | `true` | `0` |

- `.hwp`·`.hwpx` handler는 각각 `Alhangeul.hwp`·`Alhangeul.hwpx`로 검증됐다.
- installer 범위 밖 fixture의 전후 SHA-256이 같아 사용자 소유 파일 비삭제 계약을 통과했다.
- 자동 smoke는 package install·limited launch·uninstall 수용 증거이며 실제 GUI 문서 편집 시나리오를 대체하지 않는다.

## candidate checksum

원본 Actions artifact에는 inventory와 Tauri의 DEB/RPM 중간 전개 파일도 들어 있다. checksum 도구의 installer-only 입력 계약에 따라 필수 installer 여섯 개를 같은 임시 경로 아래의 깨끗한 `release-assets` root로 평탄화하고 `SHA256SUMS`를 생성했다.

```text
54436f3e689760978031dcf1fe2d6ce035c4958c1d7ca34c07fd72996b78f259  Alhangeul-0.1.0-1.x86_64.rpm
5478ab6beff2e46e2a1290c35ae38ab27b8eb35d77e4678638c5595fb6c8bf1e  Alhangeul_0.1.0_amd64.AppImage
67312f5720a4013388bd7d962f76ea73ff52dec29519e6428bd9766a90d8f040  Alhangeul_0.1.0_amd64.deb
9c45634f7486be1effa5983f76f1eb33acaa4f376fc94c7dfee79841572658e4  Alhangeul_0.1.0_arm64.deb
20463d0021610a6607f7bb8752d185bcf7b8cf4be4d5437f02c1389492e1ecec  Alhangeul_0.1.0_x64-setup.exe
065e5d8e073128f4d6ffb6a764fd31c36843d38933efeb55796bf81e8df13c02  Alhangeul_0.1.0_x64_en-US.msi
```

- `shasum -a 256 -c SHA256SUMS`: 6 files, 모두 `OK`
- `SHA256SUMS` 파일 크기: 568 bytes
- `SHA256SUMS` 자체 SHA-256: `856f8aeb90a4b9c7e2cf507662c83b26b7d68ea33c7aff7e875591c053b940fc`

검증 후 `/private/tmp/alhangeul-task9-stage3.w0XYbv`만 삭제했고 artifact나 checksum 초안을 저장소 또는 공개 다운로드 위치로 옮기지 않았다.

## 폐기한 과거 candidate

2026-07-29 candidate `6e0adc941b9eedbd2d7cceab12bf31dddf184c3a`와 CI run `30426710424`, native run `30426711693`은 당시 Stage 3 build·inventory·checksum을 통과했다. 그러나 Task #11 installer 계약을 포함하지 않으므로 현재 수용 결과와 후속 Go/No-Go 입력에서는 폐기하고 역사 증적으로만 보존한다. 과거 artifact와 checksum을 현재 candidate 또는 공개 asset으로 재사용하지 않는다.

## 검증 결과

candidate commit의 로컬 platform-neutral 검증:

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
actionlint .github/workflows/ci.yml .github/workflows/alhangeul-desktop.yml
```

결과:

- OK — frozen lockfile 설치 완료, lockfile 변경 없음.
- OK — product boundary 189 files, violation 없음.
- OK — 제품 version surface 모두 `0.1.0`, release metadata `Alhangeul 0.1.0`.
- OK — `rhwp` `v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`.
- OK — automation 76/76, upstream 32/32, studio 114/114.
- OK — studio production build 완료. 기존 runtime image URL과 chunk 관련 경고만 있었고 종료 코드는 0이었다.
- OK — 두 workflow의 actionlint 통과.

remote·artifact·checksum 검증:

```bash
git ls-remote --heads origin publish/task9
gh run view 30707725441 --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
gh run view 30707721476 --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
pnpm run check:desktop-artifacts -- \
  --platform <platform> \
  --root <artifact-root> \
  --verify-inventory <artifact-root>/alhangeul-artifact-inventory.json
pnpm run create:release-checksums -- \
  --root <temporary-release-assets-root> \
  --output <temporary-release-assets-root>/SHA256SUMS
shasum -a 256 -c SHA256SUMS
gh release list --repo postmelee/alhangeul-tauri --limit 100
git ls-remote --tags origin
```

결과:

- OK — remote candidate branch와 두 run의 head SHA가 모두 exact candidate와 일치.
- OK — CI 1개 job, native build 3개 job, Windows installer smoke 1개 job 모두 success.
- OK — Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB inventory 독립 재검산 통과.
- OK — Windows MSI·NSIS package smoke의 install·limited launch·association 보존·uninstall·cleanup 통과.
- OK — installer 6개 checksum 생성과 독립 검증 통과.
- OK — 공개 GitHub Release와 remote tag 없음.
- OK — 검증 전용 임시 디렉터리 삭제 확인.
- OK — 문서 변경 포함 product boundary 189 files와 `git diff --check` 통과.

## 본문 변경 정도 / 본문 무손실 여부

- Task #11 merge를 통합하면서 automation 목록을 합집합으로 유지하고 release metadata의 association 기대값만 canonical ProgID로 보정했다.
- release metadata의 나머지 제품명·version·identifier·publisher·설명·category·license·updater 경계와 checksum 도구 계약은 보존했다.
- `DESKTOP_RELEASE.md`의 Task #5·Task #7 과거 run과 artifact 증적은 수정하지 않았다.
- 과거 Task #9 candidate는 삭제하지 않고 superseded 역사 증적으로 분리했다.
- remote `publish/task9`의 candidate SHA는 Stage 3 보고 commit으로 이동하지 않는다.

## 잔여 위험

- 자동 Windows smoke는 MSI·NSIS 설치·제한 실행·파일 연결 보존·제거·cleanup을 검증했지만 실제 Explorer UI와 HWP/HWPX open·edit·save·export·print 시나리오는 검증하지 않았다.
- Linux x64 AppImage·DEB·RPM과 Linux arm64 DEB의 실제 native 설치·GUI 실행·제거는 Stage 4 필수 gate다.
- Windows installer는 unsigned이고 SmartScreen 경고 가능성이 남는다.
- Actions artifact는 2026-08-15에 만료되며 final tag artifact나 공개 release asset으로 재사용하지 않는다.
- Stage 3 보고 commit은 candidate SHA 뒤에 생긴다. 게시 task에서는 release PR로 승격된 `main`의 immutable `v0.1.0` tag exact SHA에서 bundle과 checksum을 새로 생성해야 한다.
- Windows ARM64는 Issue #10 소유이며 Task #9의 baseline 또는 Go 판정에 포함하지 않는다.

## 다음 단계 영향

- Stage 4에서는 Windows x64의 실제 GUI 문서·Explorer 시나리오와 Linux x64 AppImage·DEB·RPM, Linux arm64 DEB의 설치·실행·문서·제거·rollback을 승인된 native 환경에서 검증한다.
- Task #11 automated Windows package smoke는 Stage 4의 package 설치·제거 선행 증거로 사용하되 수동 GUI 시나리오를 대체하지 않는다.
- 필수 native 환경 하나라도 확보하지 못하거나 필수 시나리오가 실패하면 Task #9는 No-Go다.
- Stage 4 승인 전에는 native 설치 지시, release PR, tag, GitHub Release와 asset 게시를 수행하지 않는다.

## 승인 요청

- Stage 3 Task #11 통합 exact-SHA build·artifact·checksum·Windows installer smoke 결과를 승인하면 Stage 4 native 설치·GUI·rollback 검증으로 진행한다.
