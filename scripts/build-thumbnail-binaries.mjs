#!/usr/bin/env node

import { copyFile, mkdir, readFile, rename } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const WINDOWS_X64_TARGET = 'x86_64-pc-windows-msvc';
export const PE_MACHINE_X64 = 0x8664;
export const PE_DLL_FLAG = 0x2000;
export const STAGING_FILES = Object.freeze({
  handler: 'AlhangeulThumbnailHandler.dll',
  worker: 'AlhangeulThumbnailWorker.exe',
});

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function resolveBuildMode(platform, target) {
  if (platform === 'linux') return Object.freeze({ kind: 'skip' });
  if (platform !== 'win32') {
    throw new Error(`지원하지 않는 thumbnail build host입니다: ${platform}`);
  }
  const resolvedTarget = target ?? WINDOWS_X64_TARGET;
  if (resolvedTarget !== WINDOWS_X64_TARGET) {
    throw new Error(`지원하지 않는 thumbnail target입니다: ${resolvedTarget}`);
  }
  return Object.freeze({ kind: 'build', target: resolvedTarget });
}

export function createBuildPlan(root, target = WINDOWS_X64_TARGET) {
  const targetDirectory = join(root, 'apps/desktop/src-tauri/target');
  const stagingDirectory = join(
    root,
    'apps/desktop/src-tauri/windows/thumbnail-resources',
  );
  return Object.freeze({
    targetDirectory,
    stagingDirectory,
    commands: Object.freeze([
      Object.freeze([
        'build',
        '--manifest-path',
        'apps/thumbnail-worker/Cargo.toml',
        '--locked',
        '--bin',
        STAGING_FILES.worker.replace(/\.exe$/i, ''),
        '--release',
        '--target',
        target,
        '--target-dir',
        targetDirectory,
      ]),
      Object.freeze([
        'build',
        '--manifest-path',
        'apps/thumbnail-handler/Cargo.toml',
        '--locked',
        '--lib',
        '--release',
        '--target',
        target,
        '--target-dir',
        targetDirectory,
      ]),
    ]),
    outputs: Object.freeze([
      Object.freeze({
        kind: 'worker',
        source: join(
          targetDirectory,
          target,
          'release',
          STAGING_FILES.worker,
        ),
        destination: join(stagingDirectory, STAGING_FILES.worker),
        dll: false,
      }),
      Object.freeze({
        kind: 'handler',
        source: join(
          targetDirectory,
          target,
          'release',
          'alhangeul_thumbnail_handler.dll',
        ),
        destination: join(stagingDirectory, STAGING_FILES.handler),
        dll: true,
      }),
    ]),
  });
}

export function inspectPeImage(buffer, { dll }) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 64 || buffer.toString('ascii', 0, 2) !== 'MZ') {
    throw new Error('thumbnail binary에 DOS header가 없습니다.');
  }
  const peOffset = buffer.readUInt32LE(0x3c);
  if (peOffset + 24 > buffer.length || buffer.toString('ascii', peOffset, peOffset + 4) !== 'PE\0\0') {
    throw new Error('thumbnail binary에 PE header가 없습니다.');
  }
  const machine = buffer.readUInt16LE(peOffset + 4);
  const characteristics = buffer.readUInt16LE(peOffset + 22);
  if (machine !== PE_MACHINE_X64) {
    throw new Error(`thumbnail binary machine이 x64가 아닙니다: 0x${machine.toString(16)}`);
  }
  const isDll = (characteristics & PE_DLL_FLAG) !== 0;
  if (isDll !== dll) {
    throw new Error(`thumbnail binary DLL 구분이 일치하지 않습니다: expected=${dll}`);
  }
  return Object.freeze({ machine, dll: isDll });
}

export async function stageThumbnailBinaries(plan) {
  const inspected = [];
  for (const output of plan.outputs) {
    const contents = await readFile(output.source);
    inspected.push(Object.freeze({
      kind: output.kind,
      ...inspectPeImage(contents, { dll: output.dll }),
    }));
  }
  await mkdir(plan.stagingDirectory, { recursive: true });
  for (const output of plan.outputs) {
    const temporary = `${output.destination}.tmp`;
    await copyFile(output.source, temporary);
    await rename(temporary, output.destination);
  }
  return inspected;
}

function runCargo(root, args) {
  const result = spawnSync('cargo', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`cargo ${args.join(' ')} 실패: ${result.status}`);
  }
}

function parseArguments(args) {
  if (args.length === 0) return {};
  if (args.length === 2 && args[0] === '--target' && args[1]) {
    return { target: args[1] };
  }
  throw new Error('Usage: node scripts/build-thumbnail-binaries.mjs [--target <target>]');
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const mode = resolveBuildMode(process.platform, options.target);
  if (mode.kind === 'skip') {
    console.log('Windows thumbnail binary build skipped on Linux.');
    return;
  }
  const plan = createBuildPlan(repositoryRoot, mode.target);
  for (const command of plan.commands) runCargo(repositoryRoot, command);
  const inspected = await stageThumbnailBinaries(plan);
  console.log(`Windows thumbnail binaries staged: ${JSON.stringify(inspected)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
