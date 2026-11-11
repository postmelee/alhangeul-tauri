interface FontRendererDiagnostics {
  effectiveBackend: string;
  backendFallbackReason: string | null;
  selection?: { selectionError: string | null } | null;
  page: { canvaskit: unknown | null };
}
export function assertFontRenderer(
  diagnostics: FontRendererDiagnostics, requested: string, allowMissingAbel?: boolean,
): { requestedBackend: string; effectiveBackend: string; backendFallbackReason: string | null };
