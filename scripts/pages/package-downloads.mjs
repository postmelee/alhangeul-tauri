import { isDeepStrictEqual } from 'node:util';
import { relative, resolve } from 'node:path';
import { validateReleaseData } from './release-data.mjs';
import { INSTALLERS } from '../releases/notes-metadata.mjs';
import { validateReleaseNotes } from '../releases/notes-schema.mjs';
import { canonicalRoot, notesPath, readOwned } from '../releases/notes-files.mjs';

export const PACKAGE_DOWNLOADS_PATH = 'downloads.json';

export async function readPackageDownloads(repositoryRoot, release) {
  validateReleaseData(release, { allowManifestPublished: true });
  if (release.status === 'unreleased') return buildPackageDownloads(release);
  const root = await canonicalRoot(repositoryRoot);
  const notes = JSON.parse(await readOwned(root, notesPath(release.version)));
  return buildPackageDownloads(release, notes);
}

export function buildPackageDownloads(release, notes) {
  validateReleaseData(release, { allowManifestPublished: true });
  const catalog = {
    schemaVersion: 1, status: release.status,
    version: release.version, tag: release.tag, sourceSha: null, packages: [],
  };
  if (release.status === 'unreleased') return catalog;
  validateReleaseNotes(notes);
  assertCurrentNotes(release, notes);
  catalog.sourceSha = notes.metadata.sourceSha;
  catalog.packages = Object.keys(INSTALLERS).map((target) => packageEntry(target, notes.metadata));
  return catalog;
}

function assertCurrentNotes(release, notes) {
  const { metadata, content } = notes;
  for (const key of ['status', 'version', 'tag', 'publishedAt']) {
    if (release[key] !== metadata[key]) throw new Error(`다운로드 원문과 release.json의 ${key}가 다릅니다.`);
  }
  if (release.notes !== content.updaterSummary) throw new Error('다운로드 원문의 updaterSummary가 release.json과 다릅니다.');
  for (const [target, url] of Object.entries(release.downloads)) {
    if (url !== metadata.assets[target].url) throw new Error(`다운로드 원문 URL이 release.json과 다릅니다: ${target}`);
  }
  if (release.updater.manifestPublished && !isDeepStrictEqual(release.updater.inventory, metadata.updaterInventory)) {
    throw new Error('다운로드 원문의 updater inventory가 release.json과 다릅니다.');
  }
}

function packageEntry(target, metadata) {
  const [platform, cpu, kind] = target.split('-');
  const format = kind === 'appimage' ? 'AppImage' : kind.toUpperCase();
  return {
    target, platform, architecture: cpu === 'aarch64' ? 'arm64' : 'x64', format,
    updateMode: Object.hasOwn(metadata.updaterInventory.targets, target) ? 'app' : 'manual',
    ...metadata.assets[target],
  };
}

export function serializePackageDownloads(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

export async function assertPackageDownloads(context, release) {
  const expected = serializePackageDownloads(await readPackageDownloads(context.repositoryRoot, release));
  if (context.mode === 'source') return;
  const root = await canonicalRoot(context.repositoryRoot);
  const path = resolve(root, relative(resolve(context.repositoryRoot), context.treeRoot), PACKAGE_DOWNLOADS_PATH);
  const actual = await readOwned(root, path);
  if (actual !== expected) throw new Error('downloads.json이 검증된 설치 파일 원문과 다릅니다.');
}
