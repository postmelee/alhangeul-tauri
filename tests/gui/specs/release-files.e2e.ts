import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { browser, $, expect } from '@wdio/globals';
import { HwpDocument, initSync } from '../../../apps/studio-host/vendor/rhwp-core/rhwp.js';
import { LinuxNativeUiAdapter } from '../linux/native-ui/atspi.mjs';
import { analyzePdf } from '../linux/pdf-analysis.mjs';
import { fixtureById, resolveDocumentFixtures } from '../support/document-fixture.ts';
import { createSessionExitGuard } from '../support/linux-session-lifecycle.mjs';
import { describeEvidenceFile } from '../support/evidence.ts';
import { runScenarioWithEvidence } from '../support/scenario-runner.ts';
import { waitForInitialDesktopReady, waitForLoadedDocument, waitForStudioStatus } from '../support/document-ux.ts';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
const run = promisify(execFile);
const marker = 'ALHANGEUL RELEASE FILE ROUNDTRIP 0123456789';
let dialogIndex = 0;
let restartIndex = 0;
const exitGuard = process.platform === 'linux'
  && (process.arch === 'arm64' || process.env.ALHANGEUL_GUI_FEDORA_SESSION === '1')
  ? createSessionExitGuard({ timeoutMs: inputs.timeoutMs }) : null;

describe('Final release file native document acceptance', () => {
  before(() => {
    if (!exitGuard) return;
    // WDIO's runtime supports protocol commands; its overload only lists UI commands.
    const overwrite = browser.overwriteCommand as (name: 'deleteSession',
      callback: (original: typeof browser.deleteSession,
        ...args: Parameters<typeof browser.deleteSession>) => ReturnType<typeof browser.deleteSession>) => void;
    overwrite.call(browser, 'deleteSession', (original, ...args) => exitGuard.deleteSession(original, ...args));
  });
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

if (inputs.appVersion === '0.1.4' && process.platform === 'linux' && inputs.appPath.endsWith('.AppImage')) {
  describe('Signed AppImage direct PDF acceptance', () => {
    it('produces searchable HWP and HWPX PDFs without modifying the originals', async () => {
      await mkdir(join(inputs.outputDir, 'generated'), { recursive: true });
      const fixtures = await resolveDocumentFixtures(inputs.fixtureRoot);
      const cases = [
        { id: 'biz-plan-hwp', pages: 6, title: '사업수행계획서', minText: [20, 300, 200, 300, 200, 100] },
        { id: 'form-hwpx', pages: 10, title: '암조직 저산소', minText: Array(10).fill(100) },
      ] as const;
      for (const [index, { id, pages, title, minText }] of cases.entries()) {
        if (index > 0) await restartSession();
        const fixture = fixtureById(fixtures, id);
        const pdfPath = join(inputs.outputDir, 'generated', `signed-appimage-${id}.pdf`);
        const adapter = new LinuxNativeUiAdapter({
          outputDir: inputs.outputDir, timeoutMs: inputs.timeoutMs, applicationNames: ['Alhangeul'],
          saveTargets: {}, captureScreenshot: path => browser.saveScreenshot(path),
        });
        await runScenarioWithEvidence({
          inputs, scenario: `signed-appimage-pdf-${id}`, fixtures: [fixture],
          screenshotName: 'exported.png', captureScreenshot: path => browser.saveScreenshot(path),
        }, async () => {
          await waitForInitialDesktopReady(browser, inputs.timeoutMs);
          await adapter.openDocument(fixture.absolutePath, () => trigger('file:open'));
          await waitForLoadedDocument(browser, basename(fixture.absolutePath), pages, inputs.timeoutMs);
          await adapter.saveDocument('file:print-to-pdf', pdfPath, () => trigger('file:print-to-pdf'));
          await waitForStudioStatus(browser, /PDF 저장 완료/, inputs.timeoutMs);
          const analysis = await analyzePdf({
            pdfPath, outputDir: inputs.outputDir, label: `signed-appimage-${id}`,
            expectedPageCount: pages, expectedTitle: title, minTextCounts: [...minText],
          });
          expect(createHash('sha256').update(await readFile(fixture.absolutePath)).digest('hex')).toBe(fixture.sha256);
          return [
            await describeEvidenceFile(inputs.outputDir, pdfPath, 'generated-document'),
            await describeEvidenceFile(inputs.outputDir, analysis.summaryPath, 'log'),
          ];
        });
      }
    });
  });
}

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
    exitGuard?.assertCompleted();
    console.info(`RESTART_CHECKPOINT ${new Date().toISOString()} ${label}-after`);
  } catch (error) {
    await captureRestart(`${label}-failed`);
    exitGuard?.assertCompleted();
    throw error;
  } finally {
    if (exitGuard) await writeFile(join(inputs.outputDir, 'session-exit-conditions.json'),
      JSON.stringify(exitGuard.events, null, 2));
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
