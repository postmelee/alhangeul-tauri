import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { publicKeyFingerprint, UPDATER_TARGETS } from './artifact-verifier.mjs';
import { validateReleaseInventory } from './release-inventory.mjs';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const MANIFEST_HASH = '62fae230339497b132be013ec91df7cd83b710b69c9de4f56ffff1c407463728';
export const INVENTORY = 'alhangeul-updater-release-inventory.json';
export const TARGETS = Object.freeze({ nsis: 'windows-x86_64-nsis', msi: 'windows-x86_64-msi', appimage: 'linux-x86_64-appimage' });
const ENDPOINT = 'https://postmelee.github.io/alhangeul-tauri/updater/stable.json';
const SOURCES = { n: ['0.1.0', 399698591, 'fc3cad15682f35723ab6558d1301e9096f7eec67'], next: ['0.1.1', 402604603, '96e89e900415ee9e1e942b5c01c833dea3415e86'] };

export function validateInputs(spec, kind) {
  assert.equal(spec.schemaVersion, 1);
  assert.equal(spec.repository, 'postmelee/alhangeul-tauri');
  assert.equal(spec.endpoint, ENDPOINT);
  assert.equal(spec.manifestSha256, MANIFEST_HASH);
  assert.equal(spec.keyFingerprint, '9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8');
  assert.ok(Object.hasOwn(TARGETS, kind), 'supported upgrade kind');
  for (const [role, expected] of Object.entries(SOURCES)) {
    const r = spec.releases[role];
    assert.deepEqual([r.version, r.releaseId, r.sourceSha], expected, 'exact released product');
    assert.equal(r.tag, `v${r.version}`);
    assert.match(r.tagObject, /^[a-f0-9]{40}$/);
    assert.equal(r.assets.length, 11);
    assert.equal(new Set(r.assets.map(a => a.name)).size, 11);
    for (const a of r.assets) {
      assert.match(a.name, /^[A-Za-z0-9._-]+$/);
      assert.ok(Number.isSafeInteger(a.id) && a.id > 0 && Number.isSafeInteger(a.size) && a.size > 0);
      assert.match(a.digest, /^sha256:[a-f0-9]{64}$/);
      assert.equal(a.browser_download_url, `https://github.com/${spec.repository}/releases/download/${r.tag}/${a.name}`);
    }
  }
  return TARGETS[kind];
}

export function validateMetadata(actual, expected) {
  assert.equal(actual.id, expected.releaseId);
  assert.equal(actual.tag_name, expected.tag);
  assert.equal(actual.published_at, expected.publishedAt);
  assert.equal(actual.draft, false);
  assert.equal(actual.prerelease, false);
  const select = a => Object.fromEntries(['id', 'name', 'size', 'digest', 'browser_download_url'].map(k => [k, a[k]]));
  const sorted = values => values.map(select).sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(sorted(actual.assets), sorted(expected.assets), 'exact public asset identity');
}

export function validateBytes(bytes, asset, sums = null) {
  assert.equal(bytes.length, asset.size, 'asset size');
  assert.equal(`sha256:${digest(bytes)}`, asset.digest, 'asset API digest');
  if (sums !== null) {
    const rows = sums.trim().split(/\r?\n/).map(line => line.match(/^([a-f0-9]{64})  ([A-Za-z0-9._-]+)$/));
    assert.equal(rows.length, 10, 'complete checksum list');
    assert.ok(rows.every(Boolean), 'valid checksum rows');
    assert.equal(new Set(rows.map(row => row[2])).size, rows.length, 'unique checksums');
    const matches = rows.filter(row => row[2] === asset.name);
    assert.equal(matches.length, 1, 'selected asset checksum');
    assert.equal(matches[0][1], digest(bytes), 'asset checksum');
  }
}

export function validateInventory(inventory, expected, spec) {
  validateReleaseInventory(inventory);
  for (const field of ['sourceSha', 'version', 'tag']) assert.equal(inventory[field], expected[field]);
  assert.equal(inventory.keyFingerprint, spec.keyFingerprint);
  for (const entry of Object.values(inventory.targets)) {
    assert.ok(!/[\\:\r\n]/.test(entry.path) && entry.path.split('/').every(part => part && part !== '.' && part !== '..'), 'safe relative inventory path');
    const asset = expected.assets.find(a => a.name === basename(entry.path));
    assert.ok(asset, 'inventory asset exists');
    assert.equal(entry.size, asset.size);
    assert.equal(`sha256:${entry.sha256}`, asset.digest);
    assert.equal(entry.url, asset.browser_download_url);
  }
  return inventory;
}

export function validateConfig(config, spec) {
  assert.deepEqual(config.plugins.updater.endpoints, [spec.endpoint]);
  assert.equal(publicKeyFingerprint(config.plugins.updater.pubkey), spec.keyFingerprint);
  assert.equal(config.plugins.updater.windows.installMode, 'passive');
  return config.plugins.updater.pubkey;
}

export function installerName(release, kind) {
  return `Alhangeul_${release.version}${UPDATER_TARGETS[TARGETS[kind]].suffix}`;
}
