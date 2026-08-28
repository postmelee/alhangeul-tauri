import { execFile, spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeEvidenceFile } from '../../support/evidence.ts';
import { selectSingleAppWindow } from '../probe.mjs';
import { createWinAppCli, discoverWinAppWindows } from '../winapp-cli.mjs';

const ARRANGE_SCRIPT = fileURLToPath(new URL('./arrange-windows.ps1', import.meta.url));
const ITEM_TYPES = new Set(['DataItem', 'ListItem', 'TreeItem']);

export async function dragFileIntoWindow(options = {}, services = {}) {
  const runtime = inspectDragEnvironment(options);
  const discover = services.discoverWindows ?? discoverWinAppWindows;
  const createClient = services.createClient ?? createWinAppCli;
  const baseline = await discover(discovery(runtime, 'explorer'));
  const app = selectSingleAppWindow(await discover(discovery(runtime, 'Alhangeul')));
  const openExplorer = services.openExplorer ?? launchExplorer;
  const delay = services.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let explorer;
  let failure;
  try {
    await openExplorer(runtime);
    explorer = await waitForExplorer({ runtime, discover, baseline, delay });
    const arrange = services.arrangeWindows ?? arrangeWindows;
    const layout = await arrange(runtime, app, explorer);
    const explorerClient = createClient(clientOptions(runtime, explorer));
    const appClient = createClient(clientOptions(runtime, app));
    const sourceTree = await searchExplorerSource(explorerClient, runtime.filePath);
    const appTree = await appClient.inspect(8);
    const points = resolveDragPoints(sourceTree, appTree, layout, runtime.filePath);
    const files = await writeDragEvidence(runtime, { layout, sourceTree, appTree }, services);
    await explorerClient.drag(points.from, points.to, { holdMs: 200, dwellMs: 700 });
    await delay(300);
    return files;
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    if (explorer) {
      const close = services.closeExplorer ?? closeExplorerWindow;
      try { await close(runtime, explorer, createClient, discover, delay); } catch (error) {
        if (!failure) throw error;
      }
    }
  }
}

async function searchExplorerSource(client, filePath) {
  const parsed = win32.parse(filePath);
  const names = parsed.ext === '' ? [parsed.base] : [parsed.base, parsed.name];
  let lastError;
  for (const name of names) {
    try {
      const tree = await client.search(name, 20);
      if (flattenElements(tree).some((element) => element.name === name)) return tree;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Explorer source item을 semantic name으로 찾지 못했습니다');
}

export function resolveDragPoints(sourceTree, appTree, layout, filePath) {
  const parsed = win32.parse(windowsFile(filePath));
  const names = new Set([parsed.base, parsed.name]);
  const sources = flattenElements(sourceTree).filter((element) =>
    ITEM_TYPES.has(element.type) && names.has(element.name) && visibleRect(element));
  if (sources.length !== 1) throw new Error(`Explorer source item이 ${sources.length}개입니다`);
  const targets = flattenElements(appTree).filter((element) =>
    element.type === 'Pane' && element.className === 'BrowserRootView' && visibleRect(element));
  if (targets.length !== 1) throw new Error(`Alhangeul client target이 ${targets.length}개입니다`);
  const source = center(sources[0]);
  const target = center(targets[0]);
  assertInside(source, layout.explorer, 'Explorer source');
  assertInside(target, layout.app, 'Alhangeul target');
  return Object.freeze({ from: `${source.x},${source.y}`, to: `${target.x},${target.y}` });
}

export function inspectDragEnvironment(options = {}) {
  if ((options.platform ?? process.platform) !== 'win32') {
    throw new Error('Windows drag-in은 Windows에서만 실행할 수 있습니다');
  }
  const env = options.env ?? process.env;
  const cliPath = windowsExecutable(options.cliPath ?? env.ALHANGEUL_WINAPP_CLI_PATH);
  const outputDir = windowsDirectory(options.outputDir);
  const filePath = windowsFile(options.filePath);
  const systemRoot = windowsDirectory(env.SystemRoot ?? env.WINDIR);
  return Object.freeze({
    cliPath, outputDir, filePath, env,
    timeoutMs: boundedTimeout(options.timeoutMs ?? 30_000),
    explorerPath: win32.join(systemRoot, 'explorer.exe'),
    powershellPath: win32.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
  });
}

async function waitForExplorer(options) {
  const baseline = new Set(options.baseline.map(({ hwnd }) => hwnd));
  const attempts = Math.ceil(options.runtime.timeoutMs / 250);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const windows = await options.discover(discovery(options.runtime, 'explorer'));
    const matches = windows.filter((window) => !baseline.has(window.hwnd)
      && Number(window.width) >= 400 && Number(window.height) >= 300);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) throw new Error(`새 Explorer window가 ${matches.length}개입니다`);
    await options.delay(250);
  }
  throw new Error('repository fixture Explorer window가 준비되지 않았습니다');
}

export function launchExplorer(runtime, launch = spawn) {
  return new Promise((resolve, reject) => {
    const child = launch(runtime.explorerPath, [`/select,${runtime.filePath}`], {
      env: runtime.env, windowsHide: false, stdio: 'ignore',
    });
    child.once('error', (error) => reject(new Error(`Explorer 실행 실패: ${error.message}`)));
    child.once('spawn', resolve);
  });
}

async function arrangeWindows(runtime, app, explorer, exec = execFile) {
  const args = [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', ARRANGE_SCRIPT,
    '-AppHwnd', String(app.hwnd), '-AppPid', String(app.processId),
    '-ExplorerHwnd', String(explorer.hwnd), '-ExplorerPid', String(explorer.processId),
  ];
  const result = await executeFile(exec, runtime.powershellPath, args, runtime);
  let payload;
  try { payload = JSON.parse(result.stdout.trim()); } catch {
    throw new Error('Windows window layout JSON이 손상되었습니다');
  }
  validateLayout(payload);
  return payload;
}

async function closeExplorerWindow(runtime, explorer, createClient, discover, delay) {
  const client = createClient(clientOptions(runtime, explorer));
  const tree = await client.inspect(4);
  const closeButtons = flattenElements(tree).filter((element) =>
    element.type === 'Button' && element.automationId === 'Close'
    && element.isEnabled !== false && element.isOffscreen !== true);
  if (closeButtons.length !== 1 || typeof closeButtons[0].selector !== 'string') {
    throw new Error(`Explorer Close selector가 ${closeButtons.length}개입니다`);
  }
  await client.invoke(closeButtons[0].selector);
  const attempts = Math.ceil(runtime.timeoutMs / 250);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const windows = await discover(discovery(runtime, String(explorer.processId)));
    if (!windows.some(({ hwnd }) => hwnd === explorer.hwnd)) return;
    await delay(250);
  }
  throw new Error(`Explorer HWND ${explorer.hwnd}가 닫히지 않았습니다`);
}

async function writeDragEvidence(runtime, payload, services) {
  const makeDirectory = services.mkdir ?? mkdir;
  const write = services.writeFile ?? writeFile;
  const describe = services.describeFile ?? describeEvidenceFile;
  const directory = win32.join(runtime.outputDir, 'native-ui');
  await makeDirectory(directory, { recursive: true });
  const records = [
    ['drag-layout.json', payload.layout],
    ['drag-source.json', payload.sourceTree],
    ['drag-target.json', payload.appTree],
  ];
  const files = [];
  for (const [name, value] of records) {
    const path = win32.join(directory, name);
    await write(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    files.push(await describe(runtime.outputDir, path, 'log'));
  }
  return files;
}

function executeFile(exec, file, args, runtime) {
  return new Promise((resolve, reject) => {
    exec(file, args, {
      encoding: 'utf8', env: runtime.env, windowsHide: true,
      timeout: runtime.timeoutMs, maxBuffer: 2 * 1024 * 1024,
    }, (error, stdout = '', stderr = '') => {
      if (error) reject(new Error(`Windows GUI helper 실패: ${String(stderr || error.message).trim()}`));
      else resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

function flattenElements(value, result = []) {
  if (Array.isArray(value)) for (const item of value) flattenElements(item, result);
  else if (value && typeof value === 'object') {
    if (typeof value.type === 'string') result.push(value);
    for (const child of Object.values(value)) flattenElements(child, result);
  }
  return result;
}

function visibleRect(value) {
  return value.isOffscreen !== true && Number(value.width) > 0 && Number(value.height) > 0
    && Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y));
}

function center(rect) {
  return {
    x: Math.round(Number(rect.x) + Number(rect.width) / 2),
    y: Math.round(Number(rect.y) + Number(rect.height) / 2),
  };
}

function assertInside(point, rect, label) {
  if (point.x < rect.x || point.x >= rect.x + rect.width
      || point.y < rect.y || point.y >= rect.y + rect.height) {
    throw new Error(`${label} 좌표가 검증된 window bounds 밖입니다`);
  }
}

function validateLayout(value) {
  for (const name of ['app', 'explorer']) {
    const rect = value?.[name];
    if (!rect || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)
        || rect.width < 400 || rect.height < 300) {
      throw new Error(`Windows ${name} layout이 유효하지 않습니다`);
    }
  }
}

function clientOptions(runtime, target) {
  return {
    executablePath: runtime.cliPath, appPid: target.processId,
    windowHandle: target.hwnd, timeoutMs: runtime.timeoutMs, env: runtime.env,
  };
}

function discovery(runtime, appName) {
  return {
    executablePath: runtime.cliPath, appName,
    timeoutMs: runtime.timeoutMs, env: runtime.env,
  };
}

function windowsExecutable(value) {
  if (typeof value !== 'string' || !win32.isAbsolute(value) || !/\.exe$/i.test(value)) {
    throw new Error('Windows drag helper executable은 절대 .exe 경로여야 합니다');
  }
  return win32.normalize(value);
}

function windowsDirectory(value) {
  if (typeof value !== 'string' || !win32.isAbsolute(value) || /[\r\n\0]/.test(value)) {
    throw new Error('Windows drag helper directory는 단일행 절대 경로여야 합니다');
  }
  return win32.normalize(value);
}

function windowsFile(value) {
  if (typeof value !== 'string' || !win32.isAbsolute(value) || /[\r\n\0]/.test(value)) {
    throw new Error('Windows drag fixture는 단일행 절대 경로여야 합니다');
  }
  return win32.normalize(value);
}

function boundedTimeout(value) {
  if (!Number.isSafeInteger(value) || value < 5_000 || value > 120_000) {
    throw new Error('Windows drag timeout은 5000~120000ms여야 합니다');
  }
  return value;
}
