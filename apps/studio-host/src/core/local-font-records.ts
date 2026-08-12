import {
  filterAuthoringFontFamilies,
  isAuthoringBlockedFontFamily,
} from './font-authoring-policy';

export interface LocalFontEntry {
  family: string;
  postScriptName: string;
  style: string;
  weight?: number;
  sourceKind: 'system-installed' | 'file-backed';
  path?: string | null;
}

export interface LocalFontRecord {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  displayName: string;
  aliases: string[];
}

export function normalizeFontEntries(entries: LocalFontEntry[]): LocalFontEntry[] {
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
    || left.postScriptName.localeCompare(right.postScriptName, 'en'));
  return normalized;
}

export function resolveRequestedFamilies(
  entries: LocalFontEntry[],
  targetFamilies?: Iterable<string>,
): Set<string> {
  const families = targetFamilies ?? entries.map((entry) => entry.family);
  return new Set(
    Array.from(families)
      .map((family) => family.trim())
      .filter((family) => family && !isAuthoringBlockedFontFamily(family)),
  );
}

export function uniqueAuthoringFamilies(entries: LocalFontEntry[]): string[] {
  const families = filterAuthoringFontFamilies(entries.map((entry) => entry.family));
  return Array.from(new Set(families)).sort((a, b) => a.localeCompare(b, 'ko'));
}

export function toLocalFontRecord(entry: LocalFontEntry): LocalFontRecord {
  return {
    family: entry.family,
    fullName: entry.family,
    postscriptName: entry.postScriptName,
    style: entry.style,
    displayName: entry.family,
    aliases: Array.from(new Set([entry.family, entry.postScriptName].filter(Boolean))),
  };
}

export function normalizeFontName(value: string): string {
  return value
    .replace(/\u0000/g, '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en-US');
}
