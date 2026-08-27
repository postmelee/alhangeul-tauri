import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptPath = join(repoRoot, 'scripts/windows-installer-smoke.ps1');
const lifecyclePath = join(repoRoot, 'scripts/windows-process-lifecycle.ps1');
const scriptBytes = await readFile(scriptPath);
const source = scriptBytes.toString('utf8');
const lifecycleSource = await readFile(lifecyclePath, 'utf8');

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
  assert.match(source, /\. "\$PSScriptRoot\/windows-process-lifecycle\.ps1"/);
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
  assert.match(
    source,
    /Software\\Alhangeul\\FileAssocBackup/,
    'NSIS hook의 전용 backup key도 clean state 판정에 포함해야 합니다.',
  );
});

test('sentinel은 부분 실패에서도 복원 대상으로 남는다', () => {
  const setter = source.match(
    /function Set-AssociationSentinels \{[\s\S]+?\n\}/,
  )?.[0];

  assert.ok(setter, 'Set-AssociationSentinels 계약이 필요합니다.');
  assert.ok(
    setter.indexOf('$script:sentinels +=') < setter.indexOf('$key.SetValue'),
    'sentinel record는 registry 변경 전에 script scope에 남아야 합니다.',
  );
  assert.doesNotMatch(
    source,
    /^\$sentinels = \$null$/m,
    'sentinel 누적은 throw 이후에도 조회 가능해야 합니다.',
  );
  assert.match(source, /^\$sentinels = @\(\)$/m);
  const restore = source.match(
    /function Restore-AssociationSentinels\(\$Records\) \{[\s\S]+?\n\}/,
  )?.[0];
  assert.ok(restore, 'Restore-AssociationSentinels 계약이 필요합니다.');
  assert.match(
    restore,
    /if \(\$null -eq \$key -and \$record\.KeyExisted\) \{ \$key = \$classes\.CreateSubKey\(\$record\.Extension\) \}[\s\S]+?if \(\$null -eq \$key\) \{ continue \}/,
    '원래 존재했던 extension key는 삭제되어도 재생성해 복원해야 합니다.',
  );
});

test('summary 기록은 sentinel 복원 실패와 무관하게 항상 수행한다', () => {
  const tail = source.slice(source.indexOf('} finally {', source.indexOf('# Main')));

  assert.ok(
    tail.indexOf('Restore-AssociationSentinels $sentinels') <
      tail.indexOf('Set-Content -LiteralPath $summaryPath'),
  );
  assert.match(
    tail,
    /\} catch \{[^\n]*'sentinel-restore'[^\n]*\} finally \{[^\n]*Set-Content -LiteralPath \$summaryPath/,
    'summary 기록은 복원 예외를 감싼 finally 안에 있어야 합니다.',
  );
  assert.match(
    source,
    /Write-Error "[^"]+" -ErrorAction Continue; exit 1/,
    '종료 코드가 terminating error에 가려지면 안 됩니다.',
  );
});

test('실패 진단 helper는 빈 log에서 예외를 던지지 않는다', () => {
  assert.match(
    source,
    /\$lines = @\(Get-Content -LiteralPath \$LogPath\); if \(\$lines\.Count -eq 0\) \{ return \$null \}/,
    'StrictMode에서 0..-1 범위 index를 만들면 안 됩니다.',
  );
});

test('version, shortcut, 제한 실행과 targeted cleanup을 검사한다', () => {
  assert.match(source, /ProductVersion/);
  assert.match(source, /FileVersion/);
  assert.match(source, /version 네 번째 성분은 0이어야 합니다/);
  assert.match(source, /CreateShortcut\(\$path\)\.TargetPath/);
  assert.match(source, /function ConvertTo-NormalizedPath\(\$Value\)/);
  assert.match(source, /function ConvertTo-NormalizedVersion\(\$Value\)/);
  assert.doesNotMatch(
    source,
    /Normalize-Version/,
    'PowerShell 승인 동사가 아닌 함수 이름을 쓰지 않습니다.',
  );
  assert.match(source, /ReleaseComObject\(\$shell\)/);
  assert.match(source, /\.Trim\(\)\.Trim\('\"'\)/);
  assert.match(source, /\$leftPath = ConvertTo-NormalizedPath \$Left/);
  assert.match(lifecycleSource, /foreach \(\$iteration in 1\.\.2\)/);
  assert.match(lifecycleSource, /WaitForInputIdle\(30000\)/);
  assert.match(lifecycleSource, /function Wait-ForStableMainWindow\(\$Process, \$Iteration\)/);
  assert.match(lifecycleSource, /\$stableSamples -ge 11/);
  assert.match(lifecycleSource, /Start-Sleep -Milliseconds 500/);
  assert.match(lifecycleSource, /\$currentHandle -ne \[IntPtr\]::Zero -and \$Process\.Responding/);
  assert.match(lifecycleSource, /StableSamples = \$stableSamples/);
  assert.match(lifecycleSource, /\$process\.CloseMainWindow\(\)/);
  assert.match(lifecycleSource, /WaitForExit\(30000\)/);
  assert.match(lifecycleSource, /handle=\$\(\$process\.MainWindowHandle\.ToInt64\(\)\)/);
  assert.match(lifecycleSource, /title=\$\(\$process\.MainWindowTitle\)/);
  assert.match(lifecycleSource, /responding=\$\(\$process\.Responding\)/);
  assert.match(lifecycleSource, /CycleCount = \$cycles\.Count/);
  assert.doesNotMatch(lifecycleSource, /Start-Sleep -Seconds 5/);
  assert.match(lifecycleSource, /Stop-Process -Id \$process\.Id -Force/);
  assert.doesNotMatch(lifecycleSource, /Stop-Process\s+-Name/);
  assert.match(source, /Get-CleanState/);
  assert.ok(
    source.includes(
      '$candidatePaths = @($msiInstallDirectory, $nsisInstallDirectory) + $shortcutPaths',
    ),
    'clean-state path 후보는 Test-Path 전에 평탄화해야 합니다.',
  );
  assert.match(
    source,
    /\$residualPaths = @\(\$candidatePaths \| Where-Object \{ Test-Path -LiteralPath \$_ \}\)/,
  );
  assert.doesNotMatch(
    source,
    /\$residualPaths = @\(\$msiInstallDirectory, \$nsisInstallDirectory, \$shortcutPaths\)/,
  );
  assert.ok(
    source.includes('Processes = @($processes | ForEach-Object { $_.Id })'),
    '빈 process 배열에서도 StrictMode-safe ID projection이 필요합니다.',
  );
  assert.doesNotMatch(source, /Processes = @\(\$processes\.Id\)/);
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
    'sentinel-restore',
  ]) {
    assert.ok(source.includes(`'${category}'`), `failure category가 필요합니다: ${category}`);
  }
});

test('script와 함수가 구현계획의 크기 상한을 지킨다', () => {
  assertPowerShellSize('windows-installer-smoke.ps1', source, '# Main');
  assertPowerShellSize('windows-process-lifecycle.ps1', lifecycleSource);
});

function assertPowerShellSize(name, scriptSource, mainMarker) {
  const lines = scriptSource.split(/\r?\n/);
  assert.ok(lines.length <= 300, `${name}이 300 LOC를 초과했습니다: ${lines.length}`);
  const starts = lines
    .map((line, index) => (/^function /.test(line) ? index : -1))
    .filter((index) => index >= 0);
  const mainStart = mainMarker
    ? lines.findIndex((line) => line === mainMarker)
    : lines.length;
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = index + 1 < starts.length ? starts[index + 1] : mainStart;
    assert.ok(end - start <= 50, `${name}: ${lines[start]} 함수가 50 LOC를 초과했습니다.`);
    const signature = lines[start].split('{', 1)[0];
    const parameters = signature.match(/\$(\w+)/g) ?? [];
    assert.ok(parameters.length <= 5, `${name}: ${lines[start]} 함수 parameter가 5개를 초과했습니다.`);
  }
}

function assertOrdered(markers) {
  let previous = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    assert.notEqual(index, -1, `marker가 필요합니다: ${marker}`);
    assert.ok(index > previous, `순서가 올바르지 않습니다: ${marker}`);
    previous = index;
  }
}
