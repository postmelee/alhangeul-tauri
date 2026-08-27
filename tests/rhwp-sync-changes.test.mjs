import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
  RHWP_SYNC_ALLOWED_PATHS,
  validateRhwpSyncChanges,
  verifyRhwpSyncChanges,
} from '../scripts/verify-rhwp-sync-changes.mjs';

function git(repositoryRoot, args) {
  const result = spawnSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  assert.equal(
    result.status,
    0,
    `git ${args.join(' ')} 실패: ${result.error?.message ?? result.stderr.trim()}`,
  );
  return result.stdout;
}

test('tracked·untracked changed path를 정렬한 exact allowlist로 쓴다', async () => {
  const writes = [];
  const calls = [];
  const output = resolve('/tmp/changed.txt');
  const result = await verifyRhwpSyncChanges({
    repositoryRoot: '/repo',
    output,
    run: (_command, args) => {
      calls.push(args.join(' '));
      if (args[0] === 'status') return ' M rhwp-core.lock\n?? README.md';
      if (args[0] === 'diff' && args.includes('--name-only')) return 'rhwp-core.lock';
      if (args[0] === 'ls-files') return 'README.md';
      return '';
    },
    writeFile: async (path, source) => writes.push([path, source]),
  });
  assert.deepEqual(result, ['README.md', 'rhwp-core.lock']);
  assert.deepEqual(writes, [[resolve('/tmp/changed.txt'), 'README.md\nrhwp-core.lock\n']]);
  assert.ok(calls.includes('diff --check'));
});

test('production runner가 첫 porcelain record의 선행 status 공백을 보존한다', async (t) => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), 'alhangeul-rhwp-sync-repo-'));
  const outputRoot = await mkdtemp(join(tmpdir(), 'alhangeul-rhwp-sync-output-'));
  t.after(async () => {
    await Promise.all([
      rm(repositoryRoot, { recursive: true, force: true }),
      rm(outputRoot, { recursive: true, force: true }),
    ]);
  });

  git(repositoryRoot, ['init']);
  git(repositoryRoot, ['config', 'user.email', 'automation-test@example.invalid']);
  git(repositoryRoot, ['config', 'user.name', 'Alhangeul Automation Test']);
  await writeFile(join(repositoryRoot, 'README.md'), 'current\n');
  git(repositoryRoot, ['add', 'README.md']);
  git(repositoryRoot, ['commit', '-m', 'initial']);
  await writeFile(join(repositoryRoot, 'README.md'), 'target\n');

  assert.equal(git(repositoryRoot, ['status', '--porcelain=v1']), ' M README.md\n');
  const output = join(outputRoot, 'changed.txt');
  const result = await verifyRhwpSyncChanges({ repositoryRoot, output });

  assert.deepEqual(result, ['README.md']);
  assert.equal(await readFile(output, 'utf8'), 'README.md\n');
});

test('status·diff·untracked 어느 경로에서든 allowlist 밖 파일을 거부한다', () => {
  for (const input of [
    { status: ' M secret.txt', diff: 'rhwp-core.lock', untracked: '' },
    { status: ' M rhwp-core.lock', diff: 'secret.txt', untracked: '' },
    { status: '?? secret.txt', diff: '', untracked: 'secret.txt' },
  ]) {
    assert.throws(() => validateRhwpSyncChanges(input), /Changed path is not allowed: secret\.txt/);
  }
});

test('변경 경로가 비어 있으면 candidate 생성을 거부한다', () => {
  assert.throws(
    () => validateRhwpSyncChanges({ status: '', diff: '', untracked: '' }),
    /Upstream sync produced no changes/,
  );
});

test('allowlist와 중복 경로가 없다', () => {
  assert.equal(new Set(RHWP_SYNC_ALLOWED_PATHS).size, RHWP_SYNC_ALLOWED_PATHS.length);
});
