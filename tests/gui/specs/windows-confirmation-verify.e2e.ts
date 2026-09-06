import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { browser, $, expect } from '@wdio/globals';
import { resolveDocumentFixtures } from '../support/document-fixture.ts';
import { assertDocumentIdentity } from '../support/document-identity.ts';
import { waitForInitialDesktopReady, waitForLoadedDocument, waitForStudioStatus } from '../support/document-ux.ts';
import { readPdfInputs } from '../wdio.windows-pdf.conf.ts';

const inputs = readPdfInputs();
const run = promisify(execFile);
const source = join(inputs.outputDir, 'confirmation-verify-source.hwp');
const target = join(inputs.outputDir, 'confirmation-verify-target.pdf');
const other = join(inputs.outputDir, 'confirmation-verify-other.pdf');
const cases: Record<string, unknown>[] = [];
const evidence: Record<string, unknown> = {
  schemaVersion: 1, scenario: inputs.scenario, buildRef: inputs.buildRef,
  status: 'failed', fullPdfTested: false, cases,
  confirmationCases: inputs.confirmationCases, selectedCases: inputs.selectedCases,
};

describe('Installed app confirmation commands (one HWP)', () => {
  it(`verifies selected confirmation cases: ${inputs.selectedCases.join(', ')}`, async () => {
    await mkdir(inputs.outputDir, { recursive: true });
    try {
      await prepareDocument();
      for (const action of inputs.selectedCases) await exercise(action);
      evidence.finalTargetHash = await hash(target);
      evidence.status = 'passed';
    } finally {
      await writeFile(join(inputs.outputDir, 'confirmation-verify.json'), JSON.stringify(evidence, null, 2));
    }
  });
});

async function prepareDocument() {
  if (inputs.scenario !== 'confirmation-verify') throw new Error('Invalid verification context');
  const fixture = (await resolveDocumentFixtures(inputs.fixtureRoot)).find((item) => item.id === 'biz-plan-hwp');
  if (!fixture) throw new Error('Missing public HWP fixture');
  await copyFile(fixture.absolutePath, source);
  await writeFile(target, 'Confirmation target sentinel\n', { flag: 'wx' });
  await writeFile(other, 'Other target sentinel\n', { flag: 'wx' });
  Object.assign(evidence, { sourceHash: fixture.sha256, initialTargetHash: await hash(target), otherHash: await hash(other) });
  expect(await hash(source)).toBe(evidence.sourceHash);
  await waitForInitialDesktopReady(browser, 120_000);
  await dialog('Open');
  await waitForLoadedDocument(browser, basename(source), fixture.expectedPageCount, 120_000);
  assertDocumentIdentity(await browser.getTitle(), basename(source));
  evidence.documentIdentityVerified = true;
}

async function exercise(action: 'Decline' | 'WrongTarget' | 'Confirm') {
  const record: Record<string, unknown> = { case: action, status: 'failed' };
  cases.push(record);
  const helper = await dialog(action);
  if (action === 'Confirm') {
    expect(helper.status).toBe('passed');
    expect(helper.overwriteConfirmed).toBe(true);
    expect(helper.buttonMethod).toBe('Win32-BM_CLICK-command');
    await waitForStudioStatus(browser, /PDF 저장 완료/, 120_000);
    const bytes = await readFile(target);
    expect(bytes.length).toBeGreaterThan(1024);
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.subarray(-1024).toString('latin1')).toMatch(/%%EOF\s*$/);
    expect(await hash(target)).not.toBe(evidence.initialTargetHash);
    Object.assign(record, { action: 'Confirm', method: helper.buttonMethod, targetReplaced: true, pdfEnvelopeVerified: true });
  } else {
    expect(helper.status).toBe('cancelled');
    expect(helper.overwriteConfirmed).toBe(false);
    expect(helper.confirmationVerification.method).toBe('Win32-BM_CLICK-command');
    expect(helper.confirmationVerification.returnedToSave).toBe(true);
    expect(helper.confirmationVerification.dialogsClosed).toBe(true);
    expect(helper.confirmationVerification.wrongTargetRejected).toBe(action === 'WrongTarget');
    expect(await hash(target)).toBe(evidence.initialTargetHash);
    Object.assign(record, helper.confirmationVerification, { targetUnchanged: true });
  }
  assertDocumentIdentity(await browser.getTitle(), basename(source));
  expect(await hash(source)).toBe(evidence.sourceHash);
  expect(await hash(other)).toBe(evidence.otherHash);
  Object.assign(record, { status: 'passed', sourceUnchanged: true, otherUnchanged: true, cleanTitle: true });
}

async function hash(path: string) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function dialog(action: 'Open' | 'Decline' | 'WrongTarget' | 'Confirm') {
  const mode = action === 'Open' ? 'Open' : 'Save';
  const output = join(inputs.outputDir, `confirmation-verify-${action}.json`);
  const previousStatus = await $('#sb-message').getText();
  await $('#menu-bar .menu-title').click();
  await $(`.md-item[data-cmd="${mode === 'Open' ? 'file:open' : 'file:print-to-pdf'}"]`).click();
  const operation = run('powershell.exe', ['-NoProfile', '-File',
    join(inputs.fixtureRoot, 'scripts/windows-pdf-dialog.ps1'), '-Mode', mode,
    '-TargetPath', mode === 'Open' ? source : target, '-EvidencePath', output,
    ...(action === 'Open' ? [] : ['-ConfirmationCase', action]),
  ], { timeout: 100_000 });
  try { await operation; }
  finally { if (operation.child.exitCode === null) operation.child.kill(); }
  if (action === 'Decline' || action === 'WrongTarget') {
    await browser.waitUntil(async () => (await $('#sb-message').getText()) === previousStatus,
      { timeout: 15_000, timeoutMsg: 'Cancelled PDF action did not restore the previous status' });
  }
  return JSON.parse((await readFile(output, 'utf8')).replace(/^\uFEFF/, ''));
}
