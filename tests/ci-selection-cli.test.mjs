import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('../scripts/ci/select.mjs', import.meta.url));
function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'ci-selector-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.name', 'CI fixture');
  git('config', 'user.email', 'ci@example.invalid');
  const put = (path, content) => {
    mkdirSync(join(cwd, path, '..'), { recursive: true });
    writeFileSync(join(cwd, path), content);
  };
  put('docs/example.md', 'initial\n');
  put('apps/thumbnail-worker/src/lib.rs', '// fixture\n');
  put('scripts/windows-installer-smoke.ps1', '# fixture\n');
  git('add', '.'); git('commit', '-qm', 'base');
  return { cwd, git, put, base: git('rev-parse', 'HEAD') };
}
function select(f, env = {}) {
  const output = join(f.cwd, 'outputs');
  const result = spawnSync(process.execPath, [script], {
    cwd: f.cwd, encoding: 'utf8',
    env: { ...process.env, VALIDATION_PROFILE: 'auto', BASE_SHA: f.base,
      PRODUCT_SHA: '', PRODUCT_RUN_ID: '', PRODUCT_ARTIFACT_ID: '', PRODUCT_ARTIFACT_DIGEST: '',
      GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: join(f.cwd, 'summary'), ...env },
  });
  if (result.status !== 0) return { status: result.status, error: result.stderr };
  const selection = JSON.parse(result.stdout);
  assert.ok(readFileSync(output, 'utf8').includes(`profile=${selection.profile}\n`));
  return { status: 0, ...selection };
}
function commit(f) { f.git('add', '.'); f.git('commit', '-qm', 'change'); }

test('CLI selects docs from real exact-commit diff, then expands on absent/unknown base', (t) => {
  const f = fixture(t); f.put('docs/example.md', 'updated\n'); commit(f);
  assert.equal(select(f).profile, 'fast');
  for (const base of ['', 'main', 'f'.repeat(40)]) assert.equal(select(f, { BASE_SHA: base }).profile, 'full');
  assert.equal(select(f, { BASE_SHA: f.git('rev-parse', 'HEAD') }).profile, 'full');
});
test('a rename out of native sources retains the deleted endpoint in scope', (t) => {
  const f = fixture(t);
  f.git('mv', 'apps/thumbnail-worker/src/lib.rs', 'docs/old-worker.md'); commit(f);
  assert.equal(select(f).profile, 'windows-package');
});
test('deleted Linux product paths select Linux even when no file remains', (t) => {
  const f = fixture(t); f.put('apps/linux-thumbnailer/Cargo.toml', '# fixture\n'); commit(f);
  f.base = f.git('rev-parse', 'HEAD');
  f.git('rm', 'apps/linux-thumbnailer/Cargo.toml'); commit(f);
  assert.equal(select(f).profile, 'linux-package');
});
test('automatic harness reuse requires all exact product inputs, otherwise rebuilds Windows', (t) => {
  const f = fixture(t); f.put('scripts/windows-installer-smoke.ps1', '# changed\n'); commit(f);
  const inputs = { PRODUCT_SHA: 'a'.repeat(40), PRODUCT_RUN_ID: '12', PRODUCT_ARTIFACT_ID: '42', PRODUCT_ARTIFACT_DIGEST: `sha256:${'b'.repeat(64)}` };
  assert.equal(select(f, inputs).profile, 'installer');
  for (const key of Object.keys(inputs)) assert.equal(select(f, { ...inputs, [key]: '' }).profile, 'windows-package');
});
test('explicit profiles stay explicit and unsupported profiles fail', (t) => {
  const f = fixture(t);
  for (const profile of ['fast', 'native', 'installer', 'windows-package', 'linux-package', 'full']) {
    assert.equal(select(f, { VALIDATION_PROFILE: profile }).profile, profile);
  }
  const invalid = select(f, { VALIDATION_PROFILE: 'invalid\nprofile=fast' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.error, /Unknown CI profile/);
});
