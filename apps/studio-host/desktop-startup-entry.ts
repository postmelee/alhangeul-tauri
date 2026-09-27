import { normalizePath, type Plugin } from 'vite';
import { resolve } from 'node:path';

const startupEntry = 'async function openBlankDocumentIfIdle(): Promise<void> {';

export function transformDesktopStartup(source: string, platformPath: string): string {
  if (source.includes('__alhangeulNativeStartup') || source.split(startupEntry).length !== 2) {
    throw new Error('upstream desktop startup hook marker mismatch');
  }
  // Native documents require DesktopHost.beginNewDocument to allocate a Rust session.
  // Keep the existing desktop idle screen; File > New already owns that lifecycle.
  return `import { isTauriRuntime as __alhangeulNativeStartup } from ${JSON.stringify(normalizePath(platformPath))};\n`
    + source.replace(startupEntry, `${startupEntry}\n  if (__alhangeulNativeStartup()) return;`);
}

export function createDesktopStartupEntry(upstreamSrc: string, alhangeulSrc: string): Plugin {
  const main = normalizePath(resolve(upstreamSrc, 'main.ts'));
  return {
    name: 'alhangeul-desktop-startup-entry',
    enforce: 'pre',
    transform(source, id) {
      if (normalizePath(id.split(/[?#]/, 1)[0]) !== main) return null;
      return {
        code: transformDesktopStartup(source, resolve(alhangeulSrc, 'core/platform.ts')),
        map: null,
      };
    },
  };
}
