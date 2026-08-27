import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { DocumentFixture } from './document-fixture.ts';
import {
  createScenarioEvidence,
  describeEvidenceFile,
  writeScenarioEvidence,
  type EvidenceFile,
} from './evidence.ts';
import type { GuiHarnessInputs } from '../wdio.shared.conf.ts';

export interface ScenarioRunOptions {
  inputs: GuiHarnessInputs;
  scenario: string;
  fixtures: readonly DocumentFixture[];
  screenshotName: string;
  captureScreenshot(path: string): Promise<unknown>;
}

export async function runScenarioWithEvidence(
  options: ScenarioRunOptions,
  action: () => Promise<EvidenceFile[] | void>,
): Promise<void> {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(options.scenario)) {
    throw new Error('scenario 이름이 유효하지 않습니다');
  }
  if (!/^[a-z0-9][a-z0-9.-]{0,63}\.png$/.test(options.screenshotName)) {
    throw new Error('scenario screenshot 이름이 유효하지 않습니다');
  }
  const startedAt = new Date();
  let error: unknown;
  let files: EvidenceFile[] = [];
  try {
    files = await action() ?? [];
  } catch (caught) {
    error = caught;
  }

  const scenarioDir = join(options.inputs.outputDir, 'scenarios', options.scenario);
  const screenshot = join(scenarioDir, options.screenshotName);
  await mkdir(scenarioDir, { recursive: true });
  try {
    await options.captureScreenshot(screenshot);
    files.push(await describeEvidenceFile(options.inputs.outputDir, screenshot, 'screenshot'));
  } catch (caught) {
    error ??= caught;
  }
  try {
    await writeScenarioEvidence(options.inputs.outputDir, createScenarioEvidence({
      inputs: options.inputs,
      scenario: options.scenario,
      status: error === undefined ? 'success' : 'failure',
      startedAt,
      completedAt: new Date(),
      fixtures: options.fixtures,
      files,
      ...(error === undefined ? {} : { error }),
    }));
  } catch (caught) {
    error ??= caught;
  }
  if (error !== undefined) throw error;
}
