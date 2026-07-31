import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptPath = join(repoRoot, 'scripts/windows-installer-smoke.ps1');
const scriptBytes = await readFile(scriptPath);
const source = scriptBytes.toString('utf8');

test('Windows PowerShell 5.1이 UTF-8 source를 인식하도록 BOM을 유지한다', () => {
  assert.deepEqual(
    [...scriptBytes.subarray(0, 3)],
    [0xef, 0xbb, 0xbf],
    'PowerShell script는 UTF-8 BOM으로 시작해야 합니다.',
  );
});

test('entry parameter는 artifact, output, expected version 세 개로 제한한다', () => {
  const parameterBlock = source.match(/param\(([\s\S]*?)\)\nSet-StrictMode/);
  assert.ok(parameterBlock, 'PowerShell parameter block이 필요합니다.');
  const names = [...parameterBlock[1].matchAll(/\[string\]\$(\w+)/g)]
    .map((match) => match[1]);
  assert.deepEqual(names, ['ArtifactRoot', 'OutputDirectory', 'ExpectedVersion']);
  assert.match(source, /Set-StrictMode -Version Latest/);
  assert.doesNotMatch(source, /\bImport-Module\b/);
});

test('installer cardinality와 inventory hash를 설치 전에 검증한다', () => {
  assert.match(source, /Get-ChildItem -LiteralPath \$rootItem\.FullName -Recurse -File/);
  assert.match(source, /\$msiFiles\.Count -eq 1/);
  assert.match(source, /\$nsisFiles\.Count -eq 1/);
  assert.match(source, /\$files\.Count -eq 3/);
  assert.match(source, /alhangeul-artifact-inventory\.json/);
  assert.match(source, /Get-FileHash -LiteralPath \$File\.FullName -Algorithm SHA256/);
  assertOrdered([
    'Resolve-BundleArtifacts $ArtifactRoot',
    "Invoke-BundleSmoke 'msi'",
    "Invoke-BundleSmoke 'nsis'",
  ]);
});

test('MSI와 NSIS silent install 및 원본 진단 log 계약을 유지한다', () => {
  for (const option of ["'/i'", "'/qn'", "'/norestart'", "'/L*v'", "'/x'"]) {
    assert.ok(source.includes(option), `MSI option이 필요합니다: ${option}`);
  }
  assert.match(source, /Start-Process -FilePath \$filePath -ArgumentList \$arguments -Wait -PassThru/);
  assert.match(source, /Start-Process -FilePath \$path -ArgumentList @\('\/S'\) -Wait -PassThru/);
  assert.match(source, /Return value 3/);
  assert.match(source, /InstallFailureContext/);
  assert.match(source, /UninstallFailureContext/);
});

test('32/64-bit HKLM·HKCU와 handler·기본 연결을 분리해 검사한다', () => {
  for (const marker of [
    'RegistryHive]::LocalMachine',
    'RegistryHive]::CurrentUser',
    'RegistryView]::Registry64',
    'RegistryView]::Registry32',
    'Alhangeul.hwp',
    'Alhangeul.hwpx',
    'OpenWithProgids',
    'UserChoice',
    'AlhangeulSmoke.Existing',
  ]) {
    assert.ok(source.includes(marker), `registry marker가 필요합니다: ${marker}`);
  }
  assert.match(source, /Restore-AssociationSentinels \$sentinels/);
  assert.doesNotMatch(source, /Get-ChildItem[^\n]*-LiteralPath[^\n]*\\\*/);
});

test('version, shortcut, 제한 실행과 targeted cleanup을 검사한다', () => {
  assert.match(source, /ProductVersion/);
  assert.match(source, /FileVersion/);
  assert.match(source, /version 네 번째 성분은 0이어야 합니다/);
  assert.match(source, /CreateShortcut\(\$path\)\.TargetPath/);
  assert.match(source, /Start-Sleep -Seconds 5/);
  assert.match(source, /Stop-Process -Id \$process\.Id -Force/);
  assert.doesNotMatch(source, /Stop-Process\s+-Name/);
  assert.match(source, /Get-CleanState/);
});

test('fixture, summary, failure category와 finally 증적을 항상 남긴다', () => {
  assert.match(source, /outside-installation-fixture\.txt/);
  assert.match(source, /BeforeSha256/);
  assert.match(source, /AfterSha256/);
  assert.match(source, /windows-installer-smoke-summary\.json/);
  assert.match(source, /ConvertTo-Json -Depth 16/);
  assert.match(source, /finally \{/);
  for (const category of [
    'clean-state',
    'install',
    'reboot-required',
    'registry-handler',
    'version',
    'default-mutation',
    'shortcut',
    'launch',
    'uninstall',
    'cleanup',
    'fixture',
  ]) {
    assert.ok(source.includes(`'${category}'`), `failure category가 필요합니다: ${category}`);
  }
});

test('script와 함수가 구현계획의 크기 상한을 지킨다', () => {
  const lines = source.split(/\r?\n/);
  assert.ok(lines.length <= 300, `script가 300 LOC를 초과했습니다: ${lines.length}`);

  const starts = lines
    .map((line, index) => (/^function /.test(line) ? index : -1))
    .filter((index) => index >= 0);
  const mainStart = lines.findIndex((line) => line === '# Main');
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = index + 1 < starts.length ? starts[index + 1] : mainStart;
    assert.ok(end - start <= 50, `${lines[start]} 함수가 50 LOC를 초과했습니다.`);
    const signature = lines[start].split('{', 1)[0];
    const parameters = signature.match(/\$(\w+)/g) ?? [];
    assert.ok(parameters.length <= 5, `${lines[start]} 함수 parameter가 5개를 초과했습니다.`);
  }
});

function assertOrdered(markers) {
  let previous = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    assert.notEqual(index, -1, `marker가 필요합니다: ${marker}`);
    assert.ok(index > previous, `순서가 올바르지 않습니다: ${marker}`);
    previous = index;
  }
}
