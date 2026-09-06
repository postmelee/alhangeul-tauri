import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { verifyReleaseMetadata } from '../scripts/check-release-metadata.mjs';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptPath = join(repositoryRoot, 'scripts/check-release-metadata.mjs');
const fixturePaths = [
  'package.json',
  'apps/desktop/package.json',
  'apps/desktop/src-tauri/Cargo.toml',
  'apps/desktop/src-tauri/Cargo.lock',
  'apps/desktop/src-tauri/tauri.conf.json',
  'apps/desktop/src-tauri/linux/main.desktop',
  'apps/desktop/src-tauri/tauri.updater.conf.json',
];

test('현재 HWP/HWPX release metadata를 읽기 전용으로 승인한다', async () => {
  const before = await Promise.all(
    fixturePaths.map((path) => readFile(join(repositoryRoot, path), 'utf8')),
  );
  const result = await verifyReleaseMetadata({ repositoryRoot });
  const after = await Promise.all(
    fixturePaths.map((path) => readFile(join(repositoryRoot, path), 'utf8')),
  );
  assert.equal(result.productName, 'Alhangeul');
  assert.equal(result.version, '0.1.0');
  assert.deepEqual(result.fileAssociations, ['hwp', 'hwpx']);
  assert.equal(result.updaterKeyFingerprint, '100c8f3183b25de3366574c46a1a2a66950a1d5f24862f3461c27b095713ffdd');
  assert.deepEqual(after, before);
});

for (const [name, mutate, expected] of [
  ['HWPX 저장 설명 drift', (config) => { config.bundle.longDescription = 'HWP only'; }, /bundle\.longDescription/],
  ['HWPX association 삭제', (config) => { config.bundle.fileAssociations.pop(); }, /fileAssociations\.length/],
  ['DEB desktop template drift', (config) => { config.bundle.linux.deb.desktopTemplate = 'linux/other.desktop'; }, /bundle\.linux\.deb\.desktopTemplate/],
  ['RPM desktop template drift', (config) => { config.bundle.linux.rpm.desktopTemplate = 'linux/other.desktop'; }, /bundle\.linux\.rpm\.desktopTemplate/],
  ['HWPX canonical MIME drift', (config) => { config.bundle.fileAssociations[1].mimeType = 'application/vnd.hancom.hwpx'; }, /mimeType/],
  ['updater 활성화', (config) => { config.plugins = { updater: {} }; }, /updater 설정/],
]) {
  test(`${name}를 거부한다`, async () => {
    const fixture = await createFixture();
    try {
      const configPath = join(fixture.root, 'apps/desktop/src-tauri/tauri.conf.json');
      const config = JSON.parse(await readFile(configPath, 'utf8'));
      mutate(config);
      await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
      await assert.rejects(verifyReleaseMetadata({ repositoryRoot: fixture.root }), expected);
    } finally {
      await rm(fixture.tmp, { recursive: true, force: true });
    }
  });
}

for (const [name, mutate, expected] of [
  ['updater endpoint drift', (config) => { config.plugins.updater.endpoints[0] = 'http://example.com/stable.json'; }, /endpoints/],
  ['updater public key drift', (config) => { config.plugins.updater.pubkey = 'placeholder-key'; }, /pubkey/],
  ['updater artifact 비활성화', (config) => { config.bundle.createUpdaterArtifacts = false; }, /createUpdaterArtifacts/],
  ['Windows updater install mode drift', (config) => { config.plugins.updater.windows.installMode = 'basicUi'; }, /installMode/],
]) {
  test(`${name}를 거부한다`, async () => {
    const fixture = await createFixture();
    try {
      const configPath = join(fixture.root, 'apps/desktop/src-tauri/tauri.updater.conf.json');
      const config = JSON.parse(await readFile(configPath, 'utf8'));
      mutate(config);
      await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
      await assert.rejects(verifyReleaseMetadata({ repositoryRoot: fixture.root }), expected);
    } finally {
      await rm(fixture.tmp, { recursive: true, force: true });
    }
  });
}

test('tracked updater release overlay 누락을 거부한다', async () => {
  const fixture = await createFixture();
  try {
    await rm(join(fixture.root, 'apps/desktop/src-tauri/tauri.updater.conf.json'));
    await assert.rejects(
      verifyReleaseMetadata({ repositoryRoot: fixture.root }),
      /tauri\.updater\.conf\.json을 읽을 수 없습니다/,
    );
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
});

test('CLI는 repository, root override와 잘못된 인자를 구분한다', async () => {
  const direct = runCli([]);
  assert.equal(direct.status, 0, direct.stderr);
  assert.match(direct.stdout, /Release metadata check passed: Alhangeul 0\.1\.0/);

  const fixture = await createFixture();
  try {
    assert.equal(runCli(['--root', fixture.root]).status, 0);
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }

  const invalid = runCli(['--unknown']);
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /지원하지 않는 인자입니다/);
});

async function createFixture() {
  const tmp = await mkdtemp(join(tmpdir(), 'alhangeul-release-metadata-'));
  const root = join(tmp, 'repository');
  for (const path of fixturePaths) {
    await cp(join(repositoryRoot, path), join(root, path), { recursive: true });
  }
  return { tmp, root };
}

function runCli(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
}
