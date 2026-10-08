import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  MANAGED_REFERENCE_PATHS,
  updateRhwpManagedReferences,
} from '../scripts/update-rhwp-managed-references.mjs';
import { readRhwpPin } from '../scripts/verify-rhwp-pin.mjs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fromTag = 'v0.8.2';
const toTag = 'v0.8.4';
const fromCommit = 'a'.repeat(40);
const toCommit = 'b'.repeat(40);

test('허용된 current pin 참조만 새 tag와 commit으로 갱신한다', async () => {
  const fixture = await createFixture();
  try {
    const historicalBefore = await historicalSources(fixture.root);
    const result = await updateRhwpManagedReferences(options(fixture.root));

    assert.deepEqual(result.changedFiles, MANAGED_REFERENCE_PATHS);
    const readme = await source(fixture.root, 'README.md');
    assert.ok(readme.includes(`현재 Stable pin: \`${toTag}\` (\`${toCommit}\`)`));
    assert.ok(readme.includes(`[![포함된 rhwp ${toTag}]`));
    assert.ok(readme.includes(`/badge/bundled%20rhwp-${toTag}-5865f2`));
    assert.ok(readme.includes(`](https://github.com/edwardkim/rhwp/releases/tag/${toTag})`));
    const development = await source(fixture.root, 'docs/DEVELOPMENT.md');
    assert.match(development, new RegExp(`rhwp ${toTag}.*${toCommit}`));
    assert.match(development, new RegExp(`--tag ${toTag}.*--commit ${toCommit}`, 's'));
    assert.match(development, /upstream `v0\.8\.2` known issue/);
    const upstream = await source(fixture.root, 'docs/architecture/UPSTREAM.md');
    assert.ok(upstream.includes(`Stable release tag: \`${toTag}\``));
    assert.match(upstream, /## `v0\.8\.2` known issue 분류/);
    const pinTest = await source(fixture.root, 'tests/rhwp-pin.test.mjs');
    assert.match(pinTest, new RegExp(`rhwp_release_tag, '${toTag}'`));
    assert.match(pinTest, new RegExp(`rhwp_commit, '${toCommit}'`));
    const boundary = await source(
      fixture.root,
      'apps/studio-host/src/core/upstream-boundary.test.ts',
    );
    assert.match(boundary, new RegExp(`expectedUpstreamCommit = '${toCommit}'`));
    assert.match(boundary, new RegExp(`releaseTag\\)\\.toBe\\('${toTag}'\\)`));
    const linux = await source(fixture.root, 'scripts/linux-thumbnail-core-fixtures.mjs');
    assert.ok(linux.includes(`RHWP_SHA = '${toCommit}'`));
    assert.ok(linux.includes(`HISTORICAL_SHA = '${fromCommit}'`));
    const windows = JSON.parse(await source(fixture.root, 'scripts/windows-thumbnail-fixtures.json'));
    assert.equal(windows.rhwpSha, toCommit);
    assert.equal(windows.previousSha, fromCommit);
    assert.deepEqual(windows.fixtures, [{ sha256: 'c'.repeat(64), bytes: 10 }]);
    assert.deepEqual(await historicalSources(fixture.root), historicalBefore);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

for (const [label, mutate] of [
  ['누락', (line) => ''],
  ['중복', (line) => `${line}\n${line}`],
  ['표시 버전 불일치', (line) => line.replace(`rhwp-${fromTag}-`, 'rhwp-v9.9.9-')],
  ['링크 불일치', (line) => line.replace(`/tag/${fromTag}`, '/tag/v9.9.9')],
]) {
  test(`rhwp 배지 ${label} 시 어떤 파일도 쓰지 않는다`, async () => {
    const fixture = await createFixture();
    let writes = 0;
    try {
      const readmePath = join(fixture.root, 'README.md');
      const readme = await readFile(readmePath, 'utf8');
      const badge = readme.split('\n').find((line) => line.startsWith('[![포함된 rhwp'));
      await writeFile(readmePath, readme.replace(badge, mutate(badge)));
      const before = await managedSources(fixture.root);
      await assert.rejects(
        updateRhwpManagedReferences({
          ...options(fixture.root),
          io: {
            readFile,
            writeFile: async (...args) => {
              writes += 1;
              return writeFile(...args);
            },
          },
        }),
        /bundled-rhwp-badge marker 개수가 올바르지 않습니다/,
      );
      assert.equal(writes, 0);
      assert.deepEqual(await managedSources(fixture.root), before);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
}

test('marker가 하나라도 다르면 어떤 파일도 쓰지 않는다', async () => {
  const fixture = await createFixture();
  let writes = 0;
  try {
    const boundaryPath = join(
      fixture.root,
      'apps/studio-host/src/core/upstream-boundary.test.ts',
    );
    const boundary = await readFile(boundaryPath, 'utf8');
    await writeFile(boundaryPath, boundary.replace(
      `expect(releaseTag).toBe('${fromTag}')`,
      "expect(releaseTag).toBe('v9.9.9')",
    ));
    const before = await managedSources(fixture.root);

    await assert.rejects(
      updateRhwpManagedReferences({
        ...options(fixture.root),
        io: {
          readFile,
          writeFile: async (...args) => {
            writes += 1;
            return writeFile(...args);
          },
        },
      }),
      /expected-release-tag marker 개수가 올바르지 않습니다/,
    );
    assert.equal(writes, 0);
    assert.deepEqual(await managedSources(fixture.root), before);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

for (const path of ['scripts/linux-thumbnail-core-fixtures.mjs', 'scripts/windows-thumbnail-fixtures.json']) {
  for (const kind of ['missing', 'duplicate']) {
    test(`fixture marker ${kind}를 거부하고 다른 참조도 보존한다: ${path}`, async () => {
      const fixture = await createFixture();
      try {
        const original = await source(fixture.root, path);
        await writeFile(join(fixture.root, path), kind === 'missing'
          ? original.replace(fromCommit, 'd'.repeat(40)) : `${original}\n${original}`);
        const before = await managedSources(fixture.root);
        await assert.rejects(updateRhwpManagedReferences(options(fixture.root)), /fixture-pin marker 개수/);
        assert.deepEqual(await managedSources(fixture.root), before);
      } finally { await rm(fixture.root, { recursive: true, force: true }); }
    });
  }
}

test('동일 tag와 commit 재실행은 파일 I/O 없는 no-op이다', async () => {
  const result = await updateRhwpManagedReferences({
    fromTag,
    fromCommit,
    toTag: fromTag,
    toCommit: fromCommit,
    repositoryRoot: '/does/not/exist',
    io: {
      readFile: async () => assert.fail('no-op은 파일을 읽지 않아야 한다'),
      writeFile: async () => assert.fail('no-op은 파일을 쓰지 않아야 한다'),
    },
  });
  assert.deepEqual(result.changedFiles, []);
});

test('tag와 commit 일부만 같은 혼합 갱신을 거부한다', async () => {
  await assert.rejects(
    updateRhwpManagedReferences({
      fromTag,
      fromCommit,
      toTag: fromTag,
      toCommit,
    }),
    /tag와 commit은 함께 변경되거나 함께 동일해야 합니다/,
  );
});

test('실제 저장소의 관리 marker가 current lock과 정렬되어 있다', async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'alhangeul-managed-snapshot-'));
  try {
    for (const path of MANAGED_REFERENCE_PATHS) {
      await mkdir(dirname(join(fixtureRoot, path)), { recursive: true });
      await writeFile(join(fixtureRoot, path), await source(repoRoot, path));
    }
    const pin = await readRhwpPin({ repoRoot });
    const result = await updateRhwpManagedReferences({
      repositoryRoot: fixtureRoot,
      fromTag: pin.rhwp_release_tag,
      fromCommit: pin.rhwp_commit,
      toTag: 'v999.0.0',
      toCommit: 'f'.repeat(40),
    });
    assert.deepEqual(result.changedFiles, MANAGED_REFERENCE_PATHS);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'alhangeul-managed-refs-'));
  const files = new Map([
    ['README.md', `# Alhangeul

[![포함된 rhwp ${fromTag}](https://img.shields.io/badge/bundled%20rhwp-${fromTag}-5865f2)](https://github.com/edwardkim/rhwp/releases/tag/${fromTag})

- 현재 Stable pin: \`${fromTag}\` (\`${fromCommit}\`)
`],
    ['docs/DEVELOPMENT.md', developmentSource()],
    ['docs/architecture/UPSTREAM.md', upstreamSource()],
    [
      'tests/rhwp-pin.test.mjs',
      `test('actual pin', () => {\n  assert.equal(pin.rhwp_release_tag, '${fromTag}');\n  assert.equal(pin.rhwp_commit, '${fromCommit}');\n});\n`,
    ],
    [
      'apps/studio-host/src/core/upstream-boundary.test.ts',
      `const expectedUpstreamCommit = '${fromCommit}';\nexpect(releaseTag).toBe('history');\n    expect(releaseTag).toBe('${fromTag}');\n`,
    ],
    ['scripts/linux-thumbnail-core-fixtures.mjs',
      `export const RHWP_SHA = '${fromCommit}';\nexport const HISTORICAL_SHA = '${fromCommit}';\n`],
    ['scripts/windows-thumbnail-fixtures.json',
      JSON.stringify({ rhwpSha: fromCommit, previousSha: fromCommit, fixtures: [{ sha256: 'c'.repeat(64), bytes: 10 }] }, null, 2)],
    ['tests/rhwp-pin-fetch.test.mjs', `const fixtureTag = '${fromTag}';\n`],
    [
      'apps/studio-host/src/core/local-fonts.test.ts',
      `test('${fromTag} historical font contract', () => {});\n`,
    ],
    [
      'docs/operations/DESKTOP_RELEASE.md',
      `Task #13 accepted ${fromTag} (${fromCommit}).\n`,
    ],
  ]);
  for (const [path, contents] of files) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), contents);
  }
  return { root };
}

function developmentSource() {
  return `# Development

현재 source submodule, native Cargo lock과 bundled WASM은 \`rhwp ${fromTag}\`의 resolved commit \`${fromCommit}\`로 고정되어 있다.

\`\`\`sh
scripts/update-upstream.sh \\
  --tag ${fromTag} \\
  --commit ${fromCommit} \\
  --run-checks
\`\`\`

새 pin의 실패가 upstream \`${fromTag}\` known issue와 같은 이름이라는 이유만으로 면제하지 않는다.
`;
}

function upstreamSource() {
  return `# Upstream

- Stable release tag: \`${fromTag}\`
- resolved commit: \`${fromCommit}\`

\`\`\`sh
scripts/update-upstream.sh \\
  --tag ${fromTag} \\
  --commit ${fromCommit} \\
  --run-checks
\`\`\`

## \`${fromTag}\` known issue 분류
`;
}

function options(repositoryRoot) {
  return { repositoryRoot, fromTag, fromCommit, toTag, toCommit };
}

async function source(root, path) {
  return readFile(join(root, path), 'utf8');
}

async function managedSources(root) {
  return Promise.all(MANAGED_REFERENCE_PATHS.map(async (path) => [path, await source(root, path)]));
}

async function historicalSources(root) {
  const paths = [
    'tests/rhwp-pin-fetch.test.mjs',
    'apps/studio-host/src/core/local-fonts.test.ts',
    'docs/operations/DESKTOP_RELEASE.md',
  ];
  return Promise.all(paths.map(async (path) => [path, await source(root, path)]));
}
