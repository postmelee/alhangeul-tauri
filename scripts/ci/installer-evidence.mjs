import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { invalidReuseFields, reuseInputsFromEnv } from './reuse-inputs.mjs';

const directory = 'diagnostics/installer-reuse';
const requiredSteps = ['harness', 'handoff', 'download', 'inventory', 'regressions', 'smoke'];
const statuses = new Set(['success', 'failure', 'cancelled', 'skipped']);
function write(name, value) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(`${directory}/${name}.json`, `${JSON.stringify(value, null, 2)}\n`);
}
function prepare(env) {
  const input = reuseInputsFromEnv(env);
  const invalidFields = invalidReuseFields(input);
  const requested = Object.fromEntries(Object.entries(input).map(([key, value]) =>
    [key, invalidFields.includes(key) ? null : value]));
  const harnessSha = /^[0-9a-f]{40}$/.test(env.HARNESS_SHA ?? '') ? env.HARNESS_SHA : null;
  write('workflow-context', { requested, harnessSha, invalidFields, verification: 'unverified' });
}
function record(env) {
  const raw = JSON.parse(env.STEP_RESULTS_JSON ?? '{}');
  const steps = Object.fromEntries(requiredSteps.map(name => [name, {
    outcome: status(raw[name]?.outcome), conclusion: status(raw[name]?.conclusion),
  }]));
  const passed = Object.values(steps).every(step => step.outcome === 'success' && step.conclusion === 'success');
  const result = passed ? 'passed' : 'failed-or-unverified';
  write('step-outcomes', { result, steps, newProductAcceptance: 'unverified' });
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY,
    `Existing product installer validation: ${result}. New product/native/updater acceptance: unverified.\n`);
}
function status(value) { return statuses.has(value) ? value : 'unverified'; }

if (process.argv[2] === 'prepare') prepare(process.env);
else if (process.argv[2] === 'record') record(process.env);
else throw new Error('Expected installer evidence command: prepare or record');
