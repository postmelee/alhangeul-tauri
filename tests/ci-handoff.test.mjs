import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { verifyProductHandoff } from '../scripts/ci/artifact-handoff.mjs';
import { verifyWorkflowArtifact } from '../scripts/verify-workflow-artifact.mjs';
import { deliveryFixture } from './fixtures/ci-delivery.mjs';

const productSha = 'a'.repeat(40);
const input = { repository: 'postmelee/alhangeul-tauri', productSha, harnessSha: 'b'.repeat(40), runId: '100', artifactId: '200', artifactDigest: `sha256:${'b'.repeat(64)}` };
function fixtures() {
  const f = deliveryFixture();
  f.run.status = 'completed'; f.run.conclusion = 'success';
  f.run.path = '.github/workflows/alhangeul-desktop.yml';
  return f;
}
function service(fixture = fixtures()) {
  return { fetchJson: fixture.fetchJson };
}
test('handoff separates product/harness SHA and pins approved archive', async () => {
  const result = await verifyProductHandoff(input, service());
  assert.equal(result.productSha, productSha);
  assert.equal(result.harnessSha, 'b'.repeat(40));
  assert.equal(result.productVersion, '0.1.0');
  assert.equal(result.mode, 'reused');
  assert.equal(result.validationHandoff.downloadStatus, 'unverified');
  assert.equal(result.validationHandoff.purpose, 'additional-validation-only');
  assert.equal(result.validationHandoff.productAcceptance, 'unverified');
  assert.equal(result.validationHandoff.releaseAcceptance, 'unverified');
  assert.equal(result.acceptanceHandoff, undefined);
});
test('selected CI package producer is reusable with the same strict provenance', async () => {
  const f = fixtures();
  f.run.path = '.github/workflows/ci.yml';
  assert.equal((await verifyProductHandoff(input, service(f))).workflowPath, f.run.path);
  f.run.conclusion = 'failure';
  await assert.rejects(verifyProductHandoff(input, service(f)));
});
test('other producer workflows cannot supply approved product bytes', async () => {
  const f = fixtures();
  f.run.path = '.github/workflows/arbitrary.yml';
  await assert.rejects(verifyProductHandoff(input, service(f)), /Unsupported product producer/);
});
for (const workflowPath of ['.github/workflows/alhangeul-desktop.yml', '.github/workflows/ci.yml']) {
  test(`PDF shared verifier accepts exact ${workflowPath} metadata, not failed or mismatched producers`, async () => {
    const f = fixtures();
    f.run.path = `${workflowPath}@refs/heads/publish/task57`;
    const request = { repository: input.repository, buildRef: productSha, runId: input.runId,
      workflowPath, artifactName: 'alhangeul-desktop-windows-x64' };
    const result = await verifyWorkflowArtifact(request, service(f));
    assert.equal(result.workflowPath, workflowPath);
    assert.equal(result.validationHandoff.purpose, 'additional-validation-only');
    assert.equal(result.validationHandoff.releaseAcceptance, 'unverified');
    f.run.conclusion = 'failure';
    await assert.rejects(verifyWorkflowArtifact(request, service(f)), /workflow conclusion/);
    f.run.conclusion = 'success';
    f.run.head_sha = 'c'.repeat(40);
    await assert.rejects(verifyWorkflowArtifact(request, service(f)), /workflow head SHA/);
  });
}
for (const [name, change] of [
  ['ID', { artifactId: '43' }], ['digest', { artifactDigest: `sha256:${'d'.repeat(64)}` }],
  ['harness SHA', { harnessSha: 'main' }], ['product SHA', { productSha: 'main' }],
  ['numeric ID', { artifactId: '1e3' }],
]) test(`handoff rejects wrong ${name}`, async () => {
  await assert.rejects(verifyProductHandoff({ ...input, ...change }, service()));
});
for (const [name, mutate] of [
  ['expired', (f) => { f.artifact.expired = true; }],
  ['failed run', (f) => { f.run.conclusion = 'failure'; }],
  ['wrong product', (f) => { f.run.head_sha = 'b'.repeat(40); }],
]) test(`handoff preserves existing fail-closed ${name} gate`, async () => {
  const f = fixtures(); mutate(f);
  await assert.rejects(verifyProductHandoff(input, service(f)));
});
test('installer workflow verifies digest and inventory before executing either installer', () => {
  const source = readFileSync(new URL('../.github/workflows/alhangeul-installer-reuse.yml', import.meta.url), 'utf8');
  const markers = ['scripts/ci/artifact-handoff.mjs', 'digest-mismatch: error', '--source-sha', 'installer-smoke.ps1'];
  const offsets = markers.map((marker) => source.indexOf(marker));
  assert.ok(offsets.every((offset) => offset >= 0));
  assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b));
  assert.doesNotMatch(source, /cargo |tauri build|contents: write|secrets\./);
});
