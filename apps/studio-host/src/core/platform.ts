export type DesktopPlatform = 'windows' | 'linux' | 'unknown';

type NavigatorLike = Pick<Navigator, 'platform' | 'userAgent'> | undefined;
type PlatformResolver = () => Promise<DesktopPlatform>;

let desktopPlatformOverride: DesktopPlatform | null = null;

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
  if (typeof window === 'undefined' || window.location?.protocol !== 'tauri:') {
    return detectDesktopPlatform();
  }

  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<DesktopPlatform>('desktop_platform');
}
