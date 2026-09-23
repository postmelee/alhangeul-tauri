#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const RHWP_REPOSITORY = 'https://github.com/edwardkim/rhwp.git';
export const RHWP_REF_KIND = 'release-tag';
export const RHWP_LOCK_VERSION = 1;
export const WASM_PACK_VERSION = '0.15.0';
export const WASM_BUILD_PROFILE = 'wasm-pack build --target web --release';
export const MANAGED_ARTIFACTS = Object.freeze([
  'apps/studio-host/vendor/rhwp-core/package.json',
  'apps/studio-host/vendor/rhwp-core/rhwp.js',
  'apps/studio-host/vendor/rhwp-core/rhwp.d.ts',
  'apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm',
  'apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm.d.ts',
  'apps/studio-host/vendor/rhwp-core/LICENSE',
]);

const TOP_LEVEL_KEYS = Object.freeze([
  'lock_version',
  'rhwp_repo',
  'rhwp_ref_kind',
  'rhwp_release_tag',
  'rhwp_commit',
  'source_cargo_lock_sha256',
  'wasm_pack_version',
  'wasm_build_profile',
]);
const ARTIFACT_KEYS = Object.freeze(['path', 'sha256', 'size']);
const STABLE_TAG_PATTERN = /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export async function readRhwpPin({ repoRoot }) {
  const lockPath = resolve(repoRoot, 'rhwp-core.lock');
  let source;
  try {
    source = await readFile(lockPath, 'utf8');
  } catch (error) {
    throw new Error(`rhwp-core.lock을 읽을 수 없습니다: ${error.message}`);
  }

  return parseRhwpPin(source);
}

export function parseRhwpPin(source) {
  const topLevel = new Map();
  const artifactMaps = [];
  let currentArtifact = null;

  for (const [index, rawLine] of source.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (line === '') continue;

    if (line === '[[artifacts]]') {
      currentArtifact = new Map();
      artifactMaps.push(currentArtifact);
      continue;
    }

    const assignment = line.match(/^([a-z0-9_]+)\s*=\s*(.+)$/);
    if (!assignment) {
      throw new Error(`rhwp-core.lock ${index + 1}행의 형식이 올바르지 않습니다.`);
    }

    const [, key, rawValue] = assignment;
    const target = currentArtifact ?? topLevel;
    if (target.has(key)) {
      throw new Error(`rhwp-core.lock에 중복 key가 있습니다: ${key}`);
    }
    target.set(key, parseTomlValue(rawValue, index + 1));
  }

  assertExactKeys(topLevel, TOP_LEVEL_KEYS, 'top-level');
  for (const [index, artifact] of artifactMaps.entries()) {
    assertExactKeys(artifact, ARTIFACT_KEYS, `artifacts[${index}]`);
  }

  const pin = {
    ...Object.fromEntries(topLevel),
    artifacts: artifactMaps.map((artifact) => Object.fromEntries(artifact)),
  };
  validatePinShape(pin);
  return pin;
}

export function serializeRhwpPin(pin) {
  validatePinShape(pin);

  const lines = [
    `lock_version = ${pin.lock_version}`,
    `rhwp_repo = ${JSON.stringify(pin.rhwp_repo)}`,
    `rhwp_ref_kind = ${JSON.stringify(pin.rhwp_ref_kind)}`,
    `rhwp_release_tag = ${JSON.stringify(pin.rhwp_release_tag)}`,
    `rhwp_commit = ${JSON.stringify(pin.rhwp_commit)}`,
    `source_cargo_lock_sha256 = ${JSON.stringify(pin.source_cargo_lock_sha256)}`,
    `wasm_pack_version = ${JSON.stringify(pin.wasm_pack_version)}`,
    `wasm_build_profile = ${JSON.stringify(pin.wasm_build_profile)}`,
  ];

  for (const artifact of pin.artifacts) {
    lines.push(
      '',
      '[[artifacts]]',
      `path = ${JSON.stringify(artifact.path)}`,
      `sha256 = ${JSON.stringify(artifact.sha256)}`,
      `size = ${artifact.size}`,
    );
  }

  return `${lines.join('\n')}\n`;
}

export async function createRhwpPinData({
  repoRoot,
  releaseTag,
  commit,
  wasmPackVersion,
}) {
  const expectedVersion = validateInputs({ releaseTag, commit, wasmPackVersion });
  await verifySourceAndVersionState({
    repoRoot,
    releaseTag,
    commit,
    expectedVersion,
  });

  return {
    lock_version: RHWP_LOCK_VERSION,
    rhwp_repo: RHWP_REPOSITORY,
    rhwp_ref_kind: RHWP_REF_KIND,
    rhwp_release_tag: releaseTag,
    rhwp_commit: commit,
    source_cargo_lock_sha256: await sha256File(
      resolve(repoRoot, 'third_party/rhwp/Cargo.lock'),
    ),
    wasm_pack_version: wasmPackVersion,
    wasm_build_profile: WASM_BUILD_PROFILE,
    artifacts: await inspectManagedArtifacts(repoRoot),
  };
}

export async function verifyRepositoryPin({ repoRoot }) {
  const pin = await readRhwpPin({ repoRoot });
  const expectedVersion = validateInputs({
    releaseTag: pin.rhwp_release_tag,
    commit: pin.rhwp_commit,
    wasmPackVersion: pin.wasm_pack_version,
  });

  if (pin.lock_version !== RHWP_LOCK_VERSION) {
    throw new Error(
      `지원하지 않는 lock_version입니다: ${pin.lock_version} (expected ${RHWP_LOCK_VERSION})`,
    );
  }
  if (pin.rhwp_repo !== RHWP_REPOSITORY) {
    throw new Error(`rhwp repository pin이 올바르지 않습니다: ${pin.rhwp_repo}`);
  }
  if (pin.rhwp_ref_kind !== RHWP_REF_KIND) {
    throw new Error(`rhwp ref kind는 ${RHWP_REF_KIND}여야 합니다.`);
  }
  if (pin.wasm_build_profile !== WASM_BUILD_PROFILE) {
    throw new Error(`WASM build profile이 올바르지 않습니다: ${pin.wasm_build_profile}`);
  }

  await verifySourceAndVersionState({
    repoRoot,
    releaseTag: pin.rhwp_release_tag,
    commit: pin.rhwp_commit,
    expectedVersion,
  });

  const actualSourceLockHash = await sha256File(
    resolve(repoRoot, 'third_party/rhwp/Cargo.lock'),
  );
  if (actualSourceLockHash !== pin.source_cargo_lock_sha256) {
    throw new Error(
      `upstream Cargo.lock SHA-256가 lock과 다릅니다: ${actualSourceLockHash}`,
    );
  }

  for (const [index, expectedPath] of MANAGED_ARTIFACTS.entries()) {
    const artifact = pin.artifacts[index];
    if (artifact.path !== expectedPath) {
      throw new Error(
        `managed artifact 경로가 올바르지 않습니다: ${artifact.path} (expected ${expectedPath})`,
      );
    }

    let bytes;
    try {
      bytes = await readFile(resolve(repoRoot, expectedPath));
    } catch (error) {
      throw new Error(`managed artifact를 읽을 수 없습니다: ${expectedPath}: ${error.message}`);
    }
    if (bytes.length !== artifact.size) {
      throw new Error(
        `managed artifact size가 lock과 다릅니다: ${expectedPath} (${bytes.length} != ${artifact.size})`,
      );
    }

    const actualHash = sha256(bytes);
    if (actualHash !== artifact.sha256) {
      throw new Error(`managed artifact SHA-256가 lock과 다릅니다: ${expectedPath}`);
    }
  }

  return pin;
}

async function verifySourceAndVersionState({
  repoRoot,
  releaseTag,
  commit,
  expectedVersion,
}) {
  const submoduleDir = resolve(repoRoot, 'third_party/rhwp');
  const configuredOrigin = git(
    ['config', '-f', '.gitmodules', '--get', 'submodule.third_party/rhwp.url'],
    repoRoot,
  );
  if (configuredOrigin !== RHWP_REPOSITORY) {
    throw new Error(
      `.gitmodules의 rhwp repository가 올바르지 않습니다: ${configuredOrigin || '<missing>'}`,
    );
  }

  const actualOrigin = git(['remote', 'get-url', 'origin'], submoduleDir);
  if (actualOrigin !== RHWP_REPOSITORY) {
    throw new Error(`submodule origin이 올바르지 않습니다: ${actualOrigin}`);
  }

  const actualCommit = git(['rev-parse', 'HEAD'], submoduleDir);
  if (actualCommit !== commit) {
    throw new Error(`submodule HEAD가 lock commit과 다릅니다: ${actualCommit}`);
  }

  const resolvedTagCommit = git(
    ['rev-parse', '--verify', `refs/tags/${releaseTag}^{commit}`],
    submoduleDir,
  );
  if (resolvedTagCommit !== commit) {
    throw new Error(
      `release tag와 lock commit이 다릅니다: ${releaseTag} -> ${resolvedTagCommit}`,
    );
  }

  const upstreamVersion = await readCargoPackageVersion(
    resolve(submoduleDir, 'Cargo.toml'),
  );
  if (upstreamVersion !== expectedVersion) {
    throw new Error(
      `upstream Cargo.toml version이 release tag와 다릅니다: ${upstreamVersion}`,
    );
  }

  const desktopVersion = await readCargoLockPackageVersion(
    resolve(repoRoot, 'apps/desktop/src-tauri/Cargo.lock'),
    'rhwp',
  );
  if (desktopVersion !== expectedVersion) {
    throw new Error(
      `desktop Cargo.lock rhwp version이 release tag와 다릅니다: ${desktopVersion}`,
    );
  }

  const vendorPackage = JSON.parse(
    await readFile(
      resolve(repoRoot, 'apps/studio-host/vendor/rhwp-core/package.json'),
      'utf8',
    ),
  );
  if (vendorPackage.version !== expectedVersion) {
    throw new Error(
      `vendored WASM package version이 release tag와 다릅니다: ${vendorPackage.version}`,
    );
  }

  const submoduleStatus = git(
    ['status', '--porcelain', '--untracked-files=all'],
    submoduleDir,
    { trim: false },
  );
  if (submoduleStatus !== '') {
    throw new Error('upstream submodule에 추적되지 않은 변경이 있습니다.');
  }
}

async function inspectManagedArtifacts(repoRoot) {
  const artifacts = [];
  for (const path of MANAGED_ARTIFACTS) {
    let bytes;
    try {
      bytes = await readFile(resolve(repoRoot, path));
    } catch (error) {
      throw new Error(`managed artifact를 읽을 수 없습니다: ${path}: ${error.message}`);
    }
    if (bytes.length === 0) {
      throw new Error(`managed artifact가 비어 있습니다: ${path}`);
    }
    artifacts.push({
      path,
      sha256: sha256(bytes),
      size: bytes.length,
    });
  }
  return artifacts;
}

function validateInputs({ releaseTag, commit, wasmPackVersion }) {
  if (!STABLE_TAG_PATTERN.test(releaseTag)) {
    throw new Error(`Stable release tag 형식이 올바르지 않습니다: ${releaseTag}`);
  }
  if (!SHA_PATTERN.test(commit)) {
    throw new Error(`resolved commit 형식이 올바르지 않습니다: ${commit}`);
  }
  if (wasmPackVersion !== WASM_PACK_VERSION) {
    throw new Error(
      `wasm-pack version은 ${WASM_PACK_VERSION}이어야 합니다: ${wasmPackVersion}`,
    );
  }
  return releaseTag.slice(1);
}

function validatePinShape(pin) {
  if (
    !Number.isSafeInteger(pin.lock_version)
    || pin.lock_version < 1
  ) {
    throw new Error('lock_version은 양의 정수여야 합니다.');
  }
  for (const key of TOP_LEVEL_KEYS.filter((key) => key !== 'lock_version')) {
    if (typeof pin[key] !== 'string' || pin[key] === '') {
      throw new Error(`${key}는 비어 있지 않은 문자열이어야 합니다.`);
    }
  }
  if (!SHA256_PATTERN.test(pin.source_cargo_lock_sha256)) {
    throw new Error('source_cargo_lock_sha256 형식이 올바르지 않습니다.');
  }
  if (!Array.isArray(pin.artifacts) || pin.artifacts.length !== MANAGED_ARTIFACTS.length) {
    throw new Error(
      `managed artifact는 정확히 ${MANAGED_ARTIFACTS.length}개여야 합니다.`,
    );
  }

  const seenPaths = new Set();
  for (const artifact of pin.artifacts) {
    if (typeof artifact.path !== 'string' || artifact.path === '') {
      throw new Error('artifact path는 비어 있지 않은 문자열이어야 합니다.');
    }
    if (seenPaths.has(artifact.path)) {
      throw new Error(`중복 managed artifact 경로가 있습니다: ${artifact.path}`);
    }
    seenPaths.add(artifact.path);
    if (!SHA256_PATTERN.test(artifact.sha256)) {
      throw new Error(`artifact SHA-256 형식이 올바르지 않습니다: ${artifact.path}`);
    }
    if (!Number.isSafeInteger(artifact.size) || artifact.size < 1) {
      throw new Error(`artifact size는 양의 정수여야 합니다: ${artifact.path}`);
    }
  }
}

function parseTomlValue(rawValue, lineNumber) {
  if (/^(0|[1-9][0-9]*)$/.test(rawValue)) {
    return Number(rawValue);
  }
  if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
    try {
      const value = JSON.parse(rawValue);
      if (typeof value === 'string') return value;
    } catch {
      // Fall through to the common format error.
    }
  }
  throw new Error(`rhwp-core.lock ${lineNumber}행의 value 형식이 올바르지 않습니다.`);
}

function assertExactKeys(map, expectedKeys, label) {
  const actualKeys = [...map.keys()];
  const missing = expectedKeys.filter((key) => !map.has(key));
  const unexpected = actualKeys.filter((key) => !expectedKeys.includes(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${label} key가 schema와 다릅니다. missing=[${missing.join(', ')}], unexpected=[${unexpected.join(', ')}]`,
    );
  }
}

async function readCargoPackageVersion(path) {
  const source = await readFile(path, 'utf8');
  const packageSection = source.match(
    /(?:^|\n)\[package\]\r?\n([\s\S]*?)(?=\r?\n\[[^\]]+\]|\s*$)/,
  );
  if (!packageSection) {
    throw new Error(`${path}에서 [package] section을 찾을 수 없습니다.`);
  }
  const name = readTomlStringField(packageSection[1], 'name');
  const version = readTomlStringField(packageSection[1], 'version');
  if (name !== 'rhwp') {
    throw new Error(`${path}의 package name이 rhwp가 아닙니다: ${name}`);
  }
  return version;
}

async function readCargoLockPackageVersion(path, packageName) {
  const source = await readFile(path, 'utf8');
  const packages = [...source.matchAll(
    /(?:^|\n)\[\[package\]\]\r?\n([\s\S]*?)(?=\r?\n\[\[package\]\]|\s*$)/g,
  )]
    .map((match) => match[1])
    .filter((block) => readTomlStringField(block, 'name', { required: false }) === packageName);
  if (packages.length !== 1) {
    throw new Error(
      `${path}에서 ${packageName} package를 정확히 하나 찾지 못했습니다: ${packages.length}`,
    );
  }
  return readTomlStringField(packages[0], 'version');
}

function readTomlStringField(source, field, { required = true } = {}) {
  const match = source.match(new RegExp(`^${field}\\s*=\\s*"([^"]+)"\\s*$`, 'm'));
  if (!match && required) {
    throw new Error(`TOML field를 찾을 수 없습니다: ${field}`);
  }
  return match?.[1];
}

async function sha256File(path) {
  return sha256(await readFile(path));
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function git(args, cwd, { trim = true } = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
    },
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} 실패\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
  return trim ? result.stdout.trim() : result.stdout;
}

async function main() {
  const repoRoot = git(['rev-parse', '--show-toplevel'], process.cwd());
  const pin = await verifyRepositoryPin({ repoRoot });
  console.log(
    `rhwp pin verified: ${pin.rhwp_release_tag} (${pin.rhwp_commit}), ${pin.artifacts.length} artifacts`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`rhwp pin verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
