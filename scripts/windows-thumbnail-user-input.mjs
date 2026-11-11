import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { verifyDesktopArtifacts } from './verify-desktop-artifacts.mjs';
import { resolveOrdinaryProduct } from './ci/installer-metadata.mjs';
import { requireEvidence } from './ci/acceptance-evidence.mjs';

export const PUBLIC_INPUT = Object.freeze({
  schemaVersion: 1, mode: 'public-observation',
  productSha: 'bcb892d49a9003615f3acd980babd71e59e147dd',
  installerSha256: '932c3316d9ea83cd5c38e3fe528518535751ac60fedd72776c5306085437c490',
  installerUrl: 'https://github.com/postmelee/alhangeul-tauri/releases/download/v0.1.3/Alhangeul_0.1.3_x64-setup.exe',
  binaries: [
    { name: 'AlhangeulThumbnailHandler.dll', bytes: 320000, sha256: '5cae0049fbf31e0d66bb411eaf452244fde0e07f82f03a12372d0fb34cf268bb' },
    { name: 'AlhangeulThumbnailWorker.exe', bytes: 40396800, sha256: '560236cadc4b06b8358e604f5a919b6d22a07c0eb8082fe782d5795dabf37e26' },
  ],
});

export async function prepareFreshInput(root, artifactRoot, request, services = {}) {
  const metadata = await (services.resolveMetadata ?? resolveOrdinaryProduct)(request);
  const inventory = await (services.verifyInventory ?? verifyDesktopArtifacts)({ platform: 'windows-x64',
    root: artifactRoot, verifyInventoryPath: join(artifactRoot, 'alhangeul-artifact-inventory.json'), sourceSha: request.productSha });
  requireEvidence(inventory.sourceSha === request.productSha, 'user-input-source-mismatch');
  const one = kind => {
    const matches = inventory.files.filter(row => row.kind === kind);
    requireEvidence(matches.length === 1, 'user-input-file-count');
    const row = matches[0];
    requireEvidence(typeof row.path === 'string' && !row.path.includes('..') && !/^[\\/]|:/.test(row.path)
      && /^[a-f0-9]{64}$/.test(row.sha256) && Number.isSafeInteger(row.size) && row.size > 0, 'invalid-user-input-file');
    return row;
  };
  const installer = one('nsis');
  const input = { schemaVersion: 1, mode: 'fresh-standard-acceptance', metadata,
    productSha: request.productSha, installerSha256: installer.sha256,
    binaries: ['thumbnail-handler', 'thumbnail-worker'].map(kind => {
      const file = one(kind); return { name: basename(file.path), bytes: file.size, sha256: file.sha256 };
    }) };
  await (services.copyInstaller ?? copyFile)(join(artifactRoot, installer.path), join(root, 'installer.exe'));
  return input;
}

async function main([root, artifactRoot, expectedSha, scenario = 'fresh'], env) {
  requireEvidence(['fresh', 'public-upgrade'].includes(scenario), 'invalid-standard-scenario');
  let input = PUBLIC_INPUT;
  if (artifactRoot || expectedSha) {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    requireEvidence(sha === expectedSha && sha === env.GITHUB_SHA && sha === env.GITHUB_WORKFLOW_SHA, 'user-input-checkout-mismatch');
    const product = JSON.parse(await readFile('package.json', 'utf8'));
    input = await prepareFreshInput(root, artifactRoot, { repository: env.GITHUB_REPOSITORY,
      runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, workflowSha: sha, harnessSha: sha,
      productSha: sha, artifactId: env.PRODUCT_ARTIFACT_ID, expectedVersion: product.version, sourceMode: 'ordinary' });
  }
  if (input.mode === 'fresh-standard-acceptance') {
    input.scenario = scenario;
    if (scenario === 'public-upgrade') input.baseline = PUBLIC_INPUT;
  }
  await writeFile(join(root, 'input.json'), JSON.stringify(input, null, 2) + '\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2), process.env).catch(() => { console.error('thumbnail-user-input-invalid'); process.exitCode = 1; });
}
