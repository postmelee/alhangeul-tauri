import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { fetchPinnedRhwpTagFromPin } from '../scripts/fetch-rhwp-pin-tag.mjs';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fixtureRoot = resolve('/fixture/alhangeul-tauri');
const submoduleDir = resolve(fixtureRoot, 'third_party/rhwp');
const pin = Object.freeze({
  rhwp_repo: 'https://github.com/edwardkim/rhwp.git',
  rhwp_release_tag: 'v0.8.2',
  rhwp_commit: '9b16aa9e23f476e2b335d7c029fc9f24a199d63c',
});
const [ciWorkflow, desktopWorkflow] = await Promise.all([
  readFile(join(projectRoot, '.github/workflows/ci.yml'), 'utf8'),
  readFile(join(projectRoot, '.github/workflows/alhangeul-desktop.yml'), 'utf8'),
]);

test('lock의 exact release tag 하나만 shallow fetch하고 commit을 재검증한다', () => {
  const calls = [];
  const gitRunner = createGitRunner(calls);

  fetchPinnedRhwpTagFromPin({ repoRoot: fixtureRoot, pin, gitRunner });

  assert.deepEqual(calls, [
    [['remote', 'get-url', 'origin'], submoduleDir],
    [['rev-parse', 'HEAD'], submoduleDir],
    [
      [
        'fetch',
        '--no-tags',
        '--depth=1',
        'origin',
        '+refs/tags/v0.8.2:refs/tags/v0.8.2',
      ],
      submoduleDir,
    ],
    [['rev-parse', '--verify', 'refs/tags/v0.8.2^{commit}'], submoduleDir],
  ]);
});

test('submodule origin 불일치는 network fetch 전에 거부한다', () => {
  const calls = [];
  const gitRunner = createGitRunner(calls, {
    origin: 'https://example.invalid/rhwp.git',
  });

  assert.throws(
    () => fetchPinnedRhwpTagFromPin({ repoRoot: fixtureRoot, pin, gitRunner }),
    /submodule origin이 lock repository와 다릅니다/,
  );
  assert.equal(calls.length, 1);
});

test('submodule HEAD 불일치는 network fetch 전에 거부한다', () => {
  const calls = [];
  const gitRunner = createGitRunner(calls, { head: 'a'.repeat(40) });

  assert.throws(
    () => fetchPinnedRhwpTagFromPin({ repoRoot: fixtureRoot, pin, gitRunner }),
    /submodule HEAD가 lock commit과 다릅니다/,
  );
  assert.equal(calls.length, 2);
});

test('fetch 뒤 release tag가 lock commit과 다르면 거부한다', () => {
  const calls = [];
  const gitRunner = createGitRunner(calls, { tagCommit: 'b'.repeat(40) });

  assert.throws(
    () => fetchPinnedRhwpTagFromPin({ repoRoot: fixtureRoot, pin, gitRunner }),
    /release tag와 lock commit이 다릅니다/,
  );
  assert.equal(calls.length, 4);
});

test('CI는 pinned tag fetch 뒤 기존 provenance gate를 실행한다', () => {
  assert.match(
    ciWorkflow,
    /- name: Fetch rhwp pinned release tag\n        run: pnpm run fetch:rhwp-pin-tag/,
  );
  assertOrdered(ciWorkflow, [
    'pnpm run fetch:rhwp-pin-tag',
    'pnpm run check:rhwp-pin',
  ]);
  assertMinimalCheckout(ciWorkflow, 'ci.yml');
});

test('desktop matrix는 pretest에서만 pinned tag를 fetch하고 provenance를 검증한다', () => {
  assert.match(
    desktopWorkflow,
    /- name: Fetch rhwp pinned release tag\n        if: inputs\.run_tests\n        run: pnpm run fetch:rhwp-pin-tag/,
  );
  assertOrdered(desktopWorkflow, [
    'pnpm run fetch:rhwp-pin-tag',
    'pnpm run check:rhwp-pin',
  ]);
  assertMinimalCheckout(desktopWorkflow, 'alhangeul-desktop.yml');
});

function createGitRunner(
  calls,
  {
    origin = pin.rhwp_repo,
    head = pin.rhwp_commit,
    tagCommit = pin.rhwp_commit,
  } = {},
) {
  return (args, cwd) => {
    calls.push([args, cwd]);
    const command = args.join(' ');
    if (command === 'remote get-url origin') return origin;
    if (command === 'rev-parse HEAD') return head;
    if (command === 'fetch --no-tags --depth=1 origin +refs/tags/v0.8.2:refs/tags/v0.8.2') {
      return '';
    }
    if (command === 'rev-parse --verify refs/tags/v0.8.2^{commit}') {
      return tagCommit;
    }
    throw new Error(`예상하지 않은 git command: ${command}`);
  };
}

function assertOrdered(source, markers) {
  let previous = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    assert.notEqual(index, -1, `workflow marker가 필요합니다: ${marker}`);
    assert.ok(index > previous, `workflow 순서가 올바르지 않습니다: ${marker}`);
    previous = index;
  }
}

function assertMinimalCheckout(source, name) {
  assert.doesNotMatch(
    source,
    /^\s+fetch-depth:\s*0\s*$/m,
    `${name}은 전체 history를 fetch하지 않는다`,
  );
  assert.doesNotMatch(
    source,
    /^\s+fetch-tags:\s*true\s*$/m,
    `${name}은 모든 tag를 fetch하지 않는다`,
  );
}
