import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { selectValidation } from '../scripts/ci/profiles.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('only fast cancels its own profile; source fallback does not weaken target identity', () => {
  const workflow = read('.github/workflows/ci.yml');
  assert.ok(workflow.includes('group: alhangeul-ci-${{ github.ref }}-${{ inputs.profile }}-${{ inputs.scope }}'));
  assert.ok(workflow.includes("cancel-in-progress: ${{ inputs.profile == 'fast' && inputs.scope != 'pdf-cleanup-windows' }}"));
  const cache = read('.github/actions/cargo-cache/action.yml');
  assert.ok(cache.includes('restore-keys: |\n          cargo-source-v2-${{ runner.os }}-${{ runner.arch }}-'));
  assert.ok(cache.includes('restore-keys: |\n          ${{ steps.identity.outputs.prefix }}-'));
});
test('sparse and ambiguous paths expand to full and cross-platform scopes retain precedence', () => {
  for (const paths of [new Array(1), ['docs/a.md', undefined], ['../docs/a.md'], ['a\\b'],
    ['apps/linux-thumbnailer/Cargo.toml', 'scripts/windows-installer-smoke.ps1']]) {
    assert.equal(selectValidation(paths).profile, 'full');
  }
});
test('handoff failure preserves context and outcomes without exposing raw inputs or step outputs', t => {
  const cwd = mkdtempSync(join(tmpdir(), 'installer-evidence-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const env = { ...process.env, PRODUCT_SHA: 'invalid-secret', HARNESS_SHA: 'b'.repeat(40),
    PRODUCT_RUN_ID: '12', PRODUCT_ARTIFACT_ID: '42', PRODUCT_ARTIFACT_DIGEST: `sha256:${'c'.repeat(64)}`,
    GITHUB_TOKEN: 'secret-token', GITHUB_STEP_SUMMARY: join(cwd, 'summary') };
  const run = (path, args = []) => spawnSync(process.execPath,
    [fileURLToPath(new URL(`../scripts/ci/${path}.mjs`, import.meta.url)), ...args], { cwd, env, encoding: 'utf8' });
  assert.equal(run('installer-evidence', ['prepare']).status, 0);
  assert.equal(run('artifact-handoff').status, 1);
  env.STEP_RESULTS_JSON = JSON.stringify({ harness: { outcome: 'success', conclusion: 'success' },
    handoff: { outcome: 'failure', conclusion: 'failure', outputs: { token: 'secret-token' } } });
  assert.equal(run('installer-evidence', ['record']).status, 0);
  const context = readFileSync(join(cwd, 'diagnostics/installer-reuse/workflow-context.json'), 'utf8');
  const outcomes = readFileSync(join(cwd, 'diagnostics/installer-reuse/step-outcomes.json'), 'utf8');
  assert.equal(JSON.parse(context).requested.productSha, null);
  assert.equal(JSON.parse(context).verification, 'unverified');
  assert.equal(JSON.parse(outcomes).steps.handoff.outcome, 'failure');
  assert.equal(JSON.parse(outcomes).steps.smoke.outcome, 'unverified');
  assert.equal(JSON.parse(outcomes).result, 'failed-or-unverified');
  assert.doesNotMatch(context + outcomes, /secret-token|invalid-secret/);
  const success = Object.fromEntries(['harness', 'handoff', 'download', 'inventory', 'support', 'manual-tests', 'smoke-context', 'regressions', 'smoke', 'diagnostic-contract', 'manual-evidence']
    .map(name => [name, { outcome: 'success', conclusion: 'success' }]));
  env.STEP_RESULTS_JSON = JSON.stringify(success);
  assert.equal(run('installer-evidence', ['record']).status, 0);
  assert.equal(JSON.parse(readFileSync(join(cwd, 'diagnostics/installer-reuse/step-outcomes.json'))).result, 'passed');
});
test('workflow creates evidence before verification and always records before upload', () => {
  const workflow = read('.github/workflows/alhangeul-installer-reuse.yml');
  assert.ok(workflow.indexOf('installer-evidence.mjs prepare') < workflow.indexOf('id: harness'));
  assert.match(workflow, /Record reuse scope and actual result\n\s+if: \$\{\{ always\(\) \}\}/);
  assert.ok(workflow.indexOf('installer-evidence.mjs record') < workflow.indexOf('uses: actions/upload-artifact'));
  const pin = /uses: (actions\/download-artifact@[^\n]+)/;
  assert.equal(workflow.match(pin)[1], read('.github/workflows/alhangeul-windows-smoke.yml').match(pin)[1]);
});
