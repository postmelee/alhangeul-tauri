#!/usr/bin/env node

import { constants } from 'node:fs';
import { access, mkdir, stat, writeFile } from 'node:fs/promises';
import { posix, resolve as resolveHost } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveExecutable,
  spawnLoggedProcess,
  stopProcess,
} from '../support/process.mjs';

const usage = `Usage: node tests/gui/linux/probe.mjs
  --app <absolute-installed-binary> --output-dir <directory>
  [--port <1024-65535>] [--native-port <1024-65535>]`;

export async function runLinuxGuiProbe(options, services = {}) {
  const runtime = await inspectProbeEnvironment(options, services);
  const io = {
    mkdir: services.mkdir ?? mkdir,
    writeFile: services.writeFile ?? writeFile,
  };
  await io.mkdir(runtime.outputDir, { recursive: true });
  const process = (services.spawnDriver ?? spawnLoggedProcess)(
    runtime.driverPath,
    ['--port', String(runtime.port), '--native-port', String(runtime.nativePort)],
    { env: options.env ?? globalThis.process.env },
  );
  const request = services.request ?? webdriverRequest;
  let sessionId;
  let result;
  try {
    await waitForDriver(runtime.baseUrl, request, services.delay);
    const session = await request(runtime.baseUrl, 'POST', '/session', {
      capabilities: {
        alwaysMatch: {
          browserName: 'tauri',
          'tauri:options': { application: runtime.appPath },
        },
      },
    });
    sessionId = session?.sessionId;
    if (typeof sessionId !== 'string' || sessionId === '') {
      throw new Error('WebDriver session ID를 받지 못했습니다.');
    }
    const title = await request(runtime.baseUrl, 'GET', `/session/${sessionId}/title`);
    const rootTag = await request(
      runtime.baseUrl,
      'POST',
      `/session/${sessionId}/execute/sync`,
      { script: 'return document.documentElement.tagName', args: [] },
    );
    if (typeof title !== 'string' || rootTag !== 'HTML') {
      throw new Error('Alhangeul WebView title/root DOM probe가 올바르지 않습니다.');
    }
    result = probeSummary(runtime, { status: 'success', title, rootTag });
    return result;
  } catch (error) {
    result = probeSummary(runtime, { status: 'failure', error: error.message });
    throw error;
  } finally {
    if (sessionId) {
      await request(runtime.baseUrl, 'DELETE', `/session/${sessionId}`).catch(() => {});
    }
    await (services.stopDriver ?? stopProcess)(process.child);
    await writeProbeEvidence(runtime, process, result, io);
  }
}

export async function inspectProbeEnvironment(options = {}, services = {}) {
  const platform = services.platform ?? globalThis.process.platform;
  const env = options.env ?? globalThis.process.env;
  if (platform !== 'linux') throw new Error('Linux GUI probe는 Linux에서만 실행할 수 있습니다.');
  if (typeof env.DISPLAY !== 'string' || env.DISPLAY === '') {
    throw new Error('Linux GUI probe에 DISPLAY가 필요합니다. xvfb-run을 사용하세요.');
  }
  const appPath = resolveAbsolute(options.appPath, 'app path');
  const outputDir = resolveAbsolute(options.outputDir, 'output directory');
  await assertExecutable(appPath, services);
  const find = services.resolveExecutable ?? resolveExecutable;
  const pathOptions = {
    pathValue: env.PATH,
    accessFile: services.accessFile,
    pathDelimiter: posix.delimiter,
    joinPath: posix.join,
  };
  const driverPath = await find('tauri-driver', pathOptions);
  const nativeDriverPath = await find('WebKitWebDriver', pathOptions);
  const port = parsePort(options.port ?? 4444, 'WebDriver port');
  const nativePort = parsePort(options.nativePort ?? 4445, 'native WebDriver port');
  if (port === nativePort) throw new Error('WebDriver port와 native port는 달라야 합니다.');
  return Object.freeze({
    appPath,
    outputDir,
    driverPath,
    nativeDriverPath,
    port,
    nativePort,
    baseUrl: `http://127.0.0.1:${port}`,
  });
}

async function waitForDriver(baseUrl, request, delay = defaultDelay) {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await request(baseUrl, 'GET', '/status');
      return;
    } catch (error) {
      lastError = error;
      await delay(200);
    }
  }
  throw new Error(`tauri-driver가 준비되지 않았습니다: ${lastError?.message ?? 'timeout'}`);
}

async function webdriverRequest(baseUrl, method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`WebDriver 요청이 실패했습니다: ${method} ${path} HTTP ${response.status}`);
  if (method === 'DELETE' && response.status === 204) return null;
  const payload = await response.json();
  if (payload?.value?.error) throw new Error(`WebDriver 오류: ${payload.value.error}`);
  return payload?.value;
}

async function assertExecutable(path, services) {
  const statFile = services.statFile ?? stat;
  const accessFile = services.accessFile ?? access;
  const metadata = await statFile(path).catch(() => null);
  if (!metadata?.isFile()) throw new Error(`설치 app binary를 읽을 수 없습니다: ${path}`);
  await accessFile(path, constants.X_OK).catch(() => {
    throw new Error(`설치 app binary가 실행 가능하지 않습니다: ${path}`);
  });
}

async function writeProbeEvidence(runtime, process, result, io) {
  const summary = result ?? probeSummary(runtime, {
    status: 'failure',
    error: 'probe가 결과를 만들기 전에 종료되었습니다.',
  });
  await Promise.all([
    io.writeFile(posix.resolve(runtime.outputDir, 'tauri-driver.stdout.log'), process.stdout.value(), 'utf8'),
    io.writeFile(posix.resolve(runtime.outputDir, 'tauri-driver.stderr.log'), process.stderr.value(), 'utf8'),
    io.writeFile(
      posix.resolve(runtime.outputDir, 'probe-summary.json'),
      `${JSON.stringify(summary, null, 2)}\n`,
      'utf8',
    ),
  ]);
}

function probeSummary(runtime, value) {
  return Object.freeze({
    schemaVersion: 1,
    status: value.status,
    appPath: runtime.appPath,
    driverPath: runtime.driverPath,
    nativeDriverPath: runtime.nativeDriverPath,
    port: runtime.port,
    nativePort: runtime.nativePort,
    ...(value.title === undefined ? {} : { title: value.title }),
    ...(value.rootTag === undefined ? {} : { rootTag: value.rootTag }),
    ...(value.error === undefined ? {} : { error: value.error }),
  });
}

function resolveAbsolute(value, name) {
  if (typeof value !== 'string' || !posix.isAbsolute(value)) throw new Error(`${name}는 절대 경로여야 합니다.`);
  return posix.resolve(value);
}

function parsePort(value, name) {
  const source = typeof value === 'number' ? String(value) : value;
  if (!/^[0-9]+$/.test(source ?? '')) throw new Error(`${name}가 올바르지 않습니다.`);
  const parsed = Number(source);
  if (!Number.isSafeInteger(parsed) || parsed < 1024 || parsed > 65535) {
    throw new Error(`${name}는 1024~65535 범위여야 합니다.`);
  }
  return parsed;
}

function defaultDelay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function parseArguments(args) {
  const options = {};
  const names = new Map([
    ['--app', 'appPath'],
    ['--output-dir', 'outputDir'],
    ['--port', 'port'],
    ['--native-port', 'nativePort'],
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') return { help: true };
    const name = names.get(arg);
    const value = args[index + 1];
    if (!name || !value) throw new Error(`지원하지 않거나 값이 없는 인자입니다: ${arg}\n${usage}`);
    options[name] = value;
    index += 1;
  }
  return options;
}

const isMain = process.argv[1] && resolveHost(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log(usage);
    else {
      const result = await runLinuxGuiProbe(options);
      console.log(`Linux GUI probe passed: ${result.title} (${result.rootTag})`);
    }
  } catch (error) {
    console.error(`Linux GUI probe failed: ${error.message}`);
    process.exitCode = 1;
  }
}
