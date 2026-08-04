import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandDispatcher } from './dispatcher';

const ensureDesktopEvents = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const host = vi.hoisted(() => ({ bindCommandServices: vi.fn() }));

vi.mock('@upstream/command/dispatcher', () => ({
  CommandDispatcher: class {
    dispatch = vi.fn(() => true);
  },
}));
vi.mock('../core/desktop-host', () => ({ getDesktopHost: () => host }));
vi.mock('../core/desktop-events', () => ({ ensureDesktopEvents }));

describe('desktop command dispatcher adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
  });

  it('has no desktop side effects outside Tauri', () => {
    new CommandDispatcher({} as never, {} as never, {} as never);

    expect(host.bindCommandServices).not.toHaveBeenCalled();
    expect(ensureDesktopEvents).not.toHaveBeenCalled();
  });

  it('binds native events to the same upstream dispatcher and services', async () => {
    (globalThis as { window?: unknown }).window = {
      __TAURI_INTERNALS__: {},
      location: { protocol: 'tauri:' },
    };
    (globalThis as { document?: unknown }).document = { getElementById: vi.fn(() => null) };
    const services = {};
    const dispatcher = new CommandDispatcher({} as never, services as never, {} as never);

    await vi.waitFor(() => expect(ensureDesktopEvents).toHaveBeenCalledOnce());
    expect(host.bindCommandServices).toHaveBeenCalledWith(services);
    expect(ensureDesktopEvents).toHaveBeenCalledWith(expect.objectContaining({
      host,
      dispatcher,
      setMessage: expect.any(Function),
    }));
  });
});
