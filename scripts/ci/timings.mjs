import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createGitHubApiClient } from '../verify-workflow-artifact.mjs';

export function duration(start, end) {
  if (!start || !end) return null;
  const elapsed = Date.parse(end) - Date.parse(start);
  if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error('Invalid timing interval');
  return elapsed / 1000;
}

export function summarizeTimings(run, jobs) {
  return {
    runId: run.id, attempt: run.run_attempt, sha: run.head_sha, workflow: run.path,
    status: run.status, conclusion: run.conclusion,
    jobs: jobs.map((job) => {
      const steps = (job.steps ?? []).map((step) => ({
        name: step.name, status: step.status, conclusion: step.conclusion,
        seconds: step.status === 'completed' && step.conclusion !== 'skipped'
          ? duration(step.started_at, step.completed_at) : null,
      }));
      return {
        id: job.id, name: job.name, status: job.status, conclusion: job.conclusion,
        seconds: job.status === 'completed' && job.conclusion !== 'skipped'
          ? duration(job.started_at, job.completed_at) : null,
        // Includes dependency waits; this is NOT runner queue time.
        startOffsetSeconds: duration(run.run_started_at, job.started_at),
        measuredStepSeconds: steps.reduce((sum, step) => sum + (step.seconds ?? 0), 0),
        steps,
      };
    }),
  };
}

export async function fetchTimings(repository, runId, api = createGitHubApiClient({ token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN })) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[1-9]\d*$/.test(String(runId))) {
    throw new Error('Expected owner/repo and numeric run ID');
  }
  const root = `/repos/${repository}/actions/runs/${runId}`;
  const run = await api(root);
  const jobs = [];
  for (let page = 1; page <= 100; page++) {
    const response = await api(`${root}/attempts/${run.run_attempt}/jobs?per_page=100&page=${page}`);
    if (!Array.isArray(response.jobs)) throw new Error('Invalid jobs response');
    jobs.push(...response.jobs);
    if (jobs.length >= response.total_count) return summarizeTimings(run, jobs);
    if (!response.jobs.length) throw new Error('Incomplete jobs pagination');
  }
  throw new Error('Too many jobs pages');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [repository, runId, ...extra] = process.argv.slice(2);
    if (extra.length) throw new Error('Usage: node scripts/ci/timings.mjs owner/repo run-id');
    console.log(JSON.stringify(await fetchTimings(repository, runId), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
