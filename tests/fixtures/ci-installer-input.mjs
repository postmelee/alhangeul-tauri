import { identity, scenarioRow } from './ci-acceptance.mjs';
import { evidenceHash } from '../../scripts/ci/acceptance-json.mjs';

export function ordinaryFixture() {
  const id = identity();
  const { artifactDigest, ...request } = id;
  const run = { id: Number(id.runId), run_attempt: Number(id.runAttempt),
    repository: { id: 10, full_name: id.repository }, head_repository: { id: 10, full_name: id.repository },
    head_sha: id.workflowSha, path: '.github/workflows/ci.yml', status: 'in_progress',
    run_started_at: '2026-09-15T00:00:00Z' };
  const artifact = { id: Number(id.artifactId), name: 'alhangeul-desktop-windows-x64',
    size_in_bytes: 1234, digest: artifactDigest, expired: false, created_at: '2026-09-15T00:02:00Z',
    workflow_run: { id: run.id, repository_id: 10, head_repository_id: 10, head_sha: run.head_sha } };
  const metadata = { schemaVersion: 1, metadataStatus: 'verified', provenanceStatus: 'requires-io-verification',
    identity: id, artifactSize: artifact.size_in_bytes, attemptStartedAt: run.run_started_at };
  const inventory = { schemaVersion: 1, platform: 'windows-x64', sourceSha: id.productSha, files: [] };
  const fixtureManifest = { schemaVersion: 1, fixtures: [{ id: 'small-hwp', reason: '한글 😀' }] };
  const values = { inventory, fixtureManifest,
    summary: { Artifacts: { Inventory: inventory }, ThumbnailFixtureManifest: fixtureManifest },
    steps: scenarioRow().independent.steps, process: { schemaVersion: 1, status: 'completed', exitCode: 0 },
    workflow: { runId: id.runId, runAttempt: id.runAttempt, requestedBuildRef: id.productSha,
      workflowSha: id.workflowSha, installerKind: 'msi', scenario: 'lifecycle' } };
  const records = Object.fromEntries(Object.entries(values).map(([key, value]) =>
    [key, { value: structuredClone(value), sha256: evidenceHash(Buffer.from(JSON.stringify(value))) }]));
  const fetchJson = async path => {
    if (path === `/repos/${id.repository}/actions/runs/${id.runId}`
      || path === `/repos/${id.repository}/actions/runs/${id.runId}/attempts/${id.runAttempt}`) return structuredClone(run);
    if (path === `/repos/${id.repository}/actions/artifacts/${id.artifactId}`) return structuredClone(artifact);
    throw new Error('unexpected-api-path');
  };
  return { request, run, artifact, metadata, records, fetchJson };
}
