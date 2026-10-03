import assert from 'node:assert/strict';
import { loadCandidate, recordCandidateIdentity } from './release-candidate-input.mjs';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyWorkflowArtifact } from '../verify-workflow-artifact.mjs';
import { verifyDesktopArtifacts } from '../verify-desktop-artifacts.mjs';
import { PRODUCT_SHA, assertCandidateIdentity, downloadCandidate,
  verifyProductDependencies } from './release-file-candidate.mjs';

export const PRODUCER_RUN = 36320353815;
export const LINUX_CANDIDATES = Object.freeze({
  rpm: {
    name: 'alhangeul-desktop-linux-x64', id: 10932826761, platform: 'linux-x64',
    digest: 'sha256:91ace60dbe2ac5b818a8f2f572afae8bb8f00908a497e119ce21a07900da2660',
    kind: 'rpm', path: 'rpm/Alhangeul-0.1.0-1.x86_64.rpm',
    sha256: '6c87ba0321f6a9c8ca5068915217064f8c839cabaf3a8d60451df8f3e496308c',
  },
  arm64: {
    name: 'alhangeul-desktop-linux-arm64', id: 10932449136, platform: 'linux-arm64',
    digest: 'sha256:5b2260d5c43934641a8f8607a652062d4796e2ccc87b3774497359cca13cfe6f',
    kind: 'deb', path: 'deb/Alhangeul_0.1.0_arm64.deb',
    sha256: 'a317382ff9b3ec911ec8761de3be7d641309d1f97d58b8a19601a8adb4a21a2e',
  },
});

export function selectLinuxInstaller(candidate, inventory, productSha = PRODUCT_SHA) {
  assert.equal(inventory.sourceSha, productSha);
  assert.equal(inventory.platform, candidate.platform);
  const matches = inventory.files.filter(file => file.kind === candidate.kind);
  assert.equal(matches.length, 1, 'exactly one installer');
  assert.equal(matches[0].path, candidate.path);
  assert.equal(matches[0].sha256, candidate.sha256);
  return matches[0];
}

async function prepare() {
  const kind = process.env.CANDIDATE_KIND;
  const selection = await loadCandidate(kind, { productSha: PRODUCT_SHA, producerRun: PRODUCER_RUN,
    version: '0.1.0', tag: 'v0.1.0', candidate: LINUX_CANDIDATES[kind] });
  const { productSha, producerRun, version, tag, workflowPath, candidate } = selection;
  assert.ok(candidate, 'unsupported Linux candidate');
  const root = resolve('candidate');
  const evidence = resolve('candidate-evidence');
  await mkdir(evidence, { recursive: true });
  const harnessSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(harnessSha, process.env.GITHUB_SHA);
  await writeFile(resolve(evidence, 'context.json'), JSON.stringify({
    productSha, harnessSha, producerRun, version, tag, kind, candidate,
    runId: process.env.GITHUB_RUN_ID, verificationStartedAt: new Date().toISOString(),
  }, null, 2));
  await verifyProductDependencies(productSha);
  const handoff = await verifyWorkflowArtifact({
    repository: 'postmelee/alhangeul-tauri', buildRef: productSha,
    runId: producerRun, artifactName: candidate.name, workflowPath,
  });
  assertCandidateIdentity(candidate, handoff, producerRun, productSha);
  await writeFile(resolve(evidence, 'handoff.json'), JSON.stringify(handoff, null, 2));
  await downloadCandidate(candidate, root);
  const inventory = await verifyDesktopArtifacts({
    platform: candidate.platform, root, sourceSha: productSha,
    verifyInventoryPath: resolve(root, 'alhangeul-artifact-inventory.json'),
  });
  const selectedFile = selectLinuxInstaller(candidate, inventory, productSha);
  await writeFile(resolve(evidence, 'verified-candidate.json'), JSON.stringify({
    ...handoff, harnessSha, archiveVerified: true, inventoryVerified: true,
    selectedFile, inventory,
  }, null, 2));
  await recordCandidateIdentity(selection, evidence);
  await appendFile(process.env.GITHUB_OUTPUT, `installer=${resolve(root, selectedFile.path)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepare();
