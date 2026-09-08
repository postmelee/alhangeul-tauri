import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { browser, $, expect } from '@wdio/globals';
import { resolveDocumentFixtures } from '../support/document-fixture.ts';
import { assertDocumentIdentity } from '../support/document-identity.ts';
import { waitForInitialDesktopReady, waitForLoadedDocument } from '../support/document-ux.ts';
import { readPdfInputs } from '../wdio.windows-pdf.conf.ts';

const inputs = readPdfInputs();
const run = promisify(execFile);
const timeout = 120_000;
const sentinel = 'Alhangeul confirmation observation sentinel; not a rendered PDF.\n';

describe('Installed app confirmation observation (no Yes/No)', () => {
  it('observes one HWP Save confirmation without replacing the existing target', async () => {
    const fixture = (await resolveDocumentFixtures(inputs.fixtureRoot)).find((item) => item.id === 'biz-plan-hwp');
    if (!fixture || inputs.scenario !== 'confirmation-probe') throw new Error('Invalid probe context');
    await mkdir(inputs.outputDir, { recursive: true });
    const source = join(inputs.outputDir, 'confirmation-probe-source.hwp');
    const target = join(inputs.outputDir, 'confirmation-probe-target.pdf');
    const evidence: Record<string, unknown> = {
      schemaVersion: 1, scenario: inputs.scenario, buildRef: inputs.buildRef,
      commandInvoked: false, pdfTested: false, status: 'failed',
    };
    try {
      await copyFile(fixture.absolutePath, source);
      await writeFile(target, sentinel, { flag: 'wx' });
      evidence.sourceHash = fixture.sha256;
      evidence.targetHash = await hash(target);
      expect(await hash(source)).toBe(fixture.sha256);
      await waitForInitialDesktopReady(browser, timeout);
      await dialog('Open', source, 'file:open');
      await waitForLoadedDocument(browser, basename(source), fixture.expectedPageCount, timeout);
      assertDocumentIdentity(await browser.getTitle(), basename(source));
      evidence.documentIdentityVerified = true;
      await dialog('Save', target, 'file:print-to-pdf');
      const helper = JSON.parse((await readFile(join(inputs.outputDir, 'confirmation-probe-Save.json'), 'utf8')).replace(/^\uFEFF/, ''));
      expect(helper.status).toBe('observed');
      expect(helper.overwriteConfirmed).toBe(false);
      expect(await hash(source)).toBe(evidence.sourceHash);
      expect(await hash(target)).toBe(evidence.targetHash);
      Object.assign(evidence, { status: 'observed', sourceUnchanged: true, targetUnchanged: true });
    } finally {
      await writeFile(join(inputs.outputDir, 'confirmation-probe.json'), JSON.stringify(evidence, null, 2));
      // Modal teardown belongs to the existing installed-app cleanup, not a guessed Cancel API.
    }
  });
});

async function hash(path: string) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function dialog(mode: 'Open' | 'Save', path: string, command: string) {
  await $('#menu-bar .menu-title').click();
  await $(`.md-item[data-cmd="${command}"]`).click();
  const operation = run('powershell.exe', ['-NoProfile', '-File',
    join(inputs.fixtureRoot, 'scripts/windows-pdf-dialog.ps1'), '-Mode', mode,
    '-TargetPath', path, '-EvidencePath', join(inputs.outputDir, `confirmation-probe-${mode}.json`),
    ...(mode === 'Save' ? ['-ConfirmationProbe'] : []),
  ], { timeout: 100_000 });
  try { await operation; }
  finally { if (operation.child.exitCode === null) operation.child.kill(); }
}
