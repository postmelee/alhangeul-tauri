import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { browser, $, expect } from '@wdio/globals';
import { waitForInitialDesktopReady, waitForLoadedDocument } from '../support/document-ux.ts';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';
const inputs = readGuiHarnessInputs();
const run = promisify(execFile);
const nativeCapture = join(inputs.fixtureRoot, 'scripts/site-capture/windows-window.ps1');

describe('Site Windows capture of original document', () => {
  it('opens the unchanged Linux hero document and captures the real OS window', async () => {
    const source = join(inputs.fixtureRoot, 'third_party/rhwp/samples/biz_plan.hwp');
    const before = await readFile(source);
    await waitForInitialDesktopReady(browser, inputs.timeoutMs);
    await $('#menu-bar .menu-title').click();
    await $('.md-item[data-cmd="file:open"]').click();
    await run('powershell.exe', ['-NoProfile', '-File',
      join(inputs.fixtureRoot, 'scripts/windows-pdf-dialog.ps1'), '-Mode', 'Open',
      '-TargetPath', source, '-EvidencePath', join(inputs.outputDir, 'open-dialog.json')], {timeout:100000});
    await waitForLoadedDocument(browser, 'biz_plan.hwp', 6, inputs.timeoutMs);
    const zoom = await $('#scroll-content > canvas[data-rhwp-rendered-zoom]').getAttribute('data-rhwp-rendered-zoom');
    expect(Number(zoom)).toBe(1);
    await run('powershell.exe', ['-NoProfile', '-STA', '-File', nativeCapture,
      '-OutputPath', join(inputs.outputDir, 'windows-app.png')], {timeout:90000});
    expect(await readFile(source)).toEqual(before);
    await writeFile(join(inputs.outputDir, 'windows-app-source.json'), JSON.stringify({
      source:'samples/biz_plan.hwp', sha256:createHash('sha256').update(before).digest('hex'),
      zoom:1, pages:6, documentEdited:false, productSha:inputs.buildRef,
    }, null, 2));
  });
  it('attempts an Explorer capture without treating it as thumbnail acceptance', async () => {
    try {
      await run('powershell.exe', ['-NoProfile', '-STA', '-File',
        join(inputs.fixtureRoot, 'scripts/site-capture/windows-gallery.ps1'),
        '-Folder', join(inputs.fixtureRoot, 'capture-samples'),
        '-OutputPath', join(inputs.outputDir, 'windows-explorer-attempt.png')], {timeout:180000});
    } catch (error) {
      await writeFile(join(inputs.outputDir, 'explorer-unavailable.txt'), String(error));
    }
    const settings = JSON.parse((await readFile(
      join(inputs.outputDir, 'windows-explorer-attempt.png.settings.json'), 'utf8')).replace(/^\uFEFF/, ''));
    expect(settings.display.restored).not.toBe(false);
    if (settings.display.prepared) expect(settings.display.restored).toBe(true);
  });
});
