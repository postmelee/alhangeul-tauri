import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnLoggedProcess } from '../support/process.mjs';

const execute = promisify(execFile);
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function command(file, args) {
  return (await execute(file, args, { timeout: 5000, maxBuffer: 1024 * 1024 })).stdout;
}

export function launch(commandPath, args, env) {
  const managed = spawnLoggedProcess(commandPath, args, {
    env,
    spawnProcess: (file, argv, options) => spawn(file, argv, { ...options, detached: true }),
  });
  managed.child.on('error', (error) => managed.stderr.append(error.message));
  return managed;
}

export async function stopGroup(managed) {
  if (!managed?.child.pid) return;
  const signal = (value) => {
    try { process.kill(-managed.child.pid, value); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  signal('SIGTERM');
  await delay(500);
  signal('SIGKILL');
}

export function parseWindows(source) {
  return source.trim().split('\n').flatMap((line) => {
    const match = line.match(/^(0x[0-9a-f]+)\s+(-?\d+)\s+(\d+)\s+(-?\d+)\s+(-?\d+)\s+(\d+)\s+(\d+)\s+\S+\s+(.*)$/i);
    if (!match || !/Alhangeul/i.test(match[8])) return [];
    return [{ id: match[1], pid: Number(match[3]), title: match[8],
      x: Number(match[4]), y: Number(match[5]), width: Number(match[6]), height: Number(match[7]) }];
  });
}

export async function windows() {
  return parseWindows(await command('wmctrl', ['-lpG']));
}

export async function snapshot(outputDir, label, managed) {
  const state = {
    at: new Date().toISOString(),
    windows: await windows(),
    launcher: { pid: managed?.child.pid, exitCode: managed?.child.exitCode,
      signalCode: managed?.child.signalCode },
    // Arguments/environment and document contents are deliberately not recorded.
    processes: (await command('ps', ['-eo', 'pid,ppid,stat,comm'])).split('\n')
      .filter((line) => /alhangeul|webkit|tauri-driver/i.test(line)),
  };
  await command('scrot', [join(outputDir, `${label}.png`)]);
  await writeJson(join(outputDir, `${label}.json`), state);
  return state;
}

export async function waitFor(check, label, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await delay(250);
  }
  throw new Error(`Timeout: ${label}`);
}

export async function click(windowId, point) {
  if (!/^0x[0-9a-f]+$/i.test(windowId)
    || ![point?.x, point?.y].every((value) => Number.isInteger(value) && value >= 0 && value < 1280)) {
    throw new Error('Invalid native window/point');
  }
  await command('xdotool', ['windowactivate', '--sync', windowId,
    'mousemove', '--window', windowId, String(point.x), String(point.y), 'click', '1']);
  await delay(400);
}

export function webdriverClient(evidence, fetchRequest = fetch) {
  return async (method, path, body) => {
    const entry = { method, path, at: new Date().toISOString() };
    evidence.push(entry);
    try {
      const response = await fetchRequest(`http://127.0.0.1:4444${path}`, {
        method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(path === '/session' ? 60000 : 10000),
      });
      entry.httpStatus = response.status;
      const payload = response.status === 204 ? { value: null } : await response.json();
      if (!response.ok || payload.value?.error) {
        throw new Error(`${payload.value?.error ?? 'HTTP error'}: ${payload.value?.message ?? response.status}`);
      }
      entry.value = payload.value;
      return payload.value;
    } catch (error) {
      entry.error = error.message;
      throw error;
    }
  };
}

export async function writeJson(path, data) {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
}
