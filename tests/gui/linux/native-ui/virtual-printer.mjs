import { PRINT_DIALOG_TITLES } from './xdotool.mjs';

const PRINT_DIALOG = Object.freeze({
  roles: ['dialog'],
  names: ['print', '인쇄'],
});
const BUTTON_ROLES = ['push button', 'button'];
const SEMANTIC_READY_TIMEOUT_MS = 5000;

export async function printWithVerifiedVirtualPrinter(options) {
  await options.trigger();
  await options.runPrintWindow(windowRequest('wait', options.timeoutMs));
  const semantic = await selectPrinterSemantically(options);
  if (semantic) {
    await options.runAtspi({
      command: 'wait', desktopScope: true,
      selector: { roles: BUTTON_ROLES, exactNames: ['print', '인쇄'], within: PRINT_DIALOG },
    });
  }
  await options.runWindowShortcut({ titles: PRINT_DIALOG_TITLES, key: 'alt+p' });
  if (semantic) {
    await options.runAtspi({ command: 'waitAbsent', desktopScope: true, selector: PRINT_DIALOG });
  }
  await options.runPrintWindow(windowRequest('waitAbsent', options.timeoutMs));
}

async function selectPrinterSemantically(options) {
  try {
    await options.runAtspi({
      command: 'wait', desktopScope: true, selector: PRINT_DIALOG,
      timeoutMs: Math.min(options.timeoutMs, SEMANTIC_READY_TIMEOUT_MS),
    });
  } catch (error) {
    if (!isMissingSemanticTarget(error)) throw error;
    if (options.defaultPrinterName !== options.printerName) {
      throw new Error('AT-SPI print dialog 부재 시 검증된 기본 virtual printer가 필요합니다');
    }
    return false;
  }

  const printer = {
    roles: ['radio button', 'table cell', 'list item', 'toggle button'],
    names: [options.printerName],
    within: PRINT_DIALOG,
  };
  await options.runAtspi({
    command: 'selectByFocus', desktopScope: true, selector: printer,
  });
  await options.runAtspi({
    command: 'wait', desktopScope: true, selector: { ...printer, selected: true },
  });
  return true;
}

function windowRequest(operation, timeoutMs) {
  return { operation, titles: PRINT_DIALOG_TITLES, timeoutMs };
}

function isMissingSemanticTarget(error) {
  return String(error instanceof Error ? error.message : error)
    .includes('semantic target did not appear');
}
