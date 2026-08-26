import { mkdir, writeFile } from 'node:fs/promises';
import { win32 } from 'node:path';
import {
  createScenarioEvidence,
  describeEvidenceFile,
  writeScenarioEvidence,
} from '../support/evidence.ts';
import {
  createWinAppCli,
  discoverWinAppWindows,
} from './winapp-cli.mjs';

const SCENARIO = 'windows-production-probe';

export async function runWindowsGuiProbe(options = {}) {
  const runtime = inspectProbeEnvironment(options);
  const startedAt = new Date();
  const io = {
    mkdir: options.services?.mkdir ?? mkdir,
    writeFile: options.services?.writeFile ?? writeFile,
    describeFile: options.services?.describeFile ?? describeEvidenceFile,
    writeManifest: options.services?.writeManifest ?? writeScenarioEvidence,
  };
  await io.mkdir(runtime.scenarioDir, { recursive: true });
  let result;
  let failure;
  try {
    const title = await options.browser.getTitle();
    const rootTag = await options.browser.execute(
      () => document.documentElement.tagName,
    );
    assertWebView(title, rootTag);
    const discover = options.services?.discoverWindows ?? discoverWinAppWindows;
    const windows = await discover({
      executablePath: runtime.cliPath,
      appName: 'Alhangeul',
      timeoutMs: runtime.timeoutMs,
      env: options.env,
    });
    const target = selectSingleAppWindow(windows);
    const createClient = options.services?.createClient ?? createWinAppCli;
    const client = createClient({
      executablePath: runtime.cliPath,
      appPid: target.processId,
      windowHandle: target.hwnd,
      timeoutMs: runtime.timeoutMs,
      env: options.env,
    });
    const status = await client.status();
    const targetWindows = await client.listWindows();
    const inspect = await client.inspect(4);
    const screenshot = await client.screenshot(runtime.screenshotPath);
    assertTargetIdentity(status, target);
    result = { title, rootTag, target, targetWindows, status, inspect, screenshot };
    return result;
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    await writeProbeEvidence(runtime, options.inputs, result, failure, startedAt, io)
      .catch((evidenceError) => {
        if (!failure) throw evidenceError;
      });
  }
}

export function inspectProbeEnvironment(options = {}) {
  const platform = options.services?.platform ?? process.platform;
  if (platform !== 'win32') throw new Error('Windows GUI probe는 Windows에서만 실행할 수 있습니다.');
  if (!options.browser) throw new Error('Windows GUI probe에 WebDriver browser가 필요합니다.');
  if (!options.inputs || !win32.isAbsolute(options.inputs.outputDir)) {
    throw new Error('Windows GUI probe output은 절대 Windows 경로여야 합니다.');
  }
  const cliPath = options.env?.ALHANGEUL_WINAPP_CLI_PATH?.trim() ?? '';
  if (!win32.isAbsolute(cliPath) || !/\.exe$/i.test(cliPath)) {
    throw new Error('ALHANGEUL_WINAPP_CLI_PATH는 절대 Windows .exe 경로여야 합니다.');
  }
  const timeoutMs = options.inputs.timeoutMs;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 5_000 || timeoutMs > 120_000) {
    throw new Error('Windows GUI probe timeout은 5000~120000ms 범위여야 합니다.');
  }
  const scenarioDir = win32.resolve(options.inputs.outputDir, 'scenarios', SCENARIO);
  return Object.freeze({
    cliPath: win32.normalize(cliPath),
    timeoutMs,
    scenarioDir,
    screenshotPath: win32.join(scenarioDir, 'window.png'),
  });
}

export function selectSingleAppWindow(windows) {
  if (!Array.isArray(windows)) throw new Error('WinApp window discovery 결과가 배열이 아닙니다.');
  const matches = windows.filter((window) =>
    window.processName.toLowerCase() === 'alhangeul' &&
    window.title.toLowerCase().includes('alhangeul'));
  if (matches.length !== 1) {
    throw new Error(`Alhangeul production window는 정확히 1개여야 합니다: ${matches.length}개`);
  }
  return matches[0];
}

function assertWebView(title, rootTag) {
  if (typeof title !== 'string' || !title.toLowerCase().includes('alhangeul')) {
    throw new Error(`Alhangeul WebView title이 올바르지 않습니다: ${title}`);
  }
  if (rootTag !== 'HTML') throw new Error(`Alhangeul root DOM이 HTML이 아닙니다: ${rootTag}`);
}

function assertTargetIdentity(status, target) {
  if (status.processId !== target.processId || status.hwnd !== target.hwnd) {
    throw new Error('WebDriver와 WinApp CLI target identity가 일치하지 않습니다.');
  }
}

async function writeProbeEvidence(runtime, inputs, result, failure, startedAt, io) {
  const files = [];
  if (result) {
    const records = [
      ['windows.json', result.targetWindows],
      ['status.json', result.status],
      ['inspect.json', result.inspect],
    ];
    for (const [name, payload] of records) {
      const path = win32.join(runtime.scenarioDir, name);
      await io.writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      files.push(await io.describeFile(inputs.outputDir, path, 'log'));
    }
    files.push(await io.describeFile(inputs.outputDir, runtime.screenshotPath, 'screenshot'));
  }
  const manifest = createScenarioEvidence({
    inputs,
    scenario: SCENARIO,
    status: failure ? 'failure' : 'success',
    startedAt,
    completedAt: new Date(),
    fixtures: [],
    files,
    ...(failure ? { error: failure } : {}),
  });
  await io.writeManifest(inputs.outputDir, manifest);
}
