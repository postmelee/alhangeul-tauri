import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// A successful runner exit with zero matching tests is not PDF acceptance.
export function verifyPdfScope(evidence, context) {
  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.scenario, 'linux-direct-pdf-hwpx');
  assert.equal(evidence.status, 'success');
  assert.equal(evidence.identity.buildRef, context.buildRef);
  assert.equal(evidence.identity.nativeRunId, context.nativeRunId);
  assert.deepEqual(evidence.fixtures.map(({ id }) => id), ['form-hwpx']);
  const paths = new Set(evidence.files.map(({ path }) => path));
  const required = [
    'generated/form-direct.pdf',
    'generated/form-direct-state.json',
    'pdf/direct-pdf-hwpx/pdf-analysis.json',
    ...Array.from({ length: 10 }, (_, index) =>
      `pdf/direct-pdf-hwpx/render-${String(index + 1).padStart(2, '0')}.png`),
  ];
  for (const path of required) assert.ok(paths.has(path), `Missing HWPX evidence: ${path}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = process.argv[2];
  if (!root) throw new Error('Evidence root is required');
  const readJson = async (path) => JSON.parse(await readFile(join(root, path), 'utf8'));
  verifyPdfScope(
    await readJson('scenarios/linux-direct-pdf-hwpx/evidence.json'),
    await readJson('workflow-context.json'),
  );
  console.log('Linux HWPX PDF scope evidence verified');
}
