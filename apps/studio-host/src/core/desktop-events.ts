import type { CommandDispatcher } from '@upstream/command/dispatcher';
import type { DesktopHost } from './desktop-host';
import { findLatestSupportedDocumentPath, hasSupportedDocumentPath } from './document-files';
import { ensureDesktopUpdater } from './desktop-updater';
import { detectDesktopPlatform, isTauriRuntime } from './platform';
import { installWindowsWheelZoomReroute } from './windows-wheel-zoom';

type DesktopEventHost = Pick<
  DesktopHost,
  | 'openDocumentByPath'
  | 'takePendingOpenPaths'
  | 'confirmWindowClose'
  | 'destroyCurrentWindow'
>;

interface DesktopEventsOptions {
  host: DesktopEventHost;
  dispatcher: Pick<CommandDispatcher, 'dispatch'>;
  setMessage(message: string): void;
}

interface CloseRequestEvent {
  preventDefault(): void;
}

const setupByHost = new WeakMap<object, Promise<void>>();

export function ensureDesktopEvents(options: DesktopEventsOptions): Promise<void> {
  const key = options.host as object;
  const existing = setupByHost.get(key);
  if (existing) return existing;
  const pending = setupDesktopEvents(options);
  setupByHost.set(key, pending);
  return pending;
}

export async function setupDesktopEvents({
  host,
  dispatcher,
  setMessage,
}: DesktopEventsOptions): Promise<void> {
  if (!isTauriRuntime()) return;
  await ensureDesktopUpdater(setMessage).catch((error) => {
    console.error('[desktop-updater] setup failed:', error);
  });
  const { listen } = await import('@tauri-apps/api/event');
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const currentWindow = getCurrentWebviewWindow();
  if (detectDesktopPlatform() === 'windows') installWindowsWheelZoomReroute();

  await listen('alhangeul-job-progress', (event) => {
    const payload = event.payload as { message?: string };
    if (payload?.message) setMessage(payload.message);
  });
  await currentWindow.listen('alhangeul-menu-command', (event) => {
    const command = String(event.payload || '');
    if (command) dispatcher.dispatch(command);
  });
  await currentWindow.listen('alhangeul-open-paths', async (event) => {
    const payload = event.payload as { paths?: string[] };
    const pending = await host.takePendingOpenPaths();
    await openLatestDesktopDocument(host, [...(payload.paths ?? []), ...pending], setMessage);
  });
  await currentWindow.listen('tauri://drag-enter', (event) => {
    const payload = event.payload as { paths?: string[] };
    if (!hasSupportedDocumentPath(payload.paths ?? [])) return;
    setDesktopDragActive(true);
    setMessage('HWP/HWPX 파일을 놓으면 문서를 엽니다');
  });
  await currentWindow.listen('tauri://drag-leave', () => setDesktopDragActive(false));
  await currentWindow.listen('tauri://drag-drop', () => setDesktopDragActive(false));
  await currentWindow.onCloseRequested(async (event) => {
    await handleDesktopCloseRequest(event, host, setMessage);
  });

  await openLatestDesktopDocument(host, await host.takePendingOpenPaths(), setMessage);
}

async function handleDesktopCloseRequest(
  event: CloseRequestEvent,
  host: DesktopEventHost,
  setMessage: (message: string) => void,
): Promise<void> {
  event.preventDefault();
  try {
    if (await host.confirmWindowClose()) await host.destroyCurrentWindow();
  } catch (error) {
    console.error('[desktop-events] close request failed:', error);
    setMessage(`창 닫기 실패: ${error}`);
  }
}

function setDesktopDragActive(active: boolean): void {
  document.getElementById('scroll-container')?.classList.toggle('drag-over', active);
}

async function openLatestDesktopDocument(
  host: DesktopEventHost,
  paths: string[],
  setMessage: (message: string) => void,
): Promise<void> {
  const path = findLatestSupportedDocumentPath(Array.from(new Set(paths)));
  if (!path) {
    if (paths.length > 0) setMessage('HWP/HWPX 파일만 열 수 있습니다');
    return;
  }
  try {
    setMessage('파일 로딩 중...');
    const loaded = await host.openDocumentByPath(path);
    if (loaded) setMessage(`${loaded.fileName} — ${loaded.pageCount}페이지`);
  } catch (error) {
    setMessage(`파일 로드 실패: ${error}`);
    console.error('[desktop-events] 데스크톱 파일 로드 실패:', error);
  }
}
