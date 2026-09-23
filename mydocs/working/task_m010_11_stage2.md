# Task #11 Stage 2 보고서 — Windows installer smoke script와 회귀 계약 구현

GitHub Issue: [#11](https://github.com/postmelee/alhangeul-tauri/issues/11)
구현계획서: [`task_m010_11_impl.md`](../plans/task_m010_11_impl.md)
Stage: 2

## 단계 목적

Stage 1에서 확정한 MSI·NSIS 상태와 판정 계약을 Windows PowerShell 5.1과 pwsh에서 외부 module 없이 실행할 수 있는 smoke script로 구현했다. 현재 macOS에서는 installer를 실행하지 않고, source contract test로 artifact cardinality부터 진단 보존과 cleanup까지의 필수 경로를 고정했다.

workflow 연결, Windows native 실행, packaging 설정 변경과 원격 push는 수행하지 않았다.

## 구현 내용

### 입력과 artifact 경계

- entry parameter는 `ArtifactRoot`, `OutputDirectory`, `ExpectedVersion` 세 개다.
- artifact root를 재귀 열거해 `msi/`의 MSI 1개, `nsis/`의 EXE 1개와 `alhangeul-artifact-inventory.json` 1개만 허용한다.
- inventory platform이 `windows-x64`인지 확인하고 두 bundle의 상대 경로와 SHA-256을 설치 전에 재검증한다.
- `ExpectedVersion`은 3성분 version만 허용한다.

### installer별 상태 전이

- 각 installer 전에 process, MSI·NSIS 설치 경로, uninstall entry, canonical·legacy handler와 user/common shortcut 잔여 상태를 확인한다.
- MSI는 `msiexec /i … /qn /norestart /L*v`, NSIS는 `/S`로 실행한다.
- MSI는 HKLM Registry64 product entry와 `Program Files\Alhangeul`, NSIS는 HKCU uninstall entry와 `%LOCALAPPDATA%\Alhangeul`을 기준으로 실제 executable·metadata를 대조한다.
- ProductVersion과 FileVersion은 `0.1.0` 또는 마지막 성분이 `0`인 `0.1.0.0`만 동일 version으로 정규화한다.
- MSI는 common Desktop·Start Menu, NSIS는 current-user Desktop·Start Menu shortcut의 실제 target을 설치 executable과 비교한다.
- executable은 정확한 PID를 얻어 5초 생존을 확인한 뒤 그 PID만 종료한다. 이름 기반 전체 process kill은 사용하지 않는다.
- MSI는 ProductCode로 silent uninstall하고 NSIS는 등록된 uninstaller로 `/S` uninstall한다.
- 제거 뒤 product 상태가 남으면 다음 installer는 clean-state gate를 통과하지 못해 실행되지 않는다.

### handler와 기본 앱 보호

- HKLM·HKCU의 Registry64·Registry32 view를 .NET registry API로 명시해 uninstall entry와 file handler를 관찰한다.
- `Alhangeul.hwp`, `Alhangeul.hwpx` class, 설치 executable과 quoted `"%1"`을 포함한 open command, 대응 `OpenWithProgids` value를 모두 요구한다.
- `HWP Document`, `HWPX Document`는 clean-state 진단용 legacy key로만 취급하고 canonical 성공으로 인정하지 않는다.
- HKCU extension 기본값에는 smoke 전용 sentinel을 두고 전체 extension default와 `UserChoice`의 ProgId·Hash를 설치·제거 전후 비교한다.
- `UserChoice`는 읽기만 하며 생성, 변경 또는 삭제하지 않는다.
- `finally`에서 smoke가 설정한 sentinel만 원래 상태로 복원하고 복원 뒤 snapshot도 summary에 남긴다.

### 진단과 실패 전달

- installer별 exit, version, registry, handler, shortcut, default, launch와 cleanup 결과를 `windows-installer-smoke-summary.json`에 기록한다.
- 실패 category는 `clean-state`, `install`, `reboot-required`, `registry-handler`, `version`, `default-mutation`, `shortcut`, `launch`, `uninstall`, `cleanup`, `fixture`로 분리한다.
- MSI install/uninstall verbose log 원본을 보존하고 실패하면 `Return value 3` 전후 8줄 문맥 파일을 추가한다.
- 출력 디렉터리의 외부 fixture를 설치 전에 생성하고 전후 SHA-256을 비교한다.
- installer 또는 fixture가 하나라도 실패하면 summary를 쓴 뒤 process exit `1`로 전달한다.
- script는 294 LOC이며 모든 함수가 50 LOC, parameter 5개 이하다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-installer-smoke.ps1` | MSI·NSIS silent install, 상태·handler·기본 앱·version·shortcut·launch·cleanup과 진단 수집 구현, 294 LOC |
| `tests/windows-installer-smoke.test.mjs` | parameter, artifact, silent option, registry, launch, 진단, failure와 크기 상한 source contract 7개 |
| `package.json` | 신규 test를 `test:automation`에 연결 |
| `mydocs/working/task_m010_11_stage2.md` | Stage 2 구현과 검증 결과 기록 |
| `mydocs/orders/20260731.md` | Stage 2 완료와 Stage 3 승인 대기 상태 반영 |

## 본문 변경 정도 / 본문 무손실 여부

기존 제품 코드, installer 설정, workflow와 test 동작은 변경하지 않았다. `package.json`의 기존 `test:automation` 명령 끝에 신규 test 파일만 추가했다. dependency와 lockfile은 변경하지 않았다.

## 검증 결과

실행 명령:

```bash
node --test tests/windows-installer-smoke.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — 신규 source contract test `7/7` 통과.
- OK — 전체 automation test `43/43` 통과.
- OK — product boundary `182 files scanned` 통과.
- OK — script `294 LOC`, 함수별 `50 LOC` 이하, parameter `5개` 이하.
- OK — whitespace 오류 없음.

로컬 Codex shell에는 `node`가 노출되지 않아 repository에 고정된 bundled Node·pnpm 경로를 사용했다. 첫 `pnpm` 시도는 외부 작업트리 임시 파일 권한, 두 번째 시도는 shell PATH의 `node` 누락으로 test 시작 전에 중단됐으며, 동일 명령에 bundled Node PATH를 command scope로 적용한 최종 실행이 위 결과로 통과했다. 이 과정에서 source나 lockfile 변경은 없었다.

## 잔여 위험

- 현재 호스트는 지원 대상이 아니므로 PowerShell parse, Windows registry, COM shortcut과 native installer 실행 성공을 주장하지 않는다. 첫 실제 검증은 Stage 4 fresh `windows-2025`에서 수행한다.
- current NSIS 생성 규칙은 canonical handler와 기본 연결 불변 계약에 어긋날 것으로 예상되며, Stage 4에서는 의도적으로 실패를 검출해야 한다.
- MSI `1602` 원인과 advertised association의 실제 registry 결과는 verbose log가 생성되기 전까지 미확정이다.
- MSI common shortcut과 NSIS current-user shortcut의 runtime 위치는 hosted runner 증적으로 확인해야 한다.
- smoke는 bounded process 생존까지만 확인하며 실제 HWP/HWPX GUI 문서 open·save·print gate를 대체하지 않는다.

## 다음 단계 영향

- Stage 3은 기존 Windows build artifact를 별도 fresh `windows-2025` job에서 내려받고 이 script에 artifact root, diagnostic output, root package version을 전달한다.
- diagnostic artifact upload는 smoke 성공 여부와 무관하게 실행하고 마지막 gate가 smoke 실패를 workflow 실패로 전달해야 한다.
- Stage 3에서도 installer나 packaging 설정은 바꾸지 않으며 Windows 실행은 workflow 연결 승인 이후 Stage 4에서 수행한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 fresh Windows artifact-consumer job 연결로 진행한다.
