import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPrintFileChooserRunner,
  createPrintWindowRunner,
  PRINT_DIALOG_TITLES,
  PRINT_FILE_CHOOSER_TITLES,
} from './xdotool.mjs';

test('Print window는 exact visible cardinality로 appear와 close를 판정한다', async () => {
  let visible = true;
  const calls = [];
  const runner = createPrintWindowRunner({
    delay: async () => {},
    spawnSync: (_command, args) => {
      calls.push(args);
      if (args.at(-1) === '^Print$' && visible) {
        return { status: 0, stdout: '410\n', stderr: '' };
      }
      return { status: 1, stdout: '', stderr: '' };
    },
  });
  assert.deepEqual(await runner({
    operation: 'wait', titles: PRINT_DIALOG_TITLES, timeoutMs: 5000,
  }), { windowId: '410' });
  visible = false;
  assert.deepEqual(await runner({
    operation: 'waitAbsent', titles: PRINT_DIALOG_TITLES, timeoutMs: 5000,
  }), { absent: true });
  assert.ok(calls.every((args) => args[0] === 'search' && args[1] === '--onlyvisible'));
});

test('Print window는 복수 window와 허용되지 않은 request를 거부한다', async () => {
  const runner = createPrintWindowRunner({
    delay: async () => {},
    spawnSync: (_command, args) => ({
      status: args.at(-1) === '^Print$' ? 0 : 1,
      stdout: args.at(-1) === '^Print$' ? '410\n411\n' : '', stderr: '',
    }),
  });
  await assert.rejects(runner({
    operation: 'wait', titles: PRINT_DIALOG_TITLES, timeoutMs: 5000,
  }), /print window cardinality가 2/);
  await assert.rejects(runner({
    operation: 'wait', titles: ['Preview'], timeoutMs: 5000,
  }), /허용되지 않은 print dialog title/);
});

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
      if (args.join(' ') === 'key --clearmodifiers Return') closed = true;
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
  const type = calls.find(([, args]) => args.includes('type'))?.[1] ?? [];
  assert.deepEqual(type, [
    'windowactivate', '--sync', '410',
    'key', '--clearmodifiers', 'ctrl+a',
    'type', '--clearmodifiers', '--delay', '0', 'print.pdf',
  ]);
  assert.ok(calls.some(([, args]) => args.join(' ') === 'key --clearmodifiers Return'));
  assert.equal(calls.filter(([, args]) => args.join(' ') === 'getactivewindow').length, 2);
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
