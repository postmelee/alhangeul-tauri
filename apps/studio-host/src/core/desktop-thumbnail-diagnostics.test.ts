import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createThumbnailDiagnosticsController, ThumbnailDiagnosticsController, type ThumbnailBridge } from './desktop-thumbnail-diagnostics';
import { completed, ready, running } from '../../tests/thumbnail-diagnostics-fixtures';
import { offerMsi, type DiagnosticSnapshot } from './desktop-thumbnail-diagnostics-model';
import { diagnosticSummary } from './desktop-thumbnail-diagnostics-summary';

const native = vi.hoisted(() => ({ loaded: vi.fn(), invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => { native.loaded(); return { invoke: native.invoke }; });
function bridge() {
  return { inspect: vi.fn(async () => ready()), start: vi.fn(async () => running('suite', 'suite-id')),
    state: vi.fn(async () => completed()), cancel: vi.fn(async () => {}), openInstructions: vi.fn(async () => {}) } satisfies ThumbnailBridge;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
describe('thumbnail UI controller', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it('does not import native APIs for browser or Linux', async () => {
    vi.stubGlobal('window', { location: { protocol: 'https:' } });
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
    expect(await createThumbnailDiagnosticsController()).toBeNull();
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {}, location: {} });
    vi.stubGlobal('navigator', { platform: 'Linux', userAgent: '' });
    expect(await createThumbnailDiagnosticsController()).toBeNull();
    expect(native.loaded).not.toHaveBeenCalled();
  });
  it('requires consent, rejects duplicate starts and completes polling', async () => {
    const api = bridge(); const controller = new ThumbnailDiagnosticsController(api);
    await controller.connect(); await controller.start(false);
    expect(api.start).not.toHaveBeenCalled();
    await Promise.all([controller.start(true), controller.start(true)]);
    expect(api.start).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(controller.current().phase).toBe('completed');
    expect(vi.getTimerCount()).toBe(0);
    controller.dispose();
  });
  it('cancels a start reply arriving after dialog disposal', async () => {
    const api = bridge(); const reply = deferred<DiagnosticSnapshot>();
    api.start.mockReturnValue(reply.promise);
    const controller = new ThumbnailDiagnosticsController(api);
    await controller.connect(); const pending = controller.start(true);
    controller.dispose(); reply.resolve(running('suite', 'late'));
    await pending;
    expect(api.cancel).toHaveBeenCalledWith('late');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels pending starts without losing the new request ID', async () => {
    const api = bridge(); const reply = deferred<DiagnosticSnapshot>();
    api.start.mockReturnValue(reply.promise);
    const controller = new ThumbnailDiagnosticsController(api);
    await controller.connect(); const pending = controller.start(true);
    await controller.cancel(); reply.resolve(running('suite', 'late')); await pending;
    expect(api.cancel).toHaveBeenCalledWith('late');
    expect(controller.current().phase).toBe('cancelling');
    controller.dispose();
  });
  it('recovers an active suite on reload and stops at the bounded deadline', async () => {
    const api = bridge(); api.inspect.mockResolvedValue(running('suite', 'recovered'));
    api.state.mockResolvedValue(running('suite', 'recovered'));
    const controller = new ThumbnailDiagnosticsController(api);
    await controller.connect();
    expect(controller.current().phase).toBe('running');
    expect(api.start).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(190_001);
    expect(controller.current().phase).toBe('timed-out');
    expect(api.cancel).toHaveBeenCalledWith('recovered');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects another request result, sanitizes errors and does not poll forever', async () => {
    const api = bridge(); api.state.mockResolvedValue(completed());
    api.inspect.mockResolvedValue(running('suite', 'owned'));
    const controller = new ThumbnailDiagnosticsController(api);
    await controller.connect(); await vi.advanceTimersByTimeAsync(500);
    expect(controller.current().error).toBe('not-owner');
    expect(controller.current().snapshot?.requestId).toBe('owned');
    expect(vi.getTimerCount()).toBe(0);
    controller.dispose();
    api.inspect.mockRejectedValue('C:\\private\\secret.hwp');
    const failed = new ThumbnailDiagnosticsController(api);
    await failed.connect();
    expect(failed.current().error).toBe('unavailable');
    expect(JSON.stringify(failed.current())).not.toContain('private');
  });
  it('reports busy owner and handles offline instructions without updating', async () => {
    const api = bridge(); api.inspect.mockRejectedValue('busy');
    api.openInstructions.mockRejectedValue(new Error('offline'));
    const controller = new ThumbnailDiagnosticsController(api);
    await controller.connect();
    expect(controller.current().error).toBe('busy');
    expect(await controller.openInstructions()).toBe(false);
    controller.dispose();
  });
  it('ignores older sequences but continues bounded polling', async () => {
    const api = bridge(); api.inspect.mockResolvedValue({ ...running('suite', 'suite-id'), sequence: 3 });
    api.state.mockResolvedValueOnce({ ...running('suite', 'suite-id'), sequence: 2 })
      .mockResolvedValueOnce({ ...completed(), sequence: 4 });
    const controller = new ThumbnailDiagnosticsController(api);
    await controller.connect(); await vi.advanceTimersByTimeAsync(500);
    expect(controller.current().snapshot?.sequence).toBe(3);
    await vi.advanceTimersByTimeAsync(500);
    expect(controller.current().phase).toBe('completed');
    controller.dispose();
  });
  it('does not publish a poll response after hide/dispose', async () => {
    const api = bridge(); const response = deferred<DiagnosticSnapshot>();
    api.inspect.mockResolvedValue(running('suite', 'suite-id')); api.state.mockReturnValue(response.promise);
    const controller = new ThumbnailDiagnosticsController(api); const listener = vi.fn();
    controller.subscribe(listener); await controller.connect(); await vi.advanceTimersByTimeAsync(500);
    controller.dispose(); const count = listener.mock.calls.length;
    response.resolve(completed()); await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(count);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('Windows bridge invokes only the four diagnostic commands and fixed manual page', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {}, location: {} });
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
    native.invoke.mockImplementation(async (command: string) => {
      if (command === 'thumbnail_diagnostics_inspect') return ready();
      if (command === 'thumbnail_diagnostics_start') return running('suite', 'suite-id');
      if (command === 'thumbnail_diagnostics_get_state') return completed();
    });
    const controller = await createThumbnailDiagnosticsController();
    await controller!.connect(); await controller!.start(true); await controller!.cancel();
    await vi.advanceTimersByTimeAsync(500); await controller!.openInstructions();
    expect(native.invoke.mock.calls).toEqual([
      ['thumbnail_diagnostics_inspect'], ['thumbnail_diagnostics_start', { consent: true }],
      ['thumbnail_diagnostics_cancel', { requestId: 'suite-id' }],
      ['thumbnail_diagnostics_get_state', { requestId: 'suite-id' }], ['updater_open_manual_downloads'],
    ]);
    controller!.dispose();
  });
});
describe('conditional MSI guidance and privacy', () => {
  it('requires real per-user activation evidence, not just UAC/elevation', () => {
    expect(offerMsi(completed())).toBe(false);
    expect(offerMsi(completed(true))).toBe(true);
    for (const mutate of [
      (s: DiagnosticSnapshot) => { s.status = 'cancelled'; },
      (s: DiagnosticSnapshot) => { if (s.result?.kind === 'suite') s.result.value.cleanup = false; },
      (s: DiagnosticSnapshot) => { if (s.result?.kind === 'suite') s.result.value.inspection!.installKind = 'msi'; },
      (s: DiagnosticSnapshot) => { if (s.result?.kind === 'suite') s.result.value.formats[1].assessment.evidenceValid = false; },
    ]) { const snapshot = completed(true); mutate(snapshot); expect(offerMsi(snapshot)).toBe(false); }
  });
  it('projects only bounded allowlisted fields even if unexpected private fields arrive', () => {
    const snapshot = completed(true);
    const poisoned = JSON.parse(JSON.stringify(snapshot).replaceAll('shell', 'C:\\\\private'));
    poisoned.path = 'C:\\private'; poisoned.exception = '<script>private</script>';
    poisoned.result.value.inspection.stateToken = 'private';
    poisoned.result.value.formats[0].input.probes[0].Result.hresult = 'private';
    const summary = diagnosticSummary(poisoned);
    expect(summary).not.toMatch(/private|stateToken|exception|requestId/);
    expect(summary).toContain('0x80040154');
    expect(JSON.parse(summary).formats).toHaveLength(2);
  });
});
