import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { readEvidenceJson, parseEvidenceJson, evidenceHash } from './acceptance-json.mjs';
import { exactFields, fixedScenario, requireEvidence, STEP_NAMES } from './acceptance-evidence.mjs';
import { validateEvaluationInput } from './installer-evaluation.mjs';
import { resolveOrdinaryProduct } from './installer-metadata.mjs';
import { verifyDesktopArtifacts } from '../verify-desktop-artifacts.mjs';

export function buildInstallerInput(records, metadata, selected) {
  requireEvidence(metadata.metadataStatus === 'verified', 'unverified-input-metadata');
  const { summary, steps, inventory, fixtureManifest, process: smoke, workflow } = records;
  exactFields(steps.value, STEP_NAMES);
  for (const name of STEP_NAMES) requireEvidence(
    ['success', 'failure', 'skipped', 'cancelled'].includes(steps.value[name]), 'invalid-input-step');
  exactFields(smoke.value, ['schemaVersion', 'status', 'exitCode']);
  requireEvidence(smoke.value.schemaVersion === 1 && smoke.value.status === 'completed', 'smoke-process-not-completed');
  const id = metadata.identity;
  for (const [key, value] of Object.entries({ runId: id.runId, runAttempt: id.runAttempt,
    requestedBuildRef: id.sourceMode === 'reuse' ? id.harnessSha : id.productSha, workflowSha: id.workflowSha,
    installerKind: selected.installerKind, scenario: selected.scenario })) {
    requireEvidence(workflow.value[key] === value, 'workflow-readback-mismatch');
  }
  requireEvidence(inventory.value.sourceSha === id.productSha && inventory.value.platform === 'windows-x64', 'inventory-source-mismatch');
  requireEvidence(isDeepStrictEqual(summary.value.Artifacts?.Inventory, inventory.value), 'inventory-readback-mismatch');
  requireEvidence(isDeepStrictEqual(summary.value.ThumbnailFixtureManifest, fixtureManifest.value), 'fixture-readback-mismatch');
  const context = { ...id, policyVersion: 1, contract: selected.contract,
    installerKind: selected.installerKind, scenario: selected.scenario };
  const input = validateEvaluationInput({ context, identity: structuredClone(context), summary: summary.value,
    inventory: inventory.value, fixtureManifest: fixtureManifest.value, steps: steps.value, smokeExitCode: smoke.value.exitCode });
  const bytes = Buffer.from(JSON.stringify(input, null, 2) + '\n');
  parseEvidenceJson(bytes); // Enforce the same size/depth limits before writing.
  const binding = { schemaVersion: 1, provenanceStatus: 'requires-io-verification', metadata,
    hashes: Object.fromEntries(Object.entries(records).map(([key, record]) => [key, record.sha256])) };
  binding.hashes.input = evidenceHash(bytes);
  return { bytes, binding };
}

export async function prepareInstallerInput(options, services = {}) {
  const output = resolve(options.output);
  await mkdir(output, { recursive: true });
  // Never allow an old prepared success to survive a failed collection attempt.
  await writeFile(join(output, 'installer-input.json'), '{}\n');
  await writeFile(join(output, 'installer-input-binding.json'), '{"schemaVersion":1,"status":"unverified"}\n');
  const diagnostic = { schemaVersion: 1, phase: 'metadata', status: 'failed' };
  try {
    const result = await collectInput({ ...options, output }, services, diagnostic);
    diagnostic.status = 'passed';
    return result;
  } finally {
    // Only a fixed phase/status is retained; never copy arbitrary API/IO errors.
    await writeFile(join(output, 'installer-input-diagnostic.json'), JSON.stringify(diagnostic) + '\n');
  }
}

async function collectInput(options, services, diagnostic) {
  const output = options.output;
  const selected = fixedScenario(options.installerKind, options.scenario);
  const metadata = await resolveOrdinaryProduct(options.request, services);
  diagnostic.phase = 'checkout';
  const checkout = (await readFile(join(output, 'checked-out-sha.txt'), 'utf8')).replace(/^\ufeff/, '').trim();
  requireEvidence(checkout === metadata.identity.harnessSha, 'checkout-readback-mismatch');
  diagnostic.phase = 'inventory';
  const inventoryPath = join(options.artifactRoot, 'alhangeul-artifact-inventory.json');
  const inventory = await readEvidenceJson(inventoryPath);
  const verified = await (services.verifyInventory ?? verifyDesktopArtifacts)({ platform: 'windows-x64',
    root: options.artifactRoot, verifyInventoryPath: inventoryPath, sourceSha: metadata.identity.productSha });
  requireEvidence(isDeepStrictEqual(verified, inventory.value), 'verified-inventory-mismatch');
  diagnostic.phase = 'raw-evidence';
  const records = {
    summary: await readEvidenceJson(join(output, 'windows-installer-smoke-summary.json')),
    steps: await readEvidenceJson(join(output, 'step-outcomes.json')),
    process: await readEvidenceJson(join(output, 'smoke-process.json')),
    workflow: await readEvidenceJson(join(output, 'workflow-context.json')),
    inventory, fixtureManifest: await readEvidenceJson(options.fixtureManifestPath),
  };
  diagnostic.phase = 'readback';
  const result = buildInstallerInput(records, metadata, selected);
  diagnostic.phase = 'write';
  await writeFile(join(output, 'installer-input.json'), result.bytes);
  await writeFile(join(output, 'installer-input-binding.json'), JSON.stringify(result.binding, null, 2) + '\n');
  return result.binding;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const env = process.env;
    const { value: product } = await readEvidenceJson('package.json');
    await prepareInstallerInput({
      output: 'diagnostics/windows-installer-smoke', artifactRoot: 'artifacts/windows-x64',
      fixtureManifestPath: 'scripts/windows-thumbnail-fixtures.json',
      installerKind: env.INSTALLER_KIND, scenario: env.INSTALLER_SCENARIO,
      request: { repository: env.GITHUB_REPOSITORY, runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT,
        workflowSha: env.GITHUB_WORKFLOW_SHA, harnessSha: env.EXPECTED_SOURCE_SHA, productSha: env.EXPECTED_SOURCE_SHA,
        artifactId: env.PRODUCT_ARTIFACT_ID, expectedVersion: product.version, sourceMode: 'ordinary' },
    });
    console.log('Installer input collected; aggregate provenance and product acceptance remain unverified.');
  } catch {
    console.error('installer-input-collection-failed');
    process.exitCode = 1;
  }
}
