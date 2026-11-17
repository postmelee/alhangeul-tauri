import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateStandardUser } from '../scripts/windows-thumbnail-user-acceptance.mjs';
import { PUBLIC_INPUT, prepareFreshInput } from '../scripts/windows-thumbnail-user-input.mjs';
const sha = 'a'.repeat(40);
function fixture() {
  const input = { ...structuredClone(PUBLIC_INPUT), mode: 'fresh-standard-acceptance', scenario: 'fresh', productSha: sha,
    metadata: { metadataStatus: 'verified', identity: { productSha: sha } } };
  const driver = { status: 'observed', context: 'standard', childExit: 0, harnessSha: sha, productSha: sha,
    installerSha256: input.installerSha256, accountRemoved: true, profileRemoved: true, scratchRemoved: true };
  const report = { status: 'observed', context: 'standard', scenario: 'fresh', inputMode: input.mode, installerSha256: input.installerSha256,
    installExit: 0, reinstallExit: 0, uninstallExit: 0, cleanup: true, productUninstallPassed: true,
    uninstallState: { directoryExists: false, handlerRegistered: false, remaining: [] },
    token: { status: 'ok', elevated: false, integrityRid: 8192 }, binaries: structuredClone(input.binaries), probes: [] };
  const add = (phase, name, mode, fields = {}) => report.probes.push({ name: `${phase}-${name}`, exitCode: 0,
    result: { schemaVersion: 1, mode, status: 'ok', hresult: '0x00000000', ...fields } });
  for (const phase of ['installed', 'reinstalled']) {
    add(phase, 'environment', 'state', { status: 'collected', environment: { token: report.token, is64BitProcess: true, apartment: 'STA' } });
    for (const mode of ['shell', 'force-extract']) for (const id of ['small-hwp', 'large-hwp', 'form-hwpx', 'control-jpg']) {
      add(phase, `${id}-${mode}`, mode, { bitmapPresent: true, width: 181, height: 256, requestFlags: mode === 'shell' ? 8 : 4 });
    }
    for (const ext of ['hwp', 'hwpx']) add(phase, `association-${ext}`, 'association', { resolvedHandler: '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}' });
    add(phase, 'activation', 'activate');
  }
  return { input, driver, report };
}
const evaluate = f => evaluateStandardUser(f.input, f.driver, f.report, sha);
test('accepts only two full fresh standard-user probe sets and product-owned uninstall', () => {
  assert.equal(evaluate(fixture()).documentBitmaps, 12);
  assert.equal(evaluate(fixture()).explorerVisual, 'unverified');
  assert.equal(evaluate(fixture()).releaseAcceptance, 'unverified');
});
for (const [name, mutate] of [
  ['public observation', f => { f.input = PUBLIC_INPUT; }],
  ['wrong source', f => { f.input.productSha = 'b'.repeat(40); }],
  ['wrong binary', f => { f.report.binaries[0].sha256 = '0'.repeat(64); }],
  ['admin token', f => { f.report.token.elevated = true; }],
  ['profile residual', f => { f.driver.profileRemoved = false; }],
  ['uninstall residual', f => { f.report.productUninstallPassed = false; }],
  ['test-owned cleanup', f => { f.report.ownedResidualRemoval = { removed: true }; }],
  ['reinstall failure', f => { f.report.reinstallExit = 1603; }],
  ['missing probe', f => { f.report.probes.pop(); }],
  ['duplicate probe', f => { f.report.probes[1] = f.report.probes[2]; }],
  ['HRESULT failure', f => { f.report.probes[1].result.hresult = '0x80040154'; }],
  ['missing bitmap', f => { f.report.probes[1].result.bitmapPresent = false; }],
  ['invalid bitmap size', f => { f.report.probes[1].result.width = 0; }],
  ['cache-only substitute', f => { f.report.probes[5].result.requestFlags = 16; }],
]) test(`rejects ${name}`, () => { const f = fixture(); mutate(f); assert.throws(() => evaluate(f)); });

test('fresh input verifies metadata and inventory before copying installer; rejects traversal and mismatch', async () => {
  const files = [ ['nsis', 'nsis/Alhangeul_0.1.3_x64-setup.exe'], ['thumbnail-handler', 'verification/AlhangeulThumbnailHandler.dll'],
    ['thumbnail-worker', 'verification/AlhangeulThumbnailWorker.exe'] ].map(([kind, path]) => ({ kind, path, sha256: 'b'.repeat(64), size: 42 }));
  const inventory = { sourceSha: sha, files }; const calls = [];
  const services = { resolveMetadata: async () => { calls.push('metadata'); return {}; },
    verifyInventory: async options => { calls.push('inventory'); assert.equal(options.sourceSha, sha); return inventory; },
    copyInstaller: async () => { calls.push('copy'); } };
  assert.equal((await prepareFreshInput('/owned', '/bundle', { productSha: sha }, services)).mode, 'fresh-standard-acceptance');
  assert.deepEqual(calls, ['metadata', 'inventory', 'copy']);
  for (const bad of ['../foreign.exe', '/foreign.exe', 'C:/foreign.exe']) {
    files[0].path = bad; await assert.rejects(prepareFreshInput('/owned', '/bundle', { productSha: sha }, services));
  }
  inventory.sourceSha = 'c'.repeat(40); await assert.rejects(prepareFreshInput('/owned', '/bundle', { productSha: sha }, services));
  await assert.rejects(prepareFreshInput('/owned', '/bundle', { productSha: sha }, { ...services,
    resolveMetadata: async () => { throw new Error('expired'); } }));
});

test('same-version upgrade requires pinned public baseline and retained user data', () => {
  const f = fixture(); f.input.scenario = f.report.scenario = 'public-upgrade';
  f.input.baseline = structuredClone(PUBLIC_INPUT);
  f.report.probes.push(...structuredClone(f.report.probes.slice(0, 12)).map(row => ({ ...row, name: row.name.replace(/^installed-/, 'baseline-') })));
  f.report.baselineInstallExit = 0; f.report.baselineVerified = true; f.report.userDataPreserved = true;
  assert.equal(evaluate(f).scenario, 'public-upgrade');
  for (const key of ['baselineVerified', 'userDataPreserved']) {
    const bad = structuredClone(f); bad.report[key] = false; assert.throws(() => evaluate(bad));
  }
  f.input.baseline.installerSha256 = 'f'.repeat(64); assert.throws(() => evaluate(f));
});
