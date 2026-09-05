import assert from 'node:assert/strict';
import {
  mkdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
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
import { ROOT_ASSETS } from '../scripts/pages/site-files.mjs';
import { buildUpdaterManifest, serializeUpdaterManifest } from '../scripts/updater/manifest.mjs';
import {
  createPagesFixture,
  publishedFixture,
  publishedManifestFixture,
  siteInventory,
  unreleasedFixture,
} from './fixtures/pages-release-fixtures.mjs';
import './pages-design.test.mjs';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const createFixture = () => createPagesFixture(unreleasedFixture());
const inventory = siteInventory;

test('tracked release data는 현재 상태의 전체 계약을 통과하고 source를 바꾸지 않는다', async () => {
  const releasePath = join(repositoryRoot, 'site/release.json');
  const sourceBefore = await readFile(releasePath, 'utf8');
  const release = JSON.parse(sourceBefore);
  assert.equal(validateReleaseData(release, { allowManifestPublished: true }), release);
  assert.deepEqual(
    await checkPages({ repositoryRoot, mode: 'source' }),
    [{ mode: 'source', files: 11, status: release.status }],
  );
  assert.equal(await readFile(releasePath, 'utf8'), sourceBefore);
});

test('고정 unreleased fixture는 unpublished fail-closed 계약을 지킨다', () => {
  const release = unreleasedFixture();
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

for (const [name, releaseFactory, outputFiles] of [
  ['unreleased', unreleasedFixture, 13],
  ['published + manifest false', publishedFixture, 13],
  ['published + manifest true', publishedManifestFixture, 14],
]) {
  test(`${name} fixture는 source 검사부터 output 검사까지 통과하고 source를 보존한다`, async () => {
    const fixture = await createPagesFixture(releaseFactory());
    try {
      const sourceBefore = await siteInventory(join(fixture.root, 'site'));
      assert.deepEqual(
        await checkPages({ repositoryRoot: fixture.root, mode: 'source' }),
        [{ mode: 'source', files: 11, status: releaseFactory().status }],
      );
      await buildPages({ repositoryRoot: fixture.root });
      assert.deepEqual(
        await checkPages({ repositoryRoot: fixture.root, mode: 'output' }),
        [{ mode: 'output', files: outputFiles, status: releaseFactory().status }],
      );
      assert.deepEqual(await siteInventory(join(fixture.root, 'site')), sourceBefore);
    } finally {
      await fixture.cleanup();
    }
  });
}

test('published fixture는 exact tag와 MSI/NSIS/AppImage URL만 승인한다', () => {
  const release = publishedFixture();
  assert.equal(validateReleaseData(release), release);
});

test('manifestPublished=true이면 complete inventory에서 output manifest만 생성한다', async () => {
  const release = publishedManifestFixture();
  const fixture = await createPagesFixture(release);
  try {
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
    await fixture.cleanup();
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
  ['누락 download URL', (value) => { value.downloads['windows-x86_64-nsis'] = null; }, /URL이 필요/],
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

test('unreleased fixture의 공개 필드 혼입을 거부한다', () => {
  const release = unreleasedFixture();
  release.version = '0.2.0';
  assert.throws(() => validateReleaseData(release), /version 값/);
});

for (const [name, mutate, expected] of [
  [
    '불완전 inventory',
    (value) => { delete value.updater.inventory.targets['windows-x86_64-msi']; },
    /targets key/,
  ],
  [
    'download와 불일치하는 inventory',
    (value) => { value.updater.inventory.targets['windows-x86_64-nsis'].url += '?drift'; },
    /exact release URL/,
  ],
]) {
  test(`manifest published fixture의 ${name}를 거부한다`, () => {
    const release = publishedManifestFixture();
    mutate(release);
    assert.throws(
      () => validateReleaseData(release, { allowManifestPublished: true }),
      expected,
    );
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
