import { browser } from '@wdio/globals';

type CreationResult = { label: string } | { error: string };
interface CreationContext {
  __TAURI_INTERNALS__: { invoke<T>(command: string): Promise<T> };
  __updaterWindowCreation?: CreationResult | null;
}

export async function createSecondaryWindow(
  waitForNativeBridge: () => Promise<unknown>,
  evidence: Record<string, unknown>,
): Promise<{ label: string; handle: string; primaryHandle: string }> {
  const primaryHandle = await browser.getWindowHandle();
  // 창 생성/포커스 이동을 진행 중인 WebDriver async script와 분리한다.
  await browser.execute(() => {
    const context = window as unknown as CreationContext;
    context.__updaterWindowCreation = null;
    window.setTimeout(() => {
      context.__TAURI_INTERNALS__.invoke<string>('create_editor_window').then(
        (label) => { context.__updaterWindowCreation = { label }; },
        (error) => { context.__updaterWindowCreation = { error: String(error) }; },
      );
    }, 100);
  });
  evidence.windowCreation = { primaryHandle, dispatched: true };
  await browser.waitUntil(async () => {
    const handles = await browser.getWindowHandles();
    evidence.windowCreation = { primaryHandle, dispatched: true, handles };
    return handles.length === 2;
  }, {
    timeout: 120_000,
    interval: 250,
    timeoutMsg: '두 번째 editor window가 제한 시간 안에 준비되지 않았습니다',
  });
  const handle = (await browser.getWindowHandles()).find((value) => value !== primaryHandle);
  if (!handle) throw new Error('두 번째 editor window handle을 찾지 못했습니다');
  await browser.switchToWindow(primaryHandle);
  const label = await readCreationResult();
  await browser.switchToWindow(handle);
  await waitForNativeBridge();
  await browser.switchToWindow(primaryHandle);
  return { label, handle, primaryHandle };
}

async function readCreationResult(): Promise<string> {
  let result: CreationResult | null = null;
  await browser.waitUntil(async () => {
    result = await browser.execute(() =>
      (window as unknown as CreationContext).__updaterWindowCreation ?? null);
    if (result && 'error' in result) throw new Error(result.error);
    return result !== null;
  }, { timeout: 120_000, interval: 250, timeoutMsg: '새 창 생성 결과를 받지 못했습니다' });
  const completed = result as CreationResult | null;
  if (!completed || !('label' in completed)) throw new Error('새 창 label이 없습니다');
  return completed.label;
}
