import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, unlink } from 'node:fs/promises';
import { basename, isAbsolute, join } from 'node:path';
import { browser, $, expect } from '@wdio/globals';
import { analyzePdf } from '../linux/pdf-analysis.mjs';
import { LinuxNativeUiAdapter } from '../linux/native-ui/atspi.mjs';
import { dragFileIntoWindow } from '../linux/native-ui/drag-drop.mjs';
import {
  fixtureById,
  resolveDocumentFixtures,
  type DocumentFixture,
} from '../support/document-fixture.ts';
import {
  createScenarioEvidence,
  describeEvidenceFile,
  writeScenarioEvidence,
  type EvidenceFile,
} from '../support/evidence.ts';
import {
  GUI_SELECTORS,
  parsePageIndicator,
  runNativeDocumentCommand,
  type DocumentStateSnapshot,
  type NativeDocumentCommand,
} from '../support/document-ux.ts';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
const generatedDir = join(inputs.outputDir, 'generated');
let fixtures: DocumentFixture[] = [];

describe('Alhangeul native Linux acceptance', () => {
  before(async () => {
    fixtures = await resolveDocumentFixtures(inputs.fixtureRoot);
    await mkdir(generatedDir, { recursive: true });
  });

  it('HWP/HWPX native Save As, current save와 reopen', async () => {
    await runScenario('linux-native-save', fixtures, async () => {
      const outputs = [];
      for (const id of ['biz-plan-hwp', 'form-hwpx'] as const) {
        const fixture = fixtureById(fixtures, id);
        const target = join(generatedDir, `roundtrip-${fixture.id}.${fixture.format}`);
        await removeStale(target);
        const adapter = nativeAdapter({ 'file:save-as': target });
        await adapter.openDocument(fixture.absolutePath, () => triggerFileCommand('file:open'));
        await waitForDocument(fixture.absolutePath, fixture.expectedPageCount);
        await runDocumentCommand('file:save-as', adapter);
        outputs.push(await assertGenerated(target));
        await runDocumentCommand('file:save', adapter);
        outputs.push(await assertGenerated(target));
        await adapter.openDocument(target, () => triggerFileCommand('file:open'));
        await waitForDocument(target, fixture.expectedPageCount);
      }
      return outputs;
    });
  });

  it('X11 bounded drag-in은 한 번의 검증된 gesture로 문서를 연다', async () => {
    const fixture = fixtureById(fixtures, 'form-hwpx');
    await runScenario('linux-native-drag-in', [fixture], async () => {
      const adapter = nativeAdapter({});
      await adapter.withFailureEvidence('drag-in', async () => {
        await dragFileIntoWindow({
          filePath: fixture.absolutePath,
          targetRect: await appWindowBounds(),
          timeoutMs: Math.min(inputs.timeoutMs, 30000),
          env: process.env,
        });
        await waitForDocument(fixture.absolutePath, fixture.expectedPageCount);
      });
      return [];
    });
  });

  it('직접 PDF는 6쪽 A4, 한글 text와 nonblank render를 보존한다', async () => {
    const fixture = fixtureById(fixtures, 'biz-plan-hwp');
    await runScenario('linux-direct-pdf', [fixture], async () => {
      const pdfPath = join(generatedDir, 'biz-plan-direct.pdf');
      await removeStale(pdfPath);
      const adapter = nativeAdapter({});
      await adapter.openDocument(fixture.absolutePath, () => triggerFileCommand('file:open'));
      await waitForDocument(fixture.absolutePath, 6);
      await adapter.saveDocument(
        'file:print-to-pdf', pdfPath,
        () => triggerFileCommand('file:print-to-pdf'),
      );
      await waitForStatus(/PDF 저장 완료/);
      const analysis = await analyzeBizPlanPdf(pdfPath, 'direct-pdf');
      return [
        await describeEvidenceFile(inputs.outputDir, pdfPath, 'generated-document'),
        ...await describeRenderEvidence(analysis.renderPaths),
      ];
    });
  });

  it('GTK Print to File, cancel과 CUPS-PDF 반복 뒤 editor 상태를 복원한다', async () => {
    const fixture = fixtureById(fixtures, 'biz-plan-hwp');
    await runScenario('linux-system-print', [fixture], async () => {
      const gtkPdf = join(generatedDir, 'biz-plan-gtk-print.pdf');
      const cups = readCupsInputs();
      await Promise.all([removeStale(gtkPdf), removeStale(cups.outputPath)]);
      const adapter = nativeAdapter({});
      await adapter.openDocument(fixture.absolutePath, () => triggerFileCommand('file:open'));
      await waitForDocument(fixture.absolutePath, 6);
      const original = await captureDocumentState();

      await adapter.printToFile(gtkPdf, () => triggerFileCommand('file:print'));
      await waitForRestoredState(original);
      await adapter.cancelPrint(() => triggerFileCommand('file:print'));
      await waitForRestoredState(original);
      await adapter.printWithVirtualPrinter(cups.printerName, () => triggerFileCommand('file:print'));
      await waitForFile(cups.outputPath);
      await waitForRestoredState(original);

      const gtk = await analyzeBizPlanPdf(gtkPdf, 'gtk-print-to-file');
      const cupsPdf = await analyzeBizPlanPdf(cups.outputPath, 'cups-pdf');
      return [
        await describeEvidenceFile(inputs.outputDir, gtkPdf, 'generated-document'),
        await describeEvidenceFile(inputs.outputDir, cups.outputPath, 'generated-document'),
        ...await describeRenderEvidence([...gtk.renderPaths, ...cupsPdf.renderPaths]),
      ];
    });
  });
});

function nativeAdapter(saveTargets: Partial<Record<NativeDocumentCommand, string>>) {
  return new LinuxNativeUiAdapter({
    outputDir: inputs.outputDir,
    timeoutMs: Math.min(inputs.timeoutMs, 120000),
    applicationNames: ['Alhangeul'],
    saveTargets,
    captureScreenshot: (path: string) => browser.saveScreenshot(path),
  });
}

async function runDocumentCommand(
  command: NativeDocumentCommand,
  adapter: LinuxNativeUiAdapter,
): Promise<void> {
  const result = await runNativeDocumentCommand(command, adapter, {
    capture: captureStableDocumentState,
    trigger: triggerFileCommand,
  });
  expect(result.after.page).toEqual(result.before.page);
  expect(result.after.status).not.toContain('중...');
}

async function triggerFileCommand(command: string): Promise<void> {
  await $('#menu-bar .menu-title').click();
  const item = await $(`.md-item[data-cmd="${command}"]`);
  await item.waitForDisplayed({ timeout: inputs.timeoutMs });
  await item.click();
}

async function waitForDocument(path: string, pageCount: number | null): Promise<void> {
  await browser.waitUntil(async () => {
    const title = await browser.getTitle();
    const status = await $(GUI_SELECTORS.statusMessage).getText();
    if (!title.includes(basename(path)) || !status.includes(basename(path))) return false;
    const page = parsePageIndicator(await $(GUI_SELECTORS.pageIndicator).getText());
    return pageCount === null || page.total === pageCount;
  }, { timeout: inputs.timeoutMs, timeoutMsg: `${basename(path)} native open이 완료되지 않았습니다` });
}

async function captureStableDocumentState(): Promise<DocumentStateSnapshot> {
  await browser.waitUntil(async () => {
    const status = await $(GUI_SELECTORS.statusMessage).getText();
    return status !== '' && !status.includes('중...');
  }, { timeout: inputs.timeoutMs, timeoutMsg: 'native command가 안정 상태로 돌아오지 않았습니다' });
  return captureDocumentState();
}

async function captureDocumentState(): Promise<DocumentStateSnapshot> {
  return {
    title: await browser.getTitle(),
    page: parsePageIndicator(await $(GUI_SELECTORS.pageIndicator).getText()),
    status: await $(GUI_SELECTORS.statusMessage).getText(),
  };
}

async function waitForRestoredState(expected: DocumentStateSnapshot): Promise<void> {
  await browser.waitUntil(async () => {
    const current = await captureDocumentState();
    return current.title === expected.title
      && current.status === expected.status
      && current.page.current === expected.page.current
      && current.page.total === expected.page.total;
  }, { timeout: inputs.timeoutMs, timeoutMsg: 'system print 뒤 editor state가 복원되지 않았습니다' });
}

async function waitForStatus(expected: RegExp): Promise<void> {
  await browser.waitUntil(async () => expected.test(await $(GUI_SELECTORS.statusMessage).getText()), {
    timeout: inputs.timeoutMs, timeoutMsg: `${expected} status를 확인하지 못했습니다`,
  });
}

async function appWindowBounds() {
  const result = await browser.execute(() => ({
    x: Math.max(0, Math.round(window.screenX)),
    y: Math.max(0, Math.round(window.screenY)),
    width: Math.round(window.outerWidth),
    height: Math.round(window.outerHeight),
  }));
  if (result.width < 100 || result.height < 100) throw new Error('app window bounds가 유효하지 않습니다');
  return result;
}

async function analyzeBizPlanPdf(pdfPath: string, label: string) {
  await waitForFile(pdfPath);
  return analyzePdf({
    pdfPath,
    outputDir: inputs.outputDir,
    label,
    expectedPageCount: 6,
    expectedTitle: '사업수행계획서',
    minTextCounts: [20, 20, 150, 300, 200, 100],
  });
}

async function assertGenerated(path: string): Promise<EvidenceFile> {
  await waitForFile(path);
  const source = await readFile(path);
  expect(source.length).toBeGreaterThan(1024);
  expect(createHash('sha256').update(source).digest('hex')).toMatch(/^[0-9a-f]{64}$/);
  return describeEvidenceFile(inputs.outputDir, path, 'generated-document');
}

async function waitForFile(path: string): Promise<void> {
  await browser.waitUntil(async () => {
    try { return (await stat(path)).size > 0; } catch { return false; }
  }, { timeout: inputs.timeoutMs, timeoutMsg: `${basename(path)} 출력이 생성되지 않았습니다` });
}

async function describeRenderEvidence(paths: string[]): Promise<EvidenceFile[]> {
  return Promise.all(paths.map((path) => describeEvidenceFile(inputs.outputDir, path, 'screenshot')));
}

async function removeStale(path: string): Promise<void> {
  await unlink(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

function readCupsInputs() {
  const outputPath = process.env.ALHANGEUL_GUI_CUPS_PDF_OUTPUT ?? '';
  const printerName = process.env.ALHANGEUL_GUI_CUPS_PDF_PRINTER ?? 'PDF';
  if (!isAbsolute(outputPath) || !outputPath.startsWith(`${inputs.outputDir}/`)) {
    throw new Error('ALHANGEUL_GUI_CUPS_PDF_OUTPUT은 output root 안의 절대 경로여야 합니다');
  }
  return { outputPath, printerName };
}

async function runScenario(
  scenario: string,
  scenarioFixtures: readonly DocumentFixture[],
  action: () => Promise<EvidenceFile[]>,
): Promise<void> {
  const startedAt = new Date();
  let error: unknown;
  let files: EvidenceFile[] = [];
  try { files = await action(); } catch (caught) { error = caught; }
  const screenshot = join(inputs.outputDir, 'scenarios', scenario, 'final.png');
  await mkdir(join(inputs.outputDir, 'scenarios', scenario), { recursive: true });
  await browser.saveScreenshot(screenshot).catch((caught) => { error ??= caught; });
  files.push(await describeEvidenceFile(inputs.outputDir, screenshot, 'screenshot'));
  await writeScenarioEvidence(inputs.outputDir, createScenarioEvidence({
    inputs,
    scenario,
    status: error === undefined ? 'success' : 'failure',
    startedAt,
    completedAt: new Date(),
    fixtures: scenarioFixtures,
    files,
    ...(error === undefined ? {} : { error }),
  }));
  if (error !== undefined) throw error;
}
