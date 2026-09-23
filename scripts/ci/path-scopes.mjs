const rules = [
  ['documentation', /^(?:(?:docs|mydocs)\/.*\.md|AGENTS\.md|README\.md|CONTRIBUTING\.md)$/],
  ['shared', /^(?:scripts\/ci\/|tests\/ci-|\.github\/|package\.json$|pnpm-lock\.yaml$)/],
  ['fast', /^tests\/.*\.test\.mjs$/],
  ['installer', /^(?:scripts\/windows-(?:installer-smoke(?:-support)?|thumbnail-smoke|process-lifecycle)\.ps1|tests\/.*\.test\.ps1)$/],
  ['windows', /^(?:apps\/(?:thumbnail-handler|thumbnail-worker)\/|apps\/desktop\/src-tauri\/windows\/)/],
  ['linux', /^(?:apps\/linux-thumbnailer\/|apps\/desktop\/src-tauri\/linux\/)/],
];

export function classifyPath(path) {
  if (typeof path !== 'string' || !path || path.includes('..') || /[\r\n\\]/.test(path)) return 'ambiguous';
  return rules.find(([, pattern]) => pattern.test(path))?.[0] ?? 'shared';
}

export function validationForScopes(scopes) {
  if (scopes.has('ambiguous')) return { profile: 'full', reason: 'ambiguous-path' };
  const mixedNative = scopes.has('linux') && ['windows', 'installer'].some((scope) => scopes.has(scope));
  if (scopes.has('shared') || mixedNative) return { profile: 'full', reason: 'shared-or-mixed-native-change' };
  for (const [scope, profile, reason] of [
    ['windows', 'windows-package', 'windows-product-change'],
    ['linux', 'linux-package', 'linux-product-change'],
    ['installer', 'installer', 'windows-harness-change-reuse-exact-product'],
  ]) {
    if (scopes.has(scope)) return { profile, reason };
  }
  return { profile: 'fast', reason: scopes.size ? 'contract-only' : 'documentation-only' };
}
