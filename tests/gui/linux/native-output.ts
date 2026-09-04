import { mkdir, readdir, rename, stat, unlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { browser, expect } from '@wdio/globals';
import { describeEvidenceFile, type EvidenceFile } from '../support/evidence.ts';

export async function assertGenerated(
  outputDir: string,
  path: string,
): Promise<EvidenceFile> {
  await waitForFile(path);
  expect((await stat(path)).size).toBeGreaterThan(1024);
  return describeEvidenceFile(outputDir, path, 'generated-document');
}

export async function fileWriteState(
  path: string,
): Promise<{ size: bigint; mtimeNs: bigint }> {
  const metadata = await stat(path, { bigint: true });
  if (!metadata.isFile() || metadata.size <= 1024n) {
    throw new Error(`${basename(path)} 저장 파일이 유효하지 않습니다`);
  }
  return { size: metadata.size, mtimeNs: metadata.mtimeNs };
}

export async function waitForFile(path: string, timeoutMs?: number): Promise<void> {
  await browser.waitUntil(async () => {
    try { return (await stat(path)).size > 0; } catch { return false; }
  }, { timeout: timeoutMs, timeoutMsg: `${basename(path)} 출력이 생성되지 않았습니다` });
}

export async function describeRenderEvidence(
  outputDir: string,
  paths: string[],
): Promise<EvidenceFile[]> {
  return Promise.all(paths.map((path) => describeEvidenceFile(
    outputDir, path, 'screenshot',
  )));
}

export async function removeStale(path: string): Promise<void> {
  await unlink(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

export async function resetCupsOutput(expectedPath: string): Promise<void> {
  const outputDir = dirname(expectedPath);
  await mkdir(outputDir, { recursive: true });
  const entries = await readdir(outputDir, { withFileTypes: true });
  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
    .map((entry) => unlink(join(outputDir, entry.name))));
}

export async function normalizeCupsPdf(
  expectedPath: string,
  timeoutMs: number,
): Promise<void> {
  const outputDir = dirname(expectedPath);
  await browser.waitUntil(async () => {
    const entries = await readdir(outputDir, { withFileTypes: true });
    const pdfs = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
      .map((entry) => join(outputDir, entry.name));
    if (pdfs.length !== 1) return false;
    if (pdfs[0] !== expectedPath) await rename(pdfs[0], expectedPath);
    return (await stat(expectedPath)).size > 0;
  }, { timeout: timeoutMs, timeoutMsg: 'CUPS-PDF 출력 1개를 식별하지 못했습니다' });
}

export function readCupsInputs(outputDir: string) {
  const outputPath = process.env.ALHANGEUL_GUI_CUPS_PDF_OUTPUT ?? '';
  const printerName = process.env.ALHANGEUL_GUI_CUPS_PDF_PRINTER ?? 'PDF';
  if (!isAbsolute(outputPath) || !outputPath.startsWith(`${outputDir}/`)) {
    throw new Error('ALHANGEUL_GUI_CUPS_PDF_OUTPUT은 output root 안의 절대 경로여야 합니다');
  }
  return { outputPath, printerName };
}
