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

export const INITIAL_DESKTOP_STATUS = 'HWP 파일을 선택해주세요.';

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

export async function readStudioStatus(
  session: WebdriverIO.Browser,
): Promise<string> {
  return session.execute((statusSelector) => (
    document.querySelector(statusSelector)?.textContent?.trim() ?? ''
  ), GUI_SELECTORS.statusMessage);
}

export async function readPageIndicator(
  session: WebdriverIO.Browser,
): Promise<PageIndicator> {
  const text = await session.execute((pageSelector) => (
    document.querySelector(pageSelector)?.textContent?.trim() ?? ''
  ), GUI_SELECTORS.pageIndicator);
  return parsePageIndicator(text);
}

export async function waitForInitialDesktopReady(
  session: WebdriverIO.Browser,
  timeoutMs: number,
): Promise<void> {
  await session.waitUntil(async () => {
    const state = await session.execute((statusSelector) => ({
      status: document.querySelector(statusSelector)?.textContent?.trim() ?? '',
      toolbarReady: document.documentElement.classList.contains('alhangeul-toolbar-ready'),
    }), GUI_SELECTORS.statusMessage);
    return state.status === INITIAL_DESKTOP_STATUS && state.toolbarReady;
  }, {
    timeout: timeoutMs,
    timeoutMsg: 'Studio 초기 file input listener가 준비되지 않았습니다',
  });
}

export async function resolveLocalFontDialog(
  session: WebdriverIO.Browser,
  displayName: string,
  timeoutMs: number,
): Promise<void> {
  await session.waitUntil(async () => {
    const overlay = await session.$(GUI_SELECTORS.modalOverlay);
    return (await readStudioStatus(session)).includes(displayName) || await overlay.isExisting();
  }, {
    timeout: timeoutMs,
    timeoutMsg: `${displayName} 문서 로드 선택 화면이 준비되지 않았습니다`,
  });

  const overlay = await session.$(GUI_SELECTORS.modalOverlay);
  if (!await overlay.isExisting()) return;
  const title = normalizeDialogTitle(await overlay.$(GUI_SELECTORS.modalTitle).getText());
  if (title !== '로컬 글꼴 감지') {
    throw new Error(`${displayName} 예상하지 않은 문서 로드 모달: ${title}`);
  }
  await clickExactDialogButton(session, '대체 글꼴로 보기', displayName);
  await waitForDialogGone(session, timeoutMs, displayName);
}

export async function confirmDroppedDocument(
  session: WebdriverIO.Browser,
  displayName: string,
  timeoutMs: number,
): Promise<void> {
  const overlay = await session.$(GUI_SELECTORS.modalOverlay);
  await overlay.waitForExist({ timeout: timeoutMs });
  const title = normalizeDialogTitle(await overlay.$(GUI_SELECTORS.modalTitle).getText());
  if (title !== '로컬 파일 열기 확인') {
    throw new Error(`${displayName} 예상하지 않은 drag-in 모달: ${title}`);
  }
  const body = await overlay.$('.dialog-body').getText();
  if (!body.includes(displayName)) {
    throw new Error(`drag-in 확인 모달이 대상 파일명을 포함하지 않습니다: ${displayName}`);
  }
  await clickExactDialogButton(session, '열기', displayName);
  await waitForDialogGone(session, timeoutMs, displayName);
}

export async function waitForLoadedDocument(
  session: WebdriverIO.Browser,
  displayName: string,
  pageCount: number | null,
  timeoutMs: number,
): Promise<void> {
  await resolveLocalFontDialog(session, displayName, timeoutMs);
  await session.waitUntil(async () => {
    const status = await readStudioStatus(session);
    if (!status.includes(displayName)) return false;
    const page = await readPageIndicator(session);
    return pageCount === null || page.total === pageCount;
  }, { timeout: timeoutMs, timeoutMsg: `${displayName} 문서 open이 완료되지 않았습니다` });
}

export async function captureDocumentState(
  session: WebdriverIO.Browser,
): Promise<DocumentStateSnapshot> {
  const state = await session.execute((statusSelector, pageSelector) => ({
    title: document.title,
    page: document.querySelector(pageSelector)?.textContent?.trim() ?? '',
    status: document.querySelector(statusSelector)?.textContent?.trim() ?? '',
  }), GUI_SELECTORS.statusMessage, GUI_SELECTORS.pageIndicator);
  return {
    title: state.title,
    page: parsePageIndicator(state.page),
    status: state.status,
  };
}

export async function captureStableDocumentState(
  session: WebdriverIO.Browser,
  timeoutMs: number,
): Promise<DocumentStateSnapshot> {
  await session.waitUntil(async () => {
    const status = await readStudioStatus(session);
    return status !== '' && !status.includes('중...');
  }, { timeout: timeoutMs, timeoutMsg: 'native command가 안정 상태로 돌아오지 않았습니다' });
  return captureDocumentState(session);
}

export async function waitForRestoredDocumentState(
  session: WebdriverIO.Browser,
  expected: DocumentStateSnapshot,
  timeoutMs: number,
): Promise<void> {
  await session.waitUntil(async () => {
    const current = await captureDocumentState(session);
    return current.title === expected.title
      && current.status === expected.status
      && current.page.current === expected.page.current
      && current.page.total === expected.page.total;
  }, { timeout: timeoutMs, timeoutMsg: 'system print 뒤 editor state가 복원되지 않았습니다' });
}

export async function waitForStudioStatus(
  session: WebdriverIO.Browser,
  expected: RegExp,
  timeoutMs: number,
): Promise<void> {
  await session.waitUntil(async () => expected.test(await readStudioStatus(session)), {
    timeout: timeoutMs,
    timeoutMsg: `${expected} status를 확인하지 못했습니다`,
  });
}

function normalizeDialogTitle(title: string): string {
  return title.replace(/\s*×\s*$/, '');
}

async function clickExactDialogButton(
  session: WebdriverIO.Browser,
  label: string,
  context: string,
): Promise<void> {
  const overlay = await session.$(GUI_SELECTORS.modalOverlay);
  const buttons = await overlay.$$(GUI_SELECTORS.modalButtons);
  for (const button of buttons) {
    if (await button.getText() === label) {
      await button.click();
      return;
    }
  }
  throw new Error(`${context} ${label} 버튼을 찾을 수 없습니다`);
}

async function waitForDialogGone(
  session: WebdriverIO.Browser,
  timeoutMs: number,
  context: string,
): Promise<void> {
  await session.waitUntil(async () => (
    !await session.$(GUI_SELECTORS.modalOverlay).isExisting()
  ), { timeout: timeoutMs, timeoutMsg: `${context} 선택 모달이 닫히지 않았습니다` });
}
