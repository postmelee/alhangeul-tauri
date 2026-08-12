import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRhwpSyncPrBody,
  parseChangedPaths,
  writeRhwpSyncPrBody,
} from '../scripts/write-rhwp-sync-pr-body.mjs';

const currentTag = 'v0.8.2';
const targetTag = 'v0.8.4';
const currentCommit = 'a'.repeat(40);
const targetCommit = 'b'.repeat(40);
const releaseUrl = `https://github.com/edwardkim/rhwp/releases/tag/${targetTag}`;
const branch = `automation/rhwp-${targetTag}-full-sync`;

test('provenance, changed paths, 검증과 native handoff를 포함한다', () => {
  const body = buildRhwpSyncPrBody(options({
    changedPaths: ['rhwp-core.lock', 'third_party/rhwp', 'README.md'],
  }));

  assert.match(body, /## rhwp Stable full sync candidate/);
  assert.ok(body.includes(`| Stable release | \`${currentTag}\` | \`${targetTag}\` |`));
  assert.ok(body.includes(`| Resolved commit | \`${currentCommit}\` | \`${targetCommit}\` |`));
  assert.match(body, new RegExp(releaseUrl.replaceAll('.', '\\.')));
  assert.match(body, new RegExp(branch.replaceAll('.', '\\.')));
  assert.ok(body.indexOf('- `README.md`') < body.indexOf('- `rhwp-core.lock`'));
  assert.ok(body.indexOf('- `rhwp-core.lock`') < body.indexOf('- `third_party/rhwp`'));
  assert.match(body, /scripts\/update-upstream\.sh --run-checks/);
  assert.match(body, /automation·upstream·Studio test/);
  assert.match(body, /Windows native build·설치·실행 검증/);
  assert.match(body, /Linux native build·설치·실행 검증/);
  assert.match(body, /Issue #24/);
  assert.doesNotMatch(body, /(?:close[sd]?|resolve[sd]?)\s+#24/i);
  assert.doesNotMatch(body, /자동 merge 또는 제품 수용 완료를 뜻합니다/);
});

test('changed paths 파일을 읽어 output에 deterministic 본문을 쓴다', async () => {
  const writes = [];
  const body = await writeRhwpSyncPrBody({
    ...options(),
    changedPathsFile: '/tmp/changed-paths.txt',
    output: '/tmp/pr-body.md',
    readFile: async () => 'third_party/rhwp\nREADME.md\n',
    writeFile: async (path, source) => writes.push([path, source]),
  });

  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], '/tmp/pr-body.md');
  assert.equal(writes[0][1], body);
  assert.ok(body.indexOf('- `README.md`') < body.indexOf('- `third_party/rhwp`'));
});

test('빈 경로, 중복, traversal과 Markdown control path를 거부한다', () => {
  assert.throws(() => parseChangedPaths(''), /changed paths가 비어 있습니다|changed paths/);
  assert.throws(
    () => parseChangedPaths('README.md\nREADME.md\n'),
    /중복 경로/,
  );
  assert.throws(
    () => buildRhwpSyncPrBody(options({ changedPaths: ['README.md', 'README.md'] })),
    /중복 경로/,
  );
  for (const path of ['../secret', '/absolute', 'docs/`break`.md', 'a b']) {
    assert.throws(() => parseChangedPaths(`${path}\n`), /changed path가 올바르지 않습니다/);
  }
});

test('잘못된 tag, commit, release URL과 branch 조합을 거부한다', () => {
  assert.throws(
    () => buildRhwpSyncPrBody(options({ targetTag: 'latest' })),
    /Stable release tag 형식/,
  );
  assert.throws(
    () => buildRhwpSyncPrBody(options({ targetCommit: 'abc' })),
    /resolved commit 형식/,
  );
  assert.throws(
    () => buildRhwpSyncPrBody(options({ releaseUrl: 'https://example.com/v0.8.4' })),
    /release URL이 올바르지 않습니다/,
  );
  assert.throws(
    () => buildRhwpSyncPrBody(options({ releaseUrl: `${releaseUrl}?unsafe=true` })),
    /release URL이 올바르지 않습니다/,
  );
  assert.throws(
    () => buildRhwpSyncPrBody(options({ branch: 'automation/unrelated' })),
    /automation branch가 target tag와 다릅니다/,
  );
});

test('writer는 changed paths와 output 경로를 모두 요구한다', async () => {
  await assert.rejects(
    writeRhwpSyncPrBody(options()),
    /changed-paths-file과 output 경로가 필요합니다/,
  );
});

function options(overrides = {}) {
  return {
    currentTag,
    currentCommit,
    targetTag,
    targetCommit,
    releaseUrl,
    branch,
    changedPaths: ['README.md'],
    ...overrides,
  };
}
