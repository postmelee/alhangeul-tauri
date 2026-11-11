import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readUpgradeInputs } from './gui/production-upgrade/inputs.ts';
import { join } from 'node:path';
import test from 'node:test';
import { validateInputs, productionInputsPath, digest, MANIFEST_HASH } from '../scripts/updater/production-contract.mjs';
import { validateApply, validateVerify, validateWindowsInstallation } from '../scripts/updater/production-evidence.mjs';
import { buildUpdaterManifest, serializeUpdaterManifest } from '../scripts/updater/manifest.mjs';

const spec = JSON.parse(await readFile(new URL('gui/production-upgrade-v0.1.3-inputs.json', import.meta.url)));
const legacy = JSON.parse(await readFile(new URL('gui/production-upgrade-v0.1.2-inputs.json', import.meta.url)));
// 실제 0.1.2→0.1.3 검증에 사용할 최초 공개 피드 입력을 보존한다.
const release = JSON.parse(await readFile(new URL('fixtures/production-upgrade-v013-release.json', import.meta.url)));
const clone = value => structuredClone(value);
test('new public tuple preserves legacy manifest and inputs', () => {
  for (const kind of ['nsis', 'msi', 'appimage']) { validateInputs(spec, kind); validateInputs(legacy, kind); }
  assert.notEqual(legacy.manifestSha256, spec.manifestSha256);
  assert.equal(digest(serializeUpdaterManifest(buildUpdaterManifest(release), release)), spec.manifestSha256);
  assert.deepEqual(spec.releases.n, legacy.releases.next);
});
for (const [label, mutate] of Object.entries({
  oldManifest: s => { s.manifestSha256 = MANIFEST_HASH; },
  wrongSource: s => { s.releases.next.sourceSha = s.releases.n.sourceSha; },
  wrongRelease: s => { s.releases.next.releaseId += 1; },
  wrongVersion: s => { s.releases.n.version = '0.1.0'; },
  wrongEndpoint: s => { s.endpoint = 'https://example.com'; },
  wrongKey: s => { s.keyFingerprint = '0'.repeat(64); },
})) test(`new tuple rejects ${label}`, () => {
  const value = clone(spec); mutate(value); assert.throws(() => validateInputs(value, 'msi'));
});
test('input selector accepts the recorded relative files', () => {
  for (const file of ['production-upgrade-inputs.json', 'production-upgrade-v0.1.2-inputs.json', 'production-upgrade-v0.1.3-inputs.json']) {
    assert.equal(productionInputsPath('/tmp/harness', `tests/gui/${file}`), join('/tmp/harness/tests/gui', file));
  }
  for (const path of ['/tmp/other.json', '../input.json', 'tests/gui/other.json']) assert.throws(() => productionInputsPath('/tmp/harness', path));
});
function applied(kind) {
  const target = kind === 'appimage' ? 'linux-x86_64-appimage' : `windows-x86_64-${kind}`;
  const snapshot = { status: 'available', currentVersion: '0.1.2', availableVersion: '0.1.3', target: { target, artifactKind: kind }, failure: null };
  return { kind, phase: 'apply', status: 'passed', startup: { ...snapshot, trigger: 'startup' }, manual: { ...snapshot, trigger: 'manual' }, dirty: { blocker: 'dirtyDocuments', status: 'available' }, consent: 'download-and-install-ui', manifestVerified: true, manifestSha256: spec.manifestSha256, installed: { status: 'restartRequired' }, restartRequested: true, restart: { observed: true, previous: { pid: 123, executable: '/tmp/.mount_old/usr/bin/alhangeul' }, current: { pid: 456, executable: '/tmp/.mount_new/usr/bin/alhangeul' } }, installObserved: true, requiresInstalledVersionVerification: true, transportClosed: 'invalid session id', windowsHandoff: { status: 'transportClosed', startedAt: '2026-10-09T00:00:00Z', closedAt: '2026-10-09T00:00:01Z', closureSource: 'state-poll', transitions: [] } };
}
function verified(kind) {
  return { kind, phase: 'verify', manifestVerified: true, manifestSha256: spec.manifestSha256, status: 'passed', noUpdate: { status: 'idle', currentVersion: '0.1.3', availableVersion: null, failure: null, blocker: null }, productVersion: 'Alhangeul 0.1.3', settingsPreserved: true, documents: ['hwp', 'hwpx'].map(format => ({ format, pageCount: 1, unchanged: true, canvasReady: true })) };
}
for (const kind of ['nsis', 'msi', 'appimage']) test(`${kind}: legacy evidence cannot satisfy 0.1.3 acceptance`, () => {
  validateApply(applied(kind), kind, spec); validateVerify(verified(kind), kind, spec);
  const oldApply = applied(kind); oldApply.startup.currentVersion = '0.1.0';
  assert.throws(() => validateApply(oldApply, kind, spec));
  const oldVerify = verified(kind); oldVerify.noUpdate.currentVersion = '0.1.2';
  assert.throws(() => validateVerify(oldVerify, kind, spec));
  const missingDirty = applied(kind); delete missingDirty.dirty;
  assert.throws(() => validateApply(missingDirty, kind, spec));
  const missingDocs = verified(kind); missingDocs.documents.pop();
  assert.throws(() => validateVerify(missingDocs, kind, spec));
});
test('0.1.3 Windows version accepts exact executable resources and rejects reboot or suffix drift', () => {
  const value = { Status: 'passed', Kind: 'msi', DefaultsPreserved: true, Product: { Entry: { DisplayVersion: '0.1.3' }, Version: { ProductVersion: '0.1.3.0', FileVersion: '0.1.3' }, Handlers: [{ Extension: '.hwp', Valid: true }, { Extension: '.hwpx', Valid: true }] } };
  validateWindowsInstallation(value, 'msi', spec);
  for (const change of [v => { v.ExitCode = 3010; }, v => { v.Product.Version.ProductVersion = '0.1.30'; }]) {
    const bad = clone(value); change(bad); assert.throws(() => validateWindowsInstallation(bad, 'msi', spec));
  }
});

test('GUI reads the selected 0.1.2 to 0.1.3 versions', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const value = readUpgradeInputs({ ALHANGEUL_PRODUCTION_ROOT: root, ALHANGEUL_PRODUCTION_KIND: 'msi', ALHANGEUL_PRODUCTION_PHASE: 'apply', ALHANGEUL_PRODUCTION_APP: join(root, 'app'), ALHANGEUL_PRODUCTION_DRIVER: join(root, 'driver'), ALHANGEUL_PRODUCTION_OUTPUT: join(root, 'output'), ALHANGEUL_PRODUCTION_INPUTS: 'tests/gui/production-upgrade-v0.1.3-inputs.json' });
  assert.equal(value.fromVersion, '0.1.2'); assert.equal(value.toVersion, '0.1.3');
  assert.equal(value.manifestHash, spec.manifestSha256);
});
