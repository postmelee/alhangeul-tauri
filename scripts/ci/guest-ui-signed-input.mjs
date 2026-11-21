import assert from 'node:assert/strict';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCandidate } from './release-candidate-input.mjs';
import { downloadCandidate, assertCandidateIdentity, assertCandidateFile } from './release-file-candidate.mjs';
import { verifyWorkflowArtifact } from '../verify-workflow-artifact.mjs';
import { verifyUpdaterArtifacts } from '../updater/release-inventory.mjs';

export async function prepare(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true');
  assert.equal(env.RUNNER_ENVIRONMENT, 'github-hosted');
  assert.equal(env.GITHUB_REPOSITORY, 'postmelee/alhangeul-tauri');
  assert.ok(env.RELEASE_CANDIDATE_PATH && env.HOSTED_UI_ROOT);
  const kind = env.GUEST_SCENARIO.startsWith('msi') ? 'msi' : 'nsis';
  const selected = await loadCandidate(kind, null, env.RELEASE_CANDIDATE_PATH);
  const { productSha, producerRun, version, tag, workflowPath, candidate } = selected;
  const handoff = await verifyWorkflowArtifact({
    repository: env.GITHUB_REPOSITORY, buildRef: productSha, runId: producerRun,
    artifactName: candidate.name, workflowPath,
  });
  assertCandidateIdentity(candidate, handoff, producerRun, productSha);
  const root = resolve(env.HOSTED_UI_ROOT);
  await mkdir(join(root, 'evidence'), { recursive: true });
  await downloadCandidate(candidate, join(root, 'bundle'));
  await rename(resolve('candidate.zip'), join(root, 'candidate.zip'));
  const config = JSON.parse(await readFile('apps/desktop/src-tauri/tauri.updater.conf.json'));
  const verified = await verifyUpdaterArtifacts({
    root: join(root, 'bundle'), version, tag, sourceSha: productSha,
    publicKey: config.plugins.updater.pubkey, targets: candidate.targets,
  });
  assertCandidateFile(candidate, verified);
  const selection = { productSha, producerRun, version, tag, candidate,
    harnessSha: env.GITHUB_SHA, signaturesVerified: true, ...verified };
  await writeFile(join(root, 'signed-selection.json'), JSON.stringify(selection, null, 2));
  await writeFile(join(root, 'evidence', 'producer.json'), JSON.stringify({
    ...handoff, source: productSha, run: producerRun, artifact: candidate.id,
    digest: candidate.digest, harnessSha: env.GITHUB_SHA,
    probeRun: env.GITHUB_RUN_ID, probeAttempt: env.GITHUB_RUN_ATTEMPT,
    signaturesVerified: true, keyFingerprint: verified.keyFingerprint,
  }, null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await prepare(process.env);
}
