import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveOrdinaryProduct, assertCurrentAttempt, assertCurrentArtifact } from '../scripts/ci/installer-metadata.mjs';
import { ordinaryFixture } from './fixtures/ci-installer-input.mjs';

test('current ordinary product is bound to API run, exact artifact ID and attempt start, not run success', async () => {
  const fixture = ordinaryFixture();
  assert.deepEqual(await resolveOrdinaryProduct(fixture.request, fixture), fixture.metadata);
  assert.equal(fixture.run.status, 'in_progress');
  assert.equal(fixture.metadata.provenanceStatus, 'requires-io-verification');
});
for (const [name, mutate] of [
  ['run', r => { r.id++; }], ['attempt', r => { r.run_attempt--; }],
  ['repository', r => { r.repository.full_name = 'other/repo'; }],
  ['fork', r => { r.head_repository.id++; }], ['SHA', r => { r.head_sha = 'c'.repeat(40); }],
  ['workflow', r => { r.path = '.github/workflows/arbitrary.yml'; }],
  ['queued', r => { r.status = 'queued'; }], ['missing start', r => { delete r.run_started_at; }],
]) test(`current attempt rejects mismatched ${name}`, () => {
  const { request, run } = ordinaryFixture(); mutate(run);
  assert.throws(() => assertCurrentAttempt(run, request));
});
for (const [name, mutate] of [
  ['ID', a => { a.id++; }], ['name', a => { a.name += '-stale'; }],
  ['expired', a => { a.expired = true; }], ['size', a => { a.size_in_bytes = 0; }],
  ['digest', a => { a.digest = 'sha256:bad'; }], ['foreign run', a => { a.workflow_run.id++; }],
  ['source', a => { a.workflow_run.head_sha = 'e'.repeat(40); }],
  ['previous attempt', a => { a.created_at = '2026-09-14T23:59:59Z'; }],
  ['unknown creation', a => { delete a.created_at; }],
]) test(`current artifact rejects ${name}`, () => {
  const { artifact, run, request } = ordinaryFixture(); mutate(artifact);
  assert.throws(() => assertCurrentArtifact(artifact, run, { id: request.artifactId, name: 'alhangeul-desktop-windows-x64' }));
});
test('fresh resolver refuses reuse and mismatched attempt API before accepting an artifact', async () => {
  const fixture = ordinaryFixture();
  await assert.rejects(resolveOrdinaryProduct({ ...fixture.request, sourceMode: 'reuse' }, fixture));
  await assert.rejects(resolveOrdinaryProduct(fixture.request, { fetchJson: async path => {
    const response = await fixture.fetchJson(path);
    if (path.includes('/attempts/')) response.run_started_at = '2026-09-14T00:00:00Z';
    return response;
  } }), /attempt-start-mismatch/);
});
