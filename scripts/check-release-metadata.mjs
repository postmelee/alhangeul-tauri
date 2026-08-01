#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRepositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
);
const usage =
  'Usage: node scripts/check-release-metadata.mjs [--root <repository-root>]';

export const RELEASE_METADATA_CONTRACT = Object.freeze({
  productName: 'Alhangeul',
  rootPackageName: 'alhangeul-tauri',
  desktopPackageName: 'alhangeul-desktop',
  identifier: 'io.github.postmelee.alhangeul',
  publisher: 'postmelee',
  description: 'Alhangeul desktop app for HWP and HWPX documents',
  shortDescription: 'Open desktop editor for HWP and HWPX documents',
  longDescription:
    'Alhangeul opens and edits HWP/HWPX documents, saves HWP documents, and exports PDF files.',
  category: 'Productivity',
  copyright: 'Alhangeul contributors',
  license: 'MIT',
  wixTemplate: 'windows/main.wxs',
  fileAssociations: Object.freeze([
    Object.freeze({
      ext: Object.freeze(['hwp']),
      name: 'Alhangeul.hwp',
      description: 'Hangul Word Processor document',
      mimeType: 'application/x-hwp',
    }),
    Object.freeze({
      ext: Object.freeze(['hwpx']),
      name: 'Alhangeul.hwpx',
      description: 'Hangul Word Processor XML document',
      mimeType: 'application/vnd.hancom.hwpx',
    }),
  ]),
});

export async function verifyReleaseMetadata(options = {}) {
  const repositoryRoot = resolve(options.repositoryRoot ?? defaultRepositoryRoot);
  const [rootPackage, desktopPackage, tauriConfig, cargoSource] =
    await Promise.all([
      readJson(repositoryRoot, 'package.json'),
      readJson(repositoryRoot, 'apps/desktop/package.json'),
      readJson(repositoryRoot, 'apps/desktop/src-tauri/tauri.conf.json'),
      readRepositoryFile(
        repositoryRoot,
        'apps/desktop/src-tauri/Cargo.toml',
      ),
    ]);
  const cargoPackage = readCargoPackage(cargoSource);

  assertEqual('package.json', 'name', rootPackage.name, RELEASE_METADATA_CONTRACT.rootPackageName);
  assertEqual('package.json', 'description', rootPackage.description, RELEASE_METADATA_CONTRACT.description);
  assertEqual('package.json', 'license', rootPackage.license, RELEASE_METADATA_CONTRACT.license);
  assertString('package.json', 'version', rootPackage.version);

  assertEqual(
    'apps/desktop/package.json',
    'name',
    desktopPackage.name,
    RELEASE_METADATA_CONTRACT.desktopPackageName,
  );
  assertEqual(
    'apps/desktop/package.json',
    'version',
    desktopPackage.version,
    rootPackage.version,
  );
  assertEqual(
    'apps/desktop/package.json',
    'description',
    desktopPackage.description,
    RELEASE_METADATA_CONTRACT.description,
  );

  const cargoPath = 'apps/desktop/src-tauri/Cargo.toml';
  assertEqual(cargoPath, 'package.name', cargoPackage.name, RELEASE_METADATA_CONTRACT.desktopPackageName);
  assertEqual(cargoPath, 'package.version', cargoPackage.version, rootPackage.version);
  assertEqual(cargoPath, 'package.description', cargoPackage.description, RELEASE_METADATA_CONTRACT.description);
  assertEqual(cargoPath, 'package.license', cargoPackage.license, RELEASE_METADATA_CONTRACT.license);

  const tauriPath = 'apps/desktop/src-tauri/tauri.conf.json';
  assertEqual(tauriPath, 'productName', tauriConfig.productName, RELEASE_METADATA_CONTRACT.productName);
  assertEqual(tauriPath, 'version', tauriConfig.version, rootPackage.version);
  assertEqual(tauriPath, 'identifier', tauriConfig.identifier, RELEASE_METADATA_CONTRACT.identifier);
  assertEqual(tauriPath, 'app.windows[0].title', tauriConfig.app?.windows?.[0]?.title, RELEASE_METADATA_CONTRACT.productName);
  assertEqual(tauriPath, 'bundle.active', tauriConfig.bundle?.active, true);
  assertEqual(tauriPath, 'bundle.targets', tauriConfig.bundle?.targets, 'all');
  assertEqual(tauriPath, 'bundle.publisher', tauriConfig.bundle?.publisher, RELEASE_METADATA_CONTRACT.publisher);
  assertEqual(tauriPath, 'bundle.shortDescription', tauriConfig.bundle?.shortDescription, RELEASE_METADATA_CONTRACT.shortDescription);
  assertEqual(tauriPath, 'bundle.longDescription', tauriConfig.bundle?.longDescription, RELEASE_METADATA_CONTRACT.longDescription);
  assertEqual(tauriPath, 'bundle.category', tauriConfig.bundle?.category, RELEASE_METADATA_CONTRACT.category);
  assertEqual(tauriPath, 'bundle.copyright', tauriConfig.bundle?.copyright, RELEASE_METADATA_CONTRACT.copyright);
  assertEqual(tauriPath, 'bundle.windows.wix.template', tauriConfig.bundle?.windows?.wix?.template, RELEASE_METADATA_CONTRACT.wixTemplate);
  assertFileAssociations(tauriPath, tauriConfig.bundle?.fileAssociations);
  assertUpdaterDisabled(rootPackage, desktopPackage, tauriConfig, cargoSource);

  return {
    productName: tauriConfig.productName,
    version: rootPackage.version,
    identifier: tauriConfig.identifier,
    publisher: tauriConfig.bundle.publisher,
    fileAssociations: tauriConfig.bundle.fileAssociations.map(
      (association) => association.ext[0],
    ),
  };
}

async function readJson(repositoryRoot, path) {
  const source = await readRepositoryFile(repositoryRoot, path);
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${path} JSON parse 실패: ${error.message}`);
  }
}

async function readRepositoryFile(repositoryRoot, path) {
  try {
    return await readFile(resolve(repositoryRoot, path), 'utf8');
  } catch (error) {
    throw new Error(`${path}을 읽을 수 없습니다: ${error.message}`);
  }
}

function readCargoPackage(source) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === '[package]');
  if (start === -1) {
    throw new Error('apps/desktop/src-tauri/Cargo.toml에 [package] table이 필요합니다.');
  }
  const block = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s*\[/.test(lines[index])) break;
    block.push(lines[index]);
  }
  const packageSource = block.join('\n');
  return Object.fromEntries(
    ['name', 'version', 'description', 'license'].map((key) => [
      key,
      readTomlString(packageSource, key),
    ]),
  );
}

function readTomlString(source, key) {
  const pattern = new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"\\s*(?:#.*)?$`, 'gm');
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) return undefined;
  return matches[0][1];
}

function assertFileAssociations(path, associations) {
  if (!Array.isArray(associations)) {
    throw new Error(`${path} bundle.fileAssociations 배열이 필요합니다.`);
  }
  if (associations.length !== RELEASE_METADATA_CONTRACT.fileAssociations.length) {
    throw new Error(
      `${path} bundle.fileAssociations 개수가 다릅니다: `
        + `${associations.length} (expected ${RELEASE_METADATA_CONTRACT.fileAssociations.length})`,
    );
  }

  for (const expected of RELEASE_METADATA_CONTRACT.fileAssociations) {
    const actual = associations.find(
      (association) =>
        Array.isArray(association.ext)
        && association.ext.length === 1
        && association.ext[0] === expected.ext[0],
    );
    if (!actual) {
      throw new Error(
        `${path} bundle.fileAssociations에 ${expected.ext[0]} 항목이 필요합니다.`,
      );
    }
    assertEqual(path, `${expected.ext[0]}.ext`, actual.ext, expected.ext);
    for (const field of ['name', 'description', 'mimeType']) {
      assertEqual(path, `${expected.ext[0]}.${field}`, actual[field], expected[field]);
    }
  }
}

function assertUpdaterDisabled(rootPackage, desktopPackage, tauriConfig, cargoSource) {
  const dependencyNames = [
    ...readDependencyNames(rootPackage),
    ...readDependencyNames(desktopPackage),
  ];
  if (dependencyNames.includes('@tauri-apps/plugin-updater')) {
    throw new Error('package metadata에 updater dependency를 허용하지 않습니다.');
  }
  if (/\btauri-plugin-updater\b/.test(cargoSource)) {
    throw new Error(
      'apps/desktop/src-tauri/Cargo.toml에 updater dependency를 허용하지 않습니다.',
    );
  }
  if (hasUpdaterKey(tauriConfig)) {
    throw new Error(
      'apps/desktop/src-tauri/tauri.conf.json에 updater 설정을 허용하지 않습니다.',
    );
  }
}

function readDependencyNames(packageJson) {
  return ['dependencies', 'devDependencies', 'optionalDependencies']
    .flatMap((field) => Object.keys(packageJson[field] ?? {}));
}

function hasUpdaterKey(value) {
  if (!value || typeof value !== 'object') return false;
  for (const [key, child] of Object.entries(value)) {
    if (key.toLowerCase() === 'updater' || key === 'createUpdaterArtifacts') {
      return true;
    }
    if (hasUpdaterKey(child)) return true;
  }
  return false;
}

function assertString(path, field, value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${path} ${field} 문자열이 필요합니다.`);
  }
}

function assertEqual(path, field, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  throw new Error(
    `${path} ${field} 값이 다릅니다: `
      + `${JSON.stringify(actual)} (expected ${JSON.stringify(expected)})`,
  );
}

function parseArguments(argv) {
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  if (args.length === 0) return { repositoryRoot: defaultRepositoryRoot };
  if (args.length === 1 && args[0] === '--help') return { help: true };
  if (args.length === 2 && args[0] === '--root' && args[1]) {
    return { repositoryRoot: resolve(args[1]) };
  }
  throw new Error(`지원하지 않는 인자입니다.\n${usage}`);
}

const isMain = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log(usage);
    } else {
      const result = await verifyReleaseMetadata(options);
      console.log(
        `Release metadata check passed: ${result.productName} ${result.version}`,
      );
    }
  } catch (error) {
    console.error(`release metadata check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
