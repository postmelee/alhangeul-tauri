import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const workflows = join(root, '.github', 'workflows');
const [
  desktop,
  orchestrator,
  windows,
  linux,
  config,
  spec,
  powershell,
  webviewPolicy,
  linuxRunner,
  target,
  nativeTarget,
] = await Promise.all([
    readFile(join(workflows, 'alhangeul-desktop.yml'), 'utf8'),
    readFile(join(workflows, 'alhangeul-updater-native-acceptance.yml'), 'utf8'),
    readFile(join(workflows, 'alhangeul-updater-native-windows.yml'), 'utf8'),
    readFile(join(workflows, 'alhangeul-updater-native-linux.yml'), 'utf8'),
    readFile(join(root, 'tests/gui/wdio.updater.conf.ts'), 'utf8'),
    readFile(join(root, 'tests/gui/specs/updater-native.e2e.ts'), 'utf8'),
    readFile(join(root, 'scripts/updater/windows-native-acceptance.ps1'), 'utf8'),
    readFile(join(root, 'scripts/updater/windows-webview2-automation-policy.ps1'), 'utf8'),
    readFile(join(root, 'scripts/updater/run-linux-native-gui.sh'), 'utf8'),
    readFile(join(root, 'apps/desktop/src-tauri/src/updater/target.rs'), 'utf8'),
    readFile(join(root, 'apps/desktop/src-tauri/src/updater/target/native.rs'), 'utf8'),
  ]);

test('desktop mode는 exact D2 입력을 read-only reusable workflow에 전달한다', () => {
  const dispatch = topLevel(desktop, 'on');
  assert.match(dispatch, /^          - updater-native-acceptance$/m);
  for (const input of [
    'acceptance_candidate_sha',
    'acceptance_d1_run_id',
    'acceptance_candidate_artifact_id',
    'acceptance_candidate_artifact_digest',
    'acceptance_release_tag',
  ]) assert.match(dispatch, new RegExp(`^      ${input}:$`, 'm'));

  const caller = job(desktop, 'updater-native-acceptance');
  assert.match(caller, /^    if: \$\{\{ inputs\.mode == 'updater-native-acceptance' \}\}$/m);
  assert.match(caller, /^    permissions:\n      actions: read\n      contents: read$/m);
  assert.match(caller, /^    uses: \.\/\.github\/workflows\/alhangeul-updater-native-acceptance\.yml$/m);
  assert.doesNotMatch(caller, /secrets:|contents:\s*write/);
});

test('세 reusable workflow는 workflow_call과 최소 read 권한만 가진다', () => {
  for (const [name, source] of [
    ['orchestrator', orchestrator],
    ['windows', windows],
    ['linux', linux],
  ]) {
    assert.deepEqual(childKeys(source, 'on'), ['workflow_call'], name);
    assert.match(source, /^permissions:\n  actions: read\n  contents: read$/m);
    assert.doesNotMatch(source, /secrets\.|contents:\s*write|\bgh release\b/i);
    assert.ok(source.split(/\r?\n/).length <= 300, `${name} workflow는 300 LOC 이하여야 합니다`);
  }
});

test('orchestrator는 D1 identity와 공개 test release를 검증한 뒤 두 native workflow를 호출한다', () => {
  const verify = job(orchestrator, 'verify-release');
  ordered(verify, [
    '- name: Validate exact D2 inputs',
    '- name: Checkout exact native harness source',
    '- name: Verify D1 candidate artifact handoff',
    'scripts/verify-workflow-artifact.mjs',
    '- name: Match approved D1 candidate identity',
    '- name: Verify public test prerelease read-back',
    'scripts/updater/verify-acceptance-release.mjs',
    '- name: Upload release handoff evidence',
  ]);
  assert.match(verify, /\[\[ "\$CANDIDATE_ARTIFACT_DIGEST" =~ \^sha256:\[0-9a-f\]\{64\}\$ \]\]/);
  for (const [name, file] of [
    ['accept-windows', 'alhangeul-updater-native-windows.yml'],
    ['accept-linux-appimage', 'alhangeul-updater-native-linux.yml'],
  ]) {
    const call = job(orchestrator, name);
    assert.match(call, /^    needs: verify-release$/m);
    assert.ok(call.includes(`uses: ./.github/workflows/${file}`));
    assert.match(call, /candidate_sha: \$\{\{ inputs\.candidate_sha \}\}/);
    assert.match(call, /d1_run_id: \$\{\{ inputs\.d1_run_id \}\}/);
  }
});

test('Windows matrix는 MSI·NSIS를 각각 clean N에서 갱신하고 연결 보존 뒤 항상 제거한다', () => {
  const accept = job(windows, 'accept-windows');
  assert.match(accept, /kind: msi[\s\S]*target: windows-x86_64-msi/);
  assert.match(accept, /kind: nsis[\s\S]*target: windows-x86_64-nsis/);
  ordered(accept, [
    '- name: Verify D1 N Windows artifact handoff',
    '- name: Download verified N Windows artifact',
    '- name: Verify N Windows signatures and version',
    '- name: Configure elevated WebView2 automation policy',
    '- name: Clean install Windows N',
    '- name: Run Windows updater preflight and dirty gates',
    '- name: Apply Windows N to N+1 through updater',
    '- name: Validate installed Windows N+1 and preserved associations',
    '- name: Verify Windows N+1 no-update state',
    '- name: Cleanup Windows test installation',
    '- name: Restore elevated WebView2 automation policy',
    '- name: Upload Windows updater evidence',
  ]);
  assert.match(accept, /-Phase Cleanup/);
  assert.equal((accept.match(/if: \$\{\{ always\(\) \}\}/g) ?? []).length, 4);
  for (const marker of ['DefaultsPreserved', 'Assert-ProductState', 'Get-DefaultState']) {
    assert.ok(powershell.includes(marker), `Windows helper marker가 필요합니다: ${marker}`);
  }
  assert.match(powershell, /Entry\.DisplayVersion -eq \$Version/);
  assert.doesNotMatch(powershell, /Version\.ProductVersion\) -eq \$Version/);
  assert.match(powershell, /\$installers = @\(if \(\$Kind -eq 'msi'\)/);
  assert.doesNotMatch(powershell, /\$matches\s*=/i);

  assert.match(webviewPolicy, /HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge\\WebView2\\AdditionalBrowserArguments/);
  assert.match(webviewPolicy, /io\.github\.postmelee\.alhangeul/);
  assert.match(webviewPolicy, /Alhangeul\.exe/);
  assert.match(webviewPolicy, /--remote-debugging-port=0/);
  assert.match(webviewPolicy, /Remove-ItemProperty/);
  assert.doesNotMatch(webviewPolicy, /\$AppIds\s*=.*['"]\*['"]/);
  assert.ok(webviewPolicy.split(/\r?\n/).length <= 300, 'WebView2 policy helper는 300 LOC 이하여야 합니다');
});

test('Linux AppImage는 writable 갱신 hash·재실행 no-update·read-only fallback을 검증한다', () => {
  const accept = job(linux, 'accept-linux-appimage');
  assert.doesNotMatch(accept, /runner\.temp/);
  assert.match(accept, /APPIMAGE_PATH: \$\{\{ github\.workspace \}\}\/acceptance-appimage\/Alhangeul\.AppImage/);
  ordered(accept, [
    '- name: Verify D1 N Linux artifact handoff',
    '- name: Download verified N Linux artifact',
    '- name: Verify N Linux signature and prepare writable AppImage',
    '- name: Run Linux AppImage updater preflight and dirty gates',
    '- name: Apply Linux AppImage N to N+1',
    '[[ "$actual_sha" == "$APPIMAGE_N_PLUS_ONE_SHA256" ]]',
    '- name: Verify Linux AppImage N+1 no-update state',
    '- name: Verify read-only AppImage manual fallback',
    '- name: Upload Linux updater evidence',
  ]);
  assert.equal((accept.match(/run-linux-native-gui\.sh/g) ?? []).length, 4);
  assert.match(linuxRunner, /xvfb-run[\s\S]*dbus-run-session[\s\S]*openbox/);
});

test('WebDriver harness는 external driver와 preflight·apply·verify·manual 증거를 고정한다', () => {
  assert.match(config, /driverProvider: 'external'/);
  assert.match(config, /autoInstallTauriDriver: false/);
  assert.match(config, /maxInstances: 1/);
  for (const mode of ['preflight', 'apply', 'verify', 'manual']) {
    assert.ok(spec.includes(`inputs.mode === '${mode}'`) || mode === 'manual');
  }
  for (const marker of [
    'waitForNativeBridge',
    "document.readyState === 'complete'",
    "typeof bridge?.invoke === 'function'",
    'duplicateCheck',
    'dirtyBeforeDownload',
    'dirtyAfterDownloadStarted',
    'restartRequired',
    'readOnlyAppImage',
    'unsupportedInstall',
    "artifactKind: 'msi' | 'nsis' | 'appimage'",
  ]) assert.ok(spec.includes(marker), `native spec marker가 필요합니다: ${marker}`);
});

test('Windows 제품 증거는 설치 프로그램이 소유한 HKCU Registry64에서 한 번만 읽는다', () => {
  const productProbe = nativeTarget.match(
    /let mut product_records = Vec::new\(\);([\s\S]*?)let mut uninstall_entries = Vec::new\(\);/,
  )?.[1];
  assert.ok(productProbe, 'Windows product record probe가 필요합니다');
  assert.match(productProbe, /HKEY_CURRENT_USER|current_user/);
  assert.match(productProbe, /KEY_WOW64_64KEY/);
  assert.doesNotMatch(productProbe, /KEY_WOW64_32KEY|view_flag/);
  assert.match(productProbe, /hive: WindowsRegistryHive::CurrentUser/);
  assert.match(productProbe, /view: WindowsRegistryView::Registry64/);

  assert.match(
    target,
    /hive: WindowsRegistryHive::CurrentUser,[\s\S]*?view: WindowsRegistryView::Registry64,[\s\S]*?default_install_dir: Some\(_\),[\s\S]*?install_dir: None/,
  );
  assert.match(
    target,
    /hive: WindowsRegistryHive::CurrentUser,[\s\S]*?view: WindowsRegistryView::Registry64,[\s\S]*?default_install_dir: None,[\s\S]*?install_dir: Some\(_\)/,
  );

  const uninstallProbe = nativeTarget.match(
    /let mut uninstall_entries = Vec::new\(\);([\s\S]*?)Ok\(WindowsEvidence/,
  )?.[1];
  assert.ok(uninstallProbe, 'Windows uninstall entry probe가 필요합니다');
  assert.match(uninstallProbe, /WindowsRegistryHive::CurrentUser/);
  assert.match(uninstallProbe, /WindowsRegistryHive::LocalMachine/);
  assert.match(uninstallProbe, /KEY_WOW64_64KEY/);
  assert.match(uninstallProbe, /view: WindowsRegistryView::Registry64/);
  assert.doesNotMatch(uninstallProbe, /KEY_WOW64_32KEY|WindowsRegistryView::Registry32/);
});

function topLevel(source, name) {
  const lines = source.split(/\r?\n/);
  const start = lines.indexOf(`${name}:`);
  assert.notEqual(start, -1);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^[A-Za-z0-9_-]+:/.test(lines[index])) { end = index; break; }
  }
  return lines.slice(start + 1, end).join('\n');
}

function childKeys(source, name) {
  return topLevel(source, name).split('\n')
    .map((line) => line.match(/^  ([A-Za-z0-9_-]+):/))
    .filter(Boolean)
    .map((match) => match[1]);
}

function job(source, name) {
  const lines = source.split(/\r?\n/);
  const start = lines.indexOf(`  ${name}:`);
  assert.notEqual(start, -1, `${name} job이 필요합니다`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  [A-Za-z0-9_-]+:/.test(lines[index])) { end = index; break; }
  }
  return lines.slice(start, end).join('\n');
}

function ordered(source, markers) {
  let previous = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    assert.notEqual(index, -1, `marker가 필요합니다: ${marker}`);
    assert.ok(index > previous, `순서가 올바르지 않습니다: ${marker}`);
    previous = index;
  }
}
