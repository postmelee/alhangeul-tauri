#!/usr/bin/env node

import { appendFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_VERSION = '2026-03-10';
const DEFAULT_WORKFLOW = '.github/workflows/alhangeul-desktop.yml';
const DEFAULT_ARTIFACT = 'alhangeul-desktop-linux-x64';
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const usage = `Usage: node scripts/verify-workflow-artifact.mjs
  --repository <owner/repo> --build-ref <40-char-sha> --run-id <id>
  [--workflow-path <path>] [--artifact-name <name>]
  [--json-output <path>] [--github-output <path>]`;

export async function verifyWorkflowArtifact(options, services = {}) {
  const input = validateInputs(options);
  const api = services.fetchJson ?? createGitHubApiClient({
    token: options.token ?? process.env.GITHUB_TOKEN,
    apiUrl: options.apiUrl ?? process.env.GITHUB_API_URL,
  });
  const run = await api(runPath(input));
  assertWorkflowRun(run, input);
  const artifacts = await readAllArtifacts(api, input);
  const artifact = selectArtifact(artifacts, run, input);
  return Object.freeze({
    repository: input.repository,
    buildRef: input.buildRef,
    nativeRunId: input.runId,
    workflowPath: input.workflowPath,
    artifactId: artifact.id,
    artifactName: artifact.name,
    artifactSize: artifact.size_in_bytes,
    artifactDigest: artifact.digest,
  });
}

export function assertWorkflowRun(run, input) {
  if (!run || typeof run !== 'object') throw new Error('workflow run metadata가 없습니다.');
  assertEqualNumber(run.id, input.runId, 'workflow run ID');
  assertEqualText(run.repository?.full_name, input.repository, 'workflow repository');
  assertEqualText(run.head_repository?.full_name, input.repository, 'workflow head repository');
  assertEqualText(run.head_sha, input.buildRef, 'workflow head SHA');
  assertEqualText(run.event, 'workflow_dispatch', 'workflow event');
  assertEqualText(run.status, 'completed', 'workflow status');
  assertEqualText(run.conclusion, 'success', 'workflow conclusion');
  assertEqualText(workflowPath(run.path), input.workflowPath, 'workflow path');
}

export function selectArtifact(artifacts, run, input) {
  if (!Array.isArray(artifacts)) throw new Error('artifact metadata 목록이 없습니다.');
  const matches = artifacts.filter((artifact) => artifact?.name === input.artifactName);
  if (matches.length !== 1) {
    throw new Error(`exact artifact가 1개가 아닙니다: ${input.artifactName} (${matches.length})`);
  }
  const artifact = matches[0];
  assertPositiveInteger(artifact.id, 'artifact ID');
  assertPositiveInteger(artifact.size_in_bytes, 'artifact size');
  if (artifact.expired !== false) throw new Error('artifact가 만료되었거나 만료 상태가 불명확합니다.');
  if (!DIGEST_PATTERN.test(artifact.digest ?? '')) throw new Error('artifact SHA-256 digest가 올바르지 않습니다.');
  assertEqualNumber(artifact.workflow_run?.id, input.runId, 'artifact workflow run ID');
  assertEqualNumber(
    artifact.workflow_run?.repository_id,
    run.repository?.id,
    'artifact repository ID',
  );
  assertEqualNumber(
    artifact.workflow_run?.head_repository_id,
    run.head_repository?.id,
    'artifact head repository ID',
  );
  assertEqualText(artifact.workflow_run?.head_sha, input.buildRef, 'artifact head SHA');
  return artifact;
}

export async function writeWorkflowArtifactOutputs(result, options = {}) {
  if (options.jsonOutput) {
    await (options.writeFile ?? writeFile)(
      resolve(options.jsonOutput),
      `${JSON.stringify(result, null, 2)}\n`,
      'utf8',
    );
  }
  if (!options.githubOutput) return;
  const entries = Object.entries({
    repository: result.repository,
    build_ref: result.buildRef,
    native_run_id: String(result.nativeRunId),
    workflow_path: result.workflowPath,
    artifact_id: String(result.artifactId),
    artifact_name: result.artifactName,
    artifact_size: String(result.artifactSize),
    artifact_digest: result.artifactDigest,
  });
  for (const [name, value] of entries) assertSingleLine(value, name);
  await (options.appendFile ?? appendFile)(
    resolve(options.githubOutput),
    `${entries.map(([name, value]) => `${name}=${value}`).join('\n')}\n`,
    'utf8',
  );
}

function validateInputs(options = {}) {
  if (!REPOSITORY_PATTERN.test(options.repository ?? '')) {
    throw new Error('repository는 owner/repo 형식이어야 합니다.');
  }
  if (!SHA_PATTERN.test(options.buildRef ?? '')) {
    throw new Error('build ref는 소문자 40자리 commit SHA여야 합니다.');
  }
  const runId = parsePositiveInteger(options.runId, 'run ID');
  const workflow = options.workflowPath ?? DEFAULT_WORKFLOW;
  if (!/^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(workflow)) {
    throw new Error('workflow path가 허용된 GitHub Actions 경로가 아닙니다.');
  }
  const artifactName = options.artifactName ?? DEFAULT_ARTIFACT;
  assertSingleLine(artifactName, 'artifact name');
  if (!/^[A-Za-z0-9_.-]+$/.test(artifactName)) throw new Error('artifact name이 올바르지 않습니다.');
  return Object.freeze({
    repository: options.repository,
    buildRef: options.buildRef,
    runId,
    workflowPath: workflow,
    artifactName,
  });
}

async function readAllArtifacts(api, input) {
  const artifacts = [];
  for (let page = 1; ; page += 1) {
    if (page > 100) throw new Error('artifact pagination이 허용 범위를 초과했습니다.');
    const response = await api(artifactPath(input, page));
    if (
      !Array.isArray(response?.artifacts)
      || !Number.isSafeInteger(response.total_count)
      || response.total_count < 0
    ) {
      throw new Error('artifact 목록 응답이 올바르지 않습니다.');
    }
    artifacts.push(...response.artifacts);
    if (artifacts.length > response.total_count) {
      throw new Error('artifact 목록 개수와 total_count가 일치하지 않습니다.');
    }
    if (artifacts.length >= response.total_count) return artifacts;
    if (response.artifacts.length === 0) throw new Error('artifact pagination이 완료되지 않았습니다.');
  }
}

export function createGitHubApiClient(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = normalizeApiUrl(options.apiUrl ?? 'https://api.github.com');
  return async (path) => {
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
      'User-Agent': 'alhangeul-exact-sha-acceptance',
    };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    const response = await fetchImpl(`${baseUrl}${path}`, { headers });
    if (!response.ok) throw new Error(`GitHub Actions metadata 요청이 실패했습니다: HTTP ${response.status}`);
    return response.json();
  };
}

function runPath(input) {
  return `/repos/${encodeRepository(input.repository)}/actions/runs/${input.runId}`;
}

function artifactPath(input, page) {
  const name = encodeURIComponent(input.artifactName);
  return `${runPath(input)}/artifacts?per_page=100&page=${page}&name=${name}`;
}

function encodeRepository(repository) {
  return repository.split('/').map(encodeURIComponent).join('/');
}

function workflowPath(value) {
  if (typeof value !== 'string') return value;
  return value.split('@', 1)[0];
}

function normalizeApiUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('GitHub API URL이 올바르지 않습니다.');
  }
  return url.href.replace(/\/$/, '');
}

function assertEqualText(actual, expected, name) {
  if (typeof actual !== 'string' || actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`${name}가 요청 값과 다릅니다.`);
  }
}

function assertEqualNumber(actual, expected, name) {
  if (!Number.isSafeInteger(actual) || actual !== expected) {
    throw new Error(`${name}가 요청 값과 다릅니다.`);
  }
}

function assertPositiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name}가 양의 정수가 아닙니다.`);
}

function parsePositiveInteger(value, name) {
  const source = typeof value === 'number' ? String(value) : value;
  if (!/^[1-9][0-9]*$/.test(source ?? '')) throw new Error(`${name}가 양의 정수가 아닙니다.`);
  const parsed = Number(source);
  assertPositiveInteger(parsed, name);
  return parsed;
}

function assertSingleLine(value, name) {
  if (typeof value !== 'string' || value === '' || /[\r\n]/.test(value)) {
    throw new Error(`${name}은 비어 있지 않은 단일행이어야 합니다.`);
  }
}

function parseArguments(args) {
  const options = {};
  const names = new Map([
    ['--repository', 'repository'],
    ['--build-ref', 'buildRef'],
    ['--run-id', 'runId'],
    ['--workflow-path', 'workflowPath'],
    ['--artifact-name', 'artifactName'],
    ['--json-output', 'jsonOutput'],
    ['--github-output', 'githubOutput'],
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') return { help: true };
    const name = names.get(arg);
    const value = args[index + 1];
    if (!name || !value) throw new Error(`지원하지 않거나 값이 없는 인자입니다: ${arg}\n${usage}`);
    options[name] = value;
    index += 1;
  }
  return options;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log(usage);
    else {
      const result = await verifyWorkflowArtifact(options);
      await writeWorkflowArtifactOutputs(result, options);
      console.log(`workflow artifact verified: run ${result.nativeRunId}, artifact ${result.artifactId}`);
    }
  } catch (error) {
    console.error(`workflow artifact verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}
