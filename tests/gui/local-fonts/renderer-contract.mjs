import assert from 'node:assert/strict';

// v0.9.0 refuses CanvasKit when the fixture's required Abel program is unavailable.
// Keep this exception limited to the explicit font-supply-disabled fixture case.
export function assertFontRenderer(diagnostics, requested, allowMissingAbel = false, blockedFontSources = [], unavailableFontFamilies = []) {
  if (diagnostics.effectiveBackend === requested) {
    assert.equal(diagnostics.backendFallbackReason, null, 'requested renderer has no fallback');
  } else {
    const error = diagnostics.selection?.selectionError;
    const blockedSource = /^CanvasKit font source 준비 실패 \((https:\/\/[^)]+)\): .+$/.exec(error ?? '')?.[1];
    const missingAbel = allowMissingAbel && error === 'CanvasKit font family가 준비되지 않았습니다: Abel';
    const missingFamily = /^CanvasKit font family가 준비되지 않았습니다: (.+)$/.exec(error ?? '')?.[1];
    const provenAbsent = !!missingFamily && unavailableFontFamilies.includes(missingFamily);
    // An enforced browser CSP event independently proves the remote font was blocked.
    assert.equal(missingAbel || provenAbsent || !!blockedSource && blockedFontSources.includes(blockedSource),
      true, `unexpected renderer fallback: ${error}`);
    assert.equal(requested, 'canvaskit');
    assert.equal(diagnostics.effectiveBackend, 'canvas2d');
    assert.equal(diagnostics.backendFallbackReason, 'canvaskitResourcePreparationFailed');
    assert.equal(diagnostics.page.canvaskit, null);
  }
  return { requestedBackend: requested, effectiveBackend: diagnostics.effectiveBackend,
    backendFallbackReason: diagnostics.backendFallbackReason };
}

// Absence is derived independently from document requests, the pinned supply
// registry and the installed product's native catalog, never from the error text.
export function unavailableDeclaredFonts(plan, supplyJson, localNames) {
  const normalize = name => name.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
  const available = new Set([...localNames, ...plan.embeddedFamilies].map(normalize));
  const supplies = normalize(supplyJson);
  return [...new Set(plan.requests.filter(request => {
    const names = [request.source, ...request.primary, ...request.substitute];
    return names.every(name => !available.has(normalize(name))
      && !supplies.includes(JSON.stringify(normalize(name))));
  }).map(request => request.source))];
}
