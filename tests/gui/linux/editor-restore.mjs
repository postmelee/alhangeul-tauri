import { mkdir, writeFile } from 'node:fs/promises';
import { posix } from 'node:path';
import { describeEvidenceFile } from '../support/evidence.ts';
import { analyzeEditorFrame, compareEditorFrames } from './editor-pixels.mjs';
import { createEditorWindowReader, createScreenshotReader } from './native-ui/editor-frame.mjs';

export const EDITOR_CHECKPOINTS = Object.freeze([
  'before-print', 'after-print-to-file', 'after-cancel', 'after-cups-pdf',
]);

export function createEditorRestoreProbe(options, services = {}) {
  const timeoutMs = options.timeoutMs ?? 15000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 500 || timeoutMs > 30000) {
    throw new Error('editor restore timeout은 500~30000ms여야 합니다');
  }
  const pathApi = services.pathApi ?? posix;
  if (!pathApi.isAbsolute(options.outputDir)) throw new Error('editor evidence outputDir는 절대 경로여야 합니다');
  const directory = pathApi.join(options.outputDir, 'scenarios', 'linux-system-print', 'editor');
  const summaryPath = pathApi.join(directory, 'restore.json');
  const state = { schemaVersion: 1, pid: options.pid, checkpoints: [] };
  const dependencies = {
    readWindow: services.readWindow ?? createEditorWindowReader(options),
    readScreenshot: services.readScreenshot ?? createScreenshotReader(options),
    captureScreenshot: options.captureScreenshot,
    now: services.now ?? Date.now,
    delay: services.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
    describeFile: services.describeFile ?? ((path) => describeEvidenceFile(options.outputDir, path, 'screenshot')),
    record: async () => writeFile(summaryPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 }),
  };
  let baseline;
  return {
    async check(label) {
      if (label !== EDITOR_CHECKPOINTS[state.checkpoints.length]) throw new Error('editor checkpoint 순서가 유효하지 않습니다');
      await mkdir(directory, { recursive: true });
      const checkpoint = { label, startedAt: new Date().toISOString(), status: 'running', samples: [] };
      state.checkpoints.push(checkpoint);
      const result = await observeBody({
        baseline, checkpoint, directory, pathApi, timeoutMs,
      }, dependencies);
      baseline ??= result;
    },
    async describeFiles() {
      const frames = state.checkpoints.flatMap((checkpoint) => checkpoint.samples.map((sample) => sample.file));
      return [await describeEvidenceFile(options.outputDir, summaryPath, 'log'), ...frames.filter(Boolean)];
    },
  };
}

async function observeBody(options, services) {
  const deadline = services.now() + options.timeoutMs;
  let previous;
  let lastError = '본문이 준비되지 않았습니다';
  try {
    while (true) {
      const observation = await observeFrame(options, services);
      const { frame, window } = observation;
      const stable = previous && sameWindow(window, previous.window)
        && compareEditorFrames(frame, previous.frame).matches;
      if (observation.matches && stable) {
        options.checkpoint.status = 'success';
        return { frame, window };
      }
      lastError = observation.reason || '본문의 연속 두 frame이 안정되지 않았습니다';
      previous = observation.matches ? { frame, window } : undefined;
      if (services.now() >= deadline) throw new Error(`${options.checkpoint.label}: ${lastError}`);
      await services.record();
      await services.delay(500);
    }
  } catch (error) {
    options.checkpoint.status = 'failure';
    options.checkpoint.error = error.message;
    throw error;
  } finally {
    options.checkpoint.completedAt = new Date().toISOString();
    await services.record();
  }
}

async function observeFrame(options, services) {
  const { checkpoint, baseline } = options;
  const path = options.pathApi.join(options.directory, `${checkpoint.label}-${checkpoint.samples.length + 1}.png`);
  const sample = { capturedAt: new Date().toISOString() };
  checkpoint.samples.push(sample);
  // Keep the untouched root screenshot even when window/region validation fails.
  await services.captureScreenshot(path);
  sample.file = await services.describeFile(path);
  const window = await services.readWindow();
  sample.window = window;
  const frame = analyzeEditorFrame(await services.readScreenshot(path), window);
  const { mask: _mask, ...metrics } = frame;
  sample.metrics = metrics;
  const comparison = baseline ? compareEditorFrames(frame, baseline.frame) : { matches: true };
  const geometryMatches = !baseline || sameWindow(window, baseline.window);
  sample.matches = frame.hasBody && comparison.matches && geometryMatches;
  sample.inkAgreement = comparison.inkAgreement;
  sample.reason = !frame.hasBody ? 'editor 본문이 비어 있거나 불충분합니다'
    : !geometryMatches ? 'editor window geometry가 바뀌었습니다' : comparison.reason;
  return { frame, window, matches: sample.matches, reason: sample.reason };
}

function sameWindow(actual, expected) {
  return ['windowId', 'x', 'y', 'width', 'height'].every((key) => actual[key] === expected[key]);
}
