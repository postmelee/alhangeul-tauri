import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildInstallerInput } from '../scripts/ci/installer-input.mjs';
import { runReplayPowerShell } from '../scripts/ci/installer-replay.mjs';
import { evidenceHash } from '../scripts/ci/acceptance-json.mjs';
import { aggregateDeliveredInstallers } from '../scripts/ci/installer-aggregate.mjs';
import { resolveInstallerDelivery } from '../scripts/ci/acceptance-delivery.mjs';
import { fixedScenario } from '../scripts/ci/acceptance-evidence.mjs';
import { scenarioRow } from './fixtures/ci-acceptance.mjs';
import { deliveryFixture } from './fixtures/ci-delivery.mjs';

async function withReplay(run, limited = true) {
  const temporary = await mkdtemp(join(tmpdir(), 'alhangeul-replay-'));
  try {
    const f = deliveryFixture(); const plan = await resolveInstallerDelivery(f.request, f);
    const evidenceRoot = join(temporary, 'evidence'); await mkdir(evidenceRoot);
    const evaluations = new Map();
    for (const row of plan.scenarios) {
      const selected = fixedScenario(row.name === 'nsis' ? 'nsis' : 'msi', row.name === 'msi-forced-reinstall' ? 'forced-reinstall' : 'lifecycle');
      const records = structuredClone(f.records);
      const observation = !limited ? 'normal' : row.name === 'nsis' ? 'limited' : row.name === 'msi-forced-reinstall' ? 'reboot' : 'normal';
      const verdict = scenarioRow(row.name, observation).envelope.verdict;
      records.workflow.value.installerKind = selected.installerKind; records.workflow.value.scenario = selected.scenario;
      records.steps.value.smoke = verdict.rawSmoke.outcome; records.process.value.exitCode = verdict.rawSmoke.exitCode;
      const root = join(evidenceRoot, row.artifact.name); await mkdir(root);
      for (const [key, file] of Object.entries({ summary: 'windows-installer-smoke-summary.json', steps: 'step-outcomes.json',
        process: 'smoke-process.json', workflow: 'workflow-context.json' })) {
        const bytes = Buffer.from(JSON.stringify(records[key].value));
        records[key].sha256 = evidenceHash(bytes); await writeFile(join(root, file), bytes);
      }
      await writeFile(join(root, 'checked-out-sha.txt'), f.request.harnessSha);
      const built = buildInstallerInput(records, plan.metadata, selected);
      await writeFile(join(root, 'installer-input.json'), built.bytes);
      await writeFile(join(root, 'installer-input-binding.json'), JSON.stringify(built.binding));
      const evaluation = { schemaVersion: 1, policyVersion: 1, status: 'passed', inputSha256: built.binding.hashes.input,
        provenanceStatus: 'requires-io-verification', verdict };
      await writeFile(join(root, 'installer-evaluation.json'), JSON.stringify(evaluation));
      evaluations.set(row.name, evaluation);
    }
    const artifactRoot = join(temporary, 'product'); await mkdir(artifactRoot);
    await writeFile(join(artifactRoot, 'alhangeul-artifact-inventory.json'), JSON.stringify(f.records.inventory.value));
    const fixtureManifestPath = join(temporary, 'fixtures.json'); await writeFile(fixtureManifestPath, JSON.stringify(f.records.fixtureManifest.value));
    const options = { request: f.request, plan, evidenceRoot, artifactRoot, fixtureManifestPath, supportRoot: 'controlled-support',
      replayRoot: join(temporary, 'replay'), downloadStatus: 'success', productDownloadStatus: 'success', supportDownloadStatus: 'success' };
    const calls = [];
    const services = { fetchJson: f.fetchJson, verifyInventory: async () => f.records.inventory.value,
      runPowerShell: async (script, args) => {
        calls.push(script);
        if (!script.endsWith('installer-acceptance.ps1')) return;
        const output = args[args.indexOf('-OutputDirectory') + 1];
        const name = output.split(/[\\/]/).at(-1);
        await writeFile(join(output, 'installer-evaluation.json'), JSON.stringify(evaluations.get(name)));
      } };
    await run({ f, options, services, calls, evaluations });
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
test('real file aggregate rebuilds all input bindings and requests independent diagnostic, manual and pure replays', () => withReplay(async ({ options, services, calls }) => {
  options.diagnostic = { status: 'failed' };
  const result = await aggregateDeliveredInstallers(options, services);
  assert.equal(options.diagnostic.phase, 'aggregate');
  assert.equal(options.diagnostic.scenario, null);
  assert.equal(calls.length, 9);
  for (const script of ['scripts/windows-thumbnail-assessment-tests.ps1', 'scripts/windows-thumbnail-check-tests.ps1', 'scripts/ci/installer-acceptance.ps1']) {
    assert.equal(calls.filter(value => value === script).length, 3);
  }
  assert.equal(result.contractStatus, 'passed'); assert.equal(result.reuseEligible, false);
  assert.equal(result.productAcceptance, 'limited-observation');
  assert.equal(result.scenarios[0].verdict.rawSmoke.exitCode, 1);
  assert.equal(result.scenarios[2].verdict.lifecycleStatus, 'reboot-required');
}));
test('only three normal replayed scenarios grant existing-byte reuse, never release acceptance', () => withReplay(async ({ options, services }) => {
  const result = await aggregateDeliveredInstallers(options, services);
  assert.equal(result.reuseEligible, true);
  assert.equal(result.productAcceptance, 'windows-installer-scenarios-only');
  assert.equal(result.releaseAcceptance, 'unverified');
  assert.equal(result.latestVdiAcceptance, 'unverified');
}, false));
for (const [name, change] of [
  ['download failure', o => { o.downloadStatus = 'failure'; }],
  ['support skipped', o => { o.supportDownloadStatus = 'skipped'; }],
  ['changed plan digest', o => { o.plan.scenarios[0].artifact.digest = `sha256:${'e'.repeat(64)}`; }],
  ['mixed attempt', o => { o.plan.metadata.identity.runAttempt = '1'; }],
]) test(`aggregate rejects ${name}`, () => withReplay(async ({ options, services }) => {
  change(options); await assert.rejects(aggregateDeliveredInstallers(options, services));
}));
for (const name of ['raw-hash', 'duplicate-key', 'missing-raw', 'replay-different', 'replay-failed', 'replay-no-output']) {
  test(`aggregate rejects ${name} without trusting a saved passed verdict`, () => withReplay(async ({ options, services, evaluations }) => {
    const root = join(options.evidenceRoot, options.plan.scenarios[0].artifact.name);
    if (name === 'raw-hash') await writeFile(join(root, 'step-outcomes.json'), (await readFile(join(root, 'step-outcomes.json'), 'utf8')) + ' ');
    if (name === 'duplicate-key') await writeFile(join(root, 'probe.json'), '{"ok":true,"OK":false}');
    if (name === 'missing-raw') await rm(join(root, 'smoke-process.json'));
    if (name === 'replay-different') evaluations.get('nsis').verdict.reasonCodes = ['unknown'];
    if (name === 'replay-failed') services.runPowerShell = async () => { throw new Error('failed'); };
    if (name === 'replay-no-output') services.runPowerShell = async () => {};
    await assert.rejects(aggregateDeliveredInstallers(options, services));
  }));
}
test('PowerShell replay cannot accidentally run on unsupported hosts', { skip: process.platform === 'win32' }, () => {
  assert.throws(() => runReplayPowerShell('scripts/ci/installer-acceptance.ps1', []), /windows-replay-required/);
});
