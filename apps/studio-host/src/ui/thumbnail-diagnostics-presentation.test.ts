import { describe, expect, it } from 'vitest';
import { completed, ready } from '../../tests/thumbnail-diagnostics-fixtures';
import { completion, formatPresentation, presentation } from './thumbnail-diagnostics-presentation';
import { diagnosticSummary } from '../core/desktop-thumbnail-diagnostics-summary';

describe('thumbnail diagnostic presentation', () => {
  it('distinguishes interrupted HWP and unattempted HWPX and preserves safe failure phase', () => {
    const snapshot = completed(); snapshot.status = 'failed';
    if (snapshot.result?.kind !== 'suite') throw new Error('fixture');
    const suite = snapshot.result.value; suite.status = 'failed';
    for (const format of suite.formats) {
      format.input.integrity = false; format.input.registrationStable = false;
      format.assessment.evidenceValid = false; format.assessment.finding = 'diagnostic-invalid';
    }
    const probe = suite.formats[0].input.probes[0].Result;
    probe.phase = 'SHCreateItemFromParsingName.imageFactory'; probe.hresult = '0x80070057'; probe.bitmapPresent = null;
    suite.formats[1].input.probes = [];
    expect(formatPresentation(snapshot, suite.formats[0]).status).toBe('— 진단 미완료');
    expect(formatPresentation(snapshot, suite.formats[1]).status).toBe('— 미검사');
    const summary = JSON.parse(diagnosticSummary(snapshot));
    expect(summary.formats[0].integrity).toBeNull();
    expect(summary.formats[0].registrationStable).toBeNull();
    expect(summary.formats[0].probes[0].phase).toBe('SHCreateItemFromParsingName.imageFactory');
  });
  it('summarizes successful and partial suites without changing assessment', () => {
    expect(completion(completed())).toBe('success');
    expect(completion(completed(true))).toBe('partial');
    expect(completion(ready())).toBe('warning');
    expect(completion(null)).toBe('warning');
  });
  it.each(['cancelled', 'timed-out', 'failed'] as const)('never calls %s results successful', (status) => {
    const snapshot = completed(); snapshot.status = status;
    expect(completion(snapshot)).toBe('warning');
    expect(presentation({ phase: status, snapshot, error: null }).title).not.toContain('생성했어요');
  });
  it('requires valid, cleaned and uniquely identified format results', () => {
    const snapshot = completed();
    if (snapshot.result?.kind !== 'suite') throw new Error('fixture');
    snapshot.result.value.cleanup = false;
    expect(completion(snapshot)).toBe('warning');
    snapshot.result.value.cleanup = true;
    snapshot.result.value.formats[0].assessment.evidenceValid = false;
    expect(completion(snapshot)).toBe('partial');
    snapshot.result.value.formats.push(snapshot.result.value.formats[1]);
    expect(completion(snapshot)).toBe('warning');
  });
  it('provides actionable copy for initial and busy states', () => {
    expect(presentation({ phase: 'ready', snapshot: ready(), error: null }).title).toBe('썸네일이 보이지 않나요?');
    expect(presentation({ phase: 'error', snapshot: null, error: 'busy' }).description).toContain('다른 창');
  });
});
