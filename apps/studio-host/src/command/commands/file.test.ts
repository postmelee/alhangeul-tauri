import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  confirmSaveBeforeReplacingDocument,
  fileCommands,
} from './file';

const upstreamOpen = vi.hoisted(() => vi.fn());
const upstreamPrint = vi.hoisted(() => vi.fn());
const upstreamConfirm = vi.hoisted(() => vi.fn());
const resolveRecentPath = vi.hoisted(() => vi.fn());
const host = vi.hoisted(() => ({
  activeSession: null as null | { docId: string },
  beginNewDocument: vi.fn(),
  openDocumentFromDialog: vi.fn(),
  openDocumentByPath: vi.fn(),
  saveCurrent: vi.fn(),
  exportCurrentPdf: vi.fn(),
  createNewWindow: vi.fn(),
  confirmDocumentReplacement: vi.fn(),
}));

vi.mock('@upstream/command/commands/file', () => ({
  confirmSaveBeforeReplacingDocument: upstreamConfirm,
  fileCommands: [
    { id: 'file:new-doc', label: 'New', execute: vi.fn() },
    { id: 'file:open', label: 'Open', execute: upstreamOpen },
    { id: 'file:open-recent', label: 'Recent', execute: vi.fn() },
    { id: 'file:save', label: 'Save', execute: vi.fn() },
    { id: 'file:save-as', label: 'Save as', execute: vi.fn() },
    { id: 'file:save-as-hwp', label: 'Save HWP', execute: vi.fn() },
    { id: 'file:save-as-hwpx', label: 'Save HWPX', execute: vi.fn() },
    { id: 'file:print-to-pdf', label: 'PDF', execute: vi.fn() },
    { id: 'file:print', label: 'Print', execute: upstreamPrint },
  ],
}));
vi.mock('../../core/desktop-host', () => ({ getDesktopHost: () => host }));
vi.mock('../../recent/recent-store', () => ({
  resolveDesktopRecentPath: resolveRecentPath,
}));

describe('native file command leaf adapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    host.activeSession = null;
    (globalThis as { document?: unknown }).document = { getElementById: vi.fn(() => null) };
    delete (globalThis as { window?: unknown }).window;
  });

  it('delegates unchanged upstream behavior outside Tauri', async () => {
    await command('file:open').execute(services() as never);

    expect(upstreamOpen).toHaveBeenCalled();
    expect(host.openDocumentFromDialog).not.toHaveBeenCalled();
  });

  it('routes native file actions while keeping upstream page-surface printing', async () => {
    installTauriWindow();
    host.openDocumentFromDialog.mockResolvedValue({ fileName: 'opened.hwp', pageCount: 2 });
    host.saveCurrent.mockResolvedValue({ docId: 'doc' });
    host.exportCurrentPdf.mockResolvedValue({
      path: '/documents/export.pdf', pageCount: 2, textMode: 'searchable',
    });
    upstreamPrint.mockResolvedValue(undefined);
    host.createNewWindow.mockResolvedValue('editor-2');

    await command('file:open').execute(services() as never);
    await command('file:save').execute(services() as never);
    await command('file:save-as').execute(services() as never);
    await command('file:save-as-hwp').execute(services() as never);
    await command('file:save-as-hwpx').execute(services() as never);
    await command('file:print-to-pdf').execute(services() as never);
    await command('file:print').execute(services() as never);
    await command('file:new-window').execute(services() as never);

    expect(host.openDocumentFromDialog).toHaveBeenCalledOnce();
    expect(host.saveCurrent.mock.calls).toEqual([
      [],
      [undefined, true],
      ['hwp', true],
      ['hwpx', true],
    ]);
    expect(host.exportCurrentPdf).toHaveBeenCalledOnce();
    expect(upstreamPrint).toHaveBeenCalledOnce();
    expect(host.createNewWindow).toHaveBeenCalledOnce();
  });

  it('resolves opaque recent ids inside the adapter before native open', async () => {
    installTauriWindow();
    resolveRecentPath.mockReturnValue('/private/document.hwpx');
    host.openDocumentByPath.mockResolvedValue({ fileName: 'document.hwpx', pageCount: 1 });

    await command('file:open-recent').execute(services() as never, { id: 'opaque-id' });

    expect(resolveRecentPath).toHaveBeenCalledWith('opaque-id');
    expect(host.openDocumentByPath).toHaveBeenCalledWith('/private/document.hwpx');
  });

  it('uses upstream replacement guard without a native session and host guard with one', async () => {
    upstreamConfirm.mockResolvedValue(true);
    await expect(confirmSaveBeforeReplacingDocument(services() as never)).resolves.toBe(true);
    expect(upstreamConfirm).toHaveBeenCalledOnce();

    installTauriWindow();
    host.activeSession = { docId: 'doc' };
    host.confirmDocumentReplacement.mockResolvedValue(false);
    await expect(confirmSaveBeforeReplacingDocument(services() as never)).resolves.toBe(false);
    expect(host.confirmDocumentReplacement).toHaveBeenCalledOnce();
  });

  it('keeps upstream HWPX, PDF, and print command metadata', () => {
    expect(command('file:save-as-hwpx').label).toBe('Save HWPX');
    expect(command('file:print-to-pdf').label).toBe('PDF');
    expect(command('file:print').label).toBe('Print');
  });
});

function command(id: string) {
  const found = fileCommands.find((item) => item.id === id);
  if (!found) throw new Error(`missing command: ${id}`);
  return found;
}

function installTauriWindow() {
  (globalThis as { window?: unknown }).window = {
    __TAURI_INTERNALS__: {},
    location: { protocol: 'tauri:' },
  };
}

function services() {
  return {
    eventBus: { emit: vi.fn() },
    wasm: { fileName: 'document.hwp' },
    getContext: () => ({ hasDocument: true, isDirty: false }),
  };
}
