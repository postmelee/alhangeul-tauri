import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createUpdatePreferences } from './update-preferences';
const invoke = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke }));
class Element extends EventTarget {
  children: Element[] = [];
  textContent = '';
  checked = false;
  disabled = false;
  dataset: Record<string, string> = {};
  constructor(readonly tag: string) { super(); }
  append(...children: Element[]): void { this.children.push(...children); }
  setAttribute(): void {}
}
beforeEach(() => {
  invoke.mockReset();
  vi.stubGlobal('document', {
    createElement: (tag: string) => new Element(tag),
    createTextNode: (text: string) => Object.assign(new Element('text'), { textContent: text }),
  });
});
afterEach(() => vi.unstubAllGlobals());
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
function controls() {
  const body = createUpdatePreferences() as unknown as Element;
  return { checkbox: body.children[1].children[0], status: body.children[3] };
}
it('loads disabled preference without issuing a check or changing the choice', async () => {
  invoke.mockResolvedValue(false);
  const { checkbox, status } = controls();
  expect(checkbox.disabled).toBe(true);
  await settle();
  expect(checkbox.checked).toBe(false);
  expect(checkbox.disabled).toBe(false);
  expect(status.textContent).toContain('꺼져');
  expect(invoke.mock.calls).toEqual([['updater_get_automatic_checks']]);
});
it('persists an explicit choice without starting a network check', async () => {
  invoke.mockResolvedValueOnce(false).mockResolvedValueOnce(undefined);
  const { checkbox, status } = controls();
  await settle();
  checkbox.checked = true;
  checkbox.dispatchEvent(new Event('change'));
  await settle();
  expect(invoke.mock.calls[1]).toEqual(['updater_set_automatic_checks', { enabled: true }]);
  expect(invoke).toHaveBeenCalledTimes(2);
  expect(status.textContent).toContain('다음 실행부터');
});
it('reports write failure and restores the displayed previous choice', async () => {
  invoke.mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('private path'));
  const { checkbox, status } = controls();
  await settle();
  checkbox.checked = false;
  checkbox.dispatchEvent(new Event('change'));
  await settle();
  expect(checkbox.checked).toBe(true);
  expect(status.textContent).toContain('저장하지 못했습니다');
  expect(status.textContent).not.toContain('private path');
});
