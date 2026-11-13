import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function normalDependencyClosure(metadata) {
  if (!metadata.resolve?.root) throw new Error('Cargo did not identify the product root');
  const nodes = new Map(metadata.resolve.nodes.map((node) => [node.id, node]));
  const packages = new Map(metadata.packages.map((pkg) => [pkg.id, pkg]));
  const pending = [metadata.resolve.root];
  const visited = new Set();
  const result = [];
  while (pending.length) {
    const id = pending.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    const node = nodes.get(id);
    const pkg = packages.get(id);
    if (!node || !pkg) throw new Error('Incomplete Cargo dependency graph');
    result.push({
      name: pkg.name, version: pkg.version, source: pkg.source,
      license: pkg.license, repository: pkg.repository,
      proceduralMacro: pkg.targets.some((target) => target.kind.includes('proc-macro')),
      features: node.features,
    });
    for (const dependency of node.deps) {
      if (dependency.dep_kinds.some((kind) => kind.kind === null)) pending.push(dependency.pkg);
    }
  }
  return result.sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr}`);
  return result.stdout;
}

function main() {
  const [target, output] = process.argv.slice(2);
  if (!['x86_64-pc-windows-msvc', 'x86_64-unknown-linux-gnu', 'aarch64-unknown-linux-gnu'].includes(target) || !output) {
    throw new Error('Expected supported Windows/Linux target and output path');
  }
  const roots = ['apps/desktop/src-tauri', ...(target.includes('windows')
    ? ['apps/thumbnail-worker', 'apps/thumbnail-handler'] : ['apps/linux-thumbnailer'])];
  const products = roots.map((root) => {
    const metadata = JSON.parse(run('cargo', ['metadata', '--locked', '--format-version', '1',
      '--filter-platform', target, '--manifest-path', `${root}/Cargo.toml`]));
    return { root, packages: normalDependencyClosure(metadata) };
  });
  const report = {
    repositorySha: run('git', ['rev-parse', 'HEAD']).trim(), target,
    scope: 'Default-feature, target-filtered Cargo normal dependency graph. Includes procedural macros and unified features; not a binary-level SBOM or license approval. Build/dev-only edges excluded.',
    products,
  };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
