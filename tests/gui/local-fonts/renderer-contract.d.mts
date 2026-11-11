interface FontRendererDiagnostics {
  effectiveBackend: string;
  backendFallbackReason: string | null;
  selection?: { selectionError: string | null } | null;
  page: { canvaskit: unknown | null };
}
export function assertFontRenderer(
  diagnostics: FontRendererDiagnostics, requested: string, allowMissingAbel?: boolean, blockedFontSources?: string[], unavailableFontFamilies?: string[],
): { requestedBackend: string; effectiveBackend: string; backendFallbackReason: string | null };

export function unavailableDeclaredFonts(
  plan: { embeddedFamilies: string[]; requests: { source: string; primary: string[]; substitute: string[] }[] },
  supplyJson: string, localNames: string[],
): string[];
