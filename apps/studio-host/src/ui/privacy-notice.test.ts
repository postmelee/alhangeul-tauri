import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const show = vi.hoisted(() => vi.fn());
const preferences = vi.hoisted(() => vi.fn());
vi.mock('./update-preferences', () => ({ createUpdatePreferences: preferences }));
vi.mock('@upstream/ui/dialog', () => ({
  ModalDialog: class {
    afterClose?: () => void;
    dialog = { classList: { add() {} }, setAttribute() {}, querySelector: () => ({ replaceChildren() {} }) };
    show() { show(); }
    hide() { this.afterClose?.(); }
  },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal('document', { createElement: () => ({ addEventListener() {}, focus() {} }) });
});
afterEach(() => vi.unstubAllGlobals());

it('shows a locally bundled notice once and records display without changing update consent', async () => {
  const stored = new Map<string, string>();
  const setItem = vi.fn((key, value) => stored.set(key, value));
  vi.stubGlobal('localStorage', { getItem: (key: string) => stored.get(key), setItem });
  const { showFirstRunPrivacyNotice } = await import('./privacy-notice');
  showFirstRunPrivacyNotice();
  showFirstRunPrivacyNotice();
  expect(show).toHaveBeenCalledOnce();
  expect(setItem.mock.calls).toEqual([['alhangeul-privacy-notice-v1', 'shown']]);
});

it('allows reopening a previously shown notice from product information', async () => {
  vi.stubGlobal('localStorage', { getItem: () => 'shown', setItem() {} });
  const { showFirstRunPrivacyNotice, showPrivacyNotice } = await import('./privacy-notice');
  showFirstRunPrivacyNotice();
  expect(show).not.toHaveBeenCalled();
  showPrivacyNotice();
  expect(show).toHaveBeenCalledOnce();
});

it('still shows the notice when local storage is inaccessible', async () => {
  vi.stubGlobal('localStorage', {
    getItem() { throw new Error('unavailable'); },
    setItem() { throw new Error('unavailable'); },
  });
  const { showFirstRunPrivacyNotice } = await import('./privacy-notice');
  expect(showFirstRunPrivacyNotice).not.toThrow();
  expect(show).toHaveBeenCalledOnce();
});
