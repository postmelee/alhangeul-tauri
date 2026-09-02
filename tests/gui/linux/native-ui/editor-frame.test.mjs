import assert from 'node:assert/strict';
import test from 'node:test';
import { createEditorWindowReader, createScreenshotReader, parseWindowGeometry } from './editor-frame.mjs';

const GEOMETRY = 'WINDOW=42\nX=320\nY=97\nWIDTH=1280\nHEIGHT=900\nSCREEN=0\n';

test('editor readback은 PID·exact title·visible·active window를 읽기만 한다', () => {
  const calls = [];
  const reader = createEditorWindowReader({ pid: 123, spawnSync: (command, args) => {
    calls.push([command, args]);
    return { status: 0, stdout: args[0] === 'getwindowgeometry' ? GEOMETRY : '42\n' };
  } });
  assert.deepEqual(reader(), { windowId: '42', x: 320, y: 97, width: 1280, height: 900 });
  assert.deepEqual(calls.map(([, args]) => args), [
    ['search', '--all', '--onlyvisible', '--pid', '123', '--name', '^Alhangeul$'],
    ['getactivewindow'], ['getwindowgeometry', '--shell', '42'],
  ]);
});

test('editor window 중복·다른 active window·명령 실패·잘못된 geometry를 거부한다', () => {
  for (const result of [{ status: 0, stdout: '42\n43' }, { status: 1, stderr: 'missing' }]) {
    assert.throws(createEditorWindowReader({ pid: 123, spawnSync: () => result }));
  }
  assert.throws(createEditorWindowReader({ pid: 123, spawnSync: (_command, args) => ({
    status: 0, stdout: args[0] === 'search' ? '42' : '43',
  }) }), /active/);
  assert.throws(() => createEditorWindowReader({ pid: 0 }), /PID/);
  for (const geometry of [GEOMETRY + 'X=2\n', GEOMETRY.replace('WIDTH=1280', 'WIDTH=0'), 'X=0']) {
    assert.throws(() => parseWindowGeometry(geometry), /geometry/);
  }
});

test('screenshot reader는 PNG 원본을 read-only decoder에 단일 인자로 전달한다', async () => {
  const path = '/evidence/a picture.png';
  const reader = createScreenshotReader({ spawnSync: (command, args, options) => {
    assert.equal(command, 'python3');
    assert.equal(args.length, 2);
    assert.equal(args[1], path);
    assert.equal(options.timeout, 10000);
    return { status: 0, stdout: Buffer.concat([
      Buffer.from('{"width":1,"height":1,"channels":3,"rowstride":3}\n'), Buffer.alloc(3, 255),
    ]) };
  } });
  assert.equal((await reader(path)).data.length, 3);
  await assert.rejects(createScreenshotReader({ spawnSync: () => ({ status: 1, stderr: 'decode error' }) })(path), /decode 실패/);
});
