import { resolve } from 'node:path';
import { normalizePath, type Plugin } from 'vite';

interface LocalFontPaths {
  upstreamSrc: string;
  alhangeulSrc: string;
}

const relativeConsumers = ['core/document-font-status.ts', 'core/font-substitution.ts',
  'core/host-font-requests.ts', 'core/host-canvas-fonts.ts', 'core/wasm-bridge.ts'];

export function resolveAlhangeulLocalFontImport(
  source: string,
  importer: string | undefined,
  { upstreamSrc, alhangeulSrc }: LocalFontPaths,
): string | null {
  if (!['./local-fonts.ts', './local-fonts'].includes(source) || !importer) return null;
  const importerPath = importer.split(/[?#]/, 1)[0].replaceAll('\\', '/');
  const allowed = relativeConsumers.some((path) =>
    normalizePath(resolve(upstreamSrc, path)) === importerPath);
  return allowed ? normalizePath(resolve(alhangeulSrc, 'core/local-fonts.ts')) : null;
}

/** Relative imports bypass the existing @/ leaf alias; keep all font consumers on it. */
export function createAlhangeulLocalFontPlugin(paths: LocalFontPaths): Plugin {
  return {
    name: 'alhangeul-local-font-consumers',
    enforce: 'pre',
    resolveId(source, importer) {
      return resolveAlhangeulLocalFontImport(source, importer, paths);
    },
  };
}
