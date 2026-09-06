import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import test from 'node:test';
import {
  UPDATER_ACCEPTANCE_INVENTORY,
  UPDATER_ACCEPTANCE_MANIFEST,
  UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION,
  UPDATER_ACCEPTANCE_TAG,
  UPDATER_ACCEPTANCE_TITLE,
} from '../scripts/updater/acceptance-policy.mjs';
import {
  buildUpdaterAcceptanceManifest,
  createUpdaterAcceptanceInventory,
} from '../scripts/updater/acceptance-inventory.mjs';
import {
  buildUpdaterAcceptanceScenarioManifest,
  UPDATER_ACCEPTANCE_SCENARIOS,
} from '../scripts/updater/acceptance-scenario.mjs';
import { verifyUpdaterAcceptanceRelease } from '../scripts/updater/verify-acceptance-release.mjs';
import {
  validateUpdaterSignatureEncoding,
  verifyUpdaterSignature,
} from '../scripts/updater/artifact-verifier.mjs';

const SOURCE_SHA = 'b'.repeat(40);
const SOURCE_TIMESTAMP = '2026-08-30T01:02:03.000Z';

test('test prerelease read-back은 exact tag·commit·8개 asset digest와 내용을 검증한다', async () => {
  const fixture = await createFixture();
  try {
    const { assets, release } = await createReleaseFixture(fixture);
    const result = await verifyUpdaterAcceptanceRelease(
      { repository: 'postmelee/alhangeul-tauri', candidateSha: SOURCE_SHA },
      { fetchApi: mockReleaseApi(release, assets) },
    );
    assert.equal(result.releaseId, 1234);
    assert.equal(result.candidateSha, SOURCE_SHA);
    assert.equal(result.manifestVersion, UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION);
    assert.equal(result.assets.length, 8);
  } finally {
    await fixture.cleanup();
  }
});

test('negative prerelease read-back은 승인된 scenario manifest와 digest만 허용한다', async () => {
  const fixture = await createFixture();
  try {
    const base = await createReleaseFixture(fixture);
    for (const scenario of UPDATER_ACCEPTANCE_SCENARIOS) {
      const manifest = buildUpdaterAcceptanceScenarioManifest(
        base.inventory,
        base.manifest,
        scenario,
      );
      const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
      const assets = new Map(base.assets);
      const previous = assets.get(UPDATER_ACCEPTANCE_MANIFEST);
      assets.set(
        UPDATER_ACCEPTANCE_MANIFEST,
        releaseAsset(UPDATER_ACCEPTANCE_MANIFEST, bytes, previous.id),
      );
      const release = { ...base.release, assets: [...assets.values()].map(publicAsset) };
      const digest = createHash('sha256').update(bytes).digest('hex');
      const result = await verifyUpdaterAcceptanceRelease(
        {
          repository: 'postmelee/alhangeul-tauri',
          candidateSha: SOURCE_SHA,
          scenario,
          expectedManifestSha256: digest,
        },
        { fetchApi: mockReleaseApi(release, assets) },
      );
      assert.equal(result.scenario, scenario);
      assert.equal(result.manifestSha256, digest);
      await assert.rejects(
        verifyUpdaterAcceptanceRelease(
          {
            repository: 'postmelee/alhangeul-tauri',
            candidateSha: SOURCE_SHA,
            scenario,
            expectedManifestSha256: '0'.repeat(64),
          },
          { fetchApi: mockReleaseApi(release, assets) },
        ),
        /scenario manifest digest/,
      );
    }
  } finally {
    await fixture.cleanup();
  }
});

test('test prerelease read-back은 extra asset과 digest 불일치를 거부한다', async () => {
  const fixture = await createFixture();
  try {
    const { assets, release } = await createReleaseFixture(fixture);
    await assert.rejects(
      verifyUpdaterAcceptanceRelease(
        { repository: 'postmelee/alhangeul-tauri', candidateSha: SOURCE_SHA },
        {
          fetchApi: mockReleaseApi({
            ...release,
            assets: [...release.assets, publicAsset(releaseAsset('unexpected.txt', Buffer.from('extra'), 99))],
          }, assets),
        },
      ),
      /8개 asset/,
    );

    const tampered = new Map(assets);
    const inventoryAsset = tampered.get(UPDATER_ACCEPTANCE_INVENTORY);
    tampered.set(UPDATER_ACCEPTANCE_INVENTORY, {
      ...inventoryAsset,
      digest: `sha256:${'0'.repeat(64)}`,
    });
    await assert.rejects(
      verifyUpdaterAcceptanceRelease(
        { repository: 'postmelee/alhangeul-tauri', candidateSha: SOURCE_SHA },
        {
          fetchApi: mockReleaseApi({
            ...release,
            assets: [...tampered.values()].map(publicAsset),
          }, tampered),
        },
      ),
      /digest/,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('signature mismatch fixture는 algorithm과 key ID를 보존하고 실제 서명 검증만 실패한다', async () => {
  const fixture = await createFixture();
  try {
    const base = await createReleaseFixture(fixture);
    const manifest = buildUpdaterAcceptanceScenarioManifest(base.inventory, base.manifest, 'signature-mismatch');
    for (const [target, entry] of Object.entries(base.inventory.targets)) {
      const signature = manifest.platforms[target].signature;
      assert.doesNotThrow(() => validateUpdaterSignatureEncoding(signature));
      const packet = (value) => Buffer.from(Buffer.from(value, 'base64').toString('utf8').split('\n')[1], 'base64');
      assert.deepEqual(packet(signature).subarray(0, 10), packet(entry.signature).subarray(0, 10));
      const bytes = await readFile(join(fixture.root, entry.path));
      assert.throws(() => verifyUpdaterSignature(bytes, signature, fixture.publicKey), /installer bytes와 일치하지/);
    }
  } finally {
    await fixture.cleanup();
  }
});

async function createFixture() {
  const tmp = await mkdtemp(join(tmpdir(), 'alhangeul-updater-release-'));
  const root = join(tmp, 'artifacts');
  const keys = createKeys();
  const version = UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION;
  const paths = [
    join(root, 'nsis', `Alhangeul_${version}_x64-setup.exe`),
    join(root, 'msi', `Alhangeul_${version}_x64_en-US.msi`),
    join(root, 'appimage', `Alhangeul_${version}_amd64.AppImage`),
  ];
  for (const [index, path] of paths.entries()) {
    await mkdir(join(path, '..'), { recursive: true });
    const bytes = Buffer.from(`signed acceptance release fixture:${index}`);
    await writeFile(path, bytes);
    await writeFile(`${path}.sig`, minisign(bytes, keys.privateKey, keys.keyId, `${index}`));
  }
  return {
    root,
    publicKey: keys.encodedPublicKey,
    cleanup: () => rm(tmp, { recursive: true, force: true }),
  };
}

async function createReleaseFixture(fixture) {
  const inventory = await createUpdaterAcceptanceInventory({
    root: fixture.root,
    role: 'n-plus-one',
    sourceSha: SOURCE_SHA,
    publicKey: fixture.publicKey,
  });
  const manifest = buildUpdaterAcceptanceManifest(inventory, SOURCE_TIMESTAMP);
  const assets = new Map();
  let id = 1;
  for (const entry of Object.values(inventory.targets)) {
    const artifactPath = join(fixture.root, entry.path);
    const installer = await readFile(artifactPath);
    const signature = await readFile(`${artifactPath}.sig`);
    assets.set(basename(entry.path), releaseAsset(basename(entry.path), installer, id, entry.url));
    id += 1;
    assets.set(`${basename(entry.path)}.sig`, releaseAsset(`${basename(entry.path)}.sig`, signature, id));
    id += 1;
  }
  assets.set(UPDATER_ACCEPTANCE_INVENTORY, releaseAsset(
    UPDATER_ACCEPTANCE_INVENTORY,
    Buffer.from(`${JSON.stringify(inventory, null, 2)}\n`),
    id,
  ));
  assets.set(UPDATER_ACCEPTANCE_MANIFEST, releaseAsset(
    UPDATER_ACCEPTANCE_MANIFEST,
    Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
    id + 1,
  ));
  return {
    inventory,
    manifest,
    assets,
    release: {
      id: 1234,
      tag_name: UPDATER_ACCEPTANCE_TAG,
      name: UPDATER_ACCEPTANCE_TITLE,
      draft: false,
      prerelease: true,
      target_commitish: SOURCE_SHA,
      published_at: SOURCE_TIMESTAMP,
      assets: [...assets.values()].map(publicAsset),
    },
  };
}

function releaseAsset(name, bytes, id, browserDownloadUrl = undefined) {
  return {
    id,
    name,
    size: bytes.length,
    digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    state: 'uploaded',
    url: `https://api.github.test/assets/${id}`,
    browser_download_url: browserDownloadUrl ?? `https://downloads.github.test/${name}`,
    bytes,
  };
}

function publicAsset({ bytes: _bytes, ...asset }) { return asset; }

function mockReleaseApi(release, assets) {
  const bytesByUrl = new Map([...assets.values()].map((asset) => [asset.browser_download_url, asset.bytes]));
  return async (path, options = {}) => {
    if (path.includes('/releases/tags/')) return release;
    if (path.includes('/git/ref/tags/')) return { object: { type: 'commit', sha: SOURCE_SHA } };
    if (options.raw && bytesByUrl.has(path)) return bytesByUrl.get(path);
    throw new Error(`unexpected mock API request: ${path}`);
  };
}

function createKeys() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const keyId = Buffer.from('1112131415161718', 'hex');
  const packet = Buffer.concat([
    Buffer.from('Ed'),
    keyId,
    publicKey.export({ format: 'der', type: 'spki' }).subarray(-32),
  ]);
  const encodedPublicKey = Buffer.from(
    `untrusted comment: minisign public key\n${packet.toString('base64')}\n`,
  ).toString('base64');
  return { privateKey, keyId, encodedPublicKey };
}

function minisign(bytes, privateKey, keyId, name) {
  const signature = sign(null, createHash('blake2b512').update(bytes).digest(), privateKey);
  const trustedComment = `timestamp:1788048000 file:${name} prehashed`;
  const globalSignature = sign(
    null,
    Buffer.concat([signature, Buffer.from(trustedComment)]),
    privateKey,
  );
  return Buffer.from([
    'untrusted comment: signature from minisign secret key',
    Buffer.concat([Buffer.from('ED'), keyId, signature]).toString('base64'),
    `trusted comment: ${trustedComment}`,
    globalSignature.toString('base64'),
    '',
  ].join('\n')).toString('base64');
}
