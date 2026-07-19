import { AboutDialog as UpstreamAboutDialog } from '@upstream/ui/about-dialog';

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

    return body;
  }
}
