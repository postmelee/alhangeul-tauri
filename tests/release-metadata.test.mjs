import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  RELEASE_METADATA_CONTRACT,
  verifyReleaseMetadata,
} from '../scripts/check-release-metadata.mjs';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptPath = join(repositoryRoot, 'scripts/check-release-metadata.mjs');

test('승인된 release metadata를 확인하고 파일을 수정하지 않는다', async () => {
  const fixture = await createFixture();
  try {
    const before = await readFixtureFiles(fixture);
    const result = await verifyReleaseMetadata({
      repositoryRoot: fixture.root,
    });
    const after = await readFixtureFiles(fixture);

    assert.equal(result.productName, 'Alhangeul');
    assert.equal(result.version, '0.1.0');
    assert.equal(result.identifier, 'io.github.postmelee.alhangeul');
    assert.deepEqual(result.fileAssociations, ['hwp', 'hwpx']);
    assert.deepEqual(after, before);
  } finally {
    await cleanup(fixture.tmp);
  }
});

for (const [name, path, mutate, expectedError] of [
  [
    'HWPX 저장을 지원한다고 읽히는 description',
    'apps/desktop/src-tauri/tauri.conf.json',
    (value) => {
      value.bundle.longDescription =
        'Alhangeul opens, edits, saves, and exports HWP/HWPX documents.';
    },
    /bundle\.longDescription 값이 다릅니다/,
  ],
  [
    '잘못된 publisher',
    'apps/desktop/src-tauri/tauri.conf.json',
    (value) => {
      value.bundle.publisher = 'unknown';
    },
    /bundle\.publisher 값이 다릅니다/,
  ],
  [
    '누락된 HWPX association',
    'apps/desktop/src-tauri/tauri.conf.json',
    (value) => {
      value.bundle.fileAssociations.pop();
    },
    /bundle\.fileAssociations 개수가 다릅니다/,
  ],
  [
    '활성화된 updater 설정',
    'apps/desktop/src-tauri/tauri.conf.json',
    (value) => {
      value.plugins = { updater: { endpoints: ['https://example.invalid'] } };
    },
    /updater 설정을 허용하지 않습니다/,
  ],
  [
    'updater JavaScript dependency',
    'apps/desktop/package.json',
    (value) => {
      value.dependencies = { '@tauri-apps/plugin-updater': '2.0.0' };
    },
    /updater dependency를 허용하지 않습니다/,
  ],
]) {
  test(`${name}를 거부한다`, async () => {
    const fixture = await createFixture();
    try {
      await mutateJson(join(fixture.root, path), mutate);
      await assert.rejects(
        verifyReleaseMetadata({ repositoryRoot: fixture.root }),
        expectedError,
      );
    } finally {
      await cleanup(fixture.tmp);
    }
  });
}

test('Cargo updater dependency와 package metadata drift를 거부한다', async () => {
  const fixture = await createFixture();
  try {
    await writeFile(
      join(fixture.root, 'apps/desktop/src-tauri/Cargo.toml'),
      `${validCargoToml()}\n[dependencies]\ntauri-plugin-updater = "2"\n`,
    );
    await assert.rejects(
      verifyReleaseMetadata({ repositoryRoot: fixture.root }),
      /Cargo\.toml에 updater dependency를 허용하지 않습니다/,
    );

    await writeFile(
      join(fixture.root, 'apps/desktop/src-tauri/Cargo.toml'),
      validCargoToml().replace('license = "MIT"', 'license = "Other"'),
    );
    await assert.rejects(
      verifyReleaseMetadata({ repositoryRoot: fixture.root }),
      /package\.license 값이 다릅니다/,
    );
  } finally {
    await cleanup(fixture.tmp);
  }
});

test('JSON parse 실패와 필수 파일 누락에 경로를 포함한다', async () => {
  const malformed = await createFixture();
  try {
    await writeFile(join(malformed.root, 'package.json'), '{');
    await assert.rejects(
      verifyReleaseMetadata({ repositoryRoot: malformed.root }),
      /package\.json JSON parse 실패/,
    );
  } finally {
    await cleanup(malformed.tmp);
  }

  const missing = await createFixture();
  try {
    await rm(join(missing.root, 'apps/desktop/package.json'));
    await assert.rejects(
      verifyReleaseMetadata({ repositoryRoot: missing.root }),
      /apps\/desktop\/package\.json을 읽을 수 없습니다/,
    );
  } finally {
    await cleanup(missing.tmp);
  }
});

test('CLI는 기본 repository와 root override, help를 지원한다', async () => {
  const repository = runCli([]);
  assert.equal(repository.status, 0, repository.stderr);
  assert.match(repository.stdout, /Release metadata check passed: Alhangeul 0\.1\.0/);

  const fixture = await createFixture();
  try {
    const overridden = runCli(['--', '--root', fixture.root]);
    assert.equal(overridden.status, 0, overridden.stderr);
  } finally {
    await cleanup(fixture.tmp);
  }

  const help = runCli(['--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage:/);

  const invalid = runCli(['--unknown']);
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /지원하지 않는 인자입니다/);
});

async function createFixture() {
  const tmp = await mkdtemp(join(tmpdir(), 'alhangeul-release-metadata-'));
  const root = join(tmp, 'repository');
  const files = {
    'package.json': JSON.stringify(validRootPackage(), null, 2),
    'apps/desktop/package.json': JSON.stringify(validDesktopPackage(), null, 2),
    'apps/desktop/src-tauri/tauri.conf.json': JSON.stringify(
      validTauriConfig(),
      null,
      2,
    ),
    'apps/desktop/src-tauri/Cargo.toml': validCargoToml(),
  };
  for (const [path, content] of Object.entries(files)) {
    const outputPath = join(root, path);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${content}\n`);
  }
  return { tmp, root, paths: Object.keys(files) };
}

function validRootPackage() {
  return {
    name: RELEASE_METADATA_CONTRACT.rootPackageName,
    version: '0.1.0',
    description: RELEASE_METADATA_CONTRACT.description,
    license: RELEASE_METADATA_CONTRACT.license,
  };
}

function validDesktopPackage() {
  return {
    name: RELEASE_METADATA_CONTRACT.desktopPackageName,
    version: '0.1.0',
    description: RELEASE_METADATA_CONTRACT.description,
  };
}

function validTauriConfig() {
  return {
    productName: RELEASE_METADATA_CONTRACT.productName,
    version: '0.1.0',
    identifier: RELEASE_METADATA_CONTRACT.identifier,
    app: { windows: [{ title: RELEASE_METADATA_CONTRACT.productName }] },
    bundle: {
      active: true,
      targets: 'all',
      publisher: RELEASE_METADATA_CONTRACT.publisher,
      shortDescription: RELEASE_METADATA_CONTRACT.shortDescription,
      longDescription: RELEASE_METADATA_CONTRACT.longDescription,
      category: RELEASE_METADATA_CONTRACT.category,
      copyright: RELEASE_METADATA_CONTRACT.copyright,
      fileAssociations: RELEASE_METADATA_CONTRACT.fileAssociations,
      windows: { wix: { template: RELEASE_METADATA_CONTRACT.wixTemplate } },
    },
  };
}

function validCargoToml() {
  return [
    '[package]',
    `name = "${RELEASE_METADATA_CONTRACT.desktopPackageName}"`,
    'version = "0.1.0"',
    `description = "${RELEASE_METADATA_CONTRACT.description}"`,
    `license = "${RELEASE_METADATA_CONTRACT.license}"`,
    '',
    '[lib]',
    'name = "alhangeul_desktop"',
    '',
  ].join('\n');
}

async function mutateJson(path, mutate) {
  const value = JSON.parse(await readFile(path, 'utf8'));
  mutate(value);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function readFixtureFiles(fixture) {
  return Promise.all(
    fixture.paths.map((path) => readFile(join(fixture.root, path), 'utf8')),
  );
}

function runCli(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
}

async function cleanup(path) {
  await rm(path, { recursive: true, force: true });
}
