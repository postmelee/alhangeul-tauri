#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const A4_POINTS = Object.freeze({ width: 595.276, height: 841.89 });

export async function analyzePdf(options, services = {}) {
  const input = validateOptions(options);
  const run = services.runCommand ?? runCommand;
  const output = join(input.outputDir, 'pdf', input.label);
  await (services.mkdir ?? mkdir)(output, { recursive: true });

  const infoText = await run('pdfinfo', [
    '-f', '1', '-l', String(input.expectedPageCount), input.pdfPath,
  ]);
  const metadata = parsePdfInfo(infoText, input.expectedPageCount);
  const fullText = await run('pdftotext', ['-layout', input.pdfPath, '-']);
  const pageTextCounts = [];
  for (let page = 1; page <= input.expectedPageCount; page += 1) {
    const text = await run('pdftotext', [
      '-layout', '-f', String(page), '-l', String(page), input.pdfPath, '-',
    ]);
    pageTextCounts.push(nonWhitespaceCount(text));
  }

  const scratch = await mkdtemp(join(tmpdir(), `alhangeul-pdf-${input.label}-`));
  const ppmPrefix = join(scratch, 'analysis');
  const pngPrefix = join(output, 'render');
  const pageRenders = [];
  const renderPaths = [];
  try {
    await run('pdftoppm', [
      '-f', '1', '-l', String(input.expectedPageCount), '-r', '72',
      input.pdfPath, ppmPrefix,
    ]);
    await run('pdftoppm', [
      '-f', '1', '-l', String(input.expectedPageCount), '-r', '144', '-png',
      input.pdfPath, pngPrefix,
    ]);

    for (let page = 1; page <= input.expectedPageCount; page += 1) {
      const ppmPath = popplerPagePath(ppmPrefix, page, input.expectedPageCount, 'ppm');
      const pngPath = popplerPagePath(pngPrefix, page, input.expectedPageCount, 'png');
      pageRenders.push(analyzePpm(await (services.readFile ?? readFile)(ppmPath)));
      const png = await (services.stat ?? stat)(pngPath);
      if (!png.isFile() || png.size <= 0) throw new Error(`PDF evidence render가 비어 있습니다: page ${page}`);
      renderPaths.push(pngPath);
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }

  const summary = {
    schemaVersion: 1,
    pdf: basename(input.pdfPath),
    pageCount: metadata.pageCount,
    pageSizes: metadata.pageSizes,
    titleFound: normalizeText(fullText).includes(normalizeText(input.expectedTitle)),
    pageTextCounts,
    pageRenders,
    visualReadbackRequired: true,
    renderPaths: renderPaths.map((path) => basename(path)),
  };
  assertPdfSummary(summary, input);
  const summaryPath = join(output, 'pdf-analysis.json');
  await (services.writeFile ?? writeFile)(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, {
    encoding: 'utf8', mode: 0o600,
  });
  return { summary, summaryPath, renderPaths };
}

export function parsePdfInfo(source, expectedPageCount) {
  const pages = Number(source.match(/^Pages:\s+(\d+)\s*$/m)?.[1]);
  if (!Number.isSafeInteger(pages)) throw new Error('pdfinfo Pages를 해석할 수 없습니다');
  const perPage = [...source.matchAll(
    /^Page\s+\d+\s+size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts/mg,
  )].map((match) => ({ width: Number(match[1]), height: Number(match[2]) }));
  const generic = source.match(/^Page size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts/m);
  const pageSizes = perPage.length > 0
    ? perPage
    : Array.from({ length: expectedPageCount }, () => ({
      width: Number(generic?.[1]), height: Number(generic?.[2]),
    }));
  if (pageSizes.some(({ width, height }) => !Number.isFinite(width) || !Number.isFinite(height))) {
    throw new Error('pdfinfo Page size를 해석할 수 없습니다');
  }
  return { pageCount: pages, pageSizes };
}

export function popplerPagePath(prefix, page, pageCount, extension) {
  if (!Number.isSafeInteger(page) || !Number.isSafeInteger(pageCount)
      || page < 1 || page > pageCount || !/^[a-z0-9]+$/.test(extension)) {
    throw new Error('Poppler page path 입력이 유효하지 않습니다');
  }
  return `${prefix}-${String(page).padStart(String(pageCount).length, '0')}.${extension}`;
}

export function analyzePpm(source) {
  const buffer = Buffer.from(source);
  const { values, offset } = readPpmHeader(buffer);
  const [magic, widthText, heightText, maxText] = values;
  const width = Number(widthText);
  const height = Number(heightText);
  if (magic !== 'P6' || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
      || Number(maxText) !== 255 || buffer.length - offset !== width * height * 3) {
    throw new Error('P6 PDF render 형식이 유효하지 않습니다');
  }
  let darkPixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const index = offset + pixel * 3;
    if (buffer[index] >= 245 && buffer[index + 1] >= 245 && buffer[index + 2] >= 245) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    darkPixels += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return {
    width,
    height,
    nonWhiteRatio: darkPixels / (width * height),
    margins: darkPixels === 0 ? null : {
      left: minX, top: minY, right: width - 1 - maxX, bottom: height - 1 - maxY,
    },
  };
}

export function assertPdfSummary(summary, expected) {
  if (summary.pageCount !== expected.expectedPageCount) {
    throw new Error(`PDF page count 불일치: ${summary.pageCount}`);
  }
  if (summary.pageSizes.length !== expected.expectedPageCount
      || summary.pageSizes.some((size) => !isA4(size))) {
    throw new Error('PDF의 모든 쪽이 A4가 아닙니다');
  }
  if (!summary.titleFound) throw new Error('PDF 한글 표제를 추출할 수 없습니다');
  summary.pageTextCounts.forEach((count, index) => {
    if (count < expected.minTextCounts[index]) {
      throw new Error(`PDF page ${index + 1}의 추출 text가 부족합니다: ${count}`);
    }
  });
  summary.pageRenders.forEach((render, index) => {
    if (render.nonWhiteRatio < 0.0001) throw new Error(`PDF page ${index + 1}가 blank입니다`);
    if (!render.margins || Object.values(render.margins).some((margin) => margin < 1)) {
      throw new Error(`PDF page ${index + 1} render가 잘렸습니다`);
    }
  });
}

function readPpmHeader(buffer) {
  const values = [];
  let index = 0;
  while (values.length < 4) {
    while (index < buffer.length && /\s/.test(String.fromCharCode(buffer[index]))) index += 1;
    if (buffer[index] === 35) {
      while (index < buffer.length && buffer[index] !== 10) index += 1;
      continue;
    }
    const start = index;
    while (index < buffer.length && !/\s/.test(String.fromCharCode(buffer[index]))) index += 1;
    if (start === index) throw new Error('P6 header가 손상되었습니다');
    values.push(buffer.subarray(start, index).toString('ascii'));
  }
  if (index >= buffer.length || !/\s/.test(String.fromCharCode(buffer[index]))) {
    throw new Error('P6 header 구분자가 없습니다');
  }
  const separator = buffer[index];
  index += 1;
  if (separator === 13 && buffer[index] === 10) index += 1;
  return { values, offset: index };
}

function validateOptions(options) {
  if (!isAbsolute(options.pdfPath) || !isAbsolute(options.outputDir)) {
    throw new Error('PDF와 output directory는 절대 경로여야 합니다');
  }
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(options.label)) throw new Error('PDF label이 유효하지 않습니다');
  if (!Number.isSafeInteger(options.expectedPageCount) || options.expectedPageCount < 1) {
    throw new Error('expectedPageCount가 유효하지 않습니다');
  }
  if (!Array.isArray(options.minTextCounts)
      || options.minTextCounts.length !== options.expectedPageCount
      || options.minTextCounts.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error('minTextCounts가 page count와 일치하지 않습니다');
  }
  return options;
}

function isA4(size) {
  return Math.abs(size.width - A4_POINTS.width) <= 2
    && Math.abs(size.height - A4_POINTS.height) <= 2;
}

function normalizeText(value) {
  return String(value).replace(/\s+/g, '').normalize('NFC');
}

function nonWhitespaceCount(value) {
  return String(value).replace(/\s/g, '').length;
}

async function runCommand(command, args) {
  const result = await execFileAsync(command, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  return result.stdout;
}

function printHelp() {
  console.log('Library helper: import analyzePdf() from tests/gui/linux/pdf-analysis.mjs');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) printHelp();
