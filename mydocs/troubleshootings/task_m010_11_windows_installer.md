# Task #11 Windows MSI shortcut 미생성 트러블슈팅

## 증상

Windows x64 MSI는 silent install과 uninstall을 exit code `0`으로 마쳤고 executable, version, handler와 cleanup도 정상인데 Desktop과 Start Menu shortcut만 생성하지 않았다. WiX validation 오류를 모두 제거한 뒤에도 MSI `Shortcut` table, component·feature 연결과 정규화된 target은 존재했고 install log는 `CreateShortcuts` action을 성공 처리했지만 `ShortcutCreate` operation을 기록하지 않았다. 같은 artifact의 NSIS shortcut은 정상 생성됐다.

## 재현 조건

```bash
git push origin HEAD:refs/heads/publish/task11
gh workflow run alhangeul-desktop.yml \
  --repo postmelee/alhangeul-tauri \
  --ref publish/task11 \
  -f build_ref=<candidate-sha> \
  -f run_tests=true
gh run download <run-id> \
  --repo postmelee/alhangeul-tauri \
  --dir <temporary-directory>
```

- 환경: GitHub-hosted `windows-2025`와 비교용 `windows-2022`, Tauri CLI 2.10.1, WiX MSI
- 입력: Windows x64 artifact의 `Alhangeul_0.1.0_x64_en-US.msi`
- 관찰: `diagnostics/windows-installer-smoke/msi-install.log`의 `CreateShortcuts` 실행 script와 installer별 summary
- 비교 run: `30692282041`, `30692813844`, `30693805318`

## 원인

계승한 HOP WiX template의 `Property Id="REINSTALLMODE"` 값이 `amu`여서 shortcut 처리 flag `s`가 빠져 있었다. Microsoft Windows Installer 계약에서 `REINSTALLMODE`는 일반 설치에도 적용될 수 있고 `s`는 모든 shortcut을 재설치하며 icon을 다시 캐시한다. Tauri CLI 2.10.1 기본 WiX template은 `amus`를 사용한다.

`windows-2025`와 `windows-2022`에서 동일 증상이 재현됐고, MSI table과 component·feature·target이 정상인 상태에서도 `ShortcutCreate` operation만 없었으므로 hosted runner나 shortcut table 구성 문제는 원인에서 제외했다.

## 해결

```xml
<Property Id="REINSTALLMODE" Value="amus" />
```

- 변경 파일: `apps/desktop/src-tauri/windows/main.wxs`
- 핵심 수정: `REINSTALLMODE`에 shortcut 처리 flag `s`를 복원해 Tauri CLI 2.10.1 기본값과 정렬
- 보존 범위: shortcut target, handler, 기존 기본 연결 불변 조건, smoke 수용 기준과 build matrix는 변경하지 않음
- 수용한 trade-off: update·repair 시 사용자가 삭제한 shortcut이 다시 생성될 수 있는 Tauri 기본 동작

## 재발 방지

- `tests/windows-packaging.test.mjs`에서 `REINSTALLMODE="amus"`를 source contract로 고정한다.
- Windows smoke는 MSI와 NSIS 각각 Desktop·Start Menu shortcut을 fresh install 뒤 실제 filesystem에서 확인한다.
- MSI shortcut 실패 시 compiler warning만 보지 말고 원본 MSI table, component·feature 상태, `CreateShortcuts`의 `ShortcutCreate` operation을 함께 확인한다.
- Runner 교체는 packaging source와 수용 기준을 그대로 둔 비교 실험으로만 사용하고, 동일 재현이면 환경 특이성을 원인에서 제외한다.

## 검증

```bash
node --test tests/windows-packaging.test.mjs tests/windows-installer-smoke.test.mjs
pnpm run test:automation
gh run view 30695249890 \
  --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
pnpm run check:desktop-artifacts -- \
  --platform windows-x64 \
  --root <downloaded-windows-artifact-root> \
  --verify-inventory \
  <downloaded-inventory-path>
```

결과:

- OK — source commit `83777562231d92d5bc8aab3fbfbb7b2e7bb7b81d`, run `30695249890`의 세 플랫폼 build와 Windows installer smoke가 모두 성공.
- OK — MSI·NSIS 모두 install/uninstall exit `0`, version `0.1.0`, handler, 기본 연결 불변, Desktop·Start Menu shortcut, bounded launch와 cleanup 통과.
- OK — MSI log에 Desktop·Start Menu·uninstall shortcut 세 개의 `ShortcutCreate`와 대응하는 세 `ShortcutRemove`가 기록됨.
- OK — 다운로드한 Windows MSI·NSIS inventory의 크기와 SHA-256 독립 재검증 통과.

## 참고

- [Microsoft REINSTALLMODE property](https://learn.microsoft.com/en-us/windows/win32/msi/reinstallmode)
- [Tauri CLI 2.10.1 WiX template](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.10.1/crates/tauri-bundler/src/bundle/windows/msi/main.wxs)
- [`DESKTOP_RELEASE.md`](../../docs/operations/DESKTOP_RELEASE.md)
- [`task_m010_11_stage6.md`](../working/task_m010_11_stage6.md)
