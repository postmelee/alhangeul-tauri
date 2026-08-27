import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  dragFileIntoWindow,
  inspectDragEnvironment,
  resolveDragPoints,
} from './drag-drop.mjs';

test('Windows drag helper는 absolute fixture·CLI·system root와 interactive host를 요구한다', () => {
  const runtime = inspectDragEnvironment(dragOptions());
  assert.equal(runtime.explorerPath, 'C:\\Windows\\explorer.exe');
  assert.throws(() => inspectDragEnvironment(dragOptions({ platform: 'linux' })), /Windows에서만/);
  assert.throws(() => inspectDragEnvironment(dragOptions({ filePath: 'form.hwpx' })), /절대 경로/);
});

test('drag 좌표는 Explorer item과 Alhangeul BrowserRootView의 실측 bounds 중심이다', () => {
  assert.deepEqual(resolveDragPoints(sourceTree(), appTree(), layout(), 'C:\\repo\\form-002.hwpx'), {
    from: '200,150',
    to: '900,450',
  });
  assert.throws(() => resolveDragPoints(
    sourceTree({ duplicate: true }), appTree(), layout(), 'C:\\repo\\form-002.hwpx',
  ), /source item이 2개/);
});

test('Explorer와 앱을 배치한 뒤 bounded WinApp drag를 정확히 한 번 수행한다', async () => {
  const harness = createHarness();
  const files = await dragFileIntoWindow(dragOptions(), harness.services);
  assert.equal(files.length, 3);
  assert.deepEqual(harness.calls.filter(([name]) => name === 'drag'), [
    ['drag', '200,150', '900,450', { holdMs: 200, dwellMs: 700 }],
  ]);
  assert.equal(harness.calls.some(([name]) => name === 'arrange'), true);
  assert.equal(harness.calls.some(([name]) => name === 'close'), true);
  assert.equal(harness.explorerOpen, false);
});

test('source가 모호하면 좌표 입력 전에 실패하고 Explorer를 닫는다', async () => {
  const harness = createHarness({ duplicateSource: true });
  await assert.rejects(dragFileIntoWindow(dragOptions(), harness.services), /source item이 2개/);
  assert.equal(harness.calls.some(([name]) => name === 'drag'), false);
  assert.equal(harness.explorerOpen, false);
});

test('Explorer가 알려진 확장자를 숨기면 basename stem selector로 한정해 재탐색한다', async () => {
  const harness = createHarness({ hiddenExtension: true });
  await dragFileIntoWindow(dragOptions(), harness.services);
  assert.deepEqual(harness.calls.filter(([name]) => name === 'search'), [
    ['search', 'form-002.hwpx'],
    ['search', 'form-002'],
  ]);
  assert.equal(harness.calls.filter(([name]) => name === 'drag').length, 1);
});

test('window layout helper는 PID/HWND를 검증하고 SetWindowPos만 사용한다', async () => {
  const source = await readFile(new URL('./arrange-windows.ps1', import.meta.url), 'utf8');
  assert.match(source, /GetWindowThreadProcessId/);
  assert.match(source, /SetWindowPos/);
  assert.match(source, /SystemParametersInfo/);
  assert.doesNotMatch(source, /SendKeys|mouse_event|SendInput|Stop-Process/);
});

function createHarness(options = {}) {
  const harness = { calls: [], explorerOpen: false, services: null };
  const explorer = explorerWindow();
  harness.services = {
    discoverWindows: async ({ appName }) => {
      if (appName === 'Alhangeul') return [appWindow()];
      return harness.explorerOpen ? [explorer] : [];
    },
    openExplorer: async () => {
      harness.calls.push(['open']);
      harness.explorerOpen = true;
    },
    arrangeWindows: async () => {
      harness.calls.push(['arrange']);
      return layout();
    },
    createClient: ({ windowHandle }) => windowHandle === explorer.hwnd ? {
      search: async (name) => {
        harness.calls.push(['search', name]);
        if (options.hiddenExtension && name.endsWith('.hwpx')) return { matchCount: 0, matches: [] };
        return sourceTree({
          duplicate: options.duplicateSource,
          name: options.hiddenExtension ? 'form-002' : 'form-002.hwpx',
        });
      },
      drag: async (from, to, gesture) => harness.calls.push(['drag', from, to, gesture]),
      inspect: async () => ({ elements: [{
        type: 'Button', automationId: 'Close', selector: 'Close',
        isEnabled: true, isOffscreen: false,
      }] }),
      invoke: async (selector) => {
        assert.equal(selector, 'Close');
        harness.calls.push(['close']);
        harness.explorerOpen = false;
      },
    } : {
      inspect: async () => appTree(),
    },
    delay: async () => {},
    mkdir: async () => {},
    writeFile: async () => {},
    describeFile: async (_root, path, kind) => ({
      path, kind, size: 1, sha256: 'a'.repeat(64),
    }),
  };
  return harness;
}

function dragOptions(override = {}) {
  return {
    platform: 'win32',
    cliPath: 'C:\\tools\\winapp.exe',
    filePath: 'C:\\repo\\form-002.hwpx',
    outputDir: 'C:\\evidence',
    timeoutMs: 5000,
    env: { SystemRoot: 'C:\\Windows' },
    ...override,
  };
}

function sourceTree(options = {}) {
  const item = {
    type: 'ListItem', name: options.name ?? 'form-002.hwpx', x: 150, y: 125,
    width: 100, height: 50, isOffscreen: false, selector: 'itm-form-002-a1b2',
  };
  return { matchCount: options.duplicate ? 2 : 1, matches: options.duplicate ? [item, { ...item }] : [item] };
}

function appTree() {
  return {
    windows: [{ elements: [{
      type: 'Pane', name: 'Alhangeul - Web content', className: 'BrowserRootView',
      x: 650, y: 100, width: 500, height: 700, isOffscreen: false,
    }] }],
  };
}

function layout() {
  return {
    explorer: { x: 0, y: 0, width: 600, height: 900 },
    app: { x: 616, y: 0, width: 600, height: 900 },
  };
}

function appWindow() {
  return {
    processId: 50, hwnd: 100, processName: 'Alhangeul', title: 'Alhangeul',
    width: 1044, height: 808, ownerHwnd: 0, isForeground: true,
  };
}

function explorerWindow() {
  return {
    processId: 60, hwnd: 200, processName: 'explorer', title: 'samples',
    width: 800, height: 600, ownerHwnd: 0, isForeground: true,
  };
}
