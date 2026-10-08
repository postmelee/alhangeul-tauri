import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile, appendFile, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, validateInputs, validateConfig, productionInputsPath } from './production-contract.mjs';
import { verifyRelease, downloadRelease, fetchBytes } from './production-download.mjs';
import { validateApply, validateVerify, validateWindowsInstallation } from './production-evidence.mjs';
import { stopRestartedAppImage } from './production-process.mjs';
import { validateUpdaterManifest } from './manifest.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const json = async path => JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''));
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);

async function prepare(kind, output) {
  const spec = await json(productionInputsPath(root));
  const target = validateInputs(spec, kind);
  const key = validateConfig(await json(join(root, 'apps/desktop/src-tauri/tauri.updater.conf.json')), spec);
  await mkdir(output, { recursive: false });
  const evidence = { schemaVersion: 1, kind, target, harnessSha: process.env.HARNESS_SHA, manifestSha256: spec.manifestSha256, status: 'failed', startedAt: new Date().toISOString(), releases: {} };
  assert.match(evidence.harnessSha ?? '', /^[a-f0-9]{40}$/);
  try {
    for (const role of ['n', 'next']) {
      const released = spec.releases[role];
      const source = await verifyRelease(spec, released);
      assert.equal(validateConfig(source.config, spec), key);
      await writeJson(join(output, `${role}-release.json`), source.metadata);
      const entry = await downloadRelease({ spec, release: released, kind, target, root: join(output, role), publicKey: key });
      evidence.releases[role] = { ...released, selected: entry };
    }
    const bytes = await fetchBytes(spec.endpoint);
    assert.equal(digest(bytes), spec.manifestSha256, 'exact public production manifest');
    validateUpdaterManifest(JSON.parse(bytes), await json(join(root, 'site/release.json')));
    await writeFile(join(output, 'production-manifest.json'), bytes);
    evidence.status = 'passed';
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `n_path=${evidence.releases.n.selected.absolutePath}\nnext_sha256=${evidence.releases.next.selected.sha256}\n`);
  } catch (error) { evidence.error = error.message; throw error; }
  finally { evidence.finishedAt = new Date().toISOString(); await writeJson(join(output, 'public-input.json'), evidence); }
}

export async function requireApply(kind, output, expectedHarness = process.env.HARNESS_SHA) {
  const receipt = { kind, harnessSha: expectedHarness, status: 'failed' };
  try {
    assert.match(expectedHarness ?? '', /^[a-f0-9]{40}$/);
    const spec = await json(productionInputsPath(root));
    validateInputs(spec, kind);
    const input = await json(join(output, 'public-input.json'));
    assert.equal(input.status, 'passed'); assert.equal(input.kind, kind);
    assert.equal(input.harnessSha, expectedHarness);
    assert.equal(input.manifestSha256, spec.manifestSha256);
    const applied = await json(join(output, 'apply', 'result.json'));
    assert.equal(applied.harnessSha, expectedHarness);
    validateApply(applied, kind, spec);
    receipt.status = 'passed';
  } catch (error) { receipt.error = error.message; throw error; }
  finally { await writeJson(join(output, 'apply-gate.json'), receipt); }
}

async function finalize(kind, output, appPath) {
  const spec = await json(productionInputsPath(root));
  validateInputs(spec, kind);
  const input = await json(join(output, 'public-input.json'));
  assert.equal(input.status, 'passed');
  assert.equal(input.kind, kind);
  assert.equal(input.manifestSha256, spec.manifestSha256);
  assert.equal(input.harnessSha, process.env.HARNESS_SHA);
  assert.ok(['n', 'next'].every(role => input.releases[role].selected.signatureVerified));
  const apply = await json(join(output, 'apply', 'result.json'));
  const verify = await json(join(output, 'verify', 'result.json'));
  assert.equal(apply.harnessSha, input.harnessSha); assert.equal(verify.harnessSha, input.harnessSha);
  validateApply(apply, kind, spec); validateVerify(verify, kind, spec);
  if (kind === 'appimage') {
    const stopped = await json(join(output, 'restarted-process-shutdown.json'));
    assert.equal(stopped.stopped, true); assert.equal(stopped.pid, apply.restart.current.pid);
    assert.ok(appPath && (await lstat(appPath)).isFile());
    assert.equal(digest(await readFile(appPath)), input.releases.next.selected.sha256, 'real updated AppImage bytes');
  } else validateWindowsInstallation(await json(join(output, 'validate.json')), kind, spec);
  await writeJson(join(output, 'accepted.json'), { status: 'passed', kind, harnessSha: input.harnessSha, from: spec.releases.n.version, to: spec.releases.next.version, productionUpgradeTested: true, acceptedAt: new Date().toISOString() });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [phase, kind, path, appPath, ...extra] = process.argv.slice(2);
  try {
    assert.ok(['prepare', 'require-apply', 'stop', 'finalize'].includes(phase) && path && extra.length === 0, 'upgrade CLI arguments');
    const output = resolve(path);
    if (phase === 'prepare') await prepare(kind, output);
    else if (phase === 'require-apply') await requireApply(kind, output);
    else if (phase === 'stop') { assert.equal(kind, 'appimage'); await stopRestartedAppImage(output); }
    else await finalize(kind, output, appPath);
  } catch (error) { console.error(`Production upgrade ${phase} failed: ${error.message}`); process.exitCode = 1; }
}
