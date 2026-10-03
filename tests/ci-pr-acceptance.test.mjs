import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';
import { assertPullRequestResults } from '../scripts/ci/pr-acceptance.mjs';

const workflow = parse(await readFile(new URL('../.github/workflows/pr-acceptance.yml', import.meta.url), 'utf8'));
const fast = parse(await readFile(new URL('../.github/workflows/alhangeul-ci-fast.yml', import.meta.url), 'utf8'));
const policy = JSON.parse(await readFile(new URL('../.github/protection/devel.json', import.meta.url), 'utf8'));
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('required gate rejects every incomplete result, including skipped and cancellation', () => {
  for (const result of ['failure', 'cancelled', 'skipped', 'pending', '', undefined]) {
    assert.throws(() => assertPullRequestResults({ contracts: { result } }), /must complete/);
  }
  for (const needs of [null, {}, { contracts: { result: 'success' }, extra: {} }]) {
    assert.throws(() => assertPullRequestResults(needs), /must complete/);
  }
  assert.deepEqual(assertPullRequestResults({ contracts: { result: 'success' } }), { status: 'passed', scope: 'fast-contracts' });
});

test('PR events include drafts and synchronize, with no path skip or privileged trigger', () => {
  assert.deepEqual(Object.keys(workflow.on), ['pull_request']);
  assert.deepEqual(workflow.on.pull_request.branches, ['devel']);
  for (const event of ['opened', 'synchronize', 'reopened', 'ready_for_review', 'converted_to_draft']) {
    assert.ok(workflow.on.pull_request.types.includes(event));
  }
  assert.equal(workflow.on.pull_request.paths, undefined);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.equal(workflow.jobs.contracts.if, undefined);
  assert.equal(workflow.jobs.contracts.secrets, undefined);
  assert.equal(workflow.jobs.contracts.uses, './.github/workflows/alhangeul-ci-fast.yml');
  assert.equal(workflow.jobs.contracts.with.source_ref, '${{ github.sha }}');
});

test('single always gate aggregates both reusable jobs at the merge candidate SHA', () => {
  const gate = workflow.jobs.required;
  assert.equal(gate.name, policy.required_status_checks.checks[0].context);
  assert.equal(gate.if, '${{ always() }}');
  assert.deepEqual(gate.needs, ['contracts']);
  assert.equal(gate.steps[0].with.ref, '${{ github.sha }}');
  assert.equal(gate.steps[0].with['persist-credentials'], false);
  assert.equal(gate.steps[1].env.PR_NEEDS_JSON, '${{ toJSON(needs) }}');
  assert.equal(gate.steps[1].run, 'node scripts/ci/pr-acceptance.mjs');
  assert.ok(fast.jobs.contracts && fast.jobs['windows-scripts']);
  assert.ok(fast.jobs.contracts.steps.some((step) => step.run === 'pnpm run check:committed-rhwp'));
});

test('local default and PR acceptance include strict committed state without changing candidate post-update gate', async () => {
  assert.ok(pkg.scripts.test.indexOf('check:committed-rhwp') < pkg.scripts.test.indexOf('test:upstream'));
  assert.ok(pkg.scripts.test.includes('test:automation'));
  const candidate = await readFile(new URL('../.github/workflows/rhwp-upstream-sync.yml', import.meta.url), 'utf8');
  assert.doesNotMatch(candidate, /check:committed-rhwp/);
  assert.doesNotMatch(pkg.scripts['test:upstream'], /committed-rhwp/);
});

test('personal repository requires PR/checks even for admin, without one-person review deadlock', () => {
  assert.equal(policy.required_status_checks.strict, true);
  assert.equal(policy.required_status_checks.contexts, undefined);
  assert.deepEqual(policy.required_status_checks.checks, [{ context: 'Alhangeul PR required', app_id: 15368 }]);
  assert.equal(policy.enforce_admins, true);
  assert.equal(policy.allow_force_pushes, false);
  assert.equal(policy.allow_deletions, false);
  assert.equal(policy.required_pull_request_reviews.required_approving_review_count, 0);
  assert.equal(policy.required_pull_request_reviews.bypass_pull_request_allowances, undefined);
  assert.equal(policy.restrictions, null);
});

test('fast CI checks release contracts and Pages on Linux and generation paths on Windows', () => {
  const linux = fast.jobs.contracts.steps;
  for (const command of ['check:release-notes', 'build:pages', 'check:pages']) {
    const step = linux.find((entry) => entry.run === `pnpm run ${command}`);
    assert.ok(step, command);
    assert.equal(step.if, undefined);
    assert.equal(step['continue-on-error'], undefined);
  }
  const windows = fast.jobs['windows-scripts'].steps.find((entry) => entry.name === 'Test release generation contracts');
  const check = fast.jobs['windows-scripts'].steps.find((entry) => entry.run === 'node scripts/releases/notes-cli.mjs check');
  assert.ok(check);
  assert.equal(check.if, undefined);
  assert.equal(check['continue-on-error'], undefined);
  assert.equal(windows.if, undefined);
  assert.equal(windows['continue-on-error'], undefined);
  for (const name of ['release-notes', 'release-notes-generation', 'release-notes-integration']) {
    assert.ok(windows.run.includes(`tests/${name}.test.mjs`));
    assert.ok(pkg.scripts['test:automation'].includes(`tests/${name}.test.mjs`));
    assert.ok(pkg.scripts['test:release-notes'].includes(`tests/${name}.test.mjs`));
  }
});
