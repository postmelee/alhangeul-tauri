import assert from 'node:assert/strict';
import test from 'node:test';
import { DELIVERY, DELIVERY_STEPS, resolveInstallerDelivery, listEvidencePages } from '../scripts/ci/acceptance-delivery.mjs';
import { deliveryFixture, aggregateOutputs } from './fixtures/ci-delivery.mjs';
import { evaluateArtifactResults, artifactPlan } from '../scripts/ci/profiles.mjs';

test('delivery resolves all three unique same-attempt artifacts and successful jobs', async () => {
  const f = deliveryFixture(); const plan = await resolveInstallerDelivery(f.request, f);
  assert.deepEqual(plan.scenarios.map(row => row.name), DELIVERY.map(row => row.name));
  assert.deepEqual(plan.scenarios.map(row => row.artifact.id), ['300', '301', '302']);
  assert.equal(plan.supportArtifact.id, '350');
  assert.equal(plan.metadata.provenanceStatus, 'requires-io-verification');
});
for (const [label, mutate] of [
  ['missing artifact', f => { f.artifacts.splice(1, 1); }],
  ['duplicate artifact', f => { f.artifacts.push(structuredClone(f.artifacts[1])); }],
  ['expired', f => { f.artifacts[1].expired = true; }],
  ['other attempt', f => { f.jobs[0].run_attempt--; }],
  ['old artifact', f => { f.artifacts[1].created_at = '2026-09-01T00:00:00Z'; }],
  ['wrong source', f => { f.jobs[0].head_sha = 'e'.repeat(40); }],
  ['failed job', f => { f.jobs[0].conclusion = 'failure'; }],
  ['skipped job', f => { f.jobs[0].conclusion = 'skipped'; }],
  ['duplicate job', f => { f.jobs.push(structuredClone(f.jobs[0])); }],
]) test(`delivery refuses ${label}`, async () => {
  const f = deliveryFixture(); mutate(f);
  await assert.rejects(resolveInstallerDelivery(f.request, f));
});
for (const step of DELIVERY_STEPS) test(`delivery requires actual ${step} completion`, async () => {
  const f = deliveryFixture(); f.jobs[0].steps.find(row => row.name === step).conclusion = 'failure';
  await assert.rejects(resolveInstallerDelivery(f.request, f), /scenario-step-not-passed/);
});
test('pagination fails on duplicate, missing or unstable pages', async () => {
  for (const response of [{ total_count: 2, jobs: [] }, { total_count: 0, jobs: [{}] }, { total_count: '1', jobs: [{}] }]) {
    await assert.rejects(listEvidencePages(async () => response, '/jobs', 'jobs'));
  }
  let page = 0;
  await assert.rejects(listEvidencePages(async () => ({ total_count: ++page === 1 ? 2 : 3, jobs: [{}] }), '/jobs', 'jobs'), /unstable/);
});
test('full result requires delivered aggregate and distinguishes limited observation from product support', () => {
  const plan = artifactPlan({});
  const jobs = Object.fromEntries(['plan', 'fast', 'core', 'windows', 'linux', 'smoke'].map(key => [key, { result: 'success' }]));
  assert.equal(evaluateArtifactResults(plan, jobs).status, 'failed');
  jobs.smoke.outputs = aggregateOutputs('limited-observation');
  const result = evaluateArtifactResults(plan, jobs);
  assert.equal(result.status, 'passed'); assert.equal(result.scope, 'full-validation');
  assert.equal(result.productObservation, 'limited-observation'); assert.equal(result.releaseAcceptance, 'unverified');
  for (const key of Object.keys(jobs.smoke.outputs)) {
    const broken = structuredClone(jobs); delete broken.smoke.outputs[key];
    assert.equal(evaluateArtifactResults(plan, broken).status, 'failed');
  }
  jobs.smoke.outputs.reuse_eligible = 'true';
  assert.equal(evaluateArtifactResults(plan, jobs).status, 'failed');
});
