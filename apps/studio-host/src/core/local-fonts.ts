import { filterAuthoringFontFamilies, isAuthoringBlockedFontFamily } from './font-authoring-policy';

interface BrowserFontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
}

export interface LocalFontEntry {
  family: string;
  postScriptName: string;
  style: string;
  weight?: number;
  sourceKind: 'system-installed' | 'file-backed';
  path?: string | null;
}

export type LocalFontDetectionSource = 'local-font-access' | 'font-presence-probe';

export interface LocalFontRecord {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  displayName: string;
  aliases: string[];
}

export interface LocalFontSnapshot {
  version: 2;
  detectedAt: string;
  families: string[];
  fontRecords: LocalFontRecord[];
  source: LocalFontDetectionSource;
}

export interface LocalFontState {
  supported: boolean;
  method: LocalFontDetectionSource | null;
  loaded: boolean;
  stored: boolean;
  source: LocalFontDetectionSource | null;
  complete: boolean;
  storage: 'none';
  count: number;
  checkedFamilies: string[];
  detectedAt: string | null;
  lastError: string | null;
}

export interface DetectLocalFontsOptions {
  force?: boolean;
  includeRegistered?: boolean;
  candidateFamilies?: readonly string[];
}

export interface GetLocalFontsOptions {
  includeRegistered?: boolean;
}

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<BrowserFontData[]>;
  }
}

let cachedFontEntries: LocalFontEntry[] | null = null;
let cachedDetectedAt: string | null = null;
const loadedFileBackedEntryKeys = new Set<string>();
const desktopFontBinaryCache = new Map<string, Promise<Uint8Array>>();

export function isLocalFontSupported(): boolean {
  return isDesktopTauriRuntime()
    || (typeof window !== 'undefined' && typeof window.queryLocalFonts === 'function');
}

export function isLocalFontAccessSupported(): boolean {
  return isLocalFontSupported();
}

export async function detectLocalFontEntries(force = false): Promise<LocalFontEntry[]> {
  if (force) {
    cachedFontEntries = null;
    cachedDetectedAt = null;
    desktopFontBinaryCache.clear();
    loadedFileBackedEntryKeys.clear();
  }
  if (cachedFontEntries) {
    return cachedFontEntries;
  }

  const entries = isDesktopTauriRuntime()
    ? await detectDesktopFontEntries()
    : await detectBrowserFontEntries();

  cachedFontEntries = normalizeFontEntries(entries);
  cachedDetectedAt = new Date().toISOString();
  return cachedFontEntries;
}

export async function detectLocalFonts(
  options: DetectLocalFontsOptions = {},
): Promise<string[]> {
  const entries = await detectLocalFontEntries(options.force);
  return uniqueAuthoringFamilies(entries);
}

export function getLocalFonts(_options: GetLocalFontsOptions = {}): string[] {
  return uniqueAuthoringFamilies(cachedFontEntries ?? []);
}

export function getDetectedLocalFonts(): string[] {
  return getLocalFonts({ includeRegistered: true });
}

export function getLocalFontRecords(
  _options: GetLocalFontsOptions = {},
): LocalFontRecord[] {
  return (cachedFontEntries ?? []).map(toLocalFontRecord);
}

export function resolveLocalFont(fontName: string): LocalFontRecord | null {
  const key = normalizeFontName(fontName);
  if (!key) return null;
  const records = getLocalFontRecords({ includeRegistered: true }).filter((record) =>
    record.aliases.some((alias) => normalizeFontName(alias) === key));
  if (records.length === 1) return records[0];
  return records.find((record) => normalizeFontName(record.postscriptName) === key)
    ?? null;
}

export function localFontFaceKey(
  record: Pick<LocalFontRecord, 'family' | 'fullName' | 'postscriptName'>,
): string {
  return normalizeFontName(record.postscriptName || record.fullName || record.family);
}

export async function loadLocalFontBytesFor(
  fontNames: readonly string[],
): Promise<Map<string, ArrayBuffer>> {
  const result = new Map<string, ArrayBuffer>();
  for (const fontName of fontNames) {
    const record = resolveLocalFont(fontName);
    if (!record) continue;
    const entry = (cachedFontEntries ?? []).find(
      (candidate) => candidate.postScriptName === record.postscriptName,
    );
    if (!entry?.path) continue;
    try {
      const bytes = await readDesktopFontBytes(entry.path);
      result.set(
        localFontFaceKey(record),
        bytes.slice().buffer as ArrayBuffer,
      );
    } catch {
      // CanvasKit falls back to bundled fonts when native bytes cannot be read.
    }
  }
  return result;
}

export async function loadLocalFontBytes(fontName: string): Promise<ArrayBuffer | null> {
  const record = resolveLocalFont(fontName);
  if (!record) return null;
  return (await loadLocalFontBytesFor([fontName])).get(localFontFaceKey(record)) ?? null;
}

export async function loadStoredLocalFonts(): Promise<LocalFontSnapshot | null> {
  return currentSnapshot();
}

export async function clearStoredLocalFonts(): Promise<void> {
  cachedFontEntries = null;
  cachedDetectedAt = null;
  desktopFontBinaryCache.clear();
  loadedFileBackedEntryKeys.clear();
}

export function getLocalFontState(): LocalFontState {
  const snapshot = currentSnapshot();
  return {
    supported: isLocalFontSupported(),
    method: isLocalFontSupported() ? 'local-font-access' : null,
    loaded: cachedFontEntries !== null,
    stored: snapshot !== null,
    source: snapshot?.source ?? null,
    complete: snapshot !== null,
    storage: 'none',
    count: snapshot?.families.length ?? 0,
    checkedFamilies: snapshot?.families ?? [],
    detectedAt: snapshot?.detectedAt ?? null,
    lastError: null,
  };
}

export function resetLocalFontsForTests(): void {
  cachedFontEntries = null;
  cachedDetectedAt = null;
  desktopFontBinaryCache.clear();
  loadedFileBackedEntryKeys.clear();
}

export async function ensureLocalFontsAvailable(targetFamilies?: Iterable<string>): Promise<Set<string>> {
  const entries = await detectLocalFontEntries();
  const available = new Set(
    entries
      .filter((entry) => entry.sourceKind === 'system-installed')
      .filter((entry) => !isAuthoringBlockedFontFamily(entry.family))
      .map((entry) => entry.family),
  );
  const requestedFamilies = resolveRequestedFamilies(entries, targetFamilies);

  if (!isDesktopTauriRuntime() || !supportsBinaryFontLoading()) {
    return available;
  }

  const fileBackedEntries = entries.filter((entry) =>
    entry.sourceKind === 'file-backed'
    && Boolean(entry.path)
    && requestedFamilies.has(entry.family),
  );
  const entriesByPath = groupEntriesByPath(fileBackedEntries);

  for (const [path, pathEntries] of entriesByPath) {
    let fontBytes: Uint8Array;
    try {
      fontBytes = await readDesktopFontBytes(path);
    } catch {
      continue;
    }

    for (const entry of pathEntries) {
      const entryKey = fileBackedEntryKey(entry);
      if (loadedFileBackedEntryKeys.has(entryKey)) {
        if (!isAuthoringBlockedFontFamily(entry.family)) {
          available.add(entry.family);
        }
        continue;
      }

      try {
        await registerDesktopFontFace(entry, fontBytes);
        loadedFileBackedEntryKeys.add(entryKey);
        if (!isAuthoringBlockedFontFamily(entry.family)) {
          available.add(entry.family);
        }
      } catch {
        // File-backed fonts are best-effort; substitute fallback remains available.
      }
    }
  }

  return available;
}

async function detectDesktopFontEntries(): Promise<LocalFontEntry[]> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<LocalFontEntry[]>('list_local_fonts');
}

async function detectBrowserFontEntries(): Promise<LocalFontEntry[]> {
  if (typeof window === 'undefined' || typeof window.queryLocalFonts !== 'function') {
    return [];
  }

  const fontDataList = await window.queryLocalFonts();
  return fontDataList.map((font) => ({
    family: font.family,
    postScriptName: font.postscriptName,
    style: font.style || 'normal',
    sourceKind: 'system-installed',
  }));
}

async function readDesktopFontBytes(path: string): Promise<Uint8Array> {
  let pending = desktopFontBinaryCache.get(path);
  if (!pending) {
    pending = (async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const bytes = await invoke<number[]>('read_local_font', { path });
      return new Uint8Array(bytes);
    })();
    desktopFontBinaryCache.set(path, pending);
  }

  try {
    return await pending;
  } catch (error) {
    desktopFontBinaryCache.delete(path);
    throw error;
  }
}

async function registerDesktopFontFace(entry: LocalFontEntry, fontBytes: Uint8Array): Promise<void> {
  const source = fontBytes.slice();
  const descriptors: FontFaceDescriptors = {
    style: entry.style || 'normal',
  };
  if (entry.weight) {
    descriptors.weight = String(entry.weight);
  }

  const face = new FontFace(entry.family, source, descriptors);
  document.fonts.add(await face.load());
}

function normalizeFontEntries(entries: LocalFontEntry[]): LocalFontEntry[] {
  const seen = new Set<string>();
  const normalized: LocalFontEntry[] = [];

  for (const entry of entries) {
    const family = entry.family.trim();
    if (!family) continue;

    const postScriptName = entry.postScriptName?.trim() || family;
    const style = entry.style?.trim() || 'normal';
    const sourceKind = entry.sourceKind ?? 'system-installed';
    const path = entry.path ?? null;
    const key = [family, postScriptName, style, sourceKind, path ?? ''].join('\u0000');
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({
      family,
      postScriptName,
      style,
      weight: entry.weight,
      sourceKind,
      path,
    });
  }

  normalized.sort((left, right) =>
    left.family.localeCompare(right.family, 'ko')
    || left.style.localeCompare(right.style, 'en')
    || left.postScriptName.localeCompare(right.postScriptName, 'en'),
  );
  return normalized;
}

function resolveRequestedFamilies(
  entries: LocalFontEntry[],
  targetFamilies?: Iterable<string>,
): Set<string> {
  if (!targetFamilies) {
    return new Set(
      entries
        .map((entry) => entry.family)
        .filter((family) => !isAuthoringBlockedFontFamily(family)),
    );
  }

  return new Set(
    Array.from(targetFamilies)
      .map((family) => family.trim())
      .filter((family) => family && !isAuthoringBlockedFontFamily(family)),
  );
}

function groupEntriesByPath(entries: LocalFontEntry[]): Map<string, LocalFontEntry[]> {
  const grouped = new Map<string, LocalFontEntry[]>();
  for (const entry of entries) {
    const path = entry.path;
    if (!path) continue;
    const pathEntries = grouped.get(path) ?? [];
    pathEntries.push(entry);
    grouped.set(path, pathEntries);
  }
  return grouped;
}

function fileBackedEntryKey(entry: LocalFontEntry): string {
  return [
    entry.family,
    entry.postScriptName,
    entry.style,
    entry.weight ?? '',
    entry.path ?? '',
  ].join('\u0000');
}

function uniqueAuthoringFamilies(entries: LocalFontEntry[]): string[] {
  const families = filterAuthoringFontFamilies(entries.map((entry) => entry.family));
  return Array.from(new Set(families)).sort((a, b) => a.localeCompare(b, 'ko'));
}

function toLocalFontRecord(entry: LocalFontEntry): LocalFontRecord {
  const aliases = Array.from(new Set([entry.family, entry.postScriptName].filter(Boolean)));
  return {
    family: entry.family,
    fullName: entry.family,
    postscriptName: entry.postScriptName,
    style: entry.style,
    displayName: entry.family,
    aliases,
  };
}

function normalizeFontName(value: string): string {
  return value
    .replace(/\u0000/g, '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en-US');
}

function currentSnapshot(): LocalFontSnapshot | null {
  if (!cachedFontEntries) return null;
  const fontRecords = getLocalFontRecords({ includeRegistered: true });
  return {
    version: 2,
    detectedAt: cachedDetectedAt ?? new Date().toISOString(),
    families: uniqueAuthoringFamilies(cachedFontEntries),
    fontRecords,
    source: 'local-font-access',
  };
}

function supportsBinaryFontLoading(): boolean {
  return typeof document !== 'undefined'
    && !!document.fonts
    && typeof FontFace === 'function';
}

function isDesktopTauriRuntime(): boolean {
  return typeof window !== 'undefined'
    && (
      '__TAURI_INTERNALS__' in window
      || window.location?.protocol === 'tauri:'
    );
}
