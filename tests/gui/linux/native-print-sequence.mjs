const SKIN_BUTTON = Object.freeze({ roles: ['push button', 'button'], exactNames: ['시작하기'] });
const FONT_DISABLED = Object.freeze({ roles: ['radio button'], exactNames: ['사용 안 함 (대체 글꼴로 보기)'] });
const LOCAL_FONT_BUTTON = Object.freeze({
  roles: ['push button', 'button'], names: ['대체 글꼴로 보기'],
});

export async function runProductionPrintSequence(options) {
  if (typeof options.assertEditorBody !== 'function') throw new Error('editor 본문 검증이 필요합니다');
  const document = { roles: ['document text'], names: [options.displayName] };
  const focusedDocument = { ...document, focused: true };
  await options.adapter.actionOptional(SKIN_BUTTON, 10000);
  await options.adapter.waitAbsent(SKIN_BUTTON);
  const choice = await options.adapter.actionOptional(FONT_DISABLED, 5000);
  if (choice?.performed) {
    await options.adapter.action({ roles: ['push button', 'button'], exactNames: ['확인'] });
    await options.adapter.waitAbsent(FONT_DISABLED);
  }
  await options.adapter.actionOptional(LOCAL_FONT_BUTTON, 1000);
  await options.adapter.waitAbsent(LOCAL_FONT_BUTTON);
  await options.adapter.wait(document);
  await assertEditorRestore(options, focusedDocument, 'before-print');

  const trigger = async () => {
    await options.adapter.wait(focusedDocument);
    await options.adapter.triggerSystemPrint();
  };
  await options.adapter.printToFile(options.gtkPdf, trigger);
  await assertEditorRestore(options, focusedDocument, 'after-print-to-file');
  await options.waitForFile(options.gtkPdf);
  await options.adapter.cancelPrint(trigger);
  await assertEditorRestore(options, focusedDocument, 'after-cancel');
  await options.adapter.printWithVirtualPrinter(options.printerName, trigger);
  await assertEditorRestore(options, focusedDocument, 'after-cups-pdf');
  await options.waitForCupsPdf();
}

async function assertEditorRestore(options, focusedDocument, label) {
  await options.adapter.wait(focusedDocument);
  await options.assertEditorBody(label);
}
