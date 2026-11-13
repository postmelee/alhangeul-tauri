import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';

// Vite copies upstream public/fonts first, then applies product-owned WOFF2 overrides.
// Inspect the combined output rather than treating the override inventory as all fonts.
const output = process.argv[2];
if (!output) throw new Error('Expected report path after build:studio');
const built = resolve('apps/studio-host/dist/fonts');
const upstream = resolve('third_party/rhwp/rhwp-studio/public/fonts');
const product = resolve('assets/fonts');
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const up = await readJson(resolve(upstream, 'licenses/font-notices.json'));
const own = await readJson(resolve(product, 'licenses/font-notices.json'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const records = new Map(up.fonts.map((row) => [row.file, { ...row, source: 'pinned-upstream' }]));
const outline = up.repositoryOnlyFonts.find((row) => row.repositoryPath === 'assets/fonts/LatinModernMath-VariableOutline-subset.otf');
assert.ok(outline, 'Missing upstream outline-font provenance');
records.set(basename(outline.repositoryPath), {
  ...outline, file: basename(outline.repositoryPath), source: 'pinned-upstream',
  licenseFiles: outline.licenseFiles.map((file) => basename(file)),
});
for (const row of own.fonts) records.set(row.file, { ...row, source: 'product-override' });
const rows = [];
for (const name of (await readdir(built)).filter((name) => /\.(woff2|ttf|otf|ttc)$/.test(name)).sort()) {
  const row = records.get(name);
  assert.ok(row, `Unmapped built font: ${name}`);
  assert.equal(hash(await readFile(resolve(built, name))), row.sha256, name);
  assert.ok(row.copyrightNotices.length, `Missing copyright: ${name}`);
  const sourceRoot = row.source === 'product-override' ? product : upstream;
  const notices = [];
  for (const file of row.licenseFiles) {
    const expected = await readFile(resolve(sourceRoot, 'licenses', file));
    const actual = await readFile(resolve(built, 'licenses', file));
    assert.equal(hash(actual), hash(expected), `Missing/changed built font notice: ${file}`);
    notices.push({ path: `fonts/licenses/${file}`, sha256: hash(actual) });
  }
  rows.push({ file: name, source: row.source, sha256: row.sha256, notices });
}
assert.equal(rows.length, records.size, 'Missing expected composite font');
const report = {
  scope: 'Platform-neutral local Vite output; composite product overrides and pinned upstream public assets. Does not prove installed binary bytes or legal eligibility.',
  fonts: rows.length, productOverrides: rows.filter((row) => row.source === 'product-override').length,
  inheritedFonts: rows.filter((row) => row.source === 'pinned-upstream').length, rows,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ fonts: report.fonts, productOverrides: report.productOverrides, inheritedFonts: report.inheritedFonts }));
