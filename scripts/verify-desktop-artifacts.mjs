#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import {
  dirname,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

export const INVENTORY_SCHEMA_VERSION = 1;
export const INVENTORY_FILENAME = 'alhangeul-artifact-inventory.json';
export const PLATFORM_REQUIREMENTS = Object.freeze({
  'windows-x64': Object.freeze(['msi', 'nsis']),
  'linux-x64': Object.freeze(['appimage', 'deb', 'rpm']),
  'linux-arm64': Object.freeze(['deb']),
});

const SUPPORTED_OPTIONS = new Set([
  '--platform',
  '--root',
  '--write-inventory',
  '--verify-inventory',
]);

export async function verifyDesktopArtifacts({
  platform,
  root,
  writeInventoryPath,
  verifyInventoryPath,
}) {
  const requiredKinds = PLATFORM_REQUIREMENTS[platform];
  if (!requiredKinds) {
    throw new Error(
      `지원하지 않는 desktop artifact platform입니다: ${platform ?? '<missing>'}`,
    );
  }
  if (typeof root !== 'string' || root === '') {
    throw new Error('bundle root 경로가 필요합니다.');
  }
  if (writeInventoryPath && verifyInventoryPath) {
    throw new Error(
      '--write-inventory와 --verify-inventory는 동시에 사용할 수 없습니다.',
    );
  }

  const rootPath = resolve(root);
  let rootStat;
  try {
    rootStat = await lstat(rootPath);
  } catch (error) {
    throw new Error(`bundle root를 읽을 수 없습니다: ${rootPath}: ${error.message}`);
  }
  if (!rootStat.isDirectory()) {
    throw new Error(`bundle root가 디렉터리가 아닙니다: ${rootPath}`);
  }
  if (rootStat.isSymbolicLink()) {
    throw new Error(`bundle root는 symbolic link일 수 없습니다: ${rootPath}`);
  }

  const excludedInventoryPath = writeInventoryPath ?? verifyInventoryPath;
  const excludedPath = excludedInventoryPath
    ? resolve(excludedInventoryPath)
    : null;
  const files = await inspectFiles(rootPath, excludedPath);
  assertArtifactContract(platform, requiredKinds, files);

  const inventory = {
    schemaVersion: INVENTORY_SCHEMA_VERSION,
    platform,
    requiredKinds: [...requiredKinds],
    files,
  };
  const serialized = serializeInventory(inventory);

  if (writeInventoryPath) {
    const outputPath = resolve(writeInventoryPath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized, 'utf8');
  }

  if (verifyInventoryPath) {
    const inventoryPath = resolve(verifyInventoryPath);
    let expected;
    try {
      expected = await readFile(inventoryPath, 'utf8');
    } catch (error) {
      throw new Error(
        `artifact inventory를 읽을 수 없습니다: ${inventoryPath}: ${error.message}`,
      );
    }

    if (expected !== serialized) {
      throw new Error(
        `artifact inventory가 현재 bundle과 일치하지 않습니다: ${inventoryPath}`,
      );
    }
  }

  return inventory;
}

export function serializeInventory(inventory) {
  return `${JSON.stringify(inventory, null, 2)}\n`;
}

async function inspectFiles(rootPath, excludedPath) {
  const files = [];
  await walk(rootPath, rootPath, excludedPath, files);
  files.sort((left, right) => compareText(left.path, right.path));
  return files;
}

async function walk(rootPath, directory, excludedPath, files) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => compareText(left.name, right.name));

  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);
    if (excludedPath && absolutePath === excludedPath) {
      continue;
    }
    if (entry.isSymbolicLink()) {
      throw new Error(
        `desktop artifact에 symbolic link를 허용하지 않습니다: ${toRelativePath(rootPath, absolutePath)}`,
      );
    }
    if (entry.isDirectory()) {
      await walk(rootPath, absolutePath, excludedPath, files);
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(
        `지원하지 않는 desktop artifact 파일 유형입니다: ${toRelativePath(rootPath, absolutePath)}`,
      );
    }

    const fileStat = await lstat(absolutePath);
    const path = toRelativePath(rootPath, absolutePath);
    files.push({
      path,
      kind: classifyArtifact(path),
      size: fileStat.size,
      sha256: await sha256File(absolutePath),
    });
  }
}

function assertArtifactContract(platform, requiredKinds, files) {
  for (const requiredKind of requiredKinds) {
    const matches = files.filter((file) => file.kind === requiredKind);
    if (matches.length === 0) {
      throw new Error(
        `${platform} artifact에 필수 bundle 종류가 없습니다: ${requiredKind}`,
      );
    }
    const empty = matches.find((file) => file.size === 0);
    if (empty) {
      throw new Error(
        `${platform} 필수 bundle이 비어 있습니다: ${empty.path}`,
      );
    }
  }
}

function classifyArtifact(path) {
  const normalized = path.toLowerCase();
  const segments = normalized.split('/');

  if (normalized.endsWith('.msi')) return 'msi';
  if (normalized.endsWith('.exe') && segments.includes('nsis')) return 'nsis';
  if (normalized.endsWith('.deb')) return 'deb';
  if (normalized.endsWith('.rpm')) return 'rpm';
  if (normalized.endsWith('.appimage')) return 'appimage';
  return 'other';
}

function toRelativePath(rootPath, absolutePath) {
  const path = relative(rootPath, absolutePath);
  if (
    path === ''
    || path === '..'
    || path.startsWith(`..${sep}`)
  ) {
    throw new Error(`artifact 경로가 bundle root를 벗어났습니다: ${absolutePath}`);
  }
  return path.split(sep).join('/');
}

async function sha256File(path) {
  const hash = createHash('sha256');
  const input = createReadStream(path);
  for await (const chunk of input) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function parseArguments(argv) {
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  if (args.includes('--help')) {
    return { help: true };
  }

  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (!SUPPORTED_OPTIONS.has(option)) {
      throw new Error(`지원하지 않는 option입니다: ${option}`);
    }
    if (values.has(option)) {
      throw new Error(`option을 중복 지정할 수 없습니다: ${option}`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${option} 값이 필요합니다.`);
    }
    values.set(option, value);
    index += 1;
  }

  return {
    platform: values.get('--platform'),
    root: values.get('--root'),
    writeInventoryPath: values.get('--write-inventory'),
    verifyInventoryPath: values.get('--verify-inventory'),
  };
}

function formatInventory(inventory) {
  const lines = [
    `desktop artifacts verified: ${inventory.platform}`,
    `required kinds: ${inventory.requiredKinds.join(', ')}`,
  ];
  for (const file of inventory.files) {
    lines.push(
      `${file.kind}\t${file.size}\t${file.sha256}\t${file.path}`,
    );
  }
  return lines.join('\n');
}

function usage() {
  return [
    'Usage:',
    '  node scripts/verify-desktop-artifacts.mjs \\',
    '    --platform <windows-x64|linux-x64|linux-arm64> \\',
    '    --root <bundle-root> \\',
    '    [--write-inventory <json-path> | --verify-inventory <json-path>]',
  ].join('\n');
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const inventory = await verifyDesktopArtifacts(options);
  console.log(formatInventory(inventory));
}

const isMain = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error(`desktop artifact verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
