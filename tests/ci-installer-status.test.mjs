import { STANDARD_USER_JOB, SAME_VERSION_UPGRADE_STEPS } from '../scripts/windows-thumbnail-user-acceptance.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { verifyInstallerStatus, installerStatusSummary } from '../scripts/ci/installer-status.mjs';
import { deliveryFixture as baseFixture, statusOutputs, aggregateOutputs } from './fixtures/ci-delivery.mjs';
import { artifactPlan, evaluateArtifactResults } from '../scripts/ci/profiles.mjs';
import { evaluateReuseGate, requiredSteps } from '../scripts/ci/installer-evidence.mjs';

function deliveryFixture() {
  const f = baseFixture();
  f.jobs.splice(-1, 0, { ...structuredClone(f.jobs[0]), id: 599, name: STANDARD_USER_JOB.jobName,
    steps: STANDARD_USER_JOB.requiredSteps.map(name => ({ name, status: 'completed', conclusion: 'success' })) });
  return f;
}

test('status gate needs no acceptance archive, raw files or replay and grants no product acceptance', async () => {
  const f = deliveryFixture();
  f.artifacts = [f.artifact]; f.jobs.pop();
  const result = await verifyInstallerStatus(f.request, f);
  assert.equal(result.contractStatus, 'passed');
  assert.equal(result.scenarios.length, 4);
  assert.equal(result.productObservation, 'see-scenario-evidence');
  assert.equal(result.productAcceptance, 'unverified');
  assert.equal(result.releaseAcceptance, 'unverified');
  assert.equal(result.reuseEligible, undefined);
  assert.match(installerStatusSummary(result), /HRESULT.*bitmap/);
  assert.match(installerStatusSummary(result), /NSIS.*MSI/);
});

for (const [name, change] of [
  ['missing job', f => { f.jobs.shift(); }],
  ['duplicate job', f => { f.jobs.push(structuredClone(f.jobs[0])); }],
  ['job failure', f => { f.jobs[0].conclusion = 'failure'; }],
  ['job cancelled', f => { f.jobs[0].conclusion = 'cancelled'; }],
  ['job skipped', f => { f.jobs[0].conclusion = 'skipped'; }],
  ['stale job', f => { f.jobs[0].run_attempt--; }],
  ['job source mismatch', f => { f.jobs[0].head_sha = 'c'.repeat(40); }],
  ['artifact expired', f => { f.artifact.expired = true; }],
  ['missing id', f => { delete f.jobs[0].id; }],
  ['duplicate id', f => { f.jobs[1].id = f.jobs[0].id; }],
]) test(`status gate rejects ${name}`, async () => {
  const f = deliveryFixture(); change(f);
  await assert.rejects(verifyInstallerStatus(f.request, f));
});

for (const state of ['failure', 'skipped', 'cancelled', undefined]) {
  test(`status gate rejects every required step with ${state}`, async () => {
    const sample = deliveryFixture();
    for (let index = 0; index < sample.jobs[0].steps.length; index++) {
      const f = deliveryFixture(); f.jobs[0].steps[index].conclusion = state;
      await assert.rejects(verifyInstallerStatus(f.request, f));
    }
  });
}

test('final artifact gate accepts status-only output, refuses old or misleading acceptance claims', () => {
  const jobs = Object.fromEntries(['plan', 'fast', 'core', 'windows', 'linux', 'smoke'].map(name => [name, { result: 'success' }]));
  jobs.smoke.outputs = statusOutputs();
  assert.equal(evaluateArtifactResults(artifactPlan({}), jobs).status, 'passed');
  for (const outputs of [undefined, {}, aggregateOutputs(), { ...statusOutputs(), reuse_eligible: 'true' },
    { ...statusOutputs(), contract_status: 'failed' }, { ...statusOutputs(), product_observation: 'passed' }]) {
    jobs.smoke.outputs = outputs;
    assert.equal(evaluateArtifactResults(artifactPlan({}), jobs).status, 'failed');
  }
});

const gateSteps = () => Object.fromEntries([...requiredSteps, 'raw-record', 'reuse-input', 'evaluation', 'contract-record', 'upload']
  .map(name => [name, { outcome: 'success', conclusion: 'success' }]));
test('reuse gate distinguishes raw failure from a passed contract and never grants release acceptance', () => {
  const steps = gateSteps(); steps.smoke.outcome = 'failure';
  const result = evaluateReuseGate(steps, 'passed');
  assert.equal(result.contractStatus, 'passed');
  assert.equal(result.rawSmokeOutcome, 'failure');
  assert.equal(result.releaseAcceptance, 'unverified');
  assert.equal(evaluateReuseGate(steps, 'failed').contractStatus, 'failed');
});
test('reuse gate rejects missing/failed/skipped/cancelled evidence, upload and evaluation', () => {
  for (const name of Object.keys(gateSteps())) for (const state of ['failure', 'skipped', 'cancelled', undefined]) {
    if (name === 'smoke' && state === 'failure') continue;
    const steps = gateSteps(); steps[name].outcome = state;
    assert.equal(evaluateReuseGate(steps, 'passed').contractStatus, 'failed', `${name}: ${state}`);
  }
});
test('workflow replaces independent replay with status-only gate, retaining original per-job evaluation', () => {
  const source = readFileSync(new URL('../.github/workflows/alhangeul-windows-smoke.yml', import.meta.url), 'utf8');
  assert.match(source, /jobs.installer-status.outputs.contract/);
  assert.match(source, /scripts\/ci\/installer-status.mjs/);
  assert.match(source, /needs: \[windows-installer-smoke, windows-standard-user\]/);
  assert.match(source, /STANDARD_USER_RESULT: \$\{\{ needs.windows-standard-user.result \}\}/);
  assert.match(source, /MATRIX_RESULT: \$\{\{ needs.windows-installer-smoke.result \}\}/);
  assert.match(source, /Require Windows installer contract success/);
  assert.doesNotMatch(source, /installer-aggregate.mjs|alhangeul-ci-acceptance|installer-replay.mjs|reuse_eligible/);
});

test('standard-user job and every required step are mandatory in status aggregation', async () => {
  for (const state of ['failure', 'skipped', 'cancelled', undefined]) {
    const f = deliveryFixture();
    f.jobs.find(row => row.name === STANDARD_USER_JOB.jobName).conclusion = state;
    await assert.rejects(verifyInstallerStatus(f.request, f));
    for (const step of STANDARD_USER_JOB.requiredSteps) {
      const g = deliveryFixture();
      g.jobs.find(row => row.name === STANDARD_USER_JOB.jobName).steps.find(row => row.name === step).conclusion = state;
      await assert.rejects(verifyInstallerStatus(g.request, g));
    }
  }
  const f = deliveryFixture(); f.jobs = f.jobs.filter(row => row.name !== STANDARD_USER_JOB.jobName);
  await assert.rejects(verifyInstallerStatus(f.request, f));
});

test('explicit same-version acceptance cannot silently skip its historical-baseline steps', async () => {
  const f = deliveryFixture();
  await assert.rejects(verifyInstallerStatus(f.request, f, true));
  const job = f.jobs.find(row => row.name === STANDARD_USER_JOB.jobName);
  job.steps.push(...SAME_VERSION_UPGRADE_STEPS.map(name => ({ name, status: 'completed', conclusion: 'success' })));
  assert.equal((await verifyInstallerStatus(f.request, f, true)).contractStatus, 'passed');
  for (const name of SAME_VERSION_UPGRADE_STEPS) for (const state of ['failure', 'skipped', 'cancelled']) {
    const step = job.steps.find(row => row.name === name); step.conclusion = state;
    await assert.rejects(verifyInstallerStatus(f.request, f, true)); step.conclusion = 'success';
  }
});
