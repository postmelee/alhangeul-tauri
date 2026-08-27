import { mkdir, stat, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { browser, $, expect } from '@wdio/globals';
import { analyzePdf } from '../linux/pdf-analysis.mjs';
import { LinuxNativeUiAdapter } from '../linux/native-ui/atspi.mjs';
import { dragFileIntoWindow } from '../linux/native-ui/drag-drop.mjs';
import {
  fixtureById,
  resolveDocumentFixtures,
  type DocumentFixture,
} from '../support/document-fixture.ts';
import { describeEvidenceFile, type EvidenceFile } from '../support/evidence.ts';
import { runScenarioWithEvidence } from '../support/scenario-runner.ts';
import {
  captureDocumentState,
  captureStableDocumentState,
  runNativeDocumentCommand,
  waitForLoadedDocument,
  waitForStudioStatus,
  waitForInitialDesktopReady,
  type NativeDocumentCommand,
} from '../support/document-ux.ts';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
const generatedDir = join(inputs.outputDir, 'generated');
// Task #15 Stage 4.8 Linux read-back 실측치의 50% 이하를 경로별 floor로 둔다.
const DIRECT_PDF_MIN_TEXT_COUNTS = [20, 300, 200, 300, 200, 100];
let fixtures: DocumentFixture[] = [];
let desktopReady = false;

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
        await runCurrentSave(adapter, target);
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
      await waitForStudioStatus(browser, /PDF 저장 완료/, inputs.timeoutMs);
      const analysis = await analyzeBizPlanPdf(
        pdfPath, 'direct-pdf', DIRECT_PDF_MIN_TEXT_COUNTS,
      );
      return [
        await describeEvidenceFile(inputs.outputDir, pdfPath, 'generated-document'),
        ...await describeRenderEvidence(analysis.renderPaths),
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
    capture: () => captureStableDocumentState(browser, inputs.timeoutMs),
    trigger: triggerFileCommand,
  });
  expect(result.after.page).toEqual(result.before.page);
  expect(result.after.status).not.toContain('중...');
}

async function runCurrentSave(
  adapter: LinuxNativeUiAdapter,
  path: string,
): Promise<void> {
  const beforeState = await captureStableDocumentState(browser, inputs.timeoutMs);
  const beforeFile = await fileWriteState(path);
  await adapter.complete('file:save', () => triggerFileCommand('file:save'));
  await waitForStudioStatus(browser, /^저장 완료$/, inputs.timeoutMs);
  await browser.waitUntil(async () => {
    const current = await fileWriteState(path);
    return current.mtimeNs > beforeFile.mtimeNs;
  }, {
    timeout: inputs.timeoutMs,
    timeoutMsg: `${basename(path)} 현재 저장이 파일 갱신으로 이어지지 않았습니다`,
  });
  const afterState = await captureDocumentState(browser);
  expect(afterState.page).toEqual(beforeState.page);
  expect(afterState.status).toBe('저장 완료');
}

async function triggerFileCommand(command: string): Promise<void> {
  await $('#menu-bar .menu-title').click();
  const item = await $(`.md-item[data-cmd="${command}"]`);
  await item.waitForDisplayed({ timeout: inputs.timeoutMs });
  await item.click();
}

async function waitForDocument(path: string, pageCount: number | null): Promise<void> {
  await waitForLoadedDocument(browser, basename(path), pageCount, inputs.timeoutMs);
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

async function assertGenerated(path: string): Promise<EvidenceFile> {
  await waitForFile(path);
  expect((await stat(path)).size).toBeGreaterThan(1024);
  return describeEvidenceFile(inputs.outputDir, path, 'generated-document');
}

async function fileWriteState(path: string): Promise<{ size: bigint; mtimeNs: bigint }> {
  const metadata = await stat(path, { bigint: true });
  if (!metadata.isFile() || metadata.size <= 1024n) {
    throw new Error(`${basename(path)} 저장 파일이 유효하지 않습니다`);
  }
  return { size: metadata.size, mtimeNs: metadata.mtimeNs };
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
  }, async () => {
    await ensureDesktopReady();
    return action();
  });
}

async function ensureDesktopReady(): Promise<void> {
  if (desktopReady) return;
  await waitForInitialDesktopReady(browser, inputs.timeoutMs);
  desktopReady = true;
}
