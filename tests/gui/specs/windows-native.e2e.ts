import { mkdir, stat, unlink } from 'node:fs/promises';
import { win32 } from 'node:path';
import { browser, $, expect } from '@wdio/globals';
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
import { dragFileIntoWindow } from '../windows/native-ui/drag-drop.mjs';
import {
  createWindowsNativeUiAdapter,
  type WindowsNativeUiAdapter,
} from '../windows/native-ui/file-dialog.mjs';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
const generatedDir = win32.join(inputs.outputDir, 'generated');
let fixtures: DocumentFixture[] = [];
let desktopReady = false;

describe('Alhangeul native Windows acceptance', () => {
  before(async () => {
    fixtures = await resolveDocumentFixtures(inputs.fixtureRoot);
    await mkdir(generatedDir, { recursive: true });
  });

  it('HWP/HWPX native Save As, current save와 reopen', async () => {
    await runScenario('windows-native-save', fixtures, async () => {
      const outputs: EvidenceFile[] = [];
      for (const id of ['biz-plan-hwp', 'form-hwpx'] as const) {
        const fixture = fixtureById(fixtures, id);
        const target = win32.join(generatedDir, `roundtrip-${fixture.id}.${fixture.format}`);
        await removeStale(target);
        const adapter = await nativeAdapter({ 'file:save-as': target }, fixture.id);
        await adapter.openDocument(fixture.absolutePath, () => triggerFileCommand('file:open'));
        await waitForDocument(fixture.absolutePath, fixture.expectedPageCount);
        await runDocumentCommand('file:save-as', adapter);
        outputs.push(await assertGenerated(target));
        await runCurrentSave(adapter, target);
        outputs.push(await assertGenerated(target));
        await adapter.openDocument(target, () => triggerFileCommand('file:open'));
        await waitForDocument(target, fixture.expectedPageCount);
        outputs.push(...adapter.takeEvidenceFiles());
      }
      return outputs;
    });
  });

  it('Open·Save As 취소 반복은 editor state와 modal lifecycle을 복원한다', async () => {
    const fixture = fixtureById(fixtures, 'form-hwpx');
    await runScenario('windows-native-file-cancel', [fixture], async () => {
      const adapter = await nativeAdapter({}, 'file-cancel');
      await adapter.openDocument(fixture.absolutePath, () => triggerFileCommand('file:open'));
      await waitForDocument(fixture.absolutePath, fixture.expectedPageCount);
      for (const command of ['file:save-as', 'file:open', 'file:save-as'] as const) {
        const before = await captureStableDocumentState(browser, inputs.timeoutMs);
        await adapter.cancelDocument(command, () => triggerFileCommand(command));
        const after = await captureStableDocumentState(browser, inputs.timeoutMs);
        expect(after.title).toBe(before.title);
        expect(after.page).toEqual(before.page);
        expect(after.status).not.toContain('중...');
      }
      return adapter.takeEvidenceFiles();
    });
  });

  it('Explorer bounded drag-in은 측정한 두 window 사이에서 한 번만 문서를 연다', async () => {
    const fixture = fixtureById(fixtures, 'form-hwpx');
    await runScenario('windows-native-drag-in', [fixture], async () => {
      const evidence = await dragFileIntoWindow({
        filePath: fixture.absolutePath,
        outputDir: inputs.outputDir,
        timeoutMs: Math.min(inputs.timeoutMs, 120_000),
        cliPath: winAppCliPath(),
        env: process.env,
      });
      await waitForDocument(fixture.absolutePath, fixture.expectedPageCount);
      return evidence;
    });
  });
});

async function nativeAdapter(
  saveTargets: Partial<Record<NativeDocumentCommand, string>> = {},
  evidencePrefix = '',
): Promise<WindowsNativeUiAdapter> {
  return createWindowsNativeUiAdapter({
    cliPath: winAppCliPath(),
    outputDir: inputs.outputDir,
    timeoutMs: Math.min(inputs.timeoutMs, 120_000),
    env: process.env,
    saveTargets,
    evidencePrefix,
  });
}

async function runDocumentCommand(
  command: NativeDocumentCommand,
  adapter: WindowsNativeUiAdapter,
): Promise<void> {
  const result = await runNativeDocumentCommand(command, adapter, {
    capture: () => captureStableDocumentState(browser, inputs.timeoutMs),
    trigger: triggerFileCommand,
  });
  expect(result.after.page).toEqual(result.before.page);
  expect(result.after.status).not.toContain('중...');
}

async function runCurrentSave(adapter: WindowsNativeUiAdapter, path: string): Promise<void> {
  const beforeState = await captureStableDocumentState(browser, inputs.timeoutMs);
  const beforeFile = await fileWriteState(path);
  await adapter.complete('file:save', () => triggerFileCommand('file:save'));
  await waitForStudioStatus(browser, /^저장 완료$/, inputs.timeoutMs);
  await browser.waitUntil(async () => {
    const current = await fileWriteState(path);
    return current.mtimeNs > beforeFile.mtimeNs;
  }, {
    timeout: inputs.timeoutMs,
    timeoutMsg: `${win32.basename(path)} 현재 저장이 파일 갱신으로 이어지지 않았습니다`,
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
  await waitForLoadedDocument(browser, win32.basename(path), pageCount, inputs.timeoutMs);
}

async function assertGenerated(path: string): Promise<EvidenceFile> {
  await waitForFile(path);
  expect((await stat(path)).size).toBeGreaterThan(1024);
  return describeEvidenceFile(inputs.outputDir, path, 'generated-document');
}

async function fileWriteState(path: string): Promise<{ size: bigint; mtimeNs: bigint }> {
  const metadata = await stat(path, { bigint: true });
  if (!metadata.isFile() || metadata.size <= 1024n) {
    throw new Error(`${win32.basename(path)} 저장 파일이 유효하지 않습니다`);
  }
  return { size: metadata.size, mtimeNs: metadata.mtimeNs };
}

async function waitForFile(path: string): Promise<void> {
  await browser.waitUntil(async () => {
    try { return (await stat(path)).size > 0; } catch { return false; }
  }, { timeout: inputs.timeoutMs, timeoutMsg: `${win32.basename(path)} 출력이 생성되지 않았습니다` });
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

function winAppCliPath(): string {
  return process.env.ALHANGEUL_WINAPP_CLI_PATH?.trim() ?? '';
}
