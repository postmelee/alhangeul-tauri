import assert from 'node:assert/strict';

// v0.9.0 refuses CanvasKit when the fixture's required Abel program is unavailable.
// Keep this exception limited to the explicit font-supply-disabled fixture case.
export function assertFontRenderer(diagnostics, requested, allowMissingAbel = false, blockedFontSources = []) {
  if (diagnostics.effectiveBackend === requested) {
    assert.equal(diagnostics.backendFallbackReason, null, 'requested renderer has no fallback');
  } else {
    const error = diagnostics.selection?.selectionError;
    const blockedSource = /^CanvasKit font source 준비 실패 \((https:\/\/[^)]+)\): .+$/.exec(error ?? '')?.[1];
    const missingAbel = allowMissingAbel && error === 'CanvasKit font family가 준비되지 않았습니다: Abel';
    // An enforced browser CSP event independently proves the remote font was blocked.
    assert.equal(missingAbel || !!blockedSource && blockedFontSources.includes(blockedSource),
      true, `unexpected renderer fallback: ${error}`);
    assert.equal(requested, 'canvaskit');
    assert.equal(diagnostics.effectiveBackend, 'canvas2d');
    assert.equal(diagnostics.backendFallbackReason, 'canvaskitResourcePreparationFailed');
    assert.equal(diagnostics.page.canvaskit, null);
  }
  return { requestedBackend: requested, effectiveBackend: diagnostics.effectiveBackend,
    backendFallbackReason: diagnostics.backendFallbackReason };
}
