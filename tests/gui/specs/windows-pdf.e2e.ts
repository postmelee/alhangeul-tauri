import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { browser, $, expect } from '@wdio/globals';
import { resolveDocumentFixtures } from '../support/document-fixture.ts';
import { assertDocumentIdentity } from '../support/document-identity.ts';
import { readPageIndicator, waitForInitialDesktopReady, waitForLoadedDocument,
  waitForStudioStatus } from '../support/document-ux.ts';
import { readPdfInputs } from '../wdio.windows-pdf.conf.ts';

const inputs = readPdfInputs();
const run = promisify(execFile);
const timeout = 120_000;
const marker = 'PDF검증';

describe('Windows installed app PDF smoke', () => {
  it('HWP/HWPX 편집 PDF, source 보존과 재시작 덮어쓰기', async () => {
    const fixtures = await resolveDocumentFixtures(inputs.fixtureRoot);
    await mkdir(inputs.outputDir, { recursive: true });
    await waitForInitialDesktopReady(browser, timeout);
    for (const fixture of fixtures) {
      // Fresh WebDriver session between documents avoids discard-confirmation shortcuts.
      if (fixture !== fixtures[0]) {
        await browser.reloadSession();
        await waitForInitialDesktopReady(browser, timeout);
      }
      const source = join(inputs.outputDir, `source-${fixture.id}.${fixture.format}`);
      const pdf = join(inputs.outputDir, `${fixture.id}.pdf`);
      const evidence: Record<string, unknown> = {
        buildRef: inputs.buildRef, phase: inputs.phase, fixture: fixture.id,
        inputMethod: 'DOM input event through editor input handler',
        nativeDialogs: true, concurrentEditTested: false,
      };
      try {
        if (inputs.phase === 'fresh') await copyFile(fixture.absolutePath, source);
        const sourceHash = await hash(source);
        expect(sourceHash).toBe(fixture.sha256);
        const previousPdf = inputs.phase === 'restart' ? await stat(pdf) : null;
        if (previousPdf) {
          const fresh = JSON.parse(await readFile(join(inputs.outputDir, `${fixture.id}-fresh.json`), 'utf8'));
          expect(fresh.status).toBe('passed');
          expect(fresh.buildRef).toBe(inputs.buildRef);
          expect(await hash(pdf)).toBe(fresh.pdfSha256);
        }
        await nativeDialog('Open', source, 'file:open', fixture.id);
        await waitForLoadedDocument(browser, basename(source), fixture.expectedPageCount, timeout);
        evidence.initialPageCount = (await readPageIndicator(browser)).total;
        const openedTitle = await browser.getTitle();
        Object.assign(evidence, { schemaVersion: 2, openedTitle, documentIdentityVerified: false });
        assertDocumentIdentity(openedTitle, basename(source));
        evidence.documentIdentityVerified = true;
        await insertMarker();
        await browser.waitUntil(async () => (await browser.getTitle()).startsWith('• '), { timeout });
        const beforeTitle = await browser.getTitle();
        const pageCount = (await readPageIndicator(browser)).total;
        if (fixture.expectedPageCount !== null) expect(pageCount).toBe(fixture.expectedPageCount);
        await nativeDialog('Save', pdf, 'file:print-to-pdf', fixture.id);
        await waitForStudioStatus(browser, /PDF 저장 완료/, timeout);
        expect(await browser.getTitle()).toBe(beforeTitle);
        expect(await hash(source)).toBe(sourceHash);
        expect((await readPageIndicator(browser)).total).toBe(pageCount);
        const output = await stat(pdf);
        expect(output.size).toBeGreaterThan(1024);
        if (previousPdf) expect(output.mtimeMs).toBeGreaterThan(previousPdf.mtimeMs);
        Object.assign(evidence, {
          status: 'passed', sourceHash, sourceUnchanged: true, dirtyPreserved: true,
          pdf: basename(pdf), pdfSha256: await hash(pdf), pageCount, marker,
          overwriteVerified: previousPdf !== null,
        });
      } catch (error) {
        Object.assign(evidence, { status: 'failed', error: String(error) });
        throw error;
      } finally {
        await writeFile(join(inputs.outputDir, `${fixture.id}-${inputs.phase}.json`),
          JSON.stringify(evidence, null, 2));
        await browser.saveScreenshot(join(inputs.outputDir, `${fixture.id}-${inputs.phase}.png`));
        if (evidence.status === 'passed') {
          await copyFile(pdf, join(inputs.outputDir, `${fixture.id}-${inputs.phase}.pdf`));
        }
      }
    }
  });
});

async function hash(path: string) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function insertMarker() {
  await browser.execute((text) => {
    const input = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="문서 편집 입력"]');
    if (!input) throw new Error('Editor input missing');
    input.focus();
    input.value = text;
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
  }, marker);
}

async function nativeDialog(mode: 'Open' | 'Save', path: string, command: string, fixture: string) {
  // Native dialogs do not block WebDriver's WebView click response. Start the
  // helper afterwards so plugin discovery/menu delays cannot consume its budget.
  await $('#menu-bar .menu-title').click();
  await $(`.md-item[data-cmd="${command}"]`).click();
  const operation = run('powershell.exe', ['-NoProfile', '-File',
    join(inputs.fixtureRoot, 'scripts/windows-pdf-dialog.ps1'),
    '-Mode', mode, '-TargetPath', path, '-EvidencePath',
    join(inputs.outputDir, `${fixture}-${inputs.phase}-${mode}.json`),
  ], { timeout: 100_000 });
  // Observe rejection immediately while the WebDriver command is running.
  const result = operation.then(() => null, (error: unknown) => error);
  try {
    const error = await result;
    if (error) throw error;
  } finally {
    if (operation.child.exitCode === null) operation.child.kill();
  }
}
