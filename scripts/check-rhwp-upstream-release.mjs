#!/usr/bin/env node

import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readRhwpPin, RHWP_REPOSITORY } from './verify-rhwp-pin.mjs';

const defaultRepositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultProductRepository = 'postmelee/alhangeul-tauri';
const upstreamApiRepository = 'edwardkim/rhwp';
const stableTagPattern = /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const shaPattern = /^[0-9a-f]{40}$/;
const usage = 'Usage: node scripts/check-rhwp-upstream-release.mjs [--target-tag vX.Y.Z] [--dry-run] [--json-output <path>] [--github-output <path>]';

export async function checkRhwpUpstreamRelease(options = {}) {
  const repositoryRoot = resolve(options.repositoryRoot ?? defaultRepositoryRoot);
  const productRepository = options.productRepository
    ?? process.env.GITHUB_REPOSITORY
    ?? defaultProductRepository;
  assertRepository(productRepository);
  if (options.targetTag !== undefined) assertStableTag(options.targetTag);

  const services = {
    fetchRelease: fetchReleaseMetadata,
    resolveTag: resolveRemoteTag,
    readCurrent: readCurrentPinState,
    readCandidate: readCandidateState,
    ...options.services,
  };
  const release = validateStableRelease(
    await services.fetchRelease({ targetTag: options.targetTag }),
    options.targetTag,
  );
  const targetCommit = await services.resolveTag(release.tag_name);
  assertSha(targetCommit, 'resolved tag commit');
  const current = await services.readCurrent({ repositoryRoot });
  const branch = automationBranch(release.tag_name);

  let decision;
  let existingPrUrl = '';
  if (current.tag === release.tag_name) {
    if (current.commit !== targetCommit) {
      throw new Error(
        `고정된 Stable release tag의 resolved commit이 이동했습니다: ${release.tag_name}`,
      );
    }
    decision = 'current';
  } else if (compareStableTags(release.tag_name, current.tag) < 0) {
    throw new Error(`현재 pin보다 낮은 release로 자동 동기화할 수 없습니다: ${release.tag_name}`);
  } else if (options.dryRun === true) {
    decision = 'dry_run';
  } else {
    const candidate = await services.readCandidate({
      branch,
      productRepository,
      repositoryRoot,
    });
    existingPrUrl = candidate.prUrl ?? '';
    if (candidate.prUrl) decision = 'existing_pr';
    else if (candidate.branchExists) decision = 'branch_blocker';
    else decision = 'create_candidate';
  }

  return Object.freeze({
    currentTag: current.tag,
    currentCommit: current.commit,
    targetTag: release.tag_name,
    targetCommit,
    releaseUrl: release.html_url,
    branch,
    decision,
    existingPrUrl,
  });
}

export function validateStableRelease(release, requestedTag) {
  if (!release || typeof release !== 'object') {
    throw new Error('GitHub release metadata가 객체가 아닙니다.');
  }
  assertStableTag(release.tag_name);
  if (requestedTag && release.tag_name !== requestedTag) {
    throw new Error(`요청 tag와 release tag가 다릅니다: ${release.tag_name}`);
  }
  if (release.draft !== false || release.prerelease !== false) {
    throw new Error(`공개 Stable release가 아닙니다: ${release.tag_name}`);
  }
  assertReleaseUrl(release.html_url, release.tag_name);
  return release;
}

export function resolveTagCommit(lsRemoteOutput, tag) {
  assertStableTag(tag);
  const baseRef = `refs/tags/${tag}`;
  const peeledRef = `${baseRef}^{}`;
  const refs = new Map();
  for (const line of lsRemoteOutput.trim().split(/\r?\n/).filter(Boolean)) {
    const match = line.match(/^([0-9a-f]{40})\s+(.+)$/);
    if (!match) throw new Error(`git ls-remote 응답이 올바르지 않습니다: ${line}`);
    refs.set(match[2], match[1]);
  }
  const commit = refs.get(peeledRef) ?? refs.get(baseRef);
  if (!commit) throw new Error(`upstream release tag를 찾을 수 없습니다: ${tag}`);
  assertSha(commit, 'resolved tag commit');
  return commit;
}

export function assertCurrentPinState(state) {
  assertStableTag(state.tag);
  assertSha(state.commit, 'current lock commit');
  for (const [label, value] of [
    ['gitlink', state.gitlinkCommit],
    ['submodule HEAD', state.submoduleCommit],
  ]) {
    if (value !== state.commit) {
      throw new Error(`${label}가 current lock commit과 다릅니다: ${value}`);
    }
  }
  if (state.studioIndexPresent !== true || state.studioMainPresent !== true) {
    throw new Error('exact upstream Studio entry가 누락되었습니다.');
  }
  return Object.freeze({ tag: state.tag, commit: state.commit });
}

export async function writeReleaseCheckOutputs(result, options = {}) {
  if (options.jsonOutput) {
    await (options.writeFile ?? writeFile)(
      resolve(options.jsonOutput),
      `${JSON.stringify(result, null, 2)}\n`,
    );
  }
  if (options.githubOutput) {
    const lines = Object.entries({
      current_tag: result.currentTag,
      current_commit: result.currentCommit,
      target_tag: result.targetTag,
      target_commit: result.targetCommit,
      release_url: result.releaseUrl,
      branch: result.branch,
      decision: result.decision,
      existing_pr_url: result.existingPrUrl,
    });
    for (const [key, value] of lines) assertSingleLine(value, key);
    await (options.appendFile ?? appendFile)(
      resolve(options.githubOutput),
      `${lines.map(([key, value]) => `${key}=${value}`).join('\n')}\n`,
    );
  }
}

async function fetchReleaseMetadata({ targetTag }) {
  const endpoint = targetTag
    ? `repos/${upstreamApiRepository}/releases/tags/${encodeURIComponent(targetTag)}`
    : `repos/${upstreamApiRepository}/releases/latest`;
  return JSON.parse(run('gh', ['api', endpoint]));
}

async function resolveRemoteTag(tag) {
  const baseRef = `refs/tags/${tag}`;
  const output = run('git', ['ls-remote', RHWP_REPOSITORY, baseRef, `${baseRef}^{}`]);
  return resolveTagCommit(output, tag);
}

async function readCurrentPinState({ repositoryRoot }) {
  const pin = await readRhwpPin({ repoRoot: repositoryRoot });
  const gitlink = run('git', ['ls-files', '--stage', 'third_party/rhwp'], {
    cwd: repositoryRoot,
  }).match(/^160000 ([0-9a-f]{40}) 0\tthird_party\/rhwp$/)?.[1];
  const submoduleRoot = resolve(repositoryRoot, 'third_party/rhwp');
  const [studioIndex, studioMain] = await Promise.all([
    readOptional(resolve(submoduleRoot, 'rhwp-studio/index.html')),
    readOptional(resolve(submoduleRoot, 'rhwp-studio/src/main.ts')),
  ]);
  return assertCurrentPinState({
    tag: pin.rhwp_release_tag,
    commit: pin.rhwp_commit,
    gitlinkCommit: gitlink,
    submoduleCommit: run('git', ['rev-parse', 'HEAD'], { cwd: submoduleRoot }),
    studioIndexPresent: studioIndex.length > 0,
    studioMainPresent: studioMain.length > 0,
  });
}

async function readCandidateState({ branch, productRepository, repositoryRoot }) {
  const ref = `refs/heads/${branch}`;
  const branchExists = run('git', ['ls-remote', 'origin', ref], {
    cwd: repositoryRoot,
  }).trim() !== '';
  const owner = productRepository.split('/')[0];
  const query = new URLSearchParams({
    state: 'open',
    base: 'devel',
    head: `${owner}:${branch}`,
  });
  const pulls = JSON.parse(run('gh', [
    'api',
    `repos/${productRepository}/pulls?${query}`,
  ]));
  if (!Array.isArray(pulls)) throw new Error('열린 PR 조회 응답이 배열이 아닙니다.');
  if (pulls.length > 1) throw new Error(`동일 자동화 branch의 열린 PR이 ${pulls.length}개입니다.`);
  const prUrl = pulls[0]?.html_url ?? '';
  if (prUrl) assertSingleLine(prUrl, 'existing PR URL');
  return { branchExists, prUrl };
}

async function readOptional(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  if (result.error) throw new Error(`${command} 실행 실패: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`${command} ${args[0]} 실패 (${result.status}): ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

function automationBranch(tag) {
  assertStableTag(tag);
  return `automation/rhwp-${tag}-full-sync`;
}

function compareStableTags(left, right) {
  assertStableTag(left);
  assertStableTag(right);
  const leftParts = left.slice(1).split('.').map(Number);
  const rightParts = right.slice(1).split('.').map(Number);
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function assertRepository(repository) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error(`GitHub repository 형식이 올바르지 않습니다: ${repository}`);
  }
}

function assertStableTag(tag) {
  if (!stableTagPattern.test(tag)) throw new Error(`Stable release tag 형식이 올바르지 않습니다: ${tag}`);
}

function assertSha(value, label) {
  if (!shaPattern.test(value ?? '')) throw new Error(`${label} 형식이 올바르지 않습니다: ${value}`);
}

function assertReleaseUrl(value, tag) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`release URL이 올바르지 않습니다: ${value}`); }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || !url.pathname.endsWith(`/releases/tag/${tag}`)) {
    throw new Error(`release URL이 올바르지 않습니다: ${value}`);
  }
}

function assertSingleLine(value, label) {
  if (typeof value !== 'string' || /[\r\n]/.test(value)) throw new Error(`${label} 출력이 올바르지 않습니다.`);
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') return { help: true };
    if (arg === '--dry-run') options.dryRun = true;
    else if (['--target-tag', '--json-output', '--github-output'].includes(arg)) {
      const value = args[index + 1];
      if (!value) throw new Error(`${arg} 값이 필요합니다.\n${usage}`);
      options[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      index += 1;
    } else throw new Error(`지원하지 않는 인자입니다: ${arg}\n${usage}`);
  }
  return options;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log(usage);
    else {
      const result = await checkRhwpUpstreamRelease(options);
      await writeReleaseCheckOutputs(result, options);
      console.log(`rhwp upstream check: ${result.decision} (${result.targetTag} ${result.targetCommit})`);
    }
  } catch (error) {
    console.error(`rhwp upstream check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
