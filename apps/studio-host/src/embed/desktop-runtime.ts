import { installEmbedRuntime as installUpstreamEmbedRuntime } from '@upstream/embed/runtime';
import type { EmbedRpcHandlers } from '@upstream/embed/rpc-router';

export type DesktopStudioHandlers = Pick<
  EmbedRpcHandlers,
  | 'loadFile'
  | 'pageCount'
  | 'getPageSvg'
  | 'exportHwp'
  | 'exportHwpx'
  | 'notifySaved'
>;

let activeHandlers: DesktopStudioHandlers | null = null;
const handlerWaiters = new Set<(handlers: DesktopStudioHandlers) => void>();

export function getDesktopStudioHandlers(): DesktopStudioHandlers | null {
  return activeHandlers;
}

export function waitForDesktopStudioHandlers(): Promise<DesktopStudioHandlers> {
  if (activeHandlers) return Promise.resolve(activeHandlers);
  return new Promise((resolve) => handlerWaiters.add(resolve));
}

export function installEmbedRuntime(
  options: Parameters<typeof installUpstreamEmbedRuntime>[0],
): () => void {
  const uninstallUpstream = installUpstreamEmbedRuntime(options);
  const registeredHandlers: DesktopStudioHandlers = {
    loadFile: options.handlers.loadFile,
    pageCount: options.handlers.pageCount,
    getPageSvg: options.handlers.getPageSvg,
    exportHwp: options.handlers.exportHwp,
    exportHwpx: options.handlers.exportHwpx,
    notifySaved: options.handlers.notifySaved,
  };
  activeHandlers = registeredHandlers;
  for (const resolve of handlerWaiters) resolve(registeredHandlers);
  handlerWaiters.clear();

  return () => {
    uninstallUpstream();
    if (activeHandlers === registeredHandlers) activeHandlers = null;
  };
}
