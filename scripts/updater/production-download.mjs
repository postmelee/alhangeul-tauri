import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateBytes, validateMetadata, validateInventory, installerName, INVENTORY } from './production-contract.mjs';
import { verifyUpdaterSignature } from './artifact-verifier.mjs';

export async function fetchBytes(url, api = false) {
  const headers = { 'User-Agent': 'alhangeul-production-upgrade', Accept: api ? 'application/vnd.github+json' : '*/*' };
  if (api && process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(300_000) });
  assert.equal(response.status, 200, `HTTP read-back ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function api(spec, path) {
  return JSON.parse((await fetchBytes(`https://api.github.com/repos/${spec.repository}/${path}`, true)).toString());
}

export async function verifyRelease(spec, release) {
  const metadata = await api(spec, `releases/tags/${release.tag}`);
  validateMetadata(metadata, release);
  const ref = await api(spec, `git/ref/tags/${release.tag}`);
  assert.equal(ref.object.type, 'tag');
  assert.equal(ref.object.sha, release.tagObject, 'immutable annotated tag');
  const tag = await api(spec, `git/tags/${release.tagObject}`);
  assert.equal(tag.object.type, 'commit');
  assert.equal(tag.object.sha, release.sourceSha, 'exact released commit');
  const config = await api(spec, `contents/apps/desktop/src-tauri/tauri.updater.conf.json?ref=${release.sourceSha}`);
  assert.equal(config.encoding, 'base64');
  return { metadata, config: JSON.parse(Buffer.from(config.content, 'base64').toString()) };
}

export async function downloadRelease({ spec, release, kind, target, root, publicKey }) {
  const asset = name => {
    const item = release.assets.find(a => a.name === name);
    assert.ok(item, `required asset ${name}`);
    return item;
  };
  const fetchAsset = async name => {
    const item = asset(name); const bytes = await fetchBytes(item.browser_download_url);
    validateBytes(bytes, item); return bytes;
  };
  const sums = (await fetchAsset('SHA256SUMS')).toString();
  const inventoryBytes = await fetchAsset(INVENTORY);
  validateBytes(inventoryBytes, asset(INVENTORY), sums);
  const inventory = validateInventory(JSON.parse(inventoryBytes), release, spec);
  const entry = inventory.targets[target];
  const name = installerName(release, kind);
  const signatureBytes = await fetchAsset(`${name}.sig`);
  const signature = signatureBytes.toString().trim();
  assert.equal(signature, entry.signature);
  validateBytes(signatureBytes, asset(`${name}.sig`), sums);
  const bytes = await fetchAsset(name);
  validateBytes(bytes, asset(name), sums);
  verifyUpdaterSignature(bytes, signature, publicKey);
  const path = join(root, entry.path);
  await mkdir(join(root, 'metadata'), { recursive: true });
  await mkdir(join(root, entry.path, '..'), { recursive: true });
  await writeFile(path, bytes, { flag: 'wx' });
  await writeFile(`${path}.sig`, signatureBytes, { flag: 'wx' });
  await writeFile(join(root, 'metadata', INVENTORY), inventoryBytes);
  await writeFile(join(root, 'metadata', 'SHA256SUMS'), sums);
  return { ...entry, absolutePath: path, signatureVerified: true };
}
