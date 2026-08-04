import type { EventBus } from '@upstream/core/event-bus';

type HeaderFooterMode = 'none' | 'header' | 'footer';
type ScheduleRender = (callback: () => void) => void;

export interface ToolbarModeElements {
  rotateGroup: HTMLElement | null;
  headerFooterGroup: HTMLElement | null;
  headerFooterLabel: HTMLElement | null;
  noteGroup: HTMLElement | null;
  defaultGroups: HTMLElement[];
  scrollContainer: HTMLElement | null;
}

interface ToolbarModeState {
  pictureSelected: boolean;
  headerFooterMode: HeaderFooterMode;
  noteActive: boolean;
}

export function installDesktopToolbarModeSync(
  eventBus: EventBus,
  root: Document = document,
  scheduleRender: ScheduleRender = queueMicrotask,
): () => void {
  return installToolbarModeSync(eventBus, collectElements(root), scheduleRender);
}

export function installToolbarModeSync(
  eventBus: EventBus,
  elements: ToolbarModeElements,
  scheduleRender: ScheduleRender = queueMicrotask,
): () => void {
  const state: ToolbarModeState = {
    pictureSelected: false,
    headerFooterMode: 'none',
    noteActive: false,
  };
  let renderPending = false;

  const requestRender = () => {
    if (renderPending) return;
    renderPending = true;
    scheduleRender(() => {
      renderPending = false;
      renderToolbarMode(elements, state);
    });
  };

  const unsubscribers = [
    eventBus.on('picture-object-selection-changed', (selected) => {
      state.pictureSelected = selected === true;
      requestRender();
    }),
    eventBus.on('headerFooterModeChanged', (mode) => {
      state.headerFooterMode = toHeaderFooterMode(mode);
      if (state.headerFooterMode !== 'none') state.noteActive = false;
      requestRender();
    }),
    eventBus.on('footnoteModeChanged', (active) => {
      state.noteActive = active === true;
      if (state.noteActive) state.headerFooterMode = 'none';
      requestRender();
    }),
  ];

  renderToolbarMode(elements, state);
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

function collectElements(root: Document): ToolbarModeElements {
  const headerFooterGroup = root.querySelector<HTMLElement>('.tb-headerfooter-group');
  return {
    rotateGroup: root.querySelector<HTMLElement>('.tb-rotate-group'),
    headerFooterGroup,
    headerFooterLabel: headerFooterGroup?.querySelector<HTMLElement>('.tb-hf-label') ?? null,
    noteGroup: root.querySelector<HTMLElement>('.tb-note-group'),
    defaultGroups: Array.from(root.querySelectorAll<HTMLElement>(
      '#icon-toolbar > .tb-group:not(.tb-headerfooter-group):not(.tb-note-group):not(.tb-rotate-group), #icon-toolbar > .tb-sep',
    )),
    scrollContainer: root.getElementById('scroll-container'),
  };
}

function renderToolbarMode(elements: ToolbarModeElements, state: ToolbarModeState): void {
  const noteVisible = state.noteActive;
  const headerFooterVisible = !noteVisible && state.headerFooterMode !== 'none';
  const defaultVisible = !noteVisible && !headerFooterVisible;

  setVisible(elements.noteGroup, noteVisible);
  setVisible(elements.headerFooterGroup, headerFooterVisible);
  setVisible(elements.rotateGroup, state.pictureSelected && !noteVisible);
  elements.defaultGroups.forEach((element) => setVisible(element, defaultVisible));

  if (elements.headerFooterLabel) {
    elements.headerFooterLabel.textContent = headerFooterVisible
      ? state.headerFooterMode === 'header' ? '머리말' : '꼬리말'
      : '';
  }
  elements.scrollContainer?.classList.toggle('hf-editing', headerFooterVisible);
}

function setVisible(element: HTMLElement | null, visible: boolean): void {
  if (element) element.style.display = visible ? '' : 'none';
}

function toHeaderFooterMode(mode: unknown): HeaderFooterMode {
  return mode === 'header' || mode === 'footer' ? mode : 'none';
}
