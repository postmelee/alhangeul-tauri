import { createHash, createPublicKey, verify } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { inspectArtifactFiles } from '../verify-desktop-artifacts.mjs';

export const UPDATER_TARGETS = Object.freeze({
  'windows-x86_64-nsis': Object.freeze({ kind: 'nsis', suffix: '-setup.exe' }),
  'windows-x86_64-msi': Object.freeze({ kind: 'msi', suffix: '.msi' }),
  'linux-x86_64-appimage': Object.freeze({ kind: 'appimage', suffix: '.AppImage' }),
});

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SAFE_FILENAME = /^[A-Za-z0-9._-]+$/;
const PRIVATE_PATH = /(?:^|\/)(?:.*(?:private|secret|password).*)$|\.(?:key|pem|p12|pfx)$/i;

export async function verifyUpdaterArtifactFiles({
  root,
  version,
  publicKey,
  targets = Object.keys(UPDATER_TARGETS),
  excludedPath = null,
}) {
  if (!SEMVER.test(version ?? '')) {
    throw new Error('updater artifact version은 stable semantic version이어야 합니다.');
  }
  const uniqueTargets = [...new Set(targets)];
  if (uniqueTargets.length !== targets.length || uniqueTargets.some((target) => !UPDATER_TARGETS[target])) {
    throw new Error('updater target 목록이 올바르지 않습니다.');
  }
  const rootPath = resolve(root);
  const rootStat = await lstat(rootPath);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error('updater artifact root는 실제 directory여야 합니다.');
  }
  const key = parsePublicKey(publicKey);
  const files = await inspectArtifactFiles(rootPath, excludedPath && resolve(excludedPath));
  const privatePath = files.find((file) => PRIVATE_PATH.test(file.path));
  if (privatePath) throw new Error(`private-key-like artifact를 허용하지 않습니다: ${privatePath.path}`);

  const entries = {};
  const expectedSignatures = new Set();
  for (const target of uniqueTargets) {
    const contract = UPDATER_TARGETS[target];
    const matches = files.filter((file) => acceptsUpdaterTarget(file.path, contract, version));
    if (matches.length !== 1) {
      throw new Error(`${target} installer cardinality가 1이 아닙니다: ${matches.length}`);
    }
    const artifact = matches[0];
    if (artifact.size <= 0) throw new Error(`${target} installer가 비어 있습니다.`);
    const signaturePath = `${artifact.path}.sig`;
    expectedSignatures.add(signaturePath);
    const signatures = files.filter((file) => file.path === signaturePath);
    if (signatures.length !== 1 || signatures[0].size <= 0) {
      throw new Error(`${target} signature cardinality가 1이 아닙니다.`);
    }
    const signature = (await readFile(resolve(rootPath, signaturePath), 'utf8')).trim();
    const bytes = await readFile(resolve(rootPath, artifact.path));
    verifyUpdaterSignature(bytes, signature, key);
    entries[target] = {
      kind: contract.kind,
      path: artifact.path,
      size: artifact.size,
      sha256: artifact.sha256,
      signature,
    };
  }
  const unexpectedSignature = files.find(
    (file) => file.path.endsWith('.sig') && !expectedSignatures.has(file.path),
  );
  if (unexpectedSignature) {
    throw new Error(`대응 installer가 없는 signature입니다: ${unexpectedSignature.path}`);
  }
  return { keyFingerprint: key.fingerprint, targets: entries };
}

export function acceptsUpdaterTarget(path, contract, version) {
  const filename = basename(path);
  return SAFE_FILENAME.test(filename) && filename.includes(version) && filename.endsWith(contract.suffix);
}

export function verifyUpdaterSignature(bytes, signature, publicKey) {
  const key = publicKey.publicKey ? publicKey : parsePublicKey(publicKey);
  const decoded = parseSignature(signature);
  if (!decoded.keyId.equals(key.keyId)) throw new Error('signature key id가 public key와 다릅니다.');
  const message = decoded.prehashed ? createHash('blake2b512').update(bytes).digest() : bytes;
  if (!verify(null, message, key.publicKey, decoded.signature)) {
    throw new Error('updater signature가 installer bytes와 일치하지 않습니다.');
  }
  const globalMessage = Buffer.concat([decoded.signature, Buffer.from(decoded.trustedComment)]);
  if (!verify(null, globalMessage, key.publicKey, decoded.globalSignature)) {
    throw new Error('updater signature trusted comment가 올바르지 않습니다.');
  }
}

export function validateUpdaterSignatureEncoding(signature) {
  parseSignature(signature);
}

export function publicKeyFingerprint(publicKey) {
  return parsePublicKey(publicKey).fingerprint;
}

function parsePublicKey(value) {
  const source = decodeOuterBase64(value, 'updater public key');
  if (/secret key|private key/i.test(source)) throw new Error('public key에 private material을 허용하지 않습니다.');
  const lines = source.trim().split(/\r?\n/);
  const packet = decodePacket(lines[1], 42, 'updater public key packet');
  if (lines.length !== 2 || !lines[0].startsWith('untrusted comment: ') || !['Ed', 'ED'].includes(packet.subarray(0, 2).toString())) {
    throw new Error('updater public key 형식이 올바르지 않습니다.');
  }
  const rawKey = packet.subarray(10);
  const spki = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), rawKey]);
  return {
    publicKey: createPublicKey({ key: spki, format: 'der', type: 'spki' }),
    keyId: packet.subarray(2, 10),
    fingerprint: createHash('sha256').update(packet).digest('hex'),
  };
}

function parseSignature(value) {
  const source = decodeOuterBase64(value, 'updater signature');
  const lines = source.trim().split(/\r?\n/);
  if (lines.length !== 4 || !lines[0].startsWith('untrusted comment: ') || !lines[2].startsWith('trusted comment: ')) {
    throw new Error('updater signature 형식이 올바르지 않습니다.');
  }
  const packet = decodePacket(lines[1], 74, 'updater signature packet');
  const globalSignature = decodePacket(lines[3], 64, 'updater global signature');
  const algorithm = packet.subarray(0, 2).toString();
  if (!['ED', 'Ed'].includes(algorithm)) throw new Error('updater signature algorithm이 올바르지 않습니다.');
  return {
    keyId: packet.subarray(2, 10),
    signature: packet.subarray(10),
    globalSignature,
    trustedComment: lines[2].slice('trusted comment: '.length),
    prehashed: algorithm === 'ED',
  };
}

function decodeOuterBase64(value, field) {
  if (typeof value !== 'string' || value.length < 16 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new Error(`${field}는 URL/path가 아닌 base64 내용이어야 합니다.`);
  }
  const decoded = Buffer.from(value, 'base64');
  if (decoded.toString('base64') !== value) throw new Error(`${field} base64가 canonical하지 않습니다.`);
  return decoded.toString('utf8');
}

function decodePacket(value, expectedLength, field) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new Error(`${field} base64가 올바르지 않습니다.`);
  }
  const packet = Buffer.from(value, 'base64');
  if (packet.length !== expectedLength || packet.toString('base64') !== value) {
    throw new Error(`${field} 길이 또는 base64가 올바르지 않습니다.`);
  }
  return packet;
}
