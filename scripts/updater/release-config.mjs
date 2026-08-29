#!/usr/bin/env node

import { lstat, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPDATER_ENDPOINT } from '../pages/release-data.mjs';
import { publicKeyFingerprint } from './release-inventory.mjs';

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const PLACEHOLDER = /example|placeholder|replace|changeme|test[-_ ]?key/i;
const CLI_OPTIONS = new Set(['--root', '--output', '--version', '--endpoint', '--public-key-env']);

export function buildUpdaterReleaseConfig({ version, endpoint, publicKey }) {
  if (!SEMVER.test(version ?? '')) {
    throw new Error('updater config version은 stable semantic version이어야 합니다.');
  }
  if (endpoint !== UPDATER_ENDPOINT) {
    throw new Error('updater config endpoint는 canonical stable HTTPS endpoint여야 합니다.');
  }
  if (PLACEHOLDER.test(publicKey ?? '')) {
    throw new Error('updater config에 placeholder public key를 허용하지 않습니다.');
  }
  const keyFingerprint = publicKeyFingerprint(publicKey);
  return {
    config: {
      version,
      bundle: {
        createUpdaterArtifacts: true,
      },
      plugins: {
        updater: {
          endpoints: [endpoint],
          pubkey: publicKey,
          windows: { installMode: 'passive' },
        },
      },
    },
    keyFingerprint,
  };
}

export async function writeUpdaterReleaseConfig({
  repositoryRoot,
  outputPath,
  version,
  endpoint,
  publicKey,
}) {
  const root = resolve(repositoryRoot);
  const output = resolve(outputPath);
  if (isInside(root, output)) {
    throw new Error('temporary updater config는 repository 밖에 작성해야 합니다.');
  }
  const parent = dirname(output);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const parentStat = await lstat(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    throw new Error('updater config output parent는 실제 directory여야 합니다.');
  }
  const result = buildUpdaterReleaseConfig({ version, endpoint, publicKey });
  await writeFile(output, `${JSON.stringify(result.config, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  });
  const outputStat = await stat(output);
  if (
    !outputStat.isFile()
    || (process.platform !== 'win32' && (outputStat.mode & 0o077) !== 0)
  ) {
    throw new Error('updater config output 권한이 안전하지 않습니다.');
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
      throw new Error(`올바르지 않은 updater config option입니다: ${option ?? '<missing>'}`);
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
    const result = await writeUpdaterReleaseConfig({
      repositoryRoot: args.get('--root'),
      outputPath: args.get('--output'),
      version: args.get('--version'),
      endpoint: args.get('--endpoint'),
      publicKey: process.env[publicKeyEnvironment],
    });
    console.log(`Updater release config created outside repository (key ${result.keyFingerprint})`);
  } catch (error) {
    console.error(`updater release config failed: ${error.message}`);
    process.exitCode = 1;
  }
}
