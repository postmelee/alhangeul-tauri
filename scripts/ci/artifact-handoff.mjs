import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyWorkflowArtifact, createGitHubApiClient } from '../verify-workflow-artifact.mjs';

export async function verifyProductHandoff(input, services = {}) {
  for (const field of ['productSha', 'harnessSha']) {
    if (!/^[0-9a-f]{40}$/.test(input[field] ?? '')) throw new Error(`Invalid ${field}`);
  }
  if (!/^[1-9]\d*$/.test(String(input.artifactId)) || !Number.isSafeInteger(Number(input.artifactId))) throw new Error('Invalid artifact ID');
  if (!/^sha256:[0-9a-f]{64}$/.test(input.artifactDigest ?? '')) throw new Error('Invalid artifact digest');
  const fetchJson = services.fetchJson ?? createGitHubApiClient({ token: process.env.GITHUB_TOKEN });
  const verified = await verifyWorkflowArtifact({
    repository: input.repository, buildRef: input.productSha, runId: input.runId,
    artifactName: 'alhangeul-desktop-windows-x64',
  }, { fetchJson });
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
