import type { UpgradeEvidence } from './native.ts';

interface ProcessIdentity { pid: number; executable: string }
interface RestartObservation {
  previous: ProcessIdentity;
  click: () => Promise<void>;
  wait: (previous: ProcessIdentity) => Promise<{
    previous: ProcessIdentity; current: ProcessIdentity; observed: boolean;
  }>;
}

export async function observeAppImageRestart(options: RestartObservation, evidence: UpgradeEvidence): Promise<void> {
  try { await options.click(); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const knownClosure = /session|disconnected|closed|no such window|ECONNREFUSED/i.test(message);
    const closingAsyncResponse = message === 'WebDriverError: unknown error when running "execute/async" with method "POST"';
    if (!knownClosure && !closingAsyncResponse) throw error;
    // The response is provisional; the native probe must still observe a new PID and FUSE executable.
    evidence.restartTransportClosed = message;
  }
  evidence.restart = await options.wait(options.previous);
}
