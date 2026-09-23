import { isAuthoringBlockedFontFamily } from './font-authoring-policy';
import {
  ensureDesktopFontFace,
  listDesktopFontEntries,
  readDesktopFontBytes,
  resetDesktopFontProvider,
} from './local-font-provider';
import {
  normalizeFontEntries,
  normalizeFontName,
  resolveRequestedFamilies,
  toLocalFontRecord,
  uniqueAuthoringFamilies,
  type LocalFontEntry,
  type LocalFontRecord,
} from './local-font-records';
import { isTauriRuntime } from './platform';

export type { LocalFontEntry, LocalFontRecord } from './local-font-records';

interface BrowserFontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
}

export type LocalFontDetectionSource = 'local-font-access' | 'font-presence-probe';

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

export function isLocalFontSupported(): boolean {
  return isTauriRuntime()
    || (typeof window !== 'undefined' && typeof window.queryLocalFonts === 'function');
}

export function isLocalFontAccessSupported(): boolean {
  return isLocalFontSupported();
}

export async function detectLocalFontEntries(force = false): Promise<LocalFontEntry[]> {
  if (force) {
    cachedFontEntries = null;
    cachedDetectedAt = null;
    resetDesktopFontProvider();
  }
  if (cachedFontEntries) {
    return cachedFontEntries;
  }

  const entries = isTauriRuntime()
    ? await listDesktopFontEntries()
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
  resetDesktopFontProvider();
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
  resetDesktopFontProvider();
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

  if (!isTauriRuntime() || !supportsBinaryFontLoading()) {
    return available;
  }

  const fileBackedEntries = entries.filter((entry) =>
    entry.sourceKind === 'file-backed'
    && Boolean(entry.path)
    && requestedFamilies.has(entry.family),
  );
  for (const entry of fileBackedEntries) {
    try {
      await ensureDesktopFontFace(entry);
      if (!isAuthoringBlockedFontFamily(entry.family)) available.add(entry.family);
    } catch {
      // File-backed fonts are best-effort; substitute fallback remains available.
    }
  }

  return available;
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
