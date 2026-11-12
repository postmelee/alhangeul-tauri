import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('guest serial rejects corruption, traversal, duplication, overflow and truncation', () => {
  const r = spawnSync('python3', ['-B', 'tests/ci-windows-guest.test.py'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});
