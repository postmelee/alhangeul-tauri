import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { browser, expect } from '@wdio/globals';
import { HwpDocument, initSync } from '../../../apps/studio-host/vendor/rhwp-core/rhwp.js';
import { waitForInitialDesktopReady } from '../support/document-ux.ts';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
type WorkerEvidence = { error: string } | {
  entry: string;
  form: { commands: Array<{ name: string }> };
  policy: unknown;
  imported: unknown;
  bytes: number[];
};

function pdfFixture(): number[] {
  const text = 'BT /F1 16 Tf 72 720 Td (ALHANGEUL WORKER IMPORT) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Array.from(new TextEncoder().encode(pdf));
}

describe('Installed module Workers', () => {
  it('loads packaged form and PDF Workers and exports the imported text', async () => {
    await waitForInitialDesktopReady(browser, inputs.timeoutMs);
    await browser.setTimeout({ script: inputs.timeoutMs });
    const evidence = await browser.executeAsync(async (bytes: number[], done) => {
      const workers: Worker[] = [];
      try {
        const entry = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
        if (!entry) throw new Error('missing installed module entry');
        const response = await fetch(entry.src);
        if (!response.ok) throw new Error('installed entry fetch failed');
        const code = await response.text();
        const open = (prefix: string) => {
          const matches = [...new Set(code.match(new RegExp(prefix + '-[A-Za-z0-9_-]+\\.js', 'g')))];
          if (matches.length !== 1) throw new Error('ambiguous installed worker ' + prefix);
          const worker = new Worker(new URL(matches[0], entry.src), { type: 'module' });
          workers.push(worker);
          return worker;
        };
        const request = (worker: Worker, data: Record<string, unknown>) => new Promise<any>((resolve, reject) => {
          const timer = setTimeout(() => { worker.terminate(); reject(new Error('worker deadline')); }, 45000);
          const finish = () => { clearTimeout(timer); worker.onmessage = null; worker.onerror = null; };
          worker.onerror = event => { finish(); reject(new Error(event.message || 'module worker failed')); };
          worker.onmessage = ({ data: reply }) => {
            if (reply.phase) return;
            finish();
            if (reply.error) reject(new Error(JSON.stringify(reply.error)));
            else resolve(reply);
          };
          worker.postMessage(data);
        });
        const form = open('form-action-worker');
        const address = { section: 0, para: 0, control: 0, cellPath: [] };
        const plan = await request(form, {
          schemaVersion: 1, button: address, trigger: 'OnSubmit_Click', header: '',
          source: 'function OnSubmit_Click(){HAction.Run("MoveDocEnd");}',
          forms: [{ address, name: 'Submit', formType: 'PushButton', text: '', caption: '',
            value: 0, enabled: true, items: [] }],
        });
        const pdf = open('import-worker');
        const policy = await request(pdf, { id: 1, method: 'policy', options: {} });
        await request(pdf, { id: 2, method: 'reserveInput', byteLength: bytes.length });
        const imported = await request(pdf, { id: 3, method: 'importPdf', bytes: new Uint8Array(bytes) });
        const exported = await request(pdf, { id: 4, method: 'export', format: 'hwpx' });
        done({ entry: entry.src, form: plan.result, policy: policy.result,
          imported: imported.result, bytes: Array.from(exported.result as Uint8Array) });
      } catch (error) {
        done({ error: String(error) });
      } finally {
        for (const worker of workers) worker.terminate();
      }
    }, pdfFixture()) as WorkerEvidence;
    await mkdir(inputs.outputDir, { recursive: true });
    await writeFile(join(inputs.outputDir, 'installed-workers.json'), JSON.stringify({
      sourceSha: inputs.buildRef, producerRunId: inputs.nativeRunId, ...evidence,
    }, null, 2));
    if ('error' in evidence) throw new Error(evidence.error);
    expect(evidence.form.commands).toEqual([{ name: 'MoveDocEnd' }]);
    initSync({ module: await readFile(join(inputs.fixtureRoot, 'apps/studio-host/vendor/rhwp-core/rhwp_bg.wasm')) });
    const importedDocument = new HwpDocument(new Uint8Array(evidence.bytes));
    try { expect(importedDocument.getTextFileText()).toContain('ALHANGEUL WORKER IMPORT'); }
    finally { importedDocument.free(); }
    await writeFile(join(inputs.outputDir, 'worker-import.hwpx'), Buffer.from(evidence.bytes));
  });
});
