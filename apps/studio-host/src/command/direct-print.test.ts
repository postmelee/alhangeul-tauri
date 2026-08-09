import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandServices } from '@upstream/command/types';
import { printDirectlyFromPageSurface } from './direct-print';

const createPrintPage = vi.hoisted(() => vi.fn());
const appendPrintStyle = vi.hoisted(() => vi.fn());
const appendSvgPage = vi.hoisted(() => vi.fn());
const buildPrintStyleText = vi.hoisted(() => vi.fn(() => 'print css'));
const createPrintSurface = vi.hoisted(() => vi.fn());
const waitForPrintSurfaceReady = vi.hoisted(() => vi.fn());

vi.mock('@upstream/command/print-pages', () => ({
  appendPrintStyle,
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

describe('Tauri direct print surface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installHostDocument();
  });

  it('prints upstream print-profile pages from a hidden surface', async () => {
    const surface = createSurface();
    createPrintSurface.mockResolvedValue(surface);
    createPrintPage.mockImplementation((_svg, _info, index) => ({
      pageName: `page-${index}`,
    }));
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
      { pageName: 'page-0' },
      { pageName: 'page-1' },
    ]);
    expect(surface.bundledStyle.textContent).toBe('print css');
    expect(appendPrintStyle).not.toHaveBeenCalled();
    expect(appendSvgPage.mock.calls.map((call) => call[2])).toEqual([
      { pageName: 'page-0' },
      { pageName: 'page-1' },
    ]);
    expect(waitForPrintSurfaceReady).toHaveBeenCalledWith(surface);
    expect(surface.window.print).toHaveBeenCalledOnce();
    expect(surface.dispose).toHaveBeenCalledOnce();
    expect((globalThis.document as unknown as { title: string }).title).toBe('Alhangeul');
    expect(waitForPrintSurfaceReady.mock.invocationCallOrder[0])
      .toBeLessThan(surface.window.print.mock.invocationCallOrder[0]);
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

function createSurface() {
  const bundledStyle = { textContent: 'loading css' };
  const targetDocument = {
    documentElement: { lang: '' },
    head: { querySelector: vi.fn(() => bundledStyle) },
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

function installHostDocument() {
  const status = { textContent: '' };
  (globalThis as { document?: unknown }).document = {
    title: 'Alhangeul',
    getElementById: vi.fn(() => status),
  };
}
