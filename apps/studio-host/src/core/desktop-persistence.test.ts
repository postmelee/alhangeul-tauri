import { describe, expect, it, vi } from 'vitest';
import type { DesktopStudioHandlers } from '../embed/desktop-runtime';
import type { DesktopHostDependencies } from './desktop-host-dependencies';
import { DesktopPersistence } from './desktop-persistence';
import type { ActiveDesktopSession } from './desktop-session';

describe('desktop persistence', () => {
  it('preserves HWPX on save and supports explicit cross-format save-as', async () => {
    const fixture = createFixture();
    fixture.dependencies.chooseDocumentSavePath = vi.fn().mockResolvedValue('/exports/converted.hwp');
    fixture.invoke.mockImplementation(async (command, args) => {
      if (command === 'check_external_modification') return { changed: false };
      if (command === 'prepare_staged_document_save') {
        return args?.format === 'hwpx' ? '/tmp/staged.hwpx' : '/tmp/staged.hwp';
      }
      if (command === 'commit_staged_document_save') {
        const request = args?.request as Record<string, unknown>;
        return nativeSave({
          sourcePath: request.targetPath,
          format: request.format,
          revision: request.format === 'hwpx' ? 2 : 3,
        });
      }
      throw new Error(`unexpected command: ${command}`);
    });
    const persistence = new DesktopPersistence(fixture.dependencies);
    const active = activeSession();

    const hwpx = await persistence.saveSource(active);
    expect(hwpx?.state).toMatchObject({
      format: 'hwpx', sourcePath: '/documents/source.hwpx', fileName: 'source.hwpx',
    });
    expect(fixture.handlers.exportHwpx).toHaveBeenCalledOnce();
    expect(fixture.dependencies.chooseDocumentSavePath).not.toHaveBeenCalled();

    const hwp = await persistence.saveSource(active, 'hwp', true);
    expect(fixture.dependencies.resolveSaveDefaultPath)
      .toHaveBeenCalledWith('source.hwp', '/documents/source.hwpx');
    expect(fixture.dependencies.chooseDocumentSavePath)
      .toHaveBeenCalledWith('/documents/source.hwp', 'hwp');
    expect(hwp?.state).toMatchObject({
      format: 'hwp', sourcePath: '/exports/converted.hwp', fileName: 'converted.hwp',
    });
    expect(fixture.invoke.mock.calls
      .filter(([command]) => command === 'commit_staged_document_save'))
      .toEqual([
        ['commit_staged_document_save', {
          request: {
            docId: 'doc',
            stagedPath: '/tmp/staged.hwpx',
            targetPath: '/documents/source.hwpx',
            format: 'hwpx',
            expectedRevision: 1,
            allowExternalOverwrite: false,
          },
        }],
        ['commit_staged_document_save', {
          request: {
            docId: 'doc',
            stagedPath: '/tmp/staged.hwp',
            targetPath: '/exports/converted.hwp',
            format: 'hwp',
            expectedRevision: 1,
            allowExternalOverwrite: false,
          },
        }],
      ]);
    expect(fixture.handlers.exportHwp).toHaveBeenCalledOnce();
    expect(fixture.handlers.notifySaved).not.toHaveBeenCalled();
  });

  it('keeps the source state unchanged and removes staging when save commit fails', async () => {
    const fixture = createFixture();
    fixture.invoke.mockImplementation(async (command) => {
      if (command === 'check_external_modification') return { changed: false };
      if (command === 'prepare_staged_document_save') return '/tmp/staged.hwpx';
      if (command === 'commit_staged_document_save') throw new Error('commit failed');
      throw new Error(`unexpected command: ${command}`);
    });
    const persistence = new DesktopPersistence(fixture.dependencies);
    const active = activeSession({ dirty: true });
    const snapshot = { ...active };

    await expect(persistence.saveSource(active)).rejects.toThrow('commit failed');

    expect(active).toEqual(snapshot);
    expect(fixture.handlers.notifySaved).not.toHaveBeenCalled();
    expect(fixture.dependencies.removeFile).toHaveBeenCalledWith('/tmp/staged.hwpx');
  });

  it('streams current SVG pages in order without source export or save notification', async () => {
    const fixture = createFixture();
    fixture.dependencies.choosePdfSavePath = vi.fn().mockResolvedValue('/exports/current.pdf');
    fixture.handlers.pageCount.mockResolvedValue(3);
    fixture.handlers.getPageSvg.mockImplementation(async (page) => `<svg data-page="${page}"/>`);
    fixture.invoke.mockImplementation(async (command) => {
      if (command === 'begin_pdf_export') return 'pdf-job';
      if (command === 'append_pdf_page') return undefined;
      if (command === 'commit_pdf_export') {
        return { path: '/exports/current.pdf', pageCount: 3, textMode: 'searchable' };
      }
      throw new Error(`unexpected command: ${command}`);
    });
    const persistence = new DesktopPersistence(fixture.dependencies);

    await expect(persistence.exportPdf('source.hwpx', '/documents/source.hwpx')).resolves.toEqual({
      path: '/exports/current.pdf', pageCount: 3, textMode: 'searchable',
    });

    expect(fixture.dependencies.resolveSaveDefaultPath)
      .toHaveBeenCalledWith('source.pdf', '/documents/source.hwpx');
    expect(fixture.dependencies.choosePdfSavePath)
      .toHaveBeenCalledWith('/documents/source.pdf');
    expect(fixture.handlers.getPageSvg.mock.calls.map(([page]) => page)).toEqual([0, 1, 2]);
    expect(fixture.invoke.mock.calls.filter(([command]) => command === 'append_pdf_page'))
      .toEqual([
        ['append_pdf_page', { jobId: 'pdf-job', pageIndex: 0, svg: '<svg data-page="0"/>' }],
        ['append_pdf_page', { jobId: 'pdf-job', pageIndex: 1, svg: '<svg data-page="1"/>' }],
        ['append_pdf_page', { jobId: 'pdf-job', pageIndex: 2, svg: '<svg data-page="2"/>' }],
      ]);
    expect(fixture.handlers.exportHwp).not.toHaveBeenCalled();
    expect(fixture.handlers.exportHwpx).not.toHaveBeenCalled();
    expect(fixture.handlers.notifySaved).not.toHaveBeenCalled();
  });

  it('aborts partial jobs and warns when searchable conversion falls back to outlines', async () => {
    const fixture = createFixture();
    fixture.dependencies.choosePdfSavePath = vi.fn().mockResolvedValue('/exports/current.pdf');
    fixture.handlers.pageCount.mockResolvedValue(2);
    fixture.handlers.getPageSvg.mockRejectedValueOnce(new Error('page render failed'));
    fixture.invoke.mockImplementation(async (command) => {
      if (command === 'begin_pdf_export') return 'failed-job';
      if (command === 'abort_pdf_export') return undefined;
      throw new Error(`unexpected command: ${command}`);
    });
    const persistence = new DesktopPersistence(fixture.dependencies);

    await expect(persistence.exportPdf('source.hwp')).rejects.toThrow('page render failed');
    expect(fixture.invoke).toHaveBeenCalledWith('abort_pdf_export', { jobId: 'failed-job' });

    fixture.handlers.getPageSvg.mockReset().mockResolvedValue('<svg/>');
    fixture.invoke.mockImplementation(async (command) => {
      if (command === 'begin_pdf_export') return 'fallback-job';
      if (command === 'append_pdf_page') return undefined;
      if (command === 'commit_pdf_export') {
        return {
          path: '/exports/current.pdf',
          pageCount: 2,
          textMode: 'outlined-fallback',
          warning: '검색 가능한 텍스트 변환 실패',
        };
      }
      throw new Error(`unexpected command: ${command}`);
    });

    await persistence.exportPdf('source.hwp');
    expect(fixture.dependencies.showMessage).toHaveBeenCalledWith(
      '검색 가능한 텍스트 변환 실패',
      { title: 'PDF 저장 경고', kind: 'warning' },
    );
    expect(fixture.handlers.notifySaved).not.toHaveBeenCalled();
  });

  it('does not start a native PDF job when the save dialog is cancelled', async () => {
    const fixture = createFixture();
    const persistence = new DesktopPersistence(fixture.dependencies);

    await expect(persistence.exportPdf('source.hwp')).resolves.toBeNull();

    expect(fixture.invoke).not.toHaveBeenCalled();
    expect(fixture.handlers.notifySaved).not.toHaveBeenCalled();
  });
});

function createFixture() {
  const invoke = vi.fn();
  const handlers: DesktopStudioHandlers = {
    loadFile: vi.fn(),
    pageCount: vi.fn().mockResolvedValue(2),
    getPageSvg: vi.fn().mockResolvedValue('<svg/>'),
    exportHwp: vi.fn().mockResolvedValue(new Uint8Array([7, 8, 9])),
    exportHwpx: vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
    notifySaved: vi.fn(),
  };
  const dependencies: DesktopHostDependencies = {
    invoke,
    chooseOpenPath: vi.fn().mockResolvedValue(null),
    chooseDocumentSavePath: vi.fn().mockResolvedValue(null),
    choosePdfSavePath: vi.fn().mockResolvedValue(null),
    resolveSaveDefaultPath: vi.fn(async (fileName) => `/documents/${fileName}`),
    showMessage: vi.fn().mockResolvedValue(true),
    readDocument: vi.fn(),
    writeDocument: vi.fn().mockResolvedValue(undefined),
    removeFile: vi.fn().mockResolvedValue(undefined),
    handlers: vi.fn().mockResolvedValue(handlers),
  };
  return { dependencies, handlers: handlers as MockedHandlers, invoke };
}

type MockedHandlers = {
  [Key in keyof DesktopStudioHandlers]: ReturnType<typeof vi.fn>;
};

function activeSession(overrides: Partial<ActiveDesktopSession> = {}): ActiveDesktopSession {
  return {
    docId: 'doc',
    fileName: 'source.hwpx',
    sourcePath: '/documents/source.hwpx',
    format: 'hwpx',
    revision: 1,
    dirty: false,
    warnings: [],
    ...overrides,
  };
}

function nativeSave(overrides: Record<string, unknown> = {}) {
  return {
    docId: 'doc',
    sourcePath: '/documents/source.hwpx',
    format: 'hwpx',
    revision: 2,
    dirty: false,
    warnings: [],
    ...overrides,
  };
}
