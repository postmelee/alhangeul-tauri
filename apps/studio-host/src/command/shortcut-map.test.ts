import { describe, expect, it } from 'vitest';
import { defaultShortcuts, matchShortcut } from './shortcut-map';

describe('shortcut-map', () => {
  it('matches Alhangeul Ctrl shortcuts', () => {
    expect(matchShortcut(keyEvent({ key: 's', ctrlKey: true }), defaultShortcuts)).toBe('file:save');
    expect(matchShortcut(keyEvent({ key: 'n', ctrlKey: true, shiftKey: true }), defaultShortcuts))
      .toBe('file:new-window');
    expect(matchShortcut(keyEvent({ key: 'o', ctrlKey: true, altKey: true }), defaultShortcuts))
      .toBe('file:open-recent');
    expect(matchShortcut(keyEvent({ key: 't', ctrlKey: true, altKey: true }), defaultShortcuts))
      .toBe('table:cell-selection-enter');
  });

  it('keeps Ctrl+E mapped to upstream delete instead of PDF export', () => {
    expect(matchShortcut(keyEvent({ key: 'e', ctrlKey: true }), defaultShortcuts)).toBe('edit:delete');
  });

  it('does not treat Meta as the primary modifier', () => {
    expect(matchShortcut(keyEvent({ key: 's', metaKey: true }), defaultShortcuts)).toBeNull();
    expect(matchShortcut(keyEvent({ key: 's', ctrlKey: true }), defaultShortcuts)).toBe('file:save');
  });
});

function keyEvent(
  overrides: Partial<Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>>,
): KeyboardEvent {
  return {
    key: '',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...overrides,
  } as KeyboardEvent;
}
