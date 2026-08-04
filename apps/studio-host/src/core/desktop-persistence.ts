import type { DesktopStudioHandlers } from '../embed/desktop-runtime';
import type { DesktopHostDependencies } from './desktop-host-dependencies';
import type {
  ActiveDesktopSession,
  DesktopDocumentFormat,
  NativeDocumentState,
} from './desktop-session';

interface NativeSaveResult extends Omit<NativeDocumentState, 'fileName'> {}

export interface PdfExportResult {
  path: string;
  pageCount: number;
  textMode: 'searchable' | 'outlined-fallback';
  warning?: string | null;
}

interface SourceSaveResult {
  state: NativeDocumentState;
  handlers: DesktopStudioHandlers;
}

export class DesktopPersistence {
  constructor(private readonly dependencies: DesktopHostDependencies) {}

  async saveSource(
    active: Readonly<ActiveDesktopSession>,
    requestedFormat = active.format,
    forceSaveAs = false,
  ): Promise<SourceSaveResult | null> {
    let targetPath = active.sourcePath;
    if (forceSaveAs || !targetPath || requestedFormat !== active.format) {
      const selected = await this.dependencies.chooseDocumentSavePath(
        suggestedDocumentName(active.fileName, requestedFormat),
        requestedFormat,
      );
      if (!selected) return null;
      targetPath = withExtension(selected, requestedFormat);
    }

    const allowExternalOverwrite = await this.confirmExternalOverwrite(active.docId, targetPath);
    if (allowExternalOverwrite === null) return null;
    const stagedPath = await this.invoke<string>('prepare_staged_document_save', {
      targetPath,
      format: requestedFormat,
    });
    try {
      const handlers = await this.dependencies.handlers();
      const bytes = requestedFormat === 'hwpx'
        ? await handlers.exportHwpx()
        : await handlers.exportHwp();
      await this.dependencies.writeDocument(stagedPath, bytes);
      const result = await this.invoke<NativeSaveResult>('commit_staged_document_save', {
        docId: active.docId,
        stagedPath,
        targetPath,
        format: requestedFormat,
        expectedRevision: active.revision,
        allowExternalOverwrite,
      });
      return {
        state: { ...result, fileName: fileNameFromPath(targetPath) },
        handlers,
      };
    } finally {
      await this.dependencies.removeFile(stagedPath).catch(() => undefined);
    }
  }

  async exportPdf(fileName: string): Promise<PdfExportResult | null> {
    const handlers = await this.dependencies.handlers();
    const pageCount = await handlers.pageCount();
    if (!Number.isSafeInteger(pageCount) || pageCount <= 0) {
      throw new Error('PDF로 저장할 페이지가 없습니다');
    }
    const selected = await this.dependencies.choosePdfSavePath(suggestedPdfName(fileName));
    if (!selected) return null;
    const targetPath = withExtension(selected, 'pdf');
    let jobId: string | null = await this.invoke<string>('begin_pdf_export', {
      targetPath,
      pageCount,
    });
    try {
      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        const svg = await handlers.getPageSvg(pageIndex);
        await this.invoke<void>('append_pdf_page', { jobId, pageIndex, svg });
      }
      const result = await this.invoke<PdfExportResult>('commit_pdf_export', { jobId });
      jobId = null;
      if (result.textMode === 'outlined-fallback') {
        await this.dependencies.showMessage(
          result.warning ?? '검색 가능한 텍스트 변환에 실패해 글자 윤곽선으로 저장했습니다.',
          { title: 'PDF 저장 경고', kind: 'warning' },
        );
      }
      return result;
    } finally {
      if (jobId) {
        await this.invoke<void>('abort_pdf_export', { jobId }).catch(() => undefined);
      }
    }
  }

  private async confirmExternalOverwrite(
    docId: string,
    targetPath: string,
  ): Promise<boolean | null> {
    const status = await this.invoke<{
      changed: boolean;
      sourcePath?: string | null;
      reason?: string | null;
    }>('check_external_modification', { docId, targetPath });
    if (!status.changed) return false;
    const result = await this.dependencies.showMessage(
      [
        '원본 파일이 Alhangeul 밖에서 변경되었습니다.',
        status.sourcePath ? `파일: ${status.sourcePath}` : '',
        status.reason ?? '',
        '그대로 저장하면 외부에서 변경된 내용이 사라질 수 있습니다.',
      ].filter(Boolean).join('\n'),
      {
        title: '외부 변경 감지',
        kind: 'warning',
        buttons: { yes: '덮어쓰기', no: '저장 취소', cancel: '취소' },
      },
    );
    return result === '덮어쓰기' || result === 'Yes' ? true : null;
  }

  private invoke<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
    return this.dependencies.invoke(command, args) as Promise<T>;
  }
}

function suggestedDocumentName(fileName: string, format: DesktopDocumentFormat): string {
  return `${documentStem(fileName) || 'document'}.${format}`;
}

function suggestedPdfName(fileName: string): string {
  return `${documentStem(fileName) || 'document'}.pdf`;
}

function documentStem(fileName: string): string {
  return fileName.replace(/\.(hwp|hwpx)$/i, '');
}

function withExtension(path: string, extension: DesktopDocumentFormat | 'pdf'): string {
  if (new RegExp(`\\.${extension}$`, 'i').test(path)) return path;
  return `${path.replace(/\.(hwp|hwpx|pdf)$/i, '')}.${extension}`;
}

function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() || 'document.hwp';
}
