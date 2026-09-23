#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPDATER_REPOSITORY } from './release-inventory.mjs';
import {
  UPDATER_TARGETS,
  acceptsUpdaterTarget,
  validateUpdaterSignatureEncoding,
  verifyUpdaterArtifactFiles,
} from './artifact-verifier.mjs';
import {
  UPDATER_ACCEPTANCE_ENDPOINT,
  UPDATER_ACCEPTANCE_MANIFEST,
  acceptanceRole,
} from './acceptance-policy.mjs';

export const UPDATER_ACCEPTANCE_SCHEMA_VERSION = 1;
export const UPDATER_ACCEPTANCE_SCOPE = 'updater-acceptance';

const INVENTORY_KEYS = [
  'schemaVersion', 'scope', 'role', 'repository', 'sourceSha', 'version', 'endpoint',
  'releaseTag', 'keyFingerprint', 'targets',
];
const TARGET_KEYS = ['kind', 'path', 'url', 'size', 'sha256', 'signature'];
const MANIFEST_KEYS = ['version', 'notes', 'pub_date', 'platforms'];
const PLATFORM_KEYS = ['url', 'signature'];
const SOURCE_SHA = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const TEST_NOTES = 'TEST ONLY: Alhangeul updater native acceptance candidate.';
const CLI_OPTIONS = new Set([
  '--root', '--role', '--source-sha', '--source-timestamp', '--public-key-env',
  '--targets', '--write-inventory', '--write-manifest',
]);

export async function verifyUpdaterAcceptanceArtifacts({
  root,
  role,
  sourceSha,
  publicKey,
  targets = Object.keys(UPDATER_TARGETS),
  excludedPath = null,
}) {
  const contract = acceptanceRole(role);
  assertSourceSha(sourceSha);
  const result = await verifyUpdaterArtifactFiles({
    root,
    version: contract.version,
    publicKey,
    targets,
    excludedPath,
  });
  return {
    keyFingerprint: result.keyFingerprint,
    targets: addAcceptanceUrls(result.targets, contract),
  };
}

export async function createUpdaterAcceptanceInventory(options) {
  const targets = options.targets ?? Object.keys(UPDATER_TARGETS);
  if (targets.length !== Object.keys(UPDATER_TARGETS).length) {
    throw new Error('updater acceptance inventory는 세 target이 모두 필요합니다.');
  }
  const contract = acceptanceRole(options.role);
  const result = await verifyUpdaterAcceptanceArtifacts({ ...options, targets });
  return validateUpdaterAcceptanceInventory({
    schemaVersion: UPDATER_ACCEPTANCE_SCHEMA_VERSION,
    scope: UPDATER_ACCEPTANCE_SCOPE,
    role: options.role,
    repository: UPDATER_REPOSITORY,
    sourceSha: options.sourceSha,
    version: contract.version,
    endpoint: UPDATER_ACCEPTANCE_ENDPOINT,
    releaseTag: contract.releaseTag,
    keyFingerprint: result.keyFingerprint,
    targets: result.targets,
  });
}

export function validateUpdaterAcceptanceInventory(inventory) {
  assertRecord(inventory, 'updater acceptance inventory');
  assertExactKeys(inventory, INVENTORY_KEYS, 'updater acceptance inventory');
  const contract = acceptanceRole(inventory.role);
  if (inventory.schemaVersion !== UPDATER_ACCEPTANCE_SCHEMA_VERSION) {
    throw new Error('updater acceptance inventory schemaVersion이 올바르지 않습니다.');
  }
  if (inventory.scope !== UPDATER_ACCEPTANCE_SCOPE || inventory.repository !== UPDATER_REPOSITORY) {
    throw new Error('updater acceptance inventory scope 또는 repository가 다릅니다.');
  }
  assertSourceSha(inventory.sourceSha);
  if (
    inventory.version !== contract.version
    || inventory.endpoint !== UPDATER_ACCEPTANCE_ENDPOINT
    || inventory.releaseTag !== contract.releaseTag
  ) {
    throw new Error('updater acceptance identity가 승인된 test-only 계약과 다릅니다.');
  }
  if (!SHA256.test(inventory.keyFingerprint ?? '')) {
    throw new Error('updater acceptance key fingerprint가 올바르지 않습니다.');
  }
  assertRecord(inventory.targets, 'updater acceptance targets');
  assertExactKeys(inventory.targets, Object.keys(UPDATER_TARGETS), 'updater acceptance targets');
  const urls = new Set();
  for (const [target, targetContract] of Object.entries(UPDATER_TARGETS)) {
    const entry = inventory.targets[target];
    assertRecord(entry, target);
    assertExactKeys(entry, TARGET_KEYS, target);
    if (
      entry.kind !== targetContract.kind
      || !acceptsUpdaterTarget(entry.path, targetContract, contract.version)
    ) {
      throw new Error(`${target} kind 또는 path가 test-only 계약과 다릅니다.`);
    }
    const expectedUrl = contract.publish
      ? releaseAssetUrl(contract.releaseTag, basename(entry.path))
      : null;
    if (entry.url !== expectedUrl || (entry.url && urls.has(entry.url))) {
      throw new Error(`${target} acceptance URL이 올바르지 않습니다.`);
    }
    if (entry.url) urls.add(entry.url);
    if (!Number.isSafeInteger(entry.size) || entry.size <= 0) {
      throw new Error(`${target} size가 올바르지 않습니다.`);
    }
    if (!SHA256.test(entry.sha256 ?? '')) {
      throw new Error(`${target} digest 또는 signature가 올바르지 않습니다.`);
    }
    validateUpdaterSignatureEncoding(entry.signature);
  }
  return inventory;
}

export function buildUpdaterAcceptanceManifest(inventory, sourceTimestamp) {
  const verified = validateUpdaterAcceptanceInventory(inventory);
  if (verified.role !== 'n-plus-one') {
    throw new Error('updater acceptance manifest는 N+1 inventory에서만 만들 수 있습니다.');
  }
  const timestamp = normalizeTimestamp(sourceTimestamp);
  const manifest = {
    version: verified.version,
    notes: TEST_NOTES,
    pub_date: timestamp,
    platforms: Object.fromEntries(
      Object.entries(verified.targets).map(([target, entry]) => [
        target,
        { url: entry.url, signature: entry.signature },
      ]),
    ),
  };
  return validateUpdaterAcceptanceManifest(manifest, verified);
}

export function validateUpdaterAcceptanceManifest(manifest, inventory) {
  const verified = validateUpdaterAcceptanceInventory(inventory);
  assertRecord(manifest, 'updater acceptance manifest');
  assertExactKeys(manifest, MANIFEST_KEYS, 'updater acceptance manifest');
  if (
    verified.role !== 'n-plus-one'
    || manifest.version !== verified.version
    || manifest.notes !== TEST_NOTES
    || normalizeTimestamp(manifest.pub_date) !== manifest.pub_date
  ) {
    throw new Error('updater acceptance manifest identity가 올바르지 않습니다.');
  }
  assertRecord(manifest.platforms, 'updater acceptance manifest platforms');
  assertExactKeys(manifest.platforms, Object.keys(UPDATER_TARGETS), 'updater acceptance manifest platforms');
  for (const [target, expected] of Object.entries(verified.targets)) {
    const platform = manifest.platforms[target];
    assertRecord(platform, target);
    assertExactKeys(platform, PLATFORM_KEYS, target);
    if (platform.url !== expected.url || platform.signature !== expected.signature) {
      throw new Error(`${target} acceptance manifest가 inventory와 다릅니다.`);
    }
  }
  return manifest;
}

export function serializeUpdaterAcceptanceInventory(inventory) {
  return `${JSON.stringify(validateUpdaterAcceptanceInventory(inventory), null, 2)}\n`;
}

export function serializeUpdaterAcceptanceManifest(manifest, inventory) {
  return `${JSON.stringify(validateUpdaterAcceptanceManifest(manifest, inventory), null, 2)}\n`;
}

function addAcceptanceUrls(targets, contract) {
  return Object.fromEntries(Object.entries(targets).map(([target, entry]) => [
    target,
    {
      ...entry,
      url: contract.publish ? releaseAssetUrl(contract.releaseTag, basename(entry.path)) : null,
    },
  ]));
}

function releaseAssetUrl(tag, filename) {
  return `https://github.com/${UPDATER_REPOSITORY}/releases/download/${tag}/${filename}`;
}

function normalizeTimestamp(value) {
  const date = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(date.valueOf())) {
    throw new Error('updater acceptance source timestamp가 올바르지 않습니다.');
  }
  return date.toISOString();
}

function assertSourceSha(sourceSha) {
  if (!SOURCE_SHA.test(sourceSha ?? '')) {
    throw new Error('updater acceptance source SHA는 exact 40자리 lowercase SHA여야 합니다.');
  }
}

function assertRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field}는 object여야 합니다.`);
  }
}

function assertExactKeys(value, expected, field) {
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${field} key가 계약과 다릅니다.`);
  }
}

function parseArguments(args) {
  if (args[0] === '--') args = args.slice(1);
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (!CLI_OPTIONS.has(option) || !value || values.has(option)) {
      throw new Error(`올바르지 않은 updater acceptance option입니다: ${option ?? '<missing>'}`);
    }
    values.set(option, value);
  }
  return values;
}

async function writeExclusive(path, contents) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, contents, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArguments(process.argv.slice(2));
    const targets = args.get('--targets')?.split(',') ?? Object.keys(UPDATER_TARGETS);
    const options = {
      root: args.get('--root'),
      role: args.get('--role'),
      sourceSha: args.get('--source-sha'),
      publicKey: process.env[args.get('--public-key-env') ?? 'TAURI_UPDATER_PUBLIC_KEY'],
      targets,
    };
    const inventoryOutput = args.get('--write-inventory');
    if (!inventoryOutput) {
      if (args.get('--write-manifest')) {
        throw new Error('manifest를 쓰려면 complete acceptance inventory output이 필요합니다.');
      }
      const result = await verifyUpdaterAcceptanceArtifacts(options);
      console.log(`Updater acceptance artifacts verified: ${Object.keys(result.targets).join(', ')}`);
    } else {
      const inventory = await createUpdaterAcceptanceInventory({
        ...options,
        excludedPath: inventoryOutput,
      });
      await writeExclusive(resolve(inventoryOutput), serializeUpdaterAcceptanceInventory(inventory));
      const manifestOutput = args.get('--write-manifest');
      if (manifestOutput) {
        if (basename(manifestOutput) !== UPDATER_ACCEPTANCE_MANIFEST) {
          throw new Error('updater acceptance manifest filename이 test-only 계약과 다릅니다.');
        }
        const manifest = buildUpdaterAcceptanceManifest(inventory, args.get('--source-timestamp'));
        await writeExclusive(
          resolve(manifestOutput),
          serializeUpdaterAcceptanceManifest(manifest, inventory),
        );
      }
      console.log(`Updater acceptance inventory verified: ${inventory.role}`);
    }
  } catch (error) {
    console.error(`updater acceptance inventory failed: ${error.message}`);
    process.exitCode = 1;
  }
}
