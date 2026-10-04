import type { UpgradeEvidence } from './native.ts';

interface Diagnostics {
  readState: () => Promise<unknown>;
  screenshot: () => Promise<unknown>;
}
export async function captureInstallFailure(evidence: UpgradeEvidence, diagnostics: Diagnostics): Promise<void> {
  const failure: Record<string, unknown> = {};
  try { failure.ui = await diagnostics.readState(); }
  catch (error) { failure.stateError = error instanceof Error ? error.message : String(error); }
  try { await diagnostics.screenshot(); failure.screenshot = 'install-failure.png'; }
  catch (error) { failure.screenshotError = error instanceof Error ? error.message : String(error); }
  evidence.installFailure = failure;
}
