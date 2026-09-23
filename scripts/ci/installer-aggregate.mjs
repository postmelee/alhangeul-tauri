import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { readEvidenceJson } from './acceptance-json.mjs';
import { requireEvidence, aggregateAcceptance } from './acceptance-evidence.mjs';
import { resolveInstallerDelivery } from './acceptance-delivery.mjs';
import { replayInstallerScenario } from './installer-replay.mjs';
import { verifyDesktopArtifacts } from '../verify-desktop-artifacts.mjs';

export async function aggregateDeliveredInstallers(options, services = {}) {
  const diagnostic = options.diagnostic ?? {};
  diagnostic.phase = 'metadata';
  const fresh = await resolveInstallerDelivery(options.request, services);
  requireEvidence(isDeepStrictEqual(fresh, options.plan), 'delivery-plan-changed');
  requireEvidence(options.downloadStatus === 'success' && options.productDownloadStatus === 'success'
    && options.supportDownloadStatus === 'success', 'aggregate-download-failed');
  diagnostic.phase = 'inventory';
  const inventoryPath = join(options.artifactRoot, 'alhangeul-artifact-inventory.json');
  const inventory = await readEvidenceJson(inventoryPath);
  const actual = await (services.verifyInventory ?? verifyDesktopArtifacts)({ platform: 'windows-x64', root: options.artifactRoot,
    verifyInventoryPath: inventoryPath, sourceSha: fresh.metadata.identity.productSha });
  requireEvidence(isDeepStrictEqual(actual, inventory.value), 'aggregate-inventory-mismatch');
  const fixtureManifest = await readEvidenceJson(options.fixtureManifestPath);
  const rows = [];
  for (const row of fresh.scenarios) {
    diagnostic.scenario = row.name;
    rows.push(await replayInstallerScenario({ root: join(options.evidenceRoot, row.artifact.name),
      replayRoot: join(options.replayRoot, row.name), supportRoot: options.supportRoot,
      metadata: fresh.metadata, row, inventory, fixtureManifest, diagnostic }, services));
  }
  diagnostic.phase = 'aggregate'; diagnostic.scenario = null;
  return aggregateAcceptance(rows, fresh.metadata.identity);
}

async function main(command, env) {
  const output = 'diagnostics/installer-aggregate';
  await mkdir(output, { recursive: true });
  const diagnostic = { schemaVersion: 1, phase: 'metadata', scenario: null, status: 'failed' };
  const target = join(output, command === 'plan' ? 'delivery-plan.json' : 'installer-acceptance.json');
  await writeFile(target, '{"status":"unverified"}\n');
  try {
    requireEvidence(['plan', 'replay'].includes(command), 'invalid-aggregate-command');
    const { value: product } = await readEvidenceJson('package.json');
    const checkout = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    requireEvidence(checkout === env.GITHUB_WORKFLOW_SHA && checkout === env.EXPECTED_SOURCE_SHA, 'aggregate-checkout-mismatch');
    const request = { repository: env.GITHUB_REPOSITORY, runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT,
      workflowSha: env.GITHUB_WORKFLOW_SHA, harnessSha: checkout, productSha: checkout,
      artifactId: env.PRODUCT_ARTIFACT_ID, expectedVersion: product.version, sourceMode: 'ordinary' };
    if (command === 'plan') {
      const plan = await resolveInstallerDelivery(request);
      requireEvidence(plan.supportArtifact.id === env.SUPPORT_ARTIFACT_ID, 'support-artifact-mismatch');
      await writeFile(target, JSON.stringify(plan, null, 2) + '\n');
      await appendFile(env.GITHUB_OUTPUT, `artifact_ids=${plan.scenarios.map(row => row.artifact.id).join(',')}\nsupport_id=${plan.supportArtifact.id}\n`);
    } else {
      const plan = (await readEvidenceJson(join(output, 'delivery-plan.json'))).value;
      const result = await aggregateDeliveredInstallers({ request, plan, artifactRoot: 'artifacts/windows-x64',
        supportRoot: 'artifacts/thumbnail-support', evidenceRoot: 'artifacts/installer-evidence',
        fixtureManifestPath: 'scripts/windows-thumbnail-fixtures.json', replayRoot: join(output, 'replay'),
        downloadStatus: env.EVIDENCE_DOWNLOAD_STATUS, productDownloadStatus: env.PRODUCT_DOWNLOAD_STATUS,
        supportDownloadStatus: env.SUPPORT_DOWNLOAD_STATUS, diagnostic });
      await writeFile(target, JSON.stringify(result, null, 2) + '\n');
      await appendFile(env.GITHUB_OUTPUT, `contract_status=passed\nproduct_observation=${result.productAcceptance}\nreuse_eligible=${result.reuseEligible}\n`);
      await appendFile(env.GITHUB_STEP_SUMMARY, `검사 계약: 통과 / 제품 관측: ${result.productAcceptance}\n\n`
        + `제한: ${result.restrictions.join(', ') || '선택된 설치 시나리오에서 없음'}\n\n`
        + (result.restrictions.includes('nsis-per-user-shell-activation-failed') ? 'NSIS: 0x80040154 제한 관측.\n\n' : '')
        + (result.restrictions.includes('post-reboot-unverified') ? 'MSI: 3010, 재부팅 후 미검증.\n\n' : '')
        + '최신 VDI·릴리즈 수용은 별도 미검증입니다.\n');
    }
    diagnostic.status = 'passed';
  } finally { await writeFile(join(output, `${command === 'plan' ? 'metadata' : 'replay'}-diagnostic.json`), JSON.stringify(diagnostic) + '\n'); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(process.argv[2], process.env); }
  catch { console.error('installer-aggregate-failed; see preserved metadata/replay diagnostic'); process.exitCode = 1; }
}
