import { createHash } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function cacheIdentity(input) {
  for (const key of ['scope', 'target', 'os', 'arch']) {
    if (!/^[a-zA-Z0-9_-]+$/.test(input[key] ?? '')) throw new Error(`Invalid cache ${key}`);
  }
  if (!/^[0-9a-f]{64}$/.test(input.locks ?? '')) throw new Error('Missing cache locks fingerprint');
  if (!/^[0-9a-f]{40}$/.test(input.source ?? '')) throw new Error('Missing exact cache source');
  if (!input.compiler?.startsWith('rustc ') || !input.compiler.includes('commit-hash:')) throw new Error('Missing verbose compiler identity');
  const compiler = createHash('sha256').update(input.compiler).digest('hex').slice(0, 24);
  return {
    prefix: `cargo-target-v2-${input.os}-${input.arch}-${input.scope}-${input.target}-${compiler}-${input.locks}`,
    locks: input.locks, source: input.source,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const identity = cacheIdentity({
      scope: process.env.CI_CACHE_SCOPE, target: process.env.CI_CACHE_TARGET,
      locks: process.env.CI_CACHE_LOCKS, source: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      os: process.env.RUNNER_OS, arch: process.env.RUNNER_ARCH,
      compiler: execFileSync('rustc', ['-vV'], { encoding: 'utf8' }),
    });
    await appendFile(process.env.GITHUB_OUTPUT, Object.entries(identity).map(([key, value]) => `${key}=${value}\n`).join(''));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
