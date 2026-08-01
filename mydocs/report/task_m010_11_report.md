# Task #11 최종 보고서 — Windows x64 installer smoke 자동화와 MSI 진단

GitHub Issue: [#11](https://github.com/postmelee/alhangeul-tauri/issues/11)
마일스톤: M010

## 작업 요약

- 대상 이슈: #11
- 마일스톤: M010 — v0.1.0
- 단계 수: 6개 Stage와 승인된 하위 보정 Stage 4.1–4.4, 6.1–6.8
- 작업 목적: Windows x64 MSI·NSIS를 fresh runner에서 반복 검증하고, VDI MSI 실패와 installer packaging 결함을 증거 기반으로 분리·해결한다.

Task #9의 Windows VDI 보고서는 MSI exit `1602`, NSIS 실행 성공과 file association 미확정 상태를 남겼다. Task #11은 이를 곧바로 WiX 결함으로 단정하지 않고 installer별 clean state, exit, version, canonical handler, 기존 기본 연결 불변, shortcut, bounded launch, uninstall cleanup과 fixture 보존을 공통 수용 계약으로 고정했다.

GitHub-hosted Windows에서는 MSI `1602`가 재현되지 않았고 양 installer의 silent install·uninstall은 exit `0`이었다. 대신 실행 파일명, handler, shortcut과 기본 연결 정책의 실제 packaging 불일치를 확인해 최소 보정했다. 마지막 MSI shortcut 미생성 원인은 계승한 WiX template의 `REINSTALLMODE="amu"`에서 shortcut 처리 flag `s`가 빠진 것이었으며 Tauri CLI 2.10.1 기본값과 같은 `amus`로 복원했다.

최종 exact-SHA run `30695249890`은 source commit `83777562231d92d5bc8aab3fbfbb7b2e7bb7b81d`에서 Windows x64·Linux x64·Linux arm64 build와 Windows MSI·NSIS smoke를 모두 통과했다. 이 결과는 자동 package smoke 수용 증적이며 공개 release나 실제 GUI 문서 기능 성공을 뜻하지 않는다.

2026-08-01 PR #12 리뷰로 진단 보존, NSIS 기본값 복원, workflow 실패 보고 경로를 보정했다. 이 보정은 `8377756` 이후 변경이므로 **위 native run은 현재 head에 대한 수용 증적이 아니다.** 상세는 아래 "PR #12 리뷰 반영"을 따른다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `.github/workflows/alhangeul-desktop.yml` | Windows artifact를 소비하는 fresh installer smoke job, exact-SHA 확인, 항상 실행되는 diagnostic upload와 최종 failure gate | 수동 desktop artifact workflow |
| `scripts/windows-installer-smoke.ps1` | MSI·NSIS 설치, version·registry·handler·default·shortcut·launch·제거·fixture·cleanup 판정과 원본 진단 수집 | Windows x64 package smoke |
| `apps/desktop/src-tauri/Cargo.toml` | main binary target을 `Alhangeul`로 정렬 | desktop bundle executable 이름 |
| `apps/desktop/src-tauri/tauri.conf.json` | canonical HWP/HWPX association, NSIS Start Menu 폴더와 hook 연결 | Windows NSIS packaging |
| `apps/desktop/src-tauri/windows/main.wxs` | canonical Open With handler, registry-keyed shortcut, icon·target·registry 경로와 `REINSTALLMODE="amus"` 정렬 | Windows MSI packaging |
| `apps/desktop/src-tauri/windows/nsis-hooks.nsh` | install·uninstall 전후 extension default 보존과 canonical `OpenWithProgids` lifecycle | Windows NSIS association cleanup |
| `package.json` | installer·packaging source test를 automation suite에 연결 | 플랫폼 중립 회귀 검증 |
| `tests/actions-workflows.test.mjs` | exact-ref, fresh job, artifact, diagnostic과 failure 전달 계약 | workflow 회귀 검증 |
| `tests/windows-installer-smoke.test.mjs` | PowerShell 5.1, 입력·상태·진단·cleanup·크기 상한 계약 | smoke source 회귀 검증 |
| `tests/windows-packaging.test.mjs` | executable, MSI·NSIS handler·shortcut·default 보존과 `REINSTALLMODE` 계약 | packaging source 회귀 검증 |
| `docs/operations/DESKTOP_RELEASE.md` | 자동 package smoke 증적과 남은 공개 배포·GUI gate 경계 | 공식 유지보수 운영 문서 |
| `mydocs/plans/task_m010_11*.md` | 승인 범위, 단계, 문서 위치와 실제 보정 이력 | Task #11 계획·handoff |
| `mydocs/working/task_m010_11_stage{1..6}.md` | 단계별 계약, 구현, canary, 원인·수용 증적 | 단계 검토 기록 |
| `mydocs/troubleshootings/task_m010_11_windows_installer.md` | MSI shortcut 미생성 원인·해결·재발 방지 | 후속 installer 진단 |
| `mydocs/orders/20260731.md`, `mydocs/orders/20260801.md` | 일자별 진행과 완료 상태 | Hyper-Waterfall 작업 보드 |

제품 UI, HWP/HWPX 편집 동작, Rust native API, source version `0.1.0`, bundle identifier, publisher, `rhwp` pin과 Windows/Linux 지원 범위는 변경하지 않았다. Release, tag, signing, updater, package 게시와 공개 다운로드 경로도 만들지 않았다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| installer 운영 계약 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | 기존 desktop artifact·release 준비 진실 원천에 자동/수동 gate를 추가 |
| 단계 증적 | `mydocs/working/` | `mydocs/working/task_m010_11_stage{1..6}.md` | OK | task별 exact SHA, run, log와 판정을 공식 제품 문서와 분리 |
| 재발 방지 기록 | `mydocs/troubleshootings/` | `mydocs/troubleshootings/task_m010_11_windows_installer.md` | OK | Stage 6.8 runtime 성공 뒤 검증된 원인과 해결만 기록 |
| 최종 결과 | `mydocs/report/` | `mydocs/report/task_m010_11_report.md` | OK | Issue #11 수용 결과와 Task #9 handoff를 내부 장기 기록으로 보존 |

`mydocs/manual/`에는 제품·installer 문서를 추가하지 않았다. Windows VDI 원본 보고서와 Actions binary·log는 저장소에 복사하지 않고 식별 SHA, run과 핵심 관찰만 단계 보고서에 보존했다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| Windows installer 자동 runtime gate | 없음; artifact build·inventory까지만 검증 | fresh `windows-2025`에서 MSI·NSIS 각각 11개 category와 fixture를 판정하고 diagnostic을 14일 보존 |
| 전체 automation test | `36/36` | `58/58`, installer·workflow·packaging 계약 22개 증가 |
| Windows smoke script | 없음 | `297 LOC`, 함수 50 LOC·parameter 5개 이하 |
| desktop workflow | `177 LOC` | `299 LOC`, fresh smoke job 1개와 final gate 추가 |
| Windows installer packaging source test | 없음 | `7/7` 통과 |
| 실행 파일명 | `alhangeul-desktop.exe` | `Alhangeul.exe` |
| handler 정책 | MSI advertised default 변경, NSIS legacy class와 default 직접 변경 | MSI·NSIS 모두 canonical `Alhangeul.hwp`·`Alhangeul.hwpx`를 Open With에 등록하고 기존 default·`UserChoice` 보존 |
| final Windows runtime | VDI MSI `1602`; Stage 4 runtime은 설치 성공이나 package 수용 실패 | MSI·NSIS install/uninstall exit `0`, version·handler·default·shortcut·launch·cleanup·fixture 모두 통과 |
| 제품 version / upstream | `0.1.0` / `rhwp v0.8.2` | 변경 없음 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 제품 경계와 version | OK — product boundary `185 files`, 5개 version surface `0.1.0` 일치 |
| upstream 정합성 | OK — `rhwp v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개; upstream `32/32` |
| automation·studio | OK — automation `58/58`, Studio `114/114`, TypeScript·Vite production build 성공 |
| workflow 보안·범위 | OK — `workflow_dispatch`, `contents: read`, 14일 artifact, release·deploy·secret·write permission 없음; `actionlint` 통과 |
| exact-SHA native matrix | OK — run `30695249890`, head `8377756…`; Windows x64·Linux x64·Linux arm64 build 모두 success |
| Windows installer 수용 | OK — MSI·NSIS 모두 clean state, exit, version, handler, 기본 연결 불변, shortcut, bounded launch, uninstall cleanup 통과 |
| fixture 무손실 | OK — 전후 SHA-256 `5B1B2C78885979086ACC790098BB28E71DAC9FB0FC1335D6C32CF3B091BDAE4B` 일치 |
| Windows artifact 무결성 | OK — 다운로드한 MSI `9c8b4318…`, NSIS `2b208f66…`의 inventory·크기·SHA-256 독립 재검증 통과 |
| 진단 보존과 실패 전달 | OK — canary 실패에서도 summary·MSI 원본 log·outcome을 업로드하고 final gate가 실패를 전달 |
| 작업 경계 | OK — release, tag, signing, updater, package 게시, Windows ARM64와 GUI 문서 기능 검증을 수행하지 않음 |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_11_stage1.md): VDI·candidate·source를 대조하고 installer별 상태·판정·실패 category 계약을 확정했다.
- [Stage 2](../working/task_m010_11_stage2.md): 외부 module 없는 PowerShell smoke와 source 회귀 계약을 구현했다.
- [Stage 3](../working/task_m010_11_stage3.md): fresh Windows artifact-consumer job, exact ref, 항상 diagnostic과 final failure 전달을 연결했다.
- [Stage 4](../working/task_m010_11_stage4.md): 다섯 canary로 선행 자동화 결함을 제거하고 실행 파일명·handler·shortcut·default의 실제 packaging 결함을 분류했다.
- [Stage 5](../working/task_m010_11_stage5.md): Cargo·WiX·NSIS를 canonical executable·Open With·default 보존 계약으로 최소 보정했다.
- [Stage 6](../working/task_m010_11_stage6.md): WiX validation과 shortcut 원인을 단계적으로 닫고 exact-SHA 전체 matrix·MSI·NSIS 수용 성공과 Task #9 handoff를 확정했다.

## PR #12 리뷰 반영

2026-08-01 PR #12 코드 리뷰에서 확인된 지적을 전부 반영했다. 공통 주제는 "실패 경로의 코드가 스스로 실패해 증적을 없앨 수 있다"와 "기본 연결 보존 계약의 예외 분기"였다.

| # | 지적 | 반영 | 파일 |
|---|---|---|---|
| 1 | sentinel 복원이 throw하면 `finally`의 summary 기록에 도달하지 못해 진단이 사라진다 | 복원·비교를 중첩 `try/catch`로 감싸고 summary 기록을 안쪽 `finally`로 분리, `sentinel-restore` category 추가 | `scripts/windows-installer-smoke.ps1` |
| 2 | 삭제된 extension key에서 `OpenSubKey`가 `$null`을 반환하면 복원이 null 참조로 throw한다 | `if ($null -eq $key) { continue }` 가드 | 〃 |
| 3 | 빈 MSI log에서 `0..-1` 범위가 StrictMode 범위 초과 index를 만들어 실패 진단이 throw한다 | `$lines.Count -eq 0` 조기 반환 | 〃 |
| 4 | `Set-AssociationSentinels`가 중간에 throw하면 이미 바꾼 registry가 복원되지 않는다 | record를 변경 전에 `$script:sentinels`로 누적해 부분 실패도 복원 대상에 포함 | 〃 |
| 5 | NSIS 복원이 snapshot 부재와 "원래 기본값 없음"을 구분하지 못해 사용자의 기존 기본 연결을 지운다 | `ClearErrors` + `${IfNot} ${Errors}` 3-state 판정으로 snapshot 부재는 no-op | `apps/desktop/src-tauri/windows/nsis-hooks.nsh` |
| 6 | 제품 bookkeeping value를 공유 key `Software\Classes\.{ext}`에 남긴다 | 전용 key `Software\Alhangeul\FileAssocBackup`으로 이동하고 빈 key를 정리, clean-state 판정에 포함 | 〃, `scripts/windows-installer-smoke.ps1` |
| 7 | 읽지 않는 `${PROGID}_backup` value | 제거 | `apps/desktop/src-tauri/windows/nsis-hooks.nsh` |
| 8 | hook이 `$R0`/`$R1`을 보존하지 않아 Tauri installer.nsi 주변 코드와 충돌할 수 있다 | 모든 macro에 `Push`/`Pop` 추가 | 〃 |
| 9 | `UPDATEFILEASSOC`가 문서화되지 않은 Tauri 내부 macro 의존이다 | 파일 머리말에 계약·가정으로 명시 | 〃 |
| 10 | `(git rev-parse …).Trim()`이 실패 시 의도한 메시지 대신 null 참조를 낸다 | exit code와 공백 검사 후 `Trim()` | `.github/workflows/alhangeul-desktop.yml` |
| 11 | job의 `always()`가 취소된 workflow까지 실행한다 | `!cancelled()` | 〃 |
| 12 | diagnostic 경로 표기가 step마다 다르다 | 두 step 모두 `Join-Path $env:GITHUB_WORKSPACE` | 〃 |
| 13 | 같은 File을 `[!Path]`와 `[#Path]`로 혼용한다 | `[#Path]`로 통일 | `apps/desktop/src-tauri/windows/main.wxs` |
| 14 | `productName`이 어느 test로도 고정되지 않아 4개 ProgID 경로가 갈라질 수 있다 | `tauriConfig.productName` 고정과 파생 관계 검증 추가 | `tests/windows-packaging.test.mjs` |
| 15 | version 3성분 제약과 artifact cardinality의 이유가 메시지에 없다 | 두 assert 메시지에 근거 명시 | `scripts/windows-installer-smoke.ps1`, `.github/workflows/alhangeul-desktop.yml` |
| 16 | `Normalize-Version`이 PowerShell 승인 동사가 아니고, COM 객체를 해제하지 않으며, `exit 1`이 도달 불가능하다 | `ConvertTo-NormalizedVersion` 개명, `ReleaseComObject`, `-ErrorAction Continue` | `scripts/windows-installer-smoke.ps1` |

회귀 test는 12개 신규 계약을 추가했고, 각 assertion이 보정 전 source에서 실패하는 것을 확인해 무효 계약이 아님을 검증했다. automation suite는 `53/53`에서 `58/58`로 늘었다.

## 잔여 위험과 후속 작업

### 잔여 위험

- 자동 smoke는 bounded process 생존까지만 확인하며 실제 Windows GUI에서 HWP/HWPX 열기·편집·저장·PDF·인쇄와 Explorer 기본 앱 선택 UI를 검증하지 않는다.
- GitHub-hosted runner의 관리자 권한·비대화형 session은 실제 사용자 PC의 UAC, SmartScreen, 보안 제품과 사용자 profile 차이를 대체하지 않는다.
- Linux x64·arm64는 bundle build와 inventory만 검증했으며 package 설치·실행·rollback을 검증하지 않았다.
- `REINSTALLMODE="amus"`는 update·repair에서 사용자가 삭제한 shortcut을 다시 만들 수 있는 Tauri 기본 trade-off다.
- Windows artifact와 diagnostic은 서명되지 않은 14일 보존물이며 GitHub Release나 공개 배포물이 아니다.
- VDI MSI `1602`는 hosted runner에서 재현되지 않았고 원본 verbose log가 없어 interactive/session 발생 조건을 완전히 확정하지 못했다.
- **PR #12 리뷰 반영은 native 재검증 전이다.** run `30695249890`은 `8377756`의 증적이며, 이후 NSIS snapshot key 위치와 복원 분기, WiX protocol block, workflow 실패 보고가 바뀌었다. merge 전에 새 head SHA로 workflow를 다시 dispatch해 MSI·NSIS 수용을 재확인해야 한다. 플랫폼 중립 검증(`58/58`, upstream `32/32`, Studio `114/114`, `actionlint`)은 현재 head에서 통과했다.
- NSIS hook은 Tauri 기본 association 동작을 되돌리는 구조이므로 Tauri 갱신이 이 보존 계약을 조용히 되돌릴 수 있다. 유일한 방어선인 smoke job은 `workflow_dispatch` 전용이라 자동으로 돌지 않는다.

### 후속 작업 후보

- Task #11 merge 뒤 Task #9이 최신 `devel`을 통합하고 과거 candidate를 폐기해 새 exact-SHA prerelease candidate를 생성한다.
- Task #9 새 candidate에서 `check:release-metadata`를 포함한 전체 release gate와 checksum을 다시 검증한다.
- Task #9 rebase 시 `package.json`의 `test:automation`은 양쪽 branch가 같은 줄을 수정하므로 **합집합**으로 해소한다. 한쪽을 고르면 `windows-installer-smoke`·`windows-packaging` 또는 `release-metadata`·`release-checksums` 계약이 조용히 사라진다.
- 실제 Windows 사용자 환경에서 GUI HWP/HWPX·Explorer 기본 앱 수동 gate를 수행한다.
- Linux package 설치·실행·rollback, Windows signing, 사용자 다운로드 문서와 공개 release Go/No-Go는 각각 승인된 후속 범위에서 처리한다.
- Windows ARM64는 Issue #10 소유 범위로 유지한다.

## 작업지시자 승인 요청

- 2026-08-01 작업지시자가 Stage 6 결과를 승인하고 최종 보고서·PR 게시 진행을 지시했다. 이 보고서와 ready PR을 검토한 뒤 Task #11 merge 여부를 승인한다.
