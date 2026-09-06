import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { verifyProductHandoff } from '../scripts/ci/artifact-handoff.mjs';

const productSha = 'a'.repeat(40);
const input = { repository: 'a/b', productSha, harnessSha: 'b'.repeat(40), runId: '12', artifactId: '42', artifactDigest: `sha256:${'c'.repeat(64)}` };
function fixtures() {
  return {
    run: { id: 12, repository: { id: 1, full_name: 'a/b' }, head_repository: { id: 1, full_name: 'a/b' }, head_sha: productSha, event: 'workflow_dispatch', status: 'completed', conclusion: 'success', path: '.github/workflows/alhangeul-desktop.yml' },
    artifact: { id: 42, name: 'alhangeul-desktop-windows-x64', size_in_bytes: 10, expired: false, digest: input.artifactDigest, workflow_run: { id: 12, repository_id: 1, head_repository_id: 1, head_sha: productSha } },
  };
}
function service(fixture = fixtures()) {
  return { fetchJson: async (path) => {
    if (path.includes('/contents/')) return { encoding: 'base64', content: Buffer.from('{"version":"0.1.0"}').toString('base64') };
    if (path.includes('/artifacts?')) return { total_count: 1, artifacts: [fixture.artifact] };
    return fixture.run;
  } };
}
test('handoff separates product/harness SHA and pins approved archive', async () => {
  const result = await verifyProductHandoff(input, service());
  assert.equal(result.productSha, productSha);
  assert.equal(result.harnessSha, 'b'.repeat(40));
  assert.equal(result.productVersion, '0.1.0');
  assert.equal(result.mode, 'reused');
});
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
  const markers = ['scripts/ci/artifact-handoff.mjs', 'digest-mismatch: error', '--source-sha', 'windows-installer-smoke.ps1'];
  const offsets = markers.map((marker) => source.indexOf(marker));
  assert.ok(offsets.every((offset) => offset >= 0));
  assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b));
  assert.doesNotMatch(source, /cargo |tauri build|contents: write|secrets\./);
});
