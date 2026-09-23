import { SCENARIOS, STEP_NAMES, aggregateAcceptance } from '../../scripts/ci/acceptance-evidence.mjs';

export function identity() {
  return {
    repository: 'postmelee/alhangeul-tauri', runId: '100', runAttempt: '2',
    workflowSha: 'a'.repeat(40), harnessSha: 'a'.repeat(40), productSha: 'a'.repeat(40),
    artifactId: '200', artifactDigest: `sha256:${'b'.repeat(64)}`, expectedVersion: '0.1.0', sourceMode: 'ordinary',
  };
}

export function scenarioRow(name = 'msi', observation = 'normal') {
  const selected = SCENARIOS.find((row) => row.name === name);
  const limited = observation === 'limited';
  const reboot = observation === 'reboot';
  const failed = limited || reboot;
  const verdict = {
    schemaVersion: 1, policyVersion: 1, contractStatus: 'passed', contract: selected.contract,
    thumbnailStatus: limited ? 'not-accepted' : 'passed', lifecycleStatus: reboot ? 'reboot-required' : 'passed',
    reasonCodes: limited ? ['nsis-per-user-shell-activation-failed'] : reboot ? ['msi-reboot-required', 'post-reboot-unverified']
      : name === 'nsis' ? ['known-limitation-not-reproduced'] : ['scenario-observed'],
    productAcceptance: failed ? 'limited-observation' : 'scenario-only', releaseAcceptance: 'unverified',
    reuseEligible: false, provenanceStatus: 'requires-io-verification',
    rawSmoke: { status: failed ? 'failed' : 'passed', outcome: failed ? 'failure' : 'success', exitCode: failed ? 1 : 0, failureCount: limited ? 12 : reboot ? 1 : 0 },
  };
  const hashes = { summary: 'c'.repeat(64), steps: 'd'.repeat(64), input: 'e'.repeat(64) };
  const envelope = {
    schemaVersion: 1, policyVersion: 1, identity: identity(), installerKind: selected.installerKind,
    scenario: selected.scenario, provenanceStatus: 'io-verified', hashes, verdict,
  };
  const independent = {
    identity: identity(), scenarioName: name, hashes: structuredClone(hashes), replayedVerdict: structuredClone(verdict),
    steps: Object.fromEntries(STEP_NAMES.map((key) => [key, key === 'smoke' && failed ? 'failure' : 'success'])),
    smokeExitCode: failed ? 1 : 0, acceptanceStep: 'success', uploadStep: 'success',
  };
  return { envelope, independent, artifact: { id: String(300 + SCENARIOS.indexOf(selected)), digest: `sha256:${'f'.repeat(64)}` } };
}

export function producerFixture() {
  return {
    document: aggregateAcceptance(SCENARIOS.map((row) => scenarioRow(row.name)), identity()),
    handoff: {
      identity: identity(), metadataStatus: 'verified', downloadStatus: 'success',
      producerStatus: 'completed', producerConclusion: 'success',
      acceptanceArtifact: { id: '400', digest: `sha256:${'1'.repeat(64)}` },
    },
  };
}
