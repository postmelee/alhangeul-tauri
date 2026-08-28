export const RELEASE_TARGETS = Object.freeze({
  'windows-x86_64-nsis': '.exe',
  'windows-x86_64-msi': '.msi',
  'linux-x86_64-appimage': '.AppImage',
});

export const UPDATER_ENDPOINT =
  'https://postmelee.github.io/alhangeul-tauri/updater/stable.json';

const ROOT_KEYS = [
  'status',
  'channel',
  'version',
  'tag',
  'publishedAt',
  'downloads',
  'updater',
];
const UPDATER_KEYS = ['endpoint', 'manifestPublished'];
const SEMANTIC_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function validateReleaseData(value, options = {}) {
  assertRecord(value, 'release data');
  assertExactKeys(value, ROOT_KEYS, 'release data');
  assertOneOf(value.status, ['unreleased', 'published'], 'status');
  assertEqual(value.channel, 'stable', 'channel');
  assertRecord(value.downloads, 'downloads');
  assertExactKeys(value.downloads, Object.keys(RELEASE_TARGETS), 'downloads');
  assertRecord(value.updater, 'updater');
  assertExactKeys(value.updater, UPDATER_KEYS, 'updater');
  assertEqual(value.updater.endpoint, UPDATER_ENDPOINT, 'updater.endpoint');
  if (typeof value.updater.manifestPublished !== 'boolean') {
    throw new Error('updater.manifestPublished는 boolean이어야 합니다.');
  }
  if (value.updater.manifestPublished && !options.allowManifestPublished) {
    throw new Error('updater manifest는 별도 승인 전 게시할 수 없습니다.');
  }

  if (value.status === 'unreleased') validateUnreleased(value);
  else validatePublished(value);
  if (options.requireUnreleased && value.status !== 'unreleased') {
    throw new Error('현재 Pages release data는 unreleased여야 합니다.');
  }
  return value;
}

function validateUnreleased(value) {
  for (const field of ['version', 'tag', 'publishedAt']) {
    assertEqual(value[field], null, field);
  }
  for (const [target, url] of Object.entries(value.downloads)) {
    assertEqual(url, null, `downloads.${target}`);
  }
  assertEqual(value.updater.manifestPublished, false, 'updater.manifestPublished');
}

function validatePublished(value) {
  if (typeof value.version !== 'string' || !SEMANTIC_VERSION.test(value.version)) {
    throw new Error('published version은 안정 semantic version이어야 합니다.');
  }
  assertEqual(value.tag, `v${value.version}`, 'tag');
  const timestamp = typeof value.publishedAt === 'string'
    ? value.publishedAt.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/)
    : null;
  const canonicalTimestamp = timestamp
    ? value.publishedAt.replace(/(?<!\.\d{3})Z$/, '.000Z')
    : null;
  if (
    !timestamp
    || Number.isNaN(Date.parse(value.publishedAt))
    || new Date(value.publishedAt).toISOString() !== canonicalTimestamp
  ) {
    throw new Error('publishedAt은 UTC ISO timestamp여야 합니다.');
  }

  const urls = new Set();
  for (const [target, extension] of Object.entries(RELEASE_TARGETS)) {
    const download = value.downloads[target];
    validateDownloadUrl(download, target, extension, value);
    if (urls.has(download)) throw new Error('download URL은 target별로 고유해야 합니다.');
    urls.add(download);
  }
}

function validateDownloadUrl(download, target, extension, release) {
  if (typeof download !== 'string') {
    throw new Error(`downloads.${target} URL이 필요합니다.`);
  }
  let url;
  try {
    url = new URL(download);
  } catch {
    throw new Error(`downloads.${target} URL이 올바르지 않습니다.`);
  }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.search || url.hash) {
    throw new Error(`downloads.${target}는 query 없는 GitHub HTTPS URL이어야 합니다.`);
  }
  const prefix = `/postmelee/alhangeul-tauri/releases/download/${release.tag}/`;
  if (!url.pathname.startsWith(prefix)) {
    throw new Error(`downloads.${target}는 exact release tag URL이어야 합니다.`);
  }
  const filename = url.pathname.slice(prefix.length);
  if (!/^[A-Za-z0-9._-]+$/.test(filename) || !filename.endsWith(extension)) {
    throw new Error(`downloads.${target} 확장자 또는 파일명이 올바르지 않습니다.`);
  }
  if (!filename.includes(release.version)) {
    throw new Error(`downloads.${target} 파일명에 release version이 필요합니다.`);
  }
}

function assertRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field}는 object여야 합니다.`);
  }
}

function assertExactKeys(value, expected, field) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${field} key가 계약과 다릅니다.`);
  }
}

function assertOneOf(actual, expected, field) {
  if (!expected.includes(actual)) {
    throw new Error(`${field} 값이 허용 범위에 없습니다.`);
  }
}

function assertEqual(actual, expected, field) {
  if (actual !== expected) {
    throw new Error(`${field} 값이 다릅니다: ${JSON.stringify(actual)}`);
  }
}
