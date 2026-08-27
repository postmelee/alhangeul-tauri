import { mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { browser, expect } from '@wdio/globals';
import { analyzePdf } from '../linux/pdf-analysis.mjs';
import { LINUX_NATIVE_APPLICATION_NAMES, LinuxNativeUiAdapter } from '../linux/native-ui/atspi.mjs';
import { dragFileIntoWindow } from '../linux/native-ui/drag-drop.mjs';
import {
  assertGenerated,
  describeRenderEvidence,
  fileWriteState,
  normalizeCupsPdf,
  readCupsInputs,
  removeStale,
  resetCupsOutput,
  waitForFile,
} from '../linux/native-output.ts';
import { fixtureById, resolveDocumentFixtures, type DocumentFixture } from '../support/document-fixture.ts';
import { describeEvidenceFile, type EvidenceFile } from '../support/evidence.ts';
import { runScenarioWithEvidence } from '../support/scenario-runner.ts';
import {
  GUI_SELECTORS,
  parsePageIndicator,
  runNativeDocumentCommand,
  type DocumentStateSnapshot,
  type NativeDocumentCommand,
} from '../support/document-ux.ts';
import {
  dismissLocalFontPrompt,
  readAppWindowBounds,
  readDomText,
} from '../support/webdriver-dom.ts';
import { createNativeCommandDriver } from '../support/native-command.ts';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
const generatedDir = join(inputs.outputDir, 'generated');
// Task #15 Stage 4.8 Linux read-back 실측치의 50% 이하를 경로별 floor로 둔다.
const DIRECT_PDF_MIN_TEXT_COUNTS = [20, 300, 200, 300, 200, 100];
const SYSTEM_PDF_MIN_TEXT_COUNTS = [20, 25, 200, 300, 200, 100];
const { trigger: triggerFileCommand, runSystemPrint } = createNativeCommandDriver(inputs.timeoutMs);
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
        outputs.push(await assertGenerated(inputs.outputDir, target));
        await runCurrentSave(adapter, target);
        outputs.push(await assertGenerated(inputs.outputDir, target));
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
          targetRect: await readAppWindowBounds(),
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
      const analysis = await analyzeBizPlanPdf(
        pdfPath, 'direct-pdf', DIRECT_PDF_MIN_TEXT_COUNTS,
      );
      return [
        await describeEvidenceFile(inputs.outputDir, pdfPath, 'generated-document'),
        ...await describeRenderEvidence(inputs.outputDir, analysis.renderPaths),
      ];
    });
  });

  it('GTK Print to File, cancel과 CUPS-PDF 반복 뒤 editor 상태를 복원한다', async () => {
    const fixture = fixtureById(fixtures, 'biz-plan-hwp');
    await runScenario('linux-system-print', [fixture], async () => {
      const gtkPdf = join(generatedDir, 'biz-plan-gtk-print.pdf');
      const cups = readCupsInputs(inputs.outputDir);
      await Promise.all([removeStale(gtkPdf), resetCupsOutput(cups.outputPath)]);
      const adapter = nativeAdapter({});
      await adapter.openDocument(fixture.absolutePath, () => triggerFileCommand('file:open'));
      await waitForDocument(fixture.absolutePath, 6);
      const original = await captureDocumentState();

      await runSystemPrint((trigger) => adapter.printToFile(gtkPdf, async () => {
        await trigger();
        await assertPreparedPrintSurface(6);
      }));
      await waitForRestoredState(original);
      await runSystemPrint((trigger) => adapter.cancelPrint(trigger));
      await waitForRestoredState(original);
      await runSystemPrint((trigger) => adapter.printWithVirtualPrinter(cups.printerName, trigger));
      await normalizeCupsPdf(cups.outputPath, inputs.timeoutMs);
      await waitForRestoredState(original);

      const gtk = await analyzeBizPlanPdf(
        gtkPdf, 'gtk-print-to-file', SYSTEM_PDF_MIN_TEXT_COUNTS,
      );
      const cupsPdf = await analyzeBizPlanPdf(
        cups.outputPath, 'cups-pdf', SYSTEM_PDF_MIN_TEXT_COUNTS,
      );
      return [
        await describeEvidenceFile(inputs.outputDir, gtkPdf, 'generated-document'),
        await describeEvidenceFile(inputs.outputDir, cups.outputPath, 'generated-document'),
        ...await describeRenderEvidence(
          inputs.outputDir, [...gtk.renderPaths, ...cupsPdf.renderPaths],
        ),
      ];
    });
  });
});

function nativeAdapter(saveTargets: Partial<Record<NativeDocumentCommand, string>>) {
  return new LinuxNativeUiAdapter({
    outputDir: inputs.outputDir,
    timeoutMs: Math.min(inputs.timeoutMs, 120000),
    applicationNames: LINUX_NATIVE_APPLICATION_NAMES,
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

async function runCurrentSave(
  adapter: LinuxNativeUiAdapter,
  path: string,
): Promise<void> {
  const beforeState = await captureStableDocumentState();
  const beforeFile = await fileWriteState(path);
  await adapter.complete('file:save', () => triggerFileCommand('file:save'));
  await waitForStatus(/^저장 완료$/);
  await browser.waitUntil(async () => {
    const current = await fileWriteState(path);
    return current.mtimeNs > beforeFile.mtimeNs;
  }, {
    timeout: inputs.timeoutMs,
    timeoutMsg: `${basename(path)} 현재 저장이 파일 갱신으로 이어지지 않았습니다`,
  });
  const afterState = await captureDocumentState();
  expect(afterState.page).toEqual(beforeState.page);
  expect(afterState.status).toBe('저장 완료');
}

async function waitForDocument(path: string, pageCount: number | null): Promise<void> {
  await browser.waitUntil(async () => {
    if (await dismissLocalFontPrompt()) return false;
    const status = await readDomText(GUI_SELECTORS.statusMessage);
    const opened = status === '파일 열기 완료'
      || status.startsWith(`${basename(path)} — `);
    if (!opened) return false;
    const page = parsePageIndicator(await readDomText(GUI_SELECTORS.pageIndicator));
    return pageCount === null || page.total === pageCount;
  }, {
    timeout: inputs.timeoutMs,
    timeoutMsg: `${basename(path)} native open과 page readiness가 완료되지 않았습니다`,
  });
}

async function captureStableDocumentState(): Promise<DocumentStateSnapshot> {
  await browser.waitUntil(async () => {
    const status = await readDomText(GUI_SELECTORS.statusMessage);
    return status !== '' && !status.includes('중...');
  }, { timeout: inputs.timeoutMs, timeoutMsg: 'native command가 안정 상태로 돌아오지 않았습니다' });
  return captureDocumentState();
}

async function captureDocumentState(): Promise<DocumentStateSnapshot> {
  return {
    title: await browser.getTitle(),
    page: parsePageIndicator(await readDomText(GUI_SELECTORS.pageIndicator)),
    status: await readDomText(GUI_SELECTORS.statusMessage),
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

async function assertPreparedPrintSurface(expectedPages: number): Promise<void> {
  let observed = { active: false, pages: 0, svgs: 0, markupLength: 0 };
  await browser.waitUntil(async () => {
    observed = await browser.execute(() => {
      const surface = document.getElementById('alhangeul-direct-print-surface');
      const svgs = surface?.querySelectorAll('.page > svg') ?? [];
      return {
        active: document.documentElement.classList.contains('alhangeul-print-active'),
        pages: surface?.querySelectorAll(':scope > .page').length ?? 0,
        svgs: svgs.length,
        markupLength: Array.from(svgs).reduce((sum, svg) => sum + svg.outerHTML.length, 0),
      };
    });
    return observed.active && observed.pages === expectedPages
      && observed.svgs === expectedPages && observed.markupLength > 1000;
  }, {
    timeout: inputs.timeoutMs,
    timeoutMsg: `native print surface 준비 불일치: ${JSON.stringify(observed)}`,
  });
  console.info(`[native-print-surface] ${JSON.stringify(observed)}`);
}

async function waitForStatus(expected: RegExp): Promise<void> {
  await browser.waitUntil(async () => expected.test(await readDomText(GUI_SELECTORS.statusMessage)), {
    timeout: inputs.timeoutMs, timeoutMsg: `${expected} status를 확인하지 못했습니다`,
  });
}

async function analyzeBizPlanPdf(
  pdfPath: string,
  label: string,
  minTextCounts: number[],
) {
  await waitForFile(pdfPath);
  return analyzePdf({
    pdfPath,
    outputDir: inputs.outputDir,
    label,
    expectedPageCount: 6,
    expectedTitle: '사업수행계획서',
    minTextCounts,
  });
}

async function runScenario(
  scenario: string,
  scenarioFixtures: readonly DocumentFixture[],
  action: () => Promise<EvidenceFile[]>,
): Promise<void> {
  await runScenarioWithEvidence({
    inputs,
    scenario,
    fixtures: scenarioFixtures,
    screenshotName: 'final.png',
    captureScreenshot: (path) => browser.saveScreenshot(path),
  }, action);
}
