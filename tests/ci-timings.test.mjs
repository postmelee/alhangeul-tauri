import assert from 'node:assert/strict';
import test from 'node:test';
import { duration, summarizeTimings, fetchTimings } from '../scripts/ci/timings.mjs';

const start = '2026-09-06T00:00:00Z';
const end = '2026-09-06T00:00:10Z';
test('timing distinguishes skipped/incomplete from zero duration', () => {
  const summary = summarizeTimings({ id: 1, run_started_at: start }, [{
    id: 2, status: 'completed', conclusion: 'failure', started_at: start, completed_at: end,
    steps: [
      { status: 'completed', conclusion: 'success', started_at: start, completed_at: start },
      { status: 'completed', conclusion: 'skipped', started_at: start, completed_at: start },
      { status: 'in_progress', started_at: start },
    ],
  }]);
  assert.equal(summary.jobs[0].seconds, 10);
  assert.deepEqual(summary.jobs[0].steps.map((step) => step.seconds), [0, null, null]);
  assert.equal(summary.jobs[0].conclusion, 'failure');
  assert.equal(duration(null, end), null);
  assert.throws(() => duration(end, start));
  assert.throws(() => duration('invalid', end));
});
test('timing fetch paginates the exact run attempt', async () => {
  const paths = [];
  const result = await fetchTimings('a/b', 1, async (path) => {
    paths.push(path);
    if (paths.length === 1) return { id: 1, run_attempt: 2 };
    return { total_count: 2, jobs: [{ id: paths.length }] };
  });
  assert.equal(result.jobs.length, 2);
  assert.match(paths[1], /attempts\/2\/jobs\?per_page=100&page=1$/);
  assert.match(paths[2], /page=2$/);
});
test('timing input errors and incomplete pagination fail closed', async () => {
  await assert.rejects(fetchTimings('../a/b', 1));
  await assert.rejects(fetchTimings('a/b', '1x'));
  await assert.rejects(fetchTimings('a/b', 1, async (path) => path.includes('/jobs')
    ? { jobs: [], total_count: 1 } : { run_attempt: 1 }), /Incomplete/);
});
