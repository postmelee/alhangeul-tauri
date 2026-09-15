import { appendFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DELIVERY, listEvidencePages, verifyScenarioJob } from './acceptance-delivery.mjs';
import { resolveOrdinaryProduct } from './installer-metadata.mjs';
import { requireEvidence } from './acceptance-evidence.mjs';
import { createGitHubApiClient } from '../github-api.mjs';

// Status-only gate. Raw results are verified by each scenario's evaluator, not
// replayed here. A green gate never grants product or release acceptance.
export async function verifyInstallerStatus(request, services = {}) {
  const api = services.fetchJson ?? createGitHubApiClient({ token: process.env.GITHUB_TOKEN });
  const { identity } = await resolveOrdinaryProduct(request, { fetchJson: api });
  const base = `/repos/${identity.repository}/actions/runs/${identity.runId}`;
  const jobs = await listEvidencePages(api, `${base}/attempts/${identity.runAttempt}/jobs`, 'jobs');
  const scenarios = DELIVERY.map(selected => {
    verifyScenarioJob(jobs, selected, identity);
    const job = jobs.find(row => row.name === selected.jobName || row.name?.endsWith(` / ${selected.jobName}`));
    requireEvidence(Number.isSafeInteger(job.id) && job.id > 0, 'invalid-scenario-job-id');
    return { name: selected.name, contract: selected.contract, status: 'passed',
      url: `https://github.com/${identity.repository}/actions/runs/${identity.runId}/job/${job.id}` };
  });
  requireEvidence(new Set(scenarios.map(row => row.url)).size === DELIVERY.length, 'duplicate-scenario-job-id');
  return { contractStatus: 'passed', productObservation: 'see-scenario-evidence', identity, scenarios,
    productAcceptance: 'unverified', releaseAcceptance: 'unverified', latestVdiAcceptance: 'unverified' };
}

export function installerStatusSummary(result) {
  return '## Windows installer contracts: passed\n\n'
    + result.scenarios.map(row => `- [${row.name}](${row.url}): ${row.contract} — passed`).join('\n')
    + '\n\n각 job의 diagnostics artifact에 원시 HRESULT·bitmap·종료 코드·평가 JSON을 보존합니다.\n\n'
    + '계약 통과는 실제 썸네일 성공과 다릅니다. NSIS 활성화 제한과 MSI 재부팅 후 미검증 여부는 개별 결과를 확인하세요.\n\n'
    + '독립 증거 재검산은 수행하지 않았습니다. 전체 제품 지원·최신 VDI·릴리즈 수용: 미검증.\n';
}

async function main(env) {
  let result;
  try {
    requireEvidence(env.MATRIX_RESULT === 'success', 'installer-matrix-not-passed');
    const checkout = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    requireEvidence(checkout === env.GITHUB_WORKFLOW_SHA && checkout === env.EXPECTED_SOURCE_SHA, 'status-checkout-mismatch');
    const product = JSON.parse(await readFile('package.json', 'utf8'));
    result = await verifyInstallerStatus({ repository: env.GITHUB_REPOSITORY, runId: env.GITHUB_RUN_ID,
      runAttempt: env.GITHUB_RUN_ATTEMPT, workflowSha: checkout, harnessSha: checkout, productSha: checkout,
      artifactId: env.PRODUCT_ARTIFACT_ID, expectedVersion: product.version, sourceMode: 'ordinary' });
    if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, installerStatusSummary(result));
  } catch {
    result = undefined;
    process.exitCode = 1;
    console.error('installer-status-failed: required current-attempt jobs/steps or product identity unverified');
    if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, 'Windows installer contracts: failed/unverified. No product or release acceptance.\n');
  }
  if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT,
    `contract_status=${result ? 'passed' : 'failed'}\nproduct_observation=${result ? 'see-scenario-evidence' : 'unverified'}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.env).catch(() => { console.error('installer-status-output-failed'); process.exitCode = 1; });
}
