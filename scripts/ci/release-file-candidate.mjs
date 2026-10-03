import assert from 'node:assert/strict';
import { loadCandidate, recordCandidateIdentity } from './release-candidate-input.mjs';
import { execFileSync } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { readFile, mkdir, writeFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyWorkflowArtifact } from '../verify-workflow-artifact.mjs';
import { sha256File } from '../verify-desktop-artifacts.mjs';
import { verifyUpdaterArtifacts } from '../updater/release-inventory.mjs';

export const PRODUCT_SHA = 'fc3cad15682f35723ab6558d1301e9096f7eec67';
export const PRODUCER_RUN = 36320371932;
export const CANDIDATES = Object.freeze({
  msi: {
    name: 'alhangeul-updater-windows-x64', id: 10933208421,
    digest: 'sha256:fbd15d72bcf126e3a22947f3a1ece3779291a768404c50e8fb94202abb07a091',
    target: 'windows-x86_64-msi', targets: ['windows-x86_64-nsis', 'windows-x86_64-msi'],
    sha256: '1901d255f3a1295fc007cb45f934cd602ea3b4573ea975d24abee30ea4140b68',
  },
  nsis: {
    name: 'alhangeul-updater-windows-x64', id: 10933208421,
    digest: 'sha256:fbd15d72bcf126e3a22947f3a1ece3779291a768404c50e8fb94202abb07a091',
    target: 'windows-x86_64-nsis', targets: ['windows-x86_64-nsis', 'windows-x86_64-msi'],
    sha256: 'a5eca9761defb46065187430b8274fe5b7a90c163ffe6f19410011e29af96d0c',
  },
  appimage: {
    name: 'alhangeul-updater-linux-x64', id: 10933550939,
    digest: 'sha256:59aa3cd56a7dd0bf31a8107bf31a5a283439dd9ac5f6e0c1a7ee2f4bd89e34d6',
    target: 'linux-x86_64-appimage', targets: ['linux-x86_64-appimage'],
    sha256: '5cbca61889d8689bf210c037c728447416a6fba1fe8289649823eca6776523a2',
  },
});

export function assertCandidateIdentity(candidate, handoff, producerRun = PRODUCER_RUN, productSha = PRODUCT_SHA) {
  assert.equal(handoff.buildRef, productSha);
  assert.equal(handoff.nativeRunId, producerRun);
  assert.equal(handoff.artifactId, candidate.id);
  assert.equal(handoff.artifactDigest, candidate.digest);
  assert.equal(handoff.artifactName, candidate.name);
}

export function assertCandidateFile(candidate, result) {
  const file = result.targets[candidate.target];
  assert.ok(file, 'missing target');
  assert.equal(file.sha256, candidate.sha256, 'approved installer SHA-256');
  if (candidate.path) assert.equal(file.path, candidate.path, 'approved installer path');
  return file;
}

export async function verifyProductDependencies(productSha = PRODUCT_SHA) {
  // The harness may change; its public key, fixtures and parser must not drift.
  for (const path of ['apps/desktop/src-tauri/tauri.updater.conf.json',
    'apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm',
    'apps/studio-host/vendor/rhwp-core/rhwp.js',
    'tests/gui/support/document-fixture.ts']) {
    const product = execFileSync('git', ['show', `${productSha}:${path}`], { maxBuffer: 20 * 1024 * 1024 });
    assert.deepEqual(await readFile(path), product, `product dependency mismatch: ${path}`);
  }
  const pinned = execFileSync('git', ['rev-parse', `${productSha}:third_party/rhwp`], { encoding: 'utf8' }).trim();
  const actual = execFileSync('git', ['-C', 'third_party/rhwp', 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(actual, pinned, 'fixture submodule pin');
}

export async function downloadCandidate(candidate, root) {
  const archive = resolve('candidate.zip');
  const fd = openSync(archive, 'wx');
  try {
    execFileSync('gh', ['api', `repos/postmelee/alhangeul-tauri/actions/artifacts/${candidate.id}/zip`], {
      stdio: ['ignore', fd, 'inherit'], timeout: 600000,
    });
  } finally { closeSync(fd); }
  assert.equal(`sha256:${await sha256File(archive)}`, candidate.digest);
  execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', `
import pathlib, zipfile, sys
with zipfile.ZipFile(sys.argv[1]) as z:
 for i in z.infolist():
  p=pathlib.PurePosixPath(i.filename)
  assert not p.is_absolute() and '..' not in p.parts and '\\\\' not in i.filename
  assert (i.external_attr >> 16) & 0o170000 != 0o120000
 z.extractall(sys.argv[2])
`, archive, root], { stdio: 'inherit' });
}

async function prepare() {
  const kind = process.env.CANDIDATE_KIND;
  const selection = await loadCandidate(kind, { productSha: PRODUCT_SHA, producerRun: PRODUCER_RUN,
    version: '0.1.0', tag: 'v0.1.0', candidate: CANDIDATES[kind] });
  const { productSha, producerRun, version, tag, workflowPath, candidate } = selection;
  assert.ok(candidate, 'unsupported candidate kind');
  const root = resolve('candidate');
  const evidence = resolve('candidate-evidence');
  await mkdir(evidence, { recursive: true });
  const harnessSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(harnessSha, process.env.GITHUB_SHA);
  await writeFile(resolve(evidence, 'context.json'), JSON.stringify({
    productSha, harnessSha, producerRun, version, tag, kind,
    candidate, runId: process.env.GITHUB_RUN_ID, verificationStartedAt: new Date().toISOString(),
  }, null, 2));
  await verifyProductDependencies(productSha);
  const handoff = await verifyWorkflowArtifact({
    repository: 'postmelee/alhangeul-tauri', buildRef: productSha,
    runId: producerRun, artifactName: candidate.name, workflowPath,
  });
  assertCandidateIdentity(candidate, handoff, producerRun, productSha);
  await writeFile(resolve(evidence, 'handoff.json'), JSON.stringify(handoff, null, 2));
  await downloadCandidate(candidate, root);
  const config = JSON.parse(await readFile('apps/desktop/src-tauri/tauri.updater.conf.json', 'utf8'));
  const verified = await verifyUpdaterArtifacts({
    root, version, tag, sourceSha: productSha,
    publicKey: config.plugins.updater.pubkey, targets: candidate.targets,
  });
  const file = assertCandidateFile(candidate, verified);
  await writeFile(resolve(evidence, 'verified-candidate.json'), JSON.stringify({
    ...handoff, harnessSha, archiveVerified: true, signaturesVerified: true,
    keyFingerprint: verified.keyFingerprint, selectedFile: file,
  }, null, 2));
  await recordCandidateIdentity(selection, evidence);
  await appendFile(process.env.GITHUB_OUTPUT,
    `installer=${resolve(root, file.path)}\nartifact_root=${root}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await prepare();
}
