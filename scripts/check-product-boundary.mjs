import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const scanRoots = ['.'];

const excludedPrefixes = [
  '.git/',
  'apps/desktop/src-tauri/target/',
  'apps/studio-host/dist/',
  'mydocs/',
  'node_modules/',
  'third_party/rhwp/',
];

const historicalAllowlist = new Set([
  'AGENTS.md',
  'LICENSE',
  'docs/architecture/PROVENANCE.md',
  'scripts/check-product-boundary.mjs',
]);

const unsupportedPlatformAllowlist = new Set([
  'docs/architecture/PROVENANCE.md',
  'pnpm-lock.yaml',
  'scripts/check-product-boundary.mjs',
]);

const legacyRules = [
  ['legacy product name', /(^|[^A-Za-z])HOP([^A-Za-z]|$)/],
  ['legacy repository', /(?:github\.com\/)?golbin\/hop/i],
  ['legacy package name', /@golbin\/hop-studio-host|hop-desktop|hop_desktop/i],
  ['legacy application identifier', /net\.golbin\.hop/i],
  ['legacy runtime identifier', /__HOP_VERSION__|HopPageRenderer|createHopOverrides/],
];

const unsupportedPlatformRules = [
  ['unsupported platform identifier', /\b(?:macos|darwin|apple)\b/i],
  ['removed preview extension', /quick[ -]?look/i],
  ['unsupported Rust target', /aarch64-apple|x86_64-apple/i],
  ['unsupported native cfg', /target_os\s*=\s*["']macos["']/i],
  ['unsupported bundle configuration', /bundle\.macOS/i],
  ['unsupported disk image', /\.dmg\b/i],
  ['unsupported distribution credential', /notari|APPLE_[A-Z0-9_]+/],
];

const forbiddenPathPart = /(^|[/_.-])(hop|quicklook|macos)(?=$|[/_.-])/i;
const maxTextFileBytes = 1024 * 1024;

function toRepositoryPath(path) {
  return relative(repositoryRoot, path).split('\\').join('/');
}

function isExcluded(path) {
  const normalized = path.endsWith('/') ? path : `${path}/`;
  return excludedPrefixes.some(
    (prefix) => path === prefix.slice(0, -1) || normalized.startsWith(prefix),
  );
}

async function collectFiles(path, files) {
  const repositoryPath = toRepositoryPath(path);
  if (repositoryPath && isExcluded(repositoryPath)) return;

  const entryStat = await stat(path);
  if (entryStat.isFile()) {
    files.push(path);
    return;
  }
  if (!entryStat.isDirectory()) return;

  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    await collectFiles(resolve(path, entry.name), files);
  }
}

function findRuleViolation(content, rules) {
  for (const [label, pattern] of rules) {
    const match = pattern.exec(content);
    if (!match) continue;
    const line = content.slice(0, match.index).split('\n').length;
    return { label, line };
  }
  return null;
}

const files = [];
for (const root of scanRoots) {
  await collectFiles(resolve(repositoryRoot, root), files);
}

const violations = [];
for (const file of files.sort()) {
  const repositoryPath = toRepositoryPath(file);

  if (!historicalAllowlist.has(repositoryPath) && forbiddenPathPart.test(repositoryPath)) {
    violations.push(`${repositoryPath}: forbidden legacy or unsupported path`);
  }

  const fileStat = await stat(file);
  if (fileStat.size > maxTextFileBytes) continue;

  const buffer = await readFile(file);
  if (buffer.includes(0)) continue;
  const content = buffer.toString('utf8');

  if (!historicalAllowlist.has(repositoryPath)) {
    const legacyViolation = findRuleViolation(content, legacyRules);
    if (legacyViolation) {
      violations.push(
        `${repositoryPath}:${legacyViolation.line}: ${legacyViolation.label}`,
      );
    }
  }

  const platformViolation = findRuleViolation(content, unsupportedPlatformRules);
  if (platformViolation && !unsupportedPlatformAllowlist.has(repositoryPath)) {
    violations.push(
      `${repositoryPath}:${platformViolation.line}: ${platformViolation.label}`,
    );
  }
}

if (violations.length > 0) {
  console.error('Product boundary violations:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`Product boundary check passed (${files.length} files scanned).`);
}
