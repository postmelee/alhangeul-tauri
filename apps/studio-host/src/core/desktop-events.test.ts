import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupDesktopEvents } from './desktop-events';

const tauriListen = vi.hoisted(() => vi.fn());
const currentWindow = vi.hoisted(() => ({
  listen: vi.fn(),
  onCloseRequested: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({ listen: tauriListen }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({
  getCurrentWebviewWindow: () => currentWindow,
}));

describe('desktop events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
  });

  it('does nothing outside the Tauri runtime', async () => {
    await setupDesktopEvents(options());

    expect(tauriListen).not.toHaveBeenCalled();
    expect(currentWindow.listen).not.toHaveBeenCalled();
  });

  it('deduplicates event and pending paths before loading the latest document once', async () => {
    const { windowHandlers } = installTauriEnvironment();
    const host = createHost({
      takePendingOpenPaths: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([
        '/documents/latest.HWPX',
      ]),
      openDocumentByPath: vi.fn().mockResolvedValue({
        fileName: 'latest.HWPX',
        pageCount: 3,
      }),
    });
    const setMessage = vi.fn();
    await setupDesktopEvents(options({ host, setMessage }));

    await windowHandlers.get('alhangeul-open-paths')?.({
      payload: { paths: ['/documents/older.hwp', '/documents/latest.HWPX'] },
    });

    expect(host.openDocumentByPath).toHaveBeenCalledTimes(1);
    expect(host.openDocumentByPath).toHaveBeenCalledWith('/documents/latest.HWPX');
    expect(setMessage).toHaveBeenLastCalledWith('latest.HWPX — 3페이지');
  });

  it('reports unsupported paths without opening a document', async () => {
    const { windowHandlers } = installTauriEnvironment();
    const host = createHost();
    const setMessage = vi.fn();
    await setupDesktopEvents(options({ host, setMessage }));

    await windowHandlers.get('alhangeul-open-paths')?.({ payload: { paths: ['notes.txt'] } });

    expect(host.openDocumentByPath).not.toHaveBeenCalled();
    expect(setMessage).toHaveBeenCalledWith('HWP/HWPX 파일만 열 수 있습니다');
  });

  it('routes native menu, drag state, and close through shared adapters', async () => {
    const { windowHandlers, getCloseHandler } = installTauriEnvironment();
    const host = createHost();
    const dispatcher = { dispatch: vi.fn() };
    const classList = { toggle: vi.fn() };
    (globalThis as { document?: unknown }).document = {
      getElementById: vi.fn(() => ({ classList })),
    };
    await setupDesktopEvents(options({ host, dispatcher }));

    await windowHandlers.get('alhangeul-menu-command')?.({ payload: 'file:save' });
    await windowHandlers.get('tauri://drag-enter')?.({ payload: { paths: ['doc.hwpx'] } });
    await windowHandlers.get('tauri://drag-drop')?.({ payload: {} });
    const preventDefault = vi.fn();
    await getCloseHandler()?.({ preventDefault });

    expect(dispatcher.dispatch).toHaveBeenCalledWith('file:save');
    expect(classList.toggle).toHaveBeenNthCalledWith(1, 'drag-over', true);
    expect(classList.toggle).toHaveBeenNthCalledWith(2, 'drag-over', false);
    expect(preventDefault).toHaveBeenCalled();
    expect(host.confirmWindowClose).toHaveBeenCalledOnce();
    expect(host.destroyCurrentWindow).toHaveBeenCalledOnce();
  });

  it('keeps the window open and reports a close failure', async () => {
    const { getCloseHandler } = installTauriEnvironment();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const host = createHost({
      confirmWindowClose: vi.fn().mockRejectedValue(new Error('dialog failed')),
    });
    const setMessage = vi.fn();
    await setupDesktopEvents(options({ host, setMessage }));

    await getCloseHandler()?.({ preventDefault: vi.fn() });

    expect(host.destroyCurrentWindow).not.toHaveBeenCalled();
    expect(setMessage).toHaveBeenCalledWith('창 닫기 실패: Error: dialog failed');
  });
});

function installTauriEnvironment() {
  (globalThis as { window?: unknown }).window = {
    __TAURI_INTERNALS__: {},
    location: { protocol: 'tauri:' },
  };
  if (!(globalThis as { document?: unknown }).document) {
    (globalThis as { document?: unknown }).document = { getElementById: vi.fn(() => null) };
  }
  const windowHandlers = new Map<string, (event: { payload: unknown }) => unknown>();
  let closeHandler: ((event: { preventDefault(): void }) => Promise<void>) | undefined;
  tauriListen.mockResolvedValue(vi.fn());
  currentWindow.listen.mockImplementation(async (name, handler) => {
    windowHandlers.set(name, handler);
    return vi.fn();
  });
  currentWindow.onCloseRequested.mockImplementation(async (handler) => {
    closeHandler = handler;
    return vi.fn();
  });
  return { windowHandlers, getCloseHandler: () => closeHandler };
}

function createHost(overrides: Record<string, unknown> = {}) {
  return {
    openDocumentByPath: vi.fn(),
    takePendingOpenPaths: vi.fn().mockResolvedValue([]),
    confirmWindowClose: vi.fn().mockResolvedValue(true),
    destroyCurrentWindow: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function options(overrides: Record<string, unknown> = {}) {
  return {
    host: createHost(),
    dispatcher: { dispatch: vi.fn() },
    setMessage: vi.fn(),
    ...overrides,
  } as never;
}
