const codes = new Set(['manual-readback-exception', 'missing-readback-input', 'manual-readback-nonzero',
  'input-invalid', 'input-nonlocal', 'input-reparse', 'package-invalid', 'support-source-mismatch',
  'support-payload-mismatch', 'manual-raw-mismatch', 'manual-assessment-mismatch', 'manual-probes-missing']);
const files = new Set(['windows-thumbnail-check.ps1', 'windows-thumbnail-check-tests.ps1',
  'windows-thumbnail-check-support.ps1', 'windows-thumbnail-check-assessment.ps1']);

export function replayFailureDiagnostic(error) {
  const result = { status: 'failed', code: 'child-process-failed', exitCode: Number.isInteger(error?.status) ? error.status : null };
  if (error?.code === 'ETIMEDOUT') result.code = 'child-timeout';
  else if (error?.code === 'ENOBUFS') result.code = 'child-output-limit';
  else if (result.exitCode === null) result.code = 'child-start-or-signal-failed';
  const stdout = typeof error?.stdout === 'string' ? error.stdout : Buffer.isBuffer(error?.stdout) ? error.stdout.toString('utf8') : '';
  if (stdout.length > 65536) return result;
  const lines = stdout.split(/\r?\n/).filter(line => line.startsWith('ALHANGEUL_READBACK_DIAGNOSTIC='));
  if (lines.length !== 1) return result;
  try {
    const value = JSON.parse(lines[0].slice('ALHANGEUL_READBACK_DIAGNOSTIC='.length));
    if (value.schemaVersion !== 1 || value.status !== 'failed' || !codes.has(value.code)
      || !Array.isArray(value.sites) || value.sites.length > 8
      || !value.sites.every(site => files.has(site?.file) && Number.isSafeInteger(site.line) && site.line > 0 && site.line <= 10000)) return result;
    // Project only allowed fields; no raw paths, stderr, exception text or extra keys.
    result.detail = { code: value.code, sites: value.sites.map(({ file, line }) => ({ file, line })) };
  } catch { /* Malformed diagnostic cannot expose raw child output. */ }
  return result;
}
