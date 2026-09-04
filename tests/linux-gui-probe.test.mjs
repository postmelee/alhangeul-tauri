import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { posix } from 'node:path';
import test from 'node:test';
import {
  inspectProbeEnvironment,
  runLinuxGuiProbe,
} from './gui/linux/probe.mjs';
import {
  createBoundedCollector,
  resolveExecutable,
  stopProcess,
} from './gui/support/process.mjs';

test('Linux production binary와 외부 driver prerequisite를 확정한다', async () => {
  const requested = [];
  const result = await inspectProbeEnvironment(probeOptions(), probeServices({
    resolveExecutable: async (name) => {
      requested.push(name);
      return `/usr/bin/${name}`;
    },
  }));

  assert.deepEqual(requested, ['tauri-driver', 'WebKitWebDriver']);
  assert.equal(result.appPath, '/usr/bin/Alhangeul');
  assert.equal(result.driverPath, '/usr/bin/tauri-driver');
  assert.equal(result.nativeDriverPath, '/usr/bin/WebKitWebDriver');
  assert.equal(result.baseUrl, 'http://127.0.0.1:4444');
});

for (const [name, options, services, error] of [
  ['Linux가 아닌 Windows host', probeOptions(), { platform: 'win32' }, /Linux에서만/],
  ['DISPLAY 누락', probeOptions({ env: { PATH: '/usr/bin' } }), {}, /DISPLAY/],
  ['상대 app path', probeOptions({ appPath: 'Alhangeul' }), {}, /절대 경로/],
  ['상대 output path', probeOptions({ outputDir: 'evidence' }), {}, /절대 경로/],
  ['동일 port', probeOptions({ nativePort: 4444 }), {}, /달라야/],
  ['reserved port', probeOptions({ port: 80 }), {}, /1024~65535/],
]) {
  test(`${name}을 probe 시작 전에 거부한다`, async () => {
    await assert.rejects(
      inspectProbeEnvironment(options, probeServices(services)),
      error,
    );
  });
}

test('실행 가능하지 않은 app binary를 거부한다', async () => {
  await assert.rejects(
    inspectProbeEnvironment(probeOptions(), probeServices({
      accessFile: async () => { throw new Error('denied'); },
    })),
    /실행 가능하지 않습니다/,
  );
});

test('PATH에서 실행 파일을 deterministic 순서로 찾는다', async () => {
  const checked = [];
  const value = await resolveExecutable('tauri-driver', {
    pathValue: ['/missing', '/cargo/bin'].join(posix.delimiter),
    pathApi: posix,
    accessFile: async (path) => {
      checked.push(path);
      if (path.startsWith('/missing')) throw new Error('missing');
    },
  });
  assert.equal(value, '/cargo/bin/tauri-driver');
  assert.deepEqual(checked, ['/missing/tauri-driver', '/cargo/bin/tauri-driver']);
});

test('실행 파일 탐색은 delimiter와 join을 한 path API에서 받는다', async () => {
  await assert.rejects(
    resolveExecutable('tauri-driver', { pathValue: '/usr/bin', pathApi: { delimiter: ':' } }),
    /path API/,
  );
});

test('driver log는 크기를 제한하고 truncation을 명시한다', () => {
  const collector = createBoundedCollector(4);
  collector.append('abcdef');
  collector.append('ignored');
  assert.equal(collector.value(), 'abcd\n[log truncated]\n');
});

test('driver log는 chunk와 byte limit에서 UTF-8 문자를 쪼개지 않는다', () => {
  const bytes = Buffer.from('한글');
  const collector = createBoundedCollector(5);
  collector.append(bytes.subarray(0, 2));
  assert.equal(collector.value(), '');
  collector.append(bytes.subarray(2));
  assert.equal(collector.value(), '한\n[log truncated]\n');
  assert.doesNotMatch(collector.value(), /�/);
});

test('SIGKILL 동기 exit도 기존 listener로 회수해 stop race를 만들지 않는다', async () => {
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  const signals = [];
  child.kill = (signal) => {
    signals.push(signal);
    if (signal === 'SIGKILL') {
      child.signalCode = signal;
      child.emit('exit', null, signal);
    }
    return true;
  };
  await stopProcess(child, { graceMs: 1 });
  assert.deepEqual(signals, ['SIGTERM', 'SIGKILL']);
});

test('external tauri-driver가 title과 root DOM을 읽고 evidence를 남긴다', async () => {
  const writes = new Map();
  const requests = [];
  let stopped = false;
  const stdout = createBoundedCollector();
  const stderr = createBoundedCollector();
  stdout.append('driver ready\n');
  const result = await runLinuxGuiProbe(probeOptions(), probeServices({
    mkdir: async () => {},
    writeFile: async (path, source) => writes.set(path, source),
    spawnDriver: () => ({ child: { exitCode: null, signalCode: null }, stdout, stderr }),
    stopDriver: async () => { stopped = true; },
    delay: async () => {},
    request: async (_baseUrl, method, path, body) => {
      requests.push([method, path, body]);
      if (path === '/status') return { ready: true };
      if (path === '/session') return { sessionId: 'session-1' };
      if (path.endsWith('/title')) return 'Alhangeul';
      if (path.endsWith('/execute/sync')) return 'HTML';
      return null;
    },
  }));

  assert.equal(result.status, 'success');
  assert.equal(result.title, 'Alhangeul');
  assert.equal(stopped, true);
  assert.deepEqual(requests[1][2], {
    capabilities: {
      alwaysMatch: {
        'tauri:options': { application: '/usr/bin/Alhangeul' },
      },
    },
  });
  assert.deepEqual(requests.at(-1).slice(0, 2), ['DELETE', '/session/session-1']);
  assert.equal(writes.get('/tmp/evidence/tauri-driver.stdout.log'), 'driver ready\n');
  assert.equal(JSON.parse(writes.get('/tmp/evidence/probe-summary.json')).rootTag, 'HTML');
});

test('status는 5초, session lifecycle 요청은 bounded 30초 timeout을 사용한다', async () => {
  const source = await readFile(new URL('./gui/linux/probe.mjs', import.meta.url), 'utf8');
  assert.match(source, /path === '\/status' \? 5000 : 30000/);
  assert.match(source, /WebDriver 요청이 중단됐습니다: \$\{method\} \$\{path\}/);
});

test('session probe 실패도 cleanup과 bounded evidence를 수행한다', async () => {
  const writes = new Map();
  let stopped = false;
  const stdout = createBoundedCollector();
  const stderr = createBoundedCollector();
  await assert.rejects(
    runLinuxGuiProbe(probeOptions(), probeServices({
      mkdir: async () => {},
      writeFile: async (path, source) => writes.set(path, source),
      spawnDriver: () => ({ child: { exitCode: null, signalCode: null }, stdout, stderr }),
      stopDriver: async () => { stopped = true; },
      delay: async () => {},
      request: async (_baseUrl, _method, path) => {
        if (path === '/status') return { ready: true };
        throw new Error('session refused');
      },
    })),
    /session refused/,
  );
  assert.equal(stopped, true);
  const summary = JSON.parse(writes.get('/tmp/evidence/probe-summary.json'));
  assert.equal(summary.status, 'failure');
  assert.equal(summary.error, 'session refused');
});

function probeOptions(override = {}) {
  return {
    appPath: '/usr/bin/Alhangeul',
    outputDir: '/tmp/evidence',
    port: 4444,
    nativePort: 4445,
    env: { DISPLAY: ':99', PATH: '/usr/bin' },
    ...override,
  };
}

function probeServices(override = {}) {
  return {
    platform: 'linux',
    statFile: async () => ({ isFile: () => true }),
    accessFile: async () => {},
    resolveExecutable: async (name) => `/usr/bin/${name}`,
    ...override,
  };
}
