import { lstat, readdir } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';

export const ROOT_ASSETS = Object.freeze([
  'assets/logo/favicon.ico',
  'assets/logo/logo-256.png',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.ico',
  '.jpeg',
  '.jpg',
  '.js',
  '.json',
  '.png',
  '.svg',
  '.webp',
  '.woff2',
]);
const FORBIDDEN_NAMES = new Set(['.DS_Store']);

export async function listSiteFiles(root) {
  const canonicalRoot = resolve(root);
  const rootStat = await lstat(canonicalRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`Pages root는 실제 directory여야 합니다: ${canonicalRoot}`);
  }
  const files = [];
  await visit(canonicalRoot, canonicalRoot, files);
  return files;
}

async function visit(root, directory, files) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    const sitePath = toSitePath(root, path);
    if (entry.isSymbolicLink()) throw new Error(`symlink를 허용하지 않습니다: ${sitePath}`);
    if (entry.isDirectory()) {
      await visit(root, path, files);
      continue;
    }
    if (!entry.isFile()) throw new Error(`일반 파일이 아닙니다: ${sitePath}`);
    assertAllowedFile(sitePath);
    files.push(sitePath);
  }
}

export function assertAllowedFile(sitePath) {
  const name = sitePath.split('/').at(-1);
  if (
    FORBIDDEN_NAMES.has(name)
    || name.endsWith('.map')
    || !ALLOWED_EXTENSIONS.has(extname(name))
  ) {
    throw new Error(`Pages에 허용되지 않은 파일입니다: ${sitePath}`);
  }
  if (sitePath === 'updater/stable.json') {
    throw new Error('updater manifest는 Issue #16 검증 전 게시할 수 없습니다.');
  }
}

export function assertInside(root, target, label) {
  const path = relative(resolve(root), resolve(target));
  if (!path || path === '..' || path.startsWith(`..${sep}`) || path.startsWith('/')) {
    throw new Error(`${label} 경로가 안전한 하위 경로가 아닙니다.`);
  }
  return path;
}

export function toSitePath(root, target) {
  return relative(root, target).split(sep).join('/');
}
