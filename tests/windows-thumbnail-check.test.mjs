import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (file) => readFile(new URL('../' + file, import.meta.url), 'utf8');
const [entry, support, assessment, native, fixtures] = await Promise.all([
  'scripts/windows-thumbnail-check.ps1', 'scripts/windows-thumbnail-check-support.ps1',
  'scripts/windows-thumbnail-check-assessment.ps1', 'scripts/windows-thumbnail-check-tests.ps1',
  'scripts/windows-thumbnail-fixtures.ps1',
].map(read));

test('manual PS scripts preserve BOM and maintainability bounds', () => {
  for (const src of [entry, support, assessment, native]) {
    assert.equal(src.charCodeAt(0), 0xfeff); assert.ok(src.split('\n').length <= 300);
    for (const fn of src.split(/^function /m).slice(1)) {
      const body = fn.slice(0, fn.indexOf('\n}\n') + 2);
      assert.ok(body.split('\n').length <= 50, fn.split('\n')[0]);
      assert.ok((fn.match(/^[^(]+\(([^)]*)\)/)?.[1] ?? '').split(',').length <= 5);
    }
  }
});
test('consent gate precedes all document IO and helper execution', () => {
  assert.match(entry, /param\(\[string\]\$DocumentPath = '', \[string\]\$JpgPath = '', \[string\]\$OutputDirectory = '', \[switch\]\$Consent\)/);
  assert.ok(entry.indexOf('if (-not $Consent)') < entry.indexOf('$package = Read-CheckPackage'));
  assert.ok(entry.indexOf('$package = Read-CheckPackage') < entry.indexOf(". (Join-Path $PSScriptRoot 'windows-thumbnail-assessment.ps1')"));
  assert.match(entry, /exit 2/);
});
test('inputs and cleanup reject reparse, remote and existing destinations', () => {
  for (const marker of ['DriveType]::Fixed', 'FileAttributes]::ReparsePoint', 'CreateNew']) assert.ok(entry.includes(marker));
  for (const marker of ['output-exists', 'input-output-collision', '64MB', '[IO.FileShare]::Read', 'input-or-output-invalid', '[IO.Directory]::Delete($temp, $false)']) assert.ok(support.includes(marker));
  assert.doesNotMatch(support, /-Recurse|Delete\([^\n]*\$true/);
  assert.match(support, /source\.Stream.Dispose\(\)/);
  assert.match(entry, /cleanup-or-integrity-failed/);
  assert.match(entry, /\$Summary.thumbnailStatus = 'not-accepted'/);
  assert.match(entry, /\$PSVersionTable.PSVersion.Minor -ne 1/);
});
test('manual reports never serialize private context or exception text', () => {
  assert.doesNotMatch(entry + support, /Write-(?:Output|Host|Error)[^\n]*(?:\$DocumentPath|\$JpgPath|Exception|\.Hash|\.Path)/);
  assert.doesNotMatch(support, /ConvertTo-Json \$Context|ConvertTo-Json \$source/);
  assert.match(support, /Invoke-ManualThumbnailCheck/);
  assert.match(entry, /Write-CheckJson .*\$summary/);
});
test('manual classifier requires ten probes without inventing CI fixtures', () => {
  assert.match(assessment, /\$Probes.Count -ne 10/);
  for (const marker of ['Test-ThumbnailProbeContract', 'Test-ThumbnailBitmap', 'Get-ThumbnailDocumentFinding', 'reference-mismatch', 'registration-ambiguous', 'other-handler-selected', "lifecycleStatus = 'not-tested'"]) assert.ok(assessment.includes(marker));
  assert.doesNotMatch(assessment, /Get-ThumbnailPhaseAssessment|small-hwp|large-hwp|form-hwpx|enableLUA/);
  assert.doesNotMatch(assessment, /Get-Content|Set-Content|Start-Process|RegistryKey|Remove-Item/);
});
test('preflight must pass before Shell, and fresh Shell precedes force and activation', () => {
  assert.match(support, /if \(\$registration.ready\) \{ Invoke-CheckImages/);
  const src = support.slice(support.indexOf('function Invoke-CheckImages'), support.indexOf('function Invoke-ManualThumbnailCheck'));
  assert.ok(src.indexOf("$_.Mode -eq 'shell'") < src.indexOf("$_.Mode -ne 'shell'"));
  assert.ok(src.indexOf("'force-extract'") < src.indexOf("'manual-activate'"));
  assert.match(support, /registration-changed/);
});
test('CI runs packaged entry after the original cold probes without hiding product failures', () => {
  assert.match(fixtures, /if \(\$Phase -eq 'initial'\).*'manual-diagnostics'/);
  assert.match(fixtures, /Join-Path \$root 'windows-thumbnail-check.ps1'/);
  assert.match(fixtures, /\$expectedCode = if \(\$expected -eq 'thumbnail-api-ok'\) \{ 0 \} else \{ 1 \}/);
  const phase = fixtures.slice(fixtures.indexOf('function Invoke-ThumbnailFixtureProbe'), fixtures.indexOf('function Invoke-ManualFixtureChecks'));
  assert.ok(phase.indexOf('Invoke-ManualFixtureChecks') > phase.indexOf('$Phase-activate'));
  assert.ok(phase.indexOf('Invoke-ManualFixtureChecks') < phase.indexOf('$afterProcesses'));
  assert.match(native, /manual raw mismatch/); assert.match(native, /manual assessment mismatch/);
});
test('native tests cover classification, tamper, original protection and consent', () => {
  for (const marker of ['foreach ($uac in @(0, 1))', 'reference-mismatch', 'registration-ambiguous', 'child-timeout', 'unreadable', 'raw evidence mutated', 'JSON round-trip mismatch', 'tampered', '../escape.ps1', 'concurrent change', 'unexpected file deleted', 'consent gate failed', 'x86 gate failed', '-ItemType Junction', 'private input leaked', 'malformed child JSON accepted', 'cleanup failure retained success', 'manual registration mismatch']) assert.ok(native.includes(marker), marker);
});
test('automation includes manual and support contract suites', async () => {
  const pkg = JSON.parse(await read('package.json'));
  for (const name of ['windows-thumbnail-check', 'windows-thumbnail-support']) assert.ok(pkg.scripts['test:automation'].includes(`tests/${name}.test.mjs`));
});
