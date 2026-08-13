#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const RHWP_SYNC_ALLOWED_PATHS = Object.freeze([
  'README.md',
  'apps/desktop/src-tauri/Cargo.lock',
  'apps/studio-host/src/core/upstream-boundary.test.ts',
  'apps/studio-host/vendor/rhwp-core/LICENSE',
  'apps/studio-host/vendor/rhwp-core/package.json',
  'apps/studio-host/vendor/rhwp-core/rhwp.d.ts',
  'apps/studio-host/vendor/rhwp-core/rhwp.js',
  'apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm',
  'apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm.d.ts',
  'docs/DEVELOPMENT.md',
  'docs/architecture/UPSTREAM.md',
  'rhwp-core.lock',
  'tests/rhwp-pin.test.mjs',
  'third_party/rhwp',
]);

export async function verifyRhwpSyncChanges(options = {}) {
  const repositoryRoot = resolve(options.repositoryRoot ?? '.');
  const output = options.output;
  if (typeof output !== 'string' || output.length === 0) {
    throw new Error('--output 경로가 필요합니다.');
  }
  const execute = options.run ?? run;
  const status = execute('git', ['status', '--porcelain=v1', '--untracked-files=all'], repositoryRoot);
  const diff = execute('git', ['diff', '--name-only', '--'], repositoryRoot);
  const untracked = execute('git', ['ls-files', '--others', '--exclude-standard'], repositoryRoot);
  const changedPaths = validateRhwpSyncChanges({ status, diff, untracked });
  execute('git', ['diff', '--check'], repositoryRoot);
  await (options.writeFile ?? writeFile)(resolve(output), `${changedPaths.join('\n')}\n`);
  return changedPaths;
}

export function validateRhwpSyncChanges({ status = '', diff = '', untracked = '' }) {
  const allowed = new Set(RHWP_SYNC_ALLOWED_PATHS);
  for (const record of lines(status)) {
    const path = record.slice(3);
    if (!allowed.has(path)) throw new Error(`Changed path is not allowed: ${path}`);
  }
  const changedPaths = [...new Set([...lines(diff), ...lines(untracked)])].sort();
  if (changedPaths.length === 0) throw new Error('Upstream sync produced no changes.');
  for (const path of changedPaths) {
    if (!allowed.has(path)) throw new Error(`Changed path is not allowed: ${path}`);
  }
  return changedPaths;
}

function lines(source) {
  return source.split(/\r?\n/).filter(Boolean);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  if (result.error) throw new Error(`${command} 실행 실패: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`${command} ${args[0]} 실패 (${result.status}): ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

function parseArguments(args) {
  if (args.length === 2 && args[0] === '--output' && args[1]) return { output: args[1] };
  throw new Error('Usage: node scripts/verify-rhwp-sync-changes.mjs --output <path>');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const paths = await verifyRhwpSyncChanges(parseArguments(process.argv.slice(2)));
    console.log(`rhwp sync changed paths verified: ${paths.length}`);
  } catch (error) {
    console.error(`rhwp sync changed paths failed: ${error.message}`);
    process.exitCode = 1;
  }
}
