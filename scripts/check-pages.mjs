#!/usr/bin/env node

import { readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReleaseData } from './pages/release-data.mjs';
import { ROOT_ASSETS, listSiteFiles } from './pages/site-files.mjs';
import { buildUpdaterManifest, serializeUpdaterManifest } from './updater/manifest.mjs';

const defaultRepositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const usage = 'Usage: node scripts/check-pages.mjs [--mode source|output|all] [--root <repository-root>]';
const TEXT_EXTENSIONS = /\.(?:css|html|js|json)$/;
const REQUIRED_SITE_FILES = Object.freeze([
  'index.html',
  'updates/index.html',
  'feedback/index.html',
  'release.json',
]);
const DIRECT_DOWNLOAD = /https:\/\/github\.com\/postmelee\/alhangeul-tauri\/releases\/download\//i;
const ATTRIBUTE_REFERENCE = /\b(?:href|src)\s*=\s*(["'])(.*?)\1/gis;
const CSS_REFERENCE = /url\(\s*(["']?)(.*?)\1\s*\)/gis;

export async function checkPages(options = {}) {
  const repositoryRoot = resolve(options.repositoryRoot ?? defaultRepositoryRoot);
  const mode = options.mode ?? 'all';
  if (!['source', 'output', 'all'].includes(mode)) {
    throw new Error(`지원하지 않는 Pages 검사 mode입니다: ${mode}`);
  }

  const summaries = [];
  if (mode === 'source' || mode === 'all') {
    summaries.push(await checkTree({
      repositoryRoot,
      treeRoot: join(repositoryRoot, 'site'),
      mode: 'source',
    }));
  }
  if (mode === 'output' || mode === 'all') {
    summaries.push(await checkTree({
      repositoryRoot,
      treeRoot: join(repositoryRoot, '_site'),
      mode: 'output',
    }));
  }
  return summaries;
}

async function checkTree(context) {
  const files = await listSiteFiles(context.treeRoot, {
    allowUpdaterManifest: context.mode === 'output',
  });
  const fileSet = new Set(files);
  const missingFiles = REQUIRED_SITE_FILES.filter((path) => !fileSet.has(path));
  if (missingFiles.length > 0) {
    throw new Error(`${context.mode} tree에 필수 Pages 파일이 없습니다: ${missingFiles.join(', ')}`);
  }
  const release = await readReleaseData(context.treeRoot);
  validateReleaseData(release, { allowManifestPublished: true });
  await assertUpdaterManifest(context, fileSet, release);
  const referencedAssets = new Set();
  for (const sitePath of files.filter((path) => TEXT_EXTENSIONS.test(path))) {
    const content = await readFile(join(context.treeRoot, sitePath), 'utf8');
    if (release.status === 'unreleased' && DIRECT_DOWNLOAD.test(content)) {
      throw new Error(`unreleased Pages에 direct download URL이 있습니다: ${sitePath}`);
    }
    if (sitePath.endsWith('.html')) assertImageMetadata(sitePath, content);
    for (const reference of extractReferences(content, sitePath)) {
      const asset = await assertReference(context, sitePath, reference);
      if (asset) referencedAssets.add(asset);
    }
  }

  if (context.mode === 'output') {
    const actualAssets = files.filter((path) => path.startsWith('assets/')).sort();
    const sourceAssets = (await listSiteFiles(join(context.repositoryRoot, 'site')))
      .filter((path) => path.startsWith('assets/'));
    const expectedAssets = [...new Set([...ROOT_ASSETS, ...sourceAssets])].sort();
    if (JSON.stringify(actualAssets) !== JSON.stringify(expectedAssets)) {
      throw new Error('Pages output asset inventory가 승인 목록과 다릅니다.');
    }
  } else {
    for (const asset of referencedAssets) {
      if (!ROOT_ASSETS.includes(asset)) {
        throw new Error(`승인되지 않은 root asset 참조입니다: ${asset}`);
      }
    }
  }

  return { mode: context.mode, files: files.length, status: release.status };
}

async function assertUpdaterManifest(context, fileSet, release) {
  const sitePath = 'updater/stable.json';
  const exists = fileSet.has(sitePath);
  if (context.mode === 'source' && exists) {
    throw new Error('updater manifest는 source tree에 둘 수 없습니다.');
  }
  if (!release.updater.manifestPublished) {
    if (exists) throw new Error('manifestPublished=false인데 updater manifest가 있습니다.');
    return;
  }
  if (context.mode === 'source') return;
  if (!exists) throw new Error('manifestPublished=true인데 updater manifest가 없습니다.');
  const expected = serializeUpdaterManifest(buildUpdaterManifest(release), release);
  const actual = await readFile(join(context.treeRoot, sitePath), 'utf8');
  if (actual !== expected) throw new Error('updater manifest가 검증된 release inventory와 다릅니다.');
}

async function readReleaseData(treeRoot) {
  const path = join(treeRoot, 'release.json');
  let source;
  try {
    source = await readFile(path, 'utf8');
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`release.json을 읽을 수 없습니다: ${error.message}`);
  }
}

function extractReferences(content, sitePath) {
  const references = [];
  if (sitePath.endsWith('.html')) {
    for (const match of content.matchAll(ATTRIBUTE_REFERENCE)) references.push(match[2]);
  }
  if (sitePath.endsWith('.css') || sitePath.endsWith('.html')) {
    for (const match of content.matchAll(CSS_REFERENCE)) references.push(match[2]);
  }
  return references;
}

async function assertReference(context, sitePath, rawReference) {
  const reference = rawReference.trim();
  if (!reference) return null;
  if (reference.startsWith('#')) {
    await assertFragment(join(context.treeRoot, sitePath), sitePath, reference);
    return null;
  }
  if (reference.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(reference)) {
    if (!reference.startsWith('https://') && !reference.startsWith('mailto:')) {
      throw new Error(`허용되지 않은 URL protocol입니다: ${sitePath} -> ${reference}`);
    }
    return null;
  }
  if (reference.startsWith('/')) {
    throw new Error(`project Pages에는 root-relative URL을 허용하지 않습니다: ${sitePath}`);
  }

  let cleanReference;
  try {
    cleanReference = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
  } catch {
    throw new Error(`URL encoding이 올바르지 않습니다: ${sitePath} -> ${reference}`);
  }
  if (!cleanReference) return null;
  const target = resolve(dirname(join(context.treeRoot, sitePath)), cleanReference);
  if (isInside(context.treeRoot, target)) {
    await assertTargetExists(target, sitePath, reference);
    await assertFragment(target, sitePath, reference);
    return null;
  }
  if (context.mode !== 'source' || !isInside(context.repositoryRoot, target)) {
    throw new Error(`Pages tree를 벗어난 URL입니다: ${sitePath} -> ${reference}`);
  }
  const repositoryPath = relative(context.repositoryRoot, target).split(sep).join('/');
  if (!ROOT_ASSETS.includes(repositoryPath)) {
    throw new Error(`승인되지 않은 root URL입니다: ${sitePath} -> ${reference}`);
  }
  await assertTargetExists(target, sitePath, reference);
  return repositoryPath;
}

async function assertTargetExists(target, sitePath, reference) {
  try {
    const targetStat = await stat(target);
    if (targetStat.isDirectory()) await stat(join(target, 'index.html'));
    else if (!targetStat.isFile()) throw new Error('not a regular file');
  } catch (error) {
    throw new Error(`깨진 내부 URL입니다: ${sitePath} -> ${reference} (${error.message})`);
  }
}

async function assertFragment(target, sitePath, reference) {
  const hashIndex = reference.indexOf('#');
  if (hashIndex === -1 || hashIndex === reference.length - 1) return;

  let fragment;
  try {
    fragment = decodeURIComponent(reference.slice(hashIndex + 1));
  } catch {
    throw new Error(`URL encoding이 올바르지 않습니다: ${sitePath} -> ${reference}`);
  }

  let htmlPath = target;
  try {
    if ((await stat(target)).isDirectory()) htmlPath = join(target, 'index.html');
    if (!htmlPath.endsWith('.html')) {
      throw new Error('HTML 파일이 아닌 대상에는 hash를 사용할 수 없습니다.');
    }
    const content = await readFile(htmlPath, 'utf8');
    const ids = [...content.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gis)]
      .map((match) => match[2]);
    if (!ids.includes(fragment)) throw new Error(`id="${fragment}"를 찾을 수 없습니다.`);
  } catch (error) {
    throw new Error(`깨진 내부 hash입니다: ${sitePath} -> ${reference} (${error.message})`);
  }
}

function assertImageMetadata(sitePath, content) {
  for (const match of content.matchAll(/<img\b[^>]*>/gis)) {
    const tag = match[0];
    if (!/\balt\s*=\s*["'][^"']*["']/is.test(tag)) {
      throw new Error(`img alt가 필요합니다: ${sitePath}`);
    }
    if (!/\bwidth\s*=\s*["']?\d+/is.test(tag) || !/\bheight\s*=\s*["']?\d+/is.test(tag)) {
      throw new Error(`img width/height가 필요합니다: ${sitePath}`);
    }
  }
}

function isInside(root, target) {
  const path = relative(resolve(root), resolve(target));
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !path.startsWith('/'));
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help') return { help: true };
    if (argument === '--mode' && args[index + 1]) options.mode = args[++index];
    else if (argument === '--root' && args[index + 1]) options.repositoryRoot = resolve(args[++index]);
    else throw new Error(`지원하지 않는 인자입니다: ${argument}\n${usage}`);
  }
  return options;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log(usage);
    else {
      const results = await checkPages(options);
      console.log(
        `Pages check passed: ${results.map(({ mode, files }) => `${mode}=${files}`).join(', ')}`,
      );
    }
  } catch (error) {
    console.error(`Pages check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
