import assert from 'node:assert/strict';
import { readFile, readlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateApply } from './production-evidence.mjs';

export function restartedAppImageProcess(apply, spec = null) {
  validateApply(apply, 'appimage', spec);
  return apply.restart.current;
}

export async function stopRestartedAppImage(output, spec = null) {
  assert.equal(process.platform, 'linux');
  const apply = JSON.parse(await readFile(join(output, 'apply', 'result.json'), 'utf8'));
  const { pid, executable } = restartedAppImageProcess(apply, spec);
  const path = `/proc/${pid}/exe`;
  const running = async () => {
    try { assert.equal(await readlink(path), executable, 'only this VM verified restarted process'); return true; }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  };
  if (await running()) process.kill(pid, 'SIGTERM');
  const deadline = Date.now() + 30000;
  while (await running()) {
    assert.ok(Date.now() < deadline, 'restarted process shutdown before new driver session');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await writeFile(join(output, 'restarted-process-shutdown.json'), JSON.stringify({ pid, executable, stopped: true, reason: 'fresh verification driver session after observed real UI restart' }));
}
