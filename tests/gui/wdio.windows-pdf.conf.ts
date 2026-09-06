import { isAbsolute, join } from 'node:path';
import type { TauriCapabilities, TauriServiceOptions } from '@wdio/tauri-service';
import { selectConfirmationCases } from './support/confirmation-cases.ts';

export function readPdfInputs(env = process.env) {
  const required = (key: string) => {
    const value = env[key];
    if (!value || /[\r\n\0]/.test(value)) throw new Error(`Invalid ${key}`);
    return value;
  };
  const absolute = (key: string) => {
    const value = required(key);
    if (!isAbsolute(value)) throw new Error(`Not absolute: ${key}`);
    return value;
  };
  const phase = required('PDF_PHASE');
  if (phase !== 'fresh' && phase !== 'restart') throw new Error('Invalid PDF_PHASE');
  const buildRef = required('PDF_BUILD_REF');
  if (!/^[0-9a-f]{40}$/.test(buildRef)) throw new Error('Invalid PDF_BUILD_REF');
  const scenario = env.PDF_SCENARIO ?? 'pdf';
  if (!['pdf', 'open-only', 'confirmation-probe', 'confirmation-verify'].includes(scenario)) throw new Error('Invalid PDF_SCENARIO');
  if (scenario !== 'pdf' && phase !== 'fresh') throw new Error('Probe requires fresh phase');
  const confirmationCases = env.PDF_CONFIRMATION_CASES ?? 'all';
  const selectedCases = selectConfirmationCases(scenario, confirmationCases);
  return {
    phase, buildRef, scenario, confirmationCases, selectedCases,
    appPath: absolute('PDF_APP_PATH'),
    driverPath: absolute('PDF_DRIVER_PATH'),
    outputDir: absolute('PDF_OUTPUT_DIR'),
    fixtureRoot: absolute('PDF_FIXTURE_ROOT'),
  };
}

const inputs = readPdfInputs();
const service: TauriServiceOptions = {
  appBinaryPath: inputs.appPath,
  tauriDriverPath: inputs.driverPath,
  driverProvider: 'external',
  autoInstallTauriDriver: false,
  autoDownloadEdgeDriver: true,
  captureBackendLogs: true,
  captureFrontendLogs: true,
  logDir: join(inputs.outputDir, 'driver', inputs.phase),
};
const capabilities: TauriCapabilities[] = [{
  browserName: 'tauri',
  'tauri:options': { application: inputs.appPath },
}];
export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: [join(import.meta.dirname, inputs.scenario === 'confirmation-probe'
    ? 'specs/windows-confirmation-probe.e2e.ts' : inputs.scenario === 'confirmation-verify'
      ? 'specs/windows-confirmation-verify.e2e.ts' : 'specs/windows-pdf.e2e.ts')],
  maxInstances: 1,
  capabilities,
  services: [['@wdio/tauri-service', service]],
  framework: 'mocha',
  reporters: ['spec'],
  injectGlobals: false,
  bail: 1,
  specFileRetries: 0,
  connectionRetryCount: 0,
  connectionRetryTimeout: 120_000,
  waitforTimeout: 120_000,
  mochaOpts: { timeout: 600_000 },
  outputDir: join(inputs.outputDir, 'driver', inputs.phase),
};
