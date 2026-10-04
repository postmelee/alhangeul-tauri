import type { Snapshot, UpgradeEvidence } from './native.ts';

interface Handoff {
  status: 'observing' | 'transportClosed' | 'failed';
  startedAt: string;
  transitions: { status: string; observedAt: string }[];
  lastSnapshot?: Snapshot;
  lastObservedAt?: string;
  closedAt?: string;
  closureSource?: 'install-click' | 'state-poll';
  error?: string;
}
interface Observation {
  readState: () => Promise<Snapshot>;
  pause: (ms: number) => Promise<unknown>;
  now?: () => number;
  timeoutMs?: number;
}

export function isWindowsTransportClosed(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /invalid session id|session (?:deleted|closed|not found|does not exist)|disconnected|no such window|(?:target window|webview|web view) (?:was |already )?closed|web view not found|ECONNREFUSED|ECONNRESET|socket hang up/i.test(message);
}

export function recordWindowsClosure(evidence: UpgradeEvidence, error: unknown,
  source: 'install-click' | 'state-poll', now = Date.now): void {
  if (!isWindowsTransportClosed(error)) throw error;
  const handoff = (evidence.windowsHandoff ?? {
    startedAt: new Date(now()).toISOString(), transitions: [],
  }) as Handoff;
  handoff.status = 'transportClosed';
  handoff.closedAt = new Date(now()).toISOString();
  handoff.closureSource = source;
  evidence.windowsHandoff = handoff;
  evidence.installObserved = true;
  evidence.transportClosed = error instanceof Error ? error.message : String(error);
  evidence.requiresInstalledVersionVerification = true;
}

export async function observeWindowsHandoff(options: Observation, evidence: UpgradeEvidence): Promise<void> {
  const now = options.now ?? Date.now;
  const deadline = now() + (options.timeoutMs ?? 600000);
  const handoff: Handoff = { status: 'observing', startedAt: new Date(now()).toISOString(), transitions: [] };
  evidence.windowsHandoff = handoff;
  try {
    while (now() < deadline) {
      let snapshot: Snapshot;
      try { snapshot = await options.readState(); }
      catch (error) { recordWindowsClosure(evidence, error, 'state-poll', now); return; }
      handoff.lastSnapshot = snapshot;
      handoff.lastObservedAt = new Date(now()).toISOString();
      evidence.installed = snapshot;
      if (handoff.transitions.at(-1)?.status !== snapshot.status) {
        if (handoff.transitions.length === 32) handoff.transitions.shift();
        handoff.transitions.push({ status: snapshot.status, observedAt: handoff.lastObservedAt });
      }
      if (snapshot.status === 'error') throw new Error(`Updater failed: ${JSON.stringify(snapshot.failure)}`);
      if (!['available', 'downloading', 'installing'].includes(snapshot.status)) {
        throw new Error(`Unexpected Windows updater state: ${snapshot.status}`);
      }
      // Installing precedes native installer handoff. Keep the driver session alive.
      await options.pause(250);
    }
    throw new Error('Windows updater transport did not close before the installation observation deadline');
  } catch (error) {
    handoff.status = 'failed';
    handoff.error = error instanceof Error ? error.message : String(error);
    throw error;
  }
}
