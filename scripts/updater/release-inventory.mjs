#!/usr/bin/env node

import { createHash, createPublicKey, verify } from 'node:crypto';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectArtifactFiles } from '../verify-desktop-artifacts.mjs';

export const UPDATER_INVENTORY_SCHEMA_VERSION = 1;
export const UPDATER_REPOSITORY = 'postmelee/alhangeul-tauri';
export const UPDATER_TARGETS = Object.freeze({
  'windows-x86_64-nsis': Object.freeze({ kind: 'nsis', suffix: '-setup.exe' }),
  'windows-x86_64-msi': Object.freeze({ kind: 'msi', suffix: '.msi' }),
  'linux-x86_64-appimage': Object.freeze({ kind: 'appimage', suffix: '.AppImage' }),
});

const INVENTORY_KEYS = [
  'schemaVersion', 'repository', 'sourceSha', 'version', 'tag', 'keyFingerprint', 'targets',
];
const TARGET_KEYS = ['kind', 'path', 'url', 'size', 'sha256', 'signature'];
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SOURCE_SHA = /^[0-9a-f]{40}$/;
const SAFE_FILENAME = /^[A-Za-z0-9._-]+$/;
const PRIVATE_PATH = /(?:^|\/)(?:.*(?:private|secret|password).*)$|\.(?:key|pem|p12|pfx)$/i;
const CLI_OPTIONS = new Set([
  '--root', '--version', '--tag', '--source-sha', '--public-key-env', '--targets',
  '--write-inventory',
]);

export async function createReleaseInventory(options) {
  const targets = options.targets ?? Object.keys(UPDATER_TARGETS);
  const result = await verifyUpdaterArtifacts({ ...options, targets });
  if (targets.length !== Object.keys(UPDATER_TARGETS).length) {
    throw new Error('release inventory는 세 updater target이 모두 필요합니다.');
  }
  const inventory = {
    schemaVersion: UPDATER_INVENTORY_SCHEMA_VERSION,
    repository: UPDATER_REPOSITORY,
    sourceSha: options.sourceSha,
    version: options.version,
    tag: options.tag,
    keyFingerprint: result.keyFingerprint,
    targets: result.targets,
  };
  return validateReleaseInventory(inventory);
}

export async function verifyUpdaterArtifacts({
  root,
  version,
  tag,
  sourceSha,
  publicKey,
  targets = Object.keys(UPDATER_TARGETS),
  excludedPath = null,
}) {
  assertReleaseIdentity({ version, tag, sourceSha });
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
    const matches = files.filter((file) => acceptsTarget(file.path, contract, version));
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
    const filename = basename(artifact.path);
    entries[target] = {
      kind: contract.kind,
      path: artifact.path,
      url: releaseAssetUrl(tag, filename),
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

export function validateReleaseInventory(inventory) {
  assertRecord(inventory, 'release inventory');
  assertExactKeys(inventory, INVENTORY_KEYS, 'release inventory');
  if (inventory.schemaVersion !== UPDATER_INVENTORY_SCHEMA_VERSION) {
    throw new Error('release inventory schemaVersion이 올바르지 않습니다.');
  }
  if (inventory.repository !== UPDATER_REPOSITORY) throw new Error('release inventory repository가 다릅니다.');
  assertReleaseIdentity(inventory);
  if (!SHA256.test(inventory.keyFingerprint)) throw new Error('key fingerprint가 올바르지 않습니다.');
  assertRecord(inventory.targets, 'release inventory targets');
  assertExactKeys(inventory.targets, Object.keys(UPDATER_TARGETS), 'release inventory targets');
  const urls = new Set();
  for (const [target, contract] of Object.entries(UPDATER_TARGETS)) {
    const entry = inventory.targets[target];
    assertRecord(entry, target);
    assertExactKeys(entry, TARGET_KEYS, target);
    if (entry.kind !== contract.kind || !acceptsTarget(entry.path, contract, inventory.version)) {
      throw new Error(`${target} kind 또는 path가 올바르지 않습니다.`);
    }
    const expectedUrl = releaseAssetUrl(inventory.tag, basename(entry.path));
    if (entry.url !== expectedUrl || urls.has(entry.url)) throw new Error(`${target} exact release URL이 올바르지 않습니다.`);
    urls.add(entry.url);
    if (!Number.isSafeInteger(entry.size) || entry.size <= 0) throw new Error(`${target} size가 올바르지 않습니다.`);
    if (!SHA256.test(entry.sha256)) throw new Error(`${target} SHA-256이 올바르지 않습니다.`);
    parseSignature(entry.signature);
  }
  if (containsPrivateMaterial(inventory)) throw new Error('release inventory에 private material을 허용하지 않습니다.');
  return inventory;
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

export function serializeReleaseInventory(inventory) {
  return `${JSON.stringify(validateReleaseInventory(inventory), null, 2)}\n`;
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
  if (
    typeof value !== 'string'
    || value.length < 16
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
  ) {
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

function acceptsTarget(path, contract, version) {
  const filename = basename(path);
  return SAFE_FILENAME.test(filename) && filename.includes(version) && filename.endsWith(contract.suffix);
}

function releaseAssetUrl(tag, filename) {
  return `https://github.com/${UPDATER_REPOSITORY}/releases/download/${tag}/${filename}`;
}

function assertReleaseIdentity({ version, tag, sourceSha }) {
  if (!SEMVER.test(version ?? '')) throw new Error('release version은 stable semantic version이어야 합니다.');
  if (tag !== `v${version}`) throw new Error('release tag가 version과 일치하지 않습니다.');
  if (!SOURCE_SHA.test(sourceSha ?? '')) throw new Error('source SHA는 exact 40자리 lowercase SHA여야 합니다.');
}

function assertRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${field}는 object여야 합니다.`);
}

function assertExactKeys(value, expected, field) {
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${field} key가 계약과 다릅니다.`);
  }
}

function containsPrivateMaterial(value) {
  return Object.entries(value).some(([key, child]) =>
    /private|password|secret/i.test(key)
    || (child && typeof child === 'object' && containsPrivateMaterial(child)));
}

function parseArguments(args) {
  if (args[0] === '--') args = args.slice(1);
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (!CLI_OPTIONS.has(option) || !value || values.has(option)) throw new Error(`올바르지 않은 updater inventory option입니다: ${option ?? '<missing>'}`);
    values.set(option, value);
  }
  return values;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArguments(process.argv.slice(2));
    const targets = args.get('--targets')?.split(',') ?? Object.keys(UPDATER_TARGETS);
    const options = {
      root: args.get('--root'),
      version: args.get('--version'),
      tag: args.get('--tag'),
      sourceSha: args.get('--source-sha'),
      publicKey: process.env[args.get('--public-key-env') ?? 'TAURI_UPDATER_PUBLIC_KEY'],
      targets,
      excludedPath: args.get('--write-inventory'),
    };
    if (args.get('--write-inventory')) {
      const inventory = await createReleaseInventory(options);
      const outputPath = resolve(args.get('--write-inventory'));
      await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
      await writeFile(outputPath, serializeReleaseInventory(inventory), { flag: 'wx', mode: 0o600 });
      console.log(`Updater release inventory verified: ${Object.keys(inventory.targets).join(', ')}`);
    } else {
      const result = await verifyUpdaterArtifacts(options);
      console.log(`Updater artifacts verified: ${Object.keys(result.targets).join(', ')}`);
    }
  } catch (error) {
    console.error(`updater release inventory failed: ${error.message}`);
    process.exitCode = 1;
  }
}
