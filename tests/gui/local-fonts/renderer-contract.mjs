import assert from 'node:assert/strict';

// v0.9.0 refuses CanvasKit when the fixture's required Abel program is unavailable.
// Keep this exception limited to the explicit font-supply-disabled fixture case.
export function assertFontRenderer(diagnostics, requested, allowMissingAbel = false) {
  if (diagnostics.effectiveBackend === requested) {
    assert.equal(diagnostics.backendFallbackReason, null, 'requested renderer has no fallback');
  } else {
    assert.equal(allowMissingAbel, true, 'unexpected renderer fallback');
    assert.equal(requested, 'canvaskit');
    assert.equal(diagnostics.effectiveBackend, 'canvas2d');
    assert.equal(diagnostics.backendFallbackReason, 'canvaskitResourcePreparationFailed');
    assert.equal(diagnostics.selection?.selectionError, 'CanvasKit font family가 준비되지 않았습니다: Abel');
    assert.equal(diagnostics.page.canvaskit, null);
  }
  return { requestedBackend: requested, effectiveBackend: diagnostics.effectiveBackend,
    backendFallbackReason: diagnostics.backendFallbackReason };
}
