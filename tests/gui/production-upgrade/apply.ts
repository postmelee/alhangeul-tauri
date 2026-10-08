import { browser, expect } from '@wdio/globals';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { clickVisibleDomElement } from '../support/webdriver-dom.ts';
import { assertAvailable, invoke, settled, showUpdater, settings, type Snapshot, type UpgradeEvidence } from './native.ts';
import { appImageProcess, waitForAppImageRestart } from './restart.ts';
import type { UpgradeInputs } from './inputs.ts';
import { observeWindowsHandoff, recordWindowsClosure } from './windows-handoff.ts';
import { captureInstallFailure } from './install-diagnostics.ts';

export async function applyUpgrade(input: UpgradeInputs, evidence: UpgradeEvidence): Promise<void> {
  const startup = await settled(); assertAvailable(startup, input);
  expect(startup.trigger).toBe('startup'); evidence.startup = startup;
  const manual = await invoke<Snapshot>('updater_check'); assertAvailable(manual, input);
  expect(manual.trigger).toBe('manual'); evidence.manual = manual;
  evidence.manualCheckSurface = 'public-native-command';
  await showUpdater(input.fromVersion);
  evidence.settings = await settings();
  await writeFile(join(dirname(input.output), 'settings-before.json'), JSON.stringify(evidence.settings));
  const doc = await invoke<{ docId: string }>('create_document');
  try {
    await invoke('mark_document_dirty', { docId: doc.docId });
    await clickVisibleDomElement('.updater-dialog [data-updater-action="apply"]');
    await browser.waitUntil(async () => (await invoke<Snapshot>('updater_get_state')).blocker === 'dirtyDocuments', { timeout: 120000 });
    const blocked = await settled(); expect(blocked.status).toBe('available');
    evidence.dirty = blocked;
  } finally { await invoke('close_document', { docId: doc.docId }); }
  const ready = await invoke<Snapshot>('updater_check'); assertAvailable(ready, input);
  evidence.consent = 'download-and-install-ui';
  // Persist consent before the installer/relaunch can close the WebDriver connection.
  await writeFile(join(input.output, 'consent.json'), JSON.stringify(evidence));
  if (input.kind !== 'appimage') {
    await applyWindowsUpgrade(input, evidence); return;
  }
  await clickVisibleDomElement('.updater-dialog [data-updater-action="apply"]');
  await observeInstallation(input, evidence);
}

async function applyWindowsUpgrade(input: UpgradeInputs, evidence: UpgradeEvidence): Promise<void> {
  try {
    try { await clickVisibleDomElement('.updater-dialog [data-updater-action="apply"]'); }
    catch (error) { recordWindowsClosure(evidence, error, 'install-click'); return; }
    await observeWindowsHandoff({
      readState: () => invoke<Snapshot>('updater_get_state'), pause: ms => browser.pause(ms),
    }, evidence);
  } catch (error) {
    await captureInstallFailure(evidence, windowsInstallDiagnostics(input.output));
    throw error;
  } finally {
    if (evidence.windowsHandoff) {
      await writeFile(join(input.output, 'windows-handoff.json'), JSON.stringify(evidence.windowsHandoff, null, 2));
    }
  }
}

async function observeInstallation(input: UpgradeInputs, evidence: UpgradeEvidence): Promise<void> {
  const deadline = Date.now() + 600000;
  while (Date.now() < deadline) {
    const snapshot = await invoke<Snapshot>('updater_get_state');
    evidence.installed = snapshot;
    if (snapshot.status === 'error') throw new Error(`Updater failed: ${JSON.stringify(snapshot.failure)}`);
    if (input.kind === 'appimage' && snapshot.status === 'restartRequired') {
      const previous = await appImageProcess();
      evidence.restartRequested = true;
      await writeFile(join(input.output, 'restart-request.json'), JSON.stringify(snapshot));
      try { await clickVisibleDomElement('.updater-dialog [data-updater-action="restart"]'); }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/session|disconnected|closed|no such window|ECONNREFUSED/i.test(message)) throw error;
        evidence.restartTransportClosed = message;
      }
      evidence.restart = await waitForAppImageRestart(previous);
      return;
    }
    await browser.pause(250);
  }
  throw new Error('Production installer completion was not observed');
}

function windowsInstallDiagnostics(output: string) {
  return {
    readState: () => browser.execute(() => ({
      status: document.getElementById('sb-message')?.textContent?.trim() ?? '',
      updaterStatus: document.querySelector('.updater-dialog-status')?.textContent?.trim() ?? '',
      toolbarReady: document.documentElement.classList.contains('alhangeul-toolbar-ready'),
      canvasReady: !!document.querySelector('#scroll-content > canvas[data-rhwp-rendered-zoom]'),
    })),
    screenshot: () => browser.saveScreenshot(join(output, 'install-failure.png')),
  };
}
