import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANDIDATES, PRODUCT_SHA, PRODUCER_RUN, assertCandidateIdentity,
  assertCandidateFile, downloadCandidate, verifyProductDependencies } from './release-file-candidate.mjs';
import { verifyWorkflowArtifact } from '../verify-workflow-artifact.mjs';
import { verifyDesktopArtifacts, INVENTORY_FILENAME } from '../verify-desktop-artifacts.mjs';
import { verifyUpdaterArtifacts } from '../updater/release-inventory.mjs';

export function readPerformanceCandidate(env = process.env) {
  assert.match(env.FONT_PERFORMANCE_BUILD_REF ?? '', /^[a-f0-9]{40}$/);
  assert.match(env.FONT_PERFORMANCE_RUN_ID ?? '', /^[1-9][0-9]*$/);
  assert.ok(Number.isSafeInteger(Number(env.FONT_PERFORMANCE_RUN_ID)));
  assert.ok(['windows-x64', 'linux-x64'].includes(env.FONT_PERFORMANCE_PLATFORM));
  return { buildRef: env.FONT_PERFORMANCE_BUILD_REF, runId: Number(env.FONT_PERFORMANCE_RUN_ID),
    platform: env.FONT_PERFORMANCE_PLATFORM, kind: env.FONT_PERFORMANCE_PLATFORM === 'windows-x64' ? 'msi' : 'appimage' };
}

export function selectPerformanceFile(inventory, kind) {
  const matches = inventory.files.filter(file => file.kind === kind);
  assert.equal(matches.length, 1, 'exact performance installer cardinality');
  const file = matches[0];
  assert.match(file.sha256, /^[a-f0-9]{64}$/);
  assert.ok(file.size > 0);
  return file;
}

async function download(handoff, directory) {
  await mkdir(directory, { recursive: true });
  const cwd = process.cwd();
  try {
    process.chdir(directory);
    await downloadCandidate({ id: handoff.artifactId, digest: handoff.artifactDigest }, join(directory, 'bundle'));
  } finally { process.chdir(cwd); }
  return join(directory, 'bundle');
}

async function baseline(input, directory) {
  const candidate = CANDIDATES[input.kind];
  const handoff = await verifyWorkflowArtifact({ repository: 'postmelee/alhangeul-tauri',
    buildRef: PRODUCT_SHA, runId: PRODUCER_RUN, artifactName: candidate.name });
  assertCandidateIdentity(candidate, handoff);
  const root = await download(handoff, directory);
  const config = JSON.parse(await readFile('apps/desktop/src-tauri/tauri.updater.conf.json', 'utf8'));
  const inventory = await verifyUpdaterArtifacts({ root, version: '0.1.0', tag: 'v0.1.0',
    sourceSha: PRODUCT_SHA, publicKey: config.plugins.updater.pubkey, targets: candidate.targets });
  const selectedFile = assertCandidateFile(candidate, inventory);
  return { ...handoff, root, version: '0.1.0', selectedFile, installer: resolve(root, selectedFile.path),
    signaturesVerified: true, keyFingerprint: inventory.keyFingerprint };
}

async function improved(input, directory) {
  const handoff = await verifyWorkflowArtifact({ repository: 'postmelee/alhangeul-tauri',
    buildRef: input.buildRef, runId: input.runId, workflowPath: '.github/workflows/ci.yml',
    artifactName: `alhangeul-desktop-${input.platform}` });
  const root = await download(handoff, directory);
  const inventory = await verifyDesktopArtifacts({ platform: input.platform, root,
    verifyInventoryPath: join(root, INVENTORY_FILENAME), sourceSha: input.buildRef });
  const selectedFile = selectPerformanceFile(inventory, input.kind);
  const config = JSON.parse(execFileSync('git', ['show', `${input.buildRef}:apps/desktop/src-tauri/tauri.conf.json`], { encoding: 'utf8' }));
  assert.match(config.version, /^\d+\.\d+\.\d+$/);
  return { ...handoff, root, version: config.version, selectedFile, installer: resolve(root, selectedFile.path),
    signaturesVerified: false, purpose: 'performance-candidate-only' };
}

async function prepare() {
  const input = readPerformanceCandidate();
  const harnessSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(harnessSha, process.env.GITHUB_SHA);
  await verifyProductDependencies();
  for (const path of ['apps/studio-host/vendor/rhwp-core/rhwp.js',
    'apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm', 'tests/gui/support/document-fixture.ts']) {
    assert.deepEqual(await readFile(path), execFileSync('git', ['show', `${input.buildRef}:${path}`], { maxBuffer: 20 * 1024 * 1024 }));
  }
  assert.equal(execFileSync('git', ['rev-parse', `${input.buildRef}:third_party/rhwp`], { encoding: 'utf8' }).trim(),
    execFileSync('git', ['-C', 'third_party/rhwp', 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim());
  const root = resolve('font-performance-inputs');
  const evidence = resolve('font-performance-evidence');
  await mkdir(evidence, { recursive: true });
  const products = { baseline: await baseline(input, join(root, 'baseline')),
    improved: await improved(input, join(root, 'improved')) };
  await writeFile(join(evidence, 'products.json'), JSON.stringify({ input, harnessSha, products,
    runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    archiveDigestsVerified: true, acceptance: 'unverified' }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepare();
