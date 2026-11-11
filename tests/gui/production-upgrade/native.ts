import { browser, expect } from '@wdio/globals';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { clickVisibleDomElement, openDomMenu } from '../support/webdriver-dom.ts';
import type { UpgradeInputs } from './inputs.ts';

export interface Snapshot {
  status: string; trigger: string; currentVersion: string; availableVersion: string | null;
  target: { target: string; artifactKind: string } | null; blocker: string | null; failure: unknown;
}
export type UpgradeEvidence = Record<string, unknown>;

export async function invoke<T>(command: string, args?: object): Promise<T> {
  return await browser.execute(async (command, args) => {
    const bridge = (window as unknown as { __TAURI_INTERNALS__: { invoke<T>(cmd: string, args?: object): Promise<T> } }).__TAURI_INTERNALS__;
    return bridge.invoke<T>(command, args);
  }, command, args);
}

export async function settled(): Promise<Snapshot> {
  let result: Snapshot | null = null;
  await browser.waitUntil(async () => {
    result = await invoke<Snapshot>('updater_get_state');
    return result.status !== 'checking';
  }, { timeout: 180000, interval: 250 });
  return result!;
}

export function assertAvailable(snapshot: Snapshot, input: UpgradeInputs): void {
  expect(snapshot.status).toBe('available');
  expect(snapshot.currentVersion).toBe(input.fromVersion);
  expect(snapshot.availableVersion).toBe(input.toVersion);
  expect(snapshot.target).toEqual({ target: input.target, artifactKind: input.kind });
  expect(snapshot.failure).toBeNull(); expect(snapshot.blocker).toBeNull();
}

export async function showUpdater(version: string): Promise<void> {
  await openDomMenu('#menu-bar .menu-item:first-child .menu-title', 120000);
  await clickVisibleDomElement('.md-item[data-cmd="file:about"]');
  await browser.waitUntil(async () => (await browser.$('.about-alhangeul-version').getText()) === `Alhangeul ${version}`, { timeout: 120000 });
  await clickVisibleDomElement('.about-update-button');
  await browser.waitUntil(() => browser.$('.updater-dialog').isDisplayed(), { timeout: 120000 });
}

export async function verifyManifest(input: UpgradeInputs, evidence: UpgradeEvidence): Promise<void> {
  const response = await fetch(input.endpoint, { signal: AbortSignal.timeout(120000) });
  expect(response.status).toBe(200);
  const bytes = Buffer.from(await response.arrayBuffer());
  const hash = createHash('sha256').update(bytes).digest('hex');
  expect(hash).toBe(input.manifestHash);
  await writeFile(join(input.output, 'production-manifest.json'), bytes);
  evidence.manifestVerified = true; evidence.manifestSha256 = hash;
}

export async function settings() {
  return browser.execute(() => {
    const raw = localStorage.getItem('rhwp-settings');
    if (!raw) throw new Error('Missing persisted synthetic VM settings');
    const data = JSON.parse(raw);
    return { theme: data.theme, font: data.font, view: data.view };
  });
}
