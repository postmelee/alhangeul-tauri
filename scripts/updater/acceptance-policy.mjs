#!/usr/bin/env node

import { lstat, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicKeyFingerprint } from './artifact-verifier.mjs';

export const UPDATER_ACCEPTANCE_N_VERSION = '99.1.0';
export const UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION = '99.1.1';
export const UPDATER_ACCEPTANCE_TAG = 'updater-test-v99.1.1';
export const UPDATER_ACCEPTANCE_TITLE =
  '[TEST ONLY] Alhangeul Updater Acceptance 99.1.0 → 99.1.1';
export const UPDATER_ACCEPTANCE_ENDPOINT =
  'https://github.com/postmelee/alhangeul-tauri/releases/download/updater-test-v99.1.1/alhangeul-updater-test.json';
export const UPDATER_ACCEPTANCE_INVENTORY = 'alhangeul-updater-test-inventory.json';
export const UPDATER_ACCEPTANCE_MANIFEST = 'alhangeul-updater-test.json';

export const UPDATER_ACCEPTANCE_ROLES = Object.freeze({
  n: Object.freeze({
    version: UPDATER_ACCEPTANCE_N_VERSION,
    releaseTag: null,
    publish: false,
  }),
  'n-plus-one': Object.freeze({
    version: UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION,
    releaseTag: UPDATER_ACCEPTANCE_TAG,
    publish: true,
  }),
});

const PLACEHOLDER = /example|placeholder|replace|changeme|test[-_ ]?key/i;
const CLI_OPTIONS = new Set(['--root', '--output', '--role', '--public-key-env']);

export function acceptanceRole(role) {
  const contract = UPDATER_ACCEPTANCE_ROLES[role];
  if (!contract) throw new Error('updater acceptance role은 n 또는 n-plus-one이어야 합니다.');
  return contract;
}

export function buildUpdaterAcceptanceConfig({ role, publicKey }) {
  const contract = acceptanceRole(role);
  if (PLACEHOLDER.test(publicKey ?? '')) {
    throw new Error('updater acceptance config에 placeholder public key를 허용하지 않습니다.');
  }
  const keyFingerprint = publicKeyFingerprint(publicKey);
  return {
    config: {
      version: contract.version,
      bundle: { createUpdaterArtifacts: true },
      plugins: {
        updater: {
          endpoints: [UPDATER_ACCEPTANCE_ENDPOINT],
          pubkey: publicKey,
          windows: { installMode: 'passive' },
        },
      },
    },
    keyFingerprint,
  };
}

export async function writeUpdaterAcceptanceConfig({
  repositoryRoot,
  outputPath,
  role,
  publicKey,
}) {
  const root = resolve(repositoryRoot);
  const output = resolve(outputPath);
  if (isInside(root, output)) {
    throw new Error('temporary updater acceptance config는 repository 밖에 작성해야 합니다.');
  }
  const parent = dirname(output);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const parentStat = await lstat(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    throw new Error('updater acceptance config output parent는 실제 directory여야 합니다.');
  }
  const result = buildUpdaterAcceptanceConfig({ role, publicKey });
  await writeFile(output, `${JSON.stringify(result.config, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  });
  const outputStat = await stat(output);
  if (!outputStat.isFile() || (process.platform !== 'win32' && (outputStat.mode & 0o077) !== 0)) {
    throw new Error('updater acceptance config output 권한이 안전하지 않습니다.');
  }
  return { outputPath: output, keyFingerprint: result.keyFingerprint };
}

function isInside(root, target) {
  const path = relative(root, target);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !path.startsWith('/'));
}

function parseArguments(args) {
  if (args[0] === '--') args = args.slice(1);
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (!CLI_OPTIONS.has(option) || !value || values.has(option)) {
      throw new Error(`올바르지 않은 updater acceptance config option입니다: ${option ?? '<missing>'}`);
    }
    values.set(option, value);
  }
  return values;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArguments(process.argv.slice(2));
    const publicKeyEnvironment = args.get('--public-key-env') ?? 'TAURI_UPDATER_PUBLIC_KEY';
    const result = await writeUpdaterAcceptanceConfig({
      repositoryRoot: args.get('--root'),
      outputPath: args.get('--output'),
      role: args.get('--role'),
      publicKey: process.env[publicKeyEnvironment],
    });
    console.log(`Updater acceptance config created outside repository (key ${result.keyFingerprint})`);
  } catch (error) {
    console.error(`updater acceptance config failed: ${error.message}`);
    process.exitCode = 1;
  }
}
