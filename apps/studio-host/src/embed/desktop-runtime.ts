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

export function getDesktopStudioHandlers(): DesktopStudioHandlers | null {
  return activeHandlers;
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

  return () => {
    uninstallUpstream();
    if (activeHandlers === registeredHandlers) activeHandlers = null;
  };
}
