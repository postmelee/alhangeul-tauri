import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { chmod, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import test from 'node:test';
import {
  UPDATER_ACCEPTANCE_ENDPOINT,
  UPDATER_ACCEPTANCE_INVENTORY,
  UPDATER_ACCEPTANCE_MANIFEST,
  UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION,
  UPDATER_ACCEPTANCE_N_VERSION,
  UPDATER_ACCEPTANCE_TAG,
  UPDATER_ACCEPTANCE_TITLE,
  buildUpdaterAcceptanceConfig,
  writeUpdaterAcceptanceConfig,
} from '../scripts/updater/acceptance-policy.mjs';
import {
  buildUpdaterAcceptanceManifest,
  createUpdaterAcceptanceInventory,
  validateUpdaterAcceptanceInventory,
  validateUpdaterAcceptanceManifest,
  verifyUpdaterAcceptanceArtifacts,
} from '../scripts/updater/acceptance-inventory.mjs';
import { validateReleaseInventory } from '../scripts/updater/release-inventory.mjs';

const SOURCE_SHA = 'b'.repeat(40);
const SOURCE_TIMESTAMP = '2026-08-30T01:02:03.000Z';

test('acceptance policy는 승인된 N/N+1 identity와 test endpoint만 만든다', async () => {
  const fixture = await createFixture('n');
  try {
    const n = buildUpdaterAcceptanceConfig({ role: 'n', publicKey: fixture.publicKey });
    const next = buildUpdaterAcceptanceConfig({ role: 'n-plus-one', publicKey: fixture.publicKey });
    assert.equal(n.config.version, UPDATER_ACCEPTANCE_N_VERSION);
    assert.equal(next.config.version, UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION);
    for (const result of [n, next]) {
      assert.deepEqual(result.config.plugins.updater.endpoints, [UPDATER_ACCEPTANCE_ENDPOINT]);
      assert.equal(result.config.plugins.updater.pubkey, fixture.publicKey);
      assert.equal(result.config.bundle.createUpdaterArtifacts, true);
      assert.deepEqual(result.config.plugins.updater.windows, { installMode: 'passive' });
    }
    assert.equal(UPDATER_ACCEPTANCE_TAG, 'updater-test-v99.1.1');
    assert.equal(
      UPDATER_ACCEPTANCE_TITLE,
      '[TEST ONLY] Alhangeul Updater Acceptance 99.1.0 → 99.1.1',
    );
    assert.throws(
      () => buildUpdaterAcceptanceConfig({ role: 'candidate', publicKey: fixture.publicKey }),
      /role은 n 또는 n-plus-one/,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('acceptance config는 repository 밖의 새 0600 파일에만 기록한다', async () => {
  const fixture = await createFixture('n');
  try {
    const repositoryRoot = join(fixture.tmp, 'repository');
    const outputPath = join(fixture.tmp, 'secure', 'acceptance.json');
    await mkdir(repositoryRoot);
    await writeUpdaterAcceptanceConfig({
      repositoryRoot,
      outputPath,
      role: 'n',
      publicKey: fixture.publicKey,
    });
    if (process.platform !== 'win32') assert.equal((await stat(outputPath)).mode & 0o077, 0);
    await assert.rejects(
      writeUpdaterAcceptanceConfig({
        repositoryRoot,
        outputPath: join(repositoryRoot, 'acceptance.json'),
        role: 'n',
        publicKey: fixture.publicKey,
      }),
      /repository 밖/,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('N inventory는 Actions 전용이고 N+1 inventory와 manifest만 공개 후보 URL을 가진다', async () => {
  const nFixture = await createFixture('n');
  const nextFixture = await createFixture('n-plus-one', nFixture.keys);
  try {
    const n = await createUpdaterAcceptanceInventory(nFixture.options);
    const next = await createUpdaterAcceptanceInventory(nextFixture.options);
    assert.equal(n.version, UPDATER_ACCEPTANCE_N_VERSION);
    assert.equal(n.releaseTag, null);
    assert.ok(Object.values(n.targets).every((entry) => entry.url === null));
    assert.equal(next.version, UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION);
    assert.equal(next.releaseTag, UPDATER_ACCEPTANCE_TAG);
    for (const entry of Object.values(next.targets)) {
      assert.match(entry.url, new RegExp(`/releases/download/${UPDATER_ACCEPTANCE_TAG}/`));
    }

    const manifest = buildUpdaterAcceptanceManifest(next, SOURCE_TIMESTAMP);
    validateUpdaterAcceptanceManifest(manifest, next);
    assert.equal(manifest.version, UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION);
    assert.equal(manifest.pub_date, SOURCE_TIMESTAMP);
    for (const [target, entry] of Object.entries(next.targets)) {
      assert.deepEqual(manifest.platforms[target], {
        url: entry.url,
        signature: entry.signature,
      });
    }

    const candidateAssets = [
      ...Object.values(next.targets).flatMap((entry) => [basename(entry.path), `${basename(entry.path)}.sig`]),
      UPDATER_ACCEPTANCE_INVENTORY,
      UPDATER_ACCEPTANCE_MANIFEST,
    ];
    assert.equal(new Set(candidateAssets).size, 8);
  } finally {
    await Promise.all([nFixture.cleanup(), nextFixture.cleanup()]);
  }
});

test('acceptance verifier는 role별 target slice와 실제 Minisign 서명을 검증한다', async () => {
  const fixture = await createFixture('n-plus-one');
  try {
    await rm(join(fixture.root, 'msi'), { recursive: true });
    await rm(join(fixture.root, 'appimage'), { recursive: true });
    const result = await verifyUpdaterAcceptanceArtifacts({
      ...fixture.options,
      targets: ['windows-x86_64-nsis'],
    });
    assert.deepEqual(Object.keys(result.targets), ['windows-x86_64-nsis']);
    await writeFile(`${fixture.paths.nsis}.sig`, 'tampered');
    await assert.rejects(
      verifyUpdaterAcceptanceArtifacts({
        ...fixture.options,
        targets: ['windows-x86_64-nsis'],
      }),
      /signature 형식|base64/,
    );
  } finally {
    await fixture.cleanup();
  }
});

for (const [name, mutate, expected] of [
  ['stable role 사칭', (value) => { value.role = 'n'; }, /identity/],
  ['stable tag namespace', (value) => { value.releaseTag = `v${value.version}`; }, /identity/],
  ['stable endpoint', (value) => { value.endpoint = 'https://postmelee.github.io/alhangeul-tauri/updater/stable.json'; }, /identity/],
  ['mutable URL', (value) => { value.targets['windows-x86_64-msi'].url = value.targets['windows-x86_64-msi'].url.replace(UPDATER_ACCEPTANCE_TAG, 'latest'); }, /acceptance URL/],
  ['malformed signature', (value) => { value.targets['windows-x86_64-msi'].signature = 'invalid'; }, /signature.*base64|signature.*URL\/path/],
  ['partial target', (value) => { delete value.targets['linux-x86_64-appimage']; }, /targets key/],
]) {
  test(`acceptance inventory는 ${name}을 거부한다`, async () => {
    const fixture = await createFixture('n-plus-one');
    try {
      const inventory = structuredClone(await createUpdaterAcceptanceInventory(fixture.options));
      mutate(inventory);
      assert.throws(() => validateUpdaterAcceptanceInventory(inventory), expected);
    } finally {
      await fixture.cleanup();
    }
  });
}

test('stable inventory validator는 test-only tag와 scope를 수용하지 않는다', async () => {
  const fixture = await createFixture('n-plus-one');
  try {
    const inventory = await createUpdaterAcceptanceInventory(fixture.options);
    assert.throws(() => validateReleaseInventory(inventory), /key가 계약|release tag/);
  } finally {
    await fixture.cleanup();
  }
});

async function createFixture(role, reusedKeys = null) {
  const tmp = await mkdtemp(join(tmpdir(), 'alhangeul-updater-acceptance-'));
  const root = join(tmp, 'artifacts');
  const keys = reusedKeys ?? createKeys();
  const version = role === 'n' ? UPDATER_ACCEPTANCE_N_VERSION : UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION;
  const paths = {
    nsis: join(root, 'nsis', `Alhangeul_${version}_x64-setup.exe`),
    msi: join(root, 'msi', `Alhangeul_${version}_x64_en-US.msi`),
    appimage: join(root, 'appimage', `Alhangeul_${version}_amd64.AppImage`),
  };
  for (const [kind, path] of Object.entries(paths)) {
    await mkdir(join(path, '..'), { recursive: true });
    const bytes = Buffer.from(`signed acceptance fixture: ${role}:${kind}`);
    await writeFile(path, bytes);
    await chmod(path, 0o700);
    await writeFile(`${path}.sig`, minisign(bytes, keys.privateKey, keys.keyId, kind));
  }
  return {
    tmp,
    root,
    paths,
    keys,
    publicKey: keys.encodedPublicKey,
    options: { root, role, sourceSha: SOURCE_SHA, publicKey: keys.encodedPublicKey },
    cleanup: () => rm(tmp, { recursive: true, force: true }),
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
