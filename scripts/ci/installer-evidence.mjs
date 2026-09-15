import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { invalidReuseFields, reuseInputsFromEnv } from './reuse-inputs.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = 'diagnostics/installer-reuse';
export const requiredSteps = ['harness', 'handoff', 'download', 'inventory', 'support', 'manual-tests', 'smoke-context', 'regressions', 'smoke', 'diagnostic-contract', 'manual-evidence'];
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
  write('workflow-context', { requested, harnessSha, invalidFields, verification: 'unverified', installerKind: ['nsis', 'msi'].includes(env.INSTALLER_KIND) ? env.INSTALLER_KIND : null, scenario: ['lifecycle', 'forced-reinstall'].includes(env.INSTALLER_SCENARIO) ? env.INSTALLER_SCENARIO : null });
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
    `Existing product raw installer result: ${result}. Contract evaluation is separate. New product/native/updater acceptance: unverified.\n`);
}
function status(value) { return statuses.has(value) ? value : 'unverified'; }

export function evaluateReuseGate(steps, contractStatus, final = true) {
  const required = [...requiredSteps.filter(name => name !== 'smoke'), 'raw-record', 'reuse-input', 'evaluation'];
  if (final) required.push('contract-record', 'upload');
  const missing = required.filter(name => steps?.[name]?.outcome !== 'success' || steps[name].conclusion !== 'success');
  if (!['success', 'failure'].includes(steps?.smoke?.outcome)) missing.push('smoke');
  if (contractStatus !== 'passed') missing.push('contract');
  return { contractStatus: missing.length ? 'failed' : 'passed', missing,
    rawSmokeOutcome: status(steps?.smoke?.outcome), purpose: 'additional-validation-only',
    newProductAcceptance: 'unverified', releaseAcceptance: 'unverified' };
}

function contract(env, final) {
  const result = evaluateReuseGate(JSON.parse(env.STEP_RESULTS_JSON ?? '{}'), env.CONTRACT_STATUS, final);
  if (!final) write('contract-result', result);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY,
    `Reused installer ${final ? 'final gate' : 'contract'}: ${result.contractStatus}; raw smoke: ${result.rawSmokeOutcome}.\n`
    + 'Additional testing only. See evaluation JSON for NSIS limitations/MSI reboot observations; new product/VDI/release acceptance unverified.\n');
  if (final && result.contractStatus !== 'passed') throw new Error('Reused installer contract or required evidence failed');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'prepare') prepare(process.env);
  else if (process.argv[2] === 'record') record(process.env);
  else if (process.argv[2] === 'contract') contract(process.env, false);
  else if (process.argv[2] === 'gate') contract(process.env, true);
  else throw new Error('Expected installer evidence command: prepare, record, contract or gate');
}
