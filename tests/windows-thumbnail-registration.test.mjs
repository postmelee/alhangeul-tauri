import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const handlerRoot = join(root, 'apps', 'thumbnail-handler');
const [manifest, lib, contract, transaction, registry] = await Promise.all([
  readFile(join(handlerRoot, 'Cargo.toml'), 'utf8'),
  readFile(join(handlerRoot, 'src', 'lib.rs'), 'utf8'),
  readFile(join(handlerRoot, 'src', 'registration.rs'), 'utf8'),
  readFile(join(handlerRoot, 'src', 'registration', 'windows.rs'), 'utf8'),
  readFile(join(handlerRoot, 'src', 'registration', 'windows', 'registry.rs'), 'utf8'),
]);

test('고정 CLSID·thumbnail category·설치 파일명을 한 계약으로 유지한다', () => {
  for (const marker of [
    '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}',
    '{E357FCCD-A995-4576-B01F-234630154E96}',
    'AlhangeulThumbnailHandler.dll',
    'AlhangeulThumbnailWorker.exe',
    'ThreadingModel',
    'Apartment',
    'ThumbnailHandlerBackup',
  ]) {
    assert.ok(`${contract}\n${transaction}`.includes(marker), `registration marker가 필요합니다: ${marker}`);
  }
});

test('MSI와 NSIS export는 같은 machine/user transaction을 호출한다', () => {
  for (const exportName of [
    'DllRegisterServer',
    'DllUnregisterServer',
    'DllInstall',
    'AlhangeulThumbnailInstallUser',
    'AlhangeulThumbnailUninstallUser',
  ]) {
    assert.match(lib, new RegExp(`fn ${exportName}\\b`));
  }
  assert.match(lib, /guard_status\(registration::install_user\)/);
  assert.match(lib, /guard_status\(registration::uninstall_user\)/);
  assert.match(lib, /if install != 0 \{[\s\S]+?registration::install_user\(\)[\s\S]+?registration::uninstall_user\(\)/);
  assert.match(lib, /status_to_hresult\(registration::install_machine\(\)\)/);
  assert.match(lib, /status_to_hresult\(registration::uninstall_machine\(\)\)/);
});

test('snapshot은 raw kind/data를 State commit marker 전에 기록한다', () => {
  const snapshot = transaction.match(/fn write_snapshot[\s\S]+?\n\}/)?.[0];
  assert.ok(snapshot, 'write_snapshot 함수가 필요합니다.');
  assertOrdered(snapshot, [
    'delete_value(scope, &path, "State")',
    '"Data"',
    'write_dword(scope, &path, "Kind", value.kind)',
    'write_dword(scope, &path, "State", 1)',
  ]);
  assert.match(transaction, /Snapshot::Present\(RawValue/);
  assert.match(transaction, /data\.kind != REG_BINARY/);
  assert.match(registry, /RegQueryValueExW/);
  assert.match(registry, /RegSetValueExW/);
});

test('복원은 현재 owner가 Alhangeul일 때만 적용하고 snapshot은 뒤에 정리한다', () => {
  const restore = transaction.match(/fn restore_extension[\s\S]+?\n\}/)?.[0];
  assert.ok(restore, 'restore_extension 함수가 필요합니다.');
  assertOrdered(restore, [
    'is_some_and(is_our_clsid)',
    'Snapshot::Absent',
    'Snapshot::Present',
    'clear_snapshot(scope, &backup)',
  ]);
  assert.doesNotMatch(transaction, /RegDeleteTreeW/);
  assert.match(transaction, /delete_key\(scope, &inproc\)/);
  assert.match(transaction, /delete_key\(scope, &class_path\(\)\)/);
});

test('HKLM/HKCU Registry64만 사용하고 Shell association notify를 보낸다', () => {
  for (const marker of [
    'HKEY_CURRENT_USER',
    'HKEY_LOCAL_MACHINE',
    'KEY_WOW64_64KEY',
  ]) {
    assert.ok(registry.includes(marker), `registry view marker가 필요합니다: ${marker}`);
  }
  assert.doesNotMatch(registry, /KEY_WOW64_32KEY/);
  assert.match(transaction, /SHChangeNotify\(/);
  assert.match(transaction, /SHCNE_ASSOCCHANGED/);
  assert.match(transaction, /SHCNF_IDLIST/);
  assert.doesNotMatch(`${transaction}\n${registry}`, /(?:explorer\.exe|dllhost\.exe|taskkill)/i);
  assert.match(manifest, /"Win32_System_Registry"/);
});

test('registration 구현 파일과 함수는 크기 상한 안에 있다', () => {
  for (const source of [transaction, registry]) {
    const lines = source.split(/\r?\n/);
    assert.ok(lines.length <= 300, `registration 파일이 300 LOC를 초과했습니다: ${lines.length}`);
    const starts = lines.map((line, index) => (/^(?:pub\(super\) )?fn /.test(line) ? index : -1)).filter((index) => index >= 0);
    for (let index = 0; index < starts.length; index += 1) {
      const start = starts[index];
      const end = index + 1 < starts.length ? starts[index + 1] : lines.length;
      assert.ok(end - start <= 50, `${lines[start]} 함수가 50 LOC를 초과했습니다.`);
    }
  }
});

function assertOrdered(source, markers) {
  let previous = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    assert.notEqual(index, -1, `marker가 필요합니다: ${marker}`);
    assert.ok(index > previous, `순서가 올바르지 않습니다: ${marker}`);
    previous = index;
  }
}
