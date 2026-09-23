import assert from 'node:assert/strict';
import {
  createHash,
  generateKeyPairSync,
  sign,
} from 'node:crypto';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { UPDATER_ENDPOINT } from '../scripts/pages/release-data.mjs';
import {
  buildUpdaterManifest,
  serializeUpdaterManifest,
} from '../scripts/updater/manifest.mjs';
import {
  createReleaseInventory,
  validateReleaseInventory,
  verifyUpdaterArtifacts,
} from '../scripts/updater/release-inventory.mjs';

const VERSION = '0.2.0';
const TAG = `v${VERSION}`;
const SOURCE_SHA = 'a'.repeat(40);

test('세 installer와 실제 Minisign 서명으로 deterministic release inventory를 만든다', async () => {
  const fixture = await createFixture();
  try {
    const first = await createReleaseInventory(fixture.options);
    const second = await createReleaseInventory(fixture.options);
    assert.deepEqual(second, first);
    assert.equal(first.sourceSha, SOURCE_SHA);
    assert.deepEqual(Object.keys(first.targets), [
      'windows-x86_64-nsis',
      'windows-x86_64-msi',
      'linux-x86_64-appimage',
    ]);
    for (const entry of Object.values(first.targets)) {
      assert.match(entry.sha256, /^[0-9a-f]{64}$/);
      assert.match(entry.url, new RegExp(`/releases/download/${TAG}/`));
      assert.ok(entry.signature.length > 100);
    }
  } finally {
    await fixture.cleanup();
  }
});

for (const [name, mutate, expected] of [
  ['누락 signature', async (fixture) => rm(`${fixture.paths.nsis}.sig`), /signature cardinality/],
  ['빈 installer', async (fixture) => writeFile(fixture.paths.msi, ''), /installer가 비어/],
  [
    'MSI locale 파일명 drift',
    async (fixture) => {
      const drifted = fixture.paths.msi.replace('_en-US.msi', '_fr-FR.msi');
      await rename(fixture.paths.msi, drifted);
      await rename(`${fixture.paths.msi}.sig`, `${drifted}.sig`);
    },
    /installer cardinality/,
  ],
  ['남는 signature', async (fixture) => writeFile(join(fixture.root, 'orphan.sig'), 'x'), /대응 installer가 없는/],
  [
    'signature swap',
    async (fixture) => writeFile(
      `${fixture.paths.nsis}.sig`,
      await readFile(`${fixture.paths.appimage}.sig`, 'utf8'),
    ),
    /installer bytes와 일치하지 않습니다/,
  ],
  ['private-key-like file', async (fixture) => writeFile(join(fixture.root, 'private-key.pem'), 'x'), /private-key-like/],
]) {
  test(`updater artifact verifier는 ${name}을 거부한다`, async () => {
    const fixture = await createFixture();
    try {
      await mutate(fixture);
      await assert.rejects(createReleaseInventory(fixture.options), expected);
    } finally {
      await fixture.cleanup();
    }
  });
}

test('target slice verifier는 지정된 target만 검사하고 중복·unknown target을 거부한다', async () => {
  const fixture = await createFixture();
  try {
    await assert.rejects(
      verifyUpdaterArtifacts({ ...fixture.options, targets: ['unknown'] }),
      /target 목록/,
    );
    await assert.rejects(
      verifyUpdaterArtifacts({
        ...fixture.options,
        targets: ['windows-x86_64-nsis', 'windows-x86_64-nsis'],
      }),
      /target 목록/,
    );
    await rm(join(fixture.root, 'msi'), { recursive: true });
    await rm(join(fixture.root, 'appimage'), { recursive: true });
    const result = await verifyUpdaterArtifacts({
      ...fixture.options,
      targets: ['windows-x86_64-nsis'],
    });
    assert.deepEqual(Object.keys(result.targets), ['windows-x86_64-nsis']);
  } finally {
    await fixture.cleanup();
  }
});

for (const [name, mutate, expected] of [
  ['prerelease version', (value) => { value.version = '0.2.0-rc.1'; }, /stable semantic version/],
  ['wrong tag', (value) => { value.tag = 'v0.1.9'; }, /tag가 version/],
  ['mutable URL', (value) => { value.targets['windows-x86_64-nsis'].url = value.targets['windows-x86_64-nsis'].url.replace(TAG, 'latest'); }, /exact release URL/],
  ['wrong repository', (value) => { value.repository = 'example/alhangeul'; }, /repository/],
  ['MSI와 NSIS 교차', (value) => { value.targets['windows-x86_64-msi'].path = value.targets['windows-x86_64-nsis'].path; }, /kind 또는 path/],
  ['MSI locale drift', (value) => { value.targets['windows-x86_64-msi'].path = value.targets['windows-x86_64-msi'].path.replace('_en-US', '_fr-FR'); }, /kind 또는 path/],
  ['AppImage suffix drift', (value) => { value.targets['linux-x86_64-appimage'].path += '.tar.gz'; }, /kind 또는 path/],
  ['partial target', (value) => { delete value.targets['windows-x86_64-msi']; }, /targets key/],
]) {
  test(`release inventory validator는 ${name}을 거부한다`, async () => {
    const fixture = await createFixture();
    try {
      const inventory = structuredClone(await createReleaseInventory(fixture.options));
      mutate(inventory);
      assert.throws(() => validateReleaseInventory(inventory), expected);
    } finally {
      await fixture.cleanup();
    }
  });
}

test('manifest는 complete inventory signature를 deterministic JSON으로 투영한다', async () => {
  const fixture = await createFixture();
  try {
    const inventory = await createReleaseInventory(fixture.options);
    const release = publishedRelease(inventory);
    const manifest = buildUpdaterManifest(release);
    const serialized = serializeUpdaterManifest(manifest, release);
    assert.equal(serialized, serializeUpdaterManifest(buildUpdaterManifest(release), release));
    for (const [target, entry] of Object.entries(inventory.targets)) {
      assert.equal(manifest.platforms[target].signature, entry.signature);
      assert.equal(manifest.platforms[target].url, entry.url);
    }
    const partial = structuredClone(release);
    delete partial.updater.inventory.targets['windows-x86_64-msi'];
    assert.throws(() => buildUpdaterManifest(partial), /targets key/);
  } finally {
    await fixture.cleanup();
  }
});

function publishedRelease(inventory) {
  return {
    status: 'published',
    channel: 'stable',
    version: VERSION,
    tag: TAG,
    publishedAt: '2026-08-30T00:00:00.000Z',
    notes: 'Updater release fixture',
    downloads: Object.fromEntries(
      Object.entries(inventory.targets).map(([target, entry]) => [target, entry.url]),
    ),
    updater: { endpoint: UPDATER_ENDPOINT, manifestPublished: true, inventory },
  };
}

async function createFixture() {
  const tmp = await mkdtemp(join(tmpdir(), 'alhangeul-updater-'));
  const root = join(tmp, 'artifacts');
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const keyId = Buffer.from('0102030405060708', 'hex');
  const rawPublicKey = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  const publicPacket = Buffer.concat([Buffer.from('Ed'), keyId, rawPublicKey]);
  const encodedPublicKey = Buffer.from(
    `untrusted comment: minisign public key\n${publicPacket.toString('base64')}\n`,
  ).toString('base64');
  const paths = {
    nsis: join(root, 'nsis', `Alhangeul_${VERSION}_x64-setup.exe`),
    msi: join(root, 'msi', `Alhangeul_${VERSION}_x64_en-US.msi`),
    appimage: join(root, 'appimage', `Alhangeul_${VERSION}_amd64.AppImage`),
  };
  for (const [kind, path] of Object.entries(paths)) {
    await mkdir(join(path, '..'), { recursive: true });
    const bytes = Buffer.from(`signed updater fixture: ${kind}`);
    await writeFile(path, bytes);
    await chmod(path, 0o700);
    await writeFile(`${path}.sig`, minisign(bytes, privateKey, keyId, kind));
  }
  return {
    tmp,
    root,
    paths,
    publicKey: encodedPublicKey,
    options: { root, version: VERSION, tag: TAG, sourceSha: SOURCE_SHA, publicKey: encodedPublicKey },
    cleanup: () => rm(tmp, { recursive: true, force: true }),
  };
}

function minisign(bytes, privateKey, keyId, name) {
  const signature = sign(null, createHash('blake2b512').update(bytes).digest(), privateKey);
  const packet = Buffer.concat([Buffer.from('ED'), keyId, signature]);
  const trustedComment = `timestamp:1788048000 file:${name} prehashed`;
  const globalSignature = sign(
    null,
    Buffer.concat([signature, Buffer.from(trustedComment)]),
    privateKey,
  );
  const source = [
    'untrusted comment: signature from minisign secret key',
    packet.toString('base64'),
    `trusted comment: ${trustedComment}`,
    globalSignature.toString('base64'),
    '',
  ].join('\n');
  return Buffer.from(source).toString('base64');
}
