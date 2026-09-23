import { assertIdentity, requireEvidence } from './acceptance-evidence.mjs';
import { assertCurrentArtifact, assertCurrentAttempt } from './installer-metadata.mjs';
import { listEvidencePages, resolveNamedEvidence } from './acceptance-delivery.mjs';
import { parseEvidenceJson } from './acceptance-json.mjs';

export async function resolveTestProducerMetadata(verified, run, api) {
  requireEvidence(run?.status === 'completed' && run.conclusion === 'success', 'producer-not-successful');
  const response = await api(`/repos/${verified.repository}/contents/package.json?ref=${verified.buildRef}`);
  requireEvidence(response.encoding === 'base64' && typeof response.content === 'string', 'invalid-producer-package');
  const product = parseEvidenceJson(Buffer.from(response.content, 'base64'));
  const identity = { repository: verified.repository, runId: String(verified.nativeRunId), runAttempt: String(run.run_attempt),
    workflowSha: verified.buildRef, harnessSha: verified.buildRef, productSha: verified.buildRef,
    artifactId: String(verified.artifactId), artifactDigest: verified.artifactDigest,
    expectedVersion: product.version, sourceMode: 'ordinary' };
  assertIdentity(identity);
  assertCurrentAttempt(run, identity);
  const base = `/repos/${verified.repository}/actions/runs/${identity.runId}`;
  const attempt = await api(`${base}/attempts/${identity.runAttempt}`);
  assertCurrentAttempt(attempt, identity);
  requireEvidence(attempt.run_started_at === run.run_started_at && attempt.conclusion === 'success', 'producer-attempt-mismatch');
  const productArtifact = await api(`/repos/${verified.repository}/actions/artifacts/${identity.artifactId}`);
  const productMetadata = assertCurrentArtifact(productArtifact, attempt, { id: identity.artifactId, name: 'alhangeul-desktop-windows-x64' });
  requireEvidence(productMetadata.digest === identity.artifactDigest, 'producer-product-digest-mismatch');
  return { identity, metadataStatus: 'verified', downloadStatus: 'unverified', producerStatus: run.status,
    producerConclusion: run.conclusion, purpose: 'additional-validation-only',
    productAcceptance: 'unverified', releaseAcceptance: 'unverified' };
}

// #67 reference implementation, not a prerequisite for ordinary test handoffs.
export async function resolveProducerMetadata(verified, run, api) {
  const checked = await resolveTestProducerMetadata(verified, run, api);
  const { identity } = checked;
  const base = `/repos/${verified.repository}/actions/runs/${identity.runId}`;
  const attempt = await api(`${base}/attempts/${identity.runAttempt}`);
  assertCurrentAttempt(attempt, identity);
  const acceptance = await resolveNamedEvidence(api, attempt, 'alhangeul-ci-acceptance');
  const jobs = await listEvidencePages(api, `${base}/attempts/${identity.runAttempt}/jobs`, 'jobs');
  assertAggregateProducer(jobs, identity);
  return { identity, metadataStatus: 'verified', downloadStatus: 'unverified', producerStatus: run.status,
    producerConclusion: run.conclusion, acceptanceArtifact: { id: acceptance.id, digest: acceptance.digest } };
}

function assertAggregateProducer(jobs, identity) {
  const matches = jobs.filter(job => job.name === 'Aggregate Windows installer evidence'
    || job.name?.endsWith(' / Aggregate Windows installer evidence'));
  requireEvidence(matches.length === 1, 'producer-aggregate-job-missing');
  const job = matches[0];
  requireEvidence(job.run_id === Number(identity.runId) && job.run_attempt === Number(identity.runAttempt)
    && job.head_sha === identity.productSha && job.status === 'completed' && job.conclusion === 'success', 'producer-aggregate-not-passed');
  for (const name of ['Replay and aggregate independent installer evidence', 'Upload installer acceptance', 'Require aggregate and upload success']) {
    const steps = job.steps?.filter(step => step.name === name);
    requireEvidence(steps?.length === 1 && steps[0].status === 'completed' && steps[0].conclusion === 'success', 'producer-aggregate-step-failed');
  }
}
