import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { browser, $, expect } from '@wdio/globals';
import { HwpDocument, initSync } from '../../../apps/studio-host/vendor/rhwp-core/rhwp.js';
import { LinuxNativeUiAdapter } from '../linux/native-ui/atspi.mjs';
import { resolveDocumentFixtures } from '../support/document-fixture.ts';
import { describeEvidenceFile } from '../support/evidence.ts';
import { runScenarioWithEvidence } from '../support/scenario-runner.ts';
import { waitForInitialDesktopReady, waitForLoadedDocument, waitForStudioStatus } from '../support/document-ux.ts';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
const run = promisify(execFile);
const marker = 'ALHANGEUL RELEASE FILE ROUNDTRIP 0123456789';
let dialogIndex = 0;
let restartIndex = 0;

describe('Final release file native document acceptance', () => {
  it('HWP/HWPX native Save As, edited current save and process restart retain text', async () => {
    await mkdir(join(inputs.outputDir, 'generated'), { recursive: true });
    initSync({ module: await readFile(join(inputs.fixtureRoot, 'apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm')) });
    const fixtures = await resolveDocumentFixtures(inputs.fixtureRoot);
    for (const fixture of fixtures) {
      await runScenarioWithEvidence({
        inputs, scenario: `release-${fixture.id}`, fixtures: [fixture],
        screenshotName: 'reopened.png', captureScreenshot: path => browser.saveScreenshot(path),
      }, async () => {
        await waitForInitialDesktopReady(browser, inputs.timeoutMs);
        await dialog('Open', fixture.absolutePath, 'file:open');
        await waitForLoadedDocument(browser, basename(fixture.absolutePath), fixture.expectedPageCount, inputs.timeoutMs);
        const saved = join(inputs.outputDir, 'generated', `roundtrip-${fixture.id}.${fixture.format}`);
        await dialog('Save', saved, 'file:save-as');
        await waitForStudioStatus(browser, /저장 완료/, inputs.timeoutMs);
        // Ordinary editor input; no native command injection or fake file output.
        await browser.execute(text => {
          const input = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="문서 편집 입력"]');
          if (!input) throw new Error('missing editor input');
          input.focus(); input.value = text;
          input.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
        }, marker);
        await browser.waitUntil(async () => (await browser.getTitle()).startsWith('• '), { timeout: inputs.timeoutMs });
        await trigger('file:save');
        await waitForStudioStatus(browser, /^저장 완료$/, inputs.timeoutMs);
        await browser.waitUntil(async () => !(await browser.getTitle()).startsWith('• '), { timeout: inputs.timeoutMs });
        const bytes = await readFile(saved);
        const doc = new HwpDocument(bytes);
        try { expect(doc.getTextFileText()).toContain(marker); } finally { doc.free(); }
        await restartSession();
        await waitForInitialDesktopReady(browser, inputs.timeoutMs);
        await dialog('Open', saved, 'file:open');
        await waitForLoadedDocument(browser, basename(saved), null, inputs.timeoutMs);
        expect(await browser.getTitle()).toContain(basename(saved));
        expect(createHash('sha256').update(await readFile(fixture.absolutePath)).digest('hex')).toBe(fixture.sha256);
        const evidence = [await describeEvidenceFile(inputs.outputDir, saved, 'generated-document')];
        return evidence;
      });
      await restartSession();
    }
  });
});

async function trigger(command: string) {
  await $('#menu-bar .menu-title').click();
  await $(`.md-item[data-cmd="${command}"]`).click();
}

async function dialog(mode: 'Open' | 'Save', target: string, command: string) {
  if (process.platform !== 'win32') {
    const adapter = new LinuxNativeUiAdapter({
      outputDir: inputs.outputDir, timeoutMs: inputs.timeoutMs,
      applicationNames: ['Alhangeul'], saveTargets: {}, captureScreenshot: path => browser.saveScreenshot(path),
    });
    if (mode === 'Open') await adapter.openDocument(target, () => trigger(command));
    else await adapter.saveDocument(command, target, () => trigger(command));
    return;
  }
  await trigger(command);
  await run('powershell.exe', ['-NoProfile', '-File', join(inputs.fixtureRoot, 'scripts/windows-pdf-dialog.ps1'),
    '-Mode', mode, '-TargetPath', target, '-EvidencePath',
    join(inputs.outputDir, `native-dialog-${++dialogIndex}.json`)], { timeout: 100000 });
}

async function restartSession() {
  const label = `restart-${++restartIndex}`;
  console.info(`RESTART_CHECKPOINT ${new Date().toISOString()} ${label}-before`);
  try {
    await browser.reloadSession();
    console.info(`RESTART_CHECKPOINT ${new Date().toISOString()} ${label}-after`);
  } catch (error) {
    await captureRestart(`${label}-failed`);
    throw error;
  }
}

async function captureRestart(label: string) {
  if (process.platform !== 'linux') return;
  try {
    await run('bash', [join(inputs.fixtureRoot, 'scripts/ci/release-file-process-probe.sh'),
      'snapshot', label], { timeout: 15000 });
  } catch (error) {
    // Diagnostics never replace the actual session result.
    console.error(`process diagnostic ${label} failed`, error);
  }
}
