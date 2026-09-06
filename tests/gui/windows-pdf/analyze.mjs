import { createHash } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { analyzePdf } from '../linux/pdf-analysis.mjs';

export function validateEvidence(evidence, expected) {
  if (evidence.status !== 'passed' || evidence.buildRef !== expected.buildRef
      || evidence.fixture !== expected.fixture || evidence.phase !== expected.phase
      || evidence.sourceUnchanged !== true || evidence.dirtyPreserved !== true
      || evidence.nativeDialogs !== true || evidence.marker !== 'PDF검증'
      || !/^[0-9a-f]{64}$/.test(evidence.sourceHash ?? '')
      || !/^[0-9a-f]{64}$/.test(evidence.pdfSha256 ?? '')
      || !Number.isSafeInteger(evidence.pageCount) || evidence.pageCount < 1
      || (expected.fixture === 'biz-plan-hwp' && evidence.pageCount !== 6)
      || evidence.overwriteVerified !== (expected.phase === 'restart')) {
    throw new Error(`Invalid Windows PDF evidence: ${expected.fixture}/${expected.phase}`);
  }
}

export async function analyzeWindowsPdfs(root, buildRef, analyze = analyzePdf) {
  if (!/^[0-9a-f]{40}$/.test(buildRef)) throw new Error('Invalid buildRef');
  await unlink(join(root, 'windows-pdf-summary.json')).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
  const results = [];
  for (const fixture of ['biz-plan-hwp', 'form-hwpx']) {
    for (const phase of ['fresh', 'restart']) {
      const label = `${fixture}-${phase}`;
      const evidence = JSON.parse(await readFile(join(root, `${label}.json`), 'utf8'));
      validateEvidence(evidence, { buildRef, fixture, phase });
      const pdfPath = join(root, `${label}.pdf`);
      const hash = createHash('sha256').update(await readFile(pdfPath)).digest('hex');
      if (hash !== evidence.pdfSha256) throw new Error(`PDF digest mismatch: ${label}`);
      const analysis = await analyze({
        pdfPath, outputDir: root, label,
        expectedPageCount: evidence.pageCount,
        expectedTitle: evidence.marker,
        minTextCounts: fixture === 'biz-plan-hwp' ? [20, 300, 200, 300, 200, 100]
          : Array(evidence.pageCount).fill(1),
      });
      results.push({ label, pdfSha256: hash, ...analysis.summary });
    }
  }
  await writeFile(join(root, 'windows-pdf-summary.json'), JSON.stringify({
    status: 'passed', buildRef, results, visualReadbackRequired: true,
    excluded: ['concurrent-edit', 'webview-reload', 'TTL-recovery', 'physical-IME'],
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await analyzeWindowsPdfs(process.argv[2], process.argv[3]);
}
