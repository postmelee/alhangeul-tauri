import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { buildInstallerInput } from './installer-input.mjs';
import { verifyProductHandoff } from './artifact-handoff.mjs';
import { assertIdentity, fixedScenario, requireEvidence } from './acceptance-evidence.mjs';
import { assertCurrentAttempt } from './installer-metadata.mjs';
import { readEvidenceJson, evidenceHash } from './acceptance-json.mjs';
import { createGitHubApiClient } from '../github-api.mjs';
import { verifyDesktopArtifacts } from '../verify-desktop-artifacts.mjs';

export function reuseStepRecord(record) {
  const names = { checkout: 'harness', verifyCommit: 'harness', download: 'download', assessmentTests: 'regressions',
    diagnosticContract: 'diagnostic-contract', supportDownload: 'support', manualTests: 'manual-tests',
    manualEvidence: 'manual-evidence', smoke: 'smoke' };
  for (const name of ['harness', 'handoff', 'download', 'inventory', 'support', 'manual-tests', 'smoke-context', 'regressions', 'diagnostic-contract', 'manual-evidence']) {
    requireEvidence(record.steps?.[name]?.outcome === 'success', 'reuse-required-step-failed');
  }
  const value = Object.fromEntries(Object.entries(names).map(([key, name]) => [key, record.steps?.[name]?.outcome]));
  return { value, sha256: evidenceHash(Buffer.from(JSON.stringify(value))) };
}

async function collectReuseInput(env, diagnostic) {
  const output = 'diagnostics/installer-reuse/smoke';
  const api = createGitHubApiClient({ token: env.GITHUB_TOKEN });
  const saved = (await readEvidenceJson('diagnostics/installer-reuse/handoff.json')).value;
  const guard = await verifyProductHandoff({ repository: env.GITHUB_REPOSITORY, productSha: env.PRODUCT_SHA,
    harnessSha: env.HARNESS_SHA, runId: env.PRODUCT_RUN_ID,
    artifactId: env.PRODUCT_ARTIFACT_ID, artifactDigest: env.PRODUCT_ARTIFACT_DIGEST }, { fetchJson: api });
  requireEvidence(isDeepStrictEqual(saved, guard), 'reuse-handoff-changed');
  requireEvidence(guard.validationHandoff?.purpose === 'additional-validation-only'
    && guard.validationHandoff.productAcceptance === 'unverified'
    && guard.validationHandoff.releaseAcceptance === 'unverified', 'reuse-purpose-mismatch');
  const identity = { repository: env.GITHUB_REPOSITORY, runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT,
    workflowSha: env.GITHUB_WORKFLOW_SHA, harnessSha: env.HARNESS_SHA, productSha: guard.productSha,
    artifactId: String(guard.artifactId), artifactDigest: guard.artifactDigest, expectedVersion: saved.productVersion, sourceMode: 'reuse' };
  assertIdentity(identity);
  assertCurrentAttempt(await api(`/repos/${identity.repository}/actions/runs/${identity.runId}`), identity);
  const checkout = (await readFile(join(output, 'checked-out-sha.txt'), 'utf8')).replace(/^\ufeff/, '').trim();
  requireEvidence(checkout === identity.harnessSha, 'reuse-checkout-mismatch');
  diagnostic.phase = 'inventory';
  const path = 'artifacts/windows-x64/alhangeul-artifact-inventory.json';
  const inventory = await readEvidenceJson(path);
  const actual = await verifyDesktopArtifacts({ platform: 'windows-x64', root: 'artifacts/windows-x64', verifyInventoryPath: path, sourceSha: identity.productSha });
  requireEvidence(isDeepStrictEqual(actual, inventory.value), 'reuse-inventory-mismatch');
  diagnostic.phase = 'readback';
  const records = { summary: await readEvidenceJson(join(output, 'windows-installer-smoke-summary.json')),
    steps: reuseStepRecord((await readEvidenceJson('diagnostics/installer-reuse/step-outcomes.json')).value),
    process: await readEvidenceJson(join(output, 'smoke-process.json')),
    workflow: await readEvidenceJson(join(output, 'workflow-context.json')), inventory,
    fixtureManifest: await readEvidenceJson('scripts/windows-thumbnail-fixtures.json') };
  const metadata = { schemaVersion: 1, metadataStatus: 'verified', provenanceStatus: 'requires-io-verification', identity };
  const built = buildInstallerInput(records, metadata, fixedScenario(env.INSTALLER_KIND, env.INSTALLER_SCENARIO));
  await writeFile(join(output, 'installer-input.json'), built.bytes);
  await writeFile(join(output, 'installer-input-binding.json'), JSON.stringify(built.binding, null, 2) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = 'diagnostics/installer-reuse/smoke';
  const diagnostic = { schemaVersion: 1, phase: 'metadata', status: 'failed' };
  try {
    await mkdir(output, { recursive: true });
    await writeFile(join(output, 'installer-input.json'), '{}\n');
    await writeFile(join(output, 'installer-input-binding.json'), '{"status":"unverified"}\n');
    await collectReuseInput(process.env, diagnostic);
    diagnostic.status = 'passed';
  } catch { console.error('installer-reuse-input-failed'); process.exitCode = 1; }
  finally {
    await writeFile(join(output, 'installer-input-diagnostic.json'), JSON.stringify(diagnostic) + '\n');
  }
}
