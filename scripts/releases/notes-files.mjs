import { lstat, readFile, realpath, readdir } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertInside } from '../pages/site-files.mjs';
import { assertPattern, STABLE_VERSION } from './notes-fields.mjs';

export const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const TEMPLATE_PATHS = Object.freeze({
  github: 'mydocs/_templates/release_notes.md', website: 'mydocs/_templates/website_release_note.html',
});

export async function canonicalRoot(path = DEFAULT_ROOT) {
  const absolute = resolve(path);
  const info = await lstat(absolute);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('release repository root는 실제 directory여야 합니다.');
  return realpath(absolute);
}

export function notesPath(version) {
  assertPattern(version, STABLE_VERSION, 'version');
  return `docs/releases/v${version}.notes.json`;
}

// repository 내부는 각 path component를 검사한다. /tmp 같은 호스트 alias는 canonicalRoot에서 정규화한다.
export async function ownedPath(root, path, options = {}) {
  const target = resolve(root, path);
  if (isAbsolute(relative(root, target))) throw new Error('release file은 동일 root 내부여야 합니다.');
  const parts = assertInside(root, target, 'release file').split(sep);
  let current = root;
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    let info;
    try { info = await lstat(current); }
    catch (error) {
      if (options.optional && error.code === 'ENOENT') return null;
      throw error;
    }
    if (info.isSymbolicLink()) throw new Error(`release symlink를 허용하지 않습니다: ${relative(root, current)}`);
    if (index < parts.length - 1 && !info.isDirectory()) throw new Error('release parent가 directory가 아닙니다.');
  }
  return target;
}

export async function readOwned(root, path, options = {}) {
  const target = await ownedPath(root, path, options);
  if (!target) return null;
  if (!(await lstat(target)).isFile()) throw new Error(`release 일반 파일이 아닙니다: ${path}`);
  return readFile(target, 'utf8');
}

export async function readTemplates(root, options = {}) {
  const entries = await Promise.all(Object.values(TEMPLATE_PATHS).map((path) => readOwned(root, path, options)));
  if (entries.every((value) => value === null)) return null;
  if (entries.some((value) => value === null)) throw new Error('릴리즈 template 두 종류가 모두 필요합니다.');
  return Object.fromEntries(Object.keys(TEMPLATE_PATHS).map((key, index) => [key, entries[index]]));
}

export async function discoverNotes(root) {
  const directory = await ownedPath(root, 'docs/releases', { optional: true });
  if (!directory) return [];
  if (!(await lstat(directory)).isDirectory()) throw new Error('docs/releases는 directory여야 합니다.');
  const files = (await readdir(directory)).filter((name) => name.endsWith('.notes.json')).sort();
  for (const name of files) {
    if (!/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.notes\.json$/.test(name)) {
      throw new Error(`릴리즈 원문 파일명이 올바르지 않습니다: ${name}`);
    }
  }
  return files;
}
