import { createThumbnailDiagnosticsController, type ThumbnailDiagnosticsController } from '../core/desktop-thumbnail-diagnostics';
import { active, offerMsi, type DiagnosticView } from '../core/desktop-thumbnail-diagnostics-model';
import { diagnosticSummary } from '../core/desktop-thumbnail-diagnostics-summary';
import { paragraph, renderDiagnosticResults } from './thumbnail-diagnostics-results';
import { presentation } from './thumbnail-diagnostics-presentation';

let activeDialog: ThumbnailDiagnosticsDialog | null = null;
let opening = false;

export async function showThumbnailDiagnosticsDialog(): Promise<void> {
  if (opening || activeDialog) return;
  opening = true;
  try {
    const controller = await createThumbnailDiagnosticsController();
    if (!controller) return;
    activeDialog = new ThumbnailDiagnosticsDialog(controller);
    activeDialog.afterClose = () => { activeDialog = null; };
    activeDialog.show();
  } finally { opening = false; }
}

/** Native dialog supplies modal focus containment/Tab without upstream's
 * editor keyboard capture swallowing Tab/Space. No upstream code is changed. */
export class ThumbnailDiagnosticsDialog {
  afterClose?: () => void;
  private dialog = document.createElement('dialog');
  private status = document.createElement('div');
  private privacy = document.createElement('section');
  private results = document.createElement('div');
  private notice = document.createElement('p');
  private fallback = document.createElement('textarea');
  private start = this.button('동의하고 검사', () => { void this.controller.start(true); });
  private cancel = this.button('검사 취소', () => { void this.controller.cancel(); });
  private copy = this.button('진단 요약 복사', () => { void this.copySummary(); });
  private instructions = this.button('공식 설치 안내 열기', () => { void this.openInstructions(); });
  private close = this.button('닫기', () => this.hide());
  private unsubscribe: (() => void) | null = null;
  private previousFocus: HTMLElement | null = null;
  private closed = false;
  private renderKey = '';

  constructor(private readonly controller: ThumbnailDiagnosticsController) {
    this.dialog.className = 'thumbnail-diagnostics-dialog';
    this.dialog.setAttribute('aria-label', 'Windows 썸네일 진단');
    const header = document.createElement('header');
    header.className = 'thumbnail-diagnostics-header';
    paragraph(header, 'Alhangeul · Windows 썸네일 진단');
    this.status.className = 'thumbnail-diagnostics-status';
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    this.notice.setAttribute('role', 'status');
    this.fallback.readOnly = true;
    this.fallback.hidden = true;
    this.fallback.setAttribute('aria-label', '수동 복사용 정제된 진단 요약');
    const body = document.createElement('div');
    body.className = 'thumbnail-diagnostics-body';
    this.privacy.className = 'thumbnail-privacy';
    const privacyTitle = document.createElement('h3');
    privacyTitle.textContent = '개인 문서는 열지 않아요';
    this.privacy.append(privacyTitle);
    paragraph(this.privacy, '공개 테스트 문서만 사용합니다. 결과는 자동 전송되지 않으며, 시스템 설정이나 파일 연결을 변경하지 않습니다.');
    paragraph(this.privacy, '검사 중 임시 파일과 Windows 썸네일 캐시가 생성될 수 있습니다. 최대 3분이 걸리며, 이후 임시 파일을 정리합니다.').className = 'thumbnail-muted';
    body.append(this.status, this.privacy, this.results, this.notice, this.fallback);
    const actions = document.createElement('div');
    actions.className = 'thumbnail-diagnostics-actions';
    actions.append(this.copy, this.cancel, this.close, this.start, this.instructions);
    this.dialog.append(header, body, actions);
    this.dialog.addEventListener('cancel', (event) => { event.preventDefault(); this.hide(); });
    this.dialog.addEventListener('close', () => this.hide());
  }
  show(): void {
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.appendChild(this.dialog);
    this.unsubscribe = this.controller.subscribe((view) => this.render(view));
    this.dialog.showModal();
    void this.controller.connect();
  }
  hide(): void {
    if (this.closed) return;
    this.closed = true;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.controller.dispose();
    this.dialog.close();
    this.dialog.remove();
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
    this.afterClose?.();
  }
  private render(view: DiagnosticView): void {
    const key = `${view.phase}:${view.error}:${view.snapshot?.requestId}:${view.snapshot?.sequence}`;
    if (key === this.renderKey) return;
    this.renderKey = key;
    const focused = document.activeElement;
    const info = presentation(view);
    const heading = document.createElement('h2');
    heading.textContent = info.title;
    this.status.replaceChildren(heading);
    paragraph(this.status, info.description);
    this.status.dataset.tone = info.tone;
    this.privacy.hidden = !['connecting', 'ready'].includes(view.phase);
    this.start.hidden = !['connecting', 'ready'].includes(view.phase);
    this.start.disabled = view.phase !== 'ready';
    this.cancel.hidden = !['running', 'cancelling'].includes(view.phase);
    this.cancel.disabled = view.phase !== 'running';
    this.copy.hidden = ['connecting', 'ready', 'running', 'cancelling'].includes(view.phase);
    this.copy.disabled = !view.snapshot?.result || active(view.snapshot);
    this.instructions.hidden = !offerMsi(view.snapshot) || view.phase !== 'completed';
    this.start.dataset.primary = 'true';
    this.instructions.dataset.primary = 'true';
    this.close.dataset.primary = String(this.start.hidden && this.instructions.hidden);
    renderDiagnosticResults(this.results, view);
    if (focused instanceof HTMLButtonElement && this.dialog.contains(focused) && (focused.hidden || focused.disabled)) {
      const target = [this.instructions, this.start, this.cancel, this.close].find((button) => !button.hidden && !button.disabled);
      target?.focus({ preventScroll: true });
    }
  }
  private button(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dialog-btn';
    button.textContent = label;
    button.addEventListener('click', action);
    return button;
  }
  private async copySummary(): Promise<void> {
    const snapshot = this.controller.current().snapshot;
    if (!snapshot?.result || active(snapshot)) return;
    const text = diagnosticSummary(snapshot);
    try {
      await navigator.clipboard.writeText(text);
      if (!this.closed) {
        this.notice.textContent = '개인 경로·문서 내용을 제외한 진단 요약을 복사했습니다.';
        this.notice.scrollIntoView({ block: 'nearest' });
      }
    } catch {
      if (this.closed) return;
      this.notice.textContent = '자동 복사를 사용할 수 없습니다. 아래 요약을 선택해 직접 복사하세요.';
      this.fallback.value = text;
      this.fallback.hidden = false;
      this.fallback.focus();
      this.fallback.select();
    }
  }
  private async openInstructions(): Promise<void> {
    if (!offerMsi(this.controller.current().snapshot)) return;
    const opened = await this.controller.openInstructions();
    if (!this.closed && !opened) {
      this.notice.textContent = '안내 페이지를 열지 못했습니다. 위의 로컬 안내를 참고하고 신뢰 가능한 배포본 또는 IT 담당자에게 문의하세요.';
      this.notice.scrollIntoView({ block: 'nearest' });
    }
  }
}
