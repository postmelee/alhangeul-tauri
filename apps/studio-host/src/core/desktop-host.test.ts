import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopHost, type DesktopHostDependencies } from './desktop-host';
import type { DesktopStudioHandlers } from '../embed/desktop-runtime';

describe('desktop host', () => {
  beforeEach(() => {
    (globalThis as { document?: unknown }).document = { title: '' };
  });

  it('loads native bytes through the upstream handler before committing the session', async () => {
    const fixture = createFixture();
    fixture.invoke.mockImplementation(async (command) => {
      if (command === 'prepare_document_open') return undefined;
      if (command === 'open_document_tracking') return nativeOpen({ docId: 'opened' });
      if (command === 'record_recent_document') return undefined;
      throw new Error(`unexpected command: ${command}`);
    });
    const host = new DesktopHost(fixture.dependencies);

    await expect(host.openDocumentByPath('/documents/opened.hwp')).resolves.toEqual({
      fileName: 'opened.hwp',
      pageCount: 2,
    });

    expect(fixture.handlers.loadFile).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
      'opened.hwp',
      false,
      false,
    );
    expect(host.activeSession).toMatchObject({ docId: 'opened', sourcePath: '/documents/opened.hwp' });
    expect(fixture.invoke).toHaveBeenCalledWith('record_recent_document', {
      path: '/documents/opened.hwp',
    });
    expect(document.title).toBe('opened.hwp - Alhangeul');
  });

  it('closes a native tracking session when the Studio load fails', async () => {
    const fixture = createFixture();
    fixture.handlers.loadFile.mockRejectedValue(new Error('parse failed'));
    fixture.invoke.mockImplementation(async (command) => {
      if (command === 'prepare_document_open') return undefined;
      if (command === 'open_document_tracking') return nativeOpen({ docId: 'failed' });
      if (command === 'close_document') return undefined;
      throw new Error(`unexpected command: ${command}`);
    });
    const host = new DesktopHost(fixture.dependencies);

    await expect(host.openDocumentByPath('/documents/failed.hwp')).rejects.toThrow('parse failed');

    expect(host.activeSession).toBeNull();
    expect(fixture.invoke).toHaveBeenCalledWith('close_document', { docId: 'failed' });
  });

  it('coalesces concurrent event and pending opens for the same path', async () => {
    const fixture = createFixture();
    let releaseLoad!: () => void;
    fixture.handlers.loadFile.mockImplementation(() => new Promise((resolve) => {
      releaseLoad = () => resolve({ pageCount: 2 });
    }));
    fixture.invoke.mockImplementation(async (command) => {
      if (command === 'prepare_document_open') return undefined;
      if (command === 'open_document_tracking') return nativeOpen({ docId: 'single' });
      if (command === 'record_recent_document') return undefined;
      throw new Error(`unexpected command: ${command}`);
    });
    const host = new DesktopHost(fixture.dependencies);

    const first = host.openDocumentByPath('/documents/once.hwp');
    const second = host.openDocumentByPath('/documents/once.hwp');
    await vi.waitFor(() => expect(fixture.handlers.loadFile).toHaveBeenCalledOnce());
    releaseLoad();
    await Promise.all([first, second]);

    expect(first).toBe(second);
    expect(fixture.handlers.loadFile).toHaveBeenCalledOnce();
  });

  it('syncs dirty state and saves the active HWP format through native staging', async () => {
    const fixture = createFixture();
    fixture.invoke.mockImplementation(async (command) => {
      if (command === 'prepare_document_open') return undefined;
      if (command === 'open_document_tracking') return nativeOpen({ docId: 'saved' });
      if (command === 'record_recent_document') return undefined;
      if (command === 'mark_document_dirty') return undefined;
      if (command === 'check_external_modification') return { changed: false };
      if (command === 'prepare_staged_document_save') return '/tmp/staged.hwp';
      if (command === 'commit_staged_document_save') {
        return nativeSave({ docId: 'saved', sourcePath: '/documents/opened.hwp', revision: 2 });
      }
      throw new Error(`unexpected command: ${command}`);
    });
    const host = new DesktopHost(fixture.dependencies);
    await host.openDocumentByPath('/documents/opened.hwp');

    host.markDocumentDirty();
    host.markDocumentDirty();
    const result = await host.saveCurrent();

    expect(fixture.invoke).toHaveBeenCalledTimes(7);
    expect(fixture.invoke).toHaveBeenCalledWith('mark_document_dirty', { docId: 'saved' });
    expect(fixture.writeDocument).toHaveBeenCalledWith(
      '/tmp/staged.hwp',
      new Uint8Array([7, 8, 9]),
    );
    expect(fixture.invoke).toHaveBeenCalledWith('prepare_staged_document_save', {
      targetPath: '/documents/opened.hwp',
      format: 'hwp',
    });
    expect(fixture.handlers.exportHwpx).not.toHaveBeenCalled();
    expect(fixture.handlers.notifySaved).toHaveBeenCalledWith('opened.hwp');
    expect(result).toMatchObject({ revision: 2, dirty: false });
    expect(host.activeSession).toMatchObject({ revision: 2, dirty: false });
  });

  it('commits a pending native blank session only after upstream initialization', async () => {
    const fixture = createFixture();
    fixture.invoke.mockImplementation(async (command) => {
      if (command === 'create_document') {
        return nativeOpen({ docId: 'new-doc', fileName: '새 문서.hwp', sourcePath: null });
      }
      throw new Error(`unexpected command: ${command}`);
    });
    const host = new DesktopHost(fixture.dependencies);
    const eventBus = { emit: vi.fn() };
    const services = commandServices({ eventBus });

    await expect(host.beginNewDocument(services as never)).resolves.toBe(true);
    expect(host.activeSession).toBeNull();
    expect(eventBus.emit).toHaveBeenCalledWith('create-new-document', { skipUnsavedGuard: true });

    host.completePendingDocumentInitialization();
    expect(host.activeSession).toMatchObject({ docId: 'new-doc', sourcePath: null });
  });
});

function createFixture() {
  const invoke = vi.fn();
  const writeDocument = vi.fn().mockResolvedValue(undefined);
  const handlers: DesktopStudioHandlers = {
    loadFile: vi.fn().mockResolvedValue({ pageCount: 2 }),
    pageCount: vi.fn().mockResolvedValue(2),
    getPageSvg: vi.fn().mockResolvedValue('<svg/>'),
    exportHwp: vi.fn().mockResolvedValue(new Uint8Array([7, 8, 9])),
    exportHwpx: vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
    notifySaved: vi.fn().mockResolvedValue({ ok: true, wasDirty: true }),
  };
  const dependencies: DesktopHostDependencies = {
    invoke,
    chooseOpenPath: vi.fn().mockResolvedValue(null),
    chooseDocumentSavePath: vi.fn().mockResolvedValue(null),
    choosePdfSavePath: vi.fn().mockResolvedValue(null),
    resolveSaveDefaultPath: vi.fn(async (fileName) => `/documents/${fileName}`),
    showMessage: vi.fn().mockResolvedValue('취소'),
    readDocument: vi.fn().mockResolvedValue({ bytes: new Uint8Array([1, 2, 3]) }),
    writeDocument,
    removeFile: vi.fn().mockResolvedValue(undefined),
    handlers: vi.fn().mockResolvedValue(handlers),
  };
  return { dependencies, handlers: handlers as MockedHandlers, invoke, writeDocument };
}

type MockedHandlers = {
  [Key in keyof DesktopStudioHandlers]: ReturnType<typeof vi.fn>;
};

function nativeOpen(overrides: Record<string, unknown> = {}) {
  return {
    docId: 'doc',
    fileName: 'opened.hwp',
    sourcePath: '/documents/opened.hwp',
    format: 'hwp',
    pageCount: 2,
    revision: 1,
    dirty: false,
    warnings: [],
    ...overrides,
  };
}

function nativeSave(overrides: Record<string, unknown> = {}) {
  const { fileName: _fileName, pageCount: _pageCount, ...result } = nativeOpen(overrides);
  return result;
}

function commandServices({ eventBus }: { eventBus: { emit: ReturnType<typeof vi.fn> } }) {
  return {
    eventBus,
    wasm: { fileName: 'document.hwp' },
    getContext: () => ({ hasDocument: false, isDirty: false }),
  };
}
