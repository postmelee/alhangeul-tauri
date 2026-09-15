import assert from 'node:assert/strict';
import test from 'node:test';
import { reuseStepRecord } from '../scripts/ci/installer-reuse-input.mjs';
import { buildInstallerInput } from '../scripts/ci/installer-input.mjs';
import { fixedScenario } from '../scripts/ci/acceptance-evidence.mjs';
import { ordinaryFixture } from './fixtures/ci-installer-input.mjs';

const names = ['harness', 'handoff', 'acceptance-download', 'producer-guard', 'download', 'inventory', 'support', 'manual-tests',
  'smoke-context', 'regressions', 'diagnostic-contract', 'manual-evidence', 'smoke'];
function record() { return { steps: Object.fromEntries(names.map(name => [name, { outcome: 'success', conclusion: 'success' }])) }; }
test('reuse input preserves failed raw smoke outcome while requiring all other evidence steps', () => {
  const raw = record(); raw.steps.smoke.outcome = 'failure'; raw.steps.smoke.conclusion = 'failure';
  const mapped = reuseStepRecord(raw);
  assert.equal(mapped.value.smoke, 'failure'); assert.equal(mapped.value.manualEvidence, 'success');
  assert.match(mapped.sha256, /^[a-f0-9]{64}$/);
});
for (const name of names.filter(name => name !== 'smoke')) test(`reuse collector rejects ${name} failure`, () => {
  const raw = record(); raw.steps[name].outcome = 'failure';
  assert.throws(() => reuseStepRecord(raw), /reuse-required-step-failed/);
});
test('reuse evaluation binds product SHA separately from current workflow and fixture harness', () => {
  const { records, metadata } = ordinaryFixture();
  metadata.identity.sourceMode = 'reuse'; metadata.identity.productSha = 'd'.repeat(40);
  records.inventory.value.sourceSha = metadata.identity.productSha;
  records.summary.value.Artifacts.Inventory.sourceSha = metadata.identity.productSha;
  const built = buildInstallerInput(records, metadata, fixedScenario('msi', 'lifecycle'));
  const input = JSON.parse(built.bytes);
  assert.equal(input.context.productSha, 'd'.repeat(40));
  assert.equal(input.context.harnessSha, 'a'.repeat(40));
  assert.equal(input.context.sourceMode, 'reuse');
  metadata.identity.sourceMode = 'ordinary';
  assert.throws(() => buildInstallerInput(records, metadata, fixedScenario('msi', 'lifecycle')));
});
