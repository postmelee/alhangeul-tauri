import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEvidenceJson } from './acceptance-json.mjs';
import { IDENTITY_FIELDS, STEP_NAMES, assertIdentity, exactFields, fixedScenario, assertVerdict, requireEvidence } from './acceptance-evidence.mjs';

export function validateEvaluationInput(input) {
  exactFields(input, ['context', 'identity', 'summary', 'inventory', 'fixtureManifest', 'steps', 'smokeExitCode']);
  const contextFields = [...IDENTITY_FIELDS, 'policyVersion', 'contract', 'installerKind', 'scenario'];
  exactFields(input.context, contextFields);
  exactFields(input.identity, contextFields);
  for (const context of [input.context, input.identity]) {
    assertIdentity(Object.fromEntries(IDENTITY_FIELDS.map((key) => [key, context[key]])));
    requireEvidence(context.policyVersion === 1, 'unsupported-evaluation-policy');
    requireEvidence(fixedScenario(context.installerKind, context.scenario).contract === context.contract, 'evaluation-contract-mismatch');
  }
  for (const key of contextFields) requireEvidence(input.context[key] === input.identity[key], 'evaluation-identity-mismatch');
  exactFields(input.steps, STEP_NAMES);
  requireEvidence(Number.isInteger(input.smokeExitCode) && [0, 1].includes(input.smokeExitCode), 'invalid-smoke-exit-code');
  return input;
}

export async function readEvaluationInput(path) {
  const record = await readEvidenceJson(path);
  return { input: validateEvaluationInput(record.value), sha256: record.sha256 };
}

export function encodeEvaluationInput(record) {
  // Windows PowerShell 5.1 may decode native stdout using the console code page.
  // Escape UTF-16 units to ASCII; JSON decoding restores Korean and surrogate pairs.
  return JSON.stringify(record).replace(/[\u007f-\uffff]/g,
    character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export function evaluationSummary(evaluation) {
  exactFields(evaluation, ['schemaVersion', 'policyVersion', 'status', 'inputSha256', 'provenanceStatus', 'verdict']);
  requireEvidence(evaluation.schemaVersion === 1 && evaluation.policyVersion === 1, 'unsupported-evaluation-policy');
  requireEvidence(evaluation.provenanceStatus === 'requires-io-verification', 'invalid-evaluation-provenance');
  requireEvidence(['passed', 'failed'].includes(evaluation.status), 'invalid-evaluation-status');
  let limited = false;
  if (evaluation.status === 'passed') {
    requireEvidence(/^[0-9a-f]{64}$/.test(evaluation.inputSha256 ?? ''), 'missing-evaluation-hash');
    const contract = evaluation.verdict?.contract;
    const kind = contract === 'hosted-nsis-diagnostic' ? 'nsis' : 'msi';
    const scenario = contract === 'msi-forced-reinstall-reboot' ? 'forced-reinstall' : 'lifecycle';
    assertVerdict(evaluation.verdict, fixedScenario(kind, scenario));
    limited = evaluation.verdict.productAcceptance === 'limited-observation';
  }
  const observation = evaluation.status !== 'passed' ? 'unverified' : limited ? 'limited' : 'scenario-only';
  return {
    status: evaluation.status, observation,
    markdown: `검사 계약: ${evaluation.status === 'passed' ? '통과' : '실패'} / 제품 관측: ${observation === 'limited' ? '제한' : observation === 'scenario-only' ? '선택 시나리오 통과' : '미검증'}\n\n`
      + '원시 smoke 결과는 별도 보존합니다. 이 판정만으로 artifact 출처·전달 검증이 완료되지 않습니다.\n\n'
      + (evaluation.verdict?.reasonCodes?.includes('nsis-per-user-shell-activation-failed') ? 'NSIS: 0x80040154 (사용자별 Shell 활성화 제한 관측).\n\n' : '')
      + (evaluation.verdict?.reasonCodes?.includes('post-reboot-unverified') ? 'MSI: 3010, 재부팅 이후 동작 미검증.\n\n' : '')
      + '최신 VDI·릴리즈·재사용 자격: 미검증.\n',
  };
}

export async function reportEvaluation(path, env = process.env) {
  const { value } = await readEvidenceJson(path);
  const result = evaluationSummary(value);
  if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, result.markdown);
  if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, `contract_status=${result.status}\nproduct_observation=${result.observation}\n`);
  return result.status === 'passed' ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireEvidence(process.argv.length === 4, 'invalid-evaluation-command');
    if (process.argv[2] === 'read') console.log(encodeEvaluationInput(await readEvaluationInput(process.argv[3])));
    else if (process.argv[2] === 'report') process.exitCode = await reportEvaluation(process.argv[3]);
    else throw new Error('invalid-evaluation-command');
  } catch { console.error('installer-evaluation-io-failed'); process.exitCode = 1; }
}
