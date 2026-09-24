import { normalizeFontEntries, type LocalFontEntry } from './local-font-records';
import { subscribeFontPreferences } from './local-font-preferences';
import { resetDesktopFontProvider } from './local-font-provider';

let entries: LocalFontEntry[] | null = null;
let detectedAt: string | null = null;
let error: string | null = null;
let generation = 0;
let pending: Promise<LocalFontEntry[]> | null = null;

export function getFontCatalog() {
  return { entries, detectedAt, error, generation };
}

export function invalidateFontCatalog(): void {
  generation += 1;
  entries = null;
  detectedAt = null;
  error = null;
  pending = null;
  resetDesktopFontProvider();
}

subscribeFontPreferences(invalidateFontCatalog);

export async function loadFontCatalog(
  loader: () => Promise<LocalFontEntry[]>, force = false,
): Promise<LocalFontEntry[]> {
  if (force) invalidateFontCatalog();
  if (entries) return entries;
  if (pending) return pending;
  if (error) throw new Error(error);
  const started = generation;
  const request = (async () => {
    try {
      const result = normalizeFontEntries(await loader());
      if (started !== generation) return [];
      entries = result;
      detectedAt = new Date().toISOString();
      return result;
    } catch {
      if (started !== generation) return [];
      error = '로컬 글꼴 목록을 읽지 못했습니다. 설정에서 다시 감지할 수 있습니다.';
      throw new Error(error);
    }
  })();
  pending = request;
  try { return await request; } finally { if (pending === request) pending = null; }
}
