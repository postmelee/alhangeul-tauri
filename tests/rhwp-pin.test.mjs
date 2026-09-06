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
import { writeRhwpPin } from '../scripts/write-rhwp-pin.mjs';
import {
  RHWP_REPOSITORY,
  verifyRepositoryPin,
} from '../scripts/verify-rhwp-pin.mjs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fixtureVersion = '1.2.3';
const fixtureTag = `v${fixtureVersion}`;

test('writer가 deterministic lock을 만들고 verifier가 정상 fixture를 승인한다', async () => {
  const fixture = await createFixture();
  try {
    const first = await readFile(fixture.lockPath, 'utf8');
    const pin = await verifyRepositoryPin({ repoRoot: fixture.root });
    await writeRhwpPin(fixture.writerOptions);
    const second = await readFile(fixture.lockPath, 'utf8');

    assert.equal(pin.rhwp_release_tag, fixtureTag);
    assert.equal(pin.rhwp_commit, fixture.commit);
    assert.equal(pin.artifacts.length, 6);
    assert.equal(second, first, '동일한 source와 artifact는 동일한 lock을 생성해야 한다');
  } finally {
    await cleanup(fixture.tmp);
  }
});

test('실제 저장소의 rhwp pin과 managed artifact가 일치한다', async () => {
  const pin = await verifyRepositoryPin({ repoRoot });
  assert.equal(pin.rhwp_release_tag, 'v0.8.4');
  assert.equal(pin.rhwp_commit, '496333b27d21ddb9114ba9ae340bcb895870c9a7');
});

mutationTest(
  'repository pin 변조를 거부한다',
  async (fixture) => {
    await replaceInFile(
      fixture.lockPath,
      RHWP_REPOSITORY,
      'https://example.invalid/rhwp.git',
    );
  },
  /repository pin이 올바르지 않습니다/,
);

mutationTest(
  'release tag 변조를 거부한다',
  async (fixture) => {
    await replaceInFile(fixture.lockPath, fixtureTag, 'v1.2.4');
  },
  /refs\/tags\/v1\.2\.4/,
);

mutationTest(
  'resolved commit 변조를 거부한다',
  async (fixture) => {
    await replaceInFile(fixture.lockPath, fixture.commit, 'b'.repeat(40));
  },
  /submodule HEAD가 lock commit과 다릅니다/,
);

mutationTest(
  'desktop Cargo version 변조를 거부한다',
  async (fixture) => {
    await replaceInFile(fixture.desktopLockPath, fixtureVersion, '9.9.9');
  },
  /desktop Cargo\.lock rhwp version이 release tag와 다릅니다/,
);

mutationTest(
  'vendored WASM package version 변조를 거부한다',
  async (fixture) => {
    const packagePath = join(fixture.vendorDir, 'package.json');
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
    packageJson.version = '9.9.9';
    await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  },
  /vendored WASM package version이 release tag와 다릅니다/,
);

mutationTest(
  'upstream Cargo.lock fingerprint 변조를 거부한다',
  async (fixture) => {
    await replaceInFile(
      fixture.lockPath,
      /source_cargo_lock_sha256 = "[0-9a-f]{64}"/,
      `source_cargo_lock_sha256 = "${'0'.repeat(64)}"`,
    );
  },
  /upstream Cargo\.lock SHA-256가 lock과 다릅니다/,
);

mutationTest(
  '동일 크기의 managed artifact hash 변조를 거부한다',
  async (fixture) => {
    const wasmPath = join(fixture.vendorDir, 'rhwp_bg.wasm');
    const bytes = await readFile(wasmPath);
    bytes[0] ^= 0xff;
    await writeFile(wasmPath, bytes);
  },
  /managed artifact SHA-256가 lock과 다릅니다/,
);

mutationTest(
  'managed artifact size 변조를 거부한다',
  async (fixture) => {
    const path = join(fixture.vendorDir, 'rhwp.js');
    const bytes = await readFile(path);
    await writeFile(path, Buffer.concat([bytes, Buffer.from('x')]));
  },
  /managed artifact size가 lock과 다릅니다/,
);

mutationTest(
  '누락된 managed artifact를 거부한다',
  async (fixture) => {
    await unlink(join(fixture.vendorDir, 'rhwp.d.ts'));
  },
  /managed artifact를 읽을 수 없습니다/,
);

mutationTest(
  'submodule origin 변조를 거부한다',
  async (fixture) => {
    git(
      ['remote', 'set-url', 'origin', 'https://example.invalid/rhwp.git'],
      fixture.submodule,
    );
  },
  /submodule origin이 올바르지 않습니다/,
);

mutationTest(
  'dirty upstream submodule을 거부한다',
  async (fixture) => {
    await writeFile(join(fixture.submodule, 'dirty.txt'), 'dirty\n');
  },
  /upstream submodule에 추적되지 않은 변경이 있습니다/,
);

function mutationTest(name, mutate, expectedError) {
  test(name, async () => {
    const fixture = await createFixture();
    try {
      await mutate(fixture);
      await assert.rejects(
        verifyRepositoryPin({ repoRoot: fixture.root }),
        expectedError,
      );
    } finally {
      await cleanup(fixture.tmp);
    }
  });
}

async function createFixture() {
  const tmp = await mkdtemp(join(tmpdir(), 'alhangeul-rhwp-pin-'));
  const root = join(tmp, 'repository');
  const submodule = join(root, 'third_party/rhwp');
  const vendorDir = join(root, 'apps/studio-host/vendor/rhwp-core');
  const desktopDir = join(root, 'apps/desktop/src-tauri');
  const desktopLockPath = join(desktopDir, 'Cargo.lock');
  const lockPath = join(root, 'rhwp-core.lock');

  await mkdir(submodule, { recursive: true });
  await mkdir(vendorDir, { recursive: true });
  await mkdir(desktopDir, { recursive: true });
  await writeFile(
    join(root, '.gitmodules'),
    `[submodule "third_party/rhwp"]\n\tpath = third_party/rhwp\n\turl = ${RHWP_REPOSITORY}\n`,
  );

  git(['init', '-b', 'main'], submodule);
  configureGitIdentity(submodule);
  git(['remote', 'add', 'origin', RHWP_REPOSITORY], submodule);
  await writeFile(
    join(submodule, 'Cargo.toml'),
    `[package]\nname = "rhwp"\nversion = "${fixtureVersion}"\nedition = "2021"\n`,
  );
  await writeFile(
    join(submodule, 'Cargo.lock'),
    `version = 4\n\n[[package]]\nname = "rhwp"\nversion = "${fixtureVersion}"\n`,
  );
  await writeFile(join(submodule, 'LICENSE'), 'fixture license\n');
  git(['add', 'Cargo.toml', 'Cargo.lock', 'LICENSE'], submodule);
  git(['commit', '-m', 'fixture release'], submodule);
  git(['tag', fixtureTag], submodule);
  const commit = git(['rev-parse', 'HEAD'], submodule).stdout.trim();

  await writeFile(
    desktopLockPath,
    `version = 4\n\n[[package]]\nname = "rhwp"\nversion = "${fixtureVersion}"\n`,
  );
  const artifacts = new Map([
    ['package.json', `${JSON.stringify({ name: 'rhwp', version: fixtureVersion }, null, 2)}\n`],
    ['rhwp.js', 'export default async function init() {}\n'],
    ['rhwp.d.ts', 'export default function init(): Promise<void>;\n'],
    ['rhwp_bg.wasm', Buffer.from([0x00, 0x61, 0x73, 0x6d])],
    ['rhwp_bg.wasm.d.ts', 'export const memory: WebAssembly.Memory;\n'],
    ['LICENSE', 'fixture license\n'],
  ]);
  for (const [name, content] of artifacts) {
    await writeFile(join(vendorDir, name), content);
  }

  const writerOptions = {
    repoRoot: root,
    releaseTag: fixtureTag,
    commit,
    wasmPackVersion: '0.15.0',
  };
  await writeRhwpPin(writerOptions);
  return {
    tmp,
    root,
    submodule,
    vendorDir,
    desktopLockPath,
    lockPath,
    commit,
    writerOptions,
  };
}

async function replaceInFile(path, search, replacement) {
  const source = await readFile(path, 'utf8');
  const updated = source.replace(search, replacement);
  assert.notEqual(updated, source, `fixture mutation target을 찾지 못했습니다: ${search}`);
  await writeFile(path, updated);
}

function configureGitIdentity(cwd) {
  git(['config', 'user.email', 'test@example.com'], cwd);
  git(['config', 'user.name', 'Test User'], cwd);
}

function git(args, cwd) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
    },
  });
  assert.equal(
    result.status,
    0,
    `git ${args.join(' ')} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return result;
}

async function cleanup(path) {
  await rm(path, { recursive: true, force: true });
}
