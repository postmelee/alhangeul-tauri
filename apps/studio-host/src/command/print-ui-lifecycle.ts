import { getCurrentWindow, type Window as TauriWindow } from '@tauri-apps/api/window';
import type { DesktopPlatform } from '../core/platform';

const PRINT_UI_FOCUS_TIMEOUT_MS = 5 * 60 * 1000;

export type PrintUiReturnReason =
  | 'native-focus'
  | 'native-already-focused'
  | 'native-timeout'
  | 'dom-focus'
  | 'dom-already-focused'
  | 'dom-timeout'
  | 'unsupported';

export interface PrintUiReturnWaiter {
  waitForReturn(): Promise<PrintUiReturnReason>;
  dispose(): void;
}

type NativeFocusWindow = Pick<TauriWindow, 'isFocused' | 'onFocusChanged'>;

export async function preparePrintUiReturnWaiter(
  platform: DesktopPlatform,
): Promise<PrintUiReturnWaiter> {
  if (platform === 'windows') {
    try {
      return await prepareNativeFocusWaiter(getCurrentWindow());
    } catch (error) {
      console.warn('[file:print] native window focus 감시를 시작하지 못했습니다.', error);
    }
  }
  return prepareDomFocusWaiter();
}

async function prepareNativeFocusWaiter(
  nativeWindow: NativeFocusWindow,
): Promise<PrintUiReturnWaiter> {
  let sawUnfocused = false;
  let waitStarted = false;
  const deferred = createDeferredResult();
  const unlisten = await nativeWindow.onFocusChanged(({ payload: focused }) => {
    if (!focused) {
      sawUnfocused = true;
    } else if (waitStarted && sawUnfocused) {
      deferred.finish('native-focus');
    }
  });

  return {
    async waitForReturn() {
      waitStarted = true;
      deferred.startTimeout('native-timeout');
      const focused = await nativeWindow.isFocused();
      if (!focused) {
        sawUnfocused = true;
      } else if (sawUnfocused) {
        deferred.finish('native-focus');
      } else {
        deferred.finish('native-already-focused');
      }
      return deferred.result;
    },
    dispose() {
      unlisten();
      deferred.dispose();
    },
  };
}

function prepareDomFocusWaiter(): PrintUiReturnWaiter {
  if (
    typeof window === 'undefined'
    || typeof document === 'undefined'
    || typeof document.hasFocus !== 'function'
  ) {
    return immediateWaiter('unsupported');
  }

  const deferred = createDeferredResult();
  const onFocus = () => deferred.finish('dom-focus');
  window.addEventListener('focus', onFocus);
  return {
    async waitForReturn() {
      if (document.hasFocus()) deferred.finish('dom-already-focused');
      else deferred.startTimeout('dom-timeout');
      return deferred.result;
    },
    dispose() {
      window.removeEventListener('focus', onFocus);
      deferred.dispose();
    },
  };
}

function immediateWaiter(reason: PrintUiReturnReason): PrintUiReturnWaiter {
  return {
    waitForReturn: async () => reason,
    dispose() {},
  };
}

function createDeferredResult() {
  let settled = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let resolveResult: (reason: PrintUiReturnReason) => void = () => {};
  const result = new Promise<PrintUiReturnReason>((resolve) => {
    resolveResult = resolve;
  });

  const finish = (reason: PrintUiReturnReason) => {
    if (settled) return;
    settled = true;
    if (timeoutId !== null) clearTimeout(timeoutId);
    resolveResult(reason);
  };
  const startTimeout = (reason: PrintUiReturnReason) => {
    if (settled || timeoutId !== null) return;
    timeoutId = setTimeout(() => {
      console.warn('[file:print] system print UI focus 복귀 대기 시간이 초과됐습니다.');
      finish(reason);
    }, PRINT_UI_FOCUS_TIMEOUT_MS);
  };

  return {
    result,
    finish,
    startTimeout,
    dispose() {
      if (timeoutId !== null) clearTimeout(timeoutId);
    },
  };
}
