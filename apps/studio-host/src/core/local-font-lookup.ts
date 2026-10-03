import { desktopFontUnavailable } from './local-font-provider';
import {
  normalizeFontName, toLocalFontRecord,
  type LocalFontEntry, type LocalFontRecord,
} from './local-font-records';

interface IndexedFont {
  entry: LocalFontEntry;
  record: LocalFontRecord;
  postscriptKey: string;
  fullNameKey: string;
}

export interface LocalFontLookup {
  records(): LocalFontRecord[];
  resolve(name: string): LocalFontRecord | null;
  entryFor(sourceKey: string | undefined): LocalFontEntry | undefined;
}

/** Owned by one catalog; only candidate availability is read dynamically. */
export function createLocalFontLookup(entries: readonly LocalFontEntry[]): LocalFontLookup {
  const fonts: IndexedFont[] = [];
  const aliases = new Map<string, IndexedFont[]>();
  const sources = new Map<string, LocalFontEntry>();
  for (const entry of entries) {
    const record = toLocalFontRecord(entry);
    const font = {
      entry, record,
      postscriptKey: normalizeFontName(record.postscriptName),
      fullNameKey: normalizeFontName(record.fullName),
    };
    fonts.push(font);
    if (record.sourceKey) sources.set(record.sourceKey, entry);
    // Different spellings of the same alias must not duplicate a face candidate.
    for (const key of new Set(record.aliases.map(normalizeFontName))) {
      const candidates = aliases.get(key);
      if (candidates) candidates.push(font);
      else aliases.set(key, [font]);
    }
  }
  return {
    records: () => fonts.filter(isAvailable).map(font => copyRecord(font.record)),
    resolve: (name) => resolveFromAliases(aliases, name),
    entryFor: (key) => key === undefined ? undefined : sources.get(key),
  };
}

function resolveFromAliases(aliases: ReadonlyMap<string, IndexedFont[]>, name: string): LocalFontRecord | null {
  const key = normalizeFontName(name);
  if (!key) return null;
  const candidates = aliases.get(key)?.filter(isAvailable) ?? [];
  const selected = candidates.length === 1 ? candidates[0]
    : uniqueExact(candidates, key, 'postscriptKey') ?? uniqueExact(candidates, key, 'fullNameKey');
  return selected ? copyRecord(selected.record) : null;
}

function uniqueExact(
  candidates: readonly IndexedFont[], key: string, field: 'postscriptKey' | 'fullNameKey',
): IndexedFont | null {
  let selected: IndexedFont | null = null;
  for (const candidate of candidates) {
    if (candidate[field] !== key) continue;
    if (selected) return null;
    selected = candidate;
  }
  return selected;
}

function isAvailable({ entry }: IndexedFont): boolean {
  return entry.sourceKind !== 'file-backed' || !entry.path || !desktopFontUnavailable(entry.path);
}

function copyRecord(record: LocalFontRecord): LocalFontRecord {
  return { ...record, aliases: [...record.aliases] };
}
