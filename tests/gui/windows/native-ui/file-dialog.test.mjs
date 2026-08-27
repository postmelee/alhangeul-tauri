import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createWindowsNativeUiAdapter,
  selectFileDialogControls,
} from './file-dialog.mjs';

test('표준 Windows file dialog는 AutomationId 1148·1·2를 우선한다', () => {
  const controls = selectFileDialogControls(dialogTree(), 'open');
  assert.deepEqual(controls, {
    entry: 'txt-1148-a1b2',
    primary: 'btn-open-b2c3',
    cancel: 'btn-cancel-c3d4',
  });
  assert.equal(selectFileDialogControls(dialogTree({ korean: true }), 'save').primary,
    'btn-save-b2c3');
});

test('file dialog selector가 모호하거나 action 이름이 다르면 입력 전에 실패한다', () => {
  const tree = dialogTree();
  tree.windows[0].elements[0].children.push({
    ...tree.windows[0].elements[0].children[0],
    selector: 'txt-duplicate',
  });
  assert.throws(() => selectFileDialogControls(tree, 'open'), /entry selector가 2개/);
  assert.throws(() => selectFileDialogControls(dialogTree(), 'save'), /save button selector가 0개/);
});

test('Open은 새 owner dialog를 고정해 path 설정·확인·종료를 순서대로 수행한다', async () => {
  const harness = createHarness();
  const adapter = await createWindowsNativeUiAdapter(harness.options);
  await adapter.openDocument('C:\\repo\\samples\\biz_plan.hwp', async () => {
    harness.dialogOpen = true;
    harness.calls.push(['trigger']);
  });
  assert.deepEqual(harness.calls.slice(0, 4), [
    ['trigger'],
    ['inspect', 200, 12],
    ['screenshot', 200, 'C:\\evidence\\native-ui\\open-1.png'],
    ['setValue', 200, 'txt-1148-a1b2', 'C:\\repo\\samples\\biz_plan.hwp'],
  ]);
  assert.deepEqual(harness.calls[4], ['invoke', 200, 'btn-open-b2c3']);
  assert.equal(harness.dialogOpen, false);
  assert.equal(adapter.takeEvidenceFiles().length, 2);
  assert.equal(adapter.takeEvidenceFiles().length, 0);
});

test('Save As cancel은 Cancel button을 invoke하고 같은 dialog HWND가 사라질 때까지 기다린다', async () => {
  const harness = createHarness({ action: 'save' });
  const adapter = await createWindowsNativeUiAdapter(harness.options);
  await adapter.cancelDocument('file:save-as', async () => {
    harness.dialogOpen = true;
  });
  assert.deepEqual(harness.calls.at(-1), ['invoke', 200, 'btn-cancel-c3d4']);
  assert.equal(harness.dialogOpen, false);
});

test('owner dialog가 복수이면 set-value나 invoke 전에 fail-closed 한다', async () => {
  const harness = createHarness({ duplicateDialog: true });
  const adapter = await createWindowsNativeUiAdapter(harness.options);
  await assert.rejects(adapter.openDocument('C:\\repo\\a.hwp', async () => {
    harness.dialogOpen = true;
  }), /dialog가 2개/);
  assert.equal(harness.calls.some(([name]) => name === 'setValue'), false);
  assert.equal(harness.calls.some(([name]) => name === 'invoke'), false);
});

function createHarness(options = {}) {
  const harness = {
    calls: [],
    dialogOpen: false,
    options: null,
  };
  const main = appWindow();
  const dialog = dialogWindow();
  const discoverWindows = async ({ appName }) => {
    if (appName === 'Alhangeul') return [main];
    const windows = [main];
    if (harness.dialogOpen) {
      windows.push(dialog);
      if (options.duplicateDialog) windows.push(dialogWindow({ hwnd: 201 }));
    }
    return windows;
  };
  harness.options = {
    cliPath: 'C:\\tools\\winapp.exe',
    outputDir: 'C:\\evidence',
    timeoutMs: 5000,
    discoverWindows,
    delay: async () => {},
    mkdir: async () => {},
    writeFile: async () => {},
    describeFile: async (_root, path, kind) => ({
      path, kind, size: 1, sha256: 'a'.repeat(64),
    }),
    createClient: ({ windowHandle }) => ({
      inspect: async (depth) => {
        harness.calls.push(['inspect', windowHandle, depth]);
        return windowHandle === 200
          ? dialogTree({ korean: options.action === 'save' })
          : { windows: [{ hwnd: 100, elements: [{ type: 'Window' }] }] };
      },
      screenshot: async (path) => {
        harness.calls.push(['screenshot', windowHandle, path]);
        return { processId: 50, hwnd: windowHandle };
      },
      setValue: async (selector, value) => {
        harness.calls.push(['setValue', windowHandle, selector, value]);
      },
      invoke: async (selector) => {
        harness.calls.push(['invoke', windowHandle, selector]);
        harness.dialogOpen = false;
      },
    }),
  };
  return harness;
}

function dialogTree(options = {}) {
  const korean = options.korean ?? false;
  return {
    windows: [{
      hwnd: 200,
      elements: [{
        type: 'Window',
        children: [
          {
            type: 'Edit', name: korean ? '파일 이름:' : 'File name:',
            automationId: '1148', selector: 'txt-1148-a1b2', isEnabled: true,
          },
          {
            type: 'Button', name: korean ? '저장(&S)' : 'Open', automationId: '1',
            selector: korean ? 'btn-save-b2c3' : 'btn-open-b2c3', isEnabled: true,
          },
          {
            type: 'Button', name: korean ? '취소' : 'Cancel', automationId: '2',
            selector: 'btn-cancel-c3d4', isEnabled: true,
          },
        ],
      }],
    }],
  };
}

function appWindow() {
  return {
    processId: 50, hwnd: 100, processName: 'Alhangeul', title: 'Alhangeul',
    width: 1044, height: 808, ownerHwnd: 0, isForeground: true,
  };
}

function dialogWindow(override = {}) {
  return {
    processId: 50, hwnd: 200, processName: 'Alhangeul', title: 'Open',
    width: 800, height: 600, ownerHwnd: 100, isForeground: true, ...override,
  };
}
