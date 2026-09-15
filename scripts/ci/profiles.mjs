import { classifyPath, validationForScopes } from './path-scopes.mjs';

export const PLATFORMS = Object.freeze([
  { name: 'windows-x64', os: 'windows-2025', target: 'x86_64-pc-windows-msvc', bundle_args: '' },
  { name: 'linux-x64', os: 'ubuntu-22.04', target: 'x86_64-unknown-linux-gnu', bundle_args: '' },
  { name: 'linux-arm64', os: 'ubuntu-22.04-arm', target: 'aarch64-unknown-linux-gnu', bundle_args: '--bundles deb' },
]);

export function artifactPlan({ platform = 'all', profile = 'full', runTests = true }) {
  if (!['all', 'linux', ...PLATFORMS.map((item) => item.name)].includes(platform)) throw new Error('Unknown artifact platform');
  if (!['full', 'product', 'core'].includes(profile)) throw new Error('Unknown artifact profile');
  if (typeof runTests !== 'boolean') throw new Error('runTests must be boolean');
  const selected = PLATFORMS.filter((item) => platform === 'all' || item.name === platform || (platform === 'linux' && item.name.startsWith('linux-')));
  const windows = selected.filter((item) => item.name === 'windows-x64');
  const linux = selected.filter((item) => item.name.startsWith('linux-'));
  return {
    profile, platform, runTests, core: profile !== 'product',
    windows: profile !== 'core' && windows.length > 0,
    linux: profile !== 'core' && linux.length > 0,
    smoke: profile === 'full' && windows.length > 0,
    complete: platform === 'all' && profile === 'full' && runTests,
    coreMatrix: { include: selected }, windowsMatrix: { include: windows }, linuxMatrix: { include: linux },
  };
}

export function selectValidation(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return { profile: 'full', reason: 'unknown-or-empty-diff' };
  const scopes = new Set(Array.from(paths, classifyPath));
  scopes.delete('documentation');
  return validationForScopes(scopes);
}

export function evaluateArtifactResults(plan, results) {
  const required = ['plan', 'fast'];
  for (const name of ['core', 'windows', 'linux', 'smoke']) if (plan[name]) required.push(name);
  const missing = required.filter((name) => results[name]?.result !== 'success');
  const acceptance = results.smoke?.outputs;
  if (plan.smoke && !validInstallerAggregateOutput(acceptance)) missing.push('installer-aggregate');
  return { status: missing.length ? 'failed' : 'passed', scope: plan.complete ? 'full-validation' : 'partial', required, missing,
    productObservation: plan.smoke && validInstallerAggregateOutput(acceptance) ? acceptance.product_observation : 'unverified',
    releaseAcceptance: 'unverified' };
}

function validInstallerAggregateOutput(value) {
  if (value?.acceptance_contract !== 'passed') return false;
  if (typeof value.acceptance_artifact_id !== 'string' || typeof value.acceptance_artifact_digest !== 'string') return false;
  if (!/^[1-9]\d*$/.test(value.acceptance_artifact_id ?? '') || !Number.isSafeInteger(Number(value.acceptance_artifact_id))) return false;
  if (!/^sha256:[0-9a-f]{64}$/.test(value.acceptance_artifact_digest ?? '')) return false;
  return (value.product_observation === 'limited-observation' && value.reuse_eligible === 'false')
    || (value.product_observation === 'windows-installer-scenarios-only' && value.reuse_eligible === 'true');
}
