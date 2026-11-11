import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { browser, $, expect } from '@wdio/globals';
import { resolveDocumentFixtures } from '../support/document-fixture.ts';
import { waitForInitialDesktopReady, waitForLoadedDocument } from '../support/document-ux.ts';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
const run = promisify(execFile);

describe('Windows installed system print', () => {
  it('prints through native UI and returns to the editor after cancellation', async () => {
    await mkdir(inputs.outputDir, { recursive: true });
    await waitForInitialDesktopReady(browser, inputs.timeoutMs);
    const fixture = (await resolveDocumentFixtures(inputs.fixtureRoot))[0];
    await $('#file-input').addValue(fixture.absolutePath);
    await waitForLoadedDocument(browser, 'biz_plan.hwp', 6, inputs.timeoutMs);
    const title = await browser.getTitle();
    const pdf = join(inputs.outputDir, 'windows-system-print.pdf');
    for (const mode of ['Cancel', 'Save']) {
      const helper = run('powershell.exe', ['-NoProfile', '-File',
        join(inputs.fixtureRoot, 'scripts/windows-system-print.ps1'), '-Mode', mode,
        '-EvidencePath', join(inputs.outputDir, `system-print-${mode}.json`), '-TargetPath', pdf],
      { timeout: 100000 });
      const result = helper.then(() => null, (error: unknown) => error);
      try {
        await $('#menu-bar .menu-title').click();
        await $('.md-item[data-cmd="file:print"]').click();
        const error = await result;
        if (error) throw error;
        await browser.waitUntil(async () => browser.execute(() =>
          !document.getElementById('alhangeul-direct-print-surface')), { timeout: 30000 });
        expect(await browser.getTitle()).toBe(title);
        await browser.saveScreenshot(join(inputs.outputDir, `system-print-${mode}.png`));
      } finally {
        if (helper.child.exitCode === null) helper.child.kill();
      }
    }
    expect((await readFile(pdf)).subarray(0, 5).toString()).toBe('%PDF-');
    await writeFile(join(inputs.outputDir, 'system-print.json'), JSON.stringify({
      sourceSha: inputs.buildRef, producerRunId: inputs.nativeRunId, status: 'passed',
      pdf: 'windows-system-print.pdf', expectedPages: 6, expectedText: 'OO교육대학교',
      editorTitleRestored: true,
    }, null, 2));
  });
});
