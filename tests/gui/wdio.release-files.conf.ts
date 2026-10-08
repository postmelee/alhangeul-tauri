import { join } from 'node:path';
import type { TauriCapabilities, TauriServiceOptions } from '@wdio/tauri-service';
import { createSharedWdioConfig, readGuiHarnessInputs } from './wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
const productionCheck = process.env.ALHANGEUL_GUI_PRODUCTION_CHECK === 'true';
const fontInteraction = !productionCheck && Boolean(process.env.RELEASE_CANDIDATE_PATH)
  && ['nsis', 'msi', 'appimage'].includes(process.env.CANDIDATE_KIND ?? '');
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
  specs: [
    join(import.meta.dirname, productionCheck
      ? 'specs/production-updater.e2e.ts' : 'specs/release-files.e2e.ts'),
    // New exact candidates also exercise font input/scrolling; no baseline comparison.
    ...(fontInteraction ? [join(import.meta.dirname, 'specs/local-font-performance.e2e.ts')] : []),
  ],
  services: [['@wdio/tauri-service', service]], capabilities,
  mochaOpts: { ui: 'bdd', timeout: 600000 },
};
