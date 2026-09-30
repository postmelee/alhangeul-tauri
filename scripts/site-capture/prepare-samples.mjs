import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function prepareSamples(root, destination) {
  const entries = JSON.parse(await readFile(new URL('./samples.json', import.meta.url), 'utf8'));
  assert.equal(entries.length, 8);
  assert.equal(new Set(entries.map(e => e.name)).size, 8);
  const commit = execFileSync('git', ['-C', resolve(root, 'third_party/rhwp'), 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
  await mkdir(destination, {recursive:true});
  for (const entry of entries) {
    assert.equal(entry.sourceCommit, commit);
    const source = resolve(root, 'third_party/rhwp', entry.source);
    const sampleRelative = relative(resolve(root, 'third_party/rhwp/samples'), source);
    assert(!isAbsolute(sampleRelative) && !sampleRelative.startsWith('..'));
    const bytes = await readFile(source);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.source);
    assert.equal(entry.name, entry.name.split(/[\\/]/).pop());
    await copyFile(source, resolve(destination, entry.name));
  }
  return entries;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destination = resolve('capture-samples');
  const entries = await prepareSamples(process.cwd(), destination);
  await mkdir('candidate-evidence', {recursive:true});
  await writeFile('candidate-evidence/sample-manifest.json', JSON.stringify(entries, null, 2));
  console.log(`Prepared ${entries.length} hash-verified samples`);
}
