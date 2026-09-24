import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { browser, $, expect } from '@wdio/globals';
import { HwpDocument, initSync } from '../../../apps/studio-host/vendor/rhwp-core/rhwp.js';
import { installFixtureFont, verifyFixtures } from '../local-fonts/fixture.mjs';
import { choose, output, rpc, settings, snapshot } from '../local-fonts/ui.ts';
import { waitForInitialDesktopReady, waitForLoadedDocument } from '../support/document-ux.ts';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
const observations: unknown[] = [];
let installed: Awaited<ReturnType<typeof installFixtureFont>> | null = null;
let origin = '';

// This scope runs only on a disposable GitHub-hosted Linux acceptance account.
describe('Linux installed local fonts', () => {
  before(async () => {
    if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('Linux x64 only');
    await mkdir(output, { recursive: true });
    await verifyFixtures();
    initSync({ module: await readFile(join(inputs.fixtureRoot, 'apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm')) });
    await waitForInitialDesktopReady(browser, inputs.timeoutMs);
    origin = (await browser.getUrl()).split('?')[0].split('#')[0];
    // Refuse a contaminated account rather than deleting someone else's settings/font.
    const match = execFileSync('fc-match', ['-f', '%{family}', 'Abel'], { encoding: 'utf8' });
    expect(match).not.toContain('Abel');
  });

  after(async () => {
    await installed?.cleanup();
    await verifyFixtures();
    await writeFile(join(output, 'observations.json'), JSON.stringify({
      sourceSha: inputs.buildRef, producerRunId: inputs.nativeRunId,
      acceptance: 'unverified', observations,
    }, null, 2));
  });

  afterEach(async function () {
    if (this.currentTest?.state === 'failed') {
      const name = this.currentTest.title.split(':')[0];
      await browser.saveScreenshot(join(output, `${name}-failure.png`)).catch(() => {});
      const ui = await browser.execute(() => ({
        status: document.getElementById('sb-message')?.textContent,
        modal: document.querySelector('.modal-overlay')?.textContent,
        url: location.href,
      })).catch(() => null);
      await writeFile(join(output, `${name}-failure.json`), JSON.stringify({
        title: this.currentTest.title, error: this.currentTest.err?.message, ui,
      }, null, 2));
    }
  });

  for (const renderer of ['canvas2d', 'canvaskit']) {
    it(`${renderer}: absent → enabled → refresh → disabled → process restart`, async () => {
      await navigate(renderer);
      await settings();
      await choose('disabled');
      const fallback = new Map<string, Awaited<ReturnType<typeof snapshot>>>();
      for (const format of ['hwp', 'hwpx']) {
        await open(format);
        fallback.set(format, await capture(`${renderer}-${format}-absent`));
      }
      installed = await installFixtureFont({ platform: 'linux', home: homedir() });
      await settings();
      await choose('enabled');
      for (const format of ['hwp', 'hwpx']) {
        await open(format);
        const local = await capture(`${renderer}-${format}-enabled`);
        expect(local.diagnostics.effectiveBackend).toBe(renderer);
        expect(local.fonts.faces.some(face => face.status === 'loaded')).toBe(true);
        expect(local.pixelHash).not.toBe(fallback.get(format)!.pixelHash);
        expect(local.title).not.toContain('*');
        await assertExportPreservesFont(format);
      }
      await settings();
      await choose('refresh');
      const refreshed = await capture(`${renderer}-refreshed`);
      expect(refreshed.diagnostics.effectiveBackend).toBe(renderer);
      await checkRemovedFont(renderer);
      await restart(renderer);
      await open('hwpx');
      const restored = await capture(`${renderer}-enabled-restarted`);
      expect(restored.pixelHash).toBe(refreshed.pixelHash);
      expect(await settings()).toContain('사용 설정이 저장되었습니다');
      await choose('disabled');
      await capture(`${renderer}-disabled`);
      await restart(renderer);
      await open('hwp');
      expect(await settings()).toContain('직접 공급을 사용하지 않습니다');
      await $('.dialog-close').click();
      await capture(`${renderer}-disabled-restarted`);
      await installed.cleanup();
      installed = null;
      execFileSync('fc-cache', ['-f']);
      // Restart clears OS font caches before the next absent-font baseline.
      await restart(renderer);
    });
  }
});

async function navigate(renderer: string) {
  await browser.url(`${origin}?renderer=${renderer}&canvaskitSurface=software`);
  await waitForInitialDesktopReady(browser, inputs.timeoutMs);
}

async function restart(renderer: string) {
  const before = pids();
  await browser.reloadSession();
  await waitForInitialDesktopReady(browser, inputs.timeoutMs);
  const after = pids();
  expect(after.length).toBeGreaterThan(0);
  expect(after.some(pid => before.includes(pid))).toBe(false);
  observations.push({ scenario: 'process-restart', before, after });
  await navigate(renderer);
}

function pids(): string[] {
  return execFileSync('pgrep', ['-x', 'Alhangeul'], { encoding: 'utf8' }).trim().split(/\s+/);
}

async function open(format: string) {
  await $('#file-input').addValue(join(inputs.fixtureRoot, `tests/gui/local-fonts/abel.${format}`));
  await waitForLoadedDocument(browser, `abel.${format}`, 1, inputs.timeoutMs);
  expect(await $('.modal-overlay').isExisting()).toBe(false);
}

async function capture(name: string) {
  const observation = await snapshot(name);
  observations.push(observation);
  return observation;
}

async function assertExportPreservesFont(format: string) {
  const bytes = await rpc(format === 'hwp' ? 'exportHwp' : 'exportHwpx') as number[];
  const path = join(output, `roundtrip.${format}`);
  await writeFile(path, Buffer.from(bytes));
  const doc = new HwpDocument(new Uint8Array(bytes));
  try { expect(JSON.parse(doc.getDocumentInfo()).fontsUsed).toContain('Abel'); }
  finally { doc.free(); }
}

async function checkRemovedFont(renderer: string) {
  await installed!.cleanup();
  installed = null;
  await settings();
  await choose('refresh');
  const removed = await capture(`${renderer}-font-deleted-refreshed`);
  expect(removed.fonts.faces.length).toBe(0);
  installed = await installFixtureFont({ platform: 'linux', home: homedir() });
  await settings();
  await choose('refresh');
  const recovered = await capture(`${renderer}-font-restored-refreshed`);
  expect(recovered.fonts.faces.some(face => face.status === 'loaded')).toBe(true);
}
