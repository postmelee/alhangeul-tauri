import { createGitHubApiClient } from '../verify-workflow-artifact.mjs';
import { assertIdentity, requireEvidence } from './acceptance-evidence.mjs';

const workflows = ['.github/workflows/ci.yml', '.github/workflows/alhangeul-desktop.yml'];
const productName = 'alhangeul-desktop-windows-x64';

export function assertOrdinaryRequest(request) {
  // Digest is supplied by GitHub, not by the raw installer summary.
  assertIdentity({ ...request, artifactDigest: `sha256:${'0'.repeat(64)}` });
  requireEvidence(request.sourceMode === 'ordinary', 'ordinary-source-required');
}

export function assertCurrentAttempt(run, request) {
  requireEvidence(run?.id === Number(request.runId) && run.run_attempt === Number(request.runAttempt), 'run-attempt-mismatch');
  requireEvidence(run.repository?.full_name === request.repository
    && run.head_repository?.full_name === request.repository, 'run-repository-mismatch');
  requireEvidence(Number.isSafeInteger(run.repository.id) && run.repository.id > 0
    && run.head_repository.id === run.repository.id, 'run-repository-id-mismatch');
  requireEvidence(run.head_sha === request.workflowSha, 'run-source-mismatch');
  requireEvidence(workflows.includes(run.path?.split('@')[0]), 'unsupported-installer-workflow');
  requireEvidence(['in_progress', 'completed'].includes(run.status), 'run-not-started');
  requireEvidence(Number.isFinite(Date.parse(run.run_started_at)), 'missing-attempt-start');
}

export function assertCurrentArtifact(artifact, run, expected) {
  requireEvidence(artifact?.id === Number(expected.id) && artifact.name === expected.name, 'artifact-identity-mismatch');
  requireEvidence(Number.isSafeInteger(artifact.id) && artifact.id > 0
    && Number.isSafeInteger(artifact.size_in_bytes) && artifact.size_in_bytes > 0, 'invalid-artifact-size-or-id');
  requireEvidence(artifact.expired === false && /^sha256:[0-9a-f]{64}$/.test(artifact.digest ?? ''), 'invalid-artifact-digest-or-expiry');
  const owner = artifact.workflow_run;
  requireEvidence(owner?.id === run.id && owner.repository_id === run.repository.id
    && owner.head_repository_id === run.head_repository.id && owner.head_sha === run.head_sha, 'artifact-run-mismatch');
  // Artifacts survive reruns. IDs alone do not bind them to the current attempt.
  const created = Date.parse(artifact.created_at);
  requireEvidence(Number.isFinite(created) && created >= Date.parse(run.run_started_at), 'stale-attempt-artifact');
  return { id: String(artifact.id), digest: artifact.digest, size: artifact.size_in_bytes };
}

export async function resolveOrdinaryProduct(request, services = {}) {
  assertOrdinaryRequest(request);
  const api = services.fetchJson ?? createGitHubApiClient({ token: process.env.GITHUB_TOKEN });
  const base = `/repos/${request.repository}/actions/runs/${request.runId}`;
  const current = await api(base);
  assertCurrentAttempt(current, request);
  const attempt = await api(`${base}/attempts/${request.runAttempt}`);
  assertCurrentAttempt(attempt, request);
  requireEvidence(current.run_started_at === attempt.run_started_at, 'attempt-start-mismatch');
  const artifact = await api(`/repos/${request.repository}/actions/artifacts/${request.artifactId}`);
  const verified = assertCurrentArtifact(artifact, attempt, { id: request.artifactId, name: productName });
  const identity = { ...request, artifactDigest: verified.digest };
  assertIdentity(identity);
  return { schemaVersion: 1, metadataStatus: 'verified', provenanceStatus: 'requires-io-verification',
    identity, artifactSize: verified.size, attemptStartedAt: attempt.run_started_at };
}
