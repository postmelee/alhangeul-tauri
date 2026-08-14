import { join } from 'node:path';
import type { TauriCapabilities, TauriServiceOptions } from '@wdio/tauri-service';
import {
  createSharedWdioConfig,
  readGuiHarnessInputs,
} from './wdio.shared.conf.ts';

export function createLinuxWdioConfig(
  env: NodeJS.ProcessEnv = process.env,
): WebdriverIO.Config {
  const inputs = readGuiHarnessInputs(env);
  const display = optionalDisplay(env.DISPLAY);
  const shared = createSharedWdioConfig(inputs);

  const serviceOptions: TauriServiceOptions = {
    appBinaryPath: inputs.appPath,
    tauriDriverPath: inputs.driverPath,
    driverProvider: 'external',
    autoInstallTauriDriver: false,
    captureBackendLogs: false,
    captureFrontendLogs: false,
    logDir: join(inputs.outputDir, 'driver'),
    ...(display === null ? {} : { env: { DISPLAY: display } }),
  };
  const capabilities: TauriCapabilities[] = [{
    browserName: 'tauri',
    'tauri:options': { application: inputs.appPath },
  }];

  return {
    ...shared,
    specs: [
      ...(shared.specs ?? []),
      join(import.meta.dirname, 'specs', 'linux-native.e2e.ts'),
    ],
    autoXvfb: true,
    xvfbAutoInstall: false,
    xvfbMaxRetries: 1,
    services: [['@wdio/tauri-service', serviceOptions]],
    capabilities,
  };
}

export const config = createLinuxWdioConfig();

function optionalDisplay(value: string | undefined): string | null {
  if (value === undefined || value.trim() === '') return null;
  const display = value.trim();
  if (/[\r\n\0]/.test(display)) throw new Error('DISPLAY는 단일행 값이어야 합니다');
  return display;
}
