import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// Source contracts only. Windows PowerShell compilation/COM execution is a separate native gate.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const names = ['diagnostics.ps1', 'probe.ps1', 'state.ps1', 'native.cs', 'interop.cs', 'token.cs'];
const bytes = await Promise.all(names.map((name) => readFile(join(root, `scripts/windows-thumbnail-${name}`))));
const [entry, child, state, native, interop, token] = bytes.map((value) => value.toString('utf8'));
const all = [entry, child, state, native, interop, token].join('\n');

test('PowerShell 5.1 BOM 및 역할별 300 LOC 경계를 유지한다', () => {
  bytes.forEach((value, index) => {
    if (names[index].endsWith('.ps1')) assert.deepEqual([...value.subarray(0, 3)], [239, 187, 191]);
    assert.ok(value.toString('utf8').split('\n').length <= 300, names[index]);
  });
});

test('PowerShell helper 함수는 50 LOC와 입력 5개 이내로 유지한다', () => {
  for (const source of [entry, child, state]) {
    const lines = source.split('\n');
    const starts = lines.flatMap((line, index) => /^function /.test(line) ? [index] : []);
    for (const start of starts) {
      const end = lines.findIndex((line, index) => index > start && line === '}');
      assert.ok(end > start && end - start + 1 <= 50, lines[start]);
      assert.ok((lines[start].split('{')[0].match(/\$\w+/g) ?? []).length <= 5, lines[start]);
    }
  }
});

test('진단 입력은 5개와 허용된 mode/범위로 제한한다', () => {
  const parameters = entry.match(/param\(([\s\S]*?)\n\)/)[1];
  assert.deepEqual([...parameters.matchAll(/\$(\w+)\s*(?:=|,)/g)].map((match) => match[1]),
    ['InputPath', 'OutputPath', 'Mode', 'Size', 'TimeoutSeconds']);
  assert.match(entry, /ValidateRange\(1, 1024\)/);
  assert.match(entry, /ValidateRange\(1, 60\)/);
  assert.match(entry, /\$TimeoutSeconds = 15/);
  for (const mode of ['state', 'association', 'activate', 'shell', 'cache-only', 'force-extract']) {
    assert.ok(entry.includes(`'${mode}'`));
    assert.ok(child.includes(`'${mode}'`));
  }
  assert.doesNotMatch(all, /Invoke-Expression|EncodedCommand|ExecutionPolicy Bypass|DisableProcessIsolation/);
});

test('probe는 고정 x64 STA 자식에서 실행하고 입력은 코드와 분리한다', () => {
  assert.match(entry, /System32\\WindowsPowerShell\\v1\.0\\powershell\.exe/);
  assert.match(entry, /-NoLogo -NoProfile -NonInteractive -STA -File/);
  assert.match(entry, /ConvertTo-ThumbnailArgument \$child/);
  assert.match(entry, /EnvironmentVariables\['ALHANGEUL_THUMBNAIL_PROBE_REQUEST'\]/);
  assert.match(child, /Remove-Item Env:\\ALHANGEUL_THUMBNAIL_PROBE_REQUEST/);
  assert.match(child, /Is64BitProcess/);
  assert.match(child, /GetApartmentState\(\) -ne 'STA'/);
  assert.match(interop, /ApartmentState\.STA/);
  assert.doesNotMatch(entry, /Arguments[^\n]*\$(?:InputPath|Mode|Size)/);
});

test('timeout은 시작한 process만 종료하며 비정상 출력은 실패다', () => {
  assert.match(entry, /WaitForExit\(\$TimeoutSeconds \* 1000\)/);
  assert.match(entry, /\$Process\.Kill\(\)/i);
  assert.match(entry, /'child-timeout' 'timeout'/);
  assert.match(entry, /ReadToEndAsync\(\)/);
  assert.match(entry, /\$raw.Length -gt 262144/);
  assert.match(entry, /IsNullOrWhiteSpace\(\$Stderr.Result\)/);
  assert.match(entry, /\$Process.ExitCode -ne 0/);
  assert.match(entry, /'invalid-json-contract'/);
  assert.doesNotMatch(all, /Stop-Process|taskkill|Get-Process -Name|Remove-Item.*(?:thumbcache|Explorer)/i);
});

test('결과는 새 JSON만 쓰고 문서 내용 및 예외 원문을 출력하지 않는다', () => {
  assert.match(entry, /FileMode\]::CreateNew/);
  assert.match(entry, /\$InputPath -ieq \$output/);
  assert.match(entry, /GetExtension\(\$output\) -ine '\.json'/);
  assert.doesNotMatch(all, /Exception\.Message|error\.Message|StackTrace|ReadAllText|ReadAllBytes/);
  assert.doesNotMatch(all, /Write-(?:Host|Warning|Error)/);
  assert.match(state, /'<external-path>'/);
  assert.match(state, /"<\$root>\\Alhangeul/);
  assert.match(state, /Get-FileHash -LiteralPath \$Path -Algorithm SHA256/);
  const inproc = state.slice(state.indexOf('function Get-ThumbnailInprocState'), state.indexOf('function Get-ThumbnailRegistrationSnapshot'));
  assert.doesNotMatch(inproc, /; path = \$path\b/);
  assert.doesNotMatch(state, /\$env:(?:USERNAME|USERPROFILE)/i);
});

test('상태 수집은 Registry64 allowlist를 읽고 누락/읽기실패를 분리한다', () => {
  assert.match(state, /RegistryView\]::Registry64/);
  assert.match(state, /OpenSubKey\(\$Path, \$false\)/);
  for (const marker of ['CurrentUser', 'LocalMachine', 'EnableLUA', 'IconsOnly', 'DisableThumbnails',
    'CurrentBuildNumber', 'UBR', 'ImageVersion', 'sessionId', 'InprocServer32', 'ThreadingModel']) {
    assert.ok(state.includes(marker), marker);
  }
  for (const status of ['missing', 'unreadable', 'invalid']) assert.ok(state.includes(`status = '${status}'`));
  assert.match(state, /status = 'missing'; value = \$null/);
  assert.match(state, /status = 'unreadable'; value = \$null/);
  assert.match(child, /status = 'collected'/);
  assert.doesNotMatch(state, /SetValue|CreateSubKey|DeleteSubKey|Set-Item|New-Item|reg\.exe/);
  assert.doesNotMatch(state, /Probe\]::Run/);
});

test('token은 실제 elevation/type/integrity만 수집하고 SID와 계정을 직렬화하지 않는다', () => {
  assert.match(token, /OpenProcessToken\(GetCurrentProcess\(\), 8, out token\)/);
  assert.match(token, /ReadInteger\(token, 20\)/);
  assert.match(token, /ReadInteger\(token, 18\)/);
  assert.match(token, /result.nativeErrorCode = win32.NativeErrorCode/);
  assert.match(token, /GetTokenInformation\(token, 25/);
  assert.match(token, /finally \{ if \(token != IntPtr.Zero\) CloseHandle\(token\); \}/);
  assert.equal((token.match(/Marshal\.FreeHGlobal\(output\)/g) ?? []).length, 2);
  assert.doesNotMatch(all, /ConvertSidToStringSid|WindowsIdentity|UserName|public string.*\bsid\b/i);
});

test('COM IID 및 SDK vtable 순서와 thumbnail flag를 명시한다', () => {
  for (const guid of ['BCC18B79-BA16-442F-80C4-8A59C30C463B', '091162A4-BC96-411F-AAE8-C5122CD03363',
    'F676C15D-596A-4CE2-8234-33996F445DB1', '50EF4544-AC9F-4A8E-B21B-8A26180DB13F']) {
    assert.ok(native.includes(guid));
  }
  const shared = native.slice(native.indexOf('interface ISharedBitmap'), native.indexOf('interface IThumbnailCache'));
  const methods = [...shared.matchAll(/\[PreserveSig\] int (\w+)\(/g)].map((match) => match[1]);
  assert.deepEqual(methods, ['GetSharedBitmap', 'GetSize', 'GetFormat', 'InitializeBitmap', 'Detach']);
  assert.match(native, /struct ThumbnailId \{ public Guid Value; \}/);
  assert.match(native, /GetThumbnailByID\(ThumbnailId id/);
  assert.match(native, /SIIGBF_THUMBNAILONLY = 8/);
  assert.match(native, /WTS_INCACHEONLY = 1/);
  assert.match(native, /WTS_FORCEEXTRACTION = 4/);
  assert.doesNotMatch(native, /WTS_EXTRACTINPROC|WTS_FORCEAPP/);
});

test('성공 HRESULT만으로 통과하지 않고 bitmap과 유효 크기가 필요하다', () => {
  assert.match(interop, /unchecked\(\(uint\)hr\)\.ToString\("X8"\)/);
  assert.match(interop, /return hr == 0/);
  assert.match(interop, /bitmap == IntPtr.Zero\) \{ detailCode = "null-bitmap"; return; \}/);
  assert.match(interop, /value.Width <= 0 \|\| value.Height <= 0 \|\| value.Width > 1024 \|\| value.Height > 1024/);
  assert.match(interop, /Native.GetBitmapObject/);
  assert.match(interop, /if \(result.Check\(hr\)\) result.InspectBitmap\(bitmap\)/);
  assert.match(entry, /\$parsed.bitmapPresent -isnot \[bool\]/);
  assert.match(entry, /\$parsed.width -isnot \[int\]/);
  for (const field of ['schemaVersion', 'mode', 'status', 'phase', 'hresult', 'bitmapPresent',
    'width', 'height', 'cacheFlags', 'elapsedMs', 'detailCode']) assert.ok(entry.includes(`'${field}'`));
});

test('API 실패 단계·cache flags를 기록하고 bitmap별 소유권을 지킨다', () => {
  const shell = interop.slice(interop.indexOf('private static void Shell'), interop.indexOf('private static void Cache'));
  const cache = interop.slice(interop.indexOf('private static void Cache'));
  assert.match(shell, /finally[\s\S]*Native.DeleteObject\(bitmap\)/);
  assert.match(shell, /Native.Release\(factory\)/);
  assert.match(shell, /Marshal.Release\(item\)/);
  assert.match(cache, /result.cacheFlags = cacheFlags/);
  assert.match(cache, /result.requestFlags = flags/);
  for (const phase of ['SHCreateItemFromParsingName.shellItem', 'CoCreateInstance.thumbnailCache',
    'IThumbnailCache.GetThumbnail', 'ISharedBitmap.GetSharedBitmap']) assert.ok(cache.includes(`"${phase}"`));
  assert.match(cache, /Native.Release\(shared\)/);
  assert.match(cache, /Native.Release\(cache\)/);
  assert.match(cache, /Marshal.Release\(instance\)/);
  assert.doesNotMatch(cache, /Native.DeleteObject\(|\.Detach\(/);
  assert.match(interop, /AssocQueryStringW\(0, 16, extension, Native.Category/);
  assert.match(interop, /Guid clsid = Native.Handler/);
});

test('정규 automation suite가 진단 계약 검사를 포함한다', async () => {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts['test:automation'].includes('tests/windows-thumbnail-diagnostics.test.mjs'));
});
