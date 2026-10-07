import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse } from 'yaml';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workflow = parse(await readFile(join(repoRoot, '.github/workflows/rhwp-upstream-sync.yml'), 'utf8'));
const steps = ['Commit candidate locally', 'Verify committed candidate automation contract', 'Publish validated draft PR']
  .map(name => workflow.jobs.candidate.steps.find(step => step.name === name));
assert(steps.every(Boolean));
const candidateSha = 'c'.repeat(40);

test('actual workflow publishes only after committed-rhwp and automation pass', async t => {
  const result = await runPipeline(t);
  assert.equal(result.status, 0, result.stderr);
  const positions = ['git commit', 'pnpm run check:committed-rhwp', 'pnpm run test:automation',
    'gh auth setup-git', 'git push', 'gh pr create'].map(marker => result.events.indexOf(marker));
  assert(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])));
  assert.match(result.output, /pr_url=https:\/\/example\.invalid\/pull\/1/);
  assert.match(result.events, /scripts\/linux-thumbnail-core-fixtures\.mjs scripts\/windows-thumbnail-fixtures\.json/);
  assert.equal((result.events.match(/git ls-remote/g) ?? []).length, 2);
});

for (const command of ['check:committed-rhwp', 'test:automation']) {
  test(`actual workflow does not push/open PR after ${command} failure`, async t => {
    const result = await runPipeline(t, { FAIL_GATE: command });
    assert.notEqual(result.status, 0);
    assert.match(result.events, /git commit/);
    assert.doesNotMatch(result.events, /gh auth setup-git|git push|gh pr create/);
    assert.doesNotMatch(result.output, /pr_url=/);
  });
}

for (const [kind, extra] of [
  ['existing branch', { REMOTE_STATUS: '0' }],
  ['remote IO failure', { REMOTE_STATUS: '128' }],
  ['branch appears after validation', { BRANCH_RACE: '1' }],
  ['staging mismatch', { STAGED_PATH: 'secret.txt' }],
  ['changed HEAD', { CHANGE_HEAD: '1' }],
]) {
  test(`actual publisher refuses ${kind}`, async t => {
    const result = await runPipeline(t, extra);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.events, /git push|gh pr create/);
    assert.doesNotMatch(result.output, /pr_url=/);
  });
}

async function runPipeline(t, extra = {}) {
  const root = await mkdtemp(join(tmpdir(), 'alhangeul-sync-publisher-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'scripts'));
  await mkdir(join(root, 'bin'));
  await copyFile(join(repoRoot, 'scripts/rhwp-sync-publisher.sh'), join(root, 'scripts/rhwp-sync-publisher.sh'));
  for (const name of ['git', 'gh', 'pnpm']) {
    const path = join(root, 'bin', name);
    await writeFile(path, fakeCli());
    await chmod(path, 0o755);
  }
  await writeFile(join(root, 'rhwp-sync-changed-paths.txt'), 'README.md\n');
  await writeFile(join(root, 'output'), '');
  const env = { ...process.env, PATH: `${join(root, 'bin')}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`,
    FAKE_LOG: join(root, 'events'), COUNTER: join(root, 'counter'),
    RUNNER_TEMP: root, GITHUB_OUTPUT: join(root, 'output'), GITHUB_STEP_SUMMARY: join(root, 'summary'),
    GH_TOKEN: 'fixture-not-a-credential', APP_SLUG: 'alhangeul-test', BASE_BRANCH: 'devel',
    GITHUB_REPOSITORY: 'example/test', TARGET_TAG: 'v0.8.7', BRANCH: 'automation/rhwp-v0.8.7-full-sync', ...extra };
  let result;
  for (const [index, step] of steps.entries()) {
    if (index === 2) {
      env.CANDIDATE_SHA = (await readFile(env.GITHUB_OUTPUT, 'utf8')).match(/^candidate_sha=([a-f0-9]{40})$/m)?.[1];
      if (extra.CHANGE_HEAD) env.HEAD_SHA = 'd'.repeat(40);
    }
    result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', step.run], { cwd: root, env, encoding: 'utf8' });
    if (result.status !== 0) break;
  }
  return { ...result, events: await readFile(env.FAKE_LOG, 'utf8'), output: await readFile(env.GITHUB_OUTPUT, 'utf8') };
}

function fakeCli() {
  return `#!/usr/bin/env bash
set -eu
cli="$(basename "$0")"
printf '%s %s\\n' "$cli" "$*" >> "$FAKE_LOG"
case "$cli:$1" in
  git:ls-remote)
    n=0; if [[ -f "$COUNTER" ]]; then n="$(cat "$COUNTER")"; fi
    n=$((n + 1)); echo "$n" > "$COUNTER"
    if [[ "\u0024{BRANCH_RACE:-}" == 1 && "$n" -eq 2 ]]; then exit 0; fi
    exit "\u0024{REMOTE_STATUS:-2}" ;;
  git:diff) printf '%s\\n' "\u0024{STAGED_PATH:-README.md}" ;;
  git:rev-parse) echo "\u0024{HEAD_SHA:-${candidateSha}}" ;;
  gh:api) echo 12345 ;;
  gh:pr) echo https://example.invalid/pull/1 ;;
  pnpm:run) if [[ "$2" == "\u0024{FAIL_GATE:-}" ]]; then exit 1; fi ;;
esac
`;
}
