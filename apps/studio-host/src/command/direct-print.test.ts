import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandServices } from '@upstream/command/types';
import { printDirectlyFromPageSurface } from './direct-print';

type NativeFocusListener = (event: { payload: boolean }) => void;

const createPrintPage = vi.hoisted(() => vi.fn());
const appendSvgPage = vi.hoisted(() => vi.fn());
const waitForPrintSurfaceReady = vi.hoisted(() => vi.fn());
const detectDesktopPlatform = vi.hoisted(() => vi.fn(() => 'windows'));
const invoke = vi.hoisted(() => vi.fn());
const nativeWindow = vi.hoisted(() => ({
  isFocused: vi.fn<() => Promise<boolean>>(() => Promise.resolve(true)),
  onFocusChanged: vi.fn<(
    listener: NativeFocusListener,
  ) => Promise<() => void>>(() => Promise.resolve(vi.fn())),
}));

vi.mock('@upstream/command/print-pages', () => ({
  appendSvgPage,
  createPrintPage,
  pdfPrintTitle: (fileName: string) => fileName.replace(/\.(hwp|hwpx)$/i, ''),
  printProgressText: (_intent: string, current: number, total: number) => `${current}/${total}`,
}));

vi.mock('@upstream/command/print-surface', () => ({ waitForPrintSurfaceReady }));
vi.mock('@tauri-apps/api/core', () => ({ invoke }));
vi.mock('../core/platform', () => ({ detectDesktopPlatform }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => nativeWindow }));

describe('Tauri top-level direct print surface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detectDesktopPlatform.mockReturnValue('windows');
    nativeWindow.isFocused.mockResolvedValue(true);
    nativeWindow.onFocusChanged.mockResolvedValue(vi.fn());
    invoke.mockResolvedValue(undefined);
    installHostDocument();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prints upstream print-profile pages from the top-level product document', async () => {
    detectDesktopPlatform.mockReturnValue('unknown');
    const host = installHostDocument();
    useUniformPrintPages();
    const inputHandler = {
      flushDeferredPaginationIfNeeded: vi.fn(),
      hasDeferredPaginationPending: vi.fn(() => false),
    };
    const services = createServices(inputHandler);
    await printDirectlyFromPageSurface(services);
    expect(inputHandler.flushDeferredPaginationIfNeeded).toHaveBeenCalledWith('print');
    expect(services.wasm.renderPageSvgWithProfile.mock.calls).toEqual([
      [0, 'print'],
      [1, 'print'],
    ]);
    expect(services.wasm.getPageInfo.mock.calls).toEqual([[0], [1]]);
    expect(createPrintPage).toHaveBeenCalledTimes(2);
    expect(appendSvgPage.mock.calls.map((call) => call[2])).toEqual([
      printPage(0),
      printPage(1),
    ]);
    expect(waitForPrintSurfaceReady).toHaveBeenCalledWith(expect.objectContaining({
      window: host.window,
      document: host.document,
    }));
    expect(host.window.print).toHaveBeenCalledOnce();
    expect(invoke).not.toHaveBeenCalled();
    expect(host.container.remove).toHaveBeenCalledOnce();
    expect(host.productStyle.textContent).toBe('product css');
    expect(host.classNames.has('alhangeul-print-active')).toBe(false);
    expect(host.document.title).toBe('Alhangeul');
    expect(waitForPrintSurfaceReady.mock.invocationCallOrder[0]).toBeLessThan(
      host.window.print.mock.invocationCallOrder[0],
    );
  });

  it('keeps the print surface through the Windows print-to-save focus transition', async () => {
    vi.useFakeTimers();
    let nativeFocused = true;
    const focusListeners = new Set<NativeFocusListener>();
    const unlisten = vi.fn();
    nativeWindow.isFocused.mockImplementation(() => Promise.resolve(nativeFocused));
    nativeWindow.onFocusChanged.mockImplementation((listener) => {
      focusListeners.add(listener);
      return Promise.resolve(unlisten);
    });
    const host = installHostDocument();
    useUniformPrintPages();
    const pendingPrint = printDirectlyFromPageSurface(createServices());
    await vi.advanceTimersByTimeAsync(0);
    expect(host.window.print).toHaveBeenCalledOnce();
    expect(host.status.textContent).toBe('시스템 인쇄 처리 중...');
    expect(host.document.title).toBe('document');
    expect(host.container.remove).not.toHaveBeenCalled();
    expect(nativeWindow.onFocusChanged.mock.invocationCallOrder[0]).toBeLessThan(
      host.window.print.mock.invocationCallOrder[0],
    );
    nativeFocused = false;
    for (const listener of [...focusListeners]) listener({ payload: false });
    await vi.advanceTimersByTimeAsync(1000);
    expect(host.container.remove).not.toHaveBeenCalled();
    nativeFocused = true;
    for (const listener of [...focusListeners]) listener({ payload: true });
    await vi.advanceTimersByTimeAsync(1000);
    await pendingPrint;
    expect(host.container.remove).toHaveBeenCalledOnce();
    expect(host.document.title).toBe('Alhangeul');
    expect(unlisten).toHaveBeenCalledOnce();
  });

  it('keeps the Windows surface after the five-minute focus watchdog', async () => {
    vi.useFakeTimers();
    let nativeFocused = false;
    const focusListeners = new Set<NativeFocusListener>();
    nativeWindow.isFocused.mockImplementation(() => Promise.resolve(nativeFocused));
    nativeWindow.onFocusChanged.mockImplementation((listener) => {
      focusListeners.add(listener);
      return Promise.resolve(() => focusListeners.delete(listener));
    });
    const host = installHostDocument();
    useUniformPrintPages();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pendingPrint = printDirectlyFromPageSurface(createServices());
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(host.container.remove).not.toHaveBeenCalled();
    nativeFocused = true;
    for (const listener of [...focusListeners]) listener({ payload: true });
    await vi.advanceTimersByTimeAsync(1000);
    await pendingPrint;
    expect(host.container.remove).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('uses the default page context and one-pixel tolerance for uniform Linux pages', async () => {
    detectDesktopPlatform.mockReturnValue('linux');
    const host = installHostDocument();
    host.status.textContent = '파일 열기 완료';
    useUniformPrintPages();
    let finishNativePrint: () => void = () => {};
    invoke.mockImplementation(() => new Promise<void>((resolve) => {
      finishNativePrint = resolve;
      expect(host.productStyle.textContent).toContain(
        '@page { size: 210.079mm 297.127mm; margin: 0; }',
      );
      expect(host.productStyle.textContent).toContain(
        '#alhangeul-direct-print-surface .page-0 { page: auto; '
        + 'height: calc(297.127mm - 1px); }',
      );
    }));
    const pendingPrint = printDirectlyFromPageSurface(createServices());
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('print_current_webview'));
    expect(host.window.print).not.toHaveBeenCalled();
    expect(host.container.remove).not.toHaveBeenCalled();
    finishNativePrint();
    await pendingPrint;
    expect(host.productStyle.textContent).toBe('product css');
    expect(host.status.textContent).toBe('파일 열기 완료');
  });

  it('retains named pages for mixed-size Linux documents', async () => {
    detectDesktopPlatform.mockReturnValue('linux');
    const host = installHostDocument();
    createPrintPage.mockImplementation((_svg, _info, index) => ({
      ...printPage(index),
      widthMm: index === 0 ? 210.079 : 297.127,
      heightMm: index === 0 ? 297.127 : 210.079,
    }));
    invoke.mockImplementation(() => {
      expect(host.productStyle.textContent).toContain(
        '@page page-0 { size: 210.079mm 297.127mm; margin: 0; }',
      );
      expect(host.productStyle.textContent).not.toContain('@page { size:');
    });
    await printDirectlyFromPageSurface(createServices());
    expect(host.window.print).not.toHaveBeenCalled();
    expect(host.productStyle.textContent).toBe('product css');
  });

  it('fails before printing when the nonce-bearing product style is missing', async () => {
    const host = installHostDocument({ hasProductStyle: false });
    useUniformPrintPages();
    await expect(printDirectlyFromPageSurface(createServices()))
      .rejects.toThrow('top-level 인쇄 surface를 만들 수 없습니다');
    expect(host.window.print).not.toHaveBeenCalled();
    expect(host.container.remove).not.toHaveBeenCalled();
  });

  it('restores the product document when SVG page assembly fails', async () => {
    const host = installHostDocument();
    useUniformPrintPages();
    appendSvgPage.mockImplementationOnce(() => {
      throw new Error('append failed');
    });
    await expect(printDirectlyFromPageSurface(createServices())).rejects.toThrow('append failed');
    expect(host.window.print).not.toHaveBeenCalled();
    expect(host.container.remove).toHaveBeenCalledOnce();
    expect(host.productStyle.textContent).toBe('product css');
    expect(host.classNames.has('alhangeul-print-active')).toBe(false);
  });

  it('stops before creating a surface when page preparation fails', async () => {
    const host = installHostDocument();
    createPrintPage.mockImplementationOnce(() => {
      throw new Error('page failed');
    });
    await expect(printDirectlyFromPageSurface(createServices())).rejects.toThrow('page failed');
    expect(host.window.print).not.toHaveBeenCalled();
    expect(host.container.remove).not.toHaveBeenCalled();
  });

  it('stops before creating a surface when deferred pagination remains', async () => {
    const host = installHostDocument();
    const inputHandler = {
      flushDeferredPaginationIfNeeded: vi.fn(),
      hasDeferredPaginationPending: vi.fn(() => true),
    };
    await expect(printDirectlyFromPageSurface(createServices(inputHandler)))
      .rejects.toThrow('출력 전 페이지네이션을 완료하지 못했습니다');
    expect(host.window.print).not.toHaveBeenCalled();
    expect(host.container.remove).not.toHaveBeenCalled();
  });
});

function createServices(inputHandler: unknown = null) {
  return {
    wasm: {
      fileName: 'document.hwp',
      pageCount: 2,
      renderPageSvgWithProfile: vi.fn((index: number) => `<svg id="p${index}"/>`),
      getPageInfo: vi.fn(() => ({ width: 794, height: 1123 })),
    },
    getInputHandler: () => inputHandler,
  } as unknown as CommandServices & {
    wasm: {
      renderPageSvgWithProfile: ReturnType<typeof vi.fn>;
      getPageInfo: ReturnType<typeof vi.fn>;
    };
  };
}

function printPage(index: number) {
  return {
    pageName: `page-${index}`,
    className: `page-${index}`,
    widthMm: 210.079,
    heightMm: 297.127,
  };
}

function useUniformPrintPages(): void {
  createPrintPage.mockImplementation((_svg, _info, index) => printPage(index));
}

function installHostDocument(options: {
  hasFocus?: () => boolean;
  hasProductStyle?: boolean;
} = {}) {
  const status = { textContent: '' };
  const productStyle = { textContent: 'product css' };
  const classNames = new Set<string>();
  const container = {
    id: '',
    setAttribute: vi.fn(),
    remove: vi.fn(),
  };
  const windowLike = {
    print: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const documentLike = {
    title: 'Alhangeul',
    hasFocus: options.hasFocus ?? (() => true),
    defaultView: windowLike,
    head: {
      querySelector: vi.fn(() => options.hasProductStyle === false ? null : productStyle),
    },
    body: { appendChild: vi.fn() },
    documentElement: {
      classList: {
        contains: (name: string) => classNames.has(name),
        add: (name: string) => classNames.add(name),
        remove: (name: string) => classNames.delete(name),
      },
    },
    createElement: vi.fn(() => container),
    getElementById: vi.fn((id: string) => id === 'sb-message' ? status : null),
  };
  (globalThis as { document?: unknown }).document = documentLike;
  (globalThis as { window?: unknown }).window = windowLike;
  return { status, productStyle, classNames, container, window: windowLike, document: documentLike };
}
