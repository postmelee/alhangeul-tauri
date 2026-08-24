import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrintFileChooserRunner, PRINT_FILE_CHOOSER_TITLES } from './xdotool.mjs';

test('Print file chooser는 exact active window 하나에서 basename과 default response를 원자 실행한다', async () => {
  const calls = [];
  let closed = false;
  const runner = createPrintFileChooserRunner({
    xdotoolPath: '/usr/bin/xdotool',
    delay: async () => {},
    spawnSync: (command, args) => {
      calls.push([command, args]);
      if (args[0] === 'search') {
        const english = args.at(-1) === '^Select a filename$';
        return { status: english && !closed ? 0 : 1, stdout: english && !closed ? '410\n' : '', stderr: '' };
      }
      if (args[0] === 'getactivewindow') return { status: 0, stdout: '410\n', stderr: '' };
      if (args.includes('Return')) closed = true;
      return { status: 0, stdout: '', stderr: '' };
    },
  });

  assert.deepEqual(await runner({ operation: 'wait', titles: PRINT_FILE_CHOOSER_TITLES, timeoutMs: 5000 }), {
    windowId: '410',
  });
  assert.deepEqual(await runner({
    operation: 'submitPath', titles: PRINT_FILE_CHOOSER_TITLES,
    path: '/tmp/output/print.pdf', timeoutMs: 5000,
  }), { windowId: '410' });
  assert.ok(calls.some(([, args]) => args.join(' ') === 'getactivewindow'));
  const submit = calls.find(([, args]) => args.includes('Return'))?.[1] ?? [];
  assert.deepEqual(submit, [
    'windowactivate', '--sync', '410',
    'key', '--clearmodifiers', 'ctrl+a',
    'type', '--clearmodifiers', '--delay', '0', 'print.pdf',
    'key', '--clearmodifiers', 'Return',
  ]);
  assert.ok(calls.every(([, args]) => !args.includes('--window')));
});

test('Print file chooser는 복수 window와 상대경로를 fail-closed 한다', async () => {
  const multiple = createPrintFileChooserRunner({
    delay: async () => {},
    spawnSync: (_command, args) => ({
      status: args.at(-1) === '^Select a filename$' ? 0 : 1,
      stdout: args.at(-1) === '^Select a filename$' ? '410\n411\n' : '', stderr: '',
    }),
  });
  await assert.rejects(
    multiple({ operation: 'wait', titles: PRINT_FILE_CHOOSER_TITLES, timeoutMs: 5000 }),
    /cardinality가 2/,
  );
  await assert.rejects(
    multiple({
      operation: 'submitPath', titles: PRINT_FILE_CHOOSER_TITLES,
      path: 'relative.pdf', timeoutMs: 5000,
    }),
    /단일행 절대 경로/,
  );
});

test('Print file chooser는 exact window가 active가 아니면 입력하지 않는다', async () => {
  const runner = createPrintFileChooserRunner({
    delay: async () => {},
    spawnSync: (_command, args) => {
      if (args[0] === 'search') {
        const english = args.at(-1) === '^Select a filename$';
        return { status: english ? 0 : 1, stdout: english ? '410\n' : '', stderr: '' };
      }
      if (args[0] === 'getactivewindow') return { status: 0, stdout: '999\n', stderr: '' };
      return { status: 0, stdout: '', stderr: '' };
    },
  });
  await assert.rejects(
    runner({
      operation: 'submitPath', titles: PRINT_FILE_CHOOSER_TITLES,
      path: '/tmp/output/print.pdf', timeoutMs: 5000,
    }),
    /active window가 아닙니다/,
  );
});
