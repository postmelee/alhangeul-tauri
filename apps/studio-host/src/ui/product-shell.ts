import { isTauriRuntime } from '../core/platform';

interface TitleBridge {
  readonly fileName: string;
  hasLoadedDocument(): boolean;
  onFileNameChanged?: (fileName: string) => void;
}

export function installDocumentTitle(bridge: TitleBridge): void {
  // DesktopHost owns native session titles, including the dirty marker.
  if (isTauriRuntime()) return;
  const appModes = window.matchMedia(
    '(display-mode: standalone), (display-mode: minimal-ui), (display-mode: window-controls-overlay)',
  );
  const update = () => {
    document.title = bridge.hasLoadedDocument()
      ? (appModes.matches ? bridge.fileName : `${bridge.fileName} - Alhangeul`)
      : 'Alhangeul';
  };
  bridge.onFileNameChanged = update;
  appModes.addEventListener('change', update);
  update();
}

export function applyProductAccessibleName(locale: 'ko' | 'en', root: ParentNode = document): void {
  const labels = root.querySelectorAll<HTMLElement>('[data-i18n="ui.studioHeader.srLabel"]');
  if (labels.length !== 1) throw new Error('upstream product accessible label must exist exactly once');
  labels[0].textContent = locale === 'en' ? 'Alhangeul document editor' : 'Alhangeul 문서 편집기';
}
