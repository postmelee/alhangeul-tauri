import assert from 'node:assert/strict';
import test from 'node:test';
import { normalDependencyClosure } from '../scripts/privacy/collect-native-notice-closure.mjs';

test('notice review follows transitive normal edges, excludes build/dev-only and handles cycles', () => {
  const edge = (pkg, kind = null) => ({ pkg, dep_kinds: [{ kind }] });
  const metadata = {
    packages: ['app', 'library', 'derive', 'compiler', 'tests'].map((id) => ({
      id, name: id, version: '1.0.0', source: null, license: 'MIT', repository: null,
      targets: [{ kind: [id === 'derive' ? 'proc-macro' : 'lib'] }],
    })),
    resolve: { root: 'app', nodes: [
      { id: 'app', features: [], deps: [edge('library'), edge('compiler', 'build'), edge('tests', 'dev')] },
      { id: 'library', features: ['default'], deps: [edge('derive'), edge('app')] },
      { id: 'derive', features: [], deps: [] },
    ] },
  };
  const packages = normalDependencyClosure(metadata);
  assert.deepEqual(packages.map((pkg) => pkg.name), ['app', 'derive', 'library']);
  assert.equal(packages[1].proceduralMacro, true);
  assert.deepEqual(packages[2].features, ['default']);
});

test('missing root or transitive package cannot produce a successful partial report', () => {
  assert.throws(() => normalDependencyClosure({}), /product root/);
  assert.throws(() => normalDependencyClosure({
    packages: [], resolve: { root: 'absent', nodes: [] },
  }), /Incomplete/);
});
