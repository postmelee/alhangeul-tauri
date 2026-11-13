import { ModalDialog } from '@upstream/ui/dialog';
import notice from '../../../desktop/src-tauri/resources/install-privacy.txt?raw';
import { createUpdatePreferences } from './update-preferences';

const NOTICE_KEY = 'alhangeul-privacy-notice-v1';
let active: PrivacyNotice | null = null;

export function showFirstRunPrivacyNotice(): void {
  try {
    if (localStorage.getItem(NOTICE_KEY) === 'shown') return;
  } catch { /* An unavailable local store must not suppress the notice. */ }
  showPrivacyNotice();
}

export function showPrivacyNotice(): void {
  if (active) return;
  active = new PrivacyNotice();
  active.afterClose = () => { active = null; };
  active.show();
}

class PrivacyNotice extends ModalDialog {
  constructor() { super('Alhangeul 개인정보 안내', 660); }

  protected createBody(): HTMLElement {
    const body = document.createElement('div');
    const text = document.createElement('pre');
    text.className = 'privacy-notice-text';
    text.tabIndex = 0;
    text.textContent = notice;
    body.append(text, createUpdatePreferences());
    return body;
  }

  protected onConfirm(): void {}

  override show(): void {
    super.show();
    this.dialog.classList.add('privacy-notice-dialog');
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-modal', 'true');
    this.dialog.setAttribute('aria-label', 'Alhangeul 개인정보 안내');
    const close = document.createElement('button');
    close.className = 'dialog-btn dialog-btn-primary';
    close.textContent = '안내 닫기';
    close.addEventListener('click', () => this.hide());
    this.dialog.querySelector('.dialog-footer')?.replaceChildren(close);
    close.focus();
    // Records display only, never consent or authorization for a network request.
    try { localStorage.setItem(NOTICE_KEY, 'shown'); } catch { /* Show again next time. */ }
  }
}
