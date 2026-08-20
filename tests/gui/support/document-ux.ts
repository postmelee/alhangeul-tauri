export const GUI_SELECTORS = {
  documentCanvas: '#scroll-content > canvas[data-rhwp-rendered-zoom]',
  fileInput: '#file-input',
  menuTitles: '#menu-bar .menu-title',
  modalButtons: '.dialog-footer .dialog-btn',
  modalOverlay: '.modal-overlay',
  modalTitle: '.dialog-title',
  pageIndicator: '#sb-page',
  root: '#studio-root',
  scrollContainer: '#scroll-container',
  statusMessage: '#sb-message',
  toolbarHeaderFooter: '.tb-headerfooter-group',
  toolbarNote: '.tb-note-group',
  toolbarRotate: '.tb-rotate-group',
} as const;

export type NativeDocumentCommand =
  | 'file:save'
  | 'file:save-as'
  | 'file:save-as-hwp'
  | 'file:save-as-hwpx';

export interface PageIndicator {
  current: number;
  total: number;
}

export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DocumentStateSnapshot {
  title: string;
  page: PageIndicator;
  status: string;
}

export interface NativeDialogAdapter {
  complete(
    command: NativeDocumentCommand,
    trigger: () => Promise<void>,
  ): Promise<void>;
}

export interface NativeDocumentCommandHooks {
  capture(): Promise<DocumentStateSnapshot>;
  trigger(command: NativeDocumentCommand): Promise<void>;
}

export function parsePageIndicator(text: string): PageIndicator {
  const match = text.trim().match(/^(\d+)\s*\/\s*(\d+)\s*쪽$/);
  if (!match) throw new Error(`쪽 수 표시를 해석할 수 없습니다: ${text}`);
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (current < 1 || total < current) throw new Error(`쪽 수 표시가 유효하지 않습니다: ${text}`);
  return { current, total };
}

export function centeredDelta(container: ViewRect, document: ViewRect): number {
  const containerCenter = container.x + container.width / 2;
  const documentCenter = document.x + document.width / 2;
  return Math.abs(containerCenter - documentCenter);
}

export async function runNativeDocumentCommand(
  command: NativeDocumentCommand,
  adapter: NativeDialogAdapter,
  hooks: NativeDocumentCommandHooks,
): Promise<{ before: DocumentStateSnapshot; after: DocumentStateSnapshot }> {
  const before = await hooks.capture();
  await adapter.complete(command, () => hooks.trigger(command));
  const after = await hooks.capture();
  return { before, after };
}
