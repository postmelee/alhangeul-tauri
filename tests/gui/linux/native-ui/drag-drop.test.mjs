import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dragFileIntoWindow,
  performBoundedDrag,
} from './drag-drop.mjs';

test('bounded drag는 검증된 두 중심점 사이에서 단 한 번의 X11 gesture만 보낸다', () => {
  const calls = [];
  performBoundedDrag(
    '/usr/bin/xdotool',
    { x: 20, y: 30, width: 100, height: 60 },
    { x: 400, y: 200, width: 800, height: 600 },
    { DISPLAY: ':99' },
    (...args) => { calls.push(args); return { status: 0, stdout: '', stderr: '' }; },
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1], [
    'mousemove', '--sync', '70', '60',
    'mousedown', '1',
    'mousemove', '--sync', '800', '500',
    'mouseup', '1',
  ]);
});

test('invalid bounds는 입력을 보내기 전에 거부한다', () => {
  let called = false;
  assert.throws(() => performBoundedDrag(
    'xdotool',
    { x: -1, y: 0, width: 100, height: 100 },
    { x: 1, y: 1, width: 100, height: 100 },
    { DISPLAY: ':99' },
    () => { called = true; },
  ), /source bounds/);
  assert.equal(called, false);
});

test('drag source readiness 실패도 helper process를 finally에서 종료한다', async () => {
  let stopped = false;
  const child = { exitCode: 1, signalCode: null };
  const collector = { value: () => '' };
  await assert.rejects(dragFileIntoWindow({
    filePath: '/fixtures/biz_plan.hwp',
    targetRect: { x: 200, y: 200, width: 800, height: 600 },
    timeoutMs: 100,
    env: { DISPLAY: ':99', PATH: '/usr/bin' },
  }, {
    resolveExecutable: async (name) => `/usr/bin/${name}`,
    spawnLoggedProcess: () => ({ child, stdout: collector, stderr: collector }),
    stopProcess: async () => { stopped = true; },
    delay: async () => {},
  }), /준비되지/);
  assert.equal(stopped, true);
});

test('동일한 drag source 창이 여러 개면 좌표 입력 전에 fail-closed 한다', async () => {
  let stopped = false;
  let gestureSent = false;
  const child = { exitCode: null, signalCode: null };
  const stdout = { value: () => 'READY\n' };
  const stderr = { value: () => '' };
  await assert.rejects(dragFileIntoWindow({
    filePath: '/fixtures/biz_plan.hwp',
    targetRect: { x: 200, y: 200, width: 800, height: 600 },
    timeoutMs: 1000,
    env: { DISPLAY: ':99', PATH: '/usr/bin' },
  }, {
    resolveExecutable: async (name) => `/usr/bin/${name}`,
    spawnLoggedProcess: () => ({ child, stdout, stderr }),
    stopProcess: async () => { stopped = true; },
    spawnSync: (_command, args) => {
      if (args[0] === 'getdisplaygeometry') return { status: 0, stdout: '1920 1080\n' };
      if (args[0] === 'search') return { status: 0, stdout: '101\n102\n' };
      gestureSent = true;
      return { status: 0, stdout: '' };
    },
  }), /정확히 1개/);
  assert.equal(gestureSent, false);
  assert.equal(stopped, true);
});

test('drag source는 URI DATA와 drag FINISHED를 모두 확인한 뒤 종료한다', async () => {
  const state = await runDragWithOutput('READY\nDATA\nFINISHED\n');
  assert.equal(state.gestureSent, true);
  assert.equal(state.stopped, true);
});

test('drag FINISHED 전에 URI DATA가 없으면 전송 실패로 닫고 source를 종료한다', async () => {
  let state;
  await assert.rejects(async () => {
    state = await runDragWithOutput('READY\nFINISHED\n');
  }, /fixture URI가 전달되지/);
  assert.equal(state, undefined);
});

async function runDragWithOutput(output) {
  let stopped = false;
  let gestureSent = false;
  const child = { exitCode: null, signalCode: null };
  const stdout = { value: () => output };
  const stderr = { value: () => '' };
  try {
    await dragFileIntoWindow({
      filePath: '/fixtures/biz_plan.hwp',
      targetRect: { x: 400, y: 200, width: 800, height: 600 },
      timeoutMs: 1000,
      env: { DISPLAY: ':99', PATH: '/usr/bin' },
    }, {
      resolveExecutable: async (name) => `/usr/bin/${name}`,
      spawnLoggedProcess: () => ({ child, stdout, stderr }),
      stopProcess: async () => { stopped = true; },
      spawnSync: (_command, args) => {
        if (args[0] === 'getdisplaygeometry') return { status: 0, stdout: '1920 1080\n' };
        if (args[0] === 'search') return { status: 0, stdout: '101\n' };
        if (args[0] === 'getwindowgeometry') {
          return { status: 0, stdout: 'X=20\nY=30\nWIDTH=100\nHEIGHT=60\n' };
        }
        gestureSent = true;
        return { status: 0, stdout: '', stderr: '' };
      },
    });
    return { stopped, gestureSent };
  } finally {
    assert.equal(stopped, true);
  }
}
