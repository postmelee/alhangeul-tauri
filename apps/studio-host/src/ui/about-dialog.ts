import { AboutDialog as UpstreamAboutDialog } from '@upstream/ui/about-dialog';
import { isTauriRuntime } from '../core/platform';
import { showUpdateDialog } from './update-dialog';
import { thumbnailDiagnosticsAvailable } from '../core/desktop-thumbnail-diagnostics';

export class AboutDialog extends UpstreamAboutDialog {
  protected override createBody(): HTMLElement {
    const body = super.createBody();
    const version = body.querySelector('.about-version');

    const alhangeulVersion = document.createElement('div');
    alhangeulVersion.className = 'about-alhangeul-version';
    alhangeulVersion.textContent = `Alhangeul ${__ALHANGEUL_VERSION__}`;

    if (version?.parentNode) {
      version.parentNode.insertBefore(alhangeulVersion, version.nextSibling);
    } else {
      body.appendChild(alhangeulVersion);
    }

    if (isTauriRuntime()) {
      const updateButton = document.createElement('button');
      updateButton.className = 'dialog-btn about-update-button';
      updateButton.textContent = '업데이트 확인…';
      updateButton.addEventListener('click', () => {
        void showUpdateDialog().catch((error) => {
          console.error('[desktop-updater] dialog failed:', error);
        });
      });
      alhangeulVersion.insertAdjacentElement('afterend', updateButton);
    }

    if (thumbnailDiagnosticsAvailable()) {
      const button = document.createElement('button');
      button.className = 'dialog-btn about-thumbnail-diagnostics-button';
      button.textContent = 'Windows 썸네일 진단…';
      button.addEventListener('click', () => {
        this.hide();
        void import('./thumbnail-diagnostics-dialog')
          .then(({ showThumbnailDiagnosticsDialog }) => showThumbnailDiagnosticsDialog())
          .catch(() => {
            const status = document.getElementById('sb-message');
            if (status) status.textContent = '썸네일 진단 창을 열지 못했습니다. 다시 시도하세요.';
          });
      });
      body.appendChild(button);
    }
    return body;
  }
}
