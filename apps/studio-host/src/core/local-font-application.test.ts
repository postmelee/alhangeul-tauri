import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.hoisted(() => vi.fn());
const destroy = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke }));
// Only the native CanvasKit parser is replaced; renderer/session cache policy is real.
vi.mock('@upstream/view/canvaskit-wasm-url', () => ({ default: '/unused.wasm' }));
vi.mock('canvaskit-wasm', () => ({ default: async () => ({
  Typeface: { MakeFreeTypeFaceFromData: () => ({ delete: destroy }) },
  FontMgr: { FromData: () => ({ countFamilies: () => 1, getFamilyName: () => 'Abel', delete: destroy }) },
}) }));
const bytes = [...readFileSync(resolve(__dirname, '../../../../tests/gui/local-fonts/Abel-Regular.ttf'))];
const entry = { family: 'Abel', postScriptName: 'Abel-Regular', style: 'normal', sourceKind: 'file-backed', path: '/fixture/Abel-Regular.ttf' };
const enabled = { choice: 'enabled' as const, persisted: true, revision: 1, promptDismissed: false, error: null };
let registered: Set<unknown>;
let faceLoad: () => Promise<void>;

async function setup() {
  const prefs = await import('./local-font-preferences');
  prefs.acceptFontPreferences(enabled);
  const fonts = await import('./local-fonts');
  await fonts.loadStoredLocalFonts();
  return { fonts, prefs, provider: await import('./local-font-provider') };
}

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  registered = new Set(); faceLoad = async () => {};
  vi.stubGlobal('window', { __TAURI_INTERNALS__: {}, setTimeout });
  vi.stubGlobal('document', { getElementById: () => null, fonts: { add: (face: unknown) => registered.add(face), delete: (face: unknown) => registered.delete(face) } });
  vi.stubGlobal('FontFace', class {
    constructor(readonly family: string) {}
    async load() { await faceLoad(); return this; }
  });
  vi.stubGlobal('fetch', async () => ({ ok: false }));
  invoke.mockImplementation(async (cmd) => cmd === 'list_local_fonts' ? [entry] : bytes);
});
afterEach(() => vi.unstubAllGlobals());

describe('local font supply lifecycle', () => {
  it('coalesces registration, resolves PostScript aliases, and deletes only owned faces', async () => {
    const foreign = {}; registered.add(foreign);
    const { fonts, prefs } = await setup();
    await Promise.all([fonts.ensureLocalFontsAvailable(['Abel-Regular']), fonts.ensureLocalFontsAvailable(['Abel'])]);
    expect(registered.size).toBe(2);
    expect(invoke.mock.calls.filter(([cmd]) => cmd === 'read_local_font')).toHaveLength(1);
    const { fontFamilyChainForDisplay } = await import('@upstream/core/font-substitution');
    expect(fontFamilyChainForDisplay('Abel-Regular').split(',')[0]).toBe('"Abel"');
    prefs.acceptFontPreferences({ ...enabled, choice: 'disabled', revision: 2 });
    expect([...registered]).toEqual([foreign]);
    expect(await fonts.loadLocalFontBytesFor(['Abel'])).toEqual(new Map());
  });

  it('discards a late FontFace load after the choice changes', async () => {
    let finish!: () => void;
    faceLoad = () => new Promise((resolve) => { finish = resolve; });
    const { fonts, prefs } = await setup();
    const pending = fonts.ensureLocalFontsAvailable(['Abel']);
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    prefs.acceptFontPreferences({ ...enabled, choice: 'disabled', revision: 2 });
    finish();
    expect(await pending).toEqual(new Set());
    expect(registered.size).toBe(0);
  });

  it('discards late bytes without poisoning a newer request', async () => {
    const { fonts, provider } = await setup();
    let fail!: (error: Error) => void;
    invoke.mockReturnValueOnce(new Promise((_, reject) => { fail = reject; }));
    const old = fonts.loadLocalFontBytesFor(['Abel']);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('read_local_font', { path: entry.path }));
    provider.resetDesktopFontProvider();
    const current = await fonts.loadLocalFontBytesFor(['Abel']);
    fail(new Error('private path'));
    expect(await old).toEqual(new Map());
    expect(current.size).toBe(1);
    expect(provider.desktopFontSupplyState().failed).toBe(0);
  });

  it('does not begin registration if detection resumes in a newer provider generation', async () => {
    const { fonts, provider } = await setup();
    let finish!: (entries: unknown) => void;
    invoke.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const detection = fonts.detectLocalFonts({ force: true });
    const pending = fonts.ensureLocalFontsAvailable(['Abel']);
    await vi.waitFor(() => expect(invoke.mock.calls.filter(([cmd]) => cmd === 'list_local_fonts')).toHaveLength(2));
    provider.resetDesktopFontProvider();
    finish([entry]);
    await detection;
    expect(await pending).toEqual(new Set());
    expect(registered.size).toBe(0);
    expect(invoke.mock.calls.filter(([cmd]) => cmd === 'read_local_font')).toHaveLength(0);
  });

  it('rechecks bytes on the next document and removes failed file-backed resolution', async () => {
    const { fonts, provider } = await setup();
    await fonts.ensureLocalFontsAvailable(['Abel']);
    provider.resetDesktopFontProvider();
    invoke.mockRejectedValue(new Error('deleted private path'));
    expect(await fonts.ensureLocalFontsAvailable(['Abel'])).toEqual(new Set());
    expect(fonts.resolveLocalFont('Abel')).toBeNull();
    expect(registered.size).toBe(0);
    expect(provider.desktopFontSupplyState().failed).toBe(1);
    invoke.mockImplementation(async (cmd) => cmd === 'list_local_fonts' ? [entry] : bytes);
    await fonts.detectLocalFonts({ force: true });
    expect(await fonts.ensureLocalFontsAvailable(['Abel'])).toEqual(new Set(['Abel']));
  });

  it('keeps OS resolution distinct from denied bytes and blocks restricted or ambiguous faces', async () => {
    invoke.mockImplementation(async (cmd) => {
      if (cmd === 'list_local_fonts') return [
        { ...entry, sourceKind: 'system-installed' },
        { ...entry, family: 'HYHeadLine M', postScriptName: 'HYHeadLineM' },
        { ...entry, family: 'Duplicate', postScriptName: 'First' },
        { ...entry, family: 'Duplicate', postScriptName: 'Second' },
      ];
      throw new Error('outside allowed root');
    });
    const { fonts } = await setup();
    expect(fonts.resolveLocalFont('HYHeadLineM')).toBeNull();
    expect(fonts.resolveLocalFont('Duplicate')).toBeNull();
    expect(await fonts.ensureLocalFontsAvailable(['Abel'])).toEqual(new Set(['Abel']));
    expect(await fonts.loadLocalFontBytesFor(['Abel'])).toEqual(new Map());
    expect(fonts.resolveLocalFont('Abel')).not.toBeNull();
  });

  it.each(['collection', 'variable'])('does not supply an unselected %s face', async (kind) => {
    const { fonts } = await setup();
    const unsupported = new Uint8Array(kind === 'collection' ? 12 : 28);
    const view = new DataView(unsupported.buffer);
    view.setUint32(0, kind === 'collection' ? 0x74746366 : 0x00010000);
    if (kind === 'variable') { view.setUint16(4, 1); view.setUint32(12, 0x66766172); }
    invoke.mockResolvedValue([...unsupported]);
    expect(await fonts.loadLocalFontBytesFor(['Abel'])).toEqual(new Map());
  });

  it('revalidates required bytes on actual controller document entry without rescanning the catalog', async () => {
    invoke.mockImplementation(async (cmd) => cmd === 'get_local_font_preferences'
      ? enabled : cmd === 'list_local_fonts' ? [entry] : bytes);
    await setup();
    const controller = await import('./local-font-controller');
    const firstFonts = Object.freeze(['Abel']);
    const refreshView = vi.fn(async () => {});
    const onFontsChanged = vi.fn();
    await controller.prepareDesktopDocumentFonts({ fonts: firstFonts, refreshView, onFontsChanged });
    expect(registered.size).toBe(1);
    await controller.prepareDesktopDocumentFonts({ fonts: ['Abel-Regular'], refreshView, onFontsChanged });
    expect(invoke.mock.calls.filter(([cmd]) => cmd === 'read_local_font')).toHaveLength(2);
    expect(invoke.mock.calls.filter(([cmd]) => cmd === 'list_local_fonts')).toHaveLength(1);
    expect(firstFonts).toEqual(['Abel']);
    controller.disposeDesktopLocalFonts();
    expect(registered.size).toBe(0);
  });

  it('clears real CanvasKit failure/success caches through the public session lifecycle', async () => {
    const { fonts } = await setup();
    const { CanvasKitLayerRenderer } = await import('@upstream/view/canvaskit-renderer');
    const { RendererSession } = await import('@upstream/view/renderer-session');
    const renderer = await CanvasKitLayerRenderer.create();
    const session = new RendererSession(
      { backend: 'canvaskit', source: 'url', requested: 'canvaskit' },
      { mode: 'default', source: 'default' }, { preference: 'auto', requested: 'auto' },
      'screen', async () => renderer,
    );
    const selection = await session.resolve({} as never);
    invoke.mockRejectedValueOnce(new Error('read denied'));
    expect(await renderer.prepareLocalFonts(['Abel'])).toBe(0);
    invoke.mockImplementation(async (cmd) => cmd === 'list_local_fonts' ? [entry] : bytes);
    await fonts.detectLocalFonts({ force: true });
    expect(await renderer.prepareLocalFonts(['Abel'])).toBe(0);
    session.invalidateDocument();
    expect(session.isCurrent(selection)).toBe(false);
    expect(await renderer.prepareLocalFonts(['Abel'])).toBe(1);
    session.invalidateDocument();
    expect(destroy).toHaveBeenCalledTimes(2);
    expect(await renderer.prepareLocalFonts(['Abel-Regular'])).toBe(1);
    session.dispose();
  });
});
