import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { requireApply } from '../scripts/updater/production-upgrade.mjs';
import { buildUpdaterManifest, serializeUpdaterManifest } from '../scripts/updater/manifest.mjs';
import test from 'node:test';
import { observeWindowsHandoff, recordWindowsClosure, isWindowsTransportClosed } from './gui/production-upgrade/windows-handoff.ts';
import { captureInstallFailure } from './gui/production-upgrade/install-diagnostics.ts';
import { digest, validateInputs, validateMetadata, validateBytes, validateConfig, validateInventory, installerName, MANIFEST_HASH } from '../scripts/updater/production-contract.mjs';
import { validateApply, validateVerify, validateWindowsInstallation } from '../scripts/updater/production-evidence.mjs';

const spec = JSON.parse(await readFile(new URL('gui/production-upgrade-inputs.json', import.meta.url)));
const config = JSON.parse(await readFile(new URL('../apps/desktop/src-tauri/tauri.updater.conf.json', import.meta.url)));
const clone = value => structuredClone(value);
for (const kind of ['nsis', 'msi', 'appimage']) test(`${kind}: fixed public input uses same format`, () => {
  const target = validateInputs(spec, kind);
  for (const release of Object.values(spec.releases)) assert.ok(release.assets.some(a => a.name === installerName(release, kind)));
  assert.equal(target, kind === 'appimage' ? 'linux-x86_64-appimage' : `windows-x86_64-${kind}`);
});
const inputMutations = {
  endpoint: s => { s.endpoint = 'https://example.com/test'; },
  manifest: s => { s.manifestSha256 = '0'.repeat(64); },
  source: s => { s.releases.n.sourceSha = s.releases.next.sourceSha; },
  version: s => { s.releases.next.version = '99.1.1'; },
  releaseId: s => { s.releases.n.releaseId += 1; },
  assetPath: s => { s.releases.next.assets[0].name = '../bad'; },
  assetHost: s => { s.releases.next.assets[0].browser_download_url = 'https://example.com/file'; },
  key: s => { s.keyFingerprint = '0'.repeat(64); },
  missingAsset: s => { s.releases.n.assets.pop(); },
};
for (const [name, mutate] of Object.entries(inputMutations)) test(`reject ${name} drift`, () => {
  const candidate = clone(spec); mutate(candidate); assert.throws(() => validateInputs(candidate, 'nsis'));
});
test('manual packages and cross architecture are not automatic upgrade targets', () => {
  for (const kind of ['deb', 'rpm', 'arm64', '', 'prototype']) assert.throws(() => validateInputs(spec, kind));
});
test('public metadata rejects replaced asset identity even when name is unchanged', () => {
  const r = spec.releases.n;
  const actual = { id: r.releaseId, tag_name: r.tag, published_at: r.publishedAt, draft: false, prerelease: false, assets: clone(r.assets) };
  validateMetadata(actual, r); actual.assets[0].id += 1;
  assert.throws(() => validateMetadata(actual, r));
});
test('public metadata rejects non-stable channel', () => {
  const r = spec.releases.next;
  for (const field of ['draft', 'prerelease']) assert.throws(() => validateMetadata({ id: r.releaseId, tag_name: r.tag, published_at: r.publishedAt, draft: field === 'draft', prerelease: field === 'prerelease', assets: r.assets }, r));
});
test('checksum rejects malformed duplicate missing and tampered bytes', () => {
  const bytes = Buffer.from('public package bytes');
  const asset = { name: 'one.exe', size: bytes.length, digest: `sha256:${digest(bytes)}` };
  const rows = [`${digest(bytes)}  one.exe`, ...Array.from({ length: 9 }, (_, i) => `${'a'.repeat(64)}  file${i}`)];
  validateBytes(bytes, asset, rows.join('\n'));
  for (const text of [rows.slice(1).join('\n'), [...rows.slice(0, 9), rows[0]].join('\n'), rows.join('\n').replace('  one.exe', ' one.exe')]) assert.throws(() => validateBytes(bytes, asset, text));
  assert.throws(() => validateBytes(Buffer.from('tampered'), asset));
});
test('released key and endpoint are immutable', () => {
  validateConfig(config, spec);
  const modified = clone(config); modified.plugins.updater.endpoints.push(spec.endpoint); assert.throws(() => validateConfig(modified, spec));
  modified.plugins.updater.endpoints = [spec.endpoint]; modified.plugins.updater.pubkey = 'placeholder'; assert.throws(() => validateConfig(modified, spec));
});
function applied(kind) {
  const target = kind === 'appimage' ? 'linux-x86_64-appimage' : `windows-x86_64-${kind}`;
  const snapshot = { status: 'available', currentVersion: '0.1.0', availableVersion: '0.1.1', target: { target, artifactKind: kind }, failure: null };
  return { kind, phase: 'apply', status: 'passed', startup: { ...snapshot, trigger: 'startup' }, manual: { ...snapshot, trigger: 'manual' }, dirty: { blocker: 'dirtyDocuments', status: 'available' }, consent: 'download-and-install-ui', manifestVerified: true, manifestSha256: MANIFEST_HASH, installed: { status: 'restartRequired' }, restartRequested: true, restart: { observed: true, previous: { pid: 123, executable: '/tmp/.mount_old/usr/bin/alhangeul' }, current: { pid: 456, executable: '/tmp/.mount_new/usr/bin/alhangeul' } }, installObserved: true, requiresInstalledVersionVerification: true, transportClosed: 'invalid session id', windowsHandoff: { status: 'transportClosed', startedAt: '2026-10-04T04:00:00.000Z', closedAt: '2026-10-04T04:00:01.000Z', closureSource: 'state-poll', transitions: [] } };
}
function verified(kind) {
  return { kind, phase: 'verify', manifestVerified: true, manifestSha256: MANIFEST_HASH, status: 'passed', noUpdate: { status: 'idle', currentVersion: '0.1.1', availableVersion: null, failure: null, blocker: null }, productVersion: 'Alhangeul 0.1.1', settingsPreserved: true, documents: ['hwp', 'hwpx'].map(format => ({ format, pageCount: 1, unchanged: true, canvasReady: true })) };
}
for (const kind of ['nsis', 'msi', 'appimage']) test(`${kind}: consent dirty protection apply and restart evidence are mandatory`, () => {
  validateApply(applied(kind), kind);
  for (const key of ['startup', 'manual', 'dirty', 'consent', 'manifestVerified', kind === 'appimage' ? 'restartRequested' : 'installObserved']) {
    const bad = applied(kind); delete bad[key]; assert.throws(() => validateApply(bad, kind), key);
  }
  const cross = applied(kind); cross.manual.target.artifactKind = 'deb'; assert.throws(() => validateApply(cross, kind));
});
for (const kind of ['nsis', 'msi', 'appimage']) test(`${kind}: no-update alone cannot satisfy upgrade acceptance`, () => {
  validateVerify(verified(kind), kind);
  for (const key of ['productVersion', 'settingsPreserved', 'documents']) { const bad = verified(kind); delete bad[key]; assert.throws(() => validateVerify(bad, kind)); }
  const failed = verified(kind); failed.noUpdate.failure = { code: 'network' }; assert.throws(() => validateVerify(failed, kind));
  const changed = verified(kind); changed.documents[0].unchanged = false; assert.throws(() => validateVerify(changed, kind));
});
test('Windows rejects reboot incomplete executable version wrong or association loss', () => {
  const value = { Status: 'passed', Kind: 'msi', DefaultsPreserved: true, Product: { Entry: { DisplayVersion: '0.1.1' }, Version: { ProductVersion: '0.1.1.0', FileVersion: '0.1.1' }, Handlers: [{ Extension: '.hwp', Valid: true }, { Extension: '.hwpx', Valid: true }] } };
  validateWindowsInstallation(value, 'msi');
  for (const change of [v => { v.ExitCode = 3010; }, v => { v.Product.Version.ProductVersion = '0.1.10'; }, v => { v.Product.Handlers = []; }, v => { v.DefaultsPreserved = false; }]) {
    const bad = clone(value); change(bad); assert.throws(() => validateWindowsInstallation(bad, 'msi'));
  }
});

const currentData = JSON.parse(await readFile(new URL('../site/release.json', import.meta.url)));
test('production pinned manifest matches the current generated public feed bytes', () => {
  const bytes = serializeUpdaterManifest(buildUpdaterManifest(currentData), currentData);
  assert.equal(digest(bytes), MANIFEST_HASH);
  assert.equal(spec.manifestSha256, digest(bytes));
  const changed = clone(currentData); changed.notes += '\nChanged release guidance';
  assert.notEqual(digest(serializeUpdaterManifest(buildUpdaterManifest(changed), changed)), MANIFEST_HASH);
});
test('signed inventory rejects path traversal and wrong product identity', () => {
  const inventory = currentData.updater.inventory;
  validateInventory(inventory, spec.releases.next, spec);
  const bad = clone(inventory); bad.targets['windows-x86_64-nsis'].path = '../' + bad.targets['windows-x86_64-nsis'].path;
  assert.throws(() => validateInventory(bad, spec.releases.next, spec));
  const source = clone(inventory); source.sourceSha = spec.releases.n.sourceSha;
  assert.throws(() => validateInventory(source, spec.releases.next, spec));
});

test('AppImage restart request alone is not completed restart evidence', () => {
  const missing = applied('appimage'); delete missing.restart; assert.throws(() => validateApply(missing, 'appimage'));
  const same = applied('appimage'); same.restart.current = same.restart.previous; assert.throws(() => validateApply(same, 'appimage'));
});


const harness = 'a'.repeat(40);
async function withApplyGate(kind, mutate, verify) {
  const root = await mkdtemp(join(tmpdir(), 'production-apply-gate-'));
  try {
    const input = { status: 'passed', kind, harnessSha: harness, manifestSha256: MANIFEST_HASH };
    const value = { ...applied(kind), harnessSha: harness };
    mutate(input, value);
    await mkdir(join(root, 'apply'));
    await writeFile(join(root, 'public-input.json'), JSON.stringify(input));
    await writeFile(join(root, 'apply/result.json'), JSON.stringify(value));
    await verify(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}
for (const kind of ['nsis', 'msi']) test(`${kind}: apply gate only admits complete matching harness evidence`, async () => {
  await withApplyGate(kind, () => {}, async root => {
    await requireApply(kind, root, harness);
    assert.equal(JSON.parse(await readFile(join(root, 'apply-gate.json'))).status, 'passed');
  });
});
const incompleteApply = {
  startupFailure: (_input, value) => { value.status = 'failed'; delete value.startup; },
  missingConsent: (_input, value) => { delete value.consent; },
  missingDirty: (_input, value) => { delete value.dirty; },
  missingInstall: (_input, value) => { delete value.installObserved; },
  wrongHarness: (_input, value) => { value.harnessSha = 'b'.repeat(40); },
  wrongKind: (input) => { input.kind = 'msi'; },
  failedPublic: (input) => { input.status = 'failed'; },
};
for (const [name, mutate] of Object.entries(incompleteApply)) test(`apply gate rejects ${name} before installer wait`, async () => {
  await withApplyGate('nsis', mutate, async root => {
    await assert.rejects(requireApply('nsis', root, harness));
    assert.equal(JSON.parse(await readFile(join(root, 'apply-gate.json'))).status, 'failed');
  });
});


test('CLI returns failure for startup failure before installed-version waiting', async () => {
  await withApplyGate('nsis', (_input, value) => { value.status = 'failed'; delete value.startup; }, async root => {
    const cli = fileURLToPath(new URL('../scripts/updater/production-upgrade.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [cli, 'require-apply', 'nsis', root], {
      env: { ...process.env, HARNESS_SHA: harness }, encoding: 'utf8', timeout: 10000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Production upgrade require-apply failed/);
    assert.equal(JSON.parse(await readFile(join(root, 'apply-gate.json'))).status, 'failed');
  });
});


function updaterState(status, failure = null) {
  return { status, failure, trigger: 'manual', currentVersion: '0.1.0', availableVersion: '0.1.1',
    blocker: null, target: { target: 'windows-x86_64-nsis', artifactKind: 'nsis' } };
}

test('Windows keeps observing through download and installing until driver closure', async () => {
  let clock = 0; let reads = 0; const evidence = {};
  await observeWindowsHandoff({ now: () => clock, timeoutMs: 1000,
    readState: async () => {
      if (reads++ === 2) throw new Error('invalid session id: session deleted');
      return updaterState(reads === 1 ? 'downloading' : 'installing');
    }, pause: async ms => { assert.equal(evidence.installObserved, undefined); clock += ms; },
  }, evidence);
  assert.equal(reads, 3);
  assert.deepEqual(evidence.windowsHandoff.transitions.map(t => t.status), ['downloading', 'installing']);
  assert.equal(evidence.windowsHandoff.status, 'transportClosed');
  assert.equal(evidence.windowsHandoff.closureSource, 'state-poll');
  assert.equal(evidence.windowsHandoff.lastSnapshot.status, 'installing');
  assert.equal(evidence.windowsHandoff.closedAt, '1970-01-01T00:00:00.500Z');
  assert.equal(evidence.requiresInstalledVersionVerification, true);
  validateApply({ ...applied('nsis'), ...evidence }, 'nsis');
});

test('Windows installing without closure hits deadline and cannot pass apply gate', async () => {
  let clock = 0; let reads = 0; const evidence = {};
  await assert.rejects(observeWindowsHandoff({ now: () => clock, timeoutMs: 500,
    readState: async () => { reads++; return updaterState('installing'); },
    pause: async ms => { clock += ms; },
  }, evidence), /observation deadline/);
  assert.equal(reads, 2); assert.equal(evidence.installObserved, undefined);
  assert.equal(evidence.windowsHandoff.status, 'failed');
  assert.equal(evidence.installed.status, 'installing');
  assert.throws(() => validateApply({ ...applied('nsis'), ...evidence }, 'nsis'));
});

test('Windows updater error records last failed state instead of accepting handoff', async () => {
  const evidence = {};
  await assert.rejects(observeWindowsHandoff({ readState: async () => updaterState('error', { code: 'install' }),
    pause: async () => assert.fail('must fail immediately'),
  }, evidence), /Updater failed.*install/);
  assert.equal(evidence.windowsHandoff.status, 'failed');
  assert.equal(evidence.windowsHandoff.lastSnapshot.failure.code, 'install');
  assert.equal(evidence.installObserved, undefined);
});

test('Windows unrelated driver/session errors preserve original error and fail', async () => {
  const original = new Error('script timeout while session is active'); const evidence = {};
  await assert.rejects(observeWindowsHandoff({ readState: async () => { throw original; },
    pause: async () => assert.fail('no polling after error'),
  }, evidence), error => error === original);
  assert.equal(evidence.windowsHandoff.status, 'failed');
  assert.equal(evidence.transportClosed, undefined);
});

test('Windows unexpected updater status is rejected without waiting', async () => {
  const evidence = {};
  await assert.rejects(observeWindowsHandoff({ readState: async () => updaterState('idle'),
    pause: async () => assert.fail('no polling after unexpected state'),
  }, evidence), /Unexpected Windows updater state: idle/);
  assert.equal(evidence.windowsHandoff.status, 'failed');
});

test('Windows closure during installation click stays provisional with durable receipt', () => {
  const evidence = {};
  recordWindowsClosure(evidence, new Error('no such window: target window already closed'), 'install-click', () => 1000);
  assert.equal(evidence.windowsHandoff.closureSource, 'install-click');
  assert.equal(evidence.windowsHandoff.closedAt, evidence.windowsHandoff.startedAt);
  assert.equal(evidence.requiresInstalledVersionVerification, true);
  assert.equal(evidence.installed, undefined);
  validateApply({ ...applied('msi'), ...evidence }, 'msi');
});

test('Windows rapid state-poll closure does not require an already observed installing snapshot', async () => {
  const evidence = {};
  await observeWindowsHandoff({ readState: async () => { throw new Error('disconnected: not connected to DevTools'); },
    pause: async () => assert.fail('no polling after closure'),
  }, evidence);
  assert.equal(evidence.windowsHandoff.status, 'transportClosed');
  assert.equal(evidence.windowsHandoff.transitions.length, 0);
  assert.equal(evidence.requiresInstalledVersionVerification, true);
});

test('Windows closure classifier does not turn arbitrary closed/session text into acceptance', () => {
  for (const message of ['invalid session id', 'disconnected: WebView closed', 'no such window', 'ECONNREFUSED', 'ECONNRESET']) {
    assert.equal(isWindowsTransportClosed(new Error(message)), true, message);
  }
  for (const message of ['session timeout', 'permission denied', 'installer log closed', 'script timeout', 'connectionRetryTimeout']) {
    assert.equal(isWindowsTransportClosed(new Error(message)), false, message);
    assert.throws(() => recordWindowsClosure({}, new Error(message), 'state-poll'), new RegExp(message));
  }
});

test('Windows failure diagnostics collect only provided UI and screenshot result', async () => {
  const evidence = {}; const ui = { status: '설치 중', toolbarReady: true, canvasReady: false };
  await captureInstallFailure(evidence, { readState: async () => ui, screenshot: async () => {} });
  assert.deepEqual(evidence.installFailure, { ui, screenshot: 'install-failure.png' });
});

test('Windows disconnected diagnostics do not mask original installation failure', async () => {
  const evidence = {}; const original = new Error('observation deadline');
  await assert.rejects((async () => {
    try { throw original; }
    catch (error) {
      await captureInstallFailure(evidence, { readState: async () => { throw new Error('no such window'); },
        screenshot: async () => { throw new Error('invalid session id'); } });
      throw error;
    }
  })(), error => error === original);
  assert.equal(evidence.installFailure.stateError, 'no such window');
  assert.equal(evidence.installFailure.screenshotError, 'invalid session id');
});

const handoffMutations = {
  installingOnly: v => { delete v.transportClosed; delete v.windowsHandoff; v.installed = updaterState('installing'); },
  noReceipt: v => { delete v.windowsHandoff; },
  noClosure: v => { delete v.transportClosed; },
  observedOnly: v => { v.windowsHandoff.status = 'observing'; },
  failedHandoff: v => { v.windowsHandoff.status = 'failed'; },
  noNativeVerification: v => { delete v.requiresInstalledVersionVerification; },
  invalidTimestamp: v => { v.windowsHandoff.closedAt = 'invalid'; },
  reversedTimestamp: v => { v.windowsHandoff.closedAt = '2026-10-04T03:59:59.000Z'; },
  unknownSource: v => { v.windowsHandoff.closureSource = 'wdio-teardown'; },
  missingTransitions: v => { delete v.windowsHandoff.transitions; },
  updaterFailure: v => { v.windowsHandoff.lastSnapshot = updaterState('error'); },
  snapshotMismatch: v => { v.windowsHandoff.lastSnapshot = updaterState('installing'); },
};
for (const [name, mutate] of Object.entries(handoffMutations)) test(`Windows apply gate rejects ${name} handoff receipt`, async () => {
  await withApplyGate('nsis', (_input, value) => mutate(value), async root => {
    await assert.rejects(requireApply('nsis', root, harness));
    assert.equal(JSON.parse(await readFile(join(root, 'apply-gate.json'))).status, 'failed');
  });
});
