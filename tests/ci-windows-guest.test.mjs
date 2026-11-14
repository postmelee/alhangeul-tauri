import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('guest serial rejects corruption, traversal, duplication, overflow and truncation', () => {
  const r = spawnSync('python3', ['-B', 'tests/ci-windows-guest.test.py'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('guest host preparation preserves the disposable-runner guard through sudo', () => {
  const workflow = readFileSync('.github/workflows/alhangeul-windows-guest-probe.yml', 'utf8');
  assert.match(workflow, /sudo --preserve-env=GITHUB_ACTIONS,RUNNER_ENVIRONMENT python3 scripts\/ci\/ubuntu-mirror\.py/);
});
