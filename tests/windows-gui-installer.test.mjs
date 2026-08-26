import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptBytes = await readFile(join(repoRoot, 'scripts/windows-gui-installer.ps1'));
const source = scriptBytes.toString('utf8');

test('Windows PowerShell 5.1용 UTF-8 BOM과 제한된 lifecycle parameter를 유지한다', () => {
  assert.deepEqual([...scriptBytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.match(source, /ValidateSet\('Install', 'Uninstall'\)/);
  assert.match(source, /ValidateSet\('msi', 'nsis'\)/);
  for (const name of ['Action', 'InstallerKind', 'ArtifactRoot', 'OutputDirectory', 'StatePath']) {
    assert.match(source, new RegExp(`\\[string\\]\\$${name}\\b`));
  }
  assert.match(source, /Set-StrictMode -Version Latest/);
});

test('verified root에서 installer kind별 cardinality를 설치 전에 고정한다', () => {
  assert.match(source, /Get-ChildItem -LiteralPath \$rootItem\.FullName -Recurse -File/);
  assert.match(source, /\$files\.Count -eq 1/);
  assert.match(source, /\.Extension -ieq \$extension/);
  assertOrdered([
    'Resolve-Installer $ArtifactRoot $InstallerKind',
    'Invoke-GuiInstall $InstallerKind',
  ]);
});

test('MSI·NSIS silent install과 종류별 uninstall을 argv 배열로 실행한다', () => {
  for (const option of ["'/i'", "'/qn'", "'/norestart'", "'/L*v'", "'/x'", "'/S'"]) {
    assert.ok(source.includes(option), `installer option이 필요합니다: ${option}`);
  }
  assert.match(source, /Start-Process -FilePath \$FilePath -ArgumentList \$Arguments -Wait -PassThru/);
  assert.doesNotMatch(source, /Invoke-Expression|cmd\.exe|powershell\.exe.*-Command/i);
});

test('state는 executable·MSI product code를 결속하고 targeted process만 정리한다', () => {
  assert.match(source, /SchemaVersion = 1; Kind = \$Kind; Installer = \$Installer/);
  assert.match(source, /ProductCode = \$productCode/);
  assert.match(source, /\[IO\.Path\]::GetFullPath\(\$process\.Path\) -ieq \$expected/);
  assert.match(source, /Stop-Process -Id \$process\.Id -Force/);
  assert.doesNotMatch(source, /Stop-Process\s+-Name/);
  assert.doesNotMatch(source, /Remove-Item[^\n]*-Recurse/);
  assert.match(source, /PSObject\.Properties\['DisplayName'\]/);
  assert.doesNotMatch(source, /\$entry\.DisplayName/);
});

test('cleanup은 residue를 숨기지 않고 summary와 실패 exit를 남긴다', () => {
  assert.match(source, /Wait-ForPathGone \$state\.InstallDirectory/);
  assert.match(source, /ResidueFree = \$true/);
  assert.match(source, /\$InstallerKind-\$\(\$Action\.ToLowerInvariant\(\)\)-summary\.json/);
  assert.match(source, /finally \{[\s\S]*Write-Json \$summaryPath \$summary/);
  assert.match(source, /Write-Error "Windows GUI installer \$Action 실패:[^"]+" -ErrorAction Continue/);
  assert.match(source, /exit 1/);
});

test('script와 함수가 구현계획의 크기 상한을 지킨다', () => {
  const lines = source.split(/\r?\n/);
  assert.ok(lines.length <= 300, `script가 300 LOC를 초과했습니다: ${lines.length}`);
  const starts = lines.map((line, index) => (/^function /.test(line) ? index : -1))
    .filter((index) => index >= 0);
  const mainStart = lines.findIndex((line) => line === '# Main');
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = index + 1 < starts.length ? starts[index + 1] : mainStart;
    assert.ok(end - start <= 50, `${lines[start]} 함수가 50 LOC를 초과했습니다.`);
    const parameters = lines[start].split('{', 1)[0].match(/\$(\w+)/g) ?? [];
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
