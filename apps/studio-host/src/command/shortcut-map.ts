import {
  defaultShortcuts as upstreamDefaultShortcuts,
} from '@upstream/command/shortcut-map';
import type { ShortcutDef } from '@upstream/command/shortcut-map';

export type { ShortcutDef };

const alhangeulShortcuts: [ShortcutDef, string][] = [
  [{ key: 'n', ctrl: true, shift: true }, 'file:new-window'],
  [{ key: 'o', ctrl: true, alt: true }, 'file:open-recent'],
  [{ key: 's', ctrl: true, shift: true }, 'file:save-as'],
  [{ key: 't', ctrl: true, alt: true }, 'table:cell-selection-enter'],
];

const alhangeulShortcutKeys = new Set(alhangeulShortcuts.map(([shortcut]) => shortcutKey(shortcut)));

export const defaultShortcuts: [ShortcutDef, string][] = [
  ...alhangeulShortcuts,
  ...upstreamDefaultShortcuts.filter(([shortcut]) => !alhangeulShortcutKeys.has(shortcutKey(shortcut))),
];

export function matchShortcut(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
  shortcuts: [ShortcutDef, string][],
): string | null {
  const primaryModifier = event.ctrlKey;

  for (const [def, commandId] of shortcuts) {
    if ((def.ctrl ?? false) !== primaryModifier) continue;
    if ((def.shift ?? false) !== event.shiftKey) continue;
    if ((def.alt ?? false) !== event.altKey) continue;
    if (event.key.toLowerCase() === def.key) return commandId;
  }

  return null;
}

function shortcutKey(shortcut: ShortcutDef): string {
  return [
    shortcut.key.toLowerCase(),
    shortcut.ctrl ? 'ctrl' : '',
    shortcut.shift ? 'shift' : '',
    shortcut.alt ? 'alt' : '',
  ].join(':');
}
