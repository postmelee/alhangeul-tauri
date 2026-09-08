import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyWorkflowArtifact, createGitHubApiClient } from '../verify-workflow-artifact.mjs';
import { assertReuseInputs } from './reuse-inputs.mjs';

export async function verifyProductHandoff(input, services = {}) {
  assertReuseInputs(input);
  if (!/^[0-9a-f]{40}$/.test(input.harnessSha ?? '')) throw new Error('Invalid harnessSha');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(input.repository ?? '') || !/^[1-9]\d*$/.test(String(input.runId))) throw new Error('Invalid producer identity');
  const fetchJson = services.fetchJson ?? createGitHubApiClient({ token: process.env.GITHUB_TOKEN });
  const runPath = `/repos/${input.repository}/actions/runs/${input.runId}`;
  const run = await fetchJson(runPath);
  const workflowPath = run?.path?.split('@', 1)[0];
  if (!['.github/workflows/alhangeul-desktop.yml', '.github/workflows/ci.yml'].includes(workflowPath)) throw new Error('Unsupported product producer workflow');
  const verified = await verifyWorkflowArtifact({
    repository: input.repository, buildRef: input.productSha, runId: input.runId,
    artifactName: 'alhangeul-desktop-windows-x64', workflowPath,
  }, { fetchJson: (path) => path === runPath ? run : fetchJson(path) });
  if (verified.artifactId !== Number(input.artifactId) || verified.artifactDigest !== input.artifactDigest) {
    throw new Error('Approved artifact ID/digest mismatch');
  }
  const packageResponse = await fetchJson(`/repos/${input.repository}/contents/package.json?ref=${input.productSha}`);
  if (packageResponse.encoding !== 'base64') throw new Error('Invalid product package metadata');
  const product = JSON.parse(Buffer.from(packageResponse.content, 'base64').toString('utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(product.version ?? '')) throw new Error('Invalid product version');
  return { ...verified, productSha: input.productSha, harnessSha: input.harnessSha, productVersion: product.version, mode: 'reused' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await verifyProductHandoff({
      repository: process.env.GITHUB_REPOSITORY, productSha: process.env.PRODUCT_SHA,
      harnessSha: process.env.HARNESS_SHA, runId: process.env.PRODUCT_RUN_ID,
      artifactId: process.env.PRODUCT_ARTIFACT_ID, artifactDigest: process.env.PRODUCT_ARTIFACT_DIGEST,
    });
    const output = resolve('diagnostics/installer-reuse/handoff.json');
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
    await appendFile(process.env.GITHUB_OUTPUT, `artifact_id=${result.artifactId}\nproduct_version=${result.productVersion}\n`);
    console.log(`Reusing product ${result.productSha} with harness ${result.harnessSha}; archive ${result.artifactId}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
