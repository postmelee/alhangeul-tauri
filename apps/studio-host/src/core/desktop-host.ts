import type { CommandServices } from '@upstream/command/types';
import {
  DesktopSession,
  type DesktopDocumentFormat,
  type NativeDocumentState,
} from './desktop-session';
import {
  createDefaultDesktopHostDependencies,
  type DesktopHostDependencies,
} from './desktop-host-dependencies';
import { DesktopPersistence, type PdfExportResult } from './desktop-persistence';

export type { DesktopHostDependencies } from './desktop-host-dependencies';

interface NativeOpenResult extends NativeDocumentState {
  pageCount: number;
}

export interface DesktopOpenResult {
  fileName: string;
  pageCount: number;
}

export class DesktopHost {
  private readonly session = new DesktopSession();
  private readonly dependencies: DesktopHostDependencies;
  private readonly persistence: DesktopPersistence;
  private readonly openRequests = new Map<string, Promise<DesktopOpenResult | null>>();
  private commandServices: CommandServices | null = null;
  private pendingNewDocument: NativeOpenResult | null = null;

  constructor(dependencies: Partial<DesktopHostDependencies> = {}) {
    this.dependencies = { ...createDefaultDesktopHostDependencies(), ...dependencies };
    this.persistence = new DesktopPersistence(this.dependencies);
  }

  get activeSession() {
    return this.session.active;
  }

  bindCommandServices(services: CommandServices): void {
    this.commandServices = services;
  }

  async openDocumentFromDialog(): Promise<DesktopOpenResult | null> {
    const path = await this.dependencies.chooseOpenPath();
    return path ? this.openDocumentByPath(path) : null;
  }

  openDocumentByPath(path: string): Promise<DesktopOpenResult | null> {
    const existing = this.openRequests.get(path);
    if (existing) return existing;
    const pending = this.openDocument(path).finally(() => {
      if (this.openRequests.get(path) === pending) this.openRequests.delete(path);
    });
    this.openRequests.set(path, pending);
    return pending;
  }

  async beginNewDocument(services: CommandServices): Promise<boolean> {
    if (!await this.confirmDocumentReplacement(services)) return false;
    await this.abortPendingNewDocument();
    this.pendingNewDocument = await this.invoke<NativeOpenResult>('create_document');
    services.eventBus.emit('create-new-document', { skipUnsavedGuard: true });
    return true;
  }

  completePendingDocumentInitialization(): void {
    const result = this.pendingNewDocument;
    if (!result) return;
    this.pendingNewDocument = null;
    const previousDocId = this.session.commitOpen(result);
    this.updateDocumentTitle();
    if (previousDocId) void this.closeNativeDocument(previousDocId);
  }

  markDocumentDirty(): void {
    const docId = this.session.markDirty();
    if (docId) {
      void this.invoke<void>('mark_document_dirty', { docId }).catch((error) => {
        console.warn('[desktop-host] native dirty state update failed:', error);
      });
    }
    this.updateDocumentTitle();
  }

  syncDocumentTitle(): void {
    this.updateDocumentTitle();
  }

  async confirmDocumentReplacement(services = this.commandServices): Promise<boolean> {
    if (!services) return true;
    const context = services.getContext();
    if (!context.hasDocument || !context.isDirty) return true;
    const fileName = this.session.active?.fileName ?? services.wasm.fileName ?? '현재 문서';
    const result = await this.dependencies.showMessage(
      `${fileName}의 변경 내용을 저장할까요?`,
      {
        title: '저장 확인',
        kind: 'warning',
        buttons: { yes: '저장', no: '저장 안 함', cancel: '취소' },
      },
    );
    if (result === '저장 안 함' || result === 'No') return true;
    if (result !== '저장' && result !== 'Yes') return false;
    return (await this.saveCurrent()) !== null;
  }

  async saveCurrent(
    format?: DesktopDocumentFormat,
    forceSaveAs = false,
  ): Promise<NativeDocumentState | null> {
    const active = this.session.active;
    if (!active) throw new Error('native 문서 세션이 없습니다');
    const saved = await this.persistence.saveSource(active, format, forceSaveAs);
    if (!saved) return null;
    this.session.commitSave(saved.state);
    await saved.handlers.notifySaved(saved.state.fileName);
    this.updateDocumentTitle();
    return saved.state;
  }

  async exportCurrentPdf(): Promise<PdfExportResult | null> {
    const active = this.session.active;
    return this.persistence.exportPdf(
      active?.fileName ?? 'document.hwp',
      active?.sourcePath ?? null,
    );
  }

  async confirmWindowClose(): Promise<boolean> {
    if (!await this.confirmDocumentReplacement()) return false;
    await this.abortPendingNewDocument();
    const docId = this.session.release();
    if (docId) await this.closeNativeDocument(docId);
    this.updateDocumentTitle();
    return true;
  }

  takePendingOpenPaths(): Promise<string[]> {
    return this.invoke<string[]>('take_pending_open_paths');
  }

  createNewWindow(): Promise<string> {
    return this.invoke<string>('create_editor_window');
  }

  destroyCurrentWindow(): Promise<void> {
    return this.invoke<void>('destroy_current_window');
  }

  private async openDocument(path: string): Promise<DesktopOpenResult | null> {
    await this.abortPendingNewDocument();
    await this.invoke<void>('prepare_document_open', { path });
    const { bytes, sourceFingerprint } = await this.dependencies.readDocument(path);
    const result = await this.invoke<NativeOpenResult>('open_document_tracking', {
      path,
      sourceFingerprint,
    });
    try {
      const handlers = await this.dependencies.handlers();
      const loaded = await handlers.loadFile(bytes, result.fileName, false, false);
      const previousDocId = this.session.commitOpen(result);
      await this.invoke<void>('record_recent_document', { path }).catch((error) => {
        console.warn('[desktop-host] recent document update failed:', error);
      });
      if (previousDocId) await this.closeNativeDocument(previousDocId);
      this.updateDocumentTitle();
      return { fileName: result.fileName, pageCount: loaded.pageCount };
    } catch (error) {
      await this.closeNativeDocument(result.docId);
      throw error;
    }
  }

  private async abortPendingNewDocument(): Promise<void> {
    const pending = this.pendingNewDocument;
    this.pendingNewDocument = null;
    if (pending) await this.closeNativeDocument(pending.docId);
  }

  private async closeNativeDocument(docId: string): Promise<void> {
    await this.invoke<void>('close_document', { docId }).catch((error) => {
      console.warn('[desktop-host] native document cleanup failed:', error);
    });
  }

  private async invoke<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
    return this.dependencies.invoke(command, args) as Promise<T>;
  }

  private updateDocumentTitle(): void {
    if (typeof document === 'undefined') return;
    const active = this.session.active;
    document.title = active
      ? `${active.dirty ? '• ' : ''}${active.fileName} - Alhangeul`
      : 'Alhangeul';
  }
}

let desktopHost = new DesktopHost();

export function getDesktopHost(): DesktopHost {
  return desktopHost;
}

export function setDesktopHostForTests(host: DesktopHost): void {
  desktopHost = host;
}
