import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { once } from 'node:events';

const DEFAULT_LOG_LIMIT = 1024 * 1024;

export async function resolveExecutable(command, options = {}) {
  if (!/^[A-Za-z0-9_.-]+$/.test(command)) throw new Error(`실행 파일 이름이 올바르지 않습니다: ${command}`);
  const pathValue = options.pathValue ?? process.env.PATH ?? '';
  const accessFile = options.accessFile ?? access;
  for (const directory of pathValue.split(delimiter).filter(Boolean)) {
    const candidate = join(directory, command);
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
  const timeout = new Promise((resolve) => setTimeout(() => resolve(false), graceMs));
  if (await Promise.race([exited, timeout])) return;
  child.kill('SIGKILL');
  await once(child, 'exit').catch(() => {});
}

export function createBoundedCollector(limit = DEFAULT_LOG_LIMIT) {
  let text = '';
  let truncated = false;
  return Object.freeze({
    append(chunk) {
      if (truncated) return;
      const remaining = limit - Buffer.byteLength(text);
      if (remaining <= 0) {
        truncated = true;
        return;
      }
      const source = Buffer.from(chunk);
      text += source.subarray(0, remaining).toString('utf8');
      if (source.length > remaining) truncated = true;
    },
    value() {
      return truncated ? `${text}\n[log truncated]\n` : text;
    },
  });
}
