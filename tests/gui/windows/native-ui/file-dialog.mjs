import { mkdir, writeFile } from 'node:fs/promises';
import { win32 } from 'node:path';
import { describeEvidenceFile } from '../../support/evidence.ts';
import { selectSingleAppWindow } from '../probe.mjs';
import { createWinAppCli, discoverWinAppWindows } from '../winapp-cli.mjs';

const BUTTON_TYPES = new Set(['Button', 'SplitButton']);
const ENTRY_TYPES = new Set(['Edit', 'ComboBox', 'Document']);
const ACTION_NAMES = Object.freeze({
  open: ['open', '열기'],
  save: ['save', '저장'],
  cancel: ['cancel', '취소'],
});

export async function createWindowsNativeUiAdapter(options = {}) {
  const discover = options.discoverWindows ?? discoverWinAppWindows;
  const windows = await discover(discoveryOptions(options, 'Alhangeul'));
  return new WindowsNativeUiAdapter({
    ...options,
    appTarget: selectSingleAppWindow(windows),
    discoverWindows: discover,
  });
}

export class WindowsNativeUiAdapter {
  constructor(options = {}) {
    this.cliPath = windowsExecutable(options.cliPath);
    this.outputDir = windowsDirectory(options.outputDir);
    this.timeoutMs = boundedTimeout(options.timeoutMs ?? 30_000);
    this.appTarget = validateAppTarget(options.appTarget);
    this.env = options.env ?? process.env;
    this.saveTargets = options.saveTargets ?? {};
    this.evidencePrefix = optionalLabel(options.evidencePrefix);
    this.discoverWindows = options.discoverWindows ?? discoverWinAppWindows;
    this.createClient = options.createClient ?? createWinAppCli;
    this.delay = options.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.mkdir = options.mkdir ?? mkdir;
    this.writeFile = options.writeFile ?? writeFile;
    this.describeFile = options.describeFile ?? describeEvidenceFile;
    this.sequence = 0;
    this.evidence = [];
  }

  async complete(command, trigger) {
    if (command === 'file:save') {
      await trigger();
      return;
    }
    const target = this.saveTargets[command];
    if (!target) throw new Error(`${command}의 Windows native save target이 없습니다`);
    await this.saveDocument(command, target, trigger);
  }

  async openDocument(path, trigger) {
    return this.withFailureEvidence('file-open', async () => {
      const dialog = await this.openDialog('open', trigger);
      await this.submitPath(dialog, windowsFile(path, 'open path'));
    });
  }

  async saveDocument(command, path, trigger) {
    return this.withFailureEvidence(command, async () => {
      const dialog = await this.openDialog('save', trigger);
      await this.submitPath(dialog, windowsFile(path, 'save path'));
    });
  }

  async cancelDocument(command, trigger) {
    const action = command === 'file:open' ? 'open' : 'save';
    return this.withFailureEvidence(`${command}-cancel`, async () => {
      const dialog = await this.openDialog(action, trigger);
      await dialog.client.invoke(dialog.controls.cancel);
      await this.waitForDialogGone(dialog.hwnd);
    });
  }

  takeEvidenceFiles() {
    const files = [...this.evidence];
    this.evidence.length = 0;
    return files;
  }

  async withFailureEvidence(label, action) {
    try {
      return await action();
    } catch (error) {
      await this.captureAppFailure(label).catch(() => undefined);
      throw error;
    }
  }

  async openDialog(action, trigger) {
    const baseline = await this.listAppWindows();
    assertNoOwnedDialog(baseline, this.appTarget.hwnd);
    await trigger();
    const target = await this.waitForNewDialog(new Set(baseline.map(({ hwnd }) => hwnd)));
    const client = this.client(target.hwnd);
    const tree = await client.inspect(12);
    const controls = selectFileDialogControls(tree, action);
    await this.captureDialogEvidence(
      client, tree, prefixedLabel(this.evidencePrefix, `${action}-${++this.sequence}`),
    );
    return { hwnd: target.hwnd, client, controls };
  }

  async submitPath(dialog, path) {
    await dialog.client.setValue(dialog.controls.entry, path);
    await dialog.client.invoke(dialog.controls.primary);
    await this.waitForDialogGone(dialog.hwnd);
  }

  async waitForNewDialog(baseline) {
    const attempts = Math.ceil(this.timeoutMs / 200);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const candidates = ownedDialogs(
        await this.listAppWindows(), this.appTarget, baseline,
      );
      if (candidates.length === 1) return candidates[0];
      if (candidates.length > 1) {
        throw new Error(`Windows native file dialog가 ${candidates.length}개 발견됐습니다`);
      }
      await this.delay(200);
    }
    throw new Error('Windows native file dialog가 준비되지 않았습니다');
  }

  async waitForDialogGone(hwnd) {
    const attempts = Math.ceil(this.timeoutMs / 200);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (!(await this.listAppWindows()).some((window) => window.hwnd === hwnd)) return;
      await this.delay(200);
    }
    throw new Error(`Windows native file dialog HWND ${hwnd}가 닫히지 않았습니다`);
  }

  listAppWindows() {
    return this.discoverWindows(discoveryOptions(this, String(this.appTarget.processId)));
  }

  client(hwnd) {
    return this.createClient({
      executablePath: this.cliPath,
      appPid: this.appTarget.processId,
      windowHandle: hwnd,
      timeoutMs: this.timeoutMs,
      env: this.env,
    });
  }

  async captureDialogEvidence(client, tree, label) {
    const directory = win32.join(this.outputDir, 'native-ui');
    const safe = safeLabel(label);
    const treePath = win32.join(directory, `${safe}-tree.json`);
    const screenshotPath = win32.join(directory, `${safe}.png`);
    await this.mkdir(directory, { recursive: true });
    await this.writeFile(treePath, `${JSON.stringify(tree, null, 2)}\n`, 'utf8');
    await client.screenshot(screenshotPath);
    this.evidence.push(
      await this.describeFile(this.outputDir, treePath, 'log'),
      await this.describeFile(this.outputDir, screenshotPath, 'screenshot'),
    );
  }

  async captureAppFailure(label) {
    const client = this.client(this.appTarget.hwnd);
    const tree = await client.inspect(8);
    await this.captureDialogEvidence(client, tree, `${label}-failure`);
  }
}

export function selectFileDialogControls(tree, action) {
  const elements = flattenElements(tree).filter(usableElement);
  return Object.freeze({
    entry: entrySelector(elements),
    primary: actionSelector(elements, action, '1'),
    cancel: actionSelector(elements, 'cancel', '2'),
  });
}

function entrySelector(elements) {
  for (const type of ENTRY_TYPES) {
    const matches = elements.filter((element) => element.automationId === '1148' && element.type === type);
    if (matches.length > 0) return uniqueSelector(matches, () => true, 'file name entry');
  }
  return uniqueSelector([], () => true, 'file name entry');
}

function actionSelector(elements, action, automationId) {
  const names = ACTION_NAMES[action];
  if (!names) throw new Error(`지원하지 않는 file dialog action입니다: ${action}`);
  const byId = elements.filter((element) =>
    element.automationId === automationId && BUTTON_TYPES.has(element.type));
  const candidates = byId.length > 0 ? byId : elements.filter((element) =>
    BUTTON_TYPES.has(element.type) && names.includes(controlName(element.name)));
  const matching = candidates.filter((element) => {
    const name = controlName(element.name);
    return name === '' || names.includes(name);
  });
  return uniqueSelector(matching, () => true, `${action} button`);
}

function flattenElements(value, result = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenElements(item, result);
  } else if (value && typeof value === 'object') {
    if (typeof value.type === 'string') result.push(value);
    for (const child of Object.values(value)) flattenElements(child, result);
  }
  return result;
}

function uniqueSelector(elements, predicate, label) {
  const matches = elements.filter(predicate);
  if (matches.length !== 1) throw new Error(`${label} selector가 ${matches.length}개입니다`);
  const selector = matches[0].selector || matches[0].automationId;
  if (typeof selector !== 'string' || selector === '' || /[\r\n\0]/.test(selector)) {
    throw new Error(`${label} selector가 유효하지 않습니다`);
  }
  return selector;
}

function ownedDialogs(windows, appTarget, baseline) {
  return windows.filter((window) => window.processId === appTarget.processId
    && window.hwnd !== appTarget.hwnd && !baseline.has(window.hwnd)
    && window.ownerHwnd === appTarget.hwnd
    && Number(window.width) >= 200 && Number(window.height) >= 100);
}

function assertNoOwnedDialog(windows, appHwnd) {
  const dialogs = windows.filter((window) => window.ownerHwnd === appHwnd
    && Number(window.width) >= 200 && Number(window.height) >= 100);
  if (dialogs.length > 0) throw new Error('이전 Windows native dialog가 닫히지 않았습니다');
}

function usableElement(element) {
  return element.isEnabled !== false && element.isOffscreen !== true;
}

function controlName(value) {
  return String(value ?? '').toLowerCase().replace(/&/g, '')
    .replace(/\([a-z]\)$/i, '').replace(/[:：]$/, '').trim();
}

function discoveryOptions(options, appName) {
  return { executablePath: options.cliPath ?? options.env?.ALHANGEUL_WINAPP_CLI_PATH,
    appName, timeoutMs: options.timeoutMs, env: options.env };
}

function validateAppTarget(value) {
  if (!value || !Number.isSafeInteger(value.processId) || value.processId <= 0
      || !Number.isSafeInteger(value.hwnd) || value.hwnd <= 0) {
    throw new Error('Windows app target PID/HWND가 유효하지 않습니다');
  }
  return Object.freeze({ ...value });
}

function windowsExecutable(value) {
  if (typeof value !== 'string' || !win32.isAbsolute(value) || !/\.exe$/i.test(value)) {
    throw new Error('Windows native UI CLI는 절대 .exe 경로여야 합니다');
  }
  return win32.normalize(value);
}

function windowsDirectory(value) {
  if (typeof value !== 'string' || !win32.isAbsolute(value) || /[\r\n\0]/.test(value)) {
    throw new Error('Windows native UI output은 단일행 절대 경로여야 합니다');
  }
  return win32.normalize(value);
}

function windowsFile(value, label) {
  if (typeof value !== 'string' || !win32.isAbsolute(value) || /[\r\n\0]/.test(value)) {
    throw new Error(`${label}는 단일행 절대 Windows 경로여야 합니다`);
  }
  return win32.normalize(value);
}

function boundedTimeout(value) {
  if (!Number.isSafeInteger(value) || value < 5_000 || value > 120_000) {
    throw new Error('Windows native UI timeout은 5000~120000ms여야 합니다');
  }
  return value;
}

function safeLabel(value) {
  return String(value).replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').slice(0, 64);
}

function optionalLabel(value) {
  if (value === undefined || value === '') return '';
  const label = safeLabel(value);
  if (label === '') throw new Error('Windows native UI evidence prefix가 유효하지 않습니다');
  return label;
}

function prefixedLabel(prefix, label) {
  return prefix === '' ? label : `${prefix}-${label}`;
}
