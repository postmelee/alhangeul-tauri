import { detectDesktopPlatform, isTauriRuntime } from './platform';
import { active, type DiagnosticSnapshot, type DiagnosticView } from './desktop-thumbnail-diagnostics-model';

export interface ThumbnailBridge {
  inspect(): Promise<DiagnosticSnapshot>;
  start(consent: boolean): Promise<DiagnosticSnapshot>;
  state(requestId: string): Promise<DiagnosticSnapshot>;
  cancel(requestId: string): Promise<void>;
  openInstructions(): Promise<void>;
}

export class ThumbnailDiagnosticsController {
  private view: DiagnosticView = { phase: 'connecting', snapshot: null, error: null };
  private listeners = new Set<(view: DiagnosticView) => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private deadline: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private pending = false;
  private cancelling = false;
  private epoch = 0;

  constructor(private readonly bridge: ThumbnailBridge) {}
  current(): DiagnosticView { return this.view; }
  subscribe(listener: (view: DiagnosticView) => void): () => void {
    this.listeners.add(listener);
    listener(this.view);
    return () => this.listeners.delete(listener);
  }
  async connect(): Promise<void> { await this.begin(false); }
  async start(consent: boolean): Promise<void> {
    if (!consent) return;
    if (this.view.phase !== 'ready') return;
    await this.begin(true);
  }
  async cancel(): Promise<void> {
    if (this.disposed || this.cancelling) return;
    this.cancelling = true;
    this.update({ ...this.view, phase: 'cancelling' });
    const id = this.view.snapshot?.requestId;
    if (id) await this.cancelId(id);
    // If begin is unresolved, its response will immediately be cancelled.
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.epoch++;
    this.stopTimers();
    this.listeners.clear();
    if (active(this.view.snapshot)) void this.cancelId(this.view.snapshot!.requestId);
  }
  async openInstructions(): Promise<boolean> {
    try { await this.bridge.openInstructions(); return true; } catch { return false; }
  }

  private async begin(suite: boolean): Promise<void> {
    if (this.disposed || this.pending || active(this.view.snapshot)) return;
    const epoch = ++this.epoch;
    this.pending = true;
    this.cancelling = false;
    this.update({ phase: suite ? 'running' : 'connecting', snapshot: null, error: null });
    this.deadline = setTimeout(() => this.expire(), 190_000);
    try {
      const next = await (suite ? this.bridge.start(true) : this.bridge.inspect());
      if (this.disposed || epoch !== this.epoch) {
        if (active(next)) await this.cancelId(next.requestId);
        return;
      }
      if (this.cancelling) await this.cancelId(next.requestId);
      this.accept(next);
    } catch (error) {
      if (!this.disposed && epoch === this.epoch) this.fail(error);
    } finally { if (epoch === this.epoch) this.pending = false; }
  }
  private accept(next: DiagnosticSnapshot): void {
    const previous = this.view.snapshot;
    if (this.disposed || (previous && (previous.requestId !== next.requestId
      || (!active(previous) && active(next))))) return;
    if (previous && previous.sequence > next.sequence) {
      if (active(previous)) this.timer = setTimeout(() => void this.poll(previous.requestId, this.epoch), 500);
      return;
    }
    const phase = this.cancelling && active(next) ? 'cancelling'
      : next.operation === 'inspect' && next.status === 'completed' && next.result?.kind === 'inspection'
        ? 'ready' : next.status;
    this.update({ phase, snapshot: next, error: null });
    if (active(next)) this.timer = setTimeout(() => void this.poll(next.requestId, this.epoch), 500);
    else this.stopTimers();
  }
  private async poll(id: string, epoch: number): Promise<void> {
    try {
      const next = await this.bridge.state(id);
      if (!this.disposed && epoch === this.epoch) {
        if (next.requestId !== id) { this.fail('not-owner'); return; }
        this.accept(next);
      }
    } catch (error) {
      if (!this.disposed && epoch === this.epoch) this.fail(error);
    }
  }
  private expire(): void {
    this.epoch++;
    this.pending = false;
    this.stopTimers();
    if (active(this.view.snapshot)) void this.cancelId(this.view.snapshot!.requestId);
    this.update({ ...this.view, phase: 'timed-out' });
  }
  private fail(error: unknown): void {
    this.stopTimers();
    if (active(this.view.snapshot)) void this.cancelId(this.view.snapshot!.requestId);
    const code = error === 'busy' || error === 'not-owner' || error === 'consent-required'
      ? error : 'unavailable';
    this.update({ ...this.view, phase: 'error', error: code });
  }
  private async cancelId(id: string): Promise<void> {
    try { await this.bridge.cancel(id); } catch { /* Native deadline remains authoritative. */ }
  }
  private stopTimers(): void { clearTimeout(this.timer); clearTimeout(this.deadline); }
  private update(view: DiagnosticView): void {
    if (this.disposed) return;
    this.view = view;
    for (const listener of this.listeners) listener(view);
  }
}

export function thumbnailDiagnosticsAvailable(): boolean {
  return isTauriRuntime() && detectDesktopPlatform() === 'windows';
}
export async function createThumbnailDiagnosticsController(): Promise<ThumbnailDiagnosticsController | null> {
  if (!thumbnailDiagnosticsAvailable()) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return new ThumbnailDiagnosticsController({
    inspect: () => invoke('thumbnail_diagnostics_inspect'),
    start: (consent) => invoke('thumbnail_diagnostics_start', { consent }),
    state: (requestId) => invoke('thumbnail_diagnostics_get_state', { requestId }),
    cancel: (requestId) => invoke('thumbnail_diagnostics_cancel', { requestId }),
    openInstructions: () => invoke('updater_open_manual_downloads'),
  });
}
