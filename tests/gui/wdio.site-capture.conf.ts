import { join } from 'node:path';
import type { TauriCapabilities, TauriServiceOptions } from '@wdio/tauri-service';
import { createSharedWdioConfig, readGuiHarnessInputs } from './wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
const service: TauriServiceOptions = {
  appBinaryPath: inputs.appPath, tauriDriverPath: inputs.driverPath,
  driverProvider: 'external', autoInstallTauriDriver: false,
  autoDownloadEdgeDriver: process.platform === 'win32',
  captureBackendLogs: true, captureFrontendLogs: true,
  logDir: join(inputs.outputDir, 'driver'),
};
const capabilities: TauriCapabilities[] = [{
  browserName: 'tauri', 'tauri:options': { application: inputs.appPath },
}];
export const config: WebdriverIO.Config = {
  ...createSharedWdioConfig(inputs),
  specs: [join(import.meta.dirname, 'specs/site-capture.e2e.ts')],
  services: [['@wdio/tauri-service', service]], capabilities,
  mochaOpts: { ui: 'bdd', timeout: 600000 },
};
