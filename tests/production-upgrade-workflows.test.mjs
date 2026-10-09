import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';
const read = name => readFile(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8');
const desktop = parse(await read('alhangeul-desktop.yml'));
const windows = parse(await read('alhangeul-production-upgrade-windows.yml'));
const linux = parse(await read('alhangeul-production-upgrade-linux.yml'));

test('production mode uses registered dispatcher and cannot publish products', () => {
  assert.ok(desktop.on.workflow_dispatch.inputs.mode.options.includes('production-upgrade-check'));
  for (const os of ['windows', 'linux']) {
    const job = desktop.jobs[`production-upgrade-${os}`];
    const target = os === 'windows' ? 'windows-x64' : 'linux-x64';
    assert.equal(job.if, `\${{ inputs.mode == 'production-upgrade-check' && !inputs.publish_release && (inputs.production_upgrade_platform == 'all' || inputs.production_upgrade_platform == '${target}') }}`);
    assert.deepEqual(job.permissions, { contents: 'read' });
    assert.equal(job.uses, `./.github/workflows/alhangeul-production-upgrade-${os}.yml`);
  }
});
test('production validation uses two clean Windows formats and writable original FUSE AppImage', () => {
  assert.deepEqual(windows.jobs.windows.strategy.matrix.kind, ['nsis', 'msi']);
  assert.equal(windows.jobs.windows['runs-on'], 'windows-2025');
  assert.equal(linux.jobs.linux['runs-on'], 'ubuntu-22.04');
  const steps = linux.jobs.linux.steps;
  assert.ok(steps.some(s => s.run?.includes('test -c /dev/fuse')));
  assert.ok(steps.some(s => s.run?.includes('test -w "$APPIMAGE_PATH"')));
  assert.ok(steps.some(s => s.run?.includes('actual_sha') && s.run.includes('NEXT_SHA256')));
  assert.ok(!JSON.stringify(steps).includes('--appimage-extract'));
  assert.ok(steps.some(s => s.run?.includes('production-upgrade.mjs stop appimage')));
});
test('both workflows pin source and require complete evidence after new version verification', () => {
  for (const workflow of [windows, linux]) {
    assert.deepEqual(workflow.permissions, { contents: 'read' });
    assert.ok(workflow.on.workflow_call !== undefined || Object.hasOwn(workflow.on, 'workflow_call'));
    const job = Object.values(workflow.jobs)[0];
    assert.equal(job.env.HARNESS_SHA, '${{ github.workflow_sha }}');
    const steps = job.steps;
    assert.ok(steps.some(s => s.with?.ref === '${{ github.workflow_sha }}'));
    assert.ok(steps.some(s => s.run?.includes('git rev-parse HEAD') && s.run.includes('HARNESS_SHA')));
    const prepare = steps.findIndex(s => s.run?.includes('production-upgrade.mjs prepare'));
    const apply = steps.findIndex(s => s.env?.ALHANGEUL_PRODUCTION_PHASE === 'apply');
    const verify = steps.findIndex(s => s.env?.ALHANGEUL_PRODUCTION_PHASE === 'verify');
    const accepted = steps.findIndex(s => s.run?.includes('production-upgrade.mjs finalize'));
    assert.ok(prepare >= 0 && prepare < apply && apply < verify && verify < accepted);
    assert.ok(steps.some(s => s.if === '${{ always() }}' && s.uses?.startsWith('actions/upload-artifact@')));
    assert.ok(!steps.some(s => s.run?.includes('tauri build') || s.run?.includes('gh release edit')));
  }
});
test('Windows driver close is provisional until install and document evidence pass', () => {
  const steps = windows.jobs.windows.steps;
  assert.equal(steps.find(s => s.id === 'apply')['continue-on-error'], true);
  const validate = steps.find(s => s.id === 'validate');
  assert.ok(validate.run.includes('-ExpectedVersion \'0.1.2\''));
  assert.ok(steps.some(s => s.run?.includes('production-upgrade.mjs finalize')));
  assert.ok(steps.some(s => s.id === 'cleanup' && s.if === '${{ always() }}'));
  assert.ok(steps.some(s => s.id === 'restore' && s.if === '${{ always() }}'));
});


test('production platform selection reruns Windows alone and preserves other modes', () => {
  const choice = desktop.on.workflow_dispatch.inputs.production_upgrade_platform;
  assert.equal(choice.default, 'all'); assert.deepEqual(choice.options, ['all', 'windows-x64', 'linux-x64']);
  const selected = inputs => ['windows', 'linux'].filter(os => {
    const expression = desktop.jobs[`production-upgrade-${os}`].if.slice(3, -2).trim();
    return Function('inputs', `return (${expression});`)(inputs);
  });
  for (const [platform, expected] of [['all', ['windows', 'linux']], ['windows-x64', ['windows']], ['linux-x64', ['linux']]]) {
    const inputs = { mode: 'production-upgrade-check', publish_release: false, production_upgrade_platform: platform };
    assert.deepEqual(selected(inputs), expected);
    assert.deepEqual(selected({ ...inputs, publish_release: true }), []);
    assert.deepEqual(selected({ ...inputs, mode: 'artifact' }), []);
  }
});

test('Windows incomplete apply evidence stops before ten-minute installer wait', () => {
  const steps = windows.jobs.windows.steps;
  const applied = steps.findIndex(s => s.id === 'apply');
  const gate = steps.findIndex(s => s.run?.includes('production-upgrade.mjs require-apply'));
  const validate = steps.findIndex(s => s.id === 'validate');
  assert.ok(applied >= 0 && applied < gate && gate < validate);
  assert.notEqual(steps[gate]['continue-on-error'], true);
  assert.ok(steps[gate].run.includes('if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }'));
  assert.notEqual(steps[validate].if, '${{ always() }}');
});
