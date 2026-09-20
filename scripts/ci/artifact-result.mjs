import { appendFile } from 'node:fs/promises';
import { evaluateArtifactResults } from './profiles.mjs';

try {
  const plan = JSON.parse(process.env.ARTIFACT_PLAN);
  const results = JSON.parse(process.env.JOB_RESULTS);
  const summary = evaluateArtifactResults(plan, results);
  const states = Object.entries(results).map(([name, job]) => `- ${name}: ${job.result}`).join('\n');
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `## ${summary.scope}: ${summary.status}\n\n${states}\n\n`
    + `Windows 제품 관측: ${summary.productObservation}. full-validation은 검증 범위이며 제품 전체 지원을 뜻하지 않습니다.\n\n`
    + '원시 결과·NSIS 제한·MSI 재부팅 후 미검증은 각 installer job의 diagnostics와 summary를 확인하세요. 독립 재검산·최신 VDI 수용은 제공하지 않습니다.\n\n'
    + 'GUI/updater/release acceptance is not provided by this workflow.\n');
  if (summary.status !== 'passed') throw new Error(`Required artifact gates failed or unverified: ${summary.missing.join(', ')}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
