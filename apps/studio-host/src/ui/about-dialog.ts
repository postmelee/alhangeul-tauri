import { AboutDialog as UpstreamAboutDialog } from '@upstream/ui/about-dialog';
import { isTauriRuntime } from '../core/platform';
import { showUpdateDialog } from './update-dialog';

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

    return body;
  }
}
