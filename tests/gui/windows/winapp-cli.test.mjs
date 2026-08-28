import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createWinAppCli,
  discoverWinAppWindows,
  runWinAppJson,
} from './winapp-cli.mjs';

test('WinApp CLI는 shell 없이 JSON argv와 update 비활성 환경을 전달한다', async () => {
  const calls = [];
  const payload = await runWinAppJson({
    executablePath: 'C:\\tools\\winapp.exe',
    args: ['ui', 'status', '-w', '42'],
    timeoutMs: 4000,
    env: { PATH: 'C:\\tools' },
    execFileImpl: fakeExec(calls, { stdout: '{"processId":7,"hwnd":42}' }),
  });
  assert.equal(payload.processId, 7);
  assert.deepEqual(calls[0].args, ['ui', 'status', '-w', '42', '--json']);
  assert.equal(calls[0].options.timeout, 4000);
  assert.equal(calls[0].options.windowsHide, true);
  assert.equal(calls[0].options.env.WINAPP_CLI_UPDATE_CHECK, '0');
  assert.equal(calls[0].options.env.WINAPP_CLI_TELEMETRY_OPTOUT, '1');
});

test('WinApp CLI discovery는 PID/HWND와 process/window text를 정규화한다', async () => {
  const windows = await discoverWinAppWindows({
    executablePath: 'C:\\tools\\winapp.exe',
    appName: 'Alhangeul',
    execFileImpl: fakeExec([], {
      stdout: JSON.stringify([{
        processId: 77,
        hwnd: 99,
        processName: 'Alhangeul',
        title: 'Alhangeul',
      }]),
    }),
  });
  assert.deepEqual(windows.map(({ processId, hwnd }) => ({ processId, hwnd })), [
    { processId: 77, hwnd: 99 },
  ]);
});

for (const [name, title] of [['빈 문자열', ''], ['null', null], ['누락', undefined]]) {
  test(`WinApp CLI discovery는 초기화 중 ${name} window title을 과도 상태로 보존한다`, async () => {
    const window = {
      processId: 77,
      hwnd: 99,
      processName: 'Alhangeul',
      ...(title === undefined ? {} : { title }),
    };
    const windows = await discoverWinAppWindows({
      executablePath: 'C:\\tools\\winapp.exe',
      appName: 'Alhangeul',
      execFileImpl: fakeExec([], { stdout: JSON.stringify([window]) }),
    });
    assert.equal(windows[0].title, '');
  });
}

test('target client는 모든 UIA 결과를 동일 PID/HWND에 고정한다', async () => {
  const calls = [];
  const responses = [
    { processId: 77, hwnd: 99, processName: 'Alhangeul', windowTitle: 'Alhangeul' },
    [{ processId: 77, hwnd: 99, processName: 'Alhangeul', title: 'Alhangeul' }],
    { windows: [{ hwnd: 99, elements: [{ type: 'Window' }] }] },
    { processId: 77, hwnd: 99, filePath: 'C:\\evidence\\window.png' },
  ];
  const client = createWinAppCli({
    executablePath: 'C:\\tools\\winapp.exe',
    appPid: 77,
    windowHandle: 99,
    execFileImpl: fakeSequence(calls, responses),
  });
  await client.status();
  await client.listWindows();
  await client.inspect(5);
  await client.screenshot('C:\\evidence\\window.png');
  assert.deepEqual(calls.map((call) => call.args.slice(0, -1)), [
    ['ui', 'status', '-w', '99'],
    ['ui', 'list-windows', '-a', '77'],
    ['ui', 'inspect', '-w', '99', '--depth', '5'],
    ['ui', 'screenshot', '-w', '99', '--output', 'C:\\evidence\\window.png'],
  ]);
});

test('target client는 dialog UIA와 단일 bounded drag를 같은 HWND에 고정한다', async () => {
  const calls = [];
  const client = createWinAppCli({
    executablePath: 'C:\\tools\\winapp.exe',
    appPid: 77,
    windowHandle: 99,
    execFileImpl: fakeSequence(calls, [
      { matchCount: 1, matches: [] },
      { elementId: '1148', value: 'C:\\out\\copy.hwp' },
      { elementId: '1', focused: true },
      { elementId: '1', invoked: true },
      { from: '100,200', to: '900,500' },
    ]),
  });
  await client.search('copy.hwp', 5);
  await client.setValue('1148', 'C:\\out\\copy.hwp');
  await client.focus('1');
  await client.invoke('1');
  await client.drag('100,200', '900,500', { holdMs: 200, dwellMs: 700 });
  assert.deepEqual(calls.map((call) => call.args.slice(0, -1)), [
    ['ui', 'search', 'copy.hwp', '-w', '99', '--max', '5'],
    ['ui', 'set-value', '1148', 'C:\\out\\copy.hwp', '-w', '99'],
    ['ui', 'focus', '1', '-w', '99'],
    ['ui', 'invoke', '1', '-w', '99'],
    ['ui', 'drag', '100,200', '900,500', '-w', '99',
      '--hold-ms', '200', '--dwell-ms', '700'],
  ]);
});

test('target client는 같은 process의 내부 HWND를 제외하고 선택한 HWND만 보존한다', async () => {
  const client = createWinAppCli({
    executablePath: 'C:\\tools\\winapp.exe',
    appPid: 77,
    windowHandle: 99,
    execFileImpl: fakeExec([], {
      stdout: JSON.stringify([
        { processId: 77, hwnd: 99, processName: 'Alhangeul', title: 'Alhangeul' },
        { processId: 77, hwnd: 100, processName: 'Alhangeul', title: null },
      ]),
    }),
  });
  const windows = await client.listWindows();
  assert.deepEqual(windows.map(({ processId, hwnd }) => ({ processId, hwnd })), [
    { processId: 77, hwnd: 99 },
  ]);
});

test('stderr JSON error code를 보존하고 성공 stderr·복합 stdout을 거부한다', async () => {
  await assert.rejects(runWinAppJson({
    executablePath: 'C:\\tools\\winapp.exe',
    args: ['ui', 'status', '-w', '42'],
    execFileImpl: fakeExec([], {
      error: Object.assign(new Error('exit 1'), { code: 1 }),
      stderr: '{"error":{"code":"element_not_found","message":"missing"}}',
    }),
  }), (error) => error.code === 'element_not_found');
  await assert.rejects(runWinAppJson({
    executablePath: 'C:\\tools\\winapp.exe',
    args: ['ui', 'status', '-w', '42'],
    execFileImpl: fakeExec([], { stdout: '{}', stderr: 'warning' }),
  }), /성공하면서 stderr/);
  await assert.rejects(runWinAppJson({
    executablePath: 'C:\\tools\\winapp.exe',
    args: ['ui', 'status', '-w', '42'],
    execFileImpl: fakeExec([], { stdout: 'notice\n{}' }),
  }), /단일 JSON 값/);
});

for (const [name, options, error] of [
  ['상대 executable', { executablePath: 'winapp.exe', args: ['ui'] }, /절대 Windows/],
  ['shell 줄바꿈 argv', { executablePath: 'C:\\winapp.exe', args: ['ui\nstatus'] }, /단일행/],
  ['과도한 timeout', { executablePath: 'C:\\winapp.exe', args: ['ui'], timeoutMs: 120001 }, /1000~120000/],
]) {
  test(`${name} 입력을 실행 전에 거부한다`, async () => {
    await assert.rejects(runWinAppJson({ ...options, execFileImpl: fakeExec([], {}) }), error);
  });
}

test('target client는 위험한 dialog 값과 drag 좌표를 실행 전에 거부한다', async () => {
  const client = createWinAppCli({
    executablePath: 'C:\\tools\\winapp.exe',
    appPid: 77,
    windowHandle: 99,
    execFileImpl: fakeExec([], {}),
  });
  await assert.rejects(client.setValue('1148', 'C:\\out\nbad.hwp'), /단일행/);
  await assert.rejects(client.drag('-1,2', '3,4'), /screen x,y/);
  await assert.rejects(client.drag('1,2', '3,4', { dwellMs: 10001 }), /0~10000/);
});

function fakeExec(calls, response) {
  return (file, args, options, callback) => {
    calls.push({ file, args, options });
    queueMicrotask(() => callback(
      response.error ?? null,
      response.stdout ?? '',
      response.stderr ?? '',
    ));
  };
}

function fakeSequence(calls, payloads) {
  let index = 0;
  return (file, args, options, callback) => {
    calls.push({ file, args, options });
    const payload = payloads[index++];
    queueMicrotask(() => callback(null, JSON.stringify(payload), ''));
  };
}
