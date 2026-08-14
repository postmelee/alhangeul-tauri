import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import {
  analyzePdf,
  analyzePpm,
  assertPdfSummary,
  parsePdfInfo,
  popplerPagePath,
} from './pdf-analysis.mjs';

test('pdfinfo의 6쪽 A4 metadata를 고정한다', () => {
  const parsed = parsePdfInfo('Pages:          6\nPage size:      595.276 x 841.89 pts (A4)\n', 6);
  assert.equal(parsed.pageCount, 6);
  assert.equal(parsed.pageSizes.length, 6);
  assert.deepEqual(parsed.pageSizes[0], { width: 595.276, height: 841.89 });
});

test('P6 render는 content bounds와 blank ratio를 계산한다', () => {
  const analysis = analyzePpm(ppmFixture(10, 8, { x: 2, y: 1, width: 5, height: 5 }));
  assert.equal(analysis.nonWhiteRatio, 25 / 80);
  assert.deepEqual(analysis.margins, { left: 2, top: 1, right: 3, bottom: 2 });
  const whitespacePixel = Buffer.from('P6\n2 1\n255\n\n\u0014\u001e\u00ff\u00ff\u00ff', 'latin1');
  assert.equal(analyzePpm(whitespacePixel).nonWhiteRatio, 0.5);
  assert.throws(() => analyzePpm(Buffer.from('P3 1 1 255\n0 0 0')), /P6/);
});

test('Poppler render 파일명은 마지막 page 자릿수만큼 zero-pad한다', () => {
  assert.equal(popplerPagePath('/tmp/render', 1, 6, 'png'), '/tmp/render-1.png');
  assert.equal(popplerPagePath('/tmp/render', 1, 10, 'png'), '/tmp/render-01.png');
  assert.equal(popplerPagePath('/tmp/render', 10, 10, 'ppm'), '/tmp/render-10.ppm');
  assert.throws(() => popplerPagePath('/tmp/render', 11, 10, 'png'), /유효하지/);
});

test('Poppler 분석기는 page/text/render와 시각 read-back 필요를 summary에 남긴다', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alhangeul-pdf-'));
  const pdfPath = join(root, 'source.pdf');
  const outputDir = join(root, 'evidence');
  await writeFile(pdfPath, 'pdf');
  const commands = [];
  const result = await analyzePdf({
    pdfPath,
    outputDir,
    label: 'direct-pdf',
    expectedPageCount: 2,
    expectedTitle: '사업수행계획서',
    minTextCounts: [2, 2],
  }, {
    runCommand: async (command, args) => {
      commands.push([command, args]);
      if (command === 'pdfinfo') return 'Pages: 2\nPage size: 595.276 x 841.89 pts (A4)\n';
      if (command === 'pdftotext') return args.includes('-f') ? '쪽본문' : '사 업 수 행 계 획 서';
      const prefix = args.at(-1);
      await mkdir(dirname(prefix), { recursive: true });
      for (let page = 1; page <= 2; page += 1) {
        await writeFile(
          `${prefix}-${page}.${args.includes('-png') ? 'png' : 'ppm'}`,
          args.includes('-png') ? 'png-render' : ppmFixture(20, 20, { x: 2, y: 2, width: 10, height: 10 }),
        );
      }
      return '';
    },
  });

  assert.equal(result.summary.pageCount, 2);
  assert.equal(result.summary.titleFound, true);
  assert.equal(result.summary.visualReadbackRequired, true);
  assert.equal(result.renderPaths.length, 2);
  assert.equal(commands.filter(([command]) => command === 'pdftoppm').length, 2);
  const ppmPrefix = commands.find(([command, args]) => (
    command === 'pdftoppm' && !args.includes('-png')
  ))[1].at(-1);
  assert.equal(ppmPrefix.startsWith(outputDir), false);
});

test('text extraction만 성공해도 blank/crop 또는 비A4면 실패한다', () => {
  const base = {
    pageCount: 1,
    pageSizes: [{ width: 595.276, height: 841.89 }],
    titleFound: true,
    pageTextCounts: [100],
    pageRenders: [{ nonWhiteRatio: 0, margins: null }],
  };
  const expected = { expectedPageCount: 1, minTextCounts: [1] };
  assert.throws(() => assertPdfSummary(base, expected), /blank/);
  assert.throws(() => assertPdfSummary({
    ...base,
    pageSizes: [{ width: 612, height: 792 }],
    pageRenders: [{ nonWhiteRatio: 0.1, margins: { left: 5, top: 5, right: 5, bottom: 5 } }],
  }, expected), /A4/);
  assert.throws(() => assertPdfSummary({
    ...base,
    pageRenders: [{ nonWhiteRatio: 0.1, margins: { left: 0, top: 5, right: 5, bottom: 5 } }],
  }, expected), /잘렸/);
});

function ppmFixture(width, height, ink) {
  const pixels = Buffer.alloc(width * height * 3, 255);
  for (let y = ink.y; y < ink.y + ink.height; y += 1) {
    for (let x = ink.x; x < ink.x + ink.width; x += 1) {
      pixels.fill(0, (y * width + x) * 3, (y * width + x + 1) * 3);
    }
  }
  return Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), pixels]);
}
