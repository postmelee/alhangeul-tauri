import { isAbsolute, join } from 'node:path';

const DEFAULT_TIMEOUT_MS = 120_000;
const SCENARIO_TIMEOUT_MULTIPLIER = 5;
const MAX_SCENARIO_TIMEOUT_MS = 900_000;

export interface GuiHarnessInputs {
  appPath: string;
  buildRef: string;
  nativeRunId: string;
  driverPath: string;
  fixtureRoot: string;
  outputDir: string;
  timeoutMs: number;
  appVersion: string;
  driverVersion: string;
}

export function readGuiHarnessInputs(
  env: NodeJS.ProcessEnv = process.env,
): GuiHarnessInputs {
  return {
    appPath: absoluteEnv(env, 'ALHANGEUL_GUI_APP_PATH'),
    buildRef: shaEnv(env, 'ALHANGEUL_GUI_BUILD_REF'),
    nativeRunId: runIdEnv(env, 'ALHANGEUL_GUI_NATIVE_RUN_ID'),
    driverPath: absoluteEnv(env, 'ALHANGEUL_GUI_DRIVER_PATH'),
    fixtureRoot: absoluteEnv(env, 'ALHANGEUL_GUI_FIXTURE_ROOT'),
    outputDir: absoluteEnv(env, 'ALHANGEUL_GUI_OUTPUT_DIR'),
    timeoutMs: timeoutEnv(env.ALHANGEUL_GUI_TIMEOUT_MS),
    appVersion: singleLineEnv(env, 'ALHANGEUL_GUI_APP_VERSION'),
    driverVersion: singleLineEnv(env, 'ALHANGEUL_GUI_DRIVER_VERSION'),
  };
}

export function createSharedWdioConfig(
  inputs: GuiHarnessInputs,
): WebdriverIO.Config {
  return {
    runner: 'local',
    specs: [join(import.meta.dirname, 'specs', 'document-ux.e2e.ts')],
    exclude: [],
    maxInstances: 1,
    capabilities: [],
    logLevel: 'info',
    bail: 1,
    waitforTimeout: inputs.timeoutMs,
    connectionRetryTimeout: inputs.timeoutMs,
    connectionRetryCount: 0,
    specFileRetries: 0,
    framework: 'mocha',
    reporters: ['spec'],
    outputDir: inputs.outputDir,
    injectGlobals: false,
    before: async (_capabilities, _specs, browser) => {
      await pinSingleWebDriverWindow(browser);
    },
    mochaOpts: {
      ui: 'bdd',
      timeout: scenarioTimeoutMs(inputs.timeoutMs),
    },
  };
}

export function scenarioTimeoutMs(operationTimeoutMs: number): number {
  return Math.min(
    operationTimeoutMs * SCENARIO_TIMEOUT_MULTIPLIER,
    MAX_SCENARIO_TIMEOUT_MS,
  );
}

export async function pinSingleWebDriverWindow(
  browser: WebdriverIO.Browser,
): Promise<void> {
  const handles = await browser.getWindowHandles();
  if (handles.length !== 1) {
    throw new Error(`GUI acceptance 시작 시 WebDriver window가 1개여야 합니다: ${handles.length}개`);
  }
  await browser.switchToWindow(handles[0]);
}

function absoluteEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = singleLineEnv(env, name);
  if (!isAbsolute(value)) throw new Error(`${name}은 절대 경로여야 합니다`);
  return value;
}

function shaEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = singleLineEnv(env, name);
  if (!/^[0-9a-f]{40}$/.test(value)) {
    throw new Error(`${name}은 소문자 40자리 commit SHA여야 합니다`);
  }
  return value;
}

function runIdEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = singleLineEnv(env, name);
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error(`${name}은 양의 정수 run ID여야 합니다`);
  }
  return value;
}

function singleLineEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim() ?? '';
  if (!value || /[\r\n\0]/.test(value)) {
    throw new Error(`${name}은 비어 있지 않은 단일행 값이어야 합니다`);
  }
  return value;
}

function timeoutEnv(value: string | undefined): number {
  if (value === undefined || value === '') return DEFAULT_TIMEOUT_MS;
  if (!/^[0-9]+$/.test(value)) throw new Error('ALHANGEUL_GUI_TIMEOUT_MS가 유효하지 않습니다');
  const timeout = Number(value);
  if (!Number.isSafeInteger(timeout) || timeout < 5_000 || timeout > 300_000) {
    throw new Error('ALHANGEUL_GUI_TIMEOUT_MS는 5000~300000 범위여야 합니다');
  }
  return timeout;
}
