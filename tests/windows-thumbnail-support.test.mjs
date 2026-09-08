import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createManifest, validateManifest, validateInventory, payloadNames, executableNames, digest } from '../scripts/build-windows-thumbnail-support.mjs';

const fixture = () => createManifest('a'.repeat(40), '0.1.0', payloadNames.map((path) => ({ path, bytes: 3, sha256: digest(Buffer.from('abc')) })));
test('support package has ten runtime files and two reference documents, no binaries', () => {
  assert.equal(executableNames.length, 10); assert.equal(payloadNames.length, 12);
  assert.ok(payloadNames.includes('alhangeul-artifact-inventory.json'));
  assert.ok(payloadNames.includes('WINDOWS_THUMBNAILS.md'));
  assert.ok(!payloadNames.some((p) => /\.exe$|\.dll$|\.hwp$|\.hwpx$|tests|fixtures/.test(p)));
  validateManifest(fixture());
});
for (const [name, mutate] of [
  ['wrong platform', (m) => { m.platform = 'linux-x64'; }],
  ['missing SHA', (m) => { m.sourceSha = ''; }],
  ['branch instead of SHA', (m) => { m.sourceSha = 'publish/task57'; }],
  ['version suffix', (m) => { m.productVersion = '0.1.0-beta'; }],
  ['missing file', (m) => m.files.pop()],
  ['duplicate file', (m) => { m.files[0] = m.files[1]; }],
  ['traversal', (m) => { m.files[0].path = '../escape.ps1'; }],
  ['absolute path', (m) => { m.files[0].path = 'C:\\escape.ps1'; }],
  ['unexpected file', (m) => { m.files[0].path = 'document.hwp'; }],
  ['invalid size', (m) => { m.files[0].bytes = 0; }],
  ['oversize payload', (m) => { m.files[0].bytes = 2097153; }],
  ['fractional size', (m) => { m.files[0].bytes = 1.1; }],
  ['invalid hash', (m) => { m.files[0].sha256 = 'abc'; }],
]) test(`support manifest rejects ${name}`, () => {
  const m = fixture(); mutate(m); assert.throws(() => validateManifest(m));
});

const inventory = () => ({ schemaVersion: 1, platform: 'windows-x64', files:
  ['msi', 'nsis', 'thumbnail-handler', 'thumbnail-worker'].map((kind) => ({ kind, path: `${kind}/file.bin`, size: 3, sha256: digest(Buffer.from('abc')) })) });
test('reference inventory requires four unique Windows kinds and bounded paths', () => {
  validateInventory(inventory());
  for (const path of ['../file', '/file', 'C:\\file', 'a//file', 'a/./file']) {
    const i = inventory(); i.files[0].path = path; assert.throws(() => validateInventory(i));
  }
  const duplicate = inventory(); duplicate.files[0] = duplicate.files[1]; assert.throws(() => validateInventory(duplicate));
});

test('builder does not overwrite destinations or run packaging on unsupported hosts', async () => {
  const src = await readFile(new URL('../scripts/build-windows-thumbnail-support.mjs', import.meta.url), 'utf8');
  assert.match(src, /process.platform === 'win32'/);
  assert.match(src, /await mkdir\(output\)/);
  assert.match(src, /flag: 'wx'/);
  assert.match(src, /await verifyDirectory\(output\)/);
  assert.doesNotMatch(src, /recursive: true|fetch\(|https\.request|Remove-Item|rmSync/);
});

test('Windows workflow packages support separately after inventory validation', async () => {
  const src = await readFile(new URL('../.github/workflows/alhangeul-artifact-platform.yml', import.meta.url), 'utf8') + await readFile(new URL('../.github/workflows/alhangeul-windows-smoke.yml', import.meta.url), 'utf8');
  assert.ok(src.indexOf('name: Verify bundle artifact') < src.indexOf('name: Build Windows thumbnail support package'));
  assert.match(src, /--output thumbnail-support-output/);
  assert.match(src, /name: alhangeul-windows-x64-thumbnail-support/);
  assert.match(src, /path: artifacts\/thumbnail-support/);
  assert.match(src, /manualTests = \$env:MANUAL_OUTCOME/);
  assert.match(src, /manualEvidence = \$env:MANUAL_EVIDENCE_OUTCOME/);
});
