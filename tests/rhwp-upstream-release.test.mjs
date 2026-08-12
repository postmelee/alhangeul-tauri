import assert from 'node:assert/strict';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  assertCurrentPinState,
  checkRhwpUpstreamRelease,
  resolveTagCommit,
  validateStableRelease,
  writeReleaseCheckOutputs,
} from '../scripts/check-rhwp-upstream-release.mjs';
import { readRhwpPin } from '../scripts/verify-rhwp-pin.mjs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const currentTag = 'v0.8.2';
const targetTag = 'v0.8.4';
const currentCommit = 'a'.repeat(40);
const targetCommit = 'b'.repeat(40);

test('latest 공개 Stable release를 resolved commit과 함께 판정한다', async () => {
  let requestedTag = 'not-called';
  const result = await checkRhwpUpstreamRelease({
    services: services({
      fetchRelease: async (request) => {
        requestedTag = request.targetTag;
        return stableRelease();
      },
      candidate: { branchExists: false, prUrl: '' },
    }),
  });

  assert.equal(requestedTag, undefined);
  assert.deepEqual(result, {
    currentTag,
    currentCommit,
    targetTag,
    targetCommit,
    releaseUrl: releaseUrl(targetTag),
    branch: `automation/rhwp-${targetTag}-full-sync`,
    decision: 'create_candidate',
    existingPrUrl: '',
  });
});

test('명시한 Stable release tag를 release-by-tag 입력으로 전달한다', async () => {
  let requestedTag;
  const result = await checkRhwpUpstreamRelease({
    targetTag,
    dryRun: true,
    services: services({
      fetchRelease: async (request) => {
        requestedTag = request.targetTag;
        return stableRelease();
      },
      readCandidate: async () => assert.fail('dry-run은 candidate 상태를 조회하지 않아야 한다'),
    }),
  });

  assert.equal(requestedTag, targetTag);
  assert.equal(result.decision, 'dry_run');
});

test('현재 tag와 commit이 같으면 candidate 상태를 조회하지 않는다', async () => {
  const result = await checkRhwpUpstreamRelease({
    services: services({
      current: { tag: targetTag, commit: targetCommit },
      readCandidate: async () => assert.fail('current는 candidate 상태를 조회하지 않아야 한다'),
    }),
  });
  assert.equal(result.decision, 'current');
});

test('고정 Stable tag 이동과 현재 pin보다 낮은 target을 거부한다', async () => {
  await assert.rejects(
    checkRhwpUpstreamRelease({
      services: services({ current: { tag: targetTag, commit: currentCommit } }),
    }),
    /고정된 Stable release tag의 resolved commit이 이동했습니다/,
  );
  await assert.rejects(
    checkRhwpUpstreamRelease({
      services: services({ current: { tag: 'v0.9.0', commit: currentCommit } }),
    }),
    /현재 pin보다 낮은 release로 자동 동기화할 수 없습니다/,
  );
});

for (const [name, candidate, expectedDecision] of [
  [
    '동일 branch의 열린 PR을 재사용 대상으로 분류한다',
    { branchExists: true, prUrl: 'https://github.com/postmelee/alhangeul-tauri/pull/99' },
    'existing_pr',
  ],
  [
    'PR 없는 원격 branch를 blocker로 분류한다',
    { branchExists: true, prUrl: '' },
    'branch_blocker',
  ],
]) {
  test(name, async () => {
    const result = await checkRhwpUpstreamRelease({
      services: services({ candidate }),
    });
    assert.equal(result.decision, expectedDecision);
    assert.equal(result.existingPrUrl, candidate.prUrl);
  });
}

test('draft와 prerelease는 공개 Stable로 인정하지 않는다', () => {
  assert.throws(
    () => validateStableRelease(stableRelease({ draft: true })),
    /공개 Stable release가 아닙니다/,
  );
  assert.throws(
    () => validateStableRelease(stableRelease({ prerelease: true })),
    /공개 Stable release가 아닙니다/,
  );
});

test('malformed tag와 요청 tag 불일치를 거부한다', () => {
  assert.throws(
    () => validateStableRelease(stableRelease({ tag_name: 'latest' })),
    /Stable release tag 형식/,
  );
  assert.throws(
    () => validateStableRelease(stableRelease(), 'v0.8.3'),
    /요청 tag와 release tag가 다릅니다/,
  );
});

test('annotated tag는 peeled commit을, lightweight tag는 base commit을 사용한다', () => {
  const tagObject = 'c'.repeat(40);
  assert.equal(
    resolveTagCommit(
      `${tagObject}\trefs/tags/${targetTag}\n${targetCommit}\trefs/tags/${targetTag}^{}\n`,
      targetTag,
    ),
    targetCommit,
  );
  assert.equal(
    resolveTagCommit(`${targetCommit}\trefs/tags/${targetTag}\n`, targetTag),
    targetCommit,
  );
  assert.throws(() => resolveTagCommit('', targetTag), /release tag를 찾을 수 없습니다/);
});

test('current lock, gitlink, submodule와 exact Studio entry 불일치를 거부한다', () => {
  const valid = {
    tag: currentTag,
    commit: currentCommit,
    gitlinkCommit: currentCommit,
    submoduleCommit: currentCommit,
    studioIndexPresent: true,
    studioMainPresent: true,
  };
  assert.deepEqual(assertCurrentPinState(valid), { tag: currentTag, commit: currentCommit });
  assert.throws(
    () => assertCurrentPinState({ ...valid, gitlinkCommit: targetCommit }),
    /gitlink가 current lock commit과 다릅니다/,
  );
  assert.throws(
    () => assertCurrentPinState({ ...valid, submoduleCommit: targetCommit }),
    /submodule HEAD가 current lock commit과 다릅니다/,
  );
  assert.throws(
    () => assertCurrentPinState({ ...valid, studioMainPresent: false }),
    /exact upstream Studio entry가 누락되었습니다/,
  );
});

test('실제 저장소의 current pin, gitlink와 exact Studio entry가 일치한다', async () => {
  const pin = await readRhwpPin({ repoRoot });
  const result = await checkRhwpUpstreamRelease({
    repositoryRoot: repoRoot,
    targetTag: pin.rhwp_release_tag,
    services: {
      fetchRelease: async () => ({
        tag_name: pin.rhwp_release_tag,
        draft: false,
        prerelease: false,
        html_url: releaseUrl(pin.rhwp_release_tag),
      }),
      resolveTag: async () => pin.rhwp_commit,
      readCandidate: async () => assert.fail('current는 candidate 상태를 조회하지 않아야 한다'),
    },
  });
  assert.equal(result.decision, 'current');
});

test('JSON과 GitHub output은 구조화된 단일행 값만 기록한다', async () => {
  const writes = [];
  const appends = [];
  const result = await checkRhwpUpstreamRelease({
    dryRun: true,
    services: services(),
  });
  await writeReleaseCheckOutputs(result, {
    jsonOutput: '/tmp/result.json',
    githubOutput: '/tmp/github-output',
    writeFile: async (path, source) => writes.push([path, source]),
    appendFile: async (path, source) => appends.push([path, source]),
  });

  assert.equal(JSON.parse(writes[0][1]).decision, 'dry_run');
  assert.match(appends[0][1], /^current_tag=v0\.8\.2$/m);
  assert.match(appends[0][1], /^target_commit=b{40}$/m);
  assert.match(appends[0][1], /^existing_pr_url=$/m);
});

function services(overrides = {}) {
  const current = overrides.current ?? { tag: currentTag, commit: currentCommit };
  return {
    fetchRelease: overrides.fetchRelease ?? (async () => stableRelease()),
    resolveTag: overrides.resolveTag ?? (async () => targetCommit),
    readCurrent: overrides.readCurrent ?? (async () => current),
    readCandidate: overrides.readCandidate
      ?? (async () => overrides.candidate ?? { branchExists: false, prUrl: '' }),
  };
}

function stableRelease(overrides = {}) {
  const tag = overrides.tag_name ?? targetTag;
  return {
    tag_name: tag,
    draft: false,
    prerelease: false,
    html_url: releaseUrl(tag),
    ...overrides,
  };
}

function releaseUrl(tag) {
  return `https://github.com/edwardkim/rhwp/releases/tag/${tag}`;
}
