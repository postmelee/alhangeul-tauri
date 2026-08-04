import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@upstream/core/event-bus';
import {
  installToolbarModeSync,
  type ToolbarModeElements,
} from './desktop-toolbar-mode-sync';

describe('desktop toolbar mode sync', () => {
  it('starts with only the default toolbar groups visible', () => {
    const { elements } = fixture();

    installToolbarModeSync(new EventBus(), elements);

    expect(display(elements.rotateGroup)).toBe('none');
    expect(display(elements.headerFooterGroup)).toBe('none');
    expect(display(elements.noteGroup)).toBe('none');
    expect(display(elements.defaultGroups[0])).toBe('');
  });

  it('keeps header/footer tools active when an unrelated note reset restores defaults', () => {
    const { elements, eventBus, flush } = fixture();
    installToolbarModeSync(eventBus, elements, flush.schedule);

    eventBus.emit('headerFooterModeChanged', 'header');
    flush.run();
    eventBus.emit('footnoteModeChanged', false);
    elements.defaultGroups[0].style.display = '';
    flush.run();

    expect(display(elements.headerFooterGroup)).toBe('');
    expect(elements.headerFooterLabel?.textContent).toBe('머리말');
    expect(display(elements.noteGroup)).toBe('none');
    expect(display(elements.defaultGroups[0])).toBe('none');
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

    expect(display(elements.noteGroup)).toBe('');
    expect(display(elements.headerFooterGroup)).toBe('none');
    expect(display(elements.defaultGroups[0])).toBe('none');
  });

  it('restores picture tools after leaving note mode', () => {
    const { elements, eventBus, flush } = fixture();
    installToolbarModeSync(eventBus, elements, flush.schedule);

    eventBus.emit('picture-object-selection-changed', true);
    flush.run();
    expect(display(elements.rotateGroup)).toBe('');

    eventBus.emit('footnoteModeChanged', true);
    flush.run();
    expect(display(elements.rotateGroup)).toBe('none');

    eventBus.emit('footnoteModeChanged', false);
    flush.run();
    expect(display(elements.rotateGroup)).toBe('');
  });
});

function fixture() {
  const eventBus = new EventBus();
  const elements: ToolbarModeElements = {
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
  return {
    style: { display: 'uninitialized' },
    textContent: null,
    classList: { toggle: vi.fn() },
  } as unknown as HTMLElement;
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
