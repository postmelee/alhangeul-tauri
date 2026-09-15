import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildInstallerInput, prepareInstallerInput } from '../scripts/ci/installer-input.mjs';
import { fixedScenario } from '../scripts/ci/acceptance-evidence.mjs';
import { evidenceHash } from '../scripts/ci/acceptance-json.mjs';
import { ordinaryFixture } from './fixtures/ci-installer-input.mjs';

const selected = fixedScenario('msi', 'lifecycle');
test('input binds independently read inventory, manifest, raw process and hashes without granting provenance', () => {
  const { records, metadata } = ordinaryFixture();
  const before = structuredClone(records);
  const { bytes, binding } = buildInstallerInput(records, metadata, selected);
  const input = JSON.parse(bytes);
  assert.deepEqual(input.inventory, records.inventory.value);
  assert.deepEqual(input.fixtureManifest, records.fixtureManifest.value);
  assert.equal(input.context.contract, 'strict-product');
  assert.equal(input.smokeExitCode, 0);
  assert.equal(binding.hashes.input, evidenceHash(bytes));
  assert.equal(binding.hashes.summary, records.summary.sha256);
  assert.equal(binding.provenanceStatus, 'requires-io-verification');
  assert.deepEqual(records, before);
});
for (const [name, mutate] of [
  ['summary inventory', r => { r.summary.value.Artifacts.Inventory.sourceSha = 'c'.repeat(40); }],
  ['summary manifest', r => { r.summary.value.ThumbnailFixtureManifest.fixtures = []; }],
  ['independent source', r => { r.inventory.value.sourceSha = 'c'.repeat(40); }],
  ['attempt', r => { r.workflow.value.runAttempt = '1'; }],
  ['scenario', r => { r.workflow.value.scenario = 'forced-reinstall'; }],
  ['missing step', r => { delete r.steps.value.download; }],
  ['unknown step', r => { r.steps.value.download = 'passed'; }],
  ['missing exit', r => { delete r.process.value.exitCode; }],
  ['string exit', r => { r.process.value.exitCode = '0'; }],
  ['unknown exit', r => { r.process.value.exitCode = 23; }],
  ['unstarted child', r => { r.process.value.status = 'not-started'; }],
]) test(`input refuses ${name}`, () => {
  const { records, metadata } = ordinaryFixture(); mutate(records);
  assert.throws(() => buildInstallerInput(records, metadata, selected));
});

async function withInputFiles(run) {
  const root = await mkdtemp(join(tmpdir(), 'alhangeul-input-'));
  try {
    const fixture = ordinaryFixture();
    const output = join(root, 'evidence'); const artifactRoot = join(root, 'product');
    await mkdir(output); await mkdir(artifactRoot);
    const names = { summary: 'windows-installer-smoke-summary.json', steps: 'step-outcomes.json',
      process: 'smoke-process.json', workflow: 'workflow-context.json' };
    for (const [key, name] of Object.entries(names)) {
      await writeFile(join(output, name), '\ufeff' + JSON.stringify(fixture.records[key].value));
    }
    await writeFile(join(output, 'checked-out-sha.txt'), '\ufeff' + fixture.request.harnessSha + '\r\n');
    const fixtureManifestPath = join(root, 'manifest.json');
    await writeFile(fixtureManifestPath, JSON.stringify(fixture.records.fixtureManifest.value));
    await writeFile(join(artifactRoot, 'alhangeul-artifact-inventory.json'), JSON.stringify(fixture.records.inventory.value));
    const options = { output, artifactRoot, fixtureManifestPath, request: fixture.request, installerKind: 'msi', scenario: 'lifecycle' };
    await run({ fixture, options, services: { fetchJson: fixture.fetchJson,
      verifyInventory: async () => fixture.records.inventory.value } });
  } finally { await rm(root, { recursive: true, force: true }); }
}
test('actual collector reads BOM files, independently verifies inventory, and preserves raw input bytes', () => withInputFiles(async ({ fixture, options, services }) => {
  const summaryPath = join(options.output, 'windows-installer-smoke-summary.json');
  const original = await readFile(summaryPath);
  let verified = false;
  services.verifyInventory = async params => {
    assert.equal(params.sourceSha, fixture.request.productSha);
    assert.equal(params.verifyInventoryPath, join(options.artifactRoot, 'alhangeul-artifact-inventory.json'));
    verified = true; return fixture.records.inventory.value;
  };
  const result = await prepareInstallerInput(options, services);
  assert.equal(verified, true);
  assert.equal(result.hashes.summary, evidenceHash(original));
  assert.equal(result.hashes.input, evidenceHash(await readFile(join(options.output, 'installer-input.json'))));
  assert.deepEqual(await readFile(summaryPath), original);
  assert.deepEqual(JSON.parse(await readFile(join(options.output, 'installer-input-diagnostic.json'))),
    { schemaVersion: 1, phase: 'write', status: 'passed' });
}));
for (const kind of ['duplicate-json', 'checkout', 'inventory-verifier', 'api']) {
  test(`collector invalidates stale success and rejects ${kind}`, () => withInputFiles(async ({ options, services }) => {
    await prepareInstallerInput(options, services);
    if (kind === 'duplicate-json') await writeFile(join(options.output, 'step-outcomes.json'), '{"smoke":1,"SMOKE":2}');
    if (kind === 'checkout') await writeFile(join(options.output, 'checked-out-sha.txt'), 'bad');
    if (kind === 'inventory-verifier') services.verifyInventory = async () => { throw new Error('bad-bytes'); };
    if (kind === 'api') services.fetchJson = async () => { throw new Error('unavailable'); };
    await assert.rejects(prepareInstallerInput(options, services));
    assert.deepEqual(JSON.parse(await readFile(join(options.output, 'installer-input.json'))), {});
    assert.equal(JSON.parse(await readFile(join(options.output, 'installer-input-binding.json'))).status, 'unverified');
    const diagnostic = JSON.parse(await readFile(join(options.output, 'installer-input-diagnostic.json')));
    assert.deepEqual(diagnostic, { schemaVersion: 1, status: 'failed',
      phase: { 'duplicate-json': 'raw-evidence', checkout: 'checkout', 'inventory-verifier': 'inventory', api: 'metadata' }[kind] });
  }));
}
test('collector default inventory verifier refuses synthetic files without product bytes', () => withInputFiles(async ({ options, services }) => {
  delete services.verifyInventory;
  await assert.rejects(prepareInstallerInput(options, services));
}));
test('fresh workflow evaluates after raw collection but preserves the strict gate until aggregate wiring', async () => {
  const workflow = await readFile(new URL('../.github/workflows/alhangeul-windows-smoke.yml', import.meta.url), 'utf8');
  assert.ok(workflow.indexOf('Record installer smoke outcome') < workflow.indexOf('node scripts/ci/installer-input.mjs'));
  assert.ok(workflow.indexOf('node scripts/ci/installer-input.mjs') < workflow.indexOf('id: installer-evaluation'));
  assert.ok(workflow.indexOf('id: installer-evaluation') < workflow.indexOf('id: upload-installer-smoke-diagnostics'));
  const gate = workflow.slice(workflow.indexOf('- name: Require Windows installer smoke success'));
  assert.match(gate, /smoke = \$env:SMOKE_OUTCOME/);
  assert.match(gate, /preparedInput = \$env:INPUT_OUTCOME/);
  assert.match(gate, /evaluation = \$env:EVALUATION_OUTCOME/);
  assert.match(gate, /Where-Object \{ \$_.Value -ne 'success' \}/);
  assert.equal((workflow.match(/continue-on-error:/g) ?? []).length, 1);
});
