import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  INVENTORY_FILENAME,
  verifyDesktopArtifacts,
} from '../scripts/verify-desktop-artifacts.mjs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptPath = join(repoRoot, 'scripts/verify-desktop-artifacts.mjs');

const platformFixtures = Object.freeze({
  'windows-x64': Object.freeze({
    'msi/Alhangeul_0.3.1_x64_en-US.msi': 'windows msi',
    'nsis/Alhangeul_0.3.1_x64-setup.exe': 'windows nsis',
  }),
  'linux-x64': Object.freeze({
    'deb/alhangeul_0.3.1_amd64.deb': 'linux deb',
    'rpm/alhangeul-0.3.1-1.x86_64.rpm': 'linux rpm',
    'appimage/alhangeul_0.3.1_amd64.AppImage': 'linux appimage',
  }),
  'linux-arm64': Object.freeze({
    'deb/alhangeul_0.3.1_arm64.deb': 'linux arm64 deb',
  }),
});

for (const [platform, fixtureFiles] of Object.entries(platformFixtures)) {
  test(`${platform} 필수 bundle을 inventory로 기록하고 재검증한다`, async () => {
    const fixture = await createFixture(fixtureFiles);
    try {
      await writeFixtureFile(
        fixture.root,
        'metadata/build.txt',
        `${platform} build metadata`,
      );

      const first = await verifyDesktopArtifacts({
        platform,
        root: fixture.root,
        writeInventoryPath: fixture.inventoryPath,
      });
      const firstSource = await readFile(fixture.inventoryPath, 'utf8');
      const verified = await verifyDesktopArtifacts({
        platform,
        root: fixture.root,
        verifyInventoryPath: fixture.inventoryPath,
      });
      await verifyDesktopArtifacts({
        platform,
        root: fixture.root,
        writeInventoryPath: fixture.inventoryPath,
      });
      const secondSource = await readFile(fixture.inventoryPath, 'utf8');

      assert.equal(first.schemaVersion, 1);
      assert.equal(first.platform, platform);
      assert.deepEqual(
        first.files.map((file) => file.path),
        [...first.files.map((file) => file.path)].sort(),
      );
      assert.ok(first.files.every((file) => /^[0-9a-f]{64}$/.test(file.sha256)));
      assert.deepEqual(verified, first);
      assert.equal(secondSource, firstSource);
      assert.ok(!first.files.some((file) => file.path === INVENTORY_FILENAME));
    } finally {
      await cleanup(fixture.tmp);
    }
  });
}

test('Windows x64의 NSIS bundle 누락을 거부한다', async () => {
  const fixture = await createFixture({
    'msi/Alhangeul_0.3.1_x64_en-US.msi': 'windows msi',
  });
  try {
    await assert.rejects(
      verifyDesktopArtifacts({
        platform: 'windows-x64',
        root: fixture.root,
      }),
      /필수 bundle 종류가 없습니다: nsis/,
    );
  } finally {
    await cleanup(fixture.tmp);
  }
});

test('Linux x64의 RPM bundle 누락을 거부한다', async () => {
  const fixture = await createFixture({
    'deb/alhangeul_0.3.1_amd64.deb': 'linux deb',
    'appimage/alhangeul_0.3.1_amd64.AppImage': 'linux appimage',
  });
  try {
    await assert.rejects(
      verifyDesktopArtifacts({
        platform: 'linux-x64',
        root: fixture.root,
      }),
      /필수 bundle 종류가 없습니다: rpm/,
    );
  } finally {
    await cleanup(fixture.tmp);
  }
});

test('Linux arm64의 DEB bundle 누락을 거부한다', async () => {
  const fixture = await createFixture({
    'metadata/build.txt': 'metadata only',
  });
  try {
    await assert.rejects(
      verifyDesktopArtifacts({
        platform: 'linux-arm64',
        root: fixture.root,
      }),
      /필수 bundle 종류가 없습니다: deb/,
    );
  } finally {
    await cleanup(fixture.tmp);
  }
});

test('0바이트 필수 bundle을 거부한다', async () => {
  const fixture = await createFixture({
    'deb/alhangeul_0.3.1_arm64.deb': '',
  });
  try {
    await assert.rejects(
      verifyDesktopArtifacts({
        platform: 'linux-arm64',
        root: fixture.root,
      }),
      /필수 bundle이 비어 있습니다/,
    );
  } finally {
    await cleanup(fixture.tmp);
  }
});

test('지원하지 않는 platform과 잘못된 root를 거부한다', async () => {
  const fixture = await createFixture(platformFixtures['linux-arm64']);
  try {
    await assert.rejects(
      verifyDesktopArtifacts({
        platform: 'unsupported-x64',
        root: fixture.root,
      }),
      /지원하지 않는 desktop artifact platform/,
    );
    await assert.rejects(
      verifyDesktopArtifacts({
        platform: 'linux-arm64',
        root: join(fixture.root, 'missing'),
      }),
      /bundle root를 읽을 수 없습니다/,
    );
  } finally {
    await cleanup(fixture.tmp);
  }
});

for (const [name, mutate, expectedError] of [
  [
    '기록 뒤 bundle 내용 변조',
    async (fixture) => {
      await writeFixtureFile(
        fixture.root,
        'deb/alhangeul_0.3.1_arm64.deb',
        'modified bundle',
      );
    },
    /artifact inventory가 현재 bundle과 일치하지 않습니다/,
  ],
  [
    '기록 뒤 bundle 삭제',
    async (fixture) => {
      await unlink(join(fixture.root, 'deb/alhangeul_0.3.1_arm64.deb'));
    },
    /필수 bundle 종류가 없습니다: deb/,
  ],
  [
    '기록 뒤 bundle 추가',
    async (fixture) => {
      await writeFixtureFile(fixture.root, 'metadata/extra.txt', 'extra file');
    },
    /artifact inventory가 현재 bundle과 일치하지 않습니다/,
  ],
  [
    'inventory JSON 변조',
    async (fixture) => {
      const source = await readFile(fixture.inventoryPath, 'utf8');
      await writeFile(
        fixture.inventoryPath,
        source.replace('"linux-arm64"', '"linux-x64"'),
      );
    },
    /artifact inventory가 현재 bundle과 일치하지 않습니다/,
  ],
]) {
  test(`${name}를 inventory 검증에서 거부한다`, async () => {
    const fixture = await createFixture(platformFixtures['linux-arm64']);
    try {
      await verifyDesktopArtifacts({
        platform: 'linux-arm64',
        root: fixture.root,
        writeInventoryPath: fixture.inventoryPath,
      });
      await mutate(fixture);
      await assert.rejects(
        verifyDesktopArtifacts({
          platform: 'linux-arm64',
          root: fixture.root,
          verifyInventoryPath: fixture.inventoryPath,
        }),
        expectedError,
      );
    } finally {
      await cleanup(fixture.tmp);
    }
  });
}

test('CLI help를 제공하고 상충하는 inventory mode를 거부한다', async () => {
  const help = runCli(['--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage:/);
  assert.match(help.stdout, /windows-x64\|linux-x64\|linux-arm64/);

  const fixture = await createFixture(platformFixtures['linux-arm64']);
  try {
    const invalid = runCli([
      '--platform',
      'linux-arm64',
      '--root',
      fixture.root,
      '--write-inventory',
      fixture.inventoryPath,
      '--verify-inventory',
      fixture.inventoryPath,
    ]);
    assert.notEqual(invalid.status, 0);
    assert.match(
      invalid.stderr,
      /--write-inventory와 --verify-inventory는 동시에 사용할 수 없습니다/,
    );
  } finally {
    await cleanup(fixture.tmp);
  }
});

test('CLI가 package script의 argument separator를 허용한다', async () => {
  const fixture = await createFixture(platformFixtures['linux-arm64']);
  try {
    const result = runCli([
      '--',
      '--platform',
      'linux-arm64',
      '--root',
      fixture.root,
      '--write-inventory',
      fixture.inventoryPath,
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /desktop artifacts verified: linux-arm64/);
    assert.match(
      await readFile(fixture.inventoryPath, 'utf8'),
      /"platform": "linux-arm64"/,
    );
  } finally {
    await cleanup(fixture.tmp);
  }
});

test('CLI unknown option과 필수 인자 누락을 거부한다', () => {
  const unknown = runCli(['--unknown', 'value']);
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /지원하지 않는 option입니다/);

  const missing = runCli(['--platform', 'linux-arm64']);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /bundle root 경로가 필요합니다/);
});

async function createFixture(files) {
  const tmp = await mkdtemp(join(tmpdir(), 'alhangeul-desktop-artifacts-'));
  const root = join(tmp, 'bundle');
  await mkdir(root, { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    await writeFixtureFile(root, path, content);
  }
  return {
    tmp,
    root,
    inventoryPath: join(root, INVENTORY_FILENAME),
  };
}

async function writeFixtureFile(root, path, content) {
  const outputPath = join(root, path);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content);
}

function runCli(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

async function cleanup(path) {
  await rm(path, { recursive: true, force: true });
}
