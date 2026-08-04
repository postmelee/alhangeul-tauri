export type DesktopPlatform = 'windows' | 'linux' | 'unknown';

type NavigatorLike = Pick<Navigator, 'platform' | 'userAgent'> | undefined;
type PlatformResolver = () => Promise<DesktopPlatform>;

let desktopPlatformOverride: DesktopPlatform | null = null;

export function isTauriRuntime(
  windowLike: (Pick<Window, 'location'> & { __TAURI_INTERNALS__?: unknown }) | undefined =
    typeof window === 'undefined' ? undefined : window,
): boolean {
  return Boolean(
    windowLike
    && ('__TAURI_INTERNALS__' in windowLike || windowLike.location?.protocol === 'tauri:'),
  );
}

export function detectDesktopPlatform(
  nav: NavigatorLike = typeof navigator === 'undefined' ? undefined : navigator,
): DesktopPlatform {
  if (desktopPlatformOverride) return desktopPlatformOverride;

  const platform = (nav?.platform ?? '').toLowerCase();
  const userAgent = (nav?.userAgent ?? '').toLowerCase();

  if (platform.includes('win') || userAgent.includes('windows')) return 'windows';
  if (platform.includes('linux') || userAgent.includes('linux')) return 'linux';
  return 'unknown';
}

export async function hydrateDesktopPlatform(
  resolvePlatform: PlatformResolver = invokeDesktopPlatform,
): Promise<DesktopPlatform> {
  const platform = await resolvePlatform().catch(() => detectDesktopPlatform());
  desktopPlatformOverride = platform;
  return platform;
}

export function resetDesktopPlatformOverride(): void {
  desktopPlatformOverride = null;
}

async function invokeDesktopPlatform(): Promise<DesktopPlatform> {
  if (!isTauriRuntime()) {
    return detectDesktopPlatform();
  }

  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<DesktopPlatform>('desktop_platform');
}
