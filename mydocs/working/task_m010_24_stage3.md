# Task #24 Stage 3 보고서 — v0.8.4 exact-SHA native artifact 확정

GitHub Issue: [#24](https://github.com/postmelee/alhangeul-tauri/issues/24)
구현계획서: [`task_m010_24_impl.md`](../plans/task_m010_24_impl.md)
Stage: 3

## 단계 목적

Stage 2에서 플랫폼 중립 수용을 마친 rhwp v0.8.4 candidate를 하나의 실행 가능 SHA로 고정하고, 같은 SHA의 CI와 Windows x64·Linux x64·Linux arm64 native bundle 및 Windows installer smoke를 생성·검증한다. 실패한 최초 canary 산출물은 계승하지 않고 원인을 최소 보정한 새 exact SHA에서 전체 gate를 다시 실행했다.

## 산출물

| 파일·원격 산출물 | 변경·결과 요약 |
|---|---|
| `tests/rhwp-sync-changes.test.mjs` | Windows에서 절대 경로가 `D:\\tmp\\...`로 정규화되는 실제 계약에 맞춰 예상 output 경로를 `node:path.resolve()`로 계산했다. |
| `tests/rhwp-sync-pr-body.test.mjs` | 같은 Windows 경로 정규화 계약을 적용했다. 제품 코드·workflow 동작은 변경하지 않았다. |
| `publish/task24` | 실행 가능 canary `88baa5666ec55bf043844bae01ec4d422278851c`를 non-force fast-forward push했다. |
| [Alhangeul CI #31688454752](https://github.com/postmelee/alhangeul-tauri/actions/runs/31688454752) | exact canary SHA에서 Unit tests job `94409981595` 성공. Rust test·Clippy를 포함한 전체 CI가 통과했다. |
| [Desktop Artifact Build #31688732973](https://github.com/postmelee/alhangeul-tauri/actions/runs/31688732973) | 같은 exact SHA에서 세 native matrix와 Windows installer smoke가 모두 성공했다. |
| `mydocs/working/task_m010_24_stage3.md` | 최초 실패, 보정, 최종 run, artifact provenance·inventory·checksum을 기록했다. |

### 최초 canary 실패와 처리

- 최초 canary `cd332de0bce42573ee7b7880706e52e43d31db82`의 [CI #31686630325](https://github.com/postmelee/alhangeul-tauri/actions/runs/31686630325)는 성공했다.
- 같은 SHA의 [native run #31687237040](https://github.com/postmelee/alhangeul-tauri/actions/runs/31687237040)은 Linux x64 job `94406048014`와 Linux arm64 job `94406048081`이 성공했지만, Windows x64 job `94406048075`가 automation test에서 실패했다. 그 결과 Windows artifact가 없어 installer smoke job `94409701022`도 실패했다.
- 실패 원인은 production code가 `resolve(output)`으로 올바르게 생성한 Windows 절대 경로를 두 test만 POSIX `/tmp/...` 문자열로 고정한 데 있었다. 두 test의 예상값만 플랫폼 중립적으로 보정했고, 최초 run의 일부 Linux artifact는 최종 증거로 재사용하지 않았다.
- 보정 commit은 `88baa5666ec55bf043844bae01ec4d422278851c`이며 focused test 10/10, 전체 automation test 120/120을 로컬에서 통과했다.

### 최종 native job

| 플랫폼·gate | Job ID | 결과 |
|---|---:|---|
| Linux x64 build·inventory·upload | `94410873556` | 성공 |
| Windows x64 build·inventory·upload | `94410873557` | 성공 |
| Linux arm64 build·inventory·upload | `94410873570` | 성공 |
| Windows x64 MSI·NSIS installer smoke | `94414784342` | 성공 |

Windows smoke 진단은 MSI와 NSIS 모두 clean install, 앱 제한 실행, HWP/HWPX handler·shortcut·기존 기본 연결 보존, uninstall 후 제품 소유 경로·registry 정리를 `passed`로 판정했다. 진단의 `checked-out-sha.txt`와 workflow `requestedBuildRef`도 모두 `88baa5666ec55bf043844bae01ec4d422278851c`였다.

### GitHub Actions artifact provenance

| Artifact | ID | 압축 크기 | Archive SHA-256 | 만료 시각(UTC) |
|---|---:|---:|---|---|
| `alhangeul-desktop-windows-x64-installer-smoke` | `9176977156` | 31,191 B | `1e91875ef4bd8b8e3dab99e04602a42bd5a90920c9616ae7919947092e6e077b` | 2026-08-27 10:12:00 |
| `alhangeul-desktop-windows-x64` | `9176938095` | 102,217,253 B | `6bfc9e288d94084438ff135d1d6633bd9bb696baf19b17cfbd82995649f8f9ab` | 2026-08-27 10:10:34 |
| `alhangeul-desktop-linux-x64` | `9176850348` | 505,449,721 B | `5f7a0df6aa6567d221523243eba8c0e2b1b022f4d23683577a30707d32223d7f` | 2026-08-27 10:07:09 |
| `alhangeul-desktop-linux-arm64` | `9176603779` | 166,240,083 B | `5f6a338b1c013a4ffee3c99d9d89fed6b9584dc06c54a9b731508db118dcfd98` | 2026-08-27 09:59:16 |

네 artifact의 GitHub metadata `workflow_run.head_sha`는 모두 최종 canary SHA와 일치하고 `expired=false`였다.

### 독립 package checksum

네 artifact를 `/private/tmp/task24-stage3.V2NuRD`에 내려받아 inventory verifier와 별도 `shasum -a 256` 계산을 수행했다. 다음 필수 package의 크기·SHA-256이 inventory와 일치했다.

| 플랫폼 | Kind·파일 | 크기 | SHA-256 |
|---|---|---:|---|
| Windows x64 | MSI `Alhangeul_0.1.0_x64_en-US.msi` | 53,424,128 B | `4861eae6a0bb08b072888dcf652e6eea3121735f167016cf61e5b19dfa1ee652` |
| Windows x64 | NSIS `Alhangeul_0.1.0_x64-setup.exe` | 49,023,164 B | `a24f3e1331a25226bc1d543709a13133743fab662a3dfd747c0a15d84959667e` |
| Linux x64 | AppImage `Alhangeul_0.1.0_amd64.AppImage` | 131,820,024 B | `e6ab104b13af5b78b6c8290f5d1979d26f9b785ab72c2e2d6a81f4831c6dc876` |
| Linux x64 | DEB `Alhangeul_0.1.0_amd64.deb` | 55,423,840 B | `7cb4036fd6886752fdc7fba09766cd8abd4f8677d29c23a6c204e90edbc1cc7b` |
| Linux x64 | RPM `Alhangeul-0.1.0-1.x86_64.rpm` | 55,423,924 B | `5580af3a9d6f7427dd9078dabf91ab136f6824e141b438d08dcebf8bced286b8` |
| Linux arm64 | DEB `Alhangeul_0.1.0_arm64.deb` | 55,444,426 B | `7bb17e3480319593f412e1751fc0e93a7db080e72d2c28a99249f95eba35f4d4` |

임시 경로의 artifact는 검증용이며 release asset이나 영구 다운로드 경로로 게시하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

- 제품 코드, bundled Studio, workflow, release metadata에는 변경이 없다.
- 두 automation test의 예상 절대 경로만 호스트 OS의 `resolve()` 결과를 따르도록 보정했다. production output 경로 계약과 sync PR 본문은 보존된다.
- Stage 3 보고서와 오늘할일만 새 증적을 기록한다.

## 검증 결과

실행 명령:

```bash
node --test tests/rhwp-sync-changes.test.mjs tests/rhwp-sync-pr-body.test.mjs
pnpm run test:automation
gh run view 31688454752 --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
gh run view 31688732973 --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
pnpm run check:desktop-artifacts -- \
  --platform windows-x64 \
  --root /private/tmp/task24-stage3.V2NuRD/alhangeul-desktop-windows-x64 \
  --verify-inventory /private/tmp/task24-stage3.V2NuRD/alhangeul-desktop-windows-x64/alhangeul-artifact-inventory.json
pnpm run check:desktop-artifacts -- \
  --platform linux-x64 \
  --root /private/tmp/task24-stage3.V2NuRD/alhangeul-desktop-linux-x64 \
  --verify-inventory /private/tmp/task24-stage3.V2NuRD/alhangeul-desktop-linux-x64/alhangeul-artifact-inventory.json
pnpm run check:desktop-artifacts -- \
  --platform linux-arm64 \
  --root /private/tmp/task24-stage3.V2NuRD/alhangeul-desktop-linux-arm64 \
  --verify-inventory /private/tmp/task24-stage3.V2NuRD/alhangeul-desktop-linux-arm64/alhangeul-artifact-inventory.json
find /private/tmp/task24-stage3.V2NuRD -type f \
  \( -name '*.msi' -o -name '*.exe' -o -name '*.AppImage' \
     -o -name '*.deb' -o -name '*.rpm' \) \
  -print0 | xargs -0 shasum -a 256
git diff --check
```

결과:

- OK — focused automation test 10/10, 전체 automation test 120/120.
- OK — CI run `31688454752`는 `workflow_dispatch`, `publish/task24`, exact SHA `88baa566...`, conclusion `success`.
- OK — native run `31688732973`은 같은 exact SHA이며 세 build job과 installer smoke가 모두 `success`.
- OK — Windows x64 필수 kind `msi`, `nsis`; Linux x64 `appimage`, `deb`, `rpm`; Linux arm64 `deb` inventory 재검증 통과.
- OK — 별도 SHA-256 계산 결과가 여섯 필수 package inventory와 일치.
- OK — `git diff --check` 통과.

## 잔여 위험

- 자동 installer smoke는 실제 GUI 문서 편집·저장·PDF·system print를 증명하지 않는다. Stage 4의 Windows x64 수동 GUI 수용이 필수다.
- Linux x64 GUI와 Linux arm64 실제 GUI는 아직 검증하지 않았다. 계획대로 Stage 5에서 Linux x64를 수용하고 arm64는 hosted artifact 한계를 명시한다.
- Actions artifact는 2026-08-27에 만료되므로 Stage 4/5 검증에 위 ID와 checksum으로 식별해 사용해야 한다.

## 다음 단계 영향

- Stage 4 Windows 수용 대상은 native run `31688732973`, exact SHA `88baa5666ec55bf043844bae01ec4d422278851c`의 MSI와 NSIS로 고정한다.
- Stage 3 보고서 commit은 증적 문서만 추가하므로 실행 가능 SHA를 변경하지 않는다. 이후 실행 코드·workflow·generated artifact가 바뀌면 새 exact SHA에서 CI와 native matrix를 다시 실행해야 한다.
- Stage 4에서 MSI와 NSIS를 분리해 clean install → GUI smoke → uninstall하고 HWP/HWPX 저장, searchable PDF, system print, toolbar 초기 상태와 drag-in을 확인한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 Windows x64 native·GUI 수용으로 진행한다.
