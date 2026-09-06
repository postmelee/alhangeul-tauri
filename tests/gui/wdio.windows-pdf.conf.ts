import { isAbsolute, join } from 'node:path';
import type { TauriCapabilities, TauriServiceOptions } from '@wdio/tauri-service';

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
  if (scenario !== 'pdf' && scenario !== 'open-only') throw new Error('Invalid PDF_SCENARIO');
  if (scenario === 'open-only' && phase !== 'fresh') throw new Error('Open probe requires fresh phase');
  return {
    phase, buildRef, scenario,
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
  specs: [join(import.meta.dirname, 'specs/windows-pdf.e2e.ts')],
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
