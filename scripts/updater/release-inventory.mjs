#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  UPDATER_TARGETS,
  acceptsUpdaterTarget,
  publicKeyFingerprint,
  validateUpdaterSignatureEncoding,
  verifyUpdaterArtifactFiles,
  verifyUpdaterSignature,
} from './artifact-verifier.mjs';

export {
  UPDATER_TARGETS,
  publicKeyFingerprint,
  verifyUpdaterArtifactFiles,
  verifyUpdaterSignature,
};

export const UPDATER_INVENTORY_SCHEMA_VERSION = 1;
export const UPDATER_REPOSITORY = 'postmelee/alhangeul-tauri';

const INVENTORY_KEYS = [
  'schemaVersion', 'repository', 'sourceSha', 'version', 'tag', 'keyFingerprint', 'targets',
];
const TARGET_KEYS = ['kind', 'path', 'url', 'size', 'sha256', 'signature'];
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SOURCE_SHA = /^[0-9a-f]{40}$/;
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
  const result = await verifyUpdaterArtifactFiles({
    root,
    version,
    publicKey,
    targets,
    excludedPath,
  });
  const entries = Object.fromEntries(
    Object.entries(result.targets).map(([target, entry]) => [
      target,
      { ...entry, url: releaseAssetUrl(tag, basename(entry.path)) },
    ]),
  );
  return { keyFingerprint: result.keyFingerprint, targets: entries };
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
    if (entry.kind !== contract.kind || !acceptsUpdaterTarget(entry.path, contract, inventory.version)) {
      throw new Error(`${target} kind 또는 path가 올바르지 않습니다.`);
    }
    const expectedUrl = releaseAssetUrl(inventory.tag, basename(entry.path));
    if (entry.url !== expectedUrl || urls.has(entry.url)) throw new Error(`${target} exact release URL이 올바르지 않습니다.`);
    urls.add(entry.url);
    if (!Number.isSafeInteger(entry.size) || entry.size <= 0) throw new Error(`${target} size가 올바르지 않습니다.`);
    if (!SHA256.test(entry.sha256)) throw new Error(`${target} SHA-256이 올바르지 않습니다.`);
    validateUpdaterSignatureEncoding(entry.signature);
  }
  if (containsPrivateMaterial(inventory)) throw new Error('release inventory에 private material을 허용하지 않습니다.');
  return inventory;
}

export function serializeReleaseInventory(inventory) {
  return `${JSON.stringify(validateReleaseInventory(inventory), null, 2)}\n`;
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
