import { spawnSync } from 'node:child_process';
import { browser } from '@wdio/globals';
import {
  clickVisibleDomElement,
  openDomMenu,
} from './webdriver-dom.ts';

export function createNativeCommandDriver(timeoutMs: number) {
  const boundedTimeout = Math.min(timeoutMs, 120000);
  async function trigger(command: string): Promise<void> {
    await openDomMenu('#menu-bar .menu-title', boundedTimeout);
    const selector = `.md-item[data-cmd="${command}"]`;
    await clickVisibleDomElement(selector);
  }
  function runSystemPrint(
    action: (dialogTrigger: () => Promise<void>) => Promise<void>,
  ): Promise<void> {
    return action(sendTrustedPrintShortcut);
  }
  return { trigger, runSystemPrint };
}

async function sendTrustedPrintShortcut(): Promise<void> {
  const options = { encoding: 'utf8' as const, env: process.env, timeout: 5000 };
  const search = spawnSync('xdotool', [
    'search', '--onlyvisible', '--name', '^Alhangeul$',
  ], options);
  const windowIds = String(search.stdout ?? '').trim().split(/\s+/).filter(Boolean);
  const activeBefore = spawnSync('xdotool', ['getactivewindow'], options);
  const activeWindowId = String(activeBefore.stdout ?? '').trim();
  const selectedWindowId = windowIds.length === 1
    ? windowIds[0]
    : (windowIds.includes(activeWindowId) ? activeWindowId : '');
  if (search.status !== 0 || activeBefore.status !== 0
      || !/^\d+$/.test(selectedWindowId)) {
    throw new Error(
      `현재 활성 Alhangeul X11 window를 고유하게 식별할 수 없습니다: ${windowIds.length}`,
    );
  }
  const activate = spawnSync('xdotool', ['windowactivate', '--sync', selectedWindowId], options);
  const active = spawnSync('xdotool', ['getactivewindow'], options);
  if (activate.status !== 0 || active.status !== 0
      || String(active.stdout ?? '').trim() !== selectedWindowId) {
    throw new Error('Alhangeul X11 window를 활성화하지 못했습니다');
  }
  const geometry = spawnSync(
    'xdotool', ['getwindowgeometry', '--shell', selectedWindowId], options,
  );
  const dimensions = String(geometry.stdout ?? '').match(
    /^WIDTH=(\d+)$[\s\S]*^HEIGHT=(\d+)$/m,
  );
  if (geometry.status !== 0 || !dimensions
      || Number(dimensions[1]) < 100 || Number(dimensions[2]) < 100) {
    throw new Error('Alhangeul X11 window geometry를 읽을 수 없습니다');
  }
  const focus = spawnSync('xdotool', [
    'mousemove', '--window', selectedWindowId,
    String(Math.floor(Number(dimensions[1]) / 2)),
    String(Math.floor(Number(dimensions[2]) / 2)),
    'click', '1',
  ], options);
  if (focus.status !== 0) throw new Error('trusted X11 editor focus click에 실패했습니다');
  await browser.waitUntil(async () => browser.execute(() => (
    document.activeElement?.getAttribute('aria-label') === '문서 편집 입력'
  )), { timeout: 5000, timeoutMsg: 'trusted click 뒤 editor input이 활성화되지 않았습니다' });

  const key = spawnSync('xdotool', ['key', '--clearmodifiers', 'ctrl+p'], options);
  if (key.status !== 0) {
    throw new Error(`trusted X11 print shortcut 실패: ${String(key.stderr ?? '').trim()}`);
  }
}
