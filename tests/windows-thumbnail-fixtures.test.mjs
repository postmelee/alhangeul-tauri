import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFile(join(root, path), 'utf8');
const [entry, fixtures, registration, diagnostic, manifestText] = await Promise.all([
  read('scripts/windows-installer-smoke.ps1'),
  read('scripts/windows-thumbnail-fixtures.ps1'),
  read('scripts/windows-thumbnail-smoke.ps1'),
  read('scripts/windows-thumbnail-diagnostics.ps1'),
  read('scripts/windows-thumbnail-fixtures.json'),
]);
const manifest = JSON.parse(manifestText);

function ordered(source, markers) {
  let previous = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    assert.ok(index > previous, '순서 또는 필수 호출 누락: ' + marker);
    previous = index;
  }
}

test('small/large HWP, HWPX, JPG를 고정 pin의 실제 SHA/bytes와 대조한다', async () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.rhwpSha, '496333b27d21ddb9114ba9ae340bcb895870c9a7');
  assert.equal(manifest.edge, 256);
  assert.deepEqual(manifest.fixtures.map((fixture) => fixture.id),
    ['small-hwp', 'large-hwp', 'form-hwpx', 'control-jpg']);
  assert.ok(manifest.fixtures[0].bytes < 65536);
  assert.ok(manifest.fixtures[1].bytes > 8 * 1024 * 1024);
  for (const fixture of manifest.fixtures) {
    assert.match(fixture.path, /^third_party\/rhwp\/[a-zA-Z0-9_./-]+$/);
    assert.ok(!fixture.path.includes('..'));
    assert.ok(fixture.reason.length > 20);
    assert.ok(fixture.bytes > 0 && fixture.bytes < 64 * 1024 * 1024);
    const bytes = await readFile(join(root, fixture.path));
    assert.equal(bytes.length, fixture.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), fixture.sha256);
    if (fixture.id === 'control-jpg') {
      assert.equal(bytes.readUInt16BE(0), 0xffd8);
      assert.equal(bytes.readUInt16BE(bytes.length - 2), 0xffd9);
    }
  }
});

test('선택 installer만 실행하며 깨끗한 VM 관측 전에 sentinel을 쓰지 않는다', () => {
  const main = entry.slice(entry.indexOf('# Main'));
  ordered(main, ['Resolve-BundleArtifacts', 'Get-CleanState', "'before-install-state'",
    'Initialize-ThumbnailFixtures', 'Set-AssociationSentinels', 'Invoke-BundleSmoke $InstallerKind']);
  assert.doesNotMatch(entry, /Invoke-BundleSmoke '(?:msi|nsis)'/);
  assert.match(entry, /\$summary.Installers.Count -eq 1/);
  assert.match(entry, /Inventory = \$inventory/);
  assert.match(entry, /Get-Process -Name 'Alhangeul', 'AlhangeulThumbnailWorker'/);
  assert.match(entry, /Synthetic restoration inputs, not a Hancom installation/);
});

test('최초 Shell 뒤에만 재설치·앱 launch·제거·rollback을 실행한다', () => {
  const checks = entry.slice(entry.indexOf('function Invoke-InstalledChecks'), entry.indexOf('function Complete-BundleSmoke'));
  ordered(checks, ["Invoke-ThumbnailFixtureProbe $Result 'initial'", "'Reinstall'",
    'Invoke-ReinstallChecks', 'Invoke-Launch', 'Set-ThirdPartyThumbnail']);
  assert.match(checks, /Invoke-ThumbnailFixtureProbe \$Result \$phase/);
  const bundle = entry.slice(entry.indexOf('function Invoke-BundleSmoke'), entry.indexOf('# Main'));
  ordered(bundle, ['Invoke-Installer', 'Invoke-InstalledChecks', 'Complete-BundleSmoke', 'Invoke-PostUninstallRollback']);
  assert.match(entry, /'REINSTALL=ALL', \$mode/);
  assert.match(entry, /'REINSTALLMODE=amus'.*'REINSTALLMODE=omus'/);
  assert.match(registration, /function Invoke-PostUninstallRollback/);
  assert.ok(bundle.includes("$Kind -eq 'msi' -and $result.After.Clean -and $result.InitialShellSucceeded -and $rollbackSafe"));
  assert.match(registration, /finally \{ if \(\$null -ne \$sentinels\) \{ Restore-ThumbnailSentinels/);
});

test('first/cache/force 경로와 재설치 phase는 새 복사본으로 분리한다', () => {
  for (const role of ['first', 'cache', 'force']) assert.ok(fixtures.includes("$fixture $Phase '" + role + "'"));
  assert.match(fixtures, /Guid\]::NewGuid\(\)/);
  assert.match(fixtures, /File\]::Copy\(\$source, \$copy, \$false\)/);
  assert.match(fixtures, /SetLastWriteTimeUtc\(\$copy, \[DateTime\]::UtcNow\)/);
  assert.doesNotMatch(fixtures, /Get-ChildItem.*Select-Object -First/);
  const probe = fixtures.slice(fixtures.indexOf('function Invoke-ThumbnailFixtureProbe'));
  ordered(probe, ["'shell' $copy.Shell", "'association' $extension",
    "'cache-only' $copy.Cache", "'force-extract' $copy.Force", '"$Phase-after-force"',
    '"$Phase-activate"']);
});

test('진단은 standalone에 위임하고 성공 코드와 bitmap을 따로 검사한다', () => {
  assert.match(fixtures, /windows-thumbnail-diagnostics.ps1'\) -InputPath \$InputValue/);
  assert.match(fixtures, /-Size 256 -TimeoutSeconds 30/);
  assert.match(diagnostic, /exit 0\s*$/);
  assert.doesNotMatch(registration + fixtures, /Add-Type|Probe\]::Run/);
  assert.match(fixtures, /\$probe.status -ne 'ok' -or \$probe.bitmapPresent -ne \$true/);
  assert.match(fixtures, /phase = 'harness'; detailCode = 'diagnostic-evidence-invalid'/);
});

test('cache-only API 실패는 관측으로 남기고 실제 추출 성공과 합치지 않는다', () => {
  assert.match(fixtures, /if \(\$Mode -eq 'cache-only'\)/);
  assert.match(fixtures, /\$probe.phase -ne 'IThumbnailCache.GetThumbnail'/);
  assert.match(fixtures, /Add-Failure \$Result 'thumbnail-diagnostics'/);
  assert.match(fixtures, /Add-Failure \$Result 'thumbnail-render'/);
  assert.match(fixtures, /\$Result.Probes \+= .*Result = \$probe/);
  assert.doesNotMatch(fixtures, /\$probe.status\s*=/);
});

test('필수 probe 증거·원본 불변·worker 종료·설치 bytes를 gate로 검사한다', () => {
  assert.match(fixtures, /\$Probes.Count -eq \$expected.Count/);
  assert.match(fixtures, /Select-Object -Unique\).Count -eq \$expected.Count/);
  assert.match(fixtures, /Assert-ThumbnailProbeEvidence \$Result/);
  assert.match(fixtures, /Get-ThumbnailExpectedLabels/);
  assert.match(fixtures, /\$source.Size -eq \$Copy.Spec.bytes -and \$source.Sha256 -eq \$Copy.Spec.sha256/);
  assert.match(fixtures, /ConvertTo-Json \$Copy.Before -Compress/);
  assert.match(fixtures, /Get-Process -Name 'AlhangeulThumbnailWorker'/);
  assert.match(registration, /Get-FileHash -LiteralPath \$artifacts.Handler/);
  assert.match(registration, /Get-FileHash -LiteralPath \$artifacts.Worker/);
});

test('공개 복사본은 업로드 경로 밖에 두고 소유한 임시 하위 폴더만 정리한다', () => {
  assert.match(fixtures, /Join-Path \(\[IO.Path\]::GetTempPath\(\)\)/);
  assert.match(fixtures, /GetDirectoryName\(\$path\) -ieq \$parent/);
  assert.match(fixtures, /\^alhangeul-thumbnail-smoke-\[0-9a-f\]\{32\}\$/);
  assert.match(fixtures, /Remove-Item -LiteralPath \$path -Recurse -Force/);
  assert.match(entry, /try \{ Remove-ThumbnailFixtureCopies \} catch/);
  assert.doesNotMatch(fixtures, /Stop-Process|taskkill|reg.exe/i);
});

test('정규 automation suite가 fixture 계약 검사를 포함한다', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.ok(pkg.scripts['test:automation'].includes('tests/windows-thumbnail-fixtures.test.mjs'));
});
