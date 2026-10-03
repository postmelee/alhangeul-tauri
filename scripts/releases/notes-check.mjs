import { isDeepStrictEqual } from 'node:util';
import { readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { normalizeRootAssetReferences } from '../pages/site-files.mjs';
import { validateReleaseData } from '../pages/release-data.mjs';
import { validateReleaseNotes } from './notes-schema.mjs';
import { GITHUB_TOKENS, extractGithubTemplate, renderGithubNotes, renderTemplate } from './notes-render.mjs';
import { WEBSITE_TOKENS, extractWebsiteTemplate, renderWebsiteNotes } from './website-render.mjs';
import { canonicalRoot, discoverNotes, ownedPath, readOwned, readTemplates } from './notes-files.mjs';

export async function checkReleaseNotes(options = {}) {
  const root = await canonicalRoot(options.repositoryRoot);
  const tree = options.treeRoot
    ? resolve(root, relative(resolve(options.repositoryRoot ?? root), resolve(options.treeRoot)))
    : join(root, 'site');
  const mode = options.mode ?? 'source';
  if (!['source', 'output'].includes(mode)) throw new Error('release notes 검사 mode가 올바르지 않습니다.');
  const files = await discoverNotes(root);
  const templates = await readTemplates(root, { optional: files.length === 0 });
  if (templates) validateTemplates(templates);
  const release = options.release ?? JSON.parse(await readOwned(root, 'site/release.json'));
  validateReleaseData(release, { allowManifestPublished: true });
  for (const filename of files) await checkDocument({ root, tree, mode, release, templates }, filename);
  await checkOrphanPages(root, tree, files);
  return { documents: files.length, mode };
}

export function validateTemplates(templates) {
  renderTemplate(extractGithubTemplate(templates.github), emptyTokens(GITHUB_TOKENS));
  renderTemplate(extractWebsiteTemplate(templates.website), emptyTokens(WEBSITE_TOKENS));
}

function emptyTokens(names) {
  return Object.fromEntries(names.map((name) => [name, '']));
}

async function checkDocument(context, filename) {
  const { root, tree, mode, release, templates } = context;
  const notes = validateReleaseNotes(JSON.parse(await readOwned(root, `docs/releases/${filename}`)));
  const { metadata: meta } = notes;
  if (filename !== `${meta.tag}.notes.json`) throw new Error(`원문 version과 파일명이 다릅니다: ${filename}`);
  renderGithubNotes(notes, templates.github);
  let expected = renderWebsiteNotes(notes, templates.website);
  const sitePath = `updates/${meta.tag}.html`;
  const actual = await readOwned(root, join(tree, sitePath), { optional: true });
  if (meta.status === 'draft') {
    if (actual !== null) throw new Error(`draft 웹 안내를 공개 tree에 둘 수 없습니다: ${sitePath}`);
  } else {
    if (mode === 'output') expected = normalizeRootAssetReferences(sitePath, expected);
    if (actual !== expected) throw new Error(`웹 릴리즈 안내 drift: ${sitePath}`);
  }
  if (release.version === meta.version) assertCurrentRelease(release, notes);
}

function assertCurrentRelease(release, notes) {
  const { metadata: meta, content } = notes;
  for (const key of ['status', 'tag', 'publishedAt']) {
    if (release[key] !== meta[key]) throw new Error(`release.json과 원문의 ${key}가 다릅니다.`);
  }
  if (release.notes !== content.updaterSummary) throw new Error('release.json notes가 짧은 updaterSummary와 다릅니다.');
  for (const [target, url] of Object.entries(release.downloads)) {
    if (url !== meta.assets[target]?.url) throw new Error(`release.json download가 다릅니다: ${target}`);
  }
  if (release.updater.manifestPublished && !isDeepStrictEqual(release.updater.inventory, meta.updaterInventory)) {
    throw new Error('release.json updater inventory가 원문과 다릅니다.');
  }
}

async function checkOrphanPages(root, tree, files) {
  const directory = await ownedPath(root, join(tree, 'updates'), { optional: true });
  if (!directory) return;
  const expected = new Set(files.map((name) => name.replace('.notes.json', '.html')));
  for (const name of await readdir(directory)) {
    if (/^v\d+\.\d+\.\d+\.html$/.test(name) && !expected.has(name)) {
      throw new Error(`웹 릴리즈 안내에 대응하는 원문이 없습니다: ${name}`);
    }
  }
}
