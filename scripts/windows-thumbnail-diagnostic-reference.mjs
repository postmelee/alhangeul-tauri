import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REFERENCE_NAME = 'thumbnail-diagnostic-reference.json';
export const REFERENCE_FILES = Object.freeze([
  'AlhangeulThumbnailHandler.dll', 'AlhangeulThumbnailWorker.exe',
]);
export const MAX_REFERENCE_BYTES = 4096;
const MAX_BINARY_BYTES = 128 * 1024 * 1024;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assert = (value, code) => { if (!value) throw new Error(code); };
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function exactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

export function validateReference(reference) {
  assert(exactKeys(reference, ['schemaVersion', 'sourceSha', 'productVersion', 'files']), 'reference-shape');
  assert(reference.schemaVersion === 1, 'reference-schema');
  assert(typeof reference.sourceSha === 'string' && /^[0-9a-f]{40}$/.test(reference.sourceSha), 'reference-source');
  assert(typeof reference.productVersion === 'string' && /^\d+\.\d+\.\d+$/.test(reference.productVersion), 'reference-version');
  assert(Array.isArray(reference.files) && reference.files.length === 2, 'reference-files');
  for (const [index, file] of reference.files.entries()) {
    assert(exactKeys(file, ['name', 'bytes', 'sha256']), 'reference-file-shape');
    assert(file.name === REFERENCE_FILES[index], 'reference-file-name');
    assert(Number.isSafeInteger(file.bytes) && file.bytes > 0 && file.bytes <= MAX_BINARY_BYTES, 'reference-file-size');
    assert(typeof file.sha256 === 'string' && /^[0-9a-f]{64}$/.test(file.sha256), 'reference-file-hash');
  }
  return reference;
}

export function createReference(identity, binaries) {
  assert(Array.isArray(binaries) && binaries.length === 2 && binaries.every(Buffer.isBuffer), 'reference-binaries');
  return validateReference({
    schemaVersion: 1, sourceSha: identity.sourceSha, productVersion: identity.productVersion,
    files: binaries.map((bytes, index) => ({ name: REFERENCE_FILES[index], bytes: bytes.length, sha256: sha256(bytes) })),
  });
}

export function verifyReference(reference, identity, binaries) {
  validateReference(reference);
  assert(reference.sourceSha === identity.sourceSha, 'reference-source-mismatch');
  assert(reference.productVersion === identity.productVersion, 'reference-version-mismatch');
  const actual = createReference(identity, binaries);
  for (const [index, expected] of reference.files.entries()) {
    assert(expected.bytes === actual.files[index].bytes && expected.sha256 === actual.files[index].sha256,
      'reference-binary-mismatch');
  }
  return reference;
}

async function readRegularFile(directory, name, limit) {
  const directoryStat = await lstat(directory);
  assert(directoryStat.isDirectory() && !directoryStat.isSymbolicLink(), 'reference-directory');
  const location = join(directory, name);
  const stat = await lstat(location);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= limit, 'reference-regular-file');
  assert(dirname(await realpath(location)) === await realpath(directory), 'reference-file-location');
  const bytes = await readFile(location);
  assert(bytes.length === stat.size, 'reference-file-changed');
  return bytes;
}

export async function readVerifiedReference(directory, identity) {
  const encoded = await readRegularFile(directory, REFERENCE_NAME, MAX_REFERENCE_BYTES);
  let reference;
  try { reference = JSON.parse(encoded.toString('utf8')); } catch { throw new Error('reference-json'); }
  const binaries = await Promise.all(REFERENCE_FILES.map((name) => readRegularFile(directory, name, MAX_BINARY_BYTES)));
  return verifyReference(reference, identity, binaries);
}

export async function stageDiagnosticReference(directory, identity) {
  const binaries = await Promise.all(REFERENCE_FILES.map((name) => readRegularFile(directory, name, MAX_BINARY_BYTES)));
  const reference = createReference(identity, binaries);
  // This is generated build output inside the existing thumbnail staging folder.
  const temporary = join(directory, `${REFERENCE_NAME}.${process.pid}.tmp`);
  await writeFile(temporary, `${JSON.stringify(reference, null, 2)}\n`, { flag: 'wx' });
  await rename(temporary, join(directory, REFERENCE_NAME));
  await readVerifiedReference(directory, identity);
  return reference;
}

export async function repositoryIdentity(repository) {
  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repository, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const { version: productVersion } = JSON.parse(await readFile(join(repository, 'package.json'), 'utf8'));
  return { sourceSha, productVersion };
}

// Build tooling only. Never called by the installed application's diagnostics.
async function main(args) {
  assert(process.platform === 'win32', 'reference-requires-windows');
  assert(args.length === 0, 'reference-arguments');
  const reference = await readVerifiedReference(
    join(root, 'apps/desktop/src-tauri/windows/thumbnail-resources'), await repositoryIdentity(root),
  );
  process.stdout.write(`${JSON.stringify(reference)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(() => {
    console.error('Windows thumbnail diagnostic reference verification failed.');
    process.exitCode = 1;
  });
}
