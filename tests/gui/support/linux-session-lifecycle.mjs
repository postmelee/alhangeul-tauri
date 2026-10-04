import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

const run = promisify(execFile);

// Only the single native driver and its app in this non-root CI user's session.
export function selectOwnedApp(processTable, uid) {
  const rows = processTable.trim().split('\n').filter(Boolean).map(line => {
    const [owner, pid, parent, name] = line.trim().split(/\s+/);
    return { uid: Number(owner), pid: Number(pid), parent: Number(parent), name };
  });
  const owned = rows.filter(row => row.uid === uid);
  const proxies = owned.filter(row => row.name === 'tauri-driver');
  const drivers = owned.filter(row => row.name === 'WebKitWebDriver' &&
    proxies.some(proxy => proxy.pid === row.parent));
  const apps = owned.filter(row => row.name === 'Alhangeul' &&
    drivers.some(driver => driver.pid === row.parent));
  if (proxies.length !== 1 || drivers.length !== 1 || apps.length !== 1) {
    throw new Error(`Ambiguous owned session: ${proxies.length}/${drivers.length}/${apps.length}`);
  }
  return apps[0].pid;
}

export function processIdentity(stat) {
  // comm is parenthesized and can itself contain spaces or parentheses.
  const close = stat.lastIndexOf(')');
  const startTime = stat.slice(close + 2).split(/\s+/)[19];
  if (close < 0 || !/^\d+$/.test(startTime ?? '')) throw new Error('Invalid /proc process stat');
  return startTime;
}

async function identity(pid) {
  try { return processIdentity(await readFile(`/proc/${pid}/stat`, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT' || error.code === 'ESRCH') return null; throw error; }
}

async function capture() {
  const { stdout } = await run('ps', ['-eo', 'uid=,pid=,ppid=,comm=']);
  const pid = selectOwnedApp(stdout, process.getuid());
  const startTime = await identity(pid);
  if (startTime === null) throw new Error('Owned app disappeared before DELETE');
  return { pid, startTime };
}

export async function waitForExit(app, options) {
  const now = options.now ?? (() => performance.now());
  const readIdentity = options.readIdentity ?? identity;
  const sleep = options.sleep ?? delay;
  const began = now();
  let pendingAtResponse;
  let polls = 0;
  while (true) {
    const alive = await readIdentity(app.pid) === app.startTime;
    pendingAtResponse ??= alive;
    polls += 1;
    if (!alive) return { pendingAtResponse, polls, waitMs: now() - began };
    if (now() - began >= options.timeoutMs) throw new Error(`App ${app.pid} did not exit after DELETE`);
    await sleep(Math.min(20, options.timeoutMs - (now() - began)));
  }
}

export function createSessionExitGuard(options) {
  const events = [];
  let failure;
  return {
    events,
    async deleteSession(original, ...args) {
      try {
        const app = await (options.capture ?? capture)();
        const beforeDelete = new Date().toISOString();
        const result = await original(...args);
        const deleteReturned = new Date().toISOString();
        const exited = await waitForExit(app, options);
        events.push({ app, beforeDelete, deleteReturned, exited: new Date().toISOString(), ...exited });
        return result;
      } catch (error) {
        failure = error;
        events.push({ failed: new Date().toISOString(), error: String(error) });
        throw error;
      }
    },
    assertCompleted() {
      // reloadSession suppresses DELETE errors: preserve a failed guard after POST too.
      if (failure) throw failure;
    },
  };
}
