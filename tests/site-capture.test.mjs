import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { prepareSamples } from '../scripts/site-capture/prepare-samples.mjs';

test('gallery has eight distinct pinned documents and copies exact bytes', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'alhangeul-gallery-'));
  try {
    const entries = await prepareSamples(process.cwd(), folder);
    assert.equal((await readdir(folder)).length, 8);
    assert.equal(new Set(entries.map(e => e.sha256)).size, 8);
    for (const entry of entries) {
      const data = await readFile(join(folder, entry.name));
      assert.equal(createHash('sha256').update(data).digest('hex'), entry.sha256);
    }
  } finally { await rm(folder, {recursive:true,force:true}); }
});

test('site capture retains candidate verification, Windows cleanup and no publication authority', async () => {
  const source = await readFile('.github/workflows/alhangeul-site-capture.yml', 'utf8');
  assert.match(source, /scripts\/ci\/release-file-candidate.mjs/);
  assert.match(source, /scripts\/ci\/release-linux-candidate.mjs/);
  assert.match(source, /778bb9cf85a9f35bedb63650a34a1d398092aca7de0a27fdcbef608b92755802/);
  assert.match(source, /if: always\(\) && runner.os == 'Windows'/);
  assert.match(source, /-Phase Cleanup/);
  assert.doesNotMatch(source, /contents: write|pages: write|secrets: inherit|cargo build|tauri build/);
  const desktop = await readFile('.github/workflows/alhangeul-desktop.yml','utf8');
  assert.match(desktop, /inputs.mode == 'site-capture' && !inputs.publish_release/);
});
