import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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

import { LIFECYCLE } from '../scripts/linux-thumbnail-package-contract.mjs';
import { ALIASES, CANONICAL, MIME_PATH } from '../scripts/linux-thumbnail-mime-contract.mjs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptPath = join(repoRoot, 'scripts/verify-desktop-artifacts.mjs');
const PE_MACHINE_X64 = 0x8664;
const PE_DLL_FLAG = 0x2000;

const linuxX64Bundles = Object.freeze({
  'deb/alhangeul_0.3.1_amd64.deb': 'linux deb',
  'rpm/alhangeul-0.3.1-1.x86_64.rpm': 'linux rpm',
  'appimage/alhangeul_0.3.1_amd64.AppImage': 'linux appimage',
});
const linuxArm64Bundles = Object.freeze({
  'deb/alhangeul_0.3.1_arm64.deb': 'linux arm64 deb',
});
const platformFixtures = Object.freeze({
  'windows-x64': Object.freeze({
    'msi/Alhangeul_0.3.1_x64_en-US.msi': 'windows msi',
    'nsis/Alhangeul_0.3.1_x64-setup.exe': 'windows nsis',
    'verification/AlhangeulThumbnailHandler.dll': peFixture(true),
    'verification/AlhangeulThumbnailWorker.exe': peFixture(false),
  }),
  'linux-x64': Object.freeze({
    ...linuxX64Bundles,
    'verification/linux-thumbnail-packages.json': linuxEvidence(
      'linux-x64',
      linuxX64Bundles,
    ),
  }),
  'linux-arm64': Object.freeze({
    ...linuxArm64Bundles,
    'verification/linux-thumbnail-packages.json': linuxEvidence(
      'linux-arm64',
      linuxArm64Bundles,
    ),
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

test('Linux x64는 Tauri AppDir 중간 트리만 inventory에서 제외한다', async () => {
  const fixture = await createFixture({
    ...platformFixtures['linux-x64'],
    'appimage/Alhangeul.AppDir/.DirIcon': 'intermediate icon',
    'appimage/Alhangeul.AppDir/usr/bin/alhangeul': 'intermediate binary',
    'metadata/Preview.AppDir/keep.txt': 'must remain',
  });
  try {
    const inventory = await verifyDesktopArtifacts({
      platform: 'linux-x64',
      root: fixture.root,
    });

    assert.ok(
      inventory.files.every(
        (file) => !file.path.startsWith('appimage/Alhangeul.AppDir/'),
      ),
    );
    assert.ok(
      inventory.files.some(
        (file) => file.path === 'metadata/Preview.AppDir/keep.txt',
      ),
    );
    assert.ok(inventory.files.some((file) => file.kind === 'deb'));
    assert.ok(inventory.files.some((file) => file.kind === 'rpm'));
    assert.ok(inventory.files.some((file) => file.kind === 'appimage'));
  } finally {
    await cleanup(fixture.tmp);
  }
});

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
      /필수 종류 cardinality가 1이 아닙니다: nsis=0/,
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
      /필수 종류 cardinality가 1이 아닙니다: rpm=0/,
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
      /필수 종류 cardinality가 1이 아닙니다: deb=0/,
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
    /archiveSha256 불일치|artifact inventory가 현재 bundle과 일치하지 않습니다/,
  ],
  [
    '기록 뒤 bundle 삭제',
    async (fixture) => {
      await unlink(join(fixture.root, 'deb/alhangeul_0.3.1_arm64.deb'));
    },
    /필수 종류 cardinality가 1이 아닙니다: deb=0/,
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

function peFixture(dll) {
  const buffer = Buffer.alloc(256);
  buffer.write('MZ', 0, 'ascii');
  buffer.writeUInt32LE(0x80, 0x3c);
  buffer.write('PE\0\0', 0x80, 'ascii');
  buffer.writeUInt16LE(PE_MACHINE_X64, 0x84);
  buffer.writeUInt16LE(dll ? PE_DLL_FLAG : 0x0002, 0x96);
  return buffer;
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

function linuxEvidence(platform, files) {
  const packages = platform === 'linux-x64'
    ? [['deb', 'deb/alhangeul_0.3.1_amd64.deb', 'amd64'], ['rpm', 'rpm/alhangeul-0.3.1-1.x86_64.rpm', 'x86_64']]
    : [['deb', 'deb/alhangeul_0.3.1_arm64.deb', 'arm64']];
  return JSON.stringify({
    schemaVersion: 2, success: true, platform, repositorySha: '0'.repeat(40),
    helperSha256: '1'.repeat(64), mimeSha256: '2'.repeat(64),
    packages: packages.map(([format, path, architecture]) => linuxPackage({ format, path, architecture, platform, files })),
    invariants: { mimeDefaultsPreserved: true, thirdPartyThumbnailerPreserved: true,
      cacheSentinelPreserved: true, productFilesRemovedAfterUninstall: true },
  });
}

function linuxPackage({ format, path, architecture, platform, files }) {
  const helperPath = '/usr/lib/alhangeul/alhangeul-thumbnailer';
  const registrationPath = '/usr/share/thumbnailers/alhangeul.thumbnailer';
  const owners = Object.fromEntries([helperPath, registrationPath, MIME_PATH].map((p) => [p, 'alhangeul']));
  return {
    format, path, architecture, name: 'alhangeul', version: '0.3.1',
    archiveSha256: createHash('sha256').update(files[path]).digest('hex'),
    helper: { path: helperPath, mode: '0755', sha256: '1'.repeat(64) },
    registration: { path: registrationPath, mode: '0644', sha256: '3'.repeat(64),
      exec: `${helperPath} %i %o %s`, mime: 'application/x-hwp;application/x-hwpx;' },
    mime: { path: MIME_PATH, mode: '0644', sha256: '2'.repeat(64) },
    elfArchitecture: platform === 'linux-x64' ? 'x86-64' : 'aarch64', singleOwner: true, owners,
    archiveContract: { refreshHooks: ['post-install', 'post-remove'], dependencies: format === 'deb'
      ? ['shared-mime-info', 'libwebkit2gtk-4.1-0', 'libgtk-3-0']
      : ['shared-mime-info', 'libwebkit2gtk-4.1.so.0()(64bit)', 'libgtk-3.so.0()(64bit)'] },
    lifecycle: LIFECYCLE.map((name) => transitionFixture(name, owners)),
  };
}

function transitionFixture(name, owners) {
  const installed = !['baseline', 'interim-uninstall', 'old-install', 'uninstall'].includes(name);
  return {
    name, exitCode: ['injected-failure-rollback', 'refresh-failure-observed'].includes(name) ? 1 : 0,
    packageState: { exitCode: 0, description: 'install ok installed 0.3.1' },
    owners, hookExitCode: 42, recovery: 'explicit-candidate-reinstall',
    filesPresent: Object.fromEntries(Object.keys(owners).map((path) => [path,
      installed || (name === 'old-install' && path !== MIME_PATH)])),
    mime: { types: { glob: installed ? CANONICAL : 'application/zip',
      magic: installed ? CANONICAL : 'application/zip', generic: 'application/zip' },
      aliases: Object.fromEntries(ALIASES.map((alias) => [alias, installed ? CANONICAL : null])),
      defaults: Object.fromEntries(['application/x-hwp', CANONICAL, ...ALIASES].map((type) => [type, ''])),
      xmlSha256: installed ? '2'.repeat(64) : null,
      otherDefinitions: { 'alhangeul-task50-third-party.xml': '4'.repeat(64) },
    },
  };
}

for (const [label, mutate] of [
  ['legacy schema', (e) => { e.schemaVersion = 1; }],
  ['name-only lifecycle', (e) => { e.packages[0].lifecycle = LIFECYCLE; }],
  ['missing MIME observation', (e) => { delete e.packages[0].lifecycle[1].mime; }],
  ['changed default app', (e) => { e.packages[0].lifecycle[1].mime.defaults[CANONICAL] = 'alhangeul.desktop'; }],
  ['wrong owner', (e) => { e.packages[0].owners[MIME_PATH] = 'other'; }],
  ['failed reinstall', (e) => { e.packages[0].lifecycle[2].exitCode = 1; }],
  ['missing hook', (e) => { e.packages[0].archiveContract.refreshHooks.pop(); }],
  ['missing MIME dependency', (e) => { e.packages[0].archiveContract.dependencies.shift(); }],
  ['uninstall leaves XML', (e) => { e.packages[0].lifecycle.at(-1).mime.xmlSha256 = '2'.repeat(64); }],
]) {
  test(`Linux evidence rejects ${label}`, async () => {
    const files = { ...platformFixtures['linux-arm64'] };
    const path = 'verification/linux-thumbnail-packages.json';
    const evidence = JSON.parse(files[path]); mutate(evidence);
    files[path] = JSON.stringify(evidence);
    const fixture = await createFixture(files);
    try { await assert.rejects(verifyDesktopArtifacts({ platform: 'linux-arm64', root: fixture.root })); }
    finally { await cleanup(fixture.tmp); }
  });
}
