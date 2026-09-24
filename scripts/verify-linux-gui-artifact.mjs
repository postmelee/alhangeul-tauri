import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createGitHubApiClient, verifyWorkflowArtifact, writeWorkflowArtifactOutputs,
} from './verify-workflow-artifact.mjs';

export async function verifyLinuxGuiArtifact(options, services = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(options.repository ?? '')
    || !/^[1-9][0-9]*$/.test(String(options.runId ?? ''))) throw new Error('invalid producer identity');
  const fetchJson = services.fetchJson ?? createGitHubApiClient({ token: process.env.GITHUB_TOKEN });
  const path = `/repos/${options.repository}/actions/runs/${options.runId}`;
  const run = await fetchJson(path);
  const workflowPath = run.path?.split('@')[0];
  if (!['.github/workflows/ci.yml', '.github/workflows/alhangeul-desktop.yml'].includes(workflowPath)) {
    throw new Error('Unsupported Linux GUI product producer workflow');
  }
  return verifyWorkflowArtifact({ ...options, workflowPath }, {
    fetchJson: (url) => url === path ? Promise.resolve(run) : fetchJson(url),
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const names = ['repository', 'build-ref', 'run-id', 'artifact-name', 'json-output', 'github-output'];
  const { values } = parseArgs({ options: Object.fromEntries(names.map(name => [name, { type: 'string' }])) });
  const options = Object.fromEntries(Object.entries(values).map(([key, value]) => [
    key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value,
  ]));
  const result = await verifyLinuxGuiArtifact(options);
  await writeWorkflowArtifactOutputs(result, options);
  console.log(`Linux GUI handoff verified: run ${result.nativeRunId}, artifact ${result.artifactId}`);
}
