import type { GuiHarnessInputs } from '../wdio.shared.conf.ts';

export interface WindowsProbeOptions {
  browser: WebdriverIO.Browser;
  inputs: GuiHarnessInputs;
  env?: NodeJS.ProcessEnv;
  services?: Record<string, unknown>;
}

export interface WindowsProbeResult {
  title: string;
  rootTag: string;
  target: Record<string, unknown>;
  targetWindows: Array<Record<string, unknown>>;
  status: Record<string, unknown>;
  inspect: Record<string, unknown>;
  screenshot: Record<string, unknown>;
}

export function runWindowsGuiProbe(
  options: WindowsProbeOptions,
): Promise<WindowsProbeResult>;
