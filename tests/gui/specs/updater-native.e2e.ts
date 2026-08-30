import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { browser, expect } from '@wdio/globals';
import { readUpdaterHarnessInputs } from '../wdio.updater.conf.ts';

interface UpdaterSnapshot {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'restartRequired' | 'error';
  currentVersion: string | null;
  availableVersion: string | null;
  target: { target: string; artifactKind: 'msi' | 'nsis' | 'appimage' } | null;
  blocker: 'dirtyDocuments' | 'unsupportedInstall' | 'readOnlyAppImage' | null;
  failure: { code: string; message: string; retryable: boolean } | null;
}

const inputs = readUpdaterHarnessInputs();

describe(`Alhangeul updater native ${inputs.mode}`, () => {
  it('승인된 updater 상태 전이를 native backend에서 확인한다', async () => {
    await mkdir(inputs.outputDir, { recursive: true });
    const evidence: Record<string, unknown> = {
      schemaVersion: 1,
      mode: inputs.mode,
      packageKind: inputs.expectedKind,
      candidateSha: inputs.candidateSha,
      d1RunId: inputs.d1RunId,
      startedAt: new Date().toISOString(),
    };
    try {
      if (inputs.mode === 'preflight') await runPreflight(evidence);
      else if (inputs.mode === 'apply') await runApply(evidence);
      else if (inputs.mode === 'verify') await runVerify(evidence);
      else await runManualFallback(evidence);
      evidence.status = 'passed';
    } catch (error) {
      evidence.status = 'failed';
      evidence.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      evidence.finishedAt = new Date().toISOString();
      await writeFile(
        join(inputs.outputDir, `${inputs.mode}.json`),
        `${JSON.stringify(evidence, null, 2)}\n`,
        'utf8',
      );
    }
  });
});

async function runPreflight(evidence: Record<string, unknown>): Promise<void> {
  evidence.initial = await ensureAvailable();
  const duplicate = await duplicateCheck();
  evidence.duplicateCheck = duplicate;
  expect(duplicate.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(duplicate.filter((result) => result.reason?.includes('updaterBusy'))).toHaveLength(1);
  assertAvailable(await state());

  const dirtyBefore = await createDocument();
  try {
    await markDirty(dirtyBefore.docId);
    const blocked = await invoke<UpdaterSnapshot>('updater_apply');
    evidence.dirtyBeforeDownload = blocked;
    expect(blocked.status).toBe('available');
    expect(blocked.blocker).toBe('dirtyDocuments');
  } finally {
    await closeDocument(dirtyBefore.docId);
  }

  const dirtyDuring = await createDocument();
  try {
    const blocked = await browser.execute(async (docId) => {
      const bridge = (window as unknown as {
        __TAURI_INTERNALS__: { invoke<T>(command: string, args?: object): Promise<T> };
      }).__TAURI_INTERNALS__;
      const dirty = new Promise<void>((resolve, reject) => {
        window.setTimeout(() => {
          bridge.invoke<void>('mark_document_dirty', { docId }).then(resolve, reject);
        }, 100);
      });
      const applied = await bridge.invoke<UpdaterSnapshot>('updater_apply');
      await dirty;
      return applied;
    }, dirtyDuring.docId);
    evidence.dirtyAfterDownloadStarted = blocked;
    expect(blocked.status).toBe('available');
    expect(blocked.blocker).toBe('dirtyDocuments');
  } finally {
    await closeDocument(dirtyDuring.docId);
  }
  assertAvailable(await state());
}

async function runApply(evidence: Record<string, unknown>): Promise<void> {
  const available = await ensureAvailable();
  evidence.beforeApply = available;
  assertAvailable(available);
  try {
    const applied = await invoke<UpdaterSnapshot>('updater_apply');
    evidence.applyResult = applied;
    if (inputs.expectedKind === 'appimage') expect(applied.status).toBe('restartRequired');
    else expect(['installing', 'idle']).toContain(applied.status);
  } catch (error) {
    if (inputs.expectedKind === 'appimage') throw error;
    evidence.expectedWindowsTransportClose = error instanceof Error ? error.message : String(error);
  }
}

async function runVerify(evidence: Record<string, unknown>): Promise<void> {
  const result = await invoke<UpdaterSnapshot>('updater_check');
  evidence.noUpdate = result;
  expect(result.status).toBe('idle');
  expect(result.currentVersion).toBe(inputs.expectedAvailableVersion);
  expect(result.availableVersion).toBeNull();
  expect(result.failure).toBeNull();
}

async function runManualFallback(evidence: Record<string, unknown>): Promise<void> {
  const result = await waitForCheckCompletion();
  evidence.manualFallback = result;
  expect(result.status).toBe('idle');
  expect(result.target).toBeNull();
  expect(['readOnlyAppImage', 'unsupportedInstall']).toContain(result.blocker);
}

async function ensureAvailable(): Promise<UpdaterSnapshot> {
  const current = await waitForCheckCompletion();
  return current.status === 'available' ? current : invoke<UpdaterSnapshot>('updater_check');
}

async function waitForCheckCompletion(): Promise<UpdaterSnapshot> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const snapshot = await state();
    if (snapshot.status !== 'checking') return snapshot;
    await browser.pause(250);
  }
  throw new Error('startup updater check가 제한 시간 안에 끝나지 않았습니다');
}

function assertAvailable(snapshot: UpdaterSnapshot): void {
  expect(snapshot.status).toBe('available');
  expect(snapshot.currentVersion).toBe(inputs.expectedCurrentVersion);
  expect(snapshot.availableVersion).toBe(inputs.expectedAvailableVersion);
  expect(snapshot.target?.target).toBe(inputs.expectedTarget);
  expect(snapshot.target?.artifactKind).toBe(inputs.expectedKind);
  expect(snapshot.failure).toBeNull();
}

async function duplicateCheck(): Promise<Array<{ status: string; reason?: string }>> {
  return browser.execute(async () => {
    const bridge = (window as unknown as {
      __TAURI_INTERNALS__: { invoke<T>(command: string, args?: object): Promise<T> };
    }).__TAURI_INTERNALS__;
    const results = await Promise.allSettled([
      bridge.invoke('updater_check'),
      bridge.invoke('updater_check'),
    ]);
    return results.map((result) => result.status === 'fulfilled'
      ? { status: result.status }
      : { status: result.status, reason: String(result.reason) });
  });
}

async function createDocument(): Promise<{ docId: string }> {
  return invoke<{ docId: string }>('create_document');
}

async function markDirty(docId: string): Promise<void> {
  await invoke('mark_document_dirty', { docId });
}

async function closeDocument(docId: string): Promise<void> {
  await invoke('close_document', { docId });
}

async function state(): Promise<UpdaterSnapshot> {
  return invoke<UpdaterSnapshot>('updater_get_state');
}

async function invoke<T>(command: string, args: object = {}): Promise<T> {
  return browser.execute(async (nativeCommand, nativeArgs) => {
    const bridge = (window as unknown as {
      __TAURI_INTERNALS__: { invoke<R>(command: string, args?: object): Promise<R> };
    }).__TAURI_INTERNALS__;
    return bridge.invoke<T>(nativeCommand, nativeArgs);
  }, command, args);
}
