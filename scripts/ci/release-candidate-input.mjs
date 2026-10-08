import assert from 'node:assert/strict';
import { readFile, appendFile, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const CONTRACTS = Object.freeze({
  nsis: ['alhangeul-updater-windows-x64', 'windows-x86_64-nsis'],
  msi: ['alhangeul-updater-windows-x64', 'windows-x86_64-msi'],
  appimage: ['alhangeul-updater-linux-x64', 'linux-x86_64-appimage'],
  rpm: ['alhangeul-desktop-linux-x64', 'linux-x64', 'rpm'],
  arm64: ['alhangeul-desktop-linux-arm64', 'linux-arm64', 'deb'],
});

export function validateIdentity(identity) {
  assert.ok(identity && typeof identity === 'object', 'candidate identity');
  assert.match(identity.sourceSha, SHA, 'exact source SHA');
  assert.match(identity.version, VERSION, 'stable version');
  assert.ok(Number.isSafeInteger(identity.producerRun) && identity.producerRun > 0, 'producer run');
  assert.match(identity.sha256, HASH, 'package SHA-256');
  return identity;
}

function validatePath(path) {
  assert.ok(typeof path === 'string' && path.length > 0, 'package path');
  assert.ok(!isAbsolute(path) && !path.includes('\\') && !path.includes(':') &&
    !/[\r\n]/.test(path) && path.split('/').every(part => part && part !== '.' && part !== '..'), 'safe package path');
}

export function validateCandidate(document, kind) {
  const contract = CONTRACTS[kind];
  assert.ok(contract, 'supported candidate kind');
  assert.equal(document.schemaVersion, 1, 'candidate schema');
  assert.equal(document.tag, `v${document.version}`, 'version/tag agreement');
  const candidate = document.candidates?.[kind];
  assert.ok(candidate, 'missing selected candidate');
  validateIdentity({ ...candidate, sourceSha: document.sourceSha, version: document.version });
  assert.equal(candidate.name, contract[0], 'artifact name');
  assert.ok(Number.isSafeInteger(candidate.id) && candidate.id > 0, 'artifact ID');
  assert.match(candidate.digest, /^sha256:[a-f0-9]{64}$/, 'archive digest');
  validatePath(candidate.path);
  const signed = kind === 'nsis' || kind === 'msi' || kind === 'appimage';
  const workflows = signed ? ['.github/workflows/alhangeul-desktop.yml'] :
    ['.github/workflows/ci.yml', '.github/workflows/alhangeul-desktop.yml'];
  assert.ok(workflows.includes(candidate.workflowPath), 'approved producer workflow');
  if (signed) {
    assert.equal(candidate.target, contract[1], 'updater target');
    assert.deepEqual(candidate.targets, kind === 'appimage' ? ['linux-x86_64-appimage'] :
      ['windows-x86_64-nsis', 'windows-x86_64-msi'], 'verified signed targets');
  } else {
    assert.equal(candidate.platform, contract[1], 'native platform');
    assert.equal(candidate.kind, contract[2], 'package kind');
  }
  return { productSha: document.sourceSha, version: document.version, tag: document.tag,
    producerRun: candidate.producerRun, workflowPath: candidate.workflowPath, candidate: { ...candidate } };
}

export async function loadCandidate(kind, fallback, path = process.env.RELEASE_CANDIDATE_PATH) {
  if (!path) return fallback;
  validatePath(path);
  assert.ok(!isAbsolute(path) && !relative(process.cwd(), resolve(path)).startsWith('..'), 'candidate JSON inside checkout');
  return validateCandidate(JSON.parse(await readFile(path, 'utf8')), kind);
}

export async function recordCandidateIdentity(selection, evidence) {
  const identity = validateIdentity({ sourceSha: selection.productSha, version: selection.version,
    producerRun: selection.producerRun, sha256: selection.candidate.sha256 });
  await writeFile(resolve(evidence, 'identity.json'), JSON.stringify(identity, null, 2));
  await appendFile(process.env.GITHUB_ENV, [
    `ALHANGEUL_GUI_BUILD_REF=${identity.sourceSha}`,
    `ALHANGEUL_GUI_NATIVE_RUN_ID=${identity.producerRun}`,
    `ALHANGEUL_GUI_APP_VERSION=${identity.version}`,
  ].join('\n') + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'identity JSON argument');
  const identity = validateIdentity(JSON.parse(await readFile(process.argv[2], 'utf8')));
  process.stdout.write(`${identity.sourceSha} ${identity.producerRun} ${identity.version} ${identity.sha256}\n`);
}
