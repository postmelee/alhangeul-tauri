#!/usr/bin/env node

import { chmod, copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const LINUX_TARGETS = Object.freeze({
  'x86_64-unknown-linux-gnu': Object.freeze({ architecture: 'x64', machine: 62 }),
  'aarch64-unknown-linux-gnu': Object.freeze({ architecture: 'arm64', machine: 183 }),
});
export const LINUX_THUMBNAILER_FILENAME = 'alhangeul-thumbnailer';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function createBuildPlan(root, target, outputDirectory, repositorySha) {
  const contract = LINUX_TARGETS[target];
  if (!contract) throw new Error(`지원하지 않는 Linux thumbnail target입니다: ${target}`);
  if (!/^[0-9a-f]{40}$/.test(repositorySha)) {
    throw new Error('repository SHA는 소문자 40자리여야 합니다.');
  }
  const targetDirectory = join(root, 'apps/desktop/src-tauri/target');
  return Object.freeze({
    target,
    architecture: contract.architecture,
    machine: contract.machine,
    repositorySha,
    outputDirectory,
    source: join(targetDirectory, target, 'release', LINUX_THUMBNAILER_FILENAME),
    destination: join(outputDirectory, LINUX_THUMBNAILER_FILENAME),
    summary: join(outputDirectory, 'linux-thumbnailer-summary.json'),
    command: Object.freeze([
      'build',
      '--manifest-path',
      'apps/linux-thumbnailer/Cargo.toml',
      '--locked',
      '--release',
      '--target',
      target,
      '--target-dir',
      targetDirectory,
    ]),
  });
}

export function inspectElfImage(buffer, expectedMachine) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 64) {
    throw new Error('Linux thumbnailer ELF header가 없습니다.');
  }
  if (!buffer.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) {
    throw new Error('Linux thumbnailer ELF magic이 올바르지 않습니다.');
  }
  if (buffer[4] !== 2 || buffer[5] !== 1 || buffer[6] !== 1) {
    throw new Error('Linux thumbnailer는 ELF64 little-endian current 형식이어야 합니다.');
  }
  const type = buffer.readUInt16LE(16);
  const machine = buffer.readUInt16LE(18);
  if (![2, 3].includes(type)) throw new Error(`Linux thumbnailer ELF type이 잘못됐습니다: ${type}`);
  if (machine !== expectedMachine) {
    throw new Error(`Linux thumbnailer machine 불일치: ${machine} != ${expectedMachine}`);
  }
  return Object.freeze({ type, machine });
}

export async function stageLinuxThumbnailer(plan) {
  const contents = await readFile(plan.source);
  const inspected = inspectElfImage(contents, plan.machine);
  const sourceStat = await stat(plan.source);
  if (process.platform !== 'win32' && (sourceStat.mode & 0o111) === 0) {
    throw new Error('Linux thumbnailer가 실행 가능하지 않습니다.');
  }
  await mkdir(plan.outputDirectory, { recursive: true });
  const temporary = `${plan.destination}.tmp`;
  await copyFile(plan.source, temporary);
  await chmod(temporary, 0o755);
  await rename(temporary, plan.destination);
  const summary = Object.freeze({
    schemaVersion: 1,
    kind: 'alhangeul-linux-thumbnailer',
    repositorySha: plan.repositorySha,
    target: plan.target,
    architecture: plan.architecture,
    elfType: inspected.type,
    elfMachine: inspected.machine,
    bytes: contents.length,
    sha256: createHash('sha256').update(contents).digest('hex'),
  });
  await writeFile(plan.summary, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  return summary;
}

function runCargo(root, args) {
  const result = spawnSync('cargo', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`cargo ${args.join(' ')} 실패: ${result.status}`);
}

export function parseArguments(argv) {
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!value || !['--target', '--output', '--repository-sha'].includes(name)) {
      throw new Error(
        'Usage: node scripts/build-linux-thumbnailer.mjs --target <target> --output <dir> --repository-sha <sha>',
      );
    }
    if (options[name]) throw new Error(`중복 인자입니다: ${name}`);
    options[name] = value;
  }
  if (args.length !== 6) throw new Error('Linux thumbnailer build 인자 세 개가 필요합니다.');
  return options;
}

async function main() {
  if (process.platform !== 'linux') throw new Error('Linux host에서만 build할 수 있습니다.');
  const options = parseArguments(process.argv.slice(2));
  const plan = createBuildPlan(
    repositoryRoot,
    options['--target'],
    resolve(options['--output']),
    options['--repository-sha'],
  );
  runCargo(repositoryRoot, plan.command);
  const summary = await stageLinuxThumbnailer(plan);
  console.log(`Linux thumbnailer staged: ${JSON.stringify(summary)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
