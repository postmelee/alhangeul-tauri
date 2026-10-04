import { browser, expect } from '@wdio/globals';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { resolveDocumentFixtures } from '../support/document-fixture.ts';
import { prepareDocument, measureOpen } from '../local-fonts/performance.ts';
import { invoke, settings, showUpdater, type Snapshot, type UpgradeEvidence } from './native.ts';
import type { UpgradeInputs } from './inputs.ts';

export async function verifyUpgrade(input: UpgradeInputs, evidence: UpgradeEvidence): Promise<void> {
  const noUpdate = await invoke<Snapshot>('updater_check');
  expect(noUpdate.status).toBe('idle'); expect(noUpdate.currentVersion).toBe('0.1.1');
  expect(noUpdate.availableVersion).toBeNull(); expect(noUpdate.failure).toBeNull(); expect(noUpdate.blocker).toBeNull();
  evidence.noUpdate = noUpdate;
  const before = JSON.parse(await readFile(join(dirname(input.output), 'settings-before.json'), 'utf8'));
  expect(await settings()).toEqual(before); evidence.settingsPreserved = true;
  await showUpdater('0.1.1'); evidence.productVersion = await browser.$('.about-alhangeul-version').getText();
  // Close the two dialogs through their visible footer controls before opening fixtures.
  await browser.$('.updater-dialog .dialog-footer button').click();
  await browser.$('.about-alhangeul-version').waitForDisplayed();
  const overlays = await browser.$$('.modal-overlay').getElements();
  await overlays[overlays.length - 1].$('.dialog-footer button').click();
  const documents = [];
  for (const fixture of await resolveDocumentFixtures(input.root)) {
    const bytes = await readFile(fixture.absolutePath);
    await prepareDocument(Array.from(bytes), fixture.absolutePath.split(/[\\/]/).pop()!);
    const loaded = await measureOpen();
    const canvasReady = await browser.$('#scroll-content > canvas[data-rhwp-rendered-zoom]').isDisplayed();
    expect(canvasReady).toBe(true);
    if (fixture.expectedPageCount) expect(loaded.pageCount).toBe(fixture.expectedPageCount);
    const unchanged = createHash('sha256').update(await readFile(fixture.absolutePath)).digest('hex') === fixture.sha256;
    expect(unchanged).toBe(true);
    documents.push({ id: fixture.id, format: fixture.format, pageCount: loaded.pageCount, canvasReady, unchanged, sha256: fixture.sha256 });
    await browser.saveScreenshot(join(input.output, `${fixture.id}.png`));
  }
  evidence.documents = documents;
}
