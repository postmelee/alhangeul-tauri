import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionExitGuard, processIdentity, selectOwnedApp, waitForExit }
  from '../tests/gui/support/linux-session-lifecycle.mjs';

const table = '1000 10 1 tauri-driver\n1000 11 10 WebKitWebDriver\n1000 12 11 Alhangeul';
test('only the single current-user driver child is selected; ambiguity fails closed', () => {
  assert.equal(selectOwnedApp(`${table}\n2000 20 1 Alhangeul\n1000 21 1 Alhangeul`, 1000), 12);
  assert.throws(() => selectOwnedApp(table, 2000), /Ambiguous/);
  assert.throws(() => selectOwnedApp(`${table}\n1000 13 11 Alhangeul`, 1000), /Ambiguous/);
  assert.throws(() => selectOwnedApp(table.replace('11 10', '11 99'), 1000), /Ambiguous/);
});
test('process identity handles parentheses in comm and rejects malformed stat', () => {
  assert.equal(processIdentity(`12 (app (worker)) S ${Array(18).fill('0').join(' ')} 12345 0`), '12345');
  assert.throws(() => processIdentity('bad stat'), /Invalid/);
});
test('DELETE result returns only after captured app exit, before the next session', async () => {
  const order = [];
  let ticks = 0;
  const guard = createSessionExitGuard({ timeoutMs: 100, capture: async () => ({ pid: 12, startTime: '42' }),
    now: () => ticks, sleep: async ms => { ticks += ms; order.push('wait'); },
    readIdentity: async () => ticks < 40 ? '42' : null });
  assert.equal(await guard.deleteSession(async () => { order.push('delete'); return 'response'; }), 'response');
  order.push('post');
  guard.assertCompleted();
  assert.deepEqual(order, ['delete', 'wait', 'wait', 'post']);
  assert.equal(guard.events[0].pendingAtResponse, true);
  assert.equal(guard.events[0].waitMs, 40);
});
test('PID reused by another process is already an exit; no extra delay', async () => {
  const result = await waitForExit({ pid: 12, startTime: '42' }, {
    timeoutMs: 100, readIdentity: async () => '43', sleep: () => assert.fail('must not sleep') });
  assert.equal(result.pendingAtResponse, false);
  assert.equal(result.polls, 1);
});
test('timeout remains a failure even when reloadSession suppresses DELETE error', async () => {
  let ticks = 0;
  const guard = createSessionExitGuard({ timeoutMs: 40, capture: async () => ({ pid: 12, startTime: '42' }),
    now: () => ticks, sleep: async ms => { ticks += ms; }, readIdentity: async () => '42' });
  await assert.rejects(guard.deleteSession(async () => undefined), /did not exit/);
  assert.throws(() => guard.assertCompleted(), /did not exit/);
});
test('native DELETE and process-read errors cannot become successful acceptance', async () => {
  for (const options of [{ capture: async () => { throw new Error('capture'); } },
    { capture: async () => ({ pid: 12, startTime: '42' }),
      readIdentity: async () => { throw new Error('proc read'); } }]) {
    const guard = createSessionExitGuard({ timeoutMs: 100, ...options });
    await assert.rejects(guard.deleteSession(async () => undefined));
    assert.throws(() => guard.assertCompleted());
  }
  const guard = createSessionExitGuard({ timeoutMs: 100, capture: async () => ({ pid: 12, startTime: '42' }) });
  await assert.rejects(guard.deleteSession(async () => { throw new Error('HTTP DELETE'); }), /HTTP DELETE/);
  assert.throws(() => guard.assertCompleted(), /HTTP DELETE/);
});
