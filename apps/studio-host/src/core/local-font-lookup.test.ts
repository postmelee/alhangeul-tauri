import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lookupCatalog, lookupEnabledPreference, lookupFont } from './local-font-lookup.fixture';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke }));

beforeEach(async () => {
  vi.resetModules();
  invoke.mockReset();
  vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
  const { acceptFontPreferences } = await import('./local-font-preferences');
  acceptFontPreferences(lookupEnabledPreference);
});
afterEach(() => vi.unstubAllGlobals());

async function detect(entries = lookupCatalog(2)) {
  invoke.mockResolvedValue(entries);
  const fonts = await import('./local-fonts');
  await fonts.detectLocalFontEntries();
  return fonts;
}

describe('local-font lookup semantics before indexing', () => {
  it('does not keep a miss from before catalog loading in the same generation', async () => {
    const fonts = await import('./local-fonts');
    const { getFontCatalog } = await import('./local-font-state');
    const generation = getFontCatalog().generation;
    expect(fonts.resolveLocalFont('Lookup0-Bold')).toBeNull();
    invoke.mockResolvedValue(lookupCatalog(2));
    await fonts.detectLocalFontEntries();
    expect(getFontCatalog().generation).toBe(generation);
    expect(fonts.resolveLocalFont('Lookup0-Bold')?.postscriptName).toBe('Lookup0-Bold');
  });

  it('normalizes aliases and keeps ambiguous family requests unresolved', async () => {
    const fonts = await detect();
    const bold = fonts.resolveLocalFont('Lookup0-Bold');
    expect(bold).not.toBeNull();
    for (const name of ['Lookup Family 0 Bold', '조회 글꼴 0 Bold', '  조회   글꼴 0 bold  ',
      '조회 글꼴 0 Bold'.normalize('NFD')]) {
      expect(fonts.resolveLocalFont(name)).toEqual(bold);
    }
    expect(fonts.resolveLocalFont('Lookup Family 0')).toBeNull();
    expect(fonts.resolveLocalFont('조회 글꼴 0')).toBeNull();
    expect(fonts.resolveLocalFont('Missing Font')).toBeNull();
    expect(fonts.resolveLocalFont('')).toBeNull();
  });

  it('prefers an exact PostScript name to another face full name or alias', async () => {
    const fonts = await detect([
      lookupFont(0, { postScriptName: 'Shared Name' }),
      lookupFont(1, { fullName: 'Shared Name' }),
      lookupFont(2, { aliases: ['Shared Name'] }),
    ]);
    expect(fonts.resolveLocalFont('Shared Name')?.postscriptName).toBe('Shared Name');
  });

  it('uses one exact full name when PostScript matches remain ambiguous', async () => {
    const fonts = await detect([
      lookupFont(0, { postScriptName: 'Shared Name' }),
      lookupFont(1, { postScriptName: 'Shared Name' }),
      lookupFont(2, { fullName: 'Shared Name' }),
    ]);
    expect(fonts.resolveLocalFont('Shared Name')?.postscriptName).toBe('Lookup1-Regular');
  });

  it('keeps identical names in distinct physical files ambiguous', async () => {
    const fonts = await detect([lookupFont(0), lookupFont(0, { path: '/synthetic-fonts/copy.ttf' })]);
    expect(fonts.getLocalFontRecords()).toHaveLength(2);
    expect(fonts.resolveLocalFont('Lookup0-Regular')).toBeNull();
    expect(fonts.resolveLocalFont('Lookup Family 0 Regular')).toBeNull();
  });

  it('merges localized rows for the same face without losing its source key', async () => {
    const fonts = await detect([lookupFont(0), lookupFont(0, { family: '조회 글꼴 0' })]);
    expect(fonts.getLocalFontRecords()).toHaveLength(1);
    const record = fonts.resolveLocalFont('조회 글꼴 0');
    expect(record).not.toBeNull();
    expect(record?.sourceKey).toBe(fonts.resolveLocalFont('Lookup0-Regular')?.sourceKey);
  });

  it('drops a failed face immediately even when both generations are unchanged', async () => {
    const fonts = await detect();
    const { getFontCatalog } = await import('./local-font-state');
    const provider = await import('./local-font-provider');
    const catalogGeneration = getFontCatalog().generation;
    const providerGeneration = provider.desktopFontGeneration();
    expect(fonts.resolveLocalFont('Lookup0-Bold')).not.toBeNull();
    invoke.mockRejectedValue(new Error('synthetic read failure'));
    await expect(provider.readDesktopFontBytes(lookupFont(1).path!)).rejects.toThrow();
    expect(getFontCatalog().generation).toBe(catalogGeneration);
    expect(provider.desktopFontGeneration()).toBe(providerGeneration);
    expect(fonts.resolveLocalFont('Lookup0-Bold')).toBeNull();
    expect(fonts.getLocalFontRecords().map(record => record.postscriptName)).toEqual(['Lookup0-Regular']);
    // Removing the failed candidate makes the previously ambiguous family unique.
    expect(fonts.resolveLocalFont('Lookup Family 0')?.postscriptName).toBe('Lookup0-Regular');
  });

  it('restores a failed candidate on provider reset without replacing the catalog', async () => {
    const fonts = await detect();
    const { getFontCatalog } = await import('./local-font-state');
    const provider = await import('./local-font-provider');
    const entries = getFontCatalog().entries;
    invoke.mockRejectedValue(new Error('synthetic read failure'));
    await expect(provider.readDesktopFontBytes(lookupFont(1).path!)).rejects.toThrow();
    expect(fonts.resolveLocalFont('Lookup0-Bold')).toBeNull();
    provider.resetDesktopFontProvider();
    expect(getFontCatalog().entries).toBe(entries);
    expect(fonts.resolveLocalFont('Lookup0-Bold')?.postscriptName).toBe('Lookup0-Bold');
    expect(fonts.resolveLocalFont('Lookup Family 0')).toBeNull();
  });

  it('replaces both hits and misses after a forced catalog refresh', async () => {
    const fonts = await detect([lookupFont(0)]);
    expect(fonts.resolveLocalFont('Lookup0-Regular')).not.toBeNull();
    expect(fonts.resolveLocalFont('Lookup0-Bold')).toBeNull();
    invoke.mockResolvedValue([lookupFont(1)]);
    await fonts.detectLocalFontEntries(true);
    expect(fonts.resolveLocalFont('Lookup0-Regular')).toBeNull();
    expect(fonts.resolveLocalFont('Lookup0-Bold')).not.toBeNull();
  });

  it('clears lookup state when disabled and reloads after being enabled again', async () => {
    const fonts = await detect();
    const { acceptFontPreferences } = await import('./local-font-preferences');
    expect(fonts.resolveLocalFont('Lookup0-Bold')).not.toBeNull();
    acceptFontPreferences({ ...lookupEnabledPreference, choice: 'disabled', revision: 2 });
    expect(fonts.resolveLocalFont('Lookup0-Bold')).toBeNull();
    invoke.mockClear();
    expect(await fonts.detectLocalFontEntries()).toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
    acceptFontPreferences({ ...lookupEnabledPreference, revision: 3 });
    await fonts.detectLocalFontEntries();
    expect(fonts.resolveLocalFont('Lookup0-Bold')).not.toBeNull();
    expect(invoke).toHaveBeenCalledExactlyOnceWith('list_local_fonts');
  });

  it('does not expose blocked families through an otherwise permitted alias', async () => {
    const fonts = await detect([lookupFont(0, { family: 'HY헤드라인M' }),
      lookupFont(1, { aliases: ['HY헤드라인M', 'Allowed Alias'] })]);
    expect(fonts.resolveLocalFont('Lookup0-Regular')).toBeNull();
    expect(fonts.resolveLocalFont('HY헤드라인M')).toBeNull();
    expect(fonts.resolveLocalFont('Allowed Alias')?.postscriptName).toBe('Lookup0-Bold');
  });

  it('does not let public record edits corrupt subsequent resolution', async () => {
    const fonts = await detect();
    const records = fonts.getLocalFontRecords();
    records[0].aliases.push('Injected Alias');
    records[0].fullName = 'Changed Name';
    records.length = 0;
    expect(fonts.resolveLocalFont('Injected Alias')).toBeNull();
    const bold = fonts.resolveLocalFont('Lookup0-Bold')!;
    bold.postscriptName = 'Changed PostScript';
    bold.aliases.length = 0;
    expect(fonts.resolveLocalFont('Lookup0-Bold')?.postscriptName).toBe('Lookup0-Bold');
  });
});
