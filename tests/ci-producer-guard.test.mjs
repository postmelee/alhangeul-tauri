import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { verifyWorkflowArtifact } from '../scripts/verify-workflow-artifact.mjs';
import { verifyDownloadedProducer, verifyIndependentHandoff } from '../scripts/ci/producer-guard.mjs';
import { deliveryFixture } from './fixtures/ci-delivery.mjs';
import { producerFixture } from './fixtures/ci-acceptance.mjs';

function fixture() {
  const f = deliveryFixture(); f.run.status = 'completed'; f.run.conclusion = 'success';
  const query = { repository: f.request.repository, buildRef: f.request.productSha, runId: f.request.runId,
    artifactName: 'alhangeul-desktop-windows-x64', workflowPath: '.github/workflows/ci.yml' };
  return { f, query };
}
for (const [label, change] of [
  ['missing acceptance', f => { f.artifacts = f.artifacts.filter(a => a.name !== 'alhangeul-ci-acceptance'); }],
  ['duplicate acceptance', f => { f.artifacts.push(structuredClone(f.artifacts.at(-1))); }],
  ['expired acceptance', f => { f.artifacts.at(-1).expired = true; }],
  ['old acceptance', f => { f.artifacts.at(-1).created_at = '2026-09-01T00:00:00Z'; }],
  ['aggregate not run', f => { f.jobs.pop(); }],
  ['upload failed', f => { f.jobs.at(-1).steps[1].conclusion = 'failure'; }],
  ['aggregate failed', f => { f.jobs.at(-1).conclusion = 'failure'; }],
  ['old aggregate', f => { f.jobs.at(-1).run_attempt--; }],
]) test(`#67 reference metadata refuses ${label}`, async () => {
  const { f, query } = fixture(); change(f);
  await assert.rejects(verifyIndependentHandoff(query, f));
});

async function withProducer(run) {
  const directory = await mkdtemp(join(tmpdir(), 'alhangeul-producer-guard-'));
  try {
    const { f, query } = fixture();
    const handoff = await verifyIndependentHandoff(query, f);
    const handoffPath = join(directory, 'handoff.json');
    await writeFile(handoffPath, JSON.stringify(handoff));
    const document = producerFixture().document;
    await writeFile(join(directory, 'installer-acceptance.json'), JSON.stringify(document));
    const options = { handoffPath, acceptanceRoot: directory, repository: query.repository,
      productSha: query.buildRef, runId: query.runId, downloadStatus: 'success' };
    await run({ f, handoff, document, options, directory });
  } finally { await rm(directory, { recursive: true, force: true }); }
}
test('producer guard grants existing-byte reuse only after independent metadata and downloaded content agree', () => withProducer(async ({ f, options, handoff }) => {
  assert.equal(handoff.acceptanceHandoff.downloadStatus, 'unverified');
  const verified = await verifyDownloadedProducer(options, f);
  assert.equal(verified.status, 'verified'); assert.equal(verified.newProductAcceptance, 'unverified');
  assert.equal(verified.releaseAcceptance, 'unverified');
}));
for (const name of ['download', 'identity', 'metadata', 'limited', 'missing-content', 'malformed', 'reboot', 'self-declared']) {
  test(`producer guard rejects ${name} even with a green producer run`, () => withProducer(async ({ f, options, document, directory }) => {
    const path = join(directory, 'installer-acceptance.json');
    if (name === 'download') options.downloadStatus = 'failure';
    if (name === 'identity') options.productSha = 'd'.repeat(40);
    if (name === 'metadata') f.artifacts.at(-1).digest = `sha256:${'c'.repeat(64)}`;
    if (name === 'limited') { document.restrictions = ['nsis-per-user-shell-activation-failed']; document.reuseEligible = false; }
    if (name === 'reboot') document.scenarios[2].verdict.lifecycleStatus = 'reboot-required';
    if (name === 'self-declared') document.scenarios = [];
    await writeFile(path, JSON.stringify(document));
    if (name === 'missing-content') await rm(path);
    if (name === 'malformed') await writeFile(path, '{"status":1,"STATUS":2}');
    await assert.rejects(verifyDownloadedProducer(options, f));
  }));
}
test('Windows test consumers require purpose, digest and inventory without independent acceptance', async () => {
  for (const name of ['alhangeul-installer-reuse', 'alhangeul-windows-pdf']) {
    const source = await readFile(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8');
    const installer = source.indexOf(name.includes('reuse') ? 'installer-smoke.ps1' : '-Phase Install -Kind nsis');
    assert.match(source.slice(0, installer), /additional-validation-only/);
    assert.match(source.slice(0, installer), /digest-mismatch: error/);
    assert.match(source.slice(0, installer), /--source-sha/);
    assert.doesNotMatch(source, /producer-guard.mjs|acceptance_artifact_id|ACCEPTANCE_DOWNLOAD_STATUS/);
  }
});
test('actual Windows metadata CLI completes without circular imports and grants testing only', () => withProducer(async ({ options, directory }) => {
  const preload = fileURLToPath(new URL('./fixtures/ci-github-preload.mjs', import.meta.url));
  const verifier = fileURLToPath(new URL('../scripts/verify-workflow-artifact.mjs', import.meta.url));
  const path = join(directory, 'cli-handoff.json');
  const stdout = execFileSync(process.execPath, ['--import', preload, verifier, '--repository', options.repository,
    '--build-ref', options.productSha, '--run-id', options.runId, '--workflow-path', '.github/workflows/ci.yml',
    '--artifact-name', 'alhangeul-desktop-windows-x64', '--json-output', path], { timeout: 10_000, encoding: 'utf8' });
  assert.match(stdout, /metadata only/);
  const result = JSON.parse(await readFile(path));
  assert.equal(result.validationHandoff.downloadStatus, 'unverified');
  assert.equal(result.validationHandoff.purpose, 'additional-validation-only');
  assert.equal(result.validationHandoff.releaseAcceptance, 'unverified');
  assert.equal(result.acceptanceHandoff, undefined);
}));

test('limited or absent independent evidence does not block additional tests on a successful exact producer', async () => {
  const { f, query } = fixture(); f.jobs = []; f.artifacts = [f.artifact];
  const result = await verifyWorkflowArtifact(query, f);
  assert.equal(result.validationHandoff.purpose, 'additional-validation-only');
  assert.equal(result.validationHandoff.productAcceptance, 'unverified');
});
test('test-only metadata rejects a changed or unsuccessful producer attempt', async () => {
  for (const patch of [{ conclusion: 'failure' }, { run_attempt: 99 }, { run_started_at: '2026-09-14T00:00:00Z' }]) {
    const { f, query } = fixture();
    const fetchJson = async path => {
      const value = await f.fetchJson(path);
      return path.includes('/attempts/') ? { ...value, ...patch } : value;
    };
    await assert.rejects(verifyWorkflowArtifact(query, { fetchJson }));
  }
});
for (const [label, change] of [
  ['failed run', f => { f.run.conclusion = 'failure'; }],
  ['stale artifact', f => { f.artifact.created_at = '2026-09-01T00:00:00Z'; }],
  ['expired artifact', f => { f.artifact.expired = true; }],
  ['wrong source', f => { f.run.head_sha = 'e'.repeat(40); }],
]) test(`test-only metadata still refuses ${label}`, async () => {
  const { f, query } = fixture(); change(f);
  await assert.rejects(verifyWorkflowArtifact(query, f));
});
