import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { verifyWorkflowArtifact } from '../verify-workflow-artifact.mjs';
import { readEvidenceJson } from './acceptance-json.mjs';
import { requireEvidence } from './acceptance-evidence.mjs';
import { verifyProducerAcceptance } from './producer-acceptance.mjs';

export async function verifyDownloadedProducer(options, services = {}) {
  requireEvidence(options.downloadStatus === 'success', 'acceptance-download-not-passed');
  const saved = (await readEvidenceJson(options.handoffPath)).value;
  requireEvidence(saved.repository === options.repository && saved.buildRef === options.productSha
    && saved.nativeRunId === Number(options.runId), 'producer-request-mismatch');
  const current = await verifyWorkflowArtifact({ repository: options.repository, buildRef: options.productSha,
    runId: options.runId, artifactName: 'alhangeul-desktop-windows-x64', workflowPath: saved.workflowPath }, services);
  requireEvidence(current.artifactId === saved.artifactId && current.artifactDigest === saved.artifactDigest
    && isDeepStrictEqual(current.acceptanceHandoff, saved.acceptanceHandoff), 'producer-metadata-changed');
  const document = (await readEvidenceJson(join(options.acceptanceRoot, 'installer-acceptance.json'))).value;
  return verifyProducerAcceptance(document, { ...current.acceptanceHandoff, downloadStatus: 'success' });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = process.env.PRODUCER_GUARD_OUTPUT ?? 'diagnostics/installer-reuse/producer-guard.json';
  try {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, '{"status":"unverified"}\n');
    const result = await verifyDownloadedProducer({ repository: process.env.GITHUB_REPOSITORY,
      productSha: process.env.PRODUCT_SHA, runId: process.env.PRODUCT_RUN_ID,
      handoffPath: process.env.HANDOFF_PATH ?? 'diagnostics/installer-reuse/handoff.json',
      acceptanceRoot: process.env.ACCEPTANCE_ROOT ?? 'artifacts/producer-acceptance',
      downloadStatus: process.env.ACCEPTANCE_DOWNLOAD_STATUS });
    await writeFile(output, JSON.stringify(result, null, 2) + '\n');
    console.log('Producer content verified for existing bytes only; release acceptance remains unverified.');
  } catch { console.error('producer-acceptance-guard-failed'); process.exitCode = 1; }
}
