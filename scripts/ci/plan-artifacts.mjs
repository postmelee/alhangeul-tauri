import { appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { artifactPlan } from './profiles.mjs';

try {
  const source = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (source !== process.env.WORKFLOW_SHA) throw new Error('Artifact workflow and product checkout must use the same exact SHA');
  if (!['true', 'false'].includes(process.env.RUN_TESTS)) throw new Error('Missing run_tests input');
  const plan = artifactPlan({ platform: process.env.ARTIFACT_PLATFORM, profile: process.env.VALIDATION_PROFILE, runTests: process.env.RUN_TESTS === 'true' });
  const outputs = { source, plan: JSON.stringify(plan) };
  for (const [key, value] of Object.entries(plan)) outputs[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
  await appendFile(process.env.GITHUB_OUTPUT, Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join(''));
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `Artifact plan: ${plan.platform}/${plan.profile}; tests=${plan.runTests}; source=${source}.\n`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
