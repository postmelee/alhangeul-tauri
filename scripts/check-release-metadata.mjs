#!/usr/bin/env node

import { lstat, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyProductVersion } from './check-product-version.mjs';

const defaultRepositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const usage = 'Usage: node scripts/check-release-metadata.mjs [--root <repository-root>]';

export const RELEASE_METADATA_CONTRACT = Object.freeze({
  productName: 'Alhangeul',
  rootPackageName: 'alhangeul-tauri',
  desktopPackageName: 'alhangeul-desktop',
  identifier: 'io.github.postmelee.alhangeul',
  publisher: 'postmelee',
  description: 'Alhangeul desktop app for HWP and HWPX documents',
  shortDescription: 'Open desktop editor for HWP and HWPX documents',
  longDescription:
    'Alhangeul opens and edits HWP/HWPX documents, saves HWP/HWPX documents, and exports PDF files.',
  category: 'Productivity',
  copyright: 'Alhangeul contributors',
  license: 'MIT',
  wixTemplate: 'windows/main.wxs',
  linuxDesktopTemplate: 'linux/main.desktop',
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
  const versionResult = await verifyProductVersion({ repositoryRoot });
  const linuxDesktopPath =
    `apps/desktop/src-tauri/${RELEASE_METADATA_CONTRACT.linuxDesktopTemplate}`;
  const [
    rootPackage,
    desktopPackage,
    tauriConfig,
    cargoSource,
    linuxDesktopSource,
  ] = await Promise.all([
    readJson(repositoryRoot, 'package.json'),
    readJson(repositoryRoot, 'apps/desktop/package.json'),
    readJson(repositoryRoot, 'apps/desktop/src-tauri/tauri.conf.json'),
    readSource(repositoryRoot, 'apps/desktop/src-tauri/Cargo.toml'),
    readSource(repositoryRoot, linuxDesktopPath, { requireRegularFile: true }),
  ]);
  const cargoPackage = readCargoPackage(cargoSource);
  const path = 'apps/desktop/src-tauri/tauri.conf.json';

  assertEqual('package.json', 'name', rootPackage.name, RELEASE_METADATA_CONTRACT.rootPackageName);
  assertEqual('package.json', 'description', rootPackage.description, RELEASE_METADATA_CONTRACT.description);
  assertEqual('package.json', 'license', rootPackage.license, RELEASE_METADATA_CONTRACT.license);
  assertEqual('apps/desktop/package.json', 'name', desktopPackage.name, RELEASE_METADATA_CONTRACT.desktopPackageName);
  assertEqual('apps/desktop/package.json', 'description', desktopPackage.description, RELEASE_METADATA_CONTRACT.description);
  assertEqual('apps/desktop/src-tauri/Cargo.toml', 'package.name', cargoPackage.name, RELEASE_METADATA_CONTRACT.desktopPackageName);
  assertEqual('apps/desktop/src-tauri/Cargo.toml', 'package.version', cargoPackage.version, versionResult.version);
  assertEqual('apps/desktop/src-tauri/Cargo.toml', 'package.description', cargoPackage.description, RELEASE_METADATA_CONTRACT.description);
  assertEqual('apps/desktop/src-tauri/Cargo.toml', 'package.license', cargoPackage.license, RELEASE_METADATA_CONTRACT.license);
  assertEqual(path, 'productName', tauriConfig.productName, RELEASE_METADATA_CONTRACT.productName);
  assertEqual(path, 'identifier', tauriConfig.identifier, RELEASE_METADATA_CONTRACT.identifier);
  assertEqual(path, 'app.windows[0].title', tauriConfig.app?.windows?.[0]?.title, RELEASE_METADATA_CONTRACT.productName);
  assertEqual(path, 'bundle.active', tauriConfig.bundle?.active, true);
  assertEqual(path, 'bundle.targets', tauriConfig.bundle?.targets, 'all');
  assertEqual(path, 'bundle.publisher', tauriConfig.bundle?.publisher, RELEASE_METADATA_CONTRACT.publisher);
  assertEqual(path, 'bundle.shortDescription', tauriConfig.bundle?.shortDescription, RELEASE_METADATA_CONTRACT.shortDescription);
  assertEqual(path, 'bundle.longDescription', tauriConfig.bundle?.longDescription, RELEASE_METADATA_CONTRACT.longDescription);
  assertEqual(path, 'bundle.category', tauriConfig.bundle?.category, RELEASE_METADATA_CONTRACT.category);
  assertEqual(path, 'bundle.copyright', tauriConfig.bundle?.copyright, RELEASE_METADATA_CONTRACT.copyright);
  assertEqual(path, 'bundle.windows.wix.template', tauriConfig.bundle?.windows?.wix?.template, RELEASE_METADATA_CONTRACT.wixTemplate);
  assertEqual(path, 'bundle.linux.deb.desktopTemplate', tauriConfig.bundle?.linux?.deb?.desktopTemplate, RELEASE_METADATA_CONTRACT.linuxDesktopTemplate);
  assertEqual(path, 'bundle.linux.rpm.desktopTemplate', tauriConfig.bundle?.linux?.rpm?.desktopTemplate, RELEASE_METADATA_CONTRACT.linuxDesktopTemplate);
  assertAssociations(path, tauriConfig.bundle?.fileAssociations);
  verifyLinuxDesktopEntrySource(linuxDesktopSource);
  assertUpdaterDisabled(rootPackage, desktopPackage, tauriConfig, cargoSource);

  return {
    productName: tauriConfig.productName,
    version: versionResult.version,
    identifier: tauriConfig.identifier,
    fileAssociations: tauriConfig.bundle.fileAssociations.map(({ ext }) => ext[0]),
  };
}

export function verifyLinuxDesktopEntrySource(source) {
  const path = 'apps/desktop/src-tauri/linux/main.desktop';
  const lines = source.split(/\r?\n/);
  const requiredLines = [
    '[Desktop Entry]',
    'Categories={{categories}}',
    'Comment={{comment}}',
    'StartupWMClass={{exec}}',
    'Icon={{icon}}',
    'Name={{name}}',
    'Terminal=false',
    'Type=Application',
  ];
  for (const line of requiredLines) {
    if (!lines.includes(line)) {
      throw new Error(`${path} 필수 줄이 없습니다: ${line}`);
    }
  }
  assertEqual(
    path,
    'Exec',
    source.match(/^Exec=.*$/gm) ?? [],
    ['Exec={{exec}} %F'],
  );
  assertEqual(
    path,
    'file field code',
    source.match(/%[fFuU]/g) ?? [],
    ['%F'],
  );
  if (!/{{#if mime_type}}\r?\nMimeType={{mime_type}}\r?\n{{\/if}}/.test(source)) {
    throw new Error(`${path} MIME 조건부 출력이 필요합니다.`);
  }
}

function assertAssociations(path, associations) {
  if (!Array.isArray(associations)) {
    throw new Error(`${path} bundle.fileAssociations 배열이 필요합니다.`);
  }
  assertEqual(path, 'bundle.fileAssociations.length', associations.length, RELEASE_METADATA_CONTRACT.fileAssociations.length);
  for (const expected of RELEASE_METADATA_CONTRACT.fileAssociations) {
    const actual = associations.find(({ ext }) => Array.isArray(ext) && ext.length === 1 && ext[0] === expected.ext[0]);
    if (!actual) throw new Error(`${path} bundle.fileAssociations에 ${expected.ext[0]} 항목이 필요합니다.`);
    for (const field of ['ext', 'name', 'description', 'mimeType']) {
      assertEqual(path, `${expected.ext[0]}.${field}`, actual[field], expected[field]);
    }
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
      packageSource.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"`, 'm'))?.[1],
    ]),
  );
}

function assertUpdaterDisabled(rootPackage, desktopPackage, tauriConfig, cargoSource) {
  const dependencyNames = [rootPackage, desktopPackage]
    .flatMap((pkg) => ['dependencies', 'devDependencies', 'optionalDependencies']
      .flatMap((field) => Object.keys(pkg[field] ?? {})));
  if (dependencyNames.includes('@tauri-apps/plugin-updater') || /\btauri-plugin-updater\b/.test(cargoSource)) {
    throw new Error('release metadata에 updater dependency를 허용하지 않습니다.');
  }
  if (containsUpdaterKey(tauriConfig)) {
    throw new Error('Tauri release metadata에 updater 설정을 허용하지 않습니다.');
  }
}

function containsUpdaterKey(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    key.toLowerCase() === 'updater'
    || key === 'createUpdaterArtifacts'
    || containsUpdaterKey(child));
}

async function readJson(repositoryRoot, path) {
  const source = await readSource(repositoryRoot, path);
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${path} JSON parse 실패: ${error.message}`);
  }
}

async function readSource(repositoryRoot, path, options = {}) {
  try {
    const filePath = resolve(repositoryRoot, path);
    if (options.requireRegularFile && !(await lstat(filePath)).isFile()) {
      throw new Error('일반 파일이 아닙니다.');
    }
    return await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`${path}을 읽을 수 없습니다: ${error.message}`);
  }
}

function assertEqual(path, field, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  throw new Error(`${path} ${field} 값이 다릅니다: ${JSON.stringify(actual)} (expected ${JSON.stringify(expected)})`);
}

function parseArguments(args) {
  if (args.length === 0) return { repositoryRoot: defaultRepositoryRoot };
  if (args.length === 1 && args[0] === '--help') return { help: true };
  if (args.length === 2 && args[0] === '--root' && args[1]) return { repositoryRoot: resolve(args[1]) };
  throw new Error(`지원하지 않는 인자입니다.\n${usage}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log(usage);
    else {
      const result = await verifyReleaseMetadata(options);
      console.log(`Release metadata check passed: ${result.productName} ${result.version}`);
    }
  } catch (error) {
    console.error(`release metadata check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
