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
interface HandlerWaiter {
  resolve(handlers: DesktopStudioHandlers): void;
  timer: ReturnType<typeof setTimeout>;
}

const handlerWaiters = new Set<HandlerWaiter>();

export function getDesktopStudioHandlers(): DesktopStudioHandlers | null {
  return activeHandlers;
}

export function waitForDesktopStudioHandlers(timeoutMs = 15_000): Promise<DesktopStudioHandlers> {
  if (activeHandlers) return Promise.resolve(activeHandlers);
  return new Promise((resolve, reject) => {
    const waiter: HandlerWaiter = {
      resolve,
      timer: setTimeout(() => {
        handlerWaiters.delete(waiter);
        reject(new Error(`Studio handler 준비 시간이 ${timeoutMs}ms를 초과했습니다`));
      }, timeoutMs),
    };
    handlerWaiters.add(waiter);
  });
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
  for (const waiter of handlerWaiters) {
    clearTimeout(waiter.timer);
    waiter.resolve(registeredHandlers);
  }
  handlerWaiters.clear();

  return () => {
    uninstallUpstream();
    if (activeHandlers === registeredHandlers) activeHandlers = null;
  };
}
