import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as hostPath from 'node:path';
import test from 'node:test';
import {
  createAtspiRunner,
  LinuxNativeUiAdapter,
} from './atspi.mjs';
import { createWindowShortcutRunner } from './xdotool.mjs';

test('Save As는 focused location entry에 full target을 넣고 명시적으로 accept한다', async () => {
  const calls = [];
  const shortcuts = [];
  let triggered = false;
  const adapter = createAdapter({
    runAtspi: async (request) => { calls.push(request); return { ok: true }; },
    runShortcut: async (key) => { shortcuts.push(key); },
  });

  await adapter.saveDocument('file:save-as', '/tmp/output/saved.hwp', async () => {
    triggered = true;
  });

  assert.equal(triggered, true);
  assert.deepEqual(shortcuts, ['ctrl+l']);
  assert.deepEqual(calls.map(({ command }) => command), [
    'wait', 'submitText', 'actionIfPresent', 'waitAbsent',
  ]);
  assert.equal(calls[1].value, '/tmp/output/saved.hwp');
  assert.equal(calls[1].selector.focused, true);
  assert.deepEqual(calls[1].selector.within.roles, ['file chooser']);
  assert.deepEqual(calls[2].selector.exactNames, ['save', '저장']);
  assert.deepEqual(calls[2].guardSelector.roles, ['file chooser', 'dialog']);
  assert.deepEqual(calls[2].actionNames, ['click', 'press']);
});

test('native open은 GTK location shortcut을 한 번 쓰고 modal close를 기다린다', async () => {
  const calls = [];
  const shortcuts = [];
  const windowShortcuts = [];
  const adapter = createAdapter({
    runAtspi: async (request) => { calls.push(request); return {}; },
    runShortcut: async (key) => { shortcuts.push(key); },
    runWindowShortcut: async (request) => { windowShortcuts.push(request); },
  });
  await adapter.openDocument('/fixtures/biz_plan.hwp', async () => {});
  assert.deepEqual(shortcuts, ['ctrl+l']);
  assert.deepEqual(calls.map(({ command }) => command), [
    'wait', 'submitText', 'actionIfPresent', 'waitAbsent',
  ]);
  assert.equal(calls[1].value, '/fixtures/biz_plan.hwp');
  assert.equal(calls[1].selector.focused, true);
  assert.deepEqual(calls[1].selector.within.roles, ['file chooser']);
  assert.deepEqual(calls[2].selector.exactNames, ['open', '열기']);
});

test('print adapter는 Print to File만 고르고 save/cancel modal 종료를 확인한다', async () => {
  const calls = [];
  const shortcuts = [];
  const windowShortcuts = [];
  const adapter = createAdapter({
    runAtspi: async (request) => { calls.push(request); return {}; },
    runShortcut: async (key) => { shortcuts.push(key); },
    runWindowShortcut: async (request) => { windowShortcuts.push(request); },
  });
  await adapter.printToFile('/tmp/output/gtk.pdf', async () => {});
  await adapter.cancelPrint(async () => {});
  assert.deepEqual(calls.map(({ command }) => command), [
    'wait', 'selectByFocus', 'wait',
    'action', 'wait', 'submitText', 'actionIfPresent', 'waitAbsent', 'wait',
    'wait', 'waitAbsent',
    'wait', 'action', 'waitAbsent',
  ]);
  assert.deepEqual(calls[1].selector.names, ['print to file', '파일로 인쇄']);
  assert.equal(calls[1].actionNames, undefined);
  assert.equal(calls[2].selector.selected, true);
  assert.deepEqual(calls[3].selector.names, ['.pdf', '.ps', '.svg']);
  assert.deepEqual(calls[3].actionNames, ['click', 'press']);
  assert.equal(calls[5].value, '/tmp/output/gtk.pdf');
  assert.equal(calls[5].command, 'submitText');
  assert.equal(calls[6].desktopScope, true);
  assert.deepEqual(calls[6].selector.exactNames, ['select', '선택']);
  assert.deepEqual(calls[6].actionNames, ['click', 'press']);
  assert.deepEqual(calls[8].selector.names, ['gtk.pdf']);
  assert.ok(calls.every(({ desktopScope }) => desktopScope === true));
  assert.deepEqual(calls[9].selector.within, { roles: ['dialog'], names: ['print', '인쇄'] });
  assert.deepEqual(calls[9].selector.exactNames, ['print', '인쇄']);
  assert.equal(calls[9].selector.names, undefined);
  assert.deepEqual(shortcuts, ['ctrl+l']);
  assert.deepEqual(windowShortcuts, [{ titles: ['Print', '인쇄'], key: 'alt+p' }]);
  assert.deepEqual(calls[12].selector.within, { roles: ['dialog'], names: ['print', '인쇄'] });
  assert.deepEqual(calls[12].selector.exactNames, ['cancel', '취소']);
  await assert.rejects(
    adapter.printWithVirtualPrinter('Office LaserJet', async () => {}),
    /physical printer/,
  );
});

test('virtual printer는 semantic selection 후에만 Print를 실행한다', async () => {
  const calls = [];
  const adapter = createAdapter({
    runAtspi: async (request) => { calls.push(request); return {}; },
  });
  await adapter.printWithVirtualPrinter('PDF', async () => {});
  assert.deepEqual(calls.map(({ command }) => command), [
    'wait', 'selectByFocus', 'wait', 'wait', 'waitAbsent',
  ]);
  assert.deepEqual(calls[1].selector.names, ['PDF']);
  assert.equal(calls[1].actionNames, undefined);
  assert.equal(calls[2].selector.selected, true);
  assert.equal(calls[1].desktopScope, true);
  assert.deepEqual(calls[3].selector.exactNames, ['print', '인쇄']);
  assert.equal(calls[3].actionNames, undefined);
});

test('system print shortcut은 실제 ctrl+p만 허용하고 AT-SPI 탐색과 분리한다', async () => {
  const calls = [];
  const adapter = new LinuxNativeUiAdapter({
    outputDir: '/tmp/evidence',
    timeoutMs: 30000,
    applicationNames: ['Alhangeul'],
    spawnSync: (command, args) => {
      calls.push([command, args]);
      return { status: 0, stdout: '', stderr: '' };
    },
    captureScreenshot: async () => {},
  });
  await adapter.triggerSystemPrint();
  assert.deepEqual(calls[0][1], ['key', '--clearmodifiers', 'ctrl+p']);
  await assert.rejects(adapter.shortcut('ctrl+x'), /허용되지 않은 key/);
});

test('Print mnemonic은 exact visible window 하나를 활성화한 뒤 전송한다', async () => {
  const calls = [];
  const runner = createWindowShortcutRunner({
    xdotoolPath: '/usr/bin/xdotool',
    spawnSync: (command, args) => {
      calls.push([command, args]);
      if (args[0] === 'search' && args.at(-1) === '^Print$') {
        return { status: 0, stdout: '410\n', stderr: '' };
      }
      return { status: args[0] === 'search' ? 1 : 0, stdout: '', stderr: '' };
    },
  });
  assert.deepEqual(
    await runner({ titles: ['Print', '인쇄'], key: 'alt+p' }),
    { windowId: '410' },
  );
  assert.deepEqual(calls.at(-1), [
    '/usr/bin/xdotool', ['windowactivate', '--sync', '410', 'key', '--clearmodifiers', 'alt+p'],
  ]);
});

test('production native phase는 선택형 글꼴 버튼과 focused document wait만 허용한다', async () => {
  const calls = [];
  const adapter = createAdapter({
    runAtspi: async (request) => { calls.push(request); return { performed: false }; },
  });
  const selector = { roles: ['push button'], names: ['대체 글꼴로 보기'] };
  assert.deepEqual(await adapter.actionOptional(selector, 5000), { performed: false });
  await adapter.wait({ roles: ['document text'], names: ['biz_plan.hwp'], focused: true });
  assert.deepEqual(calls.map(({ command }) => command), ['actionOptional', 'wait']);
  assert.deepEqual(calls[0].actionNames, ['click', 'press']);
  assert.equal(calls[0].timeoutMs, 5000);
});

test('Python bridge는 editable text를 focus·readback한 같은 node에서 semantic activate한다', async () => {
  const source = await readFile(new URL('./atspi_driver.py', import.meta.url), 'utf8');
  assert.match(source, /within = selector\.get\("within"\)/);
  assert.match(source, /desktop_scope = request\.get\("desktopScope", False\)/);
  assert.match(source, /desktopScope must be a boolean/);
  assert.match(source, /matches_info\(node_info\(item\), within\)/);
  assert.match(source, /selected = selector\.get\("selected"\)/);
  assert.match(source, /exact_names = selector\.get\("exactNames", \[\]\)/);
  assert.match(source, /normalized\(value\) == node_name/);
  assert.match(source, /info\["role"\] in \{"text", "entry"\}/);
  const editable = source.slice(source.indexOf('def set_editable_text'), source.indexOf('def snapshot'));
  assert.match(editable, /queryComponent\(\)\.grabFocus\(\)/);
  assert.match(editable, /text\.getText\(0, count\) != value/);
  assert.ok(editable.indexOf('grabFocus') < editable.indexOf('setTextContents'));
  assert.ok(editable.indexOf('setTextContents') < editable.indexOf('getText'));
  const submitText = source.slice(source.indexOf('if command == "submitText":'), source.indexOf('if command == "focus":'));
  assert.match(submitText, /set_editable_text\(node, request\.get\("value"\)\)/);
  assert.match(submitText, /perform_action\(node, \["activate"\]\)/);
  const optionalAction = source.slice(source.indexOf('def perform_if_present'), source.indexOf('def perform_action'));
  assert.match(optionalAction, /optional action requires a non-empty guardSelector/);
  assert.match(optionalAction, /if not find_matches\(guard_request\)/);
  assert.match(optionalAction, /optional action is unavailable while its dialog remains/);
  assert.match(optionalAction, /def perform_optional/);
  assert.match(optionalAction, /return \{"performed": False\}/);
  const snapshot = source.slice(source.indexOf('def snapshot'), source.indexOf('def dispatch'));
  assert.match(snapshot, /item\["actions"\] = action_names\(node\)/);
  assert.match(snapshot, /item\["textLength"\] = text_length\(node\)/);
  assert.doesNotMatch(snapshot, /getText/);
  const adapter = await readFile(new URL('./atspi.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(adapter, /shortcut\('Return'\)/);
  assert.doesNotMatch(adapter, /'Return'/);
  assert.doesNotMatch(adapter, /focus\(selector\)/);
  assert.doesNotMatch(source, /if command == "focus"/);
  const printerFocus = source.slice(source.indexOf('if command == "selectByFocus":'));
  assert.match(printerFocus, /node\.queryComponent\(\)\.grabFocus\(\)/);
  assert.match(printerFocus, /AT-SPI selectable cell focus failed/);
});

test('adapter 실패는 tree와 screenshot을 남기고 Escape cleanup 후 원인을 보존한다', async () => {
  const outputDir = await mkdtemp(hostPath.join(tmpdir(), 'alhangeul-atspi-'));
  const shortcuts = [];
  const adapter = createAdapter({
    outputDir,
    pathApi: hostPath,
    runAtspi: async (request) => {
      if (request.command === 'snapshot') return { nodes: [{ role: 'dialog', name: '저장' }] };
      throw new Error('dialog drift');
    },
    runShortcut: async (key) => { shortcuts.push(key); },
    captureScreenshot: async (path) => { await writeFile(path, 'png'); },
  });
  await assert.rejects(
    adapter.saveDocument('file:save-as', hostPath.join(outputDir, 'fail.hwp'), async () => {}),
    /dialog drift/,
  );
  assert.deepEqual(shortcuts, ['Escape']);
  const tree = JSON.parse(await readFile(hostPath.join(outputDir, 'native-ui', 'file-save-as-tree.json')));
  assert.equal(tree.nodes[0].name, '저장');
});

test('AT-SPI process bridge는 JSON 1건만 허용하고 driver 오류를 fail-closed 한다', async () => {
  const requests = [];
  const runner = createAtspiRunner({
    pythonPath: '/usr/bin/python3',
    driverPath: '/tests/atspi_driver.py',
    spawnSync: (command, args, options) => {
      requests.push([command, args, JSON.parse(options.input)]);
      return { status: 0, stdout: '{"ok":true,"result":{"role":"dialog"}}\n', stderr: '' };
    },
  });
  assert.deepEqual(await runner({ command: 'wait', timeoutMs: 5000 }), { role: 'dialog' });
  assert.equal(requests[0][0], '/usr/bin/python3');

  const failing = createAtspiRunner({
    spawnSync: () => ({ status: 1, stdout: '{"ok":false,"error":"missing role"}\n', stderr: 'private' }),
  });
  await assert.rejects(failing({ command: 'wait' }), /missing role/);

  const emptyError = createAtspiRunner({
    spawnSync: () => ({ status: 1, stdout: '{"ok":false,"error":""}\n', stderr: 'driver stderr' }),
  });
  await assert.rejects(emptyError({ command: 'wait' }), /driver stderr/);

  const timeout = createAtspiRunner({
    spawnSync: () => ({
      status: null, stdout: '', stderr: '', error: { message: 'spawnSync python3 ETIMEDOUT' },
    }),
  });
  await assert.rejects(timeout({ command: 'waitAbsent' }), /waitAbsent.*ETIMEDOUT/);
});

function createAdapter(override = {}) {
  return new LinuxNativeUiAdapter({
    outputDir: '/tmp/evidence',
    timeoutMs: 30000,
    applicationNames: ['Alhangeul'],
    runShortcut: async () => {},
    runWindowShortcut: async () => {},
    captureScreenshot: async () => {},
    ...override,
  });
}
