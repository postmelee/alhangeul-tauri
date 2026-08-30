import { isAbsolute, join } from 'node:path';
import type { TauriCapabilities, TauriServiceOptions } from '@wdio/tauri-service';

const MODES = new Set(['preflight', 'apply', 'verify', 'manual']);

export interface UpdaterHarnessInputs {
  appPath: string;
  driverPath: string;
  outputDir: string;
  mode: 'preflight' | 'apply' | 'verify' | 'manual';
  expectedTarget: string;
  expectedKind: 'msi' | 'nsis' | 'appimage';
  expectedCurrentVersion: string;
  expectedAvailableVersion: string;
  candidateSha: string;
  d1RunId: string;
}

export function readUpdaterHarnessInputs(
  env: NodeJS.ProcessEnv = process.env,
): UpdaterHarnessInputs {
  const mode = singleLine(env, 'ALHANGEUL_UPDATER_MODE');
  if (!MODES.has(mode)) throw new Error('ALHANGEUL_UPDATER_MODE이 올바르지 않습니다');
  const expectedKind = singleLine(env, 'ALHANGEUL_UPDATER_EXPECTED_KIND');
  if (!['msi', 'nsis', 'appimage'].includes(expectedKind)) {
    throw new Error('ALHANGEUL_UPDATER_EXPECTED_KIND가 올바르지 않습니다');
  }
  const candidateSha = singleLine(env, 'ALHANGEUL_UPDATER_CANDIDATE_SHA');
  if (!/^[0-9a-f]{40}$/.test(candidateSha)) {
    throw new Error('ALHANGEUL_UPDATER_CANDIDATE_SHA가 올바르지 않습니다');
  }
  const d1RunId = singleLine(env, 'ALHANGEUL_UPDATER_D1_RUN_ID');
  if (!/^[1-9][0-9]*$/.test(d1RunId)) {
    throw new Error('ALHANGEUL_UPDATER_D1_RUN_ID가 올바르지 않습니다');
  }
  return {
    appPath: absolute(env, 'ALHANGEUL_UPDATER_APP_PATH'),
    driverPath: absolute(env, 'ALHANGEUL_UPDATER_DRIVER_PATH'),
    outputDir: absolute(env, 'ALHANGEUL_UPDATER_OUTPUT_DIR'),
    mode: mode as UpdaterHarnessInputs['mode'],
    expectedTarget: singleLine(env, 'ALHANGEUL_UPDATER_EXPECTED_TARGET'),
    expectedKind: expectedKind as UpdaterHarnessInputs['expectedKind'],
    expectedCurrentVersion: version(env, 'ALHANGEUL_UPDATER_CURRENT_VERSION'),
    expectedAvailableVersion: version(env, 'ALHANGEUL_UPDATER_AVAILABLE_VERSION'),
    candidateSha,
    d1RunId,
  };
}

export function createUpdaterWdioConfig(
  env: NodeJS.ProcessEnv = process.env,
): WebdriverIO.Config {
  const inputs = readUpdaterHarnessInputs(env);
  const serviceOptions: TauriServiceOptions = {
    appBinaryPath: inputs.appPath,
    tauriDriverPath: inputs.driverPath,
    driverProvider: 'external',
    autoInstallTauriDriver: false,
    autoDownloadEdgeDriver: true,
    captureBackendLogs: true,
    captureFrontendLogs: true,
    logDir: join(inputs.outputDir, 'driver'),
  };
  const capabilities: TauriCapabilities[] = [{
    browserName: 'tauri',
    strictFileInteractability: false,
    'tauri:options': { application: inputs.appPath },
  }];
  return {
    runner: 'local',
    specs: [join(import.meta.dirname, 'specs', 'updater-native.e2e.ts')],
    maxInstances: 1,
    capabilities,
    logLevel: 'info',
    bail: 1,
    waitforTimeout: 120_000,
    connectionRetryTimeout: 300_000,
    connectionRetryCount: 0,
    specFileRetries: 0,
    framework: 'mocha',
    reporters: ['spec'],
    outputDir: inputs.outputDir,
    injectGlobals: false,
    services: [['@wdio/tauri-service', serviceOptions]],
    mochaOpts: { ui: 'bdd', timeout: 900_000 },
  };
}

export const config = createUpdaterWdioConfig();

function absolute(env: NodeJS.ProcessEnv, name: string): string {
  const value = singleLine(env, name);
  if (!isAbsolute(value)) throw new Error(`${name}은 절대 경로여야 합니다`);
  return value;
}

function version(env: NodeJS.ProcessEnv, name: string): string {
  const value = singleLine(env, name);
  if (!/^\d+\.\d+\.\d+$/.test(value)) throw new Error(`${name}이 올바르지 않습니다`);
  return value;
}

function singleLine(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim() ?? '';
  if (!value || /[\r\n\0]/.test(value)) throw new Error(`${name}은 단일행 값이어야 합니다`);
  return value;
}
