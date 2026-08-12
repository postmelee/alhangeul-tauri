import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workflowPath = join(repoRoot, '.github/workflows/rhwp-upstream-sync.yml');
const workflow = await readFile(workflowPath, 'utf8');
const resolveJob = getJob(workflow, 'resolve');
const candidateJob = getJob(workflow, 'candidate');

test('daily schedule과 안전한 수동 dry-run input을 제공한다', () => {
  const trigger = getTopLevelSection(workflow, 'on').join('\n');
  assert.match(trigger, /^  workflow_dispatch:$/m);
  assert.match(trigger, /^      target_tag:$/m);
  assert.match(trigger, /^      dry_run:$/m);
  assert.match(trigger, /^        default: true$/m);
  assert.match(trigger, /^  schedule:$/m);
  assert.match(trigger, /^    - cron: "23 1 \* \* \*"$/m);
  assert.match(
    resolveJob,
    /DRY_RUN_INPUT: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.dry_run \|\| false \}\}/,
  );
});

test('top-level token은 read-only이고 concurrency가 writer를 직렬화한다', () => {
  assert.deepEqual(
    getSectionAssignments(workflow, 'permissions'),
    new Map([['contents', 'read'], ['pull-requests', 'read']]),
  );
  const concurrency = getTopLevelSection(workflow, 'concurrency').join('\n');
  assert.match(concurrency, /^  group: rhwp-upstream-sync$/m);
  assert.match(concurrency, /^  cancel-in-progress: false$/m);
});

test('resolve job은 devel의 full submodule에서 Node 24 read-only helper만 실행한다', () => {
  assert.match(resolveJob, /^    runs-on: ubuntu-24\.04$/m);
  assert.match(resolveJob, /^      GH_TOKEN: \$\{\{ github\.token \}\}$/m);
  assert.match(resolveJob, /uses: actions\/checkout@v6/);
  assert.match(resolveJob, /^          ref: devel$/m);
  assert.match(resolveJob, /^          fetch-depth: 0$/m);
  assert.match(resolveJob, /^          submodules: recursive$/m);
  assert.match(resolveJob, /uses: actions\/setup-node@v6/);
  assert.match(resolveJob, /^          node-version: \$\{\{ env\.NODE_VERSION \}\}$/m);
  assert.match(resolveJob, /node scripts\/check-rhwp-upstream-release\.mjs/);
  assert.match(resolveJob, /args=\(--github-output "\$GITHUB_OUTPUT"\)/);
  assert.match(resolveJob, /args\+=\(--target-tag "\$TARGET_TAG_INPUT"\)/);
  assert.match(resolveJob, /args\+=\(--dry-run\)/);
  assert.doesNotMatch(resolveJob, /create-github-app-token|AUTOMATION_APP_PRIVATE_KEY/);
  assert.match(resolveJob, /decision == 'branch_blocker'/);
  assert.match(resolveJob, /refusing to overwrite it/);
});

test('candidate job은 create_candidate에서만 Ubuntu에 진입한다', () => {
  assert.match(candidateJob, /^    needs: resolve$/m);
  assert.match(
    candidateJob,
    /^    if: \$\{\{ needs\.resolve\.outputs\.decision == 'create_candidate' \}\}$/m,
  );
  assert.match(candidateJob, /^    runs-on: ubuntu-24\.04$/m);
  assert.deepEqual(candidateJob.match(/^    runs-on: .+$/gm), ['    runs-on: ubuntu-24.04']);
  assert.match(candidateJob, /^          persist-credentials: false$/m);
  assert.match(candidateJob, /test -z "\$\(git status --porcelain=v1 --untracked-files=all\)"/);
});

test('관리 참조를 먼저 맞춘 뒤 source update와 전체 gate를 실행한다', () => {
  assertOrdered(candidateJob, [
    'node scripts/update-rhwp-managed-references.mjs',
    'scripts/update-upstream.sh',
    '--run-checks',
    'pnpm run check:product-boundary',
    'pnpm run check:product-version',
    'pnpm run check:release-metadata',
    'pnpm run check:rhwp-pin',
    'pnpm run test:automation',
    'pnpm run test:upstream',
    'pnpm run test:studio',
    'pnpm run build:studio',
    '- name: Verify changed-path allowlist',
    '- name: Write draft PR body',
    '- name: Create current-repository GitHub App token',
    '- name: Commit, push and open draft PR',
  ]);
  assert.match(candidateJob, /cargo install wasm-pack --version "\$WASM_PACK_VERSION" --locked/);
  assert.match(candidateJob, /wasm-pack \$WASM_PACK_VERSION/);
});

test('changed path와 explicit staging 범위를 승인된 파일로 제한한다', () => {
  const expected = [
    'README.md',
    'apps/desktop/src-tauri/Cargo.lock',
    'apps/studio-host/src/core/upstream-boundary.test.ts',
    'apps/studio-host/vendor/rhwp-core/LICENSE',
    'apps/studio-host/vendor/rhwp-core/package.json',
    'apps/studio-host/vendor/rhwp-core/rhwp.d.ts',
    'apps/studio-host/vendor/rhwp-core/rhwp.js',
    'apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm',
    'apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm.d.ts',
    'docs/DEVELOPMENT.md',
    'docs/architecture/UPSTREAM.md',
    'rhwp-core.lock',
    'tests/rhwp-pin.test.mjs',
    'third_party/rhwp',
  ];
  assert.deepEqual(readAllowedPaths(candidateJob), expected);
  assert.match(candidateJob, /git status --porcelain=v1 --untracked-files=all/);
  assert.match(candidateJob, /git diff --name-only --/);
  assert.match(candidateJob, /Changed path is not allowed/);
  assert.match(candidateJob, /git add -- \\/);
  assert.match(candidateJob, /apps\/studio-host\/vendor\/rhwp-core \\/);
  assert.match(candidateJob, /rhwp-core\.lock tests\/rhwp-pin\.test\.mjs third_party\/rhwp/);
  assert.match(candidateJob, /diff -u "\$RUNNER_TEMP\/rhwp-sync-changed-paths\.txt"/);
});

test('App token은 모든 검증 뒤 현재 저장소 최소 권한으로만 발급한다', () => {
  const tokenStep = getStepContaining(candidateJob, 'actions/create-github-app-token@v3.2.0');
  assert.match(tokenStep, /client-id: \$\{\{ vars\.ALHANGEUL_AUTOMATION_CLIENT_ID \}\}/);
  assert.match(tokenStep, /private-key: \$\{\{ secrets\.ALHANGEUL_AUTOMATION_APP_PRIVATE_KEY \}\}/);
  assert.match(tokenStep, /permission-contents: write/);
  assert.match(tokenStep, /permission-pull-requests: write/);
  assert.doesNotMatch(tokenStep, /permission-issues|owner:|repositories:/);
  assert.equal((candidateJob.match(/steps\.app-token\.outputs\.token/g) ?? []).length, 1);
  const publish = getStepContaining(candidateJob, 'gh pr create');
  assert.match(publish, /GH_TOKEN: \$\{\{ steps\.app-token\.outputs\.token \}\}/);
  assert.match(publish, /git push origin "HEAD:refs\/heads\/\$BRANCH"/);
  assert.match(publish, /gh pr create[\s\S]*--base "\$BASE_BRANCH" --head "\$BRANCH" --draft/);
  assert.match(publish, /--body-file "\$RUNNER_TEMP\/rhwp-sync-pr-body\.md"/);
});

test('자동 merge, force push, release와 배포 동작을 포함하지 않는다', () => {
  for (const pattern of [
    /git push[^\n]*--force/,
    /\bgh pr merge\b/,
    /\bgh release\b/,
    /\bgit tag\b/,
    /permission-issues:/,
    /actions\/upload-artifact/,
    /actions\/deploy-pages/,
    /\bgh issue close\b/,
  ]) {
    assert.doesNotMatch(workflow, pattern);
  }
});

test('workflow와 helper 경계는 파일 크기 상한을 지킨다', async () => {
  const helper = await readFile(join(repoRoot, 'scripts/write-rhwp-sync-pr-body.mjs'), 'utf8');
  assert.ok(lineCount(workflow) <= 300, `workflow ${lineCount(workflow)} LOC`);
  assert.ok(lineCount(helper) <= 300, `PR body helper ${lineCount(helper)} LOC`);
});

function readAllowedPaths(source) {
  const match = source.match(/allowed_paths=\(\n([\s\S]*?)\n          \)/);
  assert.ok(match, 'allowed_paths array가 필요합니다');
  return match[1].split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function getTopLevelSection(source, name) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `${name}:`);
  assert.notEqual(start, -1, `${name} top-level section이 필요합니다`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^[A-Za-z0-9_-]+:/.test(lines[index])) { end = index; break; }
  }
  return lines.slice(start + 1, end);
}

function getSectionAssignments(source, name) {
  const assignments = new Map();
  for (const line of getTopLevelSection(source, name)) {
    const match = line.match(/^  ([A-Za-z0-9_-]+):\s*(\S+)\s*$/);
    if (match) assignments.set(match[1], match[2]);
  }
  return assignments;
}

function getJob(source, name) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${name}:`);
  assert.notEqual(start, -1, `${name} job이 필요합니다`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  [A-Za-z0-9_-]+:/.test(lines[index])) { end = index; break; }
  }
  return lines.slice(start, end).join('\n');
}

function getStepContaining(source, marker) {
  const lines = source.split(/\r?\n/);
  const markerLine = lines.findIndex((line) => line.includes(marker));
  assert.notEqual(markerLine, -1, `step marker가 필요합니다: ${marker}`);
  let start = markerLine;
  while (start >= 0 && !/^      - name: /.test(lines[start])) start -= 1;
  let end = lines.length;
  for (let index = markerLine + 1; index < lines.length; index += 1) {
    if (/^      - name: /.test(lines[index])) { end = index; break; }
  }
  return lines.slice(start, end).join('\n');
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

function lineCount(source) {
  return source.trimEnd().split(/\r?\n/).length;
}
