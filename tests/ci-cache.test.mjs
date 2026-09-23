import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { cacheIdentity } from '../scripts/ci/cache-key.mjs';
const input = { scope: 'desktop', target: 'x86_64-pc-windows-msvc', os: 'Windows', arch: 'X64', locks: 'a'.repeat(64), source: 'b'.repeat(40), compiler: 'rustc 1.98.1\ncommit-hash: 123' };
test('cache restore never crosses compiler, target, architecture, lock or workload', () => {
  const base = cacheIdentity(input);
  for (const [key, value] of Object.entries({ compiler: 'rustc 1.98.2\ncommit-hash: 456', locks: 'c'.repeat(64), target: 'aarch64-unknown-linux-gnu', os: 'Linux', arch: 'ARM64', scope: 'core' })) {
    assert.notEqual(cacheIdentity({ ...input, [key]: value }).prefix, base.prefix);
  }
  const updated = cacheIdentity({ ...input, source: 'c'.repeat(40) });
  assert.equal(updated.prefix, base.prefix);
  assert.notEqual(updated.source, base.source);
});
test('missing cache identity fails closed and source rotates primary key', () => {
  for (const key of Object.keys(input)) assert.throws(() => cacheIdentity({ ...input, [key]: '' }));
  const source = readFileSync(new URL('../.github/actions/cargo-cache/action.yml', import.meta.url), 'utf8');
  assert.match(source, /key: \$\{\{ steps.identity.outputs.prefix \}\}-\$\{\{ steps.identity.outputs.source \}\}/);
  assert.ok(source.includes('restore-keys: |\n          ${{ steps.identity.outputs.prefix }}-'));
});
