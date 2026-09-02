import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import * as hostPath from 'node:path';
import { once } from 'node:events';

const DEFAULT_LOG_LIMIT = 1024 * 1024;

export async function resolveExecutable(command, options = {}) {
  if (!/^[A-Za-z0-9_.-]+$/.test(command)) throw new Error(`실행 파일 이름이 올바르지 않습니다: ${command}`);
  const pathValue = options.pathValue ?? process.env.PATH ?? '';
  const accessFile = options.accessFile ?? access;
  const pathApi = options.pathApi ?? hostPath;
  if (typeof pathApi.delimiter !== 'string' || typeof pathApi.join !== 'function') {
    throw new Error('실행 파일 탐색 path API가 올바르지 않습니다.');
  }
  for (const directory of pathValue.split(pathApi.delimiter).filter(Boolean)) {
    const candidate = pathApi.join(directory, command);
    try {
      await accessFile(candidate, constants.X_OK);
      return candidate;
    } catch {
      // 다음 PATH 항목을 검사한다.
    }
  }
  throw new Error(`PATH에서 실행 파일을 찾을 수 없습니다: ${command}`);
}

export function spawnLoggedProcess(command, args, options = {}) {
  const child = (options.spawnProcess ?? spawn)(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = createBoundedCollector(options.logLimit);
  const stderr = createBoundedCollector(options.logLimit);
  child.stdout?.on('data', stdout.append);
  child.stderr?.on('data', stderr.append);
  return { child, stdout, stderr };
}

export async function stopProcess(child, options = {}) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  const graceMs = options.graceMs ?? 2000;
  const exited = once(child, 'exit').then(() => true);
  const exitedDuringGrace = await waitForExit(exited, graceMs);
  if (exitedDuringGrace) return;
  child.kill('SIGKILL');
  if (!await waitForExit(exited, graceMs)) {
    throw new Error('process가 SIGKILL 뒤에도 종료되지 않았습니다.');
  }
}

async function waitForExit(exited, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(false), timeoutMs);
  });
  const result = await Promise.race([exited, timeout]);
  if (timeoutId !== undefined) clearTimeout(timeoutId);
  return result;
}

export function createBoundedCollector(limit = DEFAULT_LOG_LIMIT) {
  const chunks = [];
  let byteLength = 0;
  let truncated = false;
  return Object.freeze({
    append(chunk) {
      if (truncated) return;
      const remaining = limit - byteLength;
      if (remaining <= 0) {
        truncated = true;
        return;
      }
      const source = Buffer.from(chunk);
      const accepted = source.subarray(0, remaining);
      chunks.push(accepted);
      byteLength += accepted.length;
      if (source.length > remaining) truncated = true;
    },
    value() {
      const buffer = Buffer.concat(chunks, byteLength);
      const text = buffer.subarray(0, completeUtf8Length(buffer)).toString('utf8');
      return truncated ? `${text}\n[log truncated]\n` : text;
    },
  });
}

function completeUtf8Length(buffer) {
  if (buffer.length === 0) return 0;
  let start = buffer.length - 1;
  while (start >= 0 && (buffer[start] & 0xc0) === 0x80) start -= 1;
  if (start < 0) return 0;
  const lead = buffer[start];
  const expected = lead < 0x80 ? 1
    : (lead & 0xe0) === 0xc0 ? 2
      : (lead & 0xf0) === 0xe0 ? 3
        : (lead & 0xf8) === 0xf0 ? 4 : 1;
  return buffer.length - start < expected ? start : buffer.length;
}
