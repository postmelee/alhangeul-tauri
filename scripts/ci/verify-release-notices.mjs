import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

const configPath = resolve('apps/desktop/src-tauri/tauri.conf.json');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function noticePaths(source, target) {
  if (!(await lstat(source)).isDirectory()) return [[source, target]];
  const children = await readdir(source, { recursive: true, withFileTypes: true });
  return children.filter(entry => entry.isFile()).map(entry => {
    const path = join(entry.parentPath, entry.name);
    const leaf = relative(source, path).split(sep).join('/');
    return [path, `${target.replace(/\/$/, '')}/${leaf}`];
  });
}

const [installRoot, evidencePath, ...rest] = process.argv.slice(2);
assert.ok(installRoot && evidencePath && rest.length === 0, 'installed resource root and evidence path required');
const config = JSON.parse(await readFile(configPath, 'utf8'));
const mappings = Object.entries(config.bundle.resources).filter(([, target]) => target.startsWith('licenses/'));
const entries = (await Promise.all(mappings.map(([source, target]) =>
  noticePaths(resolve(dirname(configPath), source), target)))).flat();
assert.ok(entries.some(([, target]) => target === 'licenses/fonts/studio/font-notices.json'), 'Studio license manifest required');
assert.equal(new Set(entries.map(([, target]) => target)).size, entries.length, 'notice destinations must be unique');

const files = [];
for (const [source, target] of entries) {
  const installed = resolve(installRoot, target);
  assert.ok((await lstat(installed)).isFile(), `regular notice file required at ${target}`);
  const [expected, actual] = await Promise.all([readFile(source), readFile(installed)]);
  assert.equal(sha256(actual), sha256(expected), `installed notice mismatch at ${target}`);
  files.push({ path: target, bytes: actual.length, sha256: sha256(actual) });
}
await writeFile(evidencePath, JSON.stringify({ status: 'passed', files }, null, 2) + '\n');
