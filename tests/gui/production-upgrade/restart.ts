import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readlink } from 'node:fs/promises';
import { basename } from 'node:path';
import { promisify } from 'node:util';
const run = promisify(execFile);

export async function appImageProcess(): Promise<{ pid: number; executable: string }> {
  assert.equal(process.platform, 'linux', 'original AppImage process probe requires Linux');
  // Read only PID/comm, then executable links of product processes; never collect environments.
  const { stdout } = await run('ps', ['-eo', 'pid=,comm=']);
  const products = [];
  for (const line of stdout.trim().split('\n')) {
    const match = line.trim().match(/^(\d+)\s+(alhangeul\S*)$/i);
    if (!match) continue;
    try {
      const executable = await readlink(`/proc/${match[1]}/exe`);
      if (executable.includes('/.mount_') && /^alhangeul/i.test(basename(executable))) {
        products.push({ pid: Number(match[1]), executable });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  assert.equal(products.length, 1, 'one real product executable from FUSE mount');
  return products[0];
}

export async function waitForAppImageRestart(previous: { pid: number; executable: string }) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try {
      const current = await appImageProcess();
      if (current.pid !== previous.pid && current.executable !== previous.executable) {
        return { previous, current, observed: true };
      }
    } catch (error) {
      if (!(error instanceof assert.AssertionError)) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('App restart UI did not produce a new product PID from a new FUSE mount');
}
