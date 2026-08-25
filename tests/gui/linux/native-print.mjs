#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdir, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { analyzePdf } from './pdf-analysis.mjs';
import { LinuxNativeUiAdapter } from './native-ui/atspi.mjs';
import {
  fixtureById,
  resolveDocumentFixtures,
} from '../support/document-fixture.ts';
import { describeEvidenceFile } from '../support/evidence.ts';
import { runScenarioWithEvidence } from '../support/scenario-runner.ts';
import {
  resolveExecutable,
  spawnLoggedProcess,
  stopProcess,
} from '../support/process.mjs';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

const SYSTEM_PDF_MIN_TEXT_COUNTS = [20, 25, 200, 300, 200, 100];
const BUTTON_ROLES = ['push button', 'button'];
const LOCAL_FONT_BUTTON = Object.freeze({
  roles: BUTTON_ROLES,
  names: ['대체 글꼴로 보기'],
});

export async function runProductionPrintSequence(options) {
  const document = documentSelector(options.displayName);
  const focusedDocument = { ...document, focused: true };
  await options.adapter.actionOptional(LOCAL_FONT_BUTTON, 10000);
  await options.adapter.waitAbsent(LOCAL_FONT_BUTTON);
  await options.adapter.wait(document);

  const trigger = async () => {
    await options.adapter.wait(focusedDocument);
    await options.adapter.triggerSystemPrint();
  };
  await options.adapter.printToFile(options.gtkPdf, trigger);
  await waitForEditorRestore(options.adapter, focusedDocument);
  await options.waitForFile(options.gtkPdf);
  await options.adapter.cancelPrint(trigger);
  await waitForEditorRestore(options.adapter, focusedDocument);
  await options.adapter.printWithVirtualPrinter(options.printerName, trigger);
  await waitForEditorRestore(options.adapter, focusedDocument);
  await options.waitForCupsPdf();
}

export async function runNativePrintAcceptance(env = process.env) {
  const inputs = readGuiHarnessInputs(env);
  const fixtures = await resolveDocumentFixtures(inputs.fixtureRoot);
  const fixture = fixtureById(fixtures, 'biz-plan-hwp');
  const generatedDir = posix.join(inputs.outputDir, 'generated');
  const gtkPdf = posix.join(generatedDir, 'biz-plan-gtk-print.pdf');
  const cups = readCupsInputs(inputs.outputDir, env);
  const scrot = await resolveExecutable('scrot', {
    pathValue: env.PATH,
    pathApi: posix,
  });
  await mkdir(generatedDir, { recursive: true });
  await Promise.all([removeStale(gtkPdf), removeStale(cups.outputPath)]);

  const app = spawnLoggedProcess(inputs.appPath, [fixture.absolutePath], {
    cwd: generatedDir,
    env,
  });
  const screenshot = (path) => captureScreenshot(scrot, path, env);
  const adapter = new LinuxNativeUiAdapter({
    outputDir: inputs.outputDir,
    timeoutMs: Math.min(inputs.timeoutMs, 120000),
    applicationNames: ['Alhangeul'],
    captureScreenshot: screenshot,
    env,
  });
  try {
    await runScenarioWithEvidence({
      inputs,
      scenario: 'linux-system-print',
      fixtures: [fixture],
      screenshotName: 'final.png',
      captureScreenshot: screenshot,
    }, async () => runPrintScenario({
      inputs,
      fixture,
      adapter,
      app,
      gtkPdf,
      cups,
    }));
  } finally {
    await stopProcess(app.child);
  }
}

async function runPrintScenario(options) {
  const modePath = posix.join(options.inputs.outputDir, 'native-print-mode.json');
  const logPath = posix.join(options.inputs.outputDir, 'native-print-app.log');
  await writeFile(modePath, `${JSON.stringify({
    schemaVersion: 1,
    mode: 'production-native-print',
    webdriverControlled: false,
    app: posix.basename(options.inputs.appPath),
    fixture: options.fixture.relativePath,
  }, null, 2)}\n`, { mode: 0o600 });

  let error;
  let files = [];
  try {
    const cupsDirectory = posix.dirname(options.cups.outputPath);
    const cupsBaseline = await readRegularPdfSnapshot(cupsDirectory);
    await runProductionPrintSequence({
      adapter: options.adapter,
      displayName: posix.basename(options.fixture.absolutePath),
      gtkPdf: options.gtkPdf,
      cupsPdf: options.cups.outputPath,
      printerName: options.cups.printerName,
      waitForFile: (path) => waitForFile(path, options.inputs.timeoutMs),
      waitForCupsPdf: () => waitForVirtualPrinterPdf({
        baseline: cupsBaseline,
        directory: cupsDirectory,
        targetPath: options.cups.outputPath,
        timeoutMs: options.inputs.timeoutMs,
      }),
    });
    const gtk = await analyzeBizPlanPdf(options.inputs.outputDir, options.gtkPdf, 'gtk-print-to-file');
    const cups = await analyzeBizPlanPdf(options.inputs.outputDir, options.cups.outputPath, 'cups-pdf');
    files = [
      await describeEvidenceFile(options.inputs.outputDir, modePath, 'log'),
      await describeEvidenceFile(options.inputs.outputDir, options.gtkPdf, 'generated-document'),
      await describeEvidenceFile(options.inputs.outputDir, options.cups.outputPath, 'generated-document'),
      ...await describeRenders(options.inputs.outputDir, [...gtk.renderPaths, ...cups.renderPaths]),
    ];
  } catch (caught) {
    error = caught;
  } finally {
    await writeFile(logPath, [
      '[stdout]', options.app.stdout.value(),
      '[stderr]', options.app.stderr.value(),
    ].join('\n'), { mode: 0o600 });
    if (error === undefined) {
      files.push(await describeEvidenceFile(options.inputs.outputDir, logPath, 'log'));
    }
  }
  if (error !== undefined) throw error;
  return files;
}

async function analyzeBizPlanPdf(outputDir, pdfPath, label) {
  return analyzePdf({
    pdfPath,
    outputDir,
    label,
    expectedPageCount: 6,
    expectedTitle: '사업수행계획서',
    minTextCounts: SYSTEM_PDF_MIN_TEXT_COUNTS,
  });
}

async function describeRenders(outputDir, paths) {
  return Promise.all(paths.map((path) => describeEvidenceFile(outputDir, path, 'screenshot')));
}

async function waitForEditorRestore(adapter, focusedDocument) {
  await adapter.wait(focusedDocument);
}

async function waitForFile(path, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await stat(path)).size > 0) return;
    } catch {
      // 아직 생성되지 않은 output을 bounded poll한다.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${posix.basename(path)} 출력이 생성되지 않았습니다`);
}

export async function waitForVirtualPrinterPdf(options) {
  validateVirtualPrinterOptions(options);
  const delay = options.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const deadline = Date.now() + options.timeoutMs;
  let stableSignature = '';
  let stableObservations = 0;
  while (Date.now() < deadline) {
    const current = await readRegularPdfSnapshot(options.directory);
    const changed = changedPdfEntries(options.baseline, current);
    if (changed.length > 1) throw new Error(`CUPS-PDF 신규 artifact가 ${changed.length}개입니다`);
    if (changed.length === 1 && changed[0][1].size > 0) {
      const [name, info] = changed[0];
      const signature = `${name}:${info.size}:${info.mtimeMs}`;
      stableObservations = signature === stableSignature ? stableObservations + 1 : 1;
      stableSignature = signature;
      if (stableObservations >= 2) {
        const sourcePath = posix.join(options.directory, name);
        if (sourcePath !== options.targetPath) await rename(sourcePath, options.targetPath);
        return options.targetPath;
      }
    } else {
      stableSignature = '';
      stableObservations = 0;
    }
    await delay(100);
  }
  throw new Error(`${posix.basename(options.targetPath)} 출력이 생성되지 않았습니다`);
}

async function readRegularPdfSnapshot(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const snapshot = new Map();
  for (const entry of entries) {
    if (!entry.isFile() || posix.extname(entry.name).toLowerCase() !== '.pdf') continue;
    const info = await stat(posix.join(directory, entry.name));
    snapshot.set(entry.name, { mtimeMs: info.mtimeMs, size: info.size });
  }
  return snapshot;
}

function changedPdfEntries(baseline, current) {
  return [...current.entries()].filter(([name, info]) => {
    const previous = baseline.get(name);
    return previous === undefined || previous.size !== info.size || previous.mtimeMs !== info.mtimeMs;
  });
}

function validateVirtualPrinterOptions(options) {
  if (!(options.baseline instanceof Map)) throw new Error('CUPS-PDF baseline이 유효하지 않습니다');
  if (!posix.isAbsolute(options.directory)
    || posix.dirname(options.targetPath) !== options.directory) {
    throw new Error('CUPS-PDF target은 전용 output directory 안의 절대 경로여야 합니다');
  }
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 100) {
    throw new Error('CUPS-PDF timeout이 유효하지 않습니다');
  }
}

async function captureScreenshot(scrot, path, env) {
  await mkdir(posix.dirname(path), { recursive: true });
  const result = spawnSync(scrot, ['--overwrite', path], {
    encoding: 'utf8', env, timeout: 10000,
  });
  if (result.status !== 0) {
    throw new Error(`native screenshot failed: ${String(result.stderr || result.error || '').trim()}`);
  }
}

function documentSelector(displayName) {
  return { roles: ['document text'], names: [displayName] };
}

function readCupsInputs(outputDir, env) {
  const outputPath = env.ALHANGEUL_GUI_CUPS_PDF_OUTPUT ?? '';
  const printerName = env.ALHANGEUL_GUI_CUPS_PDF_PRINTER ?? 'PDF';
  if (!posix.isAbsolute(outputPath) || !outputPath.startsWith(`${outputDir}/`)) {
    throw new Error('ALHANGEUL_GUI_CUPS_PDF_OUTPUT은 output root 안의 절대 경로여야 합니다');
  }
  if (!/(pdf|print\s+to\s+file|파일)/i.test(printerName)) {
    throw new Error('native print phase는 virtual PDF printer만 허용합니다');
  }
  return { outputPath, printerName };
}

async function removeStale(path) {
  await unlink(path).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    await runNativePrintAcceptance();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
