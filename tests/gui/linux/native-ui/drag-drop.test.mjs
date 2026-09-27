import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  dragFileIntoWindow,
  performBoundedDrag,
} from './drag-drop.mjs';

test('단일 gesture는 STARTED와 DATA 관측 뒤에만 다음 이동과 release를 수행한다', async () => {
  const events = [];
  await performBoundedDrag(
    'xdotool', { x: 20, y: 30, width: 100, height: 60 },
    { x: 400, y: 200, width: 800, height: 600 }, { DISPLAY: ':99' }, {
      execute: (_command, args) => { events.push(args); return { status: 0 }; },
      observe: async (marker) => { events.push(marker); },
    },
  );
  assert.deepEqual(events, [
    ['mousemove', '--sync', '70', '60', 'mousedown', '1', 'sleep', '0.2',
      'mousemove', '--sync', '86', '60'],
    'STARTED', ['mousemove', '--sync', '800', '500'], 'DATA', ['mouseup', '1'],
  ]);
});

test('invalid bounds는 입력을 보내기 전에 거부한다', async () => {
  let called = false;
  await assert.rejects(performBoundedDrag(
    'xdotool', { x: -1, y: 0, width: 100, height: 100 },
    { x: 1, y: 1, width: 100, height: 100 }, { DISPLAY: ':99' },
    { execute: () => { called = true; } },
  ), /source bounds/);
  assert.equal(called, false);
});

test('DATA가 없는 관측 실패도 한 번만 release하고 재시도하지 않는다', async () => {
  const calls = [];
  await assert.rejects(performBoundedDrag(
    'xdotool', { x: 20, y: 30, width: 100, height: 60 },
    { x: 400, y: 200, width: 800, height: 600 }, { DISPLAY: ':99' }, {
      execute: (_command, args) => { calls.push(args); return { status: 0 }; },
      observe: async (marker) => { if (marker === 'DATA') throw new Error('missing DATA'); },
    },
  ), /missing DATA/);
  assert.equal(calls.filter((args) => args.includes('mousedown')).length, 1);
  assert.deepEqual(calls.at(-1), ['mouseup', '1']);
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
  const state = await runDragWithOutput('READY\nSTARTED\nDATA\nFINISHED\n');
  assert.equal(state.gestureSent, true);
  assert.equal(state.stopped, true);
});

test('지연된 GTK marker를 기다리는 동안 helper를 종료하거나 두 번째 gesture를 보내지 않는다', async () => {
  const state = await runDragWithOutput(['READY', 'STARTED', 'DATA', 'FINISHED']);
  assert.equal(state.stopped, true);
  assert.equal(state.gestureSent, true);
});

test('drag FINISHED 전에 URI DATA가 없으면 전송 실패로 닫고 source를 종료한다', async () => {
  let state;
  await assert.rejects(async () => {
    state = await runDragWithOutput('READY\nSTARTED\nFINISHED\n');
  }, /GTK drag DATA 관측/);
  assert.equal(state, undefined);
});

test('GTK source는 event window에서 drag start·data·end marker를 모두 노출한다', async () => {
  const source = await readFile(new URL('./drag_source.py', import.meta.url), 'utf8');
  assert.match(source, /source = Gtk\.EventBox\(\)/);
  assert.match(source, /source\.drag_source_set\(/);
  assert.doesNotMatch(source, /label\.drag_source_set\(/);
  assert.match(source, /source\.connect\("drag-begin", start_drag\)/);
  for (const marker of ['STARTED', 'DATA', 'FINISHED']) {
    assert.match(source, new RegExp(`print\\("${marker}"`));
  }
});

async function runDragWithOutput(output) {
  const pending = Array.isArray(output) ? [...output] : [];
  let observed = Array.isArray(output) ? `${pending.shift()}\n` : output;
  let stopped = false;
  let gestureSent = false;
  const child = { exitCode: null, signalCode: null };
  const stdout = { value: () => observed };
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
      delay: async () => { if (pending.length) observed += `${pending.shift()}\n`; },
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
