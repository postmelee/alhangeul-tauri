import { browser, $$ } from '@wdio/globals';

export async function readDomText(selector: string): Promise<string> {
  return browser.execute((target) => (
    document.querySelector(target)?.textContent?.trim() ?? ''
  ), selector);
}

export async function readAppWindowBounds() {
  const result = await browser.execute(() => ({
    x: Math.max(0, Math.round(window.screenX)),
    y: Math.max(0, Math.round(window.screenY)),
    width: Math.round(window.outerWidth),
    height: Math.round(window.outerHeight),
  }));
  if (result.width < 100 || result.height < 100) {
    throw new Error('app window bounds가 유효하지 않습니다');
  }
  return result;
}

export async function clickVisibleDomElement(selector: string): Promise<void> {
  const clicked = await browser.execute((target) => {
    const element = document.querySelector<HTMLElement>(target);
    if (!element) return false;
    const style = window.getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    if (
      style.display === 'none'
      || style.visibility === 'hidden'
      || style.visibility === 'collapse'
      || style.opacity === '0'
      || bounds.width <= 0
      || bounds.height <= 0
    ) return false;
    element.click();
    return true;
  }, selector);
  if (!clicked) throw new Error(`표시된 DOM element를 찾을 수 없습니다: ${selector}`);
}

export async function openDomMenu(selector: string, timeoutMs: number): Promise<void> {
  await browser.waitUntil(async () => browser.execute((target) => {
      const title = document.querySelector<HTMLElement>(target);
      if (!title) return false;
      const style = window.getComputedStyle(title);
      const bounds = title.getBoundingClientRect();
      if (
        style.display === 'none'
        || style.visibility === 'hidden'
        || style.visibility === 'collapse'
        || style.opacity === '0'
        || bounds.width <= 0
        || bounds.height <= 0
      ) return false;
      title.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        button: 0,
        view: window,
      }));
      return title.closest('.menu-item')?.classList.contains('open') ?? false;
    }, selector), {
    timeout: timeoutMs,
    timeoutMsg: `DOM menu를 열 수 없습니다: ${selector}`,
  });
}

export async function dismissLocalFontPrompt(): Promise<boolean> {
  const buttons = await $$('.modal-overlay .dialog-footer button');
  for (const button of buttons) {
    if ((await button.getText()).trim() !== '대체 글꼴로 보기') continue;
    if (!await button.isDisplayed()) continue;
    await button.click();
    return true;
  }
  return false;
}
