import { isDeepStrictEqual } from 'node:util';
import { SCENARIOS, assertIdentity, matchIdentity, assertVerdict, assertEvidenceArtifact, requireEvidence, exactFields } from './acceptance-evidence.mjs';

// Called only AFTER metadata verification and digest-checked download. A document
// claiming success is not a substitute for that independently verified handoff.
export function verifyProducerAcceptance(document, handoff) {
  assertProducerHandoff(handoff);
  exactFields(document, ['schemaVersion', 'policyVersion', 'identity', 'contractStatus', 'provenanceStatus',
    'scenarios', 'restrictions', 'reuseEligible', 'productAcceptance', 'releaseAcceptance', 'latestVdiAcceptance']);
  requireEvidence(document?.schemaVersion === 1 && document.policyVersion === 1, 'unsupported-producer-policy');
  matchIdentity(document.identity, handoff.identity);
  requireEvidence(document.identity.sourceMode === 'ordinary', 'reused-producer-not-eligible');
  requireEvidence(document.contractStatus === 'passed' && document.provenanceStatus === 'io-verified', 'unverified-producer-contract');
  requireEvidence(document.releaseAcceptance === 'unverified' && document.latestVdiAcceptance === 'unverified', 'invalid-producer-scope');
  requireEvidence(Array.isArray(document.scenarios) && document.scenarios.length === SCENARIOS.length, 'missing-producer-scenario');
  const rows = SCENARIOS.map((selected) => verifyProducerScenario(document, selected));
  requireEvidence(new Set(rows.map((row) => row.artifact.id)).size === SCENARIOS.length, 'duplicate-producer-artifact');
  requireEvidence(isDeepStrictEqual(document.restrictions, []), 'producer-has-restrictions');
  requireEvidence(document.productAcceptance === 'windows-installer-scenarios-only', 'producer-product-not-accepted');
  requireEvidence(document.reuseEligible === true, 'producer-not-reuse-eligible');
  return {
    status: 'verified', policyVersion: 1, productSha: document.identity.productSha,
    producerRunId: document.identity.runId, producerRunAttempt: document.identity.runAttempt,
    artifactId: document.identity.artifactId, artifactDigest: document.identity.artifactDigest,
    acceptanceArtifact: handoff.acceptanceArtifact,
    newProductAcceptance: 'unverified', releaseAcceptance: 'unverified',
  };
}

function assertProducerHandoff(handoff) {
  requireEvidence(handoff?.metadataStatus === 'verified' && handoff.downloadStatus === 'success', 'producer-handoff-not-verified');
  requireEvidence(handoff.producerStatus === 'completed' && handoff.producerConclusion === 'success', 'producer-run-not-successful');
  assertIdentity(handoff.identity);
  assertEvidenceArtifact(handoff.acceptanceArtifact);
  requireEvidence(handoff.acceptanceArtifact.id !== handoff.identity.artifactId, 'acceptance-is-product-artifact');
}

function verifyProducerScenario(document, selected) {
  const matches = document.scenarios.filter((row) => row.name === selected.name);
  requireEvidence(matches.length === 1, 'missing-or-duplicate-producer-scenario');
  const row = matches[0];
  exactFields(row, ['name', 'schemaVersion', 'policyVersion', 'identity', 'installerKind', 'scenario', 'provenanceStatus', 'hashes', 'verdict', 'artifact']);
  requireEvidence(row.schemaVersion === 1 && row.policyVersion === 1, 'unsupported-producer-scenario-policy');
  matchIdentity(row.identity, document.identity);
  requireEvidence(row.installerKind === selected.installerKind && row.scenario === selected.scenario, 'producer-scenario-mismatch');
  requireEvidence(row.provenanceStatus === 'io-verified', 'producer-scenario-unverified');
  assertEvidenceArtifact(row.artifact);
  exactFields(row.hashes, ['summary', 'steps', 'input']);
  for (const key of ['summary', 'steps', 'input']) requireEvidence(/^[0-9a-f]{64}$/.test(row.hashes?.[key] ?? ''), 'missing-producer-raw-hash');
  assertVerdict(row.verdict, selected);
  requireEvidence(row.verdict.productAcceptance === 'scenario-only' && row.verdict.thumbnailStatus === 'passed'
    && row.verdict.lifecycleStatus === 'passed' && row.verdict.rawSmoke.exitCode === 0, 'producer-scenario-limited');
  return row;
}
