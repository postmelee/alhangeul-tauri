import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RHWP_SYNC_ALLOWED_PATHS,
  validateRhwpSyncChanges,
  verifyRhwpSyncChanges,
} from '../scripts/verify-rhwp-sync-changes.mjs';

test('tracked·untracked changed path를 정렬한 exact allowlist로 쓴다', async () => {
  const writes = [];
  const calls = [];
  const result = await verifyRhwpSyncChanges({
    repositoryRoot: '/repo',
    output: '/tmp/changed.txt',
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
  assert.deepEqual(writes, [['/tmp/changed.txt', 'README.md\nrhwp-core.lock\n']]);
  assert.ok(calls.includes('diff --check'));
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
