import { UPDATER_REPOSITORY, validateReleaseInventory } from '../updater/release-inventory.mjs';
import {
  SHA256, SOURCE_SHA, STABLE_VERSION, assertEqual, assertOneOf, assertPattern,
  assertPositiveInteger, assertRecord, assertTimestamp, compareVersions,
} from './notes-fields.mjs';

export const RELEASE_REPOSITORY = UPDATER_REPOSITORY;
export const INSTALLERS = Object.freeze({
  'windows-x86_64-nsis': { label: 'Windows x64 NSIS', file: (v) => `Alhangeul_${v}_x64-setup.exe` },
  'windows-x86_64-msi': { label: 'Windows x64 MSI', file: (v) => `Alhangeul_${v}_x64_en-US.msi` },
  'linux-x86_64-appimage': { label: 'Linux x64 AppImage', file: (v) => `Alhangeul_${v}_amd64.AppImage` },
  'linux-x86_64-deb': { label: 'Linux x64 DEB', file: (v) => `Alhangeul_${v}_amd64.deb` },
  'linux-x86_64-rpm': { label: 'Linux x64 RPM', file: (v) => `Alhangeul-${v}-1.x86_64.rpm` },
  'linux-aarch64-deb': { label: 'Linux arm64 DEB', file: (v) => `Alhangeul_${v}_arm64.deb` },
});

const KEYS = [
  'repository', 'status', 'version', 'tag', 'sourceSha', 'publishedAt', 'rhwp',
  'previous', 'assets', 'updaterInventory',
];

export function releaseAssetUrl(tag, name) {
  return `https://github.com/${RELEASE_REPOSITORY}/releases/download/${tag}/${name}`;
}

export function validateNotesMetadata(metadata) {
  assertRecord(metadata, KEYS, 'metadata');
  assertEqual(metadata.repository, RELEASE_REPOSITORY, 'metadata.repository');
  assertIdentity(metadata, 'metadata');
  assertOneOf(metadata.status, ['draft', 'published'], 'metadata.status');
  if (metadata.status === 'published') assertTimestamp(metadata.publishedAt, 'metadata.publishedAt');
  else assertEqual(metadata.publishedAt, null, 'draft metadata.publishedAt');
  assertRhwp(metadata.rhwp, 'metadata.rhwp');
  assertPrevious(metadata.previous, metadata.version);
  assertAssets(metadata.assets, metadata);
  assertInventory(metadata.updaterInventory, metadata);
  return metadata;
}

function assertIdentity(value, field) {
  assertPattern(value.version, STABLE_VERSION, `${field}.version`);
  assertEqual(value.tag, `v${value.version}`, `${field}.tag`);
  assertPattern(value.sourceSha, SOURCE_SHA, `${field}.sourceSha`);
}

function assertRhwp(value, field) {
  assertRecord(value, ['tag', 'commit'], field);
  assertPattern(value.tag, /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/, `${field}.tag`);
  assertPattern(value.commit, SOURCE_SHA, `${field}.commit`);
}

function assertPrevious(value, version) {
  if (value === null) return;
  assertRecord(value, ['version', 'tag', 'sourceSha', 'rhwp'], 'metadata.previous');
  assertIdentity(value, 'metadata.previous');
  assertRhwp(value.rhwp, 'metadata.previous.rhwp');
  if (compareVersions(value.version, version) >= 0) {
    throw new Error('metadata.previous.version은 현재 version보다 낮아야 합니다.');
  }
}

function assertAssets(assets, metadata) {
  assertRecord(assets, Object.keys(INSTALLERS), 'metadata.assets');
  for (const [target, contract] of Object.entries(INSTALLERS)) {
    const asset = assets[target];
    const field = `metadata.assets.${target}`;
    assertRecord(asset, ['name', 'size', 'sha256', 'url'], field);
    assertEqual(asset.name, contract.file(metadata.version), `${field}.name`);
    assertEqual(asset.url, releaseAssetUrl(metadata.tag, asset.name), `${field}.url`);
    assertPositiveInteger(asset.size, `${field}.size`);
    assertPattern(asset.sha256, SHA256, `${field}.sha256`);
  }
}

function assertInventory(value, metadata) {
  const inventory = validateReleaseInventory(value);
  for (const key of ['version', 'tag', 'sourceSha', 'repository']) {
    assertEqual(inventory[key], metadata[key], `metadata.updaterInventory.${key}`);
  }
  for (const [target, entry] of Object.entries(inventory.targets)) {
    const asset = metadata.assets[target];
    for (const key of ['url', 'size', 'sha256']) {
      assertEqual(entry[key], asset[key], `metadata.updaterInventory.targets.${target}.${key}`);
    }
    assertEqual(entry.path.split('/').at(-1), asset.name, `metadata.updaterInventory.targets.${target}.path`);
  }
}
