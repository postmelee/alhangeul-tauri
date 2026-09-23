# Task #11 Stage 1 보고서 — Windows installer 상태·판정 계약 확정

GitHub Issue: [#11](https://github.com/postmelee/alhangeul-tauri/issues/11)
구현계획서: [`task_m010_11_impl.md`](../plans/task_m010_11_impl.md)
Stage: 1

## 단계 목적

Task #9의 Windows x64 candidate와 VDI 보고서가 남긴 MSI `1602`, NSIS 실행 성공, file association 미확정 상태를 현재 installer source와 대조했다. 원인을 추측해 packaging 설정을 먼저 바꾸지 않고, Stage 2 자동화가 MSI와 NSIS를 같은 수용 기준으로 판정할 수 있도록 관찰 위치, 상태 전이, 실패 분류와 증적 형식을 확정하는 단계다.

제품 source와 workflow는 수정하지 않았다.

## 조사 기준

### candidate와 원본 증적

| 항목 | 고정 값 | 판정 |
|---|---|---|
| Task #9 candidate | `6e0adc941b9eedbd2d7cceab12bf31dddf184c3a` | Windows artifact를 생성한 exact SHA |
| GitHub Actions run | `30426711693` | VDI 보고서가 사용한 artifact 출처 |
| Windows artifact ID | `8714152971` | `alhangeul-desktop-windows-x64` |
| MSI SHA-256 | `b7647416466cff7a3ac787d5d903f2950c2a1b735974482899e7778ce2de5aa4` | inventory와 재검증 일치 |
| NSIS SHA-256 | `af7968393f05d042d62a0331640ab73cf29471021ee2eb35e8f1ca8112600fb9` | inventory와 재검증 일치 |
| VDI 보고서 SHA-256 | `f49b157a319148628ad7c38c78d107fcdc85b66f9c6bf6bab156759f6492c35d` | repository 외부 원본 식별자 |
| VDI 환경 | Windows 10 Pro 22H2, build `19045`, x64 | interactive VDI 관찰이며 hosted runner 수용 증적은 아님 |

Task #9은 `origin/devel`보다 6 commits 앞서며, candidate commit `6e0adc9`에서 installer 관련 변경은 release metadata 검사 추가와 Tauri long description 수정뿐이다. `main.wxs`, file association 이름과 NSIS 생성 규칙은 현재 `devel`과 같다. 따라서 관찰된 설치 동작을 Task #9의 metadata 변경으로 인한 회귀로 분류하지 않는다.

VDI에서는 MSI 설치가 두 번 모두 `1602`로 끝났고 MSI verbose log가 남지 않아 취소 주체와 실패 action을 판정할 수 없다. NSIS는 설치, 실행, 제거와 재설치가 성공했고 `0.1.0` version과 Start Menu shortcut이 관찰됐다. 다만 clean-state registry 열거가 wildcard를 `-LiteralPath`와 함께 사용해 무효였고, 기존 기본 연결 값만 조회했으므로 Alhangeul handler 등록 여부와 기본 연결 불변을 증명하지 못했다.

### 생성 규칙 대조

| 항목 | MSI — custom `main.wxs` | NSIS — Tauri CLI `2.10.1` template |
|---|---|---|
| 설치 범위 | `perMachine`, x64는 `ProgramFiles64Folder\Alhangeul` | 기본 `currentUser`, `$LOCALAPPDATA\Alhangeul` |
| uninstall 등록 | Windows Installer product key, `ARPINSTALLLOCATION` | `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Alhangeul` |
| silent 방식 | `msiexec /i … /qn /norestart` | installer `/S` |
| shortcut | Desktop, Start Menu | Desktop, Start Menu |
| 구성된 file class | `Alhangeul.hwp`, `Alhangeul.hwpx` | `HWP Document`, `HWPX Document` |
| extension 처리 | WiX advertised `ProgId`/`Extension`/`Verb` | extension 기본값을 file class로 직접 기록하고 이전 값을 `*_backup`으로 보관 |
| `OpenWithProgids` | template에 명시적 등록 없음 | 생성 macro에 등록 없음 |
| 제거 처리 | Windows Installer component 제거 | backup 기본값 복원 후 자체 file class 삭제 |

고정된 `@tauri-apps/cli 2.10.1`의 NSIS macro는 project의 association `name`을 file class로 사용한다. 따라서 현재 artifact는 승인된 canonical ProgID `Alhangeul.hwp`와 `Alhangeul.hwpx`를 만들지 않는다. 또한 `OpenWithProgids`가 아니라 extension 기본값을 직접 바꾸므로 “handler는 등록하되 기존 기본 앱은 바꾸지 않는다”는 수용 계약과 일치하지 않는다.

MSI는 canonical ProgID를 선언하지만 `OpenWithProgids`를 명시하지 않는다. WiX advertised table가 실제 Windows registry와 기본 앱 상태에 미치는 결과는 source만으로 성공 또는 실패로 단정하지 않고 Stage 4 runtime evidence로 판정한다.

## 자동 smoke 상태 계약

### 공통 입력과 사전 상태

| 관찰점 | 통과 조건 |
|---|---|
| artifact cardinality | artifact root에 inventory가 가리키는 MSI 1개와 NSIS 1개만 존재하고 두 SHA-256이 inventory와 일치 |
| process | `Alhangeul.exe`가 실행 중이지 않음 |
| 설치 경로 | installer별 예상 경로가 존재하지 않음 |
| uninstall entry | HKLM/HKCU의 Registry64·Registry32 view 어디에도 Alhangeul product entry가 없음 |
| owned handler | canonical ProgID, `OpenWithProgids`, shortcut 등 Alhangeul 소유 상태가 없음 |
| 기존 기본 연결 | `.hwp`, `.hwpx`에 smoke 전용 sentinel 기본 ProgID를 설정하고 extension 기본값과 `UserChoice`를 snapshot |
| 외부 fixture | 설치 경로 밖에 문서 대체 fixture를 만들고 SHA-256 기록 |

registry는 .NET `OpenBaseKey`로 HKLM/HKCU의 Registry64와 Registry32 view를 명시적으로 연다. key 열거에는 wildcard와 `-LiteralPath`를 함께 사용하지 않는다. `UserChoice`는 읽기와 전후 비교만 하며 생성, 수정, 삭제하지 않는다. smoke가 만든 sentinel과 fixture만 `finally`에서 정리한다.

한 installer의 사전 상태가 깨끗하지 않거나 제거 뒤 잔여 상태가 있으면 다음 installer를 실행하지 않는다. MSI와 NSIS의 상태가 섞인 결과를 성공으로 기록하지 않는다.

### 설치와 exit code

| bundle | 실행 계약 | exit 판정 |
|---|---|---|
| MSI install | `msiexec /i <msi> /qn /norestart /L*v <install.log>` | `0`만 수용. `1602`는 `user-exit`, `3010`은 `reboot-required`, 그 외는 `install` 실패 |
| MSI uninstall | `msiexec /x <ProductCode> /qn /norestart /L*v <uninstall.log>` | `0`만 수용. 비정상 exit는 `uninstall` 실패 |
| NSIS install | `<setup.exe> /S` | `0`만 수용 |
| NSIS uninstall | `<uninstall.exe> /S` | `0`만 수용 |

Windows Installer 문서상 `3010`은 재부팅 후 완료되는 성공이지만, 이 smoke는 같은 fresh runner에서 launch와 완전한 cleanup까지 확인해야 하므로 수용 성공이 아닌 `reboot-required`로 분리한다. MSI 실패 때에는 원본 verbose log와 마지막 `Return value 3` 전후 문맥을 보존한다.

### 설치 상태와 version

| 관찰점 | MSI 통과 조건 | NSIS 통과 조건 |
|---|---|---|
| install directory | x64 `Program Files\Alhangeul`과 실제 ARP `InstallLocation` 일치 | `%LOCALAPPDATA%\Alhangeul`과 ARP `InstallLocation` 일치 |
| executable | install directory 아래 `Alhangeul.exe`가 존재 | 동일 |
| uninstall entry | HKLM Registry64의 product entry에서 `DisplayName`, `Publisher`, `DisplayVersion`, `InstallLocation` 확인 | HKCU view의 `…\Uninstall\Alhangeul`에서 같은 값과 `MainBinaryName`, `UninstallString` 확인 |
| version | executable ProductVersion과 FileVersion을 3성분으로 정규화하면 `0.1.0` | 동일 |
| fourth component | version이 네 성분이면 마지막 성분은 `0`만 허용 | 동일 |
| shortcut | Desktop과 Start Menu shortcut이 존재하고 target이 확인된 executable과 일치 | 동일 |

registry view나 설치 경로는 추정값만으로 성공시키지 않는다. 예상 위치와 실제 uninstall metadata가 서로 다르면 `registry/path` 실패로 기록한다.

### handler와 기본 앱

| 관찰점 | 통과 조건 |
|---|---|
| canonical ProgID | `Alhangeul.hwp`, `Alhangeul.hwpx` class가 존재 |
| open command | 각 `shell\open\command`가 설치된 `Alhangeul.exe`와 quoted `%1` 인자를 가리킴 |
| Open With | `.hwp\OpenWithProgids`와 `.hwpx\OpenWithProgids`에 대응 canonical ProgID value가 존재 |
| extension default | 설치 전 sentinel 기본 ProgID와 설치 후 값이 동일 |
| UserChoice | 존재 여부, ProgId, Hash를 포함한 snapshot이 설치·제거 전후 동일 |
| legacy name | `HWP Document`, `HWPX Document`, `*_backup`은 진단 대상으로만 기록하고 canonical handler 성공으로 인정하지 않음 |

Windows의 기본 앱 선택은 사용자 소유 상태다. installer smoke는 Alhangeul을 열기 후보로 등록했는지 검사하지만 기존 기본값을 바꾸거나 `UserChoice`를 우회한 결과는 실패로 판정한다.

### 제한 실행과 제거 후 상태

launch smoke는 확인된 executable을 `Start-Process -PassThru`로 시작하고 5초의 제한 시간 동안 동일 PID가 생존하는지만 검사한다. 조기 종료는 `launch` 실패다. 종료할 때에는 반환된 정확한 PID만 대상으로 하며 이름 기반 전체 process kill은 금지한다. 이는 GUI 렌더링, 실제 HWP/HWPX open·save·print 성공을 주장하지 않는다.

제거 뒤에는 다음 조건을 모두 확인한다.

- installer가 만든 process, install directory, executable, uninstall entry와 Desktop·Start Menu shortcut이 없다.
- canonical ProgID와 Alhangeul `OpenWithProgids` value가 없다.
- extension sentinel 기본값과 `UserChoice` snapshot이 설치 전과 같다.
- 외부 fixture가 존재하며 SHA-256이 설치 전과 같다.
- MSI 또는 NSIS가 실패했더라도 `finally` cleanup 결과와 남은 상태를 summary에 기록한다.

## 실패 분류와 증적

summary JSON은 installer별로 다음 category를 독립 기록하고, 하나라도 실패하면 전체 command를 실패시킨다.

| category | 의미 |
|---|---|
| `clean-state` | 설치 전 product/process/handler/shortcut 잔여 상태 또는 잘못된 artifact cardinality |
| `install` | installer 비정상 exit 또는 예상 설치 상태 미생성 |
| `reboot-required` | `3010` 등 재부팅 없이는 후속 검증을 끝낼 수 없는 상태 |
| `version` | ProductVersion/FileVersion 정규화 불일치 |
| `registry-handler` | uninstall metadata, ProgID, command, `OpenWithProgids` 불일치 |
| `default-mutation` | extension 기본값 또는 `UserChoice` 변경 |
| `shortcut` | shortcut 누락 또는 target 불일치 |
| `launch` | executable 조기 종료 또는 정확한 PID 정리 실패 |
| `uninstall` | 제거 command 비정상 exit |
| `cleanup` | product 소유 상태가 제거 뒤 남음 |
| `fixture` | 외부 fixture 누락 또는 hash 변경 |

항상 보존할 증적은 summary JSON, installer별 command와 exit code, registry view별 관찰, 실제 경로, version, shortcut target, handler와 기본 앱 전후 snapshot, launch PID, cleanup과 fixture 결과다. MSI는 install/uninstall verbose log 원본과 `Return value 3` 문맥을 추가한다.

## 현재 candidate 판정과 다음 확인점

- NSIS source는 canonical ProgID, `OpenWithProgids`, 기본 연결 불변의 세 수용 조건과 일치하지 않는다. Stage 2 test는 이를 허용하도록 기준을 낮추지 않고 Stage 4 canary에서 명시적으로 검출해야 한다.
- MSI `1602`는 VDI 보고서만으로 원인이 확정되지 않았다. silent install의 exit code, verbose log와 `Return value 3` 문맥이 확보되기 전에는 WiX template 결함으로 단정하거나 수정하지 않는다.
- MSI advertised association의 실제 registry shape와 기본 연결 영향도 Windows native runtime evidence가 필요하다.
- 현재 candidate의 NSIS 성공은 installer 실행 가능성 증거이지 file handler 수용 성공이 아니다.
- Task #11을 먼저 `devel`에 merge한 뒤 Task #9이 최신 `devel`을 통합하고 새 exact-SHA candidate를 생성한다. 과거 Task #9 candidate는 공개 release 수용 증적으로 재사용하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_11_stage1.md` | candidate 상태, MSI·NSIS 관찰점, 상태 전이, 실패 분류와 증적 계약 확정 |
| `mydocs/orders/20260731.md` | Stage 1 완료와 Stage 2 승인 대기 상태 반영 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드, installer 설정, workflow와 공식 운영 문서는 수정하지 않았다. 신규 단계 보고서와 오늘할일의 Task #11 상태 셀만 변경했다. repository 외부 VDI 보고서는 복사하거나 수정하지 않고 SHA-256과 필요한 관찰만 기록했다.

## 검증 결과

실행 명령:

```bash
git rev-list --left-right --count origin/devel...local/task9
git diff --name-status origin/devel...local/task9
git show 6e0adc9:apps/desktop/src-tauri/windows/main.wxs
shasum -a 256 /Users/melee/Downloads/Alhangeul-Task9-Windows-Stage4.md
git diff --check
```

결과:

- OK — Task #9은 `origin/devel` 기준 `0 6`이며 변경 목록을 대조했다.
- OK — candidate의 custom WiX template를 읽고 현재 `devel`과 installer source가 같음을 확인했다.
- OK — VDI 보고서 SHA-256이 `f49b157a319148628ad7c38c78d107fcdc85b66f9c6bf6bab156759f6492c35d`와 일치했다.
- OK — candidate Windows artifact를 임시 디렉터리에 내려받아 inventory, bundle cardinality와 두 installer SHA-256을 `scripts/verify-desktop-artifacts.mjs`로 독립 재검증했다.
- OK — 문서 변경에 whitespace 오류가 없다.

## 참고 근거

- [Tauri CLI 2.10.1 NSIS installer template](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.10.1/crates/tauri-bundler/src/bundle/windows/nsis/installer.nsi)
- [Tauri CLI 2.10.1 NSIS file association macro](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.10.1/crates/tauri-bundler/src/bundle/windows/nsis/FileAssociation.nsh)
- [Tauri Windows Installer 문서](https://v2.tauri.app/distribute/windows-installer/)
- [Microsoft — Default Programs](https://learn.microsoft.com/en-us/windows/win32/shell/default-programs)
- [Microsoft — Include an Application in Open With](https://learn.microsoft.com/en-us/windows/win32/shell/how-to-include-an-application-on-the-open-with-dialog-box)
- [Microsoft — Windows Installer Extension Table](https://learn.microsoft.com/en-us/windows/win32/msi/extension-table)
- [Microsoft — Windows Installer ProgId Table](https://learn.microsoft.com/en-us/windows/win32/msi/progid-table)
- [Microsoft — msiexec](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/msiexec)
- [Microsoft — Windows Installer error codes](https://learn.microsoft.com/en-us/windows/win32/msi/error-codes)

## 잔여 위험

- MSI `1602`의 실패 action과 원인은 verbose log 전까지 미확정이다.
- MSI association과 Windows 10/11 기본 앱 상태의 runtime registry 결과는 Stage 4 fresh Windows에서 확인해야 한다.
- current NSIS 생성 규칙은 수용 계약과 불일치하므로 Stage 4 진단 결과에 따라 Stage 5 packaging 보정이 필요할 가능성이 높다.
- 자동 smoke는 silent install, registry, bounded process와 cleanup을 검증하며 실제 GUI 문서 open·save·print gate를 대체하지 않는다.

## 다음 단계 영향

- Stage 2는 이 보고서의 canonical ProgID, 기본 연결 불변, registry view, exit, version, bounded launch, cleanup과 증적 계약을 source test로 고정한다.
- Stage 2 자동화는 현재 NSIS artifact가 실패할 수 있음을 전제로 하되 수용 기준을 완화하지 않는다.
- Stage 3 이후 원격 push와 workflow dispatch는 별도 단계 승인 전 수행하지 않는다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 PowerShell smoke와 회귀 test 구현으로 진행한다.
