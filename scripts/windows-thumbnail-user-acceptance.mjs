import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_INPUT } from './windows-thumbnail-user-input.mjs';
import { requireEvidence as need } from './ci/acceptance-evidence.mjs';

export const STANDARD_USER_JOB = Object.freeze({ name: 'nsis-standard-user', contract: 'strict-standard-user',
  jobName: 'NSIS standard user thumbnails and lifecycle', requiredSteps: [
    'Checkout standard user source', 'Prepare Node for standard user evidence', 'Download standard user bundle',
    'Verify standard user install thumbnails and lifecycle', 'Evaluate standard user product evidence',
    'Upload standard user evidence', 'Require standard user acceptance',
  ] });
export const SAME_VERSION_UPGRADE_STEPS = Object.freeze(['Verify public same-version manual upgrade', 'Evaluate same-version upgrade evidence']);
const clsid = '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}';
export function evaluateStandardUser(input, driver, report, expectedSha) {
  need(input?.schemaVersion === 1 && input.mode === 'fresh-standard-acceptance'
    && /^[a-f0-9]{40}$/.test(expectedSha) && input.productSha === expectedSha
    && input.metadata?.metadataStatus === 'verified'
    && input.metadata.identity.productSha === expectedSha, 'standard-input-unverified');
  need(['fresh', 'public-upgrade'].includes(input.scenario) && report?.scenario === input.scenario, 'standard-scenario-mismatch');
  if (input.scenario === 'public-upgrade') {
    need(input.baseline?.installerSha256 === PUBLIC_INPUT.installerSha256 && input.baseline.productSha === PUBLIC_INPUT.productSha
      && report.baselineInstallExit === 0 && report.baselineVerified === true && report.userDataPreserved === true, 'standard-upgrade-failed');
  }
  need(driver?.status === 'observed' && driver.context === 'standard' && driver.childExit === 0
    && driver.harnessSha === expectedSha && driver.productSha === expectedSha
    && driver.installerSha256 === input.installerSha256
    && driver.accountRemoved === true && driver.profileRemoved === true && driver.scratchRemoved === true, 'standard-driver-failed');
  need(report?.status === 'observed' && report.context === 'standard' && report.inputMode === input.mode
    && report.installerSha256 === input.installerSha256 && report.installExit === 0 && report.reinstallExit === 0
    && report.uninstallExit === 0 && report.cleanup === true && report.productUninstallPassed === true
    && !report.ownedResidualRemoval && report.uninstallState?.directoryExists === false
    && report.uninstallState.handlerRegistered === false && report.uninstallState.remaining?.length === 0, 'standard-lifecycle-failed');
  need(report.token?.status === 'ok' && report.token.elevated === false && report.token.integrityRid === 8192, 'standard-token-invalid');
  need(Array.isArray(input.binaries) && input.binaries.length === 2 && Array.isArray(report.binaries)
    && report.binaries.length === 2, 'standard-binaries-missing');
  for (const name of ['AlhangeulThumbnailHandler.dll', 'AlhangeulThumbnailWorker.exe']) {
    const expected = input.binaries.filter(row => row.name === name), actual = report.binaries.filter(row => row.name === name);
    need(expected.length === 1 && actual.length === 1 && actual[0].sha256 === expected[0].sha256
      && actual[0].bytes === expected[0].bytes, 'standard-binary-mismatch');
  }
  const phases = input.scenario === 'public-upgrade' ? ['baseline', 'installed', 'reinstalled'] : ['installed', 'reinstalled'];
  verifyProbeSets(report, phases);
  return { schemaVersion: 1, status: 'passed', scope: 'standard-user-nsis-api-and-lifecycle', scenario: input.scenario,
    documentBitmaps: phases.length * 6, controlBitmaps: phases.length * 2, explorerVisual: 'unverified', releaseAcceptance: 'unverified',
    identity: input.metadata.identity, installerSha256: input.installerSha256 };
}
function verifyProbeSets(report, phases) {
  need(Array.isArray(report.probes) && report.probes.length === phases.length * 12, 'standard-probe-count');
  const take = (name, mode, status = 'ok') => {
    const rows = report.probes.filter(row => row.name === name);
    need(rows.length === 1 && rows[0].exitCode === 0 && rows[0].result?.schemaVersion === 1
      && rows[0].result.mode === mode && rows[0].result.status === status, 'standard-probe-failed');
    if (status === 'ok') need(rows[0].result.hresult === '0x00000000', 'standard-hresult-failed');
    return rows[0].result;
  };
  for (const phase of phases) {
    const state = take(`${phase}-environment`, 'state', 'collected').environment;
    need(state?.token?.elevated === false && state.token.integrityRid === 8192
      && state.is64BitProcess === true && state.apartment === 'STA', 'standard-probe-token-invalid');
    for (const mode of ['shell', 'force-extract']) for (const fixture of ['small-hwp', 'large-hwp', 'form-hwpx', 'control-jpg']) {
      const result = take(`${phase}-${fixture}-${mode}`, mode);
      need(result.bitmapPresent === true && Number.isInteger(result.width) && Number.isInteger(result.height)
        && result.width > 0 && result.height > 0 && result.width <= 256 && result.height <= 256
        && result.requestFlags === (mode === 'shell' ? 8 : 4), 'standard-bitmap-invalid');
    }
    for (const ext of ['hwp', 'hwpx']) need(take(`${phase}-association-${ext}`, 'association').resolvedHandler === clsid, 'standard-association-invalid');
    take(`${phase}-activation`, 'activate');
  }
}
async function main(root, expectedSha) {
  const read = async name => JSON.parse((await readFile(join(root, name + '.json'), 'utf8')).replace(/^\uFEFF/, ''));
  let result = { schemaVersion: 1, status: 'failed', releaseAcceptance: 'unverified' };
  try { result = evaluateStandardUser(await read('input'), await read('driver'), await read('observation'), expectedSha); }
  finally { await writeFile(join(root, 'acceptance.json'), JSON.stringify(result, null, 2) + '\n'); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(...process.argv.slice(2)).catch(() => { console.error('standard-user-acceptance-failed'); process.exitCode = 1; });
}
