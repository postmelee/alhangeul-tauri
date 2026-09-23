#!/usr/bin/env node

import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT_ASSETS, assertInside, listSiteFiles } from './pages/site-files.mjs';
import { validateReleaseData } from './pages/release-data.mjs';
import { buildUpdaterManifest, serializeUpdaterManifest } from './updater/manifest.mjs';

const defaultRepositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const usage = 'Usage: node scripts/build-pages.mjs [--root <repository-root>]';
const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json']);

export async function buildPages(options = {}) {
  const layout = resolveLayout(options);
  await assertBuildLayout(layout);
  await assertOutputIsNotSymlink(layout.outputRoot);
  const sourceFiles = await listSiteFiles(layout.sourceRoot);
  const release = await readReleaseData(layout.sourceRoot);
  await verifyRootAssets(layout.repositoryRoot);
  assertNoRootAssetCollision(sourceFiles);

  await rm(layout.outputRoot, { recursive: true, force: true });
  await mkdir(layout.outputRoot, { recursive: true });

  for (const sitePath of sourceFiles) {
    const source = join(layout.sourceRoot, sitePath);
    const output = join(layout.outputRoot, sitePath);
    await mkdir(dirname(output), { recursive: true });
    if (TEXT_EXTENSIONS.has(extname(sitePath))) {
      const content = await readFile(source, 'utf8');
      await writeFile(output, normalizeRootAssetReferences(sitePath, content));
    } else {
      await copyFile(source, output);
    }
  }

  for (const assetPath of ROOT_ASSETS) {
    const output = join(layout.outputRoot, assetPath);
    await mkdir(dirname(output), { recursive: true });
    await copyFile(join(layout.repositoryRoot, assetPath), output);
  }

  if (release.updater.manifestPublished) {
    const manifest = buildUpdaterManifest(release);
    const output = join(layout.outputRoot, 'updater/stable.json');
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, serializeUpdaterManifest(manifest, release), 'utf8');
  }

  return {
    outputRoot: layout.outputRoot,
    sourceFiles: sourceFiles.length,
    rootAssets: ROOT_ASSETS.length,
  };
}

async function readReleaseData(sourceRoot) {
  try {
    const release = JSON.parse(await readFile(join(sourceRoot, 'release.json'), 'utf8'));
    return validateReleaseData(release, { allowManifestPublished: true });
  } catch (error) {
    throw new Error(`Pages release data를 검증할 수 없습니다: ${error.message}`);
  }
}

function assertNoRootAssetCollision(sourceFiles) {
  const collision = sourceFiles.find((sitePath) => ROOT_ASSETS.includes(sitePath));
  if (collision) {
    throw new Error(`Pages source가 승인된 root asset을 덮어쓸 수 없습니다: ${collision}`);
  }
}

export function resolveLayout(options = {}) {
  const repositoryRoot = resolve(options.repositoryRoot ?? defaultRepositoryRoot);
  if (options.sourceDirectory === '' || options.outputDirectory === '') {
    throw new Error('Pages source/output 경로는 비어 있을 수 없습니다.');
  }
  return {
    repositoryRoot,
    sourceRoot: resolve(options.sourceDirectory ?? join(repositoryRoot, 'site')),
    outputRoot: resolve(options.outputDirectory ?? join(repositoryRoot, '_site')),
  };
}

export async function assertBuildLayout(layout) {
  const repositoryStat = await lstat(layout.repositoryRoot);
  if (!repositoryStat.isDirectory() || repositoryStat.isSymbolicLink()) {
    throw new Error('repository root는 실제 directory여야 합니다.');
  }
  assertInside(layout.repositoryRoot, layout.sourceRoot, 'Pages source');
  assertInside(layout.repositoryRoot, layout.outputRoot, 'Pages output');
  if (
    layout.sourceRoot === layout.outputRoot
    || isInside(layout.sourceRoot, layout.outputRoot)
    || isInside(layout.outputRoot, layout.sourceRoot)
  ) {
    throw new Error('Pages source와 output은 서로 포함할 수 없습니다.');
  }
}

async function assertOutputIsNotSymlink(outputRoot) {
  try {
    const outputStat = await lstat(outputRoot);
    if (outputStat.isSymbolicLink()) {
      throw new Error('Pages output symlink는 삭제하거나 덮어쓸 수 없습니다.');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function verifyRootAssets(repositoryRoot) {
  for (const assetPath of ROOT_ASSETS) {
    const asset = join(repositoryRoot, assetPath);
    const assetStat = await lstat(asset);
    if (!assetStat.isFile() || assetStat.isSymbolicLink()) {
      throw new Error(`승인된 root asset이 일반 파일이 아닙니다: ${assetPath}`);
    }
  }
}

function normalizeRootAssetReferences(sitePath, content) {
  const depth = sitePath.split('/').length - 1;
  const sourcePrefix = `${'../'.repeat(depth + 1)}assets/`;
  const outputPrefix = `${'../'.repeat(depth)}assets/`;
  return content.replaceAll(sourcePrefix, outputPrefix);
}

function isInside(root, target) {
  try {
    assertInside(root, target, 'path');
    return true;
  } catch {
    return false;
  }
}

function parseArguments(args) {
  if (args.length === 0) return {};
  if (args.length === 1 && args[0] === '--help') return { help: true };
  if (args.length === 2 && args[0] === '--root' && args[1]) {
    return { repositoryRoot: resolve(args[1]) };
  }
  throw new Error(`지원하지 않는 인자입니다.\n${usage}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log(usage);
    else {
      const result = await buildPages(options);
      console.log(
        `Pages build completed: ${result.sourceFiles} source files, ${result.rootAssets} root assets`,
      );
    }
  } catch (error) {
    console.error(`Pages build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
