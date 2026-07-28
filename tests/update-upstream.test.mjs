import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptPath = join(repoRoot, 'scripts/update-upstream.sh');
const upstreamScriptTest = process.platform === 'win32' ? test.skip : test;

upstreamScriptTest('updates a clean upstream submodule to a verified lightweight release tag', async () => {
  const fixture = await createFixture();
  try {
    const release = await createRelease(fixture, { tag: 'v0.1.0' });

    const result = runUpdateScript(fixture.parent, [
      '--tag',
      release.tag,
      '--commit',
      release.commit,
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Stable upstream source checkout updated\./);
    assert.match(result.stdout, /Release tag: v0\.1\.0/);
    assert.match(result.stdout, new RegExp(`Resolved commit: ${release.commit}`));
    assert.equal(
      git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim(),
      release.commit,
    );
    assert.match(
      git(['status', '--short'], { cwd: fixture.parent }).stdout,
      /^ M third_party\/rhwp$/m,
    );
  } finally {
    await cleanup(fixture.tmp);
  }
});

upstreamScriptTest('resolves an annotated release tag to its commit', async () => {
  const fixture = await createFixture();
  try {
    const release = await createRelease(fixture, {
      tag: 'v0.2.0',
      annotated: true,
    });

    const result = runUpdateScript(fixture.parent, [
      '--tag',
      release.tag,
      '--commit',
      release.commit,
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Release tag: v0\.2\.0/);
    assert.equal(
      git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim(),
      release.commit,
    );
  } finally {
    await cleanup(fixture.tmp);
  }
});

upstreamScriptTest('requires immutable Stable tag and full commit arguments before fetch', async () => {
  const fixture = await createFixture();
  try {
    const before = git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim();
    const fullCommit = 'a'.repeat(40);
    const cases = [
      { args: [], error: /--tag is required/ },
      { args: ['--tag', 'v0.1.0'], error: /--commit is required/ },
      { args: ['--commit', fullCommit], error: /--tag is required/ },
      {
        args: ['--tag', 'main', '--commit', fullCommit],
        error: /Stable release tag in vX\.Y\.Z form/,
      },
      {
        args: ['--tag', 'v0.1.0-rc.1', '--commit', fullCommit],
        error: /Stable release tag in vX\.Y\.Z form/,
      },
      {
        args: ['--tag', 'v01.0.0', '--commit', fullCommit],
        error: /Stable release tag in vX\.Y\.Z form/,
      },
      {
        args: ['--tag', 'v0.1.0', '--commit', 'abc123'],
        error: /lowercase 40-character SHA/,
      },
      {
        args: ['--tag', 'v0.1.0', '--tag', 'v0.2.0', '--commit', fullCommit],
        error: /--tag may only be specified once/,
      },
      {
        args: ['--tag', 'v0.1.0', '--commit', fullCommit, '--commit', fullCommit],
        error: /--commit may only be specified once/,
      },
    ];

    for (const entry of cases) {
      const result = runUpdateScript(fixture.parent, entry.args);
      assert.equal(result.status, 2, result.stderr);
      assert.match(result.stderr, entry.error);
      assert.equal(
        git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim(),
        before,
      );
    }
  } finally {
    await cleanup(fixture.tmp);
  }
});

upstreamScriptTest('rejects a tag and commit mismatch without changing the checkout', async () => {
  const fixture = await createFixture();
  try {
    const before = git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim();
    const release = await createRelease(fixture, { tag: 'v0.3.0' });

    const result = runUpdateScript(fixture.parent, [
      '--tag',
      release.tag,
      '--commit',
      release.postReleaseCommit,
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Release tag and expected commit do not match/);
    assert.match(result.stderr, new RegExp(`Resolved: ${release.commit}`));
    assert.match(result.stderr, new RegExp(`Expected: ${release.postReleaseCommit}`));
    assert.equal(
      git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim(),
      before,
    );
  } finally {
    await cleanup(fixture.tmp);
  }
});

upstreamScriptTest('rejects branch, floating ref, and positional ref inputs', async () => {
  const fixture = await createFixture();
  try {
    const before = git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim();
    for (const args of [
      ['--branch', 'main'],
      ['--ref', 'origin/main'],
      ['v0.1.0'],
    ]) {
      const result = runUpdateScript(fixture.parent, args);
      assert.equal(result.status, 2, result.stderr);
      assert.match(result.stderr, /unknown option or positional ref/);
      assert.equal(
        git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim(),
        before,
      );
    }
  } finally {
    await cleanup(fixture.tmp);
  }
});

upstreamScriptTest('rejects legacy upstream environment variables', async () => {
  const fixture = await createFixture();
  try {
    const before = git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim();
    const args = ['--tag', 'v0.1.0', '--commit', 'a'.repeat(40)];
    for (const name of [
      'UPSTREAM_BRANCH',
      'UPSTREAM_REMOTE',
      'UPSTREAM_REF',
      'RUN_CHECKS',
    ]) {
      const result = runUpdateScript(fixture.parent, args, { [name]: 'legacy' });
      assert.equal(result.status, 2, result.stderr);
      assert.match(result.stderr, new RegExp(`${name} is no longer supported`));
      assert.equal(
        git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim(),
        before,
      );
    }
  } finally {
    await cleanup(fixture.tmp);
  }
});

upstreamScriptTest('rejects an origin that differs from .gitmodules before fetch', async () => {
  const fixture = await createFixture();
  try {
    const before = git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim();
    git(['remote', 'set-url', 'origin', `${fixture.upstreamBare}-other`], {
      cwd: fixture.submodule,
    });

    const result = runUpdateScript(fixture.parent, [
      '--tag',
      'v0.1.0',
      '--commit',
      'a'.repeat(40),
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Upstream submodule origin does not match \.gitmodules/);
    assert.equal(
      git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim(),
      before,
    );
  } finally {
    await cleanup(fixture.tmp);
  }
});

upstreamScriptTest('fails before fetch when the upstream submodule is missing', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'alhangeul-update-upstream-'));
  try {
    git(['init', '-b', 'main'], { cwd: tmp });

    const result = runUpdateScript(tmp, [
      '--tag',
      'v0.1.0',
      '--commit',
      'a'.repeat(40),
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing upstream submodule at third_party\/rhwp\./);
    assert.match(result.stderr, /git submodule update --init --recursive/);
  } finally {
    await cleanup(tmp);
  }
});

upstreamScriptTest('refuses to update when the upstream submodule has local changes', async () => {
  const fixture = await createFixture();
  try {
    const before = git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim();
    const release = await createRelease(fixture, { tag: 'v0.4.0' });
    await writeFile(join(fixture.submodule, 'dirty.txt'), 'local change');

    const result = runUpdateScript(fixture.parent, [
      '--tag',
      release.tag,
      '--commit',
      release.commit,
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Upstream submodule has local changes/);
    assert.equal(
      git(['rev-parse', 'HEAD'], { cwd: fixture.submodule }).stdout.trim(),
      before,
    );
  } finally {
    await cleanup(fixture.tmp);
  }
});

upstreamScriptTest('--run-checks runs only platform-neutral commands in order', async () => {
  const fixture = await createFixture();
  try {
    const release = await createRelease(fixture, { tag: 'v0.5.0' });
    const fakeBin = join(fixture.tmp, 'fake-bin');
    await mkdir(fakeBin, { recursive: true });
    const logPath = join(fixture.tmp, 'commands.log');
    await writeFile(
      join(fakeBin, 'pnpm'),
      `#!/usr/bin/env bash\nprintf 'pnpm %s\\n' "$*" >> "$ALHANGEUL_COMMAND_LOG"\n`,
      { mode: 0o755 },
    );
    await writeFile(
      join(fakeBin, 'cargo'),
      `#!/usr/bin/env bash\nprintf 'cargo %s\\n' "$*" >> "$ALHANGEUL_COMMAND_LOG"\n`,
      { mode: 0o755 },
    );

    const result = runUpdateScript(
      fixture.parent,
      [
        '--tag',
        release.tag,
        '--commit',
        release.commit,
        '--run-checks',
      ],
      {
        ALHANGEUL_COMMAND_LOG: logPath,
        PATH: `${fakeBin}:${process.env.PATH}`,
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual((await readFile(logPath, 'utf8')).trim().split('\n'), [
      'pnpm install --frozen-lockfile',
      'pnpm run check:product-boundary',
      'pnpm run test:upstream',
      'pnpm run test:studio',
      'pnpm run build:studio',
      'cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps',
      'cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check',
    ]);
  } finally {
    await cleanup(fixture.tmp);
  }
});

async function createFixture() {
  const tmp = await mkdtemp(join(tmpdir(), 'alhangeul-update-upstream-'));
  const upstreamWork = join(tmp, 'upstream-work');
  const upstreamBare = join(tmp, 'upstream.git');
  const parent = join(tmp, 'parent');
  const submodule = join(parent, 'third_party/rhwp');

  await mkdir(upstreamWork, { recursive: true });
  git(['init', '-b', 'main'], { cwd: upstreamWork });
  configureGitIdentity(upstreamWork);
  await commitUpstream(upstreamWork, 'README.md', 'initial');
  git(['clone', '--bare', upstreamWork, upstreamBare], { cwd: tmp });
  git(['remote', 'add', 'origin', upstreamBare], { cwd: upstreamWork });

  await mkdir(parent, { recursive: true });
  git(['init', '-b', 'main'], { cwd: parent });
  configureGitIdentity(parent);
  git(
    ['-c', 'protocol.file.allow=always', 'submodule', 'add', upstreamBare, 'third_party/rhwp'],
    { cwd: parent },
  );
  git(['commit', '-am', 'add submodule'], { cwd: parent });

  return { tmp, upstreamWork, upstreamBare, parent, submodule };
}

async function createRelease(fixture, { tag, annotated = false }) {
  await commitUpstream(fixture.upstreamWork, `release-${tag}.txt`, tag);
  const commit = git(['rev-parse', 'HEAD'], { cwd: fixture.upstreamWork }).stdout.trim();

  if (annotated) {
    git(['tag', '-a', tag, '-m', `release ${tag}`], { cwd: fixture.upstreamWork });
  } else {
    git(['tag', tag], { cwd: fixture.upstreamWork });
  }
  git(['push', 'origin', 'main'], { cwd: fixture.upstreamWork });
  git(['push', 'origin', tag], { cwd: fixture.upstreamWork });

  await commitUpstream(fixture.upstreamWork, `post-${tag}.txt`, `post ${tag}`);
  const postReleaseCommit = git(['rev-parse', 'HEAD'], {
    cwd: fixture.upstreamWork,
  }).stdout.trim();
  git(['push', 'origin', 'main'], { cwd: fixture.upstreamWork });

  return { tag, commit, postReleaseCommit };
}

async function commitUpstream(cwd, name, content) {
  await writeFile(join(cwd, name), content);
  git(['add', name], { cwd });
  git(['commit', '-m', `add ${name}`], { cwd });
}

function configureGitIdentity(cwd) {
  git(['config', 'user.email', 'test@example.com'], { cwd });
  git(['config', 'user.name', 'Test User'], { cwd });
}

function runUpdateScript(cwd, args = [], env = {}) {
  return spawnSync('bash', [scriptPath, ...args], {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    encoding: 'utf8',
  });
}

function git(args, { cwd }) {
  const result = spawnSync('git', args, {
    cwd,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
    },
    encoding: 'utf8',
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
