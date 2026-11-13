import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const root = new URL('../assets/fonts/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('licenses/font-notices.json', root)));
const config = JSON.parse(await readFile(new URL('../apps/desktop/src-tauri/tauri.conf.json', import.meta.url)));

test('every shipped Studio webfont has exact bytes, copyright and installed license texts', async () => {
  const files = (await readdir(root)).filter((name) => name.endsWith('.woff2')).sort();
  assert.deepEqual(manifest.fonts.map((row) => row.file).sort(), files);
  const notices = new Map(manifest.notices.map((row) => [row.file, row]));
  for (const font of manifest.fonts) {
    assert.equal(sha256(await readFile(new URL(font.file, root))), font.sha256, font.file);
    assert.ok(font.copyrightNotices.length > 0, font.file);
    assert.ok(font.licenseFiles.length > 0, font.file);
    for (const name of font.licenseFiles) {
      assert.ok(notices.has(name), name);
      assert.equal(config.bundle.resources[`../../../assets/fonts/licenses/${name}`], `licenses/fonts/${name}`);
    }
  }
  for (const notice of notices.values()) {
    assert.equal(sha256(await readFile(new URL(`licenses/${notice.file}`, root))), notice.sha256, notice.file);
  }
});

test('Nanum reserved-name fonts use the verified full source with preserved existing characters', async () => {
  const results = JSON.parse(await readFile(new URL('../mydocs/working/assets/task135/readiness/font-comparison.json', import.meta.url)));
  assert.equal(results.length, 3);
  for (const result of results) {
    const font = manifest.fonts.find((row) => row.file === result.file);
    assert.equal(font.sha256, result.newSha256);
    assert.equal(font.officialProgram.sha256, result.officialProgramSha256);
    assert.equal(result.officialCmapNameMetricsMatch, true);
    assert.deepEqual(result.existingCharacterChanges, []);
    assert.ok(result.newCharacters > result.oldCharacters);
  }
});
