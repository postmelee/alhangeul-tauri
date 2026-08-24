import assert from 'node:assert/strict';
import test from 'node:test';
import { runActionWithPostcondition } from './action-postcondition.mjs';

test('GTK action timeout은 독립 postcondition 성공 때만 승인한다', async () => {
  const calls = [];
  const run = async (request) => {
    calls.push(request.command);
    if (request.command === 'actionIfPresent') {
      throw new Error('AT-SPI actionIfPresent failed: spawnSync python3 ETIMEDOUT');
    }
    return { absent: true };
  };
  assert.deepEqual(await runActionWithPostcondition(
    run,
    { command: 'actionIfPresent' },
    { command: 'waitAbsent' },
  ), { confirmedAfterTimeout: true });
  assert.deepEqual(calls, ['actionIfPresent', 'waitAbsent']);
});

test('action과 postcondition은 서로 다른 native channel을 사용할 수 있다', async () => {
  const calls = [];
  const result = await runActionWithPostcondition(
    async ({ command }) => {
      calls.push(`atspi:${command}`);
      throw new Error('AT-SPI action failed: spawnSync python3 ETIMEDOUT');
    },
    { command: 'action' },
    { operation: 'wait' },
    async ({ operation }) => { calls.push(`x11:${operation}`); },
  );
  assert.deepEqual(result, { confirmedAfterTimeout: true });
  assert.deepEqual(calls, ['atspi:action', 'x11:wait']);
});

test('postcondition 실패와 비-timeout action 오류는 원인을 보존한다', async () => {
  await assert.rejects(
    runActionWithPostcondition(
      async ({ command }) => {
        if (command === 'action') throw new Error('AT-SPI action failed: ETIMEDOUT');
        throw new Error('dialog remains');
      },
      { command: 'action' },
      { command: 'waitAbsent' },
    ),
    /AT-SPI action failed.*postcondition failed: dialog remains/,
  );
  await assert.rejects(
    runActionWithPostcondition(
      async () => { throw new Error('AT-SPI action failed: unavailable'); },
      { command: 'action' },
      { command: 'waitAbsent' },
    ),
    /unavailable/,
  );
});
