import type { DiagnosticSnapshot, FormatResult, Inspection } from '../src/core/desktop-thumbnail-diagnostics-model';

export const inspection: Inspection = {
  buildReference: { schemaVersion: 1, sourceSha: 'a'.repeat(40), productVersion: '0.1.0' },
  environment: {
    osBuild: { status: 'known', value: 19045 }, processX64: true,
    apartmentSta: { status: 'known', value: true }, elevated: { status: 'known', value: false },
    elevationType: { status: 'known', value: 3 }, integrityRid: { status: 'known', value: 8192 },
    enableLua: { status: 'known', value: 1 }, iconsOnly: { status: 'known', value: 0 },
    disableThumbnails: Array.from({ length: 4 }, () => ({ status: 'missing' })),
  },
  installKind: 'nsis', installRecordsReadable: true,
  registration: Array.from({ length: 2 }, () => ({ ready: true, referenceMatched: true, scope: 'user-only', finding: 'ready' })),
};
export function formatResult(extension: '.hwp' | '.hwpx', passed = true): FormatResult {
  return {
    input: { extension, registration: inspection.registration[0], integrity: true, cleanup: true,
      registrationStable: true, probes: [{ Label: 'manual-document-shell', Result: { mode: 'shell', phase: 'IShellItemImageFactory.GetImage', status: passed ? 'ok' : 'failed', hresult: passed ? '0x00000000' : '0x80040154', bitmapPresent: passed } }] },
    assessment: { finding: passed ? 'thumbnail-api-ok' : 'per-user-shell-activation-failed',
      recommendedAction: passed ? 'none' : 'consider-msi', evidenceValid: true, thumbnailPassed: passed },
  };
}
export function running(operation: 'inspect' | 'suite' = 'inspect', requestId = 'id'): DiagnosticSnapshot {
  return { requestId, sequence: 1, status: 'running', operation, result: null };
}
export function ready(): DiagnosticSnapshot {
  return { ...running(), sequence: 2, status: 'completed', result: { kind: 'inspection', value: structuredClone(inspection) } };
}
export function completed(partial = false): DiagnosticSnapshot {
  return { ...running('suite', 'suite-id'), sequence: 2, status: 'completed', result: {
    kind: 'suite', value: { status: 'completed', inspection: structuredClone(inspection), cleanup: true,
      formats: [formatResult('.hwp'), formatResult('.hwpx', !partial)] },
  } };
}
