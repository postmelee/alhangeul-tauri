import type { LocalFontEntry } from './local-font-records';

const loadedEntryKeys = new Set<string>();
const binaryCache = new Map<string, Promise<Uint8Array>>();

export async function listDesktopFontEntries(): Promise<LocalFontEntry[]> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<LocalFontEntry[]>('list_local_fonts');
}

export async function readDesktopFontBytes(path: string): Promise<Uint8Array> {
  let pending = binaryCache.get(path);
  if (!pending) {
    pending = (async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      return new Uint8Array(await invoke<number[]>('read_local_font', { path }));
    })();
    binaryCache.set(path, pending);
  }
  try {
    return await pending;
  } catch (error) {
    binaryCache.delete(path);
    throw error;
  }
}

export async function ensureDesktopFontFace(entry: LocalFontEntry): Promise<void> {
  if (!entry.path || loadedEntryKeys.has(entryKey(entry))) return;
  const source = (await readDesktopFontBytes(entry.path)).slice();
  const descriptors: FontFaceDescriptors = { style: entry.style || 'normal' };
  if (entry.weight) descriptors.weight = String(entry.weight);
  const face = new FontFace(entry.family, source, descriptors);
  document.fonts.add(await face.load());
  loadedEntryKeys.add(entryKey(entry));
}

export function resetDesktopFontProvider(): void {
  loadedEntryKeys.clear();
  binaryCache.clear();
}

function entryKey(entry: LocalFontEntry): string {
  return [
    entry.family,
    entry.postScriptName,
    entry.style,
    entry.weight ?? '',
    entry.path ?? '',
  ].join('\u0000');
}
