import { validateReleaseData } from '../pages/release-data.mjs';
import { UPDATER_TARGETS, validateReleaseInventory } from './release-inventory.mjs';

const MANIFEST_KEYS = ['version', 'notes', 'pub_date', 'platforms'];
const PLATFORM_KEYS = ['url', 'signature'];

export function buildUpdaterManifest(releaseData) {
  const release = validateReleaseData(releaseData, { allowManifestPublished: true });
  if (release.status !== 'published' || !release.updater.manifestPublished) {
    throw new Error('published release와 manifestPublished=true가 필요합니다.');
  }
  const inventory = validateReleaseInventory(release.updater.inventory);
  const platforms = {};
  for (const target of Object.keys(UPDATER_TARGETS)) {
    const entry = inventory.targets[target];
    if (entry.url !== release.downloads[target]) {
      throw new Error(`${target} inventory URL이 release data와 다릅니다.`);
    }
    platforms[target] = { url: entry.url, signature: entry.signature };
  }
  return validateUpdaterManifest({
    version: release.version,
    notes: release.notes,
    pub_date: release.publishedAt,
    platforms,
  }, release);
}

export function validateUpdaterManifest(manifest, releaseData) {
  assertRecord(manifest, 'updater manifest');
  assertExactKeys(manifest, MANIFEST_KEYS, 'updater manifest');
  if (manifest.version !== releaseData.version || manifest.notes !== releaseData.notes) {
    throw new Error('updater manifest version 또는 notes가 release data와 다릅니다.');
  }
  if (manifest.pub_date !== releaseData.publishedAt) {
    throw new Error('updater manifest pub_date가 release data와 다릅니다.');
  }
  assertRecord(manifest.platforms, 'updater manifest platforms');
  assertExactKeys(manifest.platforms, Object.keys(UPDATER_TARGETS), 'updater manifest platforms');
  for (const [target, expected] of Object.entries(releaseData.updater.inventory.targets)) {
    const platform = manifest.platforms[target];
    assertRecord(platform, target);
    assertExactKeys(platform, PLATFORM_KEYS, target);
    if (platform.url !== expected.url || platform.signature !== expected.signature) {
      throw new Error(`${target} manifest가 검증된 inventory와 다릅니다.`);
    }
  }
  return manifest;
}

export function serializeUpdaterManifest(manifest, releaseData) {
  return `${JSON.stringify(validateUpdaterManifest(manifest, releaseData), null, 2)}\n`;
}

function assertRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field}는 object여야 합니다.`);
  }
}

function assertExactKeys(value, expected, field) {
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${field} key가 계약과 다릅니다.`);
  }
}
