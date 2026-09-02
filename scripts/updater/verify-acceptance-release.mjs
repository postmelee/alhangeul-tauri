#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  UPDATER_ACCEPTANCE_INVENTORY,
  UPDATER_ACCEPTANCE_MANIFEST,
  UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION,
  UPDATER_ACCEPTANCE_TAG,
  UPDATER_ACCEPTANCE_TITLE,
} from './acceptance-policy.mjs';
import {
  validateUpdaterAcceptanceInventory,
  validateUpdaterAcceptanceManifest,
} from './acceptance-inventory.mjs';
import {
  acceptanceScenario,
  validateUpdaterAcceptanceScenarioManifest,
} from './acceptance-scenario.mjs';

const API_VERSION = '2026-03-10';
const SHA = /^[0-9a-f]{40}$/;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const CLI_OPTIONS = new Set([
  '--repository', '--candidate-sha', '--tag', '--json-output',
  '--scenario', '--expected-manifest-sha256',
]);

export async function verifyUpdaterAcceptanceRelease(options, services = {}) {
  const identity = validateIdentity(options);
  const api = services.fetchApi ?? createApiClient({
    token: options.token ?? process.env.GITHUB_TOKEN,
    apiUrl: options.apiUrl ?? process.env.GITHUB_API_URL,
  });
  const release = await readReleaseIdentity(api, identity);
  const assets = exactAssetMap(release.assets);
  const documents = await readReleaseDocuments(api, assets, identity);
  await verifyInstallerAssets(api, assets, documents.inventory);
  return buildResult(identity, release, assets, documents);
}

function validateIdentity(options) {
  const identity = {
    repository: options.repository,
    candidateSha: options.candidateSha,
    tag: options.tag ?? UPDATER_ACCEPTANCE_TAG,
    scenario: options.scenario ? acceptanceScenario(options.scenario) : null,
    expectedManifestSha256: options.expectedManifestSha256 ?? null,
  };
  if (!REPOSITORY.test(identity.repository ?? '') || !SHA.test(identity.candidateSha ?? '')) {
    throw new Error('repository 또는 candidate SHA가 올바르지 않습니다.');
  }
  if (identity.tag !== UPDATER_ACCEPTANCE_TAG) {
    throw new Error('test release tag가 승인된 값과 다릅니다.');
  }
  if (identity.scenario) {
    if (
      !/^[0-9a-f]{64}$/.test(identity.expectedManifestSha256 ?? '')
    ) {
      throw new Error('negative scenario manifest identity가 올바르지 않습니다.');
    }
  } else if (identity.expectedManifestSha256) {
    throw new Error('positive read-back에 negative scenario 입력을 허용하지 않습니다.');
  }
  return identity;
}

async function readReleaseIdentity(api, identity) {
  const encodedRepository = identity.repository.split('/').map(encodeURIComponent).join('/');
  const encodedTag = encodeURIComponent(identity.tag);
  const release = await api(`/repos/${encodedRepository}/releases/tags/${encodedTag}`);
  const ref = await api(`/repos/${encodedRepository}/git/ref/tags/${encodedTag}`);
  if (
    release?.tag_name !== identity.tag
    || release?.name !== UPDATER_ACCEPTANCE_TITLE
    || release?.draft !== false
    || release?.prerelease !== true
    || release?.target_commitish !== identity.candidateSha
    || ref?.object?.type !== 'commit'
    || ref?.object?.sha !== identity.candidateSha
  ) {
    throw new Error('test prerelease identity 또는 exact source tag가 다릅니다.');
  }
  return release;
}

async function readReleaseDocuments(api, assets, identity) {
  const inventoryBytes = await api(
    assets.get(UPDATER_ACCEPTANCE_INVENTORY).browser_download_url,
    { raw: true },
  );
  const manifestBytes = await api(
    assets.get(UPDATER_ACCEPTANCE_MANIFEST).browser_download_url,
    { raw: true },
  );
  assertDigest(assets.get(UPDATER_ACCEPTANCE_INVENTORY), inventoryBytes);
  assertDigest(assets.get(UPDATER_ACCEPTANCE_MANIFEST), manifestBytes);
  const inventory = validateUpdaterAcceptanceInventory(parseJson(inventoryBytes, 'inventory'));
  const parsedManifest = parseJson(manifestBytes, 'manifest');
  const manifest = identity.scenario
    ? validateUpdaterAcceptanceScenarioManifest(
      parsedManifest,
      inventory,
      null,
      identity.scenario,
    )
    : validateUpdaterAcceptanceManifest(parsedManifest, inventory);
  if (inventory.role !== 'n-plus-one' || inventory.sourceSha !== identity.candidateSha) {
    throw new Error('release inventory가 승인된 N+1 source와 다릅니다.');
  }
  if (
    identity.expectedManifestSha256
    && sha256(manifestBytes) !== identity.expectedManifestSha256
  ) {
    throw new Error('negative scenario manifest digest가 승인된 값과 다릅니다.');
  }
  return { inventory, inventoryBytes, manifest, manifestBytes };
}

async function verifyInstallerAssets(api, assets, inventory) {
  for (const entry of Object.values(inventory.targets)) {
    const installerName = basename(entry.path);
    const installer = assets.get(installerName);
    const signatureAsset = assets.get(`${installerName}.sig`);
    if (
      installer.size !== entry.size
      || installer.digest !== `sha256:${entry.sha256}`
      || installer.browser_download_url !== entry.url
    ) {
      throw new Error(`${installerName} release metadata가 inventory와 다릅니다.`);
    }
    const signatureBytes = await api(signatureAsset.browser_download_url, { raw: true });
    assertDigest(signatureAsset, signatureBytes);
    if (signatureBytes.toString('utf8').trim() !== entry.signature) {
      throw new Error(`${installerName}.sig 내용이 inventory와 다릅니다.`);
    }
  }
}

function buildResult(identity, release, assets, documents) {
  return Object.freeze({
    repository: identity.repository,
    candidateSha: identity.candidateSha,
    releaseId: release.id,
    tag: identity.tag,
    title: release.name,
    prerelease: release.prerelease,
    publishedAt: release.published_at,
    scenario: identity.scenario,
    inventorySha256: sha256(documents.inventoryBytes),
    manifestSha256: sha256(documents.manifestBytes),
    manifestVersion: documents.manifest.version,
    assets: [...assets.values()].map((asset) => ({
      id: asset.id,
      name: asset.name,
      size: asset.size,
      digest: asset.digest,
      url: asset.browser_download_url,
    })).sort((left, right) => left.name.localeCompare(right.name)),
  });
}

function exactAssetMap(values) {
  if (!Array.isArray(values)) throw new Error('release asset 목록이 없습니다.');
  const map = new Map(values.map((asset) => [asset?.name, asset]));
  const expected = new Set([
    `Alhangeul_${UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION}_x64-setup.exe`,
    `Alhangeul_${UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION}_x64-setup.exe.sig`,
    `Alhangeul_${UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION}_x64_en-US.msi`,
    `Alhangeul_${UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION}_x64_en-US.msi.sig`,
    `Alhangeul_${UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION}_amd64.AppImage`,
    `Alhangeul_${UPDATER_ACCEPTANCE_N_PLUS_ONE_VERSION}_amd64.AppImage.sig`,
    UPDATER_ACCEPTANCE_INVENTORY,
    UPDATER_ACCEPTANCE_MANIFEST,
  ]);
  if (map.size !== expected.size || [...map.keys()].some((name) => !expected.has(name))) {
    throw new Error('test prerelease에는 승인된 8개 asset만 있어야 합니다.');
  }
  for (const asset of map.values()) {
    if (
      !Number.isSafeInteger(asset?.id)
      || asset.id <= 0
      || !Number.isSafeInteger(asset.size)
      || asset.size <= 0
      || !/^sha256:[0-9a-f]{64}$/.test(asset.digest ?? '')
      || asset.state !== 'uploaded'
      || typeof asset.url !== 'string'
    ) {
      throw new Error(`${asset?.name ?? '<unknown>'} release metadata가 올바르지 않습니다.`);
    }
  }
  return map;
}

function parseJson(bytes, name) {
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error(`${name} JSON을 읽을 수 없습니다.`); }
}

function assertDigest(asset, bytes) {
  if (asset.size !== bytes.length || asset.digest !== `sha256:${sha256(bytes)}`) {
    throw new Error(`${asset.name} remote read-back digest가 다릅니다.`);
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function createApiClient({ token, apiUrl = 'https://api.github.com' }) {
  const base = new URL(apiUrl);
  if (base.protocol !== 'https:' || base.username || base.password) {
    throw new Error('GitHub API URL이 올바르지 않습니다.');
  }
  return async (path, options = {}) => {
    const url = path.startsWith('https://') ? path : `${base.href.replace(/\/$/, '')}${path}`;
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
      'User-Agent': 'alhangeul-updater-acceptance',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await fetch(url, { headers, redirect: 'follow' });
    if (!response.ok) throw new Error(`GitHub release read-back이 실패했습니다: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    return options.raw ? bytes : JSON.parse(bytes.toString('utf8'));
  };
}

function parseArguments(args) {
  if (args[0] === '--') args = args.slice(1);
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (!CLI_OPTIONS.has(option) || !value || values.has(option)) {
      throw new Error(`올바르지 않은 acceptance release option입니다: ${option ?? '<missing>'}`);
    }
    values.set(option, value);
  }
  return values;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArguments(process.argv.slice(2));
    const result = await verifyUpdaterAcceptanceRelease({
      repository: args.get('--repository'),
      candidateSha: args.get('--candidate-sha'),
      tag: args.get('--tag'),
      scenario: args.get('--scenario'),
      expectedManifestSha256: args.get('--expected-manifest-sha256'),
    });
    const output = args.get('--json-output');
    if (output) await writeFile(resolve(output), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    console.log(`Updater acceptance release verified: ${result.tag} (${result.assets.length} assets)`);
  } catch (error) {
    console.error(`updater acceptance release verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}
