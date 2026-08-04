import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@upstream/core/event-bus';
import {
  DESKTOP_TOOLBAR_HIDDEN_CLASS,
  DESKTOP_TOOLBAR_READY_CLASS,
  installToolbarModeSync,
  type ToolbarModeElements,
} from './desktop-toolbar-mode-sync';

describe('desktop toolbar mode sync', () => {
  it('starts with only the default toolbar groups visible', () => {
    const { elements } = fixture();

    installToolbarModeSync(new EventBus(), elements);

    expect(hidden(elements.rotateGroup)).toBe(true);
    expect(hidden(elements.headerFooterGroup)).toBe(true);
    expect(hidden(elements.noteGroup)).toBe(true);
    expect(hidden(elements.defaultGroups[0])).toBe(false);
    expect(elements.rootElement?.classList.contains(DESKTOP_TOOLBAR_READY_CLASS)).toBe(true);
  });

  it('keeps header/footer tools active when an unrelated note reset restores defaults', () => {
    const { elements, eventBus, flush } = fixture();
    installToolbarModeSync(eventBus, elements, flush.schedule);

    eventBus.emit('headerFooterModeChanged', 'header');
    flush.run();
    eventBus.emit('footnoteModeChanged', false);
    elements.defaultGroups[0].style.display = '';
    flush.run();

    expect(hidden(elements.headerFooterGroup)).toBe(false);
    expect(elements.headerFooterLabel?.textContent).toBe('머리말');
    expect(hidden(elements.noteGroup)).toBe(true);
    expect(hidden(elements.defaultGroups[0])).toBe(true);
    expect(elements.scrollContainer?.classList.toggle)
      .toHaveBeenLastCalledWith('hf-editing', true);
  });

  it('keeps note tools active when an unrelated header/footer reset restores defaults', () => {
    const { elements, eventBus, flush } = fixture();
    installToolbarModeSync(eventBus, elements, flush.schedule);

    eventBus.emit('footnoteModeChanged', true);
    flush.run();
    eventBus.emit('headerFooterModeChanged', 'none');
    elements.defaultGroups[0].style.display = '';
    flush.run();

    expect(hidden(elements.noteGroup)).toBe(false);
    expect(hidden(elements.headerFooterGroup)).toBe(true);
    expect(hidden(elements.defaultGroups[0])).toBe(true);
  });

  it('restores picture tools after leaving note mode', () => {
    const { elements, eventBus, flush } = fixture();
    installToolbarModeSync(eventBus, elements, flush.schedule);

    eventBus.emit('picture-object-selection-changed', true);
    flush.run();
    expect(hidden(elements.rotateGroup)).toBe(false);

    eventBus.emit('footnoteModeChanged', true);
    flush.run();
    expect(hidden(elements.rotateGroup)).toBe(true);

    eventBus.emit('footnoteModeChanged', false);
    flush.run();
    expect(hidden(elements.rotateGroup)).toBe(false);
  });

  it('uses CSP-safe classes after upstream writes conflicting inline display values', () => {
    const { elements, eventBus, flush } = fixture();
    installToolbarModeSync(eventBus, elements, flush.schedule);

    eventBus.emit('headerFooterModeChanged', 'header');
    elements.headerFooterGroup!.style.display = 'none';
    elements.defaultGroups[0].style.display = '';
    flush.run();

    expect(hidden(elements.headerFooterGroup)).toBe(false);
    expect(display(elements.headerFooterGroup)).toBe('');
    expect(hidden(elements.defaultGroups[0])).toBe(true);
  });

  it('removes product state classes when the coordinator is disposed', () => {
    const { elements } = fixture();
    const dispose = installToolbarModeSync(new EventBus(), elements);

    dispose();

    expect(elements.rootElement?.classList.contains(DESKTOP_TOOLBAR_READY_CLASS)).toBe(false);
    expect(hidden(elements.rotateGroup)).toBe(false);
    expect(hidden(elements.headerFooterGroup)).toBe(false);
    expect(hidden(elements.noteGroup)).toBe(false);
  });
});

function fixture() {
  const eventBus = new EventBus();
  const elements: ToolbarModeElements = {
    rootElement: element(),
    rotateGroup: element(),
    headerFooterGroup: element(),
    headerFooterLabel: element(),
    noteGroup: element(),
    defaultGroups: [element(), element()],
    scrollContainer: element(),
  };
  return { elements, eventBus, flush: scheduler() };
}

function element(): HTMLElement {
  const classes = new Set<string>();
  const style = {
    display: 'uninitialized',
    removeProperty: vi.fn(),
  };
  style.removeProperty.mockImplementation((property: string) => {
    if (property === 'display') style.display = '';
  });
  return {
    style,
    textContent: null,
    classList: {
      add: vi.fn((name: string) => classes.add(name)),
      remove: vi.fn((name: string) => classes.delete(name)),
      toggle: vi.fn((name: string, force?: boolean) => {
        const enabled = force ?? !classes.has(name);
        if (enabled) classes.add(name);
        else classes.delete(name);
        return enabled;
      }),
      contains: vi.fn((name: string) => classes.has(name)),
    },
  } as unknown as HTMLElement;
}

function hidden(element: HTMLElement | null | undefined): boolean | undefined {
  return element?.classList.contains(DESKTOP_TOOLBAR_HIDDEN_CLASS);
}

function display(element: HTMLElement | null | undefined): string | undefined {
  return element?.style.display;
}

function scheduler() {
  const callbacks: Array<() => void> = [];
  return {
    schedule: (callback: () => void) => callbacks.push(callback),
    run: () => {
      while (callbacks.length > 0) callbacks.shift()?.();
    },
  };
}
