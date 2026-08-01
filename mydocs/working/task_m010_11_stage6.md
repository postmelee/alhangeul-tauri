# Task #11 Stage 6 보고서 — exact-SHA Windows installer 수용 검증과 Task #9 handoff

GitHub Issue: [#11](https://github.com/postmelee/alhangeul-tauri/issues/11)
구현계획서: [`task_m010_11_impl.md`](../plans/task_m010_11_impl.md)
Stage: 6

## 단계 목적

Stage 5의 packaging 보정을 포함한 exact SHA에서 기존 Windows/Linux build matrix와 Windows MSI·NSIS package smoke를 함께 통과시키고, 원인·해결·artifact provenance를 운영 문서에 고정한다. Task #11 artifact는 공개 후보로 승계하지 않고 Task #9이 merge 뒤 최신 `devel`에서 새 prerelease candidate를 검증하도록 handoff 경계를 확정한다.

## 최종 수용 증적

- Source commit: `83777562231d92d5bc8aab3fbfbb7b2e7bb7b81d`
- Remote ref: `origin/publish/task11`이 workflow dispatch 시점에 같은 SHA
- [Workflow run `30695249890`](https://github.com/postmelee/alhangeul-tauri/actions/runs/30695249890): `workflow_dispatch`, head branch `publish/task11`, head SHA 일치, conclusion `success`

| Job | ID | 결과 |
|---|---:|---|
| Build Linux arm64 | `91356899425` | success |
| Build Windows x64 | `91356899435` | success |
| Build Linux x64 | `91356899470` | success |
| Smoke Windows x64 installers | `91357628850` | success |

| Artifact | ID | 크기 (bytes) | API archive digest | 만료 시각 (UTC) |
|---|---:|---:|---|---|
| `alhangeul-desktop-windows-x64-installer-smoke` | `8817118783` | 29,081 | `sha256:126502d24452da817fe0b80fbfe6f2a284d42d8778a971cacd0eb60b81932eb7` | `2026-08-15T10:21:15Z` |
| `alhangeul-desktop-windows-x64` | `8817109545` | 53,658,704 | `sha256:ce99efdaae9297c9d71ca2d424c358884659951476b3b855c4f097ed8da44385` | `2026-08-15T10:20:17Z` |
| `alhangeul-desktop-linux-x64` | `8817102462` | 353,970,093 | `sha256:254858e62e24eacb06456ee3773a1147dde70093fcf908d4df214a6cd477008d` | `2026-08-15T10:19:20Z` |
| `alhangeul-desktop-linux-arm64` | `8817075188` | 90,029,526 | `sha256:3b022eb5a09f305b10c0d59e88235d31eb44ac29ec22812b77890ec8f1ff2028` | `2026-08-15T10:16:51Z` |

다운로드한 Windows artifact의 동봉 inventory를 독립 재검증했다.

| 종류 | 파일 | 크기 (bytes) | SHA-256 |
|---|---|---:|---|
| MSI | `msi/Alhangeul_0.1.0_x64_en-US.msi` | 28,188,672 | `9c8b43187f8a613131dc052a075fef8202476a84c3b2ab9e7d77c474fb162c07` |
| NSIS | `nsis/Alhangeul_0.1.0_x64-setup.exe` | 25,705,538 | `2b208f665319fab42572662e4ac5ee96cf691f57f6cbb6021901b1769adf1af8` |

MSI와 NSIS summary는 모두 clean state, install exit `0`, version `0.1.0`, canonical handler, 기존 기본 연결 불변, Desktop·Start Menu shortcut, bounded launch, uninstall exit `0`과 cleanup을 통과했다. Fixture는 전후 SHA-256 `5B1B2C78885979086ACC790098BB28E71DAC9FB0FC1335D6C32CF3B091BDAE4B`로 동일했다. MSI log에는 Desktop·Start Menu·uninstall shortcut의 `ShortcutCreate`와 대응하는 세 `ShortcutRemove`가 확인됐다.

## 원인 판정과 보정 경과

| 구간 | 증적과 판정 |
|---|---|
| Stage 6–6.3 | WiX fatal validation을 verbose log로 노출하고 registry path·icon 계약을 보정해 Windows bundle 생성까지 회복 |
| Stage 6.4–6.6 | User-profile shortcut HKCU key path와 target 계약을 보정하고 `ICE69` 제거; MSI table은 정상이나 `ShortcutCreate`가 계속 없음 |
| Stage 6.7 | 동일 artifact가 `windows-2022`에서도 같은 결과여서 `windows-2025` 환경 특이성 배제 |
| Stage 6.8 | 계승 template의 `REINSTALLMODE="amu"`에 빠진 `s`를 복원해 Tauri 기본 `amus`와 정렬; 새 exact-SHA run에서 shortcut 생성·제거와 전체 gate 성공 |

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-desktop.yml` | exact-SHA Windows installer smoke, 진단 보존과 최종 gate; 최종 runner `windows-2025` |
| `apps/desktop/src-tauri/windows/main.wxs` | WiX registry·icon·shortcut 계약과 `REINSTALLMODE="amus"` 복원 |
| `scripts/windows-installer-smoke.ps1` | MSI·NSIS 설치·version·handler·shortcut·launch·cleanup 진단 |
| `tests/actions-workflows.test.mjs` | workflow exact-SHA·artifact-consumer·diagnostic 계약 |
| `tests/windows-installer-smoke.test.mjs` | PowerShell smoke source와 Windows 호환성 회귀 계약 |
| `tests/windows-packaging.test.mjs` | WiX packaging과 `REINSTALLMODE="amus"` 계약 |
| `docs/operations/DESKTOP_RELEASE.md` | 자동 package smoke 증적과 남은 공개 배포 gate |
| `mydocs/plans/task_m010_11_impl.md` | Stage 6.8 성공 판정과 실제 문서 산출물 반영 |
| `mydocs/troubleshootings/task_m010_11_windows_installer.md` | MSI shortcut 미생성 원인·해결·재발 방지 기록 |
| `mydocs/orders/20260801.md` | Stage 6 수용 검증 완료와 승인 대기 상태 |
| `mydocs/working/task_m010_11_stage6.md` | Stage 6 결과와 Task #9 handoff 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 UI, HWP/HWPX 편집 동작, Rust native API, 제품 version `0.1.0`, bundle identifier, publisher, 지원 플랫폼과 Linux bundle 종류는 변경하지 않았다. Installer handler는 canonical `OpenWithProgids`만 소유하고 기존 extension default와 `UserChoice`를 변경하지 않는 Stage 1 계약을 유지했다.

수용 기준은 실패 경과 중 완화하지 않았다. `REINSTALLMODE="amus"`는 Tauri CLI 2.10.1 기본 동작을 복원하며 update·repair 시 사용자가 삭제한 shortcut이 다시 생길 수 있는 trade-off를 작업지시자 승인 아래 수용했다. Release, tag, signing, updater, package 게시와 공개 다운로드 경로는 만들지 않았다.

## 검증 결과

실행 명령:

```bash
git push origin HEAD:refs/heads/publish/task11
git ls-remote --heads origin refs/heads/publish/task11
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri --ref publish/task11 -f build_ref=83777562231d92d5bc8aab3fbfbb7b2e7bb7b81d -f run_tests=true
gh run view 30695249890 --repo postmelee/alhangeul-tauri --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download 30695249890 --repo postmelee/alhangeul-tauri --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform windows-x64 --root <windows-artifact-root> --verify-inventory <inventory-path>
node --test tests/windows-packaging.test.mjs tests/windows-installer-smoke.test.mjs
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
actionlint .github/workflows/alhangeul-desktop.yml
git diff --check
```

결과:

- OK — `origin/publish/task11`과 dispatch candidate가 exact source commit `83777562231d92d5bc8aab3fbfbb7b2e7bb7b81d`로 일치.
- OK — run `30695249890`의 세 platform build, artifact inventory·upload와 Windows installer smoke가 모두 성공.
- OK — diagnostic summary와 MSI log에서 MSI·NSIS 수용 기준, fixture 무손실과 shortcut 생성·제거 operation 확인.
- OK — 다운로드한 Windows artifact inventory 재계산 통과.
- OK — focused packaging·installer contract `13/13`, 전체 automation `53/53` 통과.
- OK — product boundary `185 files scanned`, 제품 version 5개 surface `0.1.0` 일치.
- OK — `rhwp` pin `v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개 일치.
- OK — upstream `32/32`, studio `114/114`, studio production build 성공.
- OK — workflow lint와 whitespace 검사 통과.

Task #11 branch에는 `check:release-metadata`가 없으므로 이를 성공으로 주장하지 않는다. Task #9의 새 통합 candidate에서 수행한다.

## 잔여 위험

- 자동 smoke는 bounded process 생성까지만 확인하며 실제 GUI에서 HWP/HWPX 열기·저장·인쇄나 Explorer 기본 앱 선택 UI를 검증하지 않는다.
- Linux x64·arm64는 bundle build와 inventory만 검증했으며 package 설치·실행·rollback을 검증하지 않았다.
- Artifact는 서명되지 않은 14일 보존 진단물이며 GitHub Release나 공개 배포물이 아니다.
- `REINSTALLMODE="amus"`는 update·repair에서 사용자가 지운 shortcut을 복원할 수 있다.
- Task #11 merge 전 Task #9 candidate를 만들거나 과거 candidate를 재사용하면 이번 installer 보정과 `check:release-metadata`를 함께 보장할 수 없다.

## 다음 단계 영향

- Stage 6 승인 뒤 `task-final-report` 절차로 Task #11 최종 보고서와 `devel` 대상 PR을 준비한다.
- Task #11 merge 뒤에만 Task #9이 최신 `devel`을 통합하고 과거 candidate를 폐기한다.
- Task #9은 `check:release-metadata`를 포함한 새 exact-SHA prerelease candidate로 전체 release gate를 다시 검증한다.
- 실제 public release, tag, signing, updater와 package 게시에는 별도 명시 승인이 필요하다.

## 승인 요청

- Stage 6 산출물과 검증 결과를 승인하면 Task #11 최종 보고서와 PR 게시 단계로 진행한다.
