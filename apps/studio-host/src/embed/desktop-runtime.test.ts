import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDesktopStudioHandlers,
  installEmbedRuntime,
  waitForDesktopStudioHandlers,
} from './desktop-runtime';

const uninstallUpstream = vi.hoisted(() => vi.fn());
const installUpstreamEmbedRuntime = vi.hoisted(() => vi.fn(() => uninstallUpstream));

vi.mock('@upstream/embed/runtime', () => ({
  installEmbedRuntime: installUpstreamEmbedRuntime,
}));

describe('desktop embed runtime adapter', () => {
  beforeEach(() => {
    installUpstreamEmbedRuntime.mockClear();
    uninstallUpstream.mockClear();
    getDesktopStudioHandlers();
  });

  afterEach(() => vi.useRealTimers());

  it('delegates installation unchanged and exposes only desktop handler leaves', () => {
    const options = runtimeOptions('first');

    const uninstall = installEmbedRuntime(options as never);

    expect(installUpstreamEmbedRuntime).toHaveBeenCalledWith(options);
    expect(getDesktopStudioHandlers()).toEqual({
      loadFile: options.handlers.loadFile,
      pageCount: options.handlers.pageCount,
      getPageSvg: options.handlers.getPageSvg,
      exportHwp: options.handlers.exportHwp,
      exportHwpx: options.handlers.exportHwpx,
      notifySaved: options.handlers.notifySaved,
    });

    uninstall();
    expect(uninstallUpstream).toHaveBeenCalledOnce();
    expect(getDesktopStudioHandlers()).toBeNull();
  });

  it('does not let stale cleanup clear a newer registration', () => {
    const uninstallFirst = installEmbedRuntime(runtimeOptions('first') as never);
    const second = runtimeOptions('second');
    const uninstallSecond = installEmbedRuntime(second as never);

    uninstallFirst();
    expect(getDesktopStudioHandlers()?.loadFile).toBe(second.handlers.loadFile);

    uninstallSecond();
    expect(getDesktopStudioHandlers()).toBeNull();
  });

  it('releases pending desktop consumers when upstream registers handlers', async () => {
    const pending = waitForDesktopStudioHandlers();
    const options = runtimeOptions('pending');

    const uninstall = installEmbedRuntime(options as never);

    await expect(pending).resolves.toMatchObject({
      loadFile: options.handlers.loadFile,
      exportHwpx: options.handlers.exportHwpx,
    });
    uninstall();
  });

  it('rejects consumers instead of waiting forever when handlers never register', async () => {
    vi.useFakeTimers();
    const pending = waitForDesktopStudioHandlers(250);

    const expectation = expect(pending).rejects.toThrow('250ms를 초과');
    await vi.advanceTimersByTimeAsync(250);
    await expectation;
  });
});

function runtimeOptions(name: string) {
  return {
    hostWindow: {} as Window,
    parentWindow: {} as Window,
    handlers: {
      ready: vi.fn(async () => true),
      loadFile: vi.fn(async () => ({ pageCount: 1, name })),
      pageCount: vi.fn(async () => 1),
      getRendererDiagnostics: vi.fn(),
      getPageSvg: vi.fn(async () => `<svg data-name="${name}"/>`),
      exportHwp: vi.fn(async () => new Uint8Array()),
      exportHwpx: vi.fn(async () => new Uint8Array()),
      exportHml: vi.fn(async () => new Uint8Array()),
      getHmlSaveState: vi.fn(),
      exportHwpVerify: vi.fn(),
      notifySaved: vi.fn(async () => ({ ok: true, wasDirty: false })),
    },
  };
}
