import { isAuthoringBlockedFontFamily } from './font-authoring-policy';
import type { LocalFontStyleRequest } from './host-font-contract';
import { getFontCatalog } from './local-font-state';
import { normalizeFontName, type LocalFontRecord } from './local-font-records';
import { loadRendererLocalFont } from './local-font-renderer';

export function resolveLocalFontProgramCandidates(name: string): LocalFontRecord[] {
  if (isAuthoringBlockedFontFamily(name)) return [];
  return getFontCatalog().lookup?.programs(name) ?? [];
}

export function resolveRendererLocalFontCandidates(name: string, style: LocalFontStyleRequest): LocalFontRecord[] {
  if (isAuthoringBlockedFontFamily(name)) return [];
  return getFontCatalog().lookup?.programs(name, style) ?? [];
}

export async function loadPreferredLocalFontBytes(record: LocalFontRecord): Promise<ArrayBuffer | null> {
  const data = await loadRendererLocalFont(record);
  // The declared-program consumer accepts standalone faces; collection indices belong to the renderer.
  return data?.faceIndex === 0 ? data.bytes : null;
}

export function localFontProgramOrder(bytes: ArrayBuffer): number {
  const tag = bytes.byteLength >= 4 ? new DataView(bytes).getUint32(0) : 0;
  return tag === 0x00010000 || tag === 0x74727565 ? 0 : 2;
}

export function localFontNamesIntersect(left: readonly string[], right: readonly string[]): boolean {
  const names = new Set(left.map(normalizeFontName));
  return right.some(name => names.has(normalizeFontName(name)));
}

export function changedLocalFontNames(before: readonly LocalFontRecord[], after: readonly LocalFontRecord[]): string[] {
  const identity = (record: LocalFontRecord) => JSON.stringify([record.sourceKey, record.family, record.fullName,
    record.postscriptName, record.style, [...record.aliases].sort()]);
  const oldFaces = new Set(before.map(identity));
  const newFaces = new Set(after.map(identity));
  const changed = [...before.filter(face => !newFaces.has(identity(face))), ...after.filter(face => !oldFaces.has(identity(face)))];
  return [...new Set(changed.flatMap(face => [face.family, face.fullName, face.postscriptName, ...face.aliases]))];
}
