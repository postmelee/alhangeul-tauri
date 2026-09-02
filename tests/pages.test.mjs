import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  assertBuildLayout,
  buildPages,
  resolveLayout,
} from '../scripts/build-pages.mjs';
import { checkPages } from '../scripts/check-pages.mjs';
import {
  RELEASE_TARGETS,
  UPDATER_ENDPOINT,
  validateReleaseData,
} from '../scripts/pages/release-data.mjs';
import { ROOT_ASSETS, listSiteFiles } from '../scripts/pages/site-files.mjs';
import { buildUpdaterManifest, serializeUpdaterManifest } from '../scripts/updater/manifest.mjs';
import './pages-design.test.mjs';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('현재 source release data는 unpublished fail-closed 계약을 지킨다', async () => {
  const release = JSON.parse(
    await readFile(join(repositoryRoot, 'site/release.json'), 'utf8'),
  );
  assert.equal(validateReleaseData(release, { requireUnreleased: true }), release);
  assert.equal(release.updater.endpoint, UPDATER_ENDPOINT);
  assert.equal(release.updater.manifestPublished, false);
  assert.equal(release.updater.inventory, null);
  assert.equal(release.notes, null);
  assert.deepEqual(
    Object.fromEntries(Object.keys(RELEASE_TARGETS).map((target) => [target, null])),
    release.downloads,
  );
});

test('published fixture는 exact tag와 MSI/NSIS/AppImage URL만 승인한다', () => {
  const release = publishedFixture();
  assert.equal(validateReleaseData(release), release);
});

test('published release data는 source부터 output checker까지 통과한다', async () => {
  const fixture = await createFixture();
  try {
    await writeFile(
      join(fixture.root, 'site/release.json'),
      `${JSON.stringify(publishedFixture(), null, 2)}\n`,
    );
    await buildPages({ repositoryRoot: fixture.root });
    assert.deepEqual(
      await checkPages({ repositoryRoot: fixture.root }),
      [
        { mode: 'source', files: 11, status: 'published' },
        { mode: 'output', files: 13, status: 'published' },
      ],
    );
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
});

test('manifestPublished=true이면 complete inventory에서 output manifest만 생성한다', async () => {
  const fixture = await createFixture();
  try {
    const release = publishedManifestFixture();
    await writeFile(
      join(fixture.root, 'site/release.json'),
      `${JSON.stringify(release, null, 2)}\n`,
    );
    await buildPages({ repositoryRoot: fixture.root });
    const manifestPath = join(fixture.root, '_site/updater/stable.json');
    assert.equal(
      await readFile(manifestPath, 'utf8'),
      serializeUpdaterManifest(buildUpdaterManifest(release), release),
    );
    await assert.rejects(
      stat(join(fixture.root, 'site/updater/stable.json')),
      (error) => error.code === 'ENOENT',
    );
    assert.deepEqual(
      await checkPages({ repositoryRoot: fixture.root }),
      [
        { mode: 'source', files: 11, status: 'published' },
        { mode: 'output', files: 14, status: 'published' },
      ],
    );
    await writeFile(manifestPath, '{}\n');
    await assert.rejects(
      checkPages({ repositoryRoot: fixture.root, mode: 'output' }),
      /manifest가 검증된 release inventory와 다릅니다/,
    );
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
});

test('Pages source는 tracked updater manifest를 항상 거부한다', async () => {
  const fixture = await createFixture();
  try {
    await mkdir(join(fixture.root, 'site/updater'));
    await writeFile(join(fixture.root, 'site/updater/stable.json'), '{}\n');
    await assert.rejects(
      checkPages({ repositoryRoot: fixture.root, mode: 'source' }),
      /manifest는 source에 둘 수 없으며 검증된 output에서만 허용/,
    );
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
});

for (const [name, mutate, expected] of [
  ['prerelease version', (value) => { value.version = '0.2.0-rc.1'; }, /semantic version/],
  ['불일치 tag', (value) => { value.tag = 'v0.1.9'; }, /tag 값/],
  [
    'latest redirect',
    (value) => {
      value.downloads['windows-x86_64-nsis'] =
        'https://github.com/postmelee/alhangeul-tauri/releases/latest/download/Alhangeul_0.2.0_x64-setup.exe';
    },
    /exact release tag/,
  ],
  [
    '다른 repository',
    (value) => {
      value.downloads['windows-x86_64-msi'] =
        'https://github.com/example/alhangeul-tauri/releases/download/v0.2.0/Alhangeul_0.2.0_x64_en-US.msi';
    },
    /exact release tag/,
  ],
  [
    'query redirect',
    (value) => { value.downloads['linux-x86_64-appimage'] += '?download=1'; },
    /query 없는/,
  ],
  [
    'target extension 교차',
    (value) => {
      value.downloads['windows-x86_64-msi'] =
        'https://github.com/postmelee/alhangeul-tauri/releases/download/v0.2.0/Alhangeul_0.2.0_x64-setup.exe';
    },
    /확장자/,
  ],
  [
    'version 없는 artifact',
    (value) => {
      value.downloads['windows-x86_64-nsis'] =
        'https://github.com/postmelee/alhangeul-tauri/releases/download/v0.2.0/Alhangeul_x64-setup.exe';
    },
    /release version/,
  ],
  [
    '조기 updater manifest',
    (value) => { value.updater.manifestPublished = true; },
    /별도 승인 전/,
  ],
]) {
  test(`published fixture의 ${name}를 거부한다`, () => {
    const release = publishedFixture();
    mutate(release);
    assert.throws(() => validateReleaseData(release), expected);
  });
}

test('builder는 source를 보존하고 승인 파일만 결정적으로 출력한다', async () => {
  const fixture = await createFixture();
  try {
    const sourceBefore = await inventory(join(fixture.root, 'site'));
    const first = await buildPages({ repositoryRoot: fixture.root });
    const firstOutput = await inventory(first.outputRoot);
    const second = await buildPages({ repositoryRoot: fixture.root });
    const secondOutput = await inventory(second.outputRoot);

    assert.deepEqual(secondOutput, firstOutput);
    assert.deepEqual(await inventory(join(fixture.root, 'site')), sourceBefore);
    assert.equal(first.sourceFiles, sourceBefore.length);
    assert.equal(first.rootAssets, ROOT_ASSETS.length);
    assert.doesNotMatch(
      await readFile(join(second.outputRoot, 'index.html'), 'utf8'),
      /\.\.\/assets\//,
    );
    assert.doesNotMatch(
      await readFile(join(second.outputRoot, 'updates/index.html'), 'utf8'),
      /\.\.\/\.\.\/assets\//,
    );
    await checkPages({ repositoryRoot: fixture.root });
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
});

test('current source build에는 direct installer와 updater manifest가 없다', async () => {
  const fixture = await createFixture();
  try {
    const { outputRoot } = await buildPages({ repositoryRoot: fixture.root });
    const source = await readFile(join(outputRoot, 'index.html'), 'utf8');
    assert.doesNotMatch(source, /releases\/download\//);
    assert.doesNotMatch(source, /\.(?:msi|exe|AppImage)(?:["'?#]|$)/);
    await assert.rejects(
      stat(join(outputRoot, 'updater/stable.json')),
      (error) => error.code === 'ENOENT',
    );
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
});

test('checker는 깨진 URL과 tree 밖 path traversal을 거부한다', async () => {
  const fixture = await createFixture();
  try {
    await buildPages({ repositoryRoot: fixture.root });
    const indexPath = join(fixture.root, '_site/index.html');
    const source = await readFile(indexPath, 'utf8');
    await writeFile(indexPath, `${source}\n<a href="missing/">missing</a>\n`);
    await assert.rejects(
      checkPages({ repositoryRoot: fixture.root, mode: 'output' }),
      /깨진 내부 URL/,
    );
    await writeFile(indexPath, `${source}\n<a href="updates/#missing">missing hash</a>\n`);
    await assert.rejects(
      checkPages({ repositoryRoot: fixture.root, mode: 'output' }),
      /깨진 내부 hash/,
    );
    await writeFile(indexPath, `${source}\n<a href="../outside.html">outside</a>\n`);
    await assert.rejects(
      checkPages({ repositoryRoot: fixture.root, mode: 'output' }),
      /tree를 벗어난 URL/,
    );
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
});

test('checker는 홈·업데이트·문의 필수 페이지 누락을 거부한다', async () => {
  const fixture = await createFixture();
  try {
    await rm(join(fixture.root, 'site/feedback/index.html'));
    await assert.rejects(
      checkPages({ repositoryRoot: fixture.root, mode: 'source' }),
      /필수 Pages 파일.*feedback\/index\.html/,
    );
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
});

test('builder는 broad·중첩 output 경로를 거부한다', async () => {
  const fixture = await createFixture();
  try {
    await assert.rejects(
      assertBuildLayout(resolveLayout({
        repositoryRoot: fixture.root,
        outputDirectory: fixture.root,
      })),
      /안전한 하위 경로/,
    );
    await assert.rejects(
      assertBuildLayout(resolveLayout({
        repositoryRoot: fixture.root,
        outputDirectory: join(fixture.root, 'site/output'),
      })),
      /서로 포함/,
    );
    assert.throws(
      () => resolveLayout({ repositoryRoot: fixture.root, outputDirectory: '' }),
      /비어 있을 수 없습니다/,
    );
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
});

test('builder는 source symlink와 output symlink를 거부한다', {
  skip: process.platform === 'win32',
}, async () => {
  const fixture = await createFixture();
  try {
    await symlink('release.json', join(fixture.root, 'site/release-link.json'));
    await assert.rejects(
      buildPages({ repositoryRoot: fixture.root }),
      /symlink를 허용하지 않습니다/,
    );
    await rm(join(fixture.root, 'site/release-link.json'));
    await mkdir(join(fixture.root, 'redirected-output'));
    await symlink('redirected-output', join(fixture.root, '_site'));
    await assert.rejects(
      buildPages({ repositoryRoot: fixture.root }),
      /output symlink/,
    );
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
});

test('builder는 site asset의 승인 root asset 경로 충돌을 거부한다', async () => {
  const fixture = await createFixture();
  try {
    const collision = join(fixture.root, 'site', ROOT_ASSETS[0]);
    await mkdir(dirname(collision), { recursive: true });
    await writeFile(collision, 'collision');
    await assert.rejects(
      buildPages({ repositoryRoot: fixture.root }),
      /root asset을 덮어쓸 수 없습니다/,
    );
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
});

function publishedFixture() {
  return {
    status: 'published',
    channel: 'stable',
    version: '0.2.0',
    tag: 'v0.2.0',
    publishedAt: '2026-08-27T00:00:00.000Z',
    notes: 'Alhangeul 0.2.0 release notes',
    downloads: {
      'windows-x86_64-nsis':
        'https://github.com/postmelee/alhangeul-tauri/releases/download/v0.2.0/Alhangeul_0.2.0_x64-setup.exe',
      'windows-x86_64-msi':
        'https://github.com/postmelee/alhangeul-tauri/releases/download/v0.2.0/Alhangeul_0.2.0_x64_en-US.msi',
      'linux-x86_64-appimage':
        'https://github.com/postmelee/alhangeul-tauri/releases/download/v0.2.0/Alhangeul_0.2.0_amd64.AppImage',
    },
    updater: { endpoint: UPDATER_ENDPOINT, manifestPublished: false, inventory: null },
  };
}

function publishedManifestFixture() {
  const release = publishedFixture();
  const signature = fixtureSignature();
  const paths = {
    'windows-x86_64-nsis': ['nsis', `Alhangeul_${release.version}_x64-setup.exe`],
    'windows-x86_64-msi': ['msi', `Alhangeul_${release.version}_x64_en-US.msi`],
    'linux-x86_64-appimage': ['appimage', `Alhangeul_${release.version}_amd64.AppImage`],
  };
  const kinds = {
    'windows-x86_64-nsis': 'nsis',
    'windows-x86_64-msi': 'msi',
    'linux-x86_64-appimage': 'appimage',
  };
  const targets = Object.fromEntries(
    Object.entries(paths).map(([target, [directory, filename]], index) => [target, {
      kind: kinds[target],
      path: `${directory}/${filename}`,
      url: release.downloads[target],
      size: index + 1,
      sha256: String(index + 1).repeat(64),
      signature,
    }]),
  );
  release.updater = {
    endpoint: UPDATER_ENDPOINT,
    manifestPublished: true,
    inventory: {
      schemaVersion: 1,
      repository: 'postmelee/alhangeul-tauri',
      sourceSha: 'a'.repeat(40),
      version: release.version,
      tag: release.tag,
      keyFingerprint: 'f'.repeat(64),
      targets,
    },
  };
  return release;
}

function fixtureSignature() {
  const packet = Buffer.alloc(74);
  packet.write('ED');
  const globalSignature = Buffer.alloc(64);
  const source = [
    'untrusted comment: fixture signature',
    packet.toString('base64'),
    'trusted comment: timestamp:1788048000 file:fixture prehashed',
    globalSignature.toString('base64'),
  ].join('\n');
  return Buffer.from(source).toString('base64');
}

async function createFixture() {
  const tmp = await mkdtemp(join(tmpdir(), 'alhangeul-pages-'));
  const root = join(tmp, 'repository');
  await mkdir(root);
  await cp(join(repositoryRoot, 'site'), join(root, 'site'), { recursive: true });
  for (const asset of ROOT_ASSETS) {
    const output = join(root, asset);
    await mkdir(dirname(output), { recursive: true });
    await cp(join(repositoryRoot, asset), output);
  }
  return { tmp, root };
}

async function inventory(root) {
  const entries = [];
  for (const path of await listSiteFiles(root)) {
    const content = await readFile(join(root, path));
    entries.push([path, createHash('sha256').update(content).digest('hex')]);
  }
  return entries;
}
