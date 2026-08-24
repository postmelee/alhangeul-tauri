import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  installEmbedRuntime,
  waitForDesktopStudioHandlers,
} from './desktop-runtime';

const installUpstreamEmbedRuntime = vi.hoisted(() => vi.fn());

vi.mock('@upstream/embed/runtime', () => ({
  installEmbedRuntime: installUpstreamEmbedRuntime,
}));

let upstreamUninstallers: Array<ReturnType<typeof vi.fn>> = [];
const runtimeUninstallers: Array<() => void> = [];

describe('desktop embed runtime adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upstreamUninstallers = [];
    installUpstreamEmbedRuntime.mockImplementation(() => {
      const uninstall = vi.fn();
      upstreamUninstallers.push(uninstall);
      return uninstall;
    });
  });

  afterEach(() => {
    while (runtimeUninstallers.length > 0) runtimeUninstallers.pop()?.();
    vi.useRealTimers();
  });

  it('delegates installation unchanged and acquires only desktop handler leaves', async () => {
    const options = runtimeOptions('first');

    installRuntime(options);
    const handlers = await waitForDesktopStudioHandlers();

    expect(installUpstreamEmbedRuntime).toHaveBeenCalledWith(options);
    expect(handlers).toEqual({
      loadFile: options.handlers.loadFile,
      pageCount: options.handlers.pageCount,
      getPageSvg: options.handlers.getPageSvg,
      exportHwp: options.handlers.exportHwp,
      exportHwpx: options.handlers.exportHwpx,
      notifySaved: options.handlers.notifySaved,
    });
    expect(Object.keys(handlers)).toEqual([
      'loadFile',
      'pageCount',
      'getPageSvg',
      'exportHwp',
      'exportHwpx',
      'notifySaved',
    ]);
  });

  it('replaces the previous registration and rejects its undelivered acquisition', async () => {
    const uninstallFirst = installRuntime(runtimeOptions('first'));
    const pendingFirst = waitForDesktopStudioHandlers();
    const firstExpectation = expect(pendingFirst).rejects.toThrow('runtime이 준비 완료 전에 종료');
    const second = runtimeOptions('second');

    const uninstallSecond = installRuntime(second);
    await firstExpectation;

    expect(upstreamUninstallers[0]).toHaveBeenCalledOnce();
    uninstallFirst();
    expect(upstreamUninstallers[1]).not.toHaveBeenCalled();
    await expect(waitForDesktopStudioHandlers()).resolves.toMatchObject({
      loadFile: second.handlers.loadFile,
      exportHwpx: second.handlers.exportHwpx,
    });

    uninstallSecond();
    uninstallSecond();
    expect(upstreamUninstallers[1]).toHaveBeenCalledOnce();
  });

  it('keeps the current registration when replacement installation throws', async () => {
    const first = runtimeOptions('first');
    installRuntime(first);
    await expect(waitForDesktopStudioHandlers()).resolves.toMatchObject({
      loadFile: first.handlers.loadFile,
    });
    const error = new Error('upstream install failed');
    installUpstreamEmbedRuntime.mockImplementationOnce(() => { throw error; });

    expect(() => installEmbedRuntime(runtimeOptions('failed') as never)).toThrow(error);

    await expect(waitForDesktopStudioHandlers()).resolves.toMatchObject({
      loadFile: first.handlers.loadFile,
    });
    expect(upstreamUninstallers[0]).not.toHaveBeenCalled();
  });

  it('releases a pending consumer and clears its timer when handlers register', async () => {
    vi.useFakeTimers();
    const pending = waitForDesktopStudioHandlers(500);
    const options = runtimeOptions('pending');
    expect(vi.getTimerCount()).toBe(1);

    installRuntime(options);

    await expect(pending).resolves.toMatchObject({
      loadFile: options.handlers.loadFile,
      exportHwpx: options.handlers.exportHwpx,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects registration-owned waiters on uninstall and supports a clean reinstall', async () => {
    vi.useFakeTimers();
    const uninstallFirst = installRuntime(runtimeOptions('first'));
    const pending = waitForDesktopStudioHandlers(500);
    const rejection = expect(pending).rejects.toThrow('runtime이 준비 완료 전에 종료');
    expect(vi.getTimerCount()).toBe(1);

    uninstallFirst();
    await rejection;
    expect(vi.getTimerCount()).toBe(0);

    const second = runtimeOptions('second');
    installRuntime(second);
    await expect(waitForDesktopStudioHandlers(500)).resolves.toMatchObject({
      loadFile: second.handlers.loadFile,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not let repeated stale cleanup reject consumers waiting for a reinstall', async () => {
    const uninstallFirst = installRuntime(runtimeOptions('first'));
    uninstallFirst();
    uninstallFirst();
    const pending = waitForDesktopStudioHandlers(500);

    uninstallFirst();
    const second = runtimeOptions('second');
    installRuntime(second);

    await expect(pending).resolves.toMatchObject({ loadFile: second.handlers.loadFile });
    expect(upstreamUninstallers[0]).toHaveBeenCalledOnce();
  });

  it('rejects consumers and clears timers when handlers never register', async () => {
    vi.useFakeTimers();
    const pending = waitForDesktopStudioHandlers(250);
    const expectation = expect(pending).rejects.toThrow('250ms를 초과');
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(250);
    await expectation;

    expect(vi.getTimerCount()).toBe(0);
  });
});

function installRuntime(options: ReturnType<typeof runtimeOptions>): () => void {
  const uninstall = installEmbedRuntime(options as never);
  runtimeUninstallers.push(uninstall);
  return uninstall;
}

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
