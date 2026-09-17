import { findingMessages, inspectionOf, safeProbeLabel, safeProbePhase, type DiagnosticSnapshot, type Observation } from './desktop-thumbnail-diagnostics-model';

function choice(value: string, allowed: readonly string[]): string {
  return allowed.includes(value) ? value : 'unknown';
}
function observation(value: Observation<number | boolean>): unknown {
  if (value.status !== 'known') return { status: choice(value.status, ['missing', 'unreadable']) };
  return { status: 'known', value: typeof value.value === 'boolean'
    || (Number.isSafeInteger(value.value) && Number(value.value) >= 0) ? value.value : null };
}

/** Explicit projection, never JSON.stringify(nativeReply) or an exception. */
export function diagnosticSummary(snapshot: DiagnosticSnapshot): string {
  const inspection = inspectionOf(snapshot);
  const reference = inspection?.buildReference;
  const env = inspection?.environment;
  const suite = snapshot.result?.kind === 'suite' ? snapshot.result.value : null;
  return JSON.stringify({
    schemaVersion: 1,
    productVersion: reference && /^\d+\.\d+\.\d+$/.test(reference.productVersion) ? reference.productVersion : null,
    sourceSha: reference && /^[a-f0-9]{40}$/.test(reference.sourceSha) ? reference.sourceSha : null,
    operation: choice(snapshot.operation, ['inspect', 'suite']),
    status: choice(snapshot.status, ['running', 'cancelling', 'completed', 'cancelled', 'timed-out', 'failed']),
    installKind: choice(inspection?.installKind ?? '', ['nsis', 'msi', 'unknown']),
    installRecordsReadable: inspection?.installRecordsReadable === true,
    environment: env ? {
      osBuild: observation(env.osBuild), processX64: env.processX64 === true,
      elevated: observation(env.elevated), elevationType: observation(env.elevationType),
      integrityRid: observation(env.integrityRid), enableLua: observation(env.enableLua),
      apartmentSta: observation(env.apartmentSta), iconsOnly: observation(env.iconsOnly),
      disableThumbnails: env.disableThumbnails.slice(0, 4).map(observation),
    } : null,
    registration: inspection?.registration.slice(0, 2).map((item) => ({
      scope: choice(item.scope, ['user-only', 'machine-only', 'ambiguous', 'unknown']),
      ready: item.ready === true, referenceMatched: item.referenceMatched === true,
      finding: choice(item.finding, Object.keys(findingMessages)),
    })),
    cleanup: suite ? suite.cleanup === true : null,
    formats: suite?.formats.slice(0, 2).map(({ input, assessment }) => ({
      extension: choice(input.extension, ['.hwp', '.hwpx']),
      finding: choice(assessment.finding, Object.keys(findingMessages)),
      recommendedAction: choice(assessment.recommendedAction, ['none', 'check-diagnostics', 'check-shell-environment', 'investigate', 'consider-msi', 'check-install-history']),
      evidenceValid: assessment.evidenceValid === true, thumbnailPassed: assessment.thumbnailPassed === true,
      integrity: suite?.status === 'completed' ? input.integrity === true : null, cleanup: input.cleanup === true,
      registrationStable: suite?.status === 'completed' ? input.registrationStable === true : null,
      probes: input.probes.slice(0, 10).map(({ Label, Result: probe }) => ({
        label: safeProbeLabel(Label),
        mode: choice(probe.mode, ['association', 'activate', 'shell', 'cache-only', 'force-extract']),
        phase: safeProbePhase(probe.phase),
        hresult: /^0x[0-9a-fA-F]{8}$/.test(probe.hresult) ? probe.hresult : null,
        bitmapPresent: typeof probe.bitmapPresent === 'boolean' ? probe.bitmapPresent : null,
      })),
    })),
  }, null, 2);
}
