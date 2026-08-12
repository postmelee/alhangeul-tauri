import { afterEach, describe, expect, it } from 'vitest';
import {
  detectDesktopPlatform,
  hydrateDesktopPlatform,
  isTauriRuntime,
  resetDesktopPlatformOverride,
} from './platform';

describe('platform', () => {
  afterEach(() => {
    delete (globalThis as { navigator?: Navigator }).navigator;
    resetDesktopPlatformOverride();
  });

  it('hydrates and reuses a supported desktop platform', async () => {
    await expect(hydrateDesktopPlatform(async () => 'linux')).resolves.toBe('linux');
    expect(detectDesktopPlatform({ platform: 'Win32', userAgent: 'Windows NT 10.0' })).toBe('linux');
  });

  it('falls back to navigator detection when hydration fails', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'Win32', userAgent: 'Windows NT 10.0' },
      configurable: true,
    });

    await expect(hydrateDesktopPlatform(async () => {
      throw new Error('ipc unavailable');
    })).resolves.toBe('windows');
  });

  it('detects both injected and protocol Tauri runtimes', () => {
    expect(isTauriRuntime({ location: { protocol: 'https:' } as Location })).toBe(false);
    expect(isTauriRuntime({
      __TAURI_INTERNALS__: {},
      location: { protocol: 'https:' } as Location,
    })).toBe(true);
    expect(isTauriRuntime({ location: { protocol: 'tauri:' } as Location })).toBe(true);
  });
});
