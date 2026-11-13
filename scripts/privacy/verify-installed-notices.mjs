import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname, sep } from 'node:path';

const [source, installed, output] = process.argv.slice(2);
if (!source || !installed || !output) throw new Error('Expected producer source, installed root and report');
const configRoot = resolve(source, 'apps/desktop/src-tauri');
const config = JSON.parse(await readFile(resolve(configRoot, 'tauri.conf.json'), 'utf8'));
const expected = Object.entries(config.bundle.resources).filter(([, target]) => /^(licenses|privacy)\//.test(target));
assert.ok(expected.length >= 20, 'Expected explicit license and privacy resources');
const files = [];
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile()) files.push(path);
  }
}
await walk(resolve(installed));
await mkdir(dirname(output), { recursive: true });
const hash = (data) => createHash('sha256').update(data).digest('hex');
const rows = [];
for (const [input, target] of expected) {
  assert.ok(!target.split('/').includes('..') && !target.includes('\\'), 'Unsafe destination');
  const matches = files.filter((path) => {
    const pathFromRoot = relative(resolve(installed), path).split(sep).join('/');
    return pathFromRoot === target || pathFromRoot.endsWith(`/${target}`);
  });
  if (matches.length !== 1) {
    const observedResources = files.map((path) => relative(resolve(installed), path).split(sep).join('/'))
      .filter((path) => /(^|\/)(licenses|privacy)\//.test(path));
    await writeFile(output, `${JSON.stringify({ status: 'failed', expected: target, matches: matches.length, observedResources }, null, 2)}\n`);
    assert.fail(`Expected one installed resource: ${target}; observed paths saved`);
  }
  const expectedHash = hash(await readFile(resolve(configRoot, input)));
  const actualHash = hash(await readFile(matches[0]));
  assert.equal(actualHash, expectedHash, `Installed bytes differ: ${target}`);
  rows.push({ path: target, sha256: actualHash });
}
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ matched: rows.length, resources: rows }, null, 2)}\n`);
console.log(`Verified ${rows.length} installed privacy/license resources`);
