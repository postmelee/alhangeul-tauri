import { join } from 'node:path';
import type { TauriServiceOptions } from '@wdio/tauri-service';
import { productionCapabilities } from './production-upgrade/session.ts';
import { readUpgradeInputs } from './production-upgrade/inputs.ts';

const inputs = readUpgradeInputs();
const service: TauriServiceOptions = {
  appBinaryPath: inputs.appPath, tauriDriverPath: inputs.driverPath,
  driverProvider: 'external', autoInstallTauriDriver: false,
  autoDownloadEdgeDriver: process.platform === 'win32',
  captureBackendLogs: true, captureFrontendLogs: true, logDir: join(inputs.output, 'driver'),
};
const capabilities = productionCapabilities(inputs);
export const config: WebdriverIO.Config = {
  runner: 'local', specs: [join(import.meta.dirname, 'specs/production-upgrade.e2e.ts')],
  maxInstances: 1, capabilities, services: [['@wdio/tauri-service', service]],
  logLevel: 'info', bail: 1, waitforTimeout: 120000, connectionRetryTimeout: 300000,
  connectionRetryCount: 0, specFileRetries: 0, injectGlobals: false,
  framework: 'mocha', reporters: ['spec'], outputDir: inputs.output,
  mochaOpts: { ui: 'bdd', timeout: 1200000 },
};
