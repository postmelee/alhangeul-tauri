import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { browser, expect } from '@wdio/globals';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

interface Snapshot {
  status: string;
  trigger: string | null;
  operationId: number | null;
  currentVersion: string | null;
  availableVersion: string | null;
  blocker: string | null;
  failure: unknown;
}

const endpoint = 'https://postmelee.github.io/alhangeul-tauri/updater/stable.json';
const manifestHash = 'e3c27ee429063ae12d0f12e7188f5ee2a3e498104963900889501228caba88d1';
const inputs = readGuiHarnessInputs();

describe('공개 v0.1.0 production updater', () => {
  it('운영 endpoint의 동일 버전을 업데이트 없음으로 판정한다', async () => {
    await mkdir(inputs.outputDir, { recursive: true });
    const evidence: Record<string, unknown> = {
      productSha: inputs.buildRef, producerRun: inputs.nativeRunId,
      packageKind: process.env.CANDIDATE_KIND, endpoint,
      startedAt: new Date().toISOString(), updateApplied: false,
    };
    try {
      const config = JSON.parse(await readFile(join(inputs.fixtureRoot,
        'apps/desktop/src-tauri/tauri.updater.conf.json'), 'utf8'));
      expect(config.plugins.updater.endpoints).toEqual([endpoint]);
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(120_000) });
      evidence.httpStatus = response.status;
      expect(response.status).toBe(200);
      const bytes = Buffer.from(await response.arrayBuffer());
      evidence.manifestSha256 = createHash('sha256').update(bytes).digest('hex');
      await writeFile(join(inputs.outputDir, 'production-manifest.json'), bytes);
      expect(evidence.manifestSha256).toBe(manifestHash);
      expect(JSON.parse(bytes.toString()).version).toBe(inputs.appVersion);
      await browser.waitUntil(async () => browser.execute(() => {
        const bridge = (window as unknown as {
          __TAURI_INTERNALS__?: { invoke?: unknown };
        }).__TAURI_INTERNALS__;
        return document.readyState === 'complete' && typeof bridge?.invoke === 'function';
      }), { timeout: 120_000, interval: 250 });
      await browser.waitUntil(async () => (await invoke('updater_get_state')).status !== 'checking',
        { timeout: 150_000, interval: 250 });
      evidence.beforeCheck = await invoke('updater_get_state');
      await browser.setTimeout({ script: 180_000 });
      const result = await invoke('updater_check');
      evidence.checkResult = result;
      expect(result.status).toBe('idle');
      expect(result.trigger).toBe('manual');
      expect(result.operationId).not.toBeNull();
      expect(result.currentVersion).toBe(inputs.appVersion);
      expect(result.availableVersion).toBeNull();
      expect(result.blocker).toBeNull();
      expect(result.failure).toBeNull();
      await browser.saveScreenshot(join(inputs.outputDir, 'production-updater.png'));
      evidence.status = 'passed';
    } catch (error) {
      evidence.status = 'failed';
      evidence.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      evidence.finishedAt = new Date().toISOString();
      await writeFile(join(inputs.outputDir, 'production-updater.json'),
        `${JSON.stringify(evidence, null, 2)}\n`);
    }
  });
});

async function invoke(command: 'updater_get_state' | 'updater_check'): Promise<Snapshot> {
  return browser.execute(async (name) => {
    const bridge = (window as unknown as {
      __TAURI_INTERNALS__: { invoke<T>(command: string): Promise<T> };
    }).__TAURI_INTERNALS__;
    return bridge.invoke<Snapshot>(name);
  }, command);
}
