import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const candidate = Object.freeze({
  repository: 'postmelee/alhangeul-tauri',
  source: 'ece8bb5e46a1a81e4d74ad2f1dbf84bde7fd59d4',
  run: 43453382283, artifact: 14059615097,
  digest: 'sha256:e799040e52d81e670eda4ed9080c7d8f6a3a0d1321c1088cf68a2f8f17ba0bb9',
});
export function verifyProducer(run, artifact) {
  if (run.id !== candidate.run || run.head_sha !== candidate.source || run.conclusion !== 'success'
      || run.repository?.full_name !== candidate.repository
      || artifact.id !== candidate.artifact || artifact.expired
      || artifact.name !== 'alhangeul-desktop-windows-x64'
      || artifact.digest !== candidate.digest
      || artifact.workflow_run?.id !== candidate.run
      || artifact.workflow_run?.head_sha !== candidate.source) throw new Error('invalid-hosted-ui-producer');
}
async function request(path, env) {
  const response = await fetch('https://api.github.com/repos/' + candidate.repository + path, {
    headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + env.GITHUB_TOKEN },
    signal: AbortSignal.timeout(180000),
  });
  if (!response.ok) throw new Error('artifact-request-failed-' + response.status);
  return response;
}
async function main(env) {
  if (env.GITHUB_ACTIONS !== 'true' || env.RUNNER_ENVIRONMENT !== 'github-hosted'
      || env.GITHUB_REPOSITORY !== candidate.repository || !env.HOSTED_UI_ROOT) throw new Error('hosted-probe-only');
  const [run, artifact] = await Promise.all([
    request('/actions/runs/' + candidate.run, env).then(r => r.json()),
    request('/actions/artifacts/' + candidate.artifact, env).then(r => r.json()),
  ]);
  verifyProducer(run, artifact);
  const response = await request('/actions/artifacts/' + candidate.artifact + '/zip', env);
  const bytes = Buffer.from(await response.arrayBuffer());
  if ('sha256:' + createHash('sha256').update(bytes).digest('hex') !== candidate.digest) throw new Error('artifact-digest-mismatch');
  await mkdir(join(env.HOSTED_UI_ROOT, 'evidence'), { recursive: true });
  await writeFile(join(env.HOSTED_UI_ROOT, 'candidate.zip'), bytes);
  await writeFile(join(env.HOSTED_UI_ROOT, 'evidence', 'producer.json'),
    JSON.stringify({ ...candidate, artifactBytes: bytes.length, harnessSha: env.GITHUB_SHA,
      probeRun: env.GITHUB_RUN_ID, probeAttempt: env.GITHUB_RUN_ATTEMPT }, null, 2) + '\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.env).catch(error => { console.error(error.message); process.exitCode = 1; });
}
