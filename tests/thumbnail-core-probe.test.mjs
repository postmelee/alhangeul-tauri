import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptPath = join(repoRoot, 'scripts/benchmark-thumbnail-core.ps1');
const [scriptBytes, packageSource] = await Promise.all([
  readFile(scriptPath),
  readFile(join(repoRoot, 'package.json'), 'utf8'),
]);
const source = scriptBytes.toString('utf8');

test('probe contract test가 automation inventory에 포함된다', () => {
  const packageJson = JSON.parse(packageSource);
  assert.match(
    packageJson.scripts['test:automation'],
    /tests\/thumbnail-core-probe\.test\.mjs/,
  );
});

test('PowerShell 5.1용 UTF-8 BOM과 세 입력 계약을 유지한다', () => {
  assert.deepEqual([...scriptBytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  const parameterBlock = source.match(/param\(([\s\S]*?)\)\nSet-StrictMode/);
  assert.ok(parameterBlock, 'parameter block이 필요합니다.');
  const names = [...parameterBlock[1].matchAll(/\[string\]\$(\w+)/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(names, ['RhwpBinary', 'FixtureRoot', 'OutputDirectory']);
  assert.match(source, /Set-StrictMode -Version Latest/);
  assert.match(source, /\$env:OS -eq 'Windows_NT'/);
  assert.match(source, /\[Environment\]::Is64BitOperatingSystem/);
  assert.doesNotMatch(source, /\bImport-Module\b/);
});

test('pinned repository와 rhwp SHA를 summary에 결속한다', () => {
  assert.match(source, /RepositorySha = \$null/);
  assert.match(source, /RhwpSha = \$null/);
  assert.match(source, /git -C \$repoRoot rev-parse HEAD/);
  assert.match(source, /git -C \$repoRoot rev-parse 'HEAD:third_party\/rhwp'/);
  assert.match(source, /\$summary\.RhwpSha -eq \$expectedRhwpSha/);
  assert.match(source, /Kind = 'alhangeul-thumbnail-core-probe'/);
  assert.match(source, /thumbnail-core-summary\.json/);
});

test('fixture는 이름·본문 대신 hash와 resource 계측만 기록한다', () => {
  for (const marker of [
    'Get-FileHash -LiteralPath $Path -Algorithm SHA256',
    'ModifiedUtc',
    'PeakWorkingSetBytes',
    'WallMs',
    'StdoutBytes',
    'StderrBytes',
    'ObservedMaxima',
  ]) {
    assert.ok(source.includes(marker), `resource marker가 필요합니다: ${marker}`);
  }
  assert.match(source, /fixture-\$\(\$before\.Sha256\)/);
  assert.doesNotMatch(source, /Original\s*=\s*\[ordered\]@\{[^}]*Path\s*=/);
  assert.doesNotMatch(source, /Stdout\s*=\s*\$outText[^}]*Original/);
  assert.match(source, /fixture 원본이 probe 중 변경되었습니다/);
  assert.match(source, /Remove-Item -LiteralPath \$scratchRoot -Recurse -Force/);
});

test('bench, first-page direct SVG, preview를 독립 process로 측정한다', () => {
  assertOrdered([
    "@('bench', $File.FullName, '-n', '1', '--tsv', $benchTsv)",
    "@('export-svg', $File.FullName, '--page', '0', '--json', '--output', $directDirectory)",
    "@('thumbnail', $File.FullName, '--output', $previewPath)",
  ]);
  assert.match(source, /\$timer\.ElapsedMilliseconds -lt \$commandTimeoutMs/);
  assert.match(source, /WaitForExit\(5\)/);
  assert.match(source, /\$process\.WorkingSet64/);
  assert.match(source, /GetProcessMemoryInfo/);
  assert.match(source, /PeakWorkingSet\(\$processHandle\)/);
  assert.match(source, /if \(-not \$finished\) \{ \$process\.Kill\(\)/);
  assert.match(source, /Get-SvgMetadata/);
  assert.match(source, /Get-PreviewMetadata/);
  assert.match(source, /PreviewPixels/);
});

test('fixture matrix는 preview 없음·stale·손상·64 MiB 경계를 파생한다', () => {
  for (const fixtureClass of [
    'preview-absent',
    'preview-stale',
    'corrupt-truncated',
    'size-boundary-64mib-plus-one',
  ]) {
    assert.ok(source.includes(`'${fixtureClass}'`), `fixture class가 필요합니다: ${fixtureClass}`);
  }
  assert.match(source, /New-HwpxVariant/);
  assert.match(source, /64MB \+ 1/);
  assert.match(source, /FixtureClass = \$FixtureClass/);
});

test('registry probe는 disposable HKCU Registry64만 만들고 항상 제거한다', () => {
  for (const marker of [
    'RegistryHive]::CurrentUser',
    'RegistryView]::Registry64',
    '.alhangeulthumb$token',
    'SystemFileAssociations\\$extension',
    'CLSID\\$clsid\\InprocServer32',
    'DeleteSubKeyTree($path, $false)',
    'SHChangeNotify',
    'AssocQueryStringW',
    'IShellItemImageFactory',
    'SIIGBF_THUMBNAILONLY',
    'DeleteObject',
  ]) {
    assert.ok(source.includes(marker), `registry marker가 필요합니다: ${marker}`);
  }
  assert.match(source, /finally \{[\s\S]*DeleteSubKeyTree\(\$path, \$false\)/);
  assert.match(source, /registry candidate를 해석하지 못했습니다/);
  assert.doesNotMatch(source, /active ProgID thumbnail handler가 우선되지 않았습니다/);
  assert.doesNotMatch(source, /Stop-Process/);
  assert.doesNotMatch(source, /Software\\Classes\\\.hwp[x]?/i);
});

test('script와 함수가 저장소 크기 상한을 지킨다', () => {
  const lines = source.split(/\r?\n/);
  assert.ok(lines.length <= 300, `script가 300 LOC를 초과했습니다: ${lines.length}`);
  const starts = lines
    .map((line, index) => (/^function /.test(line) ? index : -1))
    .filter((index) => index >= 0);
  const mainStart = lines.findIndex((line) => line.startsWith('Assert-Condition ($env:OS'));
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = index + 1 < starts.length ? starts[index + 1] : mainStart;
    assert.ok(end - start <= 50, `${lines[start]} 함수가 50 LOC를 초과했습니다.`);
    const signature = lines[start].split('{', 1)[0];
    const parameters = signature.match(/\$(\w+)/g) ?? [];
    assert.ok(parameters.length <= 5, `${lines[start]} parameter가 5개를 초과했습니다.`);
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
