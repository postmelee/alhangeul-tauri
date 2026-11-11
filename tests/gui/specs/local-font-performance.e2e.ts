import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { browser, $, expect } from '@wdio/globals';
import { HwpDocument, initSync } from '../../../apps/studio-host/vendor/rhwp-core/rhwp.js';
import { installFixtureFont, verifyFixtures } from '../local-fonts/fixture.mjs';
import { FONT_RULE_CANVASKIT_SFNT_RULES } from '../../../third_party/rhwp/rhwp-studio/src/core/generated/font-rule-projections/canvaskit-sfnt.ts';
import { assertFontRenderer, unavailableDeclaredFonts } from '../local-fonts/renderer-contract.mjs';
import { choose, rpc, settings, snapshot, output } from '../local-fonts/ui.ts';
import { measureInput, measureOpen, measureScroll, prepareDocument, focusFirstFormCell, startLongTaskObservation, finishLongTaskObservation } from '../local-fonts/performance.ts';
import { resolveDocumentFixtures } from '../support/document-fixture.ts';
import { waitForInitialDesktopReady } from '../support/document-ux.ts';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
const observations: unknown[] = [];
let installed: Awaited<ReturnType<typeof installFixtureFont>> | null = null;
let complete = false;
const marker = 'ALHANGEUL FONT PERFORMANCE 0123456789';

// Disposable GitHub-hosted accounts only; both products run on the same runner.
describe('Installed local font performance', () => {
  before(async () => {
    if (!['win32', 'linux'].includes(process.platform) || process.arch !== 'x64') {
      throw new Error('Windows/Linux x64 only');
    }
    await mkdir(output, { recursive: true });
    await verifyFixtures();
    initSync({ module: await readFile(join(inputs.fixtureRoot, 'apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm')) });
    installed = await installFixtureFont({ platform: process.platform, home: homedir(), localAppData: process.env.LOCALAPPDATA });
    await browser.setTimeout({ script: 120000 });
    await waitForInitialDesktopReady(browser, inputs.timeoutMs);
    await browser.setWindowSize(1280, 900);
    await browser.waitUntil(async () => browser.execute(() => innerWidth === 1280 && innerHeight === 900),
      { timeout: 5000, timeoutMsg: 'comparison viewport did not reach 1280x900' });
  });

  after(async () => {
    await installed?.cleanup();
    await verifyFixtures();
    await writeFile(join(output, 'performance.json'), JSON.stringify({
      sourceSha: inputs.buildRef, producerRunId: inputs.nativeRunId, version: inputs.appVersion,
      acceptance: 'unverified', complete, os: process.platform, observations,
      fixtureManifest: await verifyFixtures(),
      measurement: 'WebView clock; load RPC + font readiness + two frames; input changed canvas + next frame; 90-frame scroll',
      inputProbe: 'PNG encoding adds observation cost; per-sample probe time recorded',
    }, null, 2));
  });

  it('repeats HWP/HWPX open, real input and multi-page scrolling with local fonts off/on', async () => {
    const origin = (await browser.getUrl()).split('?')[0].split('#')[0];
    const representatives = await resolveDocumentFixtures(inputs.fixtureRoot);
    const documents = [
      { path: join(inputs.fixtureRoot, 'tests/gui/local-fonts/abel.hwp'), local: true, scroll: false },
      { path: join(inputs.fixtureRoot, 'tests/gui/local-fonts/abel.hwpx'), local: true, scroll: false },
      ...representatives.map(fixture => ({ path: fixture.absolutePath, local: false, scroll: fixture.expectedPageCount === 6 })),
    ];
    for (const renderer of ['canvas2d', 'canvaskit']) {
      const fallback = new Map<string, string>();
      for (const choice of ['disabled', 'enabled'] as const) {
        await browser.url(`${origin}?renderer=${renderer}&canvaskitSurface=software`);
        await waitForInitialDesktopReady(browser, inputs.timeoutMs);
        await observeBlockedFonts();
        await settings();
        const detectionStart = Date.now();
        await choose(choice);
        const detectionWallMs = Date.now() - detectionStart;
        const catalogStatus = await settings();
        await $('.dialog-close').click();
        const environment = await browser.execute(() => ({
          userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight],
          devicePixelRatio, longTaskSupported: typeof PerformanceObserver !== 'undefined'
            && PerformanceObserver.supportedEntryTypes?.includes('longtask'),
        }));
        expect(environment.viewport).toEqual([1280, 900]);
        observations.push({ scenario: 'configuration', renderer, choice, detectionWallMs, catalogStatus, environment });
        for (const document of documents) {
          await observeDocument(document, renderer, choice, fallback);
        }
      }
    }
    complete = true;
  });
});

function verifyFace(state: Awaited<ReturnType<typeof snapshot>>, renderer: string,
  choice: string, name: string, fallback: Map<string, string>) {
  if (choice === 'disabled') { fallback.set(name, state.pixelHash); return; }
  expect(state.pixelHash).not.toBe(fallback.get(name));
  expect(state.fonts.faces.some(face => face.status === 'loaded')).toBe(true);
  if (renderer === 'canvaskit') {
    expect(state.diagnostics.page.canvaskit?.localTypefaceCount).toBeGreaterThan(0);
    expect(state.diagnostics.page.canvaskit?.unregisteredFontFallbacks).toBe(0);
  }
}

async function verifyContent(name: string) {
  const bytes = await rpc(name.endsWith('.hwpx') ? 'exportHwpx' : 'exportHwp') as number[];
  const doc = new HwpDocument(new Uint8Array(bytes));
  try { expect(doc.getTextFileText()).toContain(marker); }
  finally { doc.free(); }
  await writeFile(join(output, `edited-${name}`), new Uint8Array(bytes));
  await rpc('notifySaved');
}

async function observeDocument(document: { path: string; local: boolean; scroll: boolean },
  renderer: string, choice: string, fallback: Map<string, string>) {
  const name = basename(document.path);
  const bytes = await readFile(document.path);
  const unavailableFontFamilies = document.local ? [] : await inspectUnavailableFonts(bytes, choice);
  await prepareDocument(Array.from(bytes), name);
  await startLongTaskObservation();
  const firstOpen = await measureOpen();
  const state = await snapshot(`${renderer}-${choice}-${name}`);
  const blockedFontSources = await browser.execute(() =>
    (window as Window & { __blockedFontSources?: string[] }).__blockedFontSources ?? []);
  const rendererState = assertFontRenderer(state.diagnostics, renderer, document.local && choice === 'disabled',
    document.local ? [] : blockedFontSources, unavailableFontFamilies);
  if (document.local) verifyFace(state, renderer, choice, name, fallback);
  const samples = [];
  for (let repetition = 0; repetition < 5; repetition++) {
    const open = await measureOpen();
    if (name === 'form-002.hwpx') await focusFirstFormCell();
    const input = await measureInput(marker);
    const scroll = document.scroll ? await measureScroll() : null;
    samples.push({ repetition, open, input, scroll });
    await verifyContent(name);
  }
  const longTasks = await finishLongTaskObservation();
  observations.push({ scenario: 'editing', renderer, ...rendererState, choice, document: name, blockedFontSources, unavailableFontFamilies, firstOpen, samples, longTasks });
}

// Observe the installed product's existing enforced policy; do not relax CSP or inject fonts.
async function observeBlockedFonts() {
  await browser.execute(() => {
    const state = window as Window & { __blockedFontSources?: string[] };
    state.__blockedFontSources = [];
    document.addEventListener('securitypolicyviolation', event => {
      if (event.disposition === 'enforce' && event.effectiveDirective === 'connect-src'
        && event.blockedURI.startsWith('https://') && !state.__blockedFontSources!.includes(event.blockedURI)) {
        state.__blockedFontSources!.push(event.blockedURI);
      }
    });
  });
}

async function inspectUnavailableFonts(bytes: Uint8Array, choice: string): Promise<string[]> {
  const localNames = choice === 'disabled' ? [] : await browser.execute(async () => {
    const host = window as unknown as { __TAURI_INTERNALS__: { invoke: (command: string) => Promise<{
      family: string; fullName?: string; postScriptName: string; aliases?: string[];
    }[]> } };
    const entries = await host.__TAURI_INTERNALS__.invoke('list_local_fonts');
    return entries.flatMap(entry => [entry.family, entry.fullName ?? '', entry.postScriptName, ...entry.aliases ?? []]);
  });
  const doc = new HwpDocument(bytes);
  try {
    return unavailableDeclaredFonts(JSON.parse(doc.getDocumentFontSelectionPlan()),
      JSON.stringify(FONT_RULE_CANVASKIT_SFNT_RULES), localNames);
  } finally { doc.free(); }
}
