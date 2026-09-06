import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFile, lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const executableNames = Object.freeze([
  'windows-thumbnail-check.ps1', 'windows-thumbnail-check-support.ps1',
  'windows-thumbnail-check-assessment.ps1', 'windows-thumbnail-diagnostics.ps1',
  'windows-thumbnail-probe.ps1', 'windows-thumbnail-state.ps1',
  'windows-thumbnail-assessment.ps1', 'windows-thumbnail-native.cs',
  'windows-thumbnail-interop.cs', 'windows-thumbnail-token.cs',
]);
export const payloadNames = Object.freeze([
  ...executableNames, 'alhangeul-artifact-inventory.json', 'WINDOWS_THUMBNAILS.md',
]);
export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

export function validateInventory(inventory) {
  assert(inventory?.schemaVersion === 1 && inventory.platform === 'windows-x64', 'Invalid Windows inventory');
  assert(Array.isArray(inventory.files) && inventory.files.length === 4, 'Invalid inventory cardinality');
  const kinds = ['msi', 'nsis', 'thumbnail-handler', 'thumbnail-worker'];
  assert(new Set(inventory.files.map((f) => f.kind)).size === 4, 'Duplicate inventory kind');
  for (const file of inventory.files) {
    assert(kinds.includes(file.kind) && Number.isSafeInteger(file.size) && file.size > 0, 'Invalid inventory file');
    assert(/^[0-9a-f]{64}$/.test(file.sha256), 'Invalid inventory hash');
    assert(typeof file.path === 'string' && /^[A-Za-z0-9_./-]+$/.test(file.path)
      && !file.path.startsWith('/') && !file.path.split('/').some((p) => !p || p === '.' || p === '..'), 'Unsafe inventory path');
  }
}

export function validateManifest(manifest) {
  assert(manifest?.schemaVersion === 1 && manifest.platform === 'windows-x64', 'Invalid support schema');
  assert(/^[0-9a-f]{40}$/.test(manifest.sourceSha) && /^\d+\.\d+\.\d+$/.test(manifest.productVersion), 'Invalid support identity');
  assert(Array.isArray(manifest.files) && manifest.files.length === payloadNames.length, 'Invalid support cardinality');
  assert(new Set(manifest.files.map((f) => f.path)).size === payloadNames.length, 'Duplicate support file');
  for (const file of manifest.files) {
    assert(payloadNames.includes(file.path), 'Unexpected support file');
    assert(Number.isSafeInteger(file.bytes) && file.bytes > 0 && file.bytes <= 2 * 1024 * 1024, 'Invalid support size');
    assert(/^[0-9a-f]{64}$/.test(file.sha256), 'Invalid support hash');
  }
}

export function createManifest(sourceSha, productVersion, files) {
  const manifest = { schemaVersion: 1, sourceSha, productVersion, platform: 'windows-x64', files };
  validateManifest(manifest);
  return manifest;
}

async function verifyDirectory(root) {
  const names = await readdir(root);
  assert(names.length === 13 && names.every((n) => payloadNames.includes(n) || n === 'support-manifest.json'), 'Unexpected package contents');
  const manifest = JSON.parse(await readFile(join(root, 'support-manifest.json'), 'utf8'));
  validateManifest(manifest);
  for (const record of manifest.files) {
    const path = join(root, record.path), stat = await lstat(path);
    assert(stat.isFile() && !stat.isSymbolicLink(), 'Support payload must be a regular file');
    const bytes = await readFile(path);
    assert(bytes.length === record.bytes && digest(bytes) === record.sha256, 'Support payload mismatch');
  }
  validateInventory(JSON.parse(await readFile(join(root, 'alhangeul-artifact-inventory.json'), 'utf8')));
}

async function buildSupport(inventoryPath, output) {
  assert(process.platform === 'win32', 'Support packaging requires Windows');
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
  validateInventory(inventory);
  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  const { version } = JSON.parse(await readFile(join(repo, 'package.json'), 'utf8'));
  await mkdir(output); // Fail closed on existing destinations; never replace a previous package.
  const files = [];
  for (const name of payloadNames) {
    const source = name === 'alhangeul-artifact-inventory.json' ? inventoryPath
      : name === 'WINDOWS_THUMBNAILS.md' ? join(repo, 'docs/architecture', name) : join(repo, 'scripts', name);
    const stat = await lstat(source);
    assert(stat.isFile() && !stat.isSymbolicLink(), 'Support source must be a regular file');
    const bytes = await readFile(source);
    files.push({ path: name, bytes: bytes.length, sha256: digest(bytes) });
    await copyFile(source, join(output, name), 1); // COPYFILE_EXCL
  }
  const manifest = createManifest(sourceSha, version, files);
  await writeFile(join(output, 'support-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  await verifyDirectory(output);
  console.log(`Windows thumbnail support verified: ${sourceSha}, ${files.length} payload files.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { inventory: { type: 'string' }, output: { type: 'string' } } });
    assert(values.inventory && values.output, '--inventory and --output are required');
    await buildSupport(resolve(values.inventory), resolve(values.output));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
