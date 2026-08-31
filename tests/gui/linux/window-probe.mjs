#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectProbeEnvironment } from './probe.mjs';
import {
  click, command, delay, launch, snapshot, stopGroup, waitFor,
  webdriverClient, windows, writeJson,
} from './window-probe-support.mjs';

export function readInputs(env = process.env, platform = process.platform) {
  if (platform !== 'linux' || env.GITHUB_ACTIONS !== 'true') {
    throw new Error('Linux Actions runner 전용 진단입니다.');
  }
  const modes = ['webdriver-ui', 'normal-ui', 'webdriver-invoke'];
  if (!modes.includes(env.ALHANGEUL_PROBE_MODE)) throw new Error('Invalid probe mode');
  for (const key of ['ALHANGEUL_PROBE_APP', 'ALHANGEUL_PROBE_OUTPUT', 'ALHANGEUL_PROBE_COORDINATES']) {
    if (!env[key] || !isAbsolute(env[key])) throw new Error(`${key}: absolute path required`);
  }
  return { mode: env.ALHANGEUL_PROBE_MODE, app: env.ALHANGEUL_PROBE_APP,
    output: env.ALHANGEUL_PROBE_OUTPUT, coordinates: env.ALHANGEUL_PROBE_COORDINATES };
}

export async function runProbe(inputs) {
  const runtime = await inspectProbeEnvironment({ appPath: inputs.app, outputDir: inputs.output });
  await mkdir(inputs.output, { recursive: true });
  const evidence = { mode: inputs.mode, status: 'incomplete', requests: [], timeline: [] };
  const env = { ...process.env };
  // Normal mode must never inherit the automation switch from the caller.
  delete env.TAURI_WEBVIEW_AUTOMATION;
  const automated = inputs.mode !== 'normal-ui';
  const managed = launch(automated ? runtime.driverPath : inputs.app,
    automated ? ['--port', '4444', '--native-port', '4445'] : [], env);
  const request = webdriverClient(evidence.requests);
  let session;
  try {
    if (automated) session = await startSession(request, inputs.app);
    const initial = await waitFor(async () => {
      const list = await windows();
      return list.length === 1 && list[0];
    }, 'one native application window');
    await command('xdotool', ['windowsize', initial.id, '1100', '700',
      'windowmove', initial.id, '20', '40']);
    await delay(3000);
    const points = inputs.mode === 'webdriver-ui'
      ? await recordMenuCoordinates({ inputs, request, session, initial, evidence, managed })
      : JSON.parse(await readFile(inputs.coordinates, 'utf8'));
    evidence.timeline.push(await snapshot(inputs.output, 'before', managed));
    if (inputs.mode === 'webdriver-invoke') await dispatchNative(request, session);
    else await openNewWindow(initial.id, points, inputs.output, managed);
    await observe({ inputs, evidence, managed, initial, points, request, session });
    evidence.status = 'observed';
  } catch (error) {
    evidence.status = 'diagnostic-error';
    evidence.error = error.message;
  } finally {
    try { evidence.final = await snapshot(inputs.output, 'final', managed); }
    catch (error) { evidence.captureError = error.message; }
    if (session) await request('DELETE', `/session/${session}`).catch(() => {});
    await stopGroup(managed);
    await Promise.all([
      writeJson(join(inputs.output, 'summary.json'), evidence),
      writeFile(join(inputs.output, 'launcher.stdout.log'), managed.stdout.value()),
      writeFile(join(inputs.output, 'launcher.stderr.log'), managed.stderr.value()),
    ]);
  }
  return evidence;
}

async function startSession(request, app) {
  await waitFor(() => request('GET', '/status').catch(() => false), 'tauri-driver status');
  const result = await request('POST', '/session', {
    capabilities: { alwaysMatch: { browserName: 'tauri', 'tauri:options': { application: app } } },
  });
  if (typeof result?.sessionId !== 'string') throw new Error('No WebDriver session ID');
  const session = result.sessionId;
  await waitFor(() => request('POST', `/session/${session}/execute/sync`, {
    script: 'return document.readyState === "complete" && typeof window.__TAURI_INTERNALS__?.invoke === "function"',
    args: [],
  }), 'native bridge');
  return session;
}

async function recordMenuCoordinates({ inputs, request, session, initial, evidence, managed }) {
  const point = (selector) => request('POST', `/session/${session}/execute/sync`, {
    script: `const r = document.querySelector(arguments[0]).getBoundingClientRect();
      if (!r.width || !r.height) throw new Error('Menu is not visible');
      return {x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2)};`,
    args: [selector],
  });
  const file = await point('[data-menu="file"] > .menu-title');
  await click(initial.id, file);
  const newWindow = await point('[data-cmd="file:new-window"]');
  await snapshot(inputs.output, 'menu-coordinate-source', managed);
  await command('xdotool', ['key', '--clearmodifiers', 'Escape']);
  const points = { file, newWindow };
  evidence.menuCoordinates = points;
  await writeJson(inputs.coordinates, points);
  return points;
}

async function openNewWindow(id, points, output, managed) {
  await click(id, points.file);
  await snapshot(output, 'menu-before-new-window', managed);
  await click(id, points.newWindow);
}

async function dispatchNative(request, session) {
  await request('POST', `/session/${session}/execute/sync`, {
    script: `window.__windowProbeResult = null;
      setTimeout(() => window.__TAURI_INTERNALS__.invoke('create_editor_window').then(
        label => window.__windowProbeResult = {label},
        error => window.__windowProbeResult = {error: String(error)}), 100);
      return {dispatched: true};`,
    args: [],
  });
}

async function observe({ inputs, evidence, managed, initial, points, request, session }) {
  for (const index of [1, 2, 3]) {
    await delay(2000);
    evidence.timeline.push(await snapshot(inputs.output, `after-${index}`, managed));
  }
  if (session) {
    try {
      evidence.webdriverHandles = await request('GET', `/session/${session}/window/handles`);
      evidence.webdriverDom = await request('POST', `/session/${session}/execute/sync`, {
        script: 'return {title: document.title, readyState: document.readyState, nativeResult: window.__windowProbeResult ?? null}',
        args: [],
      });
    } catch (error) { evidence.webdriverError = error.message; }
  }
  // An OS-driven third window tests whether the second page remains functional,
  // independently of a deleted WebDriver session. No document/update commands run.
  const second = (await windows()).find((item) => item.id !== initial.id);
  if (second) {
    await click(second.id, points.file);
    evidence.secondWindowMenu = await snapshot(inputs.output, 'second-window-menu', managed);
    await click(second.id, points.newWindow);
    await delay(3000);
    evidence.thirdWindow = await snapshot(inputs.output, 'third-window', managed);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runProbe(readInputs());
    console.log(JSON.stringify({ mode: result.mode, status: result.status,
      windows: result.final?.windows.length, webdriverError: result.webdriverError, error: result.error }));
    if (result.status !== 'observed' || result.captureError) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
