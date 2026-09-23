import { isDeepStrictEqual } from 'node:util';

export const SCENARIOS = Object.freeze([
  Object.freeze({ name: 'nsis', installerKind: 'nsis', scenario: 'lifecycle', contract: 'hosted-nsis-diagnostic' }),
  Object.freeze({ name: 'msi', installerKind: 'msi', scenario: 'lifecycle', contract: 'strict-product' }),
  Object.freeze({ name: 'msi-forced-reinstall', installerKind: 'msi', scenario: 'forced-reinstall', contract: 'msi-forced-reinstall-reboot' }),
]);
export const STEP_NAMES = Object.freeze(['checkout', 'verifyCommit', 'download', 'assessmentTests',
  'diagnosticContract', 'supportDownload', 'manualTests', 'manualEvidence', 'smoke']);
export const IDENTITY_FIELDS = Object.freeze(['repository', 'runId', 'runAttempt', 'workflowSha',
  'harnessSha', 'productSha', 'artifactId', 'artifactDigest', 'expectedVersion', 'sourceMode']);
const sha = /^[0-9a-f]{40}$/;
const digest = /^sha256:[0-9a-f]{64}$/;
const hash = /^[0-9a-f]{64}$/;

export function requireEvidence(condition, code = 'invalid-acceptance-evidence') {
  if (condition !== true) throw new Error(code);
}

export function exactFields(value, fields) {
  requireEvidence(value !== null && typeof value === 'object' && !Array.isArray(value), 'invalid-evidence-object');
  requireEvidence(isDeepStrictEqual(Object.keys(value).sort(), [...fields].sort()), 'unexpected-evidence-fields');
}

export function assertIdentity(identity) {
  exactFields(identity, IDENTITY_FIELDS);
  requireEvidence(identity?.repository === 'postmelee/alhangeul-tauri', 'invalid-repository');
  for (const key of IDENTITY_FIELDS) requireEvidence(typeof identity[key] === 'string', 'invalid-identity-type');
  for (const key of ['runId', 'runAttempt', 'artifactId']) {
    requireEvidence(/^[1-9]\d*$/.test(identity[key]) && Number.isSafeInteger(Number(identity[key])), 'invalid-identity-id');
  }
  for (const key of ['workflowSha', 'harnessSha', 'productSha']) requireEvidence(sha.test(identity[key]), 'invalid-identity-sha');
  requireEvidence(digest.test(identity.artifactDigest), 'invalid-identity-digest');
  requireEvidence(/^\d+\.\d+\.\d+$/.test(identity.expectedVersion), 'invalid-product-version');
  requireEvidence(['ordinary', 'reuse'].includes(identity.sourceMode), 'invalid-source-mode');
  requireEvidence(identity.workflowSha === identity.harnessSha, 'workflow-harness-mismatch');
  if (identity.sourceMode === 'ordinary') requireEvidence(identity.productSha === identity.workflowSha, 'workflow-product-mismatch');
}

export function matchIdentity(actual, expected) {
  assertIdentity(actual);
  assertIdentity(expected);
  for (const key of IDENTITY_FIELDS) requireEvidence(actual[key] === expected[key], 'acceptance-identity-mismatch');
}

export function fixedScenario(kind, scenario) {
  const selected = SCENARIOS.find((row) => row.installerKind === kind && row.scenario === scenario);
  requireEvidence(Boolean(selected), 'unknown-installer-scenario');
  return selected;
}

export function assertVerdict(verdict, selected) {
  exactFields(verdict, ['schemaVersion', 'policyVersion', 'contractStatus', 'contract', 'thumbnailStatus',
    'lifecycleStatus', 'reasonCodes', 'productAcceptance', 'releaseAcceptance', 'reuseEligible', 'provenanceStatus', 'rawSmoke']);
  requireEvidence(verdict?.schemaVersion === 1 && verdict.policyVersion === 1, 'unsupported-acceptance-policy');
  requireEvidence(verdict.contract === selected.contract && verdict.contractStatus === 'passed', 'contract-not-passed');
  requireEvidence(verdict.releaseAcceptance === 'unverified' && verdict.reuseEligible === false, 'invalid-scenario-claim');
  requireEvidence(verdict.provenanceStatus === 'requires-io-verification', 'invalid-pure-provenance');
  const limited = verdict.thumbnailStatus === 'not-accepted';
  const reboot = verdict.lifecycleStatus === 'reboot-required';
  requireEvidence(['passed', 'not-accepted'].includes(verdict.thumbnailStatus), 'invalid-thumbnail-status');
  requireEvidence(['passed', 'reboot-required'].includes(verdict.lifecycleStatus), 'invalid-lifecycle-status');
  requireEvidence(!limited || selected.name === 'nsis', 'unexpected-thumbnail-limitation');
  requireEvidence(!reboot || selected.name === 'msi-forced-reinstall', 'unexpected-reboot');
  const reasons = limited ? ['nsis-per-user-shell-activation-failed'] : reboot ? ['msi-reboot-required', 'post-reboot-unverified']
    : selected.name === 'nsis' ? ['known-limitation-not-reproduced'] : ['scenario-observed'];
  requireEvidence(isDeepStrictEqual(verdict.reasonCodes, reasons), 'invalid-reason-codes');
  requireEvidence(verdict.productAcceptance === (limited || reboot ? 'limited-observation' : 'scenario-only'), 'invalid-product-claim');
  const failed = limited || reboot;
  requireEvidence(isDeepStrictEqual(verdict.rawSmoke, {
    status: failed ? 'failed' : 'passed', outcome: failed ? 'failure' : 'success',
    exitCode: failed ? 1 : 0, failureCount: limited ? 12 : reboot ? 1 : 0,
  }), 'invalid-raw-smoke');
}

// The caller must independently replay the pure evaluator and verify API metadata,
// download digests, inventory and diagnostic read-back. Hashes are binding, not trust.
export function validateScenarioEvidence(envelope, independent) {
  exactFields(envelope, ['schemaVersion', 'policyVersion', 'identity', 'installerKind', 'scenario', 'provenanceStatus', 'hashes', 'verdict']);
  requireEvidence(envelope?.schemaVersion === 1 && envelope.policyVersion === 1, 'unsupported-envelope-policy');
  matchIdentity(envelope.identity, independent.identity);
  const selected = fixedScenario(envelope.installerKind, envelope.scenario);
  requireEvidence(selected.name === independent.scenarioName, 'unexpected-scenario');
  requireEvidence(envelope.provenanceStatus === 'io-verified', 'unverified-scenario-provenance');
  exactFields(envelope.hashes, ['summary', 'steps', 'input']);
  for (const key of ['summary', 'steps', 'input']) {
    requireEvidence(hash.test(envelope.hashes?.[key] ?? '') && envelope.hashes[key] === independent.hashes?.[key], 'raw-evidence-hash-mismatch');
  }
  assertVerdict(envelope.verdict, selected);
  requireEvidence(isDeepStrictEqual(envelope.verdict, independent.replayedVerdict), 'replayed-verdict-mismatch');
  for (const name of STEP_NAMES) {
    const expected = name === 'smoke' ? envelope.verdict.rawSmoke.outcome : 'success';
    requireEvidence(independent.steps?.[name] === expected, 'required-step-not-passed');
  }
  requireEvidence(independent.smokeExitCode === envelope.verdict.rawSmoke.exitCode, 'raw-exit-code-mismatch');
  requireEvidence(independent.acceptanceStep === 'success' && independent.uploadStep === 'success', 'scenario-delivery-failed');
  return structuredClone({ name: selected.name, ...envelope });
}

export function aggregateAcceptance(rows, identity) {
  assertIdentity(identity);
  requireEvidence(Array.isArray(rows) && rows.length === SCENARIOS.length, 'missing-or-duplicate-scenario');
  const scenarios = SCENARIOS.map((selected) => {
    const matches = rows.filter((row) => row.independent?.scenarioName === selected.name);
    requireEvidence(matches.length === 1, 'missing-or-duplicate-scenario');
    const { envelope, independent, artifact } = matches[0];
    matchIdentity(independent.identity, identity);
    assertEvidenceArtifact(artifact);
    const validated = validateScenarioEvidence(envelope, independent);
    return { ...validated, artifact };
  });
  requireEvidence(new Set(scenarios.map((row) => row.artifact.id)).size === SCENARIOS.length, 'duplicate-scenario-artifact');
  const restrictions = [...new Set(scenarios.flatMap((row) => row.verdict.productAcceptance === 'limited-observation' ? row.verdict.reasonCodes : []))];
  return structuredClone({
    schemaVersion: 1, policyVersion: 1, identity, contractStatus: 'passed', provenanceStatus: 'io-verified',
    scenarios, restrictions, reuseEligible: identity.sourceMode === 'ordinary' && restrictions.length === 0,
    productAcceptance: restrictions.length ? 'limited-observation' : 'windows-installer-scenarios-only',
    releaseAcceptance: 'unverified', latestVdiAcceptance: 'unverified',
  });
}

export function assertEvidenceArtifact(artifact) {
  exactFields(artifact, ['id', 'digest']);
  requireEvidence(typeof artifact?.id === 'string' && /^[1-9]\d*$/.test(artifact.id)
    && Number.isSafeInteger(Number(artifact.id)), 'invalid-evidence-artifact-id');
  requireEvidence(typeof artifact.digest === 'string' && digest.test(artifact.digest), 'invalid-evidence-artifact-digest');
}
