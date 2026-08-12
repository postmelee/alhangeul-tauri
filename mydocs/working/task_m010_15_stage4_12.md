# Task #15 Stage 4.12 완료 보고서 — PR 리뷰 보정 exact 후보 자동 gate

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 4.12

## 단계 목적

Stage 4.11에서 PR #22 review를 반영한 source commit을 새 exact 제품 후보로 고정하고,
플랫폼 중립 CI와 Windows x64·Linux x64·Linux arm64 native build, artifact inventory 및
Windows MSI·NSIS installer smoke를 다시 수행한다. 이전 `da488a8` 후보는 제품 코드가
달라졌으므로 최종 자동 gate 근거로 재사용하지 않는다.

## exact 후보와 workflow 결과

| 항목 | 값 |
|---|---|
| source branch | `publish/task15` |
| candidate SHA | `b5b75e2bea6258338e6df5bd6d36fa10e78a4ced` |
| CI | [#31578400323](https://github.com/postmelee/alhangeul-tauri/actions/runs/31578400323) — success |
| Desktop Artifact Build | [#31578819989](https://github.com/postmelee/alhangeul-tauri/actions/runs/31578819989) — success |
| CI 범위 | product/version/release/rhwp pin, automation/upstream/Studio, Studio build, Rust test·Clippy |
| native 범위 | Windows x64, Linux x64, Linux arm64, MSI·NSIS installer smoke |

첫 Desktop Artifact Build
[#31578402729](https://github.com/postmelee/alhangeul-tauri/actions/runs/31578402729)은
제품 후보 결함이 아니라 잘못 입력한 존재하지 않는 `build_ref` `b5b75e2fc566…` 때문에 세
플랫폼 모두 `Checkout`에서 `not our ref`로 종료됐다. 실제 candidate SHA를 다시 대조한 뒤
올바른 전체 SHA로 재실행했으며, 성공 run `31578819989`만 제품 수용 근거로 사용한다.

## artifact inventory

Actions artifact 네 개를 독립 다운로드해 동봉 inventory를 재계산했다.

| 플랫폼·종류 | 크기 | SHA-256 |
|---|---:|---|
| Windows x64 MSI | 52,785,152 bytes | `b9820340025252c22ea9497a0fe5228c31151dc95fdae658a8fa4b6b3b95691e` |
| Windows x64 NSIS | 48,469,370 bytes | `072b389b955415770e7147deaf4ac9ad8752f0e0589331b02501d1803a92d320` |
| Linux x64 AppImage | 131,144,184 bytes | `1f012e28f03eaf8e08115d0bbae6c8808c7de9f4e0efcd948a63f36b97dcf1f0` |
| Linux x64 DEB | 54,729,766 bytes | `bbae00be4366f1c37a1a43600cb0dbff4920096bec5857e9821a0da7c6788f5c` |
| Linux x64 RPM | 54,729,455 bytes | `7678b9714383236ae37823968c47440efab8465ea4563c7cee90c35fe700e0cb` |
| Linux arm64 DEB | 54,685,234 bytes | `92e774b254b109b7eb470917ce33232ab6b05b1420e2cb933654d82a2ba181d1` |

| Actions artifact | ID | archive 크기 | archive SHA-256 | 만료 예정 |
|---|---:|---:|---|---|
| `alhangeul-desktop-windows-x64` | `9134536906` | 101,025,358 bytes | `a0e9bca6ac30ce09dc60ea1143b58f7ec335d34c1d2ef89ccc14156b28a1d432` | 2026-08-26 |
| `alhangeul-desktop-linux-x64` | `9134679324` | 501,470,025 bytes | `fb3e7831132eae88343c79c244b99292c220fc5281bff92731fab163cece2c3a` | 2026-08-26 |
| `alhangeul-desktop-linux-arm64` | `9134410810` | 163,943,670 bytes | `be514178871b2a0c410b8bc3a64a8f6a4c415abf71b9e8ff41eae1891ca8412e` | 2026-08-26 |
| `alhangeul-desktop-windows-x64-installer-smoke` | `9134718346` | 31,108 bytes | `4d81ec18f04df8ba566f6d900d29a825cf096eed6fcaacb96df99e699c583a2f` | 2026-08-26 |

Windows smoke summary는 expected version `0.1.0`, overall `passed`를 기록했다. MSI·NSIS 모두
install·제한 실행·uninstall exit code가 0이고, HWP/HWPX handler·Open With, shortcut,
외부 fixture 무손실과 최종 clean state를 통과했다. smoke checkout SHA도 candidate SHA와
일치했다.

## 본문 변경 정도 / 본문 무손실 여부

이번 단계에서는 제품 코드, upstream submodule, HWP/HWPX/direct PDF 데이터와 native
workflow를 변경하지 않았다. Stage 4.11 제품 후보를 원격 runner와 다운로드 inventory에서
검증하고 그 결과만 문서화했다. release tag, GitHub Release, 서명, updater와 package
repository 게시도 수행하지 않았다.

## 검증 명령

```bash
gh run view 31578400323 --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
gh run view 31578819989 --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download 31578819989 --repo postmelee/alhangeul-tauri \
  --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform <platform> \
  --root <artifact-root> --verify-inventory <inventory-path>
git diff --check --ignore-submodules=all
```

## 검증 결과

- OK — CI와 Desktop Artifact Build의 event, branch, head SHA가 candidate와 일치했다.
- OK — Windows x64·Linux x64·Linux arm64의 product-neutral pretest와 native bundle build가
  모두 성공했다.
- OK — 다운로드한 6개 installer의 크기·SHA-256이 workflow inventory와 일치했다.
- OK — Windows MSI·NSIS installer smoke의 설치·실행·제거와 최종 clean state가 통과했다.
- OK — Stage 4.11 focused test가 stale focus poll 역전, 5분 비종료 watchdog과 surface 유지,
  혼합 크기 Linux upstream CSS 유지, CSP bundled style fail-fast와 upstream ID drift를 고정한다.
- INFO — 존재하지 않는 SHA를 입력한 첫 native run은 제품 실패가 아니라 operator input
  오류로 분리했다.

## GUI 검증과 제한

- 이전 Windows x64 exact GUI `8971897`은 system dialog 직접 진입, Print-to-PDF 저장창
  handoff, 상태 복원과 반복 인쇄를 통과했다.
- 이전 Linux x64 exact GUI `8971897`은 CUPS-PDF·GTK Print to File·direct PDF 6쪽 A4를
  통과했고, `da488a8` Linux arm64 exact GUI도 CUPS-PDF·direct PDF와 반복 인쇄를 통과했다.
- 새 `b5b75e2` 후보는 Windows focus race·watchdog과 Linux 혼합 크기 적용 조건을 변경했으나,
  접근 가능한 Windows VDI·Linux GUI에서 직접 반복하지 못했다. 정상 경로와 5분 경로는
  focused fake-timer test 및 exact native build로 검증했으며 이 제한을 PR에 공개한다.
- 특히 실제 system dialog를 5분 넘게 유지하는 시나리오와 혼합 페이지 크기 Linux 실제
  media 전환은 수동 GUI 미검증 상태다. 자동 gate 성공을 이 두 GUI 주장으로 확대하지 않는다.

## 다음 단계 영향

- 최종 보고서와 PR 본문을 candidate SHA, 97-test, 새 CI/native run과 GUI 제한 기준으로
  갱신한다.
- PR review에 1~5번 보정과 6번 의도 확인, exact 자동 gate 결과를 답한다.
- Issue #15 close, PR merge, release, tag와 배포는 수행하지 않는다.

## 승인 요청

- 작업지시자의 “진행해줘” 승인에 따라 Stage 4.12 자동 gate와 PR 리뷰 답변까지 진행한다.
