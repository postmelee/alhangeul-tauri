import { join } from 'node:path';
import type { TauriCapabilities, TauriServiceOptions } from '@wdio/tauri-service';
import {
  createSharedWdioConfig,
  readGuiHarnessInputs,
} from './wdio.shared.conf.ts';

export function createWindowsWdioConfig(
  env: NodeJS.ProcessEnv = process.env,
): WebdriverIO.Config {
  const inputs = readGuiHarnessInputs(env);
  const shared = createSharedWdioConfig(inputs);
  const webviewDataDir = join(inputs.outputDir, 'webview2-user-data');
  const serviceOptions: TauriServiceOptions = {
    appBinaryPath: inputs.appPath,
    tauriDriverPath: inputs.driverPath,
    driverProvider: 'external',
    autoInstallTauriDriver: false,
    autoDownloadEdgeDriver: true,
    captureBackendLogs: false,
    captureFrontendLogs: false,
    logDir: join(inputs.outputDir, 'driver'),
  };
  const capabilities: TauriCapabilities[] = [{
    browserName: 'tauri',
    strictFileInteractability: false,
    'tauri:options': {
      application: inputs.appPath,
      webviewOptions: { userDataFolder: webviewDataDir },
    } as TauriCapabilities['tauri:options'],
  }];

  return {
    ...shared,
    specs: [
      ...(shared.specs ?? []),
      join(import.meta.dirname, 'windows', 'probe.e2e.ts'),
      join(import.meta.dirname, 'specs', 'windows-native.e2e.ts'),
    ],
    services: [['@wdio/tauri-service', serviceOptions]],
    capabilities,
  };
}

export const config = createWindowsWdioConfig();
