import {
  appendPrintStyle,
  appendSvgPage,
  buildPrintStyleText,
  createPrintPage,
  pdfPrintTitle,
  printProgressText,
  type PrintPage,
} from '@upstream/command/print-pages';
import {
  createPrintSurface,
  waitForPrintSurfaceReady,
  type PrintSurface,
} from '@upstream/command/print-surface';
import type { CommandServices } from '@upstream/command/types';

let printJobActive = false;

export async function printDirectlyFromPageSurface(
  services: CommandServices,
): Promise<void | null> {
  if (printJobActive) {
    setStatus('인쇄 문서를 준비하고 있습니다.');
    return null;
  }
  printJobActive = true;

  const { wasm } = services;
  let surface: PrintSurface | null = null;
  let originalDocumentTitle: string | null = null;

  try {
    flushDeferredPagination(services);
    const pageCount = wasm.pageCount;
    if (pageCount === 0) return;

    setStatus(printProgressText('print', 0, pageCount));
    surface = await createPrintSurface();
    const printPages = await preparePrintPages(services, pageCount);
    setupPrintDocument(surface.document, wasm.fileName, printPages);
    await waitForPrintSurfaceReady(surface);

    setStatus('시스템 인쇄 대화상자 여는 중...');
    originalDocumentTitle = document.title;
    document.title = pdfPrintTitle(wasm.fileName);
    console.info(
      `[file:print] 시스템 인쇄 호출 `
      + `(surface=iframe, pages=${pageCount}, profile=print)`,
    );
    surface.window.print();
  } finally {
    if (originalDocumentTitle !== null) {
      document.title = originalDocumentTitle;
    }
    surface?.dispose();
    printJobActive = false;
  }
}

function flushDeferredPagination(services: CommandServices): void {
  const inputHandler = services.getInputHandler();
  if (!inputHandler) return;
  inputHandler.flushDeferredPaginationIfNeeded('print');
  if (inputHandler.hasDeferredPaginationPending()) {
    throw new Error('출력 전 페이지네이션을 완료하지 못했습니다 (print)');
  }
}

async function preparePrintPages(
  services: CommandServices,
  pageCount: number,
): Promise<PrintPage[]> {
  const pages: PrintPage[] = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    setStatus(printProgressText('print', pageIndex + 1, pageCount));
    pages.push(createPrintPage(
      services.wasm.renderPageSvgWithProfile(pageIndex, 'print'),
      services.wasm.getPageInfo(pageIndex),
      pageIndex,
    ));
    if (pageIndex % 5 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  return pages;
}

function setupPrintDocument(
  target: Document,
  fileName: string,
  pages: PrintPage[],
): void {
  target.documentElement.lang = 'ko';
  target.title = pdfPrintTitle(fileName);
  applyPrintStyle(target, pages);

  target.body.replaceChildren();
  target.body.className = '';
  for (const page of pages) {
    appendSvgPage(target, target.body, page);
  }
}

function applyPrintStyle(target: Document, pages: PrintPage[]): void {
  const bundledStyle = target.head.querySelector('style');
  if (bundledStyle) {
    // Tauri가 print.html의 정적 style에 부여한 CSP nonce를 유지한다.
    bundledStyle.textContent = buildPrintStyleText(pages);
    return;
  }
  appendPrintStyle(target, pages);
}

function setStatus(message: string): void {
  const status = typeof document === 'undefined' ? null : document.getElementById('sb-message');
  if (status) status.textContent = message;
}
