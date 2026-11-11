import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('public installer observation is explicit, fast-gated and separate from product acceptance', () => {
  const ci = parse(read('.github/workflows/ci.yml'));
  assert.equal(ci.on.workflow_dispatch.inputs.thumbnail_user_context.default, false);
  const job = ci.jobs['thumbnail-user-context'];
  assert.equal(job.needs, 'fast');
  assert.match(job.if, /inputs.thumbnail_user_context/);
  assert.match(job.if, /inputs.profile == 'fast'/);
  const workflow = parse(read('.github/workflows/alhangeul-thumbnail-user-context.yml'));
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.deepEqual(workflow.jobs.observe.strategy.matrix.context, ['runner', 'standard']);
  assert.equal(workflow.jobs.observe.steps.at(-1).if, '${{ always() }}');
});
test('observation pins public bytes, creates only a standard account and preserves cleanup outcomes', () => {
  const parent = read('scripts/windows-thumbnail-user-context.ps1');
  const child = read('scripts/windows-thumbnail-user-probe.ps1');
  for (const source of [parent, child]) {
    assert.doesNotMatch(source, /DisableProcessIsolation|Set-ItemProperty|regsvr32|Stop-Process|EnableLUA/);
  }
  assert.match(read('scripts/windows-thumbnail-user-input.mjs'), /932c3316d9ea83cd5c38e3fe528518535751ac60fedd72776c5306085437c490/);
  assert.match(parent, /RUNNER_ENVIRONMENT -cne 'github-hosted'/);
  assert.match(parent, /Add-LocalGroupMember -SID 'S-1-5-32-545'/);
  assert.doesNotMatch(parent, /S-1-5-32-544/);
  assert.match(parent, /Remove-LocalUser -SID \$accountSid/);
  assert.match(child, /integrityRid -ne 8192/);
  assert.match(child, /'shell', 'force-extract'/);
  assert.match(child, /raw Shell failures are preserved/);
});

test('normal CI always requires fresh standard-user acceptance; historical same-version check is explicit', () => {
  const ci = parse(read('.github/workflows/ci.yml'));
  const artifacts = parse(read('.github/workflows/alhangeul-artifacts.yml'));
  const smoke = parse(read('.github/workflows/alhangeul-windows-smoke.yml'));
  assert.equal(ci.on.workflow_dispatch.inputs.thumbnail_same_version_upgrade.default, false);
  assert.equal(artifacts.on.workflow_call.inputs.thumbnail_same_version_upgrade.default, false);
  assert.equal(smoke.on.workflow_call.inputs.thumbnail_same_version_upgrade.default, false);
  assert.match(ci.jobs.artifacts.with.thumbnail_same_version_upgrade, /inputs.thumbnail_same_version_upgrade/);
  assert.match(artifacts.jobs.smoke.with.thumbnail_same_version_upgrade, /inputs.thumbnail_same_version_upgrade/);
  const job = smoke.jobs['windows-standard-user'];
  assert.equal(job.if, undefined);
  assert.equal(job.steps.find(row => row.name === 'Verify standard user install thumbnails and lifecycle').if, undefined);
  for (const name of ['Verify public same-version manual upgrade', 'Evaluate same-version upgrade evidence']) {
    assert.match(job.steps.find(row => row.name === name).if, /inputs.thumbnail_same_version_upgrade/);
  }
});
