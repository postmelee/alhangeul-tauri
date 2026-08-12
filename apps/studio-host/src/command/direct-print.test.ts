import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandServices } from '@upstream/command/types';
import { printDirectlyFromPageSurface } from './direct-print';

type NativeFocusListener = (event: { payload: boolean }) => void;

const createPrintPage = vi.hoisted(() => vi.fn());
const appendSvgPage = vi.hoisted(() => vi.fn());
const buildPrintStyleText = vi.hoisted(() => vi.fn(() => 'print css'));
const createPrintSurface = vi.hoisted(() => vi.fn());
const waitForPrintSurfaceReady = vi.hoisted(() => vi.fn());
const hydrateDesktopPlatform = vi.hoisted(() => vi.fn(() => Promise.resolve('windows')));
const nativeWindow = vi.hoisted(() => ({
  isFocused: vi.fn<() => Promise<boolean>>(() => Promise.resolve(true)),
  onFocusChanged: vi.fn<(
    listener: NativeFocusListener,
  ) => Promise<() => void>>(() => Promise.resolve(vi.fn())),
}));

vi.mock('@upstream/command/print-pages', () => ({
  appendSvgPage,
  buildPrintStyleText,
  createPrintPage,
  pdfPrintTitle: (fileName: string) => fileName.replace(/\.(hwp|hwpx)$/i, ''),
  printProgressText: (_intent: string, current: number, total: number) => `${current}/${total}`,
}));

vi.mock('@upstream/command/print-surface', () => ({
  createPrintSurface,
  waitForPrintSurfaceReady,
}));

vi.mock('../core/platform', () => ({ hydrateDesktopPlatform }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => nativeWindow }));

describe('Tauri direct print surface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hydrateDesktopPlatform.mockResolvedValue('windows');
    nativeWindow.isFocused.mockResolvedValue(true);
    nativeWindow.onFocusChanged.mockResolvedValue(vi.fn());
    installHostDocument();
    delete (globalThis as { window?: unknown }).window;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prints upstream print-profile pages from a hidden surface', async () => {
    hydrateDesktopPlatform.mockResolvedValue('unknown');
    const surface = createSurface();
    createPrintSurface.mockResolvedValue(surface);
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
    expect(buildPrintStyleText).toHaveBeenCalledWith([
      { pageName: 'page-0', className: 'page-0', widthMm: 210.079, heightMm: 297.127 },
      { pageName: 'page-1', className: 'page-1', widthMm: 210.079, heightMm: 297.127 },
    ]);
    expect(surface.bundledStyle.textContent).toBe('print css');
    expect(appendSvgPage.mock.calls.map((call) => call[2])).toEqual([
      { pageName: 'page-0', className: 'page-0', widthMm: 210.079, heightMm: 297.127 },
      { pageName: 'page-1', className: 'page-1', widthMm: 210.079, heightMm: 297.127 },
    ]);
    expect(waitForPrintSurfaceReady).toHaveBeenCalledWith(surface);
    expect(surface.window.print).toHaveBeenCalledOnce();
    expect(surface.dispose).toHaveBeenCalledOnce();
    expect((globalThis.document as unknown as { title: string }).title).toBe('Alhangeul');
    expect(waitForPrintSurfaceReady.mock.invocationCallOrder[0]).toBeLessThan(
      surface.window.print.mock.invocationCallOrder[0],
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
    const status = installHostDocument(() => true);
    const surface = createSurface();
    surface.window.print.mockImplementation(() => {
      expect(status.textContent).toBe('시스템 인쇄 처리 중...');
      nativeFocused = false;
      for (const listener of [...focusListeners]) listener({ payload: false });
      nativeFocused = true;
      for (const listener of [...focusListeners]) listener({ payload: true });
    });
    createPrintSurface.mockResolvedValue(surface);
    useUniformPrintPages();

    const pendingPrint = printDirectlyFromPageSurface(createServices());
    await vi.advanceTimersByTimeAsync(0);

    expect(surface.window.print).toHaveBeenCalledOnce();
    expect(status.textContent).toBe('시스템 인쇄 처리 중...');
    expect((globalThis.document as unknown as { title: string }).title).toBe('document');
    expect(surface.document.title).toBe('document');
    expect(surface.dispose).not.toHaveBeenCalled();
    expect(nativeWindow.onFocusChanged.mock.invocationCallOrder[0]).toBeLessThan(
      surface.window.print.mock.invocationCallOrder[0],
    );

    nativeFocused = false;
    for (const listener of [...focusListeners]) listener({ payload: false });
    await vi.advanceTimersByTimeAsync(1000);
    expect(surface.dispose).not.toHaveBeenCalled();
    expect(status.textContent).toBe('시스템 인쇄 처리 중...');

    nativeFocused = true;
    for (const listener of [...focusListeners]) listener({ payload: true });
    await vi.advanceTimersByTimeAsync(999);
    expect(surface.dispose).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await pendingPrint;

    expect(surface.dispose).toHaveBeenCalledOnce();
    expect((globalThis.document as unknown as { title: string }).title).toBe('Alhangeul');
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
    const surface = createSurface();
    surface.window.print.mockImplementation(() => {
      for (const listener of [...focusListeners]) listener({ payload: false });
    });
    createPrintSurface.mockResolvedValue(surface);
    useUniformPrintPages();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const pendingPrint = printDirectlyFromPageSurface(createServices());
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(surface.dispose).not.toHaveBeenCalled();
    nativeFocused = true;
    for (const listener of [...focusListeners]) listener({ payload: true });
    await vi.advanceTimersByTimeAsync(1000);
    await pendingPrint;

    expect(surface.dispose).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('uses the default page context and one-pixel tolerance for uniform Linux pages', async () => {
    hydrateDesktopPlatform.mockResolvedValue('linux');
    const surface = createSurface();
    createPrintSurface.mockResolvedValue(surface);
    useUniformPrintPages();

    await printDirectlyFromPageSurface(createServices());

    expect(surface.bundledStyle.textContent).toContain('print css');
    expect(surface.bundledStyle.textContent).toContain(
      '@page { size: 210.079mm 297.127mm; margin: 0; }',
    );
    expect(surface.bundledStyle.textContent).toContain('@media print');
    expect(surface.bundledStyle.textContent).toContain(
      '.page-0 { page: auto; height: calc(297.127mm - 1px); }',
    );
    expect(surface.bundledStyle.textContent).toContain(
      '.page-1 { page: auto; height: calc(297.127mm - 1px); }',
    );
  });

  it('preserves the entire upstream stylesheet for mixed-size Linux pages', async () => {
    hydrateDesktopPlatform.mockResolvedValue('linux');
    const surface = createSurface();
    createPrintSurface.mockResolvedValue(surface);
    createPrintPage.mockImplementation((_svg, _info, index) => ({
      pageName: `page-${index}`,
      className: `page-${index}`,
      widthMm: index === 0 ? 210.079 : 297.127,
      heightMm: index === 0 ? 297.127 : 210.079,
    }));

    await printDirectlyFromPageSurface(createServices());

    expect(surface.bundledStyle.textContent).toBe('print css');
  });

  it('fails before printing when the nonce-bearing bundled style is missing', async () => {
    const surface = createSurface(false);
    createPrintSurface.mockResolvedValue(surface);
    useUniformPrintPages();

    await expect(printDirectlyFromPageSurface(createServices()))
      .rejects.toThrow('인쇄 surface의 bundled style을 찾을 수 없습니다');

    expect(surface.window.print).not.toHaveBeenCalled();
    expect(surface.dispose).toHaveBeenCalledOnce();
  });

  it('disposes the hidden surface when page assembly fails', async () => {
    const surface = createSurface();
    createPrintSurface.mockResolvedValue(surface);
    createPrintPage.mockImplementationOnce(() => {
      throw new Error('page failed');
    });

    await expect(printDirectlyFromPageSurface(createServices())).rejects.toThrow('page failed');

    expect(surface.window.print).not.toHaveBeenCalled();
    expect(surface.dispose).toHaveBeenCalledOnce();
  });

  it('stops before creating a surface when deferred pagination remains', async () => {
    const inputHandler = {
      flushDeferredPaginationIfNeeded: vi.fn(),
      hasDeferredPaginationPending: vi.fn(() => true),
    };

    await expect(printDirectlyFromPageSurface(createServices(inputHandler)))
      .rejects.toThrow('출력 전 페이지네이션을 완료하지 못했습니다');

    expect(createPrintSurface).not.toHaveBeenCalled();
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

function useUniformPrintPages(): void {
  createPrintPage.mockImplementation((_svg, _info, index) => ({
    pageName: `page-${index}`,
    className: `page-${index}`,
    widthMm: 210.079,
    heightMm: 297.127,
  }));
}

function createSurface(hasBundledStyle = true) {
  const bundledStyle = { textContent: 'loading css' };
  const targetDocument = {
    documentElement: { lang: '' },
    head: { querySelector: vi.fn(() => (hasBundledStyle ? bundledStyle : null)) },
    createElement: vi.fn(() => ({ textContent: '' })),
    body: { replaceChildren: vi.fn(), className: '' },
    title: '',
  };
  return {
    bundledStyle,
    document: targetDocument,
    window: { print: vi.fn() },
    dispose: vi.fn(),
  };
}

function installHostDocument(hasFocus: () => boolean = () => true) {
  const status = { textContent: '' };
  (globalThis as { document?: unknown }).document = {
    title: 'Alhangeul',
    hasFocus,
    getElementById: vi.fn(() => status),
  };
  return status;
}
