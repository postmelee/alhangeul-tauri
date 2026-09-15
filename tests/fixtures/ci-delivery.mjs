import { ordinaryFixture } from './ci-installer-input.mjs';
import { DELIVERY, DELIVERY_STEPS } from '../../scripts/ci/acceptance-delivery.mjs';

export function deliveryFixture() {
  const f = ordinaryFixture();
  f.run.event = 'workflow_dispatch';
  f.artifacts = [f.artifact, ...DELIVERY.map((row, index) => ({ ...structuredClone(f.artifact), id: 300 + index, name: row.artifactName })),
    { ...structuredClone(f.artifact), id: 350, name: 'alhangeul-windows-x64-thumbnail-support' },
    { ...structuredClone(f.artifact), id: 400, name: 'alhangeul-ci-acceptance' }];
  const job = { run_id: f.run.id, run_attempt: f.run.run_attempt, head_sha: f.run.head_sha, status: 'completed', conclusion: 'success' };
  f.jobs = DELIVERY.map(row => ({ ...job, name: `artifacts / smoke / ${row.jobName}`,
    steps: DELIVERY_STEPS.map(name => ({ name, status: 'completed', conclusion: 'success' })) }));
  f.jobs.push({ ...job, name: 'artifacts / smoke / Aggregate Windows installer evidence',
    steps: ['Replay and aggregate independent installer evidence', 'Upload installer acceptance', 'Require aggregate and upload success']
      .map(name => ({ name, status: 'completed', conclusion: 'success' })) });
  f.fetchJson = async path => {
    const url = new URL(path, 'https://api.github.com');
    if (url.pathname.endsWith('/contents/package.json')) return { encoding: 'base64', content: Buffer.from('{"version":"0.1.0"}').toString('base64') };
    if (url.pathname.endsWith('/jobs')) return { total_count: f.jobs.length, jobs: structuredClone(f.jobs) };
    if (url.pathname.endsWith('/artifacts')) {
      const rows = f.artifacts.filter(a => a.name === url.searchParams.get('name'));
      return { total_count: rows.length, artifacts: structuredClone(rows) };
    }
    const match = url.pathname.match(/\/actions\/artifacts\/(\d+)$/);
    if (match) return structuredClone(f.artifacts.find(a => a.id === Number(match[1])));
    if (url.pathname.endsWith(`/runs/${f.run.id}`) || url.pathname.endsWith(`/runs/${f.run.id}/attempts/${f.run.run_attempt}`)) return structuredClone(f.run);
    throw new Error('unexpected-fixture-api');
  };
  return f;
}

export function aggregateOutputs(observation = 'windows-installer-scenarios-only') {
  return { acceptance_contract: 'passed', acceptance_artifact_id: '400', acceptance_artifact_digest: `sha256:${'b'.repeat(64)}`,
    product_observation: observation, reuse_eligible: observation === 'limited-observation' ? 'false' : 'true' };
}
