import { resolve } from 'node:path';
import { normalizePath, type Plugin } from 'vite';
import { insertStudioMenuItem } from './studio-menu-hooks';

const initializeDocument = ['suppressDialogs?: boolean', 'suppressDialogs?: boolean; suppressLocalFontPrompt?: boolean']
  .map(options => `async function initializeDocument(
  docInfo: DocumentInfo,
  displayName: string,
  options: { ${options} } = {},
): Promise<void> {`);
const promptLocalFonts = ['docInfo: DocumentInfo, displayName: string', 'displayName: string']
  .map(params => `async function promptLocalFontsIfNeeded(${params}): Promise<void> {`);

function appendHook(source: string, signatures: readonly string[], hook: string): string {
  const matches = signatures.filter(signature => source.includes(signature));
  if (matches.length !== 1 || source.indexOf(matches[0]) !== source.lastIndexOf(matches[0])) {
    throw new Error('upstream local-font hook marker mismatch');
  }
  return source.replace(matches[0], () => matches[0] + hook);
}

export function transformLocalFontEntry(source: string, controllerPath: string): string {
  if (source.includes('__alhangeulPrepareFonts')) throw new Error('duplicate local-font entry hook');
  const withDocument = appendHook(source, initializeDocument, `
  await __alhangeulPrepareFonts({
    fonts: docInfo.fontsUsed ?? [],
    refreshView: async (isCurrent) => {
      const session = rendererSession;
      const view = canvasView;
      await view?.refreshFontResources();
      if (!isCurrent() || view !== canvasView || session !== rendererSession
        || view?.getRenderBackend() !== 'canvaskit') return;
      const renderer = session?.getCanvasKitRenderer();
      if (!renderer) return;
      const decisionKey = session?.diagnostics()?.decisionKey;
      await renderer.prepareLocalFonts(docInfo.fontsUsed ?? []);
      if (isCurrent() && view === canvasView && session === rendererSession
        && renderer === session?.getCanvasKitRenderer()
        && decisionKey === session?.diagnostics()?.decisionKey
        && view?.getRenderBackend() === 'canvaskit') {
        eventBus.emit('document-view-changed');
      }
    },
    onFontsChanged: (fonts) => {
      clearDeclaredLocalPrograms();
      eventBus.emit('local-fonts-changed', {
        fonts, report: analyzeDocumentFonts(docInfo.fontsUsed),
      });
    },
  });`);
  const withPrompt = appendHook(withDocument, promptLocalFonts, `
  if (await __alhangeulPromptFonts()) return;`);
  return `import { prepareDesktopDocumentFonts as __alhangeulPrepareFonts,
    promptDesktopLocalFonts as __alhangeulPromptFonts } from ${JSON.stringify(normalizePath(controllerPath))};\n${withPrompt}`;
}

export function createLocalFontEntryHooks(upstreamSrc: string, alhangeulSrc: string): Plugin {
  const main = normalizePath(resolve(upstreamSrc, 'main.ts'));
  const controller = resolve(alhangeulSrc, 'core/local-font-controller.ts');
  return {
    name: 'alhangeul-local-font-entry-hooks',
    enforce: 'pre',
    transform(source, id) {
      if (normalizePath(id.split(/[?#]/, 1)[0]) !== main) return null;
      return { code: transformLocalFontEntry(source, controller), map: null };
    },
    transformIndexHtml(html) {
      return insertStudioMenuItem(html, 'tool:options',
        '<div class="md-item" data-cmd="tool:local-font-settings"><span class="md-icon"></span><span class="md-label">로컬 글꼴 설정…</span></div>');
    },
  };
}
