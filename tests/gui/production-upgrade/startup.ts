import { browser } from '@wdio/globals';
import { join } from 'node:path';
import { waitForStudioStartup } from '../support/studio-startup.ts';
import type { UpgradeInputs } from './inputs.ts';
import type { UpgradeEvidence } from './native.ts';

export async function waitForProductionStartup(input: UpgradeInputs, evidence: UpgradeEvidence) {
  try {
    await waitForStudioStartup(browser, 180000, input.phase === 'apply' ? input.toVersion : undefined);
  } catch (error) {
    evidence.startupFailure = await captureStartupFailure(input);
    throw error;
  }
}

async function captureStartupFailure(input: UpgradeInputs) {
  const diagnostics: Record<string, unknown> = {};
  try {
    diagnostics.state = await browser.execute(() => ({
      status: document.getElementById('sb-message')?.textContent?.trim() ?? '',
      toolbarReady: document.documentElement.classList.contains('alhangeul-toolbar-ready'),
      canvasReady: !!document.querySelector('#scroll-content > canvas[data-rhwp-rendered-zoom]'),
      modalTitles: Array.from(document.querySelectorAll('.modal-overlay .dialog-title'))
        .map(element => element.textContent?.trim() ?? ''),
    }));
  } catch (error) { diagnostics.stateError = error instanceof Error ? error.message : String(error); }
  try {
    await browser.saveScreenshot(join(input.output, 'startup-failure.png'));
    diagnostics.screenshot = 'startup-failure.png';
  } catch (error) { diagnostics.screenshotError = error instanceof Error ? error.message : String(error); }
  return diagnostics;
}
