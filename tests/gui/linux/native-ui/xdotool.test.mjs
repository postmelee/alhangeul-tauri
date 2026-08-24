import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrintFileChooserRunner, PRINT_FILE_CHOOSER_TITLES } from './xdotool.mjs';

test('Print file chooser는 exact visible window 하나에서 경로와 Select를 원자 실행한다', async () => {
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
      if (args.includes('alt+s')) closed = true;
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
  assert.ok(calls.some(([, args]) => args.join(' ') === 'key --window 410 --clearmodifiers ctrl+l'));
  assert.ok(calls.some(([, args]) => args.join(' ') === 'key --window 410 --clearmodifiers ctrl+a'));
  assert.ok(calls.some(([, args]) => args.at(-1) === '/tmp/output/print.pdf'));
  assert.ok(calls.some(([, args]) => args.join(' ') === 'key --window 410 --clearmodifiers alt+s'));
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
