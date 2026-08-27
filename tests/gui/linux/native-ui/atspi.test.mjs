import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as hostPath from 'node:path';
import test from 'node:test';
import {
  createAtspiRunner,
  LINUX_NATIVE_APPLICATION_NAMES,
  LinuxNativeUiAdapter,
} from './atspi.mjs';

test('native UI application 범위는 제품과 승인된 xdg portal 구현만 포함한다', () => {
  assert.deepEqual(LINUX_NATIVE_APPLICATION_NAMES, [
    'Alhangeul',
    'xdg-desktop-portal-gtk',
    'xdg-desktop-portal-gnome',
  ]);
});

test('Save As는 dialog readiness 뒤 directory와 basename을 semantic field에 입력한다', async () => {
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
  assert.deepEqual(shortcuts, ['ctrl+l', 'Return']);
  assert.deepEqual(calls.map(({ command }) => command), [
    'wait', 'focus', 'setText', 'wait', 'setText', 'click', 'waitAbsent',
  ]);
  assert.deepEqual(calls[1].selector.names, [
    'open', '열기', 'save', '저장', 'select', '선택',
  ]);
  assert.deepEqual(calls[2].applicationNames, LINUX_NATIVE_APPLICATION_NAMES);
  assert.deepEqual(calls[2].within.roles, ['file chooser', 'dialog']);
  assert.deepEqual(calls[2].selector.roles, ['text', 'entry']);
  assert.equal(calls[2].selector.names, undefined);
  assert.equal(calls[2].value, '/tmp/output');
  assert.equal(calls[4].value, 'saved.hwp');
  assert.deepEqual(calls[4].within.roles, ['file chooser', 'dialog']);
  assert.deepEqual(calls[4].selector.roles, ['text', 'entry']);
  assert.equal(calls[4].selector.names, undefined);
  assert.deepEqual(calls[5].selector.names, [
    'open', '열기', 'save', '저장', 'select', '선택',
  ]);
  assert.equal(calls[5].windowScope, 'file-dialog');
  assert.deepEqual(calls[5].within.roles, ['file chooser', 'dialog']);
});

test('native open은 GTK location 입력 뒤 primary button으로 submit한다', async () => {
  const calls = [];
  const shortcuts = [];
  const adapter = createAdapter({
    runAtspi: async (request) => { calls.push(request); return {}; },
    runShortcut: async (key) => { shortcuts.push(key); },
  });
  await adapter.openDocument('/fixtures/biz_plan.hwp', async () => {});
  assert.deepEqual(shortcuts, ['ctrl+l']);
  assert.deepEqual(calls.map(({ command }) => command), [
    'wait', 'focus', 'setText', 'click', 'waitAbsent',
  ]);
  assert.deepEqual(calls[1].selector.names, [
    'open', '열기', 'save', '저장', 'select', '선택',
  ]);
  assert.deepEqual(calls[2].applicationNames, LINUX_NATIVE_APPLICATION_NAMES);
  assert.deepEqual(calls[2].within.roles, ['file chooser', 'dialog']);
  assert.equal(calls[2].selector.names, undefined);
  assert.equal(calls[2].value, '/fixtures/biz_plan.hwp');
  assert.equal(calls[3].windowScope, 'file-dialog');
  assert.deepEqual(calls[3].selector.names, [
    'open', '열기', 'save', '저장', 'select', '선택',
  ]);
});

test('native shortcut은 허용된 portal window를 활성화·확인한 뒤 XTEST key를 보낸다', async () => {
  const processCalls = [];
  const adapter = createAdapter({
    runAtspi: async () => ({}),
    runShortcut: undefined,
    spawnSync: (command, args) => {
      processCalls.push([command, args]);
      if (args[0] === 'search' || args[0] === 'getactivewindow') {
        return { status: 0, stdout: '4194354\n', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    },
  });
  await adapter.openDocument('/fixtures/biz_plan.hwp', async () => {});
  assert.deepEqual(processCalls.map(([, args]) => args[0]), [
    'search', 'windowactivate', 'getactivewindow', 'key',
  ]);
  assert.deepEqual(processCalls[0][1], [
    'search', '--onlyvisible', '--name',
    '^(Open File|Save File|Select a File|Select a filename|파일 열기|파일 저장|파일 선택|파일 이름 선택)$',
  ]);
  assert.deepEqual(processCalls[2][1], ['getactivewindow']);
  assert.deepEqual(processCalls[3][1], ['key', '--clearmodifiers', 'ctrl+l']);
});

test('print adapter는 Print to File만 고르고 save/cancel modal 종료를 확인한다', async () => {
  const calls = [];
  const shortcuts = [];
  const adapter = createAdapter({
    runAtspi: async (request) => { calls.push(request); return {}; },
    runShortcut: async (key) => { shortcuts.push(key); },
  });
  await adapter.printToFile('/tmp/output/gtk.pdf', async () => {});
  await adapter.cancelPrint(async () => {});
  assert.deepEqual(calls.map(({ command }) => command), [
    'wait', 'click', 'wait', 'click',
    'wait', 'focus', 'setText', 'wait', 'setText', 'click', 'waitAbsent',
    'click', 'waitAbsent',
    'wait', 'click', 'waitAbsent',
  ]);
  assert.deepEqual(calls[1].selector.names, ['print to file', '파일로 인쇄']);
  assert.equal(calls[2].selector.selected, true);
  assert.deepEqual(calls[3].selector.names, ['output.pdf']);
  assert.deepEqual(calls[3].within, { roles: ['dialog'], names: ['print', '인쇄'] });
  assert.equal(calls[6].value, '/tmp/output');
  assert.equal(calls[8].value, 'gtk.pdf');
  assert.equal(calls[9].windowScope, 'file-dialog');
  assert.deepEqual(calls[11].selector.names, ['print', '인쇄']);
  assert.equal(calls[11].searchOrder, 'reverse');
  assert.deepEqual(shortcuts, ['ctrl+l', 'Return']);
  await assert.rejects(
    adapter.printWithVirtualPrinter('Office LaserJet', async () => {}),
    /physical printer/,
  );
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
  assert.deepEqual(requests[0][1], ['/tests/atspi_driver.py', 'wait']);

  const failing = createAtspiRunner({
    spawnSync: () => ({ status: 1, stdout: '{"ok":false,"error":"missing role"}\n', stderr: 'private' }),
  });
  await assert.rejects(failing({ command: 'wait' }), /missing role/);

  const emptyError = createAtspiRunner({
    spawnSync: () => ({ status: 1, stdout: '{"ok":false,"error":""}\n', stderr: 'driver stderr' }),
  });
  await assert.rejects(emptyError({ command: 'wait' }), /driver stderr/);
});

test('AT-SPI Python traversal은 portal 전환 중 null과 stale accessible을 숨김 처리한다', async () => {
  const source = await readFile(new URL('./atspi_driver.py', import.meta.url), 'utf8');
  assert.match(source, /states = safe_states\(node\)/);
  assert.match(source, /sys\.argv\[1\] != request\.get\("command"\)/);
  assert.match(source, /return node\.getState\(\) if node is not None else None/);
  assert.match(source, /state_contains\(states, pyatspi\.STATE_SHOWING\)/);
  assert.match(source, /if \(child := node\.getChildAtIndex\(index\)\) is not None/);
  assert.match(source, /within = request\.get\("within"\)/);
  assert.match(source, /NATIVE_ROOT_ROLES = \{"dialog", "file chooser"\}/);
  assert.match(source, /walk\(root, max_depth=3, max_nodes=128, reverse=reverse\)/);
  assert.match(source, /walk_for_selector\(root, selector, reverse=reverse\)/);
  assert.match(source, /def find_matches\(request, limit=None\):/);
  assert.match(source, /if limit is not None and len\(found\) >= limit:/);
  assert.match(source, /role = normalized\(safe_method\(node, "getRoleName", "unknown"\)\)/);
  assert.match(source, /selector\.get\("selected", False\)/);
  assert.match(source, /"selected": state_contains\(states, pyatspi\.STATE_SELECTED\)/);
  assert.match(source, /"enabled": state_contains\(states, pyatspi\.STATE_ENABLED\)/);
  assert.match(source, /state_contains\(states, pyatspi\.STATE_SENSITIVE\)/);
  assert.match(source, /PRINT_DIALOG_WINDOW_PATTERN = r"\^\(Print\|인쇄\)\$"/);
  assert.match(source, /FILE_DIALOG_WINDOW_PATTERN = \(/);
  assert.match(source, /request\.get\("searchOrder"\) == "reverse"/);
  assert.match(source, /window_patterns = \{/);
  assert.match(source, /"windowactivate", "--sync", window_id/);
  assert.match(source, /"mousemove", "--sync", str\(center_x\), str\(center_y\), "click", "1"/);
  assert.match(source, /max_depth=18, max_nodes=2500/);
  assert.match(source, /info\["name"\] or depth < 2 or info\["showing"\]/);
});

function createAdapter(override = {}) {
  return new LinuxNativeUiAdapter({
    outputDir: '/tmp/evidence',
    timeoutMs: 30000,
    runShortcut: async () => {},
    captureScreenshot: async () => {},
    ...override,
  });
}
