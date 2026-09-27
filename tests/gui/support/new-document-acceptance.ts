import { join } from 'node:path';
import { browser } from '@wdio/globals';
import { analyzePdf } from '../linux/pdf-analysis.mjs';
import { LinuxNativeUiAdapter } from '../linux/native-ui/atspi.mjs';
import { describeEvidenceFile } from './evidence.ts';
import { waitForLoadedDocument, waitForStudioStatus } from './document-ux.ts';

export async function acceptNewNativeDocument(options: {
  outputDir: string;
  timeoutMs: number;
  trigger(command: string): Promise<void>;
  adapter: LinuxNativeUiAdapter;
}) {
  const { outputDir, timeoutMs, trigger, adapter } = options;
  const marker = 'ALHANGEUL NEW DOCUMENT SAVE ROUNDTRIP 0123456789';
  const hwpPath = join(outputDir, 'generated', 'new-document.hwp');
  const pdfPath = join(outputDir, 'generated', 'new-document.pdf');
  await trigger('file:new-doc');
  await waitForLoadedDocument(browser, '새 문서.hwp', 1, timeoutMs);
  // Use the editor's public text input, as in the Windows PDF acceptance.
  await browser.execute((text) => {
    const input = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="문서 편집 입력"]');
    if (!input) throw new Error('문서 편집 입력을 찾지 못했습니다');
    input.focus();
    input.value = text;
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
  }, marker);
  await adapter.saveDocument('file:save-as', hwpPath, () => trigger('file:save-as'));
  await waitForStudioStatus(browser, /저장 완료/, timeoutMs);
  await adapter.openDocument(hwpPath, () => trigger('file:open'));
  await waitForLoadedDocument(browser, 'new-document.hwp', 1, timeoutMs);
  await adapter.saveDocument('file:print-to-pdf', pdfPath, () => trigger('file:print-to-pdf'));
  await waitForStudioStatus(browser, /PDF 저장 완료/, timeoutMs);
  const analysis = await analyzePdf({
    pdfPath, outputDir, label: 'new-document', expectedPageCount: 1,
    expectedTitle: marker, minTextCounts: [30],
  });
  return [
    await describeEvidenceFile(outputDir, hwpPath, 'generated-document'),
    await describeEvidenceFile(outputDir, pdfPath, 'generated-document'),
    await describeEvidenceFile(outputDir, analysis.summaryPath, 'log'),
    ...await Promise.all(analysis.renderPaths.map((path) => describeEvidenceFile(outputDir, path, 'screenshot'))),
  ];
}
