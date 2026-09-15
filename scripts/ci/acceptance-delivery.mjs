import { SCENARIOS, requireEvidence } from './acceptance-evidence.mjs';
import { assertCurrentArtifact, assertCurrentAttempt, resolveOrdinaryProduct } from './installer-metadata.mjs';
import { createGitHubApiClient } from '../github-api.mjs';

export const DELIVERY = Object.freeze(SCENARIOS.map(row => ({ ...row,
  artifactName: `alhangeul-desktop-windows-x64-${row.name === 'msi-forced-reinstall' ? row.name : `${row.name}-installer-smoke`}`,
  jobName: `Installer contract ${row.name}`,
})));
export const DELIVERY_STEPS = Object.freeze([
  'Checkout installer smoke source', 'Prepare Node for installer evidence', 'Verify installer smoke commit',
  'Download Windows x64 bundle', 'Test Windows thumbnail assessment contracts',
  'Download Windows thumbnail support package', 'Test Windows manual thumbnail contracts',
  'Run Windows installer smoke', 'Verify thumbnail diagnostic contract', 'Verify manual thumbnail evidence',
  'Record installer smoke outcome', 'Collect independently bound installer input',
  'Evaluate installer contract', 'Upload installer smoke diagnostics', 'Require Windows installer contract success',
]);

export async function listEvidencePages(api, path, key) {
  const rows = [];
  let total;
  for (let page = 1; page <= 100; page++) {
    const response = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    requireEvidence(Array.isArray(response?.[key]) && Number.isSafeInteger(response.total_count)
      && response.total_count >= 0, 'invalid-delivery-page');
    total ??= response.total_count;
    requireEvidence(response.total_count === total, 'unstable-delivery-page');
    rows.push(...response[key]);
    requireEvidence(rows.length <= total, 'duplicate-delivery-page');
    if (rows.length === total) return rows;
    requireEvidence(response[key].length > 0, 'incomplete-delivery-page');
  }
  throw new Error('delivery-page-limit');
}

export async function resolveNamedEvidence(api, run, name) {
  const base = `/repos/${run.repository.full_name}/actions/runs/${run.id}/artifacts?name=${encodeURIComponent(name)}`;
  const rows = await listEvidencePages(api, base, 'artifacts');
  requireEvidence(rows.length === 1 && rows[0].name === name, 'missing-or-duplicate-delivery-artifact');
  return { ...assertCurrentArtifact(rows[0], run, { id: String(rows[0].id), name }), name };
}

export function verifyScenarioJob(jobs, selected, identity) {
  const matches = jobs.filter(job => job.name === selected.jobName || job.name?.endsWith(` / ${selected.jobName}`));
  requireEvidence(matches.length === 1, 'missing-or-duplicate-scenario-job');
  const job = matches[0];
  requireEvidence(job.run_id === Number(identity.runId) && job.run_attempt === Number(identity.runAttempt)
    && job.head_sha === identity.workflowSha, 'scenario-job-identity-mismatch');
  requireEvidence(job.status === 'completed' && job.conclusion === 'success', 'scenario-job-not-passed');
  requireEvidence(Array.isArray(job.steps), 'scenario-job-steps-missing');
  for (const name of DELIVERY_STEPS) {
    const steps = job.steps.filter(step => step.name === name);
    requireEvidence(steps.length === 1 && steps[0].status === 'completed'
      && steps[0].conclusion === 'success', 'scenario-step-not-passed');
  }
  // API step conclusion includes continue-on-error. The raw smoke outcome/exit
  // must STILL be checked from the separate raw files during independent replay.
  return { acceptanceStep: 'success', uploadStep: 'success' };
}

export async function resolveInstallerDelivery(request, services = {}) {
  const api = services.fetchJson ?? createGitHubApiClient({ token: process.env.GITHUB_TOKEN });
  const metadata = await resolveOrdinaryProduct(request, { fetchJson: api });
  const base = `/repos/${request.repository}/actions/runs/${request.runId}`;
  const run = await api(`${base}/attempts/${request.runAttempt}`);
  assertCurrentAttempt(run, request);
  const jobs = await listEvidencePages(api, `${base}/attempts/${request.runAttempt}/jobs`, 'jobs');
  const supportArtifact = await resolveNamedEvidence(api, run, 'alhangeul-windows-x64-thumbnail-support');
  const scenarios = [];
  for (const selected of DELIVERY) {
    const delivery = verifyScenarioJob(jobs, selected, metadata.identity);
    const artifact = await resolveNamedEvidence(api, run, selected.artifactName);
    scenarios.push({ name: selected.name, artifact, ...delivery });
  }
  requireEvidence(new Set(scenarios.map(row => row.artifact.id)).size === 3, 'duplicate-delivery-artifact');
  return { schemaVersion: 1, metadata, supportArtifact, scenarios };
}
